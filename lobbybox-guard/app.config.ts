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

  const appVersion = config.version ?? '1.0.0';
  const buildNumberRaw =
    process.env.BUILD_NUMBER ?? process.env.EAS_BUILD_ID ?? process.env.ANDROID_VERSION_CODE ?? 'dev';
  const buildNumberValue = Number(buildNumberRaw);
  const iosBuildNumber = Number.isNaN(buildNumberValue) ? '1' : String(buildNumberValue);
  const androidVersionCode = Number.isNaN(buildNumberValue) ? 1 : Math.max(1, Math.floor(buildNumberValue));

  const featureFlags = {
    GUARD_HISTORY_LOCAL_ONLY: process.env.GUARD_HISTORY_LOCAL_ONLY ?? 'false',
    SHOW_DEBUG_PANEL: process.env.SHOW_DEBUG_PANEL ?? 'false',
  };

  const extra: Record<string, unknown> = {
    appEnv: profile,
    apiBaseUrl: process.env.API_BASE_URL ?? '',
    featureFlags,
    appVersion,
    buildNumber: Number.isNaN(buildNumberValue) ? buildNumberRaw : String(buildNumberValue),
  };

  const easProjectId = process.env.EAS_PROJECT_ID ?? 'd5e519a8-f490-4927-ae88-276b04268540';
  extra.eas = {projectId: easProjectId};

  const expoConfig: ExpoConfig = {
    ...config,
    name: 'Lobbybox Guard',
    slug: 'lobbybox-guard',
    version: appVersion,
    orientation: 'portrait',
    scheme: 'lobbyboxguard',
    userInterfaceStyle: 'automatic',
    extra,
    plugins: ['expo-camera', 'expo-file-system'],
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      buildNumber: iosBuildNumber,
      infoPlist: {
        NSCameraUsageDescription: 'Allow Lobbybox Guard to capture parcel photos for delivery records.',
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#ffffff',
      },
      versionCode: androidVersionCode,
      permissions: ['CAMERA'],
      package: "com.fluxgenic.lobbyboxguard"
    },
    web: {
      bundler: 'metro',
    },
  };

  return expoConfig;
};
