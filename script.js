// Global variables
let uploadedImage = null;
let currentFormat = 'napa';
let cropData = { x: 0, y: 0, width: 0, height: 0 };
let zoomLevel = 1;
let imagePosition = { x: 0, y: 0 };
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let isResizing = false;
let resizeHandle = null;
let cropBox = { x: 0, y: 0, width: 0, height: 0 };
let canvasContainer = null;

// Format specifications
const formats = {
    napa: {
        name: 'NAPA Format',
        mmWidth: 30,
        mmHeight: 30,
        pxWidth: 300,
        pxHeight: 300,
        maxFileSize: 500
    },
    heslb: {
        name: 'HESLB Format',
        mmWidth: 12,
        mmHeight: 15,
        pxWidth: 120,
        pxHeight: 150,
        maxFileSize: 1000
    },
    custom: {
        name: 'Custom Format',
        mmWidth: 35,
        mmHeight: 45,
        pxWidth: 413,
        pxHeight: 531,
        maxFileSize: 500
    }
};

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const previewSection = document.getElementById('previewSection');
const previewCanvas = document.getElementById('previewCanvas');
const customDimensions = document.getElementById('customDimensions');
const formatInfo = document.getElementById('formatInfo');
const dimensionsInfo = document.getElementById('dimensionsInfo');
const fileSizeInfo = document.getElementById('fileSizeInfo');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateFormatInfo();
});

function setupEventListeners() {
    // File input change
    imageInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => imageInput.click());
    
    // Format selection
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', handleFormatChange);
    });
    
    // Custom dimensions inputs
    document.getElementById('customWidth').addEventListener('input', updateCustomFormat);
    document.getElementById('customHeight').addEventListener('input', updateCustomFormat);
    document.getElementById('customFileSize').addEventListener('input', updateCustomFormat);
    
    // Canvas interaction events
    previewCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    previewCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    previewCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    previewCanvas.addEventListener('wheel', handleCanvasWheel);
    previewCanvas.addEventListener('touchstart', handleCanvasTouchStart);
    previewCanvas.addEventListener('touchmove', handleCanvasTouchMove);
    previewCanvas.addEventListener('touchend', handleCanvasTouchEnd);
    
    // Prevent context menu on canvas
    previewCanvas.addEventListener('contextmenu', e => e.preventDefault());
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Enhanced file validation
    if (!file.type.startsWith('image/')) {
        showMessage('Please select a valid image file (JPG, PNG, GIF, WebP).', 'error');
        return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showMessage('File size too large. Please select an image under 10MB.', 'error');
        return;
    }
    
    // Check minimum file size (1KB)
    if (file.size < 1024) {
        showMessage('File size too small. Please select a larger image.', 'warning');
        return;
    }
    
    // Show loading message
    showMessage('Processing your image...', 'info');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            loadImage(e.target.result);
        } catch (error) {
            showMessage('Error processing image. Please try a different file.', 'error');
        }
    };
    
    reader.onerror = function() {
        showMessage('Error reading file. Please try again.', 'error');
    };
    
    reader.readAsDataURL(file);
}

function loadImage(src) {
    const img = new Image();
    img.onload = function() {
        uploadedImage = img;
        
        // Reset zoom and position
        zoomLevel = 1;
        imagePosition = { x: 0, y: 0 };
        cropBox = { x: 0, y: 0, width: 0, height: 0 };
        
        // Center the image initially
        const format = getCurrentFormat();
        const imageAspect = img.width / img.height;
        const canvasAspect = format.pxWidth / format.pxHeight;
        
        if (imageAspect > canvasAspect) {
            // Image is wider - fit to height
            const scale = format.pxHeight / img.height;
            zoomLevel = scale;
            imagePosition.x = (format.pxWidth - img.width * scale) / 2;
            imagePosition.y = 0;
        } else {
            // Image is taller - fit to width
            const scale = format.pxWidth / img.width;
            zoomLevel = scale;
            imagePosition.x = 0;
            imagePosition.y = (format.pxHeight - img.height * scale) / 2;
        }
        
        showPreview();
        previewSection.style.display = 'block';
        previewSection.classList.add('fade-in');
        
        // Show second ad after image upload
        document.getElementById('adSlot2').style.display = 'block';
        document.getElementById('adSlot2').classList.add('slide-up');
    };
    img.src = src;
}

