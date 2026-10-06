/* followups.js – things you are waiting on. Open = Waiting or Contacted. */
const Followups = (() => {
  const { $, esc } = App;
  const STATUSES = ['Waiting', 'Contacted', 'Completed', 'Cancelled'];
  const isOpen = f => ['Waiting', 'Contacted'].includes(f.status);
  let tab = 'open', query = '';

  const fields = [
    { name: 'person', label: 'Person or item', required: true },
    { name: 'reason', label: 'Follow-up reason' },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Admin notes only, nothing confidential' }
  ];

  function openForm(f) {
    const start = f || { status: 'Waiting', dueDate: App.addDays(App.today(), 3) };
    App.form(f ? 'Edit follow-up' : 'New follow-up', fields, start, v => {
      Store.upsert('followUps', { ...v, id: f?.id });
      App.toast('Follow-up saved');
      App.refresh();
    });
  }

  function draw() {
    const rows = Store.list('followUps')
      .filter(f => isOpen(f) === (tab === 'open') && [f.person, f.reason, f.notes].join(' ').toLowerCase().includes(query))
      .sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9'));
    $('#fuList').innerHTML = rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Person / item</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map(f => `<tr><td>${esc(f.person)}${f.reason ? `<small>${esc(f.reason)}</small>` : ''}${f.notes ? `<small>${esc(f.notes)}</small>` : ''}</td>
        <td>${App.fmtDate(f.dueDate)}${isOpen(f) && f.dueDate && f.dueDate < App.today() ? ' <span class="badge Urgent">Overdue</span>' : ''}</td>
        <td><span class="badge ${f.status}">${f.status}</span></td>
        <td class="actions">${f.status === 'Waiting' ? `<button class="btn small" data-set="Contacted" data-id="${f.id}">Contacted</button>` : ''}
        ${isOpen(f) ? `<button class="btn small" data-set="Completed" data-id="${f.id}">Complete</button>` : ''}
        <button class="btn small" data-act="edit" data-id="${f.id}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${f.id}">Delete</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="empty">Nothing here.</p>';
  }

  function render(el) {
    el.innerHTML = `<div class="page-head"><h2>Follow-ups</h2><button class="btn primary" data-act="new">+ New follow-up</button></div>
      <div class="tabs"><button data-tab="open" class="${tab === 'open' ? 'active' : ''}">Outstanding</button>
      <button data-tab="closed" class="${tab === 'closed' ? 'active' : ''}">Completed / cancelled</button></div>
      <div class="toolbar"><input id="fuSearch" type="search" placeholder="Search follow-ups" aria-label="Search follow-ups" value="${esc(query)}"></div>
      <div id="fuList"></div>`;
    $('#fuSearch').oninput = e => { query = e.target.value.toLowerCase(); draw(); };
    el.onclick = e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; return render(el); }
      const s = e.target.closest('[data-set]');
      if (s) { Store.upsert('followUps', { id: s.dataset.id, status: s.dataset.set }); return App.refresh(); }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'new') openForm();
      if (b.dataset.act === 'edit') openForm(Store.list('followUps').find(f => f.id === b.dataset.id));
      if (b.dataset.act === 'del' && confirm('Delete this follow-up?')) { Store.remove('followUps', b.dataset.id); App.refresh(); }
    };
    draw();
  }

  App.register('followups', { label: 'Follow-ups', render });
  return { openForm, isOpen };
})();
