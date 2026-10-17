// Kernwacht – Spielkern (ohne DOM, auch in Node lauffähig)
(function (root) {
  'use strict';

  // Balancing-Stellschrauben (Überschreiben per root.KW_P für Simulationen)
  const P0 = Object.assign({
    eHp: 1.13, eHpLin: 0.12, eDmg: 1.1, eDmgLin: 0.06, eDmgLate: 0.7, eDmgLateAt: 100, eRw: 1.02, eRwLin: 0,
    cBase: 2.5, cGrow: 1.01, cLate: 0.04, cBoss: 10, pDmg: 7, pHp: 80, lvDmg: 1.1, lvHp: 1.1, rw0: 1.3,
    rgMax: 0.05, rgK: 15, arMax: 0.65, arK: 15, arCap: 0.75, kamikaze: 3, multiDmg: 0.35, shockK: 0.9, mineK: 0.7, lootK: 0.05, nGrow: 1.2, bonusK: 0.025,
    labG: 1.2, fCore: 1.25, fCrys: 0.5, fragK: 1, fCoreG: 1.25, fCorePoly: 1.6, fCorePB: 5.2, fCoreLate: 1.028, resK: 2000, resCap: 1000, fragLate: 1.01, fragEarly: 1.5, fragLateAt: 150, mend: 0.03, mendBoss: 0.002, mendSelf: 0.01, mendOthers: 0.15, mendCalm: 1.5, gunFocusPct: 0.012, strikeDmg: 1.4, strikeBoss: 5, strikeBossT: 30, pierceK: 0.6, fragExp: 2.3, rwExp: 0, strikePct: 0.12, strikePart: 0.35, strikePartTo: 20, waveTypes: 1, shipCap: 14, aliveCap: 26, mendMax: 2, rushHit: 0.1, rushBossT: 15, rushLordT: 45, rushGap: 0.18, wmDmg: 0.8, bossWrath: 90, gunBossPct: 0.0004, xpLowAt: 0.5, jumpRec: 0.5, catchAt: 0.5, catchSpeed: 2, catchCrys: 2, bossHp: 2.5, bossHpEarly: 1.2, boss1Hp: 0.3, boss1Part: 0.45, bossHpLate: 150, bossDpsCheck: 0.04, miniScale: 1.3, bossBurst: 0.05, xpLow: 0.1,
    modK: { cryo: 0.3, thorn: 0.7, leech: 0.12, nova: 1 },
    chalHp: 1.5, chalFastWave: 1.5, chalPoor: 1 / 3, chalMine: 0.7, // Verschärfung nur in Challenges (nicht im Tageslauf)
    gunK: 3, rockLv: 0.04, shockLv: 0.3, shockRLow: 0.7, shockPct: 0, bladeLv: 0.25, bladeWall: 2, bladeRHi: 0.8, bladePart: 0.3, bladeCd: 1, bladeMax: 2, bladeStep: 8, aoeMax: 15, mineLv: 0.06, splK: 1, bladeV: 120, bladeK: 1.8,
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
    { id: 'shock',    tab: 'def', name: 'Schockwelle',      desc: 'Druckring bis weit ins Feld',      base: 50,  g: 1.2,  max: P0.aoeMax, req: 'u_shock' },
    { id: 'blade',    tab: 'def', name: 'Orbitklingen',     desc: 'Klingen kreisen auf einer Schleife: außen durchs Feld, innen am Schutzwall', base: 70,  g: 1.2,  max: P0.aoeMax, req: 'u_blade' },
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
    // Resonanz: wächst mit dem Rekord aller Zeiten (je Stufe ×(1 + Rekord/2000)), damit Kristalle auch spät zählen
    { id: 'm_rdmg',   name: 'Resonanzläufe',      desc: 'Schaden ×(1 + Rekord/2000) je Stufe, höchstens ×1,5', base: 2000, g: 1.35, res: 'dmg' },
    { id: 'm_rhp',    name: 'Resonanzpanzer',     desc: 'Strukturpunkte ×(1 + Rekord/2000) je Stufe, höchstens ×1,5', base: 2000, g: 1.35, res: 'hp' },
  ];

  // ---------- Kernfusion (Kernfragmente, überdauern jede Fusion) ----------
  const FUSION_UPG = [
    { id: 'f_core',   late: 200, name: 'Fusionskern',     desc: '×1,25 Schaden und Strukturpunkte', base: 3,  g: P0.fCoreG, poly: P0.fCorePoly, pbase: P0.fCorePB }, // Kosten wachsen polynomiell, damit Fusionen auch spät spürbar bleiben
    { id: 'f_crys',   name: 'Kristallmatrix',  desc: '+50 % Kristalle',                   base: 3,  g: 1.6 },
    { id: 'f_frag',   name: 'Fragmentfokus',   desc: '+20 % Kernfragmente bei der Fusion', base: 8, g: 1.8, max: 10 },
    { id: 'f_tech',   name: 'Archiv',          desc: 'Freischaltungen (Schockwelle, Stasis, Sprungtor …) bleiben bei der Fusion erhalten', base: 12, g: 1, max: 1, unlock: true },
    { id: 'f_keep',   name: 'Restwissen',      desc: 'Behält 10 % der Laborstufen bei der Fusion', base: 10, g: 2, max: 5 },
    // Nebenkanonen: erst ab der dritten Fusion und teuer, sie brauchen gezieltes Sparen bzw. Fragmentfokus
    { id: 'f_rocket', name: 'Raketenwerfer',   desc: 'Nebenkanone links: langsame Rakete mit großem Flächenschaden', base: 300, g: 1, max: 1, unlock: true, minFus: 3 },
    { id: 'f_cryo',   name: 'Kryowerfer',      desc: 'Nebenkanone rechts: verlangsamt getroffene Schiffe', base: 300, g: 1, max: 1, unlock: true, minFus: 3 },
  ];
  const FUSION_MIN = 50;
  const LORD_W = 50; // erster Herrscher: großer Meilenstein
  const lordCore = m => (m.best || 0) > LORD_W;
  const flv = (m, id) => (m.flv && m.flv[id]) || 0;
  function fragmentsFor(meta) {
    if (meta.best < FUSION_MIN) return 0;
    const full = P.fragK * Math.pow(meta.best / 10, P.fragExp) * (1 + 0.2 * flv(meta, 'f_frag')) * achBonus(meta).frag * Math.pow(P.fragLate, Math.max(0, meta.best - P.fragLateAt));
    const early = full * Math.pow(Math.min(1, meta.best / 100), P.fragEarly);
    // Herrscherkern: Herrscher bei Welle 50 in diesem Zyklus besiegt (Bestwelle über 50) → doppelt, höchstens die volle Menge (ab Welle 100 ohnehin voll)
    return Math.floor(lordCore(meta) ? Math.min(full, 2 * early) : early); // ab Welle 150 lohnt jede weitere Welle zusätzlich;
    // unter Welle 100 deutlich weniger (P.fragEarly): frühe Fusionen reichen nur für wenige Stufen Kern und Kristalle
  }
  // Fusion: Labor, Kristalle und Bestwelle zurücksetzen, Kernfragmente gutschreiben
  function fuse(meta) {
    const gain = fragmentsFor(meta);
    if (!gain) return 0;
    meta.frag = (meta.frag || 0) + gain;
    meta.fragTotal = (meta.fragTotal || 0) + gain;
    meta.fusWave = Math.max(fusWave(meta), meta.best); // vor dem Hochzählen: ältere Spielstände nehmen sonst den Rekord
    meta.fusions = (meta.fusions || 0) + 1;
    meta.bestEver = Math.max(meta.bestEver || 0, meta.best);
    // Bosse gelten nach der Fusion wieder als unbesiegt: Tempo 1× beim ersten Kampf, Bosskämpfe erst nach erneutem Sieg
    meta.bossBeat = {}; meta.bossSel = {};
    const keep = 0.1 * flv(meta, 'f_keep'), tech = flv(meta, 'f_tech') > 0, lv = {};
    for (const u of META_UPG) {
      const l = mlv(meta, u.id); if (!l) continue;
      if (u.unlock || u.req && u.max === 1) { if (tech) lv[u.id] = l; continue; }
      const k = Math.floor(l * keep);
      if (k && (!u.req || tech)) lv[u.id] = k;
    }
    meta.cph = (meta.cph || 0) * 0.3;
    meta.lv = lv; meta.crystals = 0; meta.best = 0; meta.startPref = null; meta.milestones = {};
    meta.fusGlow = 1; // erster Lauf nach der Fusion: Fusionsglut
    return gain;
  }
  // früh exponentiell (günstig), dann polynomiell; ab u.late wieder exponentiell (P.fCoreLate), sonst wächst der Fusionskern
  // schneller als die Gegner (Fragmente steigen exponentiell mit der Bestwelle) und läuft ins Unendliche
  function fusionCostOld(u, l) { const e = u.base * Math.pow(u.g, l); return Math.ceil(u.poly ? Math.min(e, (u.pbase || u.base) * Math.pow(l + 1, u.poly)) : e); }
  function fusionCostG(u, l, g) { return u.late && l > u.late ? Math.ceil(fusionCostOld(u, u.late) * Math.pow(g, l - u.late)) : fusionCostOld(u, l); }
  function fusionCost(u, l) { return fusionCostG(u, l, P.fCoreLate); } // früh exponentiell (günstig), spät polynomiell
  function fusionBuy(meta, u) {
    const l = flv(meta, u.id);
    if (u.max != null && l >= u.max) return false;
    if (u.minFus && (meta.fusions || 0) < u.minFus) return false;
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
  // Echo-Zyklen: ab Welle 251 laufen die Zonen im Kreis (251–300 Randzone II, 301–350 Smaragdnebel II …, ab 501 Zyklus III).
  // Die Bosse passen dazu (bossKind wiederholt den Plan alle 250 Wellen), die Gegnerstärke hängt weiter nur an der Welle.
  const ECHO_AT = 251, CYCLE_LEN = 250;
  const cycleOf = w => w < ECHO_AT ? 1 : 2 + Math.floor((w - ECHO_AT) / CYCLE_LEN);
  const sectorOf = w => { const i = Math.floor((Math.max(1, w) - 1) / 50); return SECTORS[w < ECHO_AT ? Math.min(SECTORS.length - 1, i) : i % SECTORS.length]; };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const cycleName = c => ROMAN[c - 1] || String(c);

  // ---------- Bosse: je Zone vier Wächter (Welle x10–x40) und ein riesiger Herrscher (x50) ----------
  // acts: Fähigkeiten im Wechsel; ph2/ph3: kommen beim Herrscher unter 66 % bzw. 33 % Lebenspunkten dazu.
  // parts: Bauteile mit eigenen Lebenspunkten (fwd/lat: Lage am Rumpf in Weltkoordinaten, hp: Anteil der Boss-LP)
  const clampR = (v, a, b) => Math.max(a, Math.min(b, v));
  const BOSS_KINDS = {
    gunboat: { name: 'Kanonenboot', hp: 1, r: 32, acts: ['salvo', 'broadside', 'spawn'], parts: [{ k: 'turret', lat: -44, fwd: 0, hp: 0.06, bonus: 0.04, r: 9 }, { k: 'turret', lat: 44, fwd: 0, hp: 0.06, bonus: 0.04, r: 9 }] },
    layer:   { name: 'Minenleger', hp: 1, r: 32, acts: ['mines', 'salvo', 'spawn'], parts: [{ k: 'rack', lat: -30, fwd: -30, hp: 0.06, bonus: 0.04, r: 9 }, { k: 'rack', lat: 30, fwd: -30, hp: 0.06, bonus: 0.04, r: 9 }, { k: 'armor', lat: 0, fwd: 30, hp: 0.07, bonus: 0.04, r: 10 }] },
    frigate: { name: 'Schildfregatte', chk: ['burst'], hp: 1.1, r: 32, acts: ['shield', 'salvo', 'spawn', 'broadside'], parts: [{ k: 'armor', lat: -48, fwd: 25, hp: 0.07, bonus: 0.04, r: 10 }, { k: 'armor', lat: 48, fwd: 25, hp: 0.07, bonus: 0.04, r: 10 }] },
    lancer:  { name: 'Lanzenträger', chk: ['dps'], hp: 1, r: 32, acts: ['laser', 'salvo', 'broadside'], parts: [{ k: 'lance', lat: 0, fwd: 62, hp: 0.07, bonus: 0.05, r: 9 }, { k: 'turret', lat: -40, fwd: -20, hp: 0.06, bonus: 0.04, r: 9 }, { k: 'turret', lat: 40, fwd: -20, hp: 0.06, bonus: 0.04, r: 9 }] },
    // Herrscher sind Riesen: Körper am oberen Rand, nicht anvisierbar; Schaden geht über die Bauteile (reach: Haltepunkt je nach Reichweite und Phase)
    bastion: { name: 'Großträger Bastion', chk: ['def'], hp: 2, r: 60, lord: true, giant: true, acts: ['salvo', 'bomb', 'broadside'], ph2: ['shield'], ph3: ['laser'], reach: (R) => clampR(95 + Math.sqrt(Math.max(0, (R - 12) ** 2 - 120 ** 2)), 200, 430),
      parts: [-120, -40, 40, 120].map(lat => ({ k: 'turret', lat, fwd: 95, hp: 0.06, bonus: 0.03, r: 11 })).concat([-80, 80].map(lat => ({ k: 'gate', lat, fwd: 72, hp: 0.08, bonus: 0.05, r: 14 }))) },
    // Zone 2 · Smaragdnebel: organisch, Tarnung, Tentakel
    ray:      { name: 'Nebelrochen', chk: ['dps'], hp: 1, r: 36, glide: 0.8, acts: ['cloak', 'salvo', 'broadside'], parts: [{ k: 'armor', lat: -62, fwd: -12, hp: 0.07, bonus: 0.04, r: 10 }, { k: 'armor', lat: 62, fwd: -12, hp: 0.07, bonus: 0.04, r: 10 }] },
    jelly:    { name: 'Sporenqualle', chk: ['sustain'], hp: 1, r: 32, acts: ['spores', 'salvo', 'cloak'], parts: [{ k: 'tentacle', lat: -22, delay: 0 }, { k: 'tentacle', lat: 0, delay: 1.5 }, { k: 'tentacle', lat: 22, delay: 3 }] },
    squid:    { name: 'Tentakler', hp: 1, r: 32, far: true, acts: ['salvo', 'spawn'], parts: [{ k: 'tentacle', lat: -30, delay: 0 }, { k: 'tentacle', lat: -10, delay: 1.2 }, { k: 'tentacle', lat: 10, delay: 2.4 }, { k: 'tentacle', lat: 30, delay: 3.6 }] },
    queen:    { name: 'Schwarmkönigin', chk: ['def'], hp: 1, r: 32, acts: ['swarm', 'shield', 'spawn'], parts: [{ k: 'gate', lat: -42, fwd: -18, hp: 0.07, bonus: 0.04, r: 11 }, { k: 'gate', lat: 42, fwd: -18, hp: 0.07, bonus: 0.04, r: 11 }] },
    // Riesen-Oktopus: Mantel über die ganze Breite am oberen Rand, nur Arme und (ab Phase 2) Augen sind erreichbar
    leviathan:{ name: 'Leviathan', hp: 2, r: 60, lord: true, giant: true, acts: ['salvo', 'spores'], ph2: ['swarm'], ph3: ['ink'], reach: (R, ph) => ph >= 1 ? clampR(R + 52, 260, 430) : 430,
      parts: [{ k: 'eye', lat: -95, fwd: 62, hp: 0.08, bonus: 0.1, r: 16 }, { k: 'eye', lat: 95, fwd: 62, hp: 0.08, bonus: 0.1, r: 16 }].concat([-175, -125, -75, -25, 25, 75, 125, 175].map((lat, i) => ({ k: 'arm', lat, i }))) },
    // Zone 3 · Glutgürtel: Feuer und Gestein
    emberorb: { name: 'Glutorb', chk: ['sustain'], hp: 1, r: 30, acts: ['nova', 'salvo', 'fireball'], parts: [0, 1, 2].map(i => ({ k: 'armor', orbit: 52, i, n: 3, hp: 0.06, bonus: 0.04, r: 9 })) },
    worm:     { name: 'Magmawurm', hp: 1, r: 26, worm: true, acts: ['salvo', 'nova', 'spawn'], parts: [0, 1, 2].flatMap(i => [{ k: 'segment', i, side: -1 }, { k: 'segment', i, side: 1 }]) },
    bulwarkcr:{ name: 'Bollwerkkreuzer', chk: ['burst'], hp: 1.1, r: 34, acts: ['bulwarks', 'shield', 'broadside'], parts: [{ k: 'armor', lat: -26, fwd: 48, hp: 0.07, bonus: 0.04, r: 10 }, { k: 'armor', lat: 26, fwd: 48, hp: 0.07, bonus: 0.04, r: 10 }] },
    forge:    { name: 'Schmiedeschiff', chk: ['dps'], hp: 1, r: 32, acts: ['laser', 'bomb', 'broadside'], parts: [{ k: 'lance', lat: 0, fwd: 58, hp: 0.07, bonus: 0.05, r: 9 }, { k: 'turret', lat: -42, fwd: -12, hp: 0.06, bonus: 0.04, r: 9 }, { k: 'turret', lat: 42, fwd: -12, hp: 0.06, bonus: 0.04, r: 9 }] },
    titan:    { name: 'Vulkan-Titan', chk: ['def', 'sustain'], hp: 2, r: 60, lord: true, giant: true, acts: ['lava', 'salvo', 'bomb'], ph2: ['nova'], ph3: ['laser'], reach: (R) => clampR(70 + Math.sqrt(Math.max(0, (R - 12) ** 2 - 150 ** 2)), 220, 430),
      parts: [-120, -40, 40, 120].map(lat => ({ k: 'vent', lat, fwd: 95, hp: 0.07, bonus: 0.04, r: 13 })).concat([-150, 150].map(lat => ({ k: 'turret', lat, fwd: 70, hp: 0.05, bonus: 0.03, r: 11 }))) },
    // Zone 4 · Roter Riese: Sonne und Glut
    sunwing:  { name: 'Sonnenflieger', chk: ['dps'], hp: 1, r: 30, glide: 1.1, acts: ['broadside', 'salvo', 'fireball'], parts: [{ k: 'turret', lat: -72, fwd: -8, hp: 0.06, bonus: 0.04, r: 9 }, { k: 'turret', lat: 72, fwd: -8, hp: 0.06, bonus: 0.04, r: 9 }] },
    splitcore:{ name: 'Splitterkern', chk: ['def'], hp: 0.8, r: 32, split: true, acts: ['nova', 'salvo', 'spawn'], parts: [0, 1, 2].map(i => ({ k: 'armor', orbit: 50, i, n: 3, hp: 0.06, bonus: 0.04, r: 9 })) },
    shard:    { name: 'Kernsplitter', hp: 0.2, r: 14, acts: ['salvo', 'nova'] },
    flameorb: { name: 'Flammenorb', chk: ['sustain'], hp: 1, r: 32, acts: ['fireball', 'nova', 'lava'], parts: [0, 1, 2].map(i => ({ k: 'armor', orbit: 54, i, n: 3, hp: 0.06, bonus: 0.04, r: 9 })) },
    corona:   { name: 'Koronakreuzer', chk: ['burst'], hp: 1.1, r: 34, acts: ['laser', 'shield', 'broadside'], parts: [{ k: 'lance', lat: 0, fwd: 64, hp: 0.07, bonus: 0.05, r: 9 }, { k: 'turret', lat: -46, fwd: 0, hp: 0.06, bonus: 0.04, r: 9 }, { k: 'turret', lat: 46, fwd: 0, hp: 0.06, bonus: 0.04, r: 9 }] },
    phoenix:  { name: 'Phönix', chk: ['dps', 'sustain'], hp: 1.6, r: 60, lord: true, giant: true, rebirth: true, acts: ['fireball', 'nova', 'salvo'], ph2: ['laser'], ph3: ['lava'], reach: (R) => clampR(80 + Math.sqrt(Math.max(0, (R - 15) * (R - 15) - 130 * 130)), 220, 430),
      parts: [{ k: 'gwing', lat: -130, fwd: 80, hp: 0.12, bonus: 0.08, r: 18 }, { k: 'gwing', lat: 130, fwd: 80, hp: 0.12, bonus: 0.08, r: 18 }, { k: 'head', lat: 0, fwd: 110, hp: 0.1, bonus: 0.05, r: 16 }] },
    // Zone 5 · Die Leere
    eye:      { name: 'Leerauge', chk: ['dps'], hp: 1, r: 32, acts: ['laser', 'cloak', 'salvo'], parts: [{ k: 'tentacle', lat: -24, delay: 0 }, { k: 'tentacle', lat: 24, delay: 2 }] },
    shrine:   { name: 'Heilerschrein', chk: ['dps'], hp: 1, r: 32, acts: ['mend', 'spawn', 'shield', 'salvo'], parts: [0, 1, 2, 3].map(i => ({ k: 'seal', orbit: 52, i, n: 4, hp: 0.06, bonus: 0.04, r: 9 })) },
    mirror:   { name: 'Spiegler', chk: ['def'], hp: 1, r: 32, acts: ['mirror', 'salvo', 'broadside'], parts: [{ k: 'prism', lat: -46, fwd: 0, hp: 0.07, bonus: 0.04, r: 9 }, { k: 'prism', lat: 46, fwd: 0, hp: 0.07, bonus: 0.04, r: 9 }] },
    shade:    { name: 'Schattenrochen', chk: ['burst'], hp: 1, r: 42, glide: 0.9, acts: ['cloak', 'salvo', 'broadside'], parts: [{ k: 'armor', lat: -74, fwd: -14, hp: 0.07, bonus: 0.04, r: 10 }, { k: 'armor', lat: 74, fwd: -14, hp: 0.07, bonus: 0.04, r: 10 }] },
    devourer: { name: 'Der Verschlinger', chk: ['dps', 'sustain'], hp: 2, r: 60, lord: true, giant: true, acts: ['pull', 'mend', 'salvo'], ph2: ['spawn'], ph3: ['laser'], reach: (R, ph) => ph >= 1 ? clampR(R + 60, 260, 430) : 430,
      parts: [{ k: 'core', lat: 0, fwd: 72, hp: 0.1, bonus: 0.1, r: 18 }].concat([-150, -60, 60, 150].map((lat, i) => ({ k: 'arm', lat, i: i * 2 }))) },
  };
  // Prüfungen: was ein Boss beim Spieler testet
  //  dps     Schadensprobe: verliert er in 10 s zu wenig Lebenspunkte, heizt er auf (+30 % Schaden je Stufe)
  //  def     Sturmangriff: alle 18 s ein schwerer Fächer (Hülle und Panzerung zählen)
  //  sustain Glutstrahlung: ständiger Schaden an der Kanone (Reparatur zählt)
  //  burst   Panzerschild: alle 16 s ein Schild, der Schaden schluckt; nicht in 6 s gebrochen, heilt sich der Boss
  const BOSS_CHECK = { dps: 'Schadensprobe', def: 'Sturmangriff', sustain: 'Glutstrahlung', burst: 'Panzerschild' };
  const BOSS_ACT_NAME = { ink: 'Tintenwolke', storm: 'Sturmangriff', spores: 'Sporen', swarm: 'Schwarm', fireball: 'Feuerbälle', lava: 'Lavaregen', mirror: 'Spiegel', pull: 'Sog', salvo: 'Salve', broadside: 'Breitseite', spawn: 'Jägerstaffel', hangar: 'Hangar', bomb: 'Bombe', mines: 'Minenteppich', shield: 'Schild', laser: 'Laser', cloak: 'Tarnung', bulwarks: 'Schildträger', nova: 'Nova', mend: 'Reparatur' };
  const BOSS_ROSTER = { 1: ['gunboat', 'layer', 'frigate', 'lancer', 'bastion'], 2: ['ray', 'jelly', 'squid', 'queen', 'leviathan'], 3: ['emberorb', 'worm', 'bulwarkcr', 'forge', 'titan'],
    4: ['sunwing', 'splitcore', 'flameorb', 'corona', 'phoenix'], 5: ['eye', 'shrine', 'mirror', 'shade', 'devourer'] };
  // nach Welle 250 kommen alle 25 Bosse in fester Reihenfolge wieder
  // Wellen, in denen ein Boss vorkommt (bis zur Grenze)
  function bossWaves(kind, upTo) { const out = []; for (let w = 10; w <= upTo; w += 10) if (bossKind(w) === kind) out.push(w); return out; }
  function bossKind(w) {
    if (w % 10) return null;
    const i = (w / 10 - 1) % 25, ro = BOSS_ROSTER[Math.floor(i / 5) + 1];
    return ro ? ro[i % 5] : null;
  }

  // ---------- Boss-Module: Beute der Bosse, je Sektor eigene Typen ----------
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
  // Beute würfeln: Typ aus dem Sektor der Welle (in Echo-Zyklen die gerade gezeigte Zone), Seltenheit steigt mit der Welle
  // und mit dem Zyklus: ab Zyklus II wird „gewöhnlich“ seltener, ab Zyklus III mindestens „selten“.
  // meta + lord: Herrscher in Echo-Zyklen wählen aus allen Modulen, bevorzugt die mit den wenigsten Kopien
  function rollModule(w, meta, lord) {
    const sec = sectorOf(w).n, c = cycleOf(w);
    let type;
    if (lord && c > 1) {
      const all = Object.keys(MODULES), wt = all.map(t => { const m = meta && meta.modules && meta.modules[t]; return m ? 11 - Math.min(10, m.copies) + (m.rar < 3 ? 2 : 0) : 14; });
      let q = Math.random() * wt.reduce((a, b) => a + b, 0); type = all[all.length - 1];
      for (let i = 0; i < all.length; i++) { if (q < wt[i]) { type = all[i]; break; } q -= wt[i]; }
    } else {
      const types = Object.keys(MODULES).filter(t => MODULES[t].sector === sec);
      type = types[Math.floor(Math.random() * types.length)];
    }
    const r = Math.random(), within = Math.min(1.6, ((w - 1) % 50) / 50 + 0.3 * (c - 1));
    let rar = r < 0.02 + 0.08 * within ? 3 : r < 0.1 + 0.15 * within ? 2 : r < 0.35 + 0.15 * within ? 1 : 0;
    if (c >= 3) rar = Math.max(1, rar);
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
  // Weitere Modulplätze als Fusions-Meilensteine (siehe FUS_MILES)
  const modSlots = m => MODULE_SLOTS + (fusMile(m, 'slot4') ? 1 : 0) + (fusMile(m, 'slot5') ? 1 : 0);
  // Beutechance steigt mit der Welle des Bosses: 20 % bei Welle 30 bis max. 85 %; in Echo-Zyklen 50 % (Herrscher wählen dafür gezielt fehlende Module)
  const dropChance = w => cycleOf(w) > 1 ? 0.5 : Math.max(0, Math.min(0.85, 0.2 + (w - 30) * 0.005));

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
    part:    { hp: 1,   spd: 0,  dmg: 0,   rw: 0,   r: 7,  col: 'part' }, // Bauteil eines Bosses (Geschützturm …)
    phantom: { hp: 6,   spd: 34, dmg: 1,   rw: 2,   r: 7,  col: 'phantom', cloakFrom: 170 },
    bulwark: { hp: 20,  spd: 15, dmg: 2,   rw: 4,   r: 12, col: 'bulwark' },
    splitter:{ hp: 12,  spd: 22, dmg: 1.5, rw: 2,   r: 10, col: 'splitter' },
    shard:   { hp: 3,   spd: 40, dmg: 0.6, rw: 0.6, r: 6,  col: 'splitter' },
    mender:  { hp: 10,  spd: 20, dmg: 0.5, rw: 3,   r: 9,  col: 'mender', stop: 230 },
    bomb:    { hp: 1,   spd: 34, dmg: 0,   rw: 0.5, r: 8,  col: 'bomb' },
  };

  const FIELD_W = 240, FIELD_H = 430, BASE_R = 22, WALL_R = 50, WAVE_LEN = 20, SPAWN_LEN = 15;
  const STRIKE_KILLS = 30, STRIKE_R = 80;
  const AUTO_W = { atk: 40, def: 45, eco: 15 }; // Standardverteilung der Energie beim Auto-Kauf (Prozent)

  function newMeta() {
    return { v: 1, crystals: 0, best: 0, runs: 0, kills: 0, lv: {}, lastSeen: Date.now(), totalCrystals: 0 };
  }
  const mlv = (m, id) => (m.lv && m.lv[id]) || 0;

  function metaCost(u, l) { return Math.ceil(u.base * Math.pow(u.g, l)); }
  function cheapMult(meta) { return Math.pow(0.98, mlv(meta, 'm_cheap')); }
  function startEnergy(meta) { const l = mlv(meta, 'm_start'); return l ? Math.round(10 * l * Math.pow(1.12, l)) : 0; }

  const P = P0;
  const hpScale = w => Math.pow(1 + P.eHpLin * (w - 1), 2) * Math.pow(P.eHp, w - 1);
  const dmgBase = w => (1 + P.eDmgLin * (w - 1)) * Math.pow(P.eDmg, w - 1);
  // Ab P.eDmgLateAt wächst der Gegnerschaden anteilig (P.eDmgLate, 1 = ganz) so schnell wie die Gegner-LP.
  // Sonst fällt er immer weiter hinter die Strukturpunkte zurück, die über Fusionskern und Labor im Takt mit dem Schaden wachsen,
  // und spät reicht reiner Angriff.
  const dmgScale = w => {
    const A = P.eDmgLateAt; if (!P.eDmgLate || w <= A) return dmgBase(w);
    return dmgBase(w) * Math.pow(hpScale(w) / hpScale(A) / (dmgBase(w) / dmgBase(A)), P.eDmgLate);
  };
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

  const MINE_FUSE = 10; // Sekunden, bis eine unberührte Mine von selbst detoniert
  const SOURCES = ['gun', 'rocket', 'cryo', 'mine', 'shock', 'blade', 'strike', 'mod', 'dot', 'skill', 'elem'];
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
  const GATES = { m_rdmg: 250, m_rhp: 250, u_freeze: 15, m_freeze: 15, u_blade: 20, u_over: 25, m_over: 25, u_jump: 25, m_jump: 25, u_mine: 35 };
  const MODULES_AT = 30, FUSION_AT = 50;
  // Kommandant (Rang, Skills): ab dieser Rekordwelle und nach der ersten Fusion
  // Elemente: Fusions-Meilenstein „slot4“ (siehe FUS_MILES)
  // Labor-Upgrades mit Kristallen: im laufenden Lauf erst ab dieser Rekordwelle (vorher: Lauf, Scheitern, Labor, neuer Lauf).
  // Alles andere Dauerhafte (Skills, Elemente, Fusion, Bergbau) gibt es im Lauf gar nicht.
  const BUY_RUN_AT = 150;
  // Tempo 2× und Wellen vorzeitig rufen erst nach dem ersten Boss, 4× ab TEMPO4_AT: Anfänger lernen in Ruhe,
  // und bis zur ersten Fusion vergeht auch mit 4× mindestens etwa eine Stunde
  const TEMPO_AT = 10, TEMPO4_AT = 40;
  // Fahrplan: Freischaltungen nach Rekordwelle, manche zusätzlich mit Bedingung (need). Vor der ersten Fusion nur Lauf, Labor und Bosse,
  // alles Weitere kommt mit der Fusion. desc erklärt beim Freischalten, was es ist und wo man es findet.
  const ROADMAP = [
    { id: 'boss', w: 10, label: 'Erster Boss' },
    { id: 'freeze', w: 15, label: 'Stasisfeld im Labor' },
    { id: 'blade', w: 20, label: 'Orbitklingen im Labor' },
    { id: 'over', w: 25, label: 'Überladung und Sprungtor im Labor' },
    { id: 'mine', w: 35, label: 'Minenwerfer im Labor' },
    { id: 'fusion', w: 50, label: 'Kernfusion', desc: 'Setzt Labor, Kristalle und Bestwelle zurück und gibt dafür Kernfragmente für dauerhafte Technik. Lohnt sich, wenn das Labor kaum noch weiterbringt. Im Menü unter „Kernfusion“.' },
    { id: 'sec2', w: 51, label: 'Sektor 2: Smaragdnebel, Eismond Kryos' },
    { id: 'mod', w: 50, label: 'Boss-Module (nach der ersten Fusion)', need: m => (m.fusions || 0) >= 1, needTxt: 'nach der ersten Fusion', desc: 'Bosse lassen jetzt Module fallen. Ausgerüstete Module verändern Geschosse und Fähigkeiten, jeder weitere Fund macht sie stärker. Im Menü unter „Module“.' },
    { id: 'extra', w: 50, label: 'Erfolge, Hangar und Bosskämpfe', need: m => (m.fusions || 0) >= 1, needTxt: 'nach der ersten Fusion', desc: 'Erfolge geben dauerhafte Boni, im Hangar gestaltest du deine Kanone, besiegte Bosse kannst du gezielt herausfordern. Im Menü unter „Mehr“, „Welt“ und „Modi“.' },
    { id: 'cmd', w: 75, label: 'Kommandant', need: m => cmdOpen(m), needTxt: 'mit einer Fusion bei Welle 75 oder höher, ab der 2. Fusion', desc: 'Jede Welle gibt Erfahrung, jeder Rang einen Skillpunkt für die Sternkarte. Im Menü unter „Kommandant“.' },
    { id: 'chal', w: 100, label: 'Herausforderungen und Tageslauf', need: m => chalOpen(m), needTxt: 'mit einer Fusion bei Welle 100 oder höher, ab der 3. Fusion', desc: 'Herausforderungen sind Läufe mit Handicap für dauerhafte Boni, der Tageslauf ist für alle gleich und gibt einmal am Tag eine Belohnung. Beides im Menü.' },
    { id: 'rush', w: 100, label: 'Durchmarsch, Wellensprung und Bergbau', need: m => fusMile(m, 'rush'), needTxt: 'mit einer Fusion bei Welle 100 oder höher, ab der 2. Fusion', desc: 'Mühelose Wellen laufen gestaucht, ganze Zehnerblöcke werden übersprungen. Dazu der Bergbau: Planeten liefern Erz für Forschung und Module. Im Menü unter „Bergbau“.' },
    { id: 'sec3', w: 101, label: 'Sektor 3: Glutgürtel, Glutwelt Ignis' },
    { id: 'elem', w: 150, label: 'Elementarmagie', need: m => elUnlocked(m), needTxt: 'mit einer Fusion bei Welle 150 oder höher, ab der 3. Fusion', desc: 'Feuer, Eis oder Licht: eine eigene Fähigkeit im Lauf mit eigenem Baum. Im Menü unter „Elemente“.' },
    { id: 'sec4', w: 151, label: 'Sektor 4: Roter Riese, Roter Zwerg Nox' },
    { id: 'sec5', w: 201, label: 'Sektor 5: Die Leere, Rand der Leere' },
    { id: 'echo', w: 251, label: 'Echo-Zyklen: die Zonen kehren wieder, alle Module wieder auffindbar' },
  ].sort((a, b) => a.w - b.w);
  const record = m => Math.max(m.bestEver || 0, m.best || 0);
  const gateOk = (m, id) => record(m) >= (GATES[id] || 0);
  const buyInRun = m => record(m) >= BUY_RUN_AT;
  const tempoOpen = m => record(m) >= TEMPO_AT;
  const tempo4Open = m => record(m) >= TEMPO4_AT;
  // Fusionswelle: höchste Bestwelle, bei der fusioniert wurde (ältere Spielstände ohne Wert: Rekord, falls schon fusioniert)
  const fusWave = m => m.fusWave != null ? m.fusWave : (m.fusions ? record(m) : 0);
  // Fusions-Meilensteine: zählen nicht die Anzahl, sondern wie weit man vor einer Fusion gekommen ist
  // Jeder Meilenstein braucht beides: eine Fusion bei Welle w oder höher und mindestens n Fusionen (nichts lässt sich überspringen)
  const FUS_MILES = [
    { w: 75, n: 2, id: 'cmd', txt: 'Kommandant' },
    { w: 100, n: 2, id: 'rush', txt: 'Durchmarsch, Wellensprung und Bergbau' },
    { w: 100, n: 3, id: 'chal', txt: 'Herausforderungen und Tageslauf' },
    { w: 150, n: 3, id: 'slot4', txt: 'Elementarmagie und vierter Modulplatz' },
    { w: 200, n: 4, id: 'glow', txt: 'Fusionsglut: dreifache statt doppelte Erfahrung im ersten Lauf nach der Fusion' },
    { w: 250, n: 5, id: 'slot5', txt: 'Fünfter Modulplatz' },
  ];
  const mileOk = (m, x) => fusWave(m) >= x.w && (m.fusions || 0) >= x.n;
  const fusMile = (m, id) => mileOk(m, FUS_MILES.find(x => x.id === id));
  const mileTxt = x => `mit einer Fusion bei Welle ${x.w} oder höher, ab der ${x.n}. Fusion`;
  // Fusionsglut: der erste Lauf nach jeder Fusion bringt mehr Erfahrung (Kommandant und Element), auch unter dem Rekord
  const fusGlow = m => fusMile(m, 'glow') ? 3 : 2;
  const rushOpen = m => fusMile(m, 'rush');
  // Kommandant: einmal freigeschaltet, bleibt er (auch ältere Spielstände mit verteilten Punkten, siehe game.js)
  const cmdOpen = m => !!m.cmdOpen || fusMile(m, 'cmd');
  // elUnlocked hat nur eine Bedingung (Rekord ODER Fusion + Welle 50), dort zählt need allein
  const unlocked = (m, x) => x.id === 'elem' ? x.need(m) : record(m) >= x.w && (!x.need || x.need(m));
  function nextUnlock(m) { return ROADMAP.find(x => !unlocked(m, x)) || null; }
  // Weitere Funktionen nach der Fusion; wer sie schon benutzt hat, behält sie
  // Anfänger: vor der ersten Fusion zählt nur Lauf, Labor und Bosse (Grundschleife)
  const beginner = m => !((m.fusions || 0) >= 1);
  const modOpen = m => ((m.fusions || 0) >= 1 && record(m) >= MODULES_AT) || Object.keys(m.modules || {}).length > 0;
  const chalOpen = m => fusMile(m, 'chal') || Object.keys(m.chal || {}).length > 0;
  const dailyOpen = m => fusMile(m, 'chal') || (m.dailyCount || 0) > 0;
  const mineOpen = m => fusMile(m, 'rush') || !!(m.mine && m.mine.p && Object.keys(m.mine.p).length);
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
    // nach einer Fusion: mindestens die Hälfte des Anteils, gemessen am Rekord über alle Fusionen (15 % bei Sprungweite 0)
    const sh = jumpShare(lvl == null ? mlv(meta, 'm_jump') : lvl);
    const lim = Math.max(meta.best * sh, record(meta) * sh * P.jumpRec);
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
    { id: 'bosses', name: 'Bossjäger', what: 'Bosse besiegt', goals: [10, 50, 250, 1e3, 5e3],               bonus: 'boss',   step: 0.04, bname: 'Schaden gegen Bosse' },
    { id: 'mods',   name: 'Sammler',          what: 'Modulkopien gesammelt',  goals: [10, 25, 50, 75, 100],                 bonus: 'mod',    step: 0.02, bname: 'Modulwirkung' },
    { id: 'fus',    name: 'Kernschmelze',     what: 'Kernfusionen',           goals: [1, 3, 5, 10, 20],                     bonus: 'frag',   step: 0.04, bname: 'Fusionsfragmente' },
    { id: 'daily',  name: 'Stammgast',        what: 'Tagesläufe',             goals: [5, 20, 50, 100],                      bonus: 'loot',   step: 0.03, bname: 'Energie' },
    { id: 'ore',    name: 'Tiefbohrer',       what: 'Erz abgebaut',           goals: [1e4, 1e6, 1e8, 1e10],                 bonus: 'mine',   step: 0.05, bname: 'Förderung' },
    { id: 'strike', name: 'Feuer von oben',   what: 'Orbitalschläge',         goals: [50, 250, 1e3, 5e3],                   bonus: 'strike', step: 0.03, bname: 'Orbitalschaden' },
    { id: 'depth',  name: 'Tiefenläufer',     what: 'Echo-Zyklus erreicht',   goals: [2, 3, 4, 6, 8],                       bonus: 'crys',   step: 0.03, bname: 'Kristalle' },
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
      case 'depth': return cycleOf(record(m));
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
    const c = chalBonus(m), a = achBonus(m), r = researchBonus(m), ms = Math.pow(SK_MASTER_K, skMastery(m));
    return { hp: c.hp * a.hp * a.all * r.hp * ms, rate: c.rate * a.rate * a.all * r.rate, dmg: c.dmg * a.dmg * a.all * r.dmg * ms, master: ms, loot: c.loot * a.loot * a.all * r.loot, crys: c.crys * a.crys * a.all,
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
    { id: 'p_mark',   br: 'p', par: 'p_pierce', max: 2, name: 'Schwachstelle',    desc: l => `Markierte Ziele erleiden ${pc(0.2 * l)} mehr Schaden aus allen Quellen, auch Bosse` },
    { id: 'p_poison', br: 'p', par: 'p_cal', max: 3, name: 'Giftgeschosse',    desc: l => `Kanonentreffer vergiften: ${pc(0.1 * l)} des Treffers pro Sekunde, klingt in 3 s ab, stapelt. Dazu ${(0.05 * l).toFixed(2).replace('.', ',')} % der Lebenspunkte pro Sekunde (Bosse ${(0.01 * l).toFixed(2).replace('.', ',')} %)` },
    { id: 'p_vamp',   br: 'p', par: 'p_poison', max: 3, name: 'Vampirgeschosse',  desc: l => `Jeder Kanonentreffer repariert ${(0.03 * l).toFixed(2).replace('.', ',')} % der Hülle` },
    { id: 'p_exec',   br: 'p', par: 'p_poison', max: 3, name: 'Hinrichtung',      desc: l => `Kanonentreffer zerstören Schiffe unter ${pc(0.05 * l)} Lebenspunkten sofort (keine Bosse)` },
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
    { id: 't_hole',   br: 't', par: 't_call', cap: 1, name: 'Schwarzes Loch',   desc: () => 'Alle 20 s zieht ein Wirbel Schiffe 3 s lang zusammen und beschädigt sie (keine Bosse)' },
  ];
  const SK_BY_ID = {}; SKILLS.forEach(k => (SK_BY_ID[k.id] = k));
  const SK_CAP_AT = 8; // Punkte im Ast für den Schlussstein
  const SK_CAP2_AT = 70; // ab diesem Rang ist auch der zweite Schlussstein je Ast wählbar
  const SK_MASTER_K = 1.08; // Meisterschaft: je übrigem Punkt ×1,08 Schaden und Strukturpunkte
  const SK_LINK_AT = 6; // Punkte in beiden Nachbarästen für einen Brückenknoten
  const skLv = (m, id) => (m.sk && m.sk[id]) || 0;
  // zweiter Schlussstein eines Asts (ab Rang 70) kostet keinen Punkt
  const skCap2 = (m, br) => SKILLS.filter(x => x.br === br && x.cap && skLv(m, x.id)).length >= 2;
  const skSpent = m => Object.values(m.sk || {}).reduce((a, b) => a + b, 0) - SK_BRANCH.filter(b => skCap2(m, b.id)).length;
  const skPoints = m => rankOf(m).rank - skSpent(m);
  const skBranchPts = (m, br) => SKILLS.filter(k => k.br === br).reduce((a, k) => a + skLv(m, k.id), 0);
  // Baum: jeder Knoten braucht seinen Elternknoten (par); Schlussstein zusätzlich 8 Punkte im Ast und
  // keinen anderen Schlussstein im Ast; Brückenknoten (link) je 6 Punkte in beiden Nachbarästen
  function skOpen(m, id) {
    const k = SK_BY_ID[id]; if (!k) return false;
    if (k.link) return k.link.every(b => skBranchPts(m, b) >= SK_LINK_AT);
    if (k.par && !skLv(m, k.par)) return false;
    if (k.cap) return (!SKILLS.some(x => x.br === k.br && x.cap && x.id !== id && skLv(m, x.id)) || rankOf(m).rank >= SK_CAP2_AT) && skBranchPts(m, k.br) - skLv(m, id) >= SK_CAP_AT;
    return true;
  }
  function skCan(m, id) {
    const k = SK_BY_ID[id]; if (!k) return false;
    const free2 = k.cap && SKILLS.some(x => x.br === k.br && x.cap && x.id !== id && skLv(m, x.id)); // zweiter Schlussstein: kostenlos
    if (!free2 && skPoints(m) < 1) return false;
    return skLv(m, id) < (k.cap ? 1 : k.max) && skOpen(m, id);
  }
  // Ungültige Knoten (z. B. nach Umbau des Baums) entfernen; die Punkte werden damit wieder frei
  function skFix(m) {
    if (!m.sk) return 0; let n = 0, ch = true;
    for (const id in m.sk) if (!SK_BY_ID[id] || !m.sk[id]) { n += m.sk[id] || 0; delete m.sk[id]; }
    while (ch) { ch = false; for (const id in m.sk) if (!skOpen(m, id)) { n += m.sk[id]; delete m.sk[id]; ch = true; } }
    return n;
  }
  // Meisterschaft: jeder Rang über dem vollen Baum (57 Punkte) wirkt automatisch;
  // hängt nur am Rang, nicht daran, ob schon alles verteilt ist
  const SK_TREE = SKILLS.reduce((a, k) => a + (k.cap ? 0 : k.max), 0) + SK_BRANCH.length;
  const skTreeMax = () => SK_TREE;
  function skMastery(m) { return Math.max(0, rankOf(m).rank - SK_TREE); }
  // für den Baum verfügbare Punkte (Meisterschaft abgezogen)
  const skFree = m => skPoints(m) - skMastery(m);
  function skBuy(m, id) { if (!skCan(m, id)) return false; m.sk = m.sk || {}; m.sk[id] = skLv(m, id) + 1; return true; }
  function skReset(m) { m.sk = {}; }
  // Einzelnen Punkt zurücknehmen: nur, wenn danach alle gekauften Knoten gültig bleiben
  function skCanRefund(m, id) {
    const l = skLv(m, id); if (!l) return false;
    const sk = Object.assign({}, m.sk); sk[id] = l - 1; if (!sk[id]) delete sk[id];
    const t = { sk }; return Object.keys(sk).every(k => skOpen(Object.assign({}, m, t), k));
  }
  function skRefund(m, id) { if (!skCanRefund(m, id)) return false; m.sk[id]--; if (!m.sk[id]) delete m.sk[id]; return true; }

  // ---------- Elementarmagie: ab Rekordwelle 50 ein Element mit eigener Fähigkeit und eigenem Baum ----------
  // Aktiv ist immer nur ein Element. Erfahrung gibt es für Schiffe, die das Element zerstört oder in den 3 s davor getroffen hat
  // (von Hand ausgelöst voll, vom Autopiloten halb), dazu einmalig für Elementproben. Ränge und Bäume überdauern die Fusion.
  const ELEM_FORM_AT = 4; // Punkte im Stamm, ab denen die Knoten der Form offen sind
  const ELEM_CAP_AT = 4; // Punkte in der Form, ab denen ihr Schlussstein offen ist
  const dc = (v, d) => v.toFixed(d).replace('.', ',');
  const ELEMENTS = {
    fire:  { name: 'Feuer', col: '#ff8a3d', icon: '✹', ask: 'Wo?', role: 'Das offensive Element: Flächenschaden gegen Gruppen' },
    ice:   { name: 'Eis',   col: '#9fe8ff', icon: '❄', ask: 'Wen?', role: 'Kontrolle: stoppt Schiffe, schützt die Hülle, stark gegen Heiler und Bosse' },
    light: { name: 'Licht', col: '#ffe9a8', icon: '✦', ask: 'Wohin?', role: 'Dauerstrahl, den du selbst führst' },
  };
  // Formen verwandeln die Fähigkeit (andere Wirkung, oft andere Bedienung); Wechsel außerhalb des Laufs kostenlos
  const ELEM_FORMS = {
    fire: [
      { id: 'ball', name: 'Feuerball', desc: 'Explosion mit 6× Kanonenschaden, danach brennt der Boden 4 s (0,9× Kanonenschaden pro Sekunde). Zwei Ladungen, jede lädt in 10 s nach.',
        how: 'Knopf antippen, dann ins Feld tippen: Der Feuerball schlägt genau dort ein. Ein zweiter Tipp auf den Knopf wirft ihn stattdessen automatisch in die dichteste Gruppe.' },
      { id: 'wall', name: 'Flammenwand', desc: 'Eine Wand aus Feuer, bis 140 lang, hält 6 s. Schiffe, die sie berühren, brennen 3 s (1,2× Kanonenschaden pro Sekunde) und erleiden solange 10 % mehr Schaden aus allen Quellen. Abklingzeit 16 s.',
        how: 'Knopf antippen, dann im Feld eine Linie ziehen: Dort entsteht die Wand. Am besten quer zur Flugbahn. Ein zweiter Tipp auf den Knopf setzt sie automatisch quer vor die dichteste Gruppe.' },
      { id: 'meteor', name: 'Meteor', desc: 'Schlägt 1,5 s nach dem Tippen ein: 11× Kanonenschaden im Radius 70, betäubt 1 s, der Krater brennt 5 s. Abklingzeit 22 s.',
        how: 'Knopf antippen, dann ins Feld tippen. Der Einschlag kommt verzögert: Ziele dorthin, wo die Schiffe in 1,5 s sind. Ein zweiter Tipp auf den Knopf zielt automatisch.' },
    ],
    ice: [
      { id: 'lance', name: 'Frostlanze', desc: 'Trifft ein Ziel mit 6× Kanonenschaden und friert es 3 s ein. Eingefrorene Schiffe bewegen sich nicht, schießen nicht, heilen nicht und erleiden 40 % mehr Schaden. Stirbt ein eingefrorenes Schiff, zersplittert es (2× Kanonenschaden im Umkreis, verlangsamt). Bosse frieren nicht ganz ein, werden aber halb so schnell. Abklingzeit 8 s.',
        how: 'Knopf antippen: Die Lanze trifft das markierte Ziel. Ohne Markierung trifft sie den Boss oder das Schiff mit den meisten Lebenspunkten.' },
      { id: 'nova', name: 'Frostnova', desc: 'Eine Kältewelle um die Kanone bis Abstand 120: 0,8× Kanonenschaden, friert alle Schiffe darin 2 s ein, Bosse werden halb so schnell. Die Notbremse, wenn es eng wird. Abklingzeit 18 s.',
        how: 'Knopf antippen: Die Nova geht sofort von der Kanone aus.' },
      { id: 'storm', name: 'Eissturm', desc: 'Ein Hagelfeld (Radius 70) für 6 s: 0,6× Kanonenschaden pro Sekunde. Jede Sekunde im Feld kühlt ein Schiff weiter ab, nach 3 s friert es 2 s ein. Abklingzeit 18 s.',
        how: 'Knopf antippen, dann ins Feld tippen: Dort entsteht der Sturm. Ein zweiter Tipp auf den Knopf setzt ihn automatisch auf die dichteste Gruppe.' },
    ],
    light: [
      { id: 'prism', name: 'Prismastrahl', desc: 'Ein Strahl von der Kanone durchs ganze Feld: 1,5× Kanonenschaden pro Sekunde an allen Schiffen auf der Linie. Bleibt er auf einem Schiff, steigt der Schaden alle 0,5 s um 10 % (bis +100 %). Die Energie reicht 4 s und lädt in 12 s wieder voll, solange der Strahl aus ist.',
        how: 'Knopf antippen schaltet den Strahl bereit. Dann den Finger aufs Feld legen und ziehen: Der Strahl folgt dem Finger. Loslassen spart Energie. Lange auf den Knopf drücken: Der Strahl richtet sich selbst auf das markierte Ziel, mit halbem Schaden.' },
      { id: 'lens', name: 'Brennglas', desc: 'Ein dünner Strahl auf ein einziges Ziel: 3× Kanonenschaden pro Sekunde, alle 0,5 s 25 % mehr (bis +300 %). Wechselt das Ziel, beginnt der Aufbau neu. Gemacht für Bosse. Gleiche Energie wie der Prismastrahl.',
        how: 'Knopf antippen: Der Strahl richtet sich selbst auf das markierte Ziel (ohne Markierung auf den Boss oder das stärkste Schiff) und bleibt dort, bis die Energie leer ist. Noch ein Tipp beendet ihn.' },
      { id: 'mirror', name: 'Spiegelfeld', desc: 'Spiegel im Feld lenken den Strahl um: Er läuft von der Kanone über alle Spiegel und trifft alles auf dem Weg (1,2× Kanonenschaden pro Sekunde). Bis zu 3 Spiegel, sie halten 15 s. Gleiche Energie wie der Prismastrahl.',
        how: 'Knopf antippen schaltet das Spiegelfeld ein. Jeder Tipp ins Feld setzt dann einen Spiegel (der älteste verschwindet, wenn alle gesetzt sind). Solange das Spiegelfeld an ist und Energie da ist, läuft der Strahl über die Spiegel. Noch ein Tipp auf den Knopf schaltet es aus.' },
    ],
  };
  // Baum je Element: Stamm (form leer, gilt für alle Formen) aus Wurzel und zwei Ästen; darunter die gewählte Form
  // (ab ELEM_FORM_AT Punkten im Stamm) mit eigenem Wurzelknoten, zwei Ästen und einem Schlussstein (cap, ab ELEM_CAP_AT Punkten in der Form).
  // par: Elternknoten
  const ELEM_SKILLS = [
    { id: 'f_dmg',   el: 'fire', max: 3, name: 'Glutkern',       desc: l => `+${pc(0.2 * l)} Feuerschaden, auch für Brandminen und Nachbeben` },
    { id: 'f_cd',    el: 'fire', par: 'f_dmg', max: 3, name: 'Schnellzündung', desc: l => `Feuer lädt ${pc(0.08 * l)} schneller nach` },
    { id: 'f_burn',  el: 'fire', par: 'f_dmg', max: 2, name: 'Zunder',         desc: l => `Brandfelder und Flammenwände halten ${dc(1.5 * l, 1)} s länger` },
    { id: 'fb_ammo', el: 'fire', form: 'ball', max: 2, name: 'Munitionslager', desc: l => `+${l} Ladung${l > 1 ? 'en' : ''}` },
    { id: 'fb_rad',  el: 'fire', form: 'ball', par: 'fb_ammo', max: 2, name: 'Flächenbrand',   desc: l => `+${pc(0.15 * l)} Radius von Explosion und Brandfeld` },
    { id: 'fb_jump', el: 'fire', form: 'ball', par: 'fb_ammo', max: 2, name: 'Übersprung',     desc: l => `Schiffe, die im Feuer sterben, entzünden ein kleines Brandfeld mit ${pc(0.25 * l)} Stärke` },
    { id: 'fb_inferno', el: 'fire', form: 'ball', par: 'fb_ammo', cap: 1, name: 'Inferno', desc: () => 'Überlappende Brandfelder verstärken sich: jedes weitere Feld an derselben Stelle +50 % Schaden' },
    { id: 'fw_len',  el: 'fire', form: 'wall', max: 2, name: 'Lange Wand',     desc: l => `Die Wand darf ${pc(0.25 * l)} länger sein` },
    { id: 'fw_dur',  el: 'fire', form: 'wall', par: 'fw_len', max: 2, name: 'Nachbrennen', desc: l => `Die Wand hält ${l} s länger, Schiffe brennen ${l} s länger` },
    { id: 'fw_heat', el: 'fire', form: 'wall', par: 'fw_len', max: 2, name: 'Hitzestau',   desc: l => `Brennende Schiffe erleiden ${pc(0.1 + 0.1 * l)} statt 10 % mehr Schaden aus allen Quellen` },
    { id: 'fw_ring', el: 'fire', form: 'wall', par: 'fw_len', cap: 1, name: 'Feuerring', desc: () => 'Ein kurzer Tipp statt einer Linie legt einen Feuerring um die Stelle; der automatische Wurf legt ihn um die dichteste Gruppe' },
    { id: 'fm_cd',   el: 'fire', form: 'meteor', max: 2, name: 'Einflugschneise', desc: l => `−${dc(2 * l, 0)} s Abklingzeit` },
    { id: 'fm_boss', el: 'fire', form: 'meteor', par: 'fm_cd', max: 2, name: 'Kernbrecher', desc: l => `+${pc(0.2 * l)} Meteorschaden gegen Bosse` },
    { id: 'fm_shower', el: 'fire', form: 'meteor', par: 'fm_cd', max: 2, name: 'Splitterschauer', desc: l => `Drei kleine Einschläge rund um den Krater mit je ${dc(1.5 * l, 1)}× Kanonenschaden` },
    { id: 'fm_star', el: 'fire', form: 'meteor', par: 'fm_cd', cap: 1, name: 'Sternenfall', desc: () => 'Jeder Meteor zieht zwei weitere nach, auf die nächstdichten Gruppen (je 40 % Schaden)' },
    { id: 'i_dur',   el: 'ice', max: 3, name: 'Permafrost',  desc: l => `Ziele bleiben ${dc(0.5 * l, 1)} s länger eingefroren` },
    { id: 'i_brit',  el: 'ice', par: 'i_dur', max: 3, name: 'Sprödigkeit', desc: l => `Eingefrorene Ziele erleiden ${pc(0.4 + 0.1 * l)} statt 40 % mehr Schaden (verlangsamte ein Viertel davon)` },
    { id: 'i_cd',    el: 'ice', par: 'i_dur', max: 2, name: 'Kälteschock', desc: l => `−${l} s Abklingzeit` },
    { id: 'il_chain', el: 'ice', form: 'lance', max: 2, name: 'Eiskette',     desc: l => `Die Lanze springt auf ${l} weitere${l > 1 ? '' : 's'} Schiff${l > 1 ? 'e' : ''} (halber Schaden, halbe Frostdauer)` },
    { id: 'il_shard', el: 'ice', form: 'lance', par: 'il_chain', max: 2, name: 'Splitterregen', desc: l => `+${pc(0.4 * l)} Schaden beim Zersplittern` },
    { id: 'il_sog',   el: 'ice', form: 'lance', par: 'il_chain', max: 2, name: 'Kältesog',     desc: l => `Während Stasis lädt die Lanze ${pc(0.5 * l)} schneller` },
    { id: 'il_zero',  el: 'ice', form: 'lance', par: 'il_chain', cap: 1, name: 'Nullpunkt', desc: () => 'Schiffe unter 12 % Lebenspunkten zerspringen sofort beim Einfrieren; jede 3. Lanze hält auch Bosse 1 s ganz an' },
    { id: 'in_rad',  el: 'ice', form: 'nova', max: 2, name: 'Weite Kälte', desc: l => `+${pc(0.125 * l)} Radius der Nova` },
    { id: 'in_rime', el: 'ice', form: 'nova', par: 'in_rad', max: 2, name: 'Raureif',     desc: l => `Schiffe nahe der Mauer bleiben ${pc(0.5 * l)} länger eingefroren` },
    { id: 'in_hull', el: 'ice', form: 'nova', par: 'in_rad', max: 2, name: 'Kalte Hülle', desc: l => `Die Nova repariert ${dc(0.4 * l, 1)} % der Hülle je eingefrorenem Schiff` },
    { id: 'in_age',  el: 'ice', form: 'nova', par: 'in_rad', cap: 1, name: 'Eiszeit', desc: () => 'Zersplitternde Schiffe frieren ihre Nachbarn 1 s ein, Kettenreaktionen sind möglich' },
    { id: 'is_dur',   el: 'ice', form: 'storm', max: 2, name: 'Dauerfrost', desc: l => `Der Sturm hält ${l} s länger` },
    { id: 'is_drift', el: 'ice', form: 'storm', par: 'is_dur', max: 2, name: 'Treibeis',  desc: l => `Der Sturm wandert mit ${15 * l} pro Sekunde zum markierten Ziel` },
    { id: 'is_slick', el: 'ice', form: 'storm', par: 'is_dur', max: 2, name: 'Glatteis',  desc: l => `Schiffe im Sturm sind ${pc(0.15 * l)} langsamer` },
    { id: 'is_vortex', el: 'ice', form: 'storm', par: 'is_dur', cap: 1, name: 'Polarwirbel', desc: () => 'Der Sturm zieht Schiffe langsam zu seiner Mitte (keine Bosse)' },
    { id: 'l_dmg',   el: 'light', max: 3, name: 'Bündelung',    desc: l => `+${pc(0.2 * l)} Strahlschaden` },
    { id: 'l_dur',   el: 'light', par: 'l_dmg', max: 3, name: 'Lichtspeicher', desc: l => `Der Strahl hält ${dc(0.5 * l, 1)} s länger` },
    { id: 'l_cd',    el: 'light', par: 'l_dmg', max: 2, name: 'Sonnenzelle',  desc: l => `Die Energie ist ${dc(1.5 * l, 1)} s schneller wieder voll` },
    { id: 'lp_glow',  el: 'light', form: 'prism', max: 2, name: 'Glühen',    desc: l => `Der Aufbau auf einem Ziel geht bis +${pc(1 + 0.25 * l)} statt +100 %` },
    { id: 'lp_wide',  el: 'light', form: 'prism', par: 'lp_glow', max: 2, name: 'Breitband', desc: l => `+${pc(0.2 * l)} Strahlbreite` },
    { id: 'lp_blind', el: 'light', form: 'prism', par: 'lp_glow', max: 2, name: 'Blendung',  desc: l => `Getroffene Kanonenboote und Heiler setzen ${dc(0.5 * l, 1)} s aus (je Schiff höchstens alle 3 s)` },
    { id: 'lp_fan',   el: 'light', form: 'prism', par: 'lp_glow', cap: 1, name: 'Fächer', desc: () => 'Hinter deinem Finger teilt sich der Strahl in drei Strahlen' },
    { id: 'll_hot',   el: 'light', form: 'lens', max: 2, name: 'Hitzepunkt',  desc: l => `Der Aufbau beginnt bei +${pc(0.25 * l)}` },
    { id: 'll_after', el: 'light', form: 'lens', par: 'll_hot', max: 2, name: 'Nachglühen', desc: l => `Der Aufbau bleibt nach dem Strahl ${dc(1.5 * l, 1)} s erhalten` },
    { id: 'll_weak',  el: 'light', form: 'lens', par: 'll_hot', max: 2, name: 'Schwachstelle', desc: l => `Das Ziel erleidet während des Strahls ${pc(0.075 * l)} mehr Schaden aus allen Quellen` },
    { id: 'll_sun',   el: 'light', form: 'lens', par: 'll_hot', cap: 1, name: 'Sonnenfeuer', desc: () => 'Stirbt das Ziel bei vollem Aufbau, explodiert es und der Strahl springt mit halbem Aufbau aufs nächste Ziel' },
    { id: 'lm_more',  el: 'light', form: 'mirror', max: 2, name: 'Spiegelkabinett', desc: l => `+${l} Spiegel` },
    { id: 'lm_refr',  el: 'light', form: 'mirror', par: 'lm_more', max: 2, name: 'Brechung', desc: l => `+${pc(0.1 * l)} Schaden je Spiegel, über den der Strahl schon gelaufen ist` },
    { id: 'lm_lens',  el: 'light', form: 'mirror', par: 'lm_more', max: 2, name: 'Linsen',   desc: l => `Spiegel schießen selbst auf das nächste Schiff (${dc(0.3 * l, 1)}× Kanonenschaden pro Sekunde, solange der Strahl läuft)` },
    { id: 'lm_cage',  el: 'light', form: 'mirror', par: 'lm_more', cap: 1, name: 'Lichtkäfig', desc: () => 'Bei 3 oder mehr Spiegeln sind Schiffe innerhalb der Spiegel 2 s gefangen (je Schiff höchstens alle 6 s, keine Bosse)' },
  ];
  const EL_BY_ID = {}; ELEM_SKILLS.forEach(k => (EL_BY_ID[k.id] = k));
  // Elementproben: einmalig viel Erfahrung, drei je Form (leicht/mittel/schwer)
  const PROBE_XP = [0, 500, 2000, 6000];
  const ELEM_PROBES = [
    { id: 'fb_hit', el: 'fire', form: 'ball', t: 1, n: 8, name: '8 Schiffe mit einem Feuerball treffen' },
    { id: 'fb_kill', el: 'fire', form: 'ball', t: 2, n: 150, name: '150 Abschüsse mit dem Feuerball in einem Lauf' },
    { id: 'fb_boss', el: 'fire', form: 'ball', t: 3, name: 'Einen Boss mit dem Feuerball erledigen' },
    { id: 'fw_hit', el: 'fire', form: 'wall', t: 1, n: 8, name: '8 Schiffe mit einer Flammenwand entzünden' },
    { id: 'fw_kill', el: 'fire', form: 'wall', t: 2, n: 150, name: '150 Abschüsse mit der Flammenwand in einem Lauf' },
    { id: 'fw_big', el: 'fire', form: 'wall', t: 3, n: 25, name: '25 Schiffe mit einer Flammenwand entzünden' },
    { id: 'fm_hit', el: 'fire', form: 'meteor', t: 1, n: 6, name: '6 Schiffe mit einem Meteor treffen' },
    { id: 'fm_kill', el: 'fire', form: 'meteor', t: 2, n: 150, name: '150 Abschüsse mit dem Meteor in einem Lauf' },
    { id: 'fm_boss', el: 'fire', form: 'meteor', t: 3, name: 'Einen Boss mit einem Meteor erledigen' },
    { id: 'il_mend', el: 'ice', form: 'lance', t: 1, name: 'Einen Heiler einfrieren' },
    { id: 'il_kill', el: 'ice', form: 'lance', t: 2, n: 150, name: '150 Abschüsse mit der Frostlanze in einem Lauf' },
    { id: 'il_shat', el: 'ice', form: 'lance', t: 3, n: 20, name: '20 Schiffe in einer Welle zersplittern' },
    { id: 'in_hit', el: 'ice', form: 'nova', t: 1, n: 8, name: '8 Schiffe mit einer Frostnova einfrieren' },
    { id: 'in_kill', el: 'ice', form: 'nova', t: 2, n: 150, name: '150 Abschüsse mit der Frostnova in einem Lauf' },
    { id: 'in_save', el: 'ice', form: 'nova', t: 3, name: 'Die Frostnova bei unter 15 % Hülle auslösen und die Welle überstehen' },
    { id: 'is_hit', el: 'ice', form: 'storm', t: 1, n: 5, name: '5 Schiffe in einem Eissturm einfrieren' },
    { id: 'is_kill', el: 'ice', form: 'storm', t: 2, n: 150, name: '150 Abschüsse mit dem Eissturm in einem Lauf' },
    { id: 'is_boss', el: 'ice', form: 'storm', t: 3, name: 'Einen Boss im Eissturm erledigen' },
    { id: 'lp_hit', el: 'light', form: 'prism', t: 1, n: 6, name: '6 Schiffe gleichzeitig im Strahl' },
    { id: 'lp_kill', el: 'light', form: 'prism', t: 2, n: 150, name: '150 Abschüsse mit dem Prismastrahl in einem Lauf' },
    { id: 'lp_boss', el: 'light', form: 'prism', t: 3, name: 'Einen Boss mit dem Prismastrahl erledigen' },
    { id: 'll_full', el: 'light', form: 'lens', t: 1, name: 'Das Brennglas auf vollen Aufbau bringen' },
    { id: 'll_kill', el: 'light', form: 'lens', t: 2, n: 150, name: '150 Abschüsse mit dem Brennglas in einem Lauf' },
    { id: 'll_boss', el: 'light', form: 'lens', t: 3, name: 'Einen Boss mit vollem Brennglas-Aufbau erledigen' },
    { id: 'lm_path', el: 'light', form: 'mirror', t: 1, n: 3, name: 'Den Strahl über 3 Spiegel lenken' },
    { id: 'lm_kill', el: 'light', form: 'mirror', t: 2, n: 150, name: '150 Abschüsse mit dem Spiegelfeld in einem Lauf' },
    { id: 'lm_cage', el: 'light', form: 'mirror', t: 3, n: 6, name: '6 Schiffe gleichzeitig im Lichtkäfig fangen' },
  ];
  const PROBE_BY_ID = {}; ELEM_PROBES.forEach(p => (PROBE_BY_ID[p.id] = p));
  const PROBE_KILL = { ball: 'fb_kill', wall: 'fw_kill', meteor: 'fm_kill', lance: 'il_kill', nova: 'in_kill', storm: 'is_kill', prism: 'lp_kill', lens: 'll_kill', mirror: 'lm_kill' };
  const PROBE_BOSS = { ball: 'fb_boss', meteor: 'fm_boss', storm: 'is_boss', prism: 'lp_boss' };
  const elProbeDone = (m, id) => !!(m.elem && m.elem.probes && m.elem.probes[id]);
  // Einzelziel-Elemente kommen auf weniger Abschüsse: ausgleichen, damit alle etwa gleich schnell aufsteigen
  const ELEM_XP_K = { fire: 1, ice: 2, light: 1.6 };
  const ELEM_MASTER_K = 1.03; // je Rang über dem vollen Baum ×1,03 Elementschaden
  function elemState(m) {
    if (!m.elem || typeof m.elem !== 'object') m.elem = { act: null };
    const E = m.elem; E.xp = E.xp || {}; E.sk = E.sk || {}; E.form = E.form || {}; E.probes = E.probes || {};
    return E;
  }
  const elXpNeed = r => Math.round(300 * Math.pow(1.2, r)); // Erfahrung für Rang r → r+1
  function elRank(m, el) {
    let xp = (m.elem && m.elem.xp && m.elem.xp[el]) || 0, r = 0;
    while (xp >= elXpNeed(r)) { xp -= elXpNeed(r); r++; }
    return { rank: r, cur: xp, need: elXpNeed(r) };
  }
  const elLv = (m, id) => (m.elem && m.elem.sk && m.elem.sk[id]) || 0;
  const elForm = (m, el) => { const f = m.elem && m.elem.form && m.elem.form[el]; return ELEM_FORMS[el].some(x => x.id === f) ? f : ELEM_FORMS[el][0].id; };
  const elSpent = (m, el) => ELEM_SKILLS.filter(k => k.el === el).reduce((a, k) => a + elLv(m, k.id), 0);
  const elStemPts = (m, el) => ELEM_SKILLS.filter(k => k.el === el && !k.form).reduce((a, k) => a + elLv(m, k.id), 0);
  const elFormPts = (m, el, f) => ELEM_SKILLS.filter(k => k.el === el && k.form === f && !k.cap).reduce((a, k) => a + elLv(m, k.id), 0);
  // voller Baum: Stamm, eine Form und ihr Schlussstein
  const elTreeMax = el => ELEM_SKILLS.filter(k => k.el === el && (!k.form || k.form === ELEM_FORMS[el][0].id)).reduce((a, k) => a + (k.cap ? 1 : k.max), 0);
  const elKMax = k => (k.cap ? 1 : k.max);
  const elPoints = (m, el) => elRank(m, el).rank - elSpent(m, el);
  const elMastery = (m, el) => Math.max(0, elRank(m, el).rank - elTreeMax(el));
  // Freischaltung merkt sich der Spielstand, denn die Bestwelle fällt mit jeder Fusion wieder auf 0
  function elUnlocked(m) { if (m.elOpen) return true; if (fusMile(m, 'slot4')) { m.elOpen = 1; return true; } return false; }
  const elActive = m => elUnlocked(m) && m.elem && ELEMENTS[m.elem.act] ? m.elem.act : null;
  function elOpen(m, id) {
    const k = EL_BY_ID[id]; if (!k) return false;
    if (k.par && !elLv(m, k.par)) return false;
    if (!k.form) return true;
    if (k.form !== elForm(m, k.el) || elStemPts(m, k.el) < ELEM_FORM_AT) return false;
    return !k.cap || elFormPts(m, k.el, k.form) >= ELEM_CAP_AT;
  }
  function elCan(m, id) { const k = EL_BY_ID[id]; return !!k && elPoints(m, k.el) >= 1 && elLv(m, id) < elKMax(k) && elOpen(m, id); }
  function elBuy(m, id) { if (!elCan(m, id)) return false; elemState(m).sk[id] = elLv(m, id) + 1; return true; }
  // Zurücknehmen nur, wenn danach alle gekauften Knoten offen bleiben (Kinder, Formknoten, Schlussstein)
  function elCanRefund(m, id) {
    const k = EL_BY_ID[id], l = elLv(m, id); if (!k || !l) return false;
    const sk = Object.assign({}, m.elem.sk); sk[id] = l - 1; if (!sk[id]) delete sk[id];
    const t = Object.assign({}, m, { elem: Object.assign({}, m.elem, { sk }) });
    return Object.keys(sk).every(x => elOpen(t, x));
  }
  function elRefund(m, id) { if (!elCanRefund(m, id)) return false; const E = elemState(m); E.sk[id]--; if (!E.sk[id]) delete E.sk[id]; return true; }
  function elReset(m, el) { const E = elemState(m); for (const k of ELEM_SKILLS) if (k.el === el) delete E.sk[k.id]; }
  function elChoose(m, el) { if (!ELEMENTS[el] || !elUnlocked(m)) return false; elemState(m).act = el; return true; }
  // Formwechsel: Punkte der alten Form werden frei
  function elSetForm(m, el, f) {
    const F = ELEM_FORMS[el] && ELEM_FORMS[el].find(x => x.id === f); if (!F) return false;
    const E = elemState(m); for (const k of ELEM_SKILLS) if (k.el === el && k.form && k.form !== f) delete E.sk[k.id];
    E.form[el] = f; return true;
  }
  // Ungültige Knoten (z. B. nach Umbau des Baums) entfernen
  function elFix(m) {
    if (!m.elem || !m.elem.sk) return;
    const E = m.elem;
    for (const id in E.sk) if (!EL_BY_ID[id] || !(E.sk[id] > 0)) delete E.sk[id]; else E.sk[id] = Math.min(E.sk[id], elKMax(EL_BY_ID[id]));
    let ch = true; while (ch) { ch = false; for (const id in E.sk) if (!elOpen(m, id)) { delete E.sk[id]; ch = true; } }
    for (const el in ELEMENTS) while (elPoints(m, el) < 0) { const k = ELEM_SKILLS.filter(x => x.el === el && elLv(m, x.id)).pop(); if (!k) break; E.sk[k.id]--; if (!E.sk[k.id]) delete E.sk[k.id]; }
  }

  // ---------- Planetenforschung: dauerhafte Boni, bezahlt mit der Ressource des Planeten ----------
  const RESEARCH = {
    // spätere Planeten öffnen später und haben weniger Vorrat angesammelt: günstigerer Einstieg
    ast:  { b: 'dmg',  step: 0.03, name: 'Schaden', c0: 500 },
    ice:  { b: 'hp',   step: 0.04, name: 'Strukturpunkte', c0: 400 },
    lava: { b: 'rateAll', step: 0.03, name: 'Feuerrate aller Waffen', c0: 300 },
    red:  { b: 'loot', step: 0.02, name: 'Energie im Lauf', c0: 200 },
    void: { b: 'boss', step: 0.05, name: 'Schaden gegen Bosse', c0: 150 },
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
  // ---------- Anomalien der Echo-Zyklen: je Zyklus eine Eigenschaft, ab Zyklus III zwei im Wechsel (je Zone) ----------
  // Felder wie bei TWISTS (bias, loot), dazu nur für Schiffe (nicht Bosse, damit die Bosswand gleich bleibt): shipHp, shipSpd, shipDmg (×),
  // nK (× Schiffe je Welle, zusätzlich), crit (+Krit-Chance), stasis (× Dauer Stasisfeld), charge (× Ladetempo Orbitalschlag), elite (Elite-Schiffe je Welle)
  const ANOMALIES = [
    { id: 'ion',   name: 'Ionensturm',      desc: 'Schiffe 60 % zäher, dafür +20 % Krit-Chance.', shipHp: 1.6, crit: 0.2 },
    { id: 'grav',  name: 'Gravitationssog', desc: 'Schiffe 40 % schneller, das Stasisfeld hält doppelt so lang.', shipSpd: 1.4, stasis: 2 },
    { id: 'swarm', name: 'Schwarmflut',     desc: '50 % mehr Schiffe je Welle und viele Schwarm-Wellen, +25 % Energie je Abschuss.', bias: 'swarm', nK: 1.5, loot: 1.25 },
    { id: 'elite', name: 'Elitegarde',      desc: 'Jede Welle 2–3 Elite-Schiffe mit 5× Lebenspunkten und doppeltem Schaden, sie bringen Extra-Kristalle.', elite: true },
    { id: 'solar', name: 'Sonnenwind',      desc: 'Viele Panzerverbände, Schiffe machen 50 % mehr Schaden, der Orbitalschlag lädt 60 % schneller.', bias: 'heavy', shipDmg: 1.5, charge: 1.6 },
  ];
  function anomalyOf(w) {
    const c = cycleOf(w || 1); if (c < 2) return null;
    const a = ANOMALIES[(c - 2) % ANOMALIES.length];
    if (c === 2) return a;
    return Math.floor((w - 1) / 50) % 2 ? ANOMALIES[c % ANOMALIES.length] : a;
  }
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
      this.glow = !this.mode && meta.fusGlow ? fusGlow(meta) : 0;
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
      this.elemCd = 0; this.elemAmmo = null; this.beamE = null; this.beam = null; this.elXp = 0; this.elKills = 0;
      this.walls = []; this.meteors = []; this.storms = []; this.mirrors = []; this.mirrorMode = false; this.lens = null; this.novaSave = 0;
      this.dealt = {}; SOURCES.forEach(k => (this.dealt[k] = 0)); this.modDealt = {};
      this.holding = false; this.god = false; this.ring = null;
      this.rockets = []; this.bolts = []; this.rocketT = 0; this.cryoT = 0; this.reinfT = 0; this.loot = []; this.novaT = 0;
      this.fires = []; this.chargeShotT = 0; this.droneT = 0; this.barrageT = 0; this.holeT = 0; this.hole = null; this.aegis = 0; this.aegisT = 0; this.phoenixUsed = false; this.emergWave = 0; this.invulnUntil = 0; this.reflT = 0;
      this.startWave = 1;
      const chalS = this.mode && this.mode.kind === 'chal' ? (opts.chalStart != null ? Math.min(opts.chalStart, chalStart(meta, this.mode.id)) : chalStart(meta, this.mode.id)) : 1;
      // Bosskampf: direkt in die Welle des gewählten Bosses
      const S = this.mode ? (this.mode.kind === 'boss' ? this.mode.w : chalS) : Math.min(opts.startWave || 1, maxStartWave(meta));
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
        'queue', 'spawnGap', 'spawnT', 'uid', 'cd', 'freezeUntil', 'overUntil', 'dealt', 'modDealt', 'holding', 'startWave', 'god', 'taken', 'blocked', 'rocketT', 'cryoT', 'reinfT', 'loot', 'novaT', 'refHp', 'chargeShotT', 'phoenixUsed', 'aegis', 'emergWave', 'protoWave', 'mode', 'waveType', 'waveMod', 'bossKills', 'noLoot', 'elemCd', 'elemAmmo', 'beamE', 'elXp', 'elKills', 'glow'];
      const o = {}; keep.forEach(k => (o[k] = this[k])); o.spent = this.spent; o.paid = this.paid; o.rush = this.rush; o.easyRun = this.easyRun; o.leaps = this.leaps;
      o.enemies = this.enemies.map(e => { const c = Object.assign({}, e); if (e.host) { c.hostId = e.host.id; delete c.host; } return c; });
      o.ebullets = this.ebullets.map(b => Object.assign({}, b));
      o.mines = this.mines.map(m => Object.assign({}, m));
      return JSON.parse(JSON.stringify(o));
    }
    static restore(meta, o) {
      const r = new Run(meta, { noFx: true, mode: o.mode });
      Object.assign(r, o);
      r.fxOn = true; r.bullets = []; r.rockets = []; r.bolts = []; r.fx = []; r.fires = []; r.hole = null; r.beam = null; r.walls = []; r.meteors = []; r.storms = []; r.mirrors = []; r.mirrorMode = false; r.lens = null; r.invulnUntil = 0; r.focus = null; r.dead = false; r.ring = null;
      r.cd = Object.assign({ freeze: 0, over: 0 }, o.cd || {});
      if (!rushOpen(r.home)) r.rush = false; // Lauf aus einer Version vor der Sperre: Durchmarsch still beenden
      for (const e of r.enemies) if (e.hostId != null) { e.host = r.enemies.find(h => h.id === e.hostId); if (!e.host) e.hp = 0; }
      RUN_UPG.forEach(u => { if (r.lv[u.id] == null) r.lv[u.id] = 0; }); // neue Upgrades in alten Spielständen
      r.dealt = Object.assign({}, r.dealt, o.dealt || {});
      SOURCES.forEach(k => { if (r.dealt[k] == null) r.dealt[k] = 0; }); r.modDealt = Object.assign({}, o.modDealt || {});
      r.recalc();
      return r;
    }

    // Tageslauf: Besonderheit des Tages; normaler Lauf: Anomalie des Echo-Zyklus (gleiche Felder)
    twist() { return this.mode && this.mode.kind === 'daily' ? TWISTS.find(t => t.id === dailyOf(this.mode.day).twist) : this.mode ? null : anomalyOf(this.wave); }
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
      s.fusion = Math.pow(P.fCore, Math.min(2500, F('f_core'))); // Obergrenze gegen Zahlenüberlauf
      const cb = permBonus(this.meta); s.chal = cb;
      const rz = 1 + Math.min(record(this.meta), P.resCap) / P.resK; s.res = rz; // Resonanz-Faktor je Stufe, gedeckelt (sonst Rückkopplung Rekord → Kristalle → Resonanz)
      s.dmg = P.pDmg * Math.pow(P.lvDmg, L('dmg')) * Math.pow(1.08, M('m_dmg')) * Math.pow(rz, M('m_rdmg')) * s.fusion * cb.dmg;
      s.rate = 1.2 * (1 + 0.05 * L('rate')) * (1 + 0.03 * M('m_rate')) * cb.rate;
      s.range = 150 + 5 * L('range');
      s.crit = 0.025 * L('crit');
      s.critx = 1.5 + 0.1 * L('critx');
      s.gunDmg = s.dmg * P.gunK; // Treffer der Hauptkanone
      s.multi = L('multi');
      s.multiDmg = P.multiDmg; // Nebenrohre treffen schwächer als das Hauptrohr
      s.pierce = L('pierce');
      s.maxHp = P.pHp * Math.pow(P.lvHp, L('hp')) * Math.pow(1.08, M('m_hp')) * Math.pow(rz, M('m_rhp')) * s.fusion * cb.hp * (this.rule === 'glass' ? 0.25 : 1);
      const rg = L('regen');
      s.regen = s.maxHp * P.rgMax * (rg / (rg + P.rgK)) * (1 + 0.1 * M('m_regen'));
      const ar = L('armor');
      s.armor = Math.min(P.arCap, P.arMax * ar / (ar + P.arK) + 0.01 * M('m_armor'));
      s.knock = L('knock') ? 1.5 + 0.35 * L('knock') : 0;
      const tw = this.twist();
      s.loot = (1 + P.lootK * L('loot')) * (1 + 0.08 * M('m_loot')) * cb.loot * (this.rule === 'poor' ? (this.isChal ? P.chalPoor : 0.5) : 1) * ((tw && tw.loot) || 1);
      if (tw && tw.crit) s.crit += tw.crit;
      // Wellenprämie: Anteil der Abschuss-Energie einer typischen Welle, als fester Bonus pro überstandener Welle
      s.waveBonus = P.bonusK * L('interest');
      s.crysMult = (1 + 0.06 * L('crys')) * (1 + 0.1 * M('m_crys')) * (1 + P.fCrys * F('f_crys')) * cb.crys;
      // Schockwelle: Druckring, der mit der Reichweite wächst
      const sh = L('shock');
      s.shockCd = sh ? Math.max(2.5, 6.5 - 0.13 * sh) : 0;
      // Radius: anfangs so groß wie die Reichweite (sonst sind Schiffe früh schon tot, bevor der Ring sie erreicht),
      // mit jeder Reichweitenstufe ein kleinerer Anteil davon, bei voller Reichweite (30 Stufen) P.shockRLow
      s.shockR = s.range * (1 - (1 - P.shockRLow) * Math.min(1, L('range') / 30));
      // Eigene Stufen linear und auf P.aoeMax begrenzt: früh spürbar, spät (volle Wellen am Schutzwall) nicht übermächtig, Ziel je etwa 10 % Schaden
      s.shockDmg = s.dmg * P.shockK * (1 + P.shockLv * sh);
      // Orbitklingen: pendeln über der Kanone, Radius folgt der Reichweite
      const bl = L('blade');
      s.blades = bl ? Math.min(P.bladeMax, 1 + Math.floor(bl / P.bladeStep)) : 0;
      // Außenbahn: anfangs weit ins Feld (P.bladeRHi der Reichweite), mit jeder Reichweitenstufe ein kleinerer Anteil, bei voller Reichweite 55 %
      s.bladeR = Math.max(WALL_R + 28, s.range * (P.bladeRHi - (P.bladeRHi - 0.55) * Math.min(1, L('range') / 30)));
      s.bladeDmg = s.dmg * 0.5 * (1 + P.bladeLv * bl) * P.bladeK;
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
      s.chargeK = (1 + 0.15 * K('t_charge')) * (K('t_loop') ? 1.25 : 1) * ((tw && tw.charge) || 1);
      if (s.noGun) { s.rocketCd = 0; s.cryoCd = 0; s.shockCd = 0; s.blades = 0; }
      // Obergrenze gegen Zahlenüberlauf (über 1e308 wird es „unendlich“)
      const CAP = 1e290; for (const k of ['dmg', 'gunDmg', 'shockDmg', 'bladeDmg', 'mineDmg', 'rocketDmg', 'cryoDmg', 'strikeDmg', 'maxHp', 'regen']) if (s[k] > CAP) s[k] = CAP;
      s.dps = Math.min(CAP, s.gunDmg * s.rate * (1 + s.crit * (s.critx - 1)) * (1 + s.multi * s.multiDmg));
      // Elementarmagie (im Tageslauf gibt es keine, dort gilt die Standard-Ausrüstung; bei „Nur Minen“ gesperrt)
      const el = s.noGun ? null : elActive(this.meta);
      s.el = null;
      if (el) {
        const E = id => elLv(this.meta, id), g = s.gunDmg * Math.pow(ELEM_MASTER_K, elMastery(this.meta, el)), form = elForm(this.meta, el);
        const o = { k: el, form, cap: ELEM_SKILLS.some(k => k.el === el && k.form === form && k.cap && E(k.id)) };
        if (el === 'fire') {
          const f = 1 + 0.2 * E('f_dmg'), cdk = 1 - 0.08 * E('f_cd');
          o.glut = f; o.burnT = 4 + 1.5 * E('f_burn');
          if (form === 'ball') { o.dmg = g * 6 * f; o.burn = g * 0.9 * f; o.r = 50 * (1 + 0.15 * E('fb_rad')); o.ammo = 2 + E('fb_ammo'); o.cd = 10 * cdk; o.jump = 0.25 * E('fb_jump'); o.inferno = !!E('fb_inferno'); }
          if (form === 'wall') { o.cd = 16 * cdk; o.len = 140 * (1 + 0.25 * E('fw_len')); o.dur = 6 + 1.5 * E('f_burn') + E('fw_dur'); o.burn = g * 1.2 * f; o.burnFor = 3 + E('fw_dur'); o.heat = 0.1 + 0.1 * E('fw_heat'); o.ring = !!E('fw_ring'); o.dmg = o.burn; }
          if (form === 'meteor') { o.cd = Math.max(6, 22 * cdk - 2 * E('fm_cd')); o.dmg = g * 11 * f; o.r = 70; o.boss = 1 + 0.2 * E('fm_boss'); o.burn = g * 0.6 * f; o.shower = g * 1.5 * E('fm_shower') * f; o.star = !!E('fm_star'); }
        }
        if (el === 'ice') {
          o.dur = 3 + 0.5 * E('i_dur'); o.brit = 0.4 + 0.1 * E('i_brit'); o.shard = g * 2 * (1 + 0.4 * E('il_shard'));
          if (form === 'lance') { o.dmg = g * 6; o.cd = 8 - E('i_cd'); o.chain = E('il_chain'); o.sog = 0.5 * E('il_sog'); o.zero = !!E('il_zero'); }
          if (form === 'nova') { o.dmg = g * 0.8; o.cd = 18 - E('i_cd'); o.r = 120 * (1 + 0.125 * E('in_rad')); o.dur = 2 + 0.5 * E('i_dur'); o.rime = 0.5 * E('in_rime'); o.heal = 0.004 * E('in_hull'); o.age = !!E('in_age'); }
          if (form === 'storm') { o.dps = g * 0.6; o.dmg = o.dps; o.cd = 18 - E('i_cd'); o.r = 70; o.sdur = 6 + E('is_dur'); o.dur = 2 + 0.5 * E('i_dur'); o.drift = 15 * E('is_drift'); o.slick = 0.15 * E('is_slick'); o.vortex = !!E('is_vortex'); }
        }
        if (el === 'light') {
          const lk = 1 + 0.2 * E('l_dmg');
          o.dur = 4 + 0.5 * E('l_dur'); o.cd = 12 - 1.5 * E('l_cd');
          if (form === 'prism') { o.dps = g * 1.5 * lk; o.ramp = 1 + 0.25 * E('lp_glow'); o.w = 7 * (1 + 0.2 * E('lp_wide')); o.blind = 0.5 * E('lp_blind'); o.fan = !!E('lp_fan'); }
          if (form === 'lens') { o.dps = g * 3 * lk; o.hot = 0.25 * E('ll_hot'); o.after = 1.5 * E('ll_after'); o.weak = 0.075 * E('ll_weak'); o.sun = !!E('ll_sun'); o.ramp = 3; o.w = 3; }
          if (form === 'mirror') { o.dps = g * 1.2 * lk; o.mirrors = 3 + E('lm_more'); o.refr = 0.1 * E('lm_refr'); o.lens = g * 0.3 * E('lm_lens'); o.cage = !!E('lm_cage'); o.w = 7; }
        }
        s.el = o;
        if (el === 'fire' && form === 'ball' && this.elemAmmo == null) this.elemAmmo = o.ammo;
        if (el === 'light' && this.beamE == null) this.beamE = o.dur;
      }
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
      const c = this.cost(u); this.energy -= c;
      this.spent = this.spent || { atk: 0, def: 0, eco: 0 }; this.spent[u.tab] = (this.spent[u.tab] || 0) + c;
      const before = this.s.maxHp;
      this.lv[u.id]++;
      this.recalc();
      if (this.s.maxHp > before) this.hp += this.s.maxHp - before;
      return true;
    }

    // Wellensprung: n Wellen überspringen; Energie, Kristalle, Erfahrung und Boss (Sieg, Kristalle, Beutewurf) werden gutgeschrieben
    leap(n) {
      const from = this.wave;
      let e = 0, k = 0;
      for (let w = from + 1; w <= from + n; w++) {
        e += waveEnergy(w) * this.s.loot + this.waveBonusAmount(w);
        k += waveCrystals(w) * this.s.crysMult * (w % 10 === 0 ? 1 + P.cBoss : 1);
        statOf(this.home).waves++; if (cmdOpen(this.home)) cmdState(this.home).xp += xpFor(w) * this.xpMult(w);
        if (w % 10 === 0) {
          const kind = bossKind(w); if (kind) (this.home.bossBeat = this.home.bossBeat || {})[kind] = 1;
          statOf(this.home).bosses++;
          if (modOpen(this.home) && Math.max(record(this.meta), w) >= MODULES_AT) {
            this.bossKills = (this.bossKills || 0) + 1;
            const ch = dropChance(w) + 0.1 * (this.meta.dry || 0);
            if (Math.random() < ch) { this.loot.push(rollModule(w, this.meta, w % 50 === 0)); this.meta.dry = 0; } else this.meta.dry = (this.meta.dry || 0) + 1;
          }
        }
      }
      this.energy += e; this.crystals += k; this.wave = from + n; this.leaps = (this.leaps || 0) + 1; this.easyRun = 0;
      if (this.fxOn) this.fx.push({ k: 'leap', t: 0, from, to: from + n, e, c: k });
    }
    // Kristalle laufend gutschreiben (Labor schon während des Laufs nutzbar); finish() bucht nur noch den Rest
    payCrystals() {
      if (this.mode || this.admin) return 0;
      const c = Math.floor(this.crystals) - (this.paid || 0); if (c <= 0) return 0;
      this.meta.crystals += c; this.meta.totalCrystals = (this.meta.totalCrystals || 0) + c; this.paid = (this.paid || 0) + c; return c;
    }

    // ---------- Auto-Kauf ----------
    // Geschätzter relativer Zugewinn einer Stufe für den Bereich des Upgrades (Angriff: Schaden pro Sekunde,
    // Abwehr: effektive Lebenspunkte und Reparatur, Ertrag: Einnahmen). Nebenwaffen zählen nach ihrem gemessenen Schadensanteil.
    upgGain(u) {
      const s = this.s, l = this.L(u.id), D = this.dealt || {}, tot = Object.values(D).reduce((a, b) => a + b, 0);
      const sh = k => tot > 0 ? (D[k] || 0) / tot : 0, gun = tot > 0 ? Math.max(0.25, sh('gun') + sh('skill')) : 1;
      const side = (k, rel) => l === 0 ? 0.05 : Math.max(0.004, sh(k) * rel);
      const critF = 1 + s.crit * (s.critx - 1);
      switch (u.id) {
        case 'dmg': return P.lvDmg - 1;
        case 'rate': return 0.05 / (1 + 0.05 * l) * gun;
        case 'range': return 5 / s.range * 0.8;
        case 'crit': return 0.025 * (s.critx - 1) / critF * gun;
        case 'critx': return 0.1 * s.crit / critF * gun;
        case 'multi': return s.multiDmg / (1 + s.multi * s.multiDmg) * gun;
        case 'pierce': return 0.18 / (1 + 0.18 * s.pierce) * gun;
        case 'rocket': return side('rocket', P.rockLv / (1.6 + P.rockLv * l) + 0.016);
        case 'cryo': return side('cryo', 0.03) + 0.004;
        case 'mine': return side('mine', P.mineLv / (2 + P.mineLv * l) + 0.025);
        case 'shock': return side('shock', P.shockLv / (1 + P.shockLv * l) + 0.02);
        case 'blade': return side('blade', P.bladeLv / (1 + P.bladeLv * l) + (l % P.bladeStep === P.bladeStep - 1 && s.blades < P.bladeMax ? 1 / s.blades : 0));
        case 'hp': return P.lvHp - 1;
        case 'armor': { const a0 = s.armor, a1 = Math.min(P.arCap, P.arMax * (l + 1) / (l + 1 + P.arK) + (a0 - P.arMax * l / (l + P.arK))); return Math.max(0, (1 - a0) / (1 - a1) - 1); }
        case 'regen': return l === 0 ? 0.12 : 0.6 * (((l + 1) / (l + 1 + P.rgK)) / (l / (l + P.rgK)) - 1);
        case 'knock': return 0.008;
        case 'loot': return P.lootK / (1 + P.lootK * l);
        case 'interest': return P.bonusK / (1 + P.bonusK * l) * 0.8;
        case 'crys': return 0.06 / (1 + 0.06 * l) * 0.6;
      }
      return 0.01;
    }
    // Nächstes Auto-Upgrade: Energie wird nach Gewichten auf Angriff/Abwehr/Ertrag verteilt (eigenes Budget je Bereich),
    // im Bereich entscheidet „smart“ nach Zugewinn je Energie, „cheap“ nach dem niedrigsten Preis. null = warten.
    autoPick(on, cfg) {
      cfg = cfg || {}; const W = cfg.w || AUTO_W, smart = cfg.mode !== 'cheap';
      const sp = this.spent || { atk: 0, def: 0, eco: 0 }, total = this.energy + (sp.atk || 0) + (sp.def || 0) + (sp.eco || 0);
      const cand = {};
      for (const u of RUN_UPG) if (on(u) && this.available(u) && !this.maxed(u) && (W[u.tab] || 0) > 0) (cand[u.tab] = cand[u.tab] || []).push(u);
      const tabs = Object.keys(cand); if (!tabs.length) return null;
      const wSum = tabs.reduce((a, t) => a + W[t], 0);
      const pick = [];
      for (const t of tabs) {
        const best = cand[t].map(u => ({ u, c: this.cost(u), g: smart ? this.upgGain(u) : 1 })).sort((a, b) => smart ? b.g / b.c - a.g / a.c : a.c - b.c)[0];
        const budget = W[t] / wSum * total - (sp[t] || 0);
        pick.push({ t, best, room: budget - best.c });
      }
      pick.sort((a, b) => b.room - a.room);
      const p = pick[0];
      return p.room >= 0 && p.best.c <= this.energy ? p.best.u : null;
    }

    waveBonusAmount(w) { return this.s.waveBonus ? waveEnergy(w || this.wave) * this.s.loot * this.s.waveBonus : 0; }

    // Nächste Welle vorzeitig rufen: geht, sobald alle Schiffe der aktuellen Welle gestartet sind und kein Boss lebt.
    // Bonus: Energie für die übersprungene Wartezeit
    // Jederzeit möglich, außer solange ein Boss lebt oder noch kommt. Noch nicht gestartete Schiffe der
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
    // Wellen weit unter dem Rekord bringen kaum Erfahrung (kein Farmen); Fusionsglut hebt das auf und vervielfacht
    xpMult(w) { return this.glow || (w < record(this.home) * P.xpLowAt ? P.xpLow : 1); }
    bossAlive() { return this.enemies.some(e => e.type === 'boss' && e.hp > 0) || (this.queue || []).includes('boss'); }

    nextWave() {
      // Bosskampf: nach der Bosswelle ist Schluss (gewonnen)
      if (this.mode && this.mode.kind === 'boss' && this.wave >= this.startWave) { this.won = true; this.dead = true; return; }
      let doLeap = false;
      // Durchmarsch: fiel die Welle mühelos (kaum Schaden, Feld leer, Boss schnell), laufen die nächsten Wellen gestaucht
      if (this.wave > 0 && !this.mode && !this.admin) {
        const hit = (this.taken || 0) - (this.takenW || 0), dur = this.time - (this.waveStartT || 0), bossW = this.wave % 10 === 0;
        // mühelos: kaum Schaden, und kein Schiff hält sich in Reichweite (noch anfliegende Schiffe zählen nicht), Boss schnell besiegt
        // Schaden zählt netto: Hülle am Wellenende noch fast voll (Reparatur gleicht Streifschüsse aus)
        const hurtOk = this.hp >= this.s.maxHp * (1 - P.rushHit) || hit <= this.s.maxHp * 0.03;
        // Feld: höchstens zwei Nachzügler in Reichweite; getarnte Schiffe zählen nicht (sie sind ohnehin nicht anvisierbar)
        const fieldOk = this.enemies.filter(e => e.hp > 0 && e.dist <= this.s.range * 0.9 && !this.cloaked(e)).length <= 2;
        const timeOk = dur <= (bossW ? ((BOSS_KINDS[bossKind(this.wave)] || {}).lord ? P.rushLordT : P.rushBossT) : WAVE_LEN + 5); // Herrscher (alle 50 Wellen) dürfen länger dauern
        const easy = hurtOk && fieldOk && timeOk;
        this.easyRun = easy ? (this.easyRun || 0) + 1 : 0;
        const fast = rushOpen(this.home) && !(this.meta.settings && this.meta.settings.rush === 'off');
        // Ein zäher Boss beendet den Durchmarsch nicht, solange die Hülle mindestens halb voll ist (nur kein Wellensprung in diesem Block)
        const keep = bossW && !easy && this.hp >= this.s.maxHp * 0.5;
        const was = this.rush; this.rush = fast && (easy || keep) && (was || this.easyRun >= 2); // einmal an, bleibt er an, solange es mühelos bleibt
        // Grund fürs Ende (für die Anzeige): Hülle unter 90 %, Schiffe blieben in Reichweite, Boss zu langsam
        const why = this.rush || !was || !fast ? null : !hurtOk ? 'hull' : !fieldOk ? 'field' : 'slow';
        if (why) this.rushWhyAt = { why, w: this.wave, boss: bossW ? (BOSS_KINDS[bossKind(this.wave)] || {}).name : null, dur: Math.round(dur), hp: Math.round(this.hp / this.s.maxHp * 100) };
        if (this.rush !== was && fast && this.fxOn) this.fx.push({ k: 'rush', t: 0, on: this.rush, why: why ? this.rushWhyAt : null });
        // Wellensprung: ein ganzer mühelos geräumter Zehnerblock (mit Boss) unter dem Rekord → die nächsten 10 Wellen überspringen
        doLeap = bossW && this.easyRun >= 10 && (this.wave + 10 < record(this.home) || record(this.home) >= 260) && fast; // über dem Rekord erst, wenn alle Bosse bekannt sind
      }
      if (this.wave > 0 && !this.skipCrystalsOnce) {
        this.crystals += waveCrystals(this.wave) * this.s.crysMult * (this.catchUp() ? P.catchCrys : 1);
        const bonus = this.waveBonusAmount();
        if (bonus > 0) { this.energy += bonus; if (this.fxOn) this.fx.push({ k: 'bonus', t: 0, v: bonus }); }
      }
      if (this.wave > 0 && !this.admin && !(this.mode && this.mode.kind === 'boss')) { statOf(this.home).waves++; if (cmdOpen(this.home)) cmdState(this.home).xp += xpFor(this.wave) * this.xpMult(this.wave); }
      this.skipCrystalsOnce = false;
      if (doLeap) this.leap(10); // nach der Gutschrift der gerade beendeten Welle
      this.wave++;
      this.waveT = 0; this.takenW = this.taken || 0; this.waveStartT = this.time;
      this.holding = false;
      const w = this.wave;
      const boss = w % 10 === 0;
      // Tageslauf: jede Welle aus eigenem Startwert, damit alle dieselben Wellen bekommen
      if (this.seed != null) this.rng = mulberry32(hashStr(this.seed + ':' + w));
      const rnd = this.rng, tw = this.twist();
      if (tw !== this.anom) { this.anom = tw; this.recalc(); } // neue Anomalie (Zonenwechsel im Echo-Zyklus): Werte neu berechnen
      this.eliteLeft = tw && tw.elite && !boss ? 2 + (rnd() < 0.5 ? 1 : 0) : 0;
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
      const top = cycleOf(w) > 1 ? SECTORS.length : sec; // in Echo-Zyklen alle Sektor-Gegner, der Typ der Zone am häufigsten
      for (let k = 2; k <= top; k++) special.push({ t: SECTORS[k - 1].enemy, p: k === sec ? 0.14 : 0.06 });
      const nAll = Math.round(n * ((tw && tw.nK) || 1)); // Schwarmflut: zusätzliche Schiffe (nicht auf die Welle verteilt)
      for (let i = 0; i < nAll; i++) {
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
      // Bosswelle: nur der Boss; was er selbst aussetzt, kommt dazu. Die Energie der fehlenden Schiffe trägt er mit.
      if (boss) { this.bossRwAdd = waveCount(w) * ENEMY.grunt.rw * rwScale(w); list.length = 0; list.push('boss'); }
      this.queue = list;
      this.spawnGap = boss ? (this.rush ? 0.3 : 1) : this.rush ? Math.min(P.rushGap, SPAWN_LEN / list.length) : SPAWN_LEN / list.length;
      this.spawnT = 0;
      if (this.fxOn) this.fx.push({ k: 'wave', t: 0, w, boss, bossName: boss ? (BOSS_KINDS[bossKind(w)] || { name: 'Boss' }).name : null, kind: WT.name, rush: this.rush, sector: (w - 1) % 50 === 0 && w > 1 ? sectorOf(w) : null, cycle: cycleOf(w), anom: tw && !this.mode ? tw.name : null });
    }

    // Neues Schiff an Weltposition (x, y) erzeugen
    spawnAt(type, x0, y0, o) {
      const d = ENEMY[type], w = this.wave;
      // Bosse kommen allein und sind entsprechend zäh (P.bossHp); früh zusätzlich zäher (bis 2,5×), ab Welle 100 nur noch P.bossHp
      const wm = type === 'boss' || type === 'bomb' || !this.waveMod ? { hp: 1, rw: 1, dmg: 1, spd: 1, big: 1 } : this.waveMod;
      const tw = this.twist();
      const hp = d.hp * hpScale(w) * wm.hp * (type === 'boss' ? P.bossHp * (w === 10 ? P.boss1Hp : 1) * (1 + P.bossHpEarly * Math.max(0, 1 - w / 100)) * (1 + Math.max(0, w - 150) / P.bossHpLate) : 1) * ((tw && tw.ehp) || 1) * (this.isChal ? P.chalHp : 1) / (1 + (this.isChal ? 0.4 : 0.17) * ((this.s && this.s.mod && this.s.mod.crysmod) || 0)); // Leerenresonator
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
        e.actT = e.actMax = 2.5; e.hoverT = 0; e.shieldUntil = 0; e.a0 = e.a; e.acts = 0; e.sector = sectorOf(w).n; e.phase = 0;
        e.rw += this.bossRwAdd || 0; this.bossRwAdd = 0;
        const kind = o && o.kind !== undefined ? o.kind : bossKind(w), K = BOSS_KINDS[kind];
        if (K) {
          e.kind = kind; e.hp *= K.hp; e.maxHp = e.hp; e.sz = K.giant || kind === 'shard' ? 1 : P.miniScale; e.r = K.r * e.sz; e.lord = !!K.lord; e.rebirth = !!K.rebirth; e.worm = !!K.worm;
          if (K.lord) e.stop += 12; // der Herrscher schwebt etwas weiter hinten, sein Rumpf ragt trotzdem in die Reichweite
          if (K.far) e.stop = this.s.range + 25 + K.r * 0.5; // Tentakelwesen: Körper knapp außer Reichweite, die Tentakel kommen herein
          if (K.giant) { e.giant = true; e.a = e.a0 = -Math.PI / 2; e.dist = 740; e.stop = K.reach(this.s.range, 0); e.spd = 60; } // Riese: kommt von oben herein und bleibt am oberen Rand
        }
      }
      if (o) Object.assign(e, o);
      if (tw && type !== 'boss' && type !== 'part') { e.hp *= tw.shipHp || 1; e.maxHp = e.hp; e.spd *= tw.shipSpd || 1; e.dmg *= tw.shipDmg || 1; }
      if (this.eliteNext && type !== 'part') { this.eliteNext = false; e.elite = true; e.hp *= 5; e.maxHp = e.hp; e.dmg *= 2; e.r *= 1.3; e.rw *= 3; }
      this.enemies.push(e);
      const BK = e.type === 'boss' && BOSS_KINDS[e.kind];
      if (BK && BK.parts) for (const q of BK.parts) this.spawnPart(e, q);
      if (BK && BK.worm) e.segs = BK.parts.length;
      if (BK && BK.parts) e.armorN = BK.parts.filter(q => q.k === 'armor').length;
      return e;
    }
    // Bauteil eines Bosses: Geschützturm, Tentakel, Segment oder Schwinge
    spawnPart(e, q) {
      // Anbauteile des ersten Bosses nicht mit abschwächen (sonst fallen sie schon einem einzigen Orbitalschlag zum Opfer)
      const hp = e.maxHp * (this.wave === 10 ? P.boss1Part / P.boss1Hp : 1) * (q.hp || (q.k === 'tentacle' ? 0.06 : q.k === 'arm' ? 0.06 : 0.07));
      const sz = e.sz || 1;
      const pt = this.spawnAt('part', 0, -FIELD_H, { host: e, spec: q, pk: q.k, fwd: (q.fwd || 0) * sz, lat: (q.lat || 0) * sz, side: q.side || 0, si: q.i || 0, hp, maxHp: hp, rw: e.rw * 0.03, dmg: e.dmg * 0.3,
        shotT: 1.5 + Math.random() * 2, ext: 0, tst: 0, tt: 2 + (q.delay || 0), fwdK: q.k === 'tentacle' || q.k === 'arm' ? 1.5 : e.giant ? 1 : 0, r: (q.r || (q.k === 'segment' ? 9 : q.k === 'wing' ? 10 : q.k === 'arm' ? 13 : 7)) * (e.giant ? 1 : sz), act: null });
      this.placePart(pt);
      return pt;
    }
    spawn(type) {
      // Elitegarde: einzelne Schiffe der Welle werden zu Elite-Schiffen
      if (this.eliteLeft > 0 && type !== 'boss' && this.rng() < this.eliteLeft / (this.queue.length + 1)) { this.eliteLeft--; this.eliteNext = true; }
      // Durchmarsch: Schiffe springen direkt an den Rand der Reichweite, statt erst heranzufliegen
      if (this.rush && type !== 'boss') { const R = Math.min(FIELD_H, this.s.range * 0.85), a = -Math.PI / 2 + (this.rng() * 2 - 1) * 0.9; this.spawnAt(type, Math.cos(a) * R, Math.sin(a) * R - this.rng() * 15); return; }
      this.spawnAt(type, (this.rng() * 2 - 1) * FIELD_W, -FIELD_H - this.rng() * 30);
    }
    // Getarnte Schiffe sind auf Distanz nicht anvisierbar (Flächenschaden trifft sie trotzdem)
    cloaked(e) { if (this.s.mod && this.s.mod.scanner) return false; return (e.type === 'phantom' && e.dist > ENEMY.phantom.cloakFrom) || (e.cloakUntil && e.cloakUntil > this.time); }

    pos(e) { return { x: Math.cos(e.a) * e.dist, y: Math.sin(e.a) * e.dist }; }
    // Riesenarm: Ansatz am Mantel, Spitze je nach Aktion (eingerollt, Schlag, Fegen, Greifen)
    armTip(pt, p, fx, fy) {
      const A = { x: p.x - fy * pt.spec.lat + fx * 110, y: p.y + fx * pt.spec.lat + fy * 110 }, sd = Math.sign(A.x - p.x) || 1;
      const w = Math.sin(this.time * 1.3 + pt.spec.i * 1.7);
      const idle = { x: A.x + sd * (55 + 20 * w), y: A.y + 120 + 25 * Math.cos(this.time * 1.1 + pt.spec.i) };
      let tgt = idle;
      if (pt.act === 'slam') { const an = Math.atan2(A.y, A.x); tgt = { x: Math.cos(an) * (WALL_R + 14), y: Math.sin(an) * (WALL_R + 14) }; }
      else if (pt.act === 'grab') tgt = { x: sd * 18, y: -26 };
      else if (pt.act === 'sweep') { const k = Math.max(0, Math.min(1, pt.swK || 0)); tgt = { x: -sd * 210 + sd * 420 * k, y: -Math.max(110, this.s.range * 0.55) + 20 * Math.sin(k * 6) }; }
      const e = pt.ext || 0;
      pt.A = A; return { x: idle.x + (tgt.x - idle.x) * e, y: idle.y + (tgt.y - idle.y) * e };
    }
    armPath(pt, p, fx, fy, T) {
      const A = pt.A, sd = Math.sign(A.x - p.x) || 1, n = 14, out = [];
      const c1 = { x: A.x + sd * 40, y: A.y + 90 }, c2 = { x: T.x + sd * 60 * (1 - (pt.ext || 0)) + Math.sin(this.time * 2 + pt.spec.i) * 18, y: T.y - 110 };
      for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push({ x: u * u * u * A.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * T.x, y: u * u * u * A.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * T.y }); }
      pt.path = out;
    }
    // Riese: Arme steuern, Augen in Reichweite bringen, Tinte
    giantTick(e, dt) {
      const arms = this.enemies.filter(o => o.host === e && o.pk === 'arm' && o.hp > 0);
      for (const a of arms) {
        if (!a.act) { a.ext = Math.max(0, (a.ext || 0) - dt / 0.8); continue; }
        a.actT = (a.actT || 0) + dt;
        if (a.stage === 'out') {
          a.ext = Math.min(1, (a.ext || 0) + dt / (a.act === 'sweep' ? 0.9 : 0.75));
          if (a.ext >= 1) {
            a.stage = 'hold'; a.actT = 0;
            if (a.act === 'slam') { this.hitBase(e.dmg * 0.7); if (this.fxOn) this.fx.push({ k: 'wallhit', a: a.a, t: 0 }, { k: 'hurt', t: 0 }); }
            if (a.act === 'grab' && this.fxOn) this.fx.push({ k: 'bossact', act: 'grab', x: 0, y: -80, t: 0 });
          }
        } else if (a.stage === 'hold') {
          if (a.act === 'slam' && a.actT >= 2.5) a.stage = 'in';
          if (a.act === 'sweep') {
            // Fegen: quer durchs Feld, räumt Minen ab und bringt die Klingen ins Stocken
            a.swK = Math.min(1, (a.swK || 0) + dt / 3); this.bladeOff = Math.max(this.bladeOff || 0, this.time + 0.3);
            const tp = this.pos(a); for (const m of this.mines) if (Math.hypot(m.x - tp.x, m.y - tp.y) < 34) { m.done = true; m.pulled = true; }
            this.mines = this.mines.filter(m => !m.done);
            if (a.swK >= 1) a.stage = 'in';
          }
          if (a.act === 'grab') {
            // Greifen: drückt immer fester zu, bis der Arm abgetrennt ist oder nach 8 s loslässt
            a.grabT = (a.grabT || 0) + dt;
            if ((a.sqT = (a.sqT || 0) + dt) >= 1) { a.sqT = 0; this.hitBase(e.dmg * 0.18 * (1 + 0.6 * a.grabT)); }
            if (a.grabT >= 8) a.stage = 'in';
          }
        } else if (a.stage === 'in') {
          a.ext = Math.max(0, a.ext - dt / 0.9);
          if (a.ext <= 0) { a.act = null; a.stage = null; a.swK = 0; a.grabT = 0; }
        }
      }
      // neue Aktion: alle paar Sekunden ein ruhender Arm
      if (e.dist <= e.stop + 5 && (e.armT = (e.armT == null ? 2 : e.armT) - dt * (e.phase >= 2 ? 1.5 : 1)) <= 0) {
        e.armT = 2.6;
        const idle = arms.filter(a => !a.act); if (idle.length) {
          const busyGrab = arms.some(a => a.act === 'grab'), r = Math.random();
          let act = r < 0.55 ? 'slam' : r < 0.78 ? 'sweep' : 'grab';
          if (act === 'grab' && busyGrab) act = 'slam';
          if (act === 'sweep' && !this.mines.length && !this.s.blades) act = 'slam';
          const pool = act === 'grab' ? idle.filter(a => Math.abs(a.spec.lat) < 80) : idle; const a = (pool.length ? pool : idle)[Math.floor(Math.random() * (pool.length ? pool : idle).length)];
          a.act = act; a.stage = 'out'; a.actT = 0; a.swK = 0; a.grabT = 0; a.sqT = 0;
          if (this.fxOn && act !== 'slam') { const q = this.pos(a); this.fx.push({ k: 'bossact', act: act === 'grab' ? 'grabwarn' : 'sweep', x: q.x, y: q.y, t: 0 }); }
        }
      }
      // Haltepunkt je nach Reichweite und Phase (Leviathan/Verschlinger beugen sich ab Phase 2 vor)
      e.stop = BOSS_KINDS[e.kind].reach(this.s.range, e.phase || 0);
      if (e.dist > e.stop + 1) e.dist = Math.max(e.stop, e.dist - 40 * dt);
      else if (e.dist < e.stop - 1) e.dist = Math.min(e.stop, e.dist + 40 * dt);
    }
    // Bauteil verloren: Loch im Rumpf; Tentakel wachsen nach, Wurmsegmente nicht
    partLost(e, src) {
      const h = e.host; if (!h || h.hp <= 0 || e.lost) return; e.lost = true;
      if (e.pk === 'segment') h.segs = Math.max(0, (h.segs || 0) - 1);
      if (e.pk === 'armor') h.armorN = Math.max(0, (h.armorN || 0) - 1);
      if (e.pk === 'lance') h.lanceLost = true;
      if (e.pk === 'tentacle') (h.regrow = h.regrow || []).push({ q: e.spec, at: this.time + 12 });
      if (e.pk === 'arm') (h.regrow = h.regrow || []).push({ q: e.spec, at: this.time + 15 });
      this.hurt(h, h.maxHp * ((e.spec && e.spec.bonus) || (e.pk === 'arm' ? 0.03 : 0.05)), false, src || 'gun');
      if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'bossact', act: e.pk === 'tentacle' || e.pk === 'arm' ? 'sever' : ['segment', 'eye', 'core', 'gwing', 'gate', 'vent', 'head', 'armor', 'lance', 'rack', 'seal', 'prism'].includes(e.pk) ? e.pk : 'part', x: p.x, y: p.y + 30, t: 0 }); }
    }
    // Bauteil folgt seinem Boss: Lage relativ zur Blickrichtung auf die Kanone
    placePart(pt) {
      const h = pt.host, p = this.pos(h), d = Math.hypot(p.x, p.y) || 1, fx = -p.x / d, fy = -p.y / d;
      if (pt.pk === 'tentacle') {
        // ausgefahren reicht der Tentakel bis kurz vor den Schutzwall
        const base = h.r * 0.9, reach = Math.max(base, d - WALL_R - 14);
        pt.fwd = base + (reach - base) * pt.ext; pt.lat = pt.spec.lat * (h.sz || 1) * (1 - 0.8 * pt.ext);
      } else if (pt.pk === 'segment') {
        // Wurmleib quer zur Kanone, schlängelt sich
        pt.lat = pt.side * (h.r * 1.35 + pt.si * 24); pt.fwd = Math.sin(this.time * 2.2 + pt.si * 0.9 + pt.side) * 10 + pt.si * 13; // äußere Glieder biegen sich zur Kanone, damit alle in Reichweite liegen
      } else if (pt.pk === 'wing') { pt.lat = pt.side * h.r * 1.45; pt.fwd = -h.r * 0.25; }
      else if (pt.spec && pt.spec.orbit) { const a = this.time * 0.7 + pt.spec.i / pt.spec.n * Math.PI * 2; const R = pt.spec.orbit * (h.sz || 1); pt.lat = Math.cos(a) * R; pt.fwd = Math.sin(a) * R * 0.7; }
      else if (pt.pk === 'arm') {
        // Arm des Riesen: Spitze ist das Ziel; die Form (für Zeichnung und Antippen) als Bézierkurve
        const T = this.armTip(pt, p, fx, fy); pt.a = Math.atan2(T.y, T.x); pt.dist = Math.hypot(T.x, T.y); this.armPath(pt, p, fx, fy, T); return;
      }
      const x = p.x + fx * pt.fwd - fy * pt.lat, y = p.y + fy * pt.fwd + fx * pt.lat;
      pt.a = Math.atan2(y, x); pt.dist = Math.hypot(x, y);
    }



    // Schadensanteil eines Moduls mitschreiben (für den Werte-Tab)
    credit(tag, v) { if (v > 0) this.modDealt[tag] = (this.modDealt[tag] || 0) + v; }
    hurt(e, d, crit, src, tag) {
      if (e.hp <= 0) return 0;
      if (e.fwdK && e.host && e.host.hp > 0) {
        // Tentakel: Treffer gehen anderthalbfach auf den Boss, der Tentakel selbst reißt bei genug Schaden ab
        const eff = this.hurt(e.host, d * e.fwdK, crit, src, tag);
        e.hp -= d; e.flash = 0.08; e.hitT = this.time;
        if (e.hp <= 0) this.partLost(e, src);
        return eff;
      }
      if (e.worm && e.segs > 0) d *= 0.5;
      if (e.armorN > 0) d *= Math.max(0.4, 1 - 0.15 * e.armorN); // Panzerplatten: je Platte 15 % weniger Schaden am Rumpf
      if (e.plate > 0) {
        // Panzerschild schluckt Schaden, bis er bricht
        const ab = Math.min(e.plate, d); e.plate -= ab; d -= ab; this.dealt[src || 'gun'] += ab; e.hitT = this.time;
        if (e.plate <= 0 && this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'bossact', act: 'platebreak', x: p.x, y: p.y, t: 0 }); }
        if (d <= 0) return ab;
      } // Magmawurm: der Kopf ist gepanzert, solange Segmente leben
      if (e.mirrorUntil > this.time && src === 'gun' && this.time >= (e.mirT || 0)) {
        // Spiegel: Kanonentreffer werfen einen Teil zurück
        e.mirT = this.time + 0.25; this.hitBase(e.dmg * 0.25);
        if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'reflect', x: p.x, y: p.y + e.r, t: 0 }); }
      }
      if (e.type === 'boss' && this.s.chal && this.s.chal.boss > 1) d *= this.s.chal.boss;
      if (e === this.focus && this.s.K && this.s.K('p_mark')) d *= 1 + 0.2 * this.s.K('p_mark');
      // Eis: eingefroren nimmt mehr Schaden (verlangsamt ein Viertel davon); Flammenwand: brennende Schiffe nehmen mehr Schaden (Hitzestau).
      // Der Mehrschaden zählt fürs Element
      const SE = this.s.el, fb = !SE ? 0 : SE.brit ? (e.frostUntil > this.time ? SE.brit : e.slowUntil > this.time ? SE.brit / 4 : 0) : SE.heat && e.burnUntil > this.time ? SE.heat : 0, fq = fb / (1 + fb);
      if (fq) d /= 1 - fq;
      if (SE && SE.weak && e.lensUntil > this.time) d *= 1 + SE.weak; // Schwachstelle unter dem Brennglas
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
      // Bomben abzuschießen ist Abwehr, kein Schaden: zählt in keinem Schadensanteil (ihre Lebenspunkte hängen am Boss und verzerren sonst die Anteile)
      if (!e.bomb) { this.dealt[src || 'gun'] += eff * (1 - fq); if (fq) this.dealt.elem += eff * fq; }
      // Orbitalschlag lädt nur über zugefügten Schaden: gemessen an einem typischen Schiff der Welle,
      // beim Boss an seinen Lebenspunkten (ein ganzer Boss lädt mehrere Schläge)
      if (!this.s.noGun && e.type !== 'bomb' && e.maxHp > 0 && src !== 'strike' && !(this.time < this.strikeLock)) { // der Schlag selbst lädt nicht, kurz danach lädt nichts
        const per = e.type === 'boss' ? eff / e.maxHp * P.strikeBoss : e.host ? eff / e.host.maxHp * P.strikeBoss : eff / (this.refHp || e.maxHp) * P.strikeDmg / STRIKE_KILLS;
        this.charge = Math.min(1, this.charge + per * (1 + ((this.s.mod && this.s.mod.leech) || 0) / 2) * (this.s.chargeK || 1));
      }
      if (tag) this.credit(tag, eff);
      e.hp -= d; e.flash = 0.08;
      if (this.fxOn && (crit || e.type === 'boss' || e.type === 'brute')) { const p = this.pos(e); this.fx.push({ k: 'dmg', x: p.x, y: p.y, t: 0, v: d, crit }); }
      if (e.hp <= 0 && e.rebirth && !e.reborn) {
        // Phönix: steht einmal mit 40 % wieder auf, die Schwingen wachsen nach
        e.reborn = true; e.hp = e.maxHp * 0.4; e.phase = Math.max(e.phase, 1); e.shieldUntil = this.time + 2;
        for (const o of this.enemies) if (o.host === e) o.hp = 0; // alte Teile weg, alle wachsen neu
        for (const q of BOSS_KINDS[e.kind].parts || []) this.spawnPart(e, q);
        if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'bossact', act: 'rebirth', x: p.x, y: p.y, t: 0 }, { k: 'phoenix', t: 0 }); }
        return eff;
      }
      if (e.hp <= 0) {
        this.energy += e.rw * this.s.loot;
        this.kills++;
        if (e.elemT != null && (this.time - e.elemT <= 3 || e.frostUntil > this.time)) this.elemXp(e);
        if (this.s.el && this.s.el.k === 'ice' && e.frostUntil > this.time && !e.frostBig && !this.shattering) this.shatter(e);
        if (this.lens && this.lens.t === e) this.lensDeath(e);
        if (this.s.el && this.s.el.jump && e.elBurn != null && this.time - e.elBurn < 0.25 && this.fires.filter(f => f.el).length < 12) { const p = this.pos(e); this.fires.push({ x: p.x, y: Math.min(p.y, -10), r: 25, dps: this.s.el.burn * this.s.el.jump, until: this.time + 2, k: 'elfire', el: true, hand: e.elemHand }); }
        if (e.elite) { const c = 0.5 * waveCrystals(this.wave) * this.s.crysMult; this.crystals += c; if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'crysfx', x: p.x, y: p.y, t: 0 }); } }
        if (this.fxOn && this.s.mod && (this.s.mod.leech || this.s.mod.crysmod) && Math.random() < 0.5) { const p = this.pos(e); this.fx.push({ k: this.s.mod.leech ? 'leech' : 'crysfx', x: p.x, y: p.y, t: 0 }); }
                if (this.s.K && this.s.K('b_leech') && !this.dead) this.hp = Math.min(this.s.maxHp, this.hp + this.s.maxHp * 0.003 * this.s.K('b_leech'));
        if (this.s.mod.splinter && src !== 'mod') {
          const p = this.pos(e), dmg = this.s.gunDmg * this.s.mod.splinter * P.splK;
          for (const o of this.enemies) if (o !== e && o.hp > 0) { const q = this.pos(o); if (Math.hypot(q.x - p.x, q.y - p.y) < 45 + o.r) this.hurt(o, dmg, false, 'mod', 'splinter'); }
          if (this.fxOn) this.fx.push({ k: 'splinter', x: p.x, y: p.y, t: 0 });
        }
        if (e.type === 'boss' && BOSS_KINDS[e.kind] && BOSS_KINDS[e.kind].split && !e.child) {
          // Splitterkern: zerfällt in drei Kernsplitter
          const p = this.pos(e);
          for (const dx of [-38, 0, 38]) { const hp = e.maxHp * BOSS_KINDS.shard.hp; this.spawnAt('boss', p.x + dx, p.y - 10 + Math.abs(dx) * 0.3, { kind: 'shard', child: true, hp, maxHp: hp, rw: e.rw * 0.05 }); }
          if (this.fxOn) this.fx.push({ k: 'bossact', act: 'split', x: p.x, y: p.y, t: 0 });
        }
        if (e.type === 'boss' && !e.child) {
          if (e.kind && !this.admin) (this.home.bossBeat = this.home.bossBeat || {})[e.kind] = 1; // für „erster Sieg“ (Tempo 1× bis dahin)
          // Erster Sieg über den ersten Herrscher: Archiv dauerhaft geschenkt (oder Fragmente zurück, falls schon gekauft)
          if (this.wave === LORD_W && !this.mode && !this.admin) {
            const h = this.home, first = !h.lordWin; h.lordWin = 1;
            if (first) { h.flv = h.flv || {}; if (h.flv.f_tech) h.frag = (h.frag || 0) + 12; else h.flv.f_tech = 1; }
            if (this.fxOn) this.fx.push({ k: 'lordwin', t: 0, first, name: (BOSS_KINDS[e.kind] || {}).name });
          }
          this.crystals += P.cBoss * waveCrystals(this.wave) * this.s.crysMult;
          const modOk = modOpen(this.home) && Math.max(record(this.meta), this.wave) >= MODULES_AT;
          const first = !this.meta.modules || !Object.keys(this.meta.modules).length;
          if (modOk) this.bossKills = (this.bossKills || 0) + 1;
          if (!this.admin) statOf(this.home).bosses++;
          if (this.admin) this.noLoot = 'admin';
          else if (this.mode) this.noLoot = 'mode';
          else if (modOk) {
            // Pech-Ausgleich: jeder Boss ohne Beute erhöht die Chance beim nächsten um 10 Prozentpunkte
            const ch = dropChance(this.wave) + 0.1 * (this.meta.dry || 0);
            if (first && !this.loot.length || Math.random() < ch) {
              const drop = rollModule(this.wave, this.meta, this.wave % 50 === 0); this.loot.push(drop); this.meta.dry = 0;
              if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'loot', x: p.x, y: p.y, t: 0, drop }); }
            } else this.meta.dry = (this.meta.dry || 0) + 1;
          }
          if (e.sector === 4 && !e.kind) { const p = this.pos(e); for (let i = -1; i <= 1; i++) this.spawnAt('splitter', p.x + i * 30, p.y, {}); }
          for (const o of this.enemies) if (o.host === e && o.hp > 0) { o.hp = 0; if (this.fxOn) { const q = this.pos(o); this.fx.push({ k: 'boom', x: q.x, y: q.y, t: 0, type: 'part', r: o.r, a: o.a }); } }
        }
        if (e.host && e.host.hp > 0) this.partLost(e, src);
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
      // Feuer-Element: Glutkern verstärkt auch Brandminen und Nachbeben; Inferno: jedes weitere Brandfeld an derselben Stelle +50 %
      const SE = s.el, glut = SE && SE.glut ? SE.glut : 1, inf = SE && SE.inferno;
      if (inf) for (const e of this.enemies) { e.infN = 0; if (e.hp <= 0) continue; const p = this.pos(e); for (const f of this.fires) if (f.el && Math.hypot(p.x - f.x, p.y - f.y) < f.r + e.r) e.infN++; }
      for (const f of this.fires) for (const e of this.enemies) {
        if (e.hp <= 0) continue; const p = this.pos(e); if (Math.hypot(p.x - f.x, p.y - f.y) >= f.r + e.r) continue;
        if (f.el) { e.elemT = e.elBurn = this.time; e.elemHand = f.hand; this.hurt(e, f.dps * dt * (inf && e.infN > 1 ? 1 + 0.5 * (e.infN - 1) : 1), false, 'elem'); }
        else this.hurt(e, f.dps * dt * glut, false, 'dot');
      }
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
            if (e.hp <= 0 || e.type === 'boss' || e.host) continue;
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
      if (e.type === 'boss' || e.host || e.hp <= 0) return;
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

    // ---------- Elementarmagie ----------
    elemTick(dt) {
      const o = this.s.el; if (!o) { this.beam = null; this.mirrorMode = false; return; }
      if (o.k === 'fire' && o.form === 'ball') this.elemAmmo = Math.min(o.ammo, (this.elemAmmo || 0) + dt / o.cd);
      else if (o.k !== 'light') this.elemCd = Math.max(0, this.elemCd - dt * (o.sog && this.frozen ? 1 + o.sog : 1));
      if (o.k === 'light') this.beamTick(dt, o);
      // Flammenwand: brennende Schiffe
      for (const e of this.enemies) if (e.burnUntil > this.time && e.hp > 0) { e.elBurn = this.time; this.elHit(e, e.burnDps * dt, e.elemHand); }
      if (this.walls.length) this.wallTick(o);
      if (this.meteors.length) this.meteorTick(o);
      if (this.storms.length) this.stormTick(dt, o);
      if (this.novaSave && this.wave > this.novaSave && !this.dead) { this.novaSave = 0; this.probe('in_save'); }
    }
    elemReady() {
      const o = this.s.el; if (!o || this.dead) return false;
      if (o.k === 'fire' && o.form === 'ball') return this.elemAmmo >= 1;
      if (o.k === 'light') return this.beamE >= Math.min(1, o.dur);
      return this.elemCd <= 0;
    }
    // Ziel für Lanze und selbstzielenden Strahl: Markierung, sonst Boss, sonst das Schiff mit den meisten Lebenspunkten
    elemTarget() {
      const vis = e => e.hp > 0 && !this.cloaked(e) && e.dist < FIELD_H + 20 && !e.giant;
      if (this.focus && vis(this.focus)) return this.focus;
      const alive = this.enemies.filter(vis); if (!alive.length) return null;
      return alive.find(e => e.type === 'boss') || alive.find(e => e.host && e.host.hp > 0) || alive.sort((a, b) => b.hp - a.hp)[0]; // Riese: seine Arme und Teile
    }
    // dichteste Stelle, die nicht zu nah an schon gewählten Punkten liegt (Sternenfall)
    densest(skip) {
      let best = null, bv = 0;
      const alive = this.enemies.filter(e => e.hp > 0 && e.dist < FIELD_H + 20);
      for (const c of alive) {
        const pc = this.pos(c); if (skip.some(q => Math.hypot(q.x - pc.x, q.y - pc.y) < 90)) continue;
        let v = 0; for (const e of alive) { const p = this.pos(e); if (Math.hypot(p.x - pc.x, p.y - pc.y) <= 70) v += 1; }
        if (v > bv) { bv = v; best = pc; }
      }
      return best;
    }
    // Treffer des Elements: merkt sich Zeitpunkt und Auslöser (Hand/Autopilot) für die Erfahrung
    elHit(e, d, hand) { e.elemT = this.time; e.elemHand = !!hand; return this.hurt(e, d, false, 'elem'); }
    elemXp(e) {
      if (this.admin || !this.s.el || e.type === 'bomb') return;
      const o = this.s.el, boss = e.type === 'boss' && !e.child;
      const v = (1 + this.wave / 50) * (boss ? 20 : e.host ? 0.5 : 1) * (e.elemHand ? 1 : 0.5) * ELEM_XP_K[o.k] * (o.form === 'lens' ? 2 : 1) * (this.glow || 1); // Brennglas trifft nur ein Ziel; Fusionsglut vervielfacht
      const E = elemState(this.home); E.xp[o.k] = (E.xp[o.k] || 0) + v; this.elXp = (this.elXp || 0) + v;
      this.elKills = (this.elKills || 0) + 1; this.probe(PROBE_KILL[o.form], this.elKills);
      if (boss && this.time - e.elemT <= 1.5) {
        if (o.form === 'meteor' ? this.time - (e.meteorT || -9) <= 1 : o.form === 'storm' ? this.time - (e.stormT || -9) <= 0.5 : o.form !== 'lens') this.probe(PROBE_BOSS[o.form]);
      }
    }
    // Elementprobe: einmalig viel Erfahrung (nur mit der passenden Form, nur in eigenen Läufen)
    probe(id, v) {
      const p = PROBE_BY_ID[id], o = this.s.el; if (!p || this.admin || !o || p.form !== o.form || p.el !== o.k) return;
      if (p.n && !(v >= p.n)) return;
      const E = elemState(this.home); if (E.probes[id]) return;
      E.probes[id] = 1; E.xp[p.el] = (E.xp[p.el] || 0) + PROBE_XP[p.t];
      if (this.fxOn) this.fx.push({ k: 'probe', id, t: 0 });
    }
    // x, y leer: automatisch (dichteste Gruppe bzw. Ziel). Flammenwand: (x, y) → (x2, y2)
    useElem(x, y, hand, x2, y2) {
      const o = this.s.el; if (!o || this.dead) return false;
      if (o.k === 'light') return o.form === 'lens' ? this.lensToggle(hand) : o.form === 'mirror' ? this.mirrorAuto(hand) : this.beamAuto(hand);
      if (!this.elemReady()) return false;
      if (o.k === 'fire') {
        if (o.form === 'wall') return this.castWall(x, y, x2, y2, hand);
        if (x == null) { const p = this.strikeTarget(); if (!p) return false; x = p.x; y = p.y; }
        y = Math.min(y, -20);
        if (o.form === 'meteor') {
          this.elemCd = o.cd;
          this.meteors.push({ x, y, at: this.time + 1.5, k: 1, hand: !!hand });
          if (o.star) { const pts = [{ x, y }]; for (let i = 0; i < 2; i++) { const q = this.densest(pts); if (!q) break; pts.push(q); this.meteors.push({ x: q.x, y: Math.min(q.y, -20), at: this.time + 2.1 + 0.4 * i, k: 0.4, hand: !!hand }); } }
          return true;
        }
        this.elemAmmo -= 1; let n = 0;
        for (const e of this.enemies) { if (e.hp <= 0) continue; const p = this.pos(e); if (Math.hypot(p.x - x, p.y - y) <= o.r + e.r) { n++; this.elHit(e, o.dmg, hand); } }
        this.fires.push({ x, y, r: o.r, dps: o.burn, until: this.time + o.burnT, k: 'elfire', el: true, hand: !!hand });
        if (this.fxOn) this.fx.push({ k: 'fireball', x, y, r: o.r, t: 0 });
        this.probe('fb_hit', n);
        return true;
      }
      if (o.form === 'nova') {
        this.elemCd = o.cd; let n = 0, hull = 0;
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.giant || e.dist - e.r > o.r) continue;
          const big = e.type === 'boss' || !!e.host;
          this.frost(e, o.dur * (!big && e.dist < WALL_R + 50 ? 1 + o.rime : 1), hand);
          if (!big) { n++; hull++; }
          this.elHit(e, o.dmg, hand);
        }
        if (o.heal && hull && !this.dead) this.hp = Math.min(this.s.maxHp, this.hp + this.s.maxHp * o.heal * hull);
        if (this.fxOn) this.fx.push({ k: 'frostnova', r: o.r, t: 0 });
        this.probe('in_hit', n);
        if (this.hp < this.s.maxHp * 0.15) this.novaSave = this.wave;
        return true;
      }
      if (o.form === 'storm') {
        if (x == null) { const p = this.strikeTarget(); if (!p) return false; x = p.x; y = p.y; }
        this.elemCd = o.cd;
        this.storms.push({ x, y: Math.min(y, -20), until: this.time + o.sdur, hand: !!hand, n: 0, t0: this.time });
        return true;
      }
      // Frostlanze
      const t = this.elemTarget(); if (!t) return false;
      this.elemCd = o.cd; this.lanceN = (this.lanceN || 0) + 1;
      const tp = this.pos(t);
      if (this.fxOn) this.fx.push({ k: 'lance', x1: 0, y1: -10, x2: tp.x, y2: tp.y, t: 0 });
      const done = [t]; let from = tp;
      for (let i = 0; i < o.chain; i++) {
        let n = null, nd = 110;
        for (const e of this.enemies) { if (e.hp <= 0 || done.includes(e) || e.host || e.giant || this.cloaked(e)) continue; const q = this.pos(e), d = Math.hypot(q.x - from.x, q.y - from.y); if (d < nd) { nd = d; n = e; } }
        if (!n) break;
        const q = this.pos(n); done.push(n);
        if (this.fxOn) this.fx.push({ k: 'lance', x1: from.x, y1: from.y, x2: q.x, y2: q.y, t: 0 });
        from = q;
      }
      done.forEach((e, i) => {
        this.frost(e, i ? o.dur / 2 : o.dur, hand);
        if (o.zero && e.type === 'boss' && this.lanceN % 3 === 0) e.frostHard = this.time + 1; // Nullpunkt: jede 3. Lanze hält Bosse an
        if (e.type === 'mender') this.probe('il_mend');
        this.elHit(e, i ? o.dmg / 2 : o.dmg, hand);
      });
      return true;
    }
    frost(e, dur, hand) {
      if (e.hp <= 0) return;
      const big = e.type === 'boss' || !!e.host;
      e.frostUntil = Math.max(e.frostUntil || 0, this.time + dur); e.frostBig = big; e.elemT = this.time; e.elemHand = !!hand;
      if (!big) e.stunUntil = Math.max(e.stunUntil || 0, e.frostUntil); // steht still, schießt nicht
      if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'brittle', x: p.x, y: p.y, t: 0 }); }
      const o = this.s.el;
      if (o && o.zero && !big && e.hp < e.maxHp * 0.12) this.elHit(e, e.hp, hand); // Nullpunkt: zerspringt sofort
    }
    // Zersplittern: eingefrorenes Schiff stirbt und trifft die Nachbarn (Eiszeit: friert sie 1 s ein)
    shatter(e) {
      const o = this.s.el, p = this.pos(e); this.shattering = true;
      if (this.shatW !== this.wave) { this.shatW = this.wave; this.shatN = 0; }
      this.probe('il_shat', ++this.shatN);
      const near = [];
      for (const n of this.enemies) {
        if (n === e || n.hp <= 0) continue; const q = this.pos(n);
        if (Math.hypot(q.x - p.x, q.y - p.y) >= 45 + n.r) continue;
        near.push(n); this.elHit(n, o.shard, e.elemHand);
        if (n.hp > 0 && n.type !== 'boss' && !n.host) { n.slow = Math.max(n.slowUntil > this.time ? n.slow : 0, 0.3); n.slowUntil = Math.max(n.slowUntil || 0, this.time + 2); }
      }
      this.shattering = false;
      if (o.age) for (const n of near) if (n.hp > 0) this.frost(n, 1, e.elemHand);
      if (this.fxOn) this.fx.push({ k: 'shatter', x: p.x, y: p.y, t: 0 });
    }
    // Flammenwand: Linie (x, y) → (x2, y2), höchstens o.len lang; Feuerring bei kurzem Tipp; automatisch quer vor die dichteste Gruppe
    castWall(x, y, x2, y2, hand) {
      const o = this.s.el; let w;
      if (x == null) {
        const p = this.strikeTarget(); if (!p) return false;
        const d = Math.hypot(p.x, p.y) || 1, nx = -p.y / d, ny = p.x / d, cx = p.x * (1 - 30 / d), cy = Math.min(-20, p.y * (1 - 30 / d)); // etwas vor der Gruppe
        w = o.ring ? { ring: true, x: p.x, y: Math.min(-30, p.y), r: 55 } : { x1: cx - nx * o.len / 2, y1: cy - ny * o.len / 2, x2: cx + nx * o.len / 2, y2: cy + ny * o.len / 2 };
      } else {
        x2 = x2 == null ? x : x2; y2 = y2 == null ? y : y2;
        const L = Math.hypot(x2 - x, y2 - y);
        if (L < 22) { if (!o.ring) return false; w = { ring: true, x, y: Math.min(-30, y), r: 55 }; }
        else { const k = Math.min(1, o.len / L); w = { x1: x, y1: Math.min(-8, y), x2: x + (x2 - x) * k, y2: Math.min(-8, y + (y2 - y) * k) }; }
      }
      this.elemCd = o.cd;
      w.until = this.time + o.dur; w.hand = !!hand; w.ids = new Set();
      this.walls.push(w);
      return true;
    }
    wallTick(o) {
      for (const w of this.walls) {
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.giant) continue;
          const p = this.pos(e);
          let d;
          if (w.ring) d = Math.abs(Math.hypot(p.x - w.x, p.y - w.y) - w.r);
          else { const vx = w.x2 - w.x1, vy = w.y2 - w.y1, L2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p.x - w.x1) * vx + (p.y - w.y1) * vy) / L2)); d = Math.hypot(p.x - w.x1 - vx * t, p.y - w.y1 - vy * t); }
          if (d > 8 + e.r) continue;
          w.ids.add(e.id);
          e.burnUntil = this.time + (o.burnFor || 3); e.burnDps = o.burn; e.elemHand = w.hand; e.elemT = this.time;
        }
        this.probe('fw_hit', w.ids.size); this.probe('fw_big', w.ids.size);
      }
      this.walls = this.walls.filter(w => w.until > this.time);
    }
    meteorTick(o) {
      for (const m of this.meteors) {
        if (this.time < m.at) continue;
        m.done = true; let n = 0;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue; const p = this.pos(e);
          if (Math.hypot(p.x - m.x, p.y - m.y) > o.r + e.r) continue;
          n++; e.meteorT = this.time;
          this.elHit(e, o.dmg * m.k * (e.type === 'boss' ? o.boss : 1), m.hand);
          if (e.hp > 0 && e.type !== 'boss' && !e.host) e.stunUntil = Math.max(e.stunUntil || 0, this.time + 1);
        }
        this.fires.push({ x: m.x, y: m.y, r: o.r * 0.8, dps: o.burn * m.k, until: this.time + 5, k: 'elfire', el: true, hand: m.hand });
        if (o.shower) for (let i = 0; i < 3; i++) {
          const a = i * 2.094 + 0.5, sx = m.x + Math.cos(a) * 58, sy = Math.min(-20, m.y + Math.sin(a) * 58);
          for (const e of this.enemies) { if (e.hp <= 0) continue; const p = this.pos(e); if (Math.hypot(p.x - sx, p.y - sy) <= 30 + e.r) this.elHit(e, o.shower * m.k, m.hand); }
          if (this.fxOn) this.fx.push({ k: 'fireball', x: sx, y: sy, r: 30, t: 0 });
        }
        if (this.fxOn) this.fx.push({ k: 'meteor', x: m.x, y: m.y, r: o.r * (m.k < 1 ? 0.8 : 1), t: 0 });
        if (m.k === 1) this.probe('fm_hit', n);
      }
      this.meteors = this.meteors.filter(m => !m.done);
    }
    stormTick(dt, o) {
      const tg = o.drift && this.focus && this.focus.hp > 0 ? this.pos(this.focus) : null;
      for (const st of this.storms) {
        if (tg) { const dx = tg.x - st.x, dy = tg.y - st.y, d = Math.hypot(dx, dy); if (d > 2) { const v = Math.min(d, o.drift * dt); st.x += dx / d * v; st.y = Math.min(-20, st.y + dy / d * v); } }
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.giant) continue;
          const p = this.pos(e), dx = st.x - p.x, dy = st.y - p.y, d = Math.hypot(dx, dy);
          if (d > o.r + e.r) continue;
          e.stormT = this.time;
          this.elHit(e, o.dps * dt, st.hand);
          if (e.hp <= 0) continue;
          const big = e.type === 'boss' || !!e.host;
          if (o.slick && !big) { e.slow = Math.max(e.slowUntil > this.time ? e.slow : 0, o.slick); e.slowUntil = Math.max(e.slowUntil || 0, this.time + 0.3); }
          if (!(e.frostUntil > this.time)) {
            e.chill = this.time - (e.chillAt || -9) > 0.5 ? dt : (e.chill || 0) + dt; e.chillAt = this.time;
            if (e.chill >= 3) { e.chill = 0; this.frost(e, o.dur, st.hand); if (!big) st.n++; }
          }
          if (o.vortex && !big && d > 6) { const v = Math.min(d, 28 * dt), x = p.x + dx / d * v, y = Math.min(-10, p.y + dy / d * v); e.a = Math.atan2(y, x); e.dist = Math.max(WALL_R + e.r, Math.hypot(x, y)); }
        }
        this.probe('is_hit', st.n);
      }
      this.storms = this.storms.filter(st => st.until > this.time);
    }
    // ---------- Licht: Prismastrahl (von Hand geführt oder selbstzielend), Brennglas, Spiegelfeld ----------
    beamStart(x, y) {
      const o = this.s.el; if (!o || o.k !== 'light' || o.form !== 'prism' || this.dead || !(this.beamE > 0.1)) return false;
      this.beam = { kind: 'prism', x, y: Math.min(y, -10), hand: true, auto: false }; return true;
    }
    beamMove(x, y) { if (this.beam && this.beam.kind === 'prism' && !this.beam.auto) { this.beam.x = x; this.beam.y = Math.min(y, -10); } }
    beamStop() { if (this.beam && this.beam.kind === 'prism' && !this.beam.auto) this.beam = null; }
    beamAuto(hand) {
      const o = this.s.el; if (!o || o.form !== 'prism' || !this.elemReady() || !this.elemTarget()) return false;
      this.beam = { kind: 'prism', auto: true, hand: !!hand }; return true;
    }
    lensToggle(hand) {
      const o = this.s.el; if (!o || o.form !== 'lens') return false;
      if (this.beam) { this.beam = null; if (this.lens) this.lens.keep = this.time + o.after; return true; }
      if (!this.elemReady() || !this.elemTarget()) return false;
      this.beam = { kind: 'lens', hand: !!hand }; return true;
    }
    setMirrorMode(on, hand) { const o = this.s.el; if (!o || o.form !== 'mirror') return false; this.mirrorMode = !!on; this.mirrorHand = !!hand; if (!on) this.beam = null; return true; }
    placeMirror(x, y) {
      const o = this.s.el; if (!o || o.form !== 'mirror' || this.dead) return false;
      this.mirrors.push({ x, y: Math.min(y, -15), until: this.time + 15 });
      while (this.mirrors.length > o.mirrors) this.mirrors.shift();
      return true;
    }
    // Autopilot fürs Spiegelfeld: fehlt ein Spiegel, einen in die dichteste Gruppe setzen, dann an
    mirrorAuto(hand) {
      if (!this.mirrors.length) { const p = this.strikeTarget(); if (!p) return false; this.placeMirror(p.x, p.y); }
      return this.setMirrorMode(true, hand);
    }
    beamTick(dt, o) {
      if (o.form === 'mirror') {
        this.mirrors = this.mirrors.filter(m => m.until > this.time);
        if (this.beamDry && this.beamE >= Math.min(o.dur, 2)) this.beamDry = false; // leer gelaufen: erst wieder an, wenn genug Energie da ist
        if (this.mirrorMode && this.mirrors.length && !this.beamDry) { if (!this.beam) this.beam = { kind: 'mirror', hand: this.mirrorHand }; }
        else this.beam = null;
      }
      if (this.lens && !this.beam && this.time > (this.lens.keep || 0)) this.lens = null;
      if (!this.beam) { this.beamE = Math.min(o.dur, (this.beamE || 0) + dt * o.dur / o.cd * (this.overActive ? 2 : 1)); return; }
      if (this.beamE <= 0) { this.beam = null; this.beamDry = true; if (this.lens) this.lens.keep = this.time + o.after; return; }
      this.beamE = Math.max(0, this.beamE - dt);
      const B = this.beam, O = { x: 0, y: -10 }, segs = [];
      if (B.kind === 'lens') {
        let t = this.lens && this.lens.t && this.lens.t.hp > 0 && !this.cloaked(this.lens.t) ? this.lens.t : null;
        const want = this.focus && this.focus.hp > 0 && !this.cloaked(this.focus) ? this.focus : null; // neue Markierung: Ziel wechseln
        if (want && want !== t) t = null;
        if (!t) { t = this.elemTarget(); if (!t) { this.beam = null; return; } this.lens = { t, ramp: this.lens && this.lens.carry != null ? this.lens.carry : o.hot }; }
        const L = this.lens; L.ramp = Math.min(o.ramp, L.ramp + 0.5 * dt); L.keep = 0;
        t.lensUntil = this.time + 0.2;
        this.elHit(t, o.dps * (1 + L.ramp) * dt, B.hand);
        if (L.ramp >= o.ramp) this.probe('ll_full');
        const p = this.pos(t); B.segs = [{ x1: O.x, y1: O.y, x2: p.x, y2: p.y, w: o.w }];
        return;
      }
      let k = 1;
      if (B.kind === 'mirror') {
        let a = O;
        this.mirrors.forEach((m, i) => { segs.push({ x1: a.x, y1: a.y, x2: m.x, y2: m.y, k: 1 + o.refr * i }); a = m; });
        const last = segs[segs.length - 1], L = Math.hypot(last.x2 - last.x1, last.y2 - last.y1) || 1;
        segs.push({ x1: a.x, y1: a.y, x2: a.x + (last.x2 - last.x1) / L * 220, y2: Math.min(a.y + (last.y2 - last.y1) / L * 220, 0), k: 1 + o.refr * this.mirrors.length });
        this.probe('lm_path', this.mirrors.length);
      } else {
        let tx = B.x, ty = B.y;
        if (B.auto) { const t = this.elemTarget(); if (!t) { this.beam = null; return; } const p = this.pos(t); tx = p.x; ty = p.y; k = 0.5; }
        const L = Math.hypot(tx, ty) || 1, ux = tx / L, uy = ty / L;
        if (o.fan && !B.auto) {
          segs.push({ x1: O.x, y1: O.y, x2: tx, y2: ty, k: 1 });
          for (const an of [-0.32, 0, 0.32]) { const c = Math.cos(an), s_ = Math.sin(an), dx = ux * c - uy * s_, dy = ux * s_ + uy * c; segs.push({ x1: tx, y1: ty, x2: tx + dx * 320, y2: ty + dy * 320, k: 1 }); }
        } else segs.push({ x1: O.x, y1: O.y, x2: ux * 560, y2: uy * 560, k: 1 });
      }
      B.segs = segs.map(q => Object.assign({ w: o.w }, q));
      let n = 0;
      for (const e of this.enemies) {
        if (e.hp <= 0 || this.cloaked(e) || e.giant) continue;
        const p = this.pos(e); let best = 0;
        for (const q of segs) {
          const vx = q.x2 - q.x1, vy = q.y2 - q.y1, L2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((p.x - q.x1) * vx + (p.y - q.y1) * vy) / L2));
          if (Math.hypot(p.x - q.x1 - vx * t, p.y - q.y1 - vy * t) <= o.w + e.r) best = Math.max(best, q.k);
        }
        if (!best) continue;
        n++;
        let ramp = 0;
        if (o.ramp) { if (this.time - (e.beamSeen || -9) > 0.25) e.beamT = 0; e.beamSeen = this.time; e.beamT = (e.beamT || 0) + dt; ramp = Math.min(o.ramp, 0.2 * e.beamT); } // Strahl war weg: Aufbau beginnt neu
        this.elHit(e, o.dps * best * (1 + ramp) * k * dt, B.hand);
        if (o.blind && (e.type === 'shooter' || e.type === 'mender') && e.hp > 0 && !(e.blindCd > this.time)) { e.stunUntil = Math.max(e.stunUntil || 0, this.time + o.blind); e.blindCd = this.time + 3; }
      }
      if (B.kind === 'prism') this.probe('lp_hit', n);
      if (B.kind === 'mirror') {
        // Linsen: jeder Spiegel feuert auf das nächste Schiff
        B.lens = [];
        if (o.lens) for (const m of this.mirrors) {
          let t = null, td = 90; for (const e of this.enemies) { if (e.hp <= 0 || this.cloaked(e)) continue; const p = this.pos(e), d = Math.hypot(p.x - m.x, p.y - m.y); if (d < td) { td = d; t = e; } }
          if (t) { this.elHit(t, o.lens * dt, B.hand); const p = this.pos(t); B.lens.push({ x1: m.x, y1: m.y, x2: p.x, y2: p.y }); }
        }
        // Lichtkäfig: Schiffe innerhalb der Spiegel sind gefangen
        if (o.cage && this.mirrors.length >= 3) {
          const M = this.mirrors; let caged = 0;
          for (const e of this.enemies) {
            if (e.hp <= 0 || e.type === 'boss' || e.host || e.giant) continue;
            const p = this.pos(e); let inside = false;
            for (let i = 0, j = M.length - 1; i < M.length; j = i++) if ((M[i].y > p.y) !== (M[j].y > p.y) && p.x < (M[j].x - M[i].x) * (p.y - M[i].y) / (M[j].y - M[i].y) + M[i].x) inside = !inside;
            if (!inside) continue;
            if (!(e.cageCd > this.time)) { e.stunUntil = Math.max(e.stunUntil || 0, this.time + 2); e.cageCd = this.time + 6; e.cagedUntil = this.time + 2; }
            if (e.cagedUntil > this.time) caged++;
          }
          this.probe('lm_cage', caged);
        }
      }
    }
    // Brennglas-Ziel stirbt: Probe bei vollem Aufbau, Sonnenfeuer springt weiter
    lensDeath(e) {
      const o = this.s.el, L = this.lens; if (!L || !o || o.form !== 'lens') return;
      const full = L.ramp >= o.ramp;
      if (full && e.type === 'boss' && !e.child) this.probe('ll_boss');
      if (full && o.sun) {
        const p = this.pos(e);
        for (const n of this.enemies) { if (n === e || n.hp <= 0) continue; const q = this.pos(n); if (Math.hypot(q.x - p.x, q.y - p.y) < 55 + n.r) this.elHit(n, o.dps * 4, this.beam ? this.beam.hand : true); }
        if (this.fxOn) this.fx.push({ k: 'fireball', x: p.x, y: p.y, r: 55, t: 0, col: 'light' });
        this.lens = { t: null, ramp: 0, carry: L.ramp / 2 };
      } else this.lens = { t: null, ramp: 0, carry: null };
    }

    // ---------- Spieleraktionen ----------
    markAt(x, y, keep) {
      let best = null, bd = 40;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue; const p = this.pos(e); let d = Math.hypot(p.x - x, p.y - y) - e.r;
        if (e.path) for (const q of e.path) d = Math.min(d, Math.hypot(q.x - x, q.y - y) - 10); // Riesenarm: überall antippbar
        if (e.giant) d = 99; // der Mantel selbst ist kein Ziel
        if (d < bd) { bd = d; best = e; }
      }
      if (best && best === this.focus && !keep) { this.focus = null; return 'off'; } // erneutes Antippen löst die Markierung
      if (best) { this.focus = best; this.focusUntil = Infinity; } // Markierung hält, bis das Ziel zerstört oder ein anderes gewählt ist
      return best;
    }
    // Bester Punkt für den Orbitalschlag: der Boss, sonst die Stelle mit den meisten Lebenspunkten im Wirkradius
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
          // Anbauteile der ersten Bosse (bis Welle P.strikePartTo): höchstens P.strikePart ihrer Lebenspunkte je Schlag,
          // sonst räumt der Schlag zu Beginn alles ab; später darf er sie wie früher mit zerstören
          const dmg = this.s.strikeDmg + e.maxHp * (e.type === 'boss' ? P.strikePct * 0.15 : P.strikePct);
          this.hurt(e, e.host && this.wave <= P.strikePartTo ? Math.min(dmg, e.maxHp * P.strikePart) : dmg, true, 'strike');
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
      if (id === 'freeze') this.freezeUntil = this.time + (A.dur(l) + ((this.s.K && this.s.K('t_stasis')) || 0)) * ext * ((this.twist() || {}).stasis || 1);
      if (id === 'over') this.overUntil = this.time + A.dur(l) * ext;
      if (this.fxOn) this.fx.push({ k: id, t: 0 });
      if (this.fxOn && this.s.mod && this.s.mod.echo) this.fx.push({ k: 'echo', t: 0 });
      return true;
    }
    get frozen() { return this.freezeUntil > this.time; }
    get overActive() { return this.overUntil > this.time; }
    get rateNow() { return this.s.rate * (this.overActive ? ABIL.over.mult(this.abilityLv('over')) + 0.25 * ((this.s.K && this.s.K('t_over')) || 0) : 1); }

    // Boss: schwebt in Reichweite und wechselt zwischen Fähigkeiten
    // Prüfungen des Bosses laufen, sobald er angekommen ist
    bossChecks(e, CK, dt) {
      const p = this.pos(e);
      if (CK.includes('dps')) {
        if (e.chkHp == null) { e.chkHp = e.hp; e.chkT = 0; }
        if ((e.chkT += dt) >= 10) {
          const lost = (e.chkHp - e.hp) / e.maxHp;
          if (lost < P.bossDpsCheck) { e.heat = Math.min(10, (e.heat || 0) + 1); if (this.fxOn) this.fx.push({ k: 'bossact', act: 'heat', x: p.x, y: p.y, t: 0 }); }
          else e.heat = Math.max(0, (e.heat || 0) - 1);
          e.chkHp = e.hp; e.chkT = 0;
        }
      }
      if (CK.includes('def')) {
        if ((e.stormT = (e.stormT == null ? 12 : e.stormT) - dt) <= 0) {
          e.stormT = 18;
          for (let i = 0; i < 10; i++) { const an = (i - 4.5) * 9; this.ebullets.push({ x: p.x + an, y: p.y + e.r * 0.6 + Math.abs(i - 4.5) * 3, dmg: e.dmg * 0.8, big: true, spd: 135, col: '#ff3060', rad: 6 }); }
          if (this.fxOn) this.fx.push({ k: 'bossact', act: 'storm', x: p.x, y: p.y, t: 0 });
        }
      }
      if (CK.includes('sustain')) {
        if ((e.radT = (e.radT || 0) + dt) >= 1) { e.radT = 0; if (!this.frozen) this.hitBase(e.dmg * 0.12); }
      }
      if (CK.includes('burst')) {
        if (e.plate > 0) {
          if (this.time >= e.plateEnd) { e.plate = 0; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.04); if (this.fxOn) this.fx.push({ k: 'bossact', act: 'plateheal', x: p.x, y: p.y, t: 0 }); }
        } else if ((e.plateT = (e.plateT == null ? 8 : e.plateT) - dt) <= 0) {
          e.plateT = 16; e.plateMax = e.plate = e.maxHp * P.bossBurst; e.plateEnd = this.time + 6;
          if (this.fxOn) this.fx.push({ k: 'bossact', act: 'plate', x: p.x, y: p.y, t: 0 });
        }
      }
    }
    // Aufholmodus: normale Läufe unter der Hälfte des Rekords laufen doppelt so schnell und bringen doppelte Wellenkristalle
    catchUp() { return !this.mode && !this.admin && this.wave < record(this.home) * P.catchAt; }
    bossNext(e) { if (!e.nextAct) { const a = this.bossActs(e); e.nextAct = a[e.acts % a.length]; } return e.nextAct; }
    bossActs(e) {
      const w = this.wave, BK = BOSS_KINDS[e.kind];
      let acts;
      if (BK) acts = BK.acts.concat(e.phase >= 1 && BK.ph2 || [], e.phase >= 2 && BK.ph3 || []);
      else {
        acts = ['salvo', 'spawn'];
        if (w >= 20) acts.push('bomb');
        if (w >= 30) acts.push('shield');
        if (w >= 40) acts.push('laser');
        const extra = SECTORS[e.sector - 1].boss;
        if (extra) acts.push(extra, extra === 'mend' ? 'salvo' : extra); // Reparatur nur einmal im Zyklus
      }
      return acts;
    }
    bossAct(e) {
      const w = this.wave, p = this.pos(e), acts = this.bossActs(e);
      // die nächste Fähigkeit steht schon fest (für die Anzeige); erst der Reihe nach, danach zufällig
      let act = e.nextAct && acts.includes(e.nextAct) ? e.nextAct : acts[e.acts % acts.length];
      e.acts++;
      e.nextAct = e.acts < acts.length ? acts[e.acts] : acts[Math.floor(Math.random() * acts.length)];
      if (act === 'shield' && this.time - (e.shieldAt || -99) < 12) act = 'salvo'; // Schild höchstens alle 12 s
      const partsOf = k2 => this.enemies.filter(o => o.host === e && o.pk === k2 && o.hp > 0).length;
      if (act === 'laser' && e.lanceLost) act = 'broadside'; // Lanze zerstört: kein Laser mehr
      if (act === 'mirror' && BOSS_KINDS[e.kind] && (BOSS_KINDS[e.kind].parts || []).some(q => q.k === 'prism') && !partsOf('prism')) act = 'salvo'; // ohne Prismen kein Spiegel
      e.sealK = BOSS_KINDS[e.kind] && (BOSS_KINDS[e.kind].parts || []).some(q => q.k === 'seal') ? partsOf('seal') / 4 : 1;
      if (act === 'shield') e.shieldAt = this.time;
      if (act === 'salvo') {
        // gezielter Fächer auf die Kanone
        const n = 5 + Math.min(4, Math.floor(w / 25));
        for (let i = 0; i < n; i++) this.ebullets.push({ x: p.x + (i - (n - 1) / 2) * 12, y: p.y + 10, dmg: e.dmg * 0.4, big: true });
      } else if (act === 'broadside') {
        // Breitseite: zwei Fächer aus den Seitengeschützen
        const fx = -p.x / (Math.hypot(p.x, p.y) || 1), fy = -p.y / (Math.hypot(p.x, p.y) || 1);
        for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) { const l = sd * (e.r * 1.2 + i * 7); this.ebullets.push({ x: p.x - fy * l, y: p.y + fx * l, dmg: e.dmg * 0.3, big: true }); }
      } else if (act === 'spores') {
        // Sporen: fünf weiche Bomben im Fächer
        for (let i = 0; i < 5; i++) { const hp = e.maxHp * 0.02, an = (i - 2) * 30; this.spawnAt('bomb', p.x + an, p.y + e.r * 0.8 + Math.abs(i - 2) * 6, { hp, maxHp: hp, dmg: e.dmg * 1.5, rw: 0.3 * rwScale(w), bomb: true }); }
      } else if (act === 'swarm') {
        const n = this.enemies.filter(o => o.type === 'runner' && o.hp > 0).length >= 6 ? 0 : 4;
        for (let i = 0; i < n; i++) { const hp = ENEMY.runner.hp * hpScale(w) * 0.6; this.spawnAt('runner', p.x + (i - 2.5) * 12, p.y + e.r * 0.6, { hp, maxHp: hp }); }
      } else if (act === 'fireball') {
        for (const dx of [-24, 0, 24]) this.ebullets.push({ x: p.x + dx, y: p.y + e.r * 0.5, dmg: e.dmg * 0.9, big: true, spd: 70, col: '#ff8a3d', rad: 8 });
      } else if (act === 'lava') {
        // Lavaregen: Brocken von überall aus dem oberen Feld
        const nv = e.kind === 'titan' ? this.enemies.filter(o => o.host === e && o.pk === 'vent' && o.hp > 0).length : 4;
        for (let i = 0; i < Math.round(6 * nv / 4); i++) this.ebullets.push({ x: (Math.random() * 2 - 1) * FIELD_W * 0.9, y: -FIELD_H * (0.7 + Math.random() * 0.25), dmg: e.dmg * 0.35, big: true, spd: 170, col: '#ff6a3d' });
      } else if (act === 'ink') {
        // Tintenwolke: die Arme sind 4 s lang nicht anvisierbar (Flächenschaden trifft trotzdem)
        for (const o of this.enemies) if (o.host === e) o.cloakUntil = this.time + 4;
        this.inkUntil = this.time + 4;
      } else if (act === 'mirror') {
        e.mirrorUntil = this.time + 3.5;
      } else if (act === 'pull') {
        // Sog: reißt Minen weg und bringt die Orbitklingen kurz zum Stehen
        for (const m of this.mines) { m.done = true; m.pulled = true; }
        this.mines = []; this.bladeOff = this.time + 5;
      } else if (act === 'mines') {
        // Minenteppich: drei langsame Bomben, breit gestreut
        for (const dx of [-45, 0, 45]) { const hp = e.maxHp * 0.03; this.spawnAt('bomb', p.x + dx, p.y + e.r, { hp, maxHp: hp, dmg: e.dmg * 2.5, rw: 0.4 * rwScale(w), bomb: true }); }
      } else if (act === 'hangar') {
        // Hangar: Staffel aus dem Bug, bei vollem Feld weniger
        const n = this.enemies.length >= 18 ? 0 : 4 + Math.min(4, Math.floor(w / 40));
        for (let i = 0; i < n; i++) { const t = i % 4 === 3 ? 'brute' : i % 2 ? 'runner' : 'grunt', hp = ENEMY[t].hp * hpScale(w) * 0.7; this.spawnAt(t, p.x + (i - (n - 1) / 2) * 14, p.y + e.r * 0.8, { hp, maxHp: hp }); }
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
        e.shieldUntil = this.time + 3.5;
      } else if (act === 'laser') {
        // Laser lädt 2 s; wer in der Zeit 6 % der Boss-LP abzieht, bricht ihn ab
        e.laser = 2; e.laserDmg = 0;
      } else if (act === 'cloak') {
        e.cloakUntil = this.time + 3.5;
      } else if (act === 'bulwarks') {
        if (this.enemies.filter(o => o.type === 'bulwark' && o.hp > 0).length < 3) for (const dx of [-35, 35]) { const hp = ENEMY.bulwark.hp * hpScale(w) * 0.7; this.spawnAt('bulwark', p.x + dx, p.y + 10, { hp, maxHp: hp }); }
      } else if (act === 'nova') {
        for (let i = 0; i < 10; i++) { const an = Math.PI * (0.05 + 0.9 * i / 9); this.ebullets.push({ x: p.x + Math.cos(an) * 30, y: p.y + Math.sin(an) * 30, dmg: e.dmg * 0.25, big: true }); }
      } else if (act === 'mend') {
        for (const o of this.enemies) if (o.hp > 0) { const q = this.pos(o); if (Math.hypot(q.x - p.x, q.y - p.y) < 160) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o === e ? P.mendSelf : P.mendOthers) * (e.sealK == null ? 1 : e.sealK)); }
      }
      if (this.fxOn) this.fx.push({ k: 'bossact', act, x: p.x, y: p.y, t: 0 });
    }

    update(dt) {
      if (this.dead) return;
      const s = this.s, frozen = this.frozen;
      this.time += dt;
      this.waveT += dt * (this.isChal && this.rule === 'fast' ? P.chalFastWave : 1) * (this.catchUp() ? P.catchSpeed : 1);
      // Aufholen: Feld leer und alles gestartet → nächste Welle sofort
      if (this.catchUp() && !this.queue.length && !this.enemies.some(e => e.hp > 0) && this.wave % 10 && this.waveT > 1) this.waveT = WAVE_LEN;
      // Durchmarsch: sobald alles gestartet und das Feld leer ist, kommt die nächste Welle (auch der Boss) sofort
      if (this.rush && !this.queue.length && this.waveT > 0.4 && !this.enemies.some(e => e.hp > 0 && (e.type === 'boss' || !this.cloaked(e)))) this.waveT = Math.max(this.waveT, WAVE_LEN);
      for (const k in this.cd) this.cd[k] = Math.max(0, this.cd[k] - dt);
      this.spawnT += dt;
      while (this.queue.length && this.spawnT >= this.spawnGap) { if (this.enemies.length >= P.aliveCap) { this.spawnT = this.spawnGap; break; } this.spawnT -= this.spawnGap; this.spawn(this.queue.shift()); } // volles Feld: Nachschub wartet
      if (this.waveT >= WAVE_LEN) {
        // Vor einer Bosswelle: erst das Feld räumen (höchstens eine zusätzliche Wellenlänge), dann kommt der Boss allein
        const preBoss = (this.wave + 1) % 10 === 0 && !(this.mode && this.mode.kind === 'boss') && this.enemies.some(e => e.hp > 0) && (this.preBossT = (this.preBossT || 0) + dt) < WAVE_LEN;
        this.preBoss = preBoss;
        if (this.bossAlive()) {
          this.waveT = WAVE_LEN; this.holding = true; // keine Verstärkung: im Bosskampf kommt nur, was der Boss selbst aussetzt
        } else if (preBoss) { this.waveT = WAVE_LEN; }
        else { this.reinfT = 0; this.preBossT = 0; this.preBoss = false; this.nextWave(); }
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

      for (const e of this.enemies) if (e.host && e.hp > 0) this.placePart(e);
      if (!frozen) for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        e.flash = Math.max(0, e.flash - dt);
        if (e.host) {
          e.dmg = e.host.dmg * 0.3;
          if (e.pk === 'tentacle') {
            // Tentakel: ruht, schnellt zur Kanone, schlägt zu, bleibt kurz liegen (verwundbar), zieht sich zurück
            const h = e.host, sp = h.phase >= 2 ? 1.4 : 1;
            if (e.tst === 0) { e.ext = Math.max(0, e.ext - dt / 0.8); if ((e.tt -= dt * sp) <= 0 && h.dist <= h.stop + 5) e.tst = 1; }
            else if (e.tst === 1) { e.ext += dt / 0.7 * sp; if (e.ext >= 1) { e.ext = 1; e.tst = 2; e.tt = 2.5; this.hitBase(h.dmg * 0.6); if (this.fxOn) this.fx.push({ k: 'wallhit', a: e.a, t: 0 }); } }
            else if (e.tst === 2) { if ((e.tt -= dt) <= 0) e.tst = 3; }
            else { e.ext -= dt / 0.9; if (e.ext <= 0) { e.ext = 0; e.tst = 0; e.tt = 2.5 + Math.random() * 3; } }
            continue;
          }
          if (e.pk === 'segment' && (e.shotT -= dt) <= 0) {
            // Wurmsegment spuckt Glut
            e.shotT = 4 + Math.random() * 3; const p = this.pos(e); this.ebullets.push({ x: p.x, y: p.y, dmg: e.dmg * 0.7, big: true, col: '#ff8a3d' });
          }
          if (e.pk === 'gate' && (e.shotT -= dt) <= 0) {
            // Hangartor: schickt Jäger los, solange es steht
            e.shotT = 7 + Math.random() * 2;
            if (this.enemies.length < 18) { const p = this.pos(e); for (const dx of [-8, 8]) { const t = Math.random() < 0.4 ? 'runner' : 'grunt', hp = ENEMY[t].hp * hpScale(this.wave) * 0.7; this.spawnAt(t, p.x + dx, p.y + 10, { hp, maxHp: hp }); } }
          }
          if (e.pk === 'rack' && (e.shotT -= dt) <= 0) {
            // Minenschacht: legt eine Bombe ab
            e.shotT = 8 + Math.random() * 2; const p = this.pos(e), hp = e.host.maxHp * 0.02;
            this.spawnAt('bomb', p.x, p.y + 6, { hp, maxHp: hp, dmg: e.host.dmg * 1.6, rw: 0.3 * rwScale(this.wave), bomb: true });
          }
          if (e.pk === 'vent' && (e.shotT -= dt) <= 0) {
            // Schlot: speit Lavabrocken auf die Kanone
            e.shotT = 3.5 + Math.random() * 1.5; const p = this.pos(e); this.ebullets.push({ x: p.x, y: p.y, dmg: e.dmg * 1.2, big: true, spd: 95, col: '#ff6a3d', rad: 7 });
          }
          if ((e.pk === 'gwing' || e.pk === 'head') && (e.shotT -= dt * (e.host.reborn ? 1.4 : 1)) <= 0) {
            // Phönix: Schwingen streuen Glutfedern, der Kopf spuckt Feuerbälle
            const p = this.pos(e);
            if (e.pk === 'gwing') { e.shotT = 2.8 + Math.random(); for (let i = -2; i <= 2; i++) this.ebullets.push({ x: p.x + i * 12, y: p.y, dmg: e.dmg * 0.5, big: true, col: '#ffb03d' }); }
            else { e.shotT = 4 + Math.random(); this.ebullets.push({ x: p.x, y: p.y, dmg: e.dmg * 1.4, big: true, spd: 80, col: '#ff8a3d', rad: 8 }); }
          }
          if (e.pk === 'wing' && (e.shotT -= dt) <= 0) {
            // Schwinge: Fächer aus Glutfedern
            e.shotT = 3.2 + Math.random(); const p = this.pos(e); for (let i = -1; i <= 1; i++) this.ebullets.push({ x: p.x + i * 8, y: p.y, dmg: e.dmg * 0.6, big: true, col: '#ffb03d' });
          }
          // Geschützturm: eigener kleiner Feuerstoß auf die Kanone
          if (e.pk === 'turret' && e.host.dist <= e.host.stop + 5 && (e.shotT -= dt) <= 0) {
            e.shotT = Math.max(1.6, 3 - this.wave * 0.004) * (0.85 + Math.random() * 0.3);
            const p = this.pos(e); for (const o of [-6, 6]) this.ebullets.push({ x: p.x + o, y: p.y, dmg: e.dmg, big: false });
            if (this.fxOn) this.fx.push({ k: 'eshot', t: 0, type: 'shooter' });
          }
          continue;
        }
        const contact = WALL_R + e.r * 0.3;
        if (e.type === 'boss') {
          const fz = e.frostHard > this.time ? 0 : e.frostUntil > this.time ? 0.5 : 1; // Eis: Bosse halb so schnell, auch ihre Fähigkeiten (Nullpunkt: ganz angehalten)
          // Wut: je länger der Kampf dauert, desto härter schlägt der Boss zu (+100 % alle 90 s)
          e.fightT = (e.fightT || 0) + dt; if (e.dmg0 == null) e.dmg0 = e.dmg;
          e.dmg = e.dmg0 * (1 + e.fightT / P.bossWrath) * (1 + 0.3 * (e.heat || 0));
          const CK = BOSS_KINDS[e.kind] && BOSS_KINDS[e.kind].chk;
          if (CK && e.dist <= e.stop + 5) this.bossChecks(e, CK, dt);
          if (e.regrow && e.regrow.length) for (const g of e.regrow.slice()) if (this.time >= g.at) { e.regrow.splice(e.regrow.indexOf(g), 1); this.spawnPart(e, g.q); if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'bossact', act: 'regrow', x: p.x, y: p.y, t: 0 }); } }
          // Herrscher: neue Phase unter 66 % und 33 % Lebenspunkten
          if (e.lord) { const ph = e.hp < e.maxHp * 0.33 ? 2 : e.hp < e.maxHp * 0.66 ? 1 : 0; if (ph > e.phase) { e.phase = ph; e.actT = Math.min(e.actT, 1); if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'bossact', act: 'phase', x: p.x, y: p.y, t: 0 }); } } }
          if (e.giant) {
            // Riese: eigene Steuerung, kein Sturmangriff, Fähigkeiten wie gewohnt
            if (e.dist > e.stop + 5 && !e.phase) { e.dist = Math.max(e.stop, e.dist - e.spd * fz * dt); }
            else { this.giantTick(e, dt); e.actT -= dt * fz; if (e.actT <= 0) { e.actT = e.actMax = Math.max(3, 5 - this.wave * 0.01); this.bossAct(e); } }
            continue;
          }
          if (e.retreat) {
            // nach dem Sturmangriff zurück auf Abstand, dann beginnt das Schweben von vorn
            e.dist = Math.min(e.stop, e.dist + e.spd * 1.3 * dt);
            if (e.dist >= e.stop) { e.retreat = false; e.hoverT = 0; e.rushes = (e.rushes || 0) + 1; }
          } else if (e.dist > e.stop && !e.enraged) { e.dist = Math.max(e.stop, e.dist - e.spd * fz * dt); }
          else {
            e.hoverT += dt;
            const gl = BOSS_KINDS[e.kind] && BOSS_KINDS[e.kind].glide;
            e.a = e.a0 + Math.sin(e.hoverT * (gl ? 0.6 : 0.45)) * (gl || 0.35); // Rochen und Flieger gleiten weit zur Seite
            // Sturmangriff: erst nach längerem Schweben, später in kürzeren Abständen; nach einigen Sekunden am Wall zieht es sich zurück
            if (!e.enraged && e.hoverT > (e.rushes ? 25 : this.wave < 30 ? 65 : 40)) { e.enraged = true; e.rushT = 0; }
            if (e.enraged && e.dist <= contact && (e.rushT = (e.rushT || 0) + dt) > 8) { e.enraged = false; e.retreat = true; }
            if (e.laser > 0) {
              e.laser -= dt;
              if (e.laserDmg >= e.maxHp * 0.06) { e.laser = 0; if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'bossact', act: 'broken', x: p.x, y: p.y, t: 0 }); } }
              else if (e.laser <= 0) { this.hitBase(e.dmg * 4); if (this.fxOn) this.fx.push({ k: 'laserhit', t: 0, a: e.a, d: e.dist }); }
            }
            if (e.enraged) {
              if (e.dist > contact) e.dist = Math.max(contact, e.dist - e.spd * 0.8 * fz * dt);
              else { e.atkT -= dt; if (e.atkT <= 0) { e.atkT = 1; this.hitBase(e.dmg); } }
            }
            e.actT -= dt * fz;
            if (e.actT <= 0) { e.actT = e.actMax = Math.max(2.5, 4.5 - this.wave * 0.02); this.bossAct(e); }
          }
          continue;
        }
        // Heiler: repariert Schiffe in der Nähe
        if (e.type === 'mender' && !(e.frostUntil > this.time)) { // eingefroren heilt er nicht
          const p = this.pos(e);
          // Heilung stapelt nicht (je Schiff nur ein Heiler pro Moment), Bosse bekommen nur einen Bruchteil
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
        const d = Math.hypot(b.x, b.y), v = (b.spd || (b.big ? 120 : 150)) * dt;
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
        // Bosskampf: nach Wellenende hat der Boss Vorrang, außer ein Schiff ist schon nah an der Kanone
        if (this.holding && !this.focus) {
          const boss = inRange.find(e => e.type === 'boss' && !(e.worm && e.segs > 0)); // gepanzerter Wurmkopf: erst die Segmente
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
          // Präzision: markierte Ziele verlieren zusätzlich 1,2 % (Bosse 0,04 %) ihrer max. Lebenspunkte je Treffer
          const pct = t !== this.focus ? 0 : t.maxHp * (t.type === 'boss' ? P.gunBossPct : P.gunFocusPct) * (b.pk || 1); // nur markierte Ziele, Bosse schwächer
          const eff = this.hurt(t, (b.dmg + pct) * brittle, b.crit, b.big ? 'skill' : 'gun'); // Ladeschuss zählt als Kommandant-Skill
          if (eff > 0) {
            // Zusatzschaden den Modulen zurechnen: Anteil, der ohne das Modul fehlen würde
            if (brittle > 1) this.credit('cryoammo', eff * (1 - 1 / brittle));
            if (b.oc) this.credit('overcharge', eff * (1 - 1 / s.mod.overcharge));
            if (b.rc && s.mod.scanner && s.crit > 0) { const c1 = Math.min(1, s.crit); this.credit('scanner', eff * (1 - 1 / s.critx) * (c1 - Math.min(1, Math.max(0, s.crit - s.mod.scanner))) / c1); } // Krit über 100 % bringt nichts
          }
          if (brittle > 1 && this.fxOn && Math.random() < 0.35) this.fx.push({ k: 'brittle', x: p.x, y: p.y, t: 0 });
          if (s.K('p_poison') && t.hp > 0) { this.poison(t, b.dmg * brittle * 0.1 * s.K('p_poison')); t.ppUntil = this.time + 3; }
          if (s.K('p_vamp') && !this.dead) this.hp = Math.min(s.maxHp, this.hp + s.maxHp * 0.0003 * s.K('p_vamp'));
          if (s.K('p_exec') && t.hp > 0 && t.type !== 'boss' && t.hp < t.maxHp * 0.05 * s.K('p_exec')) { this.hurt(t, t.hp, true, 'skill'); if (this.fxOn) this.fx.push({ k: 'exec', x: p.x, y: p.y, t: 0 }); }
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
            // Schwarmbrecher: kleine Schiffe werden weiter zurückgestoßen (P.shockPct: optional fester Anteil ihrer Lebenspunkte, im späten Spiel schnell übermächtig)
            const small = e.type !== 'boss' && !e.host;
            this.hurt(e, s.shockDmg + (small ? e.maxHp * P.shockPct : 0), false, 'shock');
            if (s.K('a_frost')) { e.slow = Math.max(e.slowUntil > this.time ? e.slow : 0, 0.3 * (e.type === 'boss' ? 0.4 : 1)); e.slowUntil = Math.max(e.slowUntil || 0, this.time + 2); }
            if (e.hp > 0) this.push(e, small ? 26 : 14);
          }
        }
        if (R.r >= R.max) this.ring = null;
      }
      // Orbitklingen: pendeln im oberen Halbkreis
      if (s.blades && !(this.bladeOff > this.time)) {
        this.bladeA += dt * (s.rateAll || 1);
        for (const b of this.bladePos()) {
          for (const e of this.enemies) {
            if (e.hp <= 0 || e.bladeHit > this.time) continue;
            const p = this.pos(e);
            // Schutzring: Bomben zerfallen sofort, Schiffe kurz vor dem Schutzwall nehmen doppelten Schaden, Boss-Anbauteile wenig;
            // je Schiff höchstens ein Treffer pro P.bladeCd (sonst mähen die Klingen spät gestaute Wellen ab)
            if (Math.hypot(p.x - b.x, p.y - b.y) < e.r + s.bladeSize) { this.hurt(e, e.bomb ? e.hp : s.bladeDmg * (e.host ? P.bladePart : e.type !== 'boss' && e.dist <= WALL_R + 45 ? P.bladeWall : 1), false, 'blade'); e.bladeHit = this.time + P.bladeCd; }
          }
        }
      }
      // Minen: nur auf Anflugbahnen, die Gegner tatsächlich nehmen
      if (s.mineCd) {
        this.mineT += dt;
        if (this.mineT >= s.mineCd && this.mines.length < s.mineMax) {
          this.mineT = 0;
          // Boss in Wurfweite: die neue Mine fliegt direkt auf ihn, sonst landet sie auf einer Anflugbahn
          const boss = this.enemies.find(e => e.type === 'boss' && e.hp > 0 && e.dist - e.r <= s.range + 40);
          if (boss) this.mines.push({ x: 0, y: -10, arm: 0, age: 0, fly: true, tid: boss.id });
          else {
            const x0 = (Math.random() * 2 - 1) * FIELD_W, y0 = -FIELD_H;
            const a = Math.atan2(y0, x0), r = WALL_R + 25 + Math.random() * Math.max(10, s.range - WALL_R - 25);
            this.mines.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, arm: 0.6, age: 0 });
          }
        }
        for (const m of this.mines) {
          m.arm -= dt; m.age += dt; if (m.arm > 0) continue;
          // Zündzeit abgelaufen: die Mine detoniert an Ort und Stelle und macht Platz für eine neue
          if (!m.fly && m.age >= MINE_FUSE) m.done = true;
          if (m.fly) {
            // geworfene Mine: fliegt auf ihren Boss; ist er weg, detoniert sie dort, wo sie gerade ist
            const tg = this.enemies.find(e => e.id === m.tid && e.hp > 0);
            if (!tg) m.done = true;
            else {
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
      this.elemTick(dt);
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
      if (this.glow) delete this.home.fusGlow;
      const m = this.meta, c = Math.floor(this.crystals), rest = c - (this.paid || 0);
      m.crystals += rest; m.totalCrystals = (m.totalCrystals || 0) + rest; this.paid = c;
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
      if (this.mode.kind === 'boss') {
        // Bosskampf: Übung ohne Belohnung, aber mit Bestzeit
        res.won = !!this.won; res.boss = this.mode.boss; res.bw = this.mode.w;
        if (this.won && !this.admin) {
          // kleine Belohnung: halbe Boss-Kristalle und die Erfahrung der Welle
          const c = Math.floor(this.crystals * 0.5); m.crystals += c; m.totalCrystals = (m.totalCrystals || 0) + c; res.crystals = c;
          const x = cmdOpen(this.home) ? xpFor(this.mode.w) : 0; cmdState(m).xp += x; res.xp = x;
        }
        if (this.won && !this.admin) { m.bossTime = m.bossTime || {}; const k = this.mode.boss + '@' + this.mode.w, prev = m.bossTime[k]; res.prevTime = prev; if (!prev || this.time < prev) { m.bossTime[k] = this.time; res.newTime = true; } }
        return res;
      }
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
    m_over:  { w: 0.35, why: 'Stärkere Überladung hilft gegen Bosse.' },
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
    if (meta.crystals < c || !gateOk(meta, u.id)) return false;
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
  const planetOpen = (m, P_) => mineOpen(m) && record(m) >= P_.at;
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
  // Lasermeißel: jeder Planet hat eigene Bohrkraft, die sich auflädt; jeder Treffer bringt Erz (etwa 20 s Förderung bzw. ein Grundwert).
  // Weil jetzt jeder Planet seine eigene Leiste hat, sind Vorrat und Aufladung je Planet kleiner als früher bei der gemeinsamen Leiste.
  const tapMax = lz => 12 + lz;
  const tapRegen = 0.1; // pro Sekunde und Planet
  function tapYield(m, P_) { const pl = plOf(m, P_.id); return Math.max(1, (Math.max(mineRate(pl.d, P_), 45) / 30) * (1 + 0.5 * (pl.lz - 1)) * trv(P_, 'tap') * achBonus(m).mine); }
  function tapEnergy(m, id, now) {
    const M = mineState(m), pl = plOf(m, id), mx = tapMax(pl.lz || 0); now = now || Date.now();
    if (M.tap) delete M.tap; // alte gemeinsame Leiste (bis 0.29.2)
    const T = pl.tap = pl.tap || { e: mx, t: now };
    T.e = Math.min(mx, T.e + Math.max(0, now - T.t) / 1000 * tapRegen); T.t = now; return T;
  }
  function mineTap(m, id, rnd) {
    const P_ = PDEF(id), pl = plOf(m, id); if (!P_ || !planetOpen(m, P_) || !pl.lz) return null;
    const T = tapEnergy(m, id); if (T.e < 1) return null;
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

  const VERSION = '0.42.0'; // gleich halten mit VERSION in sw.js
  root.Core = { VERSION, ELEM_FORM_AT, ELEM_CAP_AT, ELEM_PROBES, PROBE_XP, elProbeDone, elFormPts, elKMax, ELEMENTS, ELEM_FORMS, ELEM_SKILLS, ELEM_MASTER_K, elemState, elXpNeed, elRank, elLv, elForm, elSpent, elStemPts, elTreeMax, elPoints, elMastery, elUnlocked, elActive, elOpen, elCan, elBuy, elCanRefund, elRefund, elReset, elChoose, elSetForm, elFix, fusionCostOld, fusionCostG, AUTO_W, PLANETS, MINE_AT, FACIL, mineState, mineRate, mineCapH, mineCap, droneRate, facCost, planetOpen, plOf, mineTick, mineCollect, mineUpgrade, tapMax, tapRegen, tapYield, tapEnergy, mineTap, orePrice, mineSell, MOD_CRAFT, modBoostCost, modRarCost, modMastCost, RESEARCH, researchCost, researchLv, researchBonus, research, planetForModule, modCraft, modImprove, SKIN, skinState, skinUnlocked, CHALLENGES, CHAL_AT, xpFor, xpNeed, cmdState, rankOf, SK_BRANCH, SKILLS, SK_CAP_AT, SK_CAP2_AT, SK_MASTER_K, skMastery, skFree, skTreeMax, skLv, skSpent, skPoints, skBranchPts, skCan, skOpen, skFix, SK_LINK_AT, skBuy, skReset, skCanRefund, skRefund, chalStart, chalMult, ACH, achVal, achTier, achBonus, achPoints, permBonus, statOf, DAILY_AT, chalTier, chalBonus, TWISTS, STD_LV, dayKey, dailyOf, dailyBonus, stdMeta, dropChance, WALL_R, WAVE_TYPES, GATES, MODULES_AT, FUSION_AT, cmdOpen, mileOk, mileTxt, fusWave, fusMile, rushOpen, BUY_RUN_AT, buyInRun, TEMPO_AT, TEMPO4_AT, tempoOpen, tempo4Open, ROADMAP, record, gateOk, nextUnlock, unlocked, beginner, modOpen, chalOpen, dailyOpen, mineOpen, recommend, cheapest, MODULES, RARITY, MODULE_SLOTS, modSlots, FUS_MILES, fusGlow, moduleValue, addModule, rollModule, FUSION_UPG, FUSION_MIN, LORD_W, lordCore, SECTORS, sectorOf, cycleOf, ANOMALIES, anomalyOf, cycleName, ECHO_AT, flv, fragmentsFor, fuse, fusionCost, fusionBuy, milestoneReward, RUN_UPG, META_UPG, ENEMY, ABIL, SOURCES, Run, newMeta, mlv, metaCost, metaBuy, startEnergy, offlinePerHour, enemyHp, maxStartWave, startWaveFor, jumpShare, jumpBonus, FIELD_W, FIELD_H, BASE_R, WAVE_LEN, STRIKE_R, STRIKE_KILLS, BOSS_KINDS, BOSS_ROSTER, BOSS_ACT_NAME, BOSS_CHECK, bossKind, bossWaves, P };
})(typeof window !== 'undefined' ? window : globalThis);
