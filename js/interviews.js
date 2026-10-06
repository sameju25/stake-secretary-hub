/* interviews.js – interview scheduler (list view; calendar view arrives in Phase 2). */
const Interviews = (() => {
  const { $, esc } = App;
  const TYPES = ['Temple Recommend', 'Living Ordinance / Endowment', 'Missionary', 'Senior Missionary', 'Stake Calling', 'Setting Apart', 'Other'];
  const STATUSES = ['Requested', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Needs Follow-up'];
  const SLOT_MINUTES = 15;           // assumed length of one interview
  const CLOSED = ['Completed', 'Cancelled'];
  let tab = 'upcoming', query = '', statusFilter = '';

  const isThirdTuesday = d => App.isTuesday(d) && App.nthWeekday(d) === 3;
  const isNormalNight = d => App.isTuesday(d) && [1, 3].includes(App.nthWeekday(d));

  // Build the list of warnings for an interview. Warnings never hard-block; the user confirms.
  function warnings(v, selfId) {
    const out = [];
    if (v.date && v.time && v.presidency) {
      const clash = Store.list('interviews').find(o => o.id !== selfId && o.status !== 'Cancelled' &&
        o.date === v.date && o.presidency === v.presidency &&
        Math.abs(App.toMins(o.time) - App.toMins(v.time)) < SLOT_MINUTES);
      if (clash) out.push(`DOUBLE BOOKING: ${v.presidency} already has ${clash.member} at ${App.fmtTime(clash.time)} on this date.`);
    }
    if (v.date && isThirdTuesday(v.date)) {
      out.push('Third Tuesday – Stake MCM at 7:30 PM.' +
        (v.time && App.toMins(v.time) + SLOT_MINUTES > 19 * 60 + 15 ? ' This interview would finish after 7:15 PM.' : ''));
    }
    if (v.date && !isNormalNight(v.date)) out.push('This is not a normal interview night (first and third Tuesday).');
    return out;
  }

  function openForm(item) {
    const s = Store.settings;
    const fields = [
      { name: 'member', label: 'Member name', required: true },
      { name: 'unit', label: 'Unit' },
      { name: 'type', label: 'Interview type', type: 'select', options: TYPES },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'time', label: 'Time (6:30, 6:45, 7:00, 7:15, 7:30)', type: 'time', step: 900, required: true },
      { name: 'presidency', label: 'Stake Presidency member', type: 'select', options: s.presidency },
      { name: 'status', label: 'Status', type: 'select', options: STATUSES },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Scheduling notes only, no confidential details' }
    ];
    const start = item || { time: '18:30', status: 'Scheduled', type: TYPES[0], presidency: s.presidency[0] };
    App.form(item ? 'Edit interview' : 'New interview', fields, start, v => {
      const w = warnings(v, item?.id);
      if (w.length && !confirm(w.join('\n\n') + '\n\nSave anyway?')) return false;
      Store.upsert('interviews', { ...v, id: item?.id });
      App.toast('Interview saved');
      App.refresh();
    });
  }

  const sorted = list => [...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  function draw() {
    const rows = sorted(Store.list('interviews')).filter(i =>
      (tab === 'all' || (i.date >= App.today() && !CLOSED.includes(i.status))) &&
      (!statusFilter || i.status === statusFilter) &&
      [i.member, i.unit, i.type, i.presidency].join(' ').toLowerCase().includes(query));
    $('#intList').innerHTML = rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th>When</th><th>Member</th><th>Type</th><th>With</th><th>Status</th><th></th></tr></thead><tbody>
      ${rows.map(i => `<tr>
        <td>${App.fmtDate(i.date)}<small>${App.fmtTime(i.time)}</small>${isThirdTuesday(i.date) ? '<span class="badge warn">MCM 7:30</span>' : ''}</td>
        <td>${esc(i.member)}${i.unit ? `<small>${esc(i.unit)}</small>` : ''}</td>
        <td>${esc(i.type)}</td><td>${esc(i.presidency)}</td>
        <td><span class="badge ${i.status.replace(/\s/g, '')}">${i.status}</span></td>
        <td class="actions"><button class="btn small" data-act="edit" data-id="${i.id}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${i.id}">Delete</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="empty">No interviews here.</p>';
  }

  function render(el) {
    el.innerHTML = `<div class="page-head"><h2>Interviews</h2>
      <button class="btn primary" data-act="new">+ New interview</button></div>
      <p class="sub">Normal nights: first and third Tuesday, 6:30–7:30 PM, Stake Offices.</p>
      <div class="tabs"><button data-tab="upcoming" class="${tab === 'upcoming' ? 'active' : ''}">Upcoming</button>
      <button data-tab="all" class="${tab === 'all' ? 'active' : ''}">All</button></div>
      <div class="toolbar"><input id="intSearch" type="search" placeholder="Search interviews" aria-label="Search interviews" value="${esc(query)}">
      <select id="intStatus" aria-label="Filter by status"><option value="">All statuses</option>
      ${STATUSES.map(s => `<option ${s === statusFilter ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div id="intList"></div>`;
    $('#intSearch').oninput = e => { query = e.target.value.toLowerCase(); draw(); };
    $('#intStatus').onchange = e => { statusFilter = e.target.value; draw(); };
    el.onclick = e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; return render(el); }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'new') openForm();
      if (b.dataset.act === 'edit') openForm(Store.list('interviews').find(i => i.id === b.dataset.id));
      if (b.dataset.act === 'del' && confirm('Delete this interview?')) { Store.remove('interviews', b.dataset.id); App.refresh(); }
    };
    draw();
  }

  App.register('interviews', { label: 'Interviews', render });
  return { openForm, sorted, CLOSED };
})();
