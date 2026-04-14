import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: '@pacer/accessToken',
  USER_INFO:    '@pacer/userInfo',
};

export const storage = {
  saveToken: (token: string) => AsyncStorage.setItem(KEYS.ACCESS_TOKEN, token),
  getToken:  () => AsyncStorage.getItem(KEYS.ACCESS_TOKEN),
  saveUser:  (user: object) => AsyncStorage.setItem(KEYS.USER_INFO, JSON.stringify(user)),
  getUser:   async () => {
    const raw = await AsyncStorage.getItem(KEYS.USER_INFO);
    return raw ? JSON.parse(raw) : null;
  },
  clear: () => AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.USER_INFO]),
};
