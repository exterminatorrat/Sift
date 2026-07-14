# Sift AI Reliability Report

Status: **Reliability tooling implemented - current model candidate not yet evaluated**
Updated: July 14, 2026

Sift has an authenticated, quota-protected deployed analysis path plus a versioned benchmark architecture. The repository includes evidence-first provider validation, a private evidence handoff from normalization to deterministic policy, shared public-result validation, actual-client validation, a 60-case development set, a 48-case candidate holdout, a manual AI Studio workbench, deployed-path evaluation, human review, and repeat/stability scoring. Those are engineering controls, not model-quality evidence.

The private-beta gate is still open. The 48-case / 24-group holdout candidate is entirely synthetic and cannot be frozen in its current form. Promotion requires exactly 12 reviewed real-world cases with completed source/acquisition/review lineage, complete label approvals, a byte-bound tool-computed perceptual-hash report, and independent visual near-duplicate review bound to the exact candidate and canonical development bytes. The four factor-isolated model experiments are unexecuted, and the current repository candidate has **0 model-produced benchmark results**. Visible-text claims and non-English staff communication still require human review. Google AI Studio redirected the attempted manual pilot to its regional availability page for the signed-in account, so no workaround, region spoofing, or benchmark upload was attempted.

This report records measured evidence only; it does not claim that Sift can guarantee food safety.

## Current Candidate Architecture

The current repository components are:

- Provider/model under evaluation: `google` / `gemini-3.5-flash`
- Final thinking level, media resolution, prompt order, and preprocessing size: **not locked**
- Maximum output tokens: `6000`
- Prompt: `2026-07-14.4`
- Provider/public schema: `13`
- Provider validation: `2026-07-14.8`
- Public-result validation: `2026-07-14.4`
- Risk policy: `2026-07-14.4`
- Ontology: `2026-07-14.3`
- Normalization: `2026-07-14.6`
- Safety-language rules: `2026-07-14.3`
- Preprocessing: `app-jpeg-1600-compress-0.72-v1`
- Holdout promotion policy / lineage: `2026-07-14.5` / `3.0.0`
- Development manifest: 60 cases / 23 groups, corpus SHA-256 `0f42b84768800a815c64cb4ee43dc735aee5b6052b8351e760da2a60a3922382`
- Candidate holdout: 48 cases / 24 non-overlapping groups, corpus SHA-256 `426df50420a7364149a96963cc7a181e2d007ddeca9e6200acc399f8149ac2e6`

The previous manual development pilot `candidate-2026-07-14-pilot-v5` was sealed to prompt `2026-07-14.3` and schema `12`, with configuration fingerprint `sha256:576b17a7a1dbbb14d2493e89ebe35fd1e3c5b161ab67c00d5fca5d9526bf63bd`. It has zero responses and is stale after the supporting-page contract fix; it must not accept responses or be reused as current-candidate evidence. A fresh run must be prepared before any manual execution. Preparing inputs is not model evidence, and a three-case pilot cannot substitute for the frozen holdout. Every manual or deployed run records its own component hashes, user-prompt hash, preprocessing hash, corpus and image identities, Git commit, deployment identity when applicable, provider settings, and aggregate configuration hash. Manual and deployed evidence remain separate because the deployed identity also includes transport behavior.

The current architecture requires one page assessment per image and source-page attribution for every readable dish. Provider-only page classification distinguishes actual dish listings from readable covers, allergen legends, and menu-wide supporting information. Provider validation requires coverage for every readable dish-listing page without forcing a supporting page to become a fabricated dish. Each readable dish must include visible menu evidence, common-risk patterns, uncertainties, and practical profile-bound questions. The contract also rejects unsupported direct or derivative evidence, unrelated allergens, and staff communication that does not explicitly preserve the supplied allergy names and severities. It binds requested and reported language metadata and rejects non-Latin communication that lacks the expected script; human review remains authoritative for translation fidelity. Normalization keeps validated evidence and explicit uncertainties in a private policy-only field so they cannot be lost before deterministic checks; the policy strips that private field before public validation and rendering. Deterministic policy can only preserve or raise caution; it does not downgrade the model's risk result.