// Canvas interaction functions
function handleCanvasMouseDown(e) {
    if (!uploadedImage) return;
    
    const rect = previewCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on a resize handle
    const handle = getResizeHandle(x, y);
    if (handle) {
        isResizing = true;
        resizeHandle = handle;
        previewCanvas.style.cursor = handle.cursor;
        return;
    }
    
    // Check if clicking inside crop box
    if (isInsideCropBox(x, y)) {
        isDragging = true;
        dragStart = { x: x - cropBox.x, y: y - cropBox.y };
        previewCanvas.style.cursor = 'move';
    } else {
        // Start dragging the image
        isDragging = true;
        dragStart = { x: x - imagePosition.x, y: y - imagePosition.y };
        previewCanvas.style.cursor = 'grabbing';
    }
}

function handleCanvasMouseMove(e) {
    if (!uploadedImage) return;
    
    const rect = previewCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (isResizing && resizeHandle) {
        resizeCropBox(x, y);
        showPreview();
        return;
    }
    
    if (isDragging) {
        if (isInsideCropBox(dragStart.x + cropBox.x, dragStart.y + cropBox.y)) {
            // Move crop box
            cropBox.x = x - dragStart.x;
            cropBox.y = y - dragStart.y;
            
            // Keep crop box within canvas bounds
            const format = getCurrentFormat();
            cropBox.x = Math.max(0, Math.min(cropBox.x, format.pxWidth - cropBox.width));
            cropBox.y = Math.max(0, Math.min(cropBox.y, format.pxHeight - cropBox.height));
        } else {
            // Move image
            imagePosition.x = x - dragStart.x;
            imagePosition.y = y - dragStart.y;
        }
        showPreview();
        return;
    }
    
    // Update cursor based on hover position
    const handle = getResizeHandle(x, y);
    if (handle) {
        previewCanvas.style.cursor = handle.cursor;
    } else if (isInsideCropBox(x, y)) {
        previewCanvas.style.cursor = 'move';
    } else {
        previewCanvas.style.cursor = 'grab';
    }
}

function handleCanvasMouseUp(e) {
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
    previewCanvas.style.cursor = 'grab';
}

function handleCanvasWheel(e) {
    if (!uploadedImage) return;
    
    e.preventDefault();
    
    const rect = previewCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate zoom
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoomLevel = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));
    
    // Calculate new position to zoom towards mouse
    const zoomRatio = newZoomLevel / zoomLevel;
    imagePosition.x = mouseX - (mouseX - imagePosition.x) * zoomRatio;
    imagePosition.y = mouseY - (mouseY - imagePosition.y) * zoomRatio;
    
    zoomLevel = newZoomLevel;
    showPreview();
}

// Touch event handlers for mobile
function handleCanvasTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleCanvasMouseDown(mouseEvent);
    }
}

function handleCanvasTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleCanvasMouseMove(mouseEvent);
    }
}

function handleCanvasTouchEnd(e) {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    handleCanvasMouseUp(mouseEvent);
}

// Helper functions
function getResizeHandle(x, y) {
    const handleSize = 12;
    const handles = [
        { x: cropBox.x - handleSize/2, y: cropBox.y - handleSize/2, cursor: 'nw-resize', type: 'nw' },
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y - handleSize/2, cursor: 'ne-resize', type: 'ne' },
        { x: cropBox.x - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2, cursor: 'sw-resize', type: 'sw' },
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2, cursor: 'se-resize', type: 'se' }
    ];
    
    for (const handle of handles) {
        if (x >= handle.x && x <= handle.x + handleSize && 
            y >= handle.y && y <= handle.y + handleSize) {
            return handle;
        }
    }
    return null;
}

function isInsideCropBox(x, y) {
    return x >= cropBox.x && x <= cropBox.x + cropBox.width &&
           y >= cropBox.y && y <= cropBox.y + cropBox.height;
}

