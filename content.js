// content.js - Content script for QR code scanning

let isSelecting = false;
let selectionBox = null;
let startX, startY, endX, endY;

function createSelectionBox() {
  const box = document.createElement('div');
  box.style.position = 'fixed';
  box.style.border = '2px dashed #007bff';
  box.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
  box.style.zIndex = '999999';
  box.style.pointerEvents = 'none';
  box.style.display = 'none';
  document.body.appendChild(box);
  return box;
}

function updateSelectionBox(x1, y1, x2, y2) {
  if (!selectionBox) return;
  
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  
  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
  selectionBox.style.display = 'block';
}

function captureQRCode(x1, y1, x2, y2) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  
  canvas.width = width;
  canvas.height = height;
  
  
  html2canvas(document.body, {
    x: left,
    y: top,
    width: width,
    height: height,
    useCORS: true
  }).then(canvas => {
    const imageData = canvas.toDataURL();
    
    
    chrome.runtime.sendMessage({
      action: 'qrCaptured',
      imageData: imageData
    });
  }).catch(error => {
    chrome.runtime.sendMessage({
      action: 'qrError',
      error: 'فشل في التقاط QR Code'
    });
  });
}

function startQRSelection() {
  if (isSelecting) return;
  
  isSelecting = true;
  selectionBox = createSelectionBox();
  document.body.style.cursor = 'crosshair';
  
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keydown', onKeyDown);
}

function stopQRSelection() {
  if (!isSelecting) return;
  
  isSelecting = false;
  document.body.style.cursor = 'default';
  
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
  
  document.removeEventListener('mousedown', onMouseDown);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('keydown', onKeyDown);
}

function onMouseDown(e) {
  if (!isSelecting) return;
  
  startX = e.clientX;
  startY = e.clientY;
  endX = startX;
  endY = startY;
  
  updateSelectionBox(startX, startY, endX, endY);
}

function onMouseMove(e) {
  if (!isSelecting || startX === undefined) return;
  
  endX = e.clientX;
  endY = e.clientY;
  
  updateSelectionBox(startX, startY, endX, endY);
}

function onMouseUp(e) {
  if (!isSelecting || startX === undefined) return;
  
  endX = e.clientX;
  endY = e.clientY;
  
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  
  if (width > 50 && height > 50) {
    captureQRCode(startX, startY, endX, endY);
  } else {
    chrome.runtime.sendMessage({
      action: 'qrError',
      error: 'المنطقة المحددة صغيرة جداً'
    });
  }
  
  stopQRSelection();
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    stopQRSelection();
    chrome.runtime.sendMessage({
      action: 'qrCancelled'
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startQRSelection') {
    startQRSelection();
    sendResponse({success: true});
  } else if (request.action === 'stopQRSelection') {
    stopQRSelection();
    sendResponse({success: true});
  }
});

if (!window.html2canvas) {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  document.head.appendChild(script);
}

lement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  document.head.appendChild(script);
}

