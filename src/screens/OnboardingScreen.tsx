import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: Props) {
  const [countdown, setCountdown] = useState(12);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => (c <= 0 ? 15 : c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>PACER</Text>
      </View>

      {/* Hero Illustration */}
      <View style={styles.hero}>
        <Image source={require('../../assets/SafePath.png')} style={styles.heroImage} resizeMode="cover" />

        {/* Glass Card */}
        <View style={styles.glassCard}>
          <View style={styles.glassIcon}>
            <Ionicons name="walk" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.glassTitle}>초록불 {countdown}초</Text>
            <Text style={styles.glassDesc}>지금 건너기 안전합니다</Text>
          </View>
        </View>
      </View>

      {/* Story */}
      <View style={styles.story}>
        <Text style={styles.storyH1}>
          신호등을{'\n'}
          <Text style={{ color: Colors.primary }}>놓치지 마세요</Text>
        </Text>
        <Text style={styles.storyP}>
          실시간 신호등 정보를 확인하고{'\n'}더 빠르고 안전하게 이동하세요.
        </Text>
      </View>

      {/* Bottom */}
      <View style={styles.bottom}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.ctaText}>시작하기</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primaryText} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 32,
  },
  logo: { fontWeight: '800', fontSize: 20, color: Colors.primary, letterSpacing: 2 },

  hero: {
    marginHorizontal: 32, marginTop: 20, height: 360, borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#d3e8d2',
  },
  heroImage: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%',
  },

  glassCard: {
    position: 'absolute', bottom: 28, left: 28, right: 28,
    backgroundColor: 'rgba(250,249,246,0.85)', borderRadius: 24,
    padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  glassIcon: {
    width: 48, height: 48, backgroundColor: Colors.primary, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  glassTitle: { fontSize: 18, fontWeight: '500', color: Colors.textPrimary, marginBottom: 2 },
  glassDesc: { fontSize: 14, color: Colors.textSecondary },

  story: { paddingHorizontal: 32, paddingTop: 28 },
  storyH1: { fontSize: 34, fontWeight: '500', color: Colors.textPrimary, lineHeight: 38, letterSpacing: -0.9 },
  storyP: { marginTop: 16, fontSize: 17, color: 'rgba(93,96,92,0.8)', lineHeight: 26 },

  bottom: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 40 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 20, paddingHorizontal: 40,
    borderRadius: 9999, alignSelf: 'flex-start',
  },
  ctaText: { fontSize: 16, fontWeight: '500', color: Colors.primaryText },
});
