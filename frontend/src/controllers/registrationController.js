document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration-form');
  const photoInput = document.getElementById('photo-upload');
  const filenameLabel = document.getElementById('photo-upload-filename');
  const successContainer = document.getElementById('registration-success');

  if (!form) return;

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const API_URL = `${BACKEND_URL}/api/players/register`;

  // File input change listener
  if (photoInput && filenameLabel) {
    photoInput.addEventListener('change', () => {
      if (photoInput.files && photoInput.files[0]) {
        const file = photoInput.files[0];
        filenameLabel.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
        filenameLabel.classList.add('text-[var(--sgfi-green)]', 'font-semibold');
      } else {
        filenameLabel.textContent = 'No file chosen';
      }
    });
  }

  // Form submit listener
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('full-name')?.value.trim();
    const dob = document.getElementById('dob')?.value;
    const gender = document.getElementById('gender')?.value;
    const aadhaar = document.getElementById('aadhaar')?.value.trim();
    const school = document.getElementById('school')?.value.trim();
    const board = document.getElementById('board')?.value;
    const state = document.getElementById('state')?.value;
    const district = document.getElementById('district')?.value.trim();
    const game = document.getElementById('game')?.value;
    const guardianName = document.getElementById('guardian-name')?.value.trim();
    const guardianContact = document.getElementById('guardian-contact')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const terms = document.getElementById('terms')?.checked;

    if (!fullName || !aadhaar || !game || !terms) {
      alert('Please fill in all required fields (Full Name, Aadhaar, Game selection, and accept Terms).');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit Registration';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Uploading Photo & Registering...
      `;
    }

    try {
      const formData = new FormData();
      formData.append('full_name', fullName);
      formData.append('aadhaar', aadhaar);
      formData.append('game', game);
      formData.append('state', state || 'RAJASTHAN');
      formData.append('school', school || '');
      formData.append('board', board || '');
      formData.append('district', district || '');
      formData.append('guardian_name', guardianName || '');
      formData.append('guardian_contact', guardianContact || '');
      formData.append('email', email || '');
      formData.append('phone', phone || '');
      formData.append('dob', dob || '');
      formData.append('gender', gender || '');

      if (photoInput && photoInput.files && photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || `Registration failed. Make sure backend is running at ${BACKEND_URL}.`);
        return;
      }

      // Registration successful! Show confirmation view
      form.classList.add('hidden');
      if (successContainer) {
        successContainer.classList.remove('hidden');
        successContainer.innerHTML = `
          <div class="mx-auto mb-5 h-20 w-20 rounded-full bg-[var(--sgfi-green)] flex items-center justify-center border-4 border-[var(--sgfi-gold)] shadow-lg">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="#E4A11B" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p class="text-xs uppercase tracking-[0.2em] font-bold text-[var(--sgfi-gold-dark)] mb-1">Official Registration Confirmed</p>
          <h2 class="font-display text-4xl text-[var(--sgfi-green)] mb-2">WELCOME TO SGFI!</h2>
          <div class="inline-block bg-[var(--sgfi-green-dark)] text-[var(--sgfi-gold)] font-mono text-lg px-6 py-2 rounded-full mb-6 font-bold border border-[var(--sgfi-gold)]">
            Serial No: ${result.serial_no}
          </div>

          ${result.photo_url ? `
            <div class="my-4">
              <img src="${result.photo_url}" alt="${fullName}" class="h-32 w-28 object-cover rounded-lg mx-auto border-2 border-[var(--sgfi-gold)] shadow-md mb-2" />
              <p class="text-xs text-[var(--sgfi-ink-faint)]">Uploaded to Cloudinary CDN</p>
            </div>
          ` : ''}

          <dl class="grid sm:grid-cols-2 gap-3 text-sm text-left bg-[var(--sgfi-card)] p-5 rounded-lg max-w-lg mx-auto mb-6">
            <div>
              <dt class="text-[var(--sgfi-ink-faint)] text-xs">Player Name</dt>
              <dd class="font-bold text-[var(--sgfi-ink)]">${fullName}</dd>
            </div>
            <div>
              <dt class="text-[var(--sgfi-ink-faint)] text-xs">Aadhaar Number</dt>
              <dd class="font-bold text-[var(--sgfi-ink)]">${aadhaar}</dd>
            </div>
            <div>
              <dt class="text-[var(--sgfi-ink-faint)] text-xs">Selected Game</dt>
              <dd class="font-bold text-[var(--sgfi-gold-dark)]">${game}</dd>
            </div>
            <div>
              <dt class="text-[var(--sgfi-ink-faint)] text-xs">State</dt>
              <dd class="font-bold text-[var(--sgfi-ink)]">${state || 'RAJASTHAN'}</dd>
            </div>
          </dl>

          <div class="flex flex-wrap gap-4 justify-center">
            <a href="player-record.html" class="btn btn-primary text-sm" style="background:#123524; color:#FAF6EC; padding:12px 24px; font-weight:700; border-radius:8px;">
              Search Player Record
            </a>
            <button onclick="window.location.reload()" class="btn btn-outline text-sm" style="padding:12px 24px; border-radius:8px;">
              Register Another Student
            </button>
          </div>
        `;
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert(`Error connecting to registration backend on ${BACKEND_URL}.`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  });
});
