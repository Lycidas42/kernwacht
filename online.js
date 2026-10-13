// Kernwacht – Online-Dienste über Supabase: Anzeige "online", Profil, Highscores, Tageslauf,
// Cloud-Spielstand, Feedback und Umfragen.
// Bleibt komplett inaktiv, solange in config.js keine Zugangsdaten stehen.
//
// Identität: ein geheimer Spielercode im Browser. Die Datenbank kennt nur seinen Hash;
// geschrieben wird ausschließlich über die Funktionen kw_* (siehe supabase/migrations).
(function (root) {
  'use strict';
  const cfg = root.KW_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseKey);
  const LIB = 'vendor/supabase-js-2.117.2.js'; // offizielle Bibliothek, im Repo abgelegt (offline verfügbar)
  const CODE_KEY = 'kernwacht.code', ID_KEY = 'kernwacht.pubid';
  let client = null, channel = null, count = 0, me = { name: '', wave: 0 }, ready = null;
  const listeners = [];

  // ---------- Spielercode ----------
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newCode() {
    const b = new Uint8Array(25); (root.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => (b[i] = Math.random() * 256));
    let s = ''; for (let i = 0; i < 25; i++) { if (i && i % 5 === 0) s += '-'; s += ALPH[b[i] % 32]; }
    return s;
  }
  function getStored(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function setStored(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function code() { let c = getStored(CODE_KEY); if (!c) { c = newCode(); setStored(CODE_KEY, c); } return c; }
  const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{5})(?=.)/g, '$1-');
  const validCode = c => /^([A-Z0-9]{5}-){4}[A-Z0-9]{5}$/.test(normCode(c));

  function loadLib() {
    return new Promise((res, rej) => {
      if (root.supabase) return res();
      const s = document.createElement('script'); s.src = LIB; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  // Verbindung aufbauen (einmal), Präsenz starten, Spieler anmelden
  function start(name) {
    if (!configured) return Promise.resolve(false);
    if (ready) return ready;
    me.name = name || '';
    ready = (async () => {
      try {
        await loadLib();
        client = root.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
        channel = client.channel('kernwacht-lobby', { config: { presence: { key: getStored(ID_KEY) || code().slice(0, 5) } } });
        channel.on('presence', { event: 'sync' }, () => {
          count = Math.max(1, who().length); // wie die Liste zählen, man selbst ist immer dabei
          listeners.forEach(f => f(count));
        });
        channel.subscribe(status => { if (status === 'SUBSCRIBED') channel.track(Object.assign({}, me)); });
        const { data } = await client.rpc('kw_register', { code: code() });
        if (data) setStored(ID_KEY, data);
        return true;
      } catch (e) { client = null; ready = null; return false; }
    })();
    return ready;
  }
  async function rpc(fn, args) {
    if (!(await start())) throw new Error('offline');
    const { data, error } = await client.rpc(fn, Object.assign({ code: code() }, args || {}));
    if (error) throw new Error(error.message);
    return data;
  }
  let lastTrack = 0;
  // Präsenz: Name, aktuelle Welle (0 = im Menü) und Profilangaben für die Liste „Gerade online“
  let lastWave = -1;
  function setStatus(name, wave, extra) {
    me.name = name || me.name; me.wave = wave || 0; if (extra) Object.assign(me, extra); me.ts = Date.now();
    if (!channel) return;
    const n = Date.now(), switched = (me.wave > 0) !== (lastWave > 0);
    if (!switched && n - lastTrack < 15000) return; lastTrack = n; lastWave = me.wave;
    channel.track(Object.assign({}, me));
  }
  // Wer ist gerade online? Je Gerät ein Eintrag, nach Spieler-ID zusammengefasst
  function who() {
    if (!channel) return [];
    // Schlüssel der Präsenz ist die Spieler-ID; mehrere Einträge (Tabs, Geräte, alte Versionen) zu einem zusammenfassen:
    // höchste Welle gewinnt, Profilangaben kommen aus dem Eintrag, der sie hat
    const seen = new Map();
    for (const [key, arr] of Object.entries(channel.presenceState())) for (const p of arr) {
      const k = (p.pid || key) + '|' + (p.name || ''), o = seen.get(k); // gleiche ID, anderer Name (verbundene Geräte): getrennt zeigen
      if (!o) { seen.set(k, Object.assign({}, p)); continue; }
      // der zuletzt gemeldete Stand gilt (aktuelle Welle, nicht die höchste); alte Versionen ohne Zeitstempel zählen nachrangig
      const newer = (p.ts || 0) >= (o.ts || 0) ? p : o, older = newer === p ? o : p;
      seen.set(k, Object.assign({}, older, newer));
    }
    return [...seen.values()];
  }

  // ---------- Profil und Werte ----------
  const profile = (name, avatar, color) => rpc('kw_profile', { p_name: name || '', p_avatar: avatar | 0, p_color: color | 0 });
  // Neuere Felder (p_card, p_lvl) kennt der Server erst nach der jeweiligen Migration:
  // schlägt der Aufruf fehl, ohne das neueste Feld wiederholen
  const NEWER = ['p_frag', 'p_card', 'p_lvl'];
  let drop = 0;
  async function stats(s) {
    const a = { p_best: s.best | 0, p_best_ever: s.bestEver | 0, p_runs: s.runs | 0, p_kills: Math.floor(s.kills || 0), p_fusions: s.fusions | 0, p_chal: s.chal | 0, p_ach: s.ach | 0, p_lvl: s.lvl | 0, p_card: s.card || null, p_frag: Math.floor(s.frag || 0) };
    for (;;) {
      const b = Object.assign({}, a); NEWER.slice(0, drop).forEach(k => delete b[k]);
      try { return await rpc('kw_stats', b); }
      catch (e) { if (drop < NEWER.length && /function|schema|p_frag|p_card|p_lvl/i.test(e.message)) { drop++; continue; } throw e; }
    }
  }
  // Öffentliches Profil eines Spielers (nur lesbare Spalten)
  async function player(id) {
    if (!(await start())) return null;
    const q = f => client.from('players').select('id,name,avatar,color,best,best_ever,runs,kills,fusions,chal,ach,updated_at' + f).eq('id', id).maybeSingle();
    let { data, error } = await q(',lvl,card,frag');
    if (error) ({ data, error } = await q(',lvl,card'));
    if (error) ({ data, error } = await q(''));
    return error || !data ? null : Object.assign(data, { name: data.name || anon(data.id), anon: !data.name });
  }
  // Bindung: einmal je App-Start bzw. Laufende melden (Tag nach deutscher Zeit wird auf dem Server bestimmt)
  const seen = (runs, best) => rpc('kw_seen', { p_runs: runs | 0, p_best: best | 0 });
  const daily = (day, wave, kills) => rpc('kw_daily', { p_day: day, p_wave: wave | 0, p_kills: kills | 0 });

  // Highscores: Spalte der Spielertabelle; Spieler ohne Namen erscheinen anonym (Kurzkennung aus der ID)
  const anon = id => 'Anonym ' + String(id || '').replace(/-/g, '').slice(0, 4).toUpperCase();
  async function board(col, limit) {
    if (!(await start())) return null;
    const q = f => client.from('players').select('id,name,avatar,color,' + f + col).gt(col, 0).order(col, { ascending: false }).limit(limit || 25);
    let { data, error } = await q(col === 'lvl' ? '' : 'lvl,');
    if (error && col !== 'lvl') ({ data, error } = await q(''));
    return error ? null : data.map(r => Object.assign(r, { name: r.name || anon(r.id), anon: !r.name }));
  }
  // Eigener Platz in der Rekordliste: Anzahl der Spieler mit höherem Rekord + 1, dazu Gesamtzahl und der Spieler direkt davor
  async function place(rec) {
    if (!(await start())) return null;
    const [a, b, c] = await Promise.all([
      client.from('players').select('id', { count: 'exact', head: true }).gt('best_ever', rec | 0),
      client.from('players').select('id', { count: 'exact', head: true }).gt('best_ever', 0),
      client.from('players').select('id,name,best_ever').gt('best_ever', rec | 0).order('best_ever', { ascending: true }).limit(1),
    ]);
    if (a.error || b.error) return null;
    const ahead = !c.error && c.data && c.data[0] ? { name: c.data[0].name || anon(c.data[0].id), wave: c.data[0].best_ever } : null;
    return { place: rec > 0 ? (a.count || 0) + 1 : null, total: b.count || 0, ahead };
  }
  async function dailyBoard(day, limit) {
    if (!(await start())) return null;
    const q = f => client.from('daily_scores').select('player_id,wave,kills,players(name,avatar,color' + f + ')').eq('day', day).order('wave', { ascending: false }).order('kills', { ascending: false }).limit(60);
    let { data, error } = await q(',lvl');
    if (error) ({ data, error } = await q(''));
    if (error) return null;
    return data.filter(r => r.players).slice(0, limit || 25).map(r => ({ id: r.player_id, name: r.players.name || anon(r.player_id), anon: !r.players.name, avatar: r.players.avatar, color: r.players.color, lvl: r.players.lvl, wave: r.wave }));
  }

  // ---------- Cloud-Spielstand ----------
  const save = data => rpc('kw_save', { p_data: data });
  // Laden mit eigenem oder fremdem Code; adopt=true übernimmt den Code für dieses Gerät
  async function load(other) {
    const c = other ? normCode(other) : code();
    if (!(await start())) throw new Error('offline');
    const { data, error } = await client.rpc('kw_load', { code: c });
    if (error) throw new Error(error.message);
    return data;
  }
  function adopt(c) { setStored(CODE_KEY, normCode(c)); setStored(ID_KEY, null); }
  // ---------- Geräte koppeln mit Kurzcode ----------
  const pairCreate = () => rpc('kw_pair_create');
  // Gerät B: Kurzcode einlösen; B bekommt einen neuen Geräteschlüssel, der alte (leere) Spieler wird entfernt
  async function pairRedeem(short) {
    if (!(await start())) throw new Error('offline');
    const fresh = newCode();
    const { data, error } = await client.rpc('kw_pair_redeem', { new_code: fresh, old_code: code(), p_pair: short });
    if (error) throw new Error(error.message);
    if (!data || data.error) throw new Error((data && data.error) || 'Code ungültig oder abgelaufen.');
    adopt(fresh);
    return data;
  }

  // ---------- Feedback und Umfragen ----------
  const feedback = (kind, body, ctx) => rpc('kw_feedback', { p_kind: kind, p_body: body, p_ctx: ctx || {} });
  // Feedback-Gespräch: eigene Meldungen mit Verlauf, zurückschreiben, gelesen markieren, öffentliche Liste
  const myFeedback = () => rpc('kw_my_feedback');
  const feedbackReply = (id, body) => rpc('kw_feedback_reply', { p_id: id, p_body: body });
  const feedbackSeen = id => rpc('kw_feedback_seen', { p_id: id });
  async function publicFeedback() {
    if (!(await start())) return null;
    const { data, error } = await client.rpc('kw_public_feedback');
    return error ? null : (data || []).map(r => Object.assign(r, { name: r.name || anon(r.pid) }));
  }
  async function polls() {
    if (!(await start())) return null;
    const { data, error } = await client.from('polls').select('id,question,options,created_at').eq('active', true).order('created_at', { ascending: false });
    return error ? null : data;
  }
  const vote = (id, choice) => rpc('kw_vote', { p_poll: id, p_choice: choice });
  const pollResults = id => rpc('kw_poll_results', { p_poll: id });

  root.KWOnline = {
    configured, start, setStatus, code, newCode, normCode, validCode, adopt, myId: () => getStored(ID_KEY),
    profile, stats, seen, player, place, daily, board, dailyBoard, save, load, pairCreate, pairRedeem, feedback, myFeedback, feedbackReply, feedbackSeen, publicFeedback, polls, vote, pollResults,
    who, onCount: f => listeners.push(f), get count() { return count; },
  };
})(window);
