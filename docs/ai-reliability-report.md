# Sift AI Reliability Report

Status: **Checkpoint - private-beta gate not yet passed**  
Measured: July 10, 2026

Sift now has a deployed, authenticated, quota-protected AI path and a repeatable image-eval harness. The remaining blocker is completion of the paced 60-image live gate after the Gemini free-tier quota resets. This report records measured evidence only; it does not claim that Sift can guarantee food safety.

## Deployed Configuration

- Provider/model: `gemini-3.5-flash`
- Thinking level: `low`
- Prompt version: `2026-07-10.4`
- Provider schema version: `5`
- Structured output: enabled with a compact Gemini response schema
- Full server validation: enabled after normalization
- Maximum output tokens: `6000`
- Provider timeout: `22000ms`
- Google Search grounding: disabled
- Provider fallback: none; unresolved failures become a calm `unclear` result
- Edge Function: `analyze-menu` version 46, JWT verification enabled
- Deployment SHA-256: `a8a6df0087ae0521a04bf2cf84f3ce486f0d173d4e4baa9b32e80f42ae1933bf`

Low was retained because the medium test exceeded the latency target and produced a malformed or truncated model response on its second case. Low is still provisional until the full gate passes.

## Reliability Work Completed

- Strict server-side request validation and bounded body reading.
- Anonymous Supabase JWT authentication before analysis.
- Atomic server-side monthly quota claims before provider calls.
- Privacy-minimized analysis telemetry with 30-day retention.
- One retry only for immediate provider `429`, `500`, `502`, `503`, or `504` responses.
- No retry for timeouts, invalid model output, safety-validation failures, or bad requests.
- Compact provider schema plus full post-normalization validation.
- Deterministic severe-allergen safety floors, including multilingual direct-ingredient aliases.
- Conservative fallback results and request IDs for support correlation.
- HTTPS-only source references and grounding disabled for the beta gate.
- Live eval pacing and a hard 120-call ledger.

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

Local gates:

- `npm.cmd run typecheck`: pass.
- `npm.cmd run eval:ai`: pass for all 25 static fixtures.
- Live harness syntax and 60-case manifest integrity: pass.

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
| Unauthenticated invocation returns `401` | Pass |
| Malformed authenticated request returns `400` | Pass |
| Fourth Free-plan scan returns `429` before Gemini | Pass |
| Quota telemetry has no provider/model | Pass |
| Oversized declared body returns `413` remotely | Unresolved: Supabase gateway buffered the upload before function execution |
| Function requires JWT | Pass |
| Test entitlement sync disabled remotely | Pass |

The function performs a pre-auth declared-length check and bounded stream read, but the remote `413` release gate could not be proven because the Supabase gateway buffered oversized HTTP bodies first. This remains a launch blocker to investigate with a smaller upstream upload architecture or platform-level request limit.

## Private-Beta Gate Status

The private-beta AI gate is **not passed**. The 60-image gate and three-run critical repeat set were not completed after the free-tier project returned persistent `RESOURCE_EXHAUSTED` responses. No paid inference was enabled.

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
2. Run `npm.cmd run eval:ai:live -- prepare`.
3. Assign the printed disposable user a Family/admin entitlement through the server-side database path.
4. Run the 60-case gate with the default 15-second pacing. Increase `--min-call-interval-ms` if the active AI Studio RPM limit is lower.
5. Stop immediately on `provider_rate_limited` or any billing-required response.
6. Run the remaining critical repeats only if the 60-case gate passes.
7. Run `npm.cmd run eval:ai:live -- cleanup`, then delete the disposable auth user server-side.
8. Update this report and `Sift Launch Tracker.xlsx` only from the new evidence.

Raw live outputs remain under ignored `output/ai-evals`; only aggregate evidence belongs in Git.

## Remaining Limitations

- Menu photos and visible descriptions cannot reveal kitchen practices, substitutions, or cross-contact.
- Deterministic word matching reduces under-escalation but is not a cuisine or allergen ontology.
- Human allergen-domain review is still required for the highest-risk labels.
- Human review is still required for non-English restaurant messages.
- Google states that Gemini free-tier content may be used to improve its products. Use the free tier only with synthetic, licensed, or expressly consented testing data; do not treat it as the final production privacy posture.

