require('../core.js');
const { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = Core;

const RUNS = +process.argv[2] || 25;
const BUY = ['dmg', 'rate', 'hp', 'regen', 'armor', 'loot', 'crit', 'critx', 'range', 'knock', 'shock', 'blade', 'mine', 'interest', 'crys', 'multi'];

function playRun(meta) {
  const r = new Run(meta, { noFx: true });
  const dt = 1 / 20;
  let lastBuy = 0;
  while (!r.dead && r.time < 4 * 3600) {
    r.update(dt);
    if (r.time - lastBuy > 1) {
      lastBuy = r.time;
      for (;;) {
        const opts = RUN_UPG.filter(u => BUY.includes(u.id) && r.canBuy(u)).sort((a, b) => r.cost(a) - r.cost(b));
        if (!opts.length) break;
        r.buy(opts[0]);
      }
    }
  }
  return r;
}

const meta = newMeta();
let totalTime = 0;
for (let i = 1; i <= RUNS; i++) {
  const r = playRun(meta);
  const res = r.finish();
  totalTime += res.time;
  // Meta günstigstes zuerst
  let bought = 0;
  for (;;) {
    const opts = META_UPG.filter(u => (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals)
      .sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id)));
    if (!opts.length) break;
    metaBuy(meta, opts[0]); bought++;
  }
  console.log(`Lauf ${String(i).padStart(2)}: Welle ${String(res.wave).padStart(3)}  ${(res.time / 60).toFixed(1).padStart(5)} min  +${String(res.crystals).padStart(5)} K  Meta-Käufe ${bought}  Σ ${(totalTime / 3600).toFixed(1)} h  dmgLv ${r.lv.dmg} hpLv ${r.lv.hp}`);
}
console.log(JSON.stringify(meta.lv));