The manual scorer processes immutable raw provider JSON through raw contract validation, shared normalization, deterministic policy, shared public-result validation, the actual client validator, and benchmark scoring. A separate scoring manifest binds the exact source-manifest bytes, expectations, review metadata, grouping, and slices to the prepared run and to every response record. The scorer reports severe-direct denominators and Wilson intervals, clear/partial successful-result rate, benign over-escalation, exact-label risk confusion, range-label compliance, lexical multilingual question-intent coverage, optional latency/token metrics, complete predeclared slices, and repeat stability. Automated question matching is only a proxy. Release evidence additionally requires a fingerprint-consistent human review with zero unsupported visible-text claims, zero material translation errors, zero missed question intents, zero unreviewable required items, and complete expected coverage.

The current repository candidate has `0` live or manual benchmark responses. No current-candidate pilot is prepared: `candidate-2026-07-14-pilot-v5` is stale and sealed to the previous prompt/schema identity. An authorized manual development run requires a new run ID and freshly sealed inputs.

## Planned Factor Experiments

`docs/ai-evals/benchmark-v1/experiments-v1.json` predeclares four one-factor comparisons over six development cases per arm, with a maximum of 48 provider calls:

1. 1,600 versus 2,048-pixel maximum long edge;
2. Gemini media resolution unspecified versus high;
3. low versus medium thinking;
4. instruction-first versus image-first multimodal content order.