function resizeCropBox(x, y) {
    const format = getCurrentFormat();
    const aspectRatio = format.pxWidth / format.pxHeight;
    
    switch (resizeHandle.type) {
        case 'nw':
            const newWidth = cropBox.x + cropBox.width - x;
            const newHeight = newWidth / aspectRatio;
            if (newWidth > 20 && newHeight > 20) {
                cropBox.width = newWidth;
                cropBox.height = newHeight;
                cropBox.x = x;
                cropBox.y = cropBox.y + (cropBox.height - newHeight);
            }
            break;
        case 'ne':
            const width = x - cropBox.x;
            const height = width / aspectRatio;
            if (width > 20 && height > 20) {
                cropBox.width = width;
                cropBox.height = height;
            }
            break;
        case 'sw':
            const w = cropBox.x + cropBox.width - x;
            const h = w / aspectRatio;
            if (w > 20 && h > 20) {
                cropBox.width = w;
                cropBox.height = h;
                cropBox.x = x;
            }
            break;
        case 'se':
            const ww = x - cropBox.x;
            const hh = ww / aspectRatio;
            if (ww > 20 && hh > 20) {
                cropBox.width = ww;
                cropBox.height = hh;
            }
            break;
    }
    
    // Keep crop box within canvas bounds
    cropBox.x = Math.max(0, Math.min(cropBox.x, format.pxWidth - cropBox.width));
    cropBox.y = Math.max(0, Math.min(cropBox.y, format.pxHeight - cropBox.height));
    cropBox.width = Math.min(cropBox.width, format.pxWidth - cropBox.x);
    cropBox.height = Math.min(cropBox.height, format.pxHeight - cropBox.y);
}

function showPreview() {
    const canvas = previewCanvas;
    const ctx = canvas.getContext('2d');
    
    // Get current format specs
    const format = getCurrentFormat();
    
    // Set canvas size to match format
    canvas.width = format.pxWidth;
    canvas.height = format.pxHeight;
    
    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (uploadedImage) {
        // Calculate image dimensions with zoom
        const scaledWidth = uploadedImage.width * zoomLevel;
        const scaledHeight = uploadedImage.height * zoomLevel;
        
        // Draw the image with current position and zoom
        ctx.drawImage(
            uploadedImage,
            imagePosition.x,
            imagePosition.y,
            scaledWidth,
            scaledHeight
        );
        
        // Draw crop overlay
        drawCropOverlay(ctx, format);
    }
    
    updateFormatInfo();
}

function drawCropOverlay(ctx, format) {
    // Calculate crop box position (centered by default)
    if (cropBox.width === 0 || cropBox.height === 0) {
        const canvasAspect = format.pxWidth / format.pxHeight;
        const maxSize = Math.min(format.pxWidth * 0.8, format.pxHeight * 0.8);
        
        cropBox.width = maxSize;
        cropBox.height = maxSize / canvasAspect;
        cropBox.x = (format.pxWidth - cropBox.width) / 2;
        cropBox.y = (format.pxHeight - cropBox.height) / 2;
    }
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, format.pxWidth, format.pxHeight);
    
    // Clear the crop area
    ctx.clearRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    
    // Redraw the image in the crop area only
    if (uploadedImage) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
        ctx.clip();
        
        const scaledWidth = uploadedImage.width * zoomLevel;
        const scaledHeight = uploadedImage.height * zoomLevel;
        
        ctx.drawImage(
            uploadedImage,
            imagePosition.x,
            imagePosition.y,
            scaledWidth,
            scaledHeight
        );
        
        ctx.restore();
    }
    
    // Draw crop box border
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    
    // Draw corner handles
    drawCropHandles(ctx);
}

function drawCropHandles(ctx) {
    const handleSize = 12;
    const handles = [
        { x: cropBox.x - handleSize/2, y: cropBox.y - handleSize/2, cursor: 'nw-resize' },
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y - handleSize/2, cursor: 'ne-resize' },
        { x: cropBox.x - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2, cursor: 'sw-resize' },
        { x: cropBox.x + cropBox.width - handleSize/2, y: cropBox.y + cropBox.height - handleSize/2, cursor: 'se-resize' }
    ];
    
    ctx.fillStyle = '#667eea';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    handles.forEach(handle => {
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });
}

