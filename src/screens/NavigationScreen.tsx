import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { formatDistance } from "../api/routeApi";
import type { NavStep } from "../api/routeApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { navStatusStore, NavStatus } from "../utils/navStatus";
import { haversineMeters } from "../utils/geo";
import { useIntersectionSignals } from "../utils/intersectionSignal";

const AUTO_ADVANCE_METERS = 25;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const STATUS_LABELS: Record<NavStatus, string> = {
  navigating: '경로 안내 중',
  measuring:  '경로 측정 중',
  rerouting:  '경로 재탐색 중',
};

export default function NavigationScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList, "Safety">>();
  const route = useRoute<RouteProp<RootStackParamList, "Safety">>();
  const insets = useSafeAreaInsets();
  const params = route.params;

  // 경로 스텝
  const steps: NavStep[] = params?.steps ?? [];
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const currentStepIdxRef = useRef(0);
  const currentStep = steps[currentStepIdx] ?? null;
  const upcomingSteps = steps.slice(currentStepIdx + 1);

  useEffect(() => { currentStepIdxRef.current = currentStepIdx; }, [currentStepIdx]);

  // 교차로 신호 상태 (1초마다 갱신, 경로 안내 종료까지 계속 동작)
  const { signals: computedSignals } = useIntersectionSignals(
    params?.routeData?.intersectionSignals,
    params?.routeData?.signalCheckpoints,
    true,
  );
  const firstSignal = computedSignals[0] ?? null;
  const isCurrentlyRed = firstSignal?.status === "RED";
  const isSignalUnknown = !firstSignal || firstSignal.status === "UNKNOWN";
  const signalCountdown = firstSignal?.remainingSec ?? null;

  // 신호등 알림 권한 + 채널 설정
  useEffect(() => {
    (async () => {
      await Notifications.requestPermissionsAsync();
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "신호등 알림",
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
    })();
  }, []);

  // 다음 신호 전환 시점에 맞춰 로컬 알림 예약 (앱이 백그라운드일 때도 표시됨)
  const scheduledSignalRef = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => {
    if (!firstSignal || firstSignal.status === "UNKNOWN" || firstSignal.remainingSec == null) {
      return;
    }

    const key = `${firstSignal.itstId}-${firstSignal.status}`;
    if (scheduledSignalRef.current?.key === key) return;

    const remainingSec = firstSignal.remainingSec;

    (async () => {
      if (scheduledSignalRef.current) {
        await Notifications.cancelScheduledNotificationAsync(scheduledSignalRef.current.id);
        scheduledSignalRef.current = null;
      }

      const nextStatusLabel = firstSignal.status === "RED" ? "초록불" : "빨간불";
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "신호등 알림",
          body: `다음 신호가 곧 ${nextStatusLabel}로 전환됩니다. (${remainingSec}초 후)`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, remainingSec),
          channelId: "default",
        },
      });
      scheduledSignalRef.current = { key, id };
    })();
  }, [firstSignal?.itstId, firstSignal?.status]);

  // 화면을 벗어날 때 예약된 알림 취소
  useEffect(() => {
    return () => {
      if (scheduledSignalRef.current) {
        Notifications.cancelScheduledNotificationAsync(scheduledSignalRef.current.id).catch(() => {});
      }
    };
  }, []);

  // 잔여 거리 (GPS → 목적지 haversine, 실시간)
  const destLat = params?.destinationLat ?? null;
  const destLng = params?.destinationLng ?? null;
  const [remainingMeters, setRemainingMeters] = useState<number | null>(
    params?.routeData?.totalDistanceMeters ?? null
  );

  // GPS 구독 — 잔여거리 + 스텝 자동 진행
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (pos) => {
          const { latitude, longitude } = pos.coords;

          // 잔여 거리 업데이트
          if (destLat !== null && destLng !== null) {
            const m = haversineMeters(latitude, longitude, destLat, destLng);
            setRemainingMeters(m);
          }

          // 스텝 자동 진행
          if (steps.length > 0) {
            const idx = currentStepIdxRef.current;
            const nextStep = steps[idx + 1];
            if (nextStep) {
              const [lng, lat] = nextStep.location;
              const dist = haversineMeters(latitude, longitude, lat, lng);
              if (dist < AUTO_ADVANCE_METERS) {
                setCurrentStepIdx((i) => i + 1);
              }
            }
          }
        },
      );
    })();
    return () => { sub?.remove(); };
  }, [steps, destLat, destLng]);

  // nav status 구독
  const [navStatus, setNavStatus] = useState<NavStatus>(navStatusStore.get());
  useEffect(() => navStatusStore.subscribe(setNavStatus), []);

  // 목적지 + 잔여 거리 텍스트
  const destinationName = params?.destinationName ?? "목적지";
  const remainingText = remainingMeters !== null
    ? `잔여 ${(remainingMeters / 1000).toFixed(1)} km`
    : '—';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>경로 안내</Text>
        </View>
        {/* 상태 배지 (우측 상단 작게) */}
        <View style={[
          styles.statusBadge,
          navStatus === 'rerouting' && { backgroundColor: '#fef3c7' },
          navStatus === 'measuring' && { backgroundColor: Colors.bgInput },
        ]}>
          <View style={[
            styles.statusDot,
            navStatus === 'navigating' && { backgroundColor: '#22c55e' },
            navStatus === 'rerouting' && { backgroundColor: '#f59e0b' },
            navStatus === 'measuring' && { backgroundColor: Colors.textMuted },
          ]} />
          <Text style={[
            styles.statusText,
            navStatus === 'rerouting' && { color: '#92400e' },
          ]}>
            {STATUS_LABELS[navStatus]}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 목적지 + 잔여 거리 */}
        <View style={styles.destSection}>
          <Text style={styles.destName} numberOfLines={1}>{destinationName}</Text>
          <Text style={styles.remainingDist}>{remainingText}</Text>
        </View>

        {/* 신호 카드 — 매초 업데이트 */}
        {firstSignal ? (
          <View style={[styles.signalCard, { borderColor: isSignalUnknown ? "#9ca3af" : isCurrentlyRed ? "#ef4444" : "#22c55e" }]}>
            <View style={[styles.signalDot, { backgroundColor: isSignalUnknown ? "#9ca3af" : isCurrentlyRed ? "#ef4444" : "#22c55e" }]}>
              {isSignalUnknown && <Text style={styles.signalDotMark}>?</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.signalTitle}>
                {isSignalUnknown ? "❔ 신호 확인 중" : isCurrentlyRed ? "🔴 빨간불" : "🟢 초록불"}
                {!isSignalUnknown && (
                  <>
                    {"  "}
                    <Text style={styles.signalCountdown}>{signalCountdown}초 후 전환</Text>
                  </>
                )}
              </Text>
              <Text style={styles.signalDesc}>
                {isSignalUnknown
                  ? "신호 정보를 확인할 수 없어요"
                  : isCurrentlyRed
                    ? "빠르게 걸으면 초록불에 통과할 수 있어요"
                    : "지금 출발하면 신호에 걸리지 않아요"}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noSignalCard}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.noSignalText}>근처 신호 정보 없음</Text>
          </View>
        )}

        {/* 현재 스텝 */}
        {currentStep ? (
          <View style={styles.currentStepCard}>
            <View style={styles.currentStepIcon}>
              <Ionicons name={currentStep.icon as any} size={28} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentStepInstruction}>{currentStep.instruction}</Text>
              {currentStep.streetName ? (
                <Text style={styles.currentStepStreet}>{currentStep.streetName}</Text>
              ) : null}
              {currentStep.distance > 0 ? (
                <Text style={styles.currentStepDist}>{formatDistance(currentStep.distance)}</Text>
              ) : null}
            </View>
            {currentStepIdx < steps.length - 1 && (
              <Pressable
                style={styles.nextStepBtn}
                onPress={() => setCurrentStepIdx((i) => i + 1)}
              >
                <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.currentStepCard}>
            <View style={styles.currentStepIcon}>
              <Ionicons name="navigate-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.currentStepInstruction}>경로를 따라 이동 중</Text>
          </View>
        )}

        {/* 다음 스텝 목록 */}
        {upcomingSteps.length > 0 && (
          <View style={styles.upcomingCard}>
            <Text style={styles.upcomingTitle}>다음 경로</Text>
            {upcomingSteps.map((step, idx) => (
              <View
                key={idx}
                style={[styles.upcomingRow, idx < upcomingSteps.length - 1 && styles.upcomingRowBorder]}
              >
                <View style={styles.upcomingIconWrap}>
                  <Ionicons name={step.icon as any} size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upcomingInstruction}>{step.instruction}</Text>
                  {step.streetName ? <Text style={styles.upcomingStreet}>{step.streetName}</Text> : null}
                </View>
                {step.distance > 0 && (
                  <Text style={styles.upcomingDist}>{formatDistance(step.distance)}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: Colors.overlay,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#d3e8d2",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontWeight: "700", fontSize: 20, color: Colors.primary, letterSpacing: 0.5 },

  // 상태 배지
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 9999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600', color: Colors.primary },

  content: { padding: 24, gap: 20 },

  // 목적지 섹션
  destSection: { alignItems: "center", gap: 6 },
  destName: {
    fontSize: 30, fontWeight: "500",
    color: Colors.textPrimary, letterSpacing: -0.75,
    textAlign: 'center',
  },
  remainingDist: {
    fontSize: 16, fontWeight: '600',
    color: Colors.primary,
  },

  // 신호 카드
  signalCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 18,
    backgroundColor: "#fafafa",
  },
  signalDot: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  signalDotMark: { fontSize: 11, fontWeight: "700", color: "#fff", lineHeight: 13 },
  signalTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  signalCountdown: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  signalDesc: { fontSize: 13, color: "#666" },
  noSignalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  noSignalText: { fontSize: 14, color: Colors.textMuted },

  // 현재 스텝
  currentStepCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 24,
    flexDirection: "row", alignItems: "center", gap: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
  },
  currentStepIcon: {
    width: 56, height: 56,
    backgroundColor: Colors.primaryLight ?? "#d3e8d2",
    borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  currentStepInstruction: { fontSize: 20, fontWeight: "600", color: Colors.textPrimary },
  currentStepStreet: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  currentStepDist: { fontSize: 13, color: Colors.primary, fontWeight: "600", marginTop: 6 },
  nextStepBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgCard,
    alignItems: "center", justifyContent: "center",
  },

  // 다음 스텝
  upcomingCard: {
    backgroundColor: "#fff", borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  upcomingTitle: {
    fontSize: 12, fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 12,
  },
  upcomingRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12,
  },
  upcomingRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  upcomingIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.bgInput,
    alignItems: "center", justifyContent: "center",
  },
  upcomingInstruction: { fontSize: 14, fontWeight: "500", color: Colors.textPrimary },
  upcomingStreet: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  upcomingDist: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
});
