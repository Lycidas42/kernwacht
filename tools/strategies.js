// Vergleicht Kaufstrategien: Lohnt sich Abwehr? (nur Angriff vs. ausgewogen vs. abwehrlastig)
// Aufruf: node tools/strategies.js [Läufe für den Meta-Aufbau]
globalThis.KW_P = process.env.KW_P ? JSON.parse(process.env.KW_P) : undefined;
require('../core.js');
const { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = Core;

const OFF = ['dmg', 'rate', 'range', 'crit', 'critx', 'multi', 'mine', 'shock', 'blade'];
const DEF = ['hp', 'regen', 'armor', 'knock'];
const ECO = ['loot', 'interest', 'crys'];
// Gewicht = wie gern der Bot kauft (Kosten / Gewicht entscheidet)
const STRATS = {
  angriff:    Object.fromEntries([...OFF.map(k => [k, 1]), ...ECO.map(k => [k, 0.4])]),
  ausgewogen: Object.fromEntries([...OFF.map(k => [k, 1]), ...DEF.map(k => [k, 1]), ...ECO.map(k => [k, 0.4])]),
  abwehr:     Object.fromEntries([...OFF.map(k => [k, k === 'dmg' || k === 'rate' ? 0.6 : 0.2]), ...DEF.map(k => [k, 1.4]), ...ECO.map(k => [k, 0.4])]),
};

function buy(r, W) {
  for (let g = 0; g < 500; g++) {
    const o = RUN_UPG.filter(u => W[u.id] && r.available(u) && !r.maxed(u)).sort((a, b) => r.cost(a) / W[a.id] - r.cost(b) / W[b.id]);
    if (!o.length || r.energy < r.cost(o[0])) break;
    r.buy(o[0]);
  }
}
function play(meta, W, S) {
  const r = new Run(meta, { noFx: true, startWave: S || 1 }); let lb = 0;
  while (!r.dead && r.time < 1500) {
    r.update(0.1);
    if (r.time - lb > 1) { lb = r.time; buy(r, W); if (r.charge >= 1 && r.enemies.length) { const p = r.pos(r.enemies[0]); r.strike(p.x, p.y); } }
  }
  return r;
}
function metaSpend(meta) {
  for (;;) { const o = META_UPG.filter(u => (!u.req || mlv(meta, u.req)) && (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals).sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id))); if (!o.length) break; metaBuy(meta, o[0]); }
}

const N = +process.argv[2] || 24, checkpoints = [4, 10, 16, N];
const meta = newMeta(); const waves = [];
for (let i = 1; i <= N; i++) {
  const r = play(meta, STRATS.ausgewogen); const res = r.finish(); waves.push(res.wave); metaSpend(meta);
  if (checkpoints.includes(i)) {
    const line = [];
    for (const k in STRATS) {
      let sum = 0; const T = 3;
      for (let j = 0; j < T; j++) { const m = JSON.parse(JSON.stringify(meta)); sum += play(m, STRATS[k]).wave; }
      line.push(`${k} ${(sum / T).toFixed(1)}`);
    }
    console.log(`nach Lauf ${String(i).padStart(2)} (Best ${meta.best}): ${line.join(' | ')}`);
  }
}
console.log('Fortschritt (ausgewogen):', waves.join(' '));
