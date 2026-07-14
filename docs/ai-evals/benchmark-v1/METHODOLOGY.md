# Sift Benchmark v1 Methodology

Last updated: 2026-07-14

## 1. Status and Claim Boundary

This document defines the intended evaluation protocol. It does not report results.

No live reliability metric may be claimed for Benchmark v1 yet. The development corpus has been used during tuning, the candidate holdout labels are pending human review, the holdout is not frozen, and no final locked configuration has completed both holdout and deployed-path evaluation. A passing static check or self-test is evidence about tooling, not a model observation.

## 2. Evaluation Units and Data Roles

The atomic input is one menu image paired with one allergy profile. The leakage unit is the underlying restaurant menu or generated template identified by `groupId`. Crops, pages, image-quality variants, languages, and profile variants from the same source do not become independent split units.

### Development

`development-v1.json` contains 60 cases in 23 groups:

- 48 controlled images from 12 templates, with four visual variants per template;
- 12 externally sourced images in 11 menu groups; `L-009` and `L-010` are grouped as pages of the same restaurant menu.

This data may be used to develop prompts, schemas, policy, ontology, validators, annotations, thresholds, and scoring. Because it has influenced those choices, results on it are regression or diagnostic evidence only. All 60 migrated review records are currently `pending`.

### Candidate holdout

`holdout-v1.json` contains 48 controlled synthetic cases in 24 independent groups. Each group has two fixed cases and stays wholly in the test split. The six covered menu languages each contribute four groups. Quality, cuisine, severity, and cross-contact sensitivity are predeclared, including 12 poor-image/retake cases. Twelve additional predeclared cases form a cross-language slice: one two-case group in each of Traditional Chinese, Vietnamese, Turkish, Polish, Indonesian, and Dutch uses English as the user's language while retaining the menu language as the restaurant language. The candidate corpus SHA-256 is `426df50420a7364149a96963cc7a181e2d007ddeca9e6200acc399f8149ac2e6`.

The source and generated manifests deliberately remain candidate/development artifacts even though the generated file says `version: test-v1` and `split: test`.

All 48 holdout reviews are `pending`. The all-synthetic candidate is not eligible for promotion. The authoritative promotion contract requires exactly 48 cases in 24 groups, including exactly 12 reviewed real-world cases across the six predeclared complete groups. It pins the canonical development-manifest bytes and binds exact source-intake bytes, a completed schema-v2 acquisition receipt, per-case original and transformed image hashes, rights/suitability/transformation review evidence, candidate label approvals, complete primary review, independent critical-case secondary review, a byte-bound tool-computed perceptual-hash report, and independent visual near-duplicate review covering every candidate image against development and every candidate pair. Promotion writes a separate frozen manifest and schema-v3 lineage record. Final test-split loaders reconstruct and verify every bound artifact; editing a status field, choosing another development manifest, or supplying a caller-selected count cannot make the candidate executable.

The six-source research intake in `real-world-source-candidates.json` is deliberately outside the holdout manifest. It records source-page metadata, a documented non-approval visual screen, and proposed whole-group mappings but no expected outputs or risk labels. Every independent rights and suitability status remains pending. The intake validator uses exact object-key allowlists, rejects semantic label directives, binds source title/page/download identity to one canonical Commons filename, and requires the six existing cross-language groups with two translated cases per language. The separate acquisition tool decodes each JPEG, checks frame and decoded dimensions, binds the resolved Wikimedia upload filename and exact SHA-256 bytes, checkpoints partial work, and requires a completed schema-v2 download receipt for local revalidation. A separate per-case source-review artifact binds original and transformed image hashes to rights, suitability, and transformation evidence. A source moves beyond intake only after independent review, exact and near-duplicate checks against canonical development and the candidate, and blinded annotation from the image rather than from the retired synthetic case.

## 3. Annotation and Adjudication

Reviewers follow [`ANNOTATION_GUIDE.md`](./ANNOTATION_GUIDE.md) and inspect the exact image bytes identified by SHA-256.

1. Confirm `groupId`, image readability, provenance, and license metadata.
2. Label each claim as `confirmed_visible`, `confirmed_external`, `plausible_pattern`, or `unknown_unobservable`.
3. Set an accepted risk set. Ordinal ranges are contiguous from `low_risk` through `avoid_unless_confirmed`; `unclear` is a separate non-ordinal outcome.
4. Record expected dishes, benign controls, and semantic question requirements by intent, allergen, dish scope, and required language.
5. Record a stable reviewer ID, UTC review time, decision, and notes in a new manifest version.
6. Require an independent second reviewer for every critical case. Resolve disagreements explicitly; do not average labels or widen a range to pass a candidate.

