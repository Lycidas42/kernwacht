// Elementarmagie: Schadensanteil und Erfahrung je Element, mit einem aktiven Bot (zielt wie ein Spieler) und dem Autopiloten
// Aufruf: node tools/elements.js [Läufe je Variante] [Punkte im Baum]   (nutzt den Fortschritt aus tools/shares.js, falls vorhanden)
globalThis.KW_P = process.env.KW_P ? JSON.parse(process.env.KW_P) : undefined;
require('../core.js');
const { botBuy } = require('./tune.js');
const C = Core, { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = C;
const RUNS = +process.argv[2] || 3, PTS = process.argv[3] != null ? +process.argv[3] : 14;
const fs = require('fs'), CACHE = __dirname + '/.shares-meta.json';
let meta;
if (fs.existsSync(CACHE)) meta = JSON.parse(fs.readFileSync(CACHE));
else {
  meta = newMeta(); meta.flv = {}; meta.modules = {}; meta.equip = [];
  let stale = 0;
  for (let i = 0; i < 70; i++) {
    const before = meta.best; play(meta, null).finish();
    stale = meta.best > before ? 0 : stale + 1;
    for (;;) { const o = META_UPG.filter(u => C.gateOk(meta, u.id) && (!u.req || mlv(meta, u.req)) && (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals).sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id))); if (!o.length) break; metaBuy(meta, o[0]); }
    if (meta.best >= 50 && stale >= 3) { C.fuse(meta); stale = 0; for (;;) { const o = C.FUSION_UPG.filter(u => (u.max == null || C.flv(meta, u.id) < u.max) && C.fusionCost(u, C.flv(meta, u.id)) <= meta.frag).sort((a, b) => C.fusionCost(a, C.flv(meta, a.id)) - C.fusionCost(b, C.flv(meta, b.id))); if (!o.length) break; C.fusionBuy(meta, o[0]); } }
  }
  fs.writeFileSync(CACHE, JSON.stringify(meta));
}
// aktiv: Feuerball auf die dichteste Gruppe, Lanze aufs stärkste Ziel, Strahl voll entladen auf die dichteste Gruppe
function elemBot(r, active) {
  const o = r.s.el; if (!o || !r.enemies.some(e => e.hp > 0)) return;
  if (o.k === 'light') {
    if (!active) { if (r.beamE >= o.dur && !r.beam) r.beamAuto(false); return; }
    if (r.beam) { const p = r.strikeTarget(); if (p && r.beamE > 0) r.beamMove(p.x, p.y); else r.beamStop(); }
    else if (r.beamE >= o.dur) { const p = r.strikeTarget(); if (p) r.beamStart(p.x, p.y); }
    return;
  }
  if (r.elemReady() && (o.k === 'ice' || active || r.enemies.length >= 4 || r.bossAlive())) r.useElem(null, null, active);
}
function play(m, el, active) {
  const r = new Run(m, { noFx: true, startWave: C.startWaveFor(m) }); let lb = 0;
  while (!r.dead && r.time < 7000) {
    r.update(0.1);
    if (el) elemBot(r, active);
    if (r.time - lb > 1) { lb = r.time; botBuy(r, RUN_UPG); if (r.charge >= 1 && r.enemies.length) { const t = r.enemies.find(e => e.type === 'boss') || r.enemies[0]; const p = r.pos(t); r.strike(p.x, p.y); } }
  }
  return r;
}
console.log(`Stand: Rekord ${C.record(meta)}, Fusionen ${meta.fusions || 0}, ${PTS} Punkte im Elementbaum`);
for (const el of [null, 'fire', 'ice', 'light']) for (const active of el ? [true, false] : [false]) {
  const m = JSON.parse(JSON.stringify(meta));
  if (el) {
    const E = C.elemState(m); E.act = el; E.xp = { [el]: 0 }; E.sk = {};
    let need = 0; for (let i = 0; i < PTS; i++) need += C.elXpNeed(i); E.xp[el] = need;
    for (let i = 0; i < PTS; i++) { const k = C.ELEM_SKILLS.find(x => x.el === el && C.elCan(m, x.id)); if (!k) break; C.elBuy(m, k.id); }
  }
  const runs = []; for (let i = 0; i < RUNS; i++) runs.push(play(m, el, active));
  const tot = r => Object.values(r.dealt).reduce((a, b) => a + b, 0);
  const share = runs.reduce((a, r) => a + (r.dealt.elem || 0) / tot(r), 0) / RUNS;
  const xp = runs.reduce((a, r) => a + (r.elXp || 0), 0) / RUNS, waves = runs.reduce((a, r) => a + r.wave - r.startWave + 1, 0) / RUNS;
  console.log(`${(el ? C.ELEMENTS[el].name : 'ohne').padEnd(6)} ${el ? (active ? 'aktiv' : 'auto ') : '     '}  Wellen ${runs.map(r => r.wave).join('/').padEnd(14)} Anteil ${(share * 100).toFixed(1).padStart(5)} %  Erfahrung/Lauf ${Math.round(xp)} (${(xp / Math.max(1, waves)).toFixed(1)} je Welle)`);
}
