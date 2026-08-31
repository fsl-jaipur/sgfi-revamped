import { initCertificateGenerator, setCertificateRecipient } from './script.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const qs = (selector) => document.querySelector(selector);

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const cleanAadhaar = (value) => String(value || '').replace(/\D/g, '');

const preventLeadingSpaces = (input) => {
  if (!input) return;

  input.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
      const pos = input.selectionStart;
      const val = input.value;

      // Block space if input is empty, whitespace-only, or cursor is at position 0
      if (pos === 0 || !val.trim()) {
        event.preventDefault();
        return;
      }

      // Block space if adjacent character (before or after cursor) is already a space
      if (val.charAt(pos - 1) === ' ' || val.charAt(pos) === ' ') {
        event.preventDefault();
        return;
      }
    }
  });

  const sanitizeSpaces = () => {
    let val = input.value;
    val = val.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
    if (input.value !== val) {
      input.value = val;
    }
  };

  input.addEventListener('input', sanitizeSpaces);

  input.addEventListener('paste', () => {
    setTimeout(sanitizeSpaces, 0);
  });

  input.addEventListener('blur', () => {
    if (input.value) {
      input.value = input.value.trim();
    }
  });
};

const redirectToLogin = async () => {
  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (_) {}
  window.location.replace('admin-login.html');
};

const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && window.location.pathname.endsWith('admin.html')) {
    window.location.replace('admin-login.html');
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
};

const setMessage = (element, message, type = 'error') => {
  if (!element) return;
  element.textContent = message;
  element.classList.remove('hidden', 'admin-alert-error', 'admin-alert-success');
  element.classList.add(type === 'success' ? 'admin-alert-success' : 'admin-alert-error');
};

const clearMessage = (element) => {
  if (!element) return;
  element.textContent = '';
  element.classList.add('hidden');
  element.classList.remove('admin-alert-error', 'admin-alert-success');
};

// Security check against BFCache / Browser Back button showing protected Admin Panel or cached login state after logout
window.addEventListener('pageshow', async (event) => {
  if (window.location.pathname.endsWith('admin-login.html')) {
    const form = qs('#admin-login-form');
    const usernameInput = qs('#admin-username');
    const passwordInput = qs('#admin-password');
    const togglePasswordBtn = qs('#toggle-password');
    const errorEl = qs('#admin-login-error');

    if (form) form.reset();
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.type = 'password';
    }
    if (togglePasswordBtn) {
      const closedIcon = togglePasswordBtn.querySelector('.eye-icon-closed');
      const openIcon = togglePasswordBtn.querySelector('.eye-icon-open');
      openIcon?.classList.add('hidden');
      closedIcon?.classList.remove('hidden');
      togglePasswordBtn.setAttribute('aria-label', 'Show password');
    }
    clearMessage(errorEl);
  }

  if (window.location.pathname.endsWith('admin.html')) {
    if (event.persisted || (window.performance && window.performance.navigation && window.performance.navigation.type === 2)) {
      window.location.reload();
      return;
    }
    try {
      const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' });
      const meData = await meRes.json().catch(() => ({}));
      if (!meRes.ok || !meData.success) {
        window.location.replace('admin-login.html');
      }
    } catch (_) {
      window.location.replace('admin-login.html');
    }
  }
});