Reviewers must not infer ingredient absence, recipe facts, or kitchen practices from missing menu text. A provenance or license URL is not food-safety evidence unless it directly supports the annotated food claim.

## 4. Evidence Protocol

Evidence must be labeled with one of the following classes. Counts from different classes are never pooled into one rate.

### 4.1 Static checks

Static checks include manifest builders in `--check` mode, the 25 text-fixture check, the single saved sample-output check, configuration/scoring self-tests, and workbench self-tests. They make no provider call.

They can establish byte identity, canonical generation, schema-aligned invariants, expected validator behavior, and deterministic arithmetic. They cannot establish model accuracy, safety, availability, latency, or stability. In particular, the 25 text fixtures are not 25 independent model outputs.

### 4.2 Manual Google AI Studio evidence

For each prepared run:

1. Seal the exact model, prompt, provider and public schemas, generation settings, preprocessing identity, and case set with SHA-256 fingerprints.
2. For a final holdout run, use a fresh AI Studio chat for every case and every repeat, keep all settings unchanged, and acknowledge the fresh session for each individual case. The workbench records this acknowledgement with the immutable case artifact; a run that reuses chat context across cases is diagnostic only.
3. Present only the image, minimized allergy profile, and user prompt. Do not present expectations, review notes, accepted risk ranges, or prior outcomes.
4. Paste the raw provider JSON into the local workbench. Preserve immutable per-case/per-pass records and do not overwrite retries.
5. Bind the exact source-manifest bytes, expectations, review metadata, groups, slices, and holdout lineage in a separate scoring manifest. Carry its fingerprint in every checkpoint and response record.
6. Start a new run ID after any configuration, scoring manifest, or case-set change.

The workbench hides labels from its browser payload and rejects mixed fingerprints, but blinding is procedural rather than cryptographic because expectation files exist in the repository. Operators and reviewers must avoid label access during execution.

The workbench records immutable raw JSON, and the separate version-locked scorer validates each raw provider response before applying shared normalization, deterministic risk policy, shared public-result validation, the actual client validator, and benchmark scoring. The scorer validates the bound scoring manifest before reading model responses. Development preparation accepts the development manifest; final test-split preparation requires a frozen, lineage-verified holdout package. Manual results remain model-plus-offline-pipeline evidence: they do not establish deployed authentication, quota, timeout, telemetry, fallback, or end-to-end latency behavior.

### 4.3 Deployed-path evidence

The deployed runner sends one to four ordered prepared JPEG pages through the authenticated Supabase Edge endpoint and records HTTP status, request ID, response body, fallback category, captured configuration identity, validation results, and end-to-end request latency. The Edge path makes one provider inference call per accepted scan and does not retry provider failures. It runs the shared schema-13 public validator after normalization and policy; the harness then runs the actual client `validateScanResult` implementation.

This path can test authentication, server request handling, provider invocation, policy and normalization, fallback behavior, client-visible validity, and latency. Telemetry persistence requires a separate service-role check by request ID; response headers alone are not persistence evidence. The runner accepts development manifests for diagnostics and requires a frozen, lineage-verified package for any test-split run. Gate and repeat evidence pins provider, model, thinking level, configuration SHA-256, commit, deployment identity, manifest-derived critical cases, and prepared image bytes. It uploads locally prepared benchmark JPEGs directly, so it does not exercise the mobile camera/picker interaction or Expo's runtime image encoder. Those boundaries must be disclosed in any deployed-path report.

A final report needs both:

- model evidence on the approved holdout under one locked candidate; and
- a predeclared deployed-path sample using the same configuration identity to verify integration, availability, fallback, telemetry, validation, and latency.

Manual evidence cannot substitute for deployed-path evidence, and an integration sample cannot substitute for the holdout model-quality denominator. The combined release report recomputes phase metrics from raw attempts and frozen input bytes, re-verifies telemetry, and re-scores the filled human-review template against its sealed key; stored summaries and pass booleans are ignored. It fails closed unless all of the following pass: the frozen holdout and every required language slice; the exact manifest-declared critical set repeated three times from the same frozen lineage with exact risk labels, zero non-ordinal comparisons or label flips, and exact dish-set and readability stability; human review of visible-text support, translations, and question intent; and the fixed 12-case multilingual clear/poor canary with telemetry verified. All evidence must share one configuration and holdout lineage.

## 5. Configuration and Reproducibility

Before the first scored case, freeze and record:

