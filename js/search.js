/* search.js – global search. Type in the sidebar box; results link to the page that holds them. */
const Search = (() => {
  const { $, esc } = App;
  let q = '';
  const KIND = { council: 'Stake Council', mcm: 'Stake MCM', camp: 'Camp Tuhikaramea', poll: 'HC poll' };

  // [heading, page to open, records, (record) => [title, subtitle]]
  const GROUPS = [
    ['Units and leaders', 'contacts', () => Store.list('units'), u => [u.name, [u.leader, u.first, u.second, u.secretary, u.rs, u.eq].filter(Boolean).join(', ')]],
    ['Interviews', 'interviews', () => Store.list('interviews'), i => [i.member, `${App.fmtDate(i.date)} ${App.fmtTime(i.time)}, ${i.type}`]],
    ['Meetings', 'meetings', () => Store.list('meetings'), m => [m.name, m.location || '']],
    ['Tasks', 'tasks', () => Store.list('tasks'), t => [t.title, `${App.fmtDate(t.dueDate)}, ${t.status}`]],
    ['Follow-ups', 'followups', () => Store.list('followUps'), f => [f.person, f.reason || '']],
    ['Callings', 'callings', () => Store.list('callings'), c => [c.person, c.calling || '']],
    ['Templates', 'templates', () => Store.list('templates'), t => [t.name, t.category]],
    ['Meeting records', r => (r.kind === 'poll' ? 'polls' : r.kind), () => Store.list('minutes'), r => [r.candidate || KIND[r.kind], `${KIND[r.kind]}, ${App.fmtDate(r.date)}`]]
  ];
  // A record matches if any of its text fields contains the search text.
  const hit = o => Object.values(o).some(v => typeof v === 'string' && v.toLowerCase().includes(q));

  function render(el) {
    const found = GROUPS.map(([head, go, get, show]) => [head, get().filter(hit).map(r => ({ go: typeof go === 'function' ? go(r) : go, text: show(r) }))])
      .filter(([, rows]) => rows.length);
    el.innerHTML = `<div class="page-head"><h2>Search</h2></div>` + (found.length ? found.map(([head, rows]) =>
      `<div class="card"><h3>${head}</h3><ul class="list">${rows.map(r => `<li><span>${esc(r.text[0])}<small>${esc(r.text[1])}</small></span>
        <button class="btn small" data-go="${r.go}">Open</button></li>`).join('')}</ul></div>`).join('')
      : `<p class="empty">Nothing found for "${esc(q)}".</p>`);
    el.onclick = e => { const b = e.target.closest('[data-go]'); if (b) App.show(b.dataset.go); };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const box = $('#globalSearch');
    box.addEventListener('input', () => {
      q = box.value.trim().toLowerCase();
      App.show(q ? 'search' : 'dashboard');
    });
  });

  App.register('search', { label: 'Search', hidden: true, render });
})();
