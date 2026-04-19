import { API } from './config';
import { storage } from '../utils/storage';

export async function getProfile() {
  const token = await storage.getToken();
  const res = await fetch(API.profile.get, {
    method: 'GET',
    headers: { athorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `서버 오류: ${res.status}`);
  }

  return res.json();
}
