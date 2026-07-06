# Sift MVP Reliability Checklist

Last updated: July 6, 2026

Use this as the working checklist for getting Sift from the current MVP to a stable private beta, then TestFlight, then public launch.

Current priority: make the app reliable and testable before doing more AI pipeline work.

## Scope For This Pass

- [x] Keep the current mobile app local-first.
- [x] Keep the current Supabase AI function available for testing.
- [x] Do not expand the AI provider pipeline in this reliability pass.
- [ ] Fix user-visible crashes before adding new features.
- [ ] Make every core flow recover gracefully from permissions, network failure, empty state, and bad saved data.
- [ ] Build a repeatable manual QA checklist for iPhone XR and one newer iPhone size.

## Current State

- [x] Static mobile MVP prototype exists.
- [x] Core screens exist: onboarding, home, profile, scan flow, results, dish detail, history, settings.
- [x] Local-first profile and scan history persistence exists.
- [x] Camera/photo picker flow exists.
- [x] Minimal warm UI theme is in place.
- [x] Multiple allergy profiles exist.
- [x] Scan history supports individual deletion.
- [x] Scan history delete has confirmation.
- [x] Scan history delete animates out before removal.
- [x] Scan history rename uses a custom in-app dialog.
- [x] Basic permission copy exists in `app.json`.
- [x] Draft privacy policy and terms exist.
- [ ] App has been tested cleanly after a fresh Expo cache reset.
- [ ] App has been tested cleanly after deleting all local app data.
- [ ] App has been tested cleanly on iPhone XR.
- [ ] App has been tested cleanly on at least one newer iPhone size.
- [ ] App Store/TestFlight setup is complete.

## Phase 1: Crash And Runtime Stability

- [ ] Clear Expo/Metro cache and verify no stale runtime references remain.
- [ ] Launch app from a cold start without a crash.
- [ ] Relaunch app after force close without a crash.
- [ ] Navigate Home -> Profile -> History repeatedly without layout snap or crash.
- [ ] Open scan history with zero scans.
- [ ] Open scan history with one scan.
- [ ] Open scan history with many scans.
- [ ] Long-press scan card and dismiss action menu.
- [ ] Long-press scan card and rename scan.
- [ ] Long-press scan card and cancel delete confirmation.
- [ ] Long-press scan card and confirm delete.
- [ ] Confirm delete animation completes before saved data is removed.
- [ ] Verify deleting the last scan returns to the empty history state.
- [ ] Verify no crash when a scan has missing `restaurantName`.
- [ ] Verify no crash when a scan has empty `possibleAllergens`.
- [ ] Verify no crash when old saved scan data is missing optional fields.
- [ ] Add normalization for any saved scan shape that causes runtime errors.
- [ ] Run `npm.cmd run typecheck` after every reliability change.

## Phase 2: Local Data Reliability

- [x] Normalize suspicious future scan timestamps.
- [x] Generate short fallback scan titles.
- [ ] Add defensive defaults for malformed stored profiles.
- [ ] Add defensive defaults for malformed stored scan history.
- [ ] Validate selected active profile still exists after profile deletion.
- [ ] Verify deleting active profile switches to another profile or creates a default profile.
- [ ] Verify app handles empty profile name.
- [ ] Verify app handles allergen with empty notes/custom details.
- [ ] Verify app handles duplicate allergen names.
- [ ] Verify app handles long allergen names without text clipping.
- [ ] Verify scan history persists after app reload.
- [ ] Verify renamed scans persist after app reload.
- [ ] Verify deleted scans stay deleted after app reload.
- [ ] Verify clear history action cannot accidentally wipe profiles.

## Phase 3: Permission Reliability

- [x] Camera permission copy exists.
- [x] Photo library permission copy exists.
- [ ] Camera permission accepted -> camera opens.
- [ ] Camera permission denied -> calm retry/settings state appears.
- [ ] Photo library permission accepted -> library opens.
- [ ] Photo library permission denied -> calm retry/settings state appears.
- [ ] User cancels camera -> returns without crash.
- [ ] User cancels photo picker -> returns without crash.
- [ ] User selects unsupported/invalid image -> graceful error.
- [ ] User selects very large image -> image preprocessing still completes or shows retry.
- [ ] App backgrounded during picker -> returns without broken navigation.

