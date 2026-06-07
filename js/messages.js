// messages.js — Messagerie générale + messages individuels
// Annonces: A=id, B=auteur_nom, C=auteur_email, D=destinataire, E=texte, F=date
// Messages: A=id, B=de_nom, C=de_email, D=vers_email, E=vers_nom, F=texte, G=lu, H=date

const Messagerie = (() => {
  const SH_ANN = CONFIG.SHEETS.ANNONCES;
  const SH_MSG = CONFIG.SHEETS.MESSAGES;
  let _members = [];
  let _annonces = [];
  let _messages = [];
  let _activeThread = null;

  async function load() {
    try {
      const [memRows, annRows, msgRows] = await Promise.all([
        SheetsAPI.read(CONFIG.SHEETS.MEMBRES),
        SheetsAPI.read(SH_ANN),
        SheetsAPI.read(SH_MSG)
      ]);
      _members = memRows.slice(1).map(r => ({
        nom: r[1]||'', email: r[2]||'', role: r[4]||'', actif: r[5]||''
      })).filter(r => r.email && r.actif.toLowerCase() === 'oui');
      _annonces = annRows.slice(1).map(r => ({
        id: r[0]||'', auteurNom: r[1]||'', auteurEmail: r[2]||'',
        destinataire: r[3]||'Tout le département', texte: r[4]||'', date: r[5]||''
      })).filter(r => r.texte).reverse();
      _messages = msgRows.slice(1).map(r => ({
        id: r[0]||'', deNom: r[1]||'', deEmail: r[2]||'',
        versEmail: r[3]||'', versNom: r[4]||'', texte: r[5]||'',
        lu: r[6]||'non', date: r[7]||''
      })).filter(r => r.texte);
    } catch(e) {
      UI.showError('Erreur messagerie: ' + e.message);
    }
    renderAnnonces();
    renderMembers();
  }

  function renderAnnonces() {
    const list = document.getElementById('annonce-list');
    if (!_annonces.length) { list.innerHTML = '<p class="empty-msg">Aucune annonce.</p>'; return; }
    list.innerHTML = _annonces.map(a => {
      const initials = a.auteurNom.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
      return `<div class="msg-item">
        <div class="avatar teal">${initials}</div>
        <div class="msg-content">
          <div class="msg-sender">${a.auteurNom} <span class="msg-dest">→ ${a.destinataire}</span></div>
          <div class="msg-text-full">${a.texte}</div>
          <div class="msg-time">${a.date}</div>
        </div>
      </div>`;
    }).join('');
  }

  function renderMembers() {
    const user = Auth.getSession();
    const list = document.getElementById('member-list');
    const others = _members.filter(m => m.email !== user?.email);
    if (!others.length) { list.innerHTML = '<p class="empty-msg" style="padding:12px">Aucun autre membre.</p>'; return; }

    list.innerHTML = others.map(m => {
      const initials = m.nom.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
      const unread = _messages.filter(msg =>
        msg.deEmail === m.email && msg.versEmail === user?.email && msg.lu === 'non'
      ).length;
      return `<button class="member-btn" onclick="Messagerie.openThread('${m.email}','${m.nom}','${m.role}')">
        <div class="avatar teal">${initials}</div>
        <div style="flex:1;text-align:left">
          <div class="item-name">${m.nom}</div>
          <div class="item-sub">${m.role}</div>
        </div>
        ${unread > 0 ? `<span class="unread-dot">${unread}</span>` : ''}
        <i class="ti ti-chevron-right" style="color:#bbb;font-size:16px"></i>
      </button>`;
    }).join('');
  }

  function openThread(email, nom, role) {
    _activeThread = { email, nom, role };
    document.getElementById('msg-list-view').style.display = 'none';
    document.getElementById('msg-thread-view').style.display = 'block';
    const initials = nom.split(' ').map(w=>w[0]||'').join('').substring(0,2).toUpperCase();
    document.getElementById('thread-header').innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div class="avatar teal" style="width:34px;height:34px;font-size:12px">${initials}</div>
        <div><div class="item-name">${nom}</div><div class="item-sub">${role}</div></div>
      </div>`;
    renderThread(email);
  }

  function renderThread(email) {
    const user = Auth.getSession();
    const thread = _messages.filter(m =>
      (m.deEmail === user?.email && m.versEmail === email) ||
      (m.deEmail === email && m.versEmail === user?.email)
    ).sort((a,b) => new Date(a.date) - new Date(b.date));

    const area = document.getElementById('bubble-area');
    if (!thread.length) { area.innerHTML = '<p class="empty-msg" style="text-align:center;padding:20px">Démarrez la conversation</p>'; return; }
    area.innerHTML = thread.map(m => {
      const isMe = m.deEmail === user?.email;
      return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'}">
        <div class="bubble ${isMe?'me':'them'}">
          ${m.texte}
          <div class="bubble-time">${m.date}</div>
        </div>
      </div>`;
    }).join('');
    setTimeout(() => { area.scrollTop = 99999; }, 50);
  }

  function closeThread() {
    _activeThread = null;
    document.getElementById('msg-list-view').style.display = 'block';
    document.getElementById('msg-thread-view').style.display = 'none';
  }

  async function sendAnnonce(texte, destinataire) {
    const user = Auth.getSession();
    const row = [SheetsAPI.newId(), user?.nom||'', user?.email||'', destinataire, texte, SheetsAPI.now()];
    await SheetsAPI.append(SH_ANN, row);
    _annonces.unshift({ id: row[0], auteurNom: row[1], auteurEmail: row[2], destinataire, texte, date: row[5] });
    renderAnnonces();
    UI.toast('Annonce envoyée à ' + destinataire);
  }

  async function sendMessage(texte) {
    if (!_activeThread || !texte.trim()) return;
    const user = Auth.getSession();
    const row = [SheetsAPI.newId(), user?.nom||'', user?.email||'', _activeThread.email, _activeThread.nom, texte, 'non', SheetsAPI.now()];
    await SheetsAPI.append(SH_MSG, row);
    _messages.push({ id: row[0], deNom: row[1], deEmail: row[2], versEmail: row[3], versNom: row[4], texte, lu: 'non', date: row[7] });
    renderThread(_activeThread.email);
    document.getElementById('chat-in').value = '';
  }

  return { load, renderAnnonces, renderMembers, openThread, closeThread, sendAnnonce, sendMessage };
})();
