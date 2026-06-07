import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { getProfile, ProfileResponse } from '../api/profileApi';
import { logoutFromServer } from '../api/authApi';
import { storage } from '../utils/storage';
import { fetchWithAuth } from '../api/fetchWithAuth';
import { API } from '../api/config';

export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [signalAlert, setSignalAlert] = useState(true);
  const [transitAlert, setTransitAlert] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile).catch(() => {});
    }, [])
  );

  const handleWithdraw = () => {
    // 1차 확인
    Alert.alert(
      '회원 탈퇴',
      '정말 탈퇴하시겠습니까?',
      [
        { text: '아니오', style: 'cancel' },
        {
          text: '예',
          style: 'destructive',
          onPress: () => {
            // 2차 확인 — 데이터 보관 안내 포함
            Alert.alert(
              '탈퇴 전 안내',
              '회원 탈퇴 시 서비스 이용 기록 및 개인정보는 관련 법령에 따라 5년간 보관된 후 삭제됩니다.\n\n정말 탈퇴하시겠습니까?',
              [
                { text: '아니오', style: 'cancel' },
                {
                  text: '예',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const res = await fetchWithAuth(API.auth.withdraw, {
                        method: 'DELETE',
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error((err as any).message || `오류: ${res.status}`);
                      }
                      await storage.clear();
                      nav.reset({ index: 0, routes: [{ name: 'Auth' }] });
                    } catch (e: any) {
                      Alert.alert('탈퇴 실패', e.message ?? '잠시 후 다시 시도해주세요.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소' },
      {
        text: '로그아웃', style: 'destructive', onPress: async () => {
          await logoutFromServer();
          nav.reset({ index: 0, routes: [{ name: 'Auth' }] });
        }
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBorder}>
            <View style={styles.avatarInner}><Text style={styles.avatarText}>{profile?.nickname?.[0] ?? '?'}</Text></View>
          </View>
          <Text style={styles.headerTitle}>{profile?.nickname ?? 'Pacer'}</Text>
        </View>
        <Pressable><Ionicons name="settings-outline" size={18} color={Colors.textSecondary} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{profile?.nickname?.[0] ?? '?'}</Text>
          </View>
          <Text style={styles.profileName}>{profile?.nickname ?? '불러오는 중...'}</Text>
          <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile ? profile.totalRoutes : '-'}</Text>
            <Text style={styles.statLabel}>총 경로</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile ? (profile.totalDistanceM / 1000).toFixed(1) : '-'}</Text>
            <Text style={styles.statLabel}>총 거리 (km)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile ? (profile.avgSpeedMps * 3.6).toFixed(1) : '-'}</Text>
            <Text style={styles.statLabel}>평균 속도 (km/h)</Text>
          </View>
        </View>

        {/* Walking Settings */}
        <View style={styles.card}>
          <View style={styles.cardTitle}>
            <Ionicons name="walk" size={18} color={Colors.primary} />
            <Text style={styles.cardTitleText}>보행 설정</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>내 평균 보행 속도</Text>
            <Text style={styles.speedValue}>
              {profile ? `${(profile.avgSpeedMps * 3.6).toFixed(1)} km/h` : '- km/h'}
            </Text>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <View style={styles.cardTitle}>
            <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
            <Text style={styles.cardTitleText}>알림</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>신호등 알림</Text>
            <Switch
              value={signalAlert} onValueChange={setSignalAlert}
              trackColor={{ false: '#e1e3de', true: Colors.primaryLight }}
              thumbColor={signalAlert ? Colors.primary : '#fff'}
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>환승 알림</Text>
            <Switch
              value={transitAlert} onValueChange={setTransitAlert}
              trackColor={{ false: '#e1e3de', true: Colors.primaryLight }}
              thumbColor={transitAlert ? Colors.primary : '#fff'}
            />
          </View>
        </View>

        {/* Display */}
        <View style={styles.card}>
          <View style={styles.cardTitle}>
            <Ionicons name="sunny-outline" size={18} color={Colors.primary} />
            <Text style={styles.cardTitleText}>화면</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>다크 모드</Text>
            <Switch
              value={darkMode} onValueChange={setDarkMode}
              trackColor={{ false: '#e1e3de', true: Colors.primaryLight }}
              thumbColor={darkMode ? Colors.primary : '#fff'}
            />
          </View>
          <Pressable style={styles.settingRow}>
            <Text style={styles.settingLabel}>지도 스타일</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Withdraw */}
        <Pressable style={({ pressed }) => [styles.withdrawBtn, pressed && { opacity: 0.8 }]} onPress={handleWithdraw}>
          <Ionicons name="person-remove-outline" size={18} color="#ef4444" />
          <Text style={styles.withdrawText}>회원 탈퇴</Text>
        </Pressable>

        {/* Logout */}
        <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.textDanger} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>

        <Text style={styles.version}>Version 2.4.0 (Serene Walk)</Text>
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
  avatarBorder: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: Colors.primaryLight, padding: 2 },
  avatarInner: { flex: 1, borderRadius: 16, backgroundColor: '#c5a882', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  headerTitle: { fontWeight: '700', fontSize: 20, color: Colors.primary, letterSpacing: 0.5 },

  content: { padding: 24, paddingBottom: 100, gap: 24 },

  profileHeader: { alignItems: 'center', gap: 4 },
  profileAvatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#c5a882',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  profileAvatarText: { fontSize: 36, fontWeight: '600', color: '#fff' },
  profileName: { fontSize: 30, fontWeight: '500', color: Colors.textPrimary, letterSpacing: -0.75 },
  profileEmail: { fontSize: 16, color: Colors.textSecondary, marginTop: 2 },
  editBtn: {
    borderWidth: 1, borderColor: Colors.borderMedium, borderRadius: 9999,
    paddingHorizontal: 25, paddingVertical: 9, marginTop: 12,
  },
  editBtnText: { fontSize: 14, color: Colors.primary },

  statsCard: {
    backgroundColor: Colors.bgCard, borderRadius: 32, padding: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '600', color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.borderMedium },

  card: { backgroundColor: Colors.bgCard, borderRadius: 32, padding: 24, gap: 20 },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitleText: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary, letterSpacing: -0.45 },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { fontSize: 14, color: Colors.textPrimary },
  settingValue: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  speedValue: { fontSize: 20, fontWeight: '700', color: Colors.primary },

  withdrawBtn: {
    backgroundColor: 'rgba(239,68,68,0.07)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    paddingVertical: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  withdrawText: { fontSize: 16, color: '#ef4444' },

  logoutBtn: {
    backgroundColor: 'rgba(253,121,90,0.1)', borderRadius: 16,
    paddingVertical: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  logoutText: { fontSize: 16, color: Colors.textDanger },
  version: { textAlign: 'center', fontSize: 12, color: '#797b78', textTransform: 'uppercase', letterSpacing: 1.2 },
});
