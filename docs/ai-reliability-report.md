# Sift AI Reliability Report

Status: **Checkpoint - private-beta gate not yet passed**  
Measured: July 12, 2026

Sift now has a deployed, authenticated, quota-protected AI path and a repeatable image-eval harness. The remaining blocker is completion of the paced 60-image live gate after the Gemini free-tier quota resets. This report records measured evidence only; it does not claim that Sift can guarantee food safety.

## Deployed Configuration

- Provider/model: `gemini-3.5-flash`
- Thinking level: `low`
- Prompt version: `2026-07-12.3`
- Provider schema version: `5`
- Structured output: enabled with a compact Gemini response schema
- Full server validation: enabled after normalization
- Maximum output tokens: `6000`
- Provider timeout: `22000ms`
- Google Search grounding: disabled
- Provider fallback: none; unresolved failures become a calm `unclear` result
- Edge Function: `analyze-menu` version 50, JWT verification enabled
- Deployment SHA-256: `7e06731ce67f89209e83216f4a6841df354d629ea858b06a76d045c76dfb95a5`

Low was retained because the medium test exceeded the latency target and produced a malformed or truncated model response on its second case. Low is still provisional until the full gate passes.

## Reliability Work Completed

- Strict server-side request validation and bounded body reading.
- Anonymous Supabase JWT authentication before analysis.
- Atomic server-side monthly quota claims before provider calls.
- Client-supplied test entitlement synchronization removed; evaluation entitlements are assigned only through the server-side admin path.
- Auth and internal RPC calls use bounded timeouts, and request-body streaming has an overall deadline.
- Privacy-minimized analysis telemetry with 30-day retention.
- One retry only for immediate provider `429`, `500`, `502`, `503`, or `504` responses.
- No retry for timeouts, invalid model output, safety-validation failures, or bad requests.
- Compact provider schema plus full post-normalization validation.
- Deterministic severe-allergen safety floors, including multilingual direct-ingredient aliases.
- Conservative fallback results and request IDs for support correlation.
- HTTPS-only source references and grounding disabled for the beta gate.
- Model-supplied references are discarded; only provider-grounded references may be merged later.
- Live eval pacing and a hard 120-call ledger.
- Live gate enforcement now checks exact case completeness, published error/rate/latency thresholds, full client-facing shape, and configuration provenance.
- Safety-claim rejection and conservative-uncertainty validation now cover English, Spanish, French, German, Italian, Portuguese, Japanese, Korean, Simplified/Traditional Chinese, and Thai.

## Supabase Evidence

Applied migrations:

- `20260710031822_auth_quota`
- `20260710031843_ai_reliability_observability`
- `20260710034023_fix_scan_quota_ambiguity`

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

## Measured Results

Local checks:

- `npm.cmd run typecheck`: pass.
- `npm.cmd run eval:ai`: fixture integrity, generic sample-output checks, and multilingual prohibited/conservative-language tests against the real client validator pass for 25 fixtures. This is not a claim that 25 model responses passed.
- Live harness syntax and 60-case manifest integrity: pass.
- `npm.cmd run test:backend:smoke`: pass for anonymous sign-in, unauthenticated `401`, and authenticated malformed-request `400` without a provider call.

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

The private-beta AI gate is **not passed**. The current version-50 candidate still needs the complete 60-image gate and the curated 18-case set repeated three times. The July 12 run stopped after 17 cases when the free-tier project returned a provider rate limit, and a later version-49 canary confirmed that the provider limit had not reset. No paid inference was enabled.

The next live run must demonstrate:

- zero directly listed severe-allergen misses;
- zero deterministic under-escalations;
- zero forbidden guarantees;
- zero invalid client-visible schema;
- 100% poor-image `unclear` plus retake behavior from AI-produced responses;
- 100% staff-question coverage;
- at most 5% clear-image fallback;
- at most 10% benign high/avoid labels;
- p95 at most 15s and p99 at most 25s;
- zero critical under-escalations across repeats.

## Resume Procedure

1. Wait for the Gemini free-tier quota window to reset; do not enable billing.
2. Archive and reset the diagnostic ledger with `npm.cmd run eval:ai:live -- reset-ledger --confirm` because version 50 is a new candidate.
3. Reuse the current disposable evaluation user if its session remains valid, otherwise run `npm.cmd run eval:ai:live -- prepare` and assign the printed user a Family/admin entitlement through the server-side database path.
4. Run the 60-case gate with the default 15-second pacing. Increase `--min-call-interval-ms` if the active AI Studio RPM limit is lower.
5. Stop immediately on `provider_rate_limited` or any billing-required response.
6. Only if the gate passes, run `npm.cmd run eval:ai:live -- run --phase repeat-critical --cases critical --repeat 3`.
7. Run `npm.cmd run eval:ai:live -- cleanup`, then delete the disposable auth user server-side.
8. Update this report and `Sift Launch Tracker.xlsx` only from the new evidence.

Raw live outputs remain under ignored `output/ai-evals`; only aggregate evidence belongs in Git.

## Remaining Limitations

- Menu photos and visible descriptions cannot reveal kitchen practices, substitutions, or cross-contact.
- Deterministic word matching reduces under-escalation but is not a cuisine or allergen ontology.
- Human allergen-domain review is still required for the highest-risk labels.
- Human review is still required for non-English restaurant messages.
- Anonymous identities can be rotated by clearing app storage, so per-user quota is not sufficient abuse protection for public launch. Require Apple or another durable identity and add platform-level abuse controls before paid production inference.
- Free-tier provider availability is currently too variable for a production SLA; the measured partial gate had nine fallbacks in 17 calls.
- Google states that Gemini free-tier content may be used to improve its products. Use the free tier only with synthetic, licensed, or expressly consented testing data; do not treat it as the final production privacy posture.
