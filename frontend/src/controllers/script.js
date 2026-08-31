// ============================================================================
// DYNAMIC CERTIFICATE GENERATOR, IMAGE RESOLVER & NAME POSITION EDITOR
// SINGLE SOURCE OF TRUTH FOR CERTIFICATE TEMPLATE & RECIPIENT COORDINATES
// ============================================================================

// 1. Dynamic Image Discovery via Vite Glob (Build/Dev time discovery of any filename/extension)
const globImageModules = import.meta.glob(
  [
    '/public/Image/*.*',
    '/public/image/*.*',
    '../../public/Image/*.*',
    '../../public/image/*.*',
  ],
  { eager: true, query: '?url', import: 'default' }
);

// Extract normalized URL list from Vite glob discovery
function getDiscoveredGlobUrls() {
  const urls = [];
  for (const [key, val] of Object.entries(globImageModules)) {
    if (typeof val === 'string' && val) {
      urls.push(val);
    }
    // Normalize /public/ prefix to public web server URL path
    const normalizedKey = key
      .replace(/^(\.\.\/)+public\//, '/')
      .replace(/^\/public\//, '/');
    if (!urls.includes(normalizedKey)) {
      urls.push(normalizedKey);
    }
  }
  return urls;
}

// Generate candidate fallback URLs across all standard extensions & common naming conventions
function getCandidateUrls() {
  const discovered = getDiscoveredGlobUrls();
  const baseNames = [
    'Image',
    'image',
    'Certificate',
    'certificate',
    'Template',
    'template',
    'cert',
    'Cert',
    'bg',
    'background',
    'default',
  ];
  const extensions = [
    'jpeg',
    'jpg',
    'png',
    'webp',
    'svg',
    'avif',
    'JPEG',
    'JPG',
    'PNG',
    'WEBP',
    'SVG',
  ];
  const prefixes = ['/Image/', 'Image/'];

  const candidates = [...discovered];

  for (const prefix of prefixes) {
    for (const name of baseNames) {
      for (const ext of extensions) {
        const path = `${prefix}${name}.${ext}`;
        if (!candidates.includes(path)) {
          candidates.push(path);
        }
      }
    }
  }

  return candidates;
}

// ============================================================================
// POSITION & CERTIFICATE STORAGE (SINGLE SOURCE OF TRUTH)
// ============================================================================
export const DEFAULT_POSITION = { x: 50.0, y: 46.25 };
export const STORAGE_KEY = 'sgfi_cert_name_position';
export const ACTIVE_CERT_STORAGE_KEY = 'sgfi_active_certificate_url';

let currentPosition = { ...DEFAULT_POSITION };
let isEditorMode = false;
let isDragging = false;

// Retrieve saved percentage position from persistent localStorage
export function getCertificateNamePosition() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        typeof parsed.x === 'number' &&
        typeof parsed.y === 'number' &&
        !isNaN(parsed.x) &&
        !isNaN(parsed.y)
      ) {
        return {
          x: Math.round(Math.max(0, Math.min(100, parsed.x)) * 100) / 100,
          y: Math.round(Math.max(0, Math.min(100, parsed.y)) * 100) / 100,
        };
      }
    }
  } catch (_) {}
  return { ...DEFAULT_POSITION };
}

// Persist percentage position to localStorage and apply live
export function saveCertificateNamePosition(position) {
  if (
    !position ||
    typeof position.x !== 'number' ||
    typeof position.y !== 'number' ||
    isNaN(position.x) ||
    isNaN(position.y)
  ) {
    return false;
  }
  const cleanPos = {
    x: Math.round(Math.max(0, Math.min(100, position.x)) * 100) / 100,
    y: Math.round(Math.max(0, Math.min(100, position.y)) * 100) / 100,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanPos));
  } catch (_) {}
  currentPosition = { ...cleanPos };
  applyCertificateNamePosition(cleanPos.x, cleanPos.y);
  return true;
}

