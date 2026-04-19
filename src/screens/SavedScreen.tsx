import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

const PLACES = [
  { name: '집', addr: '서울특별시 강남구...', icon: 'home' as const, color: Colors.primaryLight, iconColor: Colors.primary },
  { name: '학교', addr: '중구 필동로 1길...', icon: 'school-outline' as const, color: Colors.brownLight, iconColor: Colors.textDanger },
  { name: '회사', addr: '판교역로 235...', icon: 'briefcase-outline' as const, color: Colors.yellow, iconColor: Colors.brown },
];

const ROUTES = [
  { name: '충장로', dist: '집에서 12.4km', time: '15분', cal: '120 kcal' },
  { name: '첨단지구', dist: '현재 위치에서 4.2km', time: '28분', cal: '210 kcal' },
];

export default function SavedScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>Y</Text>
          </View>
          <Text style={styles.headerTitle}>Serene Walk</Text>
        </View>
        <Pressable><Ionicons name="search" size={18} color={Colors.textSecondary} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View>
          <Text style={styles.title}>저장된 장소</Text>
          <Text style={styles.subtitle}>당신의 소중한 장소와 경로를 확인하세요.</Text>
        </View>

        {/* Place Cards */}
        <View style={styles.placeList}>
          {PLACES.map(p => (
            <Pressable key={p.name} style={styles.placeCard} onPress={() => nav.navigate('MapDetail')}>
              <View style={[styles.placeIcon, { backgroundColor: p.color }]}>
                <Ionicons name={p.icon} size={18} color={p.iconColor} />
              </View>
              <View>
                <Text style={styles.placeName}>{p.name}</Text>
                <Text style={styles.placeAddr}>{p.addr}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Routes Header */}
        <View style={styles.routeHeader}>
          <Text style={styles.routeTitle}>저장된 경로</Text>
          <Pressable><Text style={styles.routeAction}>모두 보기</Text></Pressable>
        </View>

        {/* Route Cards */}
        {ROUTES.map(r => (
          <Pressable key={r.name} style={styles.routeCard} onPress={() => nav.navigate('MapDetail')}>
            <View style={styles.routeThumb}>
              <View style={[styles.thumbRoad, { left: '20%', top: '30%', width: '60%', height: 2, transform: [{ rotate: '-15deg' }] }]} />
              <View style={[styles.thumbRoad, { left: '40%', top: '10%', width: 2, height: '80%' }]} />
            </View>
            <View style={styles.routeInfo}>
              <Text style={styles.routeName}>{r.name}</Text>
              <View style={styles.routeDist}>
                <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.routeDistText}>{r.dist}</Text>
              </View>
              <View style={styles.routeTags}>
                <View style={styles.routeTag}>
                  <Ionicons name="walk" size={12} color="#4e604f" />
                  <Text style={[styles.routeTagText, { color: '#4e604f' }]}>{r.time}</Text>
                </View>
                <View style={styles.routeTag}>
                  <Ionicons name="flame" size={12} color={Colors.brown} />
                  <Text style={[styles.routeTagText, { color: Colors.brown }]}>{r.cal}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ alignSelf: 'center' }} />
          </Pressable>
        ))}

        {/* Add Route */}
        <Pressable style={styles.addRoute}>
          <Ionicons name="add-circle-outline" size={25} color={Colors.textSecondary} />
          <Text style={styles.addRouteText}>새로운 경로 추가</Text>
        </Pressable>
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
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '600', color: Colors.primary },
  headerTitle: { fontWeight: '700', fontSize: 20, color: Colors.primary, letterSpacing: 0.5 },

  content: { padding: 24, paddingBottom: 100, gap: 24 },
  title: { fontSize: 30, fontWeight: '500', color: Colors.textPrimary, letterSpacing: -0.75 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, opacity: 0.7, marginTop: 4 },

  placeList: { gap: 16 },
  placeCard: { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 24, gap: 16 },
  placeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary },
  placeAddr: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeTitle: { fontSize: 24, fontWeight: '500', color: Colors.textPrimary, letterSpacing: -0.6 },
  routeAction: { fontSize: 14, color: Colors.primary },

  routeCard: {
    backgroundColor: '#fff', borderRadius: 28, padding: 16,
    flexDirection: 'row', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1,
  },
  routeThumb: { width: 96, height: 96, borderRadius: 16, backgroundColor: '#eeeeea', overflow: 'hidden', position: 'relative' },
  thumbRoad: { position: 'absolute', backgroundColor: 'rgba(81,100,82,0.3)', borderRadius: 1 },
  routeInfo: { flex: 1, justifyContent: 'center' },
  routeName: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary },
  routeDist: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  routeDistText: { fontSize: 14, color: Colors.textSecondary },
  routeTags: { flexDirection: 'row', gap: 12, marginTop: 12 },
  routeTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bgCard, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4 },
  routeTagText: { fontSize: 12, fontWeight: '600' },

  addRoute: {
    borderWidth: 2, borderColor: Colors.borderMedium, borderStyle: 'dashed',
    borderRadius: 28, padding: 26, alignItems: 'center', gap: 8,
  },
  addRouteText: { fontSize: 14, color: Colors.textSecondary },
});
