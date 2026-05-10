import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import WebView from "react-native-webview";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import {
  formatRemainingTime,
  formatArrivalTime,
  formatDistance,
  searchRoute,
} from "../api/routeApi";
import type { RouteResponse, NavStep } from "../api/routeApi";

function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

// 두 좌표 간 거리 계산 (미터)
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 현재 위치에서 경로(폴리라인 좌표 배열)까지의 최단 거리
function distanceToRoute(
  lat: number,
  lng: number,
  coords: [number, number][],
): number {
  let min = Infinity;
  for (const [cLng, cLat] of coords) {
    const d = haversineMeters(lat, lng, cLat, cLng);
    if (d < min) min = d;
  }
  return min;
}

// 현재 위치와 가장 가까운 경로 포인트의 인덱스 반환 (경로 진행 표시용)
function findNearestIndex(
  lat: number,
  lng: number,
  coords: [number, number][],
): number {
  let minDist = Infinity;
  let nearestIdx = 0;
  for (let i = 0; i < coords.length; i++) {
    const [cLng, cLat] = coords[i];
    const d = haversineMeters(lat, lng, cLat, cLng);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  }
  return nearestIdx;
}

const DEVIATION_THRESHOLD_METERS = 40; // 경로에서 40m 이상 벗어나면 이탈로 판단
const REROUTE_COOLDOWN_MS = 15000; // 재탐색 후 15초 이내 중복 실행 방지

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY!;
const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_KEY!;

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
    map.setDraggable(true);
    map.setZoomable(true);
    var currentMarker = null;
    var destMarker = null;

    window.showDestination = function(lat, lng) {
      var pos = new kakao.maps.LatLng(lat, lng);
      if (destMarker) destMarker.setMap(null);
      destMarker = new kakao.maps.Marker({ map: map, position: pos });
      map.setCenter(pos);
      map.setLevel(3);
    };

    var routePolyline = null;
    window.clearRoute = function() {
      if (routePolyline) { routePolyline.setMap(null); routePolyline = null; }
      if (destMarker) { destMarker.setMap(null); destMarker = null; }
      if (firstSignalOverlay) { firstSignalOverlay.setMap(null); firstSignalOverlay = null; }
      signalOverlays.forEach(function(o) { o.setMap(null); });
      signalOverlays = [];
    };
    window.drawRoute = function(coordsJson) {
      var coords = JSON.parse(coordsJson);
      var path = coords.map(function(c) { return new kakao.maps.LatLng(c[1], c[0]); });
      if (routePolyline) routePolyline.setMap(null);
      routePolyline = new kakao.maps.Polyline({
        path: path,
        strokeWeight: 5,
        strokeColor: '#516452',
        strokeOpacity: 0.85,
        strokeStyle: 'solid'
      });
      routePolyline.setMap(map);
      var bounds = new kakao.maps.LatLngBounds();
      path.forEach(function(p) { bounds.extend(p); });
      // 바텀시트가 맵 하단을 가리므로 relayout 후 여백을 주어 전체 경로가 보이도록
      map.relayout();
      setTimeout(function() {
        map.setBounds(bounds, 60, 60, 340, 60);
      }, 100);
    };

    var signalOverlays = [];
    var firstSignalOverlay = null;

    function makeSignalContent(color) {
      return '<div style="background:' + color + ';width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>';
    }

    window.setFirstSignal = function(lat, lng, color) {
      if (firstSignalOverlay) firstSignalOverlay.setMap(null);
      var pos = new kakao.maps.LatLng(lat, lng);
      firstSignalOverlay = new kakao.maps.CustomOverlay({ position: pos, content: makeSignalContent(color), yAnchor: 1 });
      firstSignalOverlay.setMap(map);
    };

    window.updateFirstSignal = function(color) {
      if (!firstSignalOverlay) return;
      firstSignalOverlay.setContent(makeSignalContent(color));
    };

    window.showSignalMarkers = function(signalsJson) {
      signalOverlays.forEach(function(o) { o.setMap(null); });
      signalOverlays = [];
      var signals = JSON.parse(signalsJson);
      signals.forEach(function(s) {
        var pos = new kakao.maps.LatLng(s.lat, s.lng);
        var color = s.state === 'GREEN' ? '#22c55e' : '#ef4444';
        var overlay = new kakao.maps.CustomOverlay({ position: pos, content: makeSignalContent(color), yAnchor: 1 });
        overlay.setMap(map);
        signalOverlays.push(overlay);
      });
    };