// Reset position to default { x: 50, y: 46.25 }
export function resetCertificateNamePosition() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  currentPosition = { ...DEFAULT_POSITION };
  applyCertificateNamePosition(DEFAULT_POSITION.x, DEFAULT_POSITION.y);
  return { ...DEFAULT_POSITION };
}

// Apply percentage coordinates to the DOM overlay container
export function applyCertificateNamePosition(x, y) {
  const nameContainer = document.getElementById('nameContainer');
  if (nameContainer) {
    nameContainer.style.left = `${x}%`;
    nameContainer.style.top = `${y}%`;
    nameContainer.style.transform = 'translate(-50%, -50%)';
  }
}

let activeResolvedUrl = null;
let templateImg = null;
let isResolvingImage = false;
let isGeneratorInitialized = false;
let isDownloading = false;

export let CERTIFICATE_IMAGE = '/Image/Image.jpeg';

// Set active certificate template image from Cloudinary or external URL
export async function setActiveCertificateUrl(url) {
  if (!url) return false;
  try {
    localStorage.setItem(ACTIVE_CERT_STORAGE_KEY, url);
  } catch (_) {}
  activeResolvedUrl = url;
  CERTIFICATE_IMAGE = url;

  const probe = await probeImage(url);
  if (probe) {
    templateImg = probe.img;
    applyResolvedImageToDOM(probe);
    return true;
  } else {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      templateImg = img;
      applyResolvedImageToDOM({
        url,
        fullUrl: url,
        img,
        width: img.naturalWidth || 2048,
        height: img.naturalHeight || 1446,
      });
    };
    img.src = url;
    return true;
  }
}

// Reset active certificate back to default local template
export async function resetActiveCertificateUrl() {
  try {
    localStorage.removeItem(ACTIVE_CERT_STORAGE_KEY);
  } catch (_) {}
  activeResolvedUrl = null;
  return await resolveActiveCertificateImage(true);
}

const NORMAL_DOWNLOAD_BTN_HTML = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
  Download Certificate
