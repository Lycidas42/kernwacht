// Simuliert mehrere Fusionszyklen: Bot fusioniert, wenn er 3 Läufe nicht weiterkommt (ab Bestwelle 50).
// Aufruf: node tools/fusion.js [max. Läufe]   Varianten per KW_P='{...}'
globalThis.KW_P = process.env.KW_P ? JSON.parse(process.env.KW_P) : undefined;
require('../core.js');
const { botBuy } = require('./tune.js');
const C = Core, { Run, newMeta, RUN_UPG, META_UPG, metaBuy, mlv, metaCost } = C;

const N = +process.argv[2] || 100;
const meta = newMeta(); meta.flv = {}; meta.modules = {}; meta.equip = [];
let cycle = 1, cycleRuns = 0, stale = 0, prevBest = 0, regained = null, line = [];
function spendLab() {
  for (;;) { const o = META_UPG.filter(u => (!u.req || mlv(meta, u.req)) && (u.max == null || mlv(meta, u.id) < u.max) && metaCost(u, mlv(meta, u.id)) <= meta.crystals).sort((a, b) => metaCost(a, mlv(meta, a.id)) - metaCost(b, mlv(meta, b.id))); if (!o.length) break; metaBuy(meta, o[0]); }
}
function spendFrag() {
  const prio = ['f_tech', 'f_core', 'f_crys', 'f_rocket', 'f_cryo', 'f_keep', 'f_frag'];
  for (;;) {
    const o = C.FUSION_UPG.filter(u => (u.max == null || C.flv(meta, u.id) < u.max) && C.fusionCost(u, C.flv(meta, u.id)) <= meta.frag)
      .sort((a, b) => C.fusionCost(a, C.flv(meta, a.id)) * (1 + prio.indexOf(a.id) * 0.15) - C.fusionCost(b, C.flv(meta, b.id)) * (1 + prio.indexOf(b.id) * 0.15));
    if (!o.length) break; C.fusionBuy(meta, o[0]);
  }
}
function equip() { meta.equip = Object.values(meta.modules).sort((a, b) => C.moduleValue(b) / C.MODULES[b.type].base - C.moduleValue(a) / C.MODULES[a.type].base).slice(0, 3).map(m => m.type); }

for (let i = 1; i <= N; i++) {
  const r = new Run(meta, { noFx: true, startWave: C.startWaveFor(meta) }); let lb = 0;
  while (!r.dead && r.time < 1800) {
    r.update(0.1);
    if (r.time - lb > 1) { lb = r.time; botBuy(r, RUN_UPG); if (r.charge >= 1 && r.enemies.length) { const p = r.pos(r.enemies[0]); r.strike(p.x, p.y); } }
  }
  const before = meta.best, res = r.finish(); cycleRuns++;
  line.push(res.wave);
  if (prevBest && regained == null && meta.best >= prevBest) regained = cycleRuns;
  stale = meta.best > before ? 0 : stale + 1;
  spendLab(); equip();
  if (meta.best >= C.FUSION_MIN && stale >= 3) {
    const g = C.fuse(meta);
    console.log(`Zyklus ${cycle}: ${cycleRuns} Läufe, Best ${prevBest ? meta.bestEver : meta.bestEver}, +${g} Fragmente${prevBest ? `, alte Bestwelle ${prevBest} wieder nach ${regained ?? '-'} Läufen` : ''}\n   ${line.join(' ')}`);
    prevBest = Math.max(...line); regained = null; line = []; cycle++; cycleRuns = 0; stale = 0;
    spendFrag();
    console.log(`   Fragment-Stufen: ${JSON.stringify(meta.flv)} Rest ${meta.frag}, Module ${Object.keys(meta.modules).length}`);
  }
}
console.log(`offen (Zyklus ${cycle}, ${cycleRuns} Läufe${prevBest ? `, alte Bestwelle ${prevBest} wieder nach ${regained ?? '-'} Läufen` : ''}): ${line.join(' ')}`);
