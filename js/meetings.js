/* meetings.js – recurring meeting definitions, occurrence generator and reminder rules.
   A definition's rule is either:
     { type:'nth', weekday:0-6, nth:[1,3], months:[3,6,9,12] (optional) }  e.g. third Sunday
     { type:'once', date:'YYYY-MM-DD' }                                    one-off meeting
   Reminders per definition: [{ days: daysBefore (0 = meeting morning), text }] */
const Meetings = (() => {
  const { $, esc } = App;
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth'];

  // Starting definitions, copied into storage on first run. Edit them on the Meetings page.
  const SEED = [
    { name: 'Stake High Council', rule: { type: 'nth', weekday: 0, nth: [1] }, start: '07:00', end: '08:30', location: 'High Council Room',
      reminders: [{ days: 0, text: 'Stake High Council today.' }] },
    { name: 'Stake Council', rule: { type: 'nth', weekday: 0, nth: [3] }, start: '07:00', end: '08:30', location: 'High Council Room',
      reminders: [{ days: 3, text: 'Stake Council is coming up. Request agenda items.' }] },
    { name: 'Stake MCM', rule: { type: 'nth', weekday: 2, nth: [3] }, start: '19:30', end: '20:30', location: 'High Council Room',
      reminders: [{ days: 1, text: 'Stake MCM tomorrow.' }] },
    { name: 'Stake Interviews', rule: { type: 'nth', weekday: 2, nth: [1, 3] }, start: '18:30', end: '19:30', location: 'Stake Offices', reminders: [] },
    { name: 'Camp Tuhikaramea Committee', rule: { type: 'nth', weekday: 3, nth: [4], months: [3, 6, 9, 12] }, start: '18:30', end: '19:30', location: '',
      reminders: [{ days: 7, text: 'Camp Tuhikaramea meeting is next week. Confirm meeting location with President James.' }] }
  ];

  function defs() {
    if (!Store.list('meetings').length && !Store.settings.seeded) {
      SEED.forEach(m => Store.upsert('meetings', m));
      Store.settings = { ...Store.settings, seeded: true };
    }
    return Store.list('meetings');
  }
  const names = () => defs().map(d => d.name);

  // Every meeting date between two ISO dates (inclusive), generated from the rules.
  function occurrences(from, to) {
    const out = [];
    for (let day = from; day <= to; day = App.addDays(day, 1)) {
      const dt = App.parse(day);
      defs().forEach(m => {
        const r = m.rule;
        const hit = r.type === 'once' ? r.date === day
          : dt.getDay() === r.weekday && r.nth.includes(Math.ceil(dt.getDate() / 7)) &&
            (!r.months || r.months.includes(dt.getMonth() + 1));
        if (hit) out.push({ defId: m.id, name: m.name, date: day, start: m.start, end: m.end, location: m.location });
      });
    }
    return out;
  }

  // ---- Reminders: shown from (meeting date - days) until the meeting, until marked done ----
  function reminders() {
    const t = App.today(), done = Store.settings.done || {}, out = [];
    occurrences(t, App.addDays(t, 14)).forEach(o => {
      const d = defs().find(x => x.id === o.defId);
      if (!d || d.remindersOff) return;
      (d.reminders || []).forEach(r => {
        const key = `${o.defId}|${o.date}|${r.days}`;
        if (App.addDays(o.date, -r.days) <= t && !done[key]) out.push({ key, text: r.text, meeting: o });
      });
    });
    return out;
  }
  function mark(field, key) {
    const s = Store.settings;
    Store.settings = { ...s, [field]: { ...(s[field] || {}), [key]: true } };
  }
  const dismiss = key => mark('done', key);

  // Browser notification, once per reminder. Needs permission; some browsers limit this on local files.
  function notifyDue() {
    if (!('Notification' in window) || Notification.permission !== 'granted' || Store.settings.notify === false) return;
    reminders().forEach(r => {
      if ((Store.settings.notified || {})[r.key]) return;
      new Notification('Stake Secretary Hub', { body: r.text });
      mark('notified', r.key);
    });
  }

  const ruleText = d => {
    const r = d.rule;
    if (r.type === 'once') return App.fmtDate(r.date);
    let s = r.nth.map(n => ORD[n]).join(' and ') + ' ' + WD[r.weekday];
    if (r.months) s += ' of ' + r.months.map(m => MONTHS[m - 1]).join(', ');
    return s[0].toUpperCase() + s.slice(1);
  };
  const remText = r => `${r.days === 0 ? 'Meeting morning' : r.days + (r.days === 1 ? ' day' : ' days') + ' before'}: ${r.text}`;

  function openForm(d) {
    const once = !d || d.rule.type === 'once';
    const fields = [
      { name: 'name', label: 'Meeting name', required: true },
      ...(once ? [{ name: 'date', label: 'Date', type: 'date', required: true }] : []),
      { name: 'start', label: 'Start', type: 'time', required: true },
      { name: 'end', label: 'End', type: 'time' },
      { name: 'location', label: 'Location' }
    ];
    const vals = d ? { ...d, date: d.rule.date } : { start: '19:00', end: '20:00', location: Store.settings.location };
    App.form(d ? 'Edit meeting' : 'New meeting', fields, vals, v => {
      const item = { id: d?.id, name: v.name, start: v.start, end: v.end, location: v.location };
      if (once) { item.rule = { type: 'once', date: v.date }; if (!d) item.reminders = []; }
      Store.upsert('meetings', item);
      App.toast('Meeting saved');
      App.refresh();
    });
  }

  function render(el) {
    const t = App.today(), occ = occurrences(t, App.addDays(t, 120));
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    el.innerHTML = `<div class="page-head"><h2>Meetings</h2><div class="actions">
      <button class="btn" data-act="notif">Browser notifications: ${perm === 'granted' ? 'on' : perm === 'denied' ? 'blocked' : perm === 'unsupported' ? 'not supported' : 'turn on'}</button>
      <button class="btn primary" data-act="new">+ New meeting</button></div></div>
      ${defs().map(d => `<div class="card"><div class="page-head"><div><h3>${esc(d.name)}</h3>
        <p class="sub">${esc(ruleText(d))}, ${App.fmtTime(d.start)}${d.end ? '–' + App.fmtTime(d.end) : ''}${d.location ? ', ' + esc(d.location) : ''}</p></div>
        <div class="actions">${d.reminders?.length ? `<label><input type="checkbox" data-act="rem" data-id="${d.id}" ${d.remindersOff ? '' : 'checked'}> Reminders on</label>` : ''}
        <button class="btn small" data-act="edit" data-id="${d.id}">Edit</button>
        <button class="btn small danger" data-act="del" data-id="${d.id}">Delete</button></div></div>
        <p><strong>Next:</strong> ${occ.filter(o => o.defId === d.id).slice(0, 3).map(o => App.fmtDate(o.date)).join(', ') || 'none in the next 4 months'}</p>
        ${(d.reminders || []).map(r => `<p class="sub">${esc(remText(r))}</p>`).join('')}</div>`).join('')}`;
    el.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const d = defs().find(x => x.id === b.dataset.id);
      if (b.dataset.act === 'new') openForm();
      if (b.dataset.act === 'edit') openForm(d);
      if (b.dataset.act === 'rem') { Store.upsert('meetings', { id: d.id, remindersOff: !b.checked }); App.toast(b.checked ? 'Reminders on' : 'Reminders off'); }
      if (b.dataset.act === 'del' && confirm(`Delete "${d.name}"?`)) { Store.remove('meetings', d.id); App.refresh(); }
      if (b.dataset.act === 'notif' && 'Notification' in window)
        Notification.requestPermission().then(() => App.refresh());
    };
  }

  App.register('meetings', { label: 'Meetings', render });
  return { occurrences, reminders, dismiss, notifyDue, names, openForm };
})();
