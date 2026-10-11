// Kernwacht – Spielkern (ohne DOM, auch in Node lauffähig)
(function (root) {
  'use strict';

  // ---------- Upgrades im Lauf (Energie) ----------
  const RUN_UPG = [
    { id: 'dmg',      tab: 'atk', name: 'Schaden',          desc: '×1,10 Schaden pro Stufe',          base: 4,   g: 1.12 },
    { id: 'rate',     tab: 'atk', name: 'Feuerrate',        desc: '+5 % Schüsse pro Sekunde',         base: 6,   g: 1.15, max: 25 },
    { id: 'range',    tab: 'atk', name: 'Reichweite',       desc: '+5 Reichweite',                    base: 10,  g: 1.17, max: 30 },
    { id: 'crit',     tab: 'atk', name: 'Krit-Chance',      desc: '+2,5 % Chance auf Krit',           base: 12,  g: 1.18, max: 16 },
    { id: 'critx',    tab: 'atk', name: 'Krit-Schaden',     desc: '+0,1× Schaden bei Krit',           base: 16,  g: 1.16, max: 15 },
    { id: 'multi',    tab: 'atk', name: 'Mehrfachschuss',   desc: '+1 Ziel pro Salve',                base: 150, g: 5,    max: 2 },
    { id: 'mine',     tab: 'atk', name: 'Minenwerfer',      desc: 'Mehr und stärkere Minen',          base: 60,  g: 1.2,  max: 30, req: 'u_mine' },
    { id: 'hp',       tab: 'def', name: 'Hülle',            desc: '×1,10 Strukturpunkte',             base: 4,   g: 1.12 },
    { id: 'regen',    tab: 'def', name: 'Reparatur',        desc: 'Mehr Regeneration pro Sekunde',    base: 8,   g: 1.15, max: 40 },
    { id: 'armor',    tab: 'def', name: 'Panzerung',        desc: 'Weniger Schaden durch Treffer',    base: 14,  g: 1.17, max: 40 },
    { id: 'knock',    tab: 'def', name: 'Rückstoß',         desc: 'Treffer stoßen Gegner zurück',     base: 20,  g: 1.2,  max: 20 },
    { id: 'shock',    tab: 'def', name: 'Schockwelle',      desc: 'Impuls um die Basis',              base: 50,  g: 1.2,  max: 30, req: 'u_shock' },
    { id: 'blade',    tab: 'def', name: 'Orbitklingen',     desc: 'Mehr und schärfere Klingen',       base: 70,  g: 1.2,  max: 30, req: 'u_blade' },
    { id: 'loot',     tab: 'eco', name: 'Energieausbeute',  desc: '+10 % Energie pro Abschuss',       base: 8,   g: 1.16, max: 30 },
    { id: 'interest', tab: 'eco', name: 'Zinsen',           desc: '+1 % Zinsen pro Welle',            base: 25,  g: 1.22, max: 15 },
    { id: 'crys',     tab: 'eco', name: 'Kristallfilter',   desc: '+6 % Kristalle in diesem Lauf',    base: 40,  g: 1.25, max: 20 },
  ];

  // ---------- Labor (Kristalle, dauerhaft) ----------
  const META_UPG = [
    { id: 'm_dmg',    name: 'Kalibrierte Läufe',  desc: '×1,08 Schaden',                     base: 3,  g: 1.2 },
    { id: 'm_hp',     name: 'Verbundhülle',       desc: '×1,08 Strukturpunkte',              base: 3,  g: 1.2 },
    { id: 'm_rate',   name: 'Kühlkreislauf',      desc: '+3 % Feuerrate',                    base: 5,  g: 1.25, max: 20 },
    { id: 'm_regen',  name: 'Nanoreparatur',      desc: '+10 % Reparatur',                   base: 4,  g: 1.22, max: 30 },
    { id: 'm_armor',  name: 'Keramikschicht',     desc: '+1 % Panzerung',                    base: 6,  g: 1.25, max: 15 },
    { id: 'm_loot',   name: 'Energiesammler',     desc: '+8 % Energie',                     base: 4,  g: 1.22 },
    { id: 'm_start',  name: 'Startkapital',       desc: 'Mehr Energie zum Laufbeginn',       base: 6,  g: 1.3,  max: 25 },
    { id: 'm_cheap',  name: 'Effiziente Fertigung', desc: '−2 % Upgradekosten im Lauf',     base: 10, g: 1.3,  max: 15 },
    { id: 'm_head',   name: 'Vorsprung',          desc: '+1 Startstufe Schaden, Feuerrate, Hülle, Reparatur', base: 20, g: 1.45, max: 15 },
    { id: 'm_crys',   name: 'Kristallresonanz',   desc: '+10 % Kristalle',                   base: 8,  g: 1.25 },
    { id: 'u_shock',  name: 'Schockwelle',        desc: 'Schaltet die Schockwelle frei',     base: 25, g: 1, max: 1, unlock: true },
    { id: 'u_blade',  name: 'Orbitklingen',       desc: 'Schaltet die Orbitklingen frei',    base: 60, g: 1, max: 1, unlock: true },
    { id: 'u_mine',   name: 'Minenwerfer',        desc: 'Schaltet den Minenwerfer frei',     base: 110, g: 1, max: 1, unlock: true },
  ];

  const ENEMY = {
    grunt:   { hp: 5,   spd: 30, dmg: 1,   rw: 1,   r: 7,  col: 'grunt' },
    runner:  { hp: 2.4, spd: 58, dmg: 0.7, rw: 1,   r: 5,  col: 'runner' },
    brute:   { hp: 14,  spd: 17, dmg: 2.5, rw: 3,   r: 11, col: 'brute' },
    shooter: { hp: 7,   spd: 28, dmg: 0.8, rw: 2.5, r: 7,  col: 'shooter', stop: 120 },
    boss:    { hp: 45,  spd: 12, dmg: 8,   rw: 30,  r: 20, col: 'boss' },
  };

  const FIELD_W = 240, FIELD_H = 430, BASE_R = 22, WAVE_LEN = 20, SPAWN_LEN = 15;
  const STRIKE_KILLS = 30, STRIKE_R = 80;

  function newMeta() {
    return { v: 1, crystals: 0, best: 0, runs: 0, kills: 0, lv: {}, lastSeen: Date.now(), totalCrystals: 0 };
  }
  const mlv = (m, id) => (m.lv && m.lv[id]) || 0;

  function metaCost(u, l) { return Math.ceil(u.base * Math.pow(u.g, l)); }
  function cheapMult(meta) { return Math.pow(0.98, mlv(meta, 'm_cheap')); }
  function startEnergy(meta) { const l = mlv(meta, 'm_start'); return l ? Math.round(10 * l * Math.pow(1.12, l)) : 0; }

  // Balancing-Stellschrauben
  const P = root.KW_P || {
    eHp: 1.13, eHpLin: 0.12, eDmg: 1.1, eDmgLin: 0.06, eRw: 1.02, eRwLin: 0,
    cBase: 2.5, cGrow: 1.01, pDmg: 8, pHp: 60, lvDmg: 1.1, lvHp: 1.1, rw0: 1.3,
  };
  const hpScale = w => Math.pow(1 + P.eHpLin * (w - 1), 2) * Math.pow(P.eHp, w - 1);
  const dmgScale = w => (1 + P.eDmgLin * (w - 1)) * Math.pow(P.eDmg, w - 1);
  const rwScale = w => P.rw0 * (1 + P.eRwLin * (w - 1)) * Math.pow(P.eRw, w - 1);
  // Kristalle pro abgeschlossener Welle (wächst mit, damit das Labor nie zur Mauer wird)
  const waveCrystals = w => P.cBase * Math.pow(P.cGrow, w);

  // Offline-Ertrag: volle Rate, max. 24 h, keine Paywall
  function offlinePerHour(meta) {
    if (!meta.best) return 0;
    return 6 * waveCrystals(meta.best * 0.8) * (1 + 0.1 * mlv(meta, 'm_crys'));
  }

  class Run {
    constructor(meta, opts) {
      this.meta = meta;
      this.fxOn = !(opts && opts.noFx);
      this.lv = {};
      RUN_UPG.forEach(u => (this.lv[u.id] = 0));
      const h = mlv(meta, 'm_head');
      this.free = { dmg: h, rate: h, hp: h, regen: h };
      this.energy = startEnergy(meta);
      this.wave = 0; this.time = 0;
      this.enemies = []; this.bullets = []; this.ebullets = []; this.mines = []; this.fx = [];
      this.kills = 0; this.crystals = 0; this.dead = false;
      this.fireT = 0; this.shockT = 0; this.mineT = 0; this.bladeA = 0;
      this.aim = -Math.PI / 2; this.shots = 0; this.charge = 0;
      this.focus = null; this.focusUntil = 0; this.uid = 0;
      this.recalc();
      this.hp = this.s.maxHp;
      this.nextWave();
    }

    // ---------- Speichern / Laden ----------
    snapshot() {
      const keep = ['lv', 'free', 'energy', 'wave', 'time', 'waveT', 'kills', 'crystals', 'fireT', 'shockT', 'mineT', 'bladeA', 'aim', 'charge', 'hp', 'queue', 'spawnGap', 'spawnT', 'uid'];
      const o = {}; keep.forEach(k => (o[k] = this[k]));
      o.enemies = this.enemies.map(e => Object.assign({}, e));
      o.ebullets = this.ebullets.map(b => Object.assign({}, b));
      o.mines = this.mines.map(m => Object.assign({}, m));
      return o;
    }
    static restore(meta, o) {
      const r = new Run(meta, {});
      Object.assign(r, o);
      r.bullets = []; r.fx = []; r.focus = null; r.dead = false;
      r.recalc();
      return r;
    }

    L(id) { return this.lv[id] + (this.free[id] || 0); }

    recalc() {
      const M = id => mlv(this.meta, id), L = id => this.L(id);
      const s = {};
      s.dmg = P.pDmg * Math.pow(P.lvDmg, L('dmg')) * Math.pow(1.08, M('m_dmg'));
      s.rate = 1.2 * (1 + 0.05 * L('rate')) * (1 + 0.03 * M('m_rate'));
      s.range = 150 + 5 * L('range');
      s.crit = 0.025 * L('crit');
      s.critx = 1.5 + 0.1 * L('critx');
      s.multi = L('multi');
      s.maxHp = P.pHp * Math.pow(P.lvHp, L('hp')) * Math.pow(1.08, M('m_hp'));
      const rg = L('regen');
      s.regen = s.maxHp * 0.025 * (rg / (rg + 15)) * (1 + 0.1 * M('m_regen'));
      const ar = L('armor');
      s.armor = Math.min(0.65, 0.55 * ar / (ar + 15) + 0.01 * M('m_armor'));
      s.knock = L('knock') ? 1.5 + 0.35 * L('knock') : 0;
      s.loot = (1 + 0.1 * L('loot')) * (1 + 0.08 * M('m_loot'));
      s.interest = 0.01 * L('interest');
      s.crysMult = (1 + 0.06 * L('crys')) * (1 + 0.1 * M('m_crys'));
      const sh = L('shock');
      s.shockCd = sh ? Math.max(2.5, 7 - 0.15 * sh) : 0;
      s.shockR = 80 + 3 * sh;
      s.shockDmg = s.dmg * (1 + 0.35 * sh);
      const bl = L('blade');
      s.blades = bl ? Math.min(6, 1 + Math.floor(bl / 5)) : 0;
      s.bladeDmg = s.dmg * 0.4 * (1 + 0.15 * bl);
      const mi = L('mine');
      s.mineCd = mi ? Math.max(1, 4 - 0.1 * mi) : 0;
      s.mineDmg = s.dmg * (2.5 + 0.4 * mi);
      s.strikeDmg = s.dmg * 25;
      // Effektiver Schaden pro Sekunde des Hauptgeschützes (Erwartungswert)
      s.dps = s.dmg * s.rate * (1 + s.crit * (s.critx - 1));
      this.s = s;
    }

    cost(u) { return Math.ceil(u.base * Math.pow(u.g, this.lv[u.id]) * cheapMult(this.meta)); }
    available(u) { return !u.req || mlv(this.meta, u.req) > 0; }
    maxed(u) { return u.max != null && this.L(u.id) >= u.max; }
    canBuy(u) { return this.available(u) && !this.maxed(u) && this.energy >= this.cost(u); }
    buy(u) {
      if (!this.canBuy(u)) return false;
      this.energy -= this.cost(u);
      const before = this.s.maxHp;
      this.lv[u.id]++;
      this.recalc();
      if (this.s.maxHp > before) this.hp += this.s.maxHp - before;
      return true;
    }

    nextWave() {
      if (this.wave > 0) {
        this.crystals += waveCrystals(this.wave) * this.s.crysMult;
        if (this.s.interest) this.energy += Math.min(this.energy * this.s.interest, 40 * rwScale(this.wave) * (1 + this.s.interest * 10));
      }
      this.wave++;
      this.waveT = 0;
      const w = this.wave;
      const boss = w % 10 === 0;
      let n = Math.min(70, 5 + Math.floor(1.6 * w));
      if (boss) n = Math.floor(n * 0.6);
      const list = [];
      for (let i = 0; i < n; i++) {
        let r = Math.random(), t = 'grunt';
        if (w >= 15 && r < 0.08) t = 'shooter';
        else if (w >= 6 && r < 0.22) t = 'brute';
        else if (w >= 3 && r < 0.45) t = 'runner';
        list.push(t);
      }
      if (boss) list.splice(Math.floor(n / 2), 0, 'boss');
      this.queue = list;
      this.spawnGap = SPAWN_LEN / list.length;
      this.spawnT = 0;
      if (this.fxOn) this.fx.push({ k: 'wave', t: 0, w, boss });
    }

    spawn(type) {
      const d = ENEMY[type], w = this.wave;
      const x0 = (Math.random() * 2 - 1) * FIELD_W, y0 = -FIELD_H - Math.random() * 30;
      const hp = d.hp * hpScale(w);
      this.enemies.push({
        id: ++this.uid, type, a: Math.atan2(y0, x0), dist: Math.hypot(x0, y0), hp, maxHp: hp,
        spd: d.spd * (1 + Math.min(0.6, w * 0.006)),
        dmg: d.dmg * dmgScale(w), rw: d.rw * rwScale(w), r: d.r, stop: d.stop || 0,
        atkT: 0.5, shotT: 1 + Math.random(), bladeHit: 0, kbT: 0, flash: 0, seed: Math.random() * 6.28,
      });
    }

    pos(e) { return { x: Math.cos(e.a) * e.dist, y: Math.sin(e.a) * e.dist }; }

    hurt(e, d, crit) {
      if (e.hp <= 0) return;
      e.hp -= d; e.flash = 0.08;
      if (this.fxOn && (crit || e.type === 'boss' || e.type === 'brute')) { const p = this.pos(e); this.fx.push({ k: 'dmg', x: p.x, y: p.y, t: 0, v: d, crit }); }
      if (e.hp <= 0) {
        this.energy += e.rw * this.s.loot;
        this.kills++;
        this.charge = Math.min(1, this.charge + (e.type === 'boss' ? 0.35 : 1 / STRIKE_KILLS));
        if (e.type === 'boss') this.crystals += 5 * waveCrystals(this.wave) * this.s.crysMult;
        if (this.fxOn) { const p = this.pos(e); this.fx.push({ k: 'boom', x: p.x, y: p.y, t: 0, type: e.type, r: e.r, a: e.a }); }
        if (this.focus === e) this.focus = null;
      }
    }

    hitBase(d) {
      this.hp -= d * (1 - this.s.armor);
      if (this.fxOn) this.fx.push({ k: 'hurt', t: 0 });
      if (this.hp <= 0 && !this.dead) { this.hp = 0; this.dead = true; }
    }

    // ---------- Spieleraktionen ----------
    // Ziel markieren: das Geschütz priorisiert diesen Gegner für 6 s
    markAt(x, y) {
      let best = null, bd = 40;
      for (const e of this.enemies) { if (e.hp <= 0) continue; const p = this.pos(e), d = Math.hypot(p.x - x, p.y - y) - e.r; if (d < bd) { bd = d; best = e; } }
      if (best) { this.focus = best; this.focusUntil = this.time + 6; }
      return best;
    }
    // Orbitalschlag: geladen durch Abschüsse, Flächenschaden am Zielpunkt
    strike(x, y) {
      if (this.charge < 1 || this.dead) return false;
      this.charge = 0;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        const p = this.pos(e);
        if (Math.hypot(p.x - x, p.y - y) <= STRIKE_R + e.r) this.hurt(e, this.s.strikeDmg + e.maxHp * (e.type === 'boss' ? 0.1 : 0.35), true);
      }
      if (this.fxOn) this.fx.push({ k: 'strike', x, y, t: 0 });
      return true;
    }

    update(dt) {
      if (this.dead) return;
      const s = this.s;
      this.time += dt;
      this.waveT += dt;
      this.spawnT += dt;
      while (this.queue.length && this.spawnT >= this.spawnGap) { this.spawnT -= this.spawnGap; this.spawn(this.queue.shift()); }
      if (this.waveT >= WAVE_LEN) this.nextWave();

      this.hp = Math.min(s.maxHp, this.hp + s.regen * dt);

      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        e.flash = Math.max(0, e.flash - dt);
        const contact = BASE_R + e.r;
        if (e.stop && e.dist <= e.stop) {
          e.shotT -= dt;
          if (e.shotT <= 0) { e.shotT = 2; const p = this.pos(e); this.ebullets.push({ x: p.x, y: p.y, dmg: e.dmg }); }
        } else if (e.dist > contact) {
          e.dist = Math.max(contact, e.dist - e.spd * dt);
        } else {
          e.atkT -= dt;
          if (e.atkT <= 0) { e.atkT = 1; this.hitBase(e.dmg); }
        }
      }

      for (const b of this.ebullets) {
        const d = Math.hypot(b.x, b.y), v = 150 * dt;
        if (d <= BASE_R + v) { b.done = true; this.hitBase(b.dmg); }
        else { b.x -= (b.x / d) * v; b.y -= (b.y / d) * v; }
      }
      this.ebullets = this.ebullets.filter(b => !b.done);

      // Feuern (markiertes Ziel zuerst)
      if (this.focus && (this.focus.hp <= 0 || this.time > this.focusUntil)) this.focus = null;
      this.fireT += dt * s.rate;
      if (this.fireT >= 1) {
        const inRange = this.enemies.filter(e => e.hp > 0 && e.dist - e.r <= s.range).sort((a, b) => a.dist - b.dist);
        if (this.focus && inRange.includes(this.focus)) { inRange.splice(inRange.indexOf(this.focus), 1); inRange.unshift(this.focus); }
        if (inRange.length) {
          this.aim = inRange[0].a;
          while (this.fireT >= 1) {
            this.fireT -= 1; this.shots++;
            for (let i = 0; i < Math.min(inRange.length, 1 + s.multi); i++) {
              const crit = Math.random() < s.crit;
              const mx = Math.cos(this.aim) * BASE_R, my = Math.sin(this.aim) * BASE_R;
              this.bullets.push({ x: mx, y: my, tgt: inRange[i], dmg: s.dmg * (crit ? s.critx : 1), crit });
            }
          }
        } else this.fireT = 1;
      }
      for (const b of this.bullets) {
        const t = b.tgt;
        if (t.hp <= 0) { b.done = true; continue; }
        const p = this.pos(t), dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy), v = 650 * dt;
        if (d <= v + t.r) {
          b.done = true;
          this.hurt(t, b.dmg, b.crit);
          if (s.knock && t.hp > 0 && t.kbT <= this.time) { t.kbT = this.time + 0.8; t.dist += s.knock * (t.type === 'boss' ? 0.1 : t.type === 'brute' ? 0.4 : 1); }
        } else { b.x += dx / d * v; b.y += dy / d * v; }
      }
      this.bullets = this.bullets.filter(b => !b.done);

      if (s.shockCd) {
        this.shockT += dt;
        if (this.shockT >= s.shockCd) {
          this.shockT = 0;
          for (const e of this.enemies) if (e.hp > 0 && e.dist - e.r <= s.shockR) {
            this.hurt(e, s.shockDmg, false);
            if (e.hp > 0) e.dist += e.type === 'boss' ? 3 : 14;
          }
          if (this.fxOn) this.fx.push({ k: 'shock', t: 0, r: s.shockR });
        }
      }
      if (s.blades) {
        this.bladeA += dt * 2.4;
        const R = 64;
        for (let i = 0; i < s.blades; i++) {
          const a = this.bladeA + (i * Math.PI * 2) / s.blades, bx = Math.cos(a) * R, by = Math.sin(a) * R;
          for (const e of this.enemies) {
            if (e.hp <= 0 || e.bladeHit > this.time) continue;
            const p = this.pos(e);
            if (Math.hypot(p.x - bx, p.y - by) < e.r + 8) { this.hurt(e, s.bladeDmg, false); e.bladeHit = this.time + 0.4; }
          }
        }
      }
      if (s.mineCd) {
        this.mineT += dt;
        if (this.mineT >= s.mineCd && this.mines.length < 12) {
          this.mineT = 0;
          const a = -Math.PI * (0.12 + 0.76 * Math.random()), r = 50 + Math.random() * (s.range - 50);
          this.mines.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, arm: 0.5 });
        }
        for (const m of this.mines) {
          m.arm -= dt; if (m.arm > 0) continue;
          for (const e of this.enemies) {
            if (e.hp <= 0) continue;
            const p = this.pos(e);
            if (Math.hypot(p.x - m.x, p.y - m.y) < e.r + 10) { m.done = true; break; }
          }
          if (m.done) {
            for (const e of this.enemies) { const p = this.pos(e); if (e.hp > 0 && Math.hypot(p.x - m.x, p.y - m.y) < 45) this.hurt(e, s.mineDmg, false); }
            if (this.fxOn) this.fx.push({ k: 'mine', x: m.x, y: m.y, t: 0 });
          }
        }
        this.mines = this.mines.filter(m => !m.done);
      }

      this.enemies = this.enemies.filter(e => e.hp > 0);
    }

    finish() {
      this.dead = true;
      const m = this.meta, c = Math.floor(this.crystals);
      m.crystals += c; m.totalCrystals = (m.totalCrystals || 0) + c;
      m.runs++; m.kills += this.kills;
      const newBest = this.wave > m.best;
      if (newBest) m.best = this.wave;
      return { crystals: c, wave: this.wave, kills: this.kills, time: this.time, newBest };
    }
  }

  function metaBuy(meta, u) {
    const l = mlv(meta, u.id);
    if (u.max != null && l >= u.max) return false;
    const c = metaCost(u, l);
    if (meta.crystals < c) return false;
    meta.crystals -= c; meta.lv[u.id] = l + 1;
    return true;
  }
  const enemyHp = (type, w) => ENEMY[type].hp * hpScale(w);

  root.Core = { RUN_UPG, META_UPG, ENEMY, Run, newMeta, mlv, metaCost, metaBuy, startEnergy, offlinePerHour, enemyHp, FIELD_W, FIELD_H, BASE_R, WAVE_LEN, STRIKE_R, STRIKE_KILLS, P };
})(typeof window !== 'undefined' ? window : globalThis);
