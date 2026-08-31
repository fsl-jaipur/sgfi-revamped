let templateImg = null;

export function initCertificateGenerator() {
  const recipientInput = document.getElementById('recipientInput');
  const displayRecipientName = document.getElementById('displayRecipientName');
  const btnClear = document.getElementById('btnClear');
  const btnDownload = document.getElementById('btnDownload');
  const fontSelect = document.getElementById('fontSelect');
  const colorPicker = document.getElementById('colorPicker');
  const colorHex = document.getElementById('colorHex');
  const presetChips = document.querySelectorAll('.chip, .cert-chip');
  const exportCanvas = document.getElementById('exportCanvas');
  const ctx = exportCanvas ? exportCanvas.getContext('2d') : null;

  if (!recipientInput || !displayRecipientName) return;

  templateImg = new Image();
  templateImg.crossOrigin = 'anonymous';

  if (typeof TEMPLATE_BASE64 !== 'undefined' && TEMPLATE_BASE64) {
    templateImg.src = TEMPLATE_BASE64;
  } else {
    templateImg.src = '/Image/Image.jpeg';
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

  recipientInput.addEventListener('input', updateCertificateName);

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

  function downloadCertificatePNG() {
    if (!btnDownload || !exportCanvas || !ctx) return;

    const rawValue = recipientInput.value;
    const name = (rawValue.trim() !== '' ? rawValue.trim() : 'NAME').toUpperCase();
    const selectedFont = fontSelect ? fontSelect.value : "'Cinzel', serif";
    const selectedColor = colorPicker ? colorPicker.value : '#ca7d08';

    const originalHTML = btnDownload.innerHTML;
    btnDownload.disabled = true;
    btnDownload.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"></circle>
      </svg>
      Generating High-Res PNG...
    `;

    exportCanvas.width = 1600;
    exportCanvas.height = 1131;

    const render = () => {
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

      setTimeout(() => {
        try {
          const dataURL = exportCanvas.toDataURL('image/png', 1.0);
          const link = document.createElement('a');
          const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          link.download = `Certificate_${safeName}.png`;
          link.href = dataURL;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (err) {
          console.warn('Canvas direct download fallback to html2canvas:', err);
          if (typeof html2canvas !== 'undefined') {
            html2canvas(document.getElementById('certificateWrapper'), {
              scale: 2,
              useCORS: true,
              backgroundColor: null,
            }).then((canvasEl) => {
              const dataURL = canvasEl.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = `Certificate_${name.toLowerCase()}.png`;
              link.href = dataURL;
              link.click();
            });
          }
        } finally {
          btnDownload.disabled = false;
          btnDownload.innerHTML = originalHTML;
        }
      }, 100);
    };

    if (templateImg.complete && templateImg.naturalWidth > 0) {
      render();
    } else {
      templateImg.onload = render;
    }
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', downloadCertificatePNG);
  }

  updateCertificateName();
}

export function setCertificateRecipient(name) {
  const recipientInput = document.getElementById('recipientInput');
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
