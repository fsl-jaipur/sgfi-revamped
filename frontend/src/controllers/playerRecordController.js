document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('record-search-form');
  const aadhaarInput = document.getElementById('aadhaar-input');
  const aadhaarError = document.getElementById('aadhaar-error');
  const recordResult = document.getElementById('record-result');
  const searchBtn = document.getElementById('btn-search-record');
  const recipientInput = document.getElementById('recipientInput');

  if (!searchForm || !aadhaarInput || !recordResult) return;

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const API_URL = `${BACKEND_URL}/api/players/search`;

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawVal = aadhaarInput.value.trim().replace(/\s+/g, '');

    if (!rawVal || rawVal.length < 8) {
      if (aadhaarError) {
        aadhaarError.textContent = 'Please enter a valid Aadhaar number.';
        aadhaarError.classList.remove('hidden');
      }
      return;
    }

    if (aadhaarError) aadhaarError.classList.add('hidden');

    // Button loading state
    const originalBtnHTML = searchBtn ? searchBtn.innerHTML : 'Search';
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Searching DB...
      `;
    }

    try {
      const response = await fetch(`${API_URL}/${rawVal}`);
      const data = await response.json();

      if (!response.ok || !data.success || !data.data || data.data.length === 0) {
        recordResult.classList.remove('hidden', 'visible');
        recordResult.style.display = 'block';
        recordResult.innerHTML = `
          <div class="p-6 text-center text-[var(--sgfi-red-dark)]">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <h3 class="font-display text-2xl mb-1">NO PLAYER RECORD FOUND</h3>
            <p class="text-sm text-[var(--sgfi-ink-soft)]">No official record registered for Aadhaar: <strong>${rawVal}</strong></p>
          </div>
        `;
        return;
      }

      // Record found! Render live player details
      const player = data.data[0];
      recordResult.classList.remove('hidden');
      recordResult.style.display = 'block';
      recordResult.classList.add('visible');

      const photoSrc = player.player_photo && player.player_photo.trim() !== '' 
        ? player.player_photo 
        : 'https://studentgames.ind.in/assets/images/main.logo.png';

      const initials = player.player_name
        ? player.player_name.split(' ').map(n => n[0]).slice(0, 2).join('')
        : 'SG';

      recordResult.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-6 items-start">
          <div class="h-32 w-28 rounded-lg bg-[var(--sgfi-green)] flex items-center justify-center shrink-0 mx-auto sm:mx-0 overflow-hidden border-2 border-[var(--sgfi-gold)] shadow-md">
            ${player.player_photo ? `<img src="${photoSrc}" alt="${player.player_name}" class="w-full h-full object-cover" />` : `<span class="font-display text-4xl text-[var(--sgfi-gold)]">${initials}</span>`}
          </div>

          <div class="flex-1 w-full">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 class="font-display text-3xl text-[var(--sgfi-green)] tracking-wide">${player.player_name}</h2>
                <p class="text-sm text-[var(--sgfi-ink-faint)]">Serial No: <strong class="text-[var(--sgfi-gold-dark)]">${player.serial_no}</strong> | Aadhaar: ${player.aadhaar_number}</p>
              </div>
              <span class="badge" style="background:#E4A11B; color:#0B2318; padding:4px 12px; border-radius:20px; font-weight:700;">${player.game}</span>
            </div>

            <dl class="grid sm:grid-cols-2 gap-4 text-sm mb-6 bg-[var(--sgfi-card)] p-4 rounded-lg">
              <div>
                <dt class="text-[var(--sgfi-ink-faint)]">Position / Medal</dt>
                <dd class="font-bold text-[var(--sgfi-red-dark)]">${player.position}</dd>
              </div>
              <div>
                <dt class="text-[var(--sgfi-ink-faint)]">Age Category</dt>
                <dd class="font-semibold">${player.age_group}</dd>
              </div>
              <div>
                <dt class="text-[var(--sgfi-ink-faint)]">State Unit</dt>
                <dd class="font-semibold">${player.state}</dd>
              </div>
              <div>
                <dt class="text-[var(--sgfi-ink-faint)]">Tournament</dt>
                <dd class="font-semibold">${player.tournament_name}</dd>
              </div>
              <div>
                <dt class="text-[var(--sgfi-ink-faint)]">Organised At</dt>
                <dd class="font-semibold">${player.organised_at}</dd>
              </div>
              <div>
                <dt class="text-[var(--sgfi-ink-faint)]">Venue</dt>
                <dd class="font-semibold">${player.venue}</dd>
              </div>
            </dl>

            <div class="p-4 bg-[var(--sgfi-green)] text-white rounded-lg flex items-center justify-between gap-4">
              <div>
                <p class="font-semibold text-sm">Official Certificate Available!</p>
                <p class="text-xs text-white/70">Player name has been automatically auto-filled in the generator below.</p>
              </div>
              <a href="#certificate-generator" class="btn btn-secondary text-xs shrink-0" style="background:#E4A11B; color:#0B2318; padding:8px 14px; font-weight:700; border-radius:6px;">
                Scroll To Certificate
              </a>
            </div>
          </div>
        </div>
      `;

      // Auto-fill recipient name into Certificate Generator!
      if (recipientInput) {
        recipientInput.value = player.player_name;
        // Trigger input event to update live certificate preview
        recipientInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (err) {
      console.error('Aadhaar search error:', err);
      recordResult.classList.remove('hidden');
      recordResult.style.display = 'block';
      recordResult.innerHTML = `
        <div class="p-4 text-center text-[var(--sgfi-red-dark)] text-sm">
          Unable to connect to backend server (${BACKEND_URL}). Please verify backend server is running.
        </div>
      `;
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = originalBtnHTML;
      }
    }
  });
});
