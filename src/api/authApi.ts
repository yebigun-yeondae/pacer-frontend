import { API } from './config';
import { storage } from '../utils/storage';

export interface KakaoLoginRequest {
  accessToken: string;  // 카카오 액세스 토큰
  kakaoUserId: string;  // 카카오 유저 ID
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    nickname: string;
    email: string;
    profileImage?: string;
  };
}

// 카카오 토큰 → 백엔드 로그인 → 서버 JWT 저장
export async function loginWithKakao(payload: KakaoLoginRequest): Promise<AuthResponse> {
  const res = await fetch(API.auth.kakaoLogin, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `서버 오류: ${res.status}`);
  }

  const data: AuthResponse = await res.json();
  await storage.saveToken(data.accessToken);
  await storage.saveUser(data.user);
  return data;
}

export async function checkAutoLogin(): Promise<boolean> {
  const token = await storage.getToken();
  return !!token;
}

export async function logoutFromServer(): Promise<void> {
  const token = await storage.getToken();
  if (token) {
    await fetch(API.auth.logout, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  await storage.clear();
}
