// Kernwacht – Spielsteuerung: Zustand, Bedienung, Speichern, Schleife
(function () {
  'use strict';
  const C = window.Core, A = window.KWAudio, O = window.KWOnline, fmt = window.KWRender.fmt;
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
  function save() {
    meta.lastSeen = Date.now(); put(KEY, meta);
    put(RKEY, run && !run.dead ? run.snapshot() : null);
  }
  window.__kwSave = save;

  const pct = x => Math.round(x * 100) + ' %';
  const dec = (x, d) => x.toFixed(d).replace('.', ',');

  // ---------- Zustand ----------
  let speed = 1, paused = false, tab = 'atk', armed = null, adminOk = false; // armed: 'strike' | 'freeze' | 'over'
  try { adminOk = sessionStorage.getItem('kw.admin') === '1'; } catch (e) {}
  const R = window.KWRender.create($('cv'));
  const OV = ['menu', 'over', 'lab', 'back', 'pause', 'board', 'admin', 'fusion', 'modules'];
  let current = 'menu';
  function show(name) {
    current = name;
    for (const k of OV) $(k).hidden = k !== name;
    if (name === 'lab') renderLab();
    if (name === 'menu') renderMenu();
    if (name === 'board') renderBoard();
    if (name === 'admin') renderAdmin();
    if (name === 'pause') syncSoundBtns();
    if (name === 'fusion') renderFusion();
    if (name === 'modules') renderModules();
    syncMetaBtns();
  }
  const runAlive = () => run && !run.dead;
  function home() { show(runAlive() ? 'pause' : 'menu'); }
  function setPaused(p) { paused = p; $('pauseBtn').textContent = p ? '▶' : 'II'; }

  function startRun() {
    run = new C.Run(meta, { startWave: C.startWaveFor(meta) });
    R.clear(); armed = null; dpsHist.length = 0;
    setPaused(false); show(null); buildList(); save();
  }
  function endRun(early) {
    if (!run || run.finished) return;
    run.finished = true;
    const res = run.finish();
    if (run.admin) meta.adminTainted = true;
    put(RKEY, null); save();
    if (!early) A.play('gameover');
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
    $('oExtra').innerHTML = ex.join(''); $('oExtra').hidden = !ex.length;
    if ((res.loot || []).length) A.play('loot');
    submitScore();
    setTimeout(() => show('over'), early ? 0 : 900);
  }

  // ---------- Offline / Rückkehr ----------
  function offlineCrystals() {
    const now = Date.now(), away = Math.min(24 * 3600e3, now - (meta.lastSeen || now));
    meta.lastSeen = now;
    if (away < 60e3) return null;
    const k = Math.floor(C.offlinePerHour(meta) * away / 3600e3);
    meta.crystals += k;
    const h = Math.floor(away / 3600e3), m = Math.floor(away / 60e3) % 60;
    return { k, txt: (h ? h + ' h ' : '') + m + ' min' };
  }
  function welcomeBack(fromLoad) {
    const o = offlineCrystals();
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
    dmg: s => fmt(s.dmg), rate: s => dec(s.rate, 2) + '/s', range: s => Math.round(s.range),
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
      r.lvl.textContent = avail ? 'St. ' + run.L(u.id) : 'Labor';
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
    { k: 'gun', name: 'Kanone', hit: s => s.dmg, rate: (s, r) => dec(r.rateNow, 2) + '/s' + (s.multi ? ' ×' + (1 + s.multi) : ''), on: () => true },
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
    list.innerHTML = `<table class="stbl"><thead><tr><th>Quelle</th><th>Treffer</th><th>Takt</th><th>DPS</th><th>Anteil</th></tr></thead><tbody id="stBody"></tbody></table><div class="kv" id="kv"></div>`;
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
  function renderLab() {
    $('labK').textContent = fmt(meta.crystals);
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

  // ---------- Kernfusion ----------
  function syncMetaBtns() {
    const canFuse = C.fragmentsFor(meta) > 0;
    const showFus = canFuse || meta.fusions > 0 || meta.frag > 0 || meta.best >= 40;
    $$('.fus-btn').forEach(b => { b.hidden = !showFus; b.classList.toggle('ready', canFuse); });
    const showMod = Object.keys(meta.modules || {}).length > 0;
    $$('.mod-btn').forEach(b => { b.hidden = !showMod; });
    // Leere Zweierreihen ausblenden
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
      d.innerHTML = m ? `<b>${C.MODULES[t].name}</b>${C.RARITY[m.rar].name}` : 'freier Platz';
      slots.appendChild(d);
    }
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
          ? `<div><div class="nm">${M.name}<span class="rar">${C.RARITY[m.rar].name}</span><small>Fund ${m.copies}/10</small></div><div class="ds">${M.desc(C.moduleValue(m))}</div></div><span class="rar">${on ? 'AUSGERÜSTET' : ''}</span>`
          : `<div><div class="nm">Unbekanntes Modul</div><div class="ds">Fällt bei Mutterschiffen in Sektor ${sec.n} (Wellen ${sec.n * 50 - 49}–${sec.n * 50}${sec.n === 5 ? '+' : ''})</div></div><span></span>`;
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
  A.setSfx(meta.sfx); A.setMusic(meta.music);
  // Audio darf erst nach einer Berührung starten
  window.addEventListener('pointerdown', () => { A.init(); A.setSfx(meta.sfx); A.setMusic(meta.music); }, { once: true, capture: true });

  // ---------- Bestenliste / Online ----------
  function submitScore() {
    if (!O.configured || !meta.name || meta.adminTainted || !meta.best) return;
    O.submit(meta.name, meta.best, meta.runs);
  }
  async function renderBoard() {
    const st = $('lbStatus'), body = $('lbBody');
    body.innerHTML = '';
    $('lbName').hidden = !O.configured;
    $('nameInput').value = meta.name || '';
    if (!O.configured) { st.textContent = 'Die Bestenliste ist noch nicht eingerichtet. Sie wird aktiv, sobald der Online-Dienst verbunden ist.'; return; }
    if (meta.adminTainted) st.textContent = 'Dieser Spielstand hat Admin-Eingriffe und wird nicht eingetragen.';
    else st.textContent = meta.name ? 'Wird geladen …' : 'Gib einen Namen ein, um in der Liste zu erscheinen.';
    const data = await O.top(20);
    if (!data) { st.textContent = 'Die Bestenliste ist gerade nicht erreichbar.'; return; }
    if (!meta.adminTainted) st.textContent = data.length ? '' : 'Noch keine Einträge.';
    const me = O.pid();
    body.innerHTML = data.map((r, i) => `<tr class="${r.player_id === me ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.name)}</td><td>Welle ${r.best_wave}</td></tr>`).join('');
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  $('nameInput').addEventListener('change', () => {
    meta.name = $('nameInput').value.trim().slice(0, 16); save();
    O.setStatus(meta.name, run ? run.wave : 0); submitScore(); setTimeout(renderBoard, 600);
  });
  if (O.configured) {
    O.start(meta.name);
    O.onCount(n => { $('onlinePill').hidden = false; $('onlinePill').textContent = n + ' online'; });
  }

  // ---------- Admin ----------
  async function sha(text) {
    if (!(window.crypto && crypto.subtle)) return '';
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function renderAdmin() {
    $('admLogin').hidden = adminOk; $('admPanel').hidden = !adminOk; $('admErr').hidden = true;
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
  $('admBtn').addEventListener('click', () => show('admin'));
  if (adminOk) { $('adminPill').hidden = false; $('admBtn').hidden = false; }

  // ---------- Bedienung ----------
  $('startBtn').addEventListener('click', startRun);
  $('againBtn').addEventListener('click', startRun);
  $('labStart').addEventListener('click', () => { if (runAlive()) { show(null); setPaused(false); } else startRun(); });
  $('labBtn').addEventListener('click', () => show('lab'));
  $('labBtn2').addEventListener('click', () => show('lab'));
  $('labBtn3').addEventListener('click', () => show('lab'));
  $('labClose').addEventListener('click', home);
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
    speed = +b.dataset.speed;
    $$('#ctrl [data-speed]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  }));
  $$('#tabs [data-tab]').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    $$('#tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
    buildList();
  }));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { save(); A.suspend(); }
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
      const rec = run.wave > meta.best && meta.best > 0;
      $('bestNo').textContent = rec ? 'NEUER REKORD' : 'Rekord ' + meta.best;
      $('bestNo').classList.toggle('rec', rec);
      $('runK').textContent = fmt(Math.floor(run.crystals));
      $('myDmg').textContent = fmt(run.s.dmg);
      $('foeHp').textContent = fmt(C.enemyHp('grunt', run.wave));
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
