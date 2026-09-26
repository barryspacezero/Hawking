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

export async function downloadFromUrl(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to download audio');
  const blob = await res.blob();
  downloadBlob(blob, filename);
}
