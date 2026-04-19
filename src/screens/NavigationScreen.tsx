import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function NavigationScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Safety'>>();
  const [signalCount, setSignalCount] = useState(12);

  useEffect(() => {
    const t = setInterval(() => setSignalCount(c => (c <= 0 ? 15 : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.avatar} onPress={() => nav.goBack()}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Serene Walk</Text>
        </View>
        <Pressable><Ionicons name="search" size={18} color={Colors.textSecondary} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Destination Info */}
        <View style={styles.destSection}>
          <View style={styles.destBadge}><Text style={styles.destBadgeText}>Active Navigation</Text></View>
          <Text style={styles.destName}>광주송정역</Text>
          <Text style={styles.destDetail}>잔여 거리 520m · 도보 7분</Text>
        </View>

        {/* Speed Gauge */}
        <View style={styles.gaugeWrap}>
          <View style={styles.gaugeRing}>
            <View style={styles.gaugeTrack} />
            <View style={styles.gaugeActive} />
            <View style={styles.gaugeCenter}>
              <Text style={styles.gaugeValue}>4.8</Text>
              <Text style={styles.gaugeLabel}>km/h로 걸으세요</Text>
            </View>
            <View style={styles.signalFloat}>
              <Ionicons name="time-outline" size={12} color="#fff7f5" />
              <Text style={styles.signalFloatText}>{signalCount}초 남음</Text>
            </View>
          </View>
        </View>

        {/* Turn-by-Turn */}
        <View style={styles.tbtCard}>
          <View style={styles.tbtIcon}>
            <Ionicons name="arrow-up" size={24} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tbtTitle}>직진 120m 후 횡단보도</Text>
            <Text style={styles.tbtDesc}>상무대로를 따라 계속 이동하세요</Text>
          </View>
        </View>

        {/* Transit Alert */}
        <Pressable style={styles.transitCard}>
          <View style={styles.transitLeft}>
            <View style={styles.transitIcon}>
              <Ionicons name="bus" size={18} color="#fff" />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.transitNum}>301</Text>
                <Text style={styles.transitText}>번 버스 3분 후 도착</Text>
              </View>
              <Text style={styles.transitSub}>탑승 가능</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.brown} />
        </Pressable>

        {/* Mini Map */}
        <View style={styles.minimap}>
          <View style={styles.minimapOverlay} />
          <View style={styles.minimapLoc}>
            <View style={styles.minimapDot} />
            <Text style={styles.minimapText}>실시간 위치 파악 중</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16,
    backgroundColor: Colors.overlay,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#d3e8d2',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  headerTitle: { fontWeight: '700', fontSize: 20, color: Colors.primary, letterSpacing: 0.5 },

  content: { padding: 24, paddingBottom: 100, gap: 28 },

  destSection: { alignItems: 'center', gap: 4 },
  destBadge: { backgroundColor: Colors.bgInput, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 9999 },
  destBadgeText: { fontSize: 12, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '500' },
  destName: { fontSize: 30, fontWeight: '500', color: Colors.textPrimary, letterSpacing: -0.75, marginTop: 8 },
  destDetail: { fontSize: 16, color: Colors.textSecondary },

  gaugeWrap: { alignItems: 'center', paddingTop: 8 },
  gaugeRing: {
    width: 256, height: 256, backgroundColor: Colors.bgCard, borderRadius: 128,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.03, shadowRadius: 32, elevation: 4,
  },
  gaugeTrack: { position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, borderRadius: 112, borderWidth: 12, borderColor: Colors.bgInput },
  gaugeActive: {
    position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, borderRadius: 112,
    borderWidth: 12, borderColor: 'transparent',
    borderTopColor: Colors.primary, borderRightColor: Colors.primary, borderBottomColor: Colors.primary,
    transform: [{ rotate: '-45deg' }],
  },
  gaugeCenter: { alignItems: 'center', zIndex: 2 },
  gaugeValue: { fontWeight: '800', fontSize: 36, color: Colors.primary },
  gaugeLabel: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  signalFloat: {
    position: 'absolute', bottom: -8, right: -16,
    backgroundColor: Colors.brown, borderRadius: 24,
    paddingHorizontal: 20, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 4,
  },
  signalFloatText: { fontSize: 14, color: '#fff7f5', letterSpacing: -0.35 },

  tbtCard: {
    backgroundColor: '#fff', borderRadius: 32, padding: 24,
    flexDirection: 'row', alignItems: 'flex-start', gap: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 16, elevation: 2,
  },
  tbtIcon: { width: 56, height: 56, backgroundColor: Colors.primaryLight, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tbtTitle: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary },
  tbtDesc: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },

  transitCard: {
    backgroundColor: Colors.brownBg, borderRadius: 32, padding: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  transitLeft: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  transitIcon: { width: 48, height: 48, backgroundColor: Colors.brown, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  transitNum: { fontWeight: '800', fontSize: 16, color: Colors.brown },
  transitText: { fontSize: 14, color: '#6c4a39' },
  transitSub: { fontSize: 12, color: Colors.primary, marginTop: 2 },

  minimap: {
    height: 192, backgroundColor: Colors.bgInput, borderRadius: 32, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  minimapOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.15 },
  minimapLoc: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 18, paddingBottom: 24,
  },
  minimapDot: { width: 12, height: 12, backgroundColor: Colors.primary, borderRadius: 6 },
  minimapText: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2 },
});
