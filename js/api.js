// api.js — Toutes les interactions avec Google Sheets

const SheetsAPI = (() => {
  const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
  let _token = null;

  // Initialise l'API Google Identity Services pour OAuth2 (écriture)
  function initGSI(callback) {
    if (typeof google === 'undefined') { callback(false); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (resp) => {
        if (resp.access_token) { _token = resp.access_token; callback(true); }
        else callback(false);
      }
    });
    client.requestAccessToken({ prompt: '' });
  }

  // Lecture d'un onglet (lecture seule, clé API suffit)
  async function read(sheet) {
    const url = `${BASE}/${CONFIG.SHEET_ID}/values/${sheet}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erreur lecture ${sheet}`);
    const data = await res.json();
    return data.values || [];
  }

  // Ajout d'une ligne (nécessite OAuth token)
  async function append(sheet, values) {
    if (!_token) throw new Error('Non authentifié pour écriture');
    const url = `${BASE}/${CONFIG.SHEET_ID}/values/${sheet}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] })
    });
    if (!res.ok) throw new Error(`Erreur écriture ${sheet}`);
    return res.json();
  }

  // Mise à jour d'une cellule/ligne spécifique
  async function update(sheet, range, values) {
    if (!_token) throw new Error('Non authentifié pour écriture');
    const url = `${BASE}/${CONFIG.SHEET_ID}/values/${sheet}!${range}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] })
    });
    if (!res.ok) throw new Error(`Erreur mise à jour ${sheet}`);
    return res.json();
  }

  // Génère un ID unique (timestamp + random)
  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // Formate une date/heure en français
  function now() {
    return new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto' });
  }

  return { read, append, update, initGSI, newId, now };
})();
