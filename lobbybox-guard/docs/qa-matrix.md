# QA Matrix

The following matrix captures the minimum regression surface we exercise prior to publishing any TestFlight or Play Store build. Each scenario must pass on at least one real device *and* one simulator/emulator for both platforms.

| Scenario | iOS Real Device | iOS Simulator | Android Real Device | Android Emulator | Notes |
| --- | --- | --- | --- | --- | --- |
| Login / Logout |  |  |  |  | Validate new install → login → guarded logout. Capture push notification registration logs. |
| Capture Online |  |  |  |  | Take a photo, attach metadata, confirm immediate sync. |
| Capture Offline & Queue Sync |  |  |  |  | Enable airplane mode, capture queued items, then disable connectivity and ensure the queue drains. |
| Today Refresh |  |  |  |  | Pull-to-refresh on the dashboard updates guard assignments and queue counts. |
| History Filters |  |  |  |  | Exercise date range + status filters; paginate beyond one page. |
| Profile Update |  |  |  |  | Edit phone number and change password; verify reauthentication prompts. |
| Theme Persistence |  |  |  |  | Toggle light/dark mode, restart the app, and confirm theme is preserved. |
| Token Refresh (Session) |  |  |  |  | Force refresh token rotation by expiring access tokens server-side during an active session. |
| Token Refresh (Queued Upload) |  |  |  |  | Expire tokens while offline captures are queued; confirm retry uses refreshed credentials without dropping payloads. |

Use the remarks column to record build numbers, account IDs, and any anomalies detected during the run.
