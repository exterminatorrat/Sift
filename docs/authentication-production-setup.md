# Sift Production Authentication Setup

Status: engineering setup guide. Apple Developer and App Store configuration still require the project owner.

## What is already implemented

- Supabase sessions are stored in SecureStore, backed by iOS Keychain.
- Development builds can silently create an anonymous Supabase user for authenticated AI requests.
- The app sends the user's Supabase access token to `analyze-menu`; it never uses a service-role key in the app.
- The Edge Function validates the token before parsing the image or claiming AI quota.
- Native Apple sign-in uses a nonce and state, links an existing anonymous user when present, and saves Apple's one-time name response to Supabase metadata.
- `analyze-menu` is pinned to `verify_jwt = true` in `supabase/config.toml`.
- The deployed backend smoke test verifies anonymous sign-in, the unauthenticated `401` boundary, malformed authenticated requests, and the short-window request throttle without calling the AI provider.

The remote project intentionally still allows anonymous authenticated users while development and live evals are running. This is not the final public-release posture.

## Values that belong in the app build

These are public client configuration values, not secret server keys:

```text
EXPO_PUBLIC_ANALYSIS_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<Supabase publishable or legacy anon key>
EXPO_PUBLIC_REQUIRE_APPLE_SIGN_IN=true
```

Never place the Supabase service-role key, Apple signing key, Apple client secret, or Gemini key in an `EXPO_PUBLIC_` variable.

## Apple Developer steps

1. Finalize the iOS bundle identifier before creating the Apple App ID. The current repository value is `app.sift.mvp` and must be confirmed before release.
2. Join the Apple Developer Program.
3. Create or update the App ID for that exact bundle identifier and enable Sign in with Apple.
4. Keep `ios.usesAppleSignIn = true` and the `expo-apple-authentication` config plugin enabled in `app.json`.
5. Build a standalone development or TestFlight build and test on a physical iPhone.

## Supabase dashboard steps

1. Open Authentication > Providers > Apple.
2. Enable Apple and enter the identifier/configuration required by the native Apple provider setup.
3. Enable manual identity linking so a development anonymous user can be upgraded without changing its Supabase user ID.
4. Keep Anonymous Sign-Ins enabled only while development builds need them. Add CAPTCHA before any public anonymous-auth release.
5. Set the Edge Function secret `REQUIRE_DURABLE_AUTH=true` for production after Apple sign-in is working.
6. Deploy `analyze-menu` with JWT verification enabled.

For the production build, enable both gates together: `EXPO_PUBLIC_REQUIRE_APPLE_SIGN_IN=true` in the signed app build and `REQUIRE_DURABLE_AUTH=true` in the Edge Function. Enabling only the client flag is not a server-side security boundary.

The native-only Apple flow does not put an Apple secret in the app. OAuth/web configuration may require an Apple client secret and periodic rotation; keep that material in Apple/Supabase server configuration only.
