# Sift App Store Privacy Label Draft

Last updated: Draft

This draft is not legal advice. App Store Connect answers must match the final production implementation, SDKs, analytics, crash reporting, authentication, hosting, and AI providers.

Reference:

- https://developer.apple.com/app-store/app-privacy-details/

## Current MVP Data Categories

| Data category | Examples in Sift | Purpose | Linked to user? | Tracking? | Notes |
| --- | --- | --- | --- | --- | --- |
| Health or sensitive user-provided information | Allergy names, severity, cross-contact preference, custom details | App functionality, menu analysis | Possibly, if account login is enabled | No | Treat as sensitive health-adjacent data even if not a medical record. |
| Photos or user content | Selected menu photo, visible menu text, generated scan result | App functionality, AI analysis | Possibly, if account login/cloud sync is enabled | No | Sift should access only user-selected photos after user action. |
| Identifiers | Apple Sign In user identifier, Supabase user id, device/account id if enabled | Authentication, abuse prevention, support | Yes, if login is enabled | No | Local-only mode may not collect account identifiers. |
| Contact info | Apple relay email or user email if provided | Account support, authentication | Yes | No | Only applies when login/email collection is enabled. |
| Diagnostics | Crash logs, error logs, request timing, service diagnostics | App functionality, analytics, debugging, security | Possibly | No | Do not log full menu images, base64 payloads, or full allergy profiles. |
| Usage data | Scan count, feature usage, subscription state if analytics are enabled | App functionality, analytics, product reliability | Possibly | No | Only disclose if analytics are enabled in production. |

## Current Draft Position

- Sift does not sell personal information.
- Sift does not use allergy profiles or menu photos for advertising tracking.
- Sift does not request microphone, contacts, location, HealthKit, Bluetooth, calendars, or tracking permission for the MVP.
- Sift accesses the camera only after the user taps Scan Menu.
- Sift accesses selected photos only after the user taps Upload Photo.
- Sift may send the selected menu image and allergy profile details to a server-side AI analysis service.

## Before App Review

- Confirm final analytics/crash-reporting SDKs.
- Confirm final AI provider data-processing terms.
- Confirm whether Apple Sign In and cloud sync are enabled.
- Confirm whether server logs include IP addresses or account identifiers.
- Confirm account deletion and data deletion flows.
- Update App Store Connect privacy answers to match the final implementation.