`;

// Probe a single image URL with cache-busting and CORS support
function probeImage(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const cacheBuster = (url.includes('?') ? '&' : '?') + '_v=' + Date.now();
    const probeSrc = url + cacheBuster;

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({
          url,
          fullUrl: probeSrc,
          img,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } else {
        resolve(null);
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(null);
    };

    img.src = probeSrc;
  });
}

function applyResolvedImageToDOM(resolved) {
  if (!resolved) return;
  const certBgEl = document.getElementById('certificateBg');
  if (certBgEl) {
    certBgEl.crossOrigin = 'anonymous';
    certBgEl.src = resolved.fullUrl || resolved.url + '?_v=' + Date.now();
  }

  const wrapperEl = document.getElementById('certificateWrapper');
  if (wrapperEl && resolved.width && resolved.height) {
    wrapperEl.style.aspectRatio = `${resolved.width} / ${resolved.height}`;
  }
}

// Dynamically resolve and activate the certificate image (Cloudinary or local template)
export async function resolveActiveCertificateImage(forceRefresh = false) {
  if (
    activeResolvedUrl &&
    templateImg &&
    templateImg.naturalWidth > 0 &&
    !forceRefresh
  ) {
    return {
      url: activeResolvedUrl,
      img: templateImg,
      width: templateImg.naturalWidth,
      height: templateImg.naturalHeight,
    };
  }

  if (isResolvingImage) {
    await new Promise((res) => setTimeout(res, 100));
    if (activeResolvedUrl && templateImg) {
      return {
        url: activeResolvedUrl,
        img: templateImg,
        width: templateImg.naturalWidth,
        height: templateImg.naturalHeight,
      };
    }
  }

  isResolvingImage = true;

  try {
    // 0. Priority: Check custom uploaded Cloudinary URL in persistent localStorage
    const customUrl = localStorage.getItem(ACTIVE_CERT_STORAGE_KEY);
    if (customUrl && !forceRefresh) {
      const customProbe = await probeImage(customUrl);
      if (customProbe) {
        activeResolvedUrl = customProbe.url;
        CERTIFICATE_IMAGE = customProbe.url;
        templateImg = customProbe.img;
        applyResolvedImageToDOM(customProbe);
        return customProbe;
      }
    }

    // 1. Fast parallel check of discovered glob URLs
    const globUrls = getDiscoveredGlobUrls();
    if (globUrls.length > 0) {
      const globProbes = await Promise.all(globUrls.map(probeImage));
      const validGlob = globProbes.find((res) => res !== null);
      if (validGlob) {
        activeResolvedUrl = validGlob.url;
        CERTIFICATE_IMAGE = validGlob.url;
        templateImg = validGlob.img;
        applyResolvedImageToDOM(validGlob);
        return validGlob;
      }
    }

    // 2. Sequential / candidate probing across all common names and extensions
    const candidates = getCandidateUrls();
    for (const candidate of candidates) {
      const res = await probeImage(candidate);
      if (res) {
        activeResolvedUrl = res.url;
        CERTIFICATE_IMAGE = res.url;
        templateImg = res.img;
        applyResolvedImageToDOM(res);
        return res;
      }
    }

    console.warn('⚠️ No active certificate image could be loaded from candidate paths in /Image.');
    return null;
  } finally {
    isResolvingImage = false;
  }
}

export function getCertificateImageSrc() {
  return activeResolvedUrl || CERTIFICATE_IMAGE;
}

// Switch between Certificate Studio tabs: 'generator', 'position', 'upload'
export function setCertificateTab(tabName = 'generator') {
  const nameContainer = document.getElementById('nameContainer');
  const generatorPanel = document.getElementById('certGeneratorControls');
  const positionPanel = document.getElementById('certPositionControls');
  const uploadPanel = document.getElementById('certImageUploadControls');
  const tabGenerator = document.getElementById('certTabGenerator');
  const tabPosition = document.getElementById('certTabPositionEditor');
  const tabUpload = document.getElementById('certTabImageUpload');
  const modeBadge = document.getElementById('certModeBadge');
  const savedAlert = document.getElementById('certPosSavedAlert');
  const uploadAlert = document.getElementById('certUploadAlert');

  if (savedAlert) savedAlert.classList.add('hidden');
  if (uploadAlert) uploadAlert.classList.add('hidden');

  isEditorMode = tabName === 'position';

  if (tabGenerator) tabGenerator.classList.toggle('active', tabName === 'generator');
  if (tabPosition) tabPosition.classList.toggle('active', tabName === 'position');
  if (tabUpload) tabUpload.classList.toggle('active', tabName === 'upload');

  if (generatorPanel) generatorPanel.classList.toggle('hidden', tabName !== 'generator');
  if (positionPanel) positionPanel.classList.toggle('hidden', tabName !== 'position');
  if (uploadPanel) uploadPanel.classList.toggle('hidden', tabName !== 'upload');

  const pos = getCertificateNamePosition();
  currentPosition = { ...pos };
  applyCertificateNamePosition(pos.x, pos.y);

  const inputX = document.getElementById('certPosX');
  const inputY = document.getElementById('certPosY');
  const liveBadge = document.getElementById('posLiveBadge');

  if (inputX) inputX.value = pos.x.toFixed(2);
  if (inputY) inputY.value = pos.y.toFixed(2);
  if (liveBadge) liveBadge.textContent = `X: ${pos.x.toFixed(1)}% | Y: ${pos.y.toFixed(1)}%`;

  if (tabName === 'position') {
    if (nameContainer) nameContainer.classList.add('is-draggable');
    if (modeBadge) {
      modeBadge.textContent = '🎯 Drag Mode Active';
      modeBadge.classList.add('cert-badge-active');
    }
  } else if (tabName === 'upload') {
    if (nameContainer) nameContainer.classList.remove('is-draggable', 'is-dragging');
    if (modeBadge) {
      modeBadge.textContent = '🖼️ Template Upload';
      modeBadge.classList.add('cert-badge-active');
    }
  } else {
    if (nameContainer) nameContainer.classList.remove('is-draggable', 'is-dragging');
    if (modeBadge) {
      modeBadge.textContent = 'Live Preview';
      modeBadge.classList.remove('cert-badge-active');
    }
  }
}

// Alias for backwards compatibility
export function setCertificateEditorMode(enabled) {
  setCertificateTab(enabled ? 'position' : 'generator');
}

// Setup draggable interaction on the recipient name box
function setupPositionEditorDrag() {
  const nameContainer = document.getElementById('nameContainer');
  const certificateWrapper = document.getElementById('certificateWrapper');
  const inputX = document.getElementById('certPosX');
  const inputY = document.getElementById('certPosY');
  const liveBadge = document.getElementById('posLiveBadge');

  if (!nameContainer || !certificateWrapper) return;

  const updateCoordinates = (x, y) => {
    currentPosition = { x, y };
    applyCertificateNamePosition(x, y);
    if (inputX) inputX.value = x.toFixed(2);
    if (inputY) inputY.value = y.toFixed(2);
    if (liveBadge) liveBadge.textContent = `X: ${x.toFixed(1)}% | Y: ${y.toFixed(1)}%`;
  };

  const handlePointerDown = (e) => {
    // Enable dragging when in editor mode or when clicked directly on draggable name
    if (!isEditorMode && !e.target.closest('#nameContainer.is-draggable')) return;

    isDragging = true;
    nameContainer.classList.add('is-dragging');
    if (e.cancelable) e.preventDefault();
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const rect = certificateWrapper.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;

    x = Math.max(0, Math.min(100, Math.round(x * 100) / 100));
    y = Math.max(0, Math.min(100, Math.round(y * 100) / 100));

    updateCoordinates(x, y);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      isDragging = false;
      nameContainer.classList.remove('is-dragging');
    }
  };

  nameContainer.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  nameContainer.addEventListener('touchstart', handlePointerDown, { passive: false });
  window.addEventListener('touchmove', handlePointerMove, { passive: false });
  window.addEventListener('touchend', handlePointerUp);

  if (inputX) {
    inputX.addEventListener('input', () => {
      const valX = parseFloat(inputX.value);
      if (!isNaN(valX)) {
        const cleanX = Math.max(0, Math.min(100, valX));
        updateCoordinates(cleanX, currentPosition.y);
      }
    });
  }

  if (inputY) {
    inputY.addEventListener('input', () => {
      const valY = parseFloat(inputY.value);
      if (!isNaN(valY)) {
        const cleanY = Math.max(0, Math.min(100, valY));
        updateCoordinates(currentPosition.x, cleanY);
      }
    });
  }
}

// Initialize the Certificate Generator controls, position editor, and live preview
export function initCertificateGenerator() {
  const recipientInput = document.getElementById('recipientInput');
  const displayRecipientName = document.getElementById('displayRecipientName');
  const btnClear = document.getElementById('btnClear');
  const btnDownload = document.getElementById('btnDownload');
  const fontSelect = document.getElementById('fontSelect');
  const colorPicker = document.getElementById('colorPicker');
  const colorHex = document.getElementById('colorHex');
  const presetChips = document.querySelectorAll('.chip, .cert-chip');

  // Position Editor Elements
  const tabGenerator = document.getElementById('certTabGenerator');
  const tabEditor = document.getElementById('certTabPositionEditor');
  const btnOpenPositionEditor = document.getElementById('btnOpenPositionEditor');
  const btnSavePosition = document.getElementById('btnSavePosition');
  const btnResetPosition = document.getElementById('btnResetPosition');
  const btnBackToGenerator = document.getElementById('btnBackToGenerator');
  const btnCenterHorizontal = document.getElementById('btnCenterHorizontal');
  const certPosSavedAlert = document.getElementById('certPosSavedAlert');

  if (!recipientInput || !displayRecipientName) return;

  // 1. Load and apply persistent percentage position
  const savedPos = getCertificateNamePosition();
  currentPosition = { ...savedPos };
  applyCertificateNamePosition(savedPos.x, savedPos.y);

  // 2. Resolve active certificate image dynamically with cache-busting
  resolveActiveCertificateImage();

  // 3. Attach auto-recovery onerror handler on preview image
  const certBgEl = document.getElementById('certificateBg');
  if (certBgEl) {
    certBgEl.onerror = () => {
      resolveActiveCertificateImage(true);
    };
  }

  // 4. Setup drag & drop for position editor
  setupPositionEditorDrag();

// Setup certificate image uploader to Cloudinary
function setupCertificateImageUploader() {
  const fileInput = document.getElementById('certImageFileInput');
  const btnChoose = document.getElementById('btnChooseCertFile');
  const dropzone = document.getElementById('certFileDropzone');
  const dropzonePrompt = document.getElementById('certDropzonePrompt');
  const selectedFileCard = document.getElementById('certSelectedFileCard');
  const previewThumb = document.getElementById('certLocalPreviewImg');
  const fileNameEl = document.getElementById('certSelectedFileName');
  const fileSizeEl = document.getElementById('certSelectedFileSize');
  const btnRemove = document.getElementById('btnRemoveSelectedFile');
  const btnUpload = document.getElementById('btnUploadCertImage');
  const btnReset = document.getElementById('btnResetDefaultCert');
  const btnBack = document.getElementById('btnBackFromUpload');
  const alertEl = document.getElementById('certUploadAlert');
  const btnOpenUploadTab = document.getElementById('btnOpenImageUploadTab');
  const tabUpload = document.getElementById('certTabImageUpload');

  let selectedFile = null;

  const showUploadMessage = (text, type = 'success') => {
    if (!alertEl) return;
    alertEl.textContent = text;
    alertEl.className = `admin-alert admin-alert-${type} mb-3 text-xs`;
    alertEl.classList.remove('hidden');
  };

  const clearUploadMessage = () => {
    if (!alertEl) return;
    alertEl.textContent = '';
    alertEl.classList.add('hidden');
  };

  const resetFileSelection = () => {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (selectedFileCard) selectedFileCard.classList.add('hidden');
    if (dropzonePrompt) dropzonePrompt.classList.remove('hidden');
    if (previewThumb) previewThumb.src = '';
    if (btnUpload) btnUpload.disabled = true;
  };

  const handleFileSelected = (file) => {
    clearUploadMessage();
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = (file.name || '').split('.').pop().toLowerCase();
    const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      showUploadMessage('Invalid file format. Only PNG, JPG, JPEG, and WEBP images are supported.', 'error');
      resetFileSelection();
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      showUploadMessage('File size exceeds the 10 MB limit. Please select a smaller image.', 'error');
      resetFileSelection();
      return;
    }

    selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (previewThumb) previewThumb.src = e.target.result;
      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileSizeEl) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        fileSizeEl.textContent = `${sizeMB} MB`;
      }
      if (dropzonePrompt) dropzonePrompt.classList.add('hidden');
      if (selectedFileCard) selectedFileCard.classList.remove('hidden');
      if (btnUpload) btnUpload.disabled = false;
    };
    reader.readAsDataURL(file);
  };

  if (btnChoose && fileInput) {
    btnChoose.addEventListener('click', (e) => {
      e.preventDefault();
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelected(e.target.files[0]);
      }
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener('click', (e) => {
      e.preventDefault();
      resetFileSelection();
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  if (btnUpload) {
    btnUpload.addEventListener('click', async () => {
      if (!selectedFile) {
        showUploadMessage('Please select an image file first.', 'error');
        return;
      }

      btnUpload.disabled = true;
      const origHtml = btnUpload.innerHTML;
      btnUpload.innerHTML = `
        <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"></circle>
        </svg>
        Uploading to Cloudinary...
      `;

      try {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('folder', 'sgfi_certificates');

        const backendBase = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendBase}/api/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success || !data.url) {
          throw new Error(data.message || 'Failed to upload certificate to Cloudinary.');
        }

        await setActiveCertificateUrl(data.url);

        showUploadMessage('✓ Certificate image uploaded to Cloudinary & activated successfully!', 'success');
        resetFileSelection();
      } catch (error) {
        console.error('Certificate upload error:', error);
        showUploadMessage(error.message || 'Upload failed. Please ensure you are logged in as admin.', 'error');
      } finally {
        btnUpload.disabled = !selectedFile;
        btnUpload.innerHTML = origHtml;
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      const confirmed = window.confirm('Reset the active certificate back to the local default template?');
      if (!confirmed) return;

      await resetActiveCertificateUrl();
      showUploadMessage('✓ Active certificate restored to default template.', 'success');
      resetFileSelection();
    });
  }

  if (btnBack) {
    btnBack.addEventListener('click', () => setCertificateTab('generator'));
  }

  if (btnOpenUploadTab) {
    btnOpenUploadTab.addEventListener('click', () => setCertificateTab('upload'));
  }

  if (tabUpload) {
    tabUpload.addEventListener('click', () => setCertificateTab('upload'));
  }
}

  // Tab & mode switching
  if (tabGenerator) {
    tabGenerator.addEventListener('click', () => setCertificateTab('generator'));
  }
  if (tabEditor) {
    tabEditor.addEventListener('click', () => setCertificateTab('position'));
  }
  if (btnOpenPositionEditor) {
    btnOpenPositionEditor.addEventListener('click', () => setCertificateTab('position'));
  }
  if (btnBackToGenerator) {
    btnBackToGenerator.addEventListener('click', () => setCertificateTab('generator'));
  }

  // Setup Certificate Image Uploader
  setupCertificateImageUploader();

  // Quick Center X button
  if (btnCenterHorizontal) {
    btnCenterHorizontal.addEventListener('click', () => {
      currentPosition.x = 50.0;
      applyCertificateNamePosition(50.0, currentPosition.y);
      const inputX = document.getElementById('certPosX');
      if (inputX) inputX.value = '50.00';
    });
  }

  // Save Position button
  if (btnSavePosition) {
    btnSavePosition.addEventListener('click', () => {
      saveCertificateNamePosition(currentPosition);
      if (certPosSavedAlert) {
        certPosSavedAlert.textContent = `✓ Name position saved successfully! (X: ${currentPosition.x.toFixed(1)}%, Y: ${currentPosition.y.toFixed(1)}%)`;
        certPosSavedAlert.classList.remove('hidden');
        setTimeout(() => {
          if (certPosSavedAlert) certPosSavedAlert.classList.add('hidden');
        }, 4000);
      }
    });
  }

  // Reset Position button
  if (btnResetPosition) {
    btnResetPosition.addEventListener('click', () => {
      const def = resetCertificateNamePosition();
      const inputX = document.getElementById('certPosX');
      const inputY = document.getElementById('certPosY');
      const liveBadge = document.getElementById('posLiveBadge');
      if (inputX) inputX.value = def.x.toFixed(2);
      if (inputY) inputY.value = def.y.toFixed(2);
      if (liveBadge) liveBadge.textContent = `X: ${def.x.toFixed(1)}% | Y: ${def.y.toFixed(1)}%`;
      if (certPosSavedAlert) {
        certPosSavedAlert.textContent = `✓ Position reset to default (X: ${def.x}%, Y: ${def.y}%)`;
        certPosSavedAlert.classList.remove('hidden');
        setTimeout(() => {
          if (certPosSavedAlert) certPosSavedAlert.classList.add('hidden');
        }, 3000);
      }
    });
  }

  recipientInput.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
      const pos = recipientInput.selectionStart;
      const val = recipientInput.value;

      if (pos === 0 || !val.trim()) {
        event.preventDefault();
        return;
      }

      if (val.charAt(pos - 1) === ' ' || val.charAt(pos) === ' ') {
        event.preventDefault();
        return;
      }
    }
  });

  const sanitizeCertInput = () => {
    let val = recipientInput.value;
    val = val.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
    if (recipientInput.value !== val) {
      recipientInput.value = val;
    }
  };

  recipientInput.addEventListener('input', sanitizeCertInput);

  recipientInput.addEventListener('paste', () => {
    setTimeout(sanitizeCertInput, 0);
  });

  recipientInput.addEventListener('blur', () => {
    if (recipientInput.value) {
      recipientInput.value = recipientInput.value.trim();
    }
  });

  function updateCertificateName() {
    const rawValue = recipientInput.value;
    const name = rawValue.trim() !== '' ? rawValue.trim() : 'Jatin Verma';

    displayRecipientName.textContent = name;

    if (fontSelect) {
      displayRecipientName.style.fontFamily = fontSelect.value;
    } else {
      displayRecipientName.style.fontFamily = "'Shrikhand', cursive, serif";
    }

    if (colorPicker) {
      displayRecipientName.style.color = colorPicker.value;
      if (colorHex) colorHex.textContent = colorPicker.value.toLowerCase();
    } else {
      displayRecipientName.style.color = '#fb4d3d';
    }

    const length = name.length;
    if (length <= 14) {
      displayRecipientName.style.fontSize = 'clamp(18px, 5.2vw, 64px)';
    } else if (length <= 22) {
      displayRecipientName.style.fontSize = 'clamp(15px, 4.0vw, 48px)';
    } else if (length <= 30) {
      displayRecipientName.style.fontSize = 'clamp(12px, 3.0vw, 36px)';
    } else {
      displayRecipientName.style.fontSize = 'clamp(10px, 2.2vw, 26px)';
    }
  }

  async function downloadCertificatePNG() {
    const currentBtn = document.getElementById('btnDownload');
    const currentCanvas = document.getElementById('exportCanvas');
    if (!currentBtn || !currentCanvas || isDownloading) return;

    const ctx = currentCanvas.getContext('2d');
    if (!ctx) return;

    const validationMsgEl = document.getElementById('certValidationMessage');
    if (validationMsgEl) {
      validationMsgEl.classList.add('hidden');
      validationMsgEl.textContent = '';
    }

    const rawValue = recipientInput.value.trim();
    if (!rawValue) {
      if (validationMsgEl) {
        validationMsgEl.textContent =
          'Recipient Name is required for generating certificate.';
        validationMsgEl.classList.remove('hidden');
      } else {
        alert('Recipient Name is required for generating certificate.');
      }
      recipientInput.focus();
      return;
    }

    const selectedFont = fontSelect
      ? fontSelect.value
      : "'Shrikhand', cursive, serif";
    const selectedColor = colorPicker ? colorPicker.value : '#fb4d3d';

    if (!selectedFont) {
      if (validationMsgEl) {
        validationMsgEl.textContent = 'Please select a Font Style.';
        validationMsgEl.classList.remove('hidden');
      }
      return;
    }

    if (!selectedColor || !/^#[0-9A-F]{6}$/i.test(selectedColor)) {
      if (validationMsgEl) {
        validationMsgEl.textContent = 'Please select a valid Name Color.';
        validationMsgEl.classList.remove('hidden');
      }
      return;
    }

    const resetBtnState = () => {
      isDownloading = false;
      if (currentBtn) {
        currentBtn.disabled = false;
        currentBtn.innerHTML = NORMAL_DOWNLOAD_BTN_HTML;
      }
    };

    const name = rawValue;
    isDownloading = true;
    currentBtn.disabled = true;
    currentBtn.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"></circle>
      </svg>
      Generating High-Res PNG...
    `;

    try {
      // Ensure we have active resolved template image
      const resolved = await resolveActiveCertificateImage();
      const currentImage = resolved ? resolved.img : templateImg;

      if (!currentImage || !currentImage.complete || currentImage.naturalWidth === 0) {
        throw new Error('Failed to load active certificate template image.');
      }

      if (document.fonts && document.fonts.load) {
        try {
          const fontFamilyName = selectedFont.split(',')[0].replace(/['"]/g, '');
          await document.fonts.load(`120px "${fontFamilyName}"`);
        } catch (_) {}
      }

      const exportWidth = currentImage.naturalWidth || 2048;
      const exportHeight = currentImage.naturalHeight || 1446;

      currentCanvas.width = exportWidth;
      currentCanvas.height = exportHeight;

      ctx.clearRect(0, 0, exportWidth, exportHeight);
      ctx.drawImage(currentImage, 0, 0, exportWidth, exportHeight);

      // Single source of truth: Read exact saved position percentage
      const pos = getCertificateNamePosition();
      const posX = exportWidth * (pos.x / 100);
      const posY = exportHeight * (pos.y / 100);

      let fontSize = Math.round(exportHeight * (120 / 1446));
      if (name.length > 14) {
        fontSize = Math.max(
          Math.round(exportHeight * (40 / 1446)),
          Math.round(fontSize * (14 / name.length))
        );
      }

      ctx.save();
      ctx.font = `${fontSize}px ${selectedFont}`;
      ctx.fillStyle = selectedColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, posX, posY);
      ctx.restore();

      let dataURL = '';
      try {
        dataURL = currentCanvas.toDataURL('image/png', 1.0);
      } catch (e) {
        if (typeof html2canvas !== 'undefined') {
          const canvasEl = await html2canvas(
            document.getElementById('certificateWrapper'),
            {
              scale: 2,
              useCORS: true,
              backgroundColor: null,
            }
          );
          dataURL = canvasEl.toDataURL('image/png');
        }
      }

      if (dataURL) {
        const link = document.createElement('a');
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `Certificate_${safeName}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('Could not generate canvas image data URL.');
      }
    } catch (err) {
      console.error('Error generating certificate:', err);
      if (validationMsgEl) {
        validationMsgEl.textContent =
          err.message || 'Failed to generate certificate PNG. Please try again.';
        validationMsgEl.classList.remove('hidden');
      }
    } finally {
      resetBtnState();
    }
  }

  if (!isGeneratorInitialized) {
    isGeneratorInitialized = true;

    recipientInput.addEventListener('input', () => {
      const validationMsgEl = document.getElementById('certValidationMessage');
      if (validationMsgEl && recipientInput.value.trim()) {
        validationMsgEl.classList.add('hidden');
        validationMsgEl.textContent = '';
      }
      updateCertificateName();
    });

    if (fontSelect) fontSelect.addEventListener('change', updateCertificateName);
    if (colorPicker) colorPicker.addEventListener('input', updateCertificateName);

    if (btnClear) {
      btnClear.addEventListener('click', () => {
        recipientInput.value = '';
        recipientInput.focus();
        updateCertificateName();
      });
    }

    presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const selectedName = chip.getAttribute('data-name');
        if (recipientInput) {
          recipientInput.value = selectedName;
          updateCertificateName();
        }
      });
    });

    if (btnDownload) {
      btnDownload.addEventListener('click', downloadCertificatePNG);
    }
  }

  updateCertificateName();
}

// Set recipient name programmatically (e.g. from backend/admin records)
export function setCertificateRecipient(name) {
  const recipientInput = document.getElementById('recipientInput');
  const validationMsgEl = document.getElementById('certValidationMessage');
  if (validationMsgEl) {
    validationMsgEl.classList.add('hidden');
    validationMsgEl.textContent = '';
  }
  if (recipientInput) {
    recipientInput.value = name || '';
    recipientInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Auto-initialize when document is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('recipientInput')) {
        initCertificateGenerator();
      }
    });
  } else {
    if (document.getElementById('recipientInput')) {
      initCertificateGenerator();
    }
  }
}
