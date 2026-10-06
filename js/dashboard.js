/* dashboard.js – "what do I need to do today?" Reads from Tasks, Interviews and Meetings. */
const Dashboard = (() => {
  const { esc } = App;
  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

  function render(el) {
    const today = App.today();
    Meetings.notifyDue();
    const tasks = Store.list('tasks');
    const overdue = tasks.filter(t => Tasks.bucket(t) === 'overdue');
    const dueToday = tasks.filter(t => Tasks.bucket(t) === 'today');
    const open = Interviews.sorted(Store.list('interviews')).filter(i => !Interviews.CLOSED.includes(i.status));
    const intToday = open.filter(i => i.date === today);
    const intNext = open.filter(i => i.date > today).slice(0, 5);
    const occ = Meetings.occurrences(today, App.addDays(today, 30));
    const meetToday = occ.filter(o => o.date === today);
    const meetNext = occ.filter(o => o.date > today).slice(0, 5);
    const rem = Meetings.reminders();
    const fu = Store.list('followUps').filter(Followups.isOpen).sort((x, y) => (x.dueDate || '9').localeCompare(y.dueDate || '9'));
    const fuDue = fu.filter(f => f.dueDate && f.dueDate <= today);
    const last = Store.settings.lastExport;
    const hasData = ['tasks', 'interviews', 'followUps', 'units', 'minutes', 'callings'].some(k => Store.list(k).length);
    const backupDue = hasData && (!last || App.addDays(last, 30) < today);
    const long = new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' });

    const taskItem = t => `<li><span>${esc(t.title)}</span><span class="badge ${t.priority}">${App.fmtDate(t.dueDate)}</span></li>`;
    const intItem = i => `<li><span>${esc(i.member)} <small>${esc(i.type)}</small></span><span>${App.fmtDate(i.date)} ${App.fmtTime(i.time)}</span></li>`;
    const fuItem = f => `<li><span>${esc(f.person)}<small>${esc(f.reason || '')}</small></span><span class="badge ${f.dueDate && f.dueDate <= today ? 'Urgent' : ''}">${App.fmtDate(f.dueDate)}</span></li>`;
    const meetItem = o => `<li><span>${esc(o.name)}</span><span>${App.fmtDate(o.date)} ${App.fmtTime(o.start)}</span></li>`;
    const remItem = r => `<li><span>${esc(r.text)}<small>${esc(r.meeting.name)}, ${App.fmtDate(r.meeting.date)}</small></span>
      <button class="btn small" data-done="${esc(r.key)}">Done</button></li>`;
    const list = (items, fn, none) => items.length ? `<ul class="list">${items.map(fn).join('')}</ul>` : `<p class="empty">${none}</p>`;

    el.innerHTML = `<div class="page-head"><div>
        <h2>${greeting()}, ${esc(Store.settings.name)}</h2><p class="sub">Today: ${long}</p></div>
      <div class="actions">
        <button class="btn primary" data-q="interview">+ New interview</button>
        <button class="btn primary" data-q="task">+ New task</button>
        <button class="btn primary" data-q="meeting">+ New meeting</button>
        <button class="btn primary" data-q="followup">+ New follow-up</button>
        <button class="btn primary" data-q="message">Create message</button></div></div>
      ${backupDue ? '<div class="card notice"><strong>Back up your data.</strong> It only lives in this browser. <button class="btn small" data-go="settings">Open Settings</button></div>' : ''}
      <div class="grid">
        <div class="card"><h3>Needs attention</h3><div class="stat ${overdue.length + fuDue.length ? 'alert' : ''}">${overdue.length + fuDue.length}</div>
          <p class="sub">${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}, ${fuDue.length} follow-up${fuDue.length === 1 ? '' : 's'} due</p>
          ${list(overdue.slice(0, 5), taskItem, 'No overdue tasks.')}${list(fuDue.slice(0, 5), fuItem, 'No follow-ups due.')}</div>
        <div class="card"><h3>Outstanding follow-ups</h3><div class="stat">${fu.length}</div>${list(fu.slice(0, 6), fuItem, 'Nothing outstanding.')}</div>
        <div class="card"><h3>Today</h3><div class="stat">${intToday.length + meetToday.length + dueToday.length}</div>
          <p class="sub">${intToday.length} interview${intToday.length === 1 ? '' : 's'}, ${meetToday.length} meeting${meetToday.length === 1 ? '' : 's'}, ${dueToday.length} task${dueToday.length === 1 ? '' : 's'} due</p>
          ${list(meetToday, meetItem, 'No meetings today.')}${list(intToday, intItem, 'No interviews today.')}${list(dueToday, taskItem, 'No tasks due today.')}</div>
        <div class="card"><h3>Reminders to send</h3><div class="stat ${rem.length ? 'alert' : ''}">${rem.length}</div>
          ${list(rem, remItem, 'All caught up.')}</div>
        <div class="card"><h3>Upcoming meetings</h3>${list(meetNext, meetItem, 'None in the next 30 days.')}</div>
        <div class="card"><h3>Upcoming interviews</h3>${list(intNext, intItem, 'Nothing booked yet.')}</div>
      </div>`;
    el.onclick = e => {
      const go = e.target.closest('[data-go]');
      if (go) return App.show(go.dataset.go);
      const done = e.target.closest('[data-done]');
      if (done) { Meetings.dismiss(done.dataset.done); return App.refresh(); }
      const b = e.target.closest('[data-q]');
      if (!b) return;
      if (b.dataset.q === 'interview') Interviews.openForm();
      if (b.dataset.q === 'task') Tasks.openForm();
      if (b.dataset.q === 'meeting') Meetings.openForm();
      if (b.dataset.q === 'followup') Followups.openForm();
      if (b.dataset.q === 'message') App.show('templates');
    };
  }
  App.register('dashboard', { label: 'Dashboard', render });
})();
