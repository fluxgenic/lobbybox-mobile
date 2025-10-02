import {Platform} from 'react-native';

export type AppEnvironment = 'debug' | 'staging' | 'production';

type RuntimeConfig = {
  env?: string;
  apiBaseUrl?: string;
};

const DEFAULT_HOSTS: Record<AppEnvironment, string> = {
  debug: Platform.select({
    ios: 'http://localhost:3000',
    android: 'http://10.0.2.2:3000',
    default: 'http://localhost:3000',
  })!,
  staging: 'https://staging.api.lobbybox.app',
  production: 'https://api.lobbybox.app',
};

let overrides: RuntimeConfig = (globalThis as any).__APP_CONFIG ?? {};

const normalizeEnv = (value?: string): AppEnvironment => {
  if (!value) {
    return __DEV__ ? 'debug' : 'production';
  }

  switch (value.toLowerCase()) {
    case 'debug':
    case 'development':
    case 'dev':
      return 'debug';
    case 'stage':
    case 'staging':
      return 'staging';
    case 'prod':
    case 'production':
      return 'production';
    default:
      return __DEV__ ? 'debug' : 'production';
  }
};

export const configureEnvironment = (config: RuntimeConfig) => {
  overrides = {
    ...overrides,
    ...config,
  };
};

export const APP_ENV: AppEnvironment = normalizeEnv(overrides.env);

const resolvedBaseUrl = overrides.apiBaseUrl ?? DEFAULT_HOSTS[APP_ENV];

export const API_BASE_URL = resolvedBaseUrl;
export const API_BASE_PATH = `${resolvedBaseUrl.replace(/\/+$/, '')}/v1`;
