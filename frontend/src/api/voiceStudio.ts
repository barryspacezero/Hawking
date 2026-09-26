import { API_URL, parseApiError } from '../config/api';

export type StudioInputMode = 'text' | 'document' | 'file';

export interface StudioGeneration {
  id: number;
  voice_profile_id: number;
  input_type: StudioInputMode;
  source_document_id: number | null;
  source_filename: string | null;
  text_preview: string;
  status: 'queued' | 'processing' | 'done' | 'failed' | string;
  queue_position: number | null;
  active_studio_job_id: number | null;
  error_message: string | null;
  created_at: string;
  has_audio: boolean;
}

export async function createStudioGeneration(params: {
  voiceProfileId: number;
  inputMode: StudioInputMode;
  text?: string;
  documentId?: number;
  file?: File;
}): Promise<StudioGeneration> {
  const formData = new FormData();
  formData.append('voice_profile_id', String(params.voiceProfileId));
  formData.append('input_mode', params.inputMode);

  if (params.inputMode === 'text') {
    formData.append('text', params.text || '');
  } else if (params.inputMode === 'document') {
    formData.append('document_id', String(params.documentId));
  } else if (params.file) {
    formData.append('file', params.file);
  }

  const res = await fetch(`${API_URL}/voice-clone/studio/generate`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to start studio generation'));
  return res.json();
}

export async function fetchStudioGeneration(jobId: number): Promise<StudioGeneration> {
  const res = await fetch(`${API_URL}/voice-clone/studio/jobs/${jobId}`);
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to load generation status'));
  return res.json();
}

export function studioAudioUrl(jobId: number): string {
  return `${API_URL}/voice-clone/studio/jobs/${jobId}/audio`;
}

