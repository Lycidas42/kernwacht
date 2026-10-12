// Kernwacht – Spielsteuerung: Zustand, Bedienung, Speichern, Schleife
(function () {
  'use strict';
  const C = window.Core, A = window.KWAudio, O = window.KWOnline, R_ = window.KWRender, fmt = R_.fmt;
  const KEY = 'kernwacht.v1', RKEY = 'kernwacht.run.v2';
  // SHA-256 von "kernwacht:" + Passwort. Neues Passwort: siehe README, Abschnitt "Admin-Modus".
  const ADMIN_HASH = 'e157170b6268a0306b388f775d4cd2cae352e63f0ca05b40984b9028368f2758';
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // ---------- Speichern ----------
  function load(k) { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function put(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  let meta = load(KEY);
  if (!meta || meta.v !== 1) meta = C.newMeta();
  function normMeta() {
    meta.auto = meta.auto || {};
    if (meta.autoAll == null) meta.autoAll = true;
    if (meta.sfx == null) meta.sfx = true;
    if (meta.music == null) meta.music = true;
    if (meta.startPref === undefined) meta.startPref = null; // null = immer die höchste erlaubte Startwelle
    delete meta.startWave;
    meta.name = meta.name || '';
    meta.flv = meta.flv || {}; meta.frag = meta.frag || 0; meta.modules = meta.modules || {}; meta.equip = meta.equip || [];
    meta.bestEver = Math.max(meta.bestEver || 0, meta.best || 0);
  }
  normMeta();
  let run = null;
  let frozenSave = false; // beim Ersetzen des Spielstands: nichts mehr zurückschreiben
  function save() {
    if (frozenSave) return;
    meta.lastSeen = Date.now();
    if (!catching) meta.idleOk = !!(runAlive() && !paused && !current); // lief der Lauf gerade sichtbar weiter?
    put(KEY, meta);
    put(RKEY, run && !run.dead ? run.snapshot() : null);
  }
  window.__kwSave = save;

  const pct = x => Math.round(x * 100) + ' %';
  const dec = (x, d) => x.toFixed(d).replace('.', ',');

  // ---------- Zustand ----------
  let catching = false;
  let speed = 1, paused = false, tab = 'atk', armed = null, adminOk = false; // armed: 'strike' | 'freeze' | 'over'
  try { adminOk = sessionStorage.getItem('kw.admin') === '1'; } catch (e) {}
  const R = window.KWRender.create($('cv'));
  const OV = ['menu', 'over', 'lab', 'back', 'pause', 'board', 'admin', 'fusion', 'modules', 'chal', 'daily', 'profile', 'feedback', 'poll', 'hangar', 'mine'];
  let current = 'menu';
  function show(name) {
    current = name;
    for (const k of OV) $(k).hidden = k !== name;
    if (name === 'menu' || name === 'over') syncPollBanner();
    if (name === 'lab') renderLab();
    if (name === 'menu') renderMenu();
    if (name === 'board') renderBoard();
    if (name === 'admin') renderAdmin();
    if (name === 'pause') syncSoundBtns();
    if (name === 'fusion') renderFusion();
    if (name === 'modules') renderModules();
    if (name === 'chal') renderChal();
    if (name === 'daily') renderDaily();
    if (name === 'profile') renderProfile();
    if (name === 'feedback') renderFeedback();
    if (name === 'poll') renderPoll();
    if (name === 'hangar') renderHangar();
    if (name === 'mine') renderMine();
    syncMetaBtns();
  }
  const runAlive = () => run && !run.dead;
  function home() { show(runAlive() ? 'pause' : 'menu'); }
  function setPaused(p) { paused = p; $('pauseBtn').textContent = p ? '▶' : 'II'; }

  let lastMode = null, dayOverride = null;
  const today = () => dayOverride || C.dayKey();
  function startRun(mode) {
    mode = mode && mode.kind ? mode : null;
    if (mode && mode.kind === 'daily') mode = { kind: 'daily', day: today() };
    lastMode = mode;
    run = new C.Run(meta, { startWave: C.startWaveFor(meta), mode });
    A.nextRandom();
    R.clear(); armed = null; dpsHist.length = 0;
    setPaused(false); show(null); buildList(); save();
  }
  function endRun(early) {
    if (!run || run.finished) return;
    run.finished = true;
    const recBefore = C.record(meta);
    const res = run.finish();
    if (run.admin) meta.adminTainted = true;
    put(RKEY, null); save();
    if (!early) A.play('gameover');
    lastMode = run.mode;
    $('againBtn').textContent = res.mode ? (res.mode.kind === 'daily' ? 'Tageslauf nochmal' : 'Nochmal: ' + chalOf(res.mode.id).name) : 'Sofort neu starten';
    if (res.mode) { endMode(res, early, recBefore); return; }
    $('overTitle').textContent = early ? 'Lauf beendet' : 'Kanone gefallen';
    $('oWave').textContent = res.wave; $('oKills').textContent = fmt(res.kills); $('oK').textContent = '+' + fmt(res.crystals);
    $('oBest').textContent = res.newBest ? 'Neue Bestwelle!' : 'Bestwelle: ' + meta.best;
    $('oBest').style.color = res.newBest ? '' : 'var(--ink-dim)';
    renderJump();
    const ex = [];
    for (const m of res.milestones || []) ex.push(`<div class="ms">Meilenstein Welle ${m.w}: +${fmt(m.k)} Kristalle</div>`);
    for (const d of res.loot || []) {
      const M = C.MODULES[d.type], txt = { neu: 'neues Modul', besser: 'Seltenheit verbessert', kopie: 'stärker durch weiteren Fund' }[d.result];
      ex.push(`<div class="loot r${d.rar}">Beute: <b>${M.name}</b> (${C.RARITY[d.rar].name}) · ${txt}</div>`);
    }
    for (const u of C.ROADMAP) if (u.w > recBefore && u.w <= C.record(meta)) ex.unshift(`<div class="unl">Freigeschaltet: ${u.label}</div>`);
    // Beute-Übersicht: wie viele Mutterschiffe, warum ggf. keine Module
    if (res.noLoot === 'admin') ex.push('<div>Lauf mit Admin-Eingriffen: Mutterschiffe lassen keine Module fallen.</div>');
    else if (res.bossKills && !(res.loot || []).length) ex.push(`<div>${res.bossKills} Mutterschiff${res.bossKills === 1 ? '' : 'e'} besiegt, diesmal ohne Beute. Beim nächsten steigt die Chance um ${10 * (meta.dry || 0)} Prozentpunkte.</div>`);
    else if (!res.bossKills && C.record(meta) >= C.MODULES_AT && res.wave < 30) ex.push('<div>Module gibt es erst von Mutterschiffen ab Welle 30.</div>');
    if (catchNote) { ex.unshift(`<div>${catchNote}</div>`); catchNote = null; }
    ex.push(...skinNews()); syncNewBadges();
    $('oExtra').innerHTML = ex.join(''); $('oExtra').hidden = !ex.length;
    renderRoadmap();
    if ((res.loot || []).length) A.play('loot');
    submitScore(); cloudAuto();
    setTimeout(() => show('over'), early ? 0 : 900);
  }

  // Ergebnis eines Sonderlaufs
  function endMode(res, early) {
    const ex = [];
    $('oWave').textContent = res.wave; $('oKills').textContent = fmt(res.kills); $('oK').textContent = '+' + fmt(res.crystals);
    if (res.mode.kind === 'chal') {
      const c = chalOf(res.mode.id);
      $('overTitle').textContent = c.name + (early ? ' beendet' : ' gescheitert');
      if (res.newTier) { $('overTitle').textContent = c.name + ': Stufe ' + res.tier + '!'; }
      $('oBest').textContent = res.newTier ? `Stufe ${res.tier} geschafft. Bonus jetzt: ${chalBonusTxt(c, res.tier)}` : `Bester Versuch: Welle ${res.best}`;
      $('oBest').style.color = res.newTier ? '' : 'var(--ink-dim)';
      for (let t = res.tierBefore + 1; t <= res.tier; t++) ex.push(`<div class="unl">Stufe ${t} (Welle ${c.goals[t - 1]}): +${Math.round(c.step * 100)} % ${c.bname}, dauerhaft</div>`);
      const nx = c.goals[res.tier];
      ex.push(`<div>${nx ? `Nächste Stufe bei Welle ${nx}.` : 'Alle Stufen geschafft.'} Kristalle gibt es in Herausforderungen zur Hälfte.</div>`);
      if (res.newTier) A.play('loot');
    } else {
      $('overTitle').textContent = 'Tageslauf ' + (early ? 'beendet' : 'vorbei');
      $('oBest').textContent = res.newBest ? (res.prevBest ? `Neues Tagesbestes! Vorher Welle ${res.prevBest}.` : 'Dein erstes Ergebnis für heute.') : `Bestes heute: Welle ${res.best}`;
      $('oBest').style.color = res.newBest ? '' : 'var(--ink-dim)';
      if (res.bonus) ex.push(`<div class="unl">Tagesbonus: +${fmt(res.crystals)} Kristalle für deinen ersten Tageslauf</div>`);
      ex.push(`<div>Heute: ${twistOf(res.mode.day).name}. Morgen gibt es neue Wellen.</div>`);
      if (res.newBest) submitDaily();
    }
    if (catchNote) { ex.unshift(`<div>${catchNote}</div>`); catchNote = null; }
    ex.push(...skinNews()); syncNewBadges();
    $('oExtra').innerHTML = ex.join(''); $('oExtra').hidden = !ex.length;
    renderJump(); $$('#over .jumpbox').forEach(b => (b.hidden = true));
    submitScore(); cloudAuto();
    renderRoadmap();
    setTimeout(() => show('over'), early ? 0 : 900);
  }

  // ---------- Herausforderungen ----------
  const chalOf = id => C.CHALLENGES.find(c => c.id === id);
  const chalBonusTxt = (c, t) => '+' + Math.round(c.step * 100 * t) + ' % ' + c.bname;
  function renderChal() {
    const tot = C.CHALLENGES.map(c => ({ c, t: C.chalTier(meta, c.id) })).filter(x => x.t);
    $('chalBonus').innerHTML = tot.length ? 'Deine Boni: ' + tot.map(x => `<b>${chalBonusTxt(x.c, x.t)}</b>`).join(' · ') : 'Noch keine Boni. Die erste Stufe ist meist schnell geschafft.';
    const list = $('chalList'); list.innerHTML = '';
    for (const c of C.CHALLENGES) {
      const t = C.chalTier(meta, c.id), st = (meta.chal || {})[c.id], el = document.createElement('div');
      el.className = 'chal' + (t >= c.goals.length ? ' done' : '');
      el.innerHTML = `<div class="hd"><b>${c.name}</b><span>${st && st.best ? 'Bestes: Welle ' + st.best : 'noch nicht gespielt'}</span></div>
        <div class="rule">${c.rule}</div>
        <div class="tiers">${c.goals.map((g, i) => `<div class="tier${i < t ? ' ok' : ''}"><b>Welle ${g}</b>${i < t ? '✓ ' : ''}+${Math.round(c.step * 100)} % ${c.bname}</div>`).join('')}</div>
        <button class="go">${runAlive() ? 'Erst laufenden Lauf beenden' : t >= c.goals.length ? 'Nochmal spielen' : 'Starten'}</button>`;
      const b = el.querySelector('.go'); b.disabled = runAlive();
      b.addEventListener('click', () => { if (!runAlive()) startRun({ kind: 'chal', id: c.id }); });
      list.appendChild(el);
    }
  }
  $$('.chal-btn').forEach(b => b.addEventListener('click', () => show('chal')));
  $('chalClose').addEventListener('click', home);

  // ---------- Tageslauf ----------
  const twistOf = day => C.TWISTS.find(t => t.id === C.dailyOf(day).twist);
  const dailyToday = () => (meta.daily && meta.daily.day === today() ? meta.daily : null);
  function renderDaily() {
    const day = today(), tw = twistOf(day), d = dailyToday();
    $('dDay').textContent = day.split('-').reverse().join('.');
    $('dTwist').textContent = tw.name; $('dTwistTxt').textContent = tw.desc;
    $('dBest').textContent = d && d.best ? d.best : '–';
    $('dTries').textContent = d ? d.tries : 0;
    $('dBonus').textContent = d && d.bonus ? 'erhalten' : '+' + fmt(C.dailyBonus(meta));
    $('dNote').textContent = d && d.bonus ? 'Der Tagesbonus ist für heute abgeholt. Weitere Versuche zählen für die Bestenliste.' : 'Dein erster Tageslauf heute bringt den Tagesbonus, egal wie weit du kommst.';
    $('dStart').disabled = runAlive(); $('dStart').textContent = runAlive() ? 'Erst laufenden Lauf beenden' : 'Tageslauf starten';
    renderDailyBoard($('dStatus'), $('dBody'));
  }
  async function renderDailyBoard(st, body) {
    body.innerHTML = '';
    if (!O.configured) { st.textContent = 'Der Vergleich mit anderen startet, sobald der Online-Dienst verbunden ist. Bis dahin zählt dein eigenes Tagesbestes.'; return; }
    st.textContent = 'Wird geladen …';
    const data = await O.dailyBoard(today(), 25);
    if (!data) { st.textContent = 'Die Tagesliste ist gerade nicht erreichbar.'; return; }
    st.textContent = data.length ? (meta.name ? '' : 'Lege im Profil einen Namen fest, um hier zu erscheinen.') : 'Heute noch keine Einträge. Sei die oder der Erste.';
    body.innerHTML = boardRows(data, r => 'Welle ' + r.wave);
  }
  function submitDaily() {
    const d = dailyToday();
    if (!O.configured || meta.adminTainted || !d || !d.best) return;
    O.daily(d.day, d.best, d.kills || 0).catch(() => {});
  }
  $$('.daily-btn').forEach(b => b.addEventListener('click', () => show('daily')));
  $('dStart').addEventListener('click', () => { if (!runAlive()) startRun({ kind: 'daily' }); });
  $('dClose').addEventListener('click', home);

  // ---------- Offline / Rückkehr ----------
  const dur = ms => { const h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60e3) % 60; return h ? h + ' h ' + m + ' min' : Math.max(1, m) + ' min'; };
  // Labor-Ertrag für eine Abwesenheit (ms), höchstens 24 h
  function offlineCrystals(ms) {
    ms = Math.min(24 * 3600e3, ms);
    if (ms < 60e3) return null;
    const k = Math.floor(C.offlinePerHour(meta) * ms / 3600e3);
    meta.crystals += k;
    return { k, txt: dur(ms) };
  }
  // ---------- Nachrechnen: der Lauf läuft während der Abwesenheit weiter (Autopilot, max. 30 min) ----------
  const CATCH_MAX = 30 * 60e3, CATCH_MIN = 5e3, CATCH_QUICK = 120e3;
  let catchNote = null;
  function autopilot() {
    autoBuy();
    if (run.charge >= 1) {
      const alive = run.enemies.filter(e => e.hp > 0 && !run.cloaked(e));
      const t = alive.find(e => e.type === 'boss') || alive.sort((a, b) => a.dist - b.dist)[0];
      if (t) { const p = run.pos(t); run.strike(p.x, p.y); }
    }
    if (run.abilityReady('freeze') && run.hp < run.s.maxHp * 0.35 && run.enemies.length > 3) run.useAbility('freeze');
    if (run.abilityReady('over') && (run.bossAlive() || run.enemies.length > 12)) run.useAbility('over');
  }
  let toastT = 0;
  function toast(html) { const t = $('toast'); t.innerHTML = html; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 5000); }
  function catchUp(ms, extra) {
    const k = Math.max(1, Math.min(4, meta.speed || speed || 1)), total = ms / 1000 * k;
    const start = { wave: run.wave, crystals: run.crystals, buys: Object.values(run.lv).reduce((a, b) => a + b, 0), kills: run.kills };
    let done = 0, autoT = 0;
    // Kurze Abwesenheit: sofort nachrechnen, nur kurze Einblendung, Lauf läuft einfach weiter
    if (ms <= CATCH_QUICK) {
      catching = true;
      while (done < total && !run.dead) { run.update(0.1); done += 0.1; autoT += 0.1; if (autoT >= 0.5) { autoT = 0; autopilot(); } run.fx.length = 0; }
      catching = false; lastShots = run.shots; R.clear(); buildList();
      const sum = `Welle ${start.wave}${run.wave !== start.wave ? ' → ' + run.wave : ''} · ${fmt(run.kills - start.kills)} Abschüsse · +${fmt(Math.floor(run.crystals - start.crystals))} Kristalle`;
      if (run.dead) { catchNote = `Während deiner Abwesenheit (${Math.round(ms / 1000)} s) lief der Lauf weiter: ${sum}. Dann ist die Kanone gefallen.`; endRun(false); return; }
      toast(`<b>Nachgerechnet: ${Math.round(ms / 1000)} s</b>${k > 1 ? ` bei ${k}×` : ''}<br>${sum}`);
      save(); return;
    }
    catching = true; setPaused(true);
    $('backTxt').textContent = `Du warst ${dur(ms)} weg. Dein Lauf wird nachgerechnet …`;
    $('backK').hidden = true; $('resumeBtn').disabled = true; $('backBar').hidden = false;
    show('back');
    const step = () => {
      const t0 = performance.now();
      while (done < total && !run.dead && performance.now() - t0 < 30) {
        run.update(0.1); done += 0.1; autoT += 0.1;
        if (autoT >= 0.5) { autoT = 0; autopilot(); }
        run.fx.length = 0;
      }
      $('backBar').firstElementChild.style.width = Math.min(100, done / total * 100) + '%';
      if (done < total && !run.dead) { setTimeout(step, 0); return; }
      catching = false; $('backBar').hidden = true; $('resumeBtn').disabled = false;
      lastShots = run.shots; R.clear(); buildList();
      const buys = Object.values(run.lv).reduce((a, b) => a + b, 0) - start.buys;
      const sum = `Welle ${start.wave} → ${run.wave}, ${fmt(run.kills - start.kills)} Abschüsse, +${fmt(Math.floor(run.crystals - start.crystals))} Kristalle im Lauf${buys > 0 ? `, ${buys} Upgrades gekauft` : ''}.`;
      const lab = extra && extra.k > 0 ? ` Das Labor hat zusätzlich ${fmt(extra.k)} Kristalle für die übrige Zeit (${extra.txt}) gesammelt.` : '';
      if (run.dead) {
        catchNote = `Während deiner Abwesenheit lief der Lauf ${dur(done / k * 1000)} weiter: ${sum} Dann ist die Kanone gefallen.${lab}`;
        endRun(false); return;
      }
      $('backTxt').textContent = `Dein Lauf lief ${dur(ms)} mit Autopilot weiter${k > 1 ? ` (Tempo ${k}×)` : ''}.`;
      $('backK').hidden = false; $('backK').textContent = sum + lab;
      save();
    };
    setTimeout(step, 30);
  }
  function welcomeBack(fromLoad) {
    if (catching) return;
    const now = Date.now(), away = Math.max(0, now - (meta.lastSeen || now));
    meta.lastSeen = now;
    if (runAlive() && meta.catchup !== false && meta.idleOk && away >= CATCH_MIN) {
      const sim = Math.min(away, CATCH_MAX);
      catchUp(sim, offlineCrystals(away - sim));
      return;
    }
    const o = offlineCrystals(away);
    if (runAlive()) {
      if (!o && !fromLoad) return;
      setPaused(true);
      $('backTxt').textContent = 'Dein Lauf in Welle ' + run.wave + ' war pausiert und geht genau dort weiter, wo du aufgehört hast.';
      $('backK').hidden = !(o && o.k > 0);
      if (o && o.k > 0) $('backK').textContent = `Das Labor hat in ${o.txt} ${fmt(o.k)} Kristalle gesammelt.`;
      show('back'); save();
    } else if (o && o.k > 0) {
      $('offlineNote').textContent = `Während deiner Abwesenheit (${o.txt}) hat das Labor ${fmt(o.k)} Kristalle gesammelt.`;
      $('offlineNote').hidden = false;
      save(); if (current === 'menu') renderMenu();
    }
  }
  $('resumeBtn').addEventListener('click', () => { show(null); setPaused(false); buildList(); });

  // ---------- Upgrade-Liste ----------
  const VAL = {
    dmg: s => fmt(s.gunDmg), rate: s => dec(s.rate, 2) + '/s', range: s => Math.round(s.range),
    crit: s => pct(s.crit), critx: s => dec(s.critx, 1) + '×', multi: s => s.multi ? '+' + s.multi + ' × ' + Math.round(s.multiDmg * 100) + ' %' : '–',
    mine: s => s.mineCd ? fmt(s.mineDmg) : '–', hp: s => fmt(s.maxHp), regen: s => fmt(s.regen) + '/s', armor: s => pct(s.armor),
    knock: s => s.knock ? dec(s.knock, 1) : '–', shock: s => s.shockCd ? fmt(s.shockDmg) : '–',
    blade: s => s.blades ? s.blades + '× ' + fmt(s.bladeDmg) : '–', loot: s => '×' + dec(s.loot, 2),
    rocket: s => s.rocketCd ? fmt(s.rocketDmg) : '–', cryo: s => s.cryoCd ? '−' + Math.round(s.cryoSlow * 100) + ' %' : '–',
    interest: (s, r) => s.waveBonus ? '+' + fmt(r.waveBonusAmount()) + '/Welle' : '–', crys: s => '×' + dec(s.crysMult, 2),
  };
  let rows = [];
  function buildList() {
    const list = $('list'); list.innerHTML = ''; rows = [];
    if (tab === 'stats') { buildStats(); return; }
    for (const u of C.RUN_UPG.filter(u => u.tab === tab)) {
      const el = document.createElement('div'); el.className = 'row';
      el.innerHTML = `<div><div class="nm">${u.name}<small></small><span class="val"></span></div><div class="ds">${u.desc}</div></div>
        <button class="auto" aria-pressed="false" aria-label="Auto-Kauf ${u.name}">AUTO</button>
        <button class="buy num"></button>`;
      const [autoB, buyB] = el.querySelectorAll('button');
      autoB.addEventListener('click', () => { meta.auto[u.id] = !meta.auto[u.id]; A.play('click'); save(); refresh(); });
      buyB.addEventListener('click', () => { if (run && run.buy(u)) { A.play('buy'); refresh(); } });
      list.appendChild(el);
      rows.push({ u, el, lvl: el.querySelector('small'), val: el.querySelector('.val'), autoB, buyB });
    }
    refresh();
  }
  function refresh() {
    const aa = $('autoAll');
    aa.setAttribute('aria-pressed', meta.autoAll ? 'true' : 'false');
    aa.textContent = meta.autoAll ? 'AUTO AN' : 'AUTO AUS';
    if (!run) return;
    $('energyTotal').textContent = fmt(run.energy);
    if (tab === 'stats') { refreshStats(); return; }
    for (const r of rows) {
      const u = r.u, avail = run.available(u), mx = run.maxed(u);
      r.el.classList.toggle('locked', !avail);
      r.lvl.textContent = avail ? 'St. ' + run.L(u.id) : run.isBlocked(u) ? 'Handicap' : 'Labor';
      r.val.textContent = avail ? VAL[u.id](run.s, run) : '';
      r.autoB.setAttribute('aria-pressed', meta.auto[u.id] ? 'true' : 'false');
      r.autoB.classList.toggle('off', !meta.autoAll);
      r.autoB.disabled = !avail || mx;
      if (!avail) { r.buyB.disabled = true; r.buyB.textContent = 'gesperrt'; r.buyB.className = 'buy num'; }
      else if (mx) { r.buyB.disabled = true; r.buyB.textContent = 'MAX'; r.buyB.className = 'buy num max'; }
      else { const c = run.cost(u), ok = run.energy >= c; r.buyB.disabled = !ok; r.buyB.className = 'buy num e' + (ok ? ' ok' : ''); r.buyB.textContent = fmt(c); }
    }
  }
  $('autoAll').addEventListener('click', () => { meta.autoAll = !meta.autoAll; A.play('click'); save(); refresh(); });
  function autoBuy() {
    if (!meta.autoAll) return;
    for (let guard = 0; guard < 200; guard++) {
      const opts = C.RUN_UPG.filter(u => meta.auto[u.id] && run.canBuy(u)).sort((a, b) => run.cost(a) - run.cost(b));
      if (!opts.length) break;
      run.buy(opts[0]);
    }
  }

  // ---------- Werte-Tab: Schaden pro Quelle ----------
  // Gemessene DPS: gleitendes Fenster über die letzten 10 Sekunden Spielzeit
  const dpsHist = [];
  function sampleDps() {
    if (!runAlive()) return;
    dpsHist.push({ t: run.time, d: Object.assign({ taken: run.taken || 0, blocked: run.blocked || 0 }, run.dealt) });
    while (dpsHist.length > 2 && run.time - dpsHist[0].t > 10) dpsHist.shift();
  }
  function measured(k) {
    if (dpsHist.length < 2) return 0;
    const a = dpsHist[0], b = dpsHist[dpsHist.length - 1], dt = b.t - a.t;
    return dt > 0 ? (b.d[k] - a.d[k]) / dt : 0;
  }
  const SRC = [
    { k: 'gun', name: 'Kanone', hit: s => s.gunDmg, rate: (s, r) => dec(r.rateNow, 2) + '/s' + (s.multi ? ' ×' + (1 + s.multi) : ''), on: () => true },
    { k: 'rocket', name: 'Raketen', hit: s => s.rocketDmg, rate: s => 'alle ' + dec(s.rocketCd, 1) + ' s', on: s => s.rocketCd > 0 },
    { k: 'cryo', name: 'Kryowerfer', hit: s => s.cryoDmg, rate: s => 'alle ' + dec(s.cryoCd, 1) + ' s', on: s => s.cryoCd > 0 },
    { k: 'mine', name: 'Minen', hit: s => s.mineDmg, rate: s => 'alle ' + dec(s.mineCd, 1) + ' s', on: s => s.mineCd > 0 },
    { k: 'shock', name: 'Schockwelle', hit: s => s.shockDmg, rate: s => 'alle ' + dec(s.shockCd, 1) + ' s', on: s => s.shockCd > 0 },
    { k: 'blade', name: 'Orbitklingen', hit: s => s.bladeDmg, rate: s => s.blades + ' Klingen', on: s => s.blades > 0 },
    { k: 'strike', name: 'Orbitalschlag', hit: s => s.strikeDmg, rate: () => 'manuell', on: () => true },
    { k: 'mod', name: 'Module', hit: () => 0, rate: () => 'passiv', on: s => Object.keys(s.mod || {}).length > 0 },
  ];
  let statEls = null;
  function buildStats() {
    const list = $('list');
    list.innerHTML = `<table class="stbl"><thead><tr><th>Quelle</th><th>Treffer</th><th>Takt</th><th>DPS</th><th>Anteil</th></tr></thead><tbody id="stBody"></tbody></table><div class="kv" id="kv"></div><div class="stmods" id="stMods"></div>`;
    const body = $('stBody'); statEls = {};
    for (const src of SRC) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${src.name}</td><td class="h"></td><td class="r"></td><td class="dps"></td><td class="sh"></td>`;
      body.appendChild(tr);
      statEls[src.k] = { tr, h: tr.querySelector('.h'), r: tr.querySelector('.r'), dps: tr.querySelector('.dps'), sh: tr.querySelector('.sh') };
    }
    refreshStats();
  }
  function refreshStats() {
    if (!run || !statEls) return;
    const s = run.s;
    let total = 0; for (const k of C.SOURCES) total += run.dealt[k] || 0;
    let sum = 0;
    for (const src of SRC) {
      const el = statEls[src.k], on = src.on(s);
      const m = measured(src.k); sum += m;
      el.tr.classList.toggle('off', !on && !(run.dealt[src.k] > 0));
      el.h.textContent = on ? fmt(src.hit(s)) : '–';
      el.r.textContent = on ? src.rate(s, run) : 'gesperrt';
      el.dps.textContent = fmt(m);
      const share = total ? (run.dealt[src.k] || 0) / total : 0;
      el.sh.innerHTML = `<i class="share" style="width:${Math.round(share * 36)}px"></i>${Math.round(share * 100)} %`;
    }
    const kv = [
      ['Gesamt-DPS', fmt(sum)], ['Krit', pct(s.crit) + ' · ' + dec(s.critx, 1) + '×'], ['Reichweite', Math.round(s.range)],
      ['Strukturpunkte', fmt(s.maxHp)], ['Reparatur', fmt(s.regen) + '/s'], ['Panzerung', pct(s.armor)],
      ['Treffer erhalten', fmt(measured('taken')) + '/s'], ['Abgewehrt', fmt(measured('blocked')) + '/s'],
      ['Energie-Faktor', '×' + dec(s.loot, 2)], ['Wellenprämie', s.waveBonus ? '+' + fmt(run.waveBonusAmount()) : '–'], ['Kristalle (Lauf)', fmt(Math.floor(run.crystals))], ['Abschüsse', fmt(run.kills)],
    ];
    $('kv').innerHTML = kv.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    const eq = (meta.equip || []).filter(t => meta.modules[t]);
    $('stMods').innerHTML = eq.length
      ? '<h4>Ausgerüstete Module</h4>' + eq.map(t => { const m = meta.modules[t]; return `<div class="stmod r${m.rar}">${R_.iconSvg(t, m.rar, 20)}<div><b>${C.MODULES[t].name}</b> <span class="rar">${C.RARITY[m.rar].name}</span><br><span>${C.MODULES[t].desc(C.moduleValue(m))}</span></div></div>`; }).join('')
      : (C.record(meta) >= C.MODULES_AT ? '<h4>Module</h4><p>Keine Module ausgerüstet. Mutterschiffe lassen sie fallen.</p>' : `<h4>Module</h4><p>Ab Rekordwelle ${C.MODULES_AT} lassen Mutterschiffe Module fallen.</p>`);
  }

  // ---------- Fähigkeiten ----------
  const RING = 157.1;
  function setRing(btn, frac) { btn.querySelector('.ring').setAttribute('stroke-dashoffset', String(RING * (1 - Math.max(0, Math.min(1, frac))))); }
  function updateAbilities() {
    if (!run) return;
    const sb = $('ab-strike'), ch = run.charge;
    setRing(sb, ch);
    if (armed && !canArm(armed)) armed = null;
    sb.classList.toggle('ready', ch >= 1); sb.classList.toggle('armed', armed === 'strike');
    sb.querySelector('.st').textContent = armed === 'strike' ? 'Ziel' : ch >= 1 ? 'bereit' : Math.floor(ch * 100) + ' %';
    $('hint').hidden = !armed;
    if (armed) $('hint').textContent = HINT[armed];
    for (const id of ['freeze', 'over']) {
      const b = $('ab-' + id), un = run.abilityUnlocked(id);
      b.hidden = !un; if (!un) continue;
      const A_ = C.ABIL[id], l = run.abilityLv(id), cd = run.cd[id], max = A_.cd(l);
      const active = id === 'freeze' ? run.frozen : run.overActive;
      const left = id === 'freeze' ? run.freezeUntil - run.time : run.overUntil - run.time;
      setRing(b, active ? left / A_.dur(l) : 1 - cd / max);
      b.classList.toggle('ready', cd <= 0); b.classList.toggle('active', active); b.classList.toggle('armed', armed === id);
      b.querySelector('.st').textContent = active ? dec(left, 1) + ' s' : cd > 0 ? Math.ceil(cd) + ' s' : 'bereit';
    }
  }
  const HINT = { strike: 'Klick ins Feld: Orbitalschlag setzen', freeze: 'Klick ins Feld: Stasis auslösen', over: 'Klick ins Feld: Überladung auslösen' };
  function canArm(id) { return runAlive() && (id === 'strike' ? run.charge >= 1 : run.abilityReady(id)); }
  function fire(id, w) {
    if (!runAlive()) return false;
    if (id === 'strike') { if (!w || !run.strike(w.x, w.y)) return false; A.play('strike'); return true; }
    if (run.useAbility(id)) { A.play(id); return true; }
    return false;
  }
  // Knöpfe: Orbitalschlag braucht ein Ziel, Stasis und Überladung lösen sofort aus
  $('ab-strike').addEventListener('click', () => { if (!canArm('strike')) return; armed = armed === 'strike' ? null : 'strike'; A.play('click'); });
  $('ab-freeze').addEventListener('click', () => { armed = null; fire('freeze'); });
  $('ab-over').addEventListener('click', () => { armed = null; fire('over'); });
  // Tastatur: 1–5 laden eine Fähigkeit, ein Klick ins Feld löst sie aus. Esc bricht ab.
  const KEYS = { '1': 'strike', '2': 'freeze', '3': 'over' };
  window.addEventListener('keydown', ev => {
    if (ev.target && ev.target.tagName === 'INPUT') return;
    if (ev.key === 'Escape') { armed = null; return; }
    const id = KEYS[ev.key];
    if (!id || current || paused) return;
    if (!canArm(id)) { A.play('hurt'); return; }
    armed = armed === id ? null : id; A.play('click');
  });

  // ---------- Labor ----------
  // Wirkung eines Labor-Upgrades auf Stufe l (für "aktuell → nächste Stufe")
  const plus = (x, d) => '+' + dec(x, d || 0) + ' %';
  const LAB_FX = {
    m_dmg: l => '×' + dec(Math.pow(1.08, l), 2),
    m_hp: l => '×' + dec(Math.pow(1.08, l), 2),
    m_rate: l => plus(3 * l),
    m_regen: l => plus(10 * l),
    m_armor: l => plus(l),
    m_loot: l => plus(8 * l),
    m_start: l => fmt(C.startEnergy({ lv: { m_start: l } })) + ' Energie',
    m_cheap: l => '−' + dec((1 - Math.pow(0.98, l)) * 100, 0) + ' %',
    m_head: l => '+' + l + ' Stufen',
    m_crys: l => plus(10 * l),
    m_freeze: l => dec(C.ABIL.freeze.dur(l), 1) + ' s, alle ' + dec(C.ABIL.freeze.cd(l), 1) + ' s',
    m_over: l => dec(C.ABIL.over.mult(l), 2) + '× für ' + dec(C.ABIL.over.dur(l), 1) + ' s, alle ' + C.ABIL.over.cd(l) + ' s',
  };
  // Großansicht der Kanone im Labor: Vorschau-Lauf aus dem aktuellen Laborstand
  let labR = null, labRun = null;
  function renderCannonView() {
    if (!labR) labR = window.KWRender.create($('labCv'));
    labRun = runAlive() ? run : new C.Run(meta, { noFx: true });
    const V = labR.cannonLook(labRun), M = id => C.mlv(meta, id), F = id => C.flv(meta, id);
    const rows = [
      ['Läufe', 'Schaden', M('m_dmg')], ['Rumpf', 'Strukturpunkte', M('m_hp')], ['Kühlrippen', 'Feuerrate', M('m_rate')],
      ['Dioden', 'Reparatur', M('m_regen')], ['Panzerkuppel', 'Panzerung', M('m_armor')], ['Sammlerschüssel', 'Energie', M('m_loot')],
      ['Kristallantenne', 'Kristalle', M('m_crys')], ['Fusionsringe', 'Fusionskern', F('f_core')],
      ['Raketenwerfer', 'Fusion', F('f_rocket') ? 'aktiv' : 0], ['Kryowerfer', 'Fusion', F('f_cryo') ? 'aktiv' : 0],
    ];
    $('cvLegend').innerHTML = rows.map(([part, src, l]) => `<div class="${l ? '' : 'off'}" title="${src}"><span>${part}</span><b>${l ? (typeof l === 'number' ? 'St. ' + l : l) : '–'}</b></div>`).join('');
  }
  function renderLab() {
    $('labK').textContent = fmt(meta.crystals);
    renderCannonView();
    const list = $('labList'); list.innerHTML = '';
    renderJump();
    // Empfehlung: zeigt, was sich gerade am meisten lohnt, und warum
    const rec = C.recommend(meta), ch = C.cheapest(meta);
    if (rec) {
      const can = meta.crystals >= rec.cost;
      $('recTxt').innerHTML = `Empfehlung: <b>${rec.u.name}</b> (${fmt(rec.cost)} Kristalle). ${rec.why}${can ? '' : ` Spare noch ${fmt(rec.cost - meta.crystals)} Kristalle.`}`;
      $('recBuy').disabled = !can; $('recBuy').textContent = can ? 'Empfohlen kaufen' : 'Spare für ' + rec.u.name;
    } else { $('recTxt').textContent = 'Alles ausgebaut.'; $('recBuy').disabled = true; }
    $('cheapBuy').disabled = !ch || meta.crystals < ch.cost;
    $('cheapBuy').textContent = ch ? 'Günstigstes: ' + ch.u.name : 'Günstigstes kaufen';
    for (const u of C.META_UPG) {
      if (!C.gateOk(meta, u.id)) {
        if (u.req) continue;
        const el = document.createElement('div'); el.className = 'row locked'; el.style.gridTemplateColumns = '1fr auto';
        el.innerHTML = `<div><div class="nm">${u.name}<small>ab Rekordwelle ${C.GATES[u.id]}</small></div><div class="ds">${u.desc}</div></div><button class="buy num" disabled>gesperrt</button>`;
        list.appendChild(el); continue;
      }
      if (u.req && !C.mlv(meta, u.req)) continue;
      const l = C.mlv(meta, u.id), mx = u.max != null && l >= u.max, c = C.metaCost(u, l), ok = !mx && meta.crystals >= c;
      const el = document.createElement('div'); el.className = 'row' + (rec && rec.u === u ? ' recd' : '');
      el.style.gridTemplateColumns = '1fr auto';
      let extra = '';
      const fx = LAB_FX[u.id];
      if (fx) extra = ` <b style="color:var(--core)">${fx(l)}${mx ? '' : ' → ' + fx(l + 1)}</b>`;
      if (u.id === 'u_jump' || u.id === 'm_jump') {
        const now = C.mlv(meta, 'u_jump') ? C.maxStartWave(meta) : 1;
        const nextLvl = u.id === 'm_jump' && !mx ? C.mlv(meta, 'm_jump') + 1 : null;
        const nextMax = u.id === 'u_jump' && !mx ? (w => w % 10 === 0 ? w - 1 : w)(Math.max(1, Math.floor(meta.best * C.jumpShare(0)))) : nextLvl != null ? C.maxStartWave(meta, nextLvl) : null;
        extra = ` <b style="color:var(--core)">Start bis Welle ${now}${nextMax != null && nextMax !== now ? ' → ' + nextMax : ''}</b>`;
      }
      el.innerHTML = `<div><div class="nm">${u.name}<small>${u.unlock ? (mx ? 'frei' : 'Freischaltung') : 'St. ' + l + (u.max ? ' / ' + u.max : '')}</small>${rec && rec.u === u ? '<span class="tag">Empfohlen</span>' : ''}</div><div class="ds">${u.desc}${extra}</div></div>
        <button class="buy num ${mx ? 'max' : 'k-btn' + (ok ? ' ok' : '')}" ${ok ? '' : 'disabled'}>${mx ? (u.unlock ? 'OK' : 'MAX') : fmt(c)}</button>`;
      el.querySelector('button').addEventListener('click', () => { if (C.metaBuy(meta, u)) { A.play('buy'); if (runAlive()) { run.recalc(); buildList(); } save(); renderLab(); } });
      list.appendChild(el);
    }
    $('labStart').textContent = runAlive() ? 'Zurück zum Lauf' : 'Lauf starten';
  }

  function labBuy(pick) {
    const o = pick(meta); if (!o || !C.metaBuy(meta, o.u)) return;
    A.play('buy'); if (runAlive()) { run.recalc(); buildList(); } save(); renderLab();
  }
  $('recBuy').addEventListener('click', () => labBuy(C.recommend));
  $('cheapBuy').addEventListener('click', () => labBuy(C.cheapest));

  // ---------- Menü, Sprungtor ----------
  function renderMenu() {
    $('mBest').textContent = meta.best; $('mRuns').textContent = meta.runs; $('mK').textContent = fmt(meta.crystals);
    const max = C.maxStartWave(meta);
    renderJump();
    renderRoadmap();
    const fl = $('fragLine');
    fl.hidden = !(meta.fusions || meta.frag);
    if (!fl.hidden) fl.innerHTML = `Kernfragmente <b>${fmt(meta.frag)}</b> · Fusionen <b>${meta.fusions || 0}</b> · Rekord <b>${meta.bestEver || 0}</b>`;
    syncSoundBtns();
  }
  // Sprungtor-Wahl: im Startmenü, im Labor und nach dem Lauf
  function renderJump() {
    const on = C.mlv(meta, 'u_jump') > 0, max = C.maxStartWave(meta), S = C.startWaveFor(meta);
    let info;
    if (max <= 1) {
      const need = Math.ceil(6 / C.jumpShare(C.mlv(meta, 'm_jump')));
      info = `ab Bestwelle ${need} startest du bei Welle 6`;
    } else {
      const jb = C.jumpBonus(meta, S);
      info = S > 1 ? `${S === max ? 'höchste Startwelle · ' : ''}+${fmt(jb.energy)} Energie · +${fmt(jb.crystals)} Kristalle` : `normaler Start · möglich bis Welle ${max}`;
    }
    $$('.jumpbox').forEach(b => {
      b.hidden = !on;
      b.querySelector('.jv').textContent = 'Welle ' + S;
      b.querySelector('.ji').textContent = info;
      b.querySelector('.jm').disabled = S <= 1;
      b.querySelector('.jp').disabled = S >= max;
    });
  }
  $$('.jumpbox .jm').forEach(b => b.addEventListener('click', () => { meta.startPref = Math.max(1, C.startWaveFor(meta) - 5); A.play('click'); save(); renderJump(); }));
  $$('.jumpbox .jp').forEach(b => b.addEventListener('click', () => {
    const max = C.maxStartWave(meta), next = C.startWaveFor(meta) + 5;
    meta.startPref = next >= max ? null : next; A.play('click'); save(); renderJump();
  }));

  // Titel 5× antippen öffnet den Admin-Zugang
  // Gleiches gilt für die Überschrift im Pausenmenü
  let titleTaps = 0, titleT = 0;
  function adminTap() {
    const n = Date.now(); if (n - titleT > 1500) titleTaps = 0; titleT = n;
    if (++titleTaps >= 5) { titleTaps = 0; show('admin'); }
  }
  $('title').addEventListener('click', adminTap);
  $('pauseTitle').addEventListener('click', adminTap);

  // ---------- Nächste Freischaltung (Fortschritt sichtbar machen) ----------
  function renderRoadmap() {
    const nx = C.nextUnlock(meta), rec = C.record(meta);
    $$('.roadmap').forEach(el => {
      if (!nx) { el.hidden = true; return; }
      const prev = [...C.ROADMAP].reverse().find(x => x.w <= rec), from = prev ? prev.w : 0;
      const k = Math.max(0, Math.min(1, (rec - from) / (nx.w - from)));
      el.hidden = false;
      el.innerHTML = `<div class="rmhead"><span>Nächste Freischaltung</span><b>Welle ${nx.w}</b></div><div class="rmlabel">${nx.label}</div><div class="bar rmbar"><i style="width:${Math.round(k * 100)}%"></i></div><div class="rmsub">Rekord ${rec}</div>`;
    });
  }

  // ---------- Kernfusion ----------
  function syncMetaBtns() {
    const canFuse = C.fragmentsFor(meta) > 0;
    const showFus = C.record(meta) >= C.FUSION_AT || meta.fusions > 0;
    $$('.fus-btn').forEach(b => { b.hidden = !showFus; b.classList.toggle('ready', canFuse); });
    const showMod = C.record(meta) >= C.MODULES_AT || Object.keys(meta.modules || {}).length > 0;
    $$('.mod-btn').forEach(b => { b.hidden = !showMod; });
    const rec = C.record(meta), d = dailyToday();
    if (typeof syncMineBadge === 'function') try { syncMineBadge(); syncNewBadges(); } catch (e) {}
    $$('.chal-btn').forEach(b => { b.hidden = !(rec >= C.CHAL_AT || meta.chal && Object.keys(meta.chal).length); });
    $$('.daily-btn').forEach(b => { b.hidden = rec < C.DAILY_AT; b.classList.toggle('ready', !(d && d.bonus)); });
    // Leere Zweierreihen ausblenden
    $$('.daily-btn').forEach(b => { const row = b.parentElement; row.hidden = row.querySelectorAll('button:not([hidden])').length === 0; });
    $$('.mod-btn').forEach(b => { const row = b.parentElement; row.hidden = row.querySelectorAll('button:not([hidden])').length === 0; });
  }
  const F_FX = {
    f_core: l => '×' + dec(Math.pow(C.P.fCore, l), 2),
    f_crys: l => '+' + Math.round(C.P.fCrys * 100 * l) + ' %',
    f_frag: l => '+' + 20 * l + ' %',
    f_keep: l => 10 * l + ' %',
  };
  let fuseArmed = 0;
  function renderFusion() {
    const gain = C.fragmentsFor(meta);
    $('fusFrag').textContent = fmt(meta.frag || 0);
    $('fusBest').textContent = meta.best;
    $('fusGain').textContent = gain ? '+' + fmt(gain) : '–';
    $('fusStats').textContent = (meta.fusions || 0) + ' · ' + (meta.bestEver || 0);
    const btn = $('fuseBtn'), note = $('fusNote');
    btn.classList.remove('armed'); btn.textContent = 'Fusion auslösen'; fuseArmed = 0;
    if (runAlive()) { btn.disabled = true; note.textContent = 'Beende zuerst den laufenden Lauf.'; note.className = 'note err'; }
    else if (!gain) { btn.disabled = true; note.textContent = `Möglich ab Bestwelle ${C.FUSION_MIN}. Je weiter du kommst, desto mehr Fragmente.`; note.className = 'note'; note.style.color = 'var(--ink-dim)'; }
    else { btn.disabled = false; note.style.color = ''; note.className = 'note'; const fr = w => fmt(Math.floor(C.P.fragK * Math.pow(w / 10, C.P.fragExp) * (1 + 0.2 * C.flv(meta, 'f_frag'))));
      const w1 = Math.ceil((meta.best + 1) / 10) * 10, w2 = w1 + 20;
      note.textContent = `Weiterspielen lohnt sich auch: bei Bestwelle ${w1} gäbe es ${fr(w1)}, bei ${w2} schon ${fr(w2)} Fragmente.`; }
    const list = $('fusList'); list.innerHTML = '';
    for (const u of C.FUSION_UPG) {
      const l = C.flv(meta, u.id), mx = u.max != null && l >= u.max, c = C.fusionCost(u, l), ok = !mx && meta.frag >= c;
      const fx = F_FX[u.id], extra = fx ? ` <b style="color:var(--core)">${fx(l)}${mx ? '' : ' → ' + fx(l + 1)}</b>` : '';
      const el = document.createElement('div'); el.className = 'row'; el.style.gridTemplateColumns = '1fr auto';
      el.innerHTML = `<div><div class="nm">${u.name}<small>${u.unlock ? (mx ? 'aktiv' : 'Technik') : 'St. ' + l + (u.max ? ' / ' + u.max : '')}</small></div><div class="ds">${u.desc}${extra}</div></div>
        <button class="buy num ${mx ? 'max' : 'f-btn' + (ok ? ' ok' : '')}" ${ok ? '' : 'disabled'}>${mx ? 'OK' : fmt(c)}</button>`;
      el.querySelector('button').addEventListener('click', () => { if (C.fusionBuy(meta, u)) { A.play('buy'); if (runAlive()) { run.recalc(); buildList(); } save(); renderFusion(); } });
      list.appendChild(el);
    }
  }
  $('fuseBtn').addEventListener('click', () => {
    if (runAlive() || !C.fragmentsFor(meta)) return;
    const btn = $('fuseBtn');
    if (!fuseArmed) { fuseArmed = setTimeout(() => { fuseArmed = 0; btn.classList.remove('armed'); btn.textContent = 'Fusion auslösen'; }, 3500); btn.classList.add('armed'); btn.textContent = 'Wirklich? Labor wird zurückgesetzt'; return; }
    clearTimeout(fuseArmed); fuseArmed = 0;
    const gain = C.fuse(meta);
    run = null; put(RKEY, null); save(); A.play('fusion');
    renderFusion();
    $('fusNote').className = 'note'; $('fusNote').style.color = ''; $('fusNote').textContent = `Fusion abgeschlossen: +${fmt(gain)} Kernfragmente. Investiere sie unten und starte neu.`;
  });
  $$('.fus-btn').forEach(b => b.addEventListener('click', () => show('fusion')));
  $('fusClose').addEventListener('click', home);

  // ---------- Module ----------
  function renderModules() {
    const eq = meta.equip, mods = meta.modules;
    const slots = $('modSlots'); slots.innerHTML = '';
    for (let i = 0; i < C.MODULE_SLOTS; i++) {
      const t = eq[i], m = t && mods[t];
      const d = document.createElement('div');
      d.className = 'slot' + (m ? ' on r' + m.rar : '');
      d.innerHTML = m ? `${R_.iconSvg(t, m.rar, 26)}<b>${C.MODULES[t].name}</b>${C.RARITY[m.rar].name}` : 'freier Platz';
      slots.appendChild(d);
    }
    const bw = Math.max(30, Math.floor(Math.max(meta.best, 30) / 10) * 10);
    $('dropLine').innerHTML = `Beutechance je Mutterschiff ab Welle 30: <b>${Math.round(C.dropChance(30) * 100)} %</b> bei Welle 30 · <b>${Math.round(C.dropChance(bw) * 100)} %</b> bei Welle ${bw} · bis <b>85 %</b>. Das erste Mutterschiff ab Welle 30 bringt immer ein Modul. Jedes Mutterschiff ohne Beute erhöht die Chance beim nächsten um 10 Prozentpunkte${meta.dry ? ` (gerade <b>+${10 * meta.dry} %</b>)` : ''}. Läufe mit Admin-Eingriffen, Herausforderungen und Tagesläufe bringen keine Module.`;
    const list = $('modList'); list.innerHTML = '';
    for (const sec of C.SECTORS) {
      const types = Object.keys(C.MODULES).filter(t => C.MODULES[t].sector === sec.n);
      const h = document.createElement('div'); h.className = 'modsec'; h.textContent = `Sektor ${sec.n} · ${sec.name}`; list.appendChild(h);
      for (const t of types) {
        const M = C.MODULES[t], m = mods[t], on = eq.includes(t);
        const el = document.createElement('div');
        el.className = 'row modrow' + (m ? ' r' + m.rar : ' unknown') + (on ? ' eq' : '');
        el.style.gridTemplateColumns = '1fr auto';
        el.innerHTML = m
          ? `<div><div class="nm">${R_.iconSvg(t, m.rar, 20)}${M.name}<span class="rar">${C.RARITY[m.rar].name}</span><small>Fund ${m.copies}/10</small></div><div class="ds">${M.desc(C.moduleValue(m))}</div></div><span class="rar">${on ? 'AUSGERÜSTET' : ''}</span>`
          : `<div><div class="nm">${R_.iconSvg(t, null, 20)}Unbekanntes Modul</div><div class="ds">Fällt bei Mutterschiffen in Sektor ${sec.n} (Wellen ${sec.n * 50 - 49}–${sec.n * 50}${sec.n === 5 ? '+' : ''})</div></div><span></span>`;
        if (m) el.addEventListener('click', () => {
          if (on) meta.equip = eq.filter(x => x !== t);
          else if (eq.length < C.MODULE_SLOTS) meta.equip = eq.concat(t);
          else { el.animate && el.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 200 }); return; }
          A.play('click'); if (runAlive()) run.recalc(); save(); renderModules();
        });
        list.appendChild(el);
      }
    }
  }
  $$('.mod-btn').forEach(b => b.addEventListener('click', () => show('modules')));
  $('modClose').addEventListener('click', home);

  // ---------- Ton ----------
  function syncSoundBtns() {
    for (const id of ['sfxBtn', 'sfxBtn2']) { $(id).setAttribute('aria-pressed', meta.sfx ? 'true' : 'false'); $(id).textContent = meta.sfx ? 'Ton an' : 'Ton aus'; }
    for (const id of ['musicBtn', 'musicBtn2']) { $(id).setAttribute('aria-pressed', meta.music ? 'true' : 'false'); $(id).textContent = meta.music ? 'Musik an' : 'Musik aus'; }
  }
  function toggleSfx() { meta.sfx = !meta.sfx; A.init(); A.setSfx(meta.sfx); A.play('click'); syncSoundBtns(); save(); }
  function toggleMusic() { meta.music = !meta.music; A.init(); A.setMusic(meta.music); syncSoundBtns(); save(); }
  ['sfxBtn', 'sfxBtn2'].forEach(id => $(id).addEventListener('click', toggleSfx));
  ['musicBtn', 'musicBtn2'].forEach(id => $(id).addEventListener('click', toggleMusic));
  // Musikstück: Liste der Stile plus Zufall (wechselt bei jedem Laufstart)
  const TRACK_ORDER = A.tracks().map(x => x.id).concat('random');
  const trackName = id => id === 'random' ? 'Zufall (jeder Lauf neu)' : (A.tracks().find(x => x.id === id) || {}).name || id;
  function syncTrackBtns() { $$('.trackbtn').forEach(b => { b.textContent = 'Stück: ' + trackName(meta.track || 'synth'); }); }
  $$('.trackbtn').forEach(b => b.addEventListener('click', () => {
    const i = TRACK_ORDER.indexOf(meta.track || 'synth');
    meta.track = TRACK_ORDER[(i + 1) % TRACK_ORDER.length]; A.init(); A.setTrack(meta.track);
    if (!meta.music) { meta.music = true; A.setMusic(true); syncSoundBtns(); }
    syncTrackBtns(); save();
  }));
  A.setTrack(meta.track || 'synth'); syncTrackBtns();
  A.setSfx(meta.sfx); A.setMusic(meta.music);
  // Audio darf erst nach einer Berührung starten
  window.addEventListener('pointerdown', () => { A.init(); A.setSfx(meta.sfx); A.setMusic(meta.music); }, { once: true, capture: true });

  // ---------- Highscores / Online ----------
  const chalSum = () => C.CHALLENGES.reduce((a, c) => a + C.chalTier(meta, c.id), 0);
  function submitScore() {
    if (!O.configured || meta.adminTainted) return;
    O.stats({ best: meta.best, bestEver: C.record(meta), runs: meta.runs, kills: meta.kills, fusions: meta.fusions || 0, chal: chalSum() }).catch(() => {});
  }
  const BOARDS = {
    rec:   { col: 'best_ever', name: 'Rekord',            fmt: r => 'Welle ' + r.best_ever },
    day:   { name: 'Tageslauf' },
    kills: { col: 'kills',     name: 'Abschüsse',         fmt: r => fmt(r.kills) },
    fus:   { col: 'fusions',   name: 'Fusionen',          fmt: r => r.fusions + '×' },
    chal:  { col: 'chal',      name: 'Herausforderungen', fmt: r => r.chal + ' Stufen' },
  };
  function boardRows(data, val) {
    const me = O.myId();
    return data.map((r, i) => `<tr class="${r.id === me ? 'me' : ''}"><td>${i + 1}</td><td><span class="who">${avatarSvg(r.avatar, r.color, 22)}${esc(r.name)}</span></td><td>${val(r)}</td></tr>`).join('');
  }
  let lbTab = 'rec';
  $$('[data-lb]').forEach(b => b.addEventListener('click', () => { lbTab = b.dataset.lb; $$('[data-lb]').forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false')); A.play('click'); renderBoard(); }));
  async function renderBoard() {
    const st = $('lbStatus'), body = $('lbBody');
    body.innerHTML = '';
    $('lbMe').innerHTML = `${avatarSvg(meta.avatar, meta.color, 30)}<div><b>${esc(meta.name || 'Ohne Namen')}</b><small>Rekord ${C.record(meta)} · ${fmt(meta.kills)} Abschüsse</small></div>`;
    if (lbTab === 'day') { const d = dailyToday(); await renderDailyBoard(st, body); if (!O.configured && d && d.best) st.textContent += ` Dein Tagesbestes: Welle ${d.best}.`; return; }
    if (!O.configured) { st.textContent = 'Die Highscores sind noch nicht eingerichtet. Sie werden aktiv, sobald der Online-Dienst verbunden ist.'; return; }
    st.textContent = 'Wird geladen …';
    const B = BOARDS[lbTab], data = await O.board(B.col, 25);
    if (!data) { st.textContent = 'Die Highscores sind gerade nicht erreichbar.'; return; }
    st.textContent = meta.adminTainted ? 'Dieser Spielstand hat Admin-Eingriffe und wird nicht eingetragen.' : !meta.name ? 'Lege im Profil einen Namen fest, um in den Highscores zu erscheinen.' : data.length ? '' : 'Noch keine Einträge.';
    body.innerHTML = boardRows(data, B.fmt);
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  $('lbProfile').addEventListener('click', () => show('profile'));

  // ---------- Profil: Name und Profilbild ----------
  const AV_COLORS = ['#3ef0ff', '#ff4fa0', '#ffc04d', '#5dffb0', '#c3a6ff', '#ff8a3d', '#7da8ff', '#f4f1ff'];
  const AVATARS = [
    '<path d="M4 19h16l-2-5h-3l-1-6h-4l-1 6H6z"/><path d="M12 8V3"/>',
    '<path d="M12 3l8 17-8-4-8 4z"/>',
    '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
    '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><circle cx="12" cy="12" r="3"/>',
    '<path d="M12 2l6 7-6 13-6-13z"/><path d="M6 9h12"/>',
    '<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-20 12 12)"/>',
    '<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>',
    '<path d="M15 3a9 9 0 1 0 6 13A7 7 0 0 1 15 3z"/>',
    '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>',
    '<path d="M12 2c3 3 4 7 4 11l-4 4-4-4c0-4 1-8 4-11z"/><path d="M8 15l-3 4h4M16 15l3 4h-4"/><circle cx="12" cy="9" r="1.5"/>',
    '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9 3.5l3 2 3-2M9 20.5l3-2 3 2"/>',
    '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  ];
  function avatarSvg(a, c, size) {
    const col = AV_COLORS[(c | 0) % AV_COLORS.length];
    return `<svg class="av" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" style="--avc:${col}" aria-hidden="true">${AVATARS[(a | 0) % AVATARS.length]}</svg>`;
  }
  let pDraft = null;
  function renderProfile() {
    if (!pDraft) pDraft = { name: meta.name || '', avatar: meta.avatar | 0, color: meta.color | 0 };
    $('pPreview').innerHTML = avatarSvg(pDraft.avatar, pDraft.color, 64);
    $('pName').value = pDraft.name;
    $('pAvatars').innerHTML = AVATARS.map((_, i) => `<button class="avbtn" data-av="${i}" aria-pressed="${i === pDraft.avatar}">${avatarSvg(i, pDraft.color, 28)}</button>`).join('');
    $('pColors').innerHTML = AV_COLORS.map((c, i) => `<button class="colbtn" data-col="${i}" aria-pressed="${i === pDraft.color}" style="--c:${c}" aria-label="Farbe ${i + 1}"></button>`).join('');
    $$('#pAvatars [data-av]').forEach(b => b.addEventListener('click', () => { pDraft.avatar = +b.dataset.av; A.play('click'); renderProfile(); }));
    $$('#pColors [data-col]').forEach(b => b.addEventListener('click', () => { pDraft.color = +b.dataset.col; A.play('click'); renderProfile(); }));
    $('pStats').innerHTML = [['Rekord', C.record(meta)], ['Läufe', fmt(meta.runs)], ['Abschüsse', fmt(meta.kills)], ['Fusionen', meta.fusions || 0], ['Herausforderungs-Stufen', chalSum()], ['Kristalle gesamt', fmt(meta.totalCrystals || 0)]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    renderCloud();
  }
  $('pName').addEventListener('input', () => { pDraft.name = $('pName').value; });
  $('pSave').addEventListener('click', () => {
    meta.name = pDraft.name.trim().slice(0, 16); meta.avatar = pDraft.avatar; meta.color = pDraft.color; save(); A.play('buy');
    $('pNote').textContent = 'Profil gespeichert.'; $('pNote').className = 'note';
    if (O.configured) { O.setStatus(meta.name, run ? run.wave : 0); O.profile(meta.name, meta.avatar, meta.color).then(() => { submitScore(); submitDaily(); }).catch(() => { $('pNote').textContent = 'Lokal gespeichert. Online gerade nicht erreichbar, es wird später übertragen.'; }); }
  });
  $('pClose').addEventListener('click', () => { pDraft = null; home(); });
  $$('.prof-btn').forEach(b => b.addEventListener('click', () => { pDraft = null; show('profile'); }));

  // ---------- Spielstand: Cloud, Spielercode, Export/Import ----------
  const exportData = () => ({ v: 1, app: 'kernwacht', at: new Date().toISOString(), meta: JSON.parse(JSON.stringify(meta)) });
  function applyImport(o, how) {
    if (!o || o.v !== 1 || !o.meta || o.meta.v !== 1) throw new Error('Das ist kein gültiger Kernwacht-Spielstand.');
    frozenSave = true; run = null;
    o.meta.lastSeen = Date.now();
    put(KEY, o.meta); put(RKEY, null);
    try { sessionStorage.setItem('kw.imported', how); } catch (e) {}
    location.reload();
  }
  const stamp = t => t ? new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–';
  function cloudNote(txt, err) { $('cNote').textContent = txt; $('cNote').className = 'note' + (err ? ' err' : ''); }
  function renderCloud() {
    const on = O.configured;
    $('cloudBox').hidden = !on;
    if (on) {
      const c = O.code();
      $('cCode').textContent = $('cCode').dataset.show === '1' ? c : c.slice(0, 5) + '-•••••-•••••-•••••-•••••';
      $('cLast').textContent = meta.cloudAt ? 'Zuletzt gesichert: ' + stamp(meta.cloudAt) : 'Noch nicht in der Cloud gesichert.';
      $('cAuto').setAttribute('aria-pressed', meta.cloudAuto !== false ? 'true' : 'false');
      $('cAuto').textContent = meta.cloudAuto !== false ? 'Automatisch sichern: an' : 'Automatisch sichern: aus';
    }
  }
  let cloudBusy = false, cloudT = 0;
  async function cloudSave(silent) {
    if (!O.configured || cloudBusy) return false;
    cloudBusy = true;
    try {
      const at = await O.save(exportData());
      meta.cloudAt = at; save();
      if (!silent) { cloudNote('In der Cloud gesichert.'); A.play('buy'); }
      return true;
    } catch (e) { if (!silent) cloudNote('Sichern fehlgeschlagen: ' + e.message, true); return false; }
    finally { cloudBusy = false; if (current === 'profile') renderCloud(); }
  }
  // Automatisch nach jedem Lauf und beim Verlassen, höchstens alle 2 Minuten
  function cloudAuto() { if (!O.configured || meta.cloudAuto === false || Date.now() - cloudT < 120e3) return; cloudT = Date.now(); cloudSave(true); }
  let loadArmed = null;
  async function cloudLoad(other) {
    if (runAlive()) { cloudNote('Beende zuerst den laufenden Lauf.', true); return; }
    try {
      const r = await O.load(other);
      if (!r) { cloudNote(other ? 'Zu diesem Spielercode gibt es keinen Spieler.' : 'Zu deinem Code ist noch nichts gesichert.', true); return; }
      if (!r.data || !r.data.meta) { cloudNote('Zu diesem Code gibt es noch keinen gesicherten Spielstand.', true); return; }
      const m = r.data.meta, key = (other || '') + r.updated_at;
      if (loadArmed !== key) {
        loadArmed = key;
        cloudNote(`Cloud-Stand vom ${stamp(r.updated_at)}: ${r.name || 'ohne Namen'}, Rekord ${Math.max(m.bestEver || 0, m.best || 0)}, ${m.runs} Läufe. Hier auf dem Gerät: Rekord ${C.record(meta)}, ${meta.runs} Läufe. Zum Ersetzen nochmal tippen.`);
        return;
      }
      if (other) O.adopt(other);
      applyImport(r.data, 'cloud');
    } catch (e) { cloudNote('Laden fehlgeschlagen: ' + e.message, true); }
  }
  // Geräte koppeln: Kurzcode erzeugen (Gerät A) bzw. eingeben (Gerät B)
  let pairTimer = 0;
  function loadQr() { return new Promise((res, rej) => { if (window.qrcode) return res(); const sc = document.createElement('script'); sc.src = 'vendor/qrcode-generator-1.4.4.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); }); }
  const fmtPair = c => c.slice(0, 3) + '-' + c.slice(3);
  $('cPair').addEventListener('click', async () => {
    $('cPair').disabled = true; cloudNote('Spielstand wird gesichert und Code erzeugt …');
    try {
      await cloudSave(true);
      const r = await O.pairCreate();
      $('pairOut').hidden = false; $('pairCode').textContent = fmtPair(r.code);
      try {
        await loadQr();
        const q = window.qrcode(0, 'M'); q.addData(location.origin + location.pathname + '?koppeln=' + r.code); q.make();
        $('pairQr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); $('pairQr').hidden = false;
      } catch (e) { $('pairQr').hidden = true; }
      cloudNote('Gib den Code auf dem anderen Gerät ein oder scanne den QR-Code mit dessen Kamera.');
      const end = new Date(r.expires_at).getTime();
      clearInterval(pairTimer);
      const tick = () => {
        const left = Math.max(0, end - Date.now());
        $('pairLeft').textContent = left ? `noch ${Math.floor(left / 60e3)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')} min gültig` : 'abgelaufen';
        if (!left) { clearInterval(pairTimer); $('pairOut').hidden = true; cloudNote('Der Code ist abgelaufen. Erzeuge bei Bedarf einen neuen.'); }
      };
      tick(); pairTimer = setInterval(tick, 1000);
    } catch (e) { cloudNote('Code konnte nicht erzeugt werden: ' + e.message, true); }
    finally { $('cPair').disabled = false; }
  });
  let pairArmed = '';
  async function pairUse() {
    const v = $('cPairIn').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (v.length !== 6) { cloudNote('Der Code hat 6 Zeichen, z. B. K7M-4QX.', true); return; }
    if (runAlive()) { cloudNote('Beende zuerst den laufenden Lauf.', true); return; }
    if (pairArmed !== v) { pairArmed = v; cloudNote('Achtung: Der Spielstand auf diesem Gerät wird durch den des anderen Geräts ersetzt. Zum Verbinden nochmal tippen.'); $('cPairUse').textContent = 'Wirklich verbinden'; return; }
    $('cPairUse').disabled = true;
    try {
      const r = await O.pairRedeem(v);
      if (r && r.data && r.data.meta) applyImport(r.data, 'pair');
      else { cloudNote(`Verbunden mit ${r && r.name ? r.name : 'deinem Spieler'}. Es gab noch keinen Cloud-Spielstand, dein lokaler Stand bleibt.`); }
    } catch (e) { cloudNote(e.message, true); pairArmed = ''; $('cPairUse').textContent = 'Verbinden'; }
    finally { $('cPairUse').disabled = false; }
  }
  $('cPairUse').addEventListener('click', pairUse);
  $('cPairIn').addEventListener('input', () => { pairArmed = ''; $('cPairUse').textContent = 'Verbinden'; });
  // Link aus dem QR-Code: ?koppeln=CODE öffnet das Profil mit eingetragenem Code
  try {
    const pq = new URLSearchParams(location.search).get('koppeln');
    if (pq) { history.replaceState(null, '', location.pathname); setTimeout(() => { if (runAlive()) return; pDraft = null; show('profile'); $('cPairIn').value = fmtPair(pq.toUpperCase().slice(0, 6)); cloudNote('Code vom anderen Gerät übernommen. Tippe auf „Verbinden“.'); $('cPairIn').scrollIntoView({ block: 'center' }); }, 300); }
  } catch (e) {}
  $('cSave').addEventListener('click', () => cloudSave(false));
  $('cLoad').addEventListener('click', () => cloudLoad(null));
  $('cShow').addEventListener('click', () => { const el = $('cCode'); el.dataset.show = el.dataset.show === '1' ? '0' : '1'; $('cShow').textContent = el.dataset.show === '1' ? 'Verbergen' : 'Anzeigen'; renderCloud(); });
  $('cCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(O.code()); cloudNote('Spielercode kopiert. Bewahre ihn sicher auf, er ist dein Zugang zum Cloud-Spielstand.'); } catch (e) { $('cCode').dataset.show = '1'; renderCloud(); cloudNote('Kopieren nicht möglich, der Code wird jetzt angezeigt.'); } });
  $('cAuto').addEventListener('click', () => { meta.cloudAuto = meta.cloudAuto === false; save(); renderCloud(); A.play('click'); });
  $('cUse').addEventListener('click', () => {
    const v = $('cOther').value;
    if (!O.validCode(v)) { cloudNote('Der Spielercode hat 25 Zeichen in fünf Gruppen, z. B. ABCDE-FGHJK-…', true); return; }
    if (O.normCode(v) === O.code()) { cloudNote('Das ist bereits dein Code auf diesem Gerät.', true); return; }
    cloudLoad(v);
  });
  // Lokal: Code zum Kopieren und Datei
  function b64(str) { return btoa(String.fromCharCode(...new TextEncoder().encode(str))); }
  function unb64(str) { return new TextDecoder().decode(Uint8Array.from(atob(str), c => c.charCodeAt(0))); }
  $('xCopy').addEventListener('click', async () => {
    const txt = 'KW1.' + b64(JSON.stringify(exportData()));
    try { await navigator.clipboard.writeText(txt); $('xNote').textContent = 'Spielstand als Text kopiert. Einfügen und „Importieren“ auf dem anderen Gerät.'; }
    catch (e) { $('xText').value = txt; $('xText').select(); $('xNote').textContent = 'Kopieren nicht möglich. Der Text steht unten im Feld.'; }
    $('xNote').className = 'note';
  });
  $('xFile').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kernwacht-spielstand-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });
  let impArmed = 0;
  function tryImport(raw) {
    try {
      raw = String(raw || '').trim();
      const o = JSON.parse(raw.startsWith('KW1.') ? unb64(raw.slice(4)) : raw);
      if (!o || !o.meta) throw new Error('Das ist kein gültiger Kernwacht-Spielstand.');
      if (runAlive()) throw new Error('Beende zuerst den laufenden Lauf.');
      if (!impArmed) { impArmed = setTimeout(() => (impArmed = 0), 6000); $('xNote').className = 'note'; $('xNote').textContent = `Import: Rekord ${Math.max(o.meta.bestEver || 0, o.meta.best || 0)}, ${o.meta.runs} Läufe. Ersetzt den Spielstand auf diesem Gerät. Zum Bestätigen nochmal tippen.`; return; }
      clearTimeout(impArmed); impArmed = 0; applyImport(o, 'import');
    } catch (e) { $('xNote').className = 'note err'; $('xNote').textContent = e.message.startsWith('Unexpected') || e.name === 'InvalidCharacterError' ? 'Der Text ist kein gültiger Spielstand.' : e.message; }
  }
  $('xImport').addEventListener('click', () => tryImport($('xText').value));
  $('xPick').addEventListener('click', () => $('xFileIn').click());
  $('xFileIn').addEventListener('change', () => { const f = $('xFileIn').files[0]; if (!f) return; f.text().then(t => { $('xText').value = t; impArmed = 0; tryImport(t); }); $('xFileIn').value = ''; });

  // ---------- Hangar: Aussehen der Kanone ----------
  let hangR = null, hangRun = null;
  meta.skin = meta.skin || { color: 'cyan', turret: 'hex', base: 'bunker', deco: [] };
  if (!meta.skinSeen) meta.skinSeen = C.skinUnlocked(meta);
  const SK_CAT = { color: 'skColor', turret: 'skTurret', base: 'skBase', deco: 'skDeco' };
  function renderHangar() {
    if (!hangR) hangR = window.KWRender.create($('hangCv'));
    hangRun = new C.Run(meta, { noFx: true });
    for (const cat in SK_CAT) {
      $(SK_CAT[cat]).innerHTML = C.SKIN[cat].map(p => {
        const st = C.skinState(meta, p), on = cat === 'deco' ? meta.skin.deco.includes(p.id) : meta.skin[cat] === p.id;
        const sw = cat === 'color' ? `<span class="sw${p.col ? '' : ' plasma'}" style="--c:${p.col || '#fff'}"></span>` : '';
        return `<button class="sk${st.ok ? '' : ' locked'}" data-cat="${cat}" data-id="${p.id}" aria-pressed="${on}" ${st.ok ? '' : 'aria-disabled="true"'}>${sw}${p.name}${st.ok ? '' : `<small>🔒 ${st.txt}</small>${st.k != null ? `<span class="pr"><i style="width:${Math.round(st.k * 100)}%"></i></span>` : ''}`}</button>`;
      }).join('');
    }
    $$('#hangar .sk').forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('locked')) { $('skNote').textContent = 'Noch gesperrt: ' + b.querySelector('small').textContent.replace('🔒 ', ''); return; }
      const cat = b.dataset.cat, id = b.dataset.id;
      if (cat === 'deco') { const d = meta.skin.deco; meta.skin.deco = d.includes(id) ? d.filter(x => x !== id) : d.concat(id); }
      else meta.skin[cat] = id;
      $('skNote').textContent = ''; A.play('click'); save(); renderHangar();
    }));
    meta.skinSeen = C.skinUnlocked(meta); syncNewBadges();
  }
  function syncNewBadges() {
    const fresh = C.skinUnlocked(meta).filter(x => !(meta.skinSeen || []).includes(x));
    $$('.hang-btn').forEach(b => b.classList.toggle('new', fresh.length > 0));
  }
  // Nach einem Lauf: neu freigeschaltete Hangar-Teile melden
  function skinNews() {
    const told = meta.skinTold || meta.skinSeen || [], fresh = C.skinUnlocked(meta).filter(x => !told.includes(x));
    meta.skinTold = told.concat(fresh);
    return fresh.map(k => { const [cat, id] = k.split(':'); const p = C.SKIN[cat].find(x => x.id === id); return `<div class="unl">Neu im Hangar: ${p.name}</div>`; });
  }
  $$('.hang-btn').forEach(b => b.addEventListener('click', () => show('hangar')));
  $('hangClose').addEventListener('click', home);

  // ---------- Bergbau ----------
  const hm = ms => { const m = Math.round(ms / 60e3); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
  function mineNote(t, err) { $('mineNote').textContent = t; $('mineNote').className = 'note' + (err ? ' err' : ''); }
  function renderMine() {
    const M = C.mineTick(meta);
    $('mineK').textContent = fmt(meta.crystals);
    let any = false;
    $('planetList').innerHTML = C.PLANETS.map((P, i) => {
      const open = C.planetOpen(meta, P), pl = M.p[P.id] || { d: 0, s: 0, stock: 0 }, ore = M.ore[P.id] || 0;
      const style = `--pc:${P.col};--pc2:${P.col2};--ring:${i % 2 ? 1 : 0}`;
      if (!open) return `<div class="planet locked" style="${style}"><div class="orb"></div><div class="pinfo"><div class="hd"><b>${P.name}</b></div><div class="meta">${P.ore} · ab Rekordwelle ${P.at}</div></div></div>`;
      const cap = C.mineCap(pl), k = cap ? pl.stock / cap : 0, rate = C.mineRate(pl.d);
      if (pl.stock >= 1) any = true;
      const left = pl.d && k < 1 ? hm((cap - pl.stock) / rate * 3600e3) : null;
      const dc = C.drillCost(P, pl.d), sc = C.storeCost(P, pl.s || 0);
      return `<div class="planet" style="${style}">
        <div class="orb"><span class="drill ${pl.d ? 'on' : ''}">✱</span></div>
        <div class="pinfo">
          <div class="hd"><b>${P.name}</b><span>${P.ore}: ${fmt(ore)}</span></div>
          ${pl.d ? `<div class="meta">Bohrer St. <b>${pl.d}</b> · <b>${fmt(rate)}</b>/h · Lager <b>${fmt(Math.floor(pl.stock))}</b> / ${fmt(cap)} ${k >= 1 ? '· <b style="color:var(--hostile)">voll</b>' : `· voll in ${left}`}</div>
          <div class="stock ${k >= 1 ? 'full' : ''}"><i style="width:${Math.round(k * 100)}%"></i></div>` : `<div class="meta">Noch keine Förderung. Baue einen Bohrer, um ${P.ore} abzubauen.</div>`}
          <div class="pbtns">
            <button data-up="drill" data-p="${P.id}" ${pl.d >= C.DRILL_MAX || meta.crystals < dc ? 'disabled' : ''}>${pl.d ? (pl.d >= C.DRILL_MAX ? 'Bohrer MAX' : 'Bohrer +1') : 'Bohrer bauen'}${pl.d >= C.DRILL_MAX ? '' : `<b>${fmt(dc)}</b>`}</button>
            <button data-up="store" data-p="${P.id}" ${!pl.d || (pl.s || 0) >= C.STORE_MAX || meta.crystals < sc ? 'disabled' : ''}>Lager ${fmt(C.mineCapH(pl.s || 0))} h → ${fmt(C.mineCapH((pl.s || 0) + 1))} h${(pl.s || 0) >= C.STORE_MAX ? '' : `<b>${fmt(sc)}</b>`}</button>
            <button data-col="${P.id}" ${pl.stock >= 1 ? '' : 'disabled'}>Einsammeln<b>+${fmt(Math.floor(pl.stock))}</b></button>
          </div>
        </div></div>`;
    }).join('');
    $('mineAll').disabled = !any;
    // Raffinerie
    const owned = C.PLANETS.filter(P => (M.ore[P.id] || 0) > 0);
    $('refinery').innerHTML = owned.length ? owned.map(P => {
      const n = M.ore[P.id], pr = C.orePrice(meta, P);
      return `<div class="rrow" style="--pc:${P.col}"><div>${P.ore}: <b class="num">${fmt(n)}</b><small>${pr < 10 ? pr.toFixed(1).replace('.', ',') : fmt(pr)} Kristalle je Erz</small></div><button data-sell="${P.id}" data-f="0.5">Hälfte<br>+${fmt(Math.floor(Math.floor(n / 2) * pr))}</button><button data-sell="${P.id}" data-f="1">Alles<br>+${fmt(Math.floor(n * pr))}</button></div>`;
    }).join('') : '<p class="dim" style="font-size:.8rem">Noch kein Erz im Lager. Sammle zuerst bei einem Planeten ein.</p>';
    // Werkstatt
    const rows = [];
    for (const P of C.PLANETS) {
      if (!C.planetOpen(meta, P)) continue;
      const ore = M.ore[P.id] || 0;
      rows.push(`<div class="rrow" style="--pc:${P.col}"><div>Neues Modul aus Sektor ${P.sector}<small>zufälliger Typ, ${C.MOD_CRAFT} ${P.ore}</small></div><span></span><button data-craft="${P.sector}" ${ore >= C.MOD_CRAFT ? '' : 'disabled'}>Herstellen</button></div>`);
      for (const t in (meta.modules || {})) {
        const mod = meta.modules[t]; if (C.MODULES[t].sector !== P.sector) continue;
        const cc = C.modBoostCost(mod), rc = C.modRarCost(mod);
        rows.push(`<div class="rrow r${mod.rar}" style="--pc:var(--rc)"><div>${R_.iconSvg(t, mod.rar, 16)} ${C.MODULES[t].name}<small>${C.RARITY[mod.rar].name} · Fund ${mod.copies}/10</small></div>
          <button data-imp="${t}" data-w="copy" ${mod.copies >= 10 || ore < cc ? 'disabled' : ''}>${mod.copies >= 10 ? 'Fund MAX' : `+1 Fund<br>${fmt(cc)} Erz`}</button>
          <button data-imp="${t}" data-w="rar" ${mod.rar >= 3 || ore < rc ? 'disabled' : ''}>${mod.rar >= 3 ? 'legendär' : `Seltener<br>${fmt(rc)} Erz`}</button></div>`);
      }
    }
    $('workshop').innerHTML = rows.join('') || '<p class="dim" style="font-size:.8rem">Ab Rekordwelle 25.</p>';
    // Bedienung
    $$('#planetList [data-up]').forEach(b => b.addEventListener('click', () => { if (C.mineUpgrade(meta, b.dataset.p, b.dataset.up)) { A.play('buy'); save(); renderMine(); } }));
    $$('#planetList [data-col]').forEach(b => b.addEventListener('click', () => { const n = C.mineCollect(meta, b.dataset.col); if (n) { A.play('loot'); mineNote(`+${fmt(n)} Erz eingesammelt.`); save(); renderMine(); } }));
    $$('#refinery [data-sell]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.sell, k = C.mineSell(meta, id, (C.mineState(meta).ore[id] || 0) * +b.dataset.f); if (k) { A.play('buy'); mineNote(`+${fmt(k)} Kristalle aus der Raffinerie.`); save(); renderMine(); } }));
    $$('#workshop [data-craft]').forEach(b => b.addEventListener('click', () => { const d = C.modCraft(meta, +b.dataset.craft); if (d) { A.play('loot'); mineNote(`Hergestellt: ${C.MODULES[d.type].name} (${C.RARITY[d.rar].name}) · ${{ neu: 'neues Modul', besser: 'Seltenheit verbessert', kopie: 'stärker durch weiteren Fund' }[d.result]}`); if (runAlive()) run.recalc(); save(); renderMine(); } }));
    $$('#workshop [data-imp]').forEach(b => b.addEventListener('click', () => { if (C.modImprove(meta, b.dataset.imp, b.dataset.w)) { A.play('loot'); mineNote(`${C.MODULES[b.dataset.imp].name} verbessert.`); if (runAlive()) run.recalc(); save(); renderMine(); } }));
    syncMineBadge();
  }
  $('mineAll').addEventListener('click', () => { const n = C.mineCollect(meta); if (n) { A.play('loot'); mineNote(`+${fmt(n)} Erz eingesammelt.`); save(); renderMine(); } });
  function syncMineBadge() {
    const M = C.mineTick(meta), full = C.PLANETS.some(P => { const pl = M.p[P.id]; return pl && pl.d && pl.stock >= C.mineCap(pl) * 0.9; });
    const show_ = C.record(meta) >= C.MINE_AT || Object.keys(M.p).length > 0;
    $$('.mine-btn').forEach(b => { b.hidden = !show_; b.classList.toggle('new', full); });
    $$('.hang-btn').forEach(b => { const row = b.parentElement; row.hidden = row.querySelectorAll('button:not([hidden])').length === 0; });
  }
  $$('.mine-btn').forEach(b => b.addEventListener('click', () => show('mine')));
  $('mineClose').addEventListener('click', home);

  // ---------- Feedback ----------
  let fbKind = 'bug';
  $$('[data-fb]').forEach(b => b.addEventListener('click', () => { fbKind = b.dataset.fb; $$('[data-fb]').forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false')); A.play('click'); }));
  function renderFeedback() { $('fbNote').textContent = O.configured ? '' : 'Feedback braucht den Online-Dienst, der ist gerade nicht eingerichtet.'; $('fbSend').disabled = !O.configured; }
  $('fbSend').addEventListener('click', async () => {
    const body = $('fbText').value.trim();
    if (body.length < 3) { $('fbNote').className = 'note err'; $('fbNote').textContent = 'Schreib bitte ein paar Worte dazu.'; return; }
    $('fbSend').disabled = true;
    const ctx = { version: C.VERSION, wave: run ? run.wave : 0, mode: run && run.mode ? run.mode.kind : null, best: meta.best, record: C.record(meta), fusions: meta.fusions || 0, screen: innerWidth + '×' + innerHeight, ua: navigator.userAgent.slice(0, 160), name: meta.name || '' };
    try { await O.feedback(fbKind, body, ctx); $('fbText').value = ''; $('fbNote').className = 'note'; $('fbNote').textContent = 'Danke! Dein Feedback ist angekommen.'; A.play('buy'); }
    catch (e) { $('fbNote').className = 'note err'; $('fbNote').textContent = 'Senden fehlgeschlagen: ' + e.message; }
    finally { $('fbSend').disabled = false; }
  });
  $$('.fb-btn').forEach(b => b.addEventListener('click', () => show('feedback')));
  $('fbClose').addEventListener('click', home);

  // ---------- Umfragen ----------
  let polls = [], pollCur = null;
  meta.votes = meta.votes || {};
  async function fetchPolls() {
    if (!O.configured) return;
    const p = await O.polls(); if (!p) return;
    polls = p; syncPollBanner();
  }
  function syncPollBanner() {
    const open = polls.filter(p => meta.votes[p.id] == null);
    $$('.pollbanner').forEach(el => {
      el.hidden = !polls.length;
      if (!polls.length) return;
      const p = open[0] || polls[0];
      el.innerHTML = `<span>${open.length ? 'Neue Umfrage' : 'Umfrage'}</span><b>${esc(p.question)}</b><small>${open.length ? 'Tippen zum Abstimmen' : 'Ergebnis ansehen'}</small>`;
      el.onclick = () => { pollCur = p; show('poll'); };
    });
  }
  async function renderPoll() {
    const p = pollCur; if (!p) return;
    $('pqText').textContent = p.question;
    const mine = meta.votes[p.id];
    let res = null; try { res = await O.pollResults(p.id); } catch (e) {}
    const counts = (res && res.counts) || {}, total = Object.values(counts).reduce((a, b) => a + b, 0);
    const voted = (res && res.mine != null) ? res.mine : mine;
    if (voted != null && mine == null) { meta.votes[p.id] = voted; save(); }
    $('pqOpts').innerHTML = p.options.map((o, i) => {
      const n = counts[i] || 0, k = total ? Math.round(n / total * 100) : 0;
      return `<button class="pqopt${voted === i ? ' mine' : ''}" data-i="${i}">${voted != null ? `<i style="width:${k}%"></i>` : ''}<span>${esc(o)}</span>${voted != null ? `<b>${k} %</b>` : ''}</button>`;
    }).join('');
    $('pqNote').textContent = voted != null ? `${total} Stimme${total === 1 ? '' : 'n'} bisher. Du kannst deine Antwort noch ändern.` : 'Tippe auf eine Antwort.';
    $$('#pqOpts .pqopt').forEach(b => b.addEventListener('click', async () => {
      try { await O.vote(p.id, +b.dataset.i); meta.votes[p.id] = +b.dataset.i; save(); A.play('buy'); syncPollBanner(); renderPoll(); }
      catch (e) { $('pqNote').textContent = 'Abstimmen fehlgeschlagen: ' + e.message; }
    }));
  }
  $('pqClose').addEventListener('click', home);

  if (O.configured) {
    O.start(meta.name).then(ok => { if (ok) { submitScore(); fetchPolls(); } });
    O.onCount(n => { $('onlinePill').hidden = false; $('onlinePill').textContent = n + ' online'; });
    setInterval(fetchPolls, 5 * 60e3);
  }
  try { const how = sessionStorage.getItem('kw.imported'); if (how) { sessionStorage.removeItem('kw.imported'); setTimeout(() => { $('offlineNote').hidden = false; $('offlineNote').textContent = how === 'pair' ? 'Gerät verbunden: Spielstand vom anderen Gerät übernommen.' : how === 'cloud' ? 'Spielstand aus der Cloud geladen.' : 'Spielstand importiert.'; }, 50); } } catch (e) {}

  // ---------- Admin ----------
  async function sha(text) {
    if (!(window.crypto && crypto.subtle)) return '';
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function renderAdmin() {
    $('admLogin').hidden = adminOk; $('admPanel').hidden = !adminOk; $('admErr').hidden = true;
    $('admExit').hidden = !adminOk;
    $('admUntaint').hidden = !meta.adminTainted;
    $('admTaint').textContent = meta.adminTainted ? 'Dieser Spielstand ist als „mit Admin-Eingriffen“ markiert und erscheint deshalb nicht in den Highscores.' : 'Der Spielstand ist sauber und zählt für die Highscores.';
    $('adminPill').hidden = !adminOk;
    $('admBtn').hidden = !adminOk;
    const g = document.querySelector('[data-adm="god"]'); if (g) g.setAttribute('aria-pressed', run && run.god ? 'true' : 'false');
  }
  $('admForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const h = await sha('kernwacht:' + $('admPw').value);
    if (h === ADMIN_HASH) { adminOk = true; try { sessionStorage.setItem('kw.admin', '1'); } catch (e) {} $('admPw').value = ''; renderAdmin(); }
    else $('admErr').hidden = false;
  });
  const ADM = {
    k1k: () => { meta.crystals += 1e3; meta.adminTainted = true; },
    k1m: () => { meta.crystals += 1e6; meta.adminTainted = true; },
    labmax: () => { for (const u of C.META_UPG) meta.lv[u.id] = u.max != null ? u.max : Math.max(C.mlv(meta, u.id), 40); meta.adminTainted = true; if (runAlive()) run.recalc(); },
    labreset: () => { meta.lv = {}; if (runAlive()) run.recalc(); },
    frag: () => { meta.frag = (meta.frag || 0) + 100; meta.adminTainted = true; },
    fusmax: () => { meta.flv = meta.flv || {}; for (const u of C.FUSION_UPG) meta.flv[u.id] = u.max != null ? u.max : Math.max(C.flv(meta, u.id), 15); meta.adminTainted = true; if (runAlive()) { run.recalc(); buildList(); } },
    fusreset: () => { meta.flv = {}; meta.frag = 0; meta.fusions = 0; if (runAlive()) { run.recalc(); buildList(); } },
    modall: () => { meta.modules = {}; for (const t in C.MODULES) meta.modules[t] = { type: t, rar: 3, copies: 10 }; meta.adminTainted = true; if (runAlive()) run.recalc(); },
    modreset: () => { meta.modules = {}; meta.equip = []; if (runAlive()) run.recalc(); },
    sector: () => { if (runAlive()) { run.jumpTo((Math.floor((run.wave - 1) / 50) + 1) * 50 + 1); run.admin = true; } },
    rec100: () => { meta.bestEver = Math.max(meta.bestEver || 0, 100); meta.best = Math.max(meta.best, 100); meta.adminTainted = true; },
    rec0: () => { meta.bestEver = 0; meta.best = 0; },
    mineore: () => { const M = C.mineState(meta); for (const P of C.PLANETS) if (C.planetOpen(meta, P)) M.ore[P.id] = (M.ore[P.id] || 0) + 1000; meta.adminTainted = true; },
    minefill: () => { const M = C.mineState(meta); for (const id in M.p) { const pl = M.p[id]; if (pl.d) { pl.stock = C.mineCap(pl); pl.t = Date.now(); } } },
    chalall: () => { meta.chal = {}; for (const c of C.CHALLENGES) meta.chal[c.id] = { best: c.goals[c.goals.length - 1], tier: c.goals.length }; meta.adminTainted = true; if (runAlive()) run.recalc(); },
    chalreset: () => { meta.chal = {}; if (runAlive()) run.recalc(); },
    dailyreset: () => { meta.daily = null; },
    dailytom: () => { const t = new Date(Date.now() + 864e5); dayOverride = dayOverride ? null : C.dayKey(t); },
    loot: () => { const d = C.rollModule(Math.max(10, meta.best || 10) + Math.floor(Math.random() * 250)); C.addModule(meta, d); meta.adminTainted = true; if (runAlive()) run.recalc(); },
    best50: () => { meta.best = 50; meta.adminTainted = true; },
    best0: () => { meta.best = 0; },
    e1m: () => { if (runAlive()) { run.energy += 1e6; run.admin = true; } },
    runmax: () => { if (!runAlive()) return; for (const u of C.RUN_UPG) if (run.available(u)) run.lv[u.id] = u.max != null ? Math.max(0, u.max - (run.free[u.id] || 0)) : run.lv[u.id] + 10; run.recalc(); run.hp = run.s.maxHp; run.admin = true; },
    wave10: () => { if (runAlive()) { run.jumpTo(run.wave + 10); run.admin = true; } },
    boss: () => { if (runAlive()) { run.jumpTo(Math.ceil((run.wave + 1) / 10) * 10); run.admin = true; } },
    charge: () => { if (runAlive()) { run.charge = 1; run.cd.freeze = 0; run.cd.over = 0; } },
    god: () => { if (runAlive()) { run.god = !run.god; run.admin = true; } },
    speed16: () => { speed = 16; $$('#ctrl [data-speed]').forEach(x => x.setAttribute('aria-pressed', 'false')); },
    kill: () => { if (runAlive()) { for (const e of run.enemies) run.hurt(e, e.hp + 1, false, 'gun'); run.admin = true; } },
  };
  $$('[data-adm]').forEach(b => b.addEventListener('click', () => {
    if (!adminOk) return;
    ADM[b.dataset.adm](); A.play('click'); save(); renderAdmin();
    b.animate && b.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 250 });
  }));
  $('admClose').addEventListener('click', home);
  // Admin-Modus verlassen: Anmeldung vergessen, Admin-Knöpfe ausblenden. Unverwundbarkeit im laufenden Lauf endet.
  $('admLogout').addEventListener('click', () => {
    adminOk = false; try { sessionStorage.removeItem('kw.admin'); } catch (e) {}
    if (run) run.god = false;
    if (speed > 4) { speed = 1; $$('#ctrl [data-speed]').forEach(x => x.setAttribute('aria-pressed', x.dataset.speed === '1' ? 'true' : 'false')); }
    A.play('click'); renderAdmin(); home();
  });
  // Markierung entfernen: der Spielstand zählt wieder für die Highscores (für eigene Testspielstände des Betreibers)
  $('admUntaint').addEventListener('click', () => {
    if (!adminOk) return;
    const b = $('admUntaint');
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Sicher? Admin-Werte zählen dann mit'; setTimeout(() => { b.dataset.sure = ''; b.textContent = 'Admin-Markierung vom Spielstand entfernen'; }, 4000); return; }
    meta.adminTainted = false; if (run) run.admin = false; save(); submitScore(); A.play('buy'); renderAdmin();
  });
  $('admBtn').addEventListener('click', () => show('admin'));
  if (adminOk) { $('adminPill').hidden = false; $('admBtn').hidden = false; }

  // ---------- Bedienung ----------
  $('startBtn').addEventListener('click', () => startRun());
  $('againBtn').addEventListener('click', () => startRun(lastMode));
  $('labStart').addEventListener('click', () => { if (runAlive()) { show(null); setPaused(false); } else startRun(); });
  $('labBtn').addEventListener('click', () => show('lab'));
  $('labBtn2').addEventListener('click', () => show('lab'));
  $('labBtn3').addEventListener('click', () => show('lab'));
  $('labClose').addEventListener('click', home);
  // Spielstand auf diesem Gerät löschen (Cloud-Spielstand bleibt erhalten)
  let resetArmed = 0;
  $('resetBtn').addEventListener('click', () => {
    const b = $('resetBtn');
    if (!resetArmed) { resetArmed = setTimeout(() => { resetArmed = 0; b.textContent = 'Spielstand löschen'; }, 4000); b.textContent = 'Wirklich alles auf diesem Gerät löschen? Nochmal tippen'; return; }
    clearTimeout(resetArmed); frozenSave = true; run = null;
    put(KEY, null); put(RKEY, null); location.reload();
  });
  $('lbBtn').addEventListener('click', () => show('board'));
  $('lbBtn2').addEventListener('click', () => show('board'));
  $('lbClose').addEventListener('click', home);
  $('menuBtn').addEventListener('click', () => { if (runAlive()) show('pause'); else show('menu'); });
  $('resumeBtn2').addEventListener('click', () => { show(null); setPaused(false); });
  let endArmed = 0;
  $('endBtn').addEventListener('click', () => {
    if (!runAlive()) return;
    if (!endArmed) { endArmed = setTimeout(() => { endArmed = 0; $('endBtn').textContent = 'Lauf beenden'; }, 3000); $('endBtn').textContent = 'Wirklich beenden?'; return; }
    clearTimeout(endArmed); endArmed = 0; $('endBtn').textContent = 'Lauf beenden';
    endRun(true);
  });
  $('pauseBtn').addEventListener('click', () => { if (runAlive()) setPaused(!paused); });
  $$('#ctrl [data-speed]').forEach(b => b.addEventListener('click', () => {
    speed = +b.dataset.speed; meta.speed = speed;
    $$('#ctrl [data-speed]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  }));
  $$('#tabs [data-tab]').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    $$('#tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
    buildList();
  }));
  // Tempo vom letzten Mal übernehmen
  if ([1, 2, 4].includes(meta.speed)) { speed = meta.speed; $$('#ctrl [data-speed]').forEach(x => x.setAttribute('aria-pressed', +x.dataset.speed === speed ? 'true' : 'false')); }
  // Nachrechnen an/aus
  function syncCatchBtn() { const on = meta.catchup !== false; $('catchBtn').setAttribute('aria-pressed', on ? 'true' : 'false'); $('catchBtn').textContent = on ? 'Weiterlaufen im Hintergrund: an' : 'Weiterlaufen im Hintergrund: aus'; }
  $('catchBtn').addEventListener('click', () => { meta.catchup = meta.catchup === false; save(); syncCatchBtn(); A.play('click'); });
  syncCatchBtn();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { save(); A.suspend(); cloudAuto(); }
    else { A.resume(); welcomeBack(false); }
  });
  window.addEventListener('pagehide', save);
  window.addEventListener('resize', R.resize);

  // Tippen ins Feld: Orbitalschlag setzen oder Gegner markieren
  $('cv').addEventListener('pointerdown', ev => {
    if (!runAlive() || paused || current) return;
    const w = R.toWorld(ev.clientX, ev.clientY);
    if (armed) { if (fire(armed, w)) armed = null; }
    else if (run.markAt(w.x, w.y)) A.play('mark');
  });

  // ---------- Schleife ----------
  const SOUND_OF = { loot: 'loot', rlaunch: 'rlaunch', cryo: 'cryo', laserhit: 'laserhit', nova: 'nova', eshot: 'eshot', bonus: 'buy', boom: 'boom', mine: 'mine', shock: 'shock', wave: 'wave', hurt: 'hurt', bossact: 'bossact' };
  let last = performance.now(), uiT = 0, saveT = 0, autoT = 0, dpsT = 0, lastShots = 0;
  function frame(now) {
    const realDt = Math.min(0.25, (now - last) / 1000); last = now;
    const live = runAlive() && !paused && !current;
    if (live) {
      let left = realDt * speed;
      while (left > 0) { const d = Math.min(1 / 30, left); run.update(d); left -= d; if (run.dead) break; }
      autoT += realDt; if (autoT > 0.3) { autoT = 0; autoBuy(); }
      dpsT += realDt * speed; if (dpsT >= 1) { dpsT = 0; sampleDps(); }
      for (const f of run.fx) { R.pushFx(f); const snd = SOUND_OF[f.k]; if (snd) A.play(snd, f); if (f.k === 'dmg' && f.crit) A.play('crit'); }
      run.fx.length = 0;
      if (run.shots !== lastShots) { lastShots = run.shots; A.play('shot', { over: run.overActive }); }
      A.setIntensity(run.bossAlive() ? 1 : 0.2);
      if (run.dead) endRun(false);
    }
    R.step(realDt, live, run);

    uiT += realDt;
    if (run && uiT > 0.15) {
      uiT = 0;
      $('waveNo').textContent = run.wave;
      if (run.mode) {
        let txt, hit;
        if (run.mode.kind === 'chal') { const c = chalOf(run.mode.id), t = c.goals.filter(g => run.wave >= g).length, nx = c.goals[t]; txt = c.name + (nx ? ' · Ziel ' + nx : ' · alle Stufen'); hit = t > C.chalTier(meta, c.id); }
        else { const d = dailyToday(), b = d ? d.best : 0; txt = 'Tageslauf' + (b ? ' · heute ' + b : ''); hit = b > 0 && run.wave > b; }
        $('bestNo').textContent = txt; $('bestNo').classList.toggle('rec', !!hit);
      } else {
        const rec = run.wave > meta.best && meta.best > 0;
        $('bestNo').textContent = rec ? 'NEUER REKORD' : 'Rekord ' + meta.best;
        $('bestNo').classList.toggle('rec', rec);
      }
      $('runK').textContent = fmt(Math.floor(run.crystals));
      $('myDmg').textContent = fmt(run.s.gunDmg);
      $('foeHp').textContent = fmt(C.enemyHp('grunt', run.wave) * ((run.waveMod && run.waveMod.hp) || 1));
      $('hpTxt').textContent = fmt(Math.max(0, run.hp)) + ' / ' + fmt(run.s.maxHp);
      $('hpbar').firstElementChild.style.width = Math.max(0, run.hp / run.s.maxHp * 100) + '%';
      $('wavebar').firstElementChild.style.width = (run.waveT / C.WAVE_LEN * 100) + '%';
      $('wavebar').classList.toggle('hold', !!run.holding);
      updateAbilities();
      refresh();
      if (O.configured) O.setStatus(meta.name, run.wave);
    }
    saveT += realDt; if (saveT > 5) { saveT = 0; if (runAlive()) save(); }
    R.draw(now, realDt, run, { strikeArmed: armed === 'strike', armed });
    if (current === 'lab' && labR && labRun && $('cannonView').open) labR.preview(labRun, now);
    if (current === 'hangar' && hangR && hangRun) hangR.preview(hangRun, now);
    if (current === 'mine' && now - (window.__mineT || 0) > 2000) { window.__mineT = now; renderMine(); }
    requestAnimationFrame(frame);
  }

  R.resize();
  const snap = load(RKEY);
  if (snap) {
    try { run = C.Run.restore(meta, snap); lastShots = run.shots; buildList(); welcomeBack(true); }
    catch (e) { run = null; put(RKEY, null); show('menu'); welcomeBack(false); }
  } else { show('menu'); welcomeBack(false); }
  requestAnimationFrame(frame);
})();
