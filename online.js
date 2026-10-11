// Kernwacht – Online-Anzeige (Presence) und Bestenliste über Supabase
// Bleibt komplett inaktiv, solange in config.js keine Zugangsdaten stehen.
(function (root) {
  'use strict';
  const cfg = root.KW_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseKey);
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  let client = null, channel = null, count = 0, me = { name: '', wave: 0 };
  const listeners = [];

  function pid() {
    try {
      let id = localStorage.getItem('kernwacht.pid');
      if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })); localStorage.setItem('kernwacht.pid', id); }
      return id;
    } catch (e) { return 'anon-' + Math.random().toString(36).slice(2); }
  }
  function loadLib() {
    return new Promise((res, rej) => {
      if (root.supabase) return res();
      const s = document.createElement('script'); s.src = LIB; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  async function start(name) {
    if (!configured || client) return;
    me.name = name || '';
    try {
      await loadLib();
      client = root.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false } });
      channel = client.channel('kernwacht-lobby', { config: { presence: { key: pid() } } });
      channel.on('presence', { event: 'sync' }, () => {
        count = Object.keys(channel.presenceState()).length;
        listeners.forEach(f => f(count));
      });
      channel.subscribe(status => { if (status === 'SUBSCRIBED') channel.track({ name: me.name, wave: me.wave }); });
    } catch (e) { client = null; }
  }
  let lastTrack = 0;
  function setStatus(name, wave) {
    me.name = name || me.name; me.wave = wave || 0;
    if (!channel) return;
    const n = Date.now(); if (n - lastTrack < 15000) return; lastTrack = n;
    channel.track({ name: me.name, wave: me.wave });
  }
  async function submit(name, best, runs) {
    if (!client || !name) return false;
    const { error } = await client.from('scores').upsert({ player_id: pid(), name, best_wave: best, runs, updated_at: new Date().toISOString() });
    return !error;
  }
  async function top(limit) {
    if (!client) return null;
    const { data, error } = await client.from('scores').select('player_id,name,best_wave,runs').order('best_wave', { ascending: false }).limit(limit || 20);
    return error ? null : data;
  }
  root.KWOnline = { configured, start, setStatus, submit, top, pid, onCount: f => listeners.push(f), get count() { return count; } };
})(window);