## Phase 4: Navigation And Motion Reliability

- [x] Main tabs use smooth transitions.
- [x] Scan History context menu uses focused-card interaction.
- [x] Scan History context menu has animated dismiss.
- [ ] Verify tab transitions never show vertical snap on iPhone XR.
- [ ] Verify Home/Profile/History keep correct scroll position behavior.
- [ ] Verify Results back button returns to History when opened from History.
- [ ] Verify Results back button returns to Home when opened from Home.
- [ ] Verify Dish Detail back returns to Results.
- [ ] Verify Settings detail screens back returns to Settings.
- [ ] Verify modals do not stack behind each other.
- [ ] Verify tapping outside modals dismisses only the active modal.
- [ ] Verify keyboard does not cover rename dialog input.
- [ ] Verify animations remain smooth with 20 saved scans.

## Phase 5: UI Robustness

- [ ] Verify no clipped text on iPhone XR.
- [ ] Verify no clipped text with largest common scan titles.
- [ ] Verify no clipped text with Chinese, Japanese, Korean, Thai, German, and Portuguese UI.
- [ ] Verify profile name input text is vertically centered.
- [ ] Verify custom allergen input text is vertically centered.
- [ ] Verify allergy cards expand/collapse smoothly.
- [ ] Verify long custom allergy details do not break profile layout.
- [ ] Verify bottom navigation never overlaps primary actions.
- [ ] Verify floating save button does not cover profile content.
- [ ] Verify loading screen copy rotates without layout jump.
- [ ] Verify all destructive actions use red/destructive styling consistently.

## Phase 6: Language Reliability

- [x] Wave 1 languages are selectable.
- [x] Language names display in their own language where intended.
- [x] Scan language note appears in Language settings.
- [ ] Profile screen is fully translated for all supported languages.
- [ ] History screen is fully translated for all supported languages.
- [ ] Settings screens are fully translated for all supported languages.
- [ ] Results screen is fully translated for all supported languages.
- [ ] Dish detail screen is fully translated for all supported languages.
- [ ] Date/time formatting follows selected app language.
- [ ] Allergen tags use selected app language when possible.
- [ ] Past scan detail language limitation is clear to users.
- [ ] Restaurant language supports `Not sure`.
- [ ] Restaurant language labels remain readable and consistent.

## Phase 7: Error And Empty States

- [x] Empty scan history state exists.
- [ ] Empty allergy profile prompt is clear.
- [ ] No active profile state is clear.
- [ ] No network state is clear.
- [ ] Slow analysis state is clear.
- [ ] AI/provider failure state is clear.
- [ ] Malformed response state is clear.
- [ ] Unreadable image state is clear.
- [ ] Storage read failure state is clear.
- [ ] Storage write failure state is clear.
- [ ] Every error state gives one obvious next action.

## Phase 8: Safety And Copy Reliability

- [x] Safety disclaimer appears in onboarding.
- [x] Safety disclaimer appears near scan results.
- [x] Safety disclaimer appears in settings/legal surfaces.
- [ ] No app copy says "safe to eat".
- [ ] No app copy implies a guarantee.
- [ ] Low-risk wording always says based on visible menu text.
- [ ] Severe allergy copy remains conservative.
- [ ] Staff confirmation is visible before restaurant-facing messages.
- [ ] Delete confirmation copy is clear and non-ambiguous.
- [ ] Permission copy matches actual app behavior.
- [ ] Privacy policy matches current local-first behavior.
- [ ] Terms match current safety positioning.

## Phase 9: Manual QA Script

- [ ] Fresh install -> onboarding -> profile -> home.
- [ ] Create first profile with three allergies.
- [ ] Add custom allergen details.
- [ ] Save profile and verify toast appears.
- [ ] Create second profile.
- [ ] Switch profiles.
- [ ] Delete inactive profile.
- [ ] Delete active profile.
- [ ] Tap Scan menu with no allergies.
- [ ] Tap Upload photo with no allergies.
- [ ] Add allergies, then scan menu photo.
- [ ] Retake photo from preview.
- [ ] Use photo from preview.
- [ ] Analysis loading screen appears immediately.
- [ ] Results render without clipped text.
- [ ] Tap dish -> detail -> back.
- [ ] Save scan result locally.
- [ ] Open saved scan from history.
- [ ] Rename saved scan.
- [ ] Delete saved scan with confirmation.
- [ ] Reload app and verify history/profile persisted correctly.

