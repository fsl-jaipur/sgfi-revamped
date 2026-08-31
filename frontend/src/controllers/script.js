let templateImg = null;
let isGeneratorInitialized = false;
let isDownloading = false;

const NORMAL_DOWNLOAD_BTN_HTML = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
  Download Certificate
`;

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

  // Pre-load background template image
  if (!templateImg) {
    templateImg = new Image();
    templateImg.crossOrigin = 'anonymous';

    if (typeof TEMPLATE_BASE64 !== 'undefined' && TEMPLATE_BASE64) {
      templateImg.src = TEMPLATE_BASE64;
    } else {
      templateImg.src = '/Image/Image.jpeg';
    }
  }

  function updateCertificateName() {
    const rawValue = recipientInput.value;
    const name = rawValue.trim() !== '' ? rawValue.trim() : 'NAME';

    displayRecipientName.textContent = name.toUpperCase();

    if (fontSelect) {
      displayRecipientName.style.fontFamily = fontSelect.value;
    }

    if (colorPicker) {
      displayRecipientName.style.color = colorPicker.value;
      if (colorHex) colorHex.textContent = colorPicker.value.toLowerCase();
    }

    const length = name.length;
    if (length <= 14) {
      displayRecipientName.style.fontSize = 'clamp(18px, 4.2vw, 62px)';
    } else if (length <= 22) {
      displayRecipientName.style.fontSize = 'clamp(15px, 3.4vw, 48px)';
    } else if (length <= 30) {
      displayRecipientName.style.fontSize = 'clamp(12px, 2.6vw, 36px)';
    } else {
      displayRecipientName.style.fontSize = 'clamp(10px, 2vw, 26px)';
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
        validationMsgEl.textContent = 'Recipient Name is required for generating certificate.';
        validationMsgEl.classList.remove('hidden');
      } else {
        alert('Recipient Name is required for generating certificate.');
      }
      recipientInput.focus();
      return;
    }

    const selectedFont = fontSelect ? fontSelect.value : "'Cinzel', serif";
    const selectedColor = colorPicker ? colorPicker.value : '#ca7d08';

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

    const name = rawValue.toUpperCase();
    isDownloading = true;
    currentBtn.disabled = true;
    currentBtn.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"></circle>
      </svg>
      Generating High-Res PNG...
    `;

    try {
      // Ensure background image is fully loaded
      if (!templateImg.complete || templateImg.naturalWidth === 0) {
        await new Promise((resolve, reject) => {
          templateImg.onload = resolve;
          templateImg.onerror = () => reject(new Error('Failed to load certificate template background image.'));
          setTimeout(resolve, 1500);
        });
      }

      currentCanvas.width = 1600;
      currentCanvas.height = 1131;

      ctx.clearRect(0, 0, 1600, 1131);
      ctx.drawImage(templateImg, 0, 0, 1600, 1131);

      let fontSize = 82;
      if (name.length > 14) {
        fontSize = Math.max(30, Math.round(82 * (14 / name.length)));
      }

      ctx.save();
      ctx.font = `800 ${fontSize}px ${selectedFont}`;
      ctx.fillStyle = selectedColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, 1000, 565);
      ctx.restore();

      // Generate PNG and trigger browser download
      let dataURL = '';
      try {
        dataURL = currentCanvas.toDataURL('image/png', 1.0);
      } catch (e) {
        if (typeof html2canvas !== 'undefined') {
          const canvasEl = await html2canvas(document.getElementById('certificateWrapper'), {
            scale: 2,
            useCORS: true,
            backgroundColor: null,
          });
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
        validationMsgEl.textContent = err.message || 'Failed to generate certificate PNG. Please try again.';
        validationMsgEl.classList.remove('hidden');
      }
    } finally {
      // ALWAYS restore button to normal state
      resetBtnState();
    }
  }

  // Bind event listeners only ONCE
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('recipientInput')) {
    initCertificateGenerator();
  }
});
