// Kernwacht – Zeichnen (Canvas 2D)
(function (root) {
  'use strict';
  const C = root.Core;

  function create(cv) {
    const ctx = cv.getContext('2d');
    { const ft = ctx.fillText.bind(ctx); if (window.KWI18n) ctx.fillText = (s, x, y, w) => w == null ? ft(KWI18n.T(String(s)), x, y) : ft(KWI18n.T(String(s)), x, y, w); } // Canvas-Texte übersetzen
    const view = { cx: 0, cy: 0, s: 1 };
    let W = 0, H = 0, DPR = 1;
    const fx = [], parts = [];
    let shake = 0, recoil = 0, flash = 0, lastShots = 0;

    const css = getComputedStyle(document.documentElement);
    const col = n => css.getPropertyValue(n).trim();
    const PAL = {
      core: col('--core'), hostile: col('--hostile'), energy: col('--energy'), crystal: col('--crystal'), heal: col('--heal'),
      line: col('--line'), dim: col('--ink-dim'), range: col('--range'), void: col('--void'), sky: col('--sky-top'), frost: col('--frost'), heat: col('--heat'),
    };
    const SHIP = { grunt: '#ff4f9a', runner: '#ff9447', brute: '#ff5a5a', shooter: '#c9ff4f', boss: '#ff4ff0', part: '#ff4ff0', bomb: '#ffdd55',
      phantom: '#7dffcf', bulwark: '#ffb347', splitter: '#ff6b6b', shard: '#ff8f8f', mender: '#8dff7d' };
    const BOSS_COL = ['#ff4ff0', '#4fffc8', '#ff9a3c', '#ff4040', '#9fb6ff'];
    // Gegner-Fraktionen je Sektor: eigene Farben für die Grundtypen
    const FAC_COL = [null, null,
      { grunt: '#4dffc3', runner: '#b8ff4d', brute: '#2fd6a0', shooter: '#e0ff6b' },
      { grunt: '#ffb03b', runner: '#ffe14d', brute: '#ff7a2f', shooter: '#fff07a' },
      { grunt: '#ff4d6a', runner: '#ff9aa8', brute: '#d42f4f', shooter: '#ffd0d8' },
      { grunt: '#a8c8ff', runner: '#e6ecff', brute: '#8a7dff', shooter: '#c4fff8' },
    ];
    const RAR_COL = ['#a39ed0', '#3ef0ff', '#c3a6ff', '#ffc04d'];
    // Biome je Sektor: Himmel, Boden, Raster, Sterne
    const BIOME = [
      { sky: '#1e1a4a', void: '#12102c', grid: '#3a3474', star: '#d9d4ff' },
      { sky: '#0e3b3a', void: '#071a1c', grid: '#1d5753', star: '#c9fff3' },
      { sky: '#3d2010', void: '#170b06', grid: '#5e3a22', star: '#ffe1c4' },
      { sky: '#4a0f22', void: '#18050c', grid: '#6b2236', star: '#ffd0d6' },
      { sky: '#07070f', void: '#000000', grid: '#26314d', star: '#a8c0ff' },
    ];
    const clouds = Array.from({ length: 7 }, () => ({ x: Math.random(), y: Math.random() * 0.7, r: 0.18 + Math.random() * 0.22, v: 0.004 + Math.random() * 0.006 }));
    const rocks = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random() * 0.75, r: 4 + Math.random() * 12, v: 0.006 + Math.random() * 0.012, rot: Math.random() * 6, n: 6 + (Math.random() * 3 | 0), seed: Math.random() }));
    const HULL = '#0d0b22';
    const FONT_NUM = () => col('--font-num'), FONT_UI = () => col('--font-ui');
    const stars = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, p: Math.random() * 6 }));
    const ICON_PATH = {}; for (const k in ICONS) ICON_PATH[k] = new Path2D(ICONS[k]);
    const LIFE = { fireball: 0.7, lance: 0.35, shatter: 0.45, meteor: 0.9, frostnova: 0.8, probe: 0.1, leap: 2.2, rush: 2.8, lordwin: 3.5, exec: 0.45, reflect: 0.3, emerg: 0.9, phoenix: 1.4, stun: 0.6, drone: 0.12, barrage: 0.6, hole: 0.6, aegis: 0.7, thorn: 0.35, brittle: 0.4, echo: 0.8, wallhit: 0.3, leech: 0.6, crysfx: 0.6, cryo: 0.5, chain: 0.25, splinter: 0.3, nova: 0.8, laserhit: 0.5, loot: 2.4, emp: 0.9, bonus: 1.4, boom: 0.55, shock: 0.6, mine: 0.6, dmg: 0.7, hurt: 0.25, wave: 1.8, strike: 0.7, freeze: 0.8, over: 0.6, bossact: 0.8, shieldhit: 0.25, mark: 0.5 };

    function resize() {
      const r = cv.getBoundingClientRect();
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      view.s = Math.min(W / 500, (H - 110) / 440);
      view.cx = W / 2; view.cy = H - 60 - 32 * view.s; // Platz für die Lebensleiste unter der Kanone
    }
    function toWorld(clientX, clientY) {
      const r = cv.getBoundingClientRect();
      return { x: (clientX - r.left - view.cx) / view.s, y: (clientY - r.top - view.cy) / view.s };
    }

    // ---------- Hilfen ----------
    function glow(color, w, a) {
      a = a == null ? 1 : a;
      ctx.strokeStyle = color; ctx.globalAlpha = a * 0.28; ctx.lineWidth = w * 3.2; ctx.stroke();
      ctx.globalAlpha = a; ctx.lineWidth = w; ctx.stroke(); ctx.globalAlpha = 1;
    }
    function fillHull() { ctx.fillStyle = HULL; ctx.fill(); }
    function flame(x, y, len, w, c, t, seed) {
      const f = len * (0.75 + 0.25 * Math.sin(t * 0.03 + seed));
      const g = ctx.createLinearGradient(x, y, x - f, y);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, c); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.moveTo(x, y - w); ctx.quadraticCurveTo(x - f * 0.5, y, x - f, y); ctx.quadraticCurveTo(x - f * 0.5, y, x, y + w); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
    }
    function hexPath(r, rot) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); }

    // ---------- Raumschiffe (lokale Achse +x = Flugrichtung) ----------
    function drawShip(e, t, frozen) {
      const fc = FAC_COL[e.fac || 1] && FAC_COL[e.fac][e.type];
      const c = e.flash > 0 ? '#ffffff' : frozen ? PAL.frost : e.pdps > 0 && e.type !== 'boss' && fxMode === 'full' ? '#8dff5a' : e.type === 'boss' ? BOSS_COL[(e.sector || 1) - 1] : e.type === 'part' ? BOSS_COL[((e.host && e.host.sector) || 1) - 1] : fc || SHIP[e.type], r = e.r, sd = e.seed;
      if (fc && drawFaction(e, c, r, t, sd, frozen ? 0.25 : 1)) return;
      const fl = frozen ? 0.25 : 1;
      ctx.lineJoin = 'round';
      if (e.type === 'grunt') {
        flame(-r * 0.7, 0, r * 1.6 * fl, r * 0.28, '#ff7ab8', t, sd);
        ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.lineTo(-r * 0.4, -r * 0.35); ctx.lineTo(-r * 0.9, -r * 1.1); ctx.lineTo(-r * 0.7, 0); ctx.lineTo(-r * 0.9, r * 1.1); ctx.lineTo(-r * 0.4, r * 0.35); ctx.closePath();
        fillHull(); glow(c, 1.4);
        ctx.beginPath(); ctx.arc(r * 0.35, 0, r * 0.22, 0, 7); ctx.fillStyle = c; ctx.fill();
      } else if (e.type === 'runner') {
        flame(-r * 1.1, 0, r * 4 * fl, r * 0.35, '#ffb066', t, sd);
        ctx.beginPath(); ctx.moveTo(r * 1.8, 0); ctx.lineTo(-r * 1.1, -r * 0.6); ctx.lineTo(-r * 0.7, 0); ctx.lineTo(-r * 1.1, r * 0.6); ctx.closePath();
        fillHull(); glow(c, 1.2);
      } else if (e.type === 'brute') {
        // Kanonenboot: breiter Keil mit Seitengeschützen
        flame(-r * 0.85, -r * 0.55, r * 1.4 * fl, r * 0.2, '#ff8a8a', t, sd);
        flame(-r * 0.85, r * 0.55, r * 1.4 * fl, r * 0.2, '#ff8a8a', t, sd + 1);
        ctx.beginPath();
        ctx.moveTo(r * 1.25, 0); ctx.lineTo(r * 0.35, -r * 0.5); ctx.lineTo(r * 0.1, -r * 1.05); ctx.lineTo(-r * 0.85, -r * 0.95);
        ctx.lineTo(-r * 0.6, -r * 0.35); ctx.lineTo(-r * 0.95, 0); ctx.lineTo(-r * 0.6, r * 0.35); ctx.lineTo(-r * 0.85, r * 0.95);
        ctx.lineTo(r * 0.1, r * 1.05); ctx.lineTo(r * 0.35, r * 0.5); ctx.closePath();
        fillHull(); glow(c, 1.9);
        ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.78); ctx.lineTo(r * 0.8, -r * 0.78); ctx.moveTo(r * 0.1, r * 0.78); ctx.lineTo(r * 0.8, r * 0.78); glow(c, 1.4);
        ctx.beginPath(); ctx.moveTo(r * 0.75, 0); ctx.lineTo(r * 0.1, -r * 0.22); ctx.lineTo(r * 0.1, r * 0.22); ctx.closePath(); ctx.fillStyle = c; ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1;
      } else if (e.type === 'shooter') {
        flame(-r * 0.8, 0, r * 1.4 * fl, r * 0.3, '#e3ff8a', t, sd);
        ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.5); ctx.lineTo(r * 0.6, r * 0.5); ctx.lineTo(-r * 0.8, r * 1.0); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r * 0.8, -r * 1.0); ctx.closePath();
        fillHull(); glow(c, 1.4);
        ctx.beginPath(); ctx.moveTo(r * 0.6, 0); ctx.lineTo(r * 1.7, 0); glow(c, 1.8);
        const ch = e.stop && e.dist <= e.stop ? Math.max(0, 1 - e.shotT / 2) : 0;
        if (ch > 0) { ctx.beginPath(); ctx.arc(r * 1.8, 0, 1 + ch * 3, 0, 7); ctx.fillStyle = c; ctx.fill(); }
      } else if (e.type === 'bomb') {
        // Bombe: stachelige Kugel mit blinkendem Zünder
        ctx.save(); ctx.rotate(t * 0.004);
        ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * 0.75 : r * 1.25; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); fillHull(); glow(c, 1.6);
        ctx.restore();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, 7);
        ctx.fillStyle = Math.sin(t * 0.02) > 0 ? '#ff3030' : '#ffdd55'; ctx.fill();
      } else if (e.type === 'phantom') {
        // Tarnjäger: flacher Rochen
        flame(-r * 0.6, 0, r * 1.2 * fl, r * 0.2, '#b5ffe6', t, sd);
        ctx.beginPath(); ctx.moveTo(r * 1.4, 0); ctx.quadraticCurveTo(r * 0.2, -r * 1.5, -r * 0.8, -r * 1.2); ctx.lineTo(-r * 0.4, 0); ctx.lineTo(-r * 0.8, r * 1.2); ctx.quadraticCurveTo(r * 0.2, r * 1.5, r * 1.4, 0); ctx.closePath();
        fillHull(); glow(c, 1.3);
      } else if (e.type === 'bulwark') {
        // Schildträger: schwerer Sechskant mit Frontschild
        flame(-r * 0.9, 0, r * 1.2 * fl, r * 0.3, '#ffd08a', t, sd);
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r * 0.85); } ctx.closePath();
        fillHull(); glow(c, 2);
        if (e.guard > 0) { ctx.beginPath(); ctx.arc(r * 0.2, 0, r * 1.5, -1.1, 1.1); glow('#ffe2a8', 1.5 + 2 * e.guard / e.guardMax, 0.4 + 0.6 * e.guard / e.guardMax); }
      } else if (e.type === 'splitter' || e.type === 'shard') {
        // Teiler: Raute mit Bruchkante; Splitter klein
        flame(-r * 0.9, 0, r * 1.4 * fl, r * 0.25, '#ffb0b0', t, sd);
        ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.lineTo(0, -r); ctx.lineTo(-r * 0.9, 0); ctx.lineTo(0, r); ctx.closePath();
        fillHull(); glow(c, e.type === 'shard' ? 1.1 : 1.6);
        if (e.type === 'splitter') { ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.5); ctx.lineTo(0, 0); ctx.lineTo(r * 0.3, r * 0.6); glow(c, 1, 0.7); }
      } else if (e.type === 'mender') {
        // Heiler: Ring mit Kreuz
        ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); fillHull(); glow(c, 1.6);
        ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5); glow(c, 1.8);
      } else if (e.type === 'part' && e.pk === 'tentacle') {
        // Tentakelspitze: Saugnapf-Klaue (der Arm selbst wird vorab gezeichnet)
        poly([[r * 1.6, 0], [r * 0.2, -r * 0.9], [-r * 0.6, -r * 0.5], [-r * 0.6, r * 0.5], [r * 0.2, r * 0.9]]); fillHull(); glow(c, 1.6);
        ctx.beginPath(); ctx.arc(r * 0.1, 0, r * 0.32, 0, 7); ctx.fillStyle = e.tst === 2 ? '#ffffff' : c; ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
      } else if (e.type === 'part' && e.pk === 'armor') {
        // Panzerplatte: dicke Schuppe, solange sie hält, nimmt der Rumpf weniger Schaden
        poly([[r * 1.1, -r * 1.2], [r * 1.1, r * 1.2], [-r * 0.6, r * 0.8], [-r * 0.6, -r * 0.8]]); fillHull(); glow(e.flash > 0 ? '#ffffff' : c, 2);
        ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.9); ctx.lineTo(r * 0.6, r * 0.9); ctx.moveTo(r * 0.1, -r * 0.75); ctx.lineTo(r * 0.1, r * 0.75); glow('#ffd23f', 1, 0.6);
      } else if (e.type === 'part' && e.pk === 'lance') {
        // Lanzenspitze: Quelle des Lasers
        poly([[r * 2.0, 0], [-r * 0.6, -r * 0.6], [-r * 0.2, 0], [-r * 0.6, r * 0.6]]); fillHull(); glow(c, 1.8);
        ctx.beginPath(); ctx.arc(r * 0.4, 0, r * 0.3, 0, 7); ctx.fillStyle = '#ff3030'; ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.008)); ctx.fill(); ctx.globalAlpha = 1;
      } else if (e.type === 'part' && e.pk === 'rack') {
        // Minenschacht: Kasten mit blinkender Mine
        ctx.beginPath(); ctx.roundRect(-r, -r * 0.8, r * 2, r * 1.6, r * 0.25); fillHull(); glow(c, 1.6);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, 7); ctx.fillStyle = Math.sin(t * 0.008 + sd) > 0 ? '#ffdd55' : '#6a5a20'; ctx.fill();
      } else if (e.type === 'part' && e.pk === 'seal') {
        // Siegel des Heilerschreins: speist die Reparatur
        hexPath(r * 1.1, t * 0.002); fillHull(); glow(c, 1.6);
        ctx.beginPath(); ctx.moveTo(-r * 0.5, 0); ctx.lineTo(r * 0.5, 0); ctx.moveTo(0, -r * 0.5); ctx.lineTo(0, r * 0.5); glow('#5dffb0', 2, 0.8);
      } else if (e.type === 'part' && e.pk === 'prism') {
        // Prisma des Spieglers: speist den Spiegel
        poly([[r * 1.4, 0], [0, -r * 1.1], [-r * 1.4, 0], [0, r * 1.1]]); ctx.fillStyle = 'rgba(220,230,255,0.25)'; ctx.fill(); glow(e.host && e.host.mirrorUntil > (e._now || 0) ? '#ffffff' : c, 1.8);
      } else if (e.type === 'part' && e.pk === 'gate') {
        // Hangartor: dunkle Öffnung mit Lauflicht
        ctx.beginPath(); ctx.roundRect(-r * 0.9, -r * 1.2, r * 1.8, r * 2.4, r * 0.2); ctx.fillStyle = '#05050f'; ctx.fill(); glow(c, 1.6);
        for (let i = 0; i < 3; i++) { const on = Math.floor(t * 0.006 + i) % 3 === 0; ctx.beginPath(); ctx.arc(r * 0.5 - i * r * 0.5, r * 1.0, r * 0.12, 0, 7); ctx.fillStyle = on ? '#fff' : c; ctx.fill(); }
      } else if (e.type === 'part' && e.pk === 'vent') {
        // Schlot: glühender Krater
        const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.1); g2.addColorStop(0, '#fff2c0'); g2.addColorStop(0.4, '#ff6a3d'); g2.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, 7); ctx.fillStyle = g2; ctx.globalAlpha = 0.6 + 0.35 * Math.sin(t * 0.01 + sd); ctx.fill(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, 7); glow(c, 1.6);
      } else if (e.type === 'part' && (e.pk === 'gwing' || e.pk === 'head' || e.pk === 'core')) {
        // Schwachpunkt am Riesen: glühender Kern mit Ring
        const cc = e.pk === 'core' ? '#c3a6ff' : '#ffb03d';
        ctx.beginPath(); ctx.arc(0, 0, r * 1.0, 0, 7); fillHull(); glow(e.flash > 0 ? '#ffffff' : c, 1.8);
        ctx.beginPath(); ctx.arc(0, 0, r * (0.45 + 0.1 * Math.sin(t * 0.008 + sd)), 0, 7); ctx.fillStyle = cc; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
        if (e.pk === 'head') { poly([[r * 1.6, 0], [r * 0.8, -r * 0.35], [r * 0.8, r * 0.35]]); ctx.fillStyle = '#ffb03d'; ctx.fill(); }
      } else if (e.type === 'part' && e.pk === 'eye') {
        // Auge des Leviathan: gelbe Schlitzpupille, schaut zur Kanone
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 1.9, 0, 0, 7); ctx.fillStyle = '#05050f'; ctx.fill(); glow(c, 1.6);
        ctx.beginPath(); ctx.ellipse(r * 0.25, 0, r * 0.75, r * 0.32, 0, 0, 7); ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#ffd23f'; ctx.fill();
      } else if (e.type === 'part' && e.pk === 'arm') {
        // Armspitze: kleine Klaue (der Arm selbst ist oben gezeichnet)
        ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, 7); fillHull(); glow(e.act === 'grab' && e.stage === 'hold' ? '#ff4040' : c, 1.4);
      } else if (e.type === 'part' && e.pk === 'wing') {
        // Phönixschwinge: Federfächer aus Glut, schlägt
        const fl2 = Math.sin(t * 0.008 + e.side) * 0.25;
        for (let i = 0; i < 4; i++) { const a = (-0.9 + i * 0.45 + fl2) * 1; ctx.beginPath(); ctx.moveTo(-r * 0.4, 0); ctx.quadraticCurveTo(-r * 1.2 * Math.cos(a), r * 1.6 * Math.sin(a), -r * 2.2 * Math.cos(a), r * 2.4 * Math.sin(a)); glow(i % 2 ? '#ffb03d' : c, 1.6, 0.85); }
        ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); fillHull(); glow(c, 1.6);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, 7); ctx.fillStyle = '#ffb03d'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.01); ctx.fill(); ctx.globalAlpha = 1;
      } else if (e.type === 'part' && e.pk === 'segment') {
        // Wurmsegment: Panzerplatte mit glühender Fuge
        hexPath(r * 1.05, t * 0.001 + e.si); fillHull(); glow(c, 1.6);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, 7); ctx.fillStyle = '#ff6a3d'; ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 0.008 + e.si * 1.3); ctx.fill(); ctx.globalAlpha = 1;
      } else if (e.type === 'part') {
        // Geschützturm auf dem Rumpf des Bosses
        ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, 7); fillHull(); glow(c, 1.6);
        ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 0.32); ctx.lineTo(r * 1.9, -r * 0.32); ctx.moveTo(r * 0.3, r * 0.32); ctx.lineTo(r * 1.9, r * 0.32); glow(c, 1.5);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.38, 0, 7); ctx.fillStyle = c; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.01 + sd); ctx.fill(); ctx.globalAlpha = 1;
      } else if (e.kind && drawBoss(e, c, r, t, sd, fl)) {
        // eigener Boss gezeichnet
      } else {
        // Boss
        for (const o of [-0.55, 0, 0.55]) flame(-r * 0.9, r * o, r * 1.2 * fl, r * 0.14, '#ff9af7', t, sd + o * 3);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * 0.95, 0, 0, 7); fillHull(); glow(c, 2.4);
        ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.95); ctx.lineTo(-r * 0.7, -r * 1.45); ctx.lineTo(-r * 1.0, -r * 1.35); ctx.lineTo(-r * 0.75, -r * 0.8);
        ctx.moveTo(-r * 0.2, r * 0.95); ctx.lineTo(-r * 0.7, r * 1.45); ctx.lineTo(-r * 1.0, r * 1.35); ctx.lineTo(-r * 0.75, r * 0.8); glow(c, 1.6);
        ctx.save(); ctx.rotate(t * 0.0012);
        ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 7); ctx.setLineDash([r * 0.3, r * 0.2]); glow(c, 1.6, 0.8); ctx.setLineDash([]);
        ctx.restore();
        const pulse = e.enraged ? '#ff3030' : c;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, 7); ctx.fillStyle = pulse; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * (e.enraged ? 0.025 : 0.008)); ctx.fill(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(r * 1.1, -r * 0.4); ctx.lineTo(r * 1.55, -r * 0.4); ctx.moveTo(r * 1.1, r * 0.4); ctx.lineTo(r * 1.55, r * 0.4); glow(c, 1.8);
      }
    }

    // ---------- Riesen-Herrscher: Körper am oberen Rand (die Bauteile zeichnet die Schiffsschleife) ----------
    function drawGiantBody(g, bx, by, col, t) {
      const k = g.kind, ph = g.phase || 0, fl = g.flash > 0 ? '#ffffff' : col;
      const crack = (pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](bx + x, by + y)); glow('#ff6a3d', 1.4, 0.7); };
      if (k === 'leviathan') {
          ctx.beginPath(); ctx.moveTo(bx - 235, by + 60);
          ctx.bezierCurveTo(bx - 290, by - 520, bx + 290, by - 520, bx + 235, by + 60);
          ctx.bezierCurveTo(bx + 150, by + 130, bx - 150, by + 130, bx - 235, by + 60); ctx.closePath();
          ctx.fillStyle = HULL; ctx.fill(); glow(g.flash > 0 ? '#ffffff' : col, 3);
          for (let i = 0; i < 11; i++) { ctx.beginPath(); ctx.arc(bx - 190 + i * 38, by - 40 + Math.sin(i * 1.7) * 30, 6 + Math.abs(Math.sin(i * 2.3)) * 7, 0, 7); glow(col, 1.2, 0.45); }
          ctx.beginPath(); ctx.moveTo(bx - 16, by + 82); ctx.lineTo(bx, by + 112 + Math.abs(Math.sin(t * 0.004)) * 6); ctx.lineTo(bx + 16, by + 82); ctx.closePath(); ctx.fillStyle = '#ff9a3c'; ctx.fill();
          // Augenhöhlen (die Augen selbst sind Bauteile und werden darüber gezeichnet; zerstörte bleiben dunkel)
          for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(bx + sg * 95, by + 62, 34, 22, 0, 0, 7); ctx.fillStyle = '#05050f'; ctx.fill(); glow(col, 1.6, 0.7); }
          if (g.phase >= 1) { ctx.beginPath(); ctx.moveTo(bx - 60, by - 10); ctx.lineTo(bx - 30, by + 20); ctx.lineTo(bx - 45, by + 45); glow('#ff6a3d', 1.4, 0.7); }
          if (g.phase >= 2) { ctx.beginPath(); ctx.moveTo(bx + 70, by - 20); ctx.lineTo(bx + 40, by + 15); ctx.lineTo(bx + 60, by + 40); glow('#ff6a3d', 1.4, 0.7); }
        return;
      }
      if (k === 'bastion') {
        // Großträger: Panzerrumpf über die ganze Breite, Hangartore und Turmsockel an der Front
        ctx.beginPath(); ctx.moveTo(bx - 245, by - 520); ctx.lineTo(bx - 245, by + 40); ctx.lineTo(bx - 170, by + 112); ctx.lineTo(bx + 170, by + 112); ctx.lineTo(bx + 245, by + 40); ctx.lineTo(bx + 245, by - 520); ctx.closePath();
        ctx.fillStyle = HULL; ctx.fill(); glow(fl, 3);
        ctx.beginPath(); for (const x of [-160, -80, 0, 80, 160]) { ctx.moveTo(bx + x, by - 520); ctx.lineTo(bx + x, by + 100); } for (const y of [-200, -90, 20]) { ctx.moveTo(bx - 240, by + y); ctx.lineTo(bx + 240, by + y); } glow(col, 1, 0.22);
        // Brücke mit Hauptgeschütz (Laser ab Phase 3)
        ctx.beginPath(); ctx.roundRect(bx - 34, by - 30, 68, 70, 8); ctx.fillStyle = '#0a0918'; ctx.fill(); glow(col, 1.6);
        ctx.beginPath(); ctx.moveTo(bx, by + 40); ctx.lineTo(bx, by + 105); glow(g.laser > 0 ? '#ff3030' : col, 3);
        ctx.beginPath(); ctx.arc(bx, by + 5, 12, 0, 7); ctx.fillStyle = g.enraged ? '#ff3030' : col; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 0.008); ctx.fill(); ctx.globalAlpha = 1;
        // Positionslichter an der Front
        for (let i = 0; i < 9; i++) { const on = Math.floor(t * 0.004 + i) % 3 === 0; ctx.beginPath(); ctx.arc(bx - 160 + i * 40, by + 108, 2.5, 0, 7); ctx.fillStyle = on ? '#fff' : col; ctx.globalAlpha = on ? 1 : 0.4; ctx.fill(); ctx.globalAlpha = 1; }
        if (ph >= 1) crack([[-200, -60], [-150, -20], [-170, 30], [-120, 70]]);
        if (ph >= 2) crack([[190, -80], [140, -30], [165, 20], [120, 60]]);
        return;
      }
      if (k === 'titan') {
        // Vulkan-Titan: zerklüftete Felsmasse, Lavaadern zwischen den Schloten
        ctx.beginPath(); ctx.moveTo(bx - 250, by - 520);
        const pts = [[-250, 30], [-210, 70], [-160, 60], [-130, 110], [-80, 95], [-40, 120], [0, 105], [40, 122], [85, 98], [130, 112], [165, 64], [210, 78], [250, 30]];
        for (const [x, y] of pts) ctx.lineTo(bx + x, by + y + Math.sin(x) * 4);
        ctx.lineTo(bx + 250, by - 520); ctx.closePath(); ctx.fillStyle = '#120b10'; ctx.fill(); glow(fl, 3);
        for (let i = 0; i < 14; i++) { const x = -220 + (i * 97) % 440, y = -40 - (i * 53) % 260; ctx.beginPath(); for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI * 2; ctx[j ? 'lineTo' : 'moveTo'](bx + x + Math.cos(a) * (10 + i % 4 * 5), by + y + Math.sin(a) * (8 + i % 3 * 4)); } ctx.closePath(); glow(col, 1, 0.25); }
        // Lavaadern zu den Schloten (glühen stärker, je mehr Phase)
        ctx.beginPath(); ctx.moveTo(bx - 120, by + 95); ctx.quadraticCurveTo(bx - 80, by + 20, bx - 40, by + 95); ctx.moveTo(bx + 40, by + 95); ctx.quadraticCurveTo(bx + 80, by + 20, bx + 120, by + 95);
        ctx.moveTo(bx - 40, by + 95); ctx.quadraticCurveTo(bx, by + 40, bx + 40, by + 95); glow('#ff6a3d', 2 + ph, 0.55 + 0.3 * Math.sin(t * 0.005));
        const gl = ctx.createRadialGradient(bx, by + 10, 0, bx, by + 10, 70); gl.addColorStop(0, 'rgba(255,200,120,0.7)'); gl.addColorStop(1, 'rgba(255,80,30,0)');
        ctx.beginPath(); ctx.arc(bx, by + 10, 70, 0, 7); ctx.fillStyle = gl; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.004); ctx.fill(); ctx.globalAlpha = 1;
        if (ph >= 1) crack([[-60, -120], [-20, -60], [-50, -10]]);
        if (ph >= 2) crack([[70, -140], [30, -70], [60, -20]]);
        return;
      }
      if (k === 'phoenix') {
        // Phönix: riesige Schwingen über die ganze Breite, schlagen langsam; Schweif nach oben
        const flap = Math.sin(t * 0.0025) * 0.12 * (g.reborn ? 1.4 : 1), wc = g.reborn ? '#fff2c0' : col;
        for (const sd of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(bx + sd * 20, by + 20);
          ctx.quadraticCurveTo(bx + sd * 140, by - 160 - flap * 300, bx + sd * 260, by - 120 - flap * 200);
          ctx.lineTo(bx + sd * 250, by - 60); ctx.lineTo(bx + sd * 230, by - 10); ctx.lineTo(bx + sd * 205, by + 30); ctx.lineTo(bx + sd * 175, by + 60); ctx.lineTo(bx + sd * 140, by + 82); ctx.lineTo(bx + sd * 95, by + 92); ctx.lineTo(bx + sd * 50, by + 80); ctx.closePath();
          ctx.fillStyle = 'rgba(40,10,10,0.92)'; ctx.fill(); glow(fl === '#ffffff' ? fl : wc, 2.4);
          for (let i = 0; i < 7; i++) { const x0 = bx + sd * (40 + i * 30), y0 = by + 70 - i * 18 - flap * i * 30; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + sd * 26, y0 + 34); glow('#ffb03d', 1.2, 0.6); }
        }
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 6, by - 30); ctx.quadraticCurveTo(bx + i * 30, by - 200, bx + i * 50 + Math.sin(t * 0.004 + i) * 10, by - 330); glow(i % 2 ? '#ffb03d' : col, 1.6, 0.7); }
        ctx.beginPath(); ctx.ellipse(bx, by + 30, 40, 75, 0, 0, 7); ctx.fillStyle = '#1a0808'; ctx.fill(); glow(fl, 2.4);
        const cg = ctx.createRadialGradient(bx, by + 30, 0, bx, by + 30, 40); cg.addColorStop(0, 'rgba(255,240,190,0.9)'); cg.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.beginPath(); ctx.arc(bx, by + 30, 40, 0, 7); ctx.fillStyle = cg; ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.006); ctx.fill(); ctx.globalAlpha = 1;
        return;
      }
      if (k === 'devourer') {
        // Der Verschlinger: Schlund mit Zahnkranz; ab Phase 2 öffnet er sich und gibt den Kern frei
        const open = ph >= 1 ? 1 : 0.35 + 0.1 * Math.sin(t * 0.002);
        ctx.beginPath(); ctx.ellipse(bx, by - 60, 245, 200, 0, 0, 7); ctx.fillStyle = '#07060f'; ctx.fill(); glow(fl, 3);
        ctx.save(); ctx.translate(bx, by - 60); ctx.rotate(t * 0.0006);
        for (let r2 = 0; r2 < 3; r2++) { ctx.beginPath(); ctx.arc(0, 0, 200 - r2 * 45, r2, r2 + 4.5); glow(col, 1.2, 0.35); }
        ctx.restore();
        // Zahnkranz unten, öffnet sich
        ctx.beginPath();
        for (let i = 0; i < 15; i++) { const a = Math.PI * (0.12 + i * 0.054), x = bx + Math.cos(a) * 190, y = by - 60 + Math.sin(a) * 150; const tx = bx + Math.cos(a) * (190 - 40 * open), ty = by - 60 + Math.sin(a) * (150 - 45 * open); ctx.moveTo(x - 9, y); ctx.lineTo(tx, ty); ctx.lineTo(x + 9, y); }
        ctx.fillStyle = '#e8e6ff'; ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.ellipse(bx, by + 70, 120 * open + 30, 40 * open + 12, 0, 0, 7); ctx.fillStyle = '#000'; ctx.fill(); glow(col, 1.5, 0.6);
        return;
      }
    }

    // ---------- Bosse (lokale Achse +x = zur Kanone) ----------
    function poly(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.closePath(); }
    function drawBoss(e, c, r, t, sd, fl) {
      const k = e.kind, pulse = e.enraged ? '#ff3030' : c, beat = 0.6 + 0.4 * Math.sin(t * (e.enraged ? 0.025 : 0.008));
      const core = (x, y, rr) => { ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fillStyle = pulse; ctx.globalAlpha = beat; ctx.fill(); ctx.globalAlpha = 1; };
      if (k === 'gunboat') {
        // Kanonenboot: langer Keil, zwei Seitengeschütze, Brücke
        for (const o of [-0.4, 0.4]) flame(-r * 1.05, r * o, r * 1.3 * fl, r * 0.16, '#ff9af7', t, sd + o);
        poly([[r * 1.55, 0], [r * 0.55, -r * 0.48], [-r * 0.9, -r * 0.62], [-r * 1.15, -r * 0.25], [-r * 1.15, r * 0.25], [-r * 0.9, r * 0.62], [r * 0.55, r * 0.48]]); fillHull(); glow(c, 2.2);
        for (const sg of [-1, 1]) {
          ctx.beginPath(); ctx.roundRect(-r * 0.35, sg * r * 0.62 - r * 0.2, r * 0.75, r * 0.4, r * 0.1); fillHull(); glow(c, 1.4);
          ctx.beginPath(); ctx.moveTo(r * 0.4, sg * r * 0.55); ctx.lineTo(r * 1.15, sg * r * 0.55); ctx.moveTo(r * 0.4, sg * r * 0.7); ctx.lineTo(r * 1.15, sg * r * 0.7); glow(c, 1.3);
        }
        ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.9, 0); glow(c, 1, 0.5);
        core(-r * 0.2, 0, r * 0.22);
        return true;
      }
      if (k === 'layer') {
        // Minenleger: breiter, flacher Rumpf, Minenschächte am Heck
        for (const o of [-0.6, 0.6]) flame(-r * 1.0, r * o, r * 1.1 * fl, r * 0.15, '#ff9af7', t, sd + o);
        ctx.beginPath(); ctx.roundRect(-r * 1.0, -r * 1.0, r * 1.9, r * 2.0, r * 0.45); fillHull(); glow(c, 2.2);
        poly([[r * 0.9, -r * 0.55], [r * 1.35, -r * 0.25], [r * 1.35, r * 0.25], [r * 0.9, r * 0.55]]); fillHull(); glow(c, 1.4);
        for (let i = 0; i < 3; i++) {
          const y = (i - 1) * r * 0.62, on = Math.sin(t * 0.006 + i * 2) > 0;
          ctx.beginPath(); ctx.roundRect(-r * 0.85, y - r * 0.2, r * 0.7, r * 0.4, r * 0.08); ctx.fillStyle = '#0a0a18'; ctx.fill(); glow(c, 1);
          ctx.beginPath(); ctx.arc(-r * 0.5, y, r * 0.13, 0, 7); ctx.fillStyle = on ? '#ffdd55' : '#6a5a20'; ctx.fill();
        }
        core(r * 0.45, 0, r * 0.2);
        return true;
      }
      if (k === 'frigate') {
        // Schildfregatte: Sechseck mit zwei Schildemittern und kreisendem Feldring
        flame(-r * 1.0, 0, r * 1.5 * fl, r * 0.22, '#ff9af7', t, sd);
        hexPath(r * 1.05, 0); fillHull(); glow(c, 2.2);
        for (const sg of [-1, 1]) { poly([[r * 0.2, sg * r * 0.9], [r * 0.75, sg * r * 1.45], [r * 1.0, sg * r * 1.3], [r * 0.6, sg * r * 0.75]]); fillHull(); glow(c, 1.4); ctx.beginPath(); ctx.arc(r * 0.88, sg * r * 1.38, r * 0.12, 0, 7); ctx.fillStyle = PAL.frost; ctx.fill(); }
        ctx.save(); ctx.rotate(-t * 0.0015); ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, 7); ctx.setLineDash([r * 0.18, r * 0.14]); glow(PAL.frost, 1.2, 0.6); ctx.setLineDash([]); ctx.restore();
        core(0, 0, r * 0.3);
        return true;
      }
      if (k === 'lancer') {
        // Lanzenträger: schlanker Rumpf mit langer Lanze; die Spitze glüht, wenn der Laser lädt
        for (const o of [-0.3, 0.3]) flame(-r * 1.1, r * o, r * 1.4 * fl, r * 0.14, '#ff9af7', t, sd + o);
        poly([[r * 0.8, -r * 0.3], [-r * 0.2, -r * 0.55], [-r * 0.6, -r * 1.25], [-r * 0.95, -r * 1.2], [-r * 1.15, -r * 0.3], [-r * 1.15, r * 0.3], [-r * 0.95, r * 1.2], [-r * 0.6, r * 1.25], [-r * 0.2, r * 0.55], [r * 0.8, r * 0.3]]); fillHull(); glow(c, 2.2);
        poly([[r * 2.3, 0], [r * 0.7, -r * 0.16], [r * 0.7, r * 0.16]]); fillHull(); glow(c, 1.6);
        const ch = e.laser > 0 ? 1 - e.laser / 2 : 0;
        ctx.beginPath(); ctx.arc(r * 2.3, 0, r * (0.12 + 0.3 * ch), 0, 7); ctx.fillStyle = ch ? '#ff3030' : c; ctx.globalAlpha = ch ? 0.6 + 0.4 * Math.sin(t * 0.05) : 0.7; ctx.fill(); ctx.globalAlpha = 1;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(r * (1.0 + i * 0.4), 0, r * 0.22, -1.1, 1.1); glow(c, 1, 0.5); }
        core(-r * 0.4, 0, r * 0.24);
        return true;
      }
      if (k === 'bastion') {
        // Großträger: breiter Panzerrumpf, Hangar am Bug, vier Turmsockel (die Türme sind eigene Bauteile)
        for (const o of [-0.62, -0.22, 0.22, 0.62]) flame(-r * 1.05, r * o, r * 1.0 * fl, r * 0.12, '#ff9af7', t, sd + o * 4);
        poly([[r * 1.15, -r * 0.5], [r * 0.75, -r * 0.92], [-r * 0.85, -r * 0.92], [-r * 1.08, -r * 0.6], [-r * 1.08, r * 0.6], [-r * 0.85, r * 0.92], [r * 0.75, r * 0.92], [r * 1.15, r * 0.5]]); fillHull(); glow(c, 2.6);
        ctx.beginPath(); for (const x of [-0.45, 0.05]) { ctx.moveTo(r * x, -r * 0.92); ctx.lineTo(r * x, r * 0.92); } glow(c, 1, 0.35);
        // Hangar mit Lauflichtern
        ctx.beginPath(); ctx.roundRect(r * 0.55, -r * 0.3, r * 0.6, r * 0.6, r * 0.06); ctx.fillStyle = '#05050f'; ctx.fill(); glow(c, 1.3);
        for (let i = 0; i < 4; i++) { const on = Math.floor(t * 0.006 + i) % 4 === 0; ctx.beginPath(); ctx.arc(r * (0.62 + i * 0.15), r * 0.38, r * 0.04, 0, 7); ctx.fillStyle = on ? '#ffffff' : c; ctx.globalAlpha = on ? 1 : 0.4; ctx.fill(); ctx.globalAlpha = 1; }
        // Turmsockel an den Stellen der Bauteile (Weltmaß / Zeichenmaßstab 1,5)
        for (const [fx, ly] of [[20, -31], [20, 31], [-18, -33], [-18, 33]]) { ctx.beginPath(); ctx.arc(fx / 1.5, ly / 1.5, r * 0.3, 0, 7); ctx.fillStyle = '#0d0c22'; ctx.fill(); glow(c, 1, 0.5); }
        // Brücke und Kern, ab Phase 2 offenliegend
        ctx.beginPath(); ctx.roundRect(-r * 0.55, -r * 0.28, r * 0.6, r * 0.56, r * 0.12); fillHull(); glow(c, 1.4);
        core(-r * 0.25, 0, r * (0.14 + 0.05 * (e.phase || 0)));
        if (e.phase >= 1) { ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.92); ctx.lineTo(-r * 0.05, -r * 0.6); ctx.lineTo(-r * 0.25, -r * 0.4); glow('#ff6a3d', 1.2, 0.8); }
        if (e.phase >= 2) { ctx.beginPath(); ctx.moveTo(r * 0.4, r * 0.92); ctx.lineTo(r * 0.25, r * 0.55); ctx.lineTo(r * 0.45, r * 0.4); glow('#ff6a3d', 1.2, 0.8); }
        return true;
      }
      const wob = (k2, a) => Math.sin(t * k2 + sd) * a;
      if (k === 'ray') {
        // Nebelrochen: breite, schlagende Flügel und langer Schwanz
        const f = wob(0.004, 0.18);
        ctx.beginPath(); ctx.moveTo(r * 1.0, 0);
        ctx.quadraticCurveTo(r * 0.3, -r * (1.1 + f), -r * 0.3, -r * (1.7 + f)); ctx.quadraticCurveTo(-r * 0.4, -r * 0.6, -r * 0.8, 0);
        ctx.quadraticCurveTo(-r * 0.4, r * 0.6, -r * 0.3, r * (1.7 + f)); ctx.quadraticCurveTo(r * 0.3, r * (1.1 + f), r * 1.0, 0); ctx.closePath(); fillHull(); glow(c, 2.2);
        ctx.beginPath(); ctx.moveTo(-r * 0.8, 0); ctx.quadraticCurveTo(-r * 1.6, wob(0.006, r * 0.4), -r * 2.4, wob(0.005, r * 0.5)); glow(c, 1.4);
        for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.55, sg * r * 0.28, r * 0.1, 0, 7); ctx.fillStyle = c; ctx.fill(); }
        core(r * 0.05, 0, r * 0.2);
        return true;
      }
      if (k === 'jelly') {
        // Sporenqualle: Glocke mit treibenden Fäden, Sporen pulsieren im Inneren
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.3, i * r * 0.2); ctx.quadraticCurveTo(-r * 1.1, i * r * 0.24 + wob(0.005 + i * 0.0007, r * 0.25), -r * 1.8, i * r * 0.28 + wob(0.004, r * 0.35)); glow(c, 1, 0.55); }
        ctx.beginPath(); ctx.ellipse(r * 0.15, 0, r * 0.85, r * (1.05 + wob(0.004, 0.06)), 0, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-r * 0.3, r * 0.9); ctx.quadraticCurveTo(-r * 0.45, 0, -r * 0.3, -r * 0.9); ctx.closePath(); fillHull(); glow(c, 2.2);
        for (let i = 0; i < 5; i++) { const a = i * 1.3 + t * 0.001; ctx.beginPath(); ctx.arc(r * 0.2 + Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.5, r * 0.1, 0, 7); ctx.fillStyle = '#c9ff4f'; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 0.008 + i); ctx.fill(); ctx.globalAlpha = 1; }
        core(r * 0.2, 0, r * 0.18);
        return true;
      }
      if (k === 'squid' || k === 'leviathan') {
        // Tentakler / Leviathan: Mantel mit Augen; Leviathan größer, mit Rückenkamm
        const L = k === 'leviathan';
        ctx.beginPath(); ctx.moveTo(r * 0.85, 0); ctx.bezierCurveTo(r * 0.8, -r * 1.05, -r * 1.2, -r * 0.9, -r * 1.5, 0); ctx.bezierCurveTo(-r * 1.2, r * 0.9, r * 0.8, r * 1.05, r * 0.85, 0); ctx.closePath(); fillHull(); glow(c, L ? 2.8 : 2.2);
        if (L) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const x = -r * 1.2 + i * r * 0.32; ctx.moveTo(x, -r * 0.1); ctx.lineTo(x - r * 0.12, -r * 0.45); } glow(c, 1.2, 0.7); }
        for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.35, sg * r * 0.42, r * 0.17, 0, 7); ctx.fillStyle = '#05050f'; ctx.fill(); glow(c, 1.2); ctx.beginPath(); ctx.arc(r * 0.4, sg * r * 0.42, r * 0.07, 0, 7); ctx.fillStyle = e.enraged ? '#ff3030' : '#ffffff'; ctx.fill(); }
        core(-r * 0.45, 0, r * 0.2);
        return true;
      }
      if (k === 'queen') {
        // Schwarmkönigin: Insektenleib mit Brutsäcken und Mandibeln
        for (const sg of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-r * 0.2, sg * r * 0.95, r * 0.55, r * 0.22, sg * (0.5 + wob(0.012, 0.15)), 0, 7); ctx.fillStyle = 'rgba(79,255,200,0.12)'; ctx.fill(); glow(c, 1, 0.6); }
        ctx.beginPath(); ctx.ellipse(-r * 0.75, 0, r * 0.7, r * 0.5, 0, 0, 7); fillHull(); glow(c, 1.8);
        ctx.beginPath(); ctx.ellipse(r * 0.2, 0, r * 0.45, r * 0.42, 0, 0, 7); fillHull(); glow(c, 2.2);
        ctx.beginPath(); ctx.ellipse(r * 0.85, 0, r * 0.3, r * 0.3, 0, 0, 7); fillHull(); glow(c, 1.8);
        for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 1.05, sg * r * 0.15); ctx.quadraticCurveTo(r * 1.45, sg * r * 0.35, r * 1.4, sg * r * (0.05 + Math.abs(wob(0.01, 0.1)))); glow(c, 1.4); }
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-r * (0.45 + i * 0.2), (i % 2 ? 1 : -1) * r * 0.18, r * 0.08, 0, 7); ctx.fillStyle = '#c9ff4f'; ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 0.006 + i)); ctx.fill(); ctx.globalAlpha = 1; }
        core(r * 0.2, 0, r * 0.16);
        return true;
      }
      if (k === 'emberorb') {
        // Glutorb: glühende Kugel mit Ringen
        const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r); g.addColorStop(0, '#fff2c0'); g.addColorStop(0.35, '#ff9a3c'); g.addColorStop(1, 'rgba(255,90,40,0.15)');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, 7); ctx.fillStyle = g; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1; glow(c, 2.2);
        for (let i = 0; i < 2; i++) { ctx.save(); ctx.rotate(t * (i ? -0.0013 : 0.0017)); ctx.beginPath(); ctx.ellipse(0, 0, r * (1.25 + i * 0.25), r * (0.4 + i * 0.12), 0, 0, 7); glow(c, 1.3, 0.75); ctx.restore(); }
        core(0, 0, r * 0.22);
        return true;
      }
      if (k === 'worm') {
        // Magmawurm-Kopf: gepanzerte Schnauze mit Kiefern (die Glieder sind eigene Bauteile)
        const jaw = 0.25 + Math.abs(wob(0.006, 0.25));
        for (const sg of [-1, 1]) { poly([[r * 0.4, sg * r * 0.3], [r * 1.6, sg * r * jaw], [r * 0.9, sg * r * 0.8]]); fillHull(); glow(c, 1.6); }
        hexPath(r * 1.0, 0); fillHull(); glow(c, 2.2);
        ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.5); ctx.lineTo(r * 0.2, -r * 0.2); ctx.lineTo(-r * 0.2, r * 0.3); ctx.lineTo(r * 0.5, r * 0.6); glow('#ff6a3d', 1.2, 0.8);
        if (e.segs > 0) { ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, 7); ctx.setLineDash([3, 4]); glow('#ffd23f', 1, 0.45); ctx.setLineDash([]); }
        core(-r * 0.1, 0, r * 0.2);
        return true;
      }
      if (k === 'bulwarkcr') {
        // Bollwerkkreuzer: Ramme mit breitem Frontschild
        for (const o of [-0.5, 0.5]) flame(-r * 1.0, r * o, r * 1.2 * fl, r * 0.16, '#ffc07a', t, sd + o);
        poly([[r * 0.9, -r * 0.6], [-r * 0.8, -r * 0.75], [-r * 1.05, 0], [-r * 0.8, r * 0.75], [r * 0.9, r * 0.6]]); fillHull(); glow(c, 2.2);
        ctx.beginPath(); ctx.arc(r * 0.4, 0, r * 1.05, -0.9, 0.9); glow('#ffd23f', 3, 0.85);
        ctx.beginPath(); for (const y of [-0.35, 0, 0.35]) { ctx.moveTo(-r * 0.6, y * r); ctx.lineTo(r * 0.5, y * r); } glow(c, 1, 0.4);
        core(-r * 0.35, 0, r * 0.2);
        return true;
      }
      if (k === 'forge') {
        // Schmiedeschiff: Amboss-Rumpf, glühende Esse und Strahlrohr
        for (const o of [-0.45, 0.45]) flame(-r * 1.05, r * o, r * 1.3 * fl, r * 0.16, '#ffc07a', t, sd + o);
        poly([[r * 0.7, -r * 0.95], [r * 0.25, -r * 0.45], [-r * 1.0, -r * 0.6], [-r * 1.0, r * 0.6], [r * 0.25, r * 0.45], [r * 0.7, r * 0.95], [r * 0.95, r * 0.5], [r * 0.95, -r * 0.5]]); fillHull(); glow(c, 2.2);
        poly([[r * 1.9, -r * 0.12], [r * 0.95, -r * 0.22], [r * 0.95, r * 0.22], [r * 1.9, r * 0.12]]); fillHull(); glow(c, 1.4);
        const ch = e.laser > 0 ? 1 - e.laser / 2 : 0;
        ctx.beginPath(); ctx.arc(r * 1.9, 0, r * (0.1 + 0.3 * ch), 0, 7); ctx.fillStyle = ch ? '#ff3030' : '#ff9a3c'; ctx.fill();
        const g = ctx.createRadialGradient(-r * 0.3, 0, 0, -r * 0.3, 0, r * 0.45); g.addColorStop(0, '#fff2c0'); g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.beginPath(); ctx.arc(-r * 0.3, 0, r * 0.45, 0, 7); ctx.fillStyle = g; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 0.01); ctx.fill(); ctx.globalAlpha = 1;
        return true;
      }
      const orbGlow = (rr, c0, c1) => { const g = ctx.createRadialGradient(0, 0, rr * 0.1, 0, 0, rr); g.addColorStop(0, '#fff2c0'); g.addColorStop(0.35, c0); g.addColorStop(1, c1); ctx.beginPath(); ctx.arc(0, 0, rr, 0, 7); ctx.fillStyle = g; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1; };
      if (k === 'sunwing') {
        // Sonnenflieger: riesige, gefiederte Spannweite
        for (const sg of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(r * 0.5, sg * r * 0.25); ctx.lineTo(-r * 0.2, sg * r * 2.6); ctx.lineTo(-r * 0.75, sg * r * 2.4); ctx.lineTo(-r * 0.5, sg * r * 0.4); ctx.closePath(); fillHull(); glow(c, 1.8);
          ctx.beginPath(); for (let i = 1; i < 5; i++) { ctx.moveTo(r * (0.3 - i * 0.1), sg * r * (0.25 + i * 0.47)); ctx.lineTo(-r * (0.45 + i * 0.05), sg * r * (0.4 + i * 0.45)); } glow('#ffb03d', 1, 0.6);
        }
        poly([[r * 1.5, 0], [r * 0.4, -r * 0.35], [-r * 1.0, -r * 0.2], [-r * 1.0, r * 0.2], [r * 0.4, r * 0.35]]); fillHull(); glow(c, 2.2);
        flame(-r * 1.0, 0, r * 1.6 * fl, r * 0.2, '#ffb03d', t, sd);
        core(r * 0.2, 0, r * 0.2);
        return true;
      }
      if (k === 'splitcore' || k === 'shard') {
        // Splitterkern: Kristallkern mit Bruchlinien; Kernsplitter klein und kantig
        const n = k === 'shard' ? 5 : 8;
        ctx.save(); ctx.rotate(t * (k === 'shard' ? 0.003 : 0.0008));
        ctx.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (i % 2 ? 0.75 : 1.15); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); fillHull(); glow(c, 2.2);
        if (k === 'splitcore') { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i * 2.09; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0); } glow('#ffb03d', 1.2, 0.8); }
        ctx.restore();
        core(0, 0, r * 0.28);
        return true;
      }
      if (k === 'flameorb') {
        // Flammenorb: lodernder Feuerball mit Zungen
        ctx.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, rr = r * (1.05 + 0.3 * Math.abs(Math.sin(t * 0.007 + i * 1.7))); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
        ctx.fillStyle = 'rgba(255,90,40,0.25)'; ctx.fill(); glow('#ff8a3d', 1.6, 0.8);
        orbGlow(r * 0.85, '#ff6a3d', 'rgba(255,40,40,0.2)'); ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, 7); glow(c, 2);
        return true;
      }
      if (k === 'corona') {
        // Koronakreuzer: Sonnenscheibe mit Strahlenkranz und Bugstachel
        ctx.save(); ctx.rotate(t * 0.0009); ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); ctx.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45); } glow('#ffb03d', 1.4, 0.7); ctx.restore();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, 7); fillHull(); glow(c, 2.4);
        poly([[r * 1.9, 0], [r * 0.8, -r * 0.2], [r * 0.8, r * 0.2]]); fillHull(); glow(c, 1.4);
        const ch = e.laser > 0 ? 1 - e.laser / 2 : 0; ctx.beginPath(); ctx.arc(r * 1.9, 0, r * (0.08 + 0.3 * ch), 0, 7); ctx.fillStyle = ch ? '#ff3030' : c; ctx.fill();
        core(0, 0, r * 0.35);
        return true;
      }
      if (k === 'phoenix') {
        // Phönix: Vogelleib mit Kopfkamm und Schweiffedern (die Schwingen sind eigene Bauteile)
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.6, i * r * 0.12); ctx.quadraticCurveTo(-r * 1.4, i * r * 0.4 + wob(0.006 + i * 0.001, r * 0.15), -r * 2.1, i * r * 0.6); glow(i % 2 ? '#ffb03d' : c, 1.4, 0.8); }
        ctx.beginPath(); ctx.ellipse(-r * 0.05, 0, r * 0.75, r * 0.45, 0, 0, 7); fillHull(); glow(c, 2.2);
        ctx.beginPath(); ctx.arc(r * 0.75, 0, r * 0.32, 0, 7); fillHull(); glow(c, 1.8);
        poly([[r * 1.35, 0], [r * 1.0, -r * 0.1], [r * 1.0, r * 0.1]]); ctx.fillStyle = '#ffb03d'; ctx.fill();
        ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(r * (0.6 - i * 0.12), -r * 0.2); ctx.lineTo(r * (0.35 - i * 0.2), -r * (0.6 + i * 0.05)); } glow('#ffb03d', 1.2);
        if (e.reborn) { ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, 7); glow('#ffffff', 1, 0.3 + 0.2 * Math.sin(t * 0.01)); }
        core(-r * 0.05, 0, r * 0.2);
        return true;
      }
      if (k === 'eye') {
        // Leerauge: schwebendes Auge mit Lidern, die Pupille folgt der Kanone
        ctx.beginPath(); ctx.moveTo(-r * 1.2, 0); ctx.quadraticCurveTo(0, -r * 1.35, r * 1.2, 0); ctx.quadraticCurveTo(0, r * 1.35, -r * 1.2, 0); ctx.closePath(); fillHull(); glow(c, 2.4);
        ctx.beginPath(); ctx.arc(r * 0.15, 0, r * 0.55, 0, 7); ctx.fillStyle = '#1a2050'; ctx.fill(); glow(c, 1.4);
        const ch = e.laser > 0 ? 1 - e.laser / 2 : 0;
        ctx.beginPath(); ctx.ellipse(r * 0.4, 0, r * 0.12, r * (0.38 - 0.2 * ch), 0, 0, 7); ctx.fillStyle = ch ? '#ff3030' : '#05050f'; ctx.fill();
        for (let i = 0; i < 6; i++) { const a = Math.PI * 0.6 + i * 0.16; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.0, Math.sin(a) * r * 0.9); ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.3 + wob(0.005 + i * 0.001, 3)); glow(c, 1, 0.6); }
        return true;
      }
      if (k === 'shrine') {
        // Heilerschrein: schwebender Tempel mit Heilkreuz und kreisenden Siegeln
        hexPath(r * 1.0, Math.PI / 6); fillHull(); glow(c, 2.2);
        ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(r * 0.45, 0); ctx.moveTo(0, -r * 0.45); ctx.lineTo(0, r * 0.45); glow('#5dffb0', 3, 0.6 + 0.3 * Math.sin(t * 0.006));
        return true;
      }
      if (k === 'mirror') {
        // Spiegler: Kristallfacetten; im Spiegelmodus glänzend weiß
        const on = e.mirrorUntil > (e._now || 0);
        poly([[r * 1.3, 0], [r * 0.3, -r * 1.1], [-r * 0.9, -r * 0.7], [-r * 1.2, 0], [-r * 0.9, r * 0.7], [r * 0.3, r * 1.1]]); fillHull(); glow(on ? '#ffffff' : c, on ? 3 : 2.2);
        ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.lineTo(-r * 1.2, 0); ctx.moveTo(r * 0.3, -r * 1.1); ctx.lineTo(r * 0.0, 0); ctx.lineTo(r * 0.3, r * 1.1); ctx.moveTo(-r * 0.9, -r * 0.7); ctx.lineTo(r * 0.0, 0); ctx.lineTo(-r * 0.9, r * 0.7); glow(c, 1, 0.55);
        core(0, 0, r * 0.18);
        return true;
      }
      if (k === 'shade') {
        // Schattenrochen: dunkler, gezackter Rochen mit violettem Rand
        const f = wob(0.004, 0.2);
        ctx.beginPath(); ctx.moveTo(r * 1.1, 0); ctx.lineTo(r * 0.2, -r * (1.0 + f)); ctx.lineTo(-r * 0.3, -r * (1.8 + f)); ctx.lineTo(-r * 0.5, -r * 0.9); ctx.lineTo(-r * 0.9, 0); ctx.lineTo(-r * 0.5, r * 0.9); ctx.lineTo(-r * 0.3, r * (1.8 + f)); ctx.lineTo(r * 0.2, r * (1.0 + f)); ctx.closePath();
        ctx.fillStyle = '#05040c'; ctx.fill(); glow(c, 2);
        ctx.beginPath(); ctx.moveTo(-r * 0.9, 0); ctx.quadraticCurveTo(-r * 1.7, wob(0.006, r * 0.5), -r * 2.5, wob(0.005, r * 0.6)); glow(c, 1.3);
        for (const sg of [-1, 1]) { ctx.beginPath(); ctx.arc(r * 0.55, sg * r * 0.3, r * 0.09, 0, 7); ctx.fillStyle = '#c3a6ff'; ctx.fill(); }
        return true;
      }
      if (k === 'devourer') {
        // Der Verschlinger: Schlund mit Zahnkranz, Strudelkern
        ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, 7); fillHull(); glow(c, 2.8);
        ctx.save(); ctx.rotate(-t * 0.002); ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; ctx.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); ctx.lineTo(Math.cos(a + 0.12) * r * 0.62, Math.sin(a + 0.12) * r * 0.62); } glow('#ffffff', 1, 0.65); ctx.restore();
        ctx.save(); ctx.rotate(t * 0.004); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (0.18 + i * 0.13), i * 2, i * 2 + 4); glow(c, 1.2, 0.8); } ctx.restore();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, 7); ctx.fillStyle = '#000'; ctx.fill();
        return true;
      }
      if (k === 'titan') {
        // Vulkan-Titan: Asteroidenfestung mit Kraterschlot; die Geschütze sind eigene Bauteile
        ctx.beginPath(); for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, rr = r * (0.95 + 0.12 * Math.sin(i * 2.7)); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr * 1.05, Math.sin(a) * rr); } ctx.closePath(); fillHull(); glow(c, 2.8);
        ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.3); ctx.lineTo(-r * 0.2, -r * 0.1); ctx.lineTo(r * 0.1, -r * 0.6); ctx.moveTo(-r * 0.6, r * 0.5); ctx.lineTo(0, r * 0.2); ctx.lineTo(r * 0.5, r * 0.45); glow('#ff6a3d', 1.4, 0.75);
        for (const [fx, ly] of [[22, -36], [22, 36], [-20, -38], [-20, 38]]) { ctx.beginPath(); ctx.arc(fx / 1.5, ly / 1.5, r * 0.26, 0, 7); ctx.fillStyle = '#0d0c22'; ctx.fill(); glow(c, 1, 0.5); }
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.45); g.addColorStop(0, '#fff2c0'); g.addColorStop(0.5, '#ff6a3d'); g.addColorStop(1, 'rgba(255,80,30,0)');
        ctx.beginPath(); ctx.arc(0, 0, r * (0.4 + 0.05 * (e.phase || 0)), 0, 7); ctx.fillStyle = g; ctx.globalAlpha = beat; ctx.fill(); ctx.globalAlpha = 1;
        return true;
      }
      return false;
    }

    // Fraktionsformen für Jäger, Abfangjäger und Kanonenboot in Sektor 2–5
    function drawFaction(e, c, r, t, sd, fl) {
      const f = e.fac, ty = e.type;
      if (ty === 'shooter') return false;
      ctx.lineJoin = 'round';
      if (f === 2) {
        // Organisch: Tropfen, Sichel, Sporenkapsel
        if (ty === 'grunt') { flame(-r * 0.8, 0, r * 1.5 * fl, r * 0.25, '#b5ffe6', t, sd); ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.bezierCurveTo(r * 0.4, -r * 1.2, -r * 1.1, -r * 0.9, -r * 0.8, 0); ctx.bezierCurveTo(-r * 1.1, r * 0.9, r * 0.4, r * 1.2, r * 1.3, 0); fillHull(); glow(c, 1.4);
          ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.7); ctx.quadraticCurveTo(-r * 0.9, -r * 1.6, -r * 1.4, -r * 1.1); ctx.moveTo(-r * 0.2, r * 0.7); ctx.quadraticCurveTo(-r * 0.9, r * 1.6, -r * 1.4, r * 1.1); glow(c, 1, 0.8); }
        else if (ty === 'runner') { flame(-r * 0.4, 0, r * 3 * fl, r * 0.3, '#d8ffa0', t, sd); ctx.beginPath(); ctx.arc(0, 0, r * 1.2, -1.2, 1.2); ctx.arc(-r * 0.5, 0, r * 0.9, 1.0, -1.0, true); ctx.closePath(); fillHull(); glow(c, 1.2); }
        else { flame(-r, 0, r * 1.2 * fl, r * 0.3, '#9dffdb', t, sd); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.9, 0, 0, 7); fillHull(); glow(c, 1.8);
          ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * 0.35, t * 0.002, 0, 7); glow(c, 1, 0.6);
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.3 + i * r * 0.35, (i - 1) * r * 0.3, r * 0.14, 0, 7); ctx.fillStyle = c; ctx.fill(); } }
      } else if (f === 3) {
        // Industriell: Blöcke, Ziegelpfeil, Plattenpanzer
        if (ty === 'grunt') { for (const o of [-0.6, 0.6]) flame(-r * 0.9, r * o, r * 1.2 * fl, r * 0.18, '#ffd08a', t, sd + o); ctx.beginPath(); ctx.rect(-r * 0.9, -r * 0.5, r * 1.9, r); fillHull(); glow(c, 1.4);
          ctx.beginPath(); ctx.rect(-r * 0.7, -r * 1.05, r * 1.1, r * 0.4); ctx.rect(-r * 0.7, r * 0.65, r * 1.1, r * 0.4); fillHull(); glow(c, 1.1); ctx.beginPath(); ctx.rect(r * 0.4, -r * 0.2, r * 0.4, r * 0.4); ctx.fillStyle = c; ctx.fill(); }
        else if (ty === 'runner') { flame(-r * 0.9, 0, r * 3 * fl, r * 0.3, '#fff0a0', t, sd); ctx.beginPath(); ctx.moveTo(r * 1.6, 0); ctx.lineTo(r * 0.2, -r * 0.7); ctx.lineTo(-r * 0.9, -r * 0.7); ctx.lineTo(-r * 0.9, r * 0.7); ctx.lineTo(r * 0.2, r * 0.7); ctx.closePath(); fillHull(); glow(c, 1.2); }
        else { for (const o of [-0.5, 0, 0.5]) flame(-r * 1.05, r * o, r * 1.3 * fl, r * 0.16, '#ffb070', t, sd + o); ctx.beginPath(); ctx.rect(-r * 1.05, -r * 0.95, r * 2.2, r * 1.9); fillHull(); glow(c, 2);
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.7 + i * r * 0.65, -r * 0.95); ctx.lineTo(-r * 0.7 + i * r * 0.65, r * 0.95); glow(c, 0.9, 0.6); }
          ctx.beginPath(); ctx.rect(r * 1.15, -r * 0.25, r * 0.5, r * 0.5); fillHull(); glow(c, 1.3); }
      } else if (f === 4) {
        // Stachelig: Sternpfeil, Nadel, Krone
        if (ty === 'grunt') { flame(-r * 0.5, 0, r * 1.5 * fl, r * 0.22, '#ffb0c0', t, sd); ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, rr = i % 2 ? r * 0.45 : (i === 0 ? r * 1.5 : r * 1.05); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); fillHull(); glow(c, 1.4); }
        else if (ty === 'runner') { flame(-r * 1.4, 0, r * 3.2 * fl, r * 0.25, '#ffd0d8', t, sd); ctx.beginPath(); ctx.moveTo(r * 2.2, 0); ctx.lineTo(-r * 1.4, -r * 0.35); ctx.lineTo(-r * 1.0, 0); ctx.lineTo(-r * 1.4, r * 0.35); ctx.closePath(); fillHull(); glow(c, 1.2);
          ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.3); ctx.lineTo(-r * 0.9, -r * 1.1); ctx.moveTo(-r * 0.4, r * 0.3); ctx.lineTo(-r * 0.9, r * 1.1); glow(c, 1, 0.8); }
        else { flame(-r * 0.9, 0, r * 1.4 * fl, r * 0.3, '#ff9aa8', t, sd); ctx.beginPath(); ctx.moveTo(-r * 0.9, -r * 0.8); for (let i = 0; i <= 4; i++) { const y = -r * 0.8 + i * r * 0.4; ctx.lineTo(r * (i % 2 ? 0.6 : 1.4), y); } ctx.lineTo(-r * 0.9, r * 0.8); ctx.closePath(); fillHull(); glow(c, 2);
          ctx.beginPath(); ctx.arc(-r * 0.2, 0, r * 0.3, 0, 7); ctx.fillStyle = c; ctx.globalAlpha = 0.7; ctx.fill(); ctx.globalAlpha = 1; }
      } else if (f === 5) {
        // Geisterhaft: hohle Umrisse, gestrichelte Innenringe
        ctx.setLineDash([]);
        if (ty === 'grunt') { ctx.beginPath(); ctx.arc(r * 0.2, 0, r * 0.9, 0, 7); glow(c, 1.4); ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.quadraticCurveTo(-r * 1.6, Math.sin(t * 0.008 + sd) * r * 0.8, -r * 2.4, 0); glow(c, 1, 0.6);
          ctx.beginPath(); ctx.arc(r * 0.2, 0, r * 0.45, 0, 7); ctx.setLineDash([2, 3]); glow(c, 0.8, 0.7); ctx.setLineDash([]); }
        else if (ty === 'runner') { ctx.beginPath(); ctx.moveTo(r * 1.6, 0); ctx.lineTo(-r * 0.8, -r * 0.8); ctx.moveTo(r * 1.6, 0); ctx.lineTo(-r * 0.8, r * 0.8); ctx.moveTo(r * 0.6, 0); ctx.lineTo(-r * 1.4, -r * 0.6); ctx.moveTo(r * 0.6, 0); ctx.lineTo(-r * 1.4, r * 0.6); glow(c, 1.3); }
        else { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; ctx.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1); } ctx.closePath(); glow(c, 1.8);
          ctx.save(); ctx.rotate(-t * 0.002); ctx.beginPath(); ctx.arc(0, 0, r * 0.65, 0, 7); ctx.setLineDash([3, 4]); glow(c, 1, 0.7); ctx.setLineDash([]); ctx.restore();
          ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, 7); ctx.fillStyle = c; ctx.fill(); }
      } else return false;
      return true;
    }

    // ---------- Kanone: Form folgt den Upgrades ----------
    // Sichtbare Ausbaustufe: Lauf-Upgrades plus Labor und Fusion, damit das Labor die Kanone sichtbar verändert
    function cannonLook(run) {
      const L = id => run.L(id), M = id => C.mlv(run.meta, id), F = id => C.flv(run.meta, id);
      return {
        hp: L('hp') + M('m_hp') * 1.5, armor: L('armor') + M('m_armor') * 2.5, regen: L('regen') + M('m_regen'),
        dmg: L('dmg') + M('m_dmg') * 1.5, rate: L('rate') + M('m_rate'), core: F('f_core'),
        crys: M('m_crys'), loot: M('m_loot'), head: M('m_head'), cheap: M('m_cheap'),
      };
    }
    // Farbe mit Deckkraft (Hex oder HSL)
    function alpha(col, a) {
      if (col[0] === '#') { const n = parseInt(col.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
      return col.replace('hsl(', 'hsla(').replace(')', `,${a})`);
    }
    // Hangar-Einstellungen des Spielers
    function skinLook(meta, t) {
      const sk = (meta && meta.skin) || {}, c = C.SKIN.color.find(x => x.id === sk.color) || C.SKIN.color[0];
      return { col: c.col || `hsl(${Math.round((t * 0.04) % 360)},100%,66%)`, turret: sk.turret || 'hex', base: sk.base || 'bunker', deco: new Set(sk.deco || []) };
    }
    // Kanone samt Anbauten kleiner zeichnen, damit sie den Schutzwall nicht ausfüllt
    const RIG = 0.78;
    function drawRig(run, t) { ctx.save(); ctx.scale(RIG, RIG); drawSideGuns(run, t); drawCannon(run, t); drawModulePods(run, t); ctx.restore(); }
    function drawCannon(run, t) {
      const s = run.s, L = id => run.L(id), V = cannonLook(run), SK = skinLook(run.meta, t), CC = SK.col;
      const hpL = V.hp, arL = V.armor, rgL = V.regen, dmgL = V.dmg;
      const over = run.overActive;
      const coreCol = over ? PAL.heat : CC;
      const w = 28 + Math.min(8, hpL * 0.15); // Fundament schmaler als der Schutzwall
      ctx.save(); ctx.scale(0.95, 0.95);

      // Schutzkuppel (Panzerung)
      if (arL > 0) {
        ctx.beginPath(); ctx.arc(0, 4, w + 4, Math.PI, 0);
        const g = ctx.createRadialGradient(0, 4, w, 0, 4, w + 4);
        g.addColorStop(0, alpha(CC, 0)); g.addColorStop(1, alpha(CC, 0.06 + s.armor * 0.22));
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 4, w + 4, Math.PI, 0); glow(CC, 0.8 + s.armor * 2.2, 0.3 + s.armor * 0.7);
        // Wabenmuster als Andeutung
        ctx.globalAlpha = 0.18 + s.armor * 0.4;
        for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 7; ctx.save(); ctx.translate(Math.cos(a) * (w - 2), 4 + Math.sin(a) * (w - 2)); hexPath(4, 0); ctx.strokeStyle = CC; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
        ctx.globalAlpha = 1;
      }

      // Kristallantenne (Kristallresonanz) und Sammlerschüssel (Energiesammler) auf dem Fundament
      if (V.crys > 0) {
        const hgt = 10 + Math.min(14, V.crys * 0.7);
        ctx.save(); ctx.translate(w * 0.5, -8);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -hgt); glow(PAL.crystal, 1.1, 0.8);
        ctx.beginPath(); ctx.moveTo(0, -hgt - 6); ctx.lineTo(3.5, -hgt); ctx.lineTo(0, -hgt + 4); ctx.lineTo(-3.5, -hgt); ctx.closePath();
        ctx.fillStyle = PAL.crystal; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 0.005); ctx.fill(); ctx.globalAlpha = 1; glow(PAL.crystal, 1);
        ctx.restore();
      }
      if (V.loot > 0) {
        const r = 4 + Math.min(3, V.loot * 0.15);
        ctx.save(); ctx.translate(-w * 0.5, -8); ctx.rotate(-0.5 + 0.25 * Math.sin(t * 0.0012));
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -6); glow(PAL.energy, 1, 0.8);
        ctx.beginPath(); ctx.arc(0, -6 - r * 0.2, r, Math.PI * 1.1, Math.PI * 1.9); glow(PAL.energy, 1.3, 0.9);
        ctx.beginPath(); ctx.arc(0, -6 - r * 0.9, 1.3, 0, 7); ctx.fillStyle = PAL.energy; ctx.fill();
        ctx.restore();
      }

      // Anbauteile hinter dem Fundament
      if (SK.deco.has('wings')) for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx * w * 0.7, 0); ctx.lineTo(sx * (w + 22), -18); ctx.lineTo(sx * (w + 16), -6); ctx.lineTo(sx * (w + 26), -4); ctx.lineTo(sx * (w + 8), 10); ctx.closePath();
        ctx.fillStyle = alpha(CC, 0.12); ctx.fill(); glow(CC, 1.3, 0.85);
      }
      if (SK.deco.has('pennant')) {
        const px = -w * 0.78, wav = Math.sin(t * 0.006) * 2;
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, -34); glow(CC, 1.1, 0.8);
        ctx.beginPath(); ctx.moveTo(px, -34); ctx.quadraticCurveTo(px - 8, -31 + wav, px - 16, -30 + wav * 1.5); ctx.lineTo(px, -25); ctx.closePath();
        ctx.fillStyle = alpha(PAL.hostile, 0.75); ctx.fill(); glow(PAL.hostile, 1, 0.8);
      }
      if (SK.deco.has('antenna')) for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.15 + i * 0.175), r0 = w * 0.62, r1 = r0 + 10 + (i % 2) * 6;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, -2 + Math.sin(a) * r0 * 0.5); ctx.lineTo(Math.cos(a) * r1, -2 + Math.sin(a) * r1 * 0.55); glow(CC, 0.9, 0.7);
        ctx.beginPath(); ctx.arc(Math.cos(a) * r1, -2 + Math.sin(a) * r1 * 0.55, 1.4, 0, 7); ctx.fillStyle = Math.sin(t * 0.008 + i) > 0 ? PAL.hostile : CC; ctx.fill();
      }
      // Fundament je nach Bauform
      ctx.lineJoin = 'round';
      if (SK.base === 'hover') {
        const bob = Math.sin(t * 0.003) * 1.5;
        ctx.save(); ctx.translate(0, bob);
        const gl = ctx.createRadialGradient(0, 22, 2, 0, 22, w); gl.addColorStop(0, alpha(CC, 0.45)); gl.addColorStop(1, alpha(CC, 0));
        ctx.fillStyle = gl; ctx.fillRect(-w, 12, w * 2, 16);
        ctx.beginPath(); ctx.moveTo(-w, 8); ctx.lineTo(-w * 0.7, -8); ctx.lineTo(w * 0.7, -8); ctx.lineTo(w, 8); ctx.lineTo(w * 0.8, 15); ctx.lineTo(-w * 0.8, 15); ctx.closePath();
        fillHull(); glow(CC, 1.8);
        for (const sx of [-0.55, 0, 0.55]) { ctx.beginPath(); ctx.ellipse(sx * w, 16, 5, 2, 0, 0, 7); ctx.fillStyle = alpha(CC, 0.6 + 0.3 * Math.sin(t * 0.01 + sx)); ctx.fill(); }
        ctx.restore();
      } else if (SK.base === 'tracks') {
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w - 4, 10, w * 2 + 8, 14, 7) : ctx.rect(-w - 4, 10, w * 2 + 8, 14); fillHull(); glow(CC, 1.6);
        const off = (t * 0.02) % 8;
        for (let x = -w; x <= w; x += 8) { ctx.beginPath(); ctx.moveTo(x + off - 4, 10); ctx.lineTo(x + off - 4, 12); ctx.strokeStyle = alpha(CC, 0.5); ctx.lineWidth = 1; ctx.stroke(); }
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-w + 2 + i * (w * 2 - 4) / 4, 17, 3.5, 0, 7); fillHull(); glow(CC, 1, 0.8); }
        ctx.beginPath(); ctx.moveTo(-w * 0.8, 10); ctx.lineTo(-w * 0.6, -8); ctx.lineTo(w * 0.6, -8); ctx.lineTo(w * 0.8, 10); ctx.closePath(); fillHull(); glow(CC, 1.8);
      } else if (SK.base === 'fortress') {
        ctx.beginPath(); ctx.moveTo(-w - 4, 24); ctx.lineTo(-w - 4, -2);
        for (let i = 0; i < 7; i++) { const x0 = -w - 4 + i * (w * 2 + 8) / 7, x1 = x0 + (w * 2 + 8) / 14; ctx.lineTo(x0, -10); ctx.lineTo(x1, -10); ctx.lineTo(x1, -4); ctx.lineTo(x0 + (w * 2 + 8) / 7, -4); }
        ctx.lineTo(w + 4, -2); ctx.lineTo(w + 4, 24); ctx.closePath(); fillHull(); glow(CC, 1.8);
        for (const sx of [-1, 1]) { ctx.beginPath(); ctx.rect(sx * (w + 4) - 7, -18, 14, 42); fillHull(); glow(CC, 1.5); ctx.beginPath(); ctx.moveTo(sx * (w + 4) - 9, -18); ctx.lineTo(sx * (w + 4), -26); ctx.lineTo(sx * (w + 4) + 9, -18); ctx.closePath(); fillHull(); glow(CC, 1.3); }
      } else {
        for (const sx of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(sx * w * 0.55, 10); ctx.lineTo(sx * (w + 10), 24); ctx.lineTo(sx * (w + 2), 24);
          glow(CC, 1.6, 0.8);
        }
        ctx.beginPath();
        ctx.moveTo(-w, 22); ctx.lineTo(-w * 0.86, 2); ctx.lineTo(-w * 0.55, -8); ctx.lineTo(w * 0.55, -8); ctx.lineTo(w * 0.86, 2); ctx.lineTo(w, 22); ctx.closePath();
        fillHull(); glow(CC, 1.8);
      }
      if (SK.deco.has('thrusters')) for (const sx of [-1, 1]) {
        ctx.save(); ctx.translate(sx * (w - 6), 22); ctx.rotate(Math.PI / 2);
        flame(0, 0, -(10 + 4 * Math.sin(t * 0.03 + sx)), 3, PAL.heat, t, sx); ctx.restore();
      }
      // Panzerplatten
      const plates = Math.min(6, Math.ceil(arL / 6));
      for (let i = 0; i < plates; i++) {
        const x = -w * 0.72 + (i + 0.5) * (w * 1.44 / plates);
        ctx.beginPath(); ctx.rect(x - 4, 10, 8, 6); ctx.fillStyle = alpha(CC, 0.18); ctx.fill(); glow(CC, 1, 0.8);
      }
      // Reparatur-Dioden
      const lights = Math.min(6, Math.ceil(rgL / 6));
      for (let i = 0; i < lights; i++) {
        const x = (i - (lights - 1) / 2) * 9;
        ctx.beginPath(); ctx.arc(x, 2, 1.8, 0, 7); ctx.fillStyle = PAL.heal;
        ctx.globalAlpha = 0.45 + 0.55 * Math.max(0, Math.sin(t * 0.006 - i * 0.7)); ctx.fill(); ctx.globalAlpha = 1;
      }

      // Turm (dreht sich zum Ziel)
      ctx.save(); ctx.translate(0, -6); ctx.rotate(run.aim + Math.PI / 2);
      const n = 1 + s.multi;
      const len = Math.min((C.WALL_R - 11) / (RIG * 0.95) - 6, 34 + Math.min(20, L('range') * 0.5 + V.dmg * 0.15)); // Spitze bleibt hinter dem Schutzwall
      const thick = 5 + Math.min(5, dmgL * 0.06);
      const gap = thick * 2.2, back = recoil * 6;
      const heat = over ? 0.6 + 0.4 * Math.sin(t * 0.03) : 0;
      // Visierlaser (Reichweite)
      if (L('range') > 0 && run.enemies.length) {
        ctx.beginPath(); ctx.moveTo(0, -len); ctx.lineTo(0, -s.range);
        ctx.strokeStyle = PAL.range; ctx.globalAlpha = 0.18; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
      }
      for (let i = 0; i < n; i++) {
        const ox = (i - (n - 1) / 2) * gap, side = i !== (n - 1) / 2 && n > 1;
        const ln = side ? len * 0.82 : len, bk = side ? back * 0.6 : back;
        // Lauf
        ctx.beginPath(); ctx.rect(ox - thick / 2, -ln + bk, thick, ln - 8);
        fillHull(); glow(coreCol, 1.4);
        // Energiekern im Lauf (Schaden)
        const g = ctx.createLinearGradient(0, -ln + bk, 0, -8);
        g.addColorStop(0, over ? '#fff1d6' : '#ffffff'); g.addColorStop(1, alpha(CC, 0));
        ctx.fillStyle = g; ctx.globalAlpha = 0.25 + Math.min(0.5, dmgL * 0.008) + heat * 0.3;
        ctx.fillRect(ox - thick * 0.18, -ln + bk + 4, thick * 0.36, ln - 14); ctx.globalAlpha = 1;
        // Kühlrippen (Feuerrate)
        const fins = Math.min(7, Math.ceil(V.rate / 4));
        for (let f = 0; f < fins; f++) { const y = -14 - f * 5 + bk; ctx.beginPath(); ctx.moveTo(ox - thick * 0.95, y); ctx.lineTo(ox + thick * 0.95, y); glow(over ? PAL.heat : CC, 1, 0.65); }
        // Mündungsbremse
        ctx.beginPath(); ctx.rect(ox - thick * 0.85, -ln + bk - 2, thick * 1.7, 6); fillHull(); glow(coreCol, 1.3);
        // Krit-Schienen
        if (L('crit') > 0) {
          const rl = Math.min(ln - 20, 10 + L('crit') * 2.4);
          ctx.beginPath(); ctx.moveTo(ox - thick * 0.75, -ln + bk + 8); ctx.lineTo(ox - thick * 0.75, -ln + bk + 8 + rl);
          ctx.moveTo(ox + thick * 0.75, -ln + bk + 8); ctx.lineTo(ox + thick * 0.75, -ln + bk + 8 + rl);
          glow(PAL.energy, 1 + Math.min(1.2, L('critx') * 0.08));
        }
        if (flash > 0) {
          ctx.beginPath(); ctx.arc(ox, -ln + bk - 6, 4 + thick * flash, 0, 7);
          ctx.fillStyle = over ? `rgba(255,170,90,${flash})` : `rgba(255,255,255,${flash})`; ctx.fill();
        }
      }
      // Turmkörper je nach Form
      ctx.beginPath();
      if (SK.turret === 'dome') { ctx.arc(0, 2, 17, Math.PI, 0); ctx.lineTo(17, 8); ctx.lineTo(-17, 8); }
      else if (SK.turret === 'wedge') { ctx.moveTo(-18, 8); ctx.lineTo(-12, -8); ctx.lineTo(0, -22); ctx.lineTo(12, -8); ctx.lineTo(18, 8); }
      else if (SK.turret === 'orb') { ctx.arc(0, -2, 15, 0, Math.PI * 2); }
      else if (SK.turret === 'crystal') { ctx.moveTo(0, -24); ctx.lineTo(10, -10); ctx.lineTo(16, 2); ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.lineTo(-16, 2); ctx.lineTo(-10, -10); }
      else { ctx.moveTo(-15, 8); ctx.lineTo(-17, -6); ctx.lineTo(-9, -16); ctx.lineTo(9, -16); ctx.lineTo(17, -6); ctx.lineTo(15, 8); }
      ctx.closePath();
      fillHull(); glow(run.hp / s.maxHp < 0.3 ? PAL.hostile : coreCol, 2);
      if (SK.turret === 'crystal') { ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 10); ctx.moveTo(-10, -10); ctx.lineTo(10, -10); ctx.moveTo(-16, 2); ctx.lineTo(16, 2); glow(coreCol, 0.7, 0.45); }
      if (SK.turret === 'orb') { ctx.beginPath(); ctx.ellipse(0, -2, 21, 6, t * 0.001, 0, 7); glow(coreCol, 1, 0.6); }
      if (SK.turret === 'dome') { ctx.beginPath(); ctx.arc(0, 2, 11, Math.PI * 1.15, Math.PI * 1.85); glow(coreCol, 0.8, 0.5); }
      ctx.restore();
      // Fusionskern: Ringe um den Kern, je Fusionsstufe heller
      if (V.core > 0) {
        const rings = Math.min(3, 1 + Math.floor(V.core / 5));
        for (let i = 0; i < rings; i++) { ctx.beginPath(); ctx.arc(0, -6, 10 + i * 3.2, t * 0.002 * (i % 2 ? -1 : 1) + i, t * 0.002 * (i % 2 ? -1 : 1) + i + Math.PI * 1.3); glow(PAL.heat, 1, 0.45 + Math.min(0.5, V.core * 0.04)); }
      }
      // Kern
      ctx.beginPath(); ctx.arc(0, -6, 7, 0, 7); fillHull(); glow(coreCol, 1.6);
      const pulse = 3 + 1.2 * Math.sin(t * 0.008);
      ctx.beginPath(); ctx.arc(0, -6, pulse, 0, 7); ctx.fillStyle = coreCol; ctx.fill();
      if (SK.deco.has('halo')) { ctx.beginPath(); ctx.ellipse(0, -44 + Math.sin(t * 0.003) * 2, 14, 4, 0, 0, 7); glow(PAL.energy, 1.6, 0.85); }
      if (SK.deco.has('stars')) for (let i = 0; i < 6; i++) {
        const a = t * 0.0007 + i * 1.047, r = w + 8 + 6 * Math.sin(t * 0.002 + i), x = Math.cos(a) * r, y = -6 - Math.abs(Math.sin(a)) * r * 0.8, k = 0.5 + 0.5 * Math.sin(t * 0.01 + i * 2);
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.002); ctx.beginPath(); ctx.moveTo(-3 * k, 0); ctx.lineTo(3 * k, 0); ctx.moveTo(0, -3 * k); ctx.lineTo(0, 3 * k); glow('#ffffff', 1, k); ctx.restore();
      }
      ctx.restore();
      if (over && Math.random() < 0.5) parts.push({ x: (Math.random() - 0.5) * 20, y: -20, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 0.5, t: 0, c: PAL.heat, k: 'spark' });
    }

    // ---------- Effekte ----------
    let dmgNums = true;
    // Effekte: 'full' wie bisher, 'clear' (Standard) gedämpft, 'min' fast nur Gegner und Treffer
    let fxMode = 'clear';
    const PK = () => (fxMode === 'full' ? 1 : fxMode === 'clear' ? 0.35 : 0.12);
    const np = n => Math.max(1, Math.round(n * PK()));
    const BLAST = { shatter: 1, boom: 1, mine: 1, splinter: 1, chain: 1, cryo: 1, brittle: 1, thorn: 1, reflect: 1, nova: 1, barrage: 1, drone: 1, leech: 1, crysfx: 1, shieldhit: 1, wallhit: 1 };
    function pushFx(f) {
      if (fxMode !== 'full' && BLAST[f.k]) {
        // gedämpft: begrenzte Zahl gleichzeitiger Treffereffekte, kürzer
        let n = 0; for (const x of fx) if (BLAST[x.k]) n++;
        if (n >= (fxMode === 'clear' ? 14 : 6) && f.k !== 'nova') return;
      }
      if (f.k === 'dmg' && fxMode !== 'full' && !f.crit) return; // ohne „Voll“ nur Krits als Zahl
      // Schadenszahlen begrenzen, damit große Gefechte lesbar bleiben (Krits und Boss bevorzugt)
      if (f.k === 'dmg' && !dmgNums) return;
      if (f.k === 'dmg') { let n = 0; for (const x of fx) if (x.k === 'dmg') n++; if (n >= (f.crit ? 10 : 5)) return; }
      f.life = (LIFE[f.k] || 0.5) * (fxMode !== 'full' && BLAST[f.k] ? 0.6 : 1);
      if (f.k === 'dmg') f.dx = (Math.random() - 0.5) * 16;
      if (f.k === 'wave' && f.sector) f.life = 3.2;
      if (f.k === 'wave' && f.rush && !f.boss && !f.sector) f.life = 0.5; // Durchmarsch: Wellennummer nur kurz
      if (f.k === 'boom') boom(f);
      if (f.k === 'leech' || f.k === 'crysfx') {
        const c = f.k === 'leech' ? PAL.heal : PAL.crystal;
        for (let i = 0; i < np(5); i++) { const dx = -f.x, dy = -8 - f.y, d = Math.hypot(dx, dy) || 1, v = 160 + Math.random() * 80; parts.push({ x: f.x + (Math.random() - 0.5) * 10, y: f.y + (Math.random() - 0.5) * 10, vx: dx / d * v, vy: dy / d * v, life: Math.min(1.2, d / v), t: 0, c, k: 'spark', nodrag: true }); }
      }
      if (f.k === 'cryo') for (let i = 0; i < np(12); i++) { const a = Math.random() * 6.28, v = 50 + Math.random() * 90; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.45, t: 0, c: Math.random() < 0.5 ? '#ffffff' : PAL.frost, k: 'shard', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, sz: 2 + Math.random() * 2.5 }); }
      if (f.k === 'brittle') for (let i = 0; i < np(6); i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 80; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35, t: 0, c: Math.random() < 0.5 ? '#ffffff' : PAL.frost, k: 'shard', rot: Math.random() * 6, vr: 8, sz: 1.5 + Math.random() * 2 }); }
      if (f.k === 'thorn') for (const p of f.pts) for (let i = 0; i < 3; i++) parts.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 50, life: 0.3, t: 0, c: '#ff6a8a', k: 'spark' });
      if (f.k === 'splinter') for (let i = 0; i < np(10); i++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 100; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35, t: 0, c: '#ffb0b0', k: 'spark' }); }
      if (f.k === 'mine') mineBoom(f);
      if (f.k === 'shatter') for (let i = 0; i < np(14); i++) { const a = Math.random() * 6.28, v = 70 + Math.random() * 110; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, t: 0, c: Math.random() < 0.5 ? '#ffffff' : PAL.frost, k: 'shard', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, sz: 2.5 + Math.random() * 3 }); }
      if (f.k === 'meteor') { shake = Math.max(shake, 0.4); for (let i = 0; i < np(30); i++) { const a = Math.random() * 6.28, v = 80 + Math.random() * 160; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.7, t: 0, c: Math.random() < 0.5 ? '#ffd27a' : '#ff5a1a', k: 'spark' }); } }
      if (f.k === 'fireball') { shake = Math.max(shake, 0.18); for (let i = 0; i < np(18); i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 130; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.55, t: 0, c: Math.random() < 0.5 ? '#ffd27a' : '#ff6a2a', k: 'spark' }); } }
      if (f.k === 'strike') shake = Math.max(shake, 0.35);
      if (f.k === 'freeze') {
        shake = Math.max(shake, 0.25);
        for (let i = 0; i < 40; i++) { const a = Math.PI + Math.random() * Math.PI, v = 120 + Math.random() * 260; parts.push({ x: 0, y: -10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.4, t: 0, c: Math.random() < 0.5 ? '#ffffff' : PAL.frost, k: 'spark' }); }
      }
      fx.push(f);
    }
    function boom(f) {
      const big = f.type === 'boss' ? 3.4 : f.type === 'brute' ? 1.6 : f.type === 'bomb' ? 2 : 1;
      const c = SHIP[f.type] || PAL.energy;
      for (let i = 0; i < np(14 * big); i++) { const a = Math.random() * 6.28, v = (40 + Math.random() * 120) * Math.sqrt(big); parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.4, t: 0, c: Math.random() < 0.4 ? '#fff3c4' : c, k: 'spark' }); }
      for (let i = 0; i < np(4 * big); i++) { const a = Math.random() * 6.28, v = 20 + Math.random() * 60; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.5, t: 0, c, k: 'shard', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, sz: (f.r || 8) * (0.4 + Math.random() * 0.5) }); }
      if (f.type === 'boss') shake = 0.6;
      if (f.type === 'bomb') shake = Math.max(shake, 0.3);
    }
    function mineBoom(f) {
      for (let i = 0; i < np(22); i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 160; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.35, t: 0, c: Math.random() < 0.5 ? '#fff3c4' : PAL.energy, k: 'spark' }); }
      for (let i = 0; i < (fxMode === 'full' ? 6 : 1); i++) { const a = Math.random() * 6.28, v = 10 + Math.random() * 25; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: 0.9 + Math.random() * 0.5, t: 0, c: '#7a6aa8', k: 'smoke', sz: 8 + Math.random() * 10 }); }
      shake = Math.max(shake, 0.12);
    }
    function step(dt, live, run) {
      if (run && run.shots !== lastShots) { lastShots = run.shots; recoil = 1; flash = 1; }
      recoil = Math.max(0, recoil - dt * 8); flash = Math.max(0, flash - dt * 10);
      const fdt = live ? dt : 0;
      for (const f of fx) f.t += fdt;
      for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t >= fx[i].life) fx.splice(i, 1);
      if (fx.length > 260) fx.splice(0, fx.length - 260);
      for (const p of parts) { p.t += fdt; p.x += p.vx * fdt; p.y += p.vy * fdt; const dr = p.nodrag ? 0 : p.k === 'smoke' ? 1.2 : 2.5; p.vx *= 1 - dr * fdt; p.vy *= 1 - dr * fdt; if (p.rot != null) p.rot += p.vr * fdt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t >= parts[i].life) parts.splice(i, 1);
      const PMAX = fxMode === 'full' ? 800 : fxMode === 'clear' ? 260 : 90;
      if (parts.length > PMAX) parts.splice(0, parts.length - PMAX);
    }
    function clear() { fx.length = 0; parts.length = 0; }

    // ---------- Szene ----------
    function draw(t, dt, run, ui) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const sec = run ? C.sectorOf(run.wave).n : 1, B = BIOME[sec - 1];
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, B.sky); bg.addColorStop(1, B.void);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      drawBackdrop(sec);
      drawBiome(sec, t, B);
      for (let i = 0; i < stars.length; i += sec === 5 ? 3 : 1) { const st = stars[i]; ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 0.001 + st.p); ctx.fillStyle = B.star; ctx.fillRect(st.x * W, st.y * H, st.r, st.r); }
      ctx.globalAlpha = 1;
      // Echo-Zyklen: die Zone kehrt wieder, je tiefer der Zyklus, desto stärker schimmert die Leere durch
      const cyc = run ? C.cycleOf(run.wave) : 1;
      if (cyc > 1) {
        const a = Math.min(0.45, 0.16 + 0.07 * (cyc - 2)), vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.2, W / 2, H * 0.55, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(40,20,90,0)'); vg.addColorStop(1, `rgba(24,10,60,${a})`);
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = a * 0.6; ctx.fillStyle = '#b9a6ff';
        for (let i = 1; i < stars.length; i += 4) { const st = stars[i], y = (st.y + t * 0.00002 * (1 + st.r)) % 1; ctx.fillRect(st.x * W, y * H, 1, 3 + st.r * 3); }
        ctx.globalAlpha = 1;
      }

      let sx = 0, sy = 0;
      if (shake > 0) { sx = (Math.random() - 0.5) * shake * 14; sy = (Math.random() - 0.5) * shake * 14; shake = Math.max(0, shake - dt); }
      ctx.save(); ctx.translate(view.cx + sx, view.cy + sy); ctx.scale(view.s, view.s);

      // Peilraster und Boden
      ctx.lineWidth = 1 / view.s; ctx.strokeStyle = B.grid; ctx.globalAlpha = 0.6;
      for (let r = 100; r <= 500; r += 100) { ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.stroke(); }
      for (let i = 1; i < 6; i++) { const a = Math.PI + i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 50, Math.sin(a) * 50); ctx.lineTo(Math.cos(a) * 520, Math.sin(a) * 520); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(-600, 31); ctx.lineTo(600, 31); ctx.strokeStyle = B.grid; ctx.lineWidth = 1.5; ctx.stroke();
      if (!run) { ctx.restore(); return; }
      const s = run.s, frozen = run.frozen;

      // Reichweite: goldener Bogen
      ctx.beginPath(); ctx.arc(0, 0, s.range, Math.PI, 0);
      ctx.fillStyle = 'rgba(255,209,102,0.05)'; ctx.fill();
      ctx.setLineDash([10, 7]); ctx.lineDashOffset = -t * 0.012;
      ctx.beginPath(); ctx.arc(0, 0, s.range, Math.PI, 0); glow(PAL.range, fxMode === 'full' ? 2 : 1.3, fxMode === 'full' ? 0.9 : 0.6);
      ctx.setLineDash([]);

      drawScanner(run, t);
      // Klingenbahn
      if (s.blades) {
        ctx.beginPath(); ctx.arc(0, 0, s.bladeR, -Math.PI / 2 - 1.35, -Math.PI / 2 + 1.35);
        ctx.setLineDash([3, 6]); ctx.strokeStyle = PAL.heal; ctx.globalAlpha = 0.28; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]);
      }

      // Minen
      for (const m of run.mines) drawMine(m, t, s, run);
      // Brandfelder und Nachbeben (Skills) – nur im Feld oberhalb des Horizonts
      ctx.save(); ctx.beginPath(); ctx.rect(-3000, -4000, 6000, 4000); ctx.clip();
      for (const f of run.fires || []) {
        const left = Math.max(0, f.until - run.time), a = Math.min(1, left / 0.6);
        const col = f.k === 'quake' ? '255,120,220' : f.k === 'elfire' ? '255,96,32' : '255,140,40';
        const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        gr.addColorStop(0, `rgba(${col},${0.5 * a})`); gr.addColorStop(1, `rgba(${col},0)`);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 7); ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.7 + 0.08 * Math.sin(t * 0.02)), 0, 7); glow(`rgb(${col})`, 1.6, 0.6 * a);
        if (Math.random() < 0.3) parts.push({ x: f.x + (Math.random() - 0.5) * f.r, y: f.y + (Math.random() - 0.5) * f.r, vx: 0, vy: -40, life: 0.5, t: 0, c: f.k === 'quake' ? '#ff9ae6' : '#ffb347', k: 'spark' });
      }
      // Elementarmagie im Feld: Flammenwände, Meteor-Ziele, Eisstürme, Spiegel, Strahlen
      for (const w of run.walls || []) {
        const left = Math.max(0, w.until - run.time), a = Math.min(1, left / 0.5), fl = 0.8 + 0.2 * Math.sin(t * 0.03 + (w.x1 || w.x));
        ctx.save(); ctx.lineCap = 'round'; ctx.beginPath();
        if (w.ring) ctx.arc(w.x, w.y, w.r, 0, 7); else { ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); }
        ctx.strokeStyle = `rgba(255,90,20,${0.35 * a})`; ctx.lineWidth = 16; ctx.stroke();
        ctx.strokeStyle = `rgba(255,190,90,${0.7 * a * fl})`; ctx.lineWidth = 5; ctx.stroke();
        glow('#ffd27a', 1.4, 0.8 * a); ctx.restore();
        if (Math.random() < 0.6) { const q = Math.random(), an = q * 6.28, px = w.ring ? w.x + Math.cos(an) * w.r : w.x1 + (w.x2 - w.x1) * q, py = w.ring ? w.y + Math.sin(an) * w.r : w.y1 + (w.y2 - w.y1) * q; parts.push({ x: px, y: py, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, life: 0.5, t: 0, c: Math.random() < 0.5 ? '#ffb347' : '#ff5a1a', k: 'spark' }); }
      }
      if (run.wallPreview) {
        const P = run.wallPreview; ctx.save(); ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(P.x1, P.y1); ctx.lineTo(P.x2, P.y2); glow('#ffb347', 2, 0.9); ctx.restore();
      }
      for (const m of run.meteors || []) {
        const k = Math.max(0, Math.min(1, 1 - (m.at - run.time) / 1.5)), r0 = (run.s.el && run.s.el.r || 70) * (m.k < 1 ? 0.8 : 1);
        ctx.save(); ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 0.05; ctx.beginPath(); ctx.arc(m.x, m.y, r0, 0, 7); glow('#ff8a3d', 1.4, 0.5 + 0.4 * k); ctx.restore();
        ctx.beginPath(); ctx.arc(m.x, m.y, r0 * (1 - k), 0, 7); glow('#ffd27a', 1.2, 0.6);
        const hx = m.x + 120 * (1 - k), hy = m.y - 420 * (1 - k);
        ctx.beginPath(); ctx.moveTo(hx + 30, hy - 100); ctx.lineTo(hx, hy); glow('#ffb347', 5, 0.8 * k);
        ctx.beginPath(); ctx.arc(hx, hy, 6 + 4 * k, 0, 7); ctx.fillStyle = '#ffe9c0'; ctx.fill();
      }
      for (const st of run.storms || []) {
        const left = Math.max(0, st.until - run.time), a = Math.min(1, left / 0.5, (run.time - st.t0) / 0.3), R = run.s.el && run.s.el.r || 70;
        const gr = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, R);
        gr.addColorStop(0, `rgba(200,240,255,${0.22 * a})`); gr.addColorStop(1, 'rgba(160,220,255,0)');
        ctx.beginPath(); ctx.arc(st.x, st.y, R, 0, 7); ctx.fillStyle = gr; ctx.fill();
        ctx.save(); ctx.setLineDash([3, 7]); ctx.lineDashOffset = t * 0.04; ctx.beginPath(); ctx.arc(st.x, st.y, R, 0, 7); glow(PAL.frost, 1.2, 0.7 * a); ctx.restore();
        for (let i = 0; i < 2; i++) if (Math.random() < 0.8) { const an = Math.random() * 6.28, d = Math.random() * R; parts.push({ x: st.x + Math.cos(an) * d, y: st.y + Math.sin(an) * d - 20, vx: -20, vy: 120, life: 0.25, t: 0, c: '#e8fbff', k: 'spark' }); }
      }
      for (const m of run.mirrors || []) {
        const left = Math.max(0, m.until - run.time), a = Math.min(1, left / 1.5);
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(t * 0.002);
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0); ctx.closePath();
        ctx.fillStyle = `rgba(255,245,210,${0.25 * a})`; ctx.fill(); glow('#fff3c4', 1.4, 0.9 * a); ctx.restore();
      }
      if (run.beam && run.beam.segs && run.s.el) {
        // Strahl: heller Kern über allen Abschnitten (Prisma, Spiegel, Brennglas)
        const fl = 0.85 + 0.15 * Math.sin(t * 0.05);
        ctx.save(); ctx.lineCap = 'round';
        for (const q of run.beam.segs) {
          const w = q.w || 7;
          ctx.beginPath(); ctx.moveTo(q.x1, q.y1); ctx.lineTo(q.x2, q.y2);
          ctx.strokeStyle = `rgba(255,233,168,${0.18 * fl})`; ctx.lineWidth = w * 2.6; ctx.stroke();
          ctx.strokeStyle = `rgba(255,240,200,${0.55 * fl})`; ctx.lineWidth = w * 1.1; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(q.x1, q.y1); ctx.lineTo(q.x2, q.y2); glow('#ffffff', 1.6, 0.9 * fl);
        }
        for (const q of run.beam.lens || []) { ctx.beginPath(); ctx.moveTo(q.x1, q.y1); ctx.lineTo(q.x2, q.y2); glow('#fff3c4', 1.2, 0.7); }
        ctx.restore();
        const q0 = run.beam.segs[run.beam.segs.length - 1];
        if (q0 && Math.random() < 0.5) { const q = Math.random(); parts.push({ x: q0.x1 + (q0.x2 - q0.x1) * q * 0.8, y: q0.y1 + (q0.y2 - q0.y1) * q * 0.8, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.35, t: 0, c: '#fff3c4', k: 'spark' }); }
      }
      if (run.hole) {
        // Schwarzes Loch: dunkler Kern, spiralige Ringe
        const H = run.hole;
        ctx.save(); ctx.translate(H.x, H.y);
        const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 70); g2.addColorStop(0, 'rgba(0,0,0,0.85)'); g2.addColorStop(0.4, 'rgba(60,20,110,0.45)'); g2.addColorStop(1, 'rgba(60,20,110,0)');
        ctx.beginPath(); ctx.arc(0, 0, 70, 0, 7); ctx.fillStyle = g2; ctx.fill();
        for (let i = 0; i < 3; i++) { ctx.rotate(t * 0.004 + i * 2.1); ctx.beginPath(); ctx.arc(0, 0, 20 + i * 14, 0, 4.2); glow('#b98aff', 1.4, 0.6); }
        ctx.restore();
      }
      ctx.restore();

      // Schockwellen-Ring
      if (run.ring) {
        const R = run.ring, k = R.r / R.max;
        ctx.beginPath(); ctx.arc(0, 0, R.r, Math.PI, 0);
        glow(PAL.core, 3 + 4 * (1 - k), 1 - k * 0.6);
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0, R.r - 12), Math.PI, 0); glow(PAL.core, 1, 0.35 * (1 - k));
      }

      // Riese (Leviathan): Arme mit Saugnäpfen, dann der Mantel über die ganze Breite
      for (const g of run.enemies) {
        if (!g.giant || g.hp <= 0) continue;
        const col = BOSS_COL[(g.sector || 1) - 1], bp = run.pos(g);
        if (g.kind === 'devourer') drawGiantBody(g, bp.x, bp.y, col, t); // Arme kommen aus dem Schlund
        for (const a of run.enemies) {
          if (a.host !== g || a.pk !== 'arm' || a.hp <= 0 || !a.path) continue;
          const P = a.path, n = P.length, w0 = 15, lit = a.stage === 'hold' && a.act === 'slam', grab = a.act === 'grab' && a.stage === 'hold';
          const L = [], R = [];
          for (let i = 0; i < n; i++) { const q = P[Math.min(n - 1, i + 1)], o = P[Math.max(0, i - 1)]; let dx = q.x - o.x, dy = q.y - o.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const w = w0 * (1 - i / n * 0.8); L.push([P[i].x - dy * w, P[i].y + dx * w]); R.push([P[i].x + dy * w, P[i].y - dx * w]); }
          ctx.beginPath(); L.forEach((p2, i) => ctx[i ? 'lineTo' : 'moveTo'](p2[0], p2[1])); R.reverse().forEach(p2 => ctx.lineTo(p2[0], p2[1])); ctx.closePath();
          ctx.fillStyle = HULL; if (run.inkUntil > run.time) ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
          glow(grab ? '#ff4040' : lit ? '#ffffff' : col, lit || grab ? 2.2 : 1.6, a.flash > 0 ? 1 : 0.9);
          for (let i = 2; i < n - 2; i += 2) { const w = w0 * (1 - i / n * 0.8); ctx.beginPath(); ctx.arc(P[i].x, P[i].y, Math.max(1.6, w * 0.32), 0, 7); glow(col, 0.9, 0.6); }
          if (grab) { ctx.beginPath(); ctx.arc(0, -8, 46, Math.PI * 1.05, Math.PI * 1.95); glow('#ff4040', 3, 0.6 + 0.4 * Math.sin(t * 0.02)); }
          if (a.act === 'sweep' && a.stage === 'hold') { const tp = run.pos(a); ctx.beginPath(); ctx.arc(tp.x, tp.y, 34, 0, 7); ctx.setLineDash([4, 6]); glow(col, 1, 0.5); ctx.setLineDash([]); }
        }
        if (g.kind !== 'devourer') drawGiantBody(g, bp.x, bp.y, col, t);
        // Tintenwolke
        if (run.inkUntil > run.time) {
          const k = Math.min(1, (run.inkUntil - run.time) / 1);
          for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(bp.x - 200 + i * 50, bp.y + 130 + Math.sin(t * 0.002 + i) * 25, 70 + 15 * Math.sin(i * 2.1), 0, 7); ctx.fillStyle = `rgba(4,6,14,${0.55 * k})`; ctx.fill(); }
        }
      }

      // Tentakelarme und Wurmglieder: Verbindungen vom Boss zu seinen Bauteilen, unter den Schiffen
      for (const e of run.enemies) {
        if (!e.host || e.hp <= 0 || (e.pk !== 'tentacle' && e.pk !== 'segment')) continue;
        const h = e.host, hp = run.pos(h), p = run.pos(e), col = BOSS_COL[(h.sector || 1) - 1];
        if (e.pk === 'segment') {
          // Glied an Glied: zum Kopf bzw. zum inneren Nachbarn
          const inner = e.si ? run.enemies.find(o => o.host === h && o.pk === 'segment' && o.side === e.side && o.si === e.si - 1 && o.hp > 0) : h;
          if (!inner) continue; const q = run.pos(inner);
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.lineWidth = 9; ctx.strokeStyle = HULL; ctx.stroke(); glow(col, 1.2, 0.6);
          continue;
        }
        const dx = p.x - hp.x, dy = p.y - hp.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, seg = 14;
        ctx.beginPath();
        for (let i = 0; i <= seg; i++) {
          const k = i / seg, wv = Math.sin(t * 0.006 + k * 5 + e.seed) * 7 * Math.sin(k * Math.PI) * (1 - 0.6 * e.ext);
          const x = hp.x + dx * k + nx * wv, y = hp.y + dy * k + ny * wv; ctx[i ? 'lineTo' : 'moveTo'](x, y);
        }
        ctx.lineWidth = 7 - 2 * e.ext; ctx.strokeStyle = HULL; ctx.lineCap = 'round'; ctx.stroke(); glow(e.tst === 2 ? '#ffffff' : col, e.tst === 2 ? 1.8 : 1.3, 0.85); ctx.lineCap = 'butt';
      }

      // Schiffe
      for (const e of run.enemies) {
        if (e.giant) continue; // Riese: oben schon gezeichnet
        const p = run.pos(e);
        // Schiffe zeigen in Flugrichtung; Boss und haltende Schützen zur Kanone
        const facing = e.type === 'boss' || e.hd == null || (e.stop && e.dist <= e.stop) ? e.a + Math.PI : e.hd;
        const cloak = run.cloaked(e);
        if (e.type === 'mender') { ctx.beginPath(); ctx.arc(p.x, p.y, 90, 0, 7); ctx.setLineDash([3, 9]); ctx.strokeStyle = SHIP.mender; ctx.globalAlpha = 0.12 + 0.06 * Math.sin(t * 0.004 + e.seed); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; } // dezenter Heilradius
        if (e.type === 'boss' && e.laser > 0) {
          // Laser lädt: Zielstrahl zur Kanone, Balken zeigt, wie viel Schaden ihn abbricht
          const k = 1 - e.laser / 2;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(0, -8);
          ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 0.05; glow('#ff3030', 1 + k * 4, 0.4 + 0.5 * Math.abs(Math.sin(t * 0.02 * (1 + k * 3)))); ctx.setLineDash([]);
          const w = 60, need = e.maxHp * 0.06, prog = Math.min(1, (e.laserDmg || 0) / need);
          ctx.fillStyle = '#2a2560'; ctx.fillRect(p.x - w / 2, p.y + e.r * 1.8 + 8, w, 4);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - w / 2, p.y + e.r * 1.8 + 8, w * prog, 4);
          ctx.fillStyle = '#ff6060'; ctx.font = `700 11px ${FONT_UI()}`; ctx.textAlign = 'center';
          ctx.fillText('LASER · SCHADEN BRICHT AB', p.x, p.y + e.r * 1.8 + 24);
        }
        e._now = run.time;
        if (fxMode !== 'full' && e.type !== 'part' && !e.giant) {
          // dunkler Hof: Gegner heben sich von Effekten und Hintergrund ab
          const hr = e.r * (e.type === 'boss' ? 1.9 : 2.1);
          const hg = ctx.createRadialGradient(p.x, p.y, e.r * 0.5, p.x, p.y, hr); hg.addColorStop(0, 'rgba(4,3,14,0.55)'); hg.addColorStop(1, 'rgba(4,3,14,0)');
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(p.x, p.y, hr, 0, 7); ctx.fill();
        }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(facing); ctx.scale(1.5, 1.5);
        if (cloak) ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 0.01 + e.seed);
        drawShip(e, t, frozen || e.slowUntil > run.time || e.frostUntil > run.time); ctx.restore(); ctx.globalAlpha = 1;
        if (e.elite && !cloak) { // Elitegarde: goldener, kreisender Ring
          ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 0.02; ctx.lineWidth = 2; ctx.strokeStyle = '#ffd166';
          ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 2.1, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        }
        if (e.slowUntil > run.time && !frozen) {
          ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 1.7, 0, 7); ctx.fillStyle = 'rgba(159,232,255,0.18)'; ctx.fill();
          ctx.save(); ctx.translate(p.x, p.y - e.r * 1.9); ctx.rotate(t * 0.002);
          for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.strokeStyle = PAL.frost; ctx.lineWidth = 1.2; ctx.stroke(); }
          ctx.restore();
        }
        if (e.type === 'boss') {
          // Prüfungen sichtbar machen: Panzerschild, Aufheizen, Strahlung, Spiegel
          if (e.plate > 0) { const k2 = e.plate / (e.plateMax || 1); ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 2.0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k2); glow('#ffd23f', 3, 0.9); ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 2.0, 0, 7); ctx.fillStyle = 'rgba(255,210,63,0.07)'; ctx.fill(); }
          if (e.heat > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 1.6, 0, 7); glow('#ff3030', 1 + e.heat * 0.4, 0.25 + 0.05 * e.heat); }
          const CK = e.kind && C.BOSS_KINDS[e.kind].chk;
          if (CK && CK.includes('sustain')) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(0, -8); ctx.setLineDash([2, 10]); ctx.lineDashOffset = -t * 0.04; glow('#ff8a3d', 1, 0.35); ctx.setLineDash([]); }
          if (e.mirrorUntil > run.time) { ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 2.2, 0, 7); ctx.setLineDash([10, 6]); ctx.lineDashOffset = t * 0.03; glow('#ffffff', 2, 0.8); ctx.setLineDash([]); }
        }
        if (e.type === 'boss' && e.shieldUntil > run.time) {
          const left = e.shieldUntil - run.time;
          ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 2.3, 0, 7);
          ctx.fillStyle = 'rgba(159,232,255,0.10)'; ctx.fill();
          glow(PAL.frost, 2, Math.min(1, left) * (0.7 + 0.3 * Math.sin(t * 0.02)));
        }
        if (frozen) { ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 1.8, 0, 7); ctx.strokeStyle = PAL.frost; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; }
        if (e.burnUntil > run.time) { ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 1.5, 0, 7); glow('#ff7a2a', 1.4, 0.4 + 0.25 * Math.sin(t * 0.03 + e.seed)); if (Math.random() < 0.3) parts.push({ x: p.x + (Math.random() - 0.5) * e.r, y: p.y, vx: 0, vy: -45, life: 0.4, t: 0, c: '#ffb347', k: 'spark' }); }
        if (e.frostUntil > run.time) {
          // Frostlanze: Eisblock um das Schiff (Bosse: nur ein Frostring)
          const fl = Math.min(1, (e.frostUntil - run.time) / 0.4), R1 = e.r * (e.frostBig ? 2.1 : 1.65);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(0.26); ctx.beginPath();
          for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * R1, Math.sin(an) * R1); }
          ctx.closePath(); if (!e.frostBig) { ctx.fillStyle = `rgba(190,240,255,${0.28 * fl})`; ctx.fill(); }
          glow('#dff8ff', 1.4, 0.85 * fl); ctx.restore();
        }
        if (e.type === 'brute' || e.type === 'boss' || e.type === 'bomb' || e.hp < e.maxHp) {
          const w = Math.max(18, e.r * (e.type === 'boss' ? 3.4 : 2.6)), hy = p.y - e.r * 1.7 - 8;
          ctx.fillStyle = '#2a2560'; ctx.fillRect(p.x - w / 2, hy, w, 3);
          ctx.fillStyle = SHIP[e.type]; ctx.fillRect(p.x - w / 2, hy, w * Math.max(0, e.hp / e.maxHp), 3);
        }
        if (e.pdps > 0 && fxMode !== 'full') {
          // Gift gedämpft: grüner Tropfen über dem Schiff, die Eigenfarbe bleibt
          const dy = p.y - e.r * 1.5 - 6 - ((t * 0.02 + e.seed * 9) % 6);
          ctx.beginPath(); ctx.moveTo(p.x, dy - 4); ctx.quadraticCurveTo(p.x + 3, dy, p.x, dy + 3); ctx.quadraticCurveTo(p.x - 3, dy, p.x, dy - 4); ctx.fillStyle = '#8dff5a'; ctx.fill();
        } else if (e.pdps > 0) { ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 1.4, 0, 7); ctx.fillStyle = 'rgba(141,255,90,0.10)'; ctx.fill(); glow('#8dff5a', 2, 0.5 + 0.3 * Math.sin(t * 0.01 + e.seed)); if (Math.random() < 0.25) parts.push({ x: p.x + (Math.random() - 0.5) * e.r, y: p.y, vx: 0, vy: -25, life: 0.5, t: 0, c: '#8dff5a', k: 'spark' }); }
        if (e.stunUntil > run.time && !(e.frostUntil > run.time)) { for (let i = 0; i < 3; i++) { const an = t * 0.008 + i * 2.1; ctx.beginPath(); ctx.arc(p.x + Math.cos(an) * e.r, p.y - e.r - 5 + Math.sin(an) * 3, 2.6, 0, 7); ctx.fillStyle = '#fff38a'; ctx.fill(); } ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 1.3, 0, 7); glow('#fff38a', 1.2, 0.5); }
        if (run.focus === e) {
          // Markiertes Ziel: Leitstrahl von der Kanone, pulsierender Ring, Eckklammern und Schriftzug
          const MK = '#ffd23f', R0 = e.r * 1.5 + 8, pul = 0.5 + 0.5 * Math.sin(t * 0.008);
          ctx.save(); ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(p.x, p.y); ctx.strokeStyle = MK; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
          ctx.save(); ctx.translate(p.x, p.y);
          ctx.beginPath(); ctx.arc(0, 0, R0 + 3 * pul, 0, 7); glow(MK, 1.2, 0.35 + 0.35 * pul);
          ctx.rotate(t * 0.002);
          for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(R0 + 2, -7); ctx.lineTo(R0 + 7, -7); ctx.lineTo(R0 + 7, 7); ctx.lineTo(R0 + 2, 7); glow(MK, 2.2); }
          ctx.restore();
          ctx.font = `700 9px ${FONT_UI()}`; ctx.textAlign = 'center'; ctx.fillStyle = MK; ctx.fillText('ZIEL', p.x, p.y + R0 + 18);
        }
      }
      // Projektile
      ctx.lineCap = 'round';
      for (const b of run.bullets) {
        const tp = run.pos(b.tgt), d = Math.hypot(tp.x - b.x, tp.y - b.y) || 1;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - (tp.x - b.x) / d * 14, b.y - (tp.y - b.y) / d * 14);
        if (b.big) { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - (tp.x - b.x) / d * 40, b.y - (tp.y - b.y) / d * 40); glow('#ffd23f', 6); ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, 7); ctx.fillStyle = '#fffbe0'; ctx.fill(); continue; }
        if (b.oc) { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - (tp.x - b.x) / d * 26, b.y - (tp.y - b.y) / d * 26); glow('#ffe38a', 4); ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 7); ctx.fillStyle = '#fff6cc'; ctx.fill(); continue; }
        glow(b.pierced ? '#c8b6ff' : b.crit ? PAL.energy : run.overActive ? PAL.heat : PAL.core, b.crit || b.pierced ? 2.4 : 1.7);
      }
      for (const b of run.ebullets) { ctx.beginPath(); ctx.arc(b.x, b.y, b.rad || (b.big ? 5 : 3), 0, 7); if (b.col) { ctx.fillStyle = b.col; ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; } glow(b.col || (b.big ? SHIP.boss : '#c9ff4f'), 1.5); }
      // Orbitklingen
      if (s.blades) {
        // Bahn der Klingen dezent andeuten
        const T = run.bladeTrack();
        ctx.beginPath(); ctx.arc(0, 0, T.Ro, T.a0, T.a1); ctx.lineTo(Math.cos(T.a1) * T.Ri, Math.sin(T.a1) * T.Ri); ctx.arc(0, 0, T.Ri, T.a1, T.a0, true); ctx.closePath();
        ctx.setLineDash([2, 7]); ctx.strokeStyle = PAL.heal; ctx.globalAlpha = 0.18; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]);
        for (const b of run.bladePos()) {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(t * 0.012);
          const z = s.bladeSize;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.lineTo(Math.cos(a) * z, Math.sin(a) * z); ctx.lineTo(Math.cos(a + Math.PI / 4) * z * 0.32, Math.sin(a + Math.PI / 4) * z * 0.32); }
          ctx.closePath(); fillHull(); glow(PAL.heal, 1.6);
          ctx.restore();
        }
      }
      for (const m of run.rockets) {
        const an = Math.atan2(m.vy, m.vx);
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(an);
        flame(-5, 0, 12, 2.5, '#ffb066', t, m.x);
        ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -3); ctx.lineTo(-5, 3); ctx.closePath(); fillHull(); glow(PAL.heat, 1.4);
        ctx.restore();
        if (Math.random() < 0.6) parts.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 0.6, t: 0, c: '#8a7aa8', k: 'smoke', sz: 3 + Math.random() * 3 });
      }
      for (const b of run.bolts) {
        const tp = run.pos(b.tgt), d = Math.hypot(tp.x - b.x, tp.y - b.y) || 1, ux = (tp.x - b.x) / d, uy = (tp.y - b.y) / d;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - ux * 22, b.y - uy * 22); glow(PAL.frost, 2.5, 0.7);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(uy, ux));
        ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(0, -3.5); ctx.lineTo(-5, 0); ctx.lineTo(0, 3.5); ctx.closePath(); ctx.fillStyle = '#e8fbff'; ctx.fill(); glow(PAL.frost, 1.4);
        ctx.restore();
        if (Math.random() < 0.5) parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 0.35, t: 0, c: '#cff6ff', k: 'spark' });
      }
      drawWall(run, t);
      drawRig(run, t);
      if (s.K && s.K('a_drones')) for (let k = 0; k < 2; k++) {
        const a = run.time * 1.6 + k * Math.PI, x = Math.cos(a) * 34, y = -8 + Math.sin(a) * 20;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 4); ctx.lineTo(0, 2); ctx.lineTo(-4, 4); ctx.closePath(); fillHull(); glow(PAL.energy, 1.3);
        ctx.restore();
      }
      if (run.aegis > 0) { ctx.beginPath(); ctx.arc(0, 0, C.WALL_R - 6, Math.PI, 0); glow('#7fe3ff', 1 + 2 * Math.min(1, run.aegis / (s.maxHp * 0.25)), 0.55); }
      if (run.time < run.invulnUntil) { ctx.beginPath(); ctx.arc(0, -4, 30, 0, 7); ctx.fillStyle = `rgba(255,240,180,${0.12 + 0.08 * Math.sin(t * 0.02)})`; ctx.fill(); glow('#ffe9a0', 2, 0.8); }

      // Partikel und Effekte: nichts unterhalb des Horizonts (dort liegt die Steuerung)
      ctx.save(); ctx.beginPath(); ctx.rect(-3000, -4000, 6000, 4000 + 30); ctx.clip();
      for (const p of parts) {
        const k = p.t / p.life; ctx.globalAlpha = Math.max(0, 1 - k);
        if (p.k === 'spark') { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.strokeStyle = p.c; ctx.lineWidth = 1.6; ctx.stroke(); }
        else if (p.k === 'smoke') { ctx.globalAlpha = 0.35 * (1 - k); ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * (0.6 + k), 0, 7); ctx.fillStyle = p.c; ctx.fill(); }
        else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(-p.sz, 0); ctx.lineTo(p.sz * 0.6, -p.sz * 0.4); ctx.lineTo(p.sz * 0.3, p.sz * 0.5); ctx.closePath(); ctx.fillStyle = HULL; ctx.fill(); ctx.strokeStyle = p.c; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }
      }
      ctx.globalAlpha = 1;
      // Effekte im Feld
      for (const f of fx) {
        const k = f.t / f.life, a = Math.max(0, 1 - k);
        if (f.k === 'boom' && fxMode !== 'full') {
          // gedämpft: nur ein dünner, kurzer Ring in der Farbe des Schiffs
          const R = (f.r || 8) * (f.type === 'boss' ? 4 : 2.2);
          ctx.beginPath(); ctx.arc(f.x, f.y, R * (0.5 + k), 0, 7); glow(SHIP[f.type] || PAL.energy, 1.2, a * 0.7);
        } else if (f.k === 'boom') {
          const R = (f.r || 8) * (f.type === 'boss' ? 4 : 2.6);
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R * (0.4 + k));
          g.addColorStop(0, `rgba(255,250,220,${a})`); g.addColorStop(0.35, `rgba(255,170,80,${a * 0.7})`); g.addColorStop(1, 'rgba(255,80,140,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R * (0.4 + k), 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(f.x, f.y, R * (0.6 + k * 1.4), 0, 7); glow(SHIP[f.type] || PAL.energy, 1.4, a * 0.8);
        } else if (f.k === 'fireball') {
          // Feuerball: Einschlag von oben, dann Feuerring
          if (k < 0.25) { const q = k / 0.25; ctx.beginPath(); ctx.moveTo(f.x + 40 * (1 - q), f.y - 160 * (1 - q)); ctx.lineTo(f.x, f.y); glow('#ffb347', 4, 1 - q); }
          const R = f.r * (0.4 + 0.8 * Math.min(1, k * 2));
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
          const lt = f.col === 'light';
          g.addColorStop(0, `rgba(255,240,200,${0.7 * a})`); g.addColorStop(0.5, lt ? `rgba(255,233,168,${0.45 * a})` : `rgba(255,120,40,${0.45 * a})`); g.addColorStop(1, 'rgba(255,60,20,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, 7); glow(lt ? '#fff3c4' : '#ff8a3d', 2, a);
        } else if (f.k === 'meteor') {
          const R = f.r * (0.5 + 0.9 * Math.min(1, k * 2.5));
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
          g.addColorStop(0, `rgba(255,250,220,${0.85 * a})`); g.addColorStop(0.45, `rgba(255,120,40,${0.55 * a})`); g.addColorStop(1, 'rgba(255,40,10,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(f.x, f.y, R * 1.1, 0, 7); glow('#ff8a3d', 3, a);
        } else if (f.k === 'frostnova') {
          ctx.beginPath(); ctx.arc(0, -8, f.r * (0.2 + 0.8 * Math.min(1, k * 1.6)), Math.PI, 0); ctx.fillStyle = `rgba(190,240,255,${0.16 * a})`; ctx.fill();
          ctx.beginPath(); ctx.arc(0, -8, f.r * (0.2 + 0.8 * Math.min(1, k * 1.6)), Math.PI, 0); glow('#dff8ff', 3 * a + 1, a);
        } else if (f.k === 'lance') {
          ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); glow('#dff8ff', 3 * a + 1, a);
          ctx.beginPath(); ctx.arc(f.x2, f.y2, 10 + 10 * k, 0, 7); glow(PAL.frost, 1.4, a);
        } else if (f.k === 'shatter') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 45 * (0.3 + k), 0, 7); glow('#dff8ff', 1.4, a * 0.8);
        } else if (f.k === 'wallhit') {
          ctx.beginPath(); ctx.arc(Math.cos(f.a) * C.WALL_R, Math.sin(f.a) * C.WALL_R, 6 + 10 * k, 0, 7); glow('#ffffff', 1.5, a);
        } else if (f.k === 'cryo') {
          ctx.beginPath(); ctx.arc(f.x, f.y, (f.r || 40) * (0.3 + 0.7 * k), 0, 7); ctx.fillStyle = `rgba(159,232,255,${0.18 * a})`; ctx.fill(); glow(PAL.frost, 1.5, a);
        } else if (f.k === 'chain') {
          ctx.beginPath(); ctx.moveTo(f.x1, f.y1);
          for (let j = 1; j <= 5; j++) { const q = j / 5; ctx.lineTo(f.x1 + (f.x2 - f.x1) * q + (j < 5 ? (Math.random() - 0.5) * 16 : 0), f.y1 + (f.y2 - f.y1) * q + (j < 5 ? (Math.random() - 0.5) * 16 : 0)); }
          glow('#d6f7ff', 2.2, a);
          ctx.beginPath(); ctx.arc(f.x2, f.y2, 8 * a + 2, 0, 7); glow('#d6f7ff', 1.2, a);
        } else if (f.k === 'splinter') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 45 * (0.3 + k), 0, 7); glow('#ffb0b0', fxMode === 'full' ? 1.2 : 0.8, a * (fxMode === 'full' ? 0.8 : 0.45));
        } else if (f.k === 'thorn') {
          // Dornenwall: Stacheln am Schutzwall blitzen auf, Linien zu den getroffenen Schiffen
          const R0 = C.WALL_R;
          ctx.beginPath();
          for (let i = 0; i <= 18; i++) { const an = Math.PI + i * Math.PI / 18; ctx.moveTo(Math.cos(an) * R0, Math.sin(an) * R0); ctx.lineTo(Math.cos(an) * (R0 + 7 + 3 * a), Math.sin(an) * (R0 + 7 + 3 * a)); }
          glow('#ff4f6a', 1.3, a * 0.9);
          for (const p of f.pts) { const an = Math.atan2(p.y, p.x); ctx.beginPath(); ctx.moveTo(Math.cos(an) * R0, Math.sin(an) * R0); ctx.lineTo(p.x, p.y); glow('#ff8aa0', 1.6, a); }
        } else if (f.k === 'brittle') {
          // Kältebruch: Eisstern am Treffer
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(k * 2);
          ctx.beginPath(); for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * (6 + 10 * k), Math.sin(an) * (6 + 10 * k)); }
          glow('#dff8ff', 1.4, a); ctx.restore();
        } else if (f.k === 'exec') {
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(0.785);
          ctx.beginPath(); ctx.moveTo(-12 - 6 * k, 0); ctx.lineTo(12 + 6 * k, 0); ctx.moveTo(0, -12 - 6 * k); ctx.lineTo(0, 12 + 6 * k); glow('#ff3b5c', 2.2, a); ctx.restore();
        } else if (f.k === 'reflect') {
          ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(f.x, f.y); glow('#7fe3ff', 2 * a + 0.5, a);
        } else if (f.k === 'drone') {
          ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); glow(PAL.energy, 1.4, a);
        } else if (f.k === 'barrage') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 60 * Math.min(1, k * 2), 0, 7); ctx.fillStyle = `rgba(255,170,70,${0.18 * a})`; ctx.fill(); glow('#ffb347', 3 * a + 1, a);
          if (k < 0.3) { ctx.beginPath(); ctx.moveTo(f.x, f.y - 400); ctx.lineTo(f.x, f.y); glow('#ffe0a0', 3, 1 - k / 0.3); }
        } else if (f.k === 'hole') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 120 * (1 - k), 0, 7); glow('#b98aff', 1.5, a);
        } else if (f.k === 'aegis' || f.k === 'emerg') {
          ctx.beginPath(); ctx.arc(0, 0, C.WALL_R + 8 * k, Math.PI, 0); glow(f.k === 'aegis' ? '#7fe3ff' : '#ffe9a0', 4 * a + 1, a);
        } else if (f.k === 'phoenix') {
          ctx.beginPath(); ctx.arc(0, -8, 30 + 200 * k, 0, 7); ctx.fillStyle = `rgba(255,140,40,${0.25 * a})`; ctx.fill(); glow('#ffb347', 5 * a + 1, a);
        } else if (f.k === 'stun') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 6 + 14 * k, 0, 7); glow('#fff38a', 1.5, a);
        } else if (f.k === 'echo') {
          // Echo: violette Ringe laufen von der Kanone aus
          for (let i = 0; i < 3; i++) { const kk = Math.max(0, k - i * 0.15); if (kk <= 0) continue; ctx.beginPath(); ctx.arc(0, -8, 20 + kk * 160, Math.PI, 0); glow('#c3a6ff', 1.6, (1 - kk) * 0.8); }
        } else if (f.k === 'nova') {
          // Nova-Impuls: goldorange Sonnenstoß mit Strahlen (Schockwelle bleibt türkis)
          const NR = (f.r || 200) * Math.min(1, k * 1.5);
          const gr = ctx.createRadialGradient(0, -8, 0, 0, -8, Math.max(1, NR));
          gr.addColorStop(0, `rgba(255,200,90,${0.32 * a})`); gr.addColorStop(0.7, `rgba(255,120,40,${0.14 * a})`); gr.addColorStop(1, 'rgba(255,90,30,0)');
          ctx.beginPath(); ctx.moveTo(0, -8); ctx.arc(0, -8, NR, Math.PI, 0); ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
          ctx.beginPath();
          for (let i = 0; i <= 16; i++) { const an = Math.PI + (i + 0.5) * Math.PI / 17; ctx.moveTo(Math.cos(an) * NR * 0.35, -8 + Math.sin(an) * NR * 0.35); ctx.lineTo(Math.cos(an) * NR * 0.92, -8 + Math.sin(an) * NR * 0.92); }
          glow('#ffc04d', 1.5, a * 0.6);
          ctx.beginPath(); ctx.arc(0, -8, NR, Math.PI, 0); glow('#ff9a2e', 4 * a + 1.5, a);
          ctx.beginPath(); ctx.arc(0, -8, Math.max(0, NR - 6), Math.PI, 0); glow('#fff1c2', 1, a * 0.7);
        } else if (f.k === 'laserhit') {
          const bx = Math.cos(f.a) * f.d, by = Math.sin(f.a) * f.d;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(0, -8); glow('#ff4040', 10 * a + 2, a);
        } else if (f.k === 'loot') {
          const col = RAR_COL[f.drop.rar];
          ctx.globalAlpha = Math.min(1, a * 1.6); ctx.fillStyle = col; ctx.font = `700 14px ${FONT_UI()}`; ctx.textAlign = 'center';
          ctx.fillText('MODUL: ' + C.MODULES[f.drop.type].name.toUpperCase(), f.x, f.y - 40 - k * 30);
          ctx.beginPath(); ctx.arc(f.x, f.y, 10 + k * 40, 0, 7); glow(col, 2, a); ctx.globalAlpha = 1;
        } else if (f.k === 'mine' && fxMode !== 'full') {
          const R = f.r || 45;
          ctx.beginPath(); ctx.arc(f.x, f.y, R * (0.35 + 0.65 * k), 0, 7); ctx.fillStyle = `rgba(255,192,77,${0.08 * a})`; ctx.fill(); glow(PAL.energy, 1.4, a * 0.75);
        } else if (f.k === 'mine') {
          const R = f.r || 45;
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R);
          g.addColorStop(0, `rgba(255,255,235,${a})`); g.addColorStop(0.4, `rgba(255,192,77,${a * 0.6})`); g.addColorStop(1, 'rgba(255,192,77,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R * Math.min(1, 0.3 + k * 2), 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(f.x, f.y, R * (0.4 + 0.8 * k), 0, 7); glow(PAL.energy, 2.5 * a + 0.5, a);
        } else if (f.k === 'strike') {
          ctx.beginPath(); ctx.moveTo(f.x, f.y - 700); ctx.lineTo(f.x, f.y); glow('#ffffff', 7 * a, a);
          ctx.beginPath(); ctx.arc(f.x, f.y, C.STRIKE_R * (0.2 + 0.8 * Math.min(1, k * 2)), 0, 7);
          ctx.fillStyle = `rgba(255,79,154,${0.25 * a})`; ctx.fill(); glow(PAL.hostile, 3, a);
        } else if (f.k === 'bonus') {
          ctx.globalAlpha = Math.min(1, a * 1.5); ctx.fillStyle = PAL.energy;
          ctx.font = `600 14px ${FONT_NUM()}`; ctx.textAlign = 'center';
          ctx.fillText('+' + fmt(f.v) + ' Prämie', 0, -95 - k * 30); ctx.globalAlpha = 1;
        } else if (f.k === 'freeze') {
          // EMP-Welle: gezackter Ring läuft über das Feld, Blitze zu den Schiffen
          const R = 40 + 620 * Math.min(1, k * 1.6);
          ctx.beginPath();
          for (let i = 0; i <= 48; i++) { const an = Math.PI + i * Math.PI / 48, rr = R + (Math.random() - 0.5) * 14; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * rr, -10 + Math.sin(an) * rr); }
          glow(PAL.frost, 2.6, a);
          ctx.beginPath(); ctx.arc(0, -10, R * 0.85, Math.PI, 0); glow('#ffffff', 1, a * 0.4);
          if (k < 0.55) {
            let n = 0;
            for (const e of run.enemies) {
              if (n++ > 10) break;
              const p = run.pos(e); if (Math.hypot(p.x, p.y) > R) continue;
              ctx.beginPath(); ctx.moveTo(0, -10);
              const steps = 6;
              for (let j = 1; j <= steps; j++) { const q = j / steps; ctx.lineTo(p.x * q + (j < steps ? (Math.random() - 0.5) * 22 : 0), -10 + (p.y + 10) * q + (j < steps ? (Math.random() - 0.5) * 22 : 0)); }
              glow('#e8fbff', 1.3, a);
            }
          }
        } else if (f.k === 'shieldhit') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 30 + k * 10, 0, 7); glow(PAL.frost, 1.5, a * 0.7);
        } else if (f.k === 'dmg') {
          ctx.globalAlpha = a; ctx.fillStyle = f.crit ? PAL.energy : '#ffffff';
          ctx.font = `600 ${fxMode === 'full' ? (f.crit ? 13 : 11) : 11}px ${FONT_NUM()}`; ctx.textAlign = 'center';
          ctx.fillText(fmt(f.v), f.x + f.dx, f.y - 18 - k * 18); ctx.globalAlpha = 1;
        } else if (f.k === 'bossact') {
          const label = { armor: 'PANZERPLATTE AB', lance: 'LANZE ZERSTÖRT', rack: 'MINENSCHACHT ZERSTÖRT', seal: 'SIEGEL GEBROCHEN', prism: 'PRISMA ZERSPLITTERT', core: 'KERN GETROFFEN', gwing: 'SCHWINGE ZERSTÖRT', gate: 'HANGARTOR ZERSTÖRT', vent: 'SCHLOT VERSIEGELT', head: 'KOPF GETROFFEN', ink: 'TINTENWOLKE', grab: 'GREIFT DIE KANONE', grabwarn: 'GREIFARM', sweep: 'FEGT', eye: 'AUGE ZERSTÖRT', storm: 'STURMANGRIFF', heat: 'HEIZT AUF', plate: 'PANZERSCHILD', platebreak: 'PANZERSCHILD GEBROCHEN', plateheal: 'PANZERSCHILD HÄLT · HEILUNG', spores: 'SPOREN', swarm: 'SCHWARM', fireball: 'FEUERBÄLLE', lava: 'LAVAREGEN', mirror: 'SPIEGEL', pull: 'SOG', sever: 'TENTAKEL ABGETRENNT', regrow: 'TENTAKEL WÄCHST NACH', segment: 'GLIED ZERSTÖRT', split: 'ZERFÄLLT', rebirth: 'WIEDERGEBURT', broadside: 'BREITSEITE', mines: 'MINENTEPPICH', hangar: 'HANGAR ÖFFNET', phase: 'NEUE PHASE', part: 'GESCHÜTZ ZERSTÖRT', salvo: 'SALVE', spawn: 'JÄGERSTAFFEL', bomb: 'BOMBE', shield: 'SCHILD', laser: 'LASER LÄDT', broken: 'LASER ABGEBROCHEN', cloak: 'TARNUNG', bulwarks: 'SCHILDTRÄGER', nova: 'NOVA', mend: 'REPARATUR' }[f.act];
          ctx.globalAlpha = a; ctx.fillStyle = SHIP.boss; ctx.font = `700 13px ${FONT_UI()}`; ctx.textAlign = 'center';
          ctx.fillText(label, f.x, f.y - 52 - k * 10); ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
      if (ui.strikeArmed) {
        ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.arc(0, 0, s.range, Math.PI, 0); ctx.strokeStyle = PAL.hostile; ctx.globalAlpha = 0.25; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
      ctx.restore();

      // Bildschirm-Effekte
      if (frozen) {
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
        g.addColorStop(0, 'rgba(159,232,255,0)'); g.addColorStop(1, 'rgba(159,232,255,0.22)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      if (run.overActive) {
        const g = ctx.createLinearGradient(0, H, 0, H * 0.55);
        g.addColorStop(0, 'rgba(255,138,61,0.16)'); g.addColorStop(1, 'rgba(255,138,61,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      for (const f of fx) {
        const k = f.t / f.life;
        if (f.k === 'hurt') {
          const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
          g.addColorStop(0, 'rgba(255,79,154,0)'); g.addColorStop(1, `rgba(255,79,154,${0.22 * (1 - k)})`);
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        } else if (f.k === 'freeze' || f.k === 'over') {
          ctx.fillStyle = f.k === 'freeze' ? `rgba(220,248,255,${(k < 0.08 ? 0.7 : 0.3) * (1 - k)})` : `rgba(255,138,61,${0.22 * (1 - k)})`;
          ctx.fillRect(0, 0, W, H);
        } else if (f.k === 'lordwin') {
          // Erster Herrscher besiegt: große Einblendung
          ctx.globalAlpha = Math.min(1, (1 - k) * 2.5); ctx.textAlign = 'center'; ctx.fillStyle = PAL.energy;
          ctx.font = `800 ${Math.round(Math.min(W, H) * 0.07)}px ${FONT_UI()}`;
          ctx.fillText('HERRSCHER BESIEGT', W / 2, H * 0.3 - k * 10);
          ctx.font = `600 ${Math.round(Math.min(W, H) * 0.036)}px ${FONT_UI()}`; ctx.fillStyle = PAL.dim;
          ctx.fillText(f.first ? 'Archiv freigeschaltet · Herrscherkern' : 'Herrscherkern: doppelte Fragmente', W / 2, H * 0.3 + Math.min(W, H) * 0.06 - k * 10);
          ctx.globalAlpha = 1;
        } else if (f.k === 'leap' || f.k === 'rush') {
          // Wellensprung / Durchmarsch: große Einblendung in der Bildmitte
          ctx.globalAlpha = Math.min(1, (1 - k) * 2.2); ctx.textAlign = 'center';
          ctx.fillStyle = f.k === 'leap' ? PAL.energy : f.on ? PAL.heal : PAL.dim;
          ctx.font = `800 ${Math.round(Math.min(W, H) * (f.k === 'leap' ? 0.075 : 0.05))}px ${FONT_UI()}`;
          ctx.fillText(f.k === 'leap' ? 'WELLENSPRUNG' : f.on ? 'DURCHMARSCH' : 'DURCHMARSCH ENDET', W / 2, H * 0.32 - k * 12);
          ctx.font = `600 ${Math.round(Math.min(W, H) * 0.036)}px ${FONT_UI()}`; ctx.fillStyle = PAL.dim;
          ctx.fillText(f.k === 'leap' ? `Welle ${f.from} → ${f.to}` : f.on ? 'Mühelos: Wellen kommen gestaucht' : !f.why ? 'Ab hier wieder normal' : f.why.why === 'hull' ? `Welle ${f.why.w}: Hülle nur noch ${f.why.hp} %` : f.why.why === 'field' ? `Welle ${f.why.w}: Schiffe blieben in Reichweite` : `Welle ${f.why.w}: ${f.why.boss || 'Boss'} hielt ${f.why.dur} s`, W / 2, H * 0.32 + Math.min(W, H) * 0.06 - k * 12);
          ctx.globalAlpha = 1;
        } else if (f.k === 'wave') {
          ctx.globalAlpha = Math.min(1, (1 - k) * 2);
          ctx.fillStyle = f.boss ? SHIP.boss : PAL.core; ctx.textAlign = 'center';
          ctx.font = `700 ${Math.round(Math.min(W, H) * 0.08)}px ${FONT_UI()}`;
          ctx.fillText(f.boss ? (f.bossName || 'Boss').toUpperCase() : 'WELLE ' + f.w, W / 2, H * 0.4 - k * 10);
          if (f.kind && !f.sector) { ctx.font = `600 ${Math.round(Math.min(W, H) * 0.04)}px ${FONT_UI()}`; ctx.fillStyle = f.kind === 'Schwarm' ? '#ffb066' : f.kind === 'Panzerverband' ? '#ff8a8a' : '#e0ff6b'; ctx.fillText(f.kind.toUpperCase(), W / 2, H * 0.4 + Math.min(W, H) * 0.06 - k * 10); }
          if (f.sector) { ctx.font = `600 ${Math.round(Math.min(W, H) * 0.04)}px ${FONT_UI()}`; ctx.fillStyle = BIOME[f.sector.n - 1].star; ctx.fillText('SEKTOR ' + f.sector.n + ' · ' + f.sector.name.toUpperCase() + (f.cycle > 1 ? ' · ZYKLUS ' + C.cycleName(f.cycle) : ''), W / 2, H * 0.4 + Math.min(W, H) * 0.06 - k * 10); }
          if (f.sector && f.anom) { ctx.font = `600 ${Math.round(Math.min(W, H) * 0.032)}px ${FONT_UI()}`; ctx.fillStyle = '#b9a6ff'; ctx.fillText('ANOMALIE: ' + f.anom.toUpperCase(), W / 2, H * 0.4 + Math.min(W, H) * 0.11 - k * 10); }
          ctx.globalAlpha = 1;
        }
      }
      // „… besiegen“ steht nicht mehr im Feld: die Bossleiste oben zeigt den Boss
    }

    // Statischer Hintergrund je Sektor (Planeten usw.), einmal pro Größe/Sektor vorgezeichnet
    let bgCache = null, bgKey = '';
    function drawBackdrop(sec) {
      const key = sec + ':' + Math.round(W) + 'x' + Math.round(H);
      if (key !== bgKey) {
        bgKey = key; bgCache = document.createElement('canvas');
        bgCache.width = Math.max(1, Math.round(W * DPR)); bgCache.height = Math.max(1, Math.round(H * DPR));
        const g = bgCache.getContext('2d'); g.scale(DPR, DPR); paintBackdrop(g, sec);
      }
      ctx.drawImage(bgCache, 0, 0, W, H);
    }
    function planet(g, x, y, r, c1, c2, rim) {
      const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = gr; g.fill();
      if (rim) { const a = g.createRadialGradient(x, y, r * 0.95, x, y, r * 1.25); a.addColorStop(0, rim); a.addColorStop(1, 'rgba(0,0,0,0)'); g.beginPath(); g.arc(x, y, r * 1.25, 0, 7); g.fillStyle = a; g.fill(); }
    }
    function paintBackdrop(g, sec) {
      const m = Math.min(W, H);
      if (sec === 1) {
        // Gasriese mit Ringen, kleiner Mond, ferne Galaxie
        const x = W * 0.86, y = H * 0.14, r = m * 0.2;
        g.save(); g.translate(x, y); g.rotate(-0.35);
        g.beginPath(); g.ellipse(0, 0, r * 1.9, r * 0.38, 0, Math.PI, 0); g.strokeStyle = 'rgba(200,170,255,0.35)'; g.lineWidth = r * 0.12; g.stroke(); g.restore();
        planet(g, x, y, r, 'rgba(150,110,230,0.75)', 'rgba(40,25,90,0.75)', 'rgba(170,140,255,0.25)');
        for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(x, y + i * r * 0.28, r * 0.97, r * 0.06, 0, 0, 7); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fill(); }
        g.save(); g.translate(x, y); g.rotate(-0.35); g.beginPath(); g.ellipse(0, 0, r * 1.9, r * 0.38, 0, 0, Math.PI); g.strokeStyle = 'rgba(200,170,255,0.4)'; g.lineWidth = r * 0.12; g.stroke(); g.restore();
        planet(g, W * 0.12, H * 0.3, m * 0.035, 'rgba(210,200,240,0.7)', 'rgba(70,60,110,0.7)');
        const gx = W * 0.3, gy = H * 0.12; const gg = g.createRadialGradient(gx, gy, 0, gx, gy, m * 0.12); gg.addColorStop(0, 'rgba(255,200,255,0.18)'); gg.addColorStop(1, 'rgba(255,200,255,0)'); g.fillStyle = gg; g.beginPath(); g.ellipse(gx, gy, m * 0.14, m * 0.05, 0.4, 0, 7); g.fill();
      } else if (sec === 2) {
        // Eisplanet mit grünem Leuchten, Kristallsplitter
        planet(g, W * 0.15, H * 0.16, m * 0.16, 'rgba(160,255,230,0.7)', 'rgba(10,70,70,0.75)', 'rgba(80,255,200,0.3)');
        // Eisbrocken: unregelmäßig, matt, mit hellem Rand oben
        for (let i = 0; i < 8; i++) {
          const x = W * (0.3 + 0.65 * ((i * 37) % 100) / 100), y = H * (0.06 + 0.45 * ((i * 53) % 100) / 100), r = 4 + (i % 3) * 4;
          g.save(); g.translate(x, y); g.rotate(i * 1.3); g.beginPath();
          for (let j = 0; j < 7; j++) { const an = j / 7 * 6.28, rr = r * (0.7 + 0.3 * Math.sin(i * 3.1 + j * 2.3)); g[j ? 'lineTo' : 'moveTo'](Math.cos(an) * rr, Math.sin(an) * rr); }
          g.closePath(); g.fillStyle = 'rgba(12,45,45,0.9)'; g.fill(); g.strokeStyle = 'rgba(150,240,220,0.3)'; g.lineWidth = 1; g.stroke(); g.restore();
        }
      } else if (sec === 3) {
        // Glühender Planet mit Lavaadern, Asteroidengürtel
        const x = W * 0.82, y = H * 0.2, r = m * 0.17;
        planet(g, x, y, r, 'rgba(255,140,60,0.8)', 'rgba(90,20,5,0.85)', 'rgba(255,120,40,0.35)');
        g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
        g.strokeStyle = 'rgba(255,220,120,0.5)'; g.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x - r + i * r * 0.35, y - r); g.quadraticCurveTo(x - r * 0.2 + i * 10, y, x - r * 0.6 + i * r * 0.4, y + r); g.stroke(); }
        g.restore();
        g.fillStyle = 'rgba(255,150,80,0.06)'; g.save(); g.translate(W / 2, H * 0.45); g.rotate(-0.25); g.fillRect(-W, -m * 0.08, W * 2, m * 0.16); g.restore();
      } else if (sec === 4) {
        // Roter Riese mit Korona, Trümmer-Silhouetten
        const x = W * 0.2, y = H * 0.15, r = m * 0.26;
        const co = g.createRadialGradient(x, y, r * 0.5, x, y, r * 2.4); co.addColorStop(0, 'rgba(255,90,50,0.5)'); co.addColorStop(0.4, 'rgba(255,40,60,0.15)'); co.addColorStop(1, 'rgba(255,40,60,0)'); g.fillStyle = co; g.fillRect(0, 0, W, H);
        planet(g, x, y, r * 0.6, 'rgba(255,180,120,0.9)', 'rgba(200,40,30,0.85)');
        g.fillStyle = 'rgba(20,4,10,0.9)';
        for (let i = 0; i < 6; i++) { const dx = W * (0.4 + 0.1 * i), dy = H * (0.08 + 0.05 * (i % 3)); g.save(); g.translate(dx, dy); g.rotate(i); g.fillRect(-6 - i, -2, 12 + i * 2, 4); g.fillRect(-2, -5, 4, 10); g.restore(); }
      } else if (sec === 5) {
        // Schwarzes Loch mit Akkretionsscheibe
        const x = W * 0.5, y = H * 0.2, r = m * 0.07;
        const halo = g.createRadialGradient(x, y, r, x, y, r * 6); halo.addColorStop(0, 'rgba(160,190,255,0.25)'); halo.addColorStop(1, 'rgba(160,190,255,0)'); g.fillStyle = halo; g.fillRect(0, 0, W, H);
        g.save(); g.translate(x, y); g.scale(1, 0.32);
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(0, 0, r * (1.8 + i * 0.6), 0, 7); g.strokeStyle = `rgba(${200 + i * 10},${190 - i * 20},255,${0.45 - i * 0.09})`; g.lineWidth = r * 0.35; g.stroke(); }
        g.restore();
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = '#000'; g.fill(); g.strokeStyle = 'rgba(220,230,255,0.8)'; g.lineWidth = 1.5; g.stroke();
      }
    }

    // Biom-Hintergrund: Nebel, Asteroiden, roter Riese, Leere
    function drawBiome(sec, t, B) {
      if (sec === 2) {
        for (const c of clouds) {
          const x = ((c.x + t * 0.00001 * c.v * 100) % 1.4 - 0.2) * W, y = c.y * H, r = c.r * Math.max(W, H);
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(60,220,170,0.10)'); g.addColorStop(1, 'rgba(60,220,170,0)');
          ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
      } else if (sec === 3) {
        for (const a of rocks) {
          const x = ((a.x + t * 0.00001 * a.v * 60) % 1.2 - 0.1) * W, y = a.y * H;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a.rot + t * 0.0002 * a.v * 40);
          ctx.beginPath(); for (let i = 0; i < a.n; i++) { const an = i / a.n * 6.28, rr = a.r * (0.7 + 0.3 * Math.sin(a.seed * 10 + i * 2.3)); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * rr, Math.sin(an) * rr); } ctx.closePath();
          ctx.fillStyle = '#2a1a12'; ctx.fill(); ctx.strokeStyle = 'rgba(255,150,80,0.45)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
        }
      } else if (sec === 4 && false) {
        const x = W * 0.18, y = H * 0.16, r = Math.min(W, H) * 0.22;
        const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.2);
        g.addColorStop(0, 'rgba(255,90,60,0.55)'); g.addColorStop(0.35, 'rgba(255,60,60,0.18)'); g.addColorStop(1, 'rgba(255,40,60,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, 7); ctx.fillStyle = 'rgba(255,120,80,0.35)'; ctx.fill();
      } else if (sec === 4) {
        // Sonneneruptionen
        const x = W * 0.2, y = H * 0.15, r = Math.min(W, H) * 0.16;
        for (let i = 0; i < 3; i++) { const a = t * 0.0002 + i * 2.1, k = (Math.sin(t * 0.001 + i) + 1) / 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * (0.2 + 0.25 * k), a - 1, a + 1); ctx.strokeStyle = `rgba(255,140,80,${0.25 * k})`; ctx.lineWidth = 3; ctx.stroke(); }
      } else if (sec === 5) {
        // Scheibe rotiert: helle Punkte auf der Bahn
        const x = W * 0.5, y = H * 0.2, r = Math.min(W, H) * 0.07;
        for (let i = 0; i < 6; i++) { const a = t * 0.0008 + i * 1.05; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 2.4, y + Math.sin(a) * r * 2.4 * 0.32, 1.6, 0, 7); ctx.fillStyle = 'rgba(230,235,255,0.8)'; ctx.fill(); }
        for (let i = 0; i < 3; i++) {
          const r = ((t * 0.00004 + i / 3) % 1) * Math.max(W, H);
          ctx.beginPath(); ctx.arc(W / 2, H * 0.3, r, 0, 7); ctx.strokeStyle = `rgba(150,180,255,${0.08 * (1 - r / Math.max(W, H))})`; ctx.lineWidth = 2; ctx.stroke();
        }
      }
    }
    // Schutzwall: zeigt die Hülle; Segmente brechen weg, je weniger Strukturpunkte übrig sind
    function drawWall(run, t) {
      const R = C.WALL_R, k = Math.max(0, run.hp / run.s.maxHp), segs = 16;
      const col = k > 0.6 ? PAL.core : k > 0.3 ? PAL.energy : PAL.hostile;
      const broken = Math.round((1 - k) * segs * 0.6), plating = run.s.mod && run.s.mod.plating;
      ctx.lineCap = 'butt';
      for (let i = 0; i < segs; i++) {
        const a0 = Math.PI + (i / segs) * Math.PI + 0.012, a1 = Math.PI + ((i + 1) / segs) * Math.PI - 0.012;
        // gebrochene Segmente verteilt über den Bogen
        const isBroken = broken > 0 && ((i * 7) % segs) < broken;
        ctx.beginPath(); ctx.arc(0, 0, R, a0, a1);
        if (isBroken) { ctx.strokeStyle = 'rgba(120,110,170,0.25)'; ctx.lineWidth = 3; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]); continue; }
        ctx.strokeStyle = HULL; ctx.lineWidth = 7; ctx.stroke();
        const flick = k < 0.25 ? 0.5 + 0.5 * Math.sin(t * 0.03 + i) : 1;
        glow(col, 1.8, (0.55 + 0.45 * k) * flick);
        if (plating && i % 2 === 0) { const am = (a0 + a1) / 2; ctx.save(); ctx.translate(Math.cos(am) * R, Math.sin(am) * R); hexPath(3.2, am); ctx.strokeStyle = '#ffe2a8'; ctx.globalAlpha = 0.8; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1; }
      }
      ctx.lineCap = 'round';
    }
    // Ausgerüstete Module als kleine Anbauten an der Kanone
    function drawModulePods(run, t) {
      const eq = (run.meta.equip || []).filter(id => run.meta.modules && run.meta.modules[id]);
      const spots = [[-22, 24], [22, 24], [0, 27]];
      eq.slice(0, 3).forEach((id, i) => {
        const m = run.meta.modules[id], [x, y] = spots[i], col = RAR_COL[m.rar];
        ctx.save(); ctx.translate(x, y);
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); fillHull(); glow(col, 1.3, 0.7 + 0.3 * Math.sin(t * 0.004 + i * 2));
        ctx.scale(0.5, 0.5); ctx.translate(-12, -12);
        ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(ICON_PATH[id]);
        ctx.restore();
      });
    }
    // Scanner: Radarstrahl im Feld
    function drawScanner(run, t) {
      if (!(run.s.mod && run.s.mod.scanner)) return;
      const a = Math.PI + ((t * 0.0012) % 1) * Math.PI;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(Math.cos(a) * run.s.range, Math.sin(a) * run.s.range);
      ctx.strokeStyle = 'rgba(62,240,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Nebenkanonen links (Raketen) und rechts (Kryo)
    function drawSideGuns(run, t) {
      const L = id => run.L(id);
      if (L('rocket') > 0) {
        ctx.save(); ctx.translate(-40, 4);
        ctx.beginPath(); ctx.rect(-9, -10, 18, 18); fillHull(); glow(PAL.heat, 1.4);
        for (const dx of [-4, 4]) { ctx.beginPath(); ctx.rect(dx - 2.5, -20, 5, 11); fillHull(); glow(PAL.heat, 1.1); }
        ctx.beginPath(); ctx.arc(0, -1, 2, 0, 7); ctx.fillStyle = PAL.heat; ctx.globalAlpha = 0.5 + 0.5 * Math.min(1, run.rocketT / (run.s.rocketCd || 1)); ctx.fill(); ctx.globalAlpha = 1;
        ctx.restore();
      }
      if (L('cryo') > 0) {
        ctx.save(); ctx.translate(40, 4);
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); fillHull(); glow(PAL.frost, 1.4);
        ctx.beginPath(); ctx.rect(-2.5, -22, 5, 14); fillHull(); glow(PAL.frost, 1.2);
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-5, -10 - i * 4); ctx.lineTo(5, -12 - i * 4); glow(PAL.frost, 0.8, 0.7); }
        ctx.restore();
      }
    }

    function drawMine(m, t, s, run) {
      const armed = m.arm <= 0;
      if (m.fly) {
        // fliegende Mine: kleiner Glutkern mit Schweif
        const tg = run.enemies.find(e => e.id === m.tid);
        const a = tg ? Math.atan2(run.pos(tg).y - m.y, run.pos(tg).x - m.x) : 0;
        ctx.save(); ctx.translate(m.x, m.y);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-Math.cos(a) * 26, -Math.sin(a) * 26); glow(PAL.energy, 3, 0.5);
        ctx.rotate(t * 0.02); hexPath(7, 0); fillHull(); glow('#ffffff', 1.6);
        ctx.restore(); return;
      }
      const warn = armed && m.age > 8 && Math.floor(t / 120) % 2 === 0;
      ctx.save(); ctx.translate(m.x, m.y);
      if (warn) { ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); glow('#ffffff', 1.5, 0.7); }
      // Auslöseradius (gestrichelt) und Wirkradius (sehr dezent)
      const near = fxMode === 'full' || run.enemies.some(e => { const q = run.pos(e); return Math.hypot(q.x - m.x, q.y - m.y) < s.mineTrig + e.r + 40; });
      if (armed && fxMode === 'full') { ctx.beginPath(); ctx.arc(0, 0, s.mineBlast, 0, 7); ctx.strokeStyle = PAL.energy; ctx.globalAlpha = 0.08; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; }
      if (near) {
        ctx.setLineDash([2, 5]);
        ctx.beginPath(); ctx.arc(0, 0, s.mineTrig + 6, 0, 7);
        ctx.strokeStyle = PAL.energy; ctx.globalAlpha = armed ? 0.55 : 0.2; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
      // Körper: Sechseck mit Zacken
      const spin = t * 0.0015 + m.x;
      ctx.rotate(spin);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7); ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); }
      glow(PAL.energy, 1.4, 0.9);
      hexPath(8, 0); fillHull(); glow(PAL.energy, 1.5);
      ctx.rotate(-spin);
      const blink = armed ? (Math.sin(t * 0.012 + m.x) > 0.2 ? 1 : 0.25) : 0.3;
      ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, 7);
      ctx.fillStyle = armed ? '#ff3b3b' : PAL.energy; ctx.globalAlpha = blink; ctx.fill();
      if (armed && blink > 0.5) { ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fillStyle = 'rgba(255,59,59,.25)'; ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Großansicht für das Labor: nur die Kanone, Turm schwenkt langsam
    // Porträt für das Kompendium: ein Schiff (oder der Körper eines Riesen) mittig in w×h CSS-Pixeln
    // Umriss eines Riesenkörpers einmal ausmessen (Pixel mit Deckung), damit das Porträt ihn ganz zeigt
    const gBox = {};
    function giantBox(g, col, t) {
      if (gBox[g.kind]) return gBox[g.kind];
      const S = 900, k = 0.5; cv.width = S; cv.height = S;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, S, S); ctx.setTransform(k, 0, 0, k, S / 2, S / 2);
      drawGiantBody(g, 0, 0, col, t);
      const d = ctx.getImageData(0, 0, S, S).data; let x0 = S, y0 = S, x1 = 0, y1 = 0;
      for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (d[(y * S + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 <= x0) { x0 = 0; y0 = 0; x1 = S; y1 = S; }
      return (gBox[g.kind] = { cx: ((x0 + x1) / 2 - S / 2) / k, cy: ((y0 + y1) / 2 - S / 2) / k, w: (x1 - x0) / k, h: (y1 - y0) / k });
    }
    function portrait(e, t, w, h) {
      const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, ch);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      try {
        if (e.giant) {
          const g = Object.assign({ phase: 0, flash: 0 }, e), col = BOSS_COL[(e.sector || 1) - 1], B = giantBox(g, col, t);
          if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, ch);
          const k = Math.min(w / B.w, h / B.h) * 0.94;
          ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (w / 2 - k * B.cx), dpr * (h / 2 - k * B.cy));
          drawGiantBody(g, 0, 0, col, t);
        } else {
          const k = Math.min(w, h) / (e.r * (e.type === 'boss' ? 3.6 : 4.2));
          ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * w / 2, dpr * h / 2); ctx.rotate(Math.PI / 2);
          drawShip(e, t, false);
        }
      } catch (err) { /* Porträt ist Zierde */ }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    }
    function preview(run, t) {
      const r = cv.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
      if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, ch);
      const k = Math.min(r.width / 170, r.height / 120) / RIG * 0.95;
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * r.width / 2, dpr * (r.height * 0.72));
      // Boden und Rasterbogen
      ctx.beginPath(); ctx.moveTo(-90, 24); ctx.lineTo(90, 24); ctx.strokeStyle = PAL.line; ctx.lineWidth = 1; ctx.stroke();
      for (const rr of [60, 90]) { ctx.beginPath(); ctx.arc(0, 0, rr, Math.PI, 0); ctx.strokeStyle = PAL.line; ctx.globalAlpha = 0.35; ctx.stroke(); ctx.globalAlpha = 1; }
      const aim0 = run.aim; run.aim = -Math.PI / 2 + Math.sin(t * 0.0006) * 0.55;
      const ph = (t * 0.0012) % 1; recoil = Math.max(0, 1 - ph * 5); flash = Math.max(0, 0.35 - ph * 3);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      drawRig(run, t);
      run.aim = aim0; parts.length = 0;
    }

    return { resize, toWorld, pushFx, step, draw, clear, view, preview, portrait, cannonLook, setDmgNums: v => { dmgNums = v; }, setFxMode: v => { fxMode = v || 'clear'; } };
  }

  // Zahlenformat (de)
  // Kurzschreibweise wie in Idle-Spielen üblich: Tausend, Million, Billion (B), Trillion (T), Quadrillion (Qa), Quintillion (Qu) …
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qu', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td'];
  let NUMFMT = 'short';
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1).replace('.', ',') : String(Math.floor(n));
    if (NUMFMT === 'sci' && n >= 1e6) return n.toExponential(2).replace('.', ',').replace('e+', 'e');
    let i = 0; while (n >= 1000 && i < SUF.length - 1) { n /= 1000; i++; }
    if (n >= 1000) return n.toExponential(2).replace('.', ',').replace('e+', 'e');
    return (n < 100 ? n.toFixed(1) : Math.floor(n).toString()).replace('.', ',') + ' ' + SUF[i];
  }

  // Modul-Icons als SVG-Pfade (24er Raster); Canvas nutzt sie über Path2D
  const ICONS = {
    chain: 'M13 2 L5 13 h6 l-2 9 L19 10 h-6 z',
    splinter: 'M12 2 v6 M12 16 v6 M2 12 h6 M16 12 h6 M5 5 l4 4 M15 15 l4 4 M19 5 l-4 4 M9 15 l-4 4',
    cryoammo: 'M12 2 v20 M3.3 7 l17.4 10 M3.3 17 l17.4 -10 M9 3.5 l3 2 l3 -2 M9 20.5 l3 -2 l3 2',
    scanner: 'M3 12 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M12 1 v7 M12 16 v7 M1 12 h7 M16 12 h7',
    overcharge: 'M3 12 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M13 5 l-5 8 h4 l-1 6 l5 -8 h-4 z',
    plating: 'M12 2 l8.66 5 v10 L12 22 L3.34 17 V7 z M12 7 l4.33 2.5 v5 L12 17 l-4.33 -2.5 v-5 z',
    leech: 'M12 3 C12 3 5 11 5 15 a7 7 0 0 0 14 0 C19 11 12 3 12 3 z M9 15 h6 M12 12 v6',
    nova: 'M7 12 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M12 1 v3 M12 20 v3 M1 12 h3 M20 12 h3 M4.2 4.2 l2.1 2.1 M17.7 17.7 l2.1 2.1 M19.8 4.2 l-2.1 2.1 M6.3 17.7 l-2.1 2.1',
    echo: 'M10 12 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M7 7 a7 7 0 0 0 0 10 M17 7 a7 7 0 0 1 0 10 M4 4 a11 11 0 0 0 0 16 M20 4 a11 11 0 0 1 0 16',
    crysmod: 'M12 2 L20 10 L12 22 L4 10 z M4 10 h16 M9 2.5 L8 10 L12 22 M15 2.5 L16 10 L12 22',
  };
  const RAR_COL = ['#a39ed0', '#3ef0ff', '#c3a6ff', '#ffc04d'];
  function iconSvg(type, rar, size) {
    const c = rar == null ? '#6e6a99' : RAR_COL[rar];
    return `<svg class="mi" width="${size || 22}" height="${size || 22}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${ICONS[type]}"/></svg>`;
  }

  root.KWRender = { create, fmt, ICONS, iconSvg, RAR_COL, setNumFmt: v => { NUMFMT = v; } };
})(window);