</script>
</body>
</html>
`;

const { width, height } = Dimensions.get("window");

type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: string;
  lng: string;
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<NativeStackScreenProps<RootStackParamList, 'MapDetail'>['route']>();
  const incomingDest = (route.params as RootStackParamList['MapDetail']) ?? undefined;
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const webviewRef = useRef<WebView>(null);
  const [initialLocation, setInitialLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [searchVisible, setSearchVisible] = useState(false);
  const [activeField, setActiveField] = useState<"origin" | "dest">("dest");
  const [originQuery, setOriginQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [origin, setOrigin] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [destination, setDestination] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedOrigin, setSelectedOrigin] = useState<PlaceResult | null>(
    null,
  );
  const [selectedDest, setSelectedDest] = useState<PlaceResult | null>(null);
  const [routeSteps, setRouteSteps] = useState<NavStep[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isRerouting, setIsRerouting] = useState(false);
  const lastRerouteRef = useRef<number>(0);
  const destinationRef = useRef<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);
  const lastNearestIdxRef = useRef<number>(0); // 경로 진행 표시 — 뒤로 가는 업데이트 방지

  const SIGNAL_CYCLE = 15;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      setInitialLocation(pos.coords);
    })();
  }, []);

  // SavedScreen 등에서 목적지 파라미터를 받은 경우 → 검색 모달 열고 목적지 자동 입력
  useEffect(() => {
    if (!incomingDest?.destinationName || !incomingDest?.destinationLat || !incomingDest?.destinationLng) return;

    setDestQuery(incomingDest.destinationName);
    setSelectedDest({
      id:      'preset',
      name:    incomingDest.destinationName,
      address: incomingDest.destinationName,
      lat:     String(incomingDest.destinationLat),
      lng:     String(incomingDest.destinationLng),
    });
    setActiveField('dest');
    setSearchVisible(true);

    // 지도에 목적지 마커 표시
    webviewRef.current?.injectJavaScript(
      `window.showDestination(${incomingDest.destinationLat}, ${incomingDest.destinationLng}); true;`
    );
  }, [incomingDest]);

  // 지도 로드 완료 + 위치 확보 시 내 위치로 이동
  useEffect(() => {
    if (!mapLoaded || !initialLocation) return;
    const { latitude, longitude } = initialLocation;
    webviewRef.current?.injectJavaScript(`
      (function() {
        var pos = new kakao.maps.LatLng(${latitude}, ${longitude});
        map.setCenter(pos);
        map.setLevel(3);
        if (currentMarker) currentMarker.setMap(null);
        currentMarker = new kakao.maps.Marker({ map: map, position: pos });
      })();
      true;
    `);
  }, [mapLoaded, initialLocation]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (routeData) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [routeData]);

  const firstSignal = routeData?.signalCheckpoints[0] ?? null;
  const firstStartsRed = firstSignal?.signalState === "RED";
  const phase = Math.floor(elapsed / SIGNAL_CYCLE) % 2;
  const isCurrentlyRed = firstStartsRed ? phase === 0 : phase === 1;
  const signalCountdown = SIGNAL_CYCLE - (elapsed % SIGNAL_CYCLE);

  useEffect(() => {
    if (!firstSignal) return;
    const color = isCurrentlyRed ? "#ef4444" : "#22c55e";
    webviewRef.current?.injectJavaScript(
      `window.updateFirstSignal(${JSON.stringify(color)}); true;`,
    );
  }, [phase]);

  // destination 상태를 ref로 동기화 (subscription 콜백 내 stale closure 방지)
  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);

  // 경로 이탈 감지 — isNavigating 중에만 실행
  useEffect(() => {
    if (!isNavigating || routeCoords.length === 0) return;

    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10 },
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          // ── 현재 위치 마커 실시간 이동 ──────────────────────────────────
          webviewRef.current?.injectJavaScript(`
            (function() {
              var pos = new kakao.maps.LatLng(${latitude}, ${longitude});
              if (currentMarker) {
                currentMarker.setPosition(pos);
              } else {
                currentMarker = new kakao.maps.Marker({ map: map, position: pos });
              }
            })(); true;
          `);

          // ── 경로 진행 표시 ──────────────────────────────────────────────
          const nearestIdx = findNearestIndex(latitude, longitude, routeCoords);
          if (nearestIdx > lastNearestIdxRef.current) {
            lastNearestIdxRef.current = nearestIdx;
            const remaining = routeCoords.slice(nearestIdx);
            if (remaining.length > 1) {
              webviewRef.current?.injectJavaScript(
                `window.drawRoute(${JSON.stringify(JSON.stringify(remaining))}); true;`,
              );
            }
          }

          // ── 이탈 감지 ───────────────────────────────────────────────────
          const dist = distanceToRoute(latitude, longitude, routeCoords);
          const now = Date.now();

          if (
            dist > DEVIATION_THRESHOLD_METERS &&
            !isRerouting &&
            now - lastRerouteRef.current > REROUTE_COOLDOWN_MS
          ) {
            const dest = destinationRef.current;
            if (!dest) return;

            setIsRerouting(true);
            lastRerouteRef.current = now;

            try {
              const newRoute = await searchRoute({
                origin: { lat: latitude, lng: longitude },
                destination: { lat: dest.lat, lng: dest.lng },
                originName: "현재 위치",
                destinationName: dest.name,
              });
              applyRoute(newRoute);
              Alert.alert(
                "경로 재탐색",
                "경로를 이탈하여 새로운 경로로 안내합니다.",
              );
            } catch {
              // 재탐색 실패 시 조용히 유지
            } finally {
              setIsRerouting(false);
            }
          }
        },
      );
    })();

    return () => {
      sub?.remove();
    };
  }, [isNavigating, routeCoords]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (text: string, field: "origin" | "dest") => {
    setActiveField(field);
    if (field === "origin") {
      setOriginQuery(text);
      setSelectedOrigin(null);
    } else {
      setDestQuery(text);
      setSelectedDest(null);
    }
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(text)}&size=8`,
          { headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` } },
        );
        const json = await res.json();
        setSearchResults(
          (json.documents ?? []).map((p: any) => ({
            id: p.id,
            name: p.place_name,
            address: p.road_address_name || p.address_name,
            lat: p.y,
            lng: p.x,
          })),
        );
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleSelectResult = (item: PlaceResult) => {
    if (activeField === "origin") {
      setSelectedOrigin(item);
      setOriginQuery(item.name);
    } else {
      setSelectedDest(item);
      setDestQuery(item.name);
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lng);
      webviewRef.current?.injectJavaScript(
        `window.showDestination(${lat}, ${lng}); true;`,
      );
    }
    setSearchResults([]);
  };

  const closeSearchModal = () => {
    setSearchVisible(false);
    setSelectedOrigin(null);
    setSelectedDest(null);
    setOriginQuery("");
    setDestQuery("");
    setSearchResults([]);
    setActiveField("dest");
  };

  const applyRoute = (route: RouteResponse) => {
    const coordinates = decodePolyline(route.polyline);
    setRouteData(route);
    setRouteCoords(coordinates); // 이탈 감지를 위해 저장
    lastNearestIdxRef.current = 0; // 새 경로 시작 시 진행 인덱스 초기화
    setRouteSteps([]);
    setSheetExpanded(true);
    webviewRef.current?.injectJavaScript(
      `window.drawRoute(${JSON.stringify(JSON.stringify(coordinates))}); true;`,
    );
    if (route.signalCheckpoints.length > 0) {
      const first = route.signalCheckpoints[0];
      const rest = route.signalCheckpoints.slice(1);
      const firstColor = first.signalState === "RED" ? "#ef4444" : "#22c55e";
      webviewRef.current?.injectJavaScript(
        `window.setFirstSignal(${first.lat}, ${first.lng}, ${JSON.stringify(firstColor)}); true;`,
      );
      if (rest.length > 0) {
        const others = rest.map((c) => ({
          lat: c.lat,
          lng: c.lng,
          state: c.signalState,
        }));
        webviewRef.current?.injectJavaScript(
          `window.showSignalMarkers(${JSON.stringify(JSON.stringify(others))}); true;`,
        );
      }
    }
  };

  const handleConfirmDestination = async () => {
    if (!selectedDest) return;
    const destLat = parseFloat(selectedDest.lat);
    const destLng = parseFloat(selectedDest.lng);
    const originLat = selectedOrigin
      ? parseFloat(selectedOrigin.lat)
      : initialLocation?.latitude;
    const originLng = selectedOrigin
      ? parseFloat(selectedOrigin.lng)
      : initialLocation?.longitude;
    const originName = selectedOrigin?.name ?? "현재 위치";
    if (!originLat || !originLng) return;
    setDestination({ name: selectedDest.name, lat: destLat, lng: destLng });
    setOrigin(
      selectedOrigin
        ? { name: originName, lat: originLat, lng: originLng }
        : null,
    );
    closeSearchModal();
    setIsLoadingRoute(true);
    try {
      const route = await searchRoute({
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        originName,
        destinationName: selectedDest.name,
      });
      applyRoute(route);
    } catch (e: any) {
      Alert.alert("경로 탐색 실패", e.message ?? String(e));
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const moveToCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = pos.coords;
    webviewRef.current?.injectJavaScript(`
      (function() {
        var pos = new kakao.maps.LatLng(${latitude}, ${longitude});
        map.setCenter(pos);
        if (currentMarker) currentMarker.setMap(null);
        currentMarker = new kakao.maps.Marker({ map: map, position: pos });
      })();
      true;
    `);
  };

  const fetchRoute = async () => {
    if (!destination) return;
    const originLat = origin ? origin.lat : initialLocation?.latitude;
    const originLng = origin ? origin.lng : initialLocation?.longitude;
    const originName = origin?.name ?? "현재 위치";
    if (!originLat || !originLng) return;
    setIsLoadingRoute(true);
    try {
      const route = await searchRoute({
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destination.lat, lng: destination.lng },
        originName,
        destinationName: destination.name,
      });
      applyRoute(route);
    } catch (e: any) {
      Alert.alert("경로 탐색 실패", e.message ?? String(e));
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
          onLoad={() => setMapLoaded(true)}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBg} onPress={() => nav.goBack()}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Explore Paths</Text>
      </View>

      {/* 경로 탐색 버튼 + FABs (탐색 전) */}
      {!routeData && (
        <View style={[styles.bottomCol, { bottom: 80 + insets.bottom + 16 }]}>
          {destination && (
            <Pressable
              style={styles.destChip}
              onPress={() => setSearchVisible(true)}
            >
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.destChipText} numberOfLines={1}>
                {destination.name}
              </Text>
              <Ionicons name="pencil" size={12} color={Colors.textSecondary} />
            </Pressable>
          )}
          <View style={styles.bottomRow}>
            <Pressable style={styles.fab} onPress={moveToCurrentLocation}>
              <Ionicons name="locate" size={20} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.searchBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={destination ? fetchRoute : () => setSearchVisible(true)}
              disabled={isLoadingRoute}
            >
              <Ionicons name="navigate-outline" size={18} color="#fff" />
              <Text style={styles.searchBtnText}>
                {isLoadingRoute
                  ? "탐색 중..."
                  : destination
                    ? "경로 탐색"
                    : "목적지 설정"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.safetyFab}
              onPress={() => nav.navigate("Safety", undefined)}
            >
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      {/* 목적지 검색 모달 */}
      <Modal
        visible={searchVisible}
        animationType="slide"
        transparent
        onRequestClose={closeSearchModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>경로 탐색</Text>
              <Pressable onPress={closeSearchModal} hitSlop={12}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* 출발지 */}
            <View style={styles.inputRow}>
              <View style={styles.dotOrigin} />
              <View
                style={[
                  styles.inputBox,
                  activeField === "origin" && styles.inputBoxActive,
                ]}
              >
                <TextInput
                  style={styles.inputText}
                  placeholder="현재 위치"
                  placeholderTextColor={Colors.textSecondary}
                  value={originQuery}
                  onFocus={() => setActiveField("origin")}
                  onChangeText={(t) => handleSearchInput(t, "origin")}
                  returnKeyType="search"
                />
                {originQuery.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setOriginQuery("");
                      setSelectedOrigin(null);
                      setSearchResults([]);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={Colors.textSecondary}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.inputDivider} />

            {/* 목적지 */}
            <View style={styles.inputRow}>
              <View style={styles.dotDest} />
              <View
                style={[
                  styles.inputBox,
                  activeField === "dest" && styles.inputBoxActive,
                ]}
              >
                <TextInput
                  style={styles.inputText}
                  placeholder="목적지를 검색하세요"
                  placeholderTextColor={Colors.textSecondary}
                  value={destQuery}
                  onFocus={() => setActiveField("dest")}
                  onChangeText={(t) => handleSearchInput(t, "dest")}
                  autoFocus
                  returnKeyType="search"
                />
                {destQuery.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setDestQuery("");
                      setSelectedDest(null);
                      setSearchResults([]);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={Colors.textSecondary}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            {/* 검색 결과 */}
            {isSearching && (
              <ActivityIndicator
                style={{ marginTop: 24 }}
                color={Colors.primary}
              />
            )}
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              style={styles.resultList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected =
                  activeField === "origin"
                    ? selectedOrigin?.id === item.id
                    : selectedDest?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.resultItem,
                      isSelected && styles.resultItemSelected,
                    ]}
                    onPress={() => handleSelectResult(item)}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={isSelected ? Colors.primary : Colors.textSecondary}
                      style={{ marginTop: 2 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.resultName,
                          isSelected && { color: Colors.primary },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.resultAddress}>{item.address}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <Pressable
              style={[
                styles.modalConfirmBtn,
                !selectedDest && styles.modalConfirmBtnDisabled,
              ]}
              onPress={handleConfirmDestination}
              disabled={!selectedDest}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.modalConfirmText}>경로 탐색</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 경로 안내 중 플로팅 카드 */}
      {isNavigating && routeData && (
        <View
          style={[
            styles.navFloatCard,
            { bottom: insets.bottom + tabBarHeight + 16 },
          ]}
        >
          <View style={styles.navFloatLeft}>
            <Ionicons
              name={isRerouting ? "refresh" : "navigate"}
              size={18}
              color={isRerouting ? Colors.brown : Colors.primary}
            />
            <View>
              <Text style={styles.navFloatDest} numberOfLines={1}>
                {isRerouting ? "경로 재탐색 중..." : destination?.name}
              </Text>
              <Text style={styles.navFloatInfo}>
                {formatDistance(routeData.totalDistanceMeters)} ·{" "}
                {formatRemainingTime(routeData.totalTimeSeconds).value}
                {formatRemainingTime(routeData.totalTimeSeconds).unit}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              webviewRef.current?.injectJavaScript(
                `window.clearRoute(); true;`,
              );
              setIsNavigating(false);
              setRouteData(null);
              setRouteCoords([]);
              setDestination(null);
              setOrigin(null);
              Alert.alert("경로 안내 종료", "경로 탐색이 종료되었습니다.");
            }}
          >
            <Ionicons
              name="close-circle"
              size={26}
              color={Colors.textSecondary}
            />
          </Pressable>
        </View>
      )}

      {/* Bottom Sheet (탐색 후) */}
      {!isNavigating &&
        routeData &&
        (() => {
          const time = formatRemainingTime(routeData.totalTimeSeconds);
          const distanceStr = formatDistance(routeData.totalDistanceMeters);
          const distText = "전방";
          const signalMsg = isCurrentlyRed
            ? `빠르게 걸으면 초록불에 통과할 수 있어요`
            : `지금 출발하면 신호에 걸리지 않아요`;
          return (
            <View
              style={[
                styles.sheet,
                !sheetExpanded && { transform: [{ translateY: 260 }] },
                { paddingBottom: 32 + insets.bottom + tabBarHeight },
              ]}
            >
              <Pressable
                style={styles.sheetHandle}
                onPress={() => setSheetExpanded(!sheetExpanded)}
              />
              <View style={styles.navSummary}>
                <View>
                  <Text style={styles.timeLabel}>남은 도착 시간</Text>
                  <Text style={styles.timeValue}>
                    {time.value}{" "}
                    <Text style={styles.timeUnit}>{time.unit}</Text>
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>최적의 경로</Text>
                  </View>
                  <Text style={styles.arrivalText}>
                    {formatArrivalTime(routeData.totalTimeSeconds)}
                  </Text>
                </View>
              </View>

              {/* 신호등 카드 */}
              {firstSignal && (
                <View
                  style={[
                    styles.signalCard,
                    { borderColor: isCurrentlyRed ? "#ef4444" : "#22c55e" },
                  ]}
                >
                  <View
                    style={[
                      styles.signalDot,
                      {
                        backgroundColor: isCurrentlyRed ? "#ef4444" : "#22c55e",
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.signalTitle}>
                      {isCurrentlyRed ? "🔴 빨간불" : "🟢 초록불"}
                      {"  "}
                      <Text style={styles.signalCountdown}>
                        {distText} · {signalCountdown}초 후 전환
                      </Text>
                    </Text>
                    <Text style={styles.signalPace}>{signalMsg}</Text>
                  </View>
                </View>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <Ionicons name="flash" size={14} color={Colors.primary} />
                    <Text style={styles.statLabel}>권장 속도</Text>
                  </View>
                  <Text style={styles.statValue}>4.8 km/h로{"\n"}걸으세요</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statHeader}>
                    <Ionicons
                      name="map-outline"
                      size={14}
                      color={Colors.primary}
                    />
                    <Text style={styles.statLabel}>총 거리</Text>
                  </View>
                  <Text style={styles.statValue}>{distanceStr}</Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.endBtn,
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => {
                  setIsNavigating(true);
                  const originLat = origin?.lat ?? initialLocation?.latitude;
                  const originLng = origin?.lng ?? initialLocation?.longitude;
                  if (originLat && originLng) {
                    // 레이아웃 변경(바텀시트 사라짐) 후 지도가 터치 영역을 재계산하도록
                    // relayout() + 드래그/줌 명시 활성화
                    setTimeout(() => {
                      webviewRef.current?.injectJavaScript(`
                        (function() {
                          var pos = new kakao.maps.LatLng(${originLat}, ${originLng});
                          map.setCenter(pos);
                          map.setLevel(2);
                          map.relayout();
                          map.setDraggable(true);
                          map.setZoomable(true);
                        })();
                        true;
                      `);
                    }, 150);
                  }
                }}
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
  container: { flex: 1, backgroundColor: "#e2dfd6" },
  mapBg: { flex: 1, position: "relative" },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  fab: {
    width: 48,
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  safetyFab: {
    width: 56,
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: Colors.overlay,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBg: {
    width: 40,
    height: 40,
    backgroundColor: Colors.bgInput,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: Colors.primary,
    letterSpacing: -0.45,
  },

  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "rgba(250,249,246,0.95)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 25,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHandle: {
    width: 48,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    alignSelf: "center",
    marginVertical: 16,
  },

  navSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  timeLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  timeValue: { fontSize: 40, fontWeight: "700", color: Colors.textPrimary },
  timeUnit: { fontSize: 20, fontWeight: "500" },
  badge: {
    backgroundColor: "rgba(81,100,82,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  arrivalText: { fontSize: 14, color: Colors.textSecondary },

  statsRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 20,
  },
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  statValue: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.textPrimary,
    lineHeight: 22,
  },

  endBtn: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 16,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  endBtnText: { fontSize: 16, fontWeight: "500", color: "#fff" },

  bottomCol: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    zIndex: 10,
    alignItems: "center",
    gap: 10,
  },
  destChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: "80%",
  },
  destChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHandle: {
    width: 48,
    height: 4,
    backgroundColor: "#d1d5db",
    borderRadius: 2,
    alignSelf: "center",
    marginVertical: 14,
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },

  navFloatCard: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  navFloatLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  navFloatDest: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    maxWidth: 220,
  },
  navFloatInfo: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  dotOrigin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  dotDest: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },
  inputBox: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  inputBoxActive: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: "#fff",
  },
  inputText: { flex: 1, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  inputDivider: {
    width: 1,
    height: 10,
    backgroundColor: "#d1d5db",
    marginLeft: 4,
    marginBottom: 4,
  },

  resultList: { marginTop: 12 },
  resultItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  resultName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  resultAddress: { fontSize: 12, color: Colors.textSecondary },
  resultItemSelected: {
    backgroundColor: "rgba(81,100,82,0.06)",
    borderRadius: 12,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },

  modalConfirmBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  modalConfirmBtnDisabled: { backgroundColor: "#d1d5db" },
  modalConfirmText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  searchBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  signalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  signalDot: { width: 12, height: 12, borderRadius: 6 },
  signalTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  signalCountdown: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  signalPace: { fontSize: 12, color: Colors.textSecondary },
});
