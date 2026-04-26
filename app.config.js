module.exports = ({ config }) => ({
  ...config,
  plugins: [
    'expo-build-properties',
    [
      '@react-native-seoul/kakao-login',
      { kakaoAppKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY },
    ],
    'expo-web-browser',
  ],
});
