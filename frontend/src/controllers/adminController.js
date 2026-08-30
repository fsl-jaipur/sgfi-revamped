const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const AUTH_TOKEN_KEY = 'sgfi_admin_token';
const AUTH_USER_KEY = 'sgfi_admin_user';

const qs = (selector) => document.querySelector(selector);

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const cleanAadhaar = (value) => String(value || '').replace(/\D/g, '');

const getToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

const setStoredSession = (token, user) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user || {}));
};

const clearStoredSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || '{}');
  } catch {
    return {};
  }
};

const redirectToLogin = () => {
  clearStoredSession();
  window.location.href = 'admin-login.html';
};

const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) redirectToLogin();
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

const initLoginPage = () => {
  const form = qs('#admin-login-form');
  if (!form) return;

  if (getToken()) {
    window.location.href = 'admin.html';
    return;
  }

  const usernameInput = qs('#admin-username');
  const passwordInput = qs('#admin-password');
  const errorEl = qs('#admin-login-error');
  const submitBtn = qs('#admin-login-submit');

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
      const data = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      }).then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.success) {
          throw new Error(body.message || 'Login failed.');
        }
        return body;
      });

      setStoredSession(data.token, data.user);
      window.location.href = 'admin.html';
    } catch (error) {
      setMessage(errorEl, error.message || `Unable to connect to ${BACKEND_URL}.`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
};

const initDashboardPage = () => {
  const form = qs('#admin-player-form');
  if (!form) return;

  if (!getToken()) {
    redirectToLogin();
    return;
  }

  const state = {
    players: [],
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
  const currentUserEl = qs('#admin-current-user');
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

  const user = getStoredUser();
  currentUserEl.textContent = user.username || 'Admin';

  const destroyDataTable = () => {
    if (!state.dataTable) return;
    state.dataTable.destroy();
    state.dataTable = null;
  };

  const initDataTable = () => {
    if (!tableEl || typeof DataTable === 'undefined') return;

    state.dataTable = new DataTable(tableEl, {
      autoWidth: false,
      info: true,
      lengthChange: false,
      ordering: true,
      pageLength: 50,
      paging: true,
      pagingType: 'full_numbers',
      searching: false,
      language: {
        emptyTable: 'No active player records found.',
        info: 'Showing _START_ to _END_ of _TOTAL_ records',
        infoEmpty: 'Showing 0 records',
        paginate: {
          first: 'First',
          previous: 'Previous',
          next: 'Next',
          last: 'Last',
        },
      },
    });
  };

  const renderRows = () => {
    destroyDataTable();
    totalEl.textContent = state.players.length;

    if (!state.players.length) {
      rowsEl.innerHTML = '';
      initDataTable();
      return;
    }

    rowsEl.innerHTML = state.players
      .map((player) => {
        const id = escapeHtml(player._id);
        return `
          <tr>
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
                <button type="button" class="admin-row-button admin-row-button-delete" data-action="delete" data-id="${id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    initDataTable();
  };

  const loadPlayers = async () => {
    statusEl.textContent = 'Loading records...';

    try {
      const search = searchInput.value.trim();
      const query = new URLSearchParams({ limit: '5000' });
      if (search) query.set('search', search);

      const data = await apiFetch(`/api/players?${query.toString()}`);
      state.players = data.data || [];
      renderRows();
      statusEl.textContent = `${state.players.length} active record${state.players.length === 1 ? '' : 's'} loaded.`;
    } catch (error) {
      statusEl.textContent = error.message || 'Unable to load records.';
      state.players = [];
      renderRows();
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
    const aadhaar = cleanAadhaar(fields.aadhaar_number.value);

    if (!fields.player_name.value.trim() || !fields.serial_no.value.trim() || !fields.game.value.trim()) {
      throw new Error('Serial No, Player Name, and Game are required.');
    }

    if (!/^\d{12}$/.test(aadhaar)) {
      throw new Error('Aadhaar number must be exactly 12 digits.');
    }

    const formData = new FormData();
    formData.append('player_name', fields.player_name.value.trim());
    formData.append('aadhaar_number', aadhaar);
    formData.append('serial_no', fields.serial_no.value.trim());
    formData.append('game', fields.game.value.trim());
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
      await loadPlayers();
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

    if (button.dataset.action === 'delete') {
      const confirmed = window.confirm(`Soft delete ${player.player_name}? The record will be hidden but kept in MongoDB.`);
      if (!confirmed) return;

      try {
        await apiFetch(`/api/players/${player._id}`, { method: 'DELETE' });
        if (fields.id.value === player._id) resetForm();
        await loadPlayers();
      } catch (error) {
        statusEl.textContent = error.message || 'Unable to delete record.';
      }
    }
  });

  searchInput.addEventListener('input', () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(loadPlayers, 250);
  });

  refreshBtn.addEventListener('click', loadPlayers);
  newBtn.addEventListener('click', resetForm);
  cancelBtn.addEventListener('click', resetForm);
  logoutBtn.addEventListener('click', redirectToLogin);

  loadPlayers();
};

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();
  initDashboardPage();
});
