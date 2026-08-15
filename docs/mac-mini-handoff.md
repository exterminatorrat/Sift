# Sift Mac Mini Handoff

This document moves Sift development from the Windows checkout to a new Mac without putting secrets or machine-local state in GitHub.

## Repository Contents

The repository contains:

- the Expo / React Native mobile app;
- Supabase migrations and the `analyze-menu` Edge Function;
- AI reliability fixtures, benchmark tooling, and reports;
- the Astro landing page under `website/`;
- launch, authentication, safety, privacy, and legal drafts under `docs/`.

GitHub does not contain `.env` files, API keys, Apple credentials, Supabase service-role credentials, local Expo state, Codex task history, or generated evaluation output.

## Mac Setup

1. Install Xcode from the Mac App Store, open it once, accept its license, and install the requested components.
2. Install Xcode command-line tools:

   ```bash
   xcode-select --install
   ```

3. Install Homebrew from `https://brew.sh`, then install GitHub CLI and Node.js:

   ```bash
   brew install gh node
   gh auth login
   ```

4. Clone Sift and install both dependency sets:

   ```bash
   git clone https://github.com/exterminatorrat/Sift.git
   cd Sift
   npm ci
   cd website
   npm ci
   cd ..
   ```

5. Create the app environment file without committing it:

   ```bash
   cp .env.example .env
   ```

   Populate the public Expo values from the existing trusted setup. Do not put `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Apple signing material, or any other server secret in this file.

6. The Supabase Edge Function secrets remain stored remotely. Install and authenticate the CLI only when backend deployment work is needed:

   ```bash
   brew install supabase/tap/supabase
   supabase login
   supabase link --project-ref hrncksmwxvzeqzlcxqgc
   ```

7. Verify the checkout:

   ```bash
   npm run typecheck
   npm run eval:ai
   cd website
   npm run verify
   cd ..
   ```

8. Start the mobile app:

   ```bash
   npx expo start
   ```

9. Start the landing page when needed:

   ```bash
   cd website
   npm run dev
   ```

The Apple Developer Program, production bundle identifier, signing certificates, App Store Connect products, TestFlight, and production RevenueCat store connection are intentionally unfinished.

## Main Sift Development Prompt

```text
You are continuing development of Sift on a new Mac mini. The repository is cloned from https://github.com/exterminatorrat/Sift.git. Work inside the repository and follow AGENTS.md.

Before changing code, inspect git status and read:
- AGENTS.md
- docs/Sift Launch Tracker.xlsx
- docs/ai-reliability-report.md
- docs/ai-reliability-architecture.md
- docs/authentication-production-setup.md
- docs/mvp-launch-checklist.md

Current product: Sift is an Expo SDK 54 React Native TypeScript iOS app that scans up to four restaurant-menu images, compares visible menu information and common hidden-risk patterns with locally stored allergy profiles, and returns conservative dish risk cards and staff questions. It must never guarantee that food is safe.

Current architecture:
- Supabase anonymous authentication and Keychain-backed SecureStore sessions are implemented for development.
- The app sends a real Supabase access token to the authenticated analyze-menu Edge Function.
- Server-side quotas, short-window rate limits, validation, privacy-minimized telemetry, and fallback results are implemented.
- Native Apple Sign-In code and anonymous-to-Apple identity linking exist, but production Apple configuration is blocked until Apple Developer enrollment, the final bundle ID, and physical-device testing.
- Gemini is the current AI provider path. The benchmark architecture is extensive, but the current candidate has not passed the full live private-beta reliability gate. Do not claim that it has.
- Subscription plans are currently local test behavior. RevenueCat and real App Store purchases are not implemented.
- The mobile UI and onboarding are substantially polished. Preserve the current warm cream, teal, Source Serif 4, and Inter design system unless a specific change is requested.
- The Astro landing page is under website/.

Immediate priorities, in order:
1. Complete AI reliability evidence using the existing versioned benchmark and human-review gates.
2. Run runtime resilience testing for offline scans, interruption, timeout, permissions, corrupted local history, and app relaunch.
3. Integrate RevenueCat Test Store using the Supabase user ID as the app user ID, without trusting client entitlements for backend access.
4. After Apple Developer enrollment, finalize the bundle ID, Apple Sign-In, account deletion, App Store products, RevenueCat production entitlements, and TestFlight.
5. Reconcile final privacy/legal disclosures with the providers actually shipped.

