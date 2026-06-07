// stock.js — Gestion du stock (lecture + ajout + modification quantité)
// Colonnes Sheets: A=id, B=nom, C=categorie, D=quantite, E=quantite_min, F=unite, G=notes, H=date_maj

const Stock = (() => {
  const SHEET = CONFIG.SHEETS.STOCK;
  const CATS = ['Tous', 'Entretien', 'Électricité', 'Mobilier', 'Sécurité', 'Bureautique', 'Autre'];
  let _data = [];
  let _activeFilter = 'Tous';

  const ICONS = {
    'Électricité': 'ti-bolt',
    'Entretien':   'ti-sparkles',
    'Mobilier':    'ti-armchair',
    'Sécurité':    'ti-shield',
    'Bureautique': 'ti-file-text',
    'Autre':       'ti-box'
  };
  const COLORS = {
    'Électricité': 'gold',
    'Entretien':   'teal',
    'Mobilier':    'teal',
    'Sécurité':    'red',
    'Bureautique': 'gold',
    'Autre':       'gray'
  };

  async function load() {
    UI.setLoading('stock-list', true);
    try {
      const rows = await SheetsAPI.read(SHEET);
      _data = rows.slice(1).map(r => ({
        id: r[0]||'', nom: r[1]||'', cat: r[2]||'Autre',
        qty: parseInt(r[3])||0, min: parseInt(r[4])||0,
        unite: r[5]||'unité', notes: r[6]||'', dateMaj: r[7]||''
      })).filter(r => r.nom);
    } catch(e) {
      UI.showError('Impossible de charger le stock: ' + e.message);
    }
    render();
  }

  function render() {
    const items = _activeFilter === 'Tous' ? _data : _data.filter(s => s.cat === _activeFilter);
    const low = _data.filter(s => s.qty < s.min).length;
    // Mise à jour stats
    document.getElementById('stat-stock-total').textContent = _data.length;
    document.getElementById('stat-stock-low').textContent = low;

    const list = document.getElementById('stock-list');
    if (!items.length) { list.innerHTML = '<p class="empty-msg">Aucun article trouvé.</p>'; return; }
    list.innerHTML = items.map(s => {
      const icon = ICONS[s.cat] || 'ti-box';
      const color = COLORS[s.cat] || 'gray';
      const isLow = s.qty < s.min;
      const pct = s.min > 0 ? Math.min(100, Math.round(s.qty / (s.min * 2) * 100)) : 100;
      return `<div class="list-item" data-id="${s.id}">
        <div class="item-icon ${color}"><i class="ti ${icon}"></i></div>
        <div class="item-info">
          <div class="item-name">${s.nom}</div>
          <div class="item-sub">${s.cat} · ${s.notes || 'Aucune note'}</div>
          <div class="prog-bar"><div class="prog-fill ${isLow?'red':''}" style="width:${pct}%"></div></div>
        </div>
        <div class="item-right">
          <div class="qty ${isLow?'low':'ok'}">${s.qty} <span style="font-size:10px;font-weight:400">${s.unite}</span></div>
          <div class="qty-sub">min ${s.min}</div>
          ${isLow ? '<span class="badge badge-red">Faible</span>' : ''}
          <div class="qty-actions">
            <button class="qty-btn" onclick="Stock.adjustQty('${s.id}', -1)" title="Retirer">−</button>
            <button class="qty-btn add" onclick="Stock.adjustQty('${s.id}', 1)" title="Ajouter">+</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function setFilter(cat) {
    _activeFilter = cat;
    document.querySelectorAll('#stock-filters .filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === cat);
    });
    render();
  }

  function renderFilters() {
    const wrap = document.getElementById('stock-filters');
    wrap.innerHTML = CATS.map(c =>
      `<button class="filter-btn${c === 'Tous' ? ' active' : ''}" data-cat="${c}" onclick="Stock.setFilter('${c}')">${c}</button>`
    ).join('');
  }

  async function add(nom, cat, qty, min, unite, notes) {
    const row = [SheetsAPI.newId(), nom, cat, qty, min, unite, notes, SheetsAPI.now()];
    await SheetsAPI.append(SHEET, row);
    await load();
    UI.closeModal('modal-stock');
    UI.toast('Article ajouté avec succès');
  }

  async function adjustQty(id, delta) {
    const item = _data.find(s => s.id === id);
    if (!item) return;
    const newQty = Math.max(0, item.qty + delta);
    // Trouver la ligne dans Sheets (en cherchant par ID)
    const rows = await SheetsAPI.read(SHEET);
    const rowIdx = rows.findIndex(r => r[0] === id);
    if (rowIdx < 0) return;
    await SheetsAPI.update(SHEET, `D${rowIdx + 1}:H${rowIdx + 1}`, [newQty, item.min, item.unite, item.notes, SheetsAPI.now()]);
    item.qty = newQty;
    render();
  }

  return { load, render, setFilter, renderFilters, add, adjustQty };
})();
