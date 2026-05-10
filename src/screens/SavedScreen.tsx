import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Modal, FlatList, ActivityIndicator, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { fetchWithAuth } from '../api/fetchWithAuth';
import { API } from '../api/config';

// ── 아이콘 옵션 ────────────────────────────────────────────────────────────────
const ICON_OPTIONS = [
  { key: 'home',           icon: 'home'            as const, color: Colors.primaryLight, iconColor: Colors.primary    },
  { key: 'school-outline', icon: 'school-outline'  as const, color: Colors.brownLight,   iconColor: Colors.textDanger },
  { key: 'briefcase-outline', icon: 'briefcase-outline' as const, color: Colors.yellow,  iconColor: Colors.brown      },
] as const;

type IconKey = typeof ICON_OPTIONS[number]['key'];

// 인덱스 기반으로 아이콘 프리셋 순환 (서버에 icon 필드 없으므로)
function getPreset(index: number) {
  return ICON_OPTIONS[index % ICON_OPTIONS.length];
}


// ── 타입 정의 ──────────────────────────────────────────────────────────────────
interface FavoriteItem {
  id: string;
  label: string;
  lat: number;
  lng: number;
  address: string;
  visitCount: number;
  createdAt: string;
}

interface RouteHistory {
  id: string;
  originName: string;
  originLat: number;
  originLng: number;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  createdAt: string;
}

function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const hh   = String(d.getHours()).padStart(2, '0');
  const min  = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
}

