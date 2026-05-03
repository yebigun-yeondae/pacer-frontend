import { API } from './config';
import { fetchWithAuth } from './fetchWithAuth';

export interface ProfileResponse {
  nickname: string;
  email: string;
  profileImageUrl: string;
  avgSpeedMps: number;
  totalRoutes: number;
  totalDistanceM: number;
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await fetchWithAuth(API.profile.get, { method: 'GET' });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `서버 오류: ${res.status}`);
  }

  return res.json();
}
