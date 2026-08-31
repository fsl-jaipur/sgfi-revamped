document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
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

  // Preload Template Image for Canvas dynamically
  let templateImg = new Image();
  templateImg.crossOrigin = 'anonymous';

  const candidatePaths = [
    '/Image/Image.jpeg',
    '/Image/Image.jpg',
    '/Image/Image.png',
    '/Image/Image.webp',
    '/Image/certificate.jpeg',
    '/Image/certificate.jpg',
    '/Image/certificate.png',
    '/Image/Certificate.jpeg',
    '/Image/Certificate.jpg',
    '/Image/Certificate.png',
    'Image/Image.jpeg',
    'Image/Image.jpg',
    'Image/Image.png',
    'Image/Image.webp',
  ];

  const probeNextCandidate = (index = 0) => {
    if (index >= candidatePaths.length) {
      console.warn('Could not resolve certificate background image from candidate paths.');
      return;
    }
    const path = candidatePaths[index];
    const testImg = new Image();
    testImg.crossOrigin = 'anonymous';
    const cacheBusted = (path.includes('?') ? '&' : '?') + '_v=' + Date.now();
    
    testImg.onload = () => {
      if (testImg.naturalWidth > 0) {
        templateImg = testImg;
        const certBg = document.getElementById('certificateBg');
        if (certBg) {
          certBg.crossOrigin = 'anonymous';
          certBg.src = path + cacheBusted;
        }
      } else {
        probeNextCandidate(index + 1);
      }
    };
    testImg.onerror = () => {
      probeNextCandidate(index + 1);
    };
    testImg.src = path + cacheBusted;
  };

  probeNextCandidate(0);

  // Ensure fonts are loaded before canvas rendering
  document.fonts?.ready?.then(() => {
    console.log('Fonts loaded successfully.');
  });

  // Update Live Preview Name, Font, and Color
  function updateCertificateName() {
    if (!recipientInput || !displayRecipientName) return;
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

  // Event Listeners for Input Controls
  if (recipientInput) recipientInput.addEventListener('input', updateCertificateName);

  if (fontSelect) {
    fontSelect.addEventListener('change', updateCertificateName);
  }

  if (colorPicker) {
    colorPicker.addEventListener('input', updateCertificateName);
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (recipientInput) {
        recipientInput.value = '';
        recipientInput.focus();
      }
      updateCertificateName();
    });
  }

  // Preset Chips
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const selectedName = chip.getAttribute('data-name');
      if (recipientInput) {
        recipientInput.value = selectedName;
        updateCertificateName();
      }
    });
  });

  // Export High-Resolution PNG (2048 x 1446)
  async function downloadCertificatePNG() {
    if (!btnDownload || !exportCanvas || !ctx) return;
    const rawValue = recipientInput ? recipientInput.value : '';
    const name = rawValue.trim() !== '' ? rawValue.trim() : 'Jatin Verma';
    const selectedFont = fontSelect ? fontSelect.value : "'Shrikhand', cursive, serif";
    const selectedColor = colorPicker ? colorPicker.value : "#fb4d3d";

    btnDownload.disabled = true;
    btnDownload.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"></circle>
      </svg>
      Generating High-Res PNG...
    `;

    if (document.fonts && document.fonts.load) {
      try {
        const fontFamilyName = selectedFont.split(',')[0].replace(/['"]/g, '');
        await document.fonts.load(`120px "${fontFamilyName}"`);
      } catch (_) {}
    }

    const exportWidth = templateImg?.naturalWidth || 2048;
    const exportHeight = templateImg?.naturalHeight || 1446;

    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;

    const render = () => {
      ctx.clearRect(0, 0, exportWidth, exportHeight);
      ctx.drawImage(templateImg, 0, 0, exportWidth, exportHeight);

      // Name position percentage matching preview overlay (50% X, 46.25% Y)
      const posX = exportWidth * 0.5;
      const posY = exportHeight * 0.4625;

      let fontSize = Math.round(exportHeight * (120 / 1446));
      if (name.length > 14) {
        fontSize = Math.max(Math.round(exportHeight * (40 / 1446)), Math.round(fontSize * (14 / name.length)));
      }

      ctx.save();
      ctx.font = `${fontSize}px ${selectedFont}`;
      ctx.fillStyle = selectedColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, posX, posY);
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
              backgroundColor: null
            }).then(canvasEl => {
              const dataURL = canvasEl.toDataURL('image/png');
              const link = document.createElement('a');
              link.download = `Certificate_${name.toLowerCase()}.png`;
              link.href = dataURL;
              link.click();
            });
          }
        } finally {
          btnDownload.disabled = false;
          btnDownload.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Certificate
          `;
        }
      }, 100);
    };

    if (templateImg.complete && templateImg.naturalWidth > 0) {
      render();
    } else {
      templateImg.onload = render;
    }
  }

  if (btnDownload) btnDownload.addEventListener('click', downloadCertificatePNG);

  // Initial update
  updateCertificateName();
});
