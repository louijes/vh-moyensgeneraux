// taches.js — Gestion des tâches
// Colonnes Sheets: A=id, B=titre, C=categorie, D=priorite, E=assigne_email, F=assigne_nom,
//                 G=statut, H=echeance, I=notes, J=cree_par, K=date_creation

const Taches = (() => {
  const SHEET = CONFIG.SHEETS.TACHES;
  const CATS = ['Toutes', 'Bâtiment', 'Équipement', 'Nettoyage', 'Sécurité', 'Administratif'];
  let _data = [];
  let _members = [];
  let _filter = 'Toutes';

  async function load() {
    UI.setLoading('task-list', true);
    try {
      const [taskRows, memRows] = await Promise.all([
        SheetsAPI.read(SHEET),
        SheetsAPI.read(CONFIG.SHEETS.MEMBRES)
      ]);
      _data = taskRows.slice(1).map(r => ({
        id: r[0]||'', titre: r[1]||'', cat: r[2]||'', prio: r[3]||'Normal',
        assigneEmail: r[4]||'', assigneNom: r[5]||'',
        statut: r[6]||'En attente', echeance: r[7]||'',
        notes: r[8]||'', creePar: r[9]||'', dateCreation: r[10]||''
      })).filter(r => r.titre);
      _members = memRows.slice(1).map(r => ({
        id: r[0]||'', nom: r[1]||'', email: r[2]||'', role: r[4]||''
      })).filter(r => r.email && r[5]?.toLowerCase() === 'oui');
    } catch(e) {
      UI.showError('Impossible de charger les tâches: ' + e.message);
    }
    render();
    updateStats();
  }

  function updateStats() {
    const enCours = _data.filter(t => t.statut === 'En cours').length;
    const terminees = _data.filter(t => t.statut === 'Terminée').length;
    const urgentes = _data.filter(t => t.prio === 'Urgent' && t.statut !== 'Terminée').length;
    document.getElementById('stat-tasks-encours').textContent = enCours;
    document.getElementById('stat-tasks-terminees').textContent = terminees;
    document.getElementById('stat-tasks-urgent').textContent = urgentes;
  }

  function render() {
    const items = _filter === 'Toutes' ? _data :
      _filter === 'Urgent' ? _data.filter(t => t.prio === 'Urgent') :
      _data.filter(t => t.cat === _filter);

    const list = document.getElementById('task-list');
    if (!items.length) { list.innerHTML = '<p class="empty-msg">Aucune tâche trouvée.</p>'; return; }

    const user = Auth.getSession();
    const isAdmin = user?.role === 'Admin' || user?.role === 'Responsable';

    list.innerHTML = items.map(t => {
      const isDone = t.statut === 'Terminée';
      const prioBadge = t.prio === 'Urgent' ? '<span class="badge badge-red">Urgent</span>' : '';
      const statutColor = t.statut === 'Terminée' ? 'badge-teal' : t.statut === 'En cours' ? 'badge-gold' : 'badge-gray';
      return `<div class="task-item${isDone ? ' done' : ''}">
        <div class="task-top">
          <div class="task-check ${isDone ? 'done' : ''}" onclick="Taches.toggleStatut('${t.id}')" title="Changer statut">
            ${isDone ? '<i class="ti ti-check" style="font-size:11px"></i>' : ''}
          </div>
          <div style="flex:1">
            <div class="item-name${isDone ? ' line-through' : ''}">${t.titre}</div>
            ${t.notes ? `<div class="item-sub">${t.notes}</div>` : ''}
            <div class="task-meta">
              <span class="badge badge-teal">${t.cat}</span>
              ${prioBadge}
              <span class="badge ${statutColor}">${t.statut}</span>
              <span class="badge badge-gray"><i class="ti ti-user" style="font-size:10px"></i> ${t.assigneNom||'Non assigné'}</span>
              ${t.echeance ? `<span class="badge badge-gold"><i class="ti ti-calendar" style="font-size:10px"></i> ${t.echeance}</span>` : ''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  async function toggleStatut(id) {
    const task = _data.find(t => t.id === id);
    if (!task) return;
    const cycle = {'En attente':'En cours','En cours':'Terminée','Terminée':'En attente'};
    task.statut = cycle[task.statut] || 'En attente';
    const rows = await SheetsAPI.read(SHEET);
    const rowIdx = rows.findIndex(r => r[0] === id);
    if (rowIdx >= 0) await SheetsAPI.update(SHEET, `G${rowIdx + 1}`, [task.statut]);
    render(); updateStats();
  }

  function setFilter(cat) {
    _filter = cat;
    document.querySelectorAll('#task-filters .filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === cat);
    });
    render();
  }

  function renderFilters() {
    const wrap = document.getElementById('task-filters');
    wrap.innerHTML = [...CATS, 'Urgent'].map(c =>
      `<button class="filter-btn${c === 'Toutes' ? ' active' : ''}" data-cat="${c}" onclick="Taches.setFilter('${c}')">${c}</button>`
    ).join('');
  }

  function populateMemberSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Choisir un membre --</option>' +
      _members.map(m => `<option value="${m.email}" data-nom="${m.nom}">${m.nom} (${m.role})</option>`).join('');
  }

  async function add(titre, cat, prio, assigneEmail, assigneNom, echeance, notes) {
    const user = Auth.getSession();
    const row = [SheetsAPI.newId(), titre, cat, prio, assigneEmail, assigneNom, 'En attente', echeance, notes, user?.nom||'', SheetsAPI.now()];
    await SheetsAPI.append(SHEET, row);
    await load();
    UI.closeModal('modal-tache');
    UI.toast('Tâche créée et assignée');
  }

  return { load, render, setFilter, renderFilters, toggleStatut, populateMemberSelect, add };
})();
