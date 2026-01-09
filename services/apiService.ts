import { Tournament } from '../types';

// API base URL - use environment variable or fallback to localhost
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  tournaments?: Tournament[];
  count?: number;
  parsed?: number;
  added?: number;
  skipped?: number;
  total?: number;
}

export async function fetchTournaments(): Promise<Tournament[]> {
  const response = await fetch(`${API_BASE}/api/tournaments`);
  const data: ApiResponse<Tournament[]> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch tournaments');
  }

  return data.tournaments || [];
}

export async function uploadPdf(file: File): Promise<{
  tournaments: Tournament[];
  parsed: number;
  added: number;
  skipped: number;
  total: number;
}> {
  const formData = new FormData();
  formData.append('pdf', file);

  const response = await fetch(`${API_BASE}/api/tournaments/upload`, {
    method: 'POST',
    body: formData,
  });

  const data: ApiResponse<Tournament[]> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to upload PDF');
  }

  return {
    tournaments: data.tournaments || [],
    parsed: data.parsed || 0,
    added: data.added || 0,
    skipped: data.skipped || 0,
    total: data.total || 0,
  };
}

export async function deleteTournament(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/tournaments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete tournament');
  }
}

export async function deleteAllTournaments(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/tournaments`, {
    method: 'DELETE',
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to delete tournaments');
  }
}

export async function checkHealth(): Promise<{ status: string; tournamentCount: number }> {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