// ── 컴포넌트 ───────────────────────────────────────────────────────────────────
export default function SavedScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // 즐겨찾기 목록
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isFavLoading, setIsFavLoading] = useState(false);

  // 히스토리 모달
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyList, setHistoryList]       = useState<RouteHistory[]>([]);
  const [isHistLoading, setIsHistLoading]   = useState(false);
  const [historyError, setHistoryError]     = useState<string | null>(null);
  const [selectedItem, setSelectedItem]     = useState<RouteHistory | null>(null);

  // 편집 모드 (삭제 버튼 표시)
  const [isEditMode, setIsEditMode] = useState(false);

  // 장소 저장 입력 UI
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelText, setLabelText]           = useState('');
  const [selectedIcon, setSelectedIcon]     = useState<IconKey>('home');
  const [isSaving, setIsSaving]             = useState(false);

  // ── 즐겨찾기 목록 로드 ─────────────────────────────────────────────────────
  const loadFavorites = useCallback(async () => {
    setIsFavLoading(true);
    try {
      const res = await fetchWithAuth(API.favorites.list, { method: 'GET' });
      if (!res.ok) throw new Error();
      const data: FavoriteItem[] = await res.json();
      setFavorites(data);
    } catch {
      // 실패 시 빈 목록 유지
    } finally {
      setIsFavLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  // ── 히스토리 모달 열기 ─────────────────────────────────────────────────────
  const openHistory = useCallback(async () => {
    setHistoryVisible(true);
    setHistoryError(null);
    setSelectedItem(null);
    setShowLabelInput(false);
    setIsHistLoading(true);
    try {
      const res = await fetchWithAuth(API.routes.history, { method: 'GET' });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      setHistoryList(await res.json());
    } catch (e: any) {
      setHistoryError(e.message ?? '불러오기 실패');
    } finally {
      setIsHistLoading(false);
    }
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryVisible(false);
    setHistoryList([]);
    setHistoryError(null);
    setSelectedItem(null);
    setShowLabelInput(false);
    setLabelText('');
    setSelectedIcon('home');
  }, []);

  // ── 경로 저장 (미구현 — 완료 문구만) ──────────────────────────────────────
  const handleSaveRoute = useCallback(() => {
    setSelectedItem(null);
    Alert.alert('저장 완료', '경로가 저장되었습니다.', [
      { text: '확인', onPress: closeHistory },
    ]);
  }, [closeHistory]);

  // ── 장소 저장 — label 입력 단계 진입 ─────────────────────────────────────
  const handleOpenLabelInput = useCallback(() => {
    setLabelText('');
    setSelectedIcon('home');
    setShowLabelInput(true);
  }, []);

  // ── 장소 저장 — POST ──────────────────────────────────────────────────────
  const handleSavePlace = useCallback(async () => {
    if (!selectedItem || !labelText.trim()) {
      Alert.alert('알림', '장소 이름을 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const body = {
        label:   labelText.trim(),
        lat:     selectedItem.destinationLat,
        lng:     selectedItem.destinationLng,
        address: selectedItem.destinationName,
      };
      const res = await fetchWithAuth(API.favorites.save, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      await loadFavorites(); // 목록 갱신
      closeHistory();
      Alert.alert('저장 완료', `'${labelText.trim()}'이(가) 즐겨찾기에 저장되었습니다.`);
    } catch (e: any) {
      Alert.alert('저장 실패', e.message ?? '다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedItem, labelText, loadFavorites, closeHistory]);

  // ── 즐겨찾기 삭제 — DELETE /api/v1/favorites/{id} ────────────────────────
  const handleDeleteFavorite = useCallback(async (id: string, label: string) => {
    try {
      const res = await fetchWithAuth(`${API.favorites.list}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (e: any) {
      Alert.alert('삭제 실패', e.message ?? '다시 시도해주세요.');
    }
  }, []);

  // ── 렌더 ──────────────────────────────────────────────────────────────────
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

        {/* 저장된 장소 타이틀 + + 버튼 */}
        <View>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.title}>저장된 장소</Text>
            <View style={styles.titleBtns}>
              {favorites.length > 0 && (
                <Pressable
                  style={[styles.removeBtn, isEditMode && styles.removeBtnActive]}
                  onPress={() => setIsEditMode(v => !v)}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={20} color={isEditMode ? '#fff' : Colors.textDanger} />
                </Pressable>
              )}
              <Pressable style={styles.addBtn} onPress={openHistory} hitSlop={8}>
                <Ionicons name="add" size={20} color={Colors.primary} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.subtitle}>당신의 소중한 장소와 경로를 확인하세요.</Text>
        </View>

        {/* 즐겨찾기 목록 (API) */}
        {isFavLoading && <ActivityIndicator color={Colors.primary} />}
        {!isFavLoading && favorites.length === 0 && (
          <View style={styles.emptyFav}>
            <Ionicons name="location-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyFavText}>저장된 장소가 없습니다{'\n'}+ 버튼으로 추가해보세요</Text>
          </View>
        )}
        <View style={styles.placeList}>
          {favorites.map((fav, idx) => {
            const preset = getPreset(idx);
            return (
              <Pressable
                key={fav.id}
                style={styles.placeCard}
                onPress={() => !isEditMode && nav.navigate('MapDetail', {
                  destinationName: fav.address,
                  destinationLat:  fav.lat,
                  destinationLng:  fav.lng,
                })}
              >
                <View style={[styles.placeIcon, { backgroundColor: preset.color }]}>
                  <Ionicons name={preset.icon} size={18} color={preset.iconColor} />
                </View>
                <View style={styles.placeTextWrap}>
                  <Text style={styles.placeName}>{fav.label}</Text>
                  <Text style={styles.placeAddr}>{fav.address}</Text>
                </View>
                {isEditMode && (
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteFavorite(fav.id, fav.label)}
                    hitSlop={6}
                  >
                    <Ionicons name="remove" size={16} color="#fff" />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </View>

      </ScrollView>

      {/* ── 히스토리 모달 ─────────────────────────────────────────────────── */}
      <Modal
        visible={historyVisible}
        animationType="slide"
        transparent
        onRequestClose={closeHistory}
      >
        <Pressable style={styles.modalOverlay} onPress={closeHistory} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          {/* 모달 헤더 */}
          <View style={styles.modalTitleRow}>
            <Text style={styles.modalTitle}>
              {showLabelInput ? '장소 이름 입력' : '최근 탐색한 경로'}
            </Text>
            <Pressable onPress={showLabelInput ? () => setShowLabelInput(false) : closeHistory} hitSlop={12}>
              <Ionicons name={showLabelInput ? 'chevron-back' : 'close'} size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* ── 장소 이름 입력 화면 ── */}
          {showLabelInput && (
            <View style={styles.labelInputWrap}>
              {/* 아이콘 선택 */}
              <Text style={styles.labelInputGuide}>아이콘 선택</Text>
              <View style={styles.iconRow}>
                {ICON_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.key}
                    style={[
                      styles.iconOption,
                      { backgroundColor: opt.color },
                      selectedIcon === opt.key && styles.iconOptionSelected,
                    ]}
                    onPress={() => setSelectedIcon(opt.key)}
                  >
                    <Ionicons name={opt.icon} size={24} color={opt.iconColor} />
                  </Pressable>
                ))}
              </View>

              {/* 장소 이름 입력 */}
              <Text style={[styles.labelInputGuide, { marginTop: 20 }]}>장소 이름</Text>
              <TextInput
                style={styles.labelTextInput}
                placeholder="예) 집, 회사, 학교"
                placeholderTextColor={Colors.textMuted}
                value={labelText}
                onChangeText={setLabelText}
                maxLength={20}
                autoFocus
              />

              {/* 선택된 경로 요약 */}
              {selectedItem && (
                <View style={styles.selectedRouteSummary}>
                  <Ionicons name="navigate-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.selectedRouteSummaryText} numberOfLines={1}>
                    {selectedItem.destinationName}
                  </Text>
                </View>
              )}

              {/* 저장 버튼 */}
              <Pressable
                style={[styles.savePlaceConfirmBtn, (!labelText.trim() || isSaving) && { opacity: 0.5 }]}
                onPress={handleSavePlace}
                disabled={!labelText.trim() || isSaving}
              >
                {isSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.savePlaceConfirmText}>즐겨찾기 저장</Text>
                }
              </Pressable>
            </View>
          )}

          {/* ── 히스토리 목록 ── */}
          {!showLabelInput && (
            <>
              {isHistLoading && (
                <ActivityIndicator style={{ marginTop: 40 }} size="large" color={Colors.primary} />
              )}
              {!isHistLoading && historyError && (
                <View style={styles.emptyWrap}>
                  <Ionicons name="alert-circle-outline" size={36} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>{historyError}</Text>
                </View>
              )}
              {!isHistLoading && !historyError && historyList.length === 0 && (
                <View style={styles.emptyWrap}>
                  <Ionicons name="map-outline" size={36} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>탐색 기록이 없습니다</Text>
                </View>
              )}
              {!isHistLoading && !historyError && historyList.length > 0 && (
                <FlatList
                  data={historyList}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.historyList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.historyItem,
                        selectedItem?.id === item.id && styles.historyItemSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => setSelectedItem(item)}
                    >
                      <View style={styles.historyRoute}>
                        <View style={styles.historyDotOrigin} />
                        <Text style={styles.historyOrigin} numberOfLines={1}>{item.originName}</Text>
                      </View>
                      <View style={styles.historyLine} />
                      <View style={styles.historyRoute}>
                        <View style={styles.historyDotDest} />
                        <Text style={styles.historyDest} numberOfLines={1}>{item.destinationName}</Text>
                      </View>
                      <Text style={styles.historyDate}>{formatCreatedAt(item.createdAt)}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}

              {/* 항목 선택 시 액션 버튼 */}
              {selectedItem && (
                <View style={styles.actionBar}>
                  <Pressable style={styles.actionBtnPlace} onPress={handleOpenLabelInput}>
                    <Ionicons name="location" size={16} color="#fff" />
                    <Text style={styles.actionBtnPlaceText}>장소 저장</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────────────────────────
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

  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '500', color: Colors.textPrimary, letterSpacing: -0.75 },
  titleBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' },
  removeBtnActive: { backgroundColor: Colors.textDanger },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.textDanger, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, opacity: 0.7, marginTop: 4 },

  emptyFav: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  emptyFavText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  placeList: { gap: 16 },
  placeCard: { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  placeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  placeTextWrap: { flex: 1 },
  placeName: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary },
  placeAddr: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeTitle: { fontSize: 24, fontWeight: '500', color: Colors.textPrimary, letterSpacing: -0.6 },
  routeAction: { fontSize: 14, color: Colors.primary },

  routeCard: { backgroundColor: '#fff', borderRadius: 28, padding: 16, flexDirection: 'row', gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  routeThumb: { width: 96, height: 96, borderRadius: 16, backgroundColor: '#eeeeea', overflow: 'hidden', position: 'relative' },
  thumbRoad: { position: 'absolute', backgroundColor: 'rgba(81,100,82,0.3)', borderRadius: 1 },
  routeInfo: { flex: 1, justifyContent: 'center' },
  routeName: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary },
  routeDist: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  routeDistText: { fontSize: 14, color: Colors.textSecondary },
  routeTags: { flexDirection: 'row', gap: 12, marginTop: 12 },
  routeTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bgCard, borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4 },
  routeTagText: { fontSize: 12, fontWeight: '600' },

  addRoute: { borderWidth: 2, borderColor: Colors.borderMedium, borderStyle: 'dashed', borderRadius: 28, padding: 26, alignItems: 'center', gap: 8 },
  addRouteText: { fontSize: 14, color: Colors.textSecondary },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: 40, maxHeight: '78%' },
  modalHandle: { width: 48, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, alignSelf: 'center', marginVertical: 14 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },

  emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  emptyText: { fontSize: 14, color: Colors.textMuted },

  // 히스토리 목록
  historyList: { gap: 10, paddingBottom: 8 },
  historyItem: { backgroundColor: Colors.bgCard, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16, gap: 6, borderWidth: 1.5, borderColor: 'transparent' },
  historyItemSelected: { borderColor: Colors.primary, backgroundColor: 'rgba(81,100,82,0.06)' },
  historyRoute: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyDotOrigin: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  historyDotDest: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' },
  historyLine: { width: 1, height: 12, backgroundColor: '#d1d5db', marginLeft: 4 },
  historyOrigin: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  historyDest: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  historyDate: { fontSize: 12, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },

  // 액션 바
  actionBar: { flexDirection: 'row', gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 8 },
  actionBtnRoute: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, paddingVertical: 14 },
  actionBtnRouteText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  actionBtnPlace: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14 },
  actionBtnPlaceText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // 장소 이름 입력
  labelInputWrap: { paddingTop: 4, gap: 8 },
  labelInputGuide: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  iconRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  iconOption: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconOptionSelected: { borderColor: Colors.primary },
  labelTextInput: { backgroundColor: Colors.bgCard, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary, marginTop: 4 },
  selectedRouteSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  selectedRouteSummaryText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  savePlaceConfirmBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  savePlaceConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
