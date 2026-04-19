import { API } from './config';
import { storage } from '../utils/storage';

export interface ProfileResponse {
  nickname: string;
  email: string;
  profileImageUrl: string;
  avgSpeedMps: number;
  totalRoutes: number;
  totalDistanceM: number;
}

export async function getProfile(): Promise<ProfileResponse> {
  const token = await storage.getToken();
  const res = await fetch(API.profile.get, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `서버 오류: ${res.status}`);
  }

  return res.json();
}
