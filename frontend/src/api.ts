import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export interface YouTubeRequest {
  url: string;
  whisper_model?: string;
  frame_rate?: number;
  max_frames?: number;
  max_tokens?: number;
  model_name?: string;
  cleanup?: boolean;
}

export interface JobStatus {
  job_id: string;
  status: string;
  progress: number;
  result?: {
    summary?: string;
    summary_file?: string;
    video_info?: {
      filename?: string;
      duration?: string;
      size?: string;
      resolution?: string;
    };
  };
  error?: string;
  video_path?: string;
  youtube?: boolean;
  url?: string;
}

export const submitYouTube = (data: YouTubeRequest) =>
  api.post<JobStatus>('/api/youtube', data);

export const uploadVideo = (formData: FormData) =>
  api.post<JobStatus>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getJobStatus = (jobId: string) =>
  api.get<JobStatus>(`/api/jobs/${jobId}`);

export const downloadVideoUrl = (jobId: string) =>
  `${API_BASE}/api/download/video/${jobId}`;

export const downloadSummaryUrl = (jobId: string) =>
  `${API_BASE}/api/download/summary/${jobId}`;

export const deleteJob = (jobId: string) =>
  api.delete(`/api/jobs/${jobId}`);

export default api;