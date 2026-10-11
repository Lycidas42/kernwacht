// Kernwacht – Zeichnen (Canvas 2D)
(function (root) {
  'use strict';
  const C = root.Core;

  function create(cv) {
    const ctx = cv.getContext('2d');
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
    const SHIP = { grunt: '#ff4f9a', runner: '#ff9447', brute: '#ff5a5a', shooter: '#c9ff4f', boss: '#ff4ff0', bomb: '#ffdd55' };
    const HULL = '#0d0b22';
    const FONT_NUM = () => col('--font-num'), FONT_UI = () => col('--font-ui');
    const stars = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3, p: Math.random() * 6 }));
    const LIFE = { bonus: 1.4, boom: 0.55, shock: 0.6, mine: 0.6, dmg: 0.7, hurt: 0.25, wave: 1.8, strike: 0.7, freeze: 0.8, over: 0.6, bossact: 0.8, shieldhit: 0.25, mark: 0.5 };

    function resize() {
      const r = cv.getBoundingClientRect();
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      view.s = Math.min(W / 500, (H - 110) / 440);
      view.cx = W / 2; view.cy = H - 48 - 32 * view.s;
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
      const c = e.flash > 0 ? '#ffffff' : frozen ? PAL.frost : SHIP[e.type], r = e.r, sd = e.seed;
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
      } else {
        // Mutterschiff
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

    // ---------- Kanone: Form folgt den Upgrades ----------
    function drawCannon(run, t) {
      const s = run.s, L = id => run.L(id);
      const hpL = L('hp'), arL = L('armor'), rgL = L('regen'), dmgL = L('dmg');
      const over = run.overActive;
      const coreCol = over ? PAL.heat : PAL.core;
      const w = 34 + Math.min(16, hpL * 0.25);
      ctx.save(); ctx.scale(1.3, 1.3);

      // Schutzkuppel (Panzerung)
      if (arL > 0) {
        ctx.beginPath(); ctx.arc(0, 4, w + 16, Math.PI, 0);
        const g = ctx.createRadialGradient(0, 4, w, 0, 4, w + 16);
        g.addColorStop(0, 'rgba(62,240,255,0)'); g.addColorStop(1, 'rgba(62,240,255,' + (0.06 + s.armor * 0.22) + ')');
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 4, w + 16, Math.PI, 0); glow(PAL.core, 0.8 + s.armor * 2.2, 0.3 + s.armor * 0.7);
        // Wabenmuster als Andeutung
        ctx.globalAlpha = 0.18 + s.armor * 0.4;
        for (let i = 0; i < 7; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 7; ctx.save(); ctx.translate(Math.cos(a) * (w + 8), 4 + Math.sin(a) * (w + 8)); hexPath(4, 0); ctx.strokeStyle = PAL.core; ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
        ctx.globalAlpha = 1;
      }

      // Fundament mit Stützbeinen
      ctx.lineJoin = 'round';
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx * w * 0.55, 10); ctx.lineTo(sx * (w + 10), 24); ctx.lineTo(sx * (w + 2), 24);
        glow(PAL.core, 1.6, 0.8);
      }
      ctx.beginPath();
      ctx.moveTo(-w, 22); ctx.lineTo(-w * 0.86, 2); ctx.lineTo(-w * 0.55, -8); ctx.lineTo(w * 0.55, -8); ctx.lineTo(w * 0.86, 2); ctx.lineTo(w, 22); ctx.closePath();
      fillHull(); glow(PAL.core, 1.8);
      // Panzerplatten
      const plates = Math.min(6, Math.ceil(arL / 6));
      for (let i = 0; i < plates; i++) {
        const x = -w * 0.72 + (i + 0.5) * (w * 1.44 / plates);
        ctx.beginPath(); ctx.rect(x - 4, 10, 8, 6); ctx.fillStyle = 'rgba(62,240,255,.18)'; ctx.fill(); glow(PAL.core, 1, 0.8);
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
      const len = 34 + Math.min(40, L('range') * 1.1);
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
        g.addColorStop(0, over ? '#fff1d6' : '#ffffff'); g.addColorStop(1, 'rgba(62,240,255,0)');
        ctx.fillStyle = g; ctx.globalAlpha = 0.25 + Math.min(0.5, dmgL * 0.008) + heat * 0.3;
        ctx.fillRect(ox - thick * 0.18, -ln + bk + 4, thick * 0.36, ln - 14); ctx.globalAlpha = 1;
        // Kühlrippen (Feuerrate)
        const fins = Math.min(6, Math.ceil(L('rate') / 4));
        for (let f = 0; f < fins; f++) { const y = -14 - f * 5 + bk; ctx.beginPath(); ctx.moveTo(ox - thick * 0.95, y); ctx.lineTo(ox + thick * 0.95, y); glow(over ? PAL.heat : PAL.core, 1, 0.65); }
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
      // Turmkörper
      ctx.beginPath(); ctx.moveTo(-15, 8); ctx.lineTo(-17, -6); ctx.lineTo(-9, -16); ctx.lineTo(9, -16); ctx.lineTo(17, -6); ctx.lineTo(15, 8); ctx.closePath();
      fillHull(); glow(run.hp / s.maxHp < 0.3 ? PAL.hostile : coreCol, 2);
      ctx.restore();
      // Kern
      ctx.beginPath(); ctx.arc(0, -6, 7, 0, 7); fillHull(); glow(coreCol, 1.6);
      const pulse = 3 + 1.2 * Math.sin(t * 0.008);
      ctx.beginPath(); ctx.arc(0, -6, pulse, 0, 7); ctx.fillStyle = coreCol; ctx.fill();
      ctx.restore();
      if (over && Math.random() < 0.5) parts.push({ x: (Math.random() - 0.5) * 20, y: -20, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 40, life: 0.5, t: 0, c: PAL.heat, k: 'spark' });
    }

    // ---------- Effekte ----------
    function pushFx(f) {
      f.life = LIFE[f.k] || 0.5;
      if (f.k === 'dmg') f.dx = (Math.random() - 0.5) * 16;
      if (f.k === 'boom') boom(f);
      if (f.k === 'mine') mineBoom(f);
      if (f.k === 'strike') shake = Math.max(shake, 0.35);
      fx.push(f);
    }
    function boom(f) {
      const big = f.type === 'boss' ? 3.4 : f.type === 'brute' ? 1.6 : f.type === 'bomb' ? 2 : 1;
      const c = SHIP[f.type] || PAL.energy;
      for (let i = 0; i < 14 * big; i++) { const a = Math.random() * 6.28, v = (40 + Math.random() * 120) * Math.sqrt(big); parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.4, t: 0, c: Math.random() < 0.4 ? '#fff3c4' : c, k: 'spark' }); }
      for (let i = 0; i < 4 * big; i++) { const a = Math.random() * 6.28, v = 20 + Math.random() * 60; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.5, t: 0, c, k: 'shard', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, sz: (f.r || 8) * (0.4 + Math.random() * 0.5) }); }
      if (f.type === 'boss') shake = 0.6;
      if (f.type === 'bomb') shake = Math.max(shake, 0.3);
    }
    function mineBoom(f) {
      for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 160; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3 + Math.random() * 0.35, t: 0, c: Math.random() < 0.5 ? '#fff3c4' : PAL.energy, k: 'spark' }); }
      for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, v = 10 + Math.random() * 25; parts.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: 0.9 + Math.random() * 0.5, t: 0, c: '#7a6aa8', k: 'smoke', sz: 8 + Math.random() * 10 }); }
      shake = Math.max(shake, 0.12);
    }
    function step(dt, live, run) {
      if (run && run.shots !== lastShots) { lastShots = run.shots; recoil = 1; flash = 1; }
      recoil = Math.max(0, recoil - dt * 8); flash = Math.max(0, flash - dt * 10);
      const fdt = live ? dt : 0;
      for (const f of fx) f.t += fdt;
      for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t >= fx[i].life) fx.splice(i, 1);
      if (fx.length > 260) fx.splice(0, fx.length - 260);
      for (const p of parts) { p.t += fdt; p.x += p.vx * fdt; p.y += p.vy * fdt; const dr = p.k === 'smoke' ? 1.2 : 2.5; p.vx *= 1 - dr * fdt; p.vy *= 1 - dr * fdt; if (p.rot != null) p.rot += p.vr * fdt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t >= parts[i].life) parts.splice(i, 1);
      if (parts.length > 800) parts.splice(0, parts.length - 800);
    }
    function clear() { fx.length = 0; parts.length = 0; }

    // ---------- Szene ----------
    function draw(t, dt, run, ui) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, PAL.sky); bg.addColorStop(1, PAL.void);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (const st of stars) { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 0.001 + st.p); ctx.fillStyle = '#d9d4ff'; ctx.fillRect(st.x * W, st.y * H, st.r, st.r); }
      ctx.globalAlpha = 1;

      let sx = 0, sy = 0;
      if (shake > 0) { sx = (Math.random() - 0.5) * shake * 14; sy = (Math.random() - 0.5) * shake * 14; shake = Math.max(0, shake - dt); }
      ctx.save(); ctx.translate(view.cx + sx, view.cy + sy); ctx.scale(view.s, view.s);

      // Peilraster und Boden
      ctx.lineWidth = 1 / view.s; ctx.strokeStyle = PAL.line; ctx.globalAlpha = 0.6;
      for (let r = 100; r <= 500; r += 100) { ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.stroke(); }
      for (let i = 1; i < 6; i++) { const a = Math.PI + i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 50, Math.sin(a) * 50); ctx.lineTo(Math.cos(a) * 520, Math.sin(a) * 520); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(-600, 31); ctx.lineTo(600, 31); ctx.strokeStyle = PAL.line; ctx.lineWidth = 1.5; ctx.stroke();
      if (!run) { ctx.restore(); return; }
      const s = run.s, frozen = run.frozen;

      // Reichweite: goldener Bogen
      ctx.beginPath(); ctx.arc(0, 0, s.range, Math.PI, 0);
      ctx.fillStyle = 'rgba(255,209,102,0.05)'; ctx.fill();
      ctx.setLineDash([10, 7]); ctx.lineDashOffset = -t * 0.012;
      ctx.beginPath(); ctx.arc(0, 0, s.range, Math.PI, 0); glow(PAL.range, 2, 0.9);
      ctx.setLineDash([]);

      // Klingenbahn
      if (s.blades) {
        ctx.beginPath(); ctx.arc(0, 0, s.bladeR, -Math.PI / 2 - 1.35, -Math.PI / 2 + 1.35);
        ctx.setLineDash([3, 6]); ctx.strokeStyle = PAL.heal; ctx.globalAlpha = 0.28; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1; ctx.setLineDash([]);
      }

      // Minen
      for (const m of run.mines) drawMine(m, t, s);

      // Schockwellen-Ring
      if (run.ring) {
        const R = run.ring, k = R.r / R.max;
        ctx.beginPath(); ctx.arc(0, 0, R.r, Math.PI, 0);
        glow(PAL.core, 3 + 4 * (1 - k), 1 - k * 0.6);
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0, R.r - 12), Math.PI, 0); glow(PAL.core, 1, 0.35 * (1 - k));
      }

      // Schiffe
      for (const e of run.enemies) {
        const p = run.pos(e);
        const sway = e.type === 'boss' ? 0 : Math.sin(t * 0.002 + e.seed) * Math.min(1, e.dist / 200) * 0.18;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(e.a + Math.PI + sway); ctx.scale(1.5, 1.5);
        drawShip(e, t, frozen); ctx.restore();
        if (e.type === 'boss' && e.shieldUntil > run.time) {
          const left = e.shieldUntil - run.time;
          ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 2.3, 0, 7);
          ctx.fillStyle = 'rgba(159,232,255,0.10)'; ctx.fill();
          glow(PAL.frost, 2, Math.min(1, left) * (0.7 + 0.3 * Math.sin(t * 0.02)));
        }
        if (frozen) { ctx.beginPath(); ctx.arc(p.x, p.y, e.r * 1.8, 0, 7); ctx.strokeStyle = PAL.frost; ctx.globalAlpha = 0.35; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; }
        if (e.type === 'brute' || e.type === 'boss' || e.type === 'bomb' || e.hp < e.maxHp) {
          const w = Math.max(18, e.r * (e.type === 'boss' ? 3.4 : 2.6)), hy = p.y - e.r * 1.7 - 8;
          ctx.fillStyle = '#2a2560'; ctx.fillRect(p.x - w / 2, hy, w, 3);
          ctx.fillStyle = SHIP[e.type]; ctx.fillRect(p.x - w / 2, hy, w * Math.max(0, e.hp / e.maxHp), 3);
        }
        if (run.focus === e) {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t * 0.004);
          for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(e.r * 1.5 + 6, -4); ctx.lineTo(e.r * 1.5 + 10, 0); ctx.lineTo(e.r * 1.5 + 6, 4); glow(PAL.range, 1.6); }
          ctx.restore();
        }
      }
      // Projektile
      ctx.lineCap = 'round';
      for (const b of run.bullets) {
        const tp = run.pos(b.tgt), d = Math.hypot(tp.x - b.x, tp.y - b.y) || 1;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - (tp.x - b.x) / d * 14, b.y - (tp.y - b.y) / d * 14);
        glow(b.crit ? PAL.energy : run.overActive ? PAL.heat : PAL.core, b.crit ? 2.4 : 1.7);
      }
      for (const b of run.ebullets) { ctx.beginPath(); ctx.arc(b.x, b.y, b.big ? 5 : 3, 0, 7); glow(b.big ? SHIP.boss : '#c9ff4f', 1.5); }
      // Orbitklingen
      if (s.blades) {
        for (const b of run.bladePos()) {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(t * 0.012);
          const z = s.bladeSize;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.lineTo(Math.cos(a) * z, Math.sin(a) * z); ctx.lineTo(Math.cos(a + Math.PI / 4) * z * 0.32, Math.sin(a + Math.PI / 4) * z * 0.32); }
          ctx.closePath(); fillHull(); glow(PAL.heal, 1.6);
          ctx.restore();
        }
      }
      drawCannon(run, t);

      // Partikel
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
        if (f.k === 'boom') {
          const R = (f.r || 8) * (f.type === 'boss' ? 4 : 2.6);
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, R * (0.4 + k));
          g.addColorStop(0, `rgba(255,250,220,${a})`); g.addColorStop(0.35, `rgba(255,170,80,${a * 0.7})`); g.addColorStop(1, 'rgba(255,80,140,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, R * (0.4 + k), 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(f.x, f.y, R * (0.6 + k * 1.4), 0, 7); glow(SHIP[f.type] || PAL.energy, 1.4, a * 0.8);
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
        } else if (f.k === 'shieldhit') {
          ctx.beginPath(); ctx.arc(f.x, f.y, 30 + k * 10, 0, 7); glow(PAL.frost, 1.5, a * 0.7);
        } else if (f.k === 'dmg') {
          ctx.globalAlpha = a; ctx.fillStyle = f.crit ? PAL.energy : '#ffffff';
          ctx.font = `600 ${f.crit ? 13 : 11}px ${FONT_NUM()}`; ctx.textAlign = 'center';
          ctx.fillText(fmt(f.v), f.x + f.dx, f.y - 18 - k * 18); ctx.globalAlpha = 1;
        } else if (f.k === 'bossact') {
          const label = { salvo: 'SALVE', spawn: 'JÄGERSTAFFEL', bomb: 'BOMBE', shield: 'SCHILD' }[f.act];
          ctx.globalAlpha = a; ctx.fillStyle = SHIP.boss; ctx.font = `700 13px ${FONT_UI()}`; ctx.textAlign = 'center';
          ctx.fillText(label, f.x, f.y - 52 - k * 10); ctx.globalAlpha = 1;
        }
      }
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
          ctx.fillStyle = f.k === 'freeze' ? `rgba(159,232,255,${0.3 * (1 - k)})` : `rgba(255,138,61,${0.22 * (1 - k)})`;
          ctx.fillRect(0, 0, W, H);
        } else if (f.k === 'wave') {
          ctx.globalAlpha = Math.min(1, (1 - k) * 2);
          ctx.fillStyle = f.boss ? SHIP.boss : PAL.core; ctx.textAlign = 'center';
          ctx.font = `700 ${Math.round(Math.min(W, H) * 0.08)}px ${FONT_UI()}`;
          ctx.fillText(f.boss ? 'MUTTERSCHIFF' : 'WELLE ' + f.w, W / 2, H * 0.32 - k * 10);
          ctx.globalAlpha = 1;
        }
      }
      if (run.holding) {
        ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.006);
        ctx.fillStyle = SHIP.boss; ctx.textAlign = 'center';
        ctx.font = `700 ${Math.round(Math.min(W, H) * 0.04)}px ${FONT_UI()}`;
        ctx.fillText('MUTTERSCHIFF BESIEGEN', W / 2, H * 0.2);
        ctx.globalAlpha = 1;
      }
    }

    function drawMine(m, t, s) {
      const armed = m.arm <= 0;
      ctx.save(); ctx.translate(m.x, m.y);
      // Auslöseradius (gestrichelt) und Wirkradius (sehr dezent)
      if (armed) { ctx.beginPath(); ctx.arc(0, 0, s.mineBlast, 0, 7); ctx.strokeStyle = PAL.energy; ctx.globalAlpha = 0.08; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(0, 0, s.mineTrig + 6, 0, 7);
      ctx.strokeStyle = PAL.energy; ctx.globalAlpha = armed ? 0.55 : 0.2; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.setLineDash([]);
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

    return { resize, toWorld, pushFx, step, draw, clear, view };
  }

  // Zahlenformat (de)
  const SUF = ['', 'K', 'M', 'Mrd', 'Bio', 'Brd', 'Trd'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1).replace('.', ',') : String(Math.floor(n));
    let i = 0; while (n >= 1000 && i < SUF.length - 1) { n /= 1000; i++; }
    if (n >= 1000) return n.toExponential(2).replace('.', ',');
    return (n < 100 ? n.toFixed(1) : Math.floor(n).toString()).replace('.', ',') + ' ' + SUF[i];
  }

  root.KWRender = { create, fmt };
})(window);
