// Kernwacht – Bergbau-Ansicht: rotierender Planet mit sichtbaren Einrichtungen, Abbau per Tippen (Canvas 2D)
(function (root) {
  'use strict';

  // Zufallszahlen mit Startwert, damit jeder Planet immer gleich aussieht
  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hex = (c, a) => { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // Oberfläche als Streifen (doppelte Breite), der hinter der Kugel durchläuft
  function makeSurface(P, R) {
    const W = Math.round(R * 4), H = Math.round(R * 2), cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), r = rng(P.id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    const base = g.createLinearGradient(0, 0, 0, H); base.addColorStop(0, P.col); base.addColorStop(1, P.col2);
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    const wrap = (fn) => { for (const dx of [0, W / 2]) { g.save(); g.translate(dx, 0); fn(); g.restore(); } };
    const half = W / 2;
    if (P.look === 'rock') {
      const blobs = []; for (let i = 0; i < 26; i++) blobs.push({ x: r() * half, y: r() * H, rr: 3 + r() * R * 0.16 });
      wrap(() => {
        for (const b of blobs) {
          g.beginPath(); g.arc(b.x, b.y, b.rr, 0, 7); g.fillStyle = 'rgba(20,22,40,.35)'; g.fill();
          g.beginPath(); g.arc(b.x - b.rr * 0.25, b.y - b.rr * 0.25, b.rr * 0.75, 0, 7); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill();
        }
        for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 + r() * 0.08})`; g.fillRect(r() * half, r() * H, 2, 2); }
      });
    } else if (P.look === 'ice') {
      const cracks = []; for (let i = 0; i < 14; i++) { const pts = [[r() * half, r() * H]]; for (let k = 0; k < 5; k++) { const [x, y] = pts[pts.length - 1]; pts.push([x + (r() - 0.5) * R * 0.5, y + (r() - 0.5) * R * 0.35]); } cracks.push(pts); }
      wrap(() => {
        g.fillStyle = 'rgba(255,255,255,.25)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(r() * half, r() * H, R * (0.15 + r() * 0.3), R * (0.05 + r() * 0.1), 0, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(30,90,130,.55)'; g.lineWidth = 1.4;
        for (const c of cracks) { g.beginPath(); c.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
      });
    } else if (P.look === 'lava') {
      wrap(() => {
        g.fillStyle = 'rgba(40,10,5,.55)'; for (let i = 0; i < 16; i++) { g.beginPath(); g.ellipse(r() * half, r() * H, R * (0.1 + r() * 0.3), R * (0.06 + r() * 0.15), r() * 3, 0, 7); g.fill(); }
        g.lineCap = 'round';
        for (let i = 0; i < 12; i++) {
          let x = r() * half, y = r() * H; g.beginPath(); g.moveTo(x, y);
          for (let k = 0; k < 6; k++) { x += (r() - 0.3) * R * 0.3; y += (r() - 0.5) * R * 0.25; g.lineTo(x, y); }
          g.strokeStyle = 'rgba(255,120,40,.35)'; g.lineWidth = 5; g.stroke(); g.strokeStyle = 'rgba(255,220,120,.9)'; g.lineWidth = 1.6; g.stroke();
        }
      });
    } else if (P.look === 'bands') {
      for (let y = 0; y < H; y += 4) { const k = Math.sin(y * 0.09) * 0.5 + Math.sin(y * 0.031 + 2) * 0.5; g.fillStyle = k > 0 ? `rgba(255,220,200,${k * 0.18})` : `rgba(60,0,20,${-k * 0.3})`; g.fillRect(0, y, W, 4); }
      wrap(() => { g.fillStyle = 'rgba(120,20,40,.6)'; g.beginPath(); g.ellipse(half * 0.6, H * 0.62, R * 0.32, R * 0.14, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(255,200,200,.35)'; g.lineWidth = 2; g.stroke(); });
    } else if (P.look === 'void') {
      g.fillStyle = '#0c0d1e'; g.fillRect(0, 0, W, H);
      wrap(() => {
        for (let i = 0; i < 7; i++) {
          const cx = r() * half, cy = r() * H; g.beginPath();
          for (let a = 0; a < 12; a += 0.15) { const rr = a * R * 0.03; g.lineTo(cx + Math.cos(a) * rr * 2, cy + Math.sin(a) * rr); }
          g.strokeStyle = `rgba(150,140,255,${0.25 + r() * 0.3})`; g.lineWidth = 1.5; g.stroke();
        }
        for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(200,210,255,${r() * 0.6})`; g.fillRect(r() * half, r() * H, 1.5, 1.5); }
      });
    }
    return cv;
  }

  function create(cv) {
    const ctx = cv.getContext('2d');
    const surf = {}, parts = [], texts = [];
    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0, beam = null, shake = 0, lastT = 0;

    function size() {
      const r = cv.getBoundingClientRect(); if (!r.width) return false;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(r.width * DPR) || cv.height !== Math.round(r.height * DPR)) { cv.width = Math.round(r.width * DPR); cv.height = Math.round(r.height * DPR); }
      W = r.width; H = r.height; R = Math.min(W * 0.3, H * 0.4); cx = W / 2; cy = H * 0.6;
      return true;
    }
    const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.2, p: Math.random() * 6 }));

    // Position eines Punkts auf dem oberen Planetenrand (Winkel in Grad, -180 = links, -90 = oben)
    const rim = (deg, lift) => { const a = deg * Math.PI / 180; return { x: cx + Math.cos(a) * (R + (lift || 0)), y: cy + Math.sin(a) * (R + (lift || 0)), a }; };

    function glowStroke(col, w, a) { ctx.strokeStyle = col; ctx.globalAlpha = (a == null ? 1 : a) * 0.3; ctx.lineWidth = w * 3; ctx.stroke(); ctx.globalAlpha = a == null ? 1 : a; ctx.lineWidth = w; ctx.stroke(); ctx.globalAlpha = 1; }
    const HULL = '#0d0b22';

    function drawRing(P, front) {
      if (!P.ring) return;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.28);
      const rx = R * (P.ring === 2 ? 1.9 : 1.6), ry = R * 0.32;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = hex(P.col, 0.55); ctx.lineWidth = P.ring === 2 ? 9 : 5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.9, ry * 0.88, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
      ctx.strokeStyle = hex(P.col, 0.25); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }

    // Einrichtungen am oberen Rand: Bohrtürme, Silo, Schmelze, Drohnen, Laser
    function drawFacilities(P, pl, t, open) {
      if (!open) return;
      const col = P.col;
      // Bohrtürme: bis zu 5, je 6 Stufen ein weiterer
      const drills = pl.d ? Math.min(5, 1 + Math.floor((pl.d - 1) / 6)) : 0;
      const spots = [-118, -62, -140, -40, -90];
      for (let i = 0; i < drills; i++) {
        const p = rim(spots[i]); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + Math.PI / 2);
        const pump = Math.sin(t * 0.008 + i * 1.3) * 3;
        ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(-4, -26); ctx.lineTo(4, -26); ctx.lineTo(9, 2); ctx.closePath(); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#ff9a3c', 1.3);
        ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(6, -16); ctx.moveTo(6, -8); ctx.lineTo(-6, -16); glowStroke('#ff9a3c', 0.8, 0.6);
        ctx.beginPath(); ctx.rect(-2.5, -30 + pump, 5, 22); ctx.fillStyle = HULL; ctx.fill(); glowStroke(col, 1.1);
        ctx.beginPath(); ctx.arc(0, -29, 2, 0, 7); ctx.fillStyle = Math.sin(t * 0.01 + i) > 0 ? '#ff4f9a' : '#ffc04d'; ctx.fill();
        ctx.restore();
        if (Math.random() < 0.05) { const q = rim(spots[i], 6); parts.push({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30, life: 1.2, t: 0, c: col, sz: 2 + Math.random() * 2 }); }
      }
      // Erzsilo
      if (pl.d) {
        const p = rim(-100, -4); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + Math.PI / 2);
        const h = 16 + Math.min(14, (pl.s || 0) * 1.2), fill = Math.min(1, pl.fill || 0);
        ctx.beginPath(); ctx.rect(-7, -h, 14, h + 2); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#c3a6ff', 1.2);
        ctx.fillStyle = hex(col, 0.7); ctx.fillRect(-5, -h * fill + 1, 10, h * fill - 1);
        ctx.beginPath(); ctx.ellipse(0, -h, 7, 2.5, 0, 0, 7); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#c3a6ff', 1);
        ctx.restore();
      }
      // Schmelze mit Rauch
      if (pl.sm) {
        const p = rim(-76, -3); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(-10, -12); ctx.lineTo(4, -12); ctx.lineTo(4, -22); ctx.lineTo(9, -22); ctx.lineTo(9, 2); ctx.closePath(); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#ff4f6a', 1.2);
        ctx.beginPath(); ctx.arc(-4, -5, 3, 0, 7); ctx.fillStyle = `rgba(255,140,60,${0.6 + 0.4 * Math.sin(t * 0.01)})`; ctx.fill();
        ctx.restore();
        if (Math.random() < 0.08) { const q = rim(-70, 26); parts.push({ x: q.x, y: q.y, vx: 6 + Math.random() * 6, vy: -18 - Math.random() * 10, life: 1.8, t: 0, c: 'rgba(200,190,230,.35)', sz: 3 + Math.random() * 4, smoke: true }); }
      }
      // Lasermeißel: Turm oben links
      if (pl.lz) {
        const p = rim(-158, -2); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(-3, -18); ctx.lineTo(3, -18); ctx.lineTo(6, 2); ctx.closePath(); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#3ef0ff', 1.2);
        ctx.beginPath(); ctx.arc(0, -20, 3.5, 0, 7); ctx.fillStyle = '#3ef0ff'; ctx.fill();
        ctx.restore();
      }
      // Sammeldrohnen umkreisen den Planeten
      for (let i = 0; i < (pl.dr || 0); i++) {
        const a = t * 0.0009 * (1 + i * 0.13) + i * 1.3, x = cx + Math.cos(a) * R * 1.28, y = cy + Math.sin(a) * R * 0.5 - R * 0.35;
        const behind = Math.sin(a) < -0.2 && Math.hypot(x - cx, y - cy) < R; if (behind) continue;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.cos(a) > 0 ? 0.2 : -0.2);
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, -3); ctx.lineTo(6, 0); ctx.lineTo(0, 3); ctx.closePath(); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#5dffb0', 1);
        ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, 7); ctx.fillStyle = '#5dffb0'; ctx.fill();
        ctx.restore();
      }
    }

    function draw(P, pl, t, opts) {
      if (!size()) return;
      const dt = Math.min(0.1, (t - (lastT || t)) / 1000); lastT = t;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // Weltraum
      const bg = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, Math.max(W, H)); bg.addColorStop(0, '#1a1640'); bg.addColorStop(1, '#0a0820');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (const s of stars) { ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t * 0.001 + s.p); ctx.fillStyle = '#dcd8ff'; ctx.fillRect(s.x * W, s.y * H, s.r, s.r); }
      ctx.globalAlpha = 1;
      const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0; shake = Math.max(0, shake - dt * 30);
      ctx.save(); ctx.translate(sx, 0);
      const open = opts.open;
      // Atmosphäre
      const at = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.35); at.addColorStop(0, hex(P.col, open ? 0.35 : 0.12)); at.addColorStop(1, hex(P.col, 0));
      ctx.fillStyle = at; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, 7); ctx.fill();
      drawRing(P, false);
      // Planetenkugel mit durchlaufender Oberfläche
      if (!surf[P.id] || surf[P.id].R !== Math.round(R)) surf[P.id] = { cv: makeSurface(P, Math.round(R)), R: Math.round(R) };
      const S = surf[P.id].cv, off = ((t * 0.006 * (P.look === 'bands' ? 1.6 : 1)) % (S.width / 2));
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
      ctx.drawImage(S, cx - R - off, cy - R, S.width, R * 2);
      const sh = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R * 1.05);
      sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,.75)');
      ctx.fillStyle = sh; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      if (P.look === 'lava') { ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 0.003); ctx.fillStyle = '#ff6a20'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); ctx.globalAlpha = 1; }
      if (!open) { ctx.fillStyle = 'rgba(10,8,30,.6)'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }
      ctx.restore();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.strokeStyle = hex(P.col, open ? 0.6 : 0.25); ctx.lineWidth = 1.2; ctx.stroke();
      drawFacilities(P, pl, t, open);
      drawRing(P, true);
      // Laserstrahl beim Tippen
      if (beam) {
        beam.t += dt; const k = 1 - beam.t / 0.25;
        if (k <= 0) beam = null;
        else { ctx.beginPath(); ctx.moveTo(beam.x0, beam.y0); ctx.lineTo(beam.x, beam.y); glowStroke('#3ef0ff', 2.2 * k, k); ctx.beginPath(); ctx.arc(beam.x, beam.y, 6 * k + 2, 0, 7); ctx.fillStyle = `rgba(255,255,255,${k})`; ctx.fill(); }
      }
      ctx.restore();
      // Teilchen und Zahlen
      for (const p of parts) {
        p.t += dt; if (!p.smoke) p.vy += 20 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const k = 1 - p.t / p.life; if (k <= 0) continue;
        ctx.globalAlpha = k; ctx.fillStyle = p.c;
        if (p.smoke) { ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * (1.5 - k), 0, 7); ctx.fill(); }
        else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 6); ctx.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz); ctx.restore(); }
      }
      ctx.globalAlpha = 1;
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t >= parts[i].life) parts.splice(i, 1);
      ctx.textAlign = 'center'; ctx.font = '600 15px "JetBrains Mono", monospace';
      for (const tx of texts) {
        tx.t += dt; const k = 1 - tx.t / 1.1; if (k <= 0) continue;
        ctx.globalAlpha = k; ctx.fillStyle = tx.vein ? '#ffc04d' : '#ffffff'; ctx.fillText(tx.s, tx.x, tx.y - tx.t * 40);
      }
      ctx.globalAlpha = 1;
      for (let i = texts.length - 1; i >= 0; i--) if (texts[i].t >= 1.1) texts.splice(i, 1);
      if (!open) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 14px "Chakra Petch", system-ui'; ctx.fillText('🔒 ' + opts.lockTxt, cx, cy + 5); }
    }

    // Tippen: liegt der Punkt auf dem Planeten?
    function hit(clientX, clientY) {
      const r = cv.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
      return Math.hypot(x - cx, y - cy) <= R ? { x, y } : null;
    }
    // Effekt eines Treffers: Laser vom Turm, Gesteinsbrocken, Zahl
    function burst(pt, P, n, vein) {
      const src = rim(-158, 20);
      beam = { x0: src.x, y0: src.y, x: pt.x, y: pt.y, t: 0 };
      for (let i = 0; i < (vein ? 22 : 9); i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 90; parts.push({ x: pt.x, y: pt.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.8, t: 0, c: vein ? '#ffc04d' : P.col, sz: 2 + Math.random() * 3 }); }
      texts.push({ x: pt.x, y: pt.y - 10, s: (vein ? 'Erzader! ' : '') + '+' + n, t: 0, vein });
      shake = vein ? 6 : 2;
    }
    return { draw, hit, burst };
  }

  root.KWMineView = { create };
})(window);
