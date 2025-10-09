# Parcel Flow UI & Validation Updates

## Summary
- Tightened spacing across capture preview, confirmation, and success steps so content starts within 8px of the safe area while still filling the viewport.
- Added an indeterminate loader to the **Use Photo** button and prevented repeat submissions during photo processing.
- Hid the raw OCR text editor on the confirmation screen and enforced mandatory field validation with inline messaging.
- Updated the remark label to **Remark/Unit** everywhere in the parcel confirmation step.

## Validation Rules
| Field | Requirement |
| --- | --- |
| Tracking number | Required, trimmed of excess whitespace. |
| Recipient name | Required, trimmed of excess whitespace. |
| Mobile number | Required, digits only, length 9–11 after trimming. |
| Remark/Unit | Required, trimmed of excess whitespace. |

Validation failures surface inline beneath each field, focus the first invalid control, and block parcel submission until all four fields pass.

## UX Behaviours
- The **Use Photo** action disables itself and shows a “Processing…” spinner until uploads and OCR complete (success or failure).
- Confirmation and preview scroll containers grow to fill the viewport, preventing clipped layouts on short screens while keeping top padding minimal.
- Save actions scroll/focus to the first invalid field, ensuring guards can correct issues quickly on handheld devices.

## Testing
- Automated tests cover happy/invalid validation paths and the Use Photo button loader state (`npm run test`).
- Manual checks recommended:
  - Exercise the parcel flow on small and large form factors.
  - Attempt to save with each mandatory field empty and with invalid mobile numbers.
  - Confirm loader visibility when choosing **Use Photo**.
