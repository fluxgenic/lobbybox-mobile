# Lobbybox Guard

Expo-managed mobile shell for Lobbybox parcel guards. Phase 1 delivers the authentication flow and app scaffolding required to reach the Home and Settings screens after a successful login.

> **Note:** The project targets Expo SDK 54. Use the current Expo Go client (SDK 54) or ensure device builds are aligned before testing.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure API host and feature flags by editing `.env.development`, `.env.preview`, and `.env.production`.
   - `API_BASE_URL` must point to the versioned REST endpoint (for example `https://api.example.com/v1`).
   - `GUARD_HISTORY_LOCAL_ONLY` and `SHOW_DEBUG_PANEL` are boolean strings (`true`/`false`).
3. Launch Metro and the Expo development client:
   ```bash
   npm run start
   ```
   - Press `i`/`a` inside the Expo CLI to open iOS Simulator or Android Emulator.
   - Alternatively, build device binaries with `eas build --profile development` once your project is linked.

### Environment & feature flags

Runtime configuration is injected through `app.config.ts`, which loads the `.env.{profile}` file that matches `APP_ENV` or `EAS_BUILD_PROFILE`. Values are exposed via `src/config/env.ts`:

| Key | Description |
| --- | --- |
| `API_BASE_URL` | Base URL **including `/v1`** used by the API client for all requests. |
| `GUARD_HISTORY_LOCAL_ONLY` | Future toggle retained for compatibility; always `true` during Phase 1. |
| `SHOW_DEBUG_PANEL` | When `true`, the Settings screen renders the tester debug panel. |

### Build profiles

`eas.json` declares the standard build profiles:

- `development` – Internal builds with the Expo development client.
- `preview` – Ad hoc/QA distributions.
- `production` – Store-ready builds with auto-incremented version codes.

Set `EAS_PROJECT_ID` in your shell or CI when triggering builds so that `app.config.ts` can inject the identifier into Expo runtime extras.

## App structure

- **Authentication stack** – `LoginScreen` handles credential capture, validation, and error display.
- **App stack** – `HomeScreen` (placeholder) and `SettingsScreen` (profile summary + sign out).
- **Role gate** – Non-`GUARD` accounts see the `NotPermittedScreen` with a forced sign-out action.
- **Token handling** – Access tokens live in AsyncStorage for bootstrap speed; refresh tokens are secured with `expo-secure-store`.
- **API client** – Axios instance attaches `Authorization` headers, performs a single refresh attempt on 401, and clears the session on failure. Request IDs from error envelopes are forwarded to the debug panel.
- **Debug panel** – Controlled by `SHOW_DEBUG_PANEL`. Displays last `requestId`, persisted tokens, and includes a manual reload affordance for testers.

## Smoke checklist

- ✅ Login with a Guard account → land on Home with the display name in the header.
- ✅ Relaunch the app → session persists using stored tokens.
- ✅ Expire the access token → the client refreshes once and continues the session.
- ✅ Invalidate the refresh token → the client signs the guard out cleanly.
- ✅ Attempt login with a non-Guard role → `Not permitted` screen with Sign Out.
