document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const recipientInput = document.getElementById('recipientInput');
  const displayRecipientName = document.getElementById('displayRecipientName');
  const btnClear = document.getElementById('btnClear');
  const btnDownload = document.getElementById('btnDownload');
  const fontSelect = document.getElementById('fontSelect');
  const colorPicker = document.getElementById('colorPicker');
  const colorHex = document.getElementById('colorHex');
  const presetChips = document.querySelectorAll('.chip');
  const exportCanvas = document.getElementById('exportCanvas');
  const ctx = exportCanvas.getContext('2d');

  // Preload Template Image for Canvas
  const templateImg = new Image();
  templateImg.crossOrigin = 'anonymous';
  
  // Use Base64 data if available (guarantees CORS-free execution on file:// protocol), else fallback to file path
  if (typeof TEMPLATE_BASE64 !== 'undefined' && TEMPLATE_BASE64) {
    templateImg.src = TEMPLATE_BASE64;
  } else {
    templateImg.src = 'Image/Image.jpeg';
  }

  // Ensure fonts are loaded before canvas rendering
  document.fonts?.ready?.then(() => {
    console.log('Fonts loaded successfully.');
  });

  // Update Live Preview Name, Font, and Color
  function updateCertificateName() {
    const rawValue = recipientInput.value;
    const name = rawValue.trim() !== '' ? rawValue.trim() : 'NAME';
    
    // Set Uppercase main recipient name
    displayRecipientName.textContent = name.toUpperCase();

    // Apply selected font style
    if (fontSelect) {
      displayRecipientName.style.fontFamily = fontSelect.value;
    }

    // Apply selected color
    if (colorPicker) {
      displayRecipientName.style.color = colorPicker.value;
      colorHex.textContent = colorPicker.value.toLowerCase();
    }

    // Auto Font Scaling based on length
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

  // Event Listeners for Input Controls
  recipientInput.addEventListener('input', updateCertificateName);

  if (fontSelect) {
    fontSelect.addEventListener('change', updateCertificateName);
  }

  if (colorPicker) {
    colorPicker.addEventListener('input', updateCertificateName);
  }

  btnClear.addEventListener('click', () => {
    recipientInput.value = '';
    recipientInput.focus();
    updateCertificateName();
  });

  // Preset Chips
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const selectedName = chip.getAttribute('data-name');
      recipientInput.value = selectedName;
      updateCertificateName();
    });
  });

  // Export High-Resolution PNG (1600 x 1131)
  function downloadCertificatePNG() {
    const rawValue = recipientInput.value;
    const name = (rawValue.trim() !== '' ? rawValue.trim() : 'NAME').toUpperCase();
    const selectedFont = fontSelect ? fontSelect.value : "'Cinzel', serif";
    const selectedColor = colorPicker ? colorPicker.value : "#ca7d08";

    btnDownload.disabled = true;
    btnDownload.innerHTML = `
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"></circle>
      </svg>
      Generating High-Res PNG...
    `;

    // Ensure canvas dimensions match 1600 x 1131
    exportCanvas.width = 1600;
    exportCanvas.height = 1131;

    const render = () => {
      // 1. Draw Base Certificate Background Image
      ctx.clearRect(0, 0, 1600, 1131);
      ctx.drawImage(templateImg, 0, 0, 1600, 1131);

      // 2. Draw Recipient Name (Centered at X=1000, Y=565)
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

      // 3. Trigger Instant Download
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

  btnDownload.addEventListener('click', downloadCertificatePNG);

  // Initial update
  updateCertificateName();
});