function handleFormatChange(e) {
    currentFormat = e.target.value;
    
    // Show/hide custom dimensions
    if (currentFormat === 'custom') {
        customDimensions.style.display = 'block';
        customDimensions.classList.add('fade-in');
    } else {
        customDimensions.style.display = 'none';
    }
    
    // Update preview if image is loaded
    if (uploadedImage) {
        showPreview();
    }
    
    updateFormatInfo();
}

function updateCustomFormat() {
    if (currentFormat !== 'custom') return;
    
    const widthInput = document.getElementById('customWidth');
    const heightInput = document.getElementById('customHeight');
    const fileSizeInput = document.getElementById('customFileSize');
    
    const width = parseInt(widthInput.value) || 35;
    const height = parseInt(heightInput.value) || 45;
    const fileSize = parseInt(fileSizeInput.value) || 500;
    
    // Validate dimensions
    if (width < 10 || width > 100) {
        showMessage('Width must be between 10mm and 100mm.', 'warning');
        widthInput.style.borderColor = '#f56565';
        return;
    } else {
        widthInput.style.borderColor = '#cbd5e0';
    }
    
    if (height < 10 || height > 150) {
        showMessage('Height must be between 10mm and 150mm.', 'warning');
        heightInput.style.borderColor = '#f56565';
        return;
    } else {
        heightInput.style.borderColor = '#cbd5e0';
    }
    
    if (fileSize < 50 || fileSize > 2000) {
        showMessage('File size must be between 50KB and 2000KB.', 'warning');
        fileSizeInput.style.borderColor = '#f56565';
        return;
    } else {
        fileSizeInput.style.borderColor = '#cbd5e0';
    }
    
    // Update custom format specs
    formats.custom.mmWidth = width;
    formats.custom.mmHeight = height;
    formats.custom.pxWidth = Math.round(width * 11.8); // Convert mm to px (300 DPI)
    formats.custom.pxHeight = Math.round(height * 11.8);
    formats.custom.maxFileSize = fileSize;
    
    // Update preview if image is loaded
    if (uploadedImage) {
        showPreview();
    }
    
    updateFormatInfo();
}

function getCurrentFormat() {
    return formats[currentFormat];
}

// Zoom control functions
function zoomIn() {
    if (!uploadedImage) return;
    
    const newZoomLevel = Math.min(5, zoomLevel * 1.2);
    const centerX = previewCanvas.width / 2;
    const centerY = previewCanvas.height / 2;
    
    // Zoom towards center
    const zoomRatio = newZoomLevel / zoomLevel;
    imagePosition.x = centerX - (centerX - imagePosition.x) * zoomRatio;
    imagePosition.y = centerY - (centerY - imagePosition.y) * zoomRatio;
    
    zoomLevel = newZoomLevel;
    updateZoomDisplay();
    showPreview();
}

function zoomOut() {
    if (!uploadedImage) return;
    
    const newZoomLevel = Math.max(0.1, zoomLevel * 0.8);
    const centerX = previewCanvas.width / 2;
    const centerY = previewCanvas.height / 2;
    
    // Zoom towards center
    const zoomRatio = newZoomLevel / zoomLevel;
    imagePosition.x = centerX - (centerX - imagePosition.x) * zoomRatio;
    imagePosition.y = centerY - (centerY - imagePosition.y) * zoomRatio;
    
    zoomLevel = newZoomLevel;
    updateZoomDisplay();
    showPreview();
}

