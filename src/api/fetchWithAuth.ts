// import { Alert } from 'react-native'; // TODO: 배포 전 삭제 (Alert import 제거)
import { storage } from '../utils/storage';
import { reissueToken, logoutFromServer } from './authApi';
import { navigateTo } from '../navigation/navigationRef';

/**
 * 인증이 필요한 모든 API 요청에 사용하는 fetch 래퍼
 *
 * 동작 순서:
 *  1. AsyncStorage에서 accessToken을 꺼내 Authorization 헤더에 자동 추가
 *  2. 응답이 401/403이면 refreshToken으로 재발급 시도
 *  3. 재발급 성공 → 새 토큰으로 원래 요청 1회 재시도
 *  4. 재발급 실패 → 로그아웃 처리 후 Auth 화면으로 강제 이동
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await storage.getToken();

  const authOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await fetch(url, authOptions);

  // TODO: 배포 전 삭제 — 아래 Alert를 console.log로 교체
  // console.log(`[fetchWithAuth] ${options.method ?? 'GET'} ${url} → ${response.status}`);
  // Alert.alert('fetchWithAuth', `${options.method ?? 'GET'} → ${response.status}`);

  if (response.status !== 401 && response.status !== 403) {
    return response;
  }

  // ── 401/403 감지: 토큰 재발급 시도 ──────────────────────────────────
  // TODO: 배포 전 삭제 — 아래 3개 Alert 제거
  // Alert.alert('fetchWithAuth', `${response.status} 감지 → 토큰 재발급 시도`);

  const reissued = await reissueToken();

  if (!reissued) {
    // Alert.alert('fetchWithAuth', '재발급 실패 → 로그아웃 처리');
    await logoutFromServer();
    navigateTo('Auth');
    throw new Error('세션이 만료되었습니다. 다시 로그인해 주세요.');
  }

  // ── 재발급 성공: 새 토큰으로 원래 요청 재시도 ───────────────────────
  // Alert.alert('fetchWithAuth', '재발급 성공 → 원래 요청 재시도');

  const newToken = await storage.getToken();

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${newToken}`,
    },
  });
}
