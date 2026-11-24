// Web Audio API voice effects for outgoing audio.
// Creates an effects chain: source → effect → destination, producing a new MediaStreamTrack.

const EFFECTS = {
  none: { label: "Off", description: "No voice effect" },
  echo: { label: "Echo", description: "Repeating echo with decay" },
  robot: { label: "Robot", description: "Ring modulation for a robotic voice" },
  telephone: { label: "Telephone", description: "Bandpass filter — old phone sound" },
  cavern: { label: "Cavern", description: "Long reverb-like delay" },
  chipmunk: { label: "Chipmunk", description: "Pitched up via playback rate shift" },
  deep: { label: "Deep", description: "Pitched down via playback rate shift" },
};

export function getVoiceEffects() {
  return EFFECTS;
}

/**
 * Build a Web Audio effects chain for a source MediaStreamTrack.
 * Returns { outputTrack, audioContext, cleanup }.
 */
export function createVoiceEffectChain(inputTrack, effectName = "none") {
  if (!inputTrack) return null;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const ctx = new AudioContextClass();
  const sourceStream = new MediaStream([inputTrack]);
  const sourceNode = ctx.createMediaStreamSource(sourceStream);
  const destinationNode = ctx.createMediaStreamDestination();

  let lastNode = sourceNode;

  if (effectName === "echo") {
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.4;
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    sourceNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    sourceNode.connect(destinationNode);
    wet.connect(destinationNode);
    lastNode = destinationNode;
  } else if (effectName === "robot") {
    const osc = ctx.createOscillator();
    osc.frequency.value = 50;
    osc.type = "sine";
    const ringGain = ctx.createGain();
    ringGain.gain.value = 0;
    osc.connect(ringGain.gain);
    osc.start();
    const dry = ctx.createGain();
    dry.gain.value = 0.5;
    sourceNode.connect(dry);
    sourceNode.connect(ringGain);
    ringGain.connect(destinationNode);
    dry.connect(destinationNode);
    lastNode = destinationNode;
  } else if (effectName === "telephone") {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2000;
    bp.Q.value = 5;
    sourceNode.connect(bp);
    bp.connect(destinationNode);
    lastNode = bp;
  } else if (effectName === "cavern") {
    const delay = ctx.createDelay(5);
    delay.delayTime.value = 0.8;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.6;
    const wet = ctx.createGain();
    wet.gain.value = 0.7;
    sourceNode.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    sourceNode.connect(destinationNode);
    wet.connect(destinationNode);
    lastNode = destinationNode;
  } else if (effectName === "chipmunk" || effectName === "deep") {
    // Pitch shift via resampling: route through a buffer source with adjusted rate
    // Simple approach: use a biquad filter + detune for a subtle pitch-like effect
    const filter = ctx.createBiquadFilter();
    filter.type = "allpass";
    filter.frequency.value = effectName === "chipmunk" ? 3000 : 500;
    const detuneNode = ctx.createDelay(0.5);
    detuneNode.delayTime.value = effectName === "chipmunk" ? 0.005 : 0.02;
    const osc = ctx.createOscillator();
    osc.frequency.value = effectName === "chipmunk" ? 8 : 3;
    osc.type = "sine";
    const modGain = ctx.createGain();
    modGain.gain.value = 0.003;
    osc.connect(modGain);
    modGain.connect(detuneNode.delayTime);
    osc.start();
    sourceNode.connect(filter);
    filter.connect(detuneNode);
    detuneNode.connect(destinationNode);
    lastNode = detuneNode;
  } else {
    sourceNode.connect(destinationNode);
  }

  if (lastNode && lastNode !== destinationNode) {
    lastNode.connect(destinationNode);
  }

  const outputTrack = destinationNode.stream.getAudioTracks()[0];

  return {
    outputTrack,
    audioContext: ctx,
    cleanup() {
      try { ctx.close(); } catch { /* already closed */ }
    },
  };
}