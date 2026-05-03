import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as KakaoLogin from "@react-native-seoul/kakao-login";
import { Colors } from "../theme/colors";
import { loginWithKakao } from "../api/authApi";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Auth">;
};

export default function AuthScreen({ navigation }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) {
      Alert.alert("", "이메일을 입력해주세요");
      return;
    }
    if (password.length < 4) {
      Alert.alert("", "비밀번호를 4자 이상 입력해주세요");
      return;
    }
    if (!isLogin && password !== passwordConfirm) {
      Alert.alert("", "비밀번호가 일치하지 않습니다");
      return;
    }
    navigation.replace("MainTabs");
  };

  const handleSocialLogin = async (provider: string) => {
    if (provider === "kakao") {
      try {
        setLoading(true);

        // 1단계: 웹 브라우저 로그인으로 동의 창 강제 표시
        try {
          await KakaoLogin.logout();
        } catch (_) {}
        const kakaoResult = await KakaoLogin.loginWithKakaoAccount();
        console.log("[Kakao] 토큰 획득:", kakaoResult.accessToken);

        // 2단계: 카카오 프로필 조회
        const profile = await KakaoLogin.getProfile();
        console.log("[Kakao] 프로필:", profile);

        // 3단계: 백엔드로 카카오 토큰 전달 → 서버 JWT 수신
        try {
          const authData = await loginWithKakao({
            accessToken: kakaoResult.accessToken,
          });
          console.log("[Backend] 응답:", JSON.stringify(authData));
          Alert.alert("로그인 성공!", `로그인되었습니다!`, [
            { text: "확인", onPress: () => navigation.replace("MainTabs") },
          ]);
        } catch (backendErr: any) {
          // 백엔드 미연동 상태 — 카카오 인증만으로 진행
          console.warn("[Backend] 미연동:", backendErr.message);
          const displayName =
            profile.nickname || (profile as any).email || "사용자";
          Alert.alert("카카오 로그인 성공!", `환영합니다, ${displayName}님!`, [
            { text: "확인", onPress: () => navigation.replace("MainTabs") },
          ]);
        }
      } catch (err: any) {
        if (err.code !== "E_CANCELLED_OPERATION") {
          Alert.alert(
            "로그인 실패",
            err.message || "카카오 로그인 중 오류가 발생했습니다.",
          );
        }
      } finally {
        setLoading(false);
      }
      return;
    }
    Alert.alert(`${provider} 로그인`, "준비 중입니다.");
  };

  const switchTab = (login: boolean) => {
    setIsLogin(login);
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Decorative blurs */}
        <View style={styles.blur1} />
        <View style={styles.blur2} />

        {/* Back */}
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </Pressable>

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Ionicons name="location" size={22} color={Colors.primary} />
          </View>
        </View>

        {/* Auth Container */}
        <View style={styles.authContainer}>
          {/* Toggle */}
          <View style={styles.toggle}>
            <Pressable
              style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
              onPress={() => switchTab(true)}
            >
              <Text
                style={[styles.toggleText, isLogin && styles.toggleTextActive]}
              >
                로그인
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
              onPress={() => switchTab(false)}
            >
              <Text
                style={[styles.toggleText, !isLogin && styles.toggleTextActive]}
              >
                회원가입
              </Text>
            </Pressable>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>이메일 주소</Text>
              <TextInput
                style={styles.input}
                placeholder="example@mail.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>비밀번호</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
            {!isLogin && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>비밀번호 확인</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  secureTextEntry
                />
              </View>
            )}

            {isLogin && (
              <View style={styles.options}>
                <Pressable
                  style={styles.checkbox}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      rememberMe && styles.checkboxChecked,
                    ]}
                  >
                    {rememberMe && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>로그인 유지</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    Alert.alert("", "비밀번호 재설정 이메일을 보냈습니다")
                  }
                >
                  <Text style={styles.link}>비밀번호 찾기</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.9 },
              ]}
              onPress={handleSubmit}
            >
              <Text style={styles.submitText}>
                {isLogin ? "로그인" : "회원가입"}
              </Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는 소셜 계정으로 로그인</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social */}
          <View style={styles.socialRow}>
            <Pressable
              style={[styles.socialBtn, { backgroundColor: Colors.bgCard }]}
              onPress={() => handleSocialLogin("Google")}
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" />
            </Pressable>
            <Pressable
              style={[styles.socialBtn, { backgroundColor: Colors.bgCard }]}
              onPress={() => handleSocialLogin("Apple")}
            >
              <Ionicons name="logo-apple" size={20} color="#303330" />
            </Pressable>
            <Pressable
              style={[
                styles.socialBtn,
                { backgroundColor: Colors.kakaoYellow },
                loading && { opacity: 0.7 },
              ]}
              onPress={() => handleSocialLogin("kakao")}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#3C1E1E" />
              ) : (
                <Ionicons
                  name="chatbubble-ellipses"
                  size={20}
                  color="#3C1E1E"
                />
              )}
            </Pressable>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingTop: 49, paddingHorizontal: 24, paddingBottom: 40 },
  blur1: {
    position: "absolute",
    width: 156,
    height: 156,
    right: -20,
    top: -89,
    backgroundColor: "rgba(241,232,207,0.3)",
    borderRadius: 78,
  },
  blur2: {
    position: "absolute",
    width: 117,
    height: 117,
    left: -20,
    bottom: -45,
    backgroundColor: "rgba(211,232,210,0.2)",
    borderRadius: 59,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brand: { alignItems: "center", marginBottom: 24 },
  brandIcon: {
    width: 64,
    height: 53,
    backgroundColor: Colors.bgInput,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  authContainer: {
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 33,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.03,
    shadowRadius: 32,
    elevation: 4,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: Colors.bgCard,
    borderRadius: 9999,
    padding: 6,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: { fontSize: 14, fontWeight: "500", color: Colors.textSecondary },
  toggleTextActive: { color: Colors.primary },

  form: { gap: 20 },
  formGroup: { gap: 8 },
  formLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    paddingLeft: 16,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: Colors.textPrimary,
  },

  options: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  checkbox: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: { fontSize: 12, color: Colors.textSecondary },
  link: { fontSize: 12, color: Colors.primary },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitText: { fontSize: 16, fontWeight: "500", color: Colors.primaryText },

  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(176,179,174,0.15)",
  },
  dividerText: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  socialRow: { flexDirection: "row", gap: 16 },
  socialBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
