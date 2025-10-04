import {ConfigContext, ExpoConfig} from '@expo/config';
import {config as loadEnv} from 'dotenv';
import {existsSync} from 'fs';
import path from 'path';

const KNOWN_PROFILES = ['development', 'preview', 'production'] as const;

type BuildProfile = (typeof KNOWN_PROFILES)[number];

const resolveEnvFile = (profile: string) => path.resolve(__dirname, `.env.${profile}`);

const applyEnvironmentVariables = (profile: string) => {
  const envFile = resolveEnvFile(profile);
  if (existsSync(envFile)) {
    loadEnv({path: envFile});
  }
};

export default ({config}: ConfigContext): ExpoConfig => {
  const defaultProfile: BuildProfile = 'development';
  const requestedProfile = process.env.APP_ENV ?? process.env.EAS_BUILD_PROFILE ?? defaultProfile;
  const profile = KNOWN_PROFILES.includes(requestedProfile as BuildProfile)
    ? (requestedProfile as BuildProfile)
    : defaultProfile;

  applyEnvironmentVariables(profile);

  const featureFlags = {
    GUARD_HISTORY_LOCAL_ONLY: process.env.GUARD_HISTORY_LOCAL_ONLY ?? 'false',
    SHOW_DEBUG_PANEL: process.env.SHOW_DEBUG_PANEL ?? 'false',
  };

  const extra: Record<string, unknown> = {
    appEnv: profile,
    apiBaseUrl: process.env.API_BASE_URL ?? '',
    featureFlags,
  };

  if (process.env.EAS_PROJECT_ID) {
    extra.eas = {projectId: process.env.EAS_PROJECT_ID};
  }

  const expoConfig: ExpoConfig = {
    ...config,
    name: 'Lobbybox Guard',
    slug: 'lobbybox-guard',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'lobbyboxguard',
    userInterfaceStyle: 'automatic',
    extra,
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#ffffff',
      },
    },
    web: {
      bundler: 'metro',
    },
  };

  return expoConfig;
};