The experiment status is `planned_unexecuted`. No arm has won, and no six-case comparison can authorize a release. A selected setting must still pass the full development, lineage-verified frozen holdout, repeat, human-review, and deployed-canary gates. The design follows Google's documented [media-resolution control](https://ai.google.dev/gemini-api/docs/generate-content/media-resolution?hl=en) and treats Google's [multimodal prompt-order guidance](https://ai.google.dev/gemini-api/docs/file-prompting-strategies?lang=node) as a hypothesis to test rather than a guarantee.

## Local Verification

- Configuration/provider contract, deterministic policy, scoring/statistics, manual workbench, manual scorer, holdout promotion, and live-harness self-tests are implemented.
- Development and candidate-holdout manifests have reproducible generators and validation checks.
- Pending candidate holdout cases fail closed in manual and live paths. The current all-synthetic candidate is deliberately unpromotable. Promotion requires the authoritative 48-case / 24-group distribution, exactly 12 reviewed real-world cases across the six predeclared groups, canonical development bytes, a completed schema-v2 acquisition receipt, per-case source/output hashes and rights/suitability/transformation evidence, complete primary review, independent secondary review for critical cases, a byte-bound tool-computed perceptual-hash report, and approved independent visual near-duplicate review. It creates a separate frozen manifest and schema-v3 lineage record; final execution reconstructs and verifies every bound artifact before loading any case. The self-test validates this contract but does not constitute an external rights or duplicate review.
- Manual run preparation writes a separate scoring manifest bound to the source bytes, labels, review state, grouping, slices, and holdout identity. Workbench responses and checkpoints carry that scoring fingerprint, and mismatches fail closed.
- The human review workflow separately adjudicates visible-text support, translation fidelity, and each required question intent by dish, channel, and language. Release fails closed for any unsupported visible claim, material translation error, missed intent, unreviewable required item, or incomplete coverage.
- Combined release reporting does not trust stored summaries or pass booleans. It recomputes phase metrics from raw attempts and frozen input bytes, re-verifies canary telemetry, and re-scores the filled human-review template against its sealed key. It requires critical repeats from the same frozen lineage with exact risk labels, zero non-ordinal comparisons or label flips, exact dish-set and readability stability, a fixed 12-case multilingual clear/poor canary, per-language safety gates, and one identical configuration across holdout, repeats, canary, and human review. Evidence from another run, lineage, or configuration fails closed.
- The live path captures optional input, output, and thinking token counts and locks resume identity to manifest and image bytes.
- The scorer separates exact-label risk confusion from range-labeled under/over/within-range checks.
- Slice dimensions are `groupId`, source type, language, cuisine, image quality/variant, critical status, allergen, severity, and cross-contact sensitivity.
- Preprocessing parity is declared as JPEG, 1,600-pixel maximum long edge, quality `0.72`; generated benchmark preprocessing is deterministic.
- The benchmark JPEG path does not yet prove byte-for-byte parity with Expo's device encoder; that requires a device-captured comparison.
- Runtime analysis accepts up to four ordered menu pages and preserves page assessments plus dish source-page attribution through the client contract. An isolated 8-case / 25-page synthetic diagnostic is generated and scoreable, but it has no model responses. Multi-page completeness is therefore implemented but not yet measured.
- No current candidate model accuracy, recall, latency, token, stability, visible-text claim, or language-quality percentage is available.
- The engineering failure registry contains 46 entries: 43 resolved with linked implementation evidence and three open. `FAIL-003` records Google AI Studio regional availability for the signed-in account; `FAIL-031` records the missing 12-case real-world holdout subset and its human/external review; `FAIL-033` records the absence of a live multi-page completeness denominator. A resolved registry item is not model-quality evidence.

## Historical Deployed Configuration

The configuration and results below predate the current candidate and remain useful only as historical diagnostics. Do not pool them with the current prompt, policy, ontology, normalization, safety-language, or benchmark identity.

- Provider/model: `gemini-3.5-flash`
- Thinking level: `low`
- Prompt version: `2026-07-13.1`
- Provider schema version: `5`
- Structured output: enabled with a compact Gemini response schema
- Full server validation: enabled after normalization
- Maximum output tokens: `6000`
- Provider timeout: `22000ms`
- Google Search grounding: disabled
- Provider fallback: none; unresolved failures become a calm `unclear` result
- Edge Function: `analyze-menu` version 53, JWT verification enabled
- Deployment SHA-256: `f79a717d1bf39548d002da9e09c264155fb346fe30dcd966ce7cb9361d402a59`

Low was retained because the medium test exceeded the latency target and produced a malformed or truncated model response on its second case. Version 53 has passed static and non-provider backend checks, but it has not produced a live model result because the free-tier daily quota was already exhausted after the version-52 diagnostic run. Low remains provisional until the full gate passes.

## Reliability Work Completed

- Strict server-side request validation and bounded body reading.
- Anonymous Supabase JWT authentication before analysis.
- Atomic server-side monthly quota claims before provider calls.
- Authenticated request parsing is limited to 12 attempts per user per minute; accepted AI calls are atomically limited to 4 per user and 4 project-wide per minute by default.
- Client-supplied test entitlement synchronization removed; evaluation entitlements are assigned only through the server-side admin path.
- Auth and internal RPC calls use bounded timeouts, and request-body streaming has an overall deadline.
- Privacy-minimized analysis telemetry with 30-day retention.
- Exactly one provider inference call per accepted scan. Provider failures are not retried; unresolved failures become a calm `unclear` result.
- Compact provider schema plus shared schema-13 public validation after normalization and deterministic policy.
- Deterministic severe-allergen safety floors, including multilingual direct-ingredient aliases.
- Contradictory model evidence cannot remain `low_risk`: possible profile allergens, matching hidden ingredients, and matching cross-contact concerns are evaluated as separate deterministic evidence channels.
- Deterministic risk actions and overall summaries use conservative copy in all 16 benchmark languages, so a raised risk label cannot retain a low-risk action sentence.
- Ontology and menu text use one Unicode normalization path, with regressions for `Käse`, `Camarão`, and `새우`.
- NVIDIA receives the provider schema through its documented JSON-schema response format instead of an unenforced raw-JSON instruction.
- Public response array bounds and server-owned analysis metadata now match the advertised public schema.
- Configuration provenance includes provider-specific wire settings and the exact effective wire-schema hash.
- Deployed-path provenance fingerprints endpoint, timeout, and the explicit no-provider-retry policy.
- Conservative fallback results and request IDs for support correlation.
- HTTPS-only source references and grounding disabled for the beta gate.
- Model-supplied references are discarded; only provider-grounded references may be merged later.
- Live eval pacing and a hard 120-call ledger.
- Checkpoint resume support that excludes quota-stop placeholders and rejects mixed provider, model, prompt, schema, or thinking configurations.
- Live gate enforcement now checks exact case completeness, published error/rate/latency thresholds, full client-facing shape, and configuration provenance.
- Safety-claim rejection and conservative-uncertainty validation now cover English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Simplified/Traditional Chinese, Thai, Vietnamese, Turkish, Polish, Indonesian, and Dutch.

## Supabase Evidence

Applied migrations:

- `20260710031822_auth_quota`
- `20260710031843_ai_reliability_observability`
- `20260710034023_fix_scan_quota_ambiguity`
- `20260713040531_scan_rate_limit`
- `20260713040934_fix_scan_rate_limit_ambiguity`

The entitlement, monthly usage, and telemetry tables have RLS enabled and expose no user policies. Telemetry stores request ID, provider/model and prompt/schema versions, outcome/failure category, latency, image byte count, token counts when available, dish count, readability, plan, and timestamp. It does not store user ID, allergies, menu text, images, prompts, or model output.

The daily `sift-prune-ai-analysis-events` cron job is active at `03:15` and deletes telemetry older than 30 days. Direct public execution of `public.rls_auto_enable()` is revoked.

Security advisors show no application-owned warning. Remaining advisor notices are Supabase extension/Auth configuration notices: pg_cron policy warnings and leaked-password protection disabled. Password protection is not exercised by the current anonymous-only auth path.

## Eval Corpus

- 25 static text fixtures.
- 60 image cases: 48 deterministic rendered menus and 12 licensed real-world photos.
- Languages: English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Simplified Chinese, and Thai; the licensed set also includes Traditional Chinese.
- Image conditions: clear, small text, skew, crop, blur, glare, partial, and distant text.
- Allergens: peanut, tree nuts, sesame, shellfish, fish, dairy, egg, wheat/gluten, soy, mustard, sulfites, and mango.
- Selected mild/severe and cross-contact-sensitive profile pairs.
- Candidate holdout cross-language slice: 12 cases, two per Traditional Chinese, Vietnamese, Turkish, Polish, Indonesian, and Dutch menu language, with English as the user's language.

The 48-case candidate holdout is currently synthetic-only. It is useful for validating manifest structure and evaluation tooling, but it is not eligible to freeze or support a reliability claim. The promotion contract requires replacing exactly 12 cases across six groups with rights-reviewed real-world menu images, recomputing a byte-bound perceptual-hash report, and completing independent visual duplicate review against development and within the candidate.

Six possible source pages have been researched, visually screened as menu candidates, and mapped to the six predeclared cross-language groups. Intake validation now binds canonical Commons source/download identity and license declarations while excluding benchmark labels. Acquisition validation decodes JPEGs and requires a completed schema-v2 download receipt before any local bytes can enter promotion lineage. The prior ignored local receipt is schema v1 and is intentionally rejected; a conservative refresh stopped on Wikimedia HTTP 429 before a trusted schema-v2 receipt was completed. Source bytes have not replaced the candidate, independent rights/suitability/transformation reviews remain pending, and the candidate corpus hash and zero-result status are unchanged.

## Measured Results

Local checks:

- `npm.cmd run typecheck`: pass.
- `npm.cmd run eval:ai`: fixture integrity, generic sample-output checks, and multilingual prohibited/conservative-language tests against the real client validator pass for 25 fixtures. This is not a claim that 25 model responses passed.
- `npm.cmd run eval:ai:architecture`: pass on July 14 for all 21 non-live architecture checks, including policy `2026-07-14.7` frozen-package reconstruction, actual-byte image binding, perceptual-report verification, live-harness locks, human-review gates, and the 46-entry failure registry. Three registry entries remain open.
- The holdout-promotion self-test initially exceeded 121 seconds because every negative case re-decoded identical images. Perceptual hashes are now cached in-process by the images' actual SHA-256; the unchanged fail-closed self-test passes in 12.7 seconds. This is integrity-tool verification, not allergen-correctness evidence.
- Live harness syntax and 60-case manifest integrity: pass.
- `npm.cmd run eval:ai:live -- self-test`: pass for provider/model metric separation, fallback counting, poor-image fallback accounting, quota-safe resume filtering, and configuration locking.
- `npm.cmd run test:backend:smoke`: pass for anonymous sign-in, unauthenticated `401`, and authenticated malformed-request `400` without a provider call.

July 13 version-52 diagnostic evidence:

- One pre-gate canary produced a valid AI result. The paced gate then attempted 19 cases before `I-019` returned Gemini `429 RESOURCE_EXHAUSTED`; no billing was enabled.
- The 18 pre-quota gate outcomes were 13 successful AI analyses, four provider timeouts, and one provider `503`. The quota-stop response was recorded separately and is excluded from resume completion.
- Across the 13 AI-produced gate results: directly listed severe-allergen misses `0`, forbidden safety claims `0`, invalid client-visible schema `0`, missing staff questions `0`, and benign high/avoid labels `0` of `10` evaluated benign dishes.
- Two policy checks failed: Lentil Soup was `low_risk` instead of the required `ask_staff` floor for vague soup preparation, and one blurred/low-contrast severe-profile image was not marked `poor` with a retake.
- Version 53 adds a deterministic `ask_staff` floor for vague soup/preparation patterns, a severe-profile blur plus low-contrast retake floor, and an explicit instruction not to reconstruct materially blurred menu text.
- Version-52 gate availability remained below target: five pre-quota provider fallbacks, p50 `15.961s`, p95/p99 `26.005s`. Successful telemetry averaged `14.605s`, with `31,332` input tokens, `11,837` output tokens, and `2,707` thinking tokens across 13 successes.
- The observed free-tier window was exhausted after the canary plus the paced gate traffic. Google publishes project-specific limits in AI Studio rather than one universal number, so this run records the observed stop instead of claiming an exact contractual daily quota.

July 12 candidate evidence:

- Version 47 canary (`I-001`) passed all per-case safety gates in 11.5s after deterministic severe/cross-contact uncertainty escalation was added.
- Version 48 added privacy and auth hardening plus response configuration provenance. Its canary returned the correct calm fallback after a provider timeout.
- The paced version-48 gate ran 17 of 60 cases before Gemini returned `provider_rate_limited` and the harness stopped automatically.
- Of those 17 responses, eight were AI-produced and nine were fallbacks: five provider timeouts, two malformed-output fallbacks, one provider-unavailable fallback, and one provider-rate-limit fallback.
- Six of eight AI-produced responses passed their case expectations. The two failures were a direct-listed mild allergen one tier below Sift's policy and a blurred/low-resolution image not marked for retake.
- Version 49 deterministically fixes those two findings, removes the duplicated textual JSON schema to reduce prompt overhead, and is deployed.
- A version-49 canary on July 12 reached the authenticated Edge Function and returned the expected calm `unclear` fallback in about 3.1s, but Gemini again reported `provider_rate_limited`; no model output was produced.
- The harness now keeps provider fallbacks in schema/safety and availability accounting without misclassifying them as model allergen misses. Critical repeats reject every provider fallback, while the 60-case gate retains its explicit 5% clear/partial-image fallback-rate ceiling and does not treat poor-image fallbacks as image-analysis success.
- Version 50 deploys the multilingual safety validators and repeat-gate accounting fixes. Its no-provider backend smoke test passes; it still awaits a model-producing live call after the free-tier limit resets.
- A controlled version-50 canary again returned `provider_rate_limited` in about 3.1s. Corrected accounting recorded zero model safety misses, one provider fallback, and a failed availability diagnostic; the harness stopped without attempting the gate.
- Version 51 adds service-role-only short-window request and accepted-scan limits. Rolled-back database assertions passed the 12th/13th request boundary, the 4th/5th scan boundary, monthly rejection before global-slot consumption, and RPC privilege checks. The backend smoke test passed without invoking Gemini.

Initial low calibration (`2026-07-10.3`, schema 5, 12 cases):

- Invalid schema reaching client: 0.
- Forbidden safety claims detected: 0.
- Missing staff questions: 0.
- Clear-image fallbacks: 0.
- Benign high/avoid labels: 0 of 9.
- p50: 7.269s; p95/p99: 14.519s.
- Failed gates: four translated direct allergens were one tier too low; two poor images were not marked for retake.

Those failures led to Unicode-aware deterministic matching, translated direct-allergen aliases, a severe direct-ingredient floor, and stronger cropped/distant-image instructions.

Final low candidate evidence before quota exhaustion:

- Three AI-produced cases completed and passed all per-case gates.
- One clear case returned the correct calm fallback after a provider timeout.
- Eight later requests returned Gemini `429 RESOURCE_EXHAUSTED`; testing stopped without enabling billing.
- Because provider fallbacks are not image-quality evidence, the full 60-image gate remains incomplete.

Medium evidence:

- One successful case took about 20.3s server-side.
- The second case returned malformed/truncated output and fell back.
- Medium was rejected for this candidate because it failed reliability and latency criteria.

Telemetry across all diagnostics recorded 18 successful analyses, eight provider-rate-limit fallbacks, one provider timeout, one malformed-output fallback, and schema-development failures that preceded the working compact schema.

## Endpoint Gates

| Gate | Result |
| --- | --- |
| Unauthenticated invocation returns `401` | Pass, reproduced July 12 |
| Malformed authenticated request returns `400` | Pass, reproduced July 12 |
| Fourth Free-plan scan returns `429` before Gemini | Pass |
| Quota telemetry has no provider/model | Pass, reproduced July 12 with `quota_rejected` telemetry |
| Oversized declared body returns `413` remotely | Unresolved: Supabase gateway buffered the upload before function execution |
| Function requires JWT | Pass |
| Test entitlement sync disabled remotely | Pass |

The function performs a pre-auth declared-length check and bounded stream read, but the remote `413` release gate could not be proven because the Supabase gateway buffered oversized HTTP bodies first. This remains a launch blocker to investigate with a smaller upstream upload architecture or platform-level request limit.

## Private-Beta Gate Status

The private-beta AI gate is **not passed**, and this repository does not establish launch readiness. Every current live gate remains pending. Historical versions produced useful diagnostics, but those results cannot validate the current candidate. The next eligible candidate must first contain the required real-world subset and duplicate audit, then complete a development run, freeze without using holdout outcomes for tuning, pass the frozen holdout and every required language slice, pass exact-label critical repeats from that same frozen lineage, pass source-matched human review, and complete the fixed same-configuration canary with required verified telemetry. No paid inference is required for the repository architecture work and no billing was enabled.

The next live run must demonstrate:

- zero directly listed severe-allergen misses;
- zero deterministic under-escalations;
- zero forbidden guarantees;
- zero invalid client-visible schema;
- 100% poor-image `unclear` plus retake behavior from AI-produced responses;
- zero human-confirmed unsupported visible-text claims;
- zero material translation errors and zero unreviewable required translations;
- 100% applicable staff-question intent coverage with zero missed or unreviewable targets;
- at least 95% successful clear/partial-image results;
- at most 10% benign high/avoid labels;
- p95 at most 15s and p99 at most 25s;
- every required language slice passing the safety-critical gates;
- zero non-ordinal critical comparisons or risk-label flips across repeats, with exact dish-set and readability stability;
- the fixed 12-case multilingual clear/poor canary passing with telemetry verified.

## Execution Procedure

1. After Wikimedia cooldown, complete the conservative schema-v2 source download receipt. Replace exactly 12 synthetic candidate cases across the six predeclared complete groups with appropriately licensed or expressly approved real-world menu images while preserving the fixed 48-case / 24-group distribution.
2. Generate the source-review template and complete independent rights, benchmark-suitability, and transformation review bound to the original and transformed image hashes. Then complete blinded label review using `docs/ai-evals/benchmark-v1/ANNOTATION_GUIDE.md`, including an independent second reviewer for every critical case, and approve the tool-computed perceptual-hash report plus independent visual duplicate review against canonical development and all candidate pairs.
3. Promote the exact approved candidate with `scripts/ai-evals/promote-holdout.mjs`. Preserve the generated frozen manifest and schema-v3 lineage record; final manual and live holdout paths reconstruct candidate, approvals, audit/report, canonical development, source intake/acquisition/review, frozen bytes, and lineage rather than trusting a `status` field.
4. When Google AI Studio is available to the authorized account, prepare a new three-case development pilot for the current configuration. Use a fresh chat for each case, upload only the prepared synthetic/licensed image, keep the displayed settings unchanged, and paste only raw JSON into the loopback workbench. A pilot discovers setup or contract faults; it is not a launch metric.
5. Run development cases and classify each failure as vision, prompt, ontology, policy, contract, translation, or provider availability. Change one named subsystem at a time and start a new versioned run after every change.
6. Freeze the final configuration, evaluator, thresholds, and approved holdout before viewing holdout outcomes. Run every holdout case under one identity. If any holdout result influences a change, retire its entire group to development and replace it before another final evaluation.
7. Repeat the manifest-declared critical cases three times. Require exact risk-label agreement, zero non-ordinal comparisons or label flips, and exact dish-set and readability stability.
8. Generate and complete blinded human review of visible claims, translation fidelity, and every required question intent. The combined report re-scores the filled template against its sealed key, and its run, configuration, question requirements, manifest, and frozen-lineage fingerprints must match the passed holdout gate.
9. Deploy that identical configuration and run the fixed 12-case multilingual clear/poor canary through Supabase with telemetry verification required. The combined report recomputes raw phase evidence and per-language gates; it does not trust stored pass flags. Do not relabel canaries as holdout accuracy.
10. Update this report, the public reliability page, and `Sift Launch Tracker.xlsx` only from recomputed aggregate evidence. Raw manual/live outputs remain under ignored `output/ai-evals`.

If AI Studio remains unavailable because of account, age, or region eligibility, stop rather than bypassing the restriction. The same sealed candidate can later be evaluated through an authorized free-tier API route, but API and manual evidence must remain separately identified.

## Remaining Limitations

- Menu photos and visible descriptions cannot reveal kitchen practices, substitutions, or cross-contact.
- Deterministic word matching reduces under-escalation but is not a cuisine or allergen ontology.
- Human allergen-domain review is still required for the highest-risk labels.
- Human review is still required for non-English restaurant messages.
- Anonymous identities can be rotated by clearing app storage, so per-user quota is not sufficient abuse protection for public launch. Require Apple or another durable identity and add platform-level abuse controls before paid production inference.
- Free-tier provider availability is currently too variable for a production SLA; the measured partial gate had nine fallbacks in 17 calls.
- Google states that Gemini free-tier content may be used to improve its products. Use the free tier only with synthetic, licensed, or expressly consented testing data; do not treat it as the final production privacy posture.
