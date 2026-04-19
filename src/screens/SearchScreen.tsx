import React from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

const CHIPS = [
  { label: '집', icon: 'home' as const, active: true },
  { label: '학교', icon: 'school-outline' as const, active: false },
  { label: '회사', icon: 'briefcase-outline' as const, active: false },
];

const RECENT = [
  { name: '강남역 2호선', addr: '서울 강남구 역삼동' },
  { name: '성수동 카페거리', addr: '서울 성동구 성수동' },
];

const STOPS = [
  {
    id: '22-124', name: '서초아트자이아파트',
    buses: [
      { badge: '740', color: 'green' as const, dest: '강남역 방면', time: '3분', soon: true },
      { badge: 'M4403', color: 'brown' as const, dest: '동탄역 방면', time: '12분', soon: false },
    ],
  },
  {
    id: '22-125', name: '서초동진흥아파트',
    buses: [
      { badge: '지하철 2호선', color: 'blue' as const, dest: '교대역 방면', time: '곧 도착', soon: true },
      { badge: '4412', color: 'green' as const, dest: '교대역 방면', time: '8분', soon: false },
    ],
  },
];

const BADGE_COLORS = {
  green: { bg: 'rgba(81,100,82,0.1)', text: Colors.primary },
  brown: { bg: 'rgba(123,87,69,0.1)', text: Colors.brown },
  blue: { bg: 'rgba(34,139,230,0.1)', text: Colors.blue },
};

export default function SearchScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      {/* Safety FAB */}
      <Pressable
        style={({ pressed }) => [styles.safetyFab, pressed && { opacity: 0.85 }]}
        onPress={() => nav.navigate('Safety')}
      >
        <Ionicons name="shield-checkmark" size={22} color="#fff" />
      </Pressable>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="search" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>Explore Paths</Text>
        </View>
        <Pressable onPress={() => nav.navigate('MapDetail')}>
          <Ionicons name="map-outline" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Input */}
        <View style={styles.inputWrap}>
          <Ionicons name="location-outline" size={18} color={Colors.textSecondary} style={{ position: 'absolute', left: 20, top: 22, zIndex: 1 }} />
          <TextInput style={styles.input} placeholder="어디로 갈까요?" placeholderTextColor="rgba(93,96,92,0.5)" />
          <Pressable style={{ position: 'absolute', right: 20, top: 20 }}>
            <Ionicons name="mic-outline" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Chips */}
        <View style={styles.chips}>
          {CHIPS.map(c => (
            <Pressable key={c.label} style={[styles.chip, c.active && styles.chipActive]}>
              <Ionicons name={c.icon} size={14} color={c.active ? '#fff' : Colors.textPrimary} />
              <Text style={[styles.chipText, c.active && { color: '#fff' }]}>{c.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.chipAdd}><Ionicons name="add" size={18} color={Colors.textSecondary} /></Pressable>
        </View>

        {/* Recent */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 검색</Text>
            <Pressable><Text style={styles.sectionAction}>모두 지우기</Text></Pressable>
          </View>
          {RECENT.map(r => (
            <Pressable key={r.name} style={styles.recentItem} onPress={() => nav.navigate('MapDetail')}>
              <View style={styles.recentIcon}><Ionicons name="location-outline" size={16} color={Colors.textSecondary} /></View>
              <View><Text style={styles.recentName}>{r.name}</Text><Text style={styles.recentAddr}>{r.addr}</Text></View>
            </Pressable>
          ))}
        </View>

        {/* Nearby Stops */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주변 정류장</Text>
          {/* Map Preview */}
          <View style={styles.mapPreview}>
            <View style={styles.mapGrid} />
            <View style={styles.mapTag}>
              <View style={styles.mapDot} />
              <Text style={styles.mapTagText}>현재 위치: 서초동</Text>
            </View>
          </View>

          {/* Stop Cards */}
          {STOPS.map(stop => (
            <Pressable key={stop.id} style={styles.stopCard} onPress={() => nav.navigate('MapDetail')}>
              <View style={styles.stopHeader}>
                <View>
                  <Text style={styles.stopId}>ID: {stop.id}</Text>
                  <Text style={styles.stopName}>{stop.name}</Text>
                </View>
                <Ionicons name="bookmark-outline" size={18} color={Colors.textSecondary} />
              </View>
              {stop.buses.map(bus => (
                <View key={bus.badge} style={styles.busLine}>
                  <View style={styles.busInfo}>
                    <View style={[styles.busBadge, { backgroundColor: BADGE_COLORS[bus.color].bg }]}>
                      <Text style={[styles.busBadgeText, { color: BADGE_COLORS[bus.color].text }]}>{bus.badge}</Text>
                    </View>
                    <Text style={styles.busDest}>{bus.dest}</Text>
                  </View>
                  <Text style={[styles.busTime, bus.soon && { color: Colors.textDanger, fontWeight: '600' }]}>{bus.time}</Text>
                </View>
              ))}
            </Pressable>
          ))}
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
  headerTitle: { fontFamily: 'System', fontWeight: '700', fontSize: 18, color: Colors.primary, letterSpacing: -0.45 },

  content: { padding: 24, paddingBottom: 100, gap: 28 },
  inputWrap: { position: 'relative' },
  input: {
    backgroundColor: Colors.bgInput, borderRadius: 16,
    paddingVertical: 20, paddingLeft: 50, paddingRight: 50,
    fontSize: 18, color: Colors.textPrimary,
  },

  chips: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.bgCard, borderRadius: 9999,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  chipAdd: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },

  section: { gap: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '500', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.7 },
  sectionAction: { fontSize: 12, color: 'rgba(81,100,82,0.7)' },

  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 12, borderRadius: 20 },
  recentIcon: { width: 40, height: 40, backgroundColor: Colors.bgInput, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  recentName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  recentAddr: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  mapPreview: { height: 160, borderRadius: 24, backgroundColor: '#d4ddd0', overflow: 'hidden', justifyContent: 'flex-end' },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
  mapTag: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', margin: 16,
  },
  mapDot: { width: 8, height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  mapTagText: { fontSize: 12, fontWeight: '500', color: Colors.textPrimary },

  stopCard: { backgroundColor: Colors.bgCard, borderRadius: 32, padding: 21, gap: 16 },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stopId: { fontSize: 11, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1.1 },
  stopName: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary, marginTop: 4 },
  busLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 12 },
  busInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  busBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  busBadgeText: { fontSize: 11, fontWeight: '600', letterSpacing: -0.55 },
  busDest: { fontSize: 14, color: Colors.textPrimary },
  busTime: { fontSize: 14, color: Colors.textSecondary },

  safetyFab: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});