const initLoginPage = async () => {
  const form = qs('#admin-login-form');
  if (!form) return;

  const usernameInput = qs('#admin-username');
  const passwordInput = qs('#admin-password');
  const togglePasswordBtn = qs('#toggle-password');
  const errorEl = qs('#admin-login-error');
  const submitBtn = qs('#admin-login-submit');

  preventLeadingSpaces(usernameInput);
  preventLeadingSpaces(passwordInput);

  const clearLoginForm = () => {
    if (form) form.reset();
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.type = 'password';
    }
    if (togglePasswordBtn) {
      const closedIcon = togglePasswordBtn.querySelector('.eye-icon-closed');
      const openIcon = togglePasswordBtn.querySelector('.eye-icon-open');
      openIcon?.classList.add('hidden');
      closedIcon?.classList.remove('hidden');
      togglePasswordBtn.setAttribute('aria-label', 'Show password');
    }
    clearMessage(errorEl);
  };

  clearLoginForm();
  setTimeout(clearLoginForm, 50);

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      clearLoginForm();
      window.location.replace('admin.html');
      return;
    }
  } catch (_) {}

  if (togglePasswordBtn && passwordInput) {
    const closedIcon = togglePasswordBtn.querySelector('.eye-icon-closed');
    const openIcon = togglePasswordBtn.querySelector('.eye-icon-open');

    togglePasswordBtn.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    togglePasswordBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      if (isPassword) {
        closedIcon?.classList.add('hidden');
        openIcon?.classList.remove('hidden');
        togglePasswordBtn.setAttribute('aria-label', 'Hide password');
      } else {
        openIcon?.classList.add('hidden');
        closedIcon?.classList.remove('hidden');
        togglePasswordBtn.setAttribute('aria-label', 'Show password');
      }
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(errorEl);

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      setMessage(errorEl, 'Username and password are required.');
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking...';

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed.');
      }

      clearLoginForm();
      window.location.replace('admin.html');
    } catch (error) {
      setMessage(errorEl, error.message || `Unable to connect to ${BACKEND_URL}.`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
};

const initDashboardPage = async () => {
  const form = qs('#admin-player-form');
  if (!form) return;

  const currentUserEl = qs('#admin-current-user');

  try {
    const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' });
    const meData = await meRes.json().catch(() => ({}));
    if (!meRes.ok || !meData.success) {
      redirectToLogin();
      return;
    }
    if (currentUserEl) {
      currentUserEl.textContent = meData.user?.username || 'Admin';
    }
  } catch (_) {
    redirectToLogin();
    return;
  }

  // Initialize Certificate Generator Modal controller
  initCertificateGenerator();

  const certModal = qs('#cert-modal');
  const certModalClose = qs('#cert-modal-close');

  const closeCertModal = () => {
    if (certModal) {
      certModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  };

  if (certModalClose) {
    certModalClose.addEventListener('click', closeCertModal);
  }

  if (certModal) {
    certModal.addEventListener('click', (event) => {
      if (event.target === certModal) {
        closeCertModal();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && certModal && !certModal.classList.contains('hidden')) {
      closeCertModal();
    }
  });

  const state = {
    players: [],
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    searchTimer: null,
    dataTable: null,
  };

  const tableEl = qs('#admin-players-table');
  const rowsEl = qs('#admin-player-rows');
  const statusEl = qs('#admin-record-status');
  const formMessageEl = qs('#admin-form-message');
  const totalEl = qs('#admin-total-records');
  const selectedEl = qs('#admin-selected-record');
  const formTitleEl = qs('#admin-form-title');
  const searchInput = qs('#admin-record-search');
  const refreshBtn = qs('#admin-refresh');
  const newBtn = qs('#admin-new-record');
  const logoutBtn = qs('#admin-logout');
  const saveBtn = qs('#admin-save-player');
  const cancelBtn = qs('#admin-cancel-edit');
  const photoUpload = qs('#admin-photo-upload');

  const fields = {
    id: qs('#admin-player-id'),
    player_name: qs('#admin-player-name'),
    aadhaar_number: qs('#admin-aadhaar-number'),
    serial_no: qs('#admin-serial-no'),
    game: qs('#admin-game'),
    age_group: qs('#admin-age-group'),
    position: qs('#admin-position'),
    state: qs('#admin-state'),
    tournament_name: qs('#admin-tournament-name'),
    organised_at: qs('#admin-organised-at'),
    venue: qs('#admin-venue'),
    player_photo: qs('#admin-player-photo'),
  };

  preventLeadingSpaces(searchInput);
  Object.values(fields).forEach(preventLeadingSpaces);

  const destroyDataTable = () => {
    if (!state.dataTable) return;
    state.dataTable.destroy();
    state.dataTable = null;
  };

  const initDataTable = () => {
    if (!tableEl || typeof DataTable === 'undefined') return;

    state.dataTable = new DataTable(tableEl, {
      autoWidth: false,
      info: false,
      lengthChange: false,
      ordering: true,
      paging: false,
      searching: false,
      language: {
        emptyTable: 'No active player records found.',
      },
    });
  };

  const renderPaginationControls = () => {
    let paginationEl = qs('#admin-pagination-container');
    if (!paginationEl) {
      paginationEl = document.createElement('div');
      paginationEl.id = 'admin-pagination-container';
      paginationEl.className = 'admin-pagination-container';
      if (tableEl && tableEl.parentElement) {
        tableEl.parentElement.after(paginationEl);
      }
    }

    const { page, totalPages, total, limit } = state;
    if (total <= 0) {
      paginationEl.innerHTML = '';
      return;
    }

    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    const infoText = `Showing ${start} to ${end} of ${total} records`;

    const getPageNumbers = () => {
      const pages = [];
      const delta = 2;
      const left = page - delta;
      const right = page + delta + 1;

      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= left && i < right)) {
          pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
          pages.push('...');
        }
      }
      return pages;
    };

    const pageNumbers = getPageNumbers();

    paginationEl.innerHTML = `
      <div class="admin-pagination-info">${escapeHtml(infoText)}</div>
      <div class="dt-container">
        <div class="dt-paging" style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; align-items: center;">
          <button type="button" class="dt-paging-button ${page === 1 ? 'disabled' : ''}" data-page="1" ${page === 1 ? 'disabled' : ''}>First</button>
          <button type="button" class="dt-paging-button ${page === 1 ? 'disabled' : ''}" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>Previous</button>
          ${pageNumbers
            .map((p) => {
              if (p === '...') {
                return `<span class="ellipsis" style="padding: 6px 10px; color: var(--sgfi-ink-faint); font-weight: 800;">…</span>`;
              }
              return `<button type="button" class="dt-paging-button ${p === page ? 'current' : ''}" data-page="${p}">${p}</button>`;
            })
            .join('')}
          <button type="button" class="dt-paging-button ${page === totalPages ? 'disabled' : ''}" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Next</button>
          <button type="button" class="dt-paging-button ${page === totalPages ? 'disabled' : ''}" data-page="${totalPages}" ${page === totalPages ? 'disabled' : ''}>Last</button>
        </div>
      </div>
    `;
  };

  // Event listener for pagination button clicks
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('#admin-pagination-container button[data-page]');
    if (!btn || btn.disabled) return;
    const targetPage = parseInt(btn.dataset.page, 10);
    if (targetPage && targetPage !== state.page) {
      loadPlayers(targetPage);
    }
  });

  const renderRows = () => {
    destroyDataTable();
    totalEl.textContent = state.total;

    if (!state.players.length) {
      rowsEl.innerHTML = '';
      initDataTable();
      return;
    }

    rowsEl.innerHTML = state.players
      .map((player, index) => {
        const id = escapeHtml(player._id);
        const rowNum = (state.page - 1) * state.limit + index + 1;
        return `
          <tr>
            <td>
              <strong>${rowNum}</strong>
            </td>
            <td>
              <strong>${escapeHtml(player.player_name)}</strong>
            </td>
            <td>${escapeHtml(player.aadhaar_number)}</td>
            <td>${escapeHtml(player.game)}</td>
            <td>${escapeHtml(player.state)}</td>
            <td>${escapeHtml(player.serial_no)}</td>
            <td>
              <div class="admin-table-actions">
                <button type="button" class="admin-row-button admin-row-button-edit" data-action="edit" data-id="${id}">Edit</button>
                <button type="button" class="admin-row-button admin-row-button-cert" data-action="cert-edit" data-id="${id}">Certificate Edit</button>
                <button type="button" class="admin-row-button admin-row-button-delete" data-action="delete" data-id="${id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    initDataTable();
  };

  if (fields.aadhaar_number) {
    fields.aadhaar_number.addEventListener('input', () => {
      fields.aadhaar_number.value = fields.aadhaar_number.value.replace(/\D/g, '').slice(0, 12);
    });
  }

  const loadPlayers = async (page = 1) => {
    statusEl.textContent = `Loading page ${page}...`;

    try {
      const search = searchInput.value.trim();
      const query = new URLSearchParams({ page: String(page), limit: '50' });
      if (search) query.set('search', search);

      const data = await apiFetch(`/api/players?${query.toString()}`);
      state.players = data.data || [];
      state.page = data.page || page;
      state.limit = data.limit || 50;
      state.total = data.total ?? state.players.length;
      state.totalPages = data.totalPages || 1;

      renderRows();
      renderPaginationControls();

      statusEl.textContent = state.total === 0
        ? 'No active player records found.'
        : `Database records loaded.`;
    } catch (error) {
      statusEl.textContent = error.message || 'Unable to load records.';
      state.players = [];
      state.page = 1;
      state.total = 0;
      state.totalPages = 1;
      renderRows();
      renderPaginationControls();
    }
  };

  const resetForm = () => {
    form.reset();
    fields.id.value = '';
    fields.age_group.value = 'U-19';
    fields.position.value = 'PARTICIPANT';
    fields.state.value = 'RAJASTHAN';
    fields.tournament_name.value = 'NATIONAL SCHOOL GAMES 2026';
    fields.organised_at.value = 'SGFI SPORTS COMPLEX';
    fields.venue.value = 'MAIN STADIUM';
    formTitleEl.textContent = 'Add Player';
    selectedEl.textContent = 'New';
    clearMessage(formMessageEl);
  };

  const fillForm = (player) => {
    fields.id.value = player._id || '';
    fields.player_name.value = player.player_name || '';
    fields.aadhaar_number.value = player.aadhaar_number || '';
    fields.serial_no.value = player.serial_no || '';
    fields.game.value = player.game || '';
    fields.age_group.value = player.age_group || '';
    fields.position.value = player.position || '';
    fields.state.value = player.state || '';
    fields.tournament_name.value = player.tournament_name || '';
    fields.organised_at.value = player.organised_at || '';
    fields.venue.value = player.venue || '';
    fields.player_photo.value = player.player_photo || '';
    if (photoUpload) photoUpload.value = '';

    formTitleEl.textContent = 'Edit Player';
    selectedEl.textContent = player.serial_no || 'Editing';
    clearMessage(formMessageEl);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const buildPlayerFormData = () => {
    const playerName = fields.player_name.value.trim();
    const serialNo = fields.serial_no.value.trim();
    const game = fields.game.value.trim();
    const aadhaar = fields.aadhaar_number.value.trim().replace(/\D/g, '');

    if (!playerName || !serialNo || !game || !aadhaar) {
      throw new Error('Serial No, Player Name, Aadhaar Number, and Game are required and cannot be blank or space-only.');
    }

    if (!/^\d{12}$/.test(aadhaar)) {
      throw new Error('Aadhaar number must contain exactly 12 numeric digits (0-9).');
    }

    const fieldsToCheck = [
      { name: 'Player Name', val: playerName },
      { name: 'Serial No', val: serialNo },
      { name: 'Game', val: game },
      { name: 'Age Category', val: fields.age_group.value.trim() },
      { name: 'Position / Medal', val: fields.position.value.trim() },
      { name: 'State Unit', val: fields.state.value.trim() },
      { name: 'Tournament', val: fields.tournament_name.value.trim() },
      { name: 'Organised At', val: fields.organised_at.value.trim() },
      { name: 'Venue', val: fields.venue.value.trim() },
    ];

    for (const field of fieldsToCheck) {
      if (field.val.length > 50) {
        throw new Error(`${field.name} cannot exceed 50 characters.`);
      }
    }

    const formData = new FormData();
    formData.append('player_name', playerName);
    formData.append('aadhaar_number', aadhaar);
    formData.append('serial_no', serialNo);
    formData.append('game', game);
    formData.append('age_group', fields.age_group.value.trim() || 'U-19');
    formData.append('position', fields.position.value.trim() || 'PARTICIPANT');
    formData.append('state', fields.state.value.trim() || 'RAJASTHAN');
    formData.append('tournament_name', fields.tournament_name.value.trim() || 'NATIONAL SCHOOL GAMES 2026');
    formData.append('organised_at', fields.organised_at.value.trim() || 'SGFI SPORTS COMPLEX');
    formData.append('venue', fields.venue.value.trim() || 'MAIN STADIUM');
    formData.append('player_photo', fields.player_photo.value.trim());

    if (photoUpload?.files?.[0]) {
      formData.append('photo', photoUpload.files[0]);
    }

    return formData;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(formMessageEl);

    const playerId = fields.id.value;
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = playerId ? 'Updating...' : 'Saving...';

    try {
      const body = buildPlayerFormData();
      await apiFetch(playerId ? `/api/players/${playerId}` : '/api/players', {
        method: playerId ? 'PUT' : 'POST',
        body,
      });

      setMessage(formMessageEl, playerId ? 'Player record updated.' : 'Player record added.', 'success');
      await loadPlayers(state.page);
      if (!playerId) resetForm();
    } catch (error) {
      setMessage(formMessageEl, error.message || 'Unable to save player record.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
  });

  rowsEl.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const player = state.players.find((item) => item._id === button.dataset.id);
    if (!player) return;

    if (button.dataset.action === 'edit') {
      fillForm(player);
      return;
    }

    if (button.dataset.action === 'cert-edit') {
      const subtitle = qs('#cert-modal-player-subtitle');
      if (subtitle) {
        subtitle.textContent = `Generating certificate for ${player.player_name} (Serial: ${player.serial_no || 'N/A'})`;
      }
      setCertificateRecipient(player.player_name);
      if (certModal) {
        certModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
      return;
    }

    if (button.dataset.action === 'delete') {
      const confirmed = window.confirm(`Soft delete ${player.player_name}? The record will be hidden but kept in MongoDB.`);
      if (!confirmed) return;

      try {
        await apiFetch(`/api/players/${player._id}`, { method: 'DELETE' });
        if (fields.id.value === player._id) resetForm();
        await loadPlayers(state.page);
      } catch (error) {
        statusEl.textContent = error.message || 'Unable to delete record.';
      }
    }
  });

  searchInput.addEventListener('input', () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => loadPlayers(1), 250);
  });

  refreshBtn.addEventListener('click', () => loadPlayers(state.page));
  newBtn.addEventListener('click', resetForm);
  cancelBtn.addEventListener('click', resetForm);
  logoutBtn.addEventListener('click', redirectToLogin);

  loadPlayers(1);
};

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initDashboardPage();
});
