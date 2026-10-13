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
    { const ft = ctx.fillText.bind(ctx); if (window.KWI18n) ctx.fillText = (s, x, y, w) => w == null ? ft(KWI18n.T(String(s)), x, y) : ft(KWI18n.T(String(s)), x, y, w); } // Canvas-Texte übersetzen
    const surf = {}, parts = [], texts = [];
    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, R = 0, beam = null, shake = 0, lastT = 0;

    function size() {
      const r = cv.getBoundingClientRect(); if (!r.width) return false;
      DPR = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(r.width * DPR) || cv.height !== Math.round(r.height * DPR)) { cv.width = Math.round(r.width * DPR); cv.height = Math.round(r.height * DPR); }
      W = r.width; H = r.height; R = Math.min(W * 0.29, H * 0.36); cx = W / 2; cy = H * 0.66;
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

    // Einrichtungen: kleine Kolonie auf einer Plattform am oberen Planetenrand, wächst sichtbar mit dem Ausbau
    // (lokales Koordinatensystem je Bauwerk: -y zeigt vom Planeten weg)
    const at = (deg, lift, fn) => { const p = rim(deg, lift); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + Math.PI / 2); fn(p); ctx.restore(); };
    const ORE = '#ffc04d';
    function drawFacilities(P, pl, t, open) {
      if (!open) return;
      const col = P.col, any = pl.d || pl.lz || pl.sm;
      if (!any) return;
      const drills = pl.d ? Math.min(3, 1 + Math.floor((pl.d - 1) / 8)) : 0;
      const DR = [-114, -136, -94];
      const SILO = -70, SMELT = -50, LASER = -156;
      // Plattform: Bogen aus Panzerplatten mit Stützen
      const a0 = (pl.lz ? LASER - 10 : DR[0] - 18), a1 = (pl.sm ? SMELT + 12 : SILO + 12);
      ctx.beginPath();
      for (let d = a0; d <= a1; d += 2) { const q = rim(d, 5); ctx[d === a0 ? 'moveTo' : 'lineTo'](q.x, q.y); }
      for (let d = a1; d >= a0; d -= 2) { const q = rim(d, -3); ctx.lineTo(q.x, q.y); }
      ctx.closePath(); ctx.fillStyle = HULL; ctx.fill(); glowStroke(hex(col, 0.9), 1.2, 0.8);
      for (let d = a0 + 6; d < a1; d += 9) at(d, 4, () => { ctx.fillStyle = hex(col, 0.35); ctx.fillRect(-1, -1, 2, 2); });

      // Förderleitung von den Bohrtürmen zum Silo, Erz läuft als Lichtpunkte hindurch
      if (pl.d) {
        const from = DR[Math.min(drills, 3) - 1] - 4, to = SILO - 6;
        const lo = Math.min(from, DR[0]), hi = to;
        ctx.beginPath(); for (let d = lo; d <= hi; d += 2) { const q = rim(d, 9); ctx[d === lo ? 'moveTo' : 'lineTo'](q.x, q.y); }
        ctx.strokeStyle = HULL; ctx.lineWidth = 5; ctx.stroke(); glowStroke('#8a86c8', 1, 0.7);
        const n = 4 + Math.min(6, pl.d >> 1), spd = 0.00025 * (1 + Math.min(3, pl.d * 0.15));
        for (let i = 0; i < n; i++) { const k = (t * spd + i / n) % 1, q = rim(lo + (hi - lo) * k, 9); ctx.beginPath(); ctx.arc(q.x, q.y, 1.8, 0, 7); ctx.fillStyle = ORE; ctx.fill(); }
      }

      // Bohrtürme: Gittermast mit drehendem Bohrkopf, wird mit jeder Stufe höher
      for (let i = 0; i < drills; i++) {
        const h = 30 + Math.min(26, (pl.d - i * 8) * 1.4), spin = t * 0.02 * (1 + i * 0.2);
        at(DR[i], 2, () => {
          // Bohrkopf im Boden
          ctx.save(); ctx.beginPath(); ctx.rect(-6, 0, 12, 12); ctx.clip();
          for (let k = 0; k < 4; k++) { const y = ((spin * 6 + k * 3) % 12); ctx.beginPath(); ctx.moveTo(-5, y); ctx.lineTo(5, y + 2); ctx.strokeStyle = hex(col, 0.7); ctx.lineWidth = 1; ctx.stroke(); }
          ctx.restore();
          // Gittermast
          ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-4, -h); ctx.lineTo(4, -h); ctx.lineTo(11, 0); ctx.closePath(); ctx.fillStyle = 'rgba(13,11,34,.85)'; ctx.fill(); glowStroke('#ff9a3c', 1.4);
          ctx.beginPath(); const seg = 5; for (let k = 0; k < seg; k++) { const y0 = -h * k / seg, y1 = -h * (k + 1) / seg, w0 = 11 - 7 * k / seg, w1 = 11 - 7 * (k + 1) / seg; ctx.moveTo(-w0, y0); ctx.lineTo(w1, y1); ctx.moveTo(w0, y0); ctx.lineTo(-w1, y1); } glowStroke('#ff9a3c', 0.7, 0.55);
          // Seilrolle und Gestänge
          ctx.beginPath(); ctx.arc(0, -h - 3, 4, 0, 7); ctx.fillStyle = HULL; ctx.fill(); glowStroke(col, 1.1);
          ctx.beginPath(); ctx.moveTo(0, -h - 3); ctx.lineTo(0, -2); ctx.strokeStyle = hex(col, 0.6); ctx.lineWidth = 1; ctx.stroke();
          ctx.save(); ctx.translate(0, -h - 3); ctx.rotate(spin); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.moveTo(0, -4); ctx.lineTo(0, 4); glowStroke(col, 0.8); ctx.restore();
          ctx.beginPath(); ctx.arc(0, -h - 9, 2, 0, 7); ctx.fillStyle = Math.sin(t * 0.008 + i) > 0 ? '#ff4f9a' : '#ffc04d'; ctx.fill();
        });
        if (Math.random() < 0.12) { const q = rim(DR[i], 3); parts.push({ x: q.x + (Math.random() - 0.5) * 10, y: q.y, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, life: 0.7, t: 0, c: Math.random() < 0.5 ? ORE : col, sz: 1.5 + Math.random() * 1.5 }); }
      }

      // Erzsilo: Tank mit sichtbarem Füllstand, wird mit der Stufe größer; fast voll blinkt die Warnleuchte
      if (pl.d) at(SILO, 2, () => {
        const h = 30 + Math.min(24, (pl.s || 0) * 1.6), w = 13, fill = Math.min(1, pl.fill || 0), full = fill >= 0.9;
        ctx.beginPath(); ctx.roundRect(-w, -h, w * 2, h, 4); ctx.fillStyle = HULL; ctx.fill();
        const lg = ctx.createLinearGradient(0, -h * fill, 0, 0); lg.addColorStop(0, hex(col, 0.95)); lg.addColorStop(1, hex(col, 0.45));
        ctx.save(); ctx.beginPath(); ctx.roundRect(-w + 3, -h + 3, w * 2 - 6, h - 5, 3); ctx.clip();
        ctx.fillStyle = lg; ctx.fillRect(-w, -h * fill, w * 2, h * fill);
        ctx.beginPath(); ctx.moveTo(-w, -h * fill); for (let x = -w; x <= w; x += 3) ctx.lineTo(x, -h * fill + Math.sin(t * 0.006 + x * 0.6) * 1.2); ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.restore();
        ctx.beginPath(); ctx.roundRect(-w, -h, w * 2, h, 4); glowStroke(full ? '#ff4f6a' : '#c3a6ff', 1.3);
        for (const y of [0.33, 0.66]) { ctx.beginPath(); ctx.moveTo(-w, -h * y); ctx.lineTo(w, -h * y); ctx.strokeStyle = 'rgba(195,166,255,.35)'; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(0, -h, w, 4, 0, Math.PI, 0); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#c3a6ff', 1);
        ctx.beginPath(); ctx.arc(0, -h - 5, 2.2, 0, 7); ctx.fillStyle = full ? (Math.sin(t * 0.015) > 0 ? '#ff4f6a' : '#3a1020') : '#5dffb0'; ctx.fill();
      });

      // Schmelze: Ofen mit glühender Öffnung und Schornstein
      if (pl.sm) at(SMELT, 2, () => {
        const lv = Math.min(5, pl.sm), hc = 20 + lv * 3;
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-14, -16); ctx.quadraticCurveTo(-4, -26, 6, -16); ctx.lineTo(6, 0); ctx.closePath(); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#ff4f6a', 1.3);
        ctx.beginPath(); ctx.rect(8, -hc - 6, 6, hc + 6); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#ff4f6a', 1.1);
        const g = ctx.createRadialGradient(-4, -6, 0, -4, -6, 8); g.addColorStop(0, '#fff2c0'); g.addColorStop(0.5, '#ff8a3d'); g.addColorStop(1, 'rgba(255,80,30,0)');
        ctx.beginPath(); ctx.arc(-4, -6, 6, Math.PI, 0); ctx.lineTo(2, -1); ctx.lineTo(-10, -1); ctx.closePath(); ctx.fillStyle = g; ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 0.012); ctx.fill(); ctx.globalAlpha = 1;
      });
      if (pl.sm && Math.random() < 0.1) { const q = rim(SMELT + 3, 32 + Math.min(5, pl.sm) * 3); parts.push({ x: q.x, y: q.y, vx: 8 + Math.random() * 6, vy: -16 - Math.random() * 10, life: 2, t: 0, c: 'rgba(200,190,230,.35)', sz: 3 + Math.random() * 4, smoke: true }); }

      // Lasermeißel: Antenne mit Spiegelschüssel und Emitter
      if (pl.lz) at(LASER, 2, () => {
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-2, -20); ctx.lineTo(2, -20); ctx.lineTo(8, 0); ctx.closePath(); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#3ef0ff', 1.2);
        ctx.save(); ctx.translate(0, -22); ctx.rotate(-0.5 + Math.sin(t * 0.001) * 0.2);
        ctx.beginPath(); ctx.arc(0, 0, 11, Math.PI * 1.1, Math.PI * 1.9); glowStroke('#3ef0ff', 1.6);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -12); ctx.strokeStyle = '#3ef0ff'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -12, 2.6, 0, 7); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.01); ctx.fill(); ctx.globalAlpha = 1;
        ctx.restore();
      });

      // Sammeldrohnen pendeln zwischen Bohrturm und Silo und tragen Erz
      if (pl.d) for (let i = 0; i < Math.min(6, pl.dr || 0); i++) {
        const k = (t * 0.00035 * (1 + i * 0.17) + i * 0.37) % 1, back = k > 0.5, u = back ? (1 - k) * 2 : k * 2;
        const A = rim(DR[0], 20), B = rim(SILO, 46), mx = (A.x + B.x) / 2, my = Math.min(A.y, B.y) - 22 - i * 5;
        const x = (1 - u) * (1 - u) * A.x + 2 * (1 - u) * u * mx + u * u * B.x, y = (1 - u) * (1 - u) * A.y + 2 * (1 - u) * u * my + u * u * B.y;
        ctx.save(); ctx.translate(x, y); ctx.rotate(back ? Math.PI : 0);
        ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(0, -3.5); ctx.lineTo(7, 0); ctx.lineTo(0, 3.5); ctx.closePath(); ctx.fillStyle = HULL; ctx.fill(); glowStroke('#5dffb0', 1);
        if (!back) { ctx.beginPath(); ctx.rect(-2, 3, 4, 4); ctx.fillStyle = ORE; ctx.fill(); }
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
      ctx.fillStyle = 'rgba(10,8,30,.22)'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      if (!open) { ctx.fillStyle = 'rgba(10,8,30,.5)'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); }
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
      const src = rim(-156, 32);
      beam = { x0: src.x, y0: src.y, x: pt.x, y: pt.y, t: 0 };
      for (let i = 0; i < (vein ? 22 : 9); i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 90; parts.push({ x: pt.x, y: pt.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.8, t: 0, c: vein ? '#ffc04d' : P.col, sz: 2 + Math.random() * 3 }); }
      texts.push({ x: pt.x, y: pt.y - 10, s: (vein ? 'Erzader! ' : '') + '+' + n, t: 0, vein });
      shake = vein ? 6 : 2;
    }
    return { draw, hit, burst };
  }

  root.KWMineView = { create };
})(window);
