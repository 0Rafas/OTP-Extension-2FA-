async function processQRCode(imageData) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use jsQR to decode the QR code
        if (typeof jsQR !== 'undefined') {
          const code = jsQR(canvasImageData.data, canvasImageData.width, canvasImageData.height);
          if (code) {
            resolve(code.data);
          } else {
            reject('لم يتم العثور على QR Code صالح');
          }
        } else {
          reject('مكتبة QR Code غير متوفرة');
        }
      };
      
      img.onerror = () => reject('فشل في تحميل الصورة');
      img.src = imageData;
    });
  } catch (error) {
    throw new Error('خطأ في معالجة QR Code: ' + error.message);
  }
}

function parseTOTPUri(uri) {
  try {
    const url = new URL(uri);
    if (url.protocol !== 'otpauth:'  url.hostname !== 'totp') {
      throw new Error('URI غير صالح');
    }
    
    const label = decodeURIComponent(url.pathname.substring(1));
    const params = new URLSearchParams(url.search);
    
    return {
      label: label,
      secret: params.get('secret'),
      issuer: params.get('issuer')  '',
      algorithm: params.get('algorithm')  'SHA1',
      digits: parseInt(params.get('digits'))  6,
      period: parseInt(params.get('period')) || 30
    };
  } catch (error) {
    throw new Error('فشل في تحليل QR Code');
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'qrCaptured') {
    processQRCode(request.imageData)
      .then(qrData => {
        const totpData = parseTOTPUri(qrData);
        sendResponse({success: true, data: totpData});
      })
      .catch(error => {
        sendResponse({success: false, error: error});
      });
    return true; // Keep the message channel open for async response
  }
});

// Load jsQR library
if (typeof importScripts !== 'undefined') {
  try {
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
document.head.appendChild(script);
`
