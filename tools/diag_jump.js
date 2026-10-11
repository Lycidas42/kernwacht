require('../core.js');
const { botBuy } = require('./tune.js');
const { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = Core;
const meta = newMeta();
for (let i = 1; i <= 24; i++) {
  const r = new Run(meta, { noFx: true }); let lb = 0;
  while (!r.dead && r.time < 1800) { r.update(0.1); if (r.time - lb > 1) { lb = r.time; botBuy(r, RUN_UPG); if (r.charge >= 1 && r.enemies.length) { const p = r.pos(r.enemies[0]); r.strike(p.x, p.y); } } }
  const lvRun = Object.entries(r.lv).filter(([k, v]) => v).map(([k, v]) => k + v).join(' ');
  const res = r.finish(); const before = JSON.stringify(meta.lv);
  for (;;) { const o = META_UPG.filter(u => (!u.req || mlv(meta, u.req)) && (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals).sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id))); if (!o.length) break; metaBuy(meta, o[0]); }
  if (i >= 15) console.log(`#${i} w${res.wave} +${res.crystals}K | run: ${lvRun}\n    meta: ${JSON.stringify(meta.lv)}`);
}