## Phase 10: Security And Privacy Reliability

- [ ] Run repository security scan.
- [ ] Review `.env` and `.env.example` for accidental secrets.
- [ ] Confirm no provider API keys are stored in the client app.
- [ ] Confirm Supabase anon key is the only public Supabase key in client config.
- [ ] Review Edge Function request validation.
- [ ] Review Edge Function logging for allergy/profile/image leakage.
- [ ] Avoid logging full allergy profiles.
- [ ] Avoid logging uploaded image data.
- [ ] Review auth/session assumptions.
- [ ] Review dependency audit results.
- [ ] Fix high/critical findings before TestFlight.

## Phase 11: AI Pipeline - Deferred For Now

Status: intentionally paused until the app reliability pass is complete.

- [x] Choose initial dev AI provider.
- [x] Add Gemini provider support in Supabase Edge Function.
- [x] Ensure app sends image, allergy profile, and restaurant language to Edge Function.
- [x] Ensure Edge Function calls provider server-side only.
- [x] Validate AI response against strict schema before returning to app.
- [x] Return calm `unclear` result for malformed responses.
- [x] Return calm `unclear` result for timeout/provider failure.
- [x] Confirm no AI API keys are stored in the client app.
- [x] Deploy updated `analyze-menu` Edge Function to Supabase.
- [ ] Finalize production system prompt.
- [ ] Finalize compact structured user prompt.
- [ ] Add automated validation for forbidden phrases.
- [ ] Create AI eval set.
- [ ] Run model comparison evals.
- [ ] Add per-user or per-device daily scan limit.
- [ ] Add per-minute rate limit.
- [ ] Add provider spend caps where supported.
- [ ] Pick production model based on actual eval outputs and cost.

## Phase 12: TestFlight And Public Launch

- [ ] Enroll Apple Developer Program.
- [ ] Replace bundle identifier `app.sift.mvp` with production bundle ID.
- [ ] Configure Sign in with Apple.
- [ ] Create App Store Connect app record.
- [ ] Create app icon and launch assets.
- [ ] Prepare screenshots.
- [ ] Prepare app description.
- [ ] Prepare keywords.
- [ ] Prepare support URL.
- [ ] Prepare privacy policy URL.
- [ ] Complete App Privacy Nutrition Labels.
- [ ] Build iOS preview with EAS.
- [ ] Submit TestFlight build.
- [ ] Test on real iPhone XR.
- [ ] Test on at least one newer iPhone size.

## Phase 13: Legal, Domain, And Support

- [ ] Buy/configure `siftallergy.app`.
- [ ] Set up `support@siftallergy.app`.
- [ ] Set up `feedback@siftallergy.app`.
- [ ] Host landing page.
- [ ] Host privacy policy at `/privacy`.
- [ ] Host terms of service at `/terms`.
- [ ] Host FAQ at `faq.siftallergy.app` or `/faq`.
- [ ] Review privacy policy with legal counsel before public launch.
- [ ] Review terms with legal counsel before public launch.
- [ ] Ensure all marketing avoids food safety guarantees.

## Phase 14: Paid Launch Readiness

- [ ] Define free scan limit.
- [ ] Define Plus plan.
- [ ] Define Family plan.
- [ ] Decide whether Travel Pack is separate or included.
- [ ] Add App Store subscriptions.
- [ ] Add entitlement checks.
- [ ] Add subscription restore flow.
- [ ] Add subscription unavailable state until payments are ready.
- [ ] Recalculate margins using actual scan usage and model pricing.

## Post-MVP Ideas

- [ ] Full app language expansion.
- [ ] Cloud sync.
- [ ] Saved restaurants.
- [ ] Offline allergy cards.
- [ ] PDF menu import.
- [ ] Website menu URL scanner.
- [ ] Barcode scanner.
- [ ] Emergency info card.
- [ ] Apple Watch companion.
- [ ] Cuisine-specific allergen database.
- [ ] Restaurant notes and favorites.
