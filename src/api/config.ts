const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL!;

export const API = {
  auth: {
    kakaoLogin: `${BASE_URL}/api/v1/auth/kakao`,    // POST   — 카카오 토큰 → 서버 JWT
    signup:     `${BASE_URL}/api/v1/auth/signup`,   // POST   — 일반 회원가입
    login:      `${BASE_URL}/api/v1/auth/login`,    // POST   — 일반 로그인
    reissue:    `${BASE_URL}/api/v1/auth/reissue`,  // POST   — JWT 갱신
    logout:     `${BASE_URL}/api/v1/auth/logout`,   // POST   — 로그아웃
    withdraw:   `${BASE_URL}/api/v1/auth/withdraw`, // DELETE — 회원 탈퇴
  },
  profile: {
    get:         `${BASE_URL}/api/v1/profile`,       // GET  — 프로필 조회
    updateSpeed: `${BASE_URL}/api/v1/profile/walking-speed`, // PATCH — 사용자 속도 업데이트
  },
  routes: {
    search:  `${BASE_URL}/api/v1/routes`,         // POST — 경로 탐색
    history: `${BASE_URL}/api/v1/routes/history`, // GET  — 경로 탐색 히스토리
  },
  favorites: {
    list: `${BASE_URL}/api/v1/favorites`,          // GET  — 즐겨찾기 목록
    save: `${BASE_URL}/api/v1/favorites`,          // POST — 즐겨찾기 저장
  },
  busStops: {
    nearby: `${BASE_URL}/api/v1/bus-stops/nearby`, // GET  — 근처 버스정류장 (lat, lng, radiusM)
  },
  subwayStations: {
    nearby: `${BASE_URL}/api/v1/subway-stations/nearby`, // GET — 근처 지하철역 (lat, lng, radiusM)
    arrivals: (stationNm: string) =>
      `${BASE_URL}/api/v1/subway-stations/${encodeURIComponent(stationNm)}/arrivals`, // GET — 역 도착 정보
  },
};