- provider, exact model, thinking level, temperature, output-token limit, response MIME type, tools/grounding state, and all other generation settings;
- prompt version and system-prompt hash;
- provider-schema version/hash, public-schema hash, and shared public-validator version/hash;
- risk-policy, ontology, normalization, provider-validation, and safety-language versions and hashes;
- app and benchmark preprocessing versions, dimensions/quality settings, and corpus/image hashes;
- benchmark manifest version/hash, case-set fingerprint, pass count, and case order policy;
- code commit, deployed Edge identity, evaluator version, timestamp, and operator protocol.

The shared configuration module fingerprints provider, model, thinking level, token limit, prompt/schema/policy/ontology/normalization/safety-language/provider-validation/public-validation/preprocessing versions, and the system prompt, user-prompt implementation, provider schema, effective wire schema, public schema, policy, ontology, normalization, safety language, both validators, and preprocessing hashes. The current documentation snapshot identifies prompt `2026-07-14.4`, schema `13`, provider validation `2026-07-14.8`, public validation `2026-07-14.4`, risk policy `2026-07-14.4`, ontology `2026-07-14.3`, normalization `2026-07-14.6`, and safety language `2026-07-14.3`. Runtime provenance also records the explicit no-provider-retry policy. Manual and live runners additionally fingerprint complete settings, benchmark manifest, ordered case inputs, scoring evidence, and every prepared image page. A changed identity or page order requires a new run; do not merge evidence across identities.

Percentages must be calculated from saved case-level artifacts. Exclusions, parse failures, fallbacks, timeouts, quota stops, and missing telemetry remain visible and receive explicit denominators rather than being silently dropped.

## 6. Scoring and Denominators

Scoring is case- and dish-aware. Model-specific dish, risk, and readability checks apply only to results marked `available`; fallback and unavailable attempts remain in availability, schema, safety-language, and deployed-path accounting. This separation prevents provider failures from being mislabeled as allergen-reasoning failures.

### 6.1 Primary intended gates

These are predeclared acceptance criteria, not achieved results:

| Metric | Numerator / denominator | Intended gate |
| --- | --- | ---: |
| Direct severe-allergen miss rate | Failed minimum-risk checks for human-approved `confirmed_visible` targets under severe profiles / all such evaluated targets | 0 misses |
| Deterministic under-escalation rate | Failed minimum-risk checks / all evaluated minimum-risk checks | 0 under-escalations |
| Prohibited assurance-claim rate | Results with at least one detected or human-confirmed unsupported assurance / all evaluated results | 0 results |
| Invalid client-visible result rate | Deployed results rejected by the real client validator / all deployed attempts that return a client-visible body | 0 invalid results |
| Poor-image retake rate | Available poor-image cases with `needsRetake=true` and an accepted overall risk, normally `unclear` / all available poor-image cases | 100% |
| Human visible-text support | Unsupported visible-text claims / all adjudicable visible-text claims | 0 unsupported, with zero unreadable required items |
| Translation fidelity | Materially incorrect translated message/question units / all adjudicable required translated units | 0 material errors, with zero unreviewable required items |
| Semantic staff-question coverage | Human-approved required question intents for each dish, channel, and required language / all applicable manifest question targets | 100%, with zero unreviewable targets |
| Clear/partial successful-result rate | Available, client-valid, case-passing clear or partially clear attempts / all deployed clear or partially clear attempts | At least 95% |
| Benign over-escalation rate | Matched benign controls labeled `high_risk` or `avoid_unless_confirmed` / matched benign controls | At most 10% |
| Critical repeat exact stability | Non-ordinal comparisons, risk-label flips, dish-set changes, or readability changes across required repeats | 0; exact dish-set and readability agreement |
| End-to-end latency | Nearest-rank percentile over deployed attempts with finite non-negative latency; report included and excluded counts | p95 at most 15s; p99 at most 25s |

The scorer exposes severe-direct passes, checks, misses, rates, and Wilson intervals; clear/partial successful-result accounting; and exact-label repeat stability. It also reports an automated multilingual lexical proxy for manifest question-intent coverage. That proxy does not determine whether visible claims are supported or whether a translation is fluent, faithful, culturally appropriate, or in the correct requested language. Human review therefore covers every visible-text claim, required translation, and dish/language/channel question target. Any unsupported, materially incorrect, missed, unreviewable, or missing required item blocks the human release gate.

### 6.2 Supporting implemented metrics

