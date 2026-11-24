// Synthesized soundboard sounds using Web Audio API.
// No external files needed — all sounds are generated procedurally.

const SOUNDS = [
  { id: "airhorn", label: "Airhorn", emoji: "📢" },
  { id: "applause", label: "Applause", emoji: "👏" },
  { id: "boing", label: "Boing", emoji: "🤩" },
  { id: "drumroll", label: "Drumroll", emoji: "🥁" },
  { id: "tada", label: "Tada", emoji: "🎉" },
  { id: "cricket", label: "Cricket", emoji: "🦗" },
  { id: "laser", label: "Laser", emoji: "🔫" },
  { id: "record_scratch", label: "Scratch", emoji: "💿" },
  { id: "doorbell", label: "Doorbell", emoji: "🔔" },
  { id: "whistle", label: "Whistle", emoji: "😮" },
  { id: "buzzer", label: "Buzzer", emoji: "❌" },
  { id: "coin", label: "Coin", emoji: "🪙" },
];

export function getSoundboardSounds() {
  return SOUNDS;
}

let _sharedCtx = null;
function getCtx() {
  if (!_sharedCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _sharedCtx = new AC();
  }
  if (_sharedCtx.state === "suspended") _sharedCtx.resume();
  return _sharedCtx;
}

export function playSound(id, volume = 0.7) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  switch (id) {
    case "airhorn": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(250, now + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume, now);
      g.gain.linearRampToValueAtTime(0, now + 1.5);
      osc.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + 1.5);
      break;
    }
    case "applause": {
      for (let i = 0; i < 12; i++) {
        const t = now + i * 0.08 + Math.random() * 0.04;
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = 2000 + Math.random() * 2000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(volume * 0.3, t + 0.01);
        g.gain.linearRampToValueAtTime(0, t + 0.06);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.06);
      }
      break;
    }
    case "boing": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + 0.6);
      break;
    }
    case "drumroll": {
      for (let i = 0; i < 20; i++) {
        const t = now + i * 0.06;
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = 80 + Math.random() * 20;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(volume * 0.4, t + 0.01);
        g.gain.linearRampToValueAtTime(0, t + 0.04);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.04);
      }
      break;
    }
    case "tada": {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const t = now + i * 0.1;
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(volume * 0.5, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.4);
      });
      break;
    }
    case "cricket": {
      for (let i = 0; i < 6; i++) {
        const t = now + i * 0.3;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 4000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(volume * 0.3, t + 0.01);
        g.gain.linearRampToValueAtTime(0, t + 0.03);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.03);
      }
      break;
    }
    case "laser": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(2000, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + 0.3);
      break;
    }
    case "record_scratch": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.setValueAtTime(300, now + 0.05);
      osc.frequency.setValueAtTime(600, now + 0.1);
      osc.frequency.setValueAtTime(200, now + 0.15);
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume, now);
      g.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + 0.25);
      break;
    }
    case "doorbell": {
      [659, 523].forEach((freq, i) => {
        const t = now + i * 0.4;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(volume * 0.5, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.35);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.35);
      });
      break;
    }
    case "whistle": {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
      osc.frequency.linearRampToValueAtTime(1000, now + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume * 0.4, now);
      g.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + 0.5);
      break;
    }
    case "buzzer": {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 150;
      const g = ctx.createGain();
      g.gain.setValueAtTime(volume * 0.5, now);
      g.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.connect(g); g.connect(master);
      osc.start(now); osc.stop(now + 0.5);
      break;
    }
    case "coin": {
      [988, 1319].forEach((freq, i) => {
        const t = now + i * 0.08;
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(volume * 0.3, t + 0.01);
        g.gain.linearRampToValueAtTime(0, t + 0.1);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + 0.1);
      });
      break;
    }
    default:
      break;
  }
}

// Join/leave notification sounds
export function playJoinSound() {
  playSound("coin", 0.4);
}

export function playLeaveSound() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.3, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(g); g.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.3);
}