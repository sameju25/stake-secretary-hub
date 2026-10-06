/* settings.js – your details, notification preference, and backup / restore. */
const Settings = (() => {
  const { esc } = App;

  function edit() {
    const s = Store.settings;
    const fields = [
      { name: 'name', label: 'My name', required: true },
      { name: 'phone', label: 'My phone', type: 'tel' },
      { name: 'email', label: 'My email', type: 'email' },
      { name: 'stakeName', label: 'Stake name' },
      { name: 'location', label: 'Default meeting location' },
      { name: 'p1', label: 'Stake Presidency member 1', required: true },
      { name: 'p2', label: 'Stake Presidency member 2' },
      { name: 'p3', label: 'Stake Presidency member 3' },
      { name: 'notify', label: 'Browser notifications for reminders', type: 'select', options: ['On', 'Off'] }
    ];
    const vals = { ...s, p1: s.presidency[0], p2: s.presidency[1], p3: s.presidency[2], notify: s.notify === false ? 'Off' : 'On' };
    App.form('Settings', fields, vals, v => {
      Store.settings = { ...s, name: v.name, phone: v.phone, email: v.email, stakeName: v.stakeName, location: v.location,
        presidency: [v.p1, v.p2, v.p3].filter(Boolean), notify: v.notify === 'On' };
      App.toast('Settings saved');
      App.refresh();
    });
  }

  function exportData() {
    Store.settings = { ...Store.settings, lastExport: App.today() };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([Store.exportAll()], { type: 'application/json' }));
    a.download = `stake-secretary-hub-backup-${App.today()}.json`;
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
    App.toast('Backup downloaded');
    App.refresh();
  }

  function importData(file) {
    if (!file) return;
    if (!confirm('Importing replaces ALL current data with the backup. Continue?')) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { Store.importAll(JSON.parse(reader.result)); App.toast('Backup imported'); App.show('dashboard'); }
      catch (err) { alert('That file is not a valid backup: ' + err.message); }
    };
    reader.readAsText(file);
  }

  function clearData() {
    if (prompt('This permanently deletes everything stored in this browser.\nExport first if unsure.\nType DELETE to confirm.') !== 'DELETE') return;
    Store.clear();
    App.toast('All data cleared');
    App.show('dashboard');
  }

  function render(el) {
    const s = Store.settings;
    const perm = 'Notification' in window ? Notification.permission : 'not supported';
    el.innerHTML = `<div class="page-head"><h2>Settings</h2><button class="btn primary" data-act="edit">Edit settings</button></div>
      <div class="card"><p><strong>Name:</strong> ${esc(s.name)}</p>
        <p><strong>Phone:</strong> ${esc(s.phone || '')}</p><p><strong>Email:</strong> ${esc(s.email || '')}</p>
        <p><strong>Stake:</strong> ${esc(s.stakeName || '')}</p>
        <p><strong>Default location:</strong> ${esc(s.location)}</p>
        <p><strong>Stake Presidency:</strong> ${s.presidency.map(esc).join(', ')}</p>
        <p><strong>Reminder notifications:</strong> ${s.notify === false ? 'Off' : 'On'} (browser permission: ${perm}; allow it on the Meetings page)</p></div>
      <div class="card"><h3>Backup</h3>
        <p class="sub">Your data lives only in this browser. Export a copy regularly, especially before clearing browser data or changing computers.
        Last export: ${s.lastExport ? App.fmtDate(s.lastExport) : 'never'}.</p>
        <div class="actions"><button class="btn primary" data-act="export">Export data</button>
        <button class="btn" data-act="import">Import data</button>
        <button class="btn danger" data-act="clear">Clear all data</button>
        <input type="file" id="importFile" accept=".json,application/json" hidden></div></div>`;
    const file = document.getElementById('importFile');
    file.onchange = () => importData(file.files[0]);
    el.onclick = e => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'edit') edit();
      if (b.dataset.act === 'export') exportData();
      if (b.dataset.act === 'import') file.click();
      if (b.dataset.act === 'clear') clearData();
    };
  }

  App.register('settings', { label: 'Settings', render });
})();
