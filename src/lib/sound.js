// Tiny sound engine — message dings are synthesised, ringtones can be a file
// the player uploaded from their profile.
let ctx = null;

function audio() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function chime(notes, volume = 0.09) {
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime;
  notes.forEach(({ freq, at, dur }) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + at);
    gain.gain.linearRampToValueAtTime(volume, now + at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(now + at);
    osc.stop(now + at + dur + 0.02);
  });
}

// Two-note "ding" for an incoming message.
export function playDing() {
  try {
    chime([
      { freq: 1180, at: 0, dur: 0.1 },
      { freq: 1560, at: 0.075, dur: 0.22 },
    ]);
  } catch {
    /* audio unavailable */
  }
}

export function playSend() {
  try {
    chime([{ freq: 900, at: 0, dur: 0.09 }], 0.05);
  } catch {
    /* audio unavailable */
  }
}

export function playCoin() {
  try {
    chime([
      { freq: 880, at: 0, dur: 0.09 },
      { freq: 1320, at: 0.07, dur: 0.12 },
      { freq: 1760, at: 0.15, dur: 0.18 },
    ], 0.07);
  } catch {
    /* audio unavailable */
  }
}

// Ring loop — either the uploaded ringtone URL or a synthesised pulse.
export function createRinger(url) {
  let el = null;
  let timer = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
    if (el) {
      el.pause();
      el.src = "";
      el = null;
    }
  };

  const start = () => {
    stop();
    if (url) {
      el = new Audio(url);
      el.loop = true;
      el.volume = 0.7;
      el.play().catch(() => {});
      return;
    }
    const ring = () => {
      chime([{ freq: 720, at: 0, dur: 0.28 }, { freq: 960, at: 0.34, dur: 0.3 }], 0.08);
    };
    ring();
    timer = setInterval(ring, 1600);
  };

  return { start, stop };
}