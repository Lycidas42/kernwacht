// Kernwacht – Ton und Musik, komplett mit WebAudio erzeugt (keine Audiodateien)
(function (root) {
  'use strict';
  let ac = null, master, sfxBus, musicBus, noiseBuf;
  let sfxOn = true, musicOn = true, musicTimer = null;
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
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? 0.55 : 0; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? 0.32 : 0; musicBus.connect(master);
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
      else if (a === 'spawn') { [0, 0.07, 0.14].forEach(d => osc('square', 520, 260, 0.08, 0.05, ac.currentTime + d)); }
      else { [0, 0.08, 0.16].forEach(d => osc('sawtooth', 700, 300, 0.1, 0.06, ac.currentTime + d)); }
    },
    buy() { if (throttle('buy', 50)) return; osc('triangle', 1200, 1600, 0.06, 0.04); },
    click() { osc('triangle', 900, 700, 0.04, 0.05); },
    mark() { osc('sine', 1300, 1800, 0.08, 0.06); },
    over_end() {},
    gameover() { const t = ac.currentTime; [392, 330, 262, 196].forEach((f, i) => osc('triangle', f, f * 0.97, 0.35, 0.1, t + i * 0.16)); },
  };
  function play(name, o) { if (!ac || !sfxOn || ac.state !== 'running') return; const f = SFX[name]; if (f) f(o); }

  // ---------- Musik: generativer Synthwave-Loop in a-Moll ----------
  const BPM = 96, STEP = 60 / BPM / 4; // Sechzehntel
  const PROG = [ // Akkorde: Am, F, C, G
    { root: 57, notes: [57, 60, 64] }, { root: 53, notes: [53, 57, 60] },
    { root: 48, notes: [55, 60, 64] }, { root: 55, notes: [55, 59, 62] },
  ];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let nextT = 0, step16 = 0, intensity = 0;
  function startMusic() {
    if (!ac || musicTimer) return;
    nextT = ac.currentTime + 0.1; step16 = 0;
    musicTimer = setInterval(schedule, 50);
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
  function schedule() {
    while (nextT < ac.currentTime + 0.25) { tick(step16, nextT); nextT += STEP; step16++; }
  }
  function tone(type, f, t, dur, vol, cutoff) {
    const o = ac.createOscillator(), g = ac.createGain(), fl = ac.createBiquadFilter();
    o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cutoff || 2000;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function tick(i, t) {
    const bar = Math.floor(i / 16) % PROG.length, s = i % 16, ch = PROG[bar];
    // Bass: pulsierende Achtel
    if (s % 2 === 0) tone('sawtooth', mtof(ch.root - 24), t, STEP * 1.8, 0.16, 380 + intensity * 500);
    // Pad zu Taktbeginn
    if (s === 0) ch.notes.forEach(n => tone('triangle', mtof(n), t, STEP * 15, 0.035, 1400));
    // Arpeggio
    const arp = [0, 1, 2, 1, 0, 2, 1, 2];
    if (s % 2 === 1 || intensity > 0.5) tone('square', mtof(ch.notes[arp[s % 8]] + 12), t, STEP * 0.9, 0.025 + intensity * 0.015, 1800 + intensity * 1500);
    // Kick und Hi-Hat
    if (s % 4 === 0) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.16); }
    if (s % 2 === 1) { const src = ac.createBufferSource(); src.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = ac.createGain(); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); src.connect(f); f.connect(g); g.connect(musicBus); src.start(t); src.stop(t + 0.05); }
  }

  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? 0.55 : 0, ac.currentTime, 0.05); }
  function setMusic(on) {
    musicOn = on;
    if (!ac) return;
    musicBus.gain.setTargetAtTime(on ? 0.32 : 0, ac.currentTime, 0.2);
    if (on) startMusic(); else setTimeout(() => { if (!musicOn) stopMusic(); }, 400);
  }
  // Bosswelle: Musik wird dichter und heller
  function setIntensity(x) { intensity = Math.max(0, Math.min(1, x)); }
  function suspend() { if (ac && ac.state === 'running') ac.suspend(); }
  function resume() { if (ac && ac.state === 'suspended') ac.resume(); }

  root.KWAudio = { init, play, setSfx, setMusic, setIntensity, suspend, resume };
})(window);
