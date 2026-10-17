// Echo-Zyklen: Läufe ab Welle 251 mit festem Spielstand, mit und ohne Anomalien, dazu jede Anomalie einzeln
// Aufruf: node tools/echo.js [Läufe je Variante] [f_core-Stufen, Komma-getrennt]
//   Umgebung: STRAT (atk = nur Angriff im Lauf), DEF (Verteidigung ×, Standard 1), START (Startwelle), TMAX (Spielzeit in s), ONLY (off,game,ion,… nur diese Varianten)
//   z. B. node tools/echo.js 6 30,40,50   (Stärke über die Stufe des Fusionskerns)
globalThis.KW_P = process.env.KW_P ? JSON.parse(process.env.KW_P) : undefined;
require('../core.js');
const { botBuy } = require('./tune.js');
const C = Core, N = +process.argv[2] || 5, CORES = (process.argv[3] || '30,40,50').split(',').map(Number), START = +process.env.START || 251, TMAX = +process.env.TMAX || 5400;
const twist0 = C.Run.prototype.twist;
// STRAT=atk: im Lauf nur Angriff und Wirtschaft kaufen (prüft, ob Abwehr spät noch nötig ist)
const ATK = ['dmg', 'rate', 'range', 'crit', 'critx', 'multi', 'pierce', 'rocket', 'cryo', 'mine', 'loot', 'interest', 'crys'];
function atkBuy(r) { for (let g = 0; g < 500; g++) { const o = C.RUN_UPG.filter(u => ATK.includes(u.id) && r.canBuy(u)).sort((a, b) => r.cost(a) - r.cost(b)); if (!o.length) break; r.buy(o[0]); } }
const BUY = process.env.STRAT === 'atk' ? atkBuy : r => botBuy(r, C.RUN_UPG);
function mkMeta(fc) {
  const m = C.newMeta();
  const D = +process.env.DEF || 1; // Verteidigung skalieren (Strukturpunkte, Reparatur, Panzerung), damit Sterben eine Rolle spielt
  m.lv = { m_dmg: 45, m_hp: Math.round(45 * D), m_rate: 20, m_regen: Math.round(30 * D), m_armor: Math.round(15 * D), m_loot: 30, m_crys: 25, m_head: 10, m_cheap: 15, m_start: 20, u_shock: 1, u_blade: 1, u_mine: 1, u_freeze: 1, m_freeze: 5, u_over: 1, m_over: 3, u_jump: 1, m_jump: 30 };
  m.flv = { f_core: fc, f_rocket: 1, f_cryo: 1 }; m.best = m.bestEver = 2000;
  m.modules = {}; for (const t in C.MODULES) m.modules[t] = { type: t, rar: 2, copies: 5 }; m.equip = ['splinter', 'chain', 'overcharge'];
  return m;
}
// force: null = Anomalien wie im Spiel, 'off' = keine, sonst id einer Anomalie für alle Wellen
function play(fc, force) {
  const A = force && force !== 'off' && C.ANOMALIES.find(a => a.id === force);
  C.Run.prototype.twist = force === 'off' ? function () { return this.mode ? twist0.call(this) : null; } : A ? function () { return this.mode ? twist0.call(this) : A; } : twist0;
  const m = mkMeta(fc), r = new C.Run(m, { noFx: true, startWave: START }); let lb = 0, top = 0, topT = 0;
  // Wand: erste Welle, an der der Bot länger als WALL Sekunden hängt (meist ein Boss, der schneller heilt oder zäher ist als der Schaden reicht)
  const WALL = +process.env.WALL || 600;
  while (!r.dead && r.time < TMAX) {
    r.update(0.1); if (r.wave > top) { top = r.wave; topT = r.time; }
    if (r.time - topT > WALL) break;
    if (r.time - lb > 1) { lb = r.time; BUY(r); if (r.charge >= 1 && r.enemies.length) { const t = r.enemies.find(e => e.type === 'boss') || r.enemies.reduce((a, b) => a.dist < b.dist ? a : b); const p = r.pos(t); r.strike(p.x, p.y); } }
  }
  C.Run.prototype.twist = twist0;
  return { wave: r.wave, pace: topT / 60, taken: (r.taken || 0) / r.s.maxHp, time: r.time, crys: r.crystals, loot: r.loot.length, alive: !r.dead };
}
const med = a => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const fmt = v => v >= 1e6 ? v.toExponential(2) : Math.round(v) + '';
console.log(`Start Welle ${START}, ${N} Läufe je Variante, höchstens ${TMAX / 60} min Spielzeit`);
for (const fc of CORES) {
  console.log(`\n--- Fusionskern ${fc} ---`);
  for (const v of (process.env.ONLY ? process.env.ONLY.split(',').map(x => x === 'game' ? null : x) : ['off', null].concat(C.ANOMALIES.map(a => a.id)))) {
    const R = Array.from({ length: N }, () => play(fc, v));
    const w = R.map(x => x.wave), ks = R.map(x => x.crys / (x.time / 3600)), mods = R.map(x => x.loot / (x.time / 3600));
    console.log(`${(v === 'off' ? 'ohne Anomalien' : v || 'wie im Spiel').padEnd(15)} Wand/Ende Welle ${String(med(w)).padStart(4)}  (${w.join('/')})  lebt ${R.filter(x => x.alive).length}/${N}  min bis dahin ${med(R.map(x => x.pace)).toFixed(0)}  Schaden/Max-SP ${med(R.map(x => x.taken)).toFixed(1)}  Kristalle/h ${fmt(med(ks))}  Module/h ${med(mods).toFixed(1)}`);
  }
}
