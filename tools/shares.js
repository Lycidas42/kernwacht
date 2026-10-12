// Schadensanteile je Quelle in einem späten Lauf, mit verschiedenen Modul-Ausrüstungen
// Aufruf: node tools/shares.js [Läufe zum Aufbau]   (baut Fortschritt über Fusionen auf, dann Messläufe)
globalThis.KW_P = process.env.KW_P ? JSON.parse(process.env.KW_P) : undefined;
require('../core.js');
const { botBuy } = require('./tune.js');
const C = Core, { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = C;
const N = +process.argv[2] || 70;
const fs = require('fs'), CACHE = __dirname + '/.shares-meta.json';
let meta;
function play(m, opts, rec) {
  const r = new Run(m, Object.assign({ noFx: true }, opts)); let lb = 0, mark = null;
  while (!r.dead && r.time < 7000) {
    r.update(0.1);
    if (r.time - lb > 1) { lb = r.time; botBuy(r, RUN_UPG); if (r.charge >= 1 && r.enemies.length) { const t = r.enemies.find(e => e.type === 'boss') || r.enemies[0]; const p = r.pos(t); r.strike(p.x, p.y); } }
    if (rec && !mark && r.wave >= rec) mark = Object.assign({}, r.dealt);
  }
  r.mark = mark; return r;
}
if (fs.existsSync(CACHE) && !process.env.REBUILD) meta = JSON.parse(fs.readFileSync(CACHE));
else {
  meta = newMeta(); meta.flv = {}; meta.modules = {}; meta.equip = [];
  let stale = 0;
  for (let i = 0; i < N; i++) {
    const before = meta.best; play(meta, { startWave: C.startWaveFor(meta) }).finish();
    stale = meta.best > before ? 0 : stale + 1;
    for (;;) { const o = META_UPG.filter(u => C.gateOk(meta, u.id) && (!u.req || mlv(meta, u.req)) && (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals).sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id))); if (!o.length) break; metaBuy(meta, o[0]); }
    if (meta.best >= 50 && stale >= 3) { C.fuse(meta); stale = 0; for (;;) { const o = C.FUSION_UPG.filter(u => (u.max == null || C.flv(meta, u.id) < u.max) && C.fusionCost(u, C.flv(meta, u.id)) <= meta.frag).sort((a, b) => C.fusionCost(a, C.flv(meta, a.id)) - C.fusionCost(b, C.flv(meta, b.id))); if (!o.length) break; C.fusionBuy(meta, o[0]); } }
  }
  fs.writeFileSync(CACHE, JSON.stringify(meta));
}
console.log(`Stand: Bestwelle ${meta.best}, Rekord ${meta.bestEver}, Fusionen ${meta.fusions}, Fusion ${JSON.stringify(meta.flv)}`);
const SETS = { keine: [], 'Splitter+Kette+Überspannung': ['splinter', 'chain', 'overcharge'], Splitter: ['splinter'], Kette: ['chain'], 'Kryo+Scanner+Platte': ['cryoammo', 'scanner', 'plating'] };
const ONLY = process.env.SETS ? process.env.SETS.split(',') : null;
for (const rar of [1, 3]) for (const name in SETS) {
  if (ONLY && !ONLY.includes(name)) continue;
  const m = JSON.parse(JSON.stringify(meta)); m.modules = {}; for (const t in C.MODULES) m.modules[t] = { type: t, rar, copies: rar === 3 ? 10 : 3 }; m.equip = SETS[name];
  const runs = [0, 1, 2].map(() => play(m, { startWave: C.startWaveFor(m) }));
  const r = runs.sort((a, b) => a.wave - b.wave)[1], d = r.dealt, tot = Object.values(d).reduce((a, b) => a + b, 0);
  console.log(`${(rar === 3 ? 'legendär' : 'selten').padEnd(9)} ${name.padEnd(28)} Wellen ${runs.map(x => x.wave).join('/')}  ` + C.SOURCES.map(k => `${k} ${Math.round(100 * d[k] / tot)}%`).join(' '));
}
