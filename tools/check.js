// Fortschritt mit Bot simulieren, danach Sprungtor und Mutterschiff prüfen
require('../core.js');
const { botBuy } = require('./tune.js');
const { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = Core;
const RUNS = +process.argv[2] || 25;
function play(meta, S) {
  const r = new Run(meta, { noFx: true, startWave: S }); r.fxOn = true; let lb = 0; const acts = {};
  while (!r.dead && r.time < 1800) {
    r.update(0.1);
    if (r.time - lb > 1) { lb = r.time; botBuy(r, RUN_UPG); if (r.charge >= 1 && r.enemies.length) { const p = r.pos(r.enemies[0]); r.strike(p.x, p.y); } }
    for (const f of r.fx) if (f.k === 'bossact') acts[f.act] = (acts[f.act] || 0) + 1;
    r.fx.length = 0;
  }
  return { r, acts };
}
const meta = newMeta(); const waves = [];
for (let i = 1; i <= RUNS; i++) {
  const { r } = play(meta, 1); const res = r.finish(); waves.push(res.wave);
  for (;;) { const o = META_UPG.filter(u => (!u.req || mlv(meta, u.req)) && (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals).sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id))); if (!o.length) break; metaBuy(meta, o[0]); }
}
console.log('Wellen:', waves.join(' '));
const S = Core.maxStartWave(meta);
for (const s of [1, S]) {
  const { r, acts } = play(JSON.parse(JSON.stringify(meta)), s);
  const d = Object.fromEntries(Object.entries(r.dealt).map(([k, v]) => [k, Math.round(v)]));
  console.log(`Start ${s}: erreicht ${r.wave} in ${(r.time / 60).toFixed(1)} min, Boss-Aktionen ${JSON.stringify(acts)}, Schaden ${JSON.stringify(d)}`);
}
