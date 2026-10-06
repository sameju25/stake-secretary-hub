/* app.js – shared helpers, navigation and the modal form builder.
   Each feature file calls App.register(name, { label, render(container) }). */
const App = (() => {
  const views = {};
  let current = 'dashboard';

  const $ = (sel, root = document) => root.querySelector(sel);
  // Escape user text before putting it into innerHTML.
  const esc = s => String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- Dates are stored as local "YYYY-MM-DD" strings, times as "HH:MM" ----
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());
  const parse = s => new Date(s + 'T00:00:00');
  const fmtDate = s => s ? parse(s).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' }) : 'No date';
  const fmtTime = t => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const toMins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  // Which occurrence of its weekday is this date? (1 = first, 3 = third ...)
  const nthWeekday = s => Math.ceil(parse(s).getDate() / 7);
  const isTuesday = s => parse(s).getDay() === 2;

  function register(name, view) { views[name] = view; }

  function buildNav() {
    $('#nav').innerHTML = Object.entries(views).filter(([, v]) => !v.hidden).map(([k, v]) =>
      `<button data-view="${k}">${esc(v.label)}</button>`).join('');
    $('#nav').onclick = e => { const b = e.target.closest('[data-view]'); if (b) show(b.dataset.view); };
  }

  function show(name) {
    if (!views[name]) name = 'dashboard';
    current = name;
    location.hash = name;
    document.querySelectorAll('#nav button').forEach(b =>
      b.classList.toggle('active', b.dataset.view === name));
    views[name].render($('#view'));
  }
  const refresh = () => show(current);

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('#toasts').append(t);
    setTimeout(() => t.remove(), 2800);
  }

  /* Modal form. fields: [{name, label, type, options, required, placeholder}]
     onSave(values) may return false (keep dialog open) or an error string. */
  function form(title, fields, vals, onSave) {
    const dlg = document.createElement('dialog');
    const input = f => {
      const v = esc(vals[f.name] ?? '');
      const req = f.required ? 'required' : '';
      if (f.type === 'select') return `<select name="${f.name}" ${req}>${f.options.map(o =>
        `<option ${o === vals[f.name] ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      if (f.type === 'textarea') return `<textarea name="${f.name}" rows="3" placeholder="${esc(f.placeholder || '')}">${v}</textarea>`;
      return `<input name="${f.name}" type="${f.type || 'text'}" value="${v}" ${f.step ? `step="${f.step}"` : ''} placeholder="${esc(f.placeholder || '')}" ${req}>`;
    };
    dlg.innerHTML = `<form><h2>${esc(title)}</h2><p class="error" hidden></p>
      ${fields.map(f => `<label>${esc(f.label)}${input(f)}</label>`).join('')}
      <div class="actions"><button type="button" class="btn" data-cancel>Cancel</button>
      <button class="btn primary">Save</button></div></form>`;
    document.body.append(dlg);
    const close = () => { dlg.close(); dlg.remove(); };
    $('[data-cancel]', dlg).onclick = close;
    dlg.addEventListener('cancel', () => setTimeout(() => dlg.remove()));
    $('form', dlg).onsubmit = e => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(e.target));
      const res = onSave(values);
      if (typeof res === 'string') { const p = $('.error', dlg); p.textContent = res; p.hidden = false; }
      else if (res !== false) close();
    };
    dlg.showModal();
  }

  // Copy text to the clipboard (falls back for browsers that block it on local files).
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (err) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    toast('Copied');
  }

  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };

  // Read-only details dialog. buttons: [{label, fn}] shown beside Close.
  function info(title, html, buttons = []) {
    const dlg = document.createElement('dialog');
    dlg.innerHTML = `<h2>${esc(title)}</h2>${html}<div class="actions"><button class="btn" data-close>Close</button>
      ${buttons.map((b, i) => `<button class="btn primary" data-b="${i}">${esc(b.label)}</button>`).join('')}</div>`;
    document.body.append(dlg);
    const close = () => { dlg.close(); dlg.remove(); };
    dlg.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) close();
      const b = e.target.closest('[data-b]');
      if (b) { close(); buttons[b.dataset.b].fn(); }
    });
    dlg.addEventListener('cancel', () => setTimeout(() => dlg.remove()));
    dlg.showModal();
  }

  document.addEventListener('DOMContentLoaded', () => {
    Store.load();
    navigator.storage?.persist?.(); // asks the browser not to clear saved data
    buildNav();
    show(location.hash.slice(1) || 'dashboard');
  });

  return { $, esc, today, iso, parse, fmtDate, fmtTime, toMins, nthWeekday, isTuesday, register, show, refresh, toast, form, addDays, info, copy };
})();
