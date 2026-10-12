// Nur die Fortschrittskurve (Bot wie check.js), Parameter per KW_P
globalThis.KW_P = process.env.KW_P ? JSON.parse(process.env.KW_P) : undefined;
require('../core.js');
const { botBuy } = require('./tune.js');
const { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = Core;
const meta = newMeta(), waves = [], N = +process.argv[2] || 30;
for (let i = 1; i <= N; i++) {
  const r = new Run(meta, { noFx: true }); let lb = 0;
  while (!r.dead && r.time < 4000) { r.update(0.1); if (r.time - lb > 1) { lb = r.time; botBuy(r, RUN_UPG); if (r.charge >= 1 && r.enemies.length) { const p = r.pos(r.enemies[0]); r.strike(p.x, p.y); } } }
  waves.push(r.finish().wave); if (i === N) { const t = Object.values(r.dealt).reduce((a, b) => a + b, 0); console.error('Anteile letzter Lauf:', Object.entries(r.dealt).filter(([k, v]) => v > 0).map(([k, v]) => k + ' ' + Math.round(v / t * 100) + '%').join(', ')); }
  for (;;) { const o = META_UPG.filter(u => (!u.req || mlv(meta, u.req)) && (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals).sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id))); if (!o.length) break; metaBuy(meta, o[0]); }
}
console.log(waves.join(' '));
