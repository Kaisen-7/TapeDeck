import fs from 'fs';
import path from 'path';

function createWavBuffer(sampleRate, samples) {
  const byteRate = sampleRate * 2; // 16-bit mono
  const blockAlign = 2;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Chunk size
  buffer.writeUInt16LE(1, 20);  // Format: PCM
  buffer.writeUInt16LE(1, 22);  // Channels: 1
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // Bits per sample

  // 'data' chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(s < 0 ? s * 32768 : s * 32767), 44 + i * 2);
  }

  return buffer;
}

const sampleRate = 44100;

// 1. btn-down.wav (heavy mechanical latch click)
function generateBtnDown() {
  const duration = 0.20;
  const count = Math.floor(sampleRate * duration);
  const samples = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    // Metallic contact click spike
    const clickEnv = Math.exp(-t * 220);
    const click = Math.sin(2 * Math.PI * 2400 * t) * clickEnv * 0.8;

    // Resonant thump of mechanical latch
    const thumpEnv = Math.exp(-t * 35);
    const freq = 160 * Math.exp(-t * 20) + 60;
    const thump = Math.sin(2 * Math.PI * freq * t) * thumpEnv * 0.9;

    // Plastic casing noise burst
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 70) * 0.4;

    samples[i] = (click * 0.5 + thump * 0.6 + noise * 0.3);
  }
  return createWavBuffer(sampleRate, samples);
}

// 2. btn-up.wav (spring release snap)
function generateBtnUp() {
  const duration = 0.16;
  const count = Math.floor(sampleRate * duration);
  const samples = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const snapEnv = Math.exp(-t * 180);
    const snap = Math.sin(2 * Math.PI * 3200 * t) * snapEnv * 0.6;

    const ringEnv = Math.exp(-t * 45);
    const ring = (Math.sin(2 * Math.PI * 1100 * t) + 0.5 * Math.sin(2 * Math.PI * 2200 * t)) * ringEnv * 0.5;

    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 120) * 0.3;
    samples[i] = (snap * 0.5 + ring * 0.4 + noise * 0.3);
  }
  return createWavBuffer(sampleRate, samples);
}

// 3. tape-ff.wav (whirring high-speed motor with flutter)
function generateTapeFF() {
  const duration = 1.6;
  const count = Math.floor(sampleRate * duration);
  const samples = new Float32Array(count);

  let phase = 0;
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    // Envelope: ramp up 0.2s, steady, ramp down last 0.2s
    let env = 1.0;
    if (t < 0.2) env = t / 0.2;
    else if (t > duration - 0.25) env = (duration - t) / 0.25;

    // Motor frequency ramps from 280Hz up to 640Hz
    let motorFreq = 640;
    if (t < 0.3) {
      motorFreq = 280 + (640 - 280) * (t / 0.3);
    } else if (t > duration - 0.3) {
      motorFreq = 640 - (640 - 240) * ((t - (duration - 0.3)) / 0.3);
    }

    // Flutter modulation (tape spools spinning fast)
    const flutter = 1 + 0.08 * Math.sin(2 * Math.PI * 24 * t);
    const currentFreq = motorFreq * flutter;
    phase += (2 * Math.PI * currentFreq) / sampleRate;

    const motorTone = (Math.sin(phase) + 0.3 * Math.sin(phase * 2) + 0.15 * Math.sin(phase * 3));
    const noise = (Math.random() * 2 - 1) * 0.25;

    samples[i] = (motorTone * 0.5 + noise * 0.2) * env * 0.7;
  }
  return createWavBuffer(sampleRate, samples);
}

