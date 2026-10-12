// Kernwacht – Spielkern (ohne DOM, auch in Node lauffähig)
(function (root) {
  'use strict';

  // Balancing-Stellschrauben (Überschreiben per root.KW_P für Simulationen)
  const P0 = Object.assign({
    eHp: 1.13, eHpLin: 0.12, eDmg: 1.1, eDmgLin: 0.06, eRw: 1.02, eRwLin: 0,
    cBase: 2.5, cGrow: 1.01, cLate: 0.04, cBoss: 10, pDmg: 7, pHp: 80, lvDmg: 1.1, lvHp: 1.1, rw0: 1.3,
    rgMax: 0.05, rgK: 15, arMax: 0.65, arK: 15, arCap: 0.75, kamikaze: 3, multiDmg: 0.35, shockK: 0.7, mineK: 0.7, lootK: 0.05, nGrow: 1.2, bonusK: 0.025,
    labG: 1.2, fCore: 1.25, fCrys: 0.5, fragK: 1, fCoreG: 1.35, fragExp: 2.3, rwExp: 0, strikePct: 0.12, waveTypes: 1, shipCap: 40, wmDmg: 0.35,
    gunK: 3, rockLv: 0.04, shockLv: 0.05, mineLv: 0.06, splK: 1,
  }, root.KW_P || {});

  // ---------- Upgrades im Lauf (Energie) ----------
  const RUN_UPG = [
    { id: 'dmg',      tab: 'atk', name: 'Schaden',          desc: '×1,10 Schaden pro Stufe',          base: 4,   g: 1.12 },
    { id: 'rate',     tab: 'atk', name: 'Feuerrate',        desc: '+5 % Schüsse pro Sekunde',         base: 6,   g: 1.15, max: 25 },
    { id: 'range',    tab: 'atk', name: 'Reichweite',       desc: '+5 Reichweite',                    base: 10,  g: 1.17, max: 30 },
    { id: 'crit',     tab: 'atk', name: 'Krit-Chance',      desc: '+2,5 % Chance auf Krit',           base: 12,  g: 1.18, max: 16 },
    { id: 'critx',    tab: 'atk', name: 'Krit-Schaden',     desc: '+0,1× Schaden bei Krit',           base: 16,  g: 1.16, max: 15 },
    { id: 'multi',    tab: 'atk', name: 'Mehrfachschuss',   desc: '+1 Nebenrohr mit 35 % Schaden',    base: 150, g: 3.2,  max: 2 },
    { id: 'rocket',   tab: 'atk', name: 'Raketenwerfer',    desc: 'Langsame Rakete mit Flächenschaden', base: 80, g: 1.2,  max: 30, freq: 'f_rocket' },
    { id: 'cryo',     tab: 'atk', name: 'Kryowerfer',       desc: 'Verlangsamt getroffene Schiffe',   base: 80,  g: 1.2,  max: 30, freq: 'f_cryo' },
    { id: 'mine',     tab: 'atk', name: 'Minenwerfer',      desc: 'Mehr und stärkere Minen',          base: 60,  g: 1.2,  max: 30, req: 'u_mine' },
    { id: 'hp',       tab: 'def', name: 'Hülle',            desc: '×1,10 Strukturpunkte',             base: 4,   g: 1.12 },
    { id: 'regen',    tab: 'def', name: 'Reparatur',        desc: 'Mehr Regeneration pro Sekunde',    base: 8,   g: 1.15, max: 40 },
    { id: 'armor',    tab: 'def', name: 'Panzerung',        desc: 'Weniger Schaden durch Treffer',    base: 14,  g: 1.17, max: 40 },
    { id: 'knock',    tab: 'def', name: 'Rückstoß',         desc: 'Treffer stoßen Gegner zurück',     base: 20,  g: 1.2,  max: 20 },
    { id: 'shock',    tab: 'def', name: 'Schockwelle',      desc: 'Druckring bis weit ins Feld',      base: 50,  g: 1.2,  max: 30, req: 'u_shock' },
    { id: 'blade',    tab: 'def', name: 'Orbitklingen',     desc: 'Pendelnde Klingen über der Kanone', base: 70,  g: 1.2,  max: 30, req: 'u_blade' },
    { id: 'loot',     tab: 'eco', name: 'Energieausbeute',  desc: '+5 % Energie pro Abschuss',        base: 8,   g: 1.16, max: 30 },
    { id: 'interest', tab: 'eco', name: 'Wellenprämie',     desc: 'Energiebonus am Ende jeder Welle', base: 25,  g: 1.22, max: 15 },
    { id: 'crys',     tab: 'eco', name: 'Kristallfilter',   desc: '+6 % Kristalle in diesem Lauf',    base: 40,  g: 1.25, max: 20 },
  ];

  // ---------- Labor (Kristalle, dauerhaft) ----------
  const META_UPG = [
    { id: 'm_dmg',    name: 'Kalibrierte Läufe',  desc: '×1,08 Schaden',                     base: 3,  g: P0.labG },
    { id: 'm_hp',     name: 'Verbundhülle',       desc: '×1,08 Strukturpunkte',              base: 3,  g: P0.labG },
    { id: 'm_rate',   name: 'Kühlkreislauf',      desc: '+3 % Feuerrate',                    base: 5,  g: 1.25, max: 20 },
    { id: 'm_regen',  name: 'Nanoreparatur',      desc: '+10 % Reparatur',                   base: 4,  g: 1.22, max: 30 },
    { id: 'm_armor',  name: 'Keramikschicht',     desc: '+1 % Panzerung',                    base: 6,  g: 1.25, max: 15 },
    { id: 'm_loot',   name: 'Energiesammler',     desc: '+8 % Energie',                     base: 4,  g: 1.22 },
    { id: 'm_start',  name: 'Startkapital',       desc: 'Mehr Energie zum Laufbeginn',       base: 6,  g: 1.3,  max: 25 },
    { id: 'm_cheap',  name: 'Effiziente Fertigung', desc: '−2 % Upgradekosten im Lauf',     base: 10, g: 1.3,  max: 15 },
    { id: 'm_head',   name: 'Vorsprung',          desc: '+1 Startstufe Schaden, Feuerrate, Hülle, Reparatur', base: 20, g: 1.45, max: 15 },
    { id: 'm_crys',   name: 'Kristallresonanz',   desc: '+10 % Kristalle',                   base: 8,  g: 1.25 },
    { id: 'u_shock',  name: 'Schockwelle',        desc: 'Schaltet die Schockwelle frei',     base: 25, g: 1, max: 1, unlock: true },
    { id: 'u_blade',  name: 'Orbitklingen',       desc: 'Schaltet die Orbitklingen frei',    base: 60, g: 1, max: 1, unlock: true },
    { id: 'u_mine',   name: 'Minenwerfer',        desc: 'Schaltet den Minenwerfer frei',     base: 110, g: 1, max: 1, unlock: true },
    { id: 'u_freeze', name: 'Stasisfeld',         desc: 'Fähigkeit: friert alle Gegner kurz ein', base: 40, g: 1, max: 1, unlock: true },
    { id: 'm_freeze', name: 'Stasis-Kondensator', desc: '+0,4 s Dauer, −1,5 s Abklingzeit', base: 15, g: 1.3, max: 15, req: 'u_freeze' },
    { id: 'u_over',   name: 'Überladung',         desc: 'Fähigkeit: Feuerrate kurzzeitig stark erhöht', base: 70, g: 1, max: 1, unlock: true },
    { id: 'm_over',   name: 'Überladungsspulen',  desc: '+0,5 s Dauer, +5 % Feuerrate, −1 s Abklingzeit', base: 20, g: 1.3, max: 15, req: 'u_over' },
    { id: 'u_jump',   name: 'Sprungtor',          desc: 'Startet Läufe später, bis 30 % der Bestwelle.', base: 50, g: 1, max: 1, unlock: true },
    { id: 'm_jump',   name: 'Sprungweite',        desc: '+5 % der Bestwelle als Startwelle.', base: 30, g: 1.4, max: 8, req: 'u_jump' },
  ];

  // ---------- Kernfusion (Kernfragmente, überdauern jede Fusion) ----------
  const FUSION_UPG = [
    { id: 'f_core',   name: 'Fusionskern',     desc: '×1,25 Schaden und Strukturpunkte', base: 3,  g: P0.fCoreG },
    { id: 'f_crys',   name: 'Kristallmatrix',  desc: '+50 % Kristalle',                   base: 3,  g: 1.6 },
    { id: 'f_frag',   name: 'Fragmentfokus',   desc: '+20 % Kernfragmente bei der Fusion', base: 8, g: 1.8, max: 10 },
    { id: 'f_tech',   name: 'Archiv',          desc: 'Freischaltungen (Schockwelle, Stasis, Sprungtor …) bleiben bei der Fusion erhalten', base: 12, g: 1, max: 1, unlock: true },
    { id: 'f_keep',   name: 'Restwissen',      desc: 'Behält 10 % der Laborstufen bei der Fusion', base: 10, g: 2, max: 5 },
    { id: 'f_rocket', name: 'Raketenwerfer',   desc: 'Nebenkanone links: langsame Rakete mit großem Flächenschaden', base: 20, g: 1, max: 1, unlock: true },
    { id: 'f_cryo',   name: 'Kryowerfer',      desc: 'Nebenkanone rechts: verlangsamt getroffene Schiffe', base: 20, g: 1, max: 1, unlock: true },
  ];
  const FUSION_MIN = 50;
  const flv = (m, id) => (m.flv && m.flv[id]) || 0;
  function fragmentsFor(meta) {
    if (meta.best < FUSION_MIN) return 0;
    return Math.floor(P.fragK * Math.pow(meta.best / 10, P.fragExp) * (1 + 0.2 * flv(meta, 'f_frag')));
  }
  // Fusion: Labor, Kristalle und Bestwelle zurücksetzen, Kernfragmente gutschreiben
  function fuse(meta) {
    const gain = fragmentsFor(meta);
    if (!gain) return 0;
    meta.frag = (meta.frag || 0) + gain;
    meta.fragTotal = (meta.fragTotal || 0) + gain;
    meta.fusions = (meta.fusions || 0) + 1;
    meta.bestEver = Math.max(meta.bestEver || 0, meta.best);
    const keep = 0.1 * flv(meta, 'f_keep'), tech = flv(meta, 'f_tech') > 0, lv = {};
    for (const u of META_UPG) {
      const l = mlv(meta, u.id); if (!l) continue;
      if (u.unlock || u.req && u.max === 1) { if (tech) lv[u.id] = l; continue; }
      const k = Math.floor(l * keep);
      if (k && (!u.req || tech)) lv[u.id] = k;
    }
    meta.cph = (meta.cph || 0) * 0.3;
    meta.lv = lv; meta.crystals = 0; meta.best = 0; meta.startPref = null; meta.milestones = {};
    return gain;
  }
  function fusionCost(u, l) { return Math.ceil(u.base * Math.pow(u.g, l)); }
  function fusionBuy(meta, u) {
    const l = flv(meta, u.id);
    if (u.max != null && l >= u.max) return false;
    const c = fusionCost(u, l);
    if ((meta.frag || 0) < c) return false;
    meta.frag -= c; meta.flv = meta.flv || {}; meta.flv[u.id] = l + 1;
    return true;
  }

  // ---------- Sektoren: alle 50 Wellen neues Biom, neuer Gegnertyp, neue Boss-Fähigkeit ----------
  const SECTORS = [
    { n: 1, name: 'Randzone',       enemy: null,       boss: null },
    { n: 2, name: 'Smaragdnebel',   enemy: 'phantom',  boss: 'cloak' },
    { n: 3, name: 'Glutgürtel',     enemy: 'bulwark',  boss: 'bulwarks' },
    { n: 4, name: 'Roter Riese',    enemy: 'splitter', boss: 'nova' },
    { n: 5, name: 'Die Leere',      enemy: 'mender',   boss: 'mend' },
  ];
  const sectorOf = w => SECTORS[Math.min(SECTORS.length - 1, Math.floor((Math.max(1, w) - 1) / 50))];

  // ---------- Boss-Module: Beute der Mutterschiffe, je Sektor eigene Typen ----------
  // Wirkung = Grundwert × Seltenheit × (1 + 15 % je zusätzlichem Fund, max. 10 Funde)
  const MODULES = {
    chain:     { sector: 1, name: 'Kettenblitz',       desc: v => `${pctS(v)} Chance, dass ein Treffer auf 2 Schiffe überspringt`, base: 0.10 },
    splinter:  { sector: 1, name: 'Splittermunition',  desc: v => `Abschüsse explodieren mit ${v.toFixed(1).replace('.', ',')}× Kanonenschaden im Umkreis`, base: 0.42 },
    cryoammo:  { sector: 2, name: 'Kryo-Munition',     desc: v => `Treffer verlangsamen um ${pctS(v)}`, base: 0.10 },
    scanner:   { sector: 2, name: 'Zielerfassung',     desc: v => `+${pctS(v)} Krit-Chance, Tarnung wirkungslos`, base: 0.04 },
    overcharge:{ sector: 3, name: 'Überspannung',      desc: v => `Jeder 12. Schuss macht ${v.toFixed(1).replace('.', ',')}× Schaden`, base: 2, add: 1 },
    plating:   { sector: 3, name: 'Reaktivpanzerung',  desc: v => `+${pctS(v)} Panzerung`, base: 0.04 },
    leech:     { sector: 4, name: 'Energieleck',       desc: v => `+${pctS(v)} Energie pro Abschuss`, base: 0.10 },
    nova:      { sector: 4, name: 'Notfallnova',       desc: v => `Unter 30 % LP: Nova mit ${Math.round(v)}× Schaden (alle 20 s)`, base: 15 },
    echo:      { sector: 5, name: 'Echo',              desc: v => `−${pctS(v)} Abklingzeit der Fähigkeiten`, base: 0.08 },
    crysmod:   { sector: 5, name: 'Kristallresonator', desc: v => `+${pctS(v)} Kristalle`, base: 0.15 },
  };
  const RARITY = [
    { id: 0, name: 'gewöhnlich', mult: 1 },
    { id: 1, name: 'selten',     mult: 1.5 },
    { id: 2, name: 'episch',     mult: 2.2 },
    { id: 3, name: 'legendär',   mult: 3.2 },
  ];
  function pctS(v) { return Math.round(v * 100) + ' %'; }
  function moduleValue(m) {
    if (!m) return 0;
    const M = MODULES[m.type], k = RARITY[m.rar].mult * (1 + 0.15 * (Math.min(10, m.copies) - 1));
    return M.add ? M.base + M.add * (k - 1) + M.add : M.base * k;
  }
  // Beute würfeln: Typ aus dem Sektor der Welle, Seltenheit steigt mit der Welle
  function rollModule(w) {
    const sec = sectorOf(w).n, types = Object.keys(MODULES).filter(t => MODULES[t].sector === sec);
    const type = types[Math.floor(Math.random() * types.length)];
    const r = Math.random(), within = ((w - 1) % 50) / 50;
    const rar = r < 0.02 + 0.08 * within ? 3 : r < 0.1 + 0.15 * within ? 2 : r < 0.35 + 0.15 * within ? 1 : 0;
    return { type, rar };
  }
  // Fund ins Inventar übernehmen: bessere Seltenheit ersetzt, jeder Fund zählt als Kopie
  function addModule(meta, drop) {
    meta.modules = meta.modules || {};
    const cur = meta.modules[drop.type];
    if (!cur) { meta.modules[drop.type] = { type: drop.type, rar: drop.rar, copies: 1 }; return 'neu'; }
    cur.copies = Math.min(10, cur.copies + 1);
    if (drop.rar > cur.rar) { cur.rar = drop.rar; return 'besser'; }
    return 'kopie';
  }
  const MODULE_SLOTS = 3;
  // Beutechance steigt mit der Welle des Mutterschiffs: 20 % bei Welle 30 bis max. 85 %
  const dropChance = w => Math.max(0, Math.min(0.85, 0.2 + (w - 30) * 0.005));

  // Meilensteine: einmalige Kristalle für neue Bestwellen (25, 50, 75 …), je Fusionszyklus
  const milestoneReward = w => Math.round(30 * Math.pow(w / 10, 2));

  // ---------- Fähigkeiten (aktiv auslösbar) ----------
  const ABIL = {
    freeze: { name: 'Stasis', unlock: 'u_freeze', lvl: 'm_freeze', dur: l => 3 + 0.4 * l, cd: l => 45 - 1.5 * l },
    over:   { name: 'Überladung', unlock: 'u_over', lvl: 'm_over', dur: l => 6 + 0.5 * l, cd: l => 40 - l, mult: l => 2 + 0.05 * l },
  };

  const ENEMY = {
    grunt:   { hp: 5,   spd: 30, dmg: 1,   rw: 1,   r: 7,  col: 'grunt' },
    runner:  { hp: 2.4, spd: 58, dmg: 0.7, rw: 1,   r: 5,  col: 'runner' },
    brute:   { hp: 14,  spd: 17, dmg: 2.5, rw: 3,   r: 11, col: 'brute' },
    shooter: { hp: 7,   spd: 28, dmg: 0.8, rw: 2.5, r: 7,  col: 'shooter', stop: 120 },
    boss:    { hp: 140, spd: 14, dmg: 8,   rw: 30,  r: 20, col: 'boss' },
    phantom: { hp: 6,   spd: 34, dmg: 1,   rw: 2,   r: 7,  col: 'phantom', cloakFrom: 170 },
    bulwark: { hp: 20,  spd: 15, dmg: 2,   rw: 4,   r: 12, col: 'bulwark' },
    splitter:{ hp: 12,  spd: 22, dmg: 1.5, rw: 2,   r: 10, col: 'splitter' },
    shard:   { hp: 3,   spd: 40, dmg: 0.6, rw: 0.6, r: 6,  col: 'splitter' },
    mender:  { hp: 10,  spd: 20, dmg: 0.5, rw: 3,   r: 9,  col: 'mender', stop: 230 },
    bomb:    { hp: 1,   spd: 34, dmg: 0,   rw: 0.5, r: 8,  col: 'bomb' },
  };

  const FIELD_W = 240, FIELD_H = 430, BASE_R = 22, WALL_R = 50, WAVE_LEN = 20, SPAWN_LEN = 15;
  const STRIKE_KILLS = 30, STRIKE_R = 80;

  function newMeta() {
    return { v: 1, crystals: 0, best: 0, runs: 0, kills: 0, lv: {}, lastSeen: Date.now(), totalCrystals: 0 };
  }
  const mlv = (m, id) => (m.lv && m.lv[id]) || 0;

  function metaCost(u, l) { return Math.ceil(u.base * Math.pow(u.g, l)); }
  function cheapMult(meta) { return Math.pow(0.98, mlv(meta, 'm_cheap')); }
  function startEnergy(meta) { const l = mlv(meta, 'm_start'); return l ? Math.round(10 * l * Math.pow(1.12, l)) : 0; }

  const P = P0;
  const hpScale = w => Math.pow(1 + P.eHpLin * (w - 1), 2) * Math.pow(P.eHp, w - 1);
  const dmgScale = w => (1 + P.eDmgLin * (w - 1)) * Math.pow(P.eDmg, w - 1);
  // Energie pro Abschuss: wächst mit den Gegner-LP mit (rwExp), damit die Kanone im Lauf mithalten kann
  const rwScale = w => P.rw0 * (1 + P.eRwLin * (w - 1)) * Math.pow(P.eRw, w - 1) * Math.pow(hpScale(w), P.rwExp);
  // Kristalle pro abgeschlossener Welle (wächst mit, damit das Labor nie zur Mauer wird)
  const waveCrystals = w => P.cBase * Math.pow(P.cGrow, w) * (1 + Math.max(0, w - 40) * P.cLate);

  // Offline-Ertrag: ein fester Anteil dessen, was die letzten Läufe pro Stunde eingebracht haben (max. 24 h, keine Paywall)
  const OFFLINE_SHARE = 0.2;
  function offlinePerHour(meta) {
    if (!meta.best) return 0;
    const est = 60 * waveCrystals(meta.best * 0.8) * (1 + 0.1 * mlv(meta, 'm_crys')) * (1 + P.fCrys * flv(meta, 'f_crys'));
    return meta.cph ? Math.max(OFFLINE_SHARE * meta.cph, est * 0.5) : est;
  }

  const SOURCES = ['gun', 'rocket', 'cryo', 'mine', 'shock', 'blade', 'strike', 'mod'];
  const UPG_BY_ID = {}; RUN_UPG.forEach(u => (UPG_BY_ID[u.id] = u));
  const MIX = w => {
    // Wahrscheinlichkeiten der Gegnertypen je Welle (wie in nextWave)
    const p = { grunt: 1, runner: 0, brute: 0, shooter: 0 };
    let used = 0;
    if (w >= 15) { p.shooter = 0.08; used = 0.08; }
    if (w >= 6) { p.brute = 0.22 - used; used = 0.22; }
    if (w >= 3) { p.runner = 0.45 - used; used = 0.45; }
    p.grunt = 1 - used;
    return p;
  };
  // Rechnerische Gegnerzahl (bestimmt Energie und Gesamt-LP einer Welle)
  const waveCount = w => Math.min(70, 5 + Math.floor(P.nGrow * w));
  // Tatsächlich gespawnte Schiffe: weniger, dafür entsprechend kräftiger
  const shipCount = w => Math.min(P.shipCap, 4 + Math.floor(0.75 * w));

  // ---------- Wellentypen: Abwechslung statt immer gleicher Masse ----------
  const WAVE_TYPES = {
    normal:    { name: '',               n: 1,    hp: 1,    spd: 1 },
    swarm:     { name: 'Schwarm',        n: 1.8,  hp: 0.45, spd: 1.15, mix: { runner: 0.75 } },
    heavy:     { name: 'Panzerverband',  n: 0.4,  hp: 2.7,  spd: 0.75, mix: { brute: 0.7 }, big: 1.25 },
    artillery: { name: 'Artillerie',     n: 0.85, hp: 1.15, spd: 1,    mix: { shooter: 0.45 } },
  };
  function pickWaveType(w, rnd, bias) {
    rnd = rnd || Math.random;
    if (bias && w >= 6 && w % 10 && rnd() < 0.5) return bias;
    if (!P.waveTypes || w < 12 || w % 10 === 0) return 'normal';
    const r = rnd();
    if (r < 0.2) return 'swarm';
    if (r < 0.38) return 'heavy';
    if (r < 0.52 && w >= 15) return 'artillery';
    return 'normal';
  }

  // ---------- Freischaltungen nach Rekordwelle (aller Zeiten) ----------
  const GATES = { u_freeze: 15, m_freeze: 15, u_blade: 20, u_over: 25, m_over: 25, u_jump: 25, m_jump: 25, u_mine: 35 };
  const MODULES_AT = 30, FUSION_AT = 50;
  const ROADMAP = [
    { w: 10, label: 'Erstes Mutterschiff' },
    { w: 15, label: 'Stasisfeld im Labor, Tageslauf' },
    { w: 20, label: 'Orbitklingen im Labor' },
    { w: 25, label: 'Überladung und Sprungtor im Labor' },
    { w: 30, label: 'Boss-Module: Mutterschiffe lassen Beute fallen' },
    { w: 35, label: 'Minenwerfer im Labor' },
    { w: 40, label: 'Herausforderungen: Läufe mit Handicap für dauerhafte Boni' },
    { w: 50, label: 'Kernfusion' },
    { w: 51, label: 'Sektor 2: Smaragdnebel' },
    { w: 101, label: 'Sektor 3: Glutgürtel' },
    { w: 151, label: 'Sektor 4: Roter Riese' },
    { w: 201, label: 'Sektor 5: Die Leere' },
  ];
  const record = m => Math.max(m.bestEver || 0, m.best || 0);
  const gateOk = (m, id) => record(m) >= (GATES[id] || 0);
  function nextUnlock(m) { const r = record(m); return ROADMAP.find(x => x.w > r) || null; }
  // Erwartete Energie aus Abschüssen einer Welle (ohne Upgrades im Lauf)
  function waveEnergy(w) {
    const p = MIX(w); let avg = 0;
    for (const t in p) avg += p[t] * ENEMY[t].rw;
    let e = waveCount(w) * avg * rwScale(w);
    if (w % 10 === 0) e += (ENEMY.boss.rw + 12) * rwScale(w);
    return e;
  }
  // Sprungtor: höchste wählbare Startwelle = Anteil der Bestwelle, abgerundet; nie direkt eine Bosswelle
  function jumpShare(lvl) { return 0.3 + 0.05 * lvl; }
  function maxStartWave(meta, lvl) {
    if (!mlv(meta, 'u_jump')) return 1;
    const lim = meta.best * jumpShare(lvl == null ? mlv(meta, 'm_jump') : lvl);
    let w = Math.max(1, Math.floor(lim));
    if (w % 10 === 0) w -= 1;
    return w;
  }
  // Gewählte Startwelle; ohne eigene Wahl immer die höchste erlaubte
  function startWaveFor(meta) {
    const max = maxStartWave(meta);
    return meta.startPref ? Math.min(meta.startPref, max) : max;
  }
  function jumpBonus(meta, S) {
    let e = 0, k = 0;
    for (let w = 1; w < S; w++) { e += waveEnergy(w); k += waveCrystals(w); }
    const loot = 1.25 * (1 + 0.08 * mlv(meta, 'm_loot'));
    return { energy: e * loot, crystals: k * (1 + 0.1 * mlv(meta, 'm_crys')) * (1 + P.fCrys * flv(meta, 'f_crys')) };
  }

  // Fernkampf je Schiffstyp: ab Distanz `from`, alle `cd` Sekunden, Anteil `dmg` des Kontaktschadens
  const GUNS = {
    grunt:   { from: 230, cd: 3.2, dmg: 0.35 },
    brute:   { from: 260, cd: 2.6, dmg: 0.6, big: true },
    shooter: { from: 320, cd: 2.0, dmg: 1 },
  };


  // ---------- Herausforderungen: Läufe mit Handicap, Stufen bringen dauerhafte Boni (überdauern die Fusion) ----------
  const CHAL_AT = 40, DAILY_AT = 15;
  const CHALLENGES = [
    { id: 'nodef', name: 'Ohne Abwehr',  rule: 'Keine Abwehr-Upgrades im Lauf: Hülle, Reparatur, Panzerung, Rückstoß, Schockwelle und Klingen bleiben gesperrt.', goals: [15, 25, 40], bonus: 'hp',   step: 0.05, bname: 'Strukturpunkte' },
    { id: 'fast',  name: 'Hetzjagd',     rule: 'Alle Gegner fliegen doppelt so schnell.', goals: [30, 50, 70], bonus: 'rate', step: 0.04, bname: 'Feuerrate' },
    { id: 'mines', name: 'Nur Minen',    rule: 'Kanone, Nebenkanonen, Schockwelle, Klingen und Orbitalschlag schweigen. Nur der Minenwerfer arbeitet, er ist von Beginn an aktiv.', goals: [30, 50, 70], bonus: 'crys', step: 0.08, bname: 'Kristalle' },
    { id: 'glass', name: 'Glaskanone',   rule: 'Nur ein Viertel der Strukturpunkte und keine Reparatur.', goals: [20, 40, 55], bonus: 'dmg',  step: 0.04, bname: 'Schaden' },
    { id: 'poor',  name: 'Sparflamme',   rule: 'Abschüsse bringen nur halb so viel Energie, keine Wellenprämie.', goals: [20, 40, 60], bonus: 'loot', step: 0.06, bname: 'Energie' },
  ];
  const CHAL_BY_ID = {}; CHALLENGES.forEach(c => (CHAL_BY_ID[c.id] = c));
  const chalTier = (m, id) => (m.chal && m.chal[id] && m.chal[id].tier) || 0;
  function chalBonus(m) {
    const b = { hp: 1, rate: 1, dmg: 1, loot: 1, crys: 1 };
    for (const c of CHALLENGES) b[c.bonus] += c.step * chalTier(m, c.id);
    return b;
  }
  // Was eine Herausforderung im Lauf sperrt
  const BLOCK = {
    nodef: u => u.tab === 'def',
    mines: u => (u.tab === 'atk' && u.id !== 'dmg' && u.id !== 'mine') || u.id === 'shock' || u.id === 'blade',
    glass: u => u.id === 'regen',
    poor:  u => u.id === 'interest',
  };

  // ---------- Tageslauf: gleiche Wellen und gleiche Ausrüstung für alle ----------
  // Feste Labor-Ausrüstung, keine Fusion, keine Module, kein Sprungtor
  const STD_LV = { m_dmg: 12, m_hp: 12, m_rate: 8, m_regen: 8, m_armor: 5, m_loot: 8, m_start: 5, m_head: 3, u_shock: 1, u_freeze: 1, m_freeze: 3, u_over: 1, m_over: 2, u_blade: 1 };
  const TWISTS = [
    { id: 'plain',  name: 'Standard',        desc: 'Keine Besonderheit, reines Können.' },
    { id: 'fast',   name: 'Schnelle Gegner', desc: 'Gegner fliegen 40 % schneller.', spd: 1.4 },
    { id: 'swarm',  name: 'Schwarmtag',      desc: 'Viele Schwarm-Wellen mit wendigen Abfangjägern.', bias: 'swarm' },
    { id: 'heavy',  name: 'Panzertag',       desc: 'Viele Panzerverbände mit schweren Kreuzern.', bias: 'heavy' },
    { id: 'rich',   name: 'Reiche Beute',    desc: '+50 % Energie, dafür 30 % zähere Gegner.', loot: 1.5, ehp: 1.3 },
    { id: 'nodef',  name: 'Ohne Abwehr',     desc: 'Keine Abwehr-Upgrades im Lauf.', block: 'nodef' },
    { id: 'glass',  name: 'Glaskanone',      desc: 'Ein Viertel der Strukturpunkte, keine Reparatur.', block: 'glass' },
  ];
  function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // Tag nach deutscher Zeit, damit alle zur selben Mitternacht wechseln
  function dayKey(d) {
    d = d || new Date();
    try { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function dailyOf(day) {
    day = day || dayKey();
    const seed = hashStr('kernwacht:' + day);
    return { day, seed, twist: TWISTS[seed % TWISTS.length].id };
  }
  function stdMeta() { const m = newMeta(); m.lv = Object.assign({}, STD_LV); m.flv = {}; m.modules = {}; m.equip = []; m.chal = {}; return m; }
  // Tagesbonus: einmal pro Tag Kristalle wie nach 4 Stunden Abwesenheit
  const dailyBonus = m => Math.max(50, Math.floor(4 * offlinePerHour(m)));

  class Run {
    constructor(meta, opts) {
      opts = opts || {};
      // Sondermodus: { kind: 'chal', id } oder { kind: 'daily', day }
      this.mode = opts.mode || null;
      this.home = meta;
      if (this.mode && this.mode.kind === 'daily') {
        const D = dailyOf(this.mode.day); this.mode.day = D.day; this.mode.twist = D.twist; this.seed = D.seed;
        meta = stdMeta();
      }
      this.meta = meta;
      this.rng = Math.random;
      const tw = this.twist(), cid = this.mode && this.mode.kind === 'chal' ? this.mode.id : tw && tw.block;
      this.block = (cid && BLOCK[cid]) || null; this.rule = cid || null;
      this.fxOn = !opts.noFx;
      this.lv = {};
      RUN_UPG.forEach(u => (this.lv[u.id] = 0));
      const h = mlv(meta, 'm_head');
      this.free = { dmg: h, rate: h, hp: h, regen: h };
      this.energy = startEnergy(meta);
      this.wave = 0; this.time = 0;
      this.enemies = []; this.bullets = []; this.ebullets = []; this.mines = []; this.fx = [];
      this.kills = 0; this.crystals = 0; this.dead = false;
      this.fireT = 0; this.shockT = 0; this.mineT = 0; this.bladeA = 0;
      this.aim = -Math.PI / 2; this.shots = 0; this.charge = 0;
      this.focus = null; this.focusUntil = 0; this.uid = 0;
      this.cd = { freeze: 0, over: 0 }; this.freezeUntil = 0; this.overUntil = 0;
      this.dealt = {}; SOURCES.forEach(k => (this.dealt[k] = 0));
      this.holding = false; this.god = false; this.ring = null;
      this.rockets = []; this.bolts = []; this.rocketT = 0; this.cryoT = 0; this.reinfT = 0; this.loot = []; this.novaT = 0;
      this.startWave = 1;
      const S = this.mode ? 1 : Math.min(opts.startWave || 1, maxStartWave(meta));
      if (S > 1) {
        const jb = jumpBonus(meta, S);
        this.energy += jb.energy; this.crystals += jb.crystals;
        this.wave = S - 1; this.startWave = S; this.skipCrystalsOnce = true;
      }
      this.recalc();
      this.hp = this.s.maxHp;
      this.nextWave();
    }

    // ---------- Speichern / Laden ----------
    snapshot() {
      const keep = ['lv', 'free', 'energy', 'wave', 'time', 'waveT', 'kills', 'crystals', 'fireT', 'shockT', 'mineT', 'bladeA', 'aim', 'charge', 'hp',
        'queue', 'spawnGap', 'spawnT', 'uid', 'cd', 'freezeUntil', 'overUntil', 'dealt', 'holding', 'startWave', 'god', 'taken', 'blocked', 'rocketT', 'cryoT', 'reinfT', 'loot', 'novaT', 'mode', 'waveType', 'waveMod', 'bossKills', 'noLoot'];
      const o = {}; keep.forEach(k => (o[k] = this[k]));
      o.enemies = this.enemies.map(e => Object.assign({}, e));
      o.ebullets = this.ebullets.map(b => Object.assign({}, b));
      o.mines = this.mines.map(m => Object.assign({}, m));
      return JSON.parse(JSON.stringify(o));
    }
    static restore(meta, o) {
      const r = new Run(meta, { noFx: true, mode: o.mode });
      Object.assign(r, o);
      r.fxOn = true; r.bullets = []; r.rockets = []; r.bolts = []; r.fx = []; r.focus = null; r.dead = false; r.ring = null;
      r.cd = Object.assign({ freeze: 0, over: 0 }, o.cd || {});
      r.dealt = Object.assign({}, r.dealt, o.dealt || {});
      SOURCES.forEach(k => { if (r.dealt[k] == null) r.dealt[k] = 0; });
      r.recalc();
      return r;
    }

    twist() { return this.mode && this.mode.kind === 'daily' ? TWISTS.find(t => t.id === dailyOf(this.mode.day).twist) : null; }
    isBlocked(u) { return !!(this.block && u && this.block(u)); }
    // Freigeschaltete Zusatzwaffen beginnen auf Stufe 1
    L(id) {
      const u = UPG_BY_ID[id];
      if (this.isBlocked(u)) return 0;
      if (id === 'mine' && this.rule === 'mines') return this.lv.mine + 1;
      const unlockFree = u && (u.req && mlv(this.meta, u.req) > 0 || u.freq && flv(this.meta, u.freq) > 0) ? 1 : 0;
      return this.lv[id] + (this.free[id] || 0) + unlockFree;
    }

    recalc() {
      const M = id => mlv(this.meta, id), L = id => this.L(id);
      const s = {};
      const F = id => flv(this.meta, id);
      s.fusion = Math.pow(P.fCore, F('f_core'));
      const cb = chalBonus(this.meta); s.chal = cb;
      s.dmg = P.pDmg * Math.pow(P.lvDmg, L('dmg')) * Math.pow(1.08, M('m_dmg')) * s.fusion * cb.dmg;
      s.rate = 1.2 * (1 + 0.05 * L('rate')) * (1 + 0.03 * M('m_rate')) * cb.rate;
      s.range = 150 + 5 * L('range');
      s.crit = 0.025 * L('crit');
      s.critx = 1.5 + 0.1 * L('critx');
      s.gunDmg = s.dmg * P.gunK; // Treffer der Hauptkanone
      s.multi = L('multi');
      s.multiDmg = P.multiDmg; // Nebenrohre treffen schwächer als das Hauptrohr
      s.maxHp = P.pHp * Math.pow(P.lvHp, L('hp')) * Math.pow(1.08, M('m_hp')) * s.fusion * cb.hp * (this.rule === 'glass' ? 0.25 : 1);
      const rg = L('regen');
      s.regen = s.maxHp * P.rgMax * (rg / (rg + P.rgK)) * (1 + 0.1 * M('m_regen'));
      const ar = L('armor');
      s.armor = Math.min(P.arCap, P.arMax * ar / (ar + P.arK) + 0.01 * M('m_armor'));
      s.knock = L('knock') ? 1.5 + 0.35 * L('knock') : 0;
      const tw = this.twist();
      s.loot = (1 + P.lootK * L('loot')) * (1 + 0.08 * M('m_loot')) * cb.loot * (this.rule === 'poor' ? 0.5 : 1) * ((tw && tw.loot) || 1);
      // Wellenprämie: Anteil der Abschuss-Energie einer typischen Welle, als fester Bonus pro überstandener Welle
      s.waveBonus = P.bonusK * L('interest');
      s.crysMult = (1 + 0.06 * L('crys')) * (1 + 0.1 * M('m_crys')) * (1 + P.fCrys * F('f_crys')) * cb.crys;
      // Schockwelle: Druckring, der mit der Reichweite wächst
      const sh = L('shock');
      s.shockCd = sh ? Math.max(2.5, 6.5 - 0.13 * sh) : 0;
      s.shockR = Math.min(s.range, s.range * (0.7 + 0.01 * sh));
      s.shockDmg = s.dmg * P.shockK * (1 + P.shockLv * sh);
      // Orbitklingen: pendeln über der Kanone, Radius folgt der Reichweite
      const bl = L('blade');
      s.blades = bl ? Math.min(6, 1 + Math.floor(bl / 5)) : 0;
      s.bladeR = Math.max(WALL_R + 28, s.range * 0.55);
      s.bladeDmg = s.dmg * 0.5 * (1 + 0.1 * bl);
      s.bladeSize = 9 + Math.min(7, bl * 0.25);
      s.bladeHz = 1 / 0.35;
      // Minen
      const mi = L('mine');
      s.mineCd = mi ? Math.max(1, 4 - 0.1 * mi) : 0;
      s.mineDmg = s.dmg * P.mineK * (2 + P.mineLv * mi);
      s.mineMax = mi ? 4 + Math.floor(mi / 5) : 0;
      s.mineTrig = 16;
      s.mineBlast = 45 + mi;
      s.strikeDmg = s.dmg * 25;
      // Raketenwerfer (links): langsam, zielsuchend, großer Explosionsradius
      const ro = L('rocket');
      s.rocketCd = ro ? Math.max(2.6, 5 - 0.08 * ro) : 0;
      s.rocketDmg = s.dmg * (1.6 + P.rockLv * ro);
      s.rocketR = 60 + 2 * ro;
      // Kryowerfer (rechts): schneller Frostbolzen, verlangsamt im kleinen Umkreis
      const cr = L('cryo');
      s.cryoCd = cr ? Math.max(0.7, 1.6 - 0.03 * cr) : 0;
      s.cryoDmg = s.dmg * (0.3 + 0.025 * cr);
      s.cryoSlow = Math.min(0.6, 0.3 + 0.01 * cr);
      s.cryoR = 40 + cr;
      s.cryoRange = s.range * 1.35 + 20; // reicht weiter als die Hauptkanone
      // Ausgerüstete Module
      const mod = {}; const eq = this.meta.equip || [];
      for (const t of eq) { const m = this.meta.modules && this.meta.modules[t]; if (m) mod[t] = moduleValue(m); }
      s.mod = mod;
      if (mod.scanner) s.crit += mod.scanner;
      if (mod.plating) s.armor = Math.min(P.arCap + 0.1, s.armor + mod.plating);
      if (mod.leech) s.loot *= 1 + mod.leech;
      if (mod.crysmod) s.crysMult *= 1 + mod.crysmod;
      if (this.rule === 'glass') s.regen = 0;
      s.noGun = this.rule === 'mines';
      if (s.noGun) { s.rocketCd = 0; s.cryoCd = 0; s.shockCd = 0; s.blades = 0; }
      s.dps = s.gunDmg * s.rate * (1 + s.crit * (s.critx - 1)) * (1 + s.multi * s.multiDmg);
      this.s = s;
    }

    cost(u) { return Math.ceil(u.base * Math.pow(u.g, this.lv[u.id]) * cheapMult(this.meta)); }
    available(u) {
      if (this.isBlocked(u)) return false;
      if (u.id === 'mine' && this.rule === 'mines') return true;
      return (!u.req || mlv(this.meta, u.req) > 0) && (!u.freq || flv(this.meta, u.freq) > 0);
    }
    maxed(u) { return u.max != null && this.L(u.id) >= u.max; }
    canBuy(u) { return this.available(u) && !this.maxed(u) && this.energy >= this.cost(u); }
    buy(u) {
      if (!this.canBuy(u)) return false;
      this.energy -= this.cost(u);
      const before = this.s.maxHp;
      this.lv[u.id]++;
      this.recalc();
      if (this.s.maxHp > before) this.hp += this.s.maxHp - before;
      return true;
    }

    waveBonusAmount(w) { return this.s.waveBonus ? waveEnergy(w || this.wave) * this.s.loot * this.s.waveBonus : 0; }

    bossAlive() { return this.enemies.some(e => e.type === 'boss' && e.hp > 0) || (this.queue || []).includes('boss'); }

    nextWave() {
      if (this.wave > 0 && !this.skipCrystalsOnce) {
        this.crystals += waveCrystals(this.wave) * this.s.crysMult;
        const bonus = this.waveBonusAmount();
        if (bonus > 0) { this.energy += bonus; if (this.fxOn) this.fx.push({ k: 'bonus', t: 0, v: bonus }); }
      }
      this.skipCrystalsOnce = false;
      this.wave++;
      this.waveT = 0;
      this.holding = false;
      const w = this.wave;
      const boss = w % 10 === 0;
      // Tageslauf: jede Welle aus eigenem Startwert, damit alle dieselben Wellen bekommen
      if (this.seed != null) this.rng = mulberry32(hashStr(this.seed + ':' + w));
      const rnd = this.rng, tw = this.twist();
      const wt = boss ? 'normal' : pickWaveType(w, rnd, tw && tw.bias), WT = WAVE_TYPES[wt];
      const n = Math.max(3, Math.round(shipCount(w) * WT.n));
      // Gesamt-LP und Energie der Welle bleiben gleich, verteilt auf weniger bzw. mehr Schiffe
      const comp = waveCount(w) / n;
      this.waveType = wt;
      this.waveMod = { hp: comp * (wt === 'swarm' ? 0.8 : wt === 'heavy' ? 0.95 : 1), rw: comp, dmg: Math.pow(comp, P.wmDmg), spd: WT.spd, big: WT.big || 1 };
      const list = [];
      const sec = sectorOf(w).n;
      // Sektor-Gegner: der neue Typ des Sektors häufig, frühere Typen seltener
      const special = [];
      for (let k = 2; k <= sec; k++) special.push({ t: SECTORS[k - 1].enemy, p: k === sec ? 0.14 : 0.06 });
      for (let i = 0; i < n; i++) {
        let r = rnd(), t = 'grunt';
        if (w >= 15 && r < 0.08) t = 'shooter';
        else if (w >= 6 && r < 0.22) t = 'brute';
        else if (w >= 3 && r < 0.45) t = 'runner';
        else { let q = rnd(); for (const sp of special) { if (q < sp.p) { t = sp.t; break; } q -= sp.p; } }
        if (WT.mix) { let q = rnd(); for (const k in WT.mix) { if (q < WT.mix[k]) { t = k; break; } q -= WT.mix[k]; } }
        list.push(t);
      }
      if (boss) list.splice(Math.floor(n / 3), 0, 'boss');
      this.queue = list;
      this.spawnGap = SPAWN_LEN / list.length;
      this.spawnT = 0;
      if (this.fxOn) this.fx.push({ k: 'wave', t: 0, w, boss, kind: WT.name, sector: (w - 1) % 50 === 0 && w > 1 ? sectorOf(w) : null });
    }

    // Neues Schiff an Weltposition (x, y) erzeugen
    spawnAt(type, x0, y0, o) {
      const d = ENEMY[type], w = this.wave;
      // Frühe Mutterschiffe schwächer, volle Stärke ab etwa Welle 60
      const wm = type === 'boss' || type === 'bomb' || !this.waveMod ? { hp: 1, rw: 1, dmg: 1, spd: 1, big: 1 } : this.waveMod;
      const tw = this.twist();
      const hp = d.hp * hpScale(w) * wm.hp * (type === 'boss' ? Math.min(1, 0.22 + w / 80) : 1) * ((tw && tw.ehp) || 1);
      const spdK = (this.rule === 'fast' ? 2 : 1) * ((tw && tw.spd) || 1);
      const e = {
        id: ++this.uid, type, a: Math.atan2(y0, x0), dist: Math.hypot(x0, y0), hp, maxHp: hp,
        spd: d.spd * (1 + Math.min(0.6, w * 0.006)) * wm.spd * spdK,
        dmg: d.dmg * dmgScale(w) * wm.dmg, rw: d.rw * rwScale(w) * wm.rw, r: d.r * (wm.big > 1 && type === 'brute' ? wm.big : 1) * (type !== 'boss' && wm.hp > 1.6 ? 1.1 : 1), stop: d.stop || 0,
        atkT: 0.5, shotT: 1 + Math.random(), bladeHit: 0, kbT: 0, flash: 0, seed: Math.random() * 6.28, fac: sectorOf(w).n,
      };
      if (type === 'boss') {
        e.stop = Math.max(115, Math.min(210, this.s.range - 20));
        e.actT = 2.5; e.hoverT = 0; e.shieldUntil = 0; e.a0 = e.a; e.acts = 0; e.sector = sectorOf(w).n;
      }
      if (o) Object.assign(e, o);
      this.enemies.push(e);
      return e;
    }
    spawn(type) { this.spawnAt(type, (this.rng() * 2 - 1) * FIELD_W, -FIELD_H - this.rng() * 30); }
    // Getarnte Schiffe sind auf Distanz nicht anvisierbar (Flächenschaden trifft sie trotzdem)
    cloaked(e) { if (this.s.mod && this.s.mod.scanner) return false; return (e.type === 'phantom' && e.dist > ENEMY.phantom.cloakFrom) || (e.cloakUntil && e.cloakUntil > this.time); }

    pos(e) { return { x: Math.cos(e.a) * e.dist, y: Math.sin(e.a) * e.dist }; }



    hurt(e, d, crit, src) {
      if (e.hp <= 0) return;
      if (e.shieldUntil && e.shieldUntil > this.time) { d *= 0.15; if (this.fxOn && Math.random() < 0.25) { const p = this.pos(e); this.fx.push({ k: 'shieldhit', x: p.x, y: p.y, t: 0 }); } }
      if (e.type === 'bulwark' && e.guard > 0) {
        // Frontschild fängt Schaden ab, bis es bricht
        const ab = Math.min(e.guard, d); e.guard -= ab; d -= ab; e.guardHit = this.time;
        if (this.fxOn && e.guard <= 0) { const p = this.pos(e); this.fx.push({ k: 'shieldhit', x: p.x, y: p.y, t: 0 }); }
        if (d <= 0) return;
      }
      if (e.laser) e.laserDmg = (e.laserDmg || 0) + d;
      const eff = Math.min(d, e.hp);
      this.dealt[src || 'gun'] += eff;
      e.hp -= d; e.flash = 0.08;
      if (this.fxOn && (crit || e.type === 'boss' || e.type === 'brute')) { const p = this.pos(e); this.fx.push({ k: 'dmg', x: p.x, y: p.y, t: 0, v: d, crit }); }
      if (e.hp <= 0) {
        this.energy += e.rw * this.s.loot;
        this.kills++;
        if (this.fxOn && this.s.mod && (this.s.mod.leech || this.s.mod.crysmod) && Math.random() < 0.5) { const p = this.pos(e); this.fx.push({ k: this.s.mod.leech ? 'leech' : 'crysfx', x: p.x, y: p.y, t: 0 }); }
        if (!this.s.noGun) this.charge = Math.min(1, this.charge + (e.type === 'boss' ? 0.35 : e.type === 'bomb' ? 0 : 1 / STRIKE_KILLS));
        if (this.s.mod.splinter && src !== 'mod') {
          const p = this.pos(e), dmg = this.s.gunDmg * this.s.mod.splinter * P.splK;
          for (const o of this.enemies) if (o !== e && o.hp > 0) { const q = this.pos(o); if (Math.hypot(q.x - p.x, q.y - p.y) < 45 + o.r) this.hurt(o, dmg, false, 'mod'); }
          if (this.fxOn) this.fx.push({ k: 'splinter', x: p.x, y: p.y, t: 0 });
        }
        if (e.type === 'boss') {
          this.crystals += P.cBoss * waveCrystals(this.wave) * this.s.crysMult;
          const modOk = Math.max(record(this.meta), this.wave) >= MODULES_AT;
          const first = !this.meta.modules || !Object.keys(this.meta.modules).length;
          if (modOk) this.bossKills = (this.bossKills || 0) + 1;
          if (this.admin) this.noLoot = 'admin';
          else if (this.mode) this.noLoot = 'mode';
          else if (modOk) {
            // Pech-Ausgleich: jedes Mutterschiff ohne Beute erhöht die Chance beim nächsten um 10 Prozentpunkte
            const ch = dropChance(this.wave) + 0.1 * (this.meta.dry || 0);
            if (first && !this.loot.length || Math.random() < ch) {
              const drop = rollModule(this.wave); this.loot.push(drop); this.meta.dry = 0;
              if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'loot', x: p.x, y: p.y, t: 0, drop }); }
            } else this.meta.dry = (this.meta.dry || 0) + 1;
          }
          if (e.sector === 4) { const p = this.pos(e); for (let i = -1; i <= 1; i++) this.spawnAt('splitter', p.x + i * 30, p.y, {}); }
        }
        if (e.type === 'splitter') {
          const p = this.pos(e), hp = e.maxHp * 0.3;
          for (const dx of [-12, 12]) this.spawnAt('shard', p.x + dx, p.y, { hp, maxHp: hp });
        }
        if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0, type: e.type, r: e.r, a: e.a }); }
        if (this.focus === e) this.focus = null;
      }
    }

    hitBase(d) {
      if (this.god) return;
      this.taken = (this.taken || 0) + d * (1 - this.s.armor);
      this.blocked = (this.blocked || 0) + d * this.s.armor;
      this.hp -= d * (1 - this.s.armor);
      if (this.fxOn) this.fx.push({ k: 'hurt', t: 0 });
      if (this.s.mod && this.s.mod.nova && this.hp > 0 && this.hp < this.s.maxHp * 0.3 && this.time >= this.novaT) {
        this.novaT = this.time + 20;
        for (const e of this.enemies) if (e.hp > 0 && e.dist - e.r <= this.s.range) { this.hurt(e, this.s.dmg * this.s.mod.nova, false, 'mod'); if (e.hp > 0 && e.type !== 'boss') e.dist += 40; }
        if (this.fxOn) this.fx.push({ k: 'nova', t: 0, r: this.s.range });
      }
      if (this.hp <= 0 && !this.dead) { this.hp = 0; this.dead = true; }
    }

    // ---------- Spieleraktionen ----------
    markAt(x, y) {
      let best = null, bd = 40;
      for (const e of this.enemies) { if (e.hp <= 0) continue; const p = this.pos(e), d = Math.hypot(p.x - x, p.y - y) - e.r; if (d < bd) { bd = d; best = e; } }
      if (best) { this.focus = best; this.focusUntil = this.time + 6; }
      return best;
    }
    strike(x, y) {
      if (this.charge < 1 || this.dead) return false;
      this.charge = 0;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const p = this.pos(e);
        if (Math.hypot(p.x - x, p.y - y) <= STRIKE_R + e.r) this.hurt(e, this.s.strikeDmg + e.maxHp * (e.type === 'boss' ? P.strikePct * 0.32 : P.strikePct), true, 'strike');
      }
      if (this.fxOn) this.fx.push({ k: 'strike', x, y, t: 0 });
      return true;
    }
    abilityUnlocked(id) { return mlv(this.meta, ABIL[id].unlock) > 0; }
    abilityLv(id) { return mlv(this.meta, ABIL[id].lvl); }
    abilityReady(id) { return this.abilityUnlocked(id) && this.cd[id] <= 0 && !this.dead; }
    useAbility(id) {
      if (!this.abilityReady(id)) return false;
      const A = ABIL[id], l = this.abilityLv(id);
      this.cd[id] = A.cd(l) * (1 - Math.min(0.6, (this.s.mod && this.s.mod.echo) || 0));
      if (id === 'freeze') this.freezeUntil = this.time + A.dur(l);
      if (id === 'over') this.overUntil = this.time + A.dur(l);
      if (this.fxOn) this.fx.push({ k: id, t: 0 });
      return true;
    }
    get frozen() { return this.freezeUntil > this.time; }
    get overActive() { return this.overUntil > this.time; }
    get rateNow() { return this.s.rate * (this.overActive ? ABIL.over.mult(this.abilityLv('over')) : 1); }

    // Mutterschiff: schwebt in Reichweite und wechselt zwischen Fähigkeiten
    bossAct(e) {
      const w = this.wave, p = this.pos(e);
      const acts = ['salvo', 'spawn'];
      if (w >= 20) acts.push('bomb');
      if (w >= 30) acts.push('shield');
      if (w >= 40) acts.push('laser');
      const extra = SECTORS[e.sector - 1].boss;
      if (extra) acts.push(extra, extra);
      let act = acts[e.acts % acts.length];
      if (e.acts >= acts.length) act = acts[Math.floor(Math.random() * acts.length)];
      e.acts++;
      if (act === 'salvo') {
        // gezielter Fächer auf die Kanone
        const n = 5 + Math.min(4, Math.floor(w / 25));
        for (let i = 0; i < n; i++) this.ebullets.push({ x: p.x + (i - (n - 1) / 2) * 12, y: p.y + 10, dmg: e.dmg * 0.4, big: true });
      } else if (act === 'spawn') {
        const n = 4 + Math.min(6, Math.floor(w / 12));
        for (let i = 0; i < n; i++) {
          const t = i % 3 === 2 ? 'brute' : i % 2 ? 'runner' : 'grunt';
          const hp = ENEMY[t].hp * hpScale(w) * 0.7;
          this.spawnAt(t, p.x + (i - (n - 1) / 2) * 16, p.y - 10, { hp, maxHp: hp });
        }
      } else if (act === 'bomb') {
        for (const dx of w >= 50 ? [-25, 25] : [0]) {
          const hp = e.maxHp * 0.04;
          this.spawnAt('bomb', p.x + dx, p.y + e.r, { hp, maxHp: hp, dmg: e.dmg * 3.5, rw: 0.5 * rwScale(w), bomb: true });
        }
      } else if (act === 'shield') {
        e.shieldUntil = this.time + 4;
      } else if (act === 'laser') {
        // Laser lädt 2 s; wer in der Zeit 6 % der Boss-LP abzieht, bricht ihn ab
        e.laser = 2; e.laserDmg = 0;
      } else if (act === 'cloak') {
        e.cloakUntil = this.time + 3.5;
      } else if (act === 'bulwarks') {
        for (const dx of [-35, 35]) this.spawnAt('bulwark', p.x + dx, p.y + 10, {});
      } else if (act === 'nova') {
        for (let i = 0; i < 10; i++) { const an = Math.PI * (0.05 + 0.9 * i / 9); this.ebullets.push({ x: p.x + Math.cos(an) * 30, y: p.y + Math.sin(an) * 30, dmg: e.dmg * 0.25, big: true }); }
      } else if (act === 'mend') {
        for (const o of this.enemies) if (o.hp > 0) { const q = this.pos(o); if (Math.hypot(q.x - p.x, q.y - p.y) < 160) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o === e ? 0.06 : 0.3)); }
      }
      if (this.fxOn) this.fx.push({ k: 'bossact', act, x: p.x, y: p.y, t: 0 });
    }

    update(dt) {
      if (this.dead) return;
      const s = this.s, frozen = this.frozen;
      this.time += dt;
      this.waveT += dt;
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      this.spawnT += dt;
      while (this.queue.length && this.spawnT >= this.spawnGap) { this.spawnT -= this.spawnGap; this.spawn(this.queue.shift()); }
      if (this.waveT >= WAVE_LEN) {
        if (this.bossAlive()) {
          this.waveT = WAVE_LEN; this.holding = true;
          // Verstärkung, solange das Mutterschiff lebt: keine Verschnaufpause
          this.reinfT += dt;
          if (this.wave >= 20 && this.reinfT >= 3.5 && !frozen && this.enemies.length < 35) {
            this.reinfT = 0;
            for (let i = 0; i < 2 + Math.floor(this.wave / 30); i++) this.spawn(Math.random() < 0.3 ? 'runner' : 'grunt');
          }
        } else { this.reinfT = 0; this.nextWave(); }
      }

      this.hp = Math.min(s.maxHp, this.hp + s.regen * dt);

      if (!frozen) for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        e.flash = Math.max(0, e.flash - dt);
        const contact = WALL_R + e.r * 0.3;
        if (e.type === 'boss') {
          if (e.dist > e.stop && !e.enraged) { e.dist = Math.max(e.stop, e.dist - e.spd * dt); }
          else {
            e.hoverT += dt;
            e.a = e.a0 + Math.sin(e.hoverT * 0.45) * 0.35;
            if (e.hoverT > (this.wave < 30 ? 65 : 40)) e.enraged = true;
            if (e.laser > 0) {
              e.laser -= dt;
              if (e.laserDmg >= e.maxHp * 0.06) { e.laser = 0; if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'bossact', act: 'broken', x: p.x, y: p.y, t: 0 }); } }
              else if (e.laser <= 0) { this.hitBase(e.dmg * 4); if (this.fxOn) this.fx.push({ k: 'laserhit', t: 0, a: e.a, d: e.dist }); }
            }
            if (e.enraged) {
              if (e.dist > contact) e.dist = Math.max(contact, e.dist - e.spd * 0.8 * dt);
              else { e.atkT -= dt; if (e.atkT <= 0) { e.atkT = 1; this.hitBase(e.dmg); } }
            }
            e.actT -= dt;
            if (e.actT <= 0) { e.actT = Math.max(2.5, 4.5 - this.wave * 0.02); this.bossAct(e); }
          }
          continue;
        }
        // Heiler: repariert Schiffe in der Nähe
        if (e.type === 'mender') {
          const p = this.pos(e);
          for (const o of this.enemies) if (o !== e && o.hp > 0 && o.hp < o.maxHp) { const q = this.pos(o); if (Math.hypot(q.x - p.x, q.y - p.y) < 90) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.05 * dt); }
        }
        // Schildträger: Frontschild lädt nach 2 s ohne Treffer wieder auf
        if (e.type === 'bulwark') {
          if (e.guard == null) { e.guardMax = e.maxHp * 0.6; e.guard = e.guardMax; }
          if (this.time - (e.guardHit || 0) > 2) e.guard = Math.min(e.guardMax, e.guard + e.guardMax * 0.15 * dt);
        }
        const slow = e.slowUntil > this.time ? 1 - e.slow : 1;
        // Beschuss im Anflug: Jäger und Kanonenboote feuern, sobald sie nah genug sind
        const gun = GUNS[e.type];
        if (gun && e.dist <= gun.from && e.dist > contact + 4) {
          e.shotT -= dt;
          if (e.shotT <= 0) {
            e.shotT = gun.cd * (0.85 + Math.random() * 0.3);
            const p = this.pos(e); this.ebullets.push({ x: p.x, y: p.y, dmg: e.dmg * gun.dmg, big: gun.big });
            if (this.fxOn) this.fx.push({ k: 'eshot', t: 0, type: e.type });
          }
        }
        if (e.stop && e.dist <= e.stop) {
          // Artillerieschiff hält Abstand und feuert nur
        } else if (e.dist > contact) {
          e.dist = Math.max(contact, e.dist - e.spd * slow * dt);
        } else if (e.bomb || e.type === 'runner') {
          // Bombe und Abfangjäger sprengen sich beim Aufprall
          this.hitBase(e.dmg * (e.bomb ? 1 : P.kamikaze)); e.hp = 0;
          if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0, type: e.bomb ? 'bomb' : 'runner', r: e.bomb ? 18 : 9 }); }
        } else if (e.bomb) {
          this.hitBase(e.dmg); e.hp = 0;
          if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0, type: 'bomb', r: 18 }); }
        } else {
          e.atkT -= dt;
          if (e.atkT <= 0) { e.atkT = 1; this.hitBase(e.dmg); }
        }
      }

      if (!frozen) for (const b of this.ebullets) {
        const d = Math.hypot(b.x, b.y), v = (b.big ? 120 : 150) * dt;
        if (d <= WALL_R + v) { b.done = true; this.hitBase(b.dmg); if (this.fxOn) this.fx.push({ k: 'wallhit', a: Math.atan2(b.y, b.x), t: 0 }); }
        else { b.x -= (b.x / d) * v; b.y -= (b.y / d) * v; }
      }
      this.ebullets = this.ebullets.filter(b => !b.done);

      // Feuern (markiertes Ziel zuerst, Bomben vor normalen Schiffen)
      if (this.focus && (this.focus.hp <= 0 || this.time > this.focusUntil)) this.focus = null;
      this.fireT += dt * this.rateNow;
      if (s.noGun) this.fireT = 0;
      if (this.fireT >= 1) {
        const inRange = this.enemies.filter(e => e.hp > 0 && e.dist - e.r <= s.range && !this.cloaked(e)).sort((a, b) => (a.bomb ? a.dist - 1000 : a.dist) - (b.bomb ? b.dist - 1000 : b.dist));
        // Bosskampf: nach Wellenende hat das Mutterschiff Vorrang, außer ein Schiff ist schon nah an der Kanone
        if (this.holding && !this.focus) {
          const boss = inRange.find(e => e.type === 'boss');
          if (boss && !inRange.some(e => e !== boss && e.dist < 95)) { inRange.splice(inRange.indexOf(boss), 1); inRange.unshift(boss); }
        }
        if (this.focus && inRange.includes(this.focus)) { inRange.splice(inRange.indexOf(this.focus), 1); inRange.unshift(this.focus); }
        if (inRange.length) {
          this.aim = inRange[0].a;
          while (this.fireT >= 1) {
            this.fireT -= 1; this.shots++;
            for (let i = 0; i < Math.min(inRange.length, 1 + s.multi); i++) {
              const crit = Math.random() < s.crit;
              const mx = Math.cos(this.aim) * BASE_R * 2.4, my = -8 + Math.sin(this.aim) * BASE_R * 2.4;
              const oc = s.mod.overcharge && i === 0 && this.shots % 12 === 0 ? s.mod.overcharge : 1;
              this.bullets.push({ x: mx, y: my, tgt: inRange[i], dmg: s.gunDmg * (i ? s.multiDmg : 1) * (crit ? s.critx : 1) * oc, crit: crit || oc > 1, oc: oc > 1 });
            }
          }
        } else this.fireT = 1;
      }
      for (const b of this.bullets) {
        const t = b.tgt;
        if (t.hp <= 0) { b.done = true; continue; }
        const p = this.pos(t), dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy), v = 650 * dt;
        if (d <= v + t.r) {
          b.done = true;
          this.hurt(t, b.dmg, b.crit, 'gun');
          if (s.mod.cryoammo && t.hp > 0) { t.slow = Math.max(t.slowUntil > this.time ? t.slow : 0, s.mod.cryoammo * (t.type === 'boss' ? 0.4 : 1)); t.slowUntil = this.time + 1.5; }
          if (s.mod.chain && Math.random() < s.mod.chain) {
            const others = this.enemies.filter(o => o !== t && o.hp > 0).map(o => ({ o, d: Math.hypot(this.pos(o).x - p.x, this.pos(o).y - p.y) })).filter(x => x.d < 110).sort((a, b) => a.d - b.d).slice(0, 2);
            for (const x of others) { this.hurt(x.o, b.dmg * 0.5, false, 'gun'); if (this.fxOn) { const q = this.pos(x.o); this.fx.push({ k: 'chain', x1: p.x, y1: p.y, x2: q.x, y2: q.y, t: 0 }); } }
          }
          if (s.knock && t.hp > 0 && t.kbT <= this.time && t.type !== 'boss') { t.kbT = this.time + 0.8; t.dist += s.knock * (t.type === 'brute' ? 0.4 : 1); }
        } else { b.x += dx / d * v; b.y += dy / d * v; }
      }
      this.bullets = this.bullets.filter(b => !b.done);

      // Nebenkanonen
      if (s.rocketCd) {
        this.rocketT += dt;
        if (this.rocketT >= s.rocketCd) {
          // Ziel: Schiff mit den meisten Nachbarn in Reichweite
          const cand = this.enemies.filter(e => e.hp > 0 && e.dist - e.r <= s.range + 40 && !this.cloaked(e));
          if (cand.length) {
            this.rocketT = 0;
            let best = cand[0], bn = -1;
            for (const e of cand) { const p = this.pos(e); let n = 0; for (const o of cand) { const q = this.pos(o); if (Math.hypot(q.x - p.x, q.y - p.y) < s.rocketR) n++; } if (n > bn) { bn = n; best = e; } }
            this.rockets.push({ x: -40, y: -6, vx: 0, vy: -60, tgt: best, life: 6 });
            if (this.fxOn) this.fx.push({ k: 'rlaunch', t: 0 });
          } else this.rocketT = s.rocketCd;
        }
      }
      for (const m of this.rockets) {
        m.life -= dt; m.age = (m.age || 0) + dt;
        // Zielsuchend: stirbt das Ziel, nimmt die Rakete das nächste Schiff in ihrer Nähe
        if (!m.tgt || m.tgt.hp <= 0) {
          let best = null, bd = 1e9;
          for (const e of this.enemies) { if (e.hp <= 0 || this.cloaked(e)) continue; const p = this.pos(e), d = Math.hypot(p.x - m.x, p.y - m.y); if (d < bd) { bd = d; best = e; } }
          m.tgt = best;
        }
        const t = m.tgt ? this.pos(m.tgt) : null;
        const sp = Math.min(340, 120 + 260 * m.age);
        if (t) {
          // Lenkung mit begrenzter Drehrate, nach dem Start schnell zunehmend
          const cur = Math.atan2(m.vy, m.vx), want = Math.atan2(t.y - m.y, t.x - m.x);
          let da = want - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          const turn = (m.age < 0.25 ? 3 : 9) * dt, a = cur + Math.max(-turn, Math.min(turn, da));
          m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
        } else { const v = Math.hypot(m.vx, m.vy) || 1; m.vx = m.vx / v * sp; m.vy = m.vy / v * sp; }
        m.x += m.vx * dt; m.y += m.vy * dt;
        // Annäherungszünder: explodiert am ersten Schiff, das sie berührt
        let hit = false;
        for (const e of this.enemies) { if (e.hp <= 0) continue; const p = this.pos(e); if (Math.hypot(p.x - m.x, p.y - m.y) < e.r + 8) { hit = true; break; } }
        if (hit || m.life <= 0 || (!t && m.y < -FIELD_H)) {
          m.done = true;
          for (const e of this.enemies) { const p = this.pos(e); if (e.hp > 0 && Math.hypot(p.x - m.x, p.y - m.y) < s.rocketR + e.r) this.hurt(e, s.rocketDmg, false, 'rocket'); }
          if (this.fxOn) this.fx.push({ k: 'mine', x: m.x, y: m.y, t: 0, r: s.rocketR, rocket: true });
        }
      }
      this.rockets = this.rockets.filter(m => !m.done);
      if (s.cryoCd) {
        this.cryoT += dt;
        if (this.cryoT >= s.cryoCd) {
          // Ziel: am weitesten entfernte, noch nicht verlangsamte Schiffe im Anflug (am Wall bringt Bremsen nichts)
          const cand = this.enemies.filter(e => e.hp > 0 && e.dist - e.r <= s.cryoRange && e.dist > WALL_R + 40 && !this.cloaked(e) && !(e.slowUntil > this.time + 0.5) && !(e.stop && e.dist <= e.stop)).sort((a, b) => b.dist - a.dist);
          if (cand.length) { this.cryoT = 0; this.bolts.push({ x: 40, y: -6, tgt: cand[0] }); } else this.cryoT = s.cryoCd;
        }
      }
      for (const b of this.bolts) {
        const t = b.tgt;
        if (t.hp <= 0) { b.done = true; continue; }
        const p = this.pos(t), dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy), v = 480 * dt;
        if (d <= v + t.r) {
          b.done = true;
          for (const e of this.enemies) { const q = this.pos(e); if (e.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) < s.cryoR + e.r) { this.hurt(e, s.cryoDmg, false, 'cryo'); e.slow = s.cryoSlow * (e.type === 'boss' ? 0.4 : 1); e.slowUntil = this.time + 2.5; } }
          if (this.fxOn) this.fx.push({ k: 'cryo', x: p.x, y: p.y, t: 0, r: s.cryoR });
        } else { b.x += dx / d * v; b.y += dy / d * v; }
      }
      this.bolts = this.bolts.filter(b => !b.done);

      // Schockwelle: Ring läuft in 0,6 s nach außen und trifft jeden Gegner einmal
      if (s.shockCd) {
        this.shockT += dt;
        if (this.shockT >= s.shockCd) {
          this.shockT = 0;
          this.ring = { r: 0, max: s.shockR, hit: {} };
          if (this.fxOn) this.fx.push({ k: 'shock', t: 0, r: s.shockR });
        }
      }
      if (this.ring) {
        const R = this.ring;
        R.r += (R.max / 0.6) * dt;
        for (const e of this.enemies) {
          if (e.hp <= 0 || R.hit[e.id]) continue;
          if (e.dist - e.r <= R.r) {
            R.hit[e.id] = 1;
            this.hurt(e, s.shockDmg, false, 'shock');
            if (e.hp > 0 && e.type !== 'boss') e.dist += 14;
          }
        }
        if (R.r >= R.max) this.ring = null;
      }
      // Orbitklingen: pendeln im oberen Halbkreis
      if (s.blades) {
        this.bladeA += dt * 1.6;
        for (const b of this.bladePos()) {
          for (const e of this.enemies) {
            if (e.hp <= 0 || e.bladeHit > this.time) continue;
            const p = this.pos(e);
            if (Math.hypot(p.x - b.x, p.y - b.y) < e.r + s.bladeSize) { this.hurt(e, s.bladeDmg, false, 'blade'); e.bladeHit = this.time + 0.35; }
          }
        }
      }
      // Minen: nur auf Anflugbahnen, die Gegner tatsächlich nehmen
      if (s.mineCd) {
        this.mineT += dt;
        if (this.mineT >= s.mineCd && this.mines.length < s.mineMax) {
          this.mineT = 0;
          const x0 = (Math.random() * 2 - 1) * FIELD_W, y0 = -FIELD_H;
          const a = Math.atan2(y0, x0), r = WALL_R + 25 + Math.random() * Math.max(10, s.range - WALL_R - 25);
          this.mines.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, arm: 0.6, age: 0 });
        }
        for (const m of this.mines) {
          m.arm -= dt; m.age += dt; if (m.arm > 0) continue;
          for (const e of this.enemies) {
            if (e.hp <= 0) continue;
            const p = this.pos(e);
            if (Math.hypot(p.x - m.x, p.y - m.y) < e.r + s.mineTrig) { m.done = true; break; }
          }
          if (m.done) {
            for (const e of this.enemies) { const p = this.pos(e); if (e.hp > 0 && Math.hypot(p.x - m.x, p.y - m.y) < s.mineBlast + e.r) this.hurt(e, s.mineDmg, false, 'mine'); }
            if (this.fxOn) this.fx.push({ k: 'mine', x: m.x, y: m.y, t: 0, r: s.mineBlast });
          }
        }
        this.mines = this.mines.filter(m => !m.done);
      }

      this.enemies = this.enemies.filter(e => e.hp > 0);
    }

    bladePos() {
      const s = this.s, n = s.blades, out = [];
      const swing = Math.sin(this.bladeA) * 0.75;
      for (let i = 0; i < n; i++) {
        const off = n > 1 ? (i / (n - 1) - 0.5) * 1.2 : 0;
        const a = -Math.PI / 2 + off + swing;
        out.push({ x: Math.cos(a) * s.bladeR, y: Math.sin(a) * s.bladeR, a });
      }
      return out;
    }

    // Admin: direkt zu einer Welle springen
    jumpTo(w) {
      this.enemies = []; this.ebullets = []; this.bullets = []; this.queue = [];
      this.wave = Math.max(0, w - 1); this.skipCrystalsOnce = true;
      this.nextWave();
    }

    finish() {
      this.dead = true;
      if (this.mode) return this.finishMode();
      const m = this.meta, c = Math.floor(this.crystals);
      m.crystals += c; m.totalCrystals = (m.totalCrystals || 0) + c;
      m.runs++; m.kills += this.kills;
      const newBest = this.wave > m.best && !this.admin;
      if (newBest) m.best = this.wave;
      if (!this.admin) m.bestEver = Math.max(m.bestEver || 0, this.wave);
      // Meilensteine: je 25 Wellen einmalig Kristalle (pro Fusionszyklus)
      const ms = []; m.milestones = m.milestones || {};
      if (!this.admin) for (let w = 25; w <= this.wave; w += 25) if (!m.milestones[w]) {
        const k = Math.round(milestoneReward(w) * (1 + P.fCrys * flv(m, 'f_crys')));
        m.milestones[w] = 1; m.crystals += k; ms.push({ w, k });
      }
      const loot = this.loot.map(d => ({ type: d.type, rar: d.rar, result: addModule(m, d) }));
      // Kristalle pro Stunde (Spielzeit) als gleitender Mittelwert: Grundlage für den Offline-Ertrag
      if (!this.admin && this.time > 90) { const cur = c / this.time * 3600; m.cph = m.cph ? m.cph * 0.6 + cur * 0.4 : cur; }
      return { crystals: c, wave: this.wave, kills: this.kills, time: this.time, newBest, milestones: ms, loot, bossKills: this.bossKills || 0, noLoot: this.noLoot || null };
    }
    // Sonderläufe: keine Bestwelle, keine Meilensteine, keine Module
    finishMode() {
      const m = this.home, w = this.wave, res = { wave: w, kills: this.kills, time: this.time, crystals: 0, mode: this.mode, milestones: [], loot: [] };
      m.runs++; m.kills += this.kills;
      if (this.mode.kind === 'chal') {
        const C = CHAL_BY_ID[this.mode.id];
        // Halbe Kristalle: der Lauf ist nicht verschenkt, lohnt sich aber vor allem wegen der Stufen
        const c = Math.floor(this.crystals * 0.5); m.crystals += c; m.totalCrystals = (m.totalCrystals || 0) + c; res.crystals = c;
        m.chal = m.chal || {};
        const st = m.chal[C.id] = m.chal[C.id] || { best: 0, tier: 0 };
        const before = st.tier;
        if (!this.admin) { st.best = Math.max(st.best, w); st.tier = Math.max(st.tier, C.goals.filter(g => w >= g).length); }
        res.tierBefore = before; res.tier = st.tier; res.best = st.best; res.newTier = st.tier > before;
      } else {
        const d = m.daily && m.daily.day === this.mode.day ? m.daily : (m.daily = { day: this.mode.day, best: 0, kills: 0, tries: 0, bonus: false });
        d.tries++;
        res.prevBest = d.best;
        if (!this.admin && (w > d.best || (w === d.best && this.kills > d.kills))) { d.best = w; d.kills = this.kills; res.newBest = true; }
        if (!this.admin && !d.bonus) { d.bonus = true; const k = dailyBonus(m); m.crystals += k; m.totalCrystals = (m.totalCrystals || 0) + k; res.crystals = k; res.bonus = true; }
        res.best = d.best;
      }
      return res;
    }
  }

  // Labor-Empfehlung: Gewicht je Upgrade (Nutzen) geteilt durch Kosten; Freischaltungen je nach Fortschritt
  const REC = {
    m_dmg:   { w: 1.0,  why: 'Schaden ist die Basis: mehr Schaden heißt weniger Treffer, die durchkommen.' },
    m_hp:    { w: 1.0,  why: 'Strukturpunkte halten Beschuss und Abfangjäger aus. Gleich wichtig wie Schaden.' },
    m_rate:  { w: 0.8,  why: 'Mehr Feuerrate wirkt wie mehr Schaden und füllt den Orbitalschlag schneller.' },
    m_regen: { w: 0.7,  why: 'Reparatur macht den Dauerbeschuss in späten Wellen erträglich.' },
    m_armor: { w: 0.7,  why: 'Panzerung senkt jeden Treffer, auch Boss-Salven und Laser.' },
    m_crys:  { w: 0.85, why: 'Mehr Kristalle beschleunigen alle weiteren Labor-Käufe.' },
    m_loot:  { w: 0.5,  why: 'Mehr Energie im Lauf bedeutet mehr Upgrades pro Welle.' },
    m_start: { w: 0.4,  why: 'Startkapital bringt einen schnellen Anfang.' },
    m_cheap: { w: 0.45, why: 'Günstigere Upgrades im Lauf wirken auf alles.' },
    m_head:  { w: 0.5,  why: 'Vorsprung startet jeden Lauf mit fertigen Grundstufen.' },
    m_freeze:{ w: 0.35, why: 'Längere Stasis rettet brenzlige Momente.' },
    m_over:  { w: 0.35, why: 'Stärkere Überladung hilft gegen Mutterschiffe.' },
    m_jump:  { w: m => (m.best >= 25 ? 0.7 : 0.1), why: 'Spätere Startwelle spart Zeit in jedem Lauf.' },
    u_shock: { w: 2.2,  why: 'Die Schockwelle trifft alle nahen Schiffe und stößt sie zurück.' },
    u_freeze:{ w: 1.6,  why: 'Stasis ist deine Notbremse, wenn es eng wird.' },
    u_jump:  { w: m => (m.best >= 25 ? 2.4 : 0.15), why: 'Das Sprungtor überspringt die leichten ersten Wellen.' },
    u_blade: { w: 1.3,  why: 'Orbitklingen schützen den Nahbereich.' },
    u_over:  { w: 1.3,  why: 'Überladung verdoppelt kurz die Feuerrate, ideal gegen Bosse.' },
    u_mine:  { w: 1.1,  why: 'Minen räumen Gruppen auf ihrem Weg zur Kanone ab.' },
  };
  function labOptions(meta) {
    return META_UPG.filter(u => gateOk(meta, u.id) && (!u.req || mlv(meta, u.req)) && (u.max == null || mlv(meta, u.id) < u.max)).map(u => {
      const r = REC[u.id] || { w: 0.3, why: '' }, w = typeof r.w === 'function' ? r.w(meta) : r.w, c = metaCost(u, mlv(meta, u.id));
      return { u, cost: c, score: w / c, why: r.why };
    });
  }
  function recommend(meta) { const o = labOptions(meta); return o.length ? o.reduce((a, b) => (b.score > a.score ? b : a)) : null; }
  function cheapest(meta) { const o = labOptions(meta); return o.length ? o.reduce((a, b) => (b.cost < a.cost ? b : a)) : null; }

  function metaBuy(meta, u) {
    const l = mlv(meta, u.id);
    if (u.max != null && l >= u.max) return false;
    const c = metaCost(u, l);
    if (meta.crystals < c) return false;
    meta.crystals -= c; meta.lv[u.id] = l + 1;
    return true;
  }
  const enemyHp = (type, w) => ENEMY[type].hp * hpScale(w);

  const VERSION = 'kw-20'; // gleich halten mit VERSION in sw.js
  root.Core = { VERSION, CHALLENGES, CHAL_AT, DAILY_AT, chalTier, chalBonus, TWISTS, STD_LV, dayKey, dailyOf, dailyBonus, stdMeta, dropChance, WALL_R, WAVE_TYPES, GATES, MODULES_AT, FUSION_AT, ROADMAP, record, gateOk, nextUnlock, recommend, cheapest, MODULES, RARITY, MODULE_SLOTS, moduleValue, addModule, rollModule, FUSION_UPG, FUSION_MIN, SECTORS, sectorOf, flv, fragmentsFor, fuse, fusionCost, fusionBuy, milestoneReward, RUN_UPG, META_UPG, ENEMY, ABIL, SOURCES, Run, newMeta, mlv, metaCost, metaBuy, startEnergy, offlinePerHour, enemyHp, maxStartWave, startWaveFor, jumpShare, jumpBonus, FIELD_W, FIELD_H, BASE_R, WAVE_LEN, STRIKE_R, STRIKE_KILLS, P };
})(typeof window !== 'undefined' ? window : globalThis);
