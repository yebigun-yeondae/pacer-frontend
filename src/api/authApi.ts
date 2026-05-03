import { API } from "./config";
import { storage } from "../utils/storage";

export interface KakaoLoginRequest {
  accessToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export async function loginWithKakao(
  payload: KakaoLoginRequest,
): Promise<AuthResponse> {
  const res = await fetch(API.auth.kakaoLogin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `서버 오류: ${res.status}`);
  }

  const data: AuthResponse = await res.json();
  await storage.saveToken(data.accessToken);
  await storage.saveRefreshToken(data.refreshToken);
  return data;
}

export async function reissueToken(): Promise<boolean> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(API.auth.reissue, {
    method: "POST",
    headers: { "Refresh-Token": refreshToken },
  });

  if (!res.ok) return false;

  const data: AuthResponse = await res.json();
  await storage.saveToken(data.accessToken);
  await storage.saveRefreshToken(data.refreshToken);
  return true;
}

export async function checkAutoLogin(): Promise<boolean> {
  const token = await storage.getToken();
  return !!token;
}

export async function logoutFromServer(): Promise<void> {
  const refreshToken = await storage.getRefreshToken();
  if (refreshToken) {
    await fetch(API.auth.logout, {
      method: "POST",
      headers: { "Refresh-Token": refreshToken },
    }).catch(() => {});
  }
  await storage.clear();
}
