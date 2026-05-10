const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL!;

export const API = {
  auth: {
    kakaoLogin: `${BASE_URL}/api/v1/auth/kakao`, // POST — 카카오 토큰 → 서버 JWT
    reissue: `${BASE_URL}/api/v1/auth/reissue`, // POST — JWT 갱신
    logout: `${BASE_URL}/api/v1/auth/logout`, // POST — 로그아웃
  },
  profile: {
    get: `${BASE_URL}/api/v1/profile`, // GET — 프로필 조회
  },
  routes: {
    search:  `${BASE_URL}/api/v1/routes`,         // POST — 경로 탐색
    history: `${BASE_URL}/api/v1/routes/history`, // GET  — 경로 탐색 히스토리
  },
  favorites: {
    list: `${BASE_URL}/api/v1/favorites`,          // GET  — 즐겨찾기 목록
    save: `${BASE_URL}/api/v1/favorites`,          // POST — 즐겨찾기 저장
  },
};
