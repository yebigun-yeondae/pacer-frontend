import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./AppNavigator";

// 컴포넌트 밖(API 레이어 등)에서 navigate()를 호출할 수 있게 해주는 ref
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateTo(name: keyof RootStackParamList) {
  if (navigationRef.isReady()) {
    navigationRef.reset({ index: 0, routes: [{ name }] });
  }
}
