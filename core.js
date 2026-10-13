// Kernwacht – Spielkern (ohne DOM, auch in Node lauffähig)
(function (root) {
  'use strict';

  // Balancing-Stellschrauben (Überschreiben per root.KW_P für Simulationen)
  const P0 = Object.assign({
    eHp: 1.13, eHpLin: 0.12, eDmg: 1.1, eDmgLin: 0.06, eRw: 1.02, eRwLin: 0,
    cBase: 2.5, cGrow: 1.01, cLate: 0.04, cBoss: 10, pDmg: 7, pHp: 80, lvDmg: 1.1, lvHp: 1.1, rw0: 1.3,
    rgMax: 0.05, rgK: 15, arMax: 0.65, arK: 15, arCap: 0.75, kamikaze: 3, multiDmg: 0.35, shockK: 0.7, mineK: 0.7, lootK: 0.05, nGrow: 1.2, bonusK: 0.025,
    labG: 1.2, fCore: 1.25, fCrys: 0.5, fragK: 1, fCoreG: 1.25, fCorePoly: 1.6, fCorePB: 5.2, fragLate: 1.01, fragLateAt: 150, mend: 0.03, mendBoss: 0.002, mendSelf: 0.01, mendOthers: 0.15, mendCalm: 1.5, gunFocusPct: 0.012, strikeDmg: 1.4, strikeBoss: 5, strikeBossT: 30, pierceK: 0.6, fragExp: 2.3, rwExp: 0, strikePct: 0.12, waveTypes: 1, shipCap: 14, aliveCap: 26, mendMax: 2, wmDmg: 0.8, bossWrath: 90, gunBossPct: 0.0004,
    modK: { cryo: 0.3, thorn: 0.7, leech: 0.12, nova: 1 },
    chalHp: 1.5, chalFastWave: 1.5, chalPoor: 1 / 3, chalMine: 0.7, // Verschärfung nur in Challenges (nicht im Tageslauf)
    gunK: 3, rockLv: 0.04, shockLv: 0.05, mineLv: 0.06, splK: 1, bladeV: 120, bladeK: 0.65,
  }, root.KW_P || {});

  // ---------- Upgrades im Lauf (Energie) ----------
  const RUN_UPG = [
    { id: 'dmg',      tab: 'atk', name: 'Schaden',          desc: '×1,10 Schaden pro Stufe',          base: 4,   g: 1.12 },
    { id: 'rate',     tab: 'atk', name: 'Feuerrate',        desc: '+5 % Schüsse pro Sekunde',         base: 6,   g: 1.15, max: 25 },
    { id: 'range',    tab: 'atk', name: 'Reichweite',       desc: '+5 Reichweite',                    base: 10,  g: 1.17, max: 30 },
    { id: 'crit',     tab: 'atk', name: 'Krit-Chance',      desc: '+2,5 % Chance auf Krit',           base: 12,  g: 1.18, max: 16 },
    { id: 'critx',    tab: 'atk', name: 'Krit-Schaden',     desc: '+0,1× Schaden bei Krit',           base: 16,  g: 1.16, max: 15 },
    { id: 'multi',    tab: 'atk', name: 'Mehrfachschuss',   desc: '+1 Nebenrohr mit 35 % Schaden',    base: 150, g: 3.2,  max: 2 },
    { id: 'pierce',   tab: 'atk', name: 'Durchschlag',      desc: 'Geschosse fliegen durch 1 weiteres Schiff (60 % Schaden)', base: 300, g: 3.5, max: 3 },
    { id: 'rocket',   tab: 'atk', name: 'Raketenwerfer',    desc: 'Langsame Rakete mit Flächenschaden', base: 80, g: 1.2,  max: 30, freq: 'f_rocket' },
    { id: 'cryo',     tab: 'atk', name: 'Kryowerfer',       desc: 'Verlangsamt getroffene Schiffe',   base: 80,  g: 1.2,  max: 30, freq: 'f_cryo' },
    { id: 'mine',     tab: 'atk', name: 'Minenwerfer',      desc: 'Mehr und stärkere Minen',          base: 60,  g: 1.2,  max: 30, req: 'u_mine' },
    { id: 'hp',       tab: 'def', name: 'Hülle',            desc: '×1,10 Strukturpunkte',             base: 4,   g: 1.12 },
    { id: 'regen',    tab: 'def', name: 'Reparatur',        desc: 'Mehr Regeneration pro Sekunde',    base: 8,   g: 1.15, max: 40 },
    { id: 'armor',    tab: 'def', name: 'Panzerung',        desc: 'Weniger Schaden durch Treffer',    base: 14,  g: 1.17, max: 40 },
    { id: 'knock',    tab: 'def', name: 'Rückstoß',         desc: 'Treffer stoßen Gegner zurück',     base: 20,  g: 1.2,  max: 20 },
    { id: 'shock',    tab: 'def', name: 'Schockwelle',      desc: 'Druckring bis weit ins Feld',      base: 50,  g: 1.2,  max: 30, req: 'u_shock' },
    { id: 'blade',    tab: 'def', name: 'Orbitklingen',     desc: 'Klingen kreisen auf einer Schleife: außen durchs Feld, innen am Schutzwall', base: 70,  g: 1.2,  max: 30, req: 'u_blade' },
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
    { id: 'f_core',   name: 'Fusionskern',     desc: '×1,25 Schaden und Strukturpunkte', base: 3,  g: P0.fCoreG, poly: P0.fCorePoly, pbase: P0.fCorePB }, // Kosten wachsen polynomiell, damit Fusionen auch spät spürbar bleiben
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
    return Math.floor(P.fragK * Math.pow(meta.best / 10, P.fragExp) * (1 + 0.2 * flv(meta, 'f_frag')) * achBonus(meta).frag * Math.pow(P.fragLate, Math.max(0, meta.best - P.fragLateAt))); // ab Welle 150 lohnt jede weitere Welle zusätzlich
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
  function fusionCost(u, l) { const e = u.base * Math.pow(u.g, l); return Math.ceil(u.poly ? Math.min(e, (u.pbase || u.base) * Math.pow(l + 1, u.poly)) : e); } // früh exponentiell (günstig), spät polynomiell
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
    cryoammo:  { sector: 2, name: 'Kältebruch',        desc: v => `Kanonentreffer auf verlangsamte Schiffe machen +${pctS(v)} Schaden. Treffer verlangsamen leicht (10 %)`, base: P0.modK.cryo },
    scanner:   { sector: 2, name: 'Zielerfassung',     desc: v => `+${pctS(v)} Krit-Chance, Tarnung wirkungslos`, base: 0.04 },
    overcharge:{ sector: 3, name: 'Überspannung',      desc: v => `Jeder 12. Schuss macht ${v.toFixed(1).replace('.', ',')}× Schaden`, base: 2, add: 1 },
    plating:   { sector: 3, name: 'Dornenwall',        desc: v => `Schiffe am Schutzwall erleiden ${v.toFixed(1).replace('.', ',')}× Kanonenschaden pro Sekunde, +5 % Panzerung`, base: P0.modK.thorn },
    leech:     { sector: 4, name: 'Energieleck',       desc: v => `+${pctS(v)} Energie pro Abschuss, Orbitalschlag lädt ${pctS(v / 2)} schneller`, base: P0.modK.leech },
    nova:      { sector: 4, name: 'Nova-Impuls',       desc: v => `Alle 12 s eine Nova mit ${v.toFixed(1).replace('.', ',')}× Kanonenschaden auf alle Schiffe in Reichweite (sofort, wenn die Hülle unter 30 % fällt)`, base: P0.modK.nova },
    echo:      { sector: 5, name: 'Echo',              desc: v => `−${pctS(Math.min(0.6, v))} Abklingzeit, +${pctS(v / 2)} Dauer von Stasis und Überladung. Wirkt auch in Challenges`, base: 0.1 },
    crysmod:   { sector: 5, name: 'Leerenresonator',   desc: v => `Gegner haben ${pctS(1 - 1 / (1 + 0.17 * v))} weniger Lebenspunkte, in Challenges ${pctS(1 - 1 / (1 + 0.4 * v))}`, base: 0.15 },
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
    const ms = 1 + 0.05 * (m.mast || 0); // Meisterung (Werkstatt, nach legendär 10/10)
    return (M.add ? M.base + M.add * (k - 1) + M.add : M.base * k) * ms;
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
    const full = cur.copies >= 10;
    cur.copies = Math.min(10, cur.copies + 1);
    if (drop.rar > cur.rar) { cur.rar = drop.rar; return 'besser'; }
    if (full) {
      // Modul schon voll: Fund wird zu Erz des passenden Planeten (mehr bei höherer Seltenheit)
      const P_ = PLANETS.find(x => x.sector === MODULES[drop.type].sector), M = mineState(meta), n = 150 * Math.pow(drop.rar + 1, 2);
      M.ore[P_.id] = (M.ore[P_.id] || 0) + n; drop.ore = n; drop.oreName = P_.ore;
      return 'erz';
    }
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

  const MINE_FUSE = 10; // Sekunden, bis eine unberührte Mine von selbst losfliegt
  const SOURCES = ['gun', 'rocket', 'cryo', 'mine', 'shock', 'blade', 'strike', 'mod', 'dot', 'skill'];
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
  const shipCount = w => Math.min(P.shipCap, 4 + Math.floor(0.4 * w));

  // ---------- Wellentypen: Abwechslung statt immer gleicher Masse ----------
  const WAVE_TYPES = {
    normal:    { name: '',               n: 1,    hp: 1,    spd: 1 },
    swarm:     { name: 'Schwarm',        n: 1.5,  hp: 0.45, spd: 1.15, mix: { runner: 0.75 } },
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
    { w: 25, label: 'Überladung, Sprungtor und Bergbau' },
    { w: 30, label: 'Boss-Module: Mutterschiffe lassen Beute fallen' },
    { w: 35, label: 'Minenwerfer im Labor' },
    { w: 40, label: 'Herausforderungen: Läufe mit Handicap für dauerhafte Boni' },
    { w: 50, label: 'Kernfusion' },
    { w: 51, label: 'Sektor 2: Smaragdnebel, Eismond Kryos' },
    { w: 101, label: 'Sektor 3: Glutgürtel, Glutwelt Ignis' },
    { w: 151, label: 'Sektor 4: Roter Riese, Roter Zwerg Nox' },
    { w: 201, label: 'Sektor 5: Die Leere, Rand der Leere' },
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
    // 8 Stufen je Challenge; jede Stufe multipliziert den Bonus (×(1+step))
    { id: 'nodef', name: 'Ohne Abwehr',  rule: 'Keine Abwehr-Upgrades im Lauf: Hülle, Reparatur, Panzerung, Rückstoß, Schockwelle und Klingen bleiben gesperrt.', goals: [25, 50, 75, 100, 125, 150, 180, 220], bonus: 'hp',   step: 0.06, bname: 'Strukturpunkte' },
    { id: 'fast',  name: 'Hetzjagd',     rule: 'Alle Gegner fliegen doppelt so schnell, die Wellen folgen schneller aufeinander.', goals: [40, 70, 100, 130, 160, 190, 220, 250], bonus: 'rate', step: 0.05, bname: 'Feuerrate' },
    { id: 'mines', name: 'Nur Minen',    rule: 'Kanone, Nebenkanonen, Raketen, Kryowerfer, Schockwelle, Klingen und Orbitalschlag schweigen. Nur der Minenwerfer arbeitet, er ist von Beginn an aktiv. Schaden und Reichweite (Größe des Minenfelds) lassen sich ausbauen.', goals: [30, 60, 90, 120, 150, 180, 215, 250], bonus: 'crys', step: 0.08, bname: 'Kristalle' },
    { id: 'glass', name: 'Glaskanone',   rule: 'Nur ein Viertel der Strukturpunkte und keine Reparatur.', goals: [30, 60, 90, 120, 150, 180, 215, 250], bonus: 'dmg',  step: 0.06, bname: 'Schaden' },
    { id: 'poor',  name: 'Sparflamme',   rule: 'Abschüsse bringen nur ein Drittel der Energie, keine Wellenprämie.', goals: [30, 60, 90, 120, 150, 180, 215, 250], bonus: 'loot', step: 0.07, bname: 'Energie' },
  ];
  const CHAL_BY_ID = {}; CHALLENGES.forEach(c => (CHAL_BY_ID[c.id] = c));
  // Stufe aus der Bestwelle (so wachsen alte Spielstände automatisch in neue Stufen hinein)
  const chalTier = (m, id) => { const st = m.chal && m.chal[id]; if (!st) return 0; const C_ = CHAL_BY_ID[id]; return Math.max(st.tier || 0, C_ ? C_.goals.filter(g => (st.best || 0) >= g).length : 0); };
  const chalMult = (c, tier) => Math.pow(1 + c.step, tier);
  function chalBonus(m) {
    const b = { hp: 1, rate: 1, dmg: 1, loot: 1, crys: 1 };
    for (const c of CHALLENGES) b[c.bonus] *= chalMult(c, chalTier(m, c.id));
    return b;
  }
  // Einstieg in eine Challenge: am zuletzt erreichten Stufenziel (Bosswellen werden um eine Welle vorgezogen)
  function chalStart(m, id) {
    const C_ = CHAL_BY_ID[id], t = chalTier(m, id); if (!C_ || !t) return 1;
    const best = (m.chal[id] && m.chal[id].best) || 0; let w = Math.min(C_.goals[Math.min(t, C_.goals.length) - 1], best || Infinity); if (w % 10 === 0) w -= 1; return Math.max(1, w); // nie über die eigene Bestwelle hinaus
  }

  // ---------- Erfolge: mehrere Stufen je Erfolg, jede Stufe gibt einen dauerhaften Bonus ----------
  const ACH = [
    { id: 'waves',  name: 'Wellenbrecher',   what: 'Wellen überstanden',     goals: [100, 500, 2e3, 1e4, 5e4, 2e5],        bonus: 'dmg',    step: 0.02, bname: 'Schaden' },
    { id: 'best',   name: 'Vorstoß',          what: 'Höchste Welle',          goals: [25, 50, 100, 150, 200, 300, 400],     bonus: 'hp',     step: 0.03, bname: 'Strukturpunkte' },
    { id: 'kills',  name: 'Jägerschreck',     what: 'Abschüsse',              goals: [1e3, 1e4, 1e5, 1e6, 1e7],             bonus: 'rate',   step: 0.02, bname: 'Feuerrate' },
    { id: 'crys',   name: 'Kristallhort',     what: 'Kristalle verdient',     goals: [1e4, 1e6, 1e8, 1e10, 1e12],           bonus: 'crys',   step: 0.03, bname: 'Kristalle' },
    { id: 'bosses', name: 'Mutterschiffjäger', what: 'Mutterschiffe besiegt', goals: [10, 50, 250, 1e3, 5e3],               bonus: 'boss',   step: 0.04, bname: 'Schaden gegen Mutterschiffe' },
    { id: 'mods',   name: 'Sammler',          what: 'Modulkopien gesammelt',  goals: [10, 25, 50, 75, 100],                 bonus: 'mod',    step: 0.02, bname: 'Modulwirkung' },
    { id: 'fus',    name: 'Kernschmelze',     what: 'Kernfusionen',           goals: [1, 3, 5, 10, 20],                     bonus: 'frag',   step: 0.04, bname: 'Fusionsfragmente' },
    { id: 'daily',  name: 'Stammgast',        what: 'Tagesläufe',             goals: [5, 20, 50, 100],                      bonus: 'loot',   step: 0.03, bname: 'Energie' },
    { id: 'ore',    name: 'Tiefbohrer',       what: 'Erz abgebaut',           goals: [1e4, 1e6, 1e8, 1e10],                 bonus: 'mine',   step: 0.05, bname: 'Förderung' },
    { id: 'strike', name: 'Feuer von oben',   what: 'Orbitalschläge',         goals: [50, 250, 1e3, 5e3],                   bonus: 'strike', step: 0.03, bname: 'Orbitalschaden' },
    { id: 'chal',   name: 'Bezwinger',        what: 'Challenge-Stufen',       goals: [5, 10, 20, 30, 40],                   bonus: 'all',    step: 0.01, bname: 'auf alles' },
  ];
  const statOf = m => (m.stat = m.stat || { waves: Math.round(record(m) * (m.runs || 0) * 0.5), bosses: 0, strikes: 0 });
  function achVal(m, id) {
    const st = statOf(m);
    switch (id) {
      case 'waves': return st.waves || 0;
      case 'best': return record(m);
      case 'kills': return Math.floor(m.kills || 0);
      case 'crys': return Math.floor(m.totalCrystals || 0);
      case 'bosses': return st.bosses || 0;
      case 'mods': return Object.values(m.modules || {}).reduce((a, x) => a + (x.copies || 0), 0);
      case 'fus': return m.fusions || 0;
      case 'daily': return m.dailyCount || 0;
      case 'ore': return Math.floor((m.mine && m.mine.mined) || 0);
      case 'strike': return st.strikes || 0;
      case 'chal': return CHALLENGES.reduce((a, c) => a + chalTier(m, c.id), 0);
    }
    return 0;
  }
  const achTier = (m, a) => { const v = achVal(m, a.id); return a.goals.filter(g => v >= g).length; };
  function achBonus(m) {
    const b = { dmg: 1, hp: 1, rate: 1, crys: 1, boss: 1, mod: 1, frag: 1, loot: 1, mine: 1, strike: 1, all: 1 };
    for (const a of ACH) b[a.bonus] += a.step * achTier(m, a);
    return b;
  }
  const achPoints = m => ACH.reduce((s, a) => s + achTier(m, a), 0);
  // Dauerhafte Boni aus Challenges und Erfolgen zusammen
  function permBonus(m) {
    const c = chalBonus(m), a = achBonus(m), r = researchBonus(m);
    return { hp: c.hp * a.hp * a.all * r.hp, rate: c.rate * a.rate * a.all * r.rate, dmg: c.dmg * a.dmg * a.all * r.dmg, loot: c.loot * a.loot * a.all * r.loot, crys: c.crys * a.crys * a.all,
      boss: a.boss * r.boss, rateAll: r.rateAll, mod: a.mod, strike: a.strike, frag: a.frag, mine: a.mine };
  }
  // ---------- Kommandant: Rang aus Erfahrung (jede überstandene Welle), je Rang ein Skillpunkt ----------
  const xpFor = w => Math.round(5 + w * 0.5);
  const xpNeed = r => Math.round(1000 * Math.pow(1.15, r)); // Erfahrung für Rang r → r+1
  function cmdState(m) {
    if (!m.cmd) { let x = 0; for (let w = 1; w <= record(m); w++) x += xpFor(w); m.cmd = { xp: x * 6 }; } // rückwirkend aus dem Rekord
    return m.cmd;
  }
  function rankOf(m) {
    let xp = cmdState(m).xp, r = 0;
    while (xp >= xpNeed(r)) { xp -= xpNeed(r); r++; }
    return { rank: r, cur: xp, need: xpNeed(r) };
  }
  const SK_BRANCH = [
    { id: 'p', name: 'Präzision', desc: 'Kanone und Markieren' },
    { id: 'a', name: 'Arsenal', desc: 'Nebenwaffen' },
    { id: 'b', name: 'Bollwerk', desc: 'Abwehr' },
    { id: 't', name: 'Taktik', desc: 'Fähigkeiten und Energie' },
  ];
  const pc = v => Math.round(v * 100) + ' %';
  // Knoten je Ast der Reihe nach; jeder braucht den vorherigen. cap: Schlussstein (je Ast nur einer wählbar)
  const SKILLS = [
    { id: 'p_cal',    br: 'p', max: 3, name: 'Kalibrierung',     desc: l => `+${pc(0.06 * l)} Kanonenschaden` },
    { id: 'p_pierce', br: 'p', par: 'p_cal', max: 1, name: 'Wolframkern',      desc: () => '+1 Durchschlag für die Kanone' },
    { id: 'p_mark',   br: 'p', par: 'p_pierce', max: 2, name: 'Schwachstelle',    desc: l => `Markierte Ziele erleiden ${pc(0.2 * l)} mehr Schaden aus allen Quellen, auch Mutterschiffe` },
    { id: 'p_poison', br: 'p', par: 'p_cal', max: 3, name: 'Giftgeschosse',    desc: l => `Kanonentreffer vergiften: ${pc(0.1 * l)} des Treffers pro Sekunde, klingt in 3 s ab, stapelt. Dazu ${(0.05 * l).toFixed(2).replace('.', ',')} % der Lebenspunkte pro Sekunde (Mutterschiffe ${(0.01 * l).toFixed(2).replace('.', ',')} %)` },
    { id: 'p_vamp',   br: 'p', par: 'p_poison', max: 3, name: 'Vampirgeschosse',  desc: l => `Jeder Kanonentreffer repariert ${(0.03 * l).toFixed(2).replace('.', ',')} % der Hülle` },
    { id: 'p_exec',   br: 'p', par: 'p_poison', max: 3, name: 'Hinrichtung',      desc: l => `Kanonentreffer zerstören Schiffe unter ${pc(0.05 * l)} Lebenspunkten sofort (keine Mutterschiffe)` },
    { id: 'p_charge', br: 'p', par: 'p_mark', cap: 1, name: 'Ladeschuss',       desc: () => 'Alle 6 s feuert die Kanone einen geladenen Schuss: 12× Schaden, durchschlägt alles auf seiner Linie' },
    { id: 'p_sniper', br: 'p', par: 'p_exec', cap: 1, name: 'Scharfschütze',    desc: () => '+30 % Kanonenschaden und +0,5× Krit-Schaden' },
    { id: 'a_war',    br: 'a', max: 3, name: 'Sprengköpfe',      desc: l => `+${pc(0.1 * l)} Schaden von Raketen, Kryowerfer, Minen, Schockwelle und Klingen` },
    { id: 'a_cluster',br: 'a', par: 'a_war', max: 1, name: 'Streuraketen',     desc: () => 'Raketen setzen beim Einschlag 3 Submunitionen mit je 40 % Schaden frei' },
    { id: 'a_burn',   br: 'a', par: 'a_war', max: 2, name: 'Brandminen',       desc: l => `Minen hinterlassen 3 s Feuer: ${pc(0.25 * l)} Minenschaden pro Sekunde` },
    { id: 'a_frost',  br: 'a', par: 'a_burn', max: 1, name: 'Frostwelle',       desc: () => 'Die Schockwelle verlangsamt getroffene Schiffe 2 s um 30 %' },
    { id: 'a_blades', br: 'a', par: 'a_cluster', max: 2, name: 'Klingenschwarm',   desc: l => `+${l} Orbitklinge${l > 1 ? 'n' : ''} (wenn Orbitklingen aktiv sind)` },
    { id: 'a_toxin',  br: 'a', par: 'a_burn', max: 1, name: 'Kryotoxin',        desc: () => 'Kryotreffer vergiften: Kryoschaden pro Sekunde, klingt in 3 s ab' },
    { id: 'a_drones', br: 'a', par: 'a_blades', cap: 1, name: 'Drohnenbucht',     desc: () => 'Zwei Kampfdrohnen kreisen um die Kanone und feuern auf Schiffe in Reichweite' },
    { id: 'a_barrage',br: 'a', par: 'a_frost', cap: 1, name: 'Bombardement',     desc: () => 'Alle 8 s schlägt Artillerie in der dichtesten Gruppe ein (5× Kanonenschaden)' },
    { id: 'b_plate',  br: 'b', max: 3, name: 'Panzerplatten',    desc: l => `+${pc(0.05 * l)} Strukturpunkte` },
    { id: 'b_regen',  br: 'b', par: 'b_plate', max: 2, name: 'Nanoschwarm',      desc: l => `+${pc(0.25 * l)} Reparatur` },
    { id: 'b_leech',  br: 'b', par: 'b_plate', max: 3, name: 'Lebensraub',       desc: l => `Jeder Abschuss repariert ${(0.3 * l).toFixed(1).replace('.', ',')} % der Hülle` },
    { id: 'b_reflect',br: 'b', par: 'b_leech', max: 2, name: 'Reflexion',        desc: l => `Wird die Kanone getroffen, erleidet das nächste Schiff ${l}× Kanonenschaden` },
    { id: 'b_stun',   br: 'b', par: 'b_reflect', max: 1, name: 'Schockplatten',    desc: () => 'Schiffe am Schutzwall werden zurückgestoßen und 1 s betäubt' },
    { id: 'b_emerg',  br: 'b', par: 'b_regen', max: 1, name: 'Notschild',        desc: () => 'Einmal pro Welle: fällt die Hülle unter 25 %, ist die Kanone 3 s unverwundbar' },
    { id: 'b_phoenix',br: 'b', par: 'b_emerg', cap: 1, name: 'Phönix',           desc: () => 'Einmal pro Lauf: fällt die Kanone, steht sie mit halber Hülle wieder auf' },
    { id: 'b_aegis',  br: 'b', par: 'b_stun', cap: 1, name: 'Aegis',            desc: () => 'Alle 15 s ein Schild, der Schaden bis 25 % der Hülle abfängt' },
    { id: 't_charge', br: 't', max: 3, name: 'Schnellladung',    desc: l => `Orbitalschlag lädt ${pc(0.15 * l)} schneller` },
    { id: 't_quake',  br: 't', par: 't_charge', max: 1, name: 'Nachbeben',        desc: () => 'Der Orbitalschlag hinterlässt 3 s ein Feld mit 15 % Schlagschaden pro Sekunde' },
    { id: 't_stasis', br: 't', par: 't_charge', max: 2, name: 'Kryostase',        desc: l => `Stasis hält ${l} s länger` },
    { id: 't_over',   br: 't', par: 't_stasis', max: 2, name: 'Feuersturm',       desc: l => `Überladung +${(0.25 * l).toFixed(2).replace('.', ',')}× Feuerrate` },
    { id: 't_fund',   br: 't', par: 't_quake', max: 3, name: 'Kriegskasse',      desc: l => `+${pc(0.05 * l)} Energie` },
    { id: 't_call',   br: 't', par: 't_fund', max: 1, name: 'Vorstoßprämie',    desc: () => 'Früh gerufene Wellen bringen doppelte Bonus-Energie' },
    { id: 't_loop',   br: 't', par: 't_over', cap: 1, name: 'Zeitschleife',     desc: () => 'Stasis und Überladung laden 40 % schneller, der Orbitalschlag 25 %' },
    { id: 'x_seek',   br: 'x', max: 1, link: ['p', 'a'], name: 'Zielsuchköpfe', desc: () => 'Raketen fliegen bevorzugt zum markierten Ziel und treffen es mit +50 % Schaden' },
    { id: 'x_shrap',  br: 'x', max: 1, link: ['a', 'b'], name: 'Splitterpanzer', desc: () => 'Treffer an der Hülle schleudern Splitter auf die 3 nächsten Schiffe (je 1× Kanonenschaden)' },
    { id: 'x_proto',  br: 'x', max: 1, link: ['b', 't'], name: 'Notfallprotokoll', desc: () => 'Einmal pro Welle: fällt die Hülle unter 30 %, friert ein Stasisfeld alle Gegner 3 s ein' },
    { id: 'x_beam',   br: 'x', max: 1, link: ['t', 'p'], name: 'Leitstrahl', desc: () => 'Der Orbitalschlag vergiftet getroffene Schiffe (20 % des Schlagschadens pro Sekunde) und markiert das stärkste, wenn noch nichts markiert ist' },
    { id: 't_hole',   br: 't', par: 't_call', cap: 1, name: 'Schwarzes Loch',   desc: () => 'Alle 20 s zieht ein Wirbel Schiffe 3 s lang zusammen und beschädigt sie (keine Mutterschiffe)' },
  ];
  const SK_BY_ID = {}; SKILLS.forEach(k => (SK_BY_ID[k.id] = k));
  const SK_CAP_AT = 8; // Punkte im Ast für den Schlussstein
  const SK_LINK_AT = 6; // Punkte in beiden Nachbarästen für einen Brückenknoten
  const skLv = (m, id) => (m.sk && m.sk[id]) || 0;
  const skSpent = m => Object.values(m.sk || {}).reduce((a, b) => a + b, 0);
  const skPoints = m => rankOf(m).rank - skSpent(m);
  const skBranchPts = (m, br) => SKILLS.filter(k => k.br === br).reduce((a, k) => a + skLv(m, k.id), 0);
  // Baum: jeder Knoten braucht seinen Elternknoten (par); Schlussstein zusätzlich 8 Punkte im Ast und
  // keinen anderen Schlussstein im Ast; Brückenknoten (link) je 6 Punkte in beiden Nachbarästen
  function skOpen(m, id) {
    const k = SK_BY_ID[id]; if (!k) return false;
    if (k.link) return k.link.every(b => skBranchPts(m, b) >= SK_LINK_AT);
    if (k.par && !skLv(m, k.par)) return false;
    if (k.cap) return !SKILLS.some(x => x.br === k.br && x.cap && x.id !== id && skLv(m, x.id)) && skBranchPts(m, k.br) - skLv(m, id) >= SK_CAP_AT;
    return true;
  }
  function skCan(m, id) {
    const k = SK_BY_ID[id]; if (!k || skPoints(m) < 1) return false;
    return skLv(m, id) < (k.cap ? 1 : k.max) && skOpen(m, id);
  }
  // Ungültige Knoten (z. B. nach Umbau des Baums) entfernen; die Punkte werden damit wieder frei
  function skFix(m) {
    if (!m.sk) return 0; let n = 0, ch = true;
    for (const id in m.sk) if (!SK_BY_ID[id] || !m.sk[id]) { n += m.sk[id] || 0; delete m.sk[id]; }
    while (ch) { ch = false; for (const id in m.sk) if (!skOpen(m, id)) { n += m.sk[id]; delete m.sk[id]; ch = true; } }
    return n;
  }
  function skBuy(m, id) { if (!skCan(m, id)) return false; m.sk = m.sk || {}; m.sk[id] = skLv(m, id) + 1; return true; }
  function skReset(m) { m.sk = {}; }

  // ---------- Planetenforschung: dauerhafte Boni, bezahlt mit der Ressource des Planeten ----------
  const RESEARCH = {
    // spätere Planeten öffnen später und haben weniger Vorrat angesammelt: günstigerer Einstieg
    ast:  { b: 'dmg',  step: 0.03, name: 'Schaden', c0: 500 },
    ice:  { b: 'hp',   step: 0.04, name: 'Strukturpunkte', c0: 400 },
    lava: { b: 'rateAll', step: 0.03, name: 'Feuerrate aller Waffen', c0: 300 },
    red:  { b: 'loot', step: 0.02, name: 'Energie im Lauf', c0: 200 },
    void: { b: 'boss', step: 0.05, name: 'Schaden gegen Mutterschiffe', c0: 150 },
  };
  const researchCost = (l, id) => Math.ceil(((RESEARCH[id] && RESEARCH[id].c0) || 500) * Math.pow(1.25, l));
  const researchLv = (m, id) => (m.mine && m.mine.res && m.mine.res[id]) || 0;
  function researchBonus(m) {
    const b = { dmg: 1, hp: 1, rate: 1, rateAll: 1, loot: 1, boss: 1 };
    for (const id in RESEARCH) b[RESEARCH[id].b] += RESEARCH[id].step * researchLv(m, id);
    return b;
  }
  // Was eine Herausforderung im Lauf sperrt
  const BLOCK = {
    nodef: u => u.tab === 'def',
    mines: u => (u.tab === 'atk' && u.id !== 'dmg' && u.id !== 'mine' && u.id !== 'range') || u.id === 'shock' || u.id === 'blade', // nur Schadensquellen sperren; Reichweite bestimmt das Minenfeld
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
      this.isChal = !!(this.mode && this.mode.kind === 'chal');
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
      this.dealt = {}; SOURCES.forEach(k => (this.dealt[k] = 0)); this.modDealt = {};
      this.holding = false; this.god = false; this.ring = null;
      this.rockets = []; this.bolts = []; this.rocketT = 0; this.cryoT = 0; this.reinfT = 0; this.loot = []; this.novaT = 0;
      this.fires = []; this.chargeShotT = 0; this.droneT = 0; this.barrageT = 0; this.holeT = 0; this.hole = null; this.aegis = 0; this.aegisT = 0; this.phoenixUsed = false; this.emergWave = 0; this.invulnUntil = 0; this.reflT = 0;
      this.startWave = 1;
      const chalS = this.mode && this.mode.kind === 'chal' ? (opts.chalStart != null ? Math.min(opts.chalStart, chalStart(meta, this.mode.id)) : chalStart(meta, this.mode.id)) : 1;
      const S = this.mode ? chalS : Math.min(opts.startWave || 1, maxStartWave(meta));
      if (S > 1) {
        const jb = jumpBonus(meta, S);
        // Challenge-Einstieg: Startenergie wie beim Wellensprung, aber keine Kristalle
        if (this.mode) this.energy += jb.energy * (this.rule === 'poor' ? P.chalPoor : 1);
        else { this.energy += jb.energy; this.crystals += jb.crystals; }
        this.wave = S - 1; this.startWave = S; this.skipCrystalsOnce = true;
      }
      this.recalc();
      this.hp = this.s.maxHp;
      this.nextWave();
    }

    // ---------- Speichern / Laden ----------
    snapshot() {
      const keep = ['lv', 'free', 'energy', 'wave', 'time', 'waveT', 'kills', 'crystals', 'fireT', 'shockT', 'mineT', 'bladeA', 'aim', 'charge', 'hp',
        'queue', 'spawnGap', 'spawnT', 'uid', 'cd', 'freezeUntil', 'overUntil', 'dealt', 'modDealt', 'holding', 'startWave', 'god', 'taken', 'blocked', 'rocketT', 'cryoT', 'reinfT', 'loot', 'novaT', 'refHp', 'chargeShotT', 'phoenixUsed', 'aegis', 'emergWave', 'protoWave', 'mode', 'waveType', 'waveMod', 'bossKills', 'noLoot'];
      const o = {}; keep.forEach(k => (o[k] = this[k]));
      o.enemies = this.enemies.map(e => Object.assign({}, e));
      o.ebullets = this.ebullets.map(b => Object.assign({}, b));
      o.mines = this.mines.map(m => Object.assign({}, m));
      return JSON.parse(JSON.stringify(o));
    }
    static restore(meta, o) {
      const r = new Run(meta, { noFx: true, mode: o.mode });
      Object.assign(r, o);
      r.fxOn = true; r.bullets = []; r.rockets = []; r.bolts = []; r.fx = []; r.fires = []; r.hole = null; r.invulnUntil = 0; r.focus = null; r.dead = false; r.ring = null;
      r.cd = Object.assign({ freeze: 0, over: 0 }, o.cd || {});
      RUN_UPG.forEach(u => { if (r.lv[u.id] == null) r.lv[u.id] = 0; }); // neue Upgrades in alten Spielständen
      r.dealt = Object.assign({}, r.dealt, o.dealt || {});
      SOURCES.forEach(k => { if (r.dealt[k] == null) r.dealt[k] = 0; }); r.modDealt = Object.assign({}, o.modDealt || {});
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
      const cb = permBonus(this.meta); s.chal = cb;
      s.dmg = P.pDmg * Math.pow(P.lvDmg, L('dmg')) * Math.pow(1.08, M('m_dmg')) * s.fusion * cb.dmg;
      s.rate = 1.2 * (1 + 0.05 * L('rate')) * (1 + 0.03 * M('m_rate')) * cb.rate;
      s.range = 150 + 5 * L('range');
      s.crit = 0.025 * L('crit');
      s.critx = 1.5 + 0.1 * L('critx');
      s.gunDmg = s.dmg * P.gunK; // Treffer der Hauptkanone
      s.multi = L('multi');
      s.multiDmg = P.multiDmg; // Nebenrohre treffen schwächer als das Hauptrohr
      s.pierce = L('pierce');
      s.maxHp = P.pHp * Math.pow(P.lvHp, L('hp')) * Math.pow(1.08, M('m_hp')) * s.fusion * cb.hp * (this.rule === 'glass' ? 0.25 : 1);
      const rg = L('regen');
      s.regen = s.maxHp * P.rgMax * (rg / (rg + P.rgK)) * (1 + 0.1 * M('m_regen'));
      const ar = L('armor');
      s.armor = Math.min(P.arCap, P.arMax * ar / (ar + P.arK) + 0.01 * M('m_armor'));
      s.knock = L('knock') ? 1.5 + 0.35 * L('knock') : 0;
      const tw = this.twist();
      s.loot = (1 + P.lootK * L('loot')) * (1 + 0.08 * M('m_loot')) * cb.loot * (this.rule === 'poor' ? (this.isChal ? P.chalPoor : 0.5) : 1) * ((tw && tw.loot) || 1);
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
      s.bladeDmg = s.dmg * 0.5 * (1 + 0.1 * bl) * P.bladeK;
      s.bladeSize = 9 + Math.min(7, bl * 0.25);
      s.bladeHz = 1 / 0.35;
      // Minen
      const mi = L('mine');
      s.mineCd = mi ? Math.max(1, 4 - 0.1 * mi) : 0;
      s.mineDmg = s.dmg * P.mineK * (2 + P.mineLv * mi) * (this.isChal && this.rule === 'mines' ? P.chalMine : 1);
      s.mineMax = mi ? 4 + Math.floor(mi / 5) : 0;
      s.mineTrig = 16;
      s.mineBlast = 45 + mi;
      s.strikeDmg = s.dmg * 25 * cb.strike;
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
      s.cryoRange = s.range; // gleiche Reichweite wie die Hauptkanone
      // Ausgerüstete Module
      const mod = {}; const eq = (this.meta.equip || []).filter(t => !this.isChal || (MODULES[t] && MODULES[t].sector === 5)); // in Challenges wirken nur Leere-Module (Sektor 5)
      for (const t of eq) { const m = this.meta.modules && this.meta.modules[t]; if (m) mod[t] = moduleValue(m) * cb.mod; }
      s.mod = mod;
      if (mod.scanner) s.crit += mod.scanner;
      if (mod.plating) s.armor = Math.min(P.arCap + 0.1, s.armor + 0.05);
      if (mod.leech) s.loot *= 1 + mod.leech;
      if (this.rule === 'glass') s.regen = 0;
      s.noGun = this.rule === 'mines';
      // Feuerrate aller Waffen (Planetenforschung): Kanone schneller, Nebenwaffen laden schneller, Klingen kreisen schneller
      const ra = cb.rateAll || 1; s.rateAll = ra;
      if (ra !== 1) { s.rate *= ra; for (const k of ['rocketCd', 'cryoCd', 'mineCd', 'shockCd']) if (s[k]) s[k] /= ra; }
      // Skilltree
      const K = id => skLv(this.meta, id); s.K = K;
      s.gunDmg *= (1 + 0.06 * K('p_cal')) * (K('p_sniper') ? 1.3 : 1);
      if (K('p_sniper')) s.critx += 0.5;
      s.pierce += K('p_pierce');
      const war = 1 + 0.1 * K('a_war');
      s.rocketDmg *= war; s.cryoDmg *= war; s.mineDmg *= war; s.shockDmg *= war; s.bladeDmg *= war;
      if (s.blades) s.blades += K('a_blades');
      s.maxHp *= 1 + 0.05 * K('b_plate'); s.regen *= (1 + 0.05 * K('b_plate')) * (1 + 0.25 * K('b_regen'));
      s.loot *= 1 + 0.05 * K('t_fund');
      s.chargeK = (1 + 0.15 * K('t_charge')) * (K('t_loop') ? 1.25 : 1);
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

    // Nächste Welle vorzeitig rufen: geht, sobald alle Schiffe der aktuellen Welle gestartet sind und kein Mutterschiff lebt.
    // Bonus: Energie für die übersprungene Wartezeit
    // Jederzeit möglich, außer solange ein Mutterschiff lebt oder noch kommt. Noch nicht gestartete Schiffe der
    // aktuellen Welle bleiben in der Warteschlange, es wird also nichts übersprungen; mehrfaches Rufen stapelt Wellen.
    canCallWave() { return !this.dead && !this.bossAlive(); }
    callWave() {
      if (!this.canCallWave()) return 0;
      const left = Math.max(0, (WAVE_LEN - this.waveT) / WAVE_LEN), bonus = waveEnergy(this.wave) * this.s.loot * 0.3 * left * (this.s.K && this.s.K('t_call') ? 2 : 1);
      this.energy += bonus; this.called = (this.called || 0) + 1;
      if (this.fxOn && bonus > 0) this.fx.push({ k: 'bonus', t: 0, v: bonus });
      const rest = (this.queue || []).slice();
      this.nextWave();
      if (rest.length) { this.queue = rest.concat(this.queue); this.spawnGap = SPAWN_LEN / this.queue.length; this.spawnT = 0; }
      return bonus;
    }
    bossAlive() { return this.enemies.some(e => e.type === 'boss' && e.hp > 0) || (this.queue || []).includes('boss'); }

    nextWave() {
      if (this.wave > 0 && !this.skipCrystalsOnce) {
        this.crystals += waveCrystals(this.wave) * this.s.crysMult;
        const bonus = this.waveBonusAmount();
        if (bonus > 0) { this.energy += bonus; if (this.fxOn) this.fx.push({ k: 'bonus', t: 0, v: bonus }); }
      }
      if (this.wave > 0 && !this.admin) { statOf(this.home).waves++; cmdState(this.home).xp += xpFor(this.wave); }
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
      this.refHp = ENEMY.grunt.hp * hpScale(w) * comp * (this.isChal ? P.chalHp : 1); // typisches Schiff dieser Welle (für die Ladung des Orbitalschlags)
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
      // höchstens wenige Heiler pro Welle, der Rest wird zu normalen Jägern
      let mends = 0; for (let i = 0; i < list.length; i++) if (list[i] === 'mender' && ++mends > P.mendMax) list[i] = 'grunt';
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
      const hp = d.hp * hpScale(w) * wm.hp * (type === 'boss' ? Math.min(1, 0.22 + w / 80) : 1) * ((tw && tw.ehp) || 1) * (this.isChal ? P.chalHp : 1) / (1 + (this.isChal ? 0.4 : 0.17) * ((this.s && this.s.mod && this.s.mod.crysmod) || 0)); // Leerenresonator
      const spdK = (this.rule === 'fast' ? 2 : 1) * ((tw && tw.spd) || 1);
      const e = {
        id: ++this.uid, type, a: Math.atan2(y0, x0), dist: Math.hypot(x0, y0), hp, maxHp: hp,
        spd: d.spd * (1 + Math.min(0.6, w * 0.006)) * wm.spd * spdK,
        dmg: d.dmg * dmgScale(w) * wm.dmg, rw: d.rw * rwScale(w) * wm.rw, r: d.r * (wm.big > 1 && type === 'brute' ? wm.big : 1) * (type !== 'boss' && wm.hp > 1.6 ? 1.1 : 1), stop: d.stop || 0,
        atkT: 0.5, shotT: 1 + Math.random(), bladeHit: 0, kbT: 0, flash: 0, seed: Math.random() * 6.28, fac: sectorOf(w).n,
      };
      if (type === 'mender') e.stop = Math.max(110, Math.min(d.stop, this.s.range - 30)); // Heiler bleiben in Kanonenreichweite
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



    // Schadensanteil eines Moduls mitschreiben (für den Werte-Tab)
    credit(tag, v) { if (v > 0) this.modDealt[tag] = (this.modDealt[tag] || 0) + v; }
    hurt(e, d, crit, src, tag) {
      if (e.hp <= 0) return 0;
      if (e.type === 'boss' && this.s.chal && this.s.chal.boss > 1) d *= this.s.chal.boss;
      if (e === this.focus && this.s.K && this.s.K('p_mark')) d *= 1 + 0.2 * this.s.K('p_mark');
      if (e.shieldUntil && e.shieldUntil > this.time) { d *= 0.15; if (this.fxOn && Math.random() < 0.25) { const p = this.pos(e); this.fx.push({ k: 'shieldhit', x: p.x, y: p.y, t: 0 }); } }
      if (e.type === 'bulwark' && e.guard > 0) {
        // Frontschild fängt Schaden ab, bis es bricht
        const ab = Math.min(e.guard, d); e.guard -= ab; d -= ab; e.guardHit = this.time;
        if (this.fxOn && e.guard <= 0) { const p = this.pos(e); this.fx.push({ k: 'shieldhit', x: p.x, y: p.y, t: 0 }); }
        if (d <= 0) return 0;
      }
      if (e.laser) e.laserDmg = (e.laserDmg || 0) + d;
      e.hitT = this.time; // unter Beschuss keine Reparatur
      const eff = Math.min(d, e.hp);
      this.dealt[src || 'gun'] += eff;
      // Orbitalschlag lädt nur über zugefügten Schaden: gemessen an einem typischen Schiff der Welle,
      // beim Mutterschiff an seinen Lebenspunkten (ein ganzes Mutterschiff lädt mehrere Schläge)
      if (!this.s.noGun && e.type !== 'bomb' && e.maxHp > 0 && src !== 'strike' && !(this.time < this.strikeLock)) { // der Schlag selbst lädt nicht, kurz danach lädt nichts
        const per = e.type === 'boss' ? eff / e.maxHp * P.strikeBoss : eff / (this.refHp || e.maxHp) * P.strikeDmg / STRIKE_KILLS;
        this.charge = Math.min(1, this.charge + per * (1 + ((this.s.mod && this.s.mod.leech) || 0) / 2) * (this.s.chargeK || 1));
      }
      if (tag) this.credit(tag, eff);
      e.hp -= d; e.flash = 0.08;
      if (this.fxOn && (crit || e.type === 'boss' || e.type === 'brute')) { const p = this.pos(e); this.fx.push({ k: 'dmg', x: p.x, y: p.y, t: 0, v: d, crit }); }
      if (e.hp <= 0) {
        this.energy += e.rw * this.s.loot;
        this.kills++;
        if (this.fxOn && this.s.mod && (this.s.mod.leech || this.s.mod.crysmod) && Math.random() < 0.5) { const p = this.pos(e); this.fx.push({ k: this.s.mod.leech ? 'leech' : 'crysfx', x: p.x, y: p.y, t: 0 }); }
                if (this.s.K && this.s.K('b_leech') && !this.dead) this.hp = Math.min(this.s.maxHp, this.hp + this.s.maxHp * 0.003 * this.s.K('b_leech'));
        if (this.s.mod.splinter && src !== 'mod') {
          const p = this.pos(e), dmg = this.s.gunDmg * this.s.mod.splinter * P.splK;
          for (const o of this.enemies) if (o !== e && o.hp > 0) { const q = this.pos(o); if (Math.hypot(q.x - p.x, q.y - p.y) < 45 + o.r) this.hurt(o, dmg, false, 'mod', 'splinter'); }
          if (this.fxOn) this.fx.push({ k: 'splinter', x: p.x, y: p.y, t: 0 });
        }
        if (e.type === 'boss') {
          this.crystals += P.cBoss * waveCrystals(this.wave) * this.s.crysMult;
          const modOk = Math.max(record(this.meta), this.wave) >= MODULES_AT;
          const first = !this.meta.modules || !Object.keys(this.meta.modules).length;
          if (modOk) this.bossKills = (this.bossKills || 0) + 1;
          if (!this.admin) statOf(this.home).bosses++;
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
      return eff;
    }

    hitBase(d) {
      if (this.god) return;
      const K = this.s.K || (() => 0);
      if (K('b_reflect') && this.time >= this.reflT) {
        // Reflexion: das nächste Schiff bekommt Kanonenschaden zurück
        let n = null, nd = 1e9; for (const e of this.enemies) if (e.hp > 0 && e.dist < nd) { nd = e.dist; n = e; }
        if (n) { this.reflT = this.time + 0.2; this.hurt(n, this.s.gunDmg * K('b_reflect'), false, 'skill'); if (this.fxOn) { const p = this.pos(n); this.fx.push({ k: 'reflect', x: p.x, y: p.y, t: 0 }); } }
      }
      if (K('x_shrap') && this.time >= (this.shrapT || 0)) {
        // Splitterpanzer: Splitter auf die drei nächsten Schiffe
        this.shrapT = this.time + 0.3;
        const near = this.enemies.filter(e => e.hp > 0).sort((a, b) => a.dist - b.dist).slice(0, 3);
        for (const n of near) { this.hurt(n, this.s.gunDmg, false, 'skill'); if (this.fxOn) { const p = this.pos(n); this.fx.push({ k: 'reflect', x: p.x, y: p.y, t: 0 }); } }
      }
      if (this.time < this.invulnUntil) return;
      let dd = d * (1 - this.s.armor);
      if (this.aegis > 0) { const ab = Math.min(this.aegis, dd); this.aegis -= ab; dd -= ab; this.blocked = (this.blocked || 0) + ab; if (dd <= 0) return; }
      this.taken = (this.taken || 0) + dd;
      this.blocked = (this.blocked || 0) + d * this.s.armor;
      this.hp -= dd;
      if (this.fxOn) this.fx.push({ k: 'hurt', t: 0 });
      if (this.s.mod && this.s.mod.nova && this.hp > 0 && this.hp < this.s.maxHp * 0.3 && this.time >= this.novaT - 9) this.fireNova();
      if (K('x_proto') && this.hp > 0 && this.hp < this.s.maxHp * 0.3 && this.protoWave !== this.wave) { this.protoWave = this.wave; this.freezeUntil = Math.max(this.freezeUntil, this.time + 3); if (this.fxOn) this.fx.push({ k: 'freeze', t: 0 }); }
      if (K('b_emerg') && this.hp > 0 && this.hp < this.s.maxHp * 0.25 && this.emergWave !== this.wave) { this.emergWave = this.wave; this.invulnUntil = this.time + 3; if (this.fxOn) this.fx.push({ k: 'emerg', t: 0 }); }
      if (this.hp <= 0 && !this.dead) {
        if (K('b_phoenix') && !this.phoenixUsed) { this.phoenixUsed = true; this.hp = this.s.maxHp * 0.5; this.invulnUntil = this.time + 3; if (this.fxOn) this.fx.push({ k: 'phoenix', t: 0 }); return; }
        this.hp = 0; this.dead = true;
      }
    }
    // Skills mit eigenem Takt: Felder, Drohnen, Bombardement, Schwarzes Loch, Aegis, Ladeschuss
    skillTick(dt) {
      const s = this.s, K = s.K; if (!K) return;
      // Bosskampf: der Orbitalschlag lädt zusätzlich mit der Zeit (etwa alle 30 s ein Schlag, Ladeboni wirken mit)
      if (!s.noGun && !(this.time < this.strikeLock) && this.enemies.some(e => e.type === 'boss' && e.hp > 0)) this.charge = Math.min(1, this.charge + dt / P.strikeBossT * (1 + ((s.mod && s.mod.leech) || 0) / 2) * (s.chargeK || 1));
      for (const e of this.enemies) if (e.kres) e.kres = Math.max(0, e.kres - 0.4 * dt);
      for (const e of this.enemies) if (e.pdps > 0 && e.hp > 0) { this.hurt(e, e.pdps * dt, false, 'dot'); e.pdps *= Math.max(0, 1 - dt / 3); }
      // Giftgeschosse: zusätzlich ein kleiner Anteil der Lebenspunkte pro Sekunde (stapelt nicht) – stark gegen zähe Gegner
      if (K('p_poison')) for (const e of this.enemies) if (e.ppUntil > this.time && e.hp > 0) this.hurt(e, e.maxHp * (e.type === 'boss' ? 0.0001 : 0.0005) * K('p_poison') * dt, false, 'dot');
      for (const f of this.fires) for (const e of this.enemies) { if (e.hp <= 0) continue; const p = this.pos(e); if (Math.hypot(p.x - f.x, p.y - f.y) < f.r + e.r) this.hurt(e, f.dps * dt, false, 'dot'); }
      this.fires = this.fires.filter(f => f.until > this.time);
      if (K('p_charge')) this.chargeShotT += dt;
      const inRange = () => this.enemies.filter(e => e.hp > 0 && e.dist - e.r <= s.range && !this.cloaked(e));
      if (K('a_drones') && !s.noGun) {
        this.droneT += dt;
        if (this.droneT >= 0.35) {
          this.droneT = 0; const c = inRange();
          if (c.length) {
            const e = c[Math.floor(Math.random() * c.length)], k = this.droneIx = ((this.droneIx || 0) + 1) % 2;
            this.hurt(e, s.gunDmg * 1.2, false, 'skill');
            if (this.fxOn) { const p = this.pos(e), a = this.time * 1.6 + k * Math.PI; this.fx.push({ k: 'drone', x1: Math.cos(a) * 34, y1: -8 + Math.sin(a) * 20, x2: p.x, y2: p.y, t: 0 }); }
          }
        }
      }
      if (K('a_barrage') && !s.noGun) {
        this.barrageT += dt;
        if (this.barrageT >= 8) {
          const p = this.strikeTarget();
          if (p) {
            p.y = Math.min(p.y, -60); // Einschlag immer im Feld, nie am Horizont
            this.barrageT = 0;
            for (const e of this.enemies) { const q = this.pos(e); if (e.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) < 60 + e.r) this.hurt(e, s.gunDmg * 5, false, 'skill'); }
            if (this.fxOn) this.fx.push({ k: 'barrage', x: p.x, y: p.y, t: 0 });
          }
        }
      }
      if (K('t_hole') && !s.noGun) {
        this.holeT += dt;
        if (!this.hole && this.holeT >= 20) {
          const p = this.strikeTarget();
          if (p) { this.holeT = 0; this.hole = { x: p.x, y: Math.min(p.y, -80), until: this.time + 3 }; if (this.fxOn) this.fx.push({ k: 'hole', x: p.x, y: p.y, t: 0 }); }
        }
        if (this.hole) {
          const H = this.hole;
          for (const e of this.enemies) {
            if (e.hp <= 0 || e.type === 'boss') continue;
            const p = this.pos(e), dx = H.x - p.x, dy = H.y - p.y, d = Math.hypot(dx, dy);
            if (d > 130) continue;
            if (d > 6) { const v = Math.min(d, 90 * dt), x = p.x + dx / d * v, y = Math.min(-10, p.y + dy / d * v); e.a = Math.atan2(y, x); e.dist = Math.max(WALL_R + e.r, Math.hypot(x, y)); }
            this.hurt(e, s.gunDmg * 2 * dt, false, 'skill');
          }
          if (this.time > H.until) this.hole = null;
        }
      }
      if (K('b_aegis')) { this.aegisT += dt; if (this.aegisT >= 15) { this.aegisT = 0; this.aegis = s.maxHp * 0.25; if (this.fxOn) this.fx.push({ k: 'aegis', t: 0 }); } }
    }
    // Rückstoß mit Abnutzung: jeder Stoß macht das Schiff kurz unempfindlicher, und niemand wird aus der Reichweite geschoben
    push(e, amt) {
      if (e.type === 'boss' || e.hp <= 0) return;
      const k = e.kres || 0; amt /= 1 + k; e.kres = Math.min(4, k + 0.35);
      const lim = Math.max(e.dist, this.s.range - 20); e.dist = Math.min(e.dist + amt, lim);
    }
    // Gift: Schaden pro Sekunde, klingt über 3 s ab, Treffer stapeln
    poison(e, dps) { if (e.hp <= 0) return; e.pdps = Math.min((e.pdps || 0) + dps, dps * 15); }

    // Nova-Impuls: Schaden auf alle Schiffe in Reichweite, kleine Schiffe werden zurückgeworfen
    fireNova() {
      this.novaT = this.time + 12 / (this.s.rateAll || 1);
      const d = this.s.gunDmg * this.s.mod.nova;
      for (const e of this.enemies) if (e.hp > 0 && e.dist - e.r <= this.s.range) { this.hurt(e, d, false, 'mod', 'nova'); if (e.hp > 0) this.push(e, 30); }
      if (this.fxOn) this.fx.push({ k: 'nova', t: 0, r: this.s.range });
    }

    // ---------- Spieleraktionen ----------
    markAt(x, y, keep) {
      let best = null, bd = 40;
      for (const e of this.enemies) { if (e.hp <= 0) continue; const p = this.pos(e), d = Math.hypot(p.x - x, p.y - y) - e.r; if (d < bd) { bd = d; best = e; } }
      if (best && best === this.focus && !keep) { this.focus = null; return 'off'; } // erneutes Antippen löst die Markierung
      if (best) { this.focus = best; this.focusUntil = Infinity; } // Markierung hält, bis das Ziel zerstört oder ein anderes gewählt ist
      return best;
    }
    // Bester Punkt für den Orbitalschlag: das Mutterschiff, sonst die Stelle mit den meisten Lebenspunkten im Wirkradius
    strikeTarget() {
      const alive = this.enemies.filter(e => e.hp > 0 && e.dist < FIELD_H + 40);
      if (!alive.length) return null;
      const boss = alive.filter(e => e.type === 'boss').sort((a, b) => a.dist - b.dist)[0];
      if (boss) return this.pos(boss);
      let best = null, bv = -1;
      for (const c of alive) {
        const pc = this.pos(c); let v = 0;
        for (const e of alive) { const p = this.pos(e); if (Math.hypot(p.x - pc.x, p.y - pc.y) <= STRIKE_R + e.r) v += e.hp; }
        v *= 1 + 0.5 * Math.max(0, 1 - c.dist / 300); // nähere Ballungen bevorzugen
        if (v > bv) { bv = v; best = pc; }
      }
      return best;
    }
    strike(x, y) {
      if (this.charge < 1 || this.dead) return false;
      this.charge = 0; this.strikeLock = this.time + 4; if (!this.admin) statOf(this.home).strikes++;
      const beam = this.s.K && this.s.K('x_beam'); let bt = null;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const p = this.pos(e);
        if (Math.hypot(p.x - x, p.y - y) <= STRIKE_R + e.r) {
          this.hurt(e, this.s.strikeDmg + e.maxHp * (e.type === 'boss' ? P.strikePct * 0.15 : P.strikePct), true, 'strike');
          if (beam && e.hp > 0) { this.poison(e, this.s.strikeDmg * 0.2); if (!bt || e.maxHp > bt.maxHp) bt = e; }
        }
      }
      if (bt && !(this.focus && this.focus.hp > 0)) { this.focus = bt; this.focusUntil = Infinity; }
      if (this.fxOn) this.fx.push({ k: 'strike', x, y, t: 0 });
      if (this.s.K && this.s.K('t_quake')) this.fires.push({ x, y, r: STRIKE_R, dps: this.s.strikeDmg * 0.15, until: this.time + 3, k: 'quake' });
      return true;
    }
    abilityUnlocked(id) { return mlv(this.meta, ABIL[id].unlock) > 0; }
    abilityLv(id) { return mlv(this.meta, ABIL[id].lvl); }
    abilityReady(id) { return this.abilityUnlocked(id) && this.cd[id] <= 0 && !this.dead; }
    useAbility(id) {
      if (!this.abilityReady(id)) return false;
      const A = ABIL[id], l = this.abilityLv(id);
      this.cd[id] = A.cd(l) * (1 - Math.min(0.6, (this.s.mod && this.s.mod.echo) || 0)) * (this.s.K && this.s.K('t_loop') ? 0.6 : 1);
      const ext = 1 + 0.5 * ((this.s.mod && this.s.mod.echo) || 0); // Echo verlängert auch die Wirkdauer
      if (id === 'freeze') this.freezeUntil = this.time + (A.dur(l) + ((this.s.K && this.s.K('t_stasis')) || 0)) * ext;
      if (id === 'over') this.overUntil = this.time + A.dur(l) * ext;
      if (this.fxOn) this.fx.push({ k: id, t: 0 });
      if (this.fxOn && this.s.mod && this.s.mod.echo) this.fx.push({ k: 'echo', t: 0 });
      return true;
    }
    get frozen() { return this.freezeUntil > this.time; }
    get overActive() { return this.overUntil > this.time; }
    get rateNow() { return this.s.rate * (this.overActive ? ABIL.over.mult(this.abilityLv('over')) + 0.25 * ((this.s.K && this.s.K('t_over')) || 0) : 1); }

    // Mutterschiff: schwebt in Reichweite und wechselt zwischen Fähigkeiten
    bossAct(e) {
      const w = this.wave, p = this.pos(e);
      const acts = ['salvo', 'spawn'];
      if (w >= 20) acts.push('bomb');
      if (w >= 30) acts.push('shield');
      if (w >= 40) acts.push('laser');
      const extra = SECTORS[e.sector - 1].boss;
      if (extra) acts.push(extra, extra === 'mend' ? 'salvo' : extra); // Reparatur nur einmal im Zyklus
      let act = acts[e.acts % acts.length];
      if (e.acts >= acts.length) act = acts[Math.floor(Math.random() * acts.length)];
      e.acts++;
      if (act === 'salvo') {
        // gezielter Fächer auf die Kanone
        const n = 5 + Math.min(4, Math.floor(w / 25));
        for (let i = 0; i < n; i++) this.ebullets.push({ x: p.x + (i - (n - 1) / 2) * 12, y: p.y + 10, dmg: e.dmg * 0.4, big: true });
      } else if (act === 'spawn') {
        const n = this.enemies.length >= 16 ? 0 : 3 + Math.min(3, Math.floor(w / 40)); // Staffel kleiner und nur, wenn das Feld nicht schon voll ist
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
        for (const o of this.enemies) if (o.hp > 0) { const q = this.pos(o); if (Math.hypot(q.x - p.x, q.y - p.y) < 160) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o === e ? P.mendSelf : P.mendOthers)); }
      }
      if (this.fxOn) this.fx.push({ k: 'bossact', act, x: p.x, y: p.y, t: 0 });
    }

    update(dt) {
      if (this.dead) return;
      const s = this.s, frozen = this.frozen;
      this.time += dt;
      this.waveT += dt * (this.isChal && this.rule === 'fast' ? P.chalFastWave : 1);
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      this.spawnT += dt;
      while (this.queue.length && this.spawnT >= this.spawnGap) { if (this.enemies.length >= P.aliveCap) { this.spawnT = this.spawnGap; break; } this.spawnT -= this.spawnGap; this.spawn(this.queue.shift()); } // volles Feld: Nachschub wartet
      if (this.waveT >= WAVE_LEN) {
        if (this.bossAlive()) {
          this.waveT = WAVE_LEN; this.holding = true;
          // Verstärkung, solange das Mutterschiff lebt: keine Verschnaufpause
          this.reinfT += dt;
          if (this.wave >= 20 && this.reinfT >= 6 && !frozen && this.enemies.length < 20) {
            this.reinfT = 0;
            for (let i = 0; i < 1 + Math.floor(this.wave / 80); i++) this.spawn(Math.random() < 0.3 ? 'runner' : 'grunt');
          }
        } else { this.reinfT = 0; this.nextWave(); }
      }

      this.hp = Math.min(s.maxHp, this.hp + s.regen * dt);
      if (s.mod.nova && this.time >= this.novaT && this.enemies.some(e => e.dist - e.r <= s.range)) this.fireNova();
      // Dornenwall: Schaden an alle Schiffe direkt am Schutzwall
      if (s.mod.plating) {
        this.thornT = (this.thornT || 0) + dt;
        if (this.thornT >= 0.5) {
          this.thornT = 0;
          const pts = [];
          for (const e of this.enemies) if (e.hp > 0 && e.dist <= WALL_R + e.r * 0.3 + 12) { const p = this.pos(e); this.hurt(e, s.gunDmg * s.mod.plating * 0.5, false, 'mod', 'plating'); pts.push(p); }
          if (pts.length && this.fxOn) this.fx.push({ k: 'thorn', t: 0, pts: pts.slice(0, 8) });
        }
      }

      if (!frozen) for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        e.flash = Math.max(0, e.flash - dt);
        const contact = WALL_R + e.r * 0.3;
        if (e.type === 'boss') {
          // Wut: je länger der Kampf dauert, desto härter schlägt das Mutterschiff zu (+100 % alle 90 s)
          e.fightT = (e.fightT || 0) + dt; if (e.dmg0 == null) e.dmg0 = e.dmg;
          e.dmg = e.dmg0 * (1 + e.fightT / P.bossWrath);
          if (e.retreat) {
            // nach dem Sturmangriff zurück auf Abstand, dann beginnt das Schweben von vorn
            e.dist = Math.min(e.stop, e.dist + e.spd * 1.3 * dt);
            if (e.dist >= e.stop) { e.retreat = false; e.hoverT = 0; e.rushes = (e.rushes || 0) + 1; }
          } else if (e.dist > e.stop && !e.enraged) { e.dist = Math.max(e.stop, e.dist - e.spd * dt); }
          else {
            e.hoverT += dt;
            e.a = e.a0 + Math.sin(e.hoverT * 0.45) * 0.35;
            // Sturmangriff: erst nach längerem Schweben, später in kürzeren Abständen; nach einigen Sekunden am Wall zieht es sich zurück
            if (!e.enraged && e.hoverT > (e.rushes ? 25 : this.wave < 30 ? 65 : 40)) { e.enraged = true; e.rushT = 0; }
            if (e.enraged && e.dist <= contact && (e.rushT = (e.rushT || 0) + dt) > 8) { e.enraged = false; e.retreat = true; }
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
          // Heilung stapelt nicht (je Schiff nur ein Heiler pro Moment), Mutterschiffe bekommen nur einen Bruchteil
          for (const o of this.enemies) if (o !== e && o.type !== 'mender' && o.hp > 0 && o.hp < o.maxHp && o.mendT !== this.time && !(this.time - (o.hitT || -9) < P.mendCalm)) {
            const q = this.pos(o); if (Math.hypot(q.x - p.x, q.y - p.y) >= 90) continue;
            o.mendT = this.time; o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o.type === 'boss' ? P.mendBoss : P.mend) * dt);
          }
        }
        // Schildträger: Frontschild lädt nach 2 s ohne Treffer wieder auf
        if (e.type === 'bulwark') {
          if (e.guard == null) { e.guardMax = e.maxHp * 0.6; e.guard = e.guardMax; }
          if (this.time - (e.guardHit || 0) > 2) e.guard = Math.min(e.guardMax, e.guard + e.guardMax * 0.15 * dt);
        }
        if (e.stunUntil > this.time) continue; // betäubt: keine Bewegung, kein Angriff
        if (s.K('b_stun') && e.dist <= contact + 2 && !(e.stunCd > this.time) && !e.bomb && e.type !== 'runner') { e.stunUntil = this.time + 1; e.stunCd = this.time + 3; this.push(e, 18); if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'stun', x: p.x, y: p.y, t: 0 }); } continue; }
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
        // Ohne Markierung: Heiler in Reichweite zuerst (nach Bomben)
        if (!this.focus) { const h = inRange.find(e => e.type === 'mender'); if (h && !inRange[0].bomb) { inRange.splice(inRange.indexOf(h), 1); inRange.unshift(h); } }
        if (this.focus && inRange.includes(this.focus)) { inRange.splice(inRange.indexOf(this.focus), 1); inRange.unshift(this.focus); }
        if (inRange.length) {
          this.aim = inRange[0].a;
          while (this.fireT >= 1) {
            this.fireT -= 1; this.shots++;
            for (let i = 0; i < Math.min(inRange.length, 1 + s.multi); i++) {
              const crit = Math.random() < s.crit;
              const mx = Math.cos(this.aim) * BASE_R * 2.4, my = -8 + Math.sin(this.aim) * BASE_R * 2.4;
              const oc = s.mod.overcharge && i === 0 && this.shots % 12 === 0 ? s.mod.overcharge : 1;
              const chg = i === 0 && s.K('p_charge') && this.chargeShotT >= 6; if (chg) this.chargeShotT = 0;
              this.bullets.push({ x: mx, y: my, tgt: inRange[i], big: chg, dmg: s.gunDmg * (i ? s.multiDmg : 1) * (crit ? s.critx : 1) * oc * (chg ? 12 : 1), crit: crit || oc > 1, oc: oc > 1, rc: crit, pk: (i ? s.multiDmg : 1) * oc, pierce: chg ? 99 : s.pierce }); // Präzisionsschaden ohne Krit-Faktor
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
          const brittle = s.mod.cryoammo && t.slowUntil > this.time ? 1 + s.mod.cryoammo : 1;
          // Präzision: markierte Ziele verlieren zusätzlich 1,2 % (Mutterschiffe 0,04 %) ihrer max. Lebenspunkte je Treffer
          const pct = t !== this.focus ? 0 : t.maxHp * (t.type === 'boss' ? P.gunBossPct : P.gunFocusPct) * (b.pk || 1); // nur markierte Ziele, Mutterschiffe schwächer
          const eff = this.hurt(t, (b.dmg + pct) * brittle, b.crit, 'gun');
          if (eff > 0) {
            // Zusatzschaden den Modulen zurechnen: Anteil, der ohne das Modul fehlen würde
            if (brittle > 1) this.credit('cryoammo', eff * (1 - 1 / brittle));
            if (b.oc) this.credit('overcharge', eff * (1 - 1 / s.mod.overcharge));
            if (b.rc && s.mod.scanner && s.crit > 0) { const c1 = Math.min(1, s.crit); this.credit('scanner', eff * (1 - 1 / s.critx) * (c1 - Math.min(1, Math.max(0, s.crit - s.mod.scanner))) / c1); } // Krit über 100 % bringt nichts
          }
          if (brittle > 1 && this.fxOn && Math.random() < 0.35) this.fx.push({ k: 'brittle', x: p.x, y: p.y, t: 0 });
          if (s.K('p_poison') && t.hp > 0) { this.poison(t, b.dmg * brittle * 0.1 * s.K('p_poison')); t.ppUntil = this.time + 3; }
          if (s.K('p_vamp') && !this.dead) this.hp = Math.min(s.maxHp, this.hp + s.maxHp * 0.0003 * s.K('p_vamp'));
          if (s.K('p_exec') && t.hp > 0 && t.type !== 'boss' && t.hp < t.maxHp * 0.05 * s.K('p_exec')) { this.hurt(t, t.hp, true, 'gun'); if (this.fxOn) this.fx.push({ k: 'exec', x: p.x, y: p.y, t: 0 }); }
          if (s.mod.cryoammo && t.hp > 0) { t.slow = Math.max(t.slowUntil > this.time ? t.slow : 0, 0.1 * (t.type === 'boss' ? 0.4 : 1)); t.slowUntil = this.time + 1.5; }
          if (s.mod.chain && Math.random() < s.mod.chain) {
            const others = this.enemies.filter(o => o !== t && o.hp > 0).map(o => ({ o, d: Math.hypot(this.pos(o).x - p.x, this.pos(o).y - p.y) })).filter(x => x.d < 110).sort((a, b) => a.d - b.d).slice(0, 2);
            for (const x of others) { this.hurt(x.o, b.dmg * 0.5, false, 'gun', 'chain'); if (this.fxOn) { const q = this.pos(x.o); this.fx.push({ k: 'chain', x1: p.x, y1: p.y, x2: q.x, y2: q.y, t: 0 }); } }
          }
          if (s.knock && t.hp > 0 && t.kbT <= this.time) { t.kbT = this.time + 0.8; this.push(t, s.knock * (t.type === 'brute' ? 0.4 : 1)); }
          // Durchschlag: Geschoss fliegt in derselben Richtung weiter zum nächsten Schiff auf der Linie
          if (b.pierce > 0 && d > 0.01) {
            const ux = dx / d, uy = dy / d; let nx = null, best = 1e9;
            (b.hit = b.hit || []).push(t.id);
            for (const o of this.enemies) {
              if (o.hp <= 0 || b.hit.includes(o.id)) continue;
              const q = this.pos(o), rx = q.x - p.x, ry = q.y - p.y, along = rx * ux + ry * uy;
              if (along <= 0 || along > 220) continue;
              if (Math.abs(rx * uy - ry * ux) > o.r + 8) continue;
              if (along < best) { best = along; nx = o; }
            }
            if (nx) { b.done = false; b.tgt = nx; b.x = p.x; b.y = p.y; b.pierce--; b.dmg *= b.big ? 0.85 : P.pierceK; b.pk = (b.pk || 1) * P.pierceK; b.crit = false; b.rc = false; b.oc = false; b.pierced = true; }
          }
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
            const fo = this.focus; if (s.K && s.K('x_seek') && fo && fo.hp > 0 && cand.includes(fo)) best = fo;
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
          for (const e of this.enemies) { const p = this.pos(e); if (e.hp > 0 && Math.hypot(p.x - m.x, p.y - m.y) < s.rocketR + e.r) this.hurt(e, s.rocketDmg * (e === this.focus && s.K && s.K('x_seek') ? 1.5 : 1), false, 'rocket'); }
          if (this.fxOn) this.fx.push({ k: 'mine', x: m.x, y: m.y, t: 0, r: s.rocketR, rocket: true });
          if (s.K('a_cluster')) for (let i = 0; i < 3; i++) {
            // Streuraketen: drei Submunitionen rund um den Einschlag
            const an = Math.random() * 6.28, rr = s.rocketR * (0.8 + Math.random() * 0.6), x = m.x + Math.cos(an) * rr, y = m.y + Math.sin(an) * rr;
            for (const e of this.enemies) { const p = this.pos(e); if (e.hp > 0 && Math.hypot(p.x - x, p.y - y) < 30 + e.r) this.hurt(e, s.rocketDmg * 0.4, false, 'rocket'); }
            if (this.fxOn) this.fx.push({ k: 'mine', x, y, t: 0, r: 30, rocket: true });
          }
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
          for (const e of this.enemies) { const q = this.pos(e); if (e.hp > 0 && Math.hypot(q.x - p.x, q.y - p.y) < s.cryoR + e.r) { this.hurt(e, s.cryoDmg, false, 'cryo'); e.slow = s.cryoSlow * (e.type === 'boss' ? 0.4 : 1); e.slowUntil = this.time + 2.5; if (s.K('a_toxin')) this.poison(e, s.cryoDmg); } }
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
            if (s.K('a_frost')) { e.slow = Math.max(e.slowUntil > this.time ? e.slow : 0, 0.3 * (e.type === 'boss' ? 0.4 : 1)); e.slowUntil = Math.max(e.slowUntil || 0, this.time + 2); }
            if (e.hp > 0) this.push(e, 14);
          }
        }
        if (R.r >= R.max) this.ring = null;
      }
      // Orbitklingen: pendeln im oberen Halbkreis
      if (s.blades) {
        this.bladeA += dt * (s.rateAll || 1);
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
          // Zündzeit abgelaufen: Mine fliegt auf ein Mutterschiff (sonst auf das Schiff, das der Hülle am nächsten ist)
          if (!m.fly && m.age >= MINE_FUSE && this.enemies.some(e => e.hp > 0)) m.fly = true;
          if (m.fly) {
            let tg = m.tid && this.enemies.find(e => e.id === m.tid && e.hp > 0);
            if (!tg) {
              for (const e of this.enemies) if (e.hp > 0 && (!tg || (e.type === 'boss') > (tg.type === 'boss') || ((e.type === 'boss') === (tg.type === 'boss') && e.dist < tg.dist))) tg = e;
              m.tid = tg ? tg.id : 0;
            }
            if (tg) {
              const p = this.pos(tg), dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy), v = 320 * dt;
              if (d <= v + tg.r * 0.6) { m.x = p.x; m.y = p.y; m.done = true; }
              else { m.x += dx / d * v; m.y += dy / d * v; }
            }
          }
          if (!m.done) for (const e of this.enemies) {
            if (e.hp <= 0) continue;
            const p = this.pos(e);
            if (Math.hypot(p.x - m.x, p.y - m.y) < e.r + s.mineTrig) { m.done = true; break; }
          }
          if (m.done) {
            for (const e of this.enemies) { const p = this.pos(e); if (e.hp > 0 && Math.hypot(p.x - m.x, p.y - m.y) < s.mineBlast + e.r) this.hurt(e, s.mineDmg, false, 'mine'); }
            if (s.K('a_burn')) this.fires.push({ x: m.x, y: m.y, r: s.mineBlast * 0.8, dps: s.mineDmg * 0.25 * s.K('a_burn'), until: this.time + 3, k: 'fire' });
            if (this.fxOn) this.fx.push({ k: 'mine', x: m.x, y: m.y, t: 0, r: s.mineBlast });
          }
        }
        this.mines = this.mines.filter(m => !m.done);
      }

      this.skillTick(dt);
      this.enemies = this.enemies.filter(e => e.hp > 0);
    }

    // Orbitklingen auf einer geschlossenen Schleife (liegendes „D“): außen im Bogen von links nach rechts,
    // dann dicht vor dem Schutzwall von rechts nach links zurück. Gleichmäßig verteilt, ohne Umkehr.
    bladeTrack() {
      const s = this.s, a0 = Math.PI + 0.14, a1 = 2 * Math.PI - 0.14, Ro = s.bladeR, Ri = WALL_R + 16, span = a1 - a0;
      return { a0, a1, Ro, Ri, span, L: Ro * span + Ri * span + 2 * (Ro - Ri) };
    }
    bladePos() {
      const s = this.s, n = s.blades, out = []; if (!n) return out;
      const T = this.bladeTrack(), seg = [T.Ro * T.span, T.Ro - T.Ri, T.Ri * T.span, T.Ro - T.Ri];
      for (let i = 0; i < n; i++) {
        let u = ((this.bladeA * P.bladeV + i * T.L / n) % T.L + T.L) % T.L, x, y;
        if (u < seg[0]) { const a = T.a0 + u / T.Ro; x = Math.cos(a) * T.Ro; y = Math.sin(a) * T.Ro; }
        else if ((u -= seg[0]) < seg[1]) { const r = T.Ro - u; x = Math.cos(T.a1) * r; y = Math.sin(T.a1) * r; }
        else if ((u -= seg[1]) < seg[2]) { const a = T.a1 - u / T.Ri; x = Math.cos(a) * T.Ri; y = Math.sin(a) * T.Ri; }
        else { u -= seg[2]; const r = T.Ri + u; x = Math.cos(T.a0) * r; y = Math.sin(T.a0) * r; }
        out.push({ x, y, a: Math.atan2(y, x) });
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
      const loot = this.loot.map(d => { const result = addModule(m, d), cur = m.modules[d.type]; return { type: d.type, rar: d.rar, result, nowRar: cur.rar, copies: cur.copies, ore: d.ore, oreName: d.oreName }; });
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
        d.tries++; m.dailyCount = (m.dailyCount || 0) + 1;
        res.prevBest = d.best;
        if (!this.admin && (w > d.best || (w === d.best && this.kills > d.kills))) { d.best = w; d.kills = this.kills; res.newBest = true; }
        if (!this.admin && !d.bonus) { d.bonus = true; const k = dailyBonus(m); m.crystals += k; m.totalCrystals = (m.totalCrystals || 0) + k; res.crystals = k; res.bonus = true; }
        res.best = d.best; if (!this.admin) m.dailyBestEver = Math.max(m.dailyBestEver || 0, w);
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

  // ---------- Bergbau: Erz läuft in Echtzeit, parallel zu den Läufen (auch offline) ----------
  // Jeder Planet hat eine Eigenschaft (trait), die eine Einrichtung verstärkt
  const PLANETS = [
    { id: 'ast',  name: 'Asteroidengürtel', ore: 'Eisenerz',      col: '#b7bfe0', col2: '#4b5276', at: 25,  build: 300,     val: 1,   sector: 1, look: 'rock', ring: 0,
      trait: 'Reiche Adern: Lasermeißel-Treffer bringen doppelt so oft eine Erzader.', tr: { vein: 2 } },
    { id: 'ice',  name: 'Eismond Kryos',    ore: 'Kryokristall',  col: '#bff4ff', col2: '#2f7d94', at: 51,  build: 4000,    val: 2.5, sector: 2, look: 'ice', ring: 1,
      trait: 'Kältelager: Lager fasst 50 % länger.', tr: { store: 1.5 } },
    { id: 'lava', name: 'Glutwelt Ignis',   ore: 'Plasmaerz',     col: '#ffb070', col2: '#8a2a10', at: 101, build: 40000,   val: 6,   sector: 3, look: 'lava', ring: 0,
      trait: 'Heißer Kern: Bohrer fördern 30 % mehr, das Lager fasst 25 % weniger.', tr: { rate: 1.3, store: 0.75 } },
    { id: 'red',  name: 'Roter Zwerg Nox',  ore: 'Sternenstaub',  col: '#ff8a9e', col2: '#6b1830', at: 151, build: 300000,  val: 15,  sector: 4, look: 'bands', ring: 2,
      trait: 'Dünne Kruste: Lasermeißel bringt doppelt so viel.', tr: { tap: 2 } },
    { id: 'void', name: 'Rand der Leere',   ore: 'Dunkelmaterie', col: '#c9d6ff', col2: '#1d2142', at: 201, build: 2000000, val: 40,  sector: 5, look: 'void', ring: 1,
      trait: 'Resonanz: die Schmelze wirkt doppelt.', tr: { smelt: 2 } },
  ];
  const MINE_AT = 25;
  // Einrichtungen je Planet: Stufe 0 = nicht gebaut
  const FACIL = [
    { id: 'd',  name: 'Bohrturm',     max: 30, desc: 'Fördert Erz in Echtzeit', cost: (P_, l) => l ? P_.build * 0.5 * Math.pow(1.5, l) : P_.build },
    { id: 's',  name: 'Erzsilo',      max: 14, desc: 'Lager für mehr Stunden Förderung', need: 'd', cost: (P_, l) => P_.build * 0.4 * Math.pow(1.6, l + 1) },
    { id: 'dr', name: 'Sammeldrohnen', max: 5, desc: 'Je Stufe gehen 20 % der Förderung direkt ins Lager', need: 'd', cost: (P_, l) => P_.build * 2 * Math.pow(2.2, l) },
    { id: 'sm', name: 'Schmelze',     max: 10, desc: 'Erz dieses Planeten ist in der Raffinerie mehr wert', need: 'd', cost: (P_, l) => P_.build * 0.6 * Math.pow(1.7, l) },
    { id: 'lz', name: 'Lasermeißel',  max: 20, desc: 'Abbau per Tippen auf den Planeten', cost: (P_, l) => P_.build * 0.25 * Math.pow(1.55, l) },
  ];
  function mineState(m) { m.mine = m.mine || { p: {}, ore: {}, mined: 0 }; return m.mine; }
  const trv = (P_, k) => (P_ && P_.tr && P_.tr[k]) || 1;
  const PDEF = id => PLANETS.find(x => x.id === id);
  const mineRate = (d, P_) => d ? 45 * (1 + 0.2 * (d - 1)) * trv(P_, 'rate') : 0;                 // Erz pro Stunde (wächst linear, sonst wird der Bergbau zur Hauptquelle)
  const mineCapH = (s_, P_) => (3 + 1.5 * (s_ || 0)) * trv(P_, 'store');                          // Stunden bis voll
  const mineCap = (pl, P_) => mineRate(pl.d, P_) * mineCapH(pl.s, P_);
  const droneRate = dr => Math.min(1, 0.2 * (dr || 0));                                              // Anteil der Förderung, der direkt ins Lager geht
  const facCost = (P_, f, l) => Math.ceil(f.cost(P_, l));
  const planetOpen = (m, P_) => record(m) >= P_.at;
  const plOf = (m, id) => { const M = mineState(m); return M.p[id] = M.p[id] || { d: 0, s: 0, dr: 0, sm: 0, lz: 0, stock: 0, t: Date.now() }; };
  // Lagerstand fortschreiben; Drohnen leeren das Silo laufend ins Erzlager
  function mineTick(m, now) {
    const M = mineState(m); now = now || Date.now();
    for (const P_ of PLANETS) {
      const pl = M.p[P_.id]; if (!pl || !pl.d) continue;
      const dt = Math.max(0, Math.min(48 * 3600e3, now - (pl.t || now))), h = dt / 3600e3;
      const cap = mineCap(pl, P_), rate = mineRate(pl.d, P_) * achBonus(m).mine;
      if (pl.dr) {
        // Mit Drohnen läuft die Förderung (bis zur Drohnenleistung) direkt ins Lager
        const fl = rate * h * droneRate(pl.dr), take = Math.floor(fl + (pl.carry || 0));
        pl.carry = fl + (pl.carry || 0) - take;
        M.ore[P_.id] = (M.ore[P_.id] || 0) + take; M.mined = (M.mined || 0) + take;
        pl.stock = Math.min(cap, (pl.stock || 0) + Math.max(0, rate * h - fl));
      } else pl.stock = Math.min(cap, (pl.stock || 0) + rate * h);
      pl.t = now;
    }
    return M;
  }
  function mineCollect(m, id) {
    const M = mineTick(m); let got = 0;
    for (const P_ of PLANETS) {
      if (id && P_.id !== id) continue;
      const pl = M.p[P_.id]; if (!pl || !pl.stock) continue;
      const n = Math.floor(pl.stock); if (!n) continue;
      pl.stock -= n; M.ore[P_.id] = (M.ore[P_.id] || 0) + n; M.mined = (M.mined || 0) + n; got += n;
    }
    return got;
  }
  function mineUpgrade(m, id, fid) {
    mineTick(m);
    const P_ = PDEF(id), f = FACIL.find(x => x.id === fid); if (!P_ || !f || !planetOpen(m, P_)) return false;
    const pl = plOf(m, id), l = pl[fid] || 0;
    if (l >= f.max || (f.need && !pl[f.need])) return false;
    const c = facCost(P_, f, l); if (m.crystals < c) return false;
    m.crystals -= c; pl[fid] = l + 1; if (fid === 'd' && l === 0) pl.t = Date.now();
    return true;
  }
  // Lasermeißel: Bohrkraft lädt sich auf, jeder Treffer bringt Erz (etwa 20 s Förderung bzw. ein Grundwert)
  const tapMax = lz => 20 + 2 * lz;
  const tapRegen = 0.25; // pro Sekunde
  function tapYield(m, P_) { const pl = plOf(m, P_.id); return Math.max(1, (Math.max(mineRate(pl.d, P_), 45) / 30) * (1 + 0.5 * (pl.lz - 1)) * trv(P_, 'tap') * achBonus(m).mine); }
  function tapEnergy(m, now) { const M = mineState(m); now = now || Date.now(); const T = M.tap = M.tap || { e: 20, t: now }; const mx = Math.max(...PLANETS.map(P_ => tapMax((M.p[P_.id] || {}).lz || 0))); T.e = Math.min(mx, T.e + (now - T.t) / 1000 * tapRegen); T.t = now; return T; }
  function mineTap(m, id, rnd) {
    const P_ = PDEF(id), pl = plOf(m, id); if (!P_ || !planetOpen(m, P_) || !pl.lz) return null;
    const T = tapEnergy(m); if (T.e < 1) return null;
    T.e -= 1;
    const vein = (rnd || Math.random)() < 0.06 * trv(P_, 'vein');
    const n = Math.max(1, Math.round(tapYield(m, P_) * (vein ? 8 : 1)));
    const M = mineState(m); M.ore[id] = (M.ore[id] || 0) + n; M.mined = (M.mined || 0) + n;
    return { n, vein };
  }
  // Raffinerie: Erz gegen Kristalle; Wert folgt dem eigenen Kristall-Tempo, die Schmelze erhöht ihn
  // 1 Erz ≈ 1/600 Stunde Offline-Ertrag; spätere Planeten etwas wertvoller (je Sektor +20 %)
  const orePrice = (m, P_) => Math.max(0.5, offlinePerHour(m) / 600 * (1 + 0.2 * (P_.sector - 1)) * (1 + 0.06 * ((mineState(m).p[P_.id] || {}).sm || 0) * trv(P_, 'smelt')));
  function mineSell(m, id, n) {
    const M = mineState(m), P_ = PDEF(id); n = Math.min(Math.floor(n), M.ore[id] || 0); if (!P_ || n <= 0) return 0;
    const k = Math.floor(n * orePrice(m, P_)); M.ore[id] -= n; m.crystals += k; m.totalCrystals = (m.totalCrystals || 0) + k; return k;
  }
  // Werkstatt: Erz des passenden Sektors für Module
  const MOD_CRAFT = 300, modBoostCost = mod => 50 * Math.pow(2, mod.copies - 1), modRarCost = mod => 600 * Math.pow(4, mod.rar);
  const planetForModule = type => PLANETS.find(P_ => P_.sector === MODULES[type].sector);
  function modCraft(m, sector) {
    const P_ = PLANETS.find(x => x.sector === sector), M = mineState(m);
    if (!P_ || (M.ore[P_.id] || 0) < MOD_CRAFT) return null;
    M.ore[P_.id] -= MOD_CRAFT;
    const drop = rollModule((sector - 1) * 50 + 25); drop.result = addModule(m, drop); return drop;
  }
  const modMastCost = mod => Math.ceil(5000 * Math.pow(1.4, mod.mast || 0));
  // Forschung kaufen
  function research(m, id) {
    const M = mineState(m), P_ = PDEF(id); if (!P_ || !RESEARCH[id] || !planetOpen(m, P_)) return false;
    const l = researchLv(m, id), c = researchCost(l, id); if ((M.ore[id] || 0) < c) return false;
    M.ore[id] -= c; M.res = M.res || {}; M.res[id] = l + 1; return true;
  }
  function modImprove(m, type, what) {
    const mod = m.modules && m.modules[type], P_ = planetForModule(type), M = mineState(m); if (!mod || !P_) return false;
    if (what === 'mast') { if (mod.copies < 10 || mod.rar < 3) return false; const c = modMastCost(mod); if ((M.ore[P_.id] || 0) < c) return false; M.ore[P_.id] -= c; mod.mast = (mod.mast || 0) + 1; return true; }
    if (what === 'copy') { if (mod.copies >= 10) return false; const c = modBoostCost(mod); if ((M.ore[P_.id] || 0) < c) return false; M.ore[P_.id] -= c; mod.copies++; return true; }
    if (mod.rar >= 3) return false; const c = modRarCost(mod); if ((M.ore[P_.id] || 0) < c) return false; M.ore[P_.id] -= c; mod.rar++; return true;
  }

  // ---------- Hangar: Aussehen der Kanone, Teile werden über den Fortschritt freigeschaltet ----------
  const SKIN = {
    color: [
      { id: 'cyan',   name: 'Neon-Cyan',  col: '#3ef0ff' },
      { id: 'pink',   name: 'Magenta',    col: '#ff4fa0' },
      { id: 'green',  name: 'Smaragd',    col: '#5dffb0' },
      { id: 'gold',   name: 'Gold',       col: '#ffc04d', need: { rec: 50 } },
      { id: 'violet', name: 'Violett',    col: '#c3a6ff', need: { fus: 1 } },
      { id: 'ember',  name: 'Glut',       col: '#ff8a3d', need: { rec: 101 } },
      { id: 'ice',    name: 'Eisweiß',    col: '#e8fbff', need: { chal: 3 } },
      { id: 'plasma', name: 'Plasma',     col: null,      need: { fus: 5 } },
    ],
    turret: [
      { id: 'hex',     name: 'Sechskant' },
      { id: 'dome',    name: 'Kuppel',   need: { rec: 30 } },
      { id: 'wedge',   name: 'Keil',     need: { rec: 75 } },
      { id: 'orb',     name: 'Orb',      need: { chal: 8 } },
      { id: 'crystal', name: 'Kristall', need: { rec: 150 } },
    ],
    base: [
      { id: 'bunker',   name: 'Bunker' },
      { id: 'hover',    name: 'Schwebeplattform', need: { daily: 5 } },
      { id: 'tracks',   name: 'Kettenfahrwerk',   need: { runs: 100 } },
      { id: 'fortress', name: 'Festung',          need: { rec: 100 } },
    ],
    deco: [
      { id: 'pennant',   name: 'Wimpel',          need: { name: 1 } },
      { id: 'antenna',   name: 'Antennenkranz',   need: { rec: 40 } },
      { id: 'wings',     name: 'Flügel',          need: { rec: 51 } },
      { id: 'thrusters', name: 'Triebwerke',      need: { ore: 1000 } },
      { id: 'stars',     name: 'Sternenfunkeln',  need: { dailyBest: 30 } },
      { id: 'halo',      name: 'Heiligenschein',  need: { legend: 1 } },
    ],
  };
  const NEED_TXT = { rec: n => `Rekordwelle ${n}`, fus: n => n === 1 ? 'erste Kernfusion' : `${n} Kernfusionen`, chal: n => `${n} Herausforderungs-Stufen`,
    daily: n => `${n} Tagesläufe gespielt`, runs: n => `${n} Läufe`, name: () => 'Profilname festlegen', ore: n => `${n} Erz abgebaut`,
    dailyBest: n => `Tageslauf bis Welle ${n}`, legend: () => 'ein legendäres Modul' };
  function needVal(m, k) {
    switch (k) {
      case 'rec': return record(m);
      case 'fus': return m.fusions || 0;
      case 'chal': return CHALLENGES.reduce((a, c) => a + chalTier(m, c.id), 0);
      case 'daily': return m.dailyCount || 0;
      case 'runs': return m.runs || 0;
      case 'name': return m.name ? 1 : 0;
      case 'ore': return Math.floor((m.mine && m.mine.mined) || 0);
      case 'dailyBest': return m.dailyBestEver || 0;
      case 'legend': return Object.values(m.modules || {}).some(x => x.rar === 3) ? 1 : 0;
    }
    return 0;
  }
  // Freigeschaltet? Gibt auch den Text der Bedingung und den Fortschritt zurück
  function skinState(m, part) {
    if (!part.need) return { ok: true, txt: 'von Anfang an' };
    const k = Object.keys(part.need)[0], n = part.need[k], v = needVal(m, k);
    return { ok: v >= n, txt: NEED_TXT[k](n), k: n > 1 ? Math.min(1, v / n) : (v >= n ? 1 : 0) };
  }
  function skinUnlocked(m) { const out = []; for (const cat in SKIN) for (const p of SKIN[cat]) if (p.need && skinState(m, p).ok) out.push(cat + ':' + p.id); return out; }

  const VERSION = '0.8.0'; // gleich halten mit VERSION in sw.js
  root.Core = { VERSION, PLANETS, MINE_AT, FACIL, mineState, mineRate, mineCapH, mineCap, droneRate, facCost, planetOpen, plOf, mineTick, mineCollect, mineUpgrade, tapMax, tapRegen, tapYield, tapEnergy, mineTap, orePrice, mineSell, MOD_CRAFT, modBoostCost, modRarCost, modMastCost, RESEARCH, researchCost, researchLv, researchBonus, research, planetForModule, modCraft, modImprove, SKIN, skinState, skinUnlocked, CHALLENGES, CHAL_AT, xpFor, xpNeed, cmdState, rankOf, SK_BRANCH, SKILLS, SK_CAP_AT, skLv, skSpent, skPoints, skBranchPts, skCan, skOpen, skFix, SK_LINK_AT, skBuy, skReset, chalStart, chalMult, ACH, achVal, achTier, achBonus, achPoints, permBonus, statOf, DAILY_AT, chalTier, chalBonus, TWISTS, STD_LV, dayKey, dailyOf, dailyBonus, stdMeta, dropChance, WALL_R, WAVE_TYPES, GATES, MODULES_AT, FUSION_AT, ROADMAP, record, gateOk, nextUnlock, recommend, cheapest, MODULES, RARITY, MODULE_SLOTS, moduleValue, addModule, rollModule, FUSION_UPG, FUSION_MIN, SECTORS, sectorOf, flv, fragmentsFor, fuse, fusionCost, fusionBuy, milestoneReward, RUN_UPG, META_UPG, ENEMY, ABIL, SOURCES, Run, newMeta, mlv, metaCost, metaBuy, startEnergy, offlinePerHour, enemyHp, maxStartWave, startWaveFor, jumpShare, jumpBonus, FIELD_W, FIELD_H, BASE_R, WAVE_LEN, STRIKE_R, STRIKE_KILLS, P };
})(typeof window !== 'undefined' ? window : globalThis);
