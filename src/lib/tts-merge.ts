/** Merge TTS line blobs into one narration track with short gaps. */

export async function mergeTtsBlobs(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 0) return new Blob([], { type: "audio/mpeg" });
  if (blobs.length === 1) return blobs[0];

  const ctx = new AudioContext();
  try {
    const buffers: AudioBuffer[] = [];
    for (const blob of blobs) {
      const ab = await blob.arrayBuffer();
      try {
        buffers.push(await ctx.decodeAudioData(ab.slice(0)));
      } catch {
        /* skip undecodable chunk */
      }
    }
    if (buffers.length === 0) {
      return new Blob(blobs, { type: "audio/mpeg" });
    }

    const gapSec = 0.25;
    const totalSec = buffers.reduce((s, b) => s + b.duration, 0) + gapSec * (buffers.length - 1);
    const sampleRate = ctx.sampleRate;
    const channels = Math.max(...buffers.map((b) => b.numberOfChannels));
    const length = Math.ceil(totalSec * sampleRate);
    const out = ctx.createBuffer(channels, length, sampleRate);

    let offset = 0;
    for (let i = 0; i < buffers.length; i++) {
      const buf = buffers[i];
      for (let ch = 0; ch < channels; ch++) {
        const src = buf.getChannelData(Math.min(ch, buf.numberOfChannels - 1));
        const dst = out.getChannelData(ch);
        for (let j = 0; j < src.length && offset + j < dst.length; j++) {
          dst[offset + j] += src[j];
        }
      }
      offset += Math.ceil(buf.duration * sampleRate) + Math.ceil(gapSec * sampleRate);
    }

    const wav = audioBufferToWav(out);
    return new Blob([wav], { type: "audio/wav" });
  } finally {
    await ctx.close();
  }
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const samples = buffer.length;
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  writeStr(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(view, 8, "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return ab;
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
