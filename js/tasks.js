/* tasks.js – task manager: Today / Upcoming / Overdue / Completed. */
const Tasks = (() => {
  const { $, esc } = App;
  const PRIORITY = ['Low', 'Medium', 'High', 'Urgent'];
  const CATEGORIES = ['Interviews', 'Meetings', 'Callings', 'Camp', 'Admin', 'Other'];
  const TABS = [['today', 'Today'], ['upcoming', 'Upcoming'], ['overdue', 'Overdue'], ['completed', 'Completed']];
  let tab = 'today', query = '', pri = '';

  const fields = [
    { name: 'title', label: 'Title', required: true },
    { name: 'dueDate', label: 'Due date', type: 'date' },
    { name: 'priority', label: 'Priority', type: 'select', options: PRIORITY },
    { name: 'category', label: 'Category', type: 'select', options: CATEGORIES },
    { name: 'unit', label: 'Related unit' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Admin notes only, nothing confidential' }
  ];

  // Which tab a task belongs in. Tasks with no date count as upcoming.
  function bucket(t) {
    if (t.status === 'Completed') return 'completed';
    if (t.dueDate && t.dueDate < App.today()) return 'overdue';
    if (t.dueDate === App.today()) return 'today';
    return 'upcoming';
  }

  function openForm(task) {
    const start = task || { priority: 'Medium', category: 'Admin', dueDate: App.today() };
    App.form(task ? 'Edit task' : 'New task',
      [...fields.slice(0, 4), { name: 'meeting', label: 'Related meeting', type: 'select', options: ['', ...Meetings.names()] }, ...fields.slice(4)], start, v => {
      Store.upsert('tasks', { ...v, id: task?.id, status: task?.status || 'Open' });
      App.toast('Task saved');
      App.refresh();
    });
  }

  function toggle(id) {
    const t = Store.list('tasks').find(x => x.id === id);
    Store.upsert('tasks', { id, status: t.status === 'Completed' ? 'Open' : 'Completed' });
    App.refresh();
  }

  function draw() {
    const rows = Store.list('tasks')
      .filter(t => bucket(t) === tab && (!pri || t.priority === pri) &&
        [t.title, t.unit, t.notes, t.category].join(' ').toLowerCase().includes(query))
      .sort((a, b) => (a.dueDate || '9').localeCompare(b.dueDate || '9') ||
        PRIORITY.indexOf(b.priority) - PRIORITY.indexOf(a.priority));
    $('#taskList').innerHTML = rows.length ? `<div class="table-wrap"><table>
      <thead><tr><th></th><th>Task</th><th>Due</th><th>Priority</th><th>Category</th><th></th></tr></thead><tbody>
      ${rows.map(t => `<tr>
        <td><input type="checkbox" data-act="done" data-id="${t.id}" aria-label="Mark complete" ${t.status === 'Completed' ? 'checked' : ''}></td>
        <td>${esc(t.title)}${t.meeting ? `<small>Meeting: ${esc(t.meeting)}</small>` : ''}${t.unit ? `<small>${esc(t.unit)}</small>` : ''}${t.notes ? `<small>${esc(t.notes)}</small>` : ''}</td>
        <td>${App.fmtDate(t.dueDate)}</td>
        <td><span class="badge ${t.priority}">${t.priority}</span></td>
        <td>${esc(t.category)}</td>
        <td class="actions"><button class="btn small" data-act="edit" data-id="${t.id}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${t.id}">Delete</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="empty">No tasks here.</p>';
  }

  function render(el) {
    const all = Store.list('tasks');
    el.innerHTML = `<div class="page-head"><h2>Tasks</h2>
      <button class="btn primary" data-act="new">+ New task</button></div>
      <div class="tabs">${TABS.map(([k, label]) =>
        `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${label} (${all.filter(t => bucket(t) === k).length})</button>`).join('')}</div>
      <div class="toolbar">
        <input id="taskSearch" type="search" placeholder="Search tasks" aria-label="Search tasks" value="${esc(query)}">
        <select id="taskPri" aria-label="Filter by priority"><option value="">All priorities</option>
        ${PRIORITY.map(p => `<option ${p === pri ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div id="taskList"></div>`;
    $('#taskSearch').oninput = e => { query = e.target.value.toLowerCase(); draw(); };
    $('#taskPri').onchange = e => { pri = e.target.value; draw(); };
    el.onclick = e => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { tab = tb.dataset.tab; return render(el); }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const id = b.dataset.id;
      if (b.dataset.act === 'new') openForm();
      if (b.dataset.act === 'edit') openForm(Store.list('tasks').find(t => t.id === id));
      if (b.dataset.act === 'done') toggle(id);
      if (b.dataset.act === 'del' && confirm('Delete this task?')) { Store.remove('tasks', id); App.refresh(); }
    };
    draw();
  }

  App.register('tasks', { label: 'Tasks', render });
  return { openForm, bucket, toggle };
})();
