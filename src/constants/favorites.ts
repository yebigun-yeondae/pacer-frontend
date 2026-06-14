import { Colors } from '../theme/colors';

/**
 * 즐겨찾기 아이콘 프리셋 목록
 * SearchScreen(칩 표시)과 SavedScreen(카드·모달)에서 공통 사용
 */
export const ICON_OPTIONS = [
  { key: 'home',              icon: 'home'              as const, color: Colors.primaryLight, iconColor: Colors.primary    },
  { key: 'school-outline',    icon: 'school-outline'    as const, color: Colors.brownLight,   iconColor: Colors.textDanger },
  { key: 'briefcase-outline', icon: 'briefcase-outline' as const, color: Colors.yellow,       iconColor: Colors.brown      },
] as const;

export type IconKey = typeof ICON_OPTIONS[number]['key'];

/** 인덱스 기반 아이콘 프리셋 순환 반환 */
export function getPreset(index: number) {
  return ICON_OPTIONS[index % ICON_OPTIONS.length];
}
