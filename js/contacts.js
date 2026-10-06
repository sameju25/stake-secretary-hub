/* contacts.js – simple unit directory. No field is required except the unit name. */
const Contacts = (() => {
  const { $, esc } = App;
  const ROLES = [['leader', 'Bishop / Branch President'], ['first', 'First Counselor'], ['second', 'Second Counselor'],
    ['secretary', 'Executive Secretary'], ['rs', 'Relief Society President'], ['eq', 'Elders Quorum President']];
  let query = '';

  const fields = [
    { name: 'name', label: 'Unit name', required: true },
    ...ROLES.map(([name, label]) => ({ name, label })),
    { name: 'email', label: 'Contact email', type: 'email' },
    { name: 'phone', label: 'Contact phone', type: 'tel' }
  ];

  function openForm(u) {
    App.form(u ? 'Edit unit' : 'New unit', fields, u || {}, v => {
      Store.upsert('units', { ...v, id: u?.id });
      App.toast('Unit saved');
      App.refresh();
    });
  }

  function draw() {
    const rows = Store.list('units').filter(u => Object.values(u).join(' ').toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
    $('#unitList').innerHTML = rows.length ? rows.map(u => `<div class="card"><div class="page-head"><h3>${esc(u.name)}</h3>
      <div class="actions"><button class="btn small" data-act="edit" data-id="${u.id}">Edit</button>
      <button class="btn small danger" data-act="del" data-id="${u.id}">Delete</button></div></div>
      ${ROLES.filter(([k]) => u[k]).map(([k, label]) => `<p class="sub">${label}: <strong>${esc(u[k])}</strong></p>`).join('')}
      ${u.phone ? `<p>Phone: <a href="tel:${esc(u.phone)}">${esc(u.phone)}</a></p>` : ''}
      ${u.email ? `<p>Email: <a href="mailto:${esc(u.email)}">${esc(u.email)}</a></p>` : ''}</div>`).join('')
      : '<p class="empty">No units yet. Add one to get started.</p>';
  }

  function render(el) {
    el.innerHTML = `<div class="page-head"><h2>Unit contacts</h2><button class="btn primary" data-act="new">+ New unit</button></div>
      <div class="toolbar"><input id="unitSearch" type="search" placeholder="Search units and people" aria-label="Search units" value="${esc(query)}"></div>
      <div id="unitList"></div>`;
    $('#unitSearch').oninput = e => { query = e.target.value.toLowerCase(); draw(); };
    el.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'new') openForm();
      if (b.dataset.act === 'edit') openForm(Store.list('units').find(u => u.id === b.dataset.id));
      if (b.dataset.act === 'del' && confirm('Delete this unit?')) { Store.remove('units', b.dataset.id); App.refresh(); }
    };
    draw();
  }

  App.register('contacts', { label: 'Contacts', render });
})();
