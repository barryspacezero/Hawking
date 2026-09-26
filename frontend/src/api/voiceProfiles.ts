import { API_URL, parseApiError } from '../config/api';

export interface VoiceProfile {
  id: number;
  name: string;
  created_at: string;
  reference_audio_path: string;
  conditioning_path: string | null;
}

export async function fetchVoiceProfiles(): Promise<VoiceProfile[]> {
  const res = await fetch(`${API_URL}/voice-clone/profiles`);
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load voice profiles'));
  return res.json();
}

export async function createVoiceProfile(file: File, name?: string): Promise<VoiceProfile> {
  const formData = new FormData();
  formData.append('reference_audio', file);
  if (name?.trim()) formData.append('name', name.trim());

  const res = await fetch(`${API_URL}/voice-clone/profiles`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to save voice profile'));
  return res.json();
}

export async function renameVoiceProfile(id: number, name: string): Promise<VoiceProfile> {
  const res = await fetch(`${API_URL}/voice-clone/profiles/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to rename voice profile'));
  return res.json();
}

export async function deleteVoiceProfile(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/voice-clone/profiles/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to delete voice profile'));
}
