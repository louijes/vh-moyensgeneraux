// auth.js — Authentification via Google Sheets (onglet Membres)

const Auth = (() => {
  const SESSION_KEY = 'vh_session';

  // Vérifie si une session existe
  function getSession() {
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  }

  // Sauvegarde la session
  function setSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  // Déconnexion
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  // Hash simple du mot de passe (SHA-256 via SubtleCrypto)
  async function hashPassword(password) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // Connexion : vérifie email+hash dans l'onglet Membres
  async function login(email, password) {
    const hash = await hashPassword(password);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${CONFIG.SHEETS.MEMBRES}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Impossible de contacter la base de données.');
    const data = await res.json();
    const rows = data.values || [];
    // Format colonnes: A=id, B=nom, C=email, D=hash, E=role, F=actif
    for (let i = 1; i < rows.length; i++) {
      const [id, nom, rowEmail, rowHash, role, actif] = rows[i];
      if (rowEmail?.trim().toLowerCase() === email.trim().toLowerCase()) {
        if (actif?.trim().toLowerCase() !== 'oui') throw new Error('Compte désactivé. Contactez l\'administrateur.');
        if (rowHash?.trim() !== hash) throw new Error('Mot de passe incorrect.');
        const user = { id, nom, email: rowEmail, role, rowIndex: i + 1 };
        setSession(user);
        return user;
      }
    }
    throw new Error('Adresse email non trouvée.');
  }

  return { login, logout, getSession, setSession, hashPassword };
})();

// Fonction globale appelée par index.html
async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('btn-login');
  const err = document.getElementById('err-msg');
  err.className = 'err';

  if (!email || !password) {
    err.textContent = 'Veuillez remplir tous les champs.';
    err.className = 'err show'; return;
  }
  btn.disabled = true;
  btn.textContent = 'Connexion…';
  try {
    await Auth.login(email, password);
    window.location.href = 'app.html';
  } catch (e) {
    err.textContent = e.message;
    err.className = 'err show';
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}
