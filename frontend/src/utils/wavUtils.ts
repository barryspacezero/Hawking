export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function mergeWavBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  if (buffers.length === 0) throw new Error('No audio to merge');
  if (buffers.length === 1) return buffers[0];

  const firstView = new DataView(buffers[0]);
  const numChannels = firstView.getUint16(22, true);
  const sampleRate = firstView.getUint32(24, true);
  const bitsPerSample = firstView.getUint16(34, true);

  const pcmParts: Uint8Array[] = [];
  let totalPcmLength = 0;

  for (const buf of buffers) {
    const view = new DataView(buf);
    const dataSize = view.getUint32(40, true);
    pcmParts.push(new Uint8Array(buf, 44, dataSize));
    totalPcmLength += dataSize;
  }

  const headerSize = 44;
  const result = new ArrayBuffer(headerSize + totalPcmLength);
  const view = new DataView(result);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalPcmLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, totalPcmLength, true);

  const out = new Uint8Array(result);
  let offset = headerSize;
  for (const pcm of pcmParts) {
    out.set(pcm, offset);
    offset += pcm.length;
  }

  return result;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadWav(buffer: ArrayBuffer, filename: string) {
  downloadBlob(new Blob([buffer], { type: 'audio/wav' }), filename);
}

export async function downloadFromUrl(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to download audio');
  const blob = await res.blob();
  downloadBlob(blob, filename);
}

