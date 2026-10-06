/* calendar.js – month, week and agenda views over interviews, meetings, tasks and follow-ups.
   Each event: { date, time, kind, title, detail, edit? }. Kinds also have a symbol so colour isn't the only cue. */
const Calendar = (() => {
  const { $, esc } = App;
  const KINDS = { interview: ['●', 'Interview'], meeting: ['■', 'Meeting'], task: ['▲', 'Task'], followup: ['◆', 'Follow-up'] };
  let mode = 'month', anchor = App.today(), cur = [];

  function events(from, to) {
    const ev = [], inRange = d => d && d >= from && d <= to;
    Meetings.occurrences(from, to).forEach(o => ev.push({ date: o.date, time: o.start, kind: 'meeting', title: o.name,
      detail: `${App.fmtTime(o.start)}${o.end ? '–' + App.fmtTime(o.end) : ''}${o.location ? ', ' + o.location : ''}` }));
    Store.list('interviews').filter(i => inRange(i.date) && i.status !== 'Cancelled').forEach(i => ev.push({
      date: i.date, time: i.time, kind: 'interview', title: i.member,
      detail: `${i.type}, with ${i.presidency}. Status: ${i.status}`, edit: () => Interviews.openForm(i) }));
    Store.list('tasks').filter(t => inRange(t.dueDate) && t.status !== 'Completed').forEach(t => ev.push({
      date: t.dueDate, time: '', kind: 'task', title: t.title, detail: `Priority: ${t.priority}`, edit: () => Tasks.openForm(t) }));
    Store.list('followUps').filter(f => inRange(f.dueDate) && !['Completed', 'Cancelled'].includes(f.status)).forEach(f => ev.push({
      date: f.dueDate, time: '', kind: 'followup', title: f.person || f.title || 'Follow-up', detail: f.reason || '' }));
    Store.list('callings').filter(c => inRange(c.followDate) && !['Completed', 'Not needed'].includes(c.setApart) && c.approval !== 'Not approved').forEach(c => ev.push({
      date: c.followDate, time: '', kind: 'followup', title: c.person, detail: `Calling follow-up${c.calling ? ': ' + c.calling : ''}` }));
    return ev.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  const chip = e => {
    cur.push(e);
    return `<button class="chip ${e.kind}" data-i="${cur.length - 1}" aria-label="${KINDS[e.kind][1]}: ${esc(e.title)}">` +
      `${KINDS[e.kind][0]} ${e.time ? App.fmtTime(e.time).replace(':00', '') + ' ' : ''}${esc(e.title)}</button>`;
  };
  const mondayOf = s => App.addDays(s, -((App.parse(s).getDay() + 6) % 7));

  function monthGrid() {
    const first = anchor.slice(0, 8) + '01', start = mondayOf(first), month = anchor.slice(0, 7);
    const ev = events(start, App.addDays(start, 41));
    let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = App.addDays(start, i), day = ev.filter(e => e.date === d);
      html += `<div class="cell ${d.startsWith(month) ? '' : 'other'} ${d === App.today() ? 'today' : ''}">
        <span class="num">${+d.slice(8)}</span>${day.slice(0, 3).map(chip).join('')}
        ${day.length > 3 ? `<button class="more" data-week="${d}">+${day.length - 3} more</button>` : ''}</div>`;
    }
    return `<div class="month">${html}</div>`;
  }

  function weekGrid() {
    const start = mondayOf(anchor), ev = events(start, App.addDays(start, 6));
    return `<div class="week">${[0, 1, 2, 3, 4, 5, 6].map(i => {
      const d = App.addDays(start, i);
      return `<div class="cell ${d === App.today() ? 'today' : ''}"><strong>${App.fmtDate(d)}</strong>
        ${ev.filter(e => e.date === d).map(chip).join('') || '<span class="sub">Nothing</span>'}</div>`;
    }).join('')}</div>`;
  }

  function agenda() {
    const ev = events(anchor, App.addDays(anchor, 30));
    const days = [...new Set(ev.map(e => e.date))];
    return days.length ? days.map(d => `<div class="card"><h3>${App.fmtDate(d)}</h3>
      ${ev.filter(e => e.date === d).map(chip).join('')}</div>`).join('') : '<p class="empty">Nothing in the next 30 days.</p>';
  }

  function title() {
    if (mode === 'month') return App.parse(anchor).toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' });
    if (mode === 'week') return 'Week of ' + App.fmtDate(mondayOf(anchor));
    return 'Next 30 days from ' + App.fmtDate(anchor);
  }
  function move(dir) {
    if (mode === 'month') { const d = App.parse(anchor.slice(0, 8) + '01'); d.setMonth(d.getMonth() + dir); anchor = App.iso(d); }
    else anchor = App.addDays(anchor, dir * (mode === 'week' ? 7 : 30));
  }

  function render(el) {
    cur = [];
    const body = mode === 'month' ? monthGrid() : mode === 'week' ? weekGrid() : agenda();
    el.innerHTML = `<div class="page-head"><h2>${title()}</h2><div class="actions">
      <button class="btn" data-move="-1" aria-label="Previous">‹</button><button class="btn" data-today>Today</button>
      <button class="btn" data-move="1" aria-label="Next">›</button></div></div>
      <div class="tabs">${['month', 'week', 'agenda'].map(m => `<button data-mode="${m}" class="${m === mode ? 'active' : ''}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
      <p class="legend">${Object.entries(KINDS).map(([k, [s, l]]) => `<span class="chip ${k}">${s} ${l}</span>`).join(' ')}</p>${body}`;
    el.onclick = e => {
      const t = e.target;
      if (t.closest('[data-move]')) { move(+t.closest('[data-move]').dataset.move); return render(el); }
      if (t.closest('[data-today]')) { anchor = App.today(); return render(el); }
      if (t.closest('[data-mode]')) { mode = t.closest('[data-mode]').dataset.mode; return render(el); }
      if (t.closest('[data-week]')) { anchor = t.closest('[data-week]').dataset.week; mode = 'week'; return render(el); }
      const c = t.closest('[data-i]');
      if (c) {
        const ev = cur[c.dataset.i];
        App.info(ev.title, `<p><strong>${KINDS[ev.kind][1]}</strong>, ${App.fmtDate(ev.date)} ${ev.time ? App.fmtTime(ev.time) : ''}</p><p>${esc(ev.detail)}</p>`,
          ev.edit ? [{ label: 'Edit', fn: ev.edit }] : []);
      }
    };
  }

  App.register('calendar', { label: 'Calendar', render });
})();
