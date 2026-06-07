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
import { navStatusStore } from "../utils/navStatus";
import { fetchWithAuth } from "../api/fetchWithAuth";
import { API } from "../api/config";
import { getProfile } from "../api/profileApi";

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
    coords.push([lng / 1e6, lat / 1e6]);
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
const REROUTE_COOLDOWN_MS = 15000;     // 재탐색 후 15초 이내 중복 실행 방지
const SIGNAL_CYCLE = 15;               // 신호 주기(초) — isRedAtTime과 phase 계산에 공유
const SPEED_BOOST_MPS = 1.0 / 3.6;    // 신호 통과 가능 여부 계산 시 추가 속도(1.0 km/h → m/s)
const DEFAULT_SPEED_MPS = 4800 / 3600; // 프로필 로드 실패 시 기본 보행 속도(4.8 km/h)

// T초 후 신호 상태 예측 (true = 빨간불)
function isRedAtTime(T: number, currentlyRed: boolean, countdown: number): boolean {
  if (T <= countdown) return currentlyRed;
  const timeAfter = T - countdown;
  // countdown 이후 SIGNAL_CYCLE초마다 색상 전환
  const flipped = Math.floor(timeAfter / SIGNAL_CYCLE) % 2 === 0;
  return flipped ? !currentlyRed : currentlyRed;
}

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
    window.drawRoute = function(coordsJson, fitBounds) {
      try {
        var coords = JSON.parse(coordsJson);
        if (!coords || coords.length < 2) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'warn', msg: 'drawRoute: coords empty or too short, len=' + (coords ? coords.length : 0) })
          );
          return;
        }
        var path = coords.map(function(c) { return new kakao.maps.LatLng(c[1], c[0]); });
        if (routePolyline) routePolyline.setMap(null);
        routePolyline = new kakao.maps.Polyline({
          path: path,
          strokeWeight: 6,
          strokeColor: '#516452',
          strokeOpacity: 0.95,
          strokeStyle: 'solid'
        });
        routePolyline.setMap(map);
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'drawRoute', points: path.length, fitBounds: fitBounds })
        );
        // fitBounds !== false 일 때만 전체 경로가 보이도록 뷰 이동
        if (fitBounds !== false) {
          var bounds = new kakao.maps.LatLngBounds();
          path.forEach(function(p) { bounds.extend(p); });
          // relayout은 setBounds 직전에만 실행 (폴리라인 렌더 방해 방지)
          setTimeout(function() {
            map.relayout();
            setTimeout(function() {
              map.setBounds(bounds, 80, 40, 260, 40);
            }, 150);
          }, 100);
        }
      } catch(e) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'error', msg: 'drawRoute exception: ' + String(e) })
        );
      }
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
  const [hasEnteredRoute, setHasEnteredRoute] = useState(false);
  const lastRerouteRef = useRef<number>(0);
  const destinationRef = useRef<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);
  const lastNearestIdxRef = useRef<number>(0); // 경로 진행 표시 — 뒤로 가는 업데이트 방지
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // ── 경로 이탈 상태 머신 ────────────────────────────────────────────────
  // hasEnteredRouteRef : 현재 경로 세션에서 한 번이라도 폴리라인 안에 들어왔는지
  // isOnRouteRef       : 직전 GPS 업데이트에서 폴리라인 안이었는지 (전환 감지용)
  // pendingEntryRef    : Alert 표시 후 경로 재진입 대기 중 (재진입 전까지 Alert 억제)
  const hasEnteredRouteRef = useRef<boolean>(false);
  const isOnRouteRef = useRef<boolean>(false);
  const pendingEntryRef = useRef<boolean>(false);

  // ── 속도 업데이트용 누적 데이터 ─────────────────────────────────────────
  const navStartTimeRef   = useRef<number>(0);
  const navTotalDistRef   = useRef<number>(0);
  const navLastGpsPosRef  = useRef<{ lat: number; lng: number } | null>(null);

  // ── 사용자 평균 보행 속도 (프로필 API, 실패 시 기본값 4.8 km/h) ──────────
  const [avgSpeedMps, setAvgSpeedMps] = useState<number>(DEFAULT_SPEED_MPS);
  useEffect(() => {
    getProfile()
      .then((p) => setAvgSpeedMps(p.avgSpeedMps))
      .catch(() => {}); // 실패 시 DEFAULT_SPEED_MPS 유지
  }, []);

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

  // ── 신호 통과 가능 여부 동적 계산 ────────────────────────────────────────
  const signalPaceMsg = React.useMemo(() => {
    if (!firstSignal) return null;

    // 사용자가 폴리라인 위(10m 이내)일 때만 계산
    const onPolyline =
      userLocation !== null &&
      routeCoords.length > 0 &&
      distanceToRoute(userLocation.lat, userLocation.lng, routeCoords) <= 10;

    if (!onPolyline || !userLocation) {
      // 폴리라인 밖이거나 위치 미확인 → 기본 메시지
      return isCurrentlyRed
        ? '빠르게 걸으면 초록불에 통과할 수 있어요'
        : '지금 출발하면 신호에 걸리지 않아요';
    }

    const dist = haversineMeters(userLocation.lat, userLocation.lng, firstSignal.lat, firstSignal.lng);
    const etaNormal = dist / avgSpeedMps;                    // 사용자 실제 속도 기준
    const etaFast   = dist / (avgSpeedMps + SPEED_BOOST_MPS); // +1.0 km/h 기준

    const redAtNormal = isRedAtTime(etaNormal, isCurrentlyRed, signalCountdown);
    const redAtFast   = isRedAtTime(etaFast,   isCurrentlyRed, signalCountdown);

    if (!redAtNormal) {
      return `현재 속도(${(avgSpeedMps * 3.6).toFixed(1)} km/h)로 걸으면 신호를 통과할 수 있어요`;
    } else if (!redAtFast) {
      return `${(SPEED_BOOST_MPS * 3.6).toFixed(1)} km/h 속도를 높이면 신호를 통과할 수 있어요`;
    } else {
      return '이번 신호 통과가 어려워요. 잠시 기다리세요';
    }
  }, [firstSignal, userLocation, isCurrentlyRed, signalCountdown, routeCoords, avgSpeedMps]);

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

  // isRerouting → navStatus 동기화
  useEffect(() => {
    if (!isNavigating) return;
    if (isRerouting) {
      navStatusStore.set('rerouting');
    } else {
      navStatusStore.set(hasEnteredRoute ? 'navigating' : 'measuring');
    }
  }, [isRerouting, isNavigating, hasEnteredRoute]);

  // 경로 이탈 감지 — isNavigating 중에만 실행
  useEffect(() => {
    if (!isNavigating || routeCoords.length === 0) return;

    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,    // 최소 1초마다 업데이트
          distanceInterval: 1,   // 최소 1m 이동 시 업데이트
        },
        async (pos) => {
          const { latitude, longitude } = pos.coords;

          // React state 업데이트 (신호 메시지 계산용)
          setUserLocation({ lat: latitude, lng: longitude });

          // 이동 거리 누적 (속도 업데이트용)
          if (navLastGpsPosRef.current) {
            const d = haversineMeters(
              navLastGpsPosRef.current.lat, navLastGpsPosRef.current.lng,
              latitude, longitude,
            );
            navTotalDistRef.current += d;
          }
          navLastGpsPosRef.current = { lat: latitude, lng: longitude };

          // ── 현재 위치 마커 실시간 이동 ──────────────────────────────────
          webviewRef.current?.injectJavaScript(`
            (function() {
              var latlng = new kakao.maps.LatLng(${latitude}, ${longitude});
              if (currentMarker) {
                currentMarker.setPosition(latlng);
              } else {
                currentMarker = new kakao.maps.Marker({ map: map, position: latlng });
              }
            })(); true;
          `);

          // ── 경로 진행 표시 (applyRoute와 동일한 직접 inject 방식) ────────
          const nearestIdx = findNearestIndex(latitude, longitude, routeCoords);
          if (nearestIdx > lastNearestIdxRef.current) {
            lastNearestIdxRef.current = nearestIdx;
            const remaining = routeCoords.slice(nearestIdx);
            if (remaining.length > 1) {
              webviewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    var coords = ${JSON.stringify(remaining)};
                    var path = coords.map(function(c) { return new kakao.maps.LatLng(c[1], c[0]); });
                    if (routePolyline) { routePolyline.setMap(null); routePolyline = null; }
                    routePolyline = new kakao.maps.Polyline({
                      path: path,
                      strokeWeight: 6,
                      strokeColor: '#516452',
                      strokeOpacity: 0.95,
                      strokeStyle: 'solid'
                    });
                    routePolyline.setMap(map);
                  } catch(e) {}
                })(); true;
              `);
            }
          }

          // ── 이탈 감지 상태 머신 ─────────────────────────────────────────
          const dist = distanceToRoute(latitude, longitude, routeCoords);
          const now = Date.now();
          const onRoute = dist <= DEVIATION_THRESHOLD_METERS;

          if (onRoute) {
            // ── 경로 안 ──────────────────────────────────────────────────
            if (!isOnRouteRef.current) {
              // 경로에 (재)진입: 진입 대기 해제 + 진입 여부 기록
              if (!hasEnteredRouteRef.current) {
                hasEnteredRouteRef.current = true;
                setHasEnteredRoute(true);
                navStatusStore.set('navigating');
              }
              pendingEntryRef.current = false;
            }
            isOnRouteRef.current = true;
          } else {
            // ── 경로 밖 ──────────────────────────────────────────────────
            // pendingEntry 상태(Alert 후 재진입 대기)이면 Alert 억제
            // isRerouting 중이거나 쿨다운 중이어도 억제
            const canAlert =
              !pendingEntryRef.current &&
              !isRerouting &&
              now - lastRerouteRef.current > REROUTE_COOLDOWN_MS;

            if (canAlert) {
              // Alert 조건:
              //   1) 경로에 있다가 이탈 (isOnRoute: true → false 전환)
              //   2) 내비 시작 후 한 번도 경로에 진입하지 못함 (초기 위치 이탈)
              const shouldAlert =
                isOnRouteRef.current || !hasEnteredRouteRef.current;

              if (shouldAlert) {
                const dest = destinationRef.current;
                if (dest) {
                  pendingEntryRef.current = true; // 재진입 전까지 Alert 억제
                  lastRerouteRef.current = now;

                  Alert.alert(
                    "경로 이탈",
                    "경로를 이탈하였습니다.\n현재 내 위치로 다시 경로를 재탐색할까요?",
                    [
                      {
                        text: "아니오",
                        style: "cancel",
                        // pendingEntryRef = true 유지 → 경로 재진입 전까지 Alert 없음
                      },
                      {
                        text: "예",
                        onPress: async () => {
                          setIsRerouting(true);
                          try {
                            const newRoute = await searchRoute({
                              origin: { lat: latitude, lng: longitude },
                              destination: { lat: dest.lat, lng: dest.lng },
                              originName: "현재 위치",
                              destinationName: dest.name,
                            });
                            // applyRoute 내부에서 상태 머신 refs 초기화
                            applyRoute(newRoute, false);
                          } catch {
                            // 재탐색 실패 시 조용히 기존 경로 유지
                          } finally {
                            setIsRerouting(false);
                          }
                        },
                      },
                    ],
                  );
                }
              }
            }

            isOnRouteRef.current = false;
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

  // fitBounds: 경로 탐색 완료 시 전체 경로가 보이도록 뷰 이동 여부
  // 안내 중 재탐색(이탈 후 재탐색)에는 false를 전달해 사용자 뷰를 고정
  const applyRoute = (route: RouteResponse, fitBounds = true) => {
    const coordinates = decodePolyline(route.polyline);
    console.log('[applyRoute] coords:', coordinates.length, 'first:', coordinates[0]);
    setRouteData(route);
    setRouteCoords(coordinates); // 이탈 감지를 위해 저장
    lastNearestIdxRef.current = 0; // 새 경로 시작 시 진행 인덱스 초기화
    // 새 경로가 적용될 때마다 이탈 상태 머신 + 속도 누적 초기화
    hasEnteredRouteRef.current = false;
    isOnRouteRef.current = false;
    pendingEntryRef.current = false;
    setHasEnteredRoute(false);
    navStatusStore.set('measuring');
    navStartTimeRef.current = Date.now();
    navTotalDistRef.current = 0;
    navLastGpsPosRef.current = null;
    setRouteSteps([]);
    // 경로 탐색 완료 시 지도가 보이도록 시트를 접어둠 (핸들 클릭으로 펼칠 수 있음)
    setSheetExpanded(false);

    // window.drawRoute 함수 호출 대신 JS를 직접 inject
    // (이중 직렬화 없이 좌표를 JSON 리터럴로 직접 전달 → 파싱 오류 방지)
    webviewRef.current?.injectJavaScript(`
      (function() {
        try {
          var coords = ${JSON.stringify(coordinates)};
          var path = coords.map(function(c) { return new kakao.maps.LatLng(c[1], c[0]); });
          if (routePolyline) { routePolyline.setMap(null); routePolyline = null; }
          routePolyline = new kakao.maps.Polyline({
            path: path,
            strokeWeight: 6,
            strokeColor: '#516452',
            strokeOpacity: 0.95,
            strokeStyle: 'solid'
          });
          routePolyline.setMap(map);
          ${fitBounds ? `
          var bounds = new kakao.maps.LatLngBounds();
          path.forEach(function(p) { bounds.extend(p); });
          setTimeout(function() {
            map.relayout();
            setTimeout(function() {
              map.setBounds(bounds, 80, 40, 260, 40);
            }, 150);
          }, 100);
          ` : ''}
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'polyline', count: path.length })
          );
        } catch(e) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'error', msg: String(e) })
          );
        }
      })();
      true;
    `);
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

    let originLat = selectedOrigin
      ? parseFloat(selectedOrigin.lat)
      : initialLocation?.latitude;
    let originLng = selectedOrigin
      ? parseFloat(selectedOrigin.lng)
      : initialLocation?.longitude;
    const originName = selectedOrigin?.name ?? "현재 위치";

    // initialLocation이 아직 없으면 (SavedScreen 등 외부에서 빠르게 넘어온 경우)
    // 현재 위치를 즉시 요청해서 출발지로 사용
    if (!originLat || !originLng) {
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        originLat = pos.coords.latitude;
        originLng = pos.coords.longitude;
        setInitialLocation(pos.coords);
      } catch {
        Alert.alert("위치 오류", "현재 위치를 가져올 수 없습니다.\n출발지를 직접 입력해주세요.");
        return;
      }
    }
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

  // ── 경로 안내 종료 + 속도 업데이트 API 호출 ──────────────────────────
  const handleEndNavigation = async () => {
    // 지도 경로 제거
    webviewRef.current?.injectJavaScript(`window.clearRoute(); true;`);

    // 속도 업데이트 (백그라운드, 실패해도 조용히 처리)
    const elapsedSec = (Date.now() - navStartTimeRef.current) / 1000;
    const walkedDist = navTotalDistRef.current;
    if (walkedDist > 0 && elapsedSec > 0) {
      const segments = [{
        distanceM: Math.round(walkedDist * 10) / 10,
        durationS: Math.round(elapsedSec),
        slopeDeg:  0.0,  // 경사도 미구현 — 0으로 고정
      }];
      fetchWithAuth(API.profile.updateSpeed, {
        method: 'POST',
        body: JSON.stringify({ segments }),
      }).catch(() => {}); // 실패 시 무시
    }

    // 상태 초기화
    setIsNavigating(false);
    setRouteData(null);
    setRouteCoords([]);
    setDestination(null);
    setOrigin(null);
    navTotalDistRef.current = 0;
    navLastGpsPosRef.current = null;

    Alert.alert("경로 안내 종료", "경로 탐색이 종료되었습니다.");
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
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              console.log('[KakaoMap]', JSON.stringify(data));
            } catch {}
          }}
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
          <View style={{ flex: 1, gap: 6 }}>
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
            {/* 신호 통과 가능 여부 */}
            {firstSignal && signalPaceMsg && (
              <View style={styles.navSignalRow}>
                <View style={[styles.navSignalDot, { backgroundColor: isCurrentlyRed ? "#ef4444" : "#22c55e" }]} />
                <Text style={styles.navSignalText} numberOfLines={2}>{signalPaceMsg}</Text>
              </View>
            )}
          </View>
          <View style={{ gap: 10, alignItems: 'center' }}>
            <Pressable
              onPress={() => destination && routeData && nav.navigate("Safety", {
                routeData,
                destinationName: destination.name,
                destinationLat: destination.lat,
                destinationLng: destination.lng,
                originName: origin?.name ?? '현재 위치',
                steps: routeSteps,
              })}
            >
              <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            </Pressable>
            <Pressable onPress={handleEndNavigation}>
              <Ionicons
                name="close-circle"
                size={26}
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      )}

      {/* Bottom Sheet (탐색 후) */}
      {!isNavigating &&
        routeData &&
        (() => {
          const time = formatRemainingTime(routeData.totalTimeSeconds);
          const distanceStr = formatDistance(routeData.totalDistanceMeters);
          const distText = "전방";
          const signalMsg = signalPaceMsg ?? (isCurrentlyRed
            ? '빠르게 걸으면 초록불에 통과할 수 있어요'
            : '지금 출발하면 신호에 걸리지 않아요');
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
                  <Text style={styles.statValue}>{(avgSpeedMps * 3.6).toFixed(1)} km/h로{"\n"}걸으세요</Text>
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
                  // origin > GPS 현재 위치 > 경로 첫 좌표 순으로 fallback
                  const originLat =
                    origin?.lat ??
                    initialLocation?.latitude ??
                    (routeCoords.length > 0 ? routeCoords[0][1] : null);
                  const originLng =
                    origin?.lng ??
                    initialLocation?.longitude ??
                    (routeCoords.length > 0 ? routeCoords[0][0] : null);
                  // 레이아웃 변경(바텀시트 사라짐) 후 지도가 터치 영역을 재계산하도록
                  // relayout() + 드래그/줌 명시 활성화
                  setTimeout(() => {
                    if (originLat != null && originLng != null) {
                      webviewRef.current?.injectJavaScript(`
                        (function() {
                          var latlng = new kakao.maps.LatLng(${originLat}, ${originLng});
                          // 현재 위치 마커 표시
                          if (currentMarker) { currentMarker.setMap(null); }
                          currentMarker = new kakao.maps.Marker({ map: map, position: latlng });
                          map.setCenter(latlng);
                          map.setLevel(2);
                          map.relayout();
                          map.setDraggable(true);
                          map.setZoomable(true);
                        })();
                        true;
                      `);
                    } else {
                      webviewRef.current?.injectJavaScript(`
                        map.relayout();
                        map.setDraggable(true);
                        map.setZoomable(true);
                        true;
                      `);
                    }
                  }, 150);
                }}
              >
                <Text style={styles.endBtnText}>경로 안내 시작</Text>
                <Ionicons name="navigate" size={16} color="#fff" />
              </Pressable>

              {/* 경로 취소 */}
              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  pressed && { opacity: 0.6 },
                ]}
                onPress={() => {
                  webviewRef.current?.injectJavaScript(`window.clearRoute(); true;`);
                  setRouteData(null);
                  setRouteCoords([]);
                  setDestination(null);
                  setOrigin(null);
                  setSheetExpanded(false);
                  // 출발지·목적지 초기화 후 검색 모달 다시 열기
                  setOriginQuery("");
                  setDestQuery("");
                  setSelectedOrigin(null);
                  setSelectedDest(null);
                  setSearchResults([]);
                  setActiveField("dest");
                  setSearchVisible(true);
                }}
              >
                <Text style={styles.cancelBtnText}>취소하기</Text>
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
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#ef4444",
  },

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
  navSignalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  navSignalDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  navSignalText: { fontSize: 12, color: Colors.textPrimary, flex: 1, lineHeight: 16 },

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
