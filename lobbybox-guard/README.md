# Lobbybox Guard

Foundational React Native (0.74) application targeting security guards. Built with the community CLI template (TypeScript) structure and pre-wired with navigation, authentication, API client, React Query, theming, and secure token storage.

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

> **Note:** Native iOS/Android projects are not included in this repository snapshot. Generate them with `npx @react-native-community/cli init lobbybox-guard --template react-native-template-typescript` if you need native build scaffolding.

## Configuration

Create an `.env` (or update `src/config/env.ts`) to point to your backend API.

```ts
export const API_BASE_URL = 'https://your-api.example.com';
```

Tokens are persisted as follows:

- Access token: memory + AsyncStorage
- Refresh token: Keychain (iOS) / Secure storage (Android)

The Axios client auto-refreshes once per 401 response, then clears credentials and emits a logout event.

## Theming

The light theme defaults to corporate yellow (Amber 600/700) with an Indigo 700 secondary accent. Toggle between light and dark mode in the Profile tab—your choice persists locally.
