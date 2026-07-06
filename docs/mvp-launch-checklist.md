# Sift MVP Launch Checklist

Last updated: Draft

Use this as the working checklist for getting Sift from current MVP prototype to private beta, TestFlight, and public launch.

## Current State

- [x] Static mobile MVP prototype exists.
- [x] Core screens exist: onboarding, home, profile, scan flow, results, dish detail, history, settings.
- [x] Local-first profile and scan history persistence exists.
- [x] Camera/photo picker flow exists.
- [x] Minimal warm UI theme is in place.
- [x] Multiple allergy profiles exist.
- [x] Scan history supports individual deletion.
- [x] Basic permission copy exists in `app.json`.
- [x] Draft privacy policy and terms exist.
- [ ] AI analysis is production-reliable.
- [ ] Cost and abuse controls are production-ready.
- [ ] App Store/TestFlight setup is complete.

## Phase 1: AI Pipeline

- [x] Choose initial dev AI provider.
- [x] Add Gemini provider support in Supabase Edge Function.
- [ ] Keep NVIDIA provider as experimental fallback if useful.
- [ ] Keep OpenAI provider as paid fallback/eval baseline.
- [x] Ensure app sends image, allergy profile, and restaurant language to Edge Function.
- [x] Ensure Edge Function calls provider server-side only.
- [x] Validate AI response against strict schema before returning to app.
- [x] Return calm `unclear` result for malformed responses.
- [x] Return calm `unclear` result for timeout/provider failure.
- [x] Confirm no AI API keys are stored in the client app.
- [x] Deploy updated `analyze-menu` Edge Function to Supabase.

## Phase 2: Prompt And Schema Reliability

- [ ] Finalize system prompt.
- [ ] Finalize compact structured user prompt.
- [ ] Add strict JSON schema.
- [ ] Require `scanSummary`, `dishes`, `restaurantMessage`, and `imageQuality`.
- [ ] Require staff questions for every dish.
- [ ] Add explicit ban on "safe to eat".
- [ ] Add severe allergy escalation rules.
- [ ] Add hidden-risk rules for sauces, broths, marinades, fryers, oils, garnishes, and cross-contact.
- [ ] Add unreadable/blurry image rules.
- [ ] Add translation rules for restaurant-facing messages.
- [ ] Add automated validation for forbidden phrases.

## Phase 3: AI Eval Set

- [ ] Create local eval folder.
- [ ] Japanese ramen menu test: peanut/sesame severe profile.
- [ ] Mexican menu test: mole, dairy, egg, sesame, peanut.
- [ ] Blurry menu test.
- [ ] Direct allergen listed test.
- [ ] Vague sauce/fryer test.
- [ ] Severe versus mild allergy comparison test.
- [ ] Multilingual menu test.
- [ ] No-allergy-profile edge case.
- [ ] Define pass/fail criteria.
- [ ] Run evals against Gemini.
- [ ] Run evals against NVIDIA model if available.
- [ ] Run evals against OpenAI fallback if budget allows.
- [ ] Pick production candidate based on actual outputs.

## Phase 4: Cost And Abuse Protection

- [ ] Require Supabase auth or anonymous auth before public AI access.
- [ ] Add per-user or per-device daily scan limit.
- [ ] Add per-minute rate limit.
- [x] Add maximum image payload size.
- [x] Add request body validation before provider call.
- [x] Add provider timeout.
- [x] Add max output token limit.
- [ ] Add provider spend caps where supported.
- [ ] Avoid logging full allergy profiles.
- [ ] Avoid logging uploaded image data.
- [ ] Add clear user-facing retry/error states.

## Phase 5: Security Review

- [ ] Run repository security scan.
- [ ] Review Supabase Edge Function secrets handling.
- [ ] Review Supabase RLS/auth assumptions.
- [ ] Review public anon key usage.
- [ ] Review request validation and rate limiting.
- [ ] Review logging for sensitive allergy data.
- [ ] Review account/session handling.
- [ ] Review dependency audit results.
- [ ] Fix high/critical findings before beta.

## Phase 6: App Store And TestFlight

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

## Phase 7: Legal, Domain, And Support

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

## Phase 8: Reliability QA

- [ ] First launch -> onboarding -> profile -> home.
- [ ] Add/edit/delete allergies.
- [ ] Add custom allergen details.
- [ ] Switch saved profiles.
- [ ] Delete saved profile.
- [ ] Camera permission accepted.
- [ ] Camera permission denied.
- [ ] Photo library permission accepted.
- [ ] Photo library permission denied.
- [ ] Scan photo -> preview -> analysis -> results.
- [ ] Upload photo -> preview -> analysis -> results.
- [ ] Tap dish -> detail -> back.
- [ ] Open scan from history -> results -> back to history.
- [ ] Clear scan history.
- [ ] Slow network.
- [ ] No network.
- [ ] Large image.
- [ ] Unreadable image.
- [ ] App backgrounded during analysis.
- [ ] App relaunched with saved profile/history.

## Phase 9: Observability

- [ ] Add client crash reporting.
- [ ] Add Edge Function error logging without sensitive payloads.
- [ ] Track AI provider failures.
- [ ] Track timeout count.
- [ ] Track malformed response count.
- [ ] Track unclear fallback count.
- [ ] Track average analysis latency.
- [ ] Track rough cost per scan.

## Phase 10: Paid Launch Readiness

- [ ] Define free scan limit.
- [ ] Define Plus plan.
- [ ] Define Family plan.
- [ ] Decide whether Travel Pack is separate or included.
- [ ] Add App Store subscriptions.
- [ ] Add entitlement checks.
- [ ] Add subscription restore flow.
- [ ] Add subscription unavailable state until payments are ready.
- [ ] Recalculate margins using actual token/image usage.

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
