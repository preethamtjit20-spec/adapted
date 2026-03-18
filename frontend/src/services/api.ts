import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 120000,
});

export interface UploadResponse {
  id: string;
  filename: string;
  status: string;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  type: string;
  description: string;
  wcag_criterion: string;
  timestamp_range?: string;
  recommendation: string;
}

export interface AnalysisResult {
  id: string;
  score: number;
  findings: Finding[];
  summary: string;
  status: string;
}

export interface RemediationResult {
  id: string;
  score_before: number;
  score_after: number;
  actions_applied: string[];
  status: string;
}

export interface StatusResponse {
  id: string;
  status: string;
  progress?: number;
  current_step?: string;
}

export async function uploadVideo(file: File, onProgress?: (pct: number) => void): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });
  return res.data;
}

export async function analyzeVideo(id: string): Promise<AnalysisResult> {
  const res = await client.post(`/analyze/${id}`);
  return res.data;
}

export async function transcribeVideo(id: string): Promise<{ id: string; status: string }> {
  const res = await client.post(`/transcribe/${id}`);
  return res.data;
}

export async function remediateVideo(id: string, actions: string[]): Promise<RemediationResult> {
  const res = await client.post(`/remediate/${id}`, { actions });
  return res.data;
}

export async function getReport(id: string): Promise<Blob> {
  const res = await client.get(`/report/${id}`, { responseType: 'blob' });
  return res.data;
}

export function getVideoUrl(id: string, type: 'original' | 'remediated'): string {
  return `/api/video/${id}/${type}`;
}

export async function getStatus(id: string): Promise<StatusResponse> {
  const res = await client.get(`/status/${id}`);
  return res.data;
}
