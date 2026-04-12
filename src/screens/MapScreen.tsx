import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [walkCount, setWalkCount] = useState(12);
  const [stopCount, setStopCount] = useState(24);
  const [sheetExpanded, setSheetExpanded] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setWalkCount(c => (c <= 0 ? 15 : c - 1));
      setStopCount(c => (c <= 0 ? 30 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.container}>
      {/* Map Background */}
      <View style={styles.mapBg}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(r => (
          <View key={`h${r}`} style={[styles.road, { top: `${r * 100}%`, left: '10%', width: '80%', height: 3 }]} />
        ))}
        {[0.25, 0.5, 0.75].map(r => (
          <View key={`v${r}`} style={[styles.road, { left: `${r * 100}%`, top: '5%', height: '90%', width: 3 }]} />
        ))}

        {/* Signal Markers */}
        <Pressable style={[styles.signalMarker, { top: 200, right: 60 }]}>
          <View style={[styles.signalCircle, { backgroundColor: Colors.signalGreen }]}>
            <Text style={styles.signalNum}>{walkCount}</Text>
          </View>
          <Text style={[styles.signalLabel, { color: Colors.signalGreen }]}>WALK</Text>
        </Pressable>
        <Pressable style={[styles.signalMarker, { top: 380, left: 180 }]}>
          <View style={[styles.signalCircle, { backgroundColor: Colors.signalRed }]}>
            <Text style={styles.signalNum}>{stopCount}</Text>
          </View>
          <Text style={styles.signalLabel}>STOP</Text>
        </Pressable>

        {/* Current Location */}
        <View style={[styles.currentLoc, { top: height * 0.55, left: 80 }]}>
          <View style={styles.locOuter} />
          <View style={styles.locInner} />
        </View>

        {/* FABs */}
        <View style={styles.fabs}>
          <Pressable style={styles.fab}><Ionicons name="locate" size={20} color={Colors.textSecondary} /></Pressable>
          <Pressable style={styles.fab}><Ionicons name="layers-outline" size={20} color={Colors.textSecondary} /></Pressable>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBg} onPress={() => nav.goBack()}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Explore Paths</Text>
      </View>

      {/* Bottom Sheet */}
      <View style={[styles.sheet, !sheetExpanded && { transform: [{ translateY: 260 }] }]}>
        <Pressable style={styles.sheetHandle} onPress={() => setSheetExpanded(!sheetExpanded)} />
        <View style={styles.navSummary}>
          <View>
            <Text style={styles.timeLabel}>남은 도착 시간</Text>
            <Text style={styles.timeValue}>8 <Text style={styles.timeUnit}>분</Text></Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.badge}><Text style={styles.badgeText}>최적의 경로</Text></View>
            <Text style={styles.arrivalText}>오전 10:42 도착 예정</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="flash" size={14} color={Colors.primary} />
              <Text style={styles.statLabel}>권장 속도</Text>
            </View>
            <Text style={styles.statValue}>4.8 km/h로{'\n'}걸으세요</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="time-outline" size={14} color={Colors.primary} />
              <Text style={styles.statLabel}>다음 신호</Text>
            </View>
            <Text style={styles.statValue}>120m 뒤{'\n'}초록불 15초</Text>
          </View>
        </View>
        <Pressable style={({ pressed }) => [styles.endBtn, pressed && { opacity: 0.9 }]} onPress={() => nav.goBack()}>
          <Text style={styles.endBtnText}>경로 안내 종료</Text>
          <Ionicons name="close" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e2dfd6' },
  mapBg: { flex: 1, position: 'relative' },
  road: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 2 },

  signalMarker: {
    position: 'absolute', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16,
    padding: 8, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6,
  },
  signalCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signalNum: { fontSize: 10, fontWeight: '600', color: '#fff' },
  signalLabel: { fontSize: 10, fontWeight: '800', color: Colors.textPrimary, fontFamily: 'System' },

  currentLoc: { position: 'absolute', width: 24, height: 24 },
  locOuter: { position: 'absolute', width: 48, height: 48, backgroundColor: 'rgba(81,100,82,0.2)', borderRadius: 24, top: -12, left: -12 },
  locInner: { width: 24, height: 24, backgroundColor: Colors.primary, borderWidth: 4, borderColor: Colors.bg, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },

  fabs: { position: 'absolute', right: 24, top: height * 0.45, gap: 12 },
  fab: {
    width: 48, height: 48, backgroundColor: '#fff', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
  },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: Colors.overlay, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerBg: {
    width: 40, height: 40, backgroundColor: Colors.bgInput, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontWeight: '700', fontSize: 18, color: Colors.primary, letterSpacing: -0.45 },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: 'rgba(250,249,246,0.95)', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 25, paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 10,
  },
  sheetHandle: { width: 48, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginVertical: 16 },

  navSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  timeLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  timeValue: { fontSize: 40, fontWeight: '700', color: Colors.textPrimary },
  timeUnit: { fontSize: 20, fontWeight: '500' },
  badge: { backgroundColor: 'rgba(81,100,82,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 8 },
  badgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary, letterSpacing: 0.5 },
  arrivalText: { fontSize: 14, color: Colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  statValue: { fontSize: 16, fontWeight: '500', color: Colors.textPrimary, lineHeight: 22 },

  endBtn: {
    backgroundColor: Colors.textPrimary, borderRadius: 16, paddingVertical: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  endBtnText: { fontSize: 16, fontWeight: '500', color: '#fff' },
});
