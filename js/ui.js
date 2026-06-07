// ui.js — Utilitaires d'interface

const UI = (() => {

  function setLoading(elementId, loading) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (loading) el.innerHTML = '<div class="loading-spinner"><i class="ti ti-loader-2"></i> Chargement…</div>';
  }

  function showError(msg) {
    toast(msg, 'error');
  }

  function toast(msg, type = 'success') {
    const existing = document.getElementById('toast-global');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'toast-global';
    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="ti ${type === 'error' ? 'ti-alert-circle' : 'ti-circle-check'}"></i> ${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('show'), 10); }
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove('show'); setTimeout(() => { m.style.display = 'none'; }, 200); }
  }

  // Ferme modal en cliquant sur le fond
  document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('show');
      setTimeout(() => { e.target.style.display = 'none'; }, 200);
    }
  });

  return { setLoading, showError, toast, openModal, closeModal };
})();
