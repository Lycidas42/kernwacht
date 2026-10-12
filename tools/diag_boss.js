// Mutterschiff-Kampf bei einer gegebenen Welle mit starkem Spielstand protokollieren
globalThis.KW_P = process.env.KW_P ? JSON.parse(process.env.KW_P) : undefined;
require('../core.js');
const { botBuy } = require('./tune.js');
const C = Core;
const W = +process.argv[2] || 160, fc = +process.argv[3] || 14;
const meta = C.newMeta();
meta.lv = { m_dmg: 45, m_hp: 45, m_rate: 20, m_regen: 30, m_armor: 15, m_loot: 30, m_crys: 25, m_head: 10, m_cheap: 15, m_start: 20, u_shock: 1, u_blade: 1, u_mine: 1, u_freeze: 1, u_over: 1, u_jump: 1, m_jump: 8 };
meta.flv = { f_core: fc, f_rocket: 1, f_cryo: 1 }; meta.best = W + 5;
const r = new C.Run(meta, { noFx: true, startWave: W - 30 }); r.fxOn = true; let lb = 0, lt = 0; const acts = {};
while (!r.dead && r.time < 2400 && r.wave <= W) {
  r.update(0.1);
  if (r.time - lb > 1) { lb = r.time; botBuy(r, C.RUN_UPG); if (r.charge >= 1 && r.enemies.length) { const p = r.pos(r.enemies[0]); r.strike(p.x, p.y); } }
  for (const f of r.fx) if (f.k === 'bossact') acts[f.act] = (acts[f.act] || 0) + 1; r.fx.length = 0;
  const b = r.enemies.find(e => e.type === 'boss');
  if (r.wave === W && r.time - lt > 4) { lt = r.time; console.log(`t${r.time.toFixed(0)} hp ${(r.hp / r.s.maxHp * 100).toFixed(0)}% boss ${b ? (b.hp / b.maxHp * 100).toFixed(0) + '% d' + Math.round(b.dist) + (b.enraged ? ' RASEND' : '') : '-'} gegner ${r.enemies.length} dps ${r.s.dps.toExponential(2)} bossHP ${b ? b.maxHp.toExponential(2) : ''} rng ${r.s.range}`); }
}
console.log('Ende Welle', r.wave, r.dead ? 'tot' : 'lebt', 'Aktionen', JSON.stringify(acts));
