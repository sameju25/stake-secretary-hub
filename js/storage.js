/* storage.js – the only file that touches localStorage.
   Data model: one object holding a list per kind of record, plus settings. */
const Store = (() => {
  const KEY = 'stakeSecretaryHub.v1';

  const defaults = () => ({
    interviews: [], meetings: [], tasks: [], followUps: [],
    units: [], templates: [], minutes: [], callings: [],
    settings: { name: 'Sam', location: 'Stake Offices', presidency: ['President 1', 'President 2', 'President 3'] }
  });

  let data = defaults();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved) data = { ...defaults(), ...saved };
    } catch (err) { console.warn('Could not read saved data', err); }
  }
  const save = () => localStorage.setItem(KEY, JSON.stringify(data));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const list = kind => data[kind];
  // Insert when item has no id, otherwise merge into the existing record.
  function upsert(kind, item) {
    const i = item.id ? data[kind].findIndex(x => x.id === item.id) : -1;
    if (i >= 0) data[kind][i] = { ...data[kind][i], ...item };
    else data[kind].push({ ...item, id: uid() });
    save();
  }
  function remove(kind, id) { data[kind] = data[kind].filter(x => x.id !== id); save(); }

  // Backup helpers: everything is one JSON document.
  const exportAll = () => JSON.stringify({ app: 'stake-secretary-hub', version: 1, exported: new Date().toISOString(), data }, null, 2);
  function importAll(obj) {
    const d = obj && obj.data ? obj.data : obj;
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('unexpected format');
    const base = defaults();
    for (const k of Object.keys(base)) {
      if (k !== 'settings' && d[k] !== undefined && !Array.isArray(d[k])) throw new Error(`"${k}" should be a list`);
    }
    data = { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
    save();
  }
  function clear() { data = defaults(); localStorage.removeItem(KEY); }

  return {
    load, save, list, upsert, remove, exportAll, importAll, clear,
    get settings() { return data.settings; },
    set settings(v) { data.settings = v; save(); }
  };
})();
