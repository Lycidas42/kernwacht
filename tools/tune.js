// Zufallssuche über Balancing-Parameter
// Bot: Kernwerte zuerst, Nebenwerte wenn deutlich billiger
const CORE = ['dmg', 'rate', 'hp', 'regen'];
function botBuy(r, RUN_UPG) {
  for (;;) {
    const core = RUN_UPG.filter(u => CORE.includes(u.id) && r.available(u) && !r.maxed(u));
    const cmin = Math.min(...core.map(u => r.cost(u)));
    const o = RUN_UPG.filter(u => r.canBuy(u) && (CORE.includes(u.id) || r.cost(u) <= cmin * 0.6)).sort((a, b) => r.cost(a) - r.cost(b));
    if (!o.length) break; r.buy(o[0]);
  }
}
const TARGET = { 1: 10, 3: 13, 5: 16, 10: 22, 15: 27, 20: 31, 30: 38 };
const RUNS = 30;
function evalP(P, seedRuns = RUNS, verbose = false) {
  globalThis.KW_P = P;
  delete require.cache[require.resolve('../core.js')];
  require('../core.js');
  const { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = Core;
  const meta = newMeta(); const waves = [];
  for (let i = 1; i <= seedRuns; i++) {
    const r = new Run(meta, { noFx: true }); let lb = 0;
    while (!r.dead && r.time < 1800) {
      r.update(0.1);
      if (r.time - lb > 1) { lb = r.time; botBuy(r, RUN_UPG);
        if (r.charge >= 1 && r.enemies.length) { const t = r.enemies.find(e => e.type === 'boss') || r.enemies.reduce((a, b) => a.dist < b.dist ? a : b); const p = r.pos(t); r.strike(p.x, p.y); } }
    }
    const res = r.finish(); waves.push(res.wave);
    for (;;) { const o = META_UPG.filter(u => (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals).sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id))); if (!o.length) break; metaBuy(meta, o[0]); }
    if (r.time >= 1800) { for (let j = i + 1; j <= seedRuns; j++) waves.push(9999); break; }
  }
  let err = 0;
  for (const k in TARGET) { const w = waves[k - 1]; err += Math.pow(Math.log(w / TARGET[k]), 2); }
  if (verbose) console.log(waves.join(' '));
  return { err, waves };
}
module.exports = { evalP, botBuy };
if (require.main === module) {
  const base = Object.assign({}, require('../core.js') && globalThis.Core.P);
  const ranges = { eHp: [1.08, 1.25], eHpLin: [0, 0.15], eDmg: [1.04, 1.2], eDmgLin: [0, 0.12], eRw: [1.03, 1.1], eRwLin: [0, 0.2], cGrow: [1.0, 1.06], cBase: [0.5, 3], pDmg: [3, 12], pHp: [20, 60], lvDmg: [1.06, 1.2], lvHp: [1.06, 1.2], rw0: [0.8, 4] };
  let best = { P: base, ...evalP(base) };
  console.log('start', best.err.toFixed(3), best.waves.join(' '));
  const N = +process.argv[2] || 150; const T0 = Date.now(), TMAX = (+process.argv[3] || 200) * 1000;
  for (let i = 0; i < N && Date.now() - T0 < TMAX; i++) {
    const P = { ...best.P };
    const keys = Object.keys(ranges);
    const scale = i < N / 3 ? 1 : 0.3;
    for (const k of keys) if (Math.random() < 0.5) { const [lo, hi] = ranges[k]; P[k] = Math.min(hi, Math.max(lo, P[k] + (Math.random() - 0.5) * (hi - lo) * 0.4 * scale)); }
    const r = evalP(P);
    if (r.err < best.err) { best = { P, ...r }; console.log(i, best.err.toFixed(3), best.waves.join(' '), JSON.stringify(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, +v.toFixed(4)])))); }
  }
}
