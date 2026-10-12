// Herausforderungen und Tageslauf: welche Wellen schafft ein Bot bei typischem Fortschritt?
// Aufruf: node tools/challenges.js [Bestwelle, bis zu der der Bot vorher spielt (Standard 45)] [Läufe je Test]
globalThis.KW_P = process.env.KW_P ? JSON.parse(process.env.KW_P) : undefined;
require('../core.js');
const { botBuy } = require('./tune.js');
const C = Core, { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = C;
const TARGET = +process.argv[2] || 45, N = +process.argv[3] || 8;

function play(meta, opts) {
  const r = new Run(meta, Object.assign({ noFx: true }, opts)); let lb = 0;
  while (!r.dead && r.time < 3000) {
    r.update(0.1);
    if (r.time - lb > 1) {
      lb = r.time;
      if (r.rule === 'mines') { const u = RUN_UPG.find(x => x.id === 'mine'); while (r.canBuy(u) && r.cost(u) < r.energy * 0.6) r.buy(u); }
      botBuy(r, RUN_UPG);
      if (r.charge >= 1 && r.enemies.length) { const t = r.enemies.find(e => e.type === 'boss') || r.enemies[0]; const p = r.pos(t); r.strike(p.x, p.y); }
    }
  }
  return r;
}
// Fortschritt aufbauen: normale Läufe mit Labor-Käufen bis zur Bestwelle TARGET
const meta = newMeta(); meta.flv = {}; meta.modules = {}; meta.equip = [];
let runs = 0;
while (meta.best < TARGET && runs < 300) {
  const r = play(meta, { startWave: C.startWaveFor(meta) }); r.finish(); runs++;
  for (;;) { const o = META_UPG.filter(u => C.gateOk(meta, u.id) && (!u.req || mlv(meta, u.req)) && (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals).sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id))); if (!o.length) break; metaBuy(meta, o[0]); }
}
console.log(`Fortschritt: Bestwelle ${meta.best} nach ${runs} Läufen`);
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
const snap = JSON.stringify(meta);
for (const ch of C.CHALLENGES) {
  const w = []; for (let i = 0; i < N; i++) { const m = JSON.parse(snap); w.push(play(m, { mode: { kind: 'chal', id: ch.id } }).wave); }
  console.log(`${ch.name.padEnd(12)} Ziele ${ch.goals.join('/')}: Median ${med(w)}  (${w.join(' ')})`);
}
const nw = []; for (let i = 0; i < N; i++) nw.push(play(JSON.parse(snap), {}).wave);
console.log(`Normaler Lauf ab Welle 1: Median ${med(nw)}`);
if (!process.env.NODAILY) for (let d = 1; d <= 7; d++) {
  const day = `2026-10-${String(11 + d).padStart(2, '0')}`, w = [];
  for (let i = 0; i < 4; i++) w.push(play(newMeta(), { mode: { kind: 'daily', day } }).wave);
  console.log(`Tageslauf ${day} (${C.dailyOf(day).twist}): ${w.join(' ')}`);
}