Keep changes surgical. Never commit .env files, provider keys, Supabase service-role keys, Apple secrets, raw menu photos from users, or ignored benchmark output. Before publishing, run the narrowest relevant checks and inspect both uncommitted changes and commits not yet on origin/main.
```

## Landing Page Prompt

```text
You are continuing Sift's landing page on a new Mac mini. The site is the Astro project at website/ inside https://github.com/exterminatorrat/Sift.git. Follow the root AGENTS.md and inspect website/README.md, website/src/config/site.ts, website/src/layouts/BaseLayout.astro, website/src/styles/global.css, and website/src/styles/home.css before editing.

The page is already substantially designed and should not be broadly redesigned. Its direction is warm cream, deep teal, Source Serif 4 headings, Inter UI text, restrained editorial layouts, the approved Sift mark in website/public/brand/, and realistic iPhone-style frames displaying actual app screenshots. Preserve the calm, premium, safety-aware visual identity and avoid generic gradients, decorative clutter, nested cards, or unsupported product claims.

Existing pages include home, how it works, safety, reliability and methodology, privacy, terms, support, account deletion, accessibility, about, contact, cookies, 404, sitemap, and social preview assets. The release script intentionally blocks publication until the real App Store URL, legal entity details, support addresses, account-deletion verification, provider disclosures, AI reliability gate, pricing, subscription products, purchase restoration, icon, accessibility audit, and counsel review are confirmed.

Next work should focus on production readiness rather than aesthetic reinvention:
1. Verify desktop and mobile layouts and all navigation links.
2. Replace only genuinely unresolved placeholders once authoritative production values exist.
3. Align reliability claims with docs/ai-reliability-report.md; never imply that current benchmark gates passed if they did not.
4. Align privacy, terms, support, and deletion pages with the app's final Gemini, Supabase, RevenueCat, Apple, telemetry, and retention behavior.
5. Configure siftallergy.app and production hosting only when requested.

Run npm ci and npm run verify from website/ before considering a change complete. Do not publish or alter DNS without explicit authorization, and never commit website/.env.
```

## Revenue Estimation Prompt

```text
You are continuing the financial and subscription analysis for Sift using the current repository at https://github.com/exterminatorrat/Sift.git. This is a decision model, not a sales forecast. Read src/constants/subscriptionPlans.ts, the visible subscription copy in src/i18n/translations.ts, docs/Sift Launch Tracker.xlsx, docs/ai-reliability-report.md, and the current RevenueCat/backend implementation before calculating anything.

Current test plans are:
- Free: $0, 3 scans/month, 1 profile, 5 retained scans.
- Plus: $4.99/month, 50 scans/month, 3 profiles, 50 retained scans.
- Pro: $8.99/month, 200 scans/month, 5 profiles, 200 retained scans.
- Family: $12.99/month, 500 scans/month, 8 profiles, 500 retained scans.

These prices and caps are provisional. Previous modeling used assumptions such as 3% paid conversion, a 65/25/10 Plus/Pro/Family mix, 30% new-account share, a $0.10 conservative cost reserve per scan, 66.5% net subscription receipts, and $50/month fixed costs. Do not present those assumptions as current measured facts.

Build an auditable model with clearly separated inputs, formulas, scenarios, and conclusions. Include:
- Gemini image/input/output/thinking costs from current official pricing or measured telemetry;
- Apple commission and applicable RevenueCat fees under explicitly stated assumptions;
- per-plan gross margin at 10%, 25%, 50%, 75%, and 100% scan-limit utilization;
- blended ARPPU, contribution margin, free-user acquisition cost, break-even MAU, cash runway, and worst-case launch-month exposure;
- conservative, base, and optimistic conversion/retention scenarios;
- sensitivity to provider price changes, retries, failed scans, taxes, refunds, churn, family sharing, and support costs;
- a recommendation on whether to launch only Free + Plus or expose Pro and Family;
- proposed server-side caps and spend controls that prevent an unexpectedly active user from creating negative gross margin.

Use live official pricing sources whenever the information can change. Label missing data and never invent telemetry. Prefer a spreadsheet with assumptions that the owner can edit. Do not recommend ads at launch unless the measured economics clearly justify the UX and privacy cost.
```
