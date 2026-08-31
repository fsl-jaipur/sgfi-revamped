// ============================================================================
// DYNAMIC CERTIFICATE GENERATOR & IMAGE RESOLVER (SINGLE SOURCE OF TRUTH)
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

let activeResolvedUrl = null;
let templateImg = null;
let isResolvingImage = false;
let isGeneratorInitialized = false;
let isDownloading = false;

export let CERTIFICATE_IMAGE = '/Image/Image.jpeg';

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

// Dynamically resolve and activate the certificate image currently present in the Image folder
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

// Initialize the Certificate Generator controls and live preview
export function initCertificateGenerator() {
  const recipientInput = document.getElementById('recipientInput');
  const displayRecipientName = document.getElementById('displayRecipientName');
  const btnClear = document.getElementById('btnClear');
  const btnDownload = document.getElementById('btnDownload');
  const fontSelect = document.getElementById('fontSelect');
  const colorPicker = document.getElementById('colorPicker');
  const colorHex = document.getElementById('colorHex');
  const presetChips = document.querySelectorAll('.chip, .cert-chip');

  if (!recipientInput || !displayRecipientName) return;

  // Resolve active certificate image dynamically with cache-busting
  resolveActiveCertificateImage();

  // Attach auto-recovery onerror handler on preview image
  const certBgEl = document.getElementById('certificateBg');
  if (certBgEl) {
    certBgEl.onerror = () => {
      resolveActiveCertificateImage(true);
    };
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

      // Name position percentage matching preview overlay (50% X, 46.25% Y)
      const posX = exportWidth * 0.5;
      const posY = exportHeight * 0.4625;

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
