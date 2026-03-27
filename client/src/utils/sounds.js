// Synthesized sound effects using Web Audio API — no external files needed
let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.3, ramp = true) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (ramp) gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* ignore audio errors */ }
}

function playNoise(duration, volume = 0.15) {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch (e) { /* ignore */ }
}

export const SFX = {
  attack() {
    playNoise(0.15, 0.2);
    playTone(200, 0.15, 'sawtooth', 0.2);
    setTimeout(() => playTone(120, 0.1, 'square', 0.15), 80);
  },
  hit() {
    playNoise(0.1, 0.25);
    playTone(80, 0.2, 'square', 0.25);
  },
  miss() {
    playTone(400, 0.15, 'sine', 0.15);
    setTimeout(() => playTone(200, 0.2, 'sine', 0.1), 100);
  },
  heal() {
    playTone(523, 0.12, 'sine', 0.2);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.2), 100);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.2), 200);
  },
  spell() {
    playTone(800, 0.1, 'sine', 0.15);
    setTimeout(() => playTone(1200, 0.15, 'triangle', 0.15), 60);
    setTimeout(() => playTone(600, 0.2, 'sine', 0.1), 150);
  },
  counter() {
    playTone(600, 0.08, 'square', 0.15);
    setTimeout(() => playTone(900, 0.12, 'square', 0.2), 60);
  },
  elimination() {
    playTone(300, 0.15, 'sawtooth', 0.2);
    setTimeout(() => playTone(200, 0.2, 'sawtooth', 0.2), 100);
    setTimeout(() => playTone(100, 0.4, 'sawtooth', 0.25), 200);
    setTimeout(() => playNoise(0.3, 0.15), 250);
  },
  cardPick() {
    playTone(440, 0.08, 'sine', 0.15);
    setTimeout(() => playTone(660, 0.1, 'sine', 0.2), 80);
    setTimeout(() => playTone(880, 0.15, 'sine', 0.15), 160);
  },
  turnStart() {
    playTone(523, 0.1, 'triangle', 0.2);
    setTimeout(() => playTone(659, 0.15, 'triangle', 0.15), 100);
  },
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.25, 'sine', 0.2), i * 150);
    });
  },
  emote() {
    playTone(800, 0.08, 'sine', 0.1);
  },
  timeout() {
    playTone(200, 0.3, 'square', 0.15);
    setTimeout(() => playTone(150, 0.4, 'square', 0.15), 200);
  }
};
