const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_KEY!;

/**
 * 카카오 장소 검색 결과 (정규화된 타입)
 * 원본 API 응답의 place_name / x / y 등을 name / lng / lat 으로 변환
 */
export interface KakaoPlace {
  id: string;
  name: string;
  address: string;  // road_address_name 우선, 없으면 address_name
  lat: number;      // 위도 (원본 y)
  lng: number;      // 경도 (원본 x)
}

/**
 * 카카오 로컬 키워드 검색
 * @param query  검색어
 * @param size   결과 개수 (기본 15, 최대 15)
 */
export async function searchKakaoPlaces(
  query: string,
  size = 15,
): Promise<KakaoPlace[]> {
  if (!query.trim()) return [];

  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query.trim())}&size=${size}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });

  if (!res.ok) throw new Error(`카카오 검색 오류: ${res.status}`);

  const data = await res.json();
  return (data.documents ?? []).map((p: any): KakaoPlace => ({
    id:      p.id,
    name:    p.place_name,
    address: p.road_address_name || p.address_name,
    lat:     parseFloat(p.y),
    lng:     parseFloat(p.x),
  }));
}