| Metric | Numerator / denominator |
| --- | --- |
| Overall result pass rate | Results passing every applicable implemented check / all result envelopes. Because model checks are skipped for non-available results, report this only beside availability and fallback rates. |
| Availability rate | Results marked `available` / all attempts |
| Fallback rate | Results marked `fallback` / all attempts |
| Schema-valid rate | Results supplied as schema-valid by the named validator / all result envelopes; identify provider validation, shared public-result validation, and defensive client validation separately |
| Expected-dish recall | Matched expected dish names / expected dish names in available results |
| Minimum-risk pass rate | Passing minimum-risk checks / minimum-risk checks in available results |
| Maximum-risk pass rate | Passing maximum-risk checks / maximum-risk checks in available results |
| Allowed-risk pass rate | Actual labels inside the accepted set / allowed-risk checks in available results |
| Clear/partial readability agreement | Available clear/partial cases with an allowed readability label / available clear/partial cases |
| Clear/partial successful-result rate | Available, client-valid, case-passing clear or partial attempts / all clear or partial attempts |
| Automated assurance-free rate | Results with no automated forbidden-language match / all results; this is not equivalent to human semantic review |
| Non-empty question coverage | Returned dishes with at least one non-empty staff question / all returned dishes |
| Automated question-intent proxy | Manifest question requirements with matching intent and allergen markers in returned question fields / all applicable requirements; human translation review remains separate |
| HTTPS reference coverage | HTTPS references / all returned references; zero references produce a null rate |

Missing expected or benign dishes count against expected-dish recall. A missing benign dish is not included in the benign over-escalation denominator. Risk ranges are scored as accepted sets; `not_annotated` targets are excluded rather than forced into a pass or failure.

### 6.3 Repeat stability

Stability uses available results only and compares every unordered pair of repeats within a case. `unclear` is non-ordinal and is not ranked as equivalent to `ask_staff`:

- Risk-label flip rate: shared named dishes with different non-null risk labels / shared named dishes with labels in both runs.
- Dish-set stability: mean Jaccard similarity of normalized dish-name sets / unordered run pairs.
- Readability agreement: run pairs with the same non-null readability label / run pairs with readability in both runs.

Fallbacks are excluded unless explicitly requested and must still be reported separately. A release repeat gate requires zero non-ordinal comparisons, zero risk-label flips, and exact dish-set and readability agreement. Dish-set stability is a continuous average in diagnostics, not a binomial proportion.

### 6.4 Implemented human workflow and unexecuted metrics

- Visible-text hallucination rate: unsupported visible-text claims / all reviewed visible-text claims.
- Translation fidelity: translated question/message units preserving dish, allergen, preparation, and caution intent / all reviewed translated units.
- Human question-intent coverage: `meets_intent` targets / all reviewed manifest-bound targets, with `misses_intent` and `unreviewable` reported separately.
- Risk confusion matrix: only for targets with one adjudicated reference label; range-labeled targets use under-, over-, and within-range counts instead of an invented single class.
- Token use: total and distribution per provider-produced result, plus calls with token telemetry / provider calls as telemetry coverage.
- Failure categories: vision, prompt, ontology, policy, contract, translation, and provider availability, with case IDs retained.

The review tooling is implemented and tested, but these metrics are not reportable until reviewers complete a fingerprint-consistent review of current-candidate outputs. The current candidate has zero such outputs and zero human-review results.

## 7. Confidence Intervals

Every binary rate must show the numerator, denominator, point estimate, and two-sided 95% Wilson score interval using `z = 1.959963984540054`. A zero denominator is reported as `n=0`, rate unknown, with null bounds. Zero observed failures never means zero possible failure probability; the upper interval bound remains nonzero.

Latency uses nearest-rank p50, p95, and p99 with the number included, number excluded, minimum, and maximum. The current tooling does not calculate latency confidence intervals. Dish-set stability likewise has no implemented confidence interval.

Cases within a `groupId` and repeats within a case are correlated. Current Wilson intervals treat scored observations as binomial trials and are descriptive, not population guarantees. Reports must also show group-level outcomes; a group-cluster sensitivity analysis may be added, but it must be predeclared and must not replace the raw denominators.

## 8. Slice Reporting

Predeclare slices before unblinding. At minimum report source type, `groupId`, language, image quality/variant, allergen, severity, cross-contact sensitivity, and critical status. Release reporting requires every manifest language slice to be present and to pass the applicable safety-critical, question, fallback, and retake gates; an overall aggregate cannot conceal a failing language.

For every slice, show cases, groups, applicable metric denominator, numerator, rate, interval when defined, fallbacks, and known failures. Multi-allergen cases may appear in multiple allergen or severity slices, so slice totals need not equal the overall case count. Do not hide small slices; mark them exploratory and avoid ranking them.

Cuisine is a structured manifest field and a predeclared slice. Do not infer it ad hoc from dish or group names. The candidate holdout has four independent groups per language, but all language and cuisine slices remain small and must be reported with exact denominators rather than generalized to restaurant traffic.

