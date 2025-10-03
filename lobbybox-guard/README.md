# Lobbybox Guard

Foundational React Native (0.74) application targeting security guards. Built with the community CLI template (TypeScript) structure and pre-wired with navigation, authentication, API client, React Query, theming, and secure token storage.

---

## Platform Hardening Checklist

The native projects are intentionally excluded from this repository snapshot (see note below). Once you generate the iOS and Android folders, apply the following hardening items before archiving release builds:

### iOS (`ios/LobbyboxGuard/Info.plist`)

```xml
<key>NSCameraUsageDescription</key>
<string>The camera is required so guards can capture site photos.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Lobbybox Guard saves captures to your photo library when requested.</string>
```

Configure Reanimated and Gesture Handler per the [official installation guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/) by adding `pod 'RNReanimated', :path => '../node_modules/react-native-reanimated'` to `Podfile`, enabling the new architecture flags that ship with 0.74, and adding `RCTAppSetupPrepareApp(application, launchOptions);` in `AppDelegate.mm`.

### Android (`android/app/src/main/AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.CAMERA" />

<application
  android:requestLegacyExternalStorage="false"
  android:allowBackup="false"
  ...>
  <provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
      android:name="android.support.FILE_PROVIDER_PATHS"
      android:resource="@xml/file_paths" />
  </provider>
</application>
```

Store capture payloads inside scoped storage (`context.getExternalFilesDir`) and expose URIs through the `FileProvider`. Also update `MainApplication.java` per the Reanimated/Gesture Handler docs (`SoLoader.init`, `ReactNativeHost.getJSIModulePackage`, and `ReactActivity` delegate usage).

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Run Metro and the target platform

```bash
# Start Metro bundler
npm run start

# Launch Android
npm run android

# Launch iOS
npm run ios
```

> **Note:** Native iOS/Android projects are not included in this repository snapshot by default. Run [`scripts/setup-native.sh`](./scripts/setup-native.sh) to scaffold them locally using the React Native CLI (`npx react-native@0.74.3 init ...`). The helper script mirrors the TypeScript template and copies the generated `android` and `ios` directories into this workspace. The React Native CLI requires the project name to be alphanumeric, so avoid hyphens or other punctuation when choosing the identifier.

## Configuration

Runtime configuration lives in `src/config/env.ts`. The module exposes three environments (`debug`, `staging`, `production`) with distinct API hosts and allows the native shells to override values at runtime.

| Environment | Default Host | Usage |
| --- | --- | --- |
| debug | `http://localhost:3000` (iOS) / `http://10.0.2.2:3000` (Android) | Local development builds (`npm run ios` / `npm run android`). |
| staging | `https://staging.api.lobbybox.app` | Manual QA, TestFlight internal, Play Store closed testing. |
| production | `https://api.lobbybox.app` | Public release builds distributed to guards. |

The native shells can set `global.__APP_CONFIG = { env: 'staging', apiBaseUrl: 'https://staging.example.com' }` **before** the React instance boots to override defaults. See inline documentation in `src/config/env.ts` for helper functions.

Tokens are persisted as follows:

- Access token: memory + AsyncStorage
- Refresh token: Keychain (iOS) / Secure storage (Android)

The Axios client auto-refreshes once per 401 response, then clears credentials and emits a logout event.

## Theming

The light theme defaults to corporate yellow (Amber 600/700) with an Indigo 700 secondary accent. Toggle between light and dark mode in the Profile tab—your choice persists locally.

## Visual Assets

Brand artwork lives under [`assets/`](./assets):

- `app-icon.svg` — 1024×1024 icon source used to derive the platform-specific assets.
- `splash.svg` — Portrait splash graphic (yellow background and shield lockup).

Use Xcode Asset Catalogs (via [App Icon & Top Shelf](https://developer.apple.com/design/human-interface-guidelines/app-icons) templates) and Android's `mipmap-` directories to rasterize the source artwork for all required sizes. For splash screens, pipe the SVG through your preferred rasterizer (e.g. Inkscape, Figma) and integrate with `LaunchScreen.storyboard` / `android/app/src/main/res/drawable/splash.xml`.

## Release Management

1. **Android**
   - Generate a keystore (`keytool -genkeypair ...`) and register it inside `android/app/build.gradle` under `signingConfigs.release`.
   - Configure the `release` buildType to consume the keystore and enable resource shrinking.
   - Produce the Android App Bundle: `cd android && ./gradlew bundleRelease`.
   - Upload the resulting `app-release.aab` to the Play Console (Internal or Closed testing track) and attach the QA checklist below.
2. **iOS**
   - Configure automatic signing in Xcode with the Lobbybox Guard team/provisioning profile.
   - Archive via `Product → Archive`, export the build to TestFlight, and assign it to the QA group.

## QA Checklist

Use [`docs/qa-matrix.md`](./docs/qa-matrix.md) to record pass/fail results. Every row must be executed on at least one iOS device + simulator and one Android device + emulator before the release candidate is approved.
