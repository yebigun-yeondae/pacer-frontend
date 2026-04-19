import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [signalAlert, setSignalAlert] = useState(true);
  const [transitAlert, setTransitAlert] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [stride, setStride] = useState('65');

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소' },
      { text: '로그아웃', style: 'destructive', onPress: () => nav.reset({ index: 0, routes: [{ name: 'Auth' }] }) },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBorder}>
            <View style={styles.avatarInner}><Text style={styles.avatarText}>Y</Text></View>
          </View>
          <Text style={styles.headerTitle}>Serene Walk</Text>
        </View>
        <Pressable><Ionicons name="settings-outline" size={18} color={Colors.textSecondary} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>Y</Text></View>
          <Text style={styles.profileName}>이유진</Text>
          <Text style={styles.profileEmail}>yujin.lee@example.com</Text>
          <Pressable style={styles.editBtn} onPress={() => Alert.alert('', '프로필 수정')}>
            <Text style={styles.editBtnText}>프로필 수정</Text>
          </Pressable>
        </View>

        {/* Walking Settings */}
        <View style={styles.card}>
          <View style={styles.cardTitle}>
            <Ionicons name="walk" size={18} color={Colors.primary} />
            <Text style={styles.cardTitleText}>보행 설정</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>보행 속도</Text>
            <Text style={styles.settingValue}>보통 (4.5 km/h)</Text>
          </View>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: '55%' }]} />
            <View style={[styles.sliderThumb, { left: '55%' }]} />
          </View>
          <View style={{ gap: 12, marginTop: 12 }}>
            <Text style={[styles.settingLabel, { fontWeight: '600' }]}>보폭 (cm)</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={stride} onChangeText={setStride} keyboardType="numeric" />
              <Text style={styles.inputSuffix}>cm</Text>
            </View>
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

  card: { backgroundColor: Colors.bgCard, borderRadius: 32, padding: 24, gap: 20 },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitleText: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary, letterSpacing: -0.45 },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingLabel: { fontSize: 14, color: Colors.textPrimary },
  settingValue: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  sliderTrack: { height: 8, backgroundColor: Colors.bgInput, borderRadius: 4, position: 'relative', marginTop: 12 },
  sliderFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  sliderThumb: {
    position: 'absolute', top: -6, width: 20, height: 20,
    backgroundColor: Colors.primary, borderWidth: 3, borderColor: '#fff',
    borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
    marginLeft: -10,
  },

  inputWrap: { position: 'relative' },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  inputSuffix: { position: 'absolute', right: 16, top: 16, fontSize: 14, color: '#797b78' },

  logoutBtn: {
    backgroundColor: 'rgba(253,121,90,0.1)', borderRadius: 16,
    paddingVertical: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  logoutText: { fontSize: 16, color: Colors.textDanger },
  version: { textAlign: 'center', fontSize: 12, color: '#797b78', textTransform: 'uppercase', letterSpacing: 1.2 },
});
