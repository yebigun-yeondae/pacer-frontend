import React, { useState, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../theme/colors";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { fetchWithAuth } from "../api/fetchWithAuth";
import { API } from "../api/config";

// ── 아이콘 프리셋 ──────────────────────────────────────────────────────────────
const ICON_OPTIONS = [
  {
    icon: "home" as const,
    color: Colors.primaryLight,
    iconColor: Colors.primary,
  },
  {
    icon: "school-outline" as const,
    color: Colors.brownLight,
    iconColor: Colors.textDanger,
  },
  {
    icon: "briefcase-outline" as const,
    color: Colors.yellow,
    iconColor: Colors.brown,
  },
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

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const STOPS = [
  {
    id: "22-124",
    name: "서초아트자이아파트",
    buses: [
      {
        badge: "740",
        color: "green" as const,
        dest: "강남역 방면",
        time: "3분",
        soon: true,
      },
      {
        badge: "M4403",
        color: "brown" as const,
        dest: "동탄역 방면",
        time: "12분",
        soon: false,
      },
    ],
  },
  {
    id: "22-125",
    name: "서초동진흥아파트",
    buses: [
      {
        badge: "지하철 2호선",
        color: "blue" as const,
        dest: "교대역 방면",
        time: "곧 도착",
        soon: true,
      },
      {
        badge: "4412",
        color: "green" as const,
        dest: "교대역 방면",
        time: "8분",
        soon: false,
      },
    ],
  },
];

const BADGE_COLORS = {
  green: { bg: "rgba(81,100,82,0.1)", text: Colors.primary },
  brown: { bg: "rgba(123,87,69,0.1)", text: Colors.brown },
  blue: { bg: "rgba(34,139,230,0.1)", text: Colors.blue },
};

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

  // 포커스될 때마다 즐겨찾기 + 히스토리 로드
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
        .then((data: RouteHistory[]) => setHistory(data.slice(0, 20))) // 최대 20개
        .catch(() => {})
        .finally(() => setIsHistLoading(false));
    }, []),
  );

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
    [nav],
  );

  const useHorizontalScroll = favorites.length > 5;
  const recentPreview = history.slice(0, 2); // 기본 2개

  return (
    <View style={styles.container}>
      {/* Safety FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.safetyFab,
          pressed && { opacity: 0.85 },
        ]}
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
            <Ionicons
              name="mic-outline"
              size={20}
              color={Colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* 즐겨찾기 칩 */}
        {isFavLoading && <ActivityIndicator color={Colors.primary} />}

        {!isFavLoading && favorites.length === 0 && (
          <View style={styles.chips}>
            <Pressable
              style={styles.chipAdd}
              onPress={() => nav.navigate("Saved" as any)}
            >
              <Ionicons name="add" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {!isFavLoading &&
          favorites.length > 0 &&
          (useHorizontalScroll ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {favorites.map((fav, idx) => {
                const preset = getPreset(idx);
                return (
                  <Pressable
                    key={fav.id}
                    style={styles.chip}
                    onPress={() =>
                      nav.navigate("MapDetail", {
                        destinationName: fav.address,
                        destinationLat: fav.lat,
                        destinationLng: fav.lng,
                      })
                    }
                  >
                    <Ionicons
                      name={preset.icon}
                      size={14}
                      color={preset.iconColor}
                    />
                    <Text style={styles.chipText}>{fav.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.chipAdd}
                onPress={() => nav.navigate("Saved" as any)}
              >
                <Ionicons name="add" size={18} color={Colors.textSecondary} />
              </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.chips}>
              {favorites.map((fav, idx) => {
                const preset = getPreset(idx);
                return (
                  <Pressable
                    key={fav.id}
                    style={styles.chip}
                    onPress={() =>
                      nav.navigate("MapDetail", {
                        destinationName: fav.address,
                        destinationLat: fav.lat,
                        destinationLng: fav.lng,
                      })
                    }
                  >
                    <Ionicons
                      name={preset.icon}
                      size={14}
                      color={preset.iconColor}
                    />
                    <Text style={styles.chipText}>{fav.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.chipAdd}
                onPress={() => nav.navigate("Saved" as any)}
              >
                <Ionicons name="add" size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
          ))}

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

          {isHistLoading && (
            <ActivityIndicator
              color={Colors.primary}
              style={{ marginTop: 8 }}
            />
          )}

          {!isHistLoading && recentPreview.length === 0 && (
            <Text style={styles.emptyText}>최근 탐색한 경로가 없습니다</Text>
          )}

          {!isHistLoading &&
            recentPreview.map((item) => (
              <Pressable
                key={item.id}
                style={styles.recentItem}
                onPress={() => handleDestSelect(item)}
              >
                <View style={styles.recentIcon}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={Colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {item.destinationName}
                  </Text>
                  <Text style={styles.recentAddr} numberOfLines={1}>
                    {item.originName} → {item.destinationName}
                  </Text>
                </View>
              </Pressable>
            ))}
        </View>

        {/* 주변 정류장 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주변 정류장</Text>
          <View style={styles.mapPreview}>
            <View style={styles.mapGrid} />
            <View style={styles.mapTag}>
              <View style={styles.mapDot} />
              <Text style={styles.mapTagText}>현재 위치: 서초동</Text>
            </View>
          </View>
          {STOPS.map((stop) => (
            <Pressable
              key={stop.id}
              style={styles.stopCard}
              onPress={() => nav.navigate("MapDetail")}
            >
              <View style={styles.stopHeader}>
                <View>
                  <Text style={styles.stopId}>ID: {stop.id}</Text>
                  <Text style={styles.stopName}>{stop.name}</Text>
                </View>
                <Ionicons
                  name="bookmark-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
              </View>
              {stop.buses.map((bus) => (
                <View key={bus.badge} style={styles.busLine}>
                  <View style={styles.busInfo}>
                    <View
                      style={[
                        styles.busBadge,
                        { backgroundColor: BADGE_COLORS[bus.color].bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.busBadgeText,
                          { color: BADGE_COLORS[bus.color].text },
                        ]}
                      >
                        {bus.badge}
                      </Text>
                    </View>
                    <Text style={styles.busDest}>{bus.dest}</Text>
                  </View>
                  <Text
                    style={[
                      styles.busTime,
                      bus.soon && {
                        color: Colors.textDanger,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {bus.time}
                  </Text>
                </View>
              ))}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ── 최근 검색 더보기 모달 ── */}
      <Modal
        visible={histModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setHistModalVisible(false)}
        />
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
              <TouchableOpacity
                style={styles.histItem}
                activeOpacity={0.7}
                onPress={() => handleDestSelect(item)}
              >
                <View style={styles.histIcon}>
                  <Ionicons
                    name="location-outline"
                    size={16}
                    color={Colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histDest} numberOfLines={1}>
                    {item.destinationName}
                  </Text>
                  <Text style={styles.histSub} numberOfLines={1}>
                    {item.originName} → {item.destinationName}
                  </Text>
                  <Text style={styles.histDate}>
                    {formatCreatedAt(item.createdAt)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={Colors.textMuted}
                />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: Colors.overlay,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: {
    fontFamily: "System",
    fontWeight: "700",
    fontSize: 18,
    color: Colors.primary,
    letterSpacing: -0.45,
  },

  content: { padding: 24, paddingBottom: 100, gap: 28 },
  inputWrap: { position: "relative" },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 16,
    paddingVertical: 20,
    paddingLeft: 50,
    paddingRight: 50,
    fontSize: 18,
    color: Colors.textPrimary,
  },

  chips: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chipsScroll: { flexDirection: "row", gap: 10, paddingRight: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: 9999,
  },
  chipText: { fontSize: 14, color: Colors.textPrimary, fontWeight: "500" },
  chipAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
  },

  section: { gap: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  sectionAction: { fontSize: 12, color: Colors.primary, fontWeight: "500" },

  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: 8,
  },

  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 12,
    borderRadius: 20,
  },
  recentIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.bgInput,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  recentName: { fontSize: 15, fontWeight: "500", color: Colors.textPrimary },
  recentAddr: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  mapPreview: {
    height: 160,
    borderRadius: 24,
    backgroundColor: "#d4ddd0",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
  mapTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    margin: 16,
  },
  mapDot: {
    width: 8,
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  mapTagText: { fontSize: 12, fontWeight: "500", color: Colors.textPrimary },

  stopCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 32,
    padding: 21,
    gap: 16,
  },
  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  stopId: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  stopName: {
    fontSize: 18,
    fontWeight: "500",
    color: Colors.textPrimary,
    marginTop: 4,
  },
  busLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
  },
  busInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  busBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  busBadgeText: { fontSize: 11, fontWeight: "600", letterSpacing: -0.55 },
  busDest: { fontSize: 14, color: Colors.textPrimary },
  busTime: { fontSize: 14, color: Colors.textSecondary },

  safetyFab: {
    position: "absolute",
    right: 24,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  // 더보기 모달
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: "75%",
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
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },

  histList: { gap: 4, paddingBottom: 8 },
  histItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  histIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.bgInput,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  histDest: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  histSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  histDate: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
});
