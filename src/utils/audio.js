// Simple synth sounds using Web Audio API

const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();

export const playSound = (type) => {
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'hover') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'click') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'step') {
    // A nice "whoosh" or "pop" for journey steps
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === 'arrival') {
    // Success chime
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    optionallyPlayHarmony(500, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.start(now);
    osc.stop(now + 1.5);
  }
};

const optionallyPlayHarmony = (freq, now) => {
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 1.5, now); // Perfect fifth
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.05, now + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  osc2.start(now);
  osc2.stop(now + 1.5);
}
