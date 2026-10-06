/* minutes.js – Stake Council, Stake MCM and Camp Tuhikaramea pages.
   One generic page builder; each config says which fields its records have.
   Records live in Store 'minutes' with kind = council | mcm | camp. Keep notes administrative only. */
const Minutes = (() => {
  const { esc } = App;

  const QUESTIONS = [
    'What is the organisational structure of the Church going to look like in the next few years?',
    'What can we do to prepare our members to go to the temple and receive the blessings of exaltation?',
    'What will we teach our members about the blessings of the temple and exaltation?',
    'Why is the Lord building more temples?',
    'What is the culture of temples that is embedded in the hearts of our people today?',
    'How do we help our endowed members understand the doctrine of the temple garment?',
    'If half of our members are single, how should this shape our planning, leadership focus, and resource allocation?',
    'What more can we do to increase participation rates?',
    'What principles, traditions, leadership practices, or social conditions can help maintain stronger sealing outcomes?',
    'How do we help members develop faith in Jesus Christ?',
    'What principles have helped you receive personal revelation?'
  ];
  const T = (name, label) => ({ name, label, type: 'textarea' });

  const CONFIGS = [
    { key: 'council', label: 'Stake Council', match: 'stake council',
      fields: [T('agenda', 'Agenda items'), T('questions', 'Questions discussed'), T('attendance', 'Attendance'), T('notes', 'Notes')],
      nudge: (next, recs, days) => days <= 7 && !recs.some(r => r.date === next.date && r.agenda)
        ? `Request agenda items before Stake Council on ${App.fmtDate(next.date)}.` : '' },
    { key: 'mcm', label: 'Stake MCM', match: 'mcm',
      fields: [T('attendance', 'Attendance'), T('agenda', 'Agenda'), T('discussion', 'Discussion'), T('decisions', 'Decisions'),
        T('assignments', 'Assignments'), T('followups', 'Follow-ups')],
      nudge: () => '' },
    { key: 'camp', label: 'Camp Tuhikaramea', match: 'tuhikaramea',
      fields: [{ name: 'location', label: 'Location' }, { name: 'locConfirmed', label: 'Location confirmed', type: 'select', options: ['No', 'Yes'] },
        T('attendance', 'Attendance'), T('agenda', 'Agenda'), T('decisions', 'Decisions'), T('assignments', 'Assignments'), T('notes', 'Notes')],
      defaults: { locConfirmed: 'No', attendance: 'President James\nPresident Jones\nHigh Council representative\nBrother McArthur\nSister McArthur\nElder Daniels\nJustin Harris' },
      nudge: (next, recs, days) => days <= 7 && !recs.some(r => r.date === next.date && r.locConfirmed === 'Yes')
        ? 'Confirm meeting location with President James.' : '' }
  ];

  function openForm(cfg, rec, nextDate) {
    const start = rec || { date: nextDate || App.today(), ...(cfg.defaults || {}) };
    App.form(`${rec ? 'Edit' : 'New'} ${cfg.label} record`, [{ name: 'date', label: 'Meeting date', type: 'date', required: true }, ...cfg.fields], start, v => {
      Store.upsert('minutes', { ...v, kind: cfg.key, id: rec?.id });
      App.toast('Saved');
      App.refresh();
    });
  }

  // Plain-text minutes, ready to paste into an email or document.
  const minutesText = (cfg, r) => `${cfg.label} minutes, ${App.fmtDate(r.date)}\n\n` +
    cfg.fields.filter(f => r[f.name]).map(f => `${f.label}:\n${r[f.name]}`).join('\n\n');

  function build(cfg) {
    return el => {
      const t = App.today();
      const next = Meetings.occurrences(t, App.addDays(t, 120)).find(o => o.name.toLowerCase().includes(cfg.match));
      const recs = Store.list('minutes').filter(m => m.kind === cfg.key).sort((a, b) => b.date.localeCompare(a.date));
      const days = next ? Math.round((App.parse(next.date) - App.parse(t)) / 864e5) : 0;
      const nudge = next ? cfg.nudge(next, recs, days) : '';
      el.innerHTML = `<div class="page-head"><div><h2>${cfg.label}</h2>
        <p class="sub">${next ? `Next: ${App.fmtDate(next.date)}, ${App.fmtTime(next.start)}${next.location ? ', ' + esc(next.location) : ''}` : 'No upcoming date found. Check the Meetings page.'}</p></div>
        <button class="btn primary" data-act="new">+ New record</button></div>
        ${nudge ? `<div class="card notice"><strong>${esc(nudge)}</strong></div>` : ''}
        ${cfg.key === 'council' ? `<div class="card"><h3>Discussion questions</h3><ol>${QUESTIONS.map(q => `<li>${esc(q)}</li>`).join('')}</ol></div>` : ''}
        ${recs.map(r => `<div class="card"><div class="page-head"><h3>${App.fmtDate(r.date)}</h3><div class="actions">
          <button class="btn small" data-act="copy" data-id="${r.id}">Copy minutes</button>
          <button class="btn small" data-act="edit" data-id="${r.id}">Edit</button>
          <button class="btn small danger" data-act="del" data-id="${r.id}">Delete</button></div></div>
          ${cfg.fields.filter(f => r[f.name]).map(f => `<p class="sub">${f.label}</p><p class="pre">${esc(r[f.name])}</p>`).join('') || '<p class="empty">Empty record.</p>'}</div>`).join('')
          || '<p class="empty">No records yet. Add one for the next meeting.</p>'}`;
      el.onclick = e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const r = recs.find(x => x.id === b.dataset.id);
        if (b.dataset.act === 'new') openForm(cfg, null, next?.date);
        if (b.dataset.act === 'edit') openForm(cfg, r);
        if (b.dataset.act === 'copy') App.copy(minutesText(cfg, r));
        if (b.dataset.act === 'del' && confirm('Delete this record?')) { Store.remove('minutes', r.id); App.refresh(); }
      };
    };
  }

  CONFIGS.forEach(cfg => App.register(cfg.key, { label: cfg.label, render: build(cfg) }));
})();
