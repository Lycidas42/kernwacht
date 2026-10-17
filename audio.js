// Kernwacht – Ton und Musik, komplett mit WebAudio erzeugt (keine Audiodateien)
(function (root) {
  'use strict';
  let ac = null, master, sfxBus, musicBus, noiseBuf;
  let sfxOn = true, musicOn = true, musicTimer = null, sfxVol = 1, musicVol = 1;
  const last = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.8;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 0.55 * sfxVol : 0; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? 0.32 * musicVol : 0; musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (musicOn) startMusic();
  }

  // Drosselung, damit Dauerfeuer nicht zur Lärmwand wird
  function throttle(key, ms) { const n = performance.now(); if (last[key] && n - last[key] < ms) return true; last[key] = n; return false; }

  function osc(type, f0, f1, dur, vol, when, bus) {
    const t = (when || ac.currentTime);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, fFrom, fTo, q, when, type) {
    const t = (when || ac.currentTime);
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.Q.value = q || 0.7;
    f.frequency.setValueAtTime(fFrom, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, fTo), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + dur + 0.02);
  }

  const SFX = {
    shot(o) { if (throttle('shot', 70)) return; const p = o && o.over ? 1.3 : 1; osc('square', 880 * p, 220 * p, 0.07, 0.05); },
    crit() { if (throttle('crit', 90)) return; osc('sawtooth', 1400, 500, 0.09, 0.05); },
    boom(o) {
      const big = o && o.type === 'boss' ? 3 : o && (o.type === 'brute' || o.type === 'bomb') ? 1.6 : 1;
      if (big === 1 && throttle('boom', 45)) return;
      noise(0.25 * big, 0.22 * Math.min(2, big), 2400, 120, 0.8);
      osc('sine', 140 / big, 40, 0.22 * big, 0.25 * Math.min(2, big));
    },
    mine() { if (throttle('mine', 60)) return; noise(0.45, 0.35, 1200, 60, 1); osc('sine', 90, 30, 0.4, 0.4); },
    shock() { osc('sine', 300, 60, 0.45, 0.22); noise(0.4, 0.12, 3000, 300, 2, null, 'bandpass'); },
    strike() {
      const t = ac.currentTime;
      osc('sawtooth', 200, 1600, 0.25, 0.12, t);
      noise(0.9, 0.5, 4000, 60, 0.9, t + 0.22); osc('sine', 80, 25, 0.8, 0.5, t + 0.22);
    },
    // EMP: dumpfer Schlag, elektrisches Knistern, dann klirrendes Eis
    freeze() {
      const t = ac.currentTime;
      osc('sine', 160, 30, 0.6, 0.45, t);
      noise(0.5, 0.3, 6000, 300, 6, t, 'bandpass');
      for (let i = 0; i < 6; i++) osc('square', 2000 + Math.random() * 3000, 400, 0.04, 0.05, t + 0.03 + i * 0.045);
      [1760, 2093, 2637, 3136].forEach((f, i) => osc('triangle', f, f * 0.98, 0.6, 0.05, t + 0.25 + i * 0.05));
    },
    over() { const t = ac.currentTime; [220, 330, 440, 660, 880].forEach((f, i) => osc('sawtooth', f, f * 1.02, 0.12, 0.08, t + i * 0.05)); },
    eshot() { if (throttle('eshot', 140)) return; osc('square', 520, 260, 0.05, 0.018); },
    hurt() { if (throttle('hurt', 160)) return; osc('sawtooth', 110, 70, 0.15, 0.12); },
    wave(o) {
      const t = ac.currentTime;
      if (o && o.boss) { osc('sawtooth', 73, 70, 1.4, 0.18, t); osc('sawtooth', 110, 104, 1.4, 0.12, t); osc('square', 55, 52, 1.6, 0.08, t + 0.2); }
      else { osc('triangle', 660, 0, 0.14, 0.08, t); osc('triangle', 990, 0, 0.2, 0.08, t + 0.1); }
    },
    bossact(o) {
      const a = o && o.act;
      if (a === 'shield') { osc('sine', 300, 600, 0.5, 0.12); osc('sine', 450, 900, 0.5, 0.06); }
      else if (a === 'bomb') { osc('square', 180, 90, 0.35, 0.1); }
      else if (a === 'laser') { osc('sawtooth', 200, 1400, 2, 0.08); osc('sine', 100, 700, 2, 0.08); }
      else if (a === 'broken') { osc('square', 900, 120, 0.3, 0.1); noise(0.3, 0.2, 4000, 500, 1); }
      else if (a === 'cloak') { osc('sine', 1200, 200, 0.6, 0.08); }
      else if (a === 'nova' || a === 'bulwarks' || a === 'mend') { osc('triangle', 300, 600, 0.4, 0.1); }
      else if (a === 'spawn') { [0, 0.07, 0.14].forEach(d => osc('square', 520, 260, 0.08, 0.05, ac.currentTime + d)); }
      else { [0, 0.08, 0.16].forEach(d => osc('sawtooth', 700, 300, 0.1, 0.06, ac.currentTime + d)); }
    },
    buy() { if (throttle('buy', 50)) return; osc('triangle', 1200, 1600, 0.06, 0.04); },
    click() { osc('triangle', 900, 700, 0.04, 0.05); },
    mark() { osc('sine', 1300, 1800, 0.08, 0.06); },
    over_end() {},
    loot() { const t = ac.currentTime; [784, 988, 1175, 1568].forEach((f, i) => osc('triangle', f, f, 0.25, 0.07, t + i * 0.07)); },
    fusion() { const t = ac.currentTime; osc('sawtooth', 55, 880, 1.6, 0.18, t); osc('sine', 110, 1760, 1.6, 0.12, t); noise(1.8, 0.25, 200, 8000, 1, t, 'bandpass'); osc('sine', 60, 30, 1.2, 0.5, t + 1.5); },
    rlaunch() { if (throttle('rl', 120)) return; noise(0.35, 0.12, 900, 2500, 2, null, 'bandpass'); osc('sawtooth', 120, 260, 0.3, 0.05); },
    cryo() { if (throttle('cryo', 90)) return; osc('triangle', 2400, 1200, 0.12, 0.05); noise(0.15, 0.06, 9000, 4000, 1, null, 'highpass'); },
    laserhit() { const t = ac.currentTime; osc('sawtooth', 90, 40, 0.6, 0.3, t); noise(0.5, 0.4, 3000, 100, 1, t); },
    nova() { const t = ac.currentTime; osc('sine', 400, 50, 0.7, 0.35, t); noise(0.7, 0.3, 5000, 200, 1, t); },
    meteor() { const t = ac.currentTime; noise(1.1, 0.5, 2600, 50, 0.8, t); osc('sine', 70, 22, 1, 0.55, t); osc('sawtooth', 120, 40, 0.6, 0.12, t); },
    fireball() { const t = ac.currentTime; noise(0.55, 0.32, 1800, 120, 0.8, t); osc('sawtooth', 170, 45, 0.45, 0.14, t); },
    lance() { const t = ac.currentTime; osc('triangle', 3200, 900, 0.18, 0.07, t); noise(0.25, 0.08, 9000, 3000, 1, t, 'highpass'); [2093, 2637].forEach((f, i) => osc('triangle', f, f, 0.3, 0.04, t + 0.08 + i * 0.05)); },
    shatter() { if (throttle('shatter', 90)) return; const t = ac.currentTime; [3000, 4200, 5200].forEach((f, i) => osc('square', f, f * 0.6, 0.05, 0.025, t + i * 0.03)); },
    beam() { if (throttle('beam', 300)) return; const t = ac.currentTime; osc('sine', 520, 1040, 0.35, 0.07, t); osc('triangle', 1560, 1560, 0.3, 0.03, t); },
    gameover() { const t = ac.currentTime; [392, 330, 262, 196].forEach((f, i) => osc('triangle', f, f * 0.97, 0.35, 0.1, t + i * 0.16)); },
  };
  function play(name, o) { if (!ac || !sfxOn || ac.state !== 'running') return; const f = SFX[name]; if (f) f(o); }

  // ---------- Musik: generative Stücke in verschiedenen Stilen (Sechzehntel-Raster) ----------
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let nextT = 0, step16 = 0, intensity = 0, track = null, delayIn = null, wantTrack = 'synth';
  function ensureFx() {
    if (delayIn) return;
    // Echo für Ambient und Lo-Fi
    delayIn = ac.createGain(); delayIn.gain.value = 1;
    const d = ac.createDelay(1.5), fb = ac.createGain(), lp = ac.createBiquadFilter();
    d.delayTime.value = 0.42; fb.gain.value = 0.38; lp.type = 'lowpass'; lp.frequency.value = 2400;
    delayIn.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(musicBus);
  }
  // Ton mit Hüllkurve; send = Anteil ins Echo
  function tone(type, f, t, dur, vol, cutoff, o) {
    o = o || {};
    const os = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
    os.type = type; os.frequency.value = f; if (o.detune) os.detune.value = o.detune;
    fl.type = 'lowpass'; fl.frequency.value = cutoff || 2000; if (o.q) fl.Q.value = o.q;
    if (o.sweep) { fl.frequency.setValueAtTime(cutoff, t); fl.frequency.exponentialRampToValueAtTime(o.sweep, t + dur); }
    const a = o.attack || 0.01;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.02));
    os.connect(fl); fl.connect(g); g.connect(musicBus);
    if (o.send) { ensureFx(); const sg = ac.createGain(); sg.gain.value = o.send; g.connect(sg); sg.connect(delayIn); }
    os.start(t); os.stop(t + Math.max(dur, a + 0.02) + 0.05);
  }
  function kick(t, vol, f0, f1) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(f0 || 120, t); o.frequency.exponentialRampToValueAtTime(f1 || 40, t + 0.12); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.18); }
  function hiss(t, vol, freq, dur, type) { const src = ac.createBufferSource(); src.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq; const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); src.connect(f); f.connect(g); g.connect(musicBus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02); }
  const chord = (root, q) => q === 'm' ? [root, root + 3, root + 7] : [root, root + 4, root + 7];

  const TRACKS = {
    synth: {
      name: 'Neon-Synthwave', bpm: 96,
      prog: [[57, 'm'], [53, ''], [48, ''], [55, '']],
      tick(i, t, S) {
        const [r, q] = this.prog[Math.floor(i / 16) % 4], s = i % 16, n = chord(r, q);
        if (s % 2 === 0) tone('sawtooth', mtof(r - 24), t, S * 1.8, 0.16, 380 + intensity * 500);
        if (s === 0) n.forEach(x => tone('triangle', mtof(x), t, S * 15, 0.035, 1400));
        const arp = [0, 1, 2, 1, 0, 2, 1, 2];
        if (s % 2 === 1 || intensity > 0.5) tone('square', mtof(n[arp[s % 8]] + 12), t, S * 0.9, 0.025 + intensity * 0.015, 1800 + intensity * 1500);
        if (s % 4 === 0) kick(t, 0.35);
        if (s % 2 === 1) hiss(t, 0.05, 7000, 0.04);
      },
    },
    chip: {
      name: '8-Bit-Arcade', bpm: 140,
      prog: [[60, ''], [57, 'm'], [53, ''], [55, '']],
      mel: [0, 2, 4, 7, 4, 2, 0, -1, 0, 4, 7, 9, 7, 4, 2, 4],
      tick(i, t, S) {
        const bar = Math.floor(i / 16) % 4, [r] = this.prog[bar], s = i % 16;
        const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
        if (s % 2 === 0) tone('triangle', mtof(r - 12 + (s % 4 === 2 ? 7 : 0)), t, S * 1.6, 0.18, 3000);
        const m = this.mel[(s + bar * 4) % 16];
        if (s % 2 === 0 || intensity > 0.5) tone('square', mtof(r + 12 + (m < 0 ? -1 : scale[m] || m)), t, S * 0.8, 0.03, 4000);
        if (s === 0 || s === 8) tone('square', mtof(r + 24), t, S * 0.4, 0.015, 5000);
        if (s % 8 === 0) kick(t, 0.25, 160, 50);
        if (s % 8 === 4) hiss(t, 0.09, 2500, 0.09, 'bandpass');
        if (s % 2 === 1) hiss(t, 0.03, 9000, 0.02);
      },
    },
    ambient: {
      name: 'Tiefraum (Ambient)', bpm: 60,
      prog: [[50, 'm'], [46, ''], [53, ''], [48, '']],
      tick(i, t, S) {
        const bar = Math.floor(i / 16) % 4, [r, q] = this.prog[bar], s = i % 16, n = chord(r, q);
        if (s === 0) {
          n.forEach((x, k) => { tone('sine', mtof(x), t, S * 17, 0.05, 900, { attack: S * 5, detune: k * 4 - 4 }); tone('triangle', mtof(x + 12), t, S * 16, 0.012, 1200, { attack: S * 6, detune: 7 }); });
          tone('sine', mtof(r - 24), t, S * 17, 0.08, 300, { attack: S * 4 });
        }
        if ((s === 6 || s === 11) && Math.random() < 0.7) { const x = n[Math.floor(Math.random() * 3)] + 24; tone('sine', mtof(x), t, S * 6, 0.03, 4000, { send: 0.7 }); }
        if (intensity > 0.5 && s % 4 === 0) kick(t, 0.12, 70, 35);
      },
    },
    techno: {
      name: 'Hangar-Techno', bpm: 128,
      prog: [[45, 'm'], [45, 'm'], [43, ''], [41, '']],
      tick(i, t, S) {
        const bar = Math.floor(i / 16) % 4, [r] = this.prog[bar], s = i % 16;
        if (s % 4 === 0) kick(t, 0.42, 130, 38);
        if (s % 4 === 2) hiss(t, 0.06, 8000, 0.05);
        if (s === 4 || s === 12) hiss(t, 0.11, 1500, 0.12, 'bandpass');
        // Acid-Bass: Filter öffnet sich über die Phrase
        const acid = [0, 0, 12, 0, 0, 7, 0, 10, 0, 0, 12, 0, 3, 0, 7, 0];
        const cut = 300 + ((i % 64) / 64) * 1800 + intensity * 900;
        if (acid[s] !== undefined && (s % 2 === 0 || acid[s])) tone('sawtooth', mtof(r - 12 + acid[s]), t, S * 0.9, 0.11, cut, { q: 9, sweep: cut * 0.4 });
        if (s === 6 || s === 14) chord(r + 12, 'm').forEach(x => tone('square', mtof(x), t, S * 0.6, 0.018, 2500, { send: 0.25 }));
      },
    },
    epic: {
      name: 'Orbital-Epos', bpm: 84,
      prog: [[50, 'm'], [46, ''], [53, ''], [48, '']],
      tick(i, t, S) {
        const bar = Math.floor(i / 16) % 4, [r, q] = this.prog[bar], s = i % 16, n = chord(r, q);
        if (s === 0) n.forEach((x, k) => { for (const d of [-8, 8]) tone('sawtooth', mtof(x), t, S * 16, 0.018, 1100 + intensity * 900, { attack: S * 3, detune: d + k }); });
        if (s % 8 === 0) tone('sawtooth', mtof(r - 24), t, S * 7, 0.08, 500, { attack: 0.05 });
        // Pauken
        if (s === 0 || s === 10 || (intensity > 0.5 && s === 14)) kick(t, 0.38, 90, 45);
        // Blechbläser-Motiv in Takt 4
        if (bar === 3 && (s === 0 || s === 3 || s === 6)) tone('sawtooth', mtof(n[s / 3] + 12), t, S * (s === 6 ? 8 : 2.6), 0.04, 1600, { attack: 0.04, send: 0.3 });
        if (s % 4 === 2) tone('triangle', mtof(n[(s / 2) % 3] + 24), t, S * 1.5, 0.012, 3000);
      },
    },
    lofi: {
      name: 'Lo-Fi-Station', bpm: 76,
      prog: [[50, 'm7'], [55, '7'], [48, 'maj7'], [57, 'm7']],
      tick(i, t, S) {
        const bar = Math.floor(i / 16) % 4, [r, q] = this.prog[bar], s = i % 16;
        const sw = s % 2 ? S * 0.18 : 0, tt = t + sw; // Swing
        const n = q === 'm7' ? [r, r + 3, r + 7, r + 10] : q === '7' ? [r, r + 4, r + 7, r + 10] : [r, r + 4, r + 7, r + 11];
        if (s === 0 || s === 7) n.forEach(x => tone('sine', mtof(x + 12), tt, S * 6, 0.03, 1600, { attack: 0.02, send: 0.25 }));
        if (s === 0 || s === 10) tone('sine', mtof(r - 12), tt, S * 4, 0.16, 400);
        if (s === 0 || s === 9) kick(tt, 0.28, 95, 40);
        if (s === 4 || s === 12) hiss(tt, 0.07, 1800, 0.14, 'bandpass');
        if (s % 2 === 0) hiss(tt, 0.02, 6000, 0.03);
        if (s === 0) hiss(t, 0.012, 3000, S * 15, 'bandpass'); // Knistern
        if ((s === 3 || s === 13) && Math.random() < 0.6) tone('triangle', mtof(n[Math.floor(Math.random() * 4)] + 24), tt, S * 2, 0.02, 2500, { send: 0.5 });
      },
    },
  };
  const ORDER = ['synth', 'chip', 'ambient', 'techno', 'epic', 'lofi'];
  function pickTrack() { const id = wantTrack === 'random' ? ORDER[Math.floor(Math.random() * ORDER.length)] : wantTrack; return TRACKS[id] ? id : 'synth'; }
  let curId = 'synth';
  function startMusic() {
    if (!ac || musicTimer) return;
    curId = pickTrack(); track = TRACKS[curId];
    nextT = ac.currentTime + 0.1; step16 = 0;
    musicTimer = setInterval(schedule, 50);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  function schedule() {
    const S = 60 / track.bpm / 4;
    while (nextT < ac.currentTime + 0.25) { track.tick(step16, nextT, S); nextT += S; step16++; }
  }
  // Stück wählen: id aus TRACKS oder 'random' (bei jedem Laufstart neu)
  function setTrack(id) {
    wantTrack = id;
    if (!ac || !musicTimer) return;
    stopMusic(); startMusic();
  }
  function nextRandom() { if (wantTrack === 'random' && musicTimer) { stopMusic(); startMusic(); } }
  const tracks = () => ORDER.map(id => ({ id, name: TRACKS[id].name }));
  const current = () => curId;

  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.55 * sfxVol : 0, ac.currentTime, 0.05); }
  // Lautstärke 0..1, getrennt für Ton und Musik
  function setVolume(kind, v) {
    v = Math.max(0, Math.min(1, v));
    if (kind === 'sfx') { sfxVol = v; if (sfxBus) sfxBus.gain.setTargetAtTime(sfxOn ? 0.55 * v : 0, ac.currentTime, 0.05); }
    else { musicVol = v; if (musicBus) musicBus.gain.setTargetAtTime(musicOn ? 0.32 * v : 0, ac.currentTime, 0.1); }
  }
  function setMusic(on) {
    musicOn = on;
    if (!ac) return;
    musicBus.gain.setTargetAtTime(on ? 0.32 * musicVol : 0, ac.currentTime, 0.2);
    if (on) startMusic(); else setTimeout(() => { if (!musicOn) stopMusic(); }, 400);
  }
  // Bosswelle: Musik wird dichter und heller
  function setIntensity(x) { intensity = Math.max(0, Math.min(1, x)); }
  function suspend() { if (ac && ac.state === 'running') ac.suspend(); }
  function resume() { if (ac && ac.state === 'suspended') ac.resume(); }

  root.KWAudio = { init, play, setSfx, setMusic, setVolume, setIntensity, suspend, resume, setTrack, nextRandom, tracks, current };
})(window);
