/**
 * Generates client/public/notification-sound.wav — a short two-tone chime.
 * Run: node scripts/generate-notification-sound.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../client/public/notification-sound.wav");

const sampleRate = 44100;
const durationSec = 0.4;

function toneSample(freq, t, attack = 0.02, release = 0.08) {
  const env =
    t < attack ? t / attack : t > durationSec - release ? Math.max(0, (durationSec - t) / release) : 1;
  return Math.sin(2 * Math.PI * freq * t) * env * 0.35;
}

const samples = Math.floor(sampleRate * durationSec);
const pcm = Buffer.alloc(samples * 2);

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  const sample = toneSample(880, t) + (t > 0.1 ? toneSample(1174.66, t - 0.1) : 0);
  const clamped = Math.max(-1, Math.min(1, sample));
  pcm.writeInt16LE(Math.round(clamped * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

fs.writeFileSync(outPath, Buffer.concat([header, pcm]));
console.log(`Wrote ${outPath} (${samples} samples)`);