function resetZoom() {
    if (!uploadedImage) return;
    
    // Reset to fit image in canvas
    const format = getCurrentFormat();
    const imageAspect = uploadedImage.width / uploadedImage.height;
    const canvasAspect = format.pxWidth / format.pxHeight;
    
    if (imageAspect > canvasAspect) {
        // Image is wider - fit to height
        const scale = format.pxHeight / uploadedImage.height;
        zoomLevel = scale;
        imagePosition.x = (format.pxWidth - uploadedImage.width * scale) / 2;
        imagePosition.y = 0;
    } else {
        // Image is taller - fit to width
        const scale = format.pxWidth / uploadedImage.width;
        zoomLevel = scale;
        imagePosition.x = 0;
        imagePosition.y = (format.pxHeight - uploadedImage.height * scale) / 2;
    }
    
    updateZoomDisplay();
    showPreview();
}

function updateFormatInfo() {
    const format = getCurrentFormat();
    
    formatInfo.textContent = `${format.name} (${format.mmWidth}mm × ${format.mmHeight}mm)`;
    dimensionsInfo.textContent = `${format.pxWidth} × ${format.pxHeight} px`;
    fileSizeInfo.textContent = `~${format.maxFileSize} KB`;
    
    // Update zoom display if elements exist
    if (document.getElementById('zoomLevel') && document.getElementById('zoomInfo')) {
        updateZoomDisplay();
    }
}

function updateZoomDisplay() {
    const zoomPercentage = Math.round(zoomLevel * 100);
    const zoomLevelEl = document.getElementById('zoomLevel');
    const zoomInfoEl = document.getElementById('zoomInfo');
    
    if (zoomLevelEl) zoomLevelEl.textContent = `${zoomPercentage}%`;
    if (zoomInfoEl) zoomInfoEl.textContent = `${zoomPercentage}%`;
}

function downloadImage() {
    if (!uploadedImage) {
        showMessage('Please upload an image first.', 'error');
        return;
    }
    
    const format = getCurrentFormat();
    
    // Create a new canvas for the final image
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    
    finalCanvas.width = format.pxWidth;
    finalCanvas.height = format.pxHeight;
    
    // Fill with white background
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    // Calculate the source rectangle from the original image
    // based on the crop box position and zoom level
    const scaleX = uploadedImage.width / (uploadedImage.width * zoomLevel);
    const scaleY = uploadedImage.height / (uploadedImage.height * zoomLevel);
    
    const sourceX = Math.max(0, (cropBox.x - imagePosition.x) * scaleX);
    const sourceY = Math.max(0, (cropBox.y - imagePosition.y) * scaleY);
    const sourceWidth = Math.min(uploadedImage.width - sourceX, cropBox.width * scaleX);
    const sourceHeight = Math.min(uploadedImage.height - sourceY, cropBox.height * scaleY);
    
    // Draw the cropped portion of the image
    finalCtx.drawImage(
        uploadedImage,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, finalCanvas.width, finalCanvas.height
    );
    
    // Convert to blob and download
    finalCanvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passport-photo-${format.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage('Photo downloaded successfully!', 'success');
    }, 'image/jpeg', 0.9);
}

function resetTool() {
    uploadedImage = null;
    imageInput.value = '';
    previewSection.style.display = 'none';
    document.getElementById('adSlot2').style.display = 'none';
    
    // Reset crop and zoom variables
    zoomLevel = 1;
    imagePosition = { x: 0, y: 0 };
    cropBox = { x: 0, y: 0, width: 0, height: 0 };
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
    
    // Reset format to NAPA
    document.querySelector('input[value="napa"]').checked = true;
    currentFormat = 'napa';
    customDimensions.style.display = 'none';
    
    // Clear custom inputs
    document.getElementById('customWidth').value = '';
    document.getElementById('customHeight').value = '';
    document.getElementById('customFileSize').value = '';
    
    updateFormatInfo();
    showMessage('Tool reset successfully!', 'info');
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.innerHTML = `
        <div class="message-content">
            <i class="fas ${getMessageIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getMessageColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    document.body.appendChild(messageEl);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => messageEl.remove(), 300);
        }
    }, 5000);
}

function getMessageIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function getMessageColor(type) {
    switch (type) {
        case 'success': return '#48bb78';
        case 'error': return '#f56565';
        case 'warning': return '#ed8936';
        default: return '#4299e1';
    }
}

// Add CSS animations for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .message-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
`;
document.head.appendChild(style);

