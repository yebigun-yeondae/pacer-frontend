import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

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
        <Text style={styles.logo}>SAFE PATHS</Text>
        <Pressable onPress={() => navigation.replace('Auth')}>
          <Text style={styles.skip}>SKIP</Text>
        </Pressable>
      </View>

      {/* Hero Illustration */}
      <View style={styles.hero}>
        <View style={styles.heroBlur1} />
        <View style={styles.heroBlur2} />

        {/* Traffic Light */}
        <View style={styles.trafficLight}>
          <View style={[styles.light, { backgroundColor: '#444' }]} />
          <View style={[styles.light, { backgroundColor: '#444' }]} />
          <View style={[styles.light, styles.greenLight]} />
        </View>

        {/* Person */}
        <View style={styles.personWrap}>
          <View style={styles.personHair} />
          <View style={styles.personHead} />
          <View style={styles.personBody} />
          <View style={styles.personLegs}>
            <View style={[styles.personLeg, { transform: [{ rotate: '-10deg' }] }]} />
            <View style={[styles.personLeg, { transform: [{ rotate: '10deg' }] }]} />
          </View>
        </View>

        {/* Crosswalk */}
        <View style={styles.crosswalk}>
          {[0, 1, 2, 3, 4].map(i => (
            <View key={i} style={styles.stripe} />
          ))}
        </View>

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
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotInactive]} />
          <View style={[styles.dot, styles.dotInactive]} />
        </View>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
          onPress={() => navigation.replace('Auth')}
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
  skip: { fontSize: 14, fontWeight: '500', color: 'rgba(93,96,92,0.6)', letterSpacing: 0.35 },

  hero: {
    marginHorizontal: 32, marginTop: 20, height: 360, borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#d3e8d2',
  },
  heroBlur1: {
    position: 'absolute', width: 256, height: 256, right: -48, top: -48,
    backgroundColor: 'rgba(211,232,210,0.3)', borderRadius: 128,
  },
  heroBlur2: {
    position: 'absolute', width: 192, height: 192, left: -32, bottom: -32,
    backgroundColor: 'rgba(241,232,207,0.4)', borderRadius: 96,
  },
  trafficLight: {
    position: 'absolute', top: 30, right: 30, width: 36, height: 90,
    backgroundColor: '#303330', borderRadius: 8, alignItems: 'center',
    justifyContent: 'center', gap: 8, padding: 8,
  },
  light: { width: 20, height: 20, borderRadius: 10 },
  greenLight: { backgroundColor: '#4ade80' },

  personWrap: { position: 'absolute', bottom: 50, left: width / 2 - 80, width: 160, height: 260 },
  personHair: { position: 'absolute', bottom: 200, left: 54, width: 52, height: 28, backgroundColor: '#3a2820', borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  personHead: { position: 'absolute', bottom: 180, left: 56, width: 48, height: 48, borderRadius: 24, backgroundColor: '#f5d5b8' },
  personBody: { position: 'absolute', bottom: 50, left: 50, width: 60, height: 130, backgroundColor: '#4a6b4e', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  personLegs: { position: 'absolute', bottom: 0, left: 48, flexDirection: 'row', gap: 4 },
  personLeg: { width: 16, height: 55, backgroundColor: Colors.primary, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },

  crosswalk: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 50,
    flexDirection: 'row', gap: 12, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  stripe: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 4 },

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
  dots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 32, backgroundColor: Colors.primary },
  dotInactive: { width: 6, backgroundColor: '#e1e3de' },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 20, paddingHorizontal: 40,
    borderRadius: 9999, alignSelf: 'flex-start',
  },
  ctaText: { fontSize: 16, fontWeight: '500', color: Colors.primaryText },
});
