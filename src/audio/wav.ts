import { Buffer } from "buffer";

const clamp16 = (v: number) => {
  const clamped = Math.max(-1, Math.min(1, v));
  return Math.round(clamped * 32767);
};

export const encodeStereoWavBase64 = (
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
) => {
  const sampleCount = Math.min(left.length, right.length);
  const blockAlign = 4;
  const byteRate = sampleRate * blockAlign;
  const dataSize = sampleCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < sampleCount; i += 1) {
    buffer.writeInt16LE(clamp16(left[i]), offset);
    buffer.writeInt16LE(clamp16(right[i]), offset + 2);
    offset += 4;
  }

  return buffer.toString("base64");
};
