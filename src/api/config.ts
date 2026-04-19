// 백엔드 서버 URL — 백엔드 친구가 서버 올리면 여기 URL만 교체하면 됨
export const BASE_URL = 'http://43.200.94.130:8080';

export const API = {
  auth: {
    kakaoLogin: `${BASE_URL}/api/v1/auth/kakao`,  // POST — 카카오 토큰 → 서버 JWT
    reissue:    `${BASE_URL}/api/v1/auth/reissue`, // POST — JWT 갱신
    logout:     `${BASE_URL}/api/v1/auth/logout`,  // POST — 로그아웃
  },
  profile: {
    get: `${BASE_URL}/api/v1/profile`,  // GET — 프로필 조회
  },
};
