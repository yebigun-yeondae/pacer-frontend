import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { fetchWithAuth } from "../api/fetchWithAuth";
import { API } from "../api/config";
import WebView from "react-native-webview";
import * as Location from "expo-location";

// ── 상수 ──────────────────────────────────────────────────────────────────────
const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY!;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_SIZE = SCREEN_WIDTH - 48; // content padding 24 * 2
const BUS_STOP_RADIUS = 500;        // 500m 반경

// ── 아이콘 프리셋 ──────────────────────────────────────────────────────────────
const ICON_OPTIONS = [
  { icon: "home" as const,             color: Colors.primaryLight, iconColor: Colors.primary },
  { icon: "school-outline" as const,   color: Colors.brownLight,   iconColor: Colors.textDanger },
  { icon: "briefcase-outline" as const,color: Colors.yellow,       iconColor: Colors.brown },
];
function getPreset(index: number) {
  return ICON_OPTIONS[index % ICON_OPTIONS.length];
}

// ── 타입 ──────────────────────────────────────────────────────────────────────
interface FavoriteItem {
  id: string;
  label: string;
  lat: number;
  lng: number;
  address: string;
}

interface RouteHistory {
  id: string;
  originName: string;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  createdAt: string;
}

interface BusStop {
  stopId: string;
  name: string;
  nodeNo: string;
  cityCode: number;
  lat: number;
  lng: number;
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── 미니 지도 HTML ─────────────────────────────────────────────────────────────
const miniMapHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"/>
  <style>html,body,#map{width:100%;height:100%;margin:0;padding:0;}</style>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(37.5665, 126.9780),
      level: 4
    });
    map.setDraggable(false);
    map.setZoomable(false);

    var userOverlay = null;
    var stopMarkers = [];
    var stopInfoWindows = [];

    window.updateUserLocation = function(lat, lng) {
      var pos = new kakao.maps.LatLng(lat, lng);
      if (userOverlay) {
        userOverlay.setPosition(pos);
      } else {
        var content = '<div style="width:16px;height:16px;border-radius:50%;background:#516452;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>';
        userOverlay = new kakao.maps.CustomOverlay({ position: pos, content: content, yAnchor: 0.5, xAnchor: 0.5 });
        userOverlay.setMap(map);
      }
      map.setCenter(pos);
    };

    window.showBusStops = function(stopsJson) {
      // 기존 마커 + 인포윈도우 제거
      stopMarkers.forEach(function(m) { m.setMap(null); });
      stopInfoWindows.forEach(function(iw) { iw.close(); });
      stopMarkers = [];
      stopInfoWindows = [];
      var stops = JSON.parse(stopsJson);
      stops.forEach(function(stop) {
        var pos = new kakao.maps.LatLng(stop.lat, stop.lng);
        // 핀 마커
        var marker = new kakao.maps.Marker({ position: pos, map: map });
        // 정류장 이름 말풍선
        var infowindow = new kakao.maps.InfoWindow({
          content: '<div style="padding:4px 8px;font-size:11px;font-weight:600;white-space:nowrap;">' + stop.name + '</div>',
          removable: false
        });
        infowindow.open(map, marker);
        stopMarkers.push(marker);
        stopInfoWindows.push(infowindow);
      });
    };
  </script>
