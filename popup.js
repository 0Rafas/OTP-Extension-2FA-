// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const mainView = document.getElementById('main-view');
  const formView = document.getElementById('form-view');
  const qrScanBtn = document.getElementById('qr-scan-btn');
  const keyEntryBtn = document.getElementById('key-entry-btn');
  const saveOtpBtn = document.getElementById('save-otp-btn');
  const cancelFormBtn = document.getElementById('cancel-form-btn');
  const otpNameInput = document.getElementById('otp-name');
  const otpDurationInput = document.getElementById('otp-duration');
  const authKeyInput = document.getElementById('auth-key');
  const formTitle = document.getElementById('form-title');
  const errorMessage = document.getElementById('error-message');
  const otpList = document.getElementById('otp-list');
  const emptyState = document.getElementById('empty-state');

  let currentMode = '';
  let currentQRData = null;
  let otpTimers = new Map();

  function showForm(mode, qrData = null) {
    mainView.style.display = 'none';
    formView.style.display = 'block';
    currentMode = mode;
    currentQRData = qrData;
    hideError();

    otpNameInput.value = qrData?.label || qrData?.issuer || '';
    otpDurationInput.value = qrData?.period || '30';
    authKeyInput.value = qrData?.secret || '';

    if (mode === 'qr') {
      formTitle.textContent = 'إضافة 2FA عبر QR Code';
      authKeyInput.style.display = 'none';
      if (!qrData) {
        startQRScan();
      }
    } else if (mode === 'key') {
      formTitle.textContent = 'إضافة 2FA عبر مفتاح المصادقة';
      authKeyInput.style.display = 'block';
    }
  }

  function hideForm() {
    mainView.style.display = 'block';
    formView.style.display = 'none';
    currentQRData = null;
  }

  function showError(message, duration = 3000) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(hideError, duration);
  }

  function hideError() {
    errorMessage.style.display = 'none';
  }

  function startQRScan() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startQRSelection' }, (response) => {
        if (chrome.runtime.lastError) {
          showError('فشل في بدء مسح QR Code. تأكد من تحديث الصفحة.');
        }
      });
    });
  }

  async function generateOTPCode(secret, period = 30) {
    try {
      return await TOTP.generate(secret, period);
    } catch (error) {
      console.error('Error generating OTP:', error);
      return '------';
    }
  }

  function createOTPItem(otpData) {
    const otpItem = document.createElement('div');
    otpItem.className = 'otp-item';
    otpItem.dataset.id = otpData.id;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = otpData.name;

    const codeSpan = document.createElement('span');
    codeSpan.className = 'otp-code';
    codeSpan.textContent = '------';

    const countdownCircle = document.createElement('div');
    countdownCircle.className = 'countdown-circle';
    countdownCircle.textContent = otpData.period;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => deleteOTP(otpData.id);

    otpItem.appendChild(nameSpan);
    otpItem.appendChild(codeSpan);
    otpItem.appendChild(countdownCircle);
    otpItem.appendChild(deleteBtn);

    return otpItem;
  }

  async function updateOTPCode(otpData) {
    const otpItem = document.querySelector(`[data-id="${otpData.id}"]`);
    if (!otpItem) return;

    const codeSpan = otpItem.querySelector('.otp-code');
    const countdownCircle = otpItem.querySelector('.countdown-circle');

    try {
      const code = await generateOTPCode(otpData.secret, otpData.period);
      codeSpan.textContent = code;

      const timeRemaining = TOTP.getTimeRemaining(otpData.period);
      countdownCircle.textContent = timeRemaining;

      const progress = (timeRemaining / otpData.period) * 360;
      countdownCircle.style.background = `conic-gradient(#007bff ${progress}deg, transparent ${progress}deg)`;
    } catch (error) {
      codeSpan.textContent = 'خطأ';
      countdownCircle.textContent = '!';
    }
  }

  function startOTPTimer(otpData) {
    if (otpTimers.has(otpData.id)) {
      clearInterval(otpTimers.get(otpData.id));
    }

    updateOTPCode(otpData);

    const timer = setInterval(() => {
      updateOTPCode(otpData);
    }, 1000);

    otpTimers.set(otpData.id, timer);
  }

  async function saveOTP() {
    const otpName = otpNameInput.value.trim();
    const otpDuration = parseInt(otpDurationInput.value, 10);
    const authKey = currentQRData?.secret || authKeyInput.value.trim();

    if (!otpName) {
      showError('الرجاء إدخال اسم للحساب.');
      return;
    }
    if (isNaN(otpDuration) || otpDuration < 15 || otpDuration > 300) {
      showError('الرجاء إدخال مدة صحيحة (15-300 ثانية).');
      return;
    }
    if (!authKey) {
      showError('الرجاء إدخال مفتاح المصادقة.');
      return;
    }

    const otpData = {
      id: Date.now().toString(),
      name: otpName,
      secret: authKey,
      period: otpDuration,
      created: Date.now()
    };

    try {
      const result = await chrome.storage.local.get('otpAccounts');
      const accounts = result.otpAccounts || [];
      accounts.push(otpData);

      await chrome.storage.local.set({ otpAccounts: accounts });

      emptyState.style.display = 'none';
      const otpItem = createOTPItem(otpData);
      otpList.appendChild(otpItem);
      startOTPTimer(otpData);

      hideForm();
    } catch (error) {
      showError('فشل في حفظ البيانات.');
    }
  }

  async function deleteOTP(id) {
    try {
      const result = await chrome.storage.local.get('otpAccounts');
      const accounts = result.otpAccounts || [];
      const filteredAccounts = accounts.filter(acc => acc.id !== id);

      await chrome.storage.local.set({ otpAccounts: filteredAccounts });

      const otpItem = document.querySelector(`[data-id="${id}"]`);
      if (otpItem) {
        otpItem.remove();
      }

      if (otpTimers.has(id)) {
        clearInterval(otpTimers.get(id));
        otpTimers.delete(id);
      }

      if (filteredAccounts.length === 0) {
        emptyState.style.display = 'block';
      }
    } catch (error) {
      showError('فشل في حذف الحساب.');
    }
  }

  async function loadOTPs() {
    try {
      const result = await chrome.storage.local.get('otpAccounts');
      const accounts = result.otpAccounts || [];

      if (accounts.length === 0) {
        emptyState.style.display = 'block';
        return;
      }

      emptyState.style.display = 'none';

      accounts.forEach(otpData => {
        const otpItem = createOTPItem(otpData);
        otpList.appendChild(otpItem);
        startOTPTimer(otpData);
      });
    } catch (error) {
      showError('فشل في تحميل البيانات.');
    }
  }

  qrScanBtn.addEventListener('click', () => showForm('qr'));
  keyEntryBtn.addEventListener('click', () => showForm('key'));
  cancelFormBtn.addEventListener('click', hideForm);
  saveOtpBtn.addEventListener('click', saveOTP);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'qrCaptured') {
      if (request.success) {
        showForm('qr', request.data);
      } else {
        showError(request.error || 'QR Code غير صالح');
      }
    } else if (request.action === 'qrError') {
      showError(request.error);
    } else if (request.action === 'qrCancelled') {
      hideForm();
    }
  });

  // Initialize
  loadOTPs();
});

m();
// Initialize
loadOTPs();
