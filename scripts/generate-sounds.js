#!/usr/bin/env node
// ponytail: tiny sine-wave synth, zero audio deps. Regenerate with
// `node scripts/generate-sounds.js` after tweaking a tone/duration below.
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function toneSamples(freq, ms, volume = 0.4) {
  const n = Math.round(SAMPLE_RATE * ms / 1000);
  const samples = new Int16Array(n);
  const fade = Math.min(n, Math.round(SAMPLE_RATE * 0.008)); // 8ms fade avoids clicks
  for (let i = 0; i < n; i++) {
    let env = 1;
    if (i < fade) env = i / fade;
    else if (i > n - fade) env = (n - i) / fade;
    const t = i / SAMPLE_RATE;
    samples[i] = Math.round(Math.sin(2 * Math.PI * freq * t) * volume * env * 32767);
  }
  return samples;
}

function silenceSamples(ms) {
  return new Int16Array(Math.round(SAMPLE_RATE * ms / 1000));
}

function concatInt16(arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Int16Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function writeWav(filePath, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);  // PCM
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) buffer.writeInt16LE(samples[i], 44 + i * 2);
  fs.writeFileSync(filePath, buffer);
}

const outDir = path.join(__dirname, '..', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

// done: soft ascending two-tone chime
writeWav(path.join(outDir, 'done.wav'), concatInt16([
  toneSamples(660, 140),
  silenceSamples(20),
  toneSamples(880, 180),
]));

// question: distinct triple ping - higher pitch, clearly different rhythm
writeWav(path.join(outDir, 'question.wav'), concatInt16([
  toneSamples(1046, 90, 0.45),
  silenceSamples(60),
  toneSamples(1046, 90, 0.45),
  silenceSamples(60),
  toneSamples(1046, 90, 0.45),
]));

console.log('Wrote sounds/done.wav and sounds/question.wav');
