/* templates.js – message library. Write {variables} in a template; the composer
   turns each one into an input and builds the final message. */
const Templates = (() => {
  const { $, esc } = App;
  const CATEGORIES = ['Interviews', 'Meetings', 'Admin'];
  const LABELS = { firstName: 'First name', memberName: 'Member name', unit: 'Unit', date: 'Date', time: 'Time',
    location: 'Location', presidentName: 'President name', meetingName: 'Meeting or topic' };
  const SIGN = '\n\nThank you!';

  // Starting library, copied into storage on first run. Edit or add your own on this page.
  const SEED = [
    ['Interview invitation', 'Interviews', 'Kia ora {firstName},\n\nPresident {presidentName} would like to meet with you for an interview on {date} at {time} at {location}.\n\nPlease let me know if this time works for you.' + SIGN],
    ['Interview confirmation', 'Interviews', 'Kia ora {firstName},\n\nThis is to confirm your interview with President {presidentName} on {date} at {time} at {location}.' + SIGN],
    ['Interview reminder', 'Interviews', 'Kia ora {firstName},\n\nA reminder of your interview with President {presidentName} on {date} at {time} at {location}.\n\nPlease let me know if anything has changed.' + SIGN],
    ['Interview reschedule', 'Interviews', 'Kia ora {firstName},\n\nWe need to reschedule your interview with President {presidentName}. Could you do {date} at {time} at {location} instead?\n\nSorry for the change.' + SIGN],
    ['Stake Council reminder', 'Meetings', 'Kia ora everyone,\n\nA reminder that Stake Council is on {date} at {time} in the {location}.\n\nPlease send me any agenda items beforehand.' + SIGN],
    ['High Council reminder', 'Meetings', 'Kia ora everyone,\n\nA reminder that Stake High Council is on {date} at {time} in the {location}.' + SIGN],
    ['Stake MCM reminder', 'Meetings', 'Kia ora everyone,\n\nA reminder that Stake MCM is on {date} at {time} in the {location}.' + SIGN],
    ['Camp Tuhikaramea reminder', 'Meetings', 'Kia ora everyone,\n\nA reminder that the Camp Tuhikaramea committee meets on {date} at {time} at {location}.\n\nPlease let me know if you cannot attend.' + SIGN],
    ['Calling approval', 'Admin', 'Kia ora {firstName},\n\nThe Stake Presidency has approved a calling for {memberName} in {unit}. Please let me know when you would like to arrange the next steps.' + SIGN],
    ['Setting apart reminder', 'Admin', 'Kia ora {firstName},\n\nA reminder that {memberName} from {unit} is to be set apart on {date} at {time}.' + SIGN],
    ['Follow-up', 'Admin', 'Kia ora {firstName},\n\nJust following up on {meetingName}. Could you please let me know where things are at?' + SIGN],
    ['General announcement', 'Admin', 'Kia ora everyone,\n\nAn announcement: {meetingName} on {date} at {time} at {location}.' + SIGN]
  ];

  let sel = null, raw = {}, firstEdited = false, query = '';

  function all() {
    if (!Store.list('templates').length && !Store.settings.templatesSeeded) {
      SEED.forEach(([name, category, body]) => Store.upsert('templates', { name, category, body }));
      Store.settings = { ...Store.settings, templatesSeeded: true };
    }
    return Store.list('templates');
  }

  const varsIn = body => [...new Set([...body.matchAll(/\{(\w+)\}/g)].map(m => m[1]))];
  // How a raw input value appears in the message (dates and times are made friendly).
  const shown = (k, v) => !v ? '' : k === 'date' ? App.parse(v).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
    : k === 'time' ? App.fmtTime(v) : v;
  const fill = body => body.replace(/\{(\w+)\}/g, (m, k) => shown(k, (raw[k] || '').trim()) || m);

  function drawComposer() {
    const t = all().find(x => x.id === sel), box = $('#composer');
    if (!t) { box.innerHTML = ''; return; }
    const s = Store.settings;
    raw = { presidentName: s.presidency[0] || '', location: s.location || '', ...raw };
    box.innerHTML = `<div class="card"><h3>${esc(t.name)}</h3>
      ${varsIn(t.body).map(k => `<label class="field">${LABELS[k] || k}
        <input data-var="${k}" type="${k === 'date' ? 'date' : k === 'time' ? 'time' : 'text'}" value="${esc(raw[k] || '')}"></label>`).join('')}
      <label class="field">Message (you can edit it)<textarea id="msg" rows="9"></textarea></label>
      <button class="btn primary" id="copyMsg">Copy message</button></div>`;
    const msg = $('#msg', box);
    msg.value = fill(t.body);
    box.oninput = e => {
      const k = e.target.dataset.var;
      if (!k) return;
      raw[k] = e.target.value;
      if (k === 'firstName') firstEdited = true;
      if (k === 'memberName' && !firstEdited && $('[data-var=firstName]', box)) {
        raw.firstName = e.target.value.trim().split(' ')[0];
        $('[data-var=firstName]', box).value = raw.firstName;
      }
      msg.value = fill(t.body);
    };
    $('#copyMsg').onclick = async () => {
      try { await navigator.clipboard.writeText(msg.value); } catch (err) { msg.select(); document.execCommand('copy'); }
      App.toast('Message copied');
    };
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function openForm(t) {
    const fields = [
      { name: 'name', label: 'Template name', required: true },
      { name: 'category', label: 'Category', type: 'select', options: CATEGORIES },
      { name: 'body', label: 'Message. Use {firstName}, {memberName}, {unit}, {date}, {time}, {location}, {presidentName}, {meetingName}', type: 'textarea', required: true }
    ];
    App.form(t ? 'Edit template' : 'New template', fields, t || { category: 'Admin' }, v => {
      Store.upsert('templates', { ...v, id: t?.id });
      App.toast('Template saved');
      App.refresh();
    });
  }

  function render(el) {
    const list = all().filter(t => (t.name + t.body).toLowerCase().includes(query));
    el.innerHTML = `<div class="page-head"><h2>Message templates</h2><button class="btn primary" data-act="new">+ New template</button></div>
      <div class="toolbar"><input id="tplSearch" type="search" placeholder="Search templates" aria-label="Search templates" value="${esc(query)}"></div>
      ${CATEGORIES.map(c => `<h3>${c}</h3><div class="table-wrap"><table><tbody>
        ${list.filter(t => t.category === c).map(t => `<tr><td>${esc(t.name)}</td><td class="actions">
          <button class="btn small primary" data-act="use" data-id="${t.id}">Use</button>
          <button class="btn small" data-act="edit" data-id="${t.id}">Edit</button>
          <button class="btn small danger" data-act="del" data-id="${t.id}">Delete</button></td></tr>`).join('') || '<tr><td class="empty">None</td></tr>'}
        </tbody></table></div>`).join('')}
      <div id="composer"></div>`;
    $('#tplSearch').oninput = e => { query = e.target.value.toLowerCase(); sel = null; render(el); $('#tplSearch').focus(); };
    el.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const t = all().find(x => x.id === b.dataset.id);
      if (b.dataset.act === 'new') openForm();
      if (b.dataset.act === 'edit') openForm(t);
      if (b.dataset.act === 'use') { sel = t.id; drawComposer(); }
      if (b.dataset.act === 'del' && confirm(`Delete "${t.name}"?`)) { Store.remove('templates', t.id); sel = null; App.refresh(); }
    };
    drawComposer();
  }

  App.register('templates', { label: 'Templates', render });
})();
