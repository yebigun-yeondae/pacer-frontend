import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import WebView from 'react-native-webview';
import {
  searchRoute, formatRemainingTime, formatArrivalTime, getNextSignal, PACE_SPEED_MAP,
} from '../api/routeApi';
import type { RouteResponse } from '../api/routeApi';

const KAKAO_JS_KEY = 'a05f5eb0d7f2daf71afbbd5762eda83e';

const kakaoMapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>
  <style>html, body, #map { width:100%; height:100%; margin:0; padding:0; }</style>
  <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(37.5665, 126.9780),
      level: 3
    });
    // 현재 위치 수신
    window.addEventListener('message', function(e) {
      try {
        var data = JSON.parse(e.data);
        if (data.type === 'moveToLocation') {
          var pos = new kakao.maps.LatLng(data.lat, data.lng);
          map.setCenter(pos);
          new kakao.maps.Marker({ map: map, position: pos });
        }
      } catch(_) {}
    });
  </script>
</body>
</html>
`;

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const webviewRef = useRef<WebView>(null);

  const moveToCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition(pos => {
      webviewRef.current?.postMessage(JSON.stringify({
        type: 'moveToLocation',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }));
    });
  };

  const fetchRoute = async () => {
    setIsLoadingRoute(true);
    try {
      const data = await searchRoute({
        origin: { lat: 35.1595, lng: 126.8526 },
        destination: { lat: 35.1512, lng: 126.8611 },
        originName: '광주역',
        destinationName: '충장로',
        mode: 'BALANCED',
      });
      setRouteData(data);
      setSheetExpanded(true);
    } catch (e: any) {
      console.warn('[Route] 탐색 실패:', e.message);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Kakao Map */}
      <View style={styles.mapBg}>
        <WebView
          ref={webviewRef}
          source={{ html: kakaoMapHtml }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
        />
        {/* FABs */}
        <View style={styles.fabs}>
          <Pressable style={styles.fab} onPress={moveToCurrentLocation}>
            <Ionicons name="locate" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Pressable style={styles.fab}>
            <Ionicons name="layers-outline" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBg} onPress={() => nav.goBack()}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Explore Paths</Text>
      </View>

      {/* 경로 탐색 버튼 (탐색 전) */}
      {!routeData && (
        <Pressable
          style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.85 }]}
          onPress={fetchRoute}
          disabled={isLoadingRoute}
        >
          <Ionicons name="navigate-outline" size={18} color="#fff" />
          <Text style={styles.searchBtnText}>
            {isLoadingRoute ? '탐색 중...' : '경로 탐색'}
          </Text>
        </Pressable>
      )}

      {/* Bottom Sheet (탐색 후) */}
      {routeData && (() => {
        const time = formatRemainingTime(routeData.totalTimeSeconds);
        const nextSignal = getNextSignal(routeData.signalCheckpoints);
        const speed = PACE_SPEED_MAP[nextSignal?.recommendedPace ?? 'NORMAL'];
        const signalEta = nextSignal
          ? `${Math.round(nextSignal.etaFromStartSeconds / routeData.totalTimeSeconds * routeData.totalDistanceMeters)}m 뒤\n${nextSignal.signalState === 'GREEN' ? '초록불' : '빨간불'}`
          : '신호 없음';
        return (
          <View style={[styles.sheet, !sheetExpanded && { transform: [{ translateY: 260 }] }]}>
            <Pressable style={styles.sheetHandle} onPress={() => setSheetExpanded(!sheetExpanded)} />
            <View style={styles.navSummary}>
              <View>
                <Text style={styles.timeLabel}>남은 도착 시간</Text>
                <Text style={styles.timeValue}>{time.value} <Text style={styles.timeUnit}>{time.unit}</Text></Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={styles.badge}><Text style={styles.badgeText}>최적의 경로</Text></View>
                <Text style={styles.arrivalText}>{formatArrivalTime(routeData.totalTimeSeconds)}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Ionicons name="flash" size={14} color={Colors.primary} />
                  <Text style={styles.statLabel}>권장 속도</Text>
                </View>
                <Text style={styles.statValue}>{speed} km/h로{'\n'}걸으세요</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statHeader}>
                  <Ionicons name="time-outline" size={14} color={Colors.primary} />
                  <Text style={styles.statLabel}>다음 신호</Text>
                </View>
                <Text style={styles.statValue}>{signalEta}</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [styles.endBtn, pressed && { opacity: 0.9 }]}
              onPress={() => nav.navigate('Safety', {
                routeData,
                destinationName: '충장로',
                originName: '광주역',
              })}
            >
              <Text style={styles.endBtnText}>경로 안내 시작</Text>
              <Ionicons name="navigate" size={16} color="#fff" />
            </Pressable>
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e2dfd6' },
  mapBg: { flex: 1, position: 'relative' },

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

  searchBtn: {
    position: 'absolute', bottom: 100, alignSelf: 'center', zIndex: 10,
    backgroundColor: Colors.primary, borderRadius: 24,
    paddingHorizontal: 28, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  searchBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