</body>
</html>`;

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // 즐겨찾기
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isFavLoading, setIsFavLoading] = useState(false);

  // 히스토리
  const [history, setHistory] = useState<RouteHistory[]>([]);
  const [isHistLoading, setIsHistLoading] = useState(false);
  const [histModalVisible, setHistModalVisible] = useState(false);

  // 미니 지도
  const miniMapRef = useRef<WebView>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const currentLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busStops, setBusStops] = useState<BusStop[]>([]);

  // 포커스될 때마다 즐겨찾기 + 히스토리 로드 + GPS 시작
  useFocusEffect(
    useCallback(() => {
      setIsFavLoading(true);
      fetchWithAuth(API.favorites.list, { method: "GET" })
        .then((r) => (r.ok ? r.json() : []))
        .then(setFavorites)
        .catch(() => {})
        .finally(() => setIsFavLoading(false));

      setIsHistLoading(true);
      fetchWithAuth(API.routes.history, { method: "GET" })
        .then((r) => (r.ok ? r.json() : []))
        .then((data: RouteHistory[]) => setHistory(data.slice(0, 20)))
        .catch(() => {})
        .finally(() => setIsHistLoading(false));

      // GPS 추적 시작
      let sub: Location.LocationSubscription | null = null;
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        // 초기 위치
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = pos.coords;
        currentLocRef.current = { lat: latitude, lng: longitude };
        miniMapRef.current?.injectJavaScript(
          `window.updateUserLocation(${latitude}, ${longitude}); true;`
        );

        // 실시간 추적
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 5 },
          (loc) => {
            const { latitude: lat, longitude: lng } = loc.coords;
            currentLocRef.current = { lat, lng };
            miniMapRef.current?.injectJavaScript(
              `window.updateUserLocation(${lat}, ${lng}); true;`
            );
          }
        );
      })();

      return () => {
        sub?.remove();
      };
    }, [])
  );

  // 지도 로드 완료 후 현재 위치로 이동
  useEffect(() => {
    if (!mapLoaded) return;
    const loc = currentLocRef.current;
    if (loc) {
      miniMapRef.current?.injectJavaScript(
        `window.updateUserLocation(${loc.lat}, ${loc.lng}); true;`
      );
    }
  }, [mapLoaded]);

  // 버스정류장 새로고침
  const handleRefreshStops = async () => {
    const loc = currentLocRef.current;
    if (!loc || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const url = `${API.busStops.nearby}?lat=${loc.lat}&lng=${loc.lng}&radiusM=${BUS_STOP_RADIUS}`;
      const res = await fetchWithAuth(url, { method: "GET" });
      if (!res.ok) return;
      const data: BusStop[] = await res.json();
      setBusStops(data);
      miniMapRef.current?.injectJavaScript(
        `window.showBusStops(${JSON.stringify(JSON.stringify(data))}); true;`
      );
    } catch {} finally {
      setIsRefreshing(false);
    }
  };

  // 목적지 선택 → MapDetail 이동
  const handleDestSelect = useCallback(
    (item: RouteHistory) => {
      setHistModalVisible(false);
      nav.navigate("MapDetail", {
        destinationName: item.destinationName,
        destinationLat: item.destinationLat,
        destinationLng: item.destinationLng,
      });
    },
    [nav]
  );

  const useHorizontalScroll = favorites.length > 5;
  const recentPreview = history.slice(0, 2);

  return (
    <View style={styles.container}>
      {/* Safety FAB */}
      <Pressable
        style={({ pressed }) => [styles.safetyFab, pressed && { opacity: 0.85 }]}
        onPress={() => nav.navigate("Safety")}
      >
        <Ionicons name="shield-checkmark" size={22} color="#fff" />
      </Pressable>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="search" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>Explore Paths</Text>
        </View>
        <Pressable onPress={() => nav.navigate("MapDetail")}>
          <Ionicons name="map-outline" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <View style={styles.inputWrap}>
          <Ionicons
            name="location-outline"
            size={18}
            color={Colors.textSecondary}
            style={{ position: "absolute", left: 20, top: 22, zIndex: 1 }}
          />
          <TextInput
            style={styles.input}
            placeholder="어디로 갈까요?"
            placeholderTextColor="rgba(93,96,92,0.5)"
          />
          <Pressable style={{ position: "absolute", right: 20, top: 20 }}>
            <Ionicons name="mic-outline" size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* 즐겨찾기 칩 */}
        {isFavLoading && <ActivityIndicator color={Colors.primary} />}

        {!isFavLoading && favorites.length === 0 && (
          <View style={styles.chips}>
            <Pressable style={styles.chipAdd} onPress={() => nav.navigate("Saved" as any)}>
              <Ionicons name="add" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {!isFavLoading && favorites.length > 0 && (
          useHorizontalScroll ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {favorites.map((fav, idx) => {
                const preset = getPreset(idx);
                return (
                  <Pressable key={fav.id} style={styles.chip} onPress={() => nav.navigate("MapDetail", { destinationName: fav.address, destinationLat: fav.lat, destinationLng: fav.lng })}>
                    <Ionicons name={preset.icon} size={14} color={preset.iconColor} />
                    <Text style={styles.chipText}>{fav.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable style={styles.chipAdd} onPress={() => nav.navigate("Saved" as any)}>
                <Ionicons name="add" size={18} color={Colors.textSecondary} />
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.chips}>
              {favorites.map((fav, idx) => {
                const preset = getPreset(idx);
                return (
                  <Pressable key={fav.id} style={styles.chip} onPress={() => nav.navigate("MapDetail", { destinationName: fav.address, destinationLat: fav.lat, destinationLng: fav.lng })}>
                    <Ionicons name={preset.icon} size={14} color={preset.iconColor} />
                    <Text style={styles.chipText}>{fav.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable style={styles.chipAdd} onPress={() => nav.navigate("Saved" as any)}>
                <Ionicons name="add" size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
          )
        )}

        {/* 최근 검색 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 검색</Text>
            {history.length > 2 && (
              <Pressable onPress={() => setHistModalVisible(true)}>
                <Text style={styles.sectionAction}>더보기</Text>
              </Pressable>
            )}
          </View>

          {isHistLoading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />}
          {!isHistLoading && recentPreview.length === 0 && (
            <Text style={styles.emptyText}>최근 탐색한 경로가 없습니다</Text>
          )}
          {!isHistLoading && recentPreview.map((item) => (
            <Pressable key={item.id} style={styles.recentItem} onPress={() => handleDestSelect(item)}>
              <View style={styles.recentIcon}>
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentName} numberOfLines={1}>{item.destinationName}</Text>
                <Text style={styles.recentAddr} numberOfLines={1}>{item.originName} → {item.destinationName}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* 주변 정류장 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주변 정류장</Text>

          {/* 정사각형 카카오 지도 */}
          <View style={[styles.miniMapContainer, { width: MAP_SIZE, height: MAP_SIZE }]}>
            <WebView
              ref={miniMapRef}
              source={{ html: miniMapHtml }}
              style={{ flex: 1, borderRadius: 24 }}
              javaScriptEnabled
              domStorageEnabled
              onLoad={() => setMapLoaded(true)}
              scrollEnabled={false}
            />
            {/* 새로고침 버튼 */}
            <Pressable
              style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.8 }]}
              onPress={handleRefreshStops}
              disabled={isRefreshing}
            >
              {isRefreshing
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Ionicons name="refresh" size={18} color={Colors.primary} />
              }
            </Pressable>
          </View>

          {/* 버스정류장 목록 */}
          {busStops.length > 0 && busStops.map((stop) => (
            <View key={stop.stopId} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View>
                  <Text style={styles.stopId}>{stop.stopId}</Text>
                  <Text style={styles.stopName}>{stop.name}</Text>
                </View>
                <Ionicons name="bus-outline" size={20} color={Colors.textSecondary} />
              </View>
            </View>
          ))}

          {busStops.length === 0 && (
            <Text style={styles.emptyText}>새로고침 버튼을 눌러 주변 정류장을 확인하세요</Text>
          )}
        </View>
      </ScrollView>

      {/* 최근 검색 더보기 모달 */}
      <Modal
        visible={histModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setHistModalVisible(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalTitleRow}>
            <Text style={styles.modalTitle}>최근 검색 ({history.length})</Text>
            <Pressable onPress={() => setHistModalVisible(false)} hitSlop={12}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.histList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.histItem} activeOpacity={0.7} onPress={() => handleDestSelect(item)}>
                <View style={styles.histIcon}>
                  <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histDest} numberOfLines={1}>{item.destinationName}</Text>
                  <Text style={styles.histSub} numberOfLines={1}>{item.originName} → {item.destinationName}</Text>
                  <Text style={styles.histDate}>{formatCreatedAt(item.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 16,
    backgroundColor: Colors.overlay,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: { fontWeight: "700", fontSize: 18, color: Colors.primary, letterSpacing: -0.45 },

  content: { padding: 24, paddingBottom: 100, gap: 28 },
  inputWrap: { position: "relative" },
  input: {
    backgroundColor: Colors.bgInput, borderRadius: 16,
    paddingVertical: 20, paddingLeft: 50, paddingRight: 50,
    fontSize: 18, color: Colors.textPrimary,
  },

  chips: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chipsScroll: { flexDirection: "row", gap: 10, paddingRight: 4 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 10,
    backgroundColor: Colors.bgCard, borderRadius: 9999,
  },
  chipText: { fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },
  chipAdd: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center" },

  section: { gap: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.7 },
  sectionAction: { fontSize: 12, color: Colors.primary, fontWeight: "500" },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingVertical: 8 },

  recentItem: { flexDirection: "row", alignItems: "center", gap: 16, padding: 12, borderRadius: 20 },
  recentIcon: { width: 40, height: 40, backgroundColor: Colors.bgInput, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  recentName: { fontSize: 15, fontWeight: "500", color: Colors.textPrimary },
  recentAddr: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  // 미니 지도
  miniMapContainer: {
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  refreshBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  // 버스정류장 카드
  stopCard: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 16 },
  stopHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stopId: { fontSize: 11, fontWeight: "600", color: Colors.primary, textTransform: "uppercase", letterSpacing: 1.1 },
  stopName: { fontSize: 16, fontWeight: "500", color: Colors.textPrimary, marginTop: 2 },

  safetyFab: {
    position: "absolute", right: 24, bottom: 100,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: 40, maxHeight: "75%" },
  modalHandle: { width: 48, height: 4, backgroundColor: "#d1d5db", borderRadius: 2, alignSelf: "center", marginVertical: 14 },
  modalTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  histList: { gap: 4, paddingBottom: 8 },
  histItem: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  histIcon: { width: 40, height: 40, backgroundColor: Colors.bgInput, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  histDest: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  histSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  histDate: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
});
