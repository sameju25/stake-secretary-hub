/* callings.js – lightweight tracker for calling approval, interview and setting apart.
   Administrative status only; no personal or pastoral details. */
const Callings = (() => {
  const { $, esc } = App;
  const APPROVAL = ['Pending', 'Approved', 'Not approved'];
  const INTERVIEW = ['Not needed', 'Not scheduled', 'Scheduled', 'Completed'];
  const SETAPART = ['Pending', 'Scheduled', 'Completed', 'Not needed'];
  let tab = 'active', query = '';

  const fields = [
    { name: 'person', label: 'Person', required: true },
    { name: 'calling', label: 'Calling' },
    { name: 'unit', label: 'Unit' },
    { name: 'approval', label: 'Approval status', type: 'select', options: APPROVAL },
    { name: 'interview', label: 'Interview status', type: 'select', options: INTERVIEW },
    { name: 'setApart', label: 'Setting apart status', type: 'select', options: SETAPART },
    { name: 'followDate', label: 'Follow-up date', type: 'date' }
  ];
  // Finished once set apart (or not needed), or if the calling was not approved.
  const isActive = c => !['Completed', 'Not needed'].includes(c.setApart) && c.approval !== 'Not approved';

  function openForm(c) {
    App.form(c ? 'Edit calling' : 'New calling', fields, c || { approval: 'Pending', interview: 'Not scheduled', setApart: 'Pending' }, v => {
      Store.upsert('callings', { ...v, id: c?.id });
      App.toast('Saved');
      App.refresh();
    });
  }

  function draw() {
    const rows = Store.list('callings').filter(c => isActive(c) === (tab === 'active') &&
      [c.person, c.calling, c.unit].join(' ').toLowerCase().includes(query))
      .sort((a, b) => (a.followDate || '9').localeCompare(b.followDate || '9'));
    $('#callList').innerHTML = rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Person</th><th>Approved</th><th>Interview</th><th>Setting apart</th><th>Follow up</th><th></th></tr></thead><tbody>
      ${rows.map(c => `<tr><td>${esc(c.person)}<small>${esc(c.calling || '')}${c.unit ? ', ' + esc(c.unit) : ''}</small></td>
        <td>${c.approval}</td><td>${c.interview}</td><td>${c.setApart}</td>
        <td>${c.followDate ? App.fmtDate(c.followDate) : ''}${isActive(c) && c.followDate && c.followDate < App.today() ? ' <span class="badge Urgent">Overdue</span>' : ''}</td>
        <td class="actions"><button class="btn small" data-act="edit" data-id="${c.id}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${c.id}">Delete</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="empty">Nothing here.</p>';
  }

  function render(el) {
    el.innerHTML = `<div class="page-head"><h2>Callings</h2><button class="btn primary" data-act="new">+ New calling</button></div>
      <div class="tabs"><button data-tab="active" class="${tab === 'active' ? 'active' : ''}">In progress</button>
      <button data-tab="done" class="${tab === 'done' ? 'active' : ''}">Finished</button></div>
      <div class="toolbar"><input id="callSearch" type="search" placeholder="Search callings" aria-label="Search callings" value="${esc(query)}"></div>
      <div id="callList"></div>`;
    $('#callSearch').oninput = e => { query = e.target.value.toLowerCase(); draw(); };
    el.onclick = e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; return render(el); }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'new') openForm();
      if (b.dataset.act === 'edit') openForm(Store.list('callings').find(c => c.id === b.dataset.id));
      if (b.dataset.act === 'del' && confirm('Delete this record?')) { Store.remove('callings', b.dataset.id); App.refresh(); }
    };
    draw();
  }

  App.register('callings', { label: 'Callings', render });
})();
