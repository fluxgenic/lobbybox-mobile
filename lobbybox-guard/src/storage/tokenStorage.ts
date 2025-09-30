import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const ACCESS_TOKEN_KEY = 'lobbybox_guard_access_token';
const REFRESH_TOKEN_SERVICE = 'lobbybox_guard_refresh_token';

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
    await Keychain.setGenericPassword('refreshToken', refreshToken, {
      service: REFRESH_TOKEN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    });
  },
  setAccessToken: async (accessToken: string): Promise<void> => {
    inMemoryAccessToken = accessToken;
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  },
  getRefreshToken: async (): Promise<string | null> => {
    const credentials = await Keychain.getGenericPassword({
      service: REFRESH_TOKEN_SERVICE,
    });
    if (!credentials) {
      return null;
    }
    return credentials.password;
  },
  clear: async (): Promise<void> => {
    inMemoryAccessToken = null;
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await Keychain.resetGenericPassword({service: REFRESH_TOKEN_SERVICE});
  },
};