// 4. tape-flip.wav (cassette ejection, flip whoosh, and lock in)
function generateTapeFlip() {
  const duration = 1.3;
  const count = Math.floor(sampleRate * duration);
  const samples = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    let s = 0;

    // Phase 1 (0 to 0.15s): Eject button click & door pop
    if (t < 0.15) {
      const t1 = t;
      const click = Math.sin(2 * Math.PI * 1800 * t1) * Math.exp(-t1 * 90);
      const pop = Math.sin(2 * Math.PI * 200 * t1) * Math.exp(-t1 * 40);
      s += click * 0.5 + pop * 0.4;
    }

    // Phase 2 (0.2s to 0.55s): Tape slide / flip whoosh
    if (t >= 0.2 && t <= 0.6) {
      const t2 = t - 0.2;
      const slideEnv = Math.sin((t2 / 0.4) * Math.PI);
      const rustle = (Math.random() * 2 - 1) * slideEnv * 0.25;
      s += rustle;
    }

    // Phase 3 (0.75s to 1.1s): Mechanical dock snap ("KA-CHUNK")
    if (t >= 0.75 && t <= 1.1) {
      const t3 = t - 0.75;
      // First latch transient
      const hit1 = Math.sin(2 * Math.PI * 2200 * t3) * Math.exp(-t3 * 120);
      // Main deep lock thump at 0.04s after hit1
      let hit2 = 0;
      if (t3 > 0.04) {
        const t3b = t3 - 0.04;
        const thump = Math.sin(2 * Math.PI * 110 * t3b) * Math.exp(-t3b * 30);
        const metallic = Math.sin(2 * Math.PI * 1500 * t3b) * Math.exp(-t3b * 70);
        hit2 = thump * 0.7 + metallic * 0.4;
      }
      s += hit1 * 0.4 + hit2 * 0.7;
    }

    samples[i] = Math.max(-1, Math.min(1, s));
  }
  return createWavBuffer(sampleRate, samples);
}

// 5. tape-hiss.wav (warm authentic analog cassette tape hiss, seamless loop)
function generateTapeHiss() {
  const duration = 4.0;
  const count = Math.floor(sampleRate * duration);
  const samples = new Float32Array(count);

  // Pink noise generator (Paul Kellet's filter)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < count; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;

    // Flutter modulation (gentle wow at ~4Hz)
    const t = i / sampleRate;
    const flutter = 1.0 + 0.06 * Math.sin(2 * Math.PI * 3.8 * t + Math.sin(2 * Math.PI * 0.9 * t));

    samples[i] = pink * 0.09 * flutter;
  }

  // Crossfade first 0.2s and last 0.2s for seamless loop
  const crossCount = Math.floor(sampleRate * 0.2);
  for (let i = 0; i < crossCount; i++) {
    const fade = i / crossCount;
    const endIdx = count - crossCount + i;
    const blended = samples[i] * fade + samples[endIdx] * (1 - fade);
    samples[i] = blended;
    samples[endIdx] = blended;
  }

  return createWavBuffer(sampleRate, samples);
}

// Ensure directories exist
const publicDir = path.resolve('public/assets/sfx');
const srcDir = path.resolve('assets/sfx');
fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(srcDir, { recursive: true });

const sfxList = [
  { name: 'btn-down.wav', buf: generateBtnDown() },
  { name: 'btn-up.wav', buf: generateBtnUp() },
  { name: 'tape-ff.wav', buf: generateTapeFF() },
  { name: 'tape-flip.wav', buf: generateTapeFlip() },
  { name: 'tape-hiss.wav', buf: generateTapeHiss() }
];

for (const { name, buf } of sfxList) {
  fs.writeFileSync(path.join(publicDir, name), buf);
  fs.writeFileSync(path.join(srcDir, name), buf);
  // Also create mp3 named alias copy so links requesting .mp3 or .wav both succeed
  const mp3Name = name.replace('.wav', '.mp3');
  fs.writeFileSync(path.join(publicDir, mp3Name), buf);
  fs.writeFileSync(path.join(srcDir, mp3Name), buf);
  console.log(`Generated ${name} and ${mp3Name}`);
}

console.log('All SFX successfully generated!');
