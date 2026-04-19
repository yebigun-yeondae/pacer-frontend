import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { formatRemainingTime, formatDistance } from '../api/routeApi';
import type { NavStep } from '../api/routeApi';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const AUTO_ADVANCE_METERS = 25;

export default function NavigationScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Safety'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Safety'>>();
  const insets = useSafeAreaInsets();
  const params = route.params;

  const steps: NavStep[] = params?.steps ?? [];
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const currentStepIdxRef = useRef(0);
  const currentStep = steps[currentStepIdx] ?? null;
  const upcomingSteps = steps.slice(currentStepIdx + 1);

  useEffect(() => {
    currentStepIdxRef.current = currentStepIdx;
  }, [currentStepIdx]);

  useEffect(() => {
    if (steps.length === 0) return;
    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const idx = currentStepIdxRef.current;
          const nextStep = steps[idx + 1];
          if (!nextStep) return;
          const [lng, lat] = nextStep.location;
          const dist = haversineMeters(latitude, longitude, lat, lng);
          if (dist < AUTO_ADVANCE_METERS) {
            setCurrentStepIdx(i => i + 1);
          }
        }
      );
    })();

    return () => { sub?.remove(); };
  }, [steps]);

  const destinationName = params?.destinationName ?? '목적지';
  const distance = params?.routeData ? formatDistance(params.routeData.totalDistanceMeters) : '—';
  const timeInfo = params?.routeData ? formatRemainingTime(params.routeData.totalTimeSeconds) : null;
  const timeLabel = timeInfo ? `도보 ${timeInfo.value}${timeInfo.unit}` : '—';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={() => nav.goBack()}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Serene Walk</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Destination Info */}
        <View style={styles.destSection}>
          <View style={styles.destBadge}>
            <Text style={styles.destBadgeText}>Active Navigation</Text>
          </View>
          <Text style={styles.destName}>{destinationName}</Text>
          <Text style={styles.destDetail}>잔여 거리 {distance} · {timeLabel}</Text>
        </View>

        {/* Current Step Card */}
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
              <Pressable style={styles.nextStepBtn} onPress={() => setCurrentStepIdx(i => i + 1)}>
                <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.currentStepCard}>
            <View style={styles.currentStepIcon}>
              <Ionicons name="navigate-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.currentStepInstruction}>경로 안내 중</Text>
          </View>
        )}

        {/* Upcoming Steps */}
        {upcomingSteps.length > 0 && (
          <View style={styles.upcomingCard}>
            <Text style={styles.upcomingTitle}>다음 경로</Text>
            {upcomingSteps.map((step, idx) => (
              <View key={idx} style={[styles.upcomingRow, idx < upcomingSteps.length - 1 && styles.upcomingRowBorder]}>
                <View style={styles.upcomingIconWrap}>
                  <Ionicons name={step.icon as any} size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upcomingInstruction}>{step.instruction}</Text>
                  {step.streetName ? (
                    <Text style={styles.upcomingStreet}>{step.streetName}</Text>
                  ) : null}
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 16,
    backgroundColor: Colors.overlay,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#d3e8d2',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontWeight: '700', fontSize: 20, color: Colors.primary, letterSpacing: 0.5 },

  content: { padding: 24, gap: 20 },

  destSection: { alignItems: 'center', gap: 4 },
  destBadge: { backgroundColor: Colors.bgInput, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999 },
  destBadgeText: { fontSize: 12, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '500' },
  destName: { fontSize: 28, fontWeight: '500', color: Colors.textPrimary, letterSpacing: -0.75, marginTop: 8 },
  destDetail: { fontSize: 15, color: Colors.textSecondary },

  currentStepCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3,
  },
  currentStepIcon: {
    width: 56, height: 56, backgroundColor: Colors.primaryLight ?? '#d3e8d2',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  currentStepInstruction: { fontSize: 20, fontWeight: '600', color: Colors.textPrimary },
  currentStepStreet: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  currentStepDist: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 6 },
  nextStepBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },

  upcomingCard: {
    backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  upcomingTitle: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 12 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  upcomingRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  upcomingIconWrap: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  upcomingInstruction: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  upcomingStreet: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  upcomingDist: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
});