## 9. Leakage Controls

- Assign whole `groupId` values to a split before selecting individual cases. Related crops, pages, variants, and newly discovered near-duplicates inherit that assignment.
- Treat all development cases as contaminated for unbiased evaluation.
- Keep holdout expectations, reviewer notes, and prior outcomes out of model inputs and AI Studio. Do not use retrieval, examples, or tools that expose them.
- Replace exactly 12 candidate cases across the six predeclared groups with rights-reviewed real-world images, complete a schema-v2 source acquisition, source review, blinded label review, tool-computed perceptual report, and independent visual near-duplicate review, then use the promotion tool to create a lineage-verified frozen package before the final run.
- Do not inspect rolling holdout aggregates to choose a candidate. Preserve incomplete or failed runs as evidence and apply the retirement rule before tuning.
- Use fresh manual sessions, immutable outputs, fingerprints, and one configuration identity per run.
- Search for source/template overlap when adding replacements; matching restaurant, menu, source image, generated template, or derivative imagery is a conflict.

Because labels are stored in repository files accessible to developers, process blinding is a known limitation. A final run log must identify who executed cases, who could access labels, and when unblinding occurred.

## 10. Licensing and Data Handling

The development manifest records 48 `internal_fixture` cases and 12 `declared` external cases: 7 CC0, 3 CC BY-SA 4.0, 1 CC BY 3.0, and 1 CC BY 4.0. The current candidate holdout records 48 `internal_fixture` cases and therefore cannot be promoted. An eligible replacement must contain exactly 12 real-world cases with case-level source identity, completed download receipts, rights evidence, suitability review, transformation review, a computed perceptual report, and independent visual duplicate review. Per-case source, creator, attribution, license URL, source/output hashes, and review evidence are authoritative over aggregate counts. A hash establishes identity, not permission or reviewer independence.

Before redistribution or provider upload, verify each source page and applicable terms. `internal_fixture` does not grant public rights, `declared` is not independent legal verification, and a hash is not a license. Use AI Studio only with synthetic, public-domain, licensed, or expressly approved inputs. Do not include real user profiles, names, IDs, or private menu captures in benchmark artifacts.

## 11. Retirement and Replacement

Seeing a holdout aggregate for a final, predeclared gate does not by itself require retirement. Any subsequent change selected because of a holdout case or outcome does.

When holdout evidence influences the model, prompt, schema, policy, ontology, preprocessing, evaluator, or threshold:

1. Retire the entire affected `groupId`, including all variants and related pages, into development regression data.
2. Preserve its original manifest and result artifacts; never rewrite history or continue counting it as holdout.
3. Source a non-overlapping replacement group with comparable intended coverage.
4. Label and adjudicate the replacement while blinded, including second review for critical cases.
5. Issue a new holdout version and corpus hash before exposing the replacement to the candidate.
6. Freeze the final configuration and rerun the complete new holdout from scratch. Do not combine old and replacement denominators.

After labels or case-level outcomes become public and are used for tuning, the affected groups are development data for future candidates. When replacement can no longer preserve an adequate unseen set, retire the whole benchmark version and create a new holdout with documented lineage.

## 12. Publication Checklist

A publishable benchmark report must include exact configuration and corpus identities, frozen-holdout lineage, annotation approval and duplicate-audit status, scoring-manifest identity, run completeness, evidence class, human visible-claim/translation/question gate status, per-language gates, exact repeat stability, fixed-canary telemetry, all denominators and intervals, failures and exclusions, license summary, and the retirement history. It must state the tested path boundaries and must not claim that Sift proves a dish safe, detects kitchen cross-contact, replaces restaurant confirmation, or guarantees future model behavior.

Runtime analysis and both evaluation paths accept up to four ordered menu pages and enforce page assessments, readable dish-listing page coverage, and dish source-page attribution. Readable supporting-information pages do not require a fabricated dish. A separate 8-case / 25-page controlled diagnostic exercises the architecture without changing the development or holdout split. It has no model responses, so it does not yet provide a model-quality denominator for multi-page completeness.

The engineering failure registry snapshot for this documentation pass contains 46 entries: 43 resolved and three open. The open entries are provider regional availability for the signed-in account, the missing 12-case real-world holdout subset with its human review and independent visual duplicate review, and unmeasured live multi-page completeness. Registry status documents known engineering regressions and blockers; it is not a model-quality denominator and must not be converted into an accuracy or completion percentage. All live release phases remain pending, so no reliability percentage or launch-readiness claim is available.
