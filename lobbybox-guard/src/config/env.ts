import Constants from 'expo-constants';

const {expoConfig} = Constants;
const extra = (expoConfig?.extra ?? {}) as Record<string, unknown>;

const sanitizeUrl = (value?: string): string => {
  if (!value) {
    return '';
  }
  return value.replace(/\/+$/, '');
};

const parseBoolean = (value: unknown, defaultValue: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return defaultValue;
};

export const APP_ENV = (extra.appEnv as string | undefined) ?? 'development';

export const API_BASE_URL = sanitizeUrl(extra.apiBaseUrl as string | undefined);

const rawFeatureFlags = (extra.featureFlags as Record<string, unknown> | undefined) ?? {};

export const FEATURE_FLAGS = {
  GUARD_HISTORY_LOCAL_ONLY: parseBoolean(rawFeatureFlags.GUARD_HISTORY_LOCAL_ONLY, true),
  SHOW_DEBUG_PANEL: parseBoolean(rawFeatureFlags.SHOW_DEBUG_PANEL, false),
};
