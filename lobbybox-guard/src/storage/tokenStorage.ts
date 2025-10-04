import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'lobbybox_guard_access_token';
const REFRESH_TOKEN_KEY = 'lobbybox_guard_refresh_token';

let inMemoryAccessToken: string | null = null;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export const tokenStorage = {
  getAccessToken: async (): Promise<string | null> => {
    if (inMemoryAccessToken) {
      return inMemoryAccessToken;
    }

    const storedToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    inMemoryAccessToken = storedToken;
    return storedToken;
  },
  setTokens: async ({accessToken, refreshToken}: AuthTokens): Promise<void> => {
    inMemoryAccessToken = accessToken;
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  },
  setAccessToken: async (accessToken: string): Promise<void> => {
    inMemoryAccessToken = accessToken;
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },
  getRefreshToken: async (): Promise<string | null> => {
    const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return token ?? null;
  },
  clear: async (): Promise<void> => {
    inMemoryAccessToken = null;
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
