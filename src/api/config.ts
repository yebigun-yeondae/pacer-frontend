// 백엔드 서버 URL — 백엔드 친구가 서버 올리면 여기 URL만 교체하면 됨
export const BASE_URL = 'https://YOUR_BACKEND_URL'; // TODO: 백엔드 URL 입력

export const API = {
  auth: {
    kakaoLogin: `${BASE_URL}/api/auth/kakao`,  // POST — 카카오 토큰 → 서버 JWT
    refresh:    `${BASE_URL}/api/auth/refresh`, // POST — JWT 갱신
    logout:     `${BASE_URL}/api/auth/logout`,  // POST — 로그아웃
  },
};
