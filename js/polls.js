/* polls.js – builds a High Council poll message and keeps a personal log of what you sent.
   This is NOT an official voting system. */
const Polls = (() => {
  const { $, esc } = App;
  const STATUSES = ['Sent', 'Approved', 'Concerns raised'];
  let v = { candidate: '', calling: '', unit: '', question: '' };

  const build = () => {
    const q = v.question.trim() ||
      `Please indicate your approval for ${v.candidate || '[candidate]'} to serve as ${v.calling || '[calling]'}${v.unit ? ' in ' + v.unit : ''}.`;
    return `Kia ora everyone,\n\n${q}\n\nPlease vote Yes to approve or No if you have any concerns.\n\nThank you!`;
  };

  function render(el) {
    const log = Store.list('minutes').filter(m => m.kind === 'poll').sort((a, b) => b.date.localeCompare(a.date));
    el.innerHTML = `<div class="page-head"><h2>High Council polls</h2></div>
      <p class="sub">A message builder and personal log only. It is not an official vote.</p>
      <div class="card">
        <label class="field">Candidate name<input data-v="candidate" value="${esc(v.candidate)}"></label>
        <label class="field">Calling<input data-v="calling" value="${esc(v.calling)}"></label>
        <label class="field">Unit (optional)<input data-v="unit" value="${esc(v.unit)}"></label>
        <label class="field">Custom question (optional, replaces the first sentence)<textarea data-v="question" rows="2">${esc(v.question)}</textarea></label>
        <label class="field">Message<textarea id="pv" rows="8"></textarea></label>
        <div class="actions"><button class="btn primary" id="pCopy">Copy message</button>
        <button class="btn" id="pSave">Save to log</button></div></div>
      <h3>Log</h3>${log.map(p => `<div class="card"><div class="page-head"><div><strong>${esc(p.candidate)}</strong>
        <p class="sub">${esc(p.calling)}${p.unit ? ', ' + esc(p.unit) : ''}, sent ${App.fmtDate(p.date)}</p></div>
        <div class="actions">${STATUSES.map(s => `<button class="btn small ${p.status === s ? 'primary' : ''}" data-set="${s}" data-id="${p.id}">${s}</button>`).join('')}
        <button class="btn small danger" data-del="${p.id}">Delete</button></div></div></div>`).join('') || '<p class="empty">Nothing logged yet.</p>'}`;
    const pv = $('#pv');
    pv.value = build();
    el.oninput = e => { const k = e.target.dataset.v; if (k) { v[k] = e.target.value; pv.value = build(); } };
    $('#pCopy').onclick = () => App.copy(pv.value);
    $('#pSave').onclick = () => {
      if (!v.candidate.trim() || !v.calling.trim()) return App.toast('Add a candidate and calling first');
      Store.upsert('minutes', { kind: 'poll', date: App.today(), candidate: v.candidate, calling: v.calling, unit: v.unit, status: 'Sent' });
      v = { candidate: '', calling: '', unit: '', question: '' };
      App.toast('Saved to log');
      App.refresh();
    };
    el.onclick = e => {
      const s = e.target.closest('[data-set]'), d = e.target.closest('[data-del]');
      if (s) { Store.upsert('minutes', { id: s.dataset.id, status: s.dataset.set }); App.refresh(); }
      if (d && confirm('Delete this log entry?')) { Store.remove('minutes', d.dataset.del); App.refresh(); }
    };
  }

  App.register('polls', { label: 'HC polls', render });
})();
