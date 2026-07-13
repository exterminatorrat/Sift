# Sift website

Production-oriented static marketing and documentation site for `siftallergy.app`.

The site uses Astro so every public route builds to crawlable HTML with its own title, description, canonical URL, Open Graph metadata, and JSON-LD. The homepage art direction is **The Menu Margin**: authentic Sift app evidence, restaurant-menu annotation, white editorial space, and restrained deep teal structure. There is no waitlist or marketing-email capture.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Verification:

```powershell
npm.cmd run check
npm.cmd run build
```

`npm.cmd run build:release` is intentionally stricter. It fails until all verified production values from `.env.example` are present. A successful release build is not a substitute for counsel, accessibility, mailbox, App Store, and deployed-header verification.

## Public routes

- `/` — product landing page
- `/how-it-works` — profile, photo, result, and staff-question flow
- `/reliability` — system method, validation, fallback, evaluation, and limitations
- `/safety` — risk labels and explicit food-allergy safety boundaries
- `/about`
- `/contact`
- `/support`
- `/privacy`
- `/terms`
- `/cookies`
- `/accessibility`
- `/delete-account`

The generated `sitemap.xml`, `robots.txt`, 404 page, social card metadata, and example static-host security headers are included.

## Product evidence

Screens in `public/app/` were captured from the current local Expo app at a 390×844 viewport using a fictional profile (`Alex`) and controlled menu fixtures. Deterministic/mock output is used only to demonstrate current product UI and is never presented as measured AI performance. The explicit `Unclear` capture demonstrates conservative failure handling.

The visual concept used for implementation is retained at `design-reference/menu-margin-concept.png` for internal comparison. It is not shipped in the public site.

## Release blockers

These are required before public deployment and must not be guessed:

1. Verified App Store listing URL.
2. Legal operator name, address, jurisdiction, and effective date.
3. Verified App Store subscription products, final regional prices, and plan entitlements.
4. Tested purchase, upgrade/downgrade, cancellation guidance, and restore-purchases behavior.
5. Counsel review of Privacy and Terms, including warranty, liability, age, dispute, and subscription language.
6. Verified delivery for `support@siftallergy.app` and `feedback@siftallergy.app`.
7. A tested in-app account-deletion flow if account creation remains available. Email-only deletion is not sufficient for Apple review.
8. Final AI provider, processing, retention, deletion, international-transfer, and training-use disclosures.
9. Completed live reliability gate before publishing any performance percentage or “validated accuracy” claim.
10. Production app icon/master brand asset and final App Store badge artwork.
11. Manual WCAG 2.2 AA audit, including keyboard, screen reader, 320px reflow, zoom, text spacing, reduced motion, forced colors, and iOS VoiceOver checks.
12. Deployed checks for redirects, HTTP 404 behavior, CSP/security headers, canonical URLs, social image, mail links, and all external links.

The current legal pages are implementation-aligned product drafts, not legal advice. They deliberately avoid inventing the missing operator and jurisdiction details. The release command blocks those omissions from being mistaken for a deployable final state.

## Hosting

`public/_headers` follows the syntax used by common static hosts. If the final host does not support it, translate the same policies into that platform’s configuration. Enforce HTTPS and redirect alternate hosts to `https://siftallergy.app`.
