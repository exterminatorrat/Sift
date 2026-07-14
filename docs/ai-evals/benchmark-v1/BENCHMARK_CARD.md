# Sift Benchmark v1 Card

Last updated: 2026-07-14

**Status: development only. No benchmark-v1 live reliability metrics are reportable yet.**

The 60-case development corpus has influenced prompts and evaluation code. The 48-case / 24-group candidate holdout is synthetic-only, every label is pending blinded human review, and the split is not frozen or promotion-eligible. Promotion requires exactly 12 reviewed real-world cases with source/acquisition/review lineage, a byte-bound tool-computed perceptual-hash report, and independent visual duplicate review against the canonical development bytes. No completed run of a final, locked candidate exists on an approved holdout. Static checks, partial diagnostics, and development-set runs must not be presented as holdout accuracy, a launch-gate pass, launch readiness, or evidence that Sift can determine whether food is safe.

## Purpose

Sift Benchmark v1 is designed to evaluate a menu-image allergy-risk workflow: image readability, visible dish recovery, conservative risk labeling, retake behavior, staff questions, prohibited assurance language, output validity, availability, latency, and repeat stability.

It is intended for engineering evaluation and regression testing. It is not a medical benchmark, a certification of a restaurant or dish, a substitute for staff confirmation, or a measure of kitchen cross-contact.

## Data Snapshot

| Artifact | Current role | Cases / groups | Composition | Review state |
| --- | --- | ---: | --- | --- |
| [`development-v1.json`](./development-v1.json) | Prompt, policy, scorer, and annotation development | 60 / 23 | 48 controlled images from 12 menu templates; 12 licensed images from 11 menu groups | 60 of 60 pending |
| [`holdout-v1.json`](./holdout-v1.json) | Synthetic candidate only; cannot freeze yet | 48 / 24 | 48 controlled synthetic images; 12 must be replaced by reviewed real-world cases across six groups | 48 of 48 pending |

The holdout file uses `version: test-v1` and `split: test`, but its benchmark ID includes `holdout-candidate` and its status is `development`. Those fields do not make it a frozen or approved test set.

The candidate holdout covers Dutch, Indonesian, Polish, Traditional Chinese, Turkish, and Vietnamese. Each language has four independent menu groups, with two cases per group and varied image quality, cuisine, severity, and cross-contact sensitivity. Twelve cases are predeclared poor-image/retake cases. A separate 12-case cross-language slice uses English as the user's language for one two-case group in each of the six menu languages. The candidate corpus SHA-256 is `426df50420a7364149a96963cc7a181e2d007ddeca9e6200acc399f8149ac2e6`.

The 25 text fixtures in [`../cases.json`](../cases.json) are separate static test inputs, not 25 model responses and not part of either image-manifest denominator.

## Evidence Classes

| Evidence | What it can support | What it cannot support now |
| --- | --- | --- |
| Development data | Tuning, regression discovery, evaluator development, and targeted comparisons | Unbiased performance or generalization claims |
| Candidate holdout | A future final evaluation after label approval, freezing, and a locked run | Any metric while labels remain pending or after tuning against its outcomes |
| Static checks | Manifest integrity, hashes, schema-aligned invariants, validator behavior, and scorer/workbench self-tests | Model quality, provider availability, or live reliability |
| Manual AI Studio evidence | Raw model behavior plus version-locked offline normalization, deterministic policy, client validation, and benchmark scoring for the exact displayed image, prompt, schema, and settings | Authentication, deployed Edge behavior, telemetry, quota, timeout, provider fallback, or end-to-end latency |
| Deployed-path evidence | Behavior observed through the authenticated deployed Edge path, including fallback, configuration provenance, response validation, and request latency | An unbiased holdout estimate unless the approved holdout and final locked candidate are used |

The manual workbench records immutable raw JSON. Its separate scorer validates the raw provider response, then applies shared normalization, deterministic risk policy, shared public-result validation, the actual client validator, and the benchmark scorer. A separate scoring manifest binds source bytes, expectations, review metadata, groups, slices, and holdout identity to every response record. Development manifests may be used for diagnostics; final test-split execution requires a frozen, lineage-verified package. Therefore neither the pending candidate nor any current path has produced benchmark-v1 holdout metrics.

## Labels

The manifests distinguish directly visible evidence, externally confirmed evidence, plausible recipe or preparation patterns, and facts that are unknown from the image. Accepted risk labels may be ranges rather than a single class. `unclear` is non-ordinal and is used for insufficient image or translation evidence.

Generated expectations are not human approval. Review must follow [`ANNOTATION_GUIDE.md`](./ANNOTATION_GUIDE.md); critical cases require an independent second reviewer before a split can be promoted. Promotion also requires exactly 12 rights-reviewed real-world cases, a byte-bound tool-computed perceptual-hash report, and approved independent visual comparison of candidate images against canonical development and each other. It binds candidate, approval, audit/report, canonical development, source intake, completed acquisition receipt, and per-case source-review bytes, including original/transformed image hashes and rights/suitability/transformation evidence hashes. It writes a separate frozen manifest plus schema-v3 lineage record. Final loaders reconstruct that package before executing test cases. Changes to labels, grouping, case membership, source bytes, audit evidence, or reviewer decisions require a new manifest version.

## Configuration Identity

At this draft's repository state, the shared modules identify prompt `2026-07-14.4`, provider/public schema `13`, provider validation `2026-07-14.8`, public-result validation `2026-07-14.4`, risk policy `2026-07-14.4`, ontology `2026-07-14.3`, normalization `2026-07-14.6`, safety-language rules `2026-07-14.3`, and app preprocessing `app-jpeg-1600-compress-0.72-v1`. These identifiers describe the current candidate code, not a completed or deployed evaluation.

The manual preparation script defaults to `gemini-3.5-flash`, low thinking, 6,000 output tokens, and provider-default temperature. The deployed function can override model and generation settings through its environment and defaults to medium thinking when no Gemini thinking level is configured. Neither a script default nor an earlier plan snapshot proves the active deployment; only captured run provenance is reportable.

Every reported run must additionally record the provider, exact model, thinking level, output-token limit, temperature and other generation settings, prompt and schema hashes, both validator hashes, policy, ontology, normalization, and safety-language versions and hashes, preprocessing and corpus hashes, scoring-manifest fingerprint, case-set fingerprint, code commit, deployment identity, explicit no-provider-retry policy, timestamps, pass count, and exclusions. Configuration drift starts a new run; evidence from different identities is not pooled.

## Licensing

Development data contains 48 repository-internal fixtures and 12 externally sourced images with declared identifiers: 7 CC0, 3 CC BY-SA 4.0, 1 CC BY 3.0, and 1 CC BY 4.0. The candidate holdout contains 48 repository-internal synthetic fixtures. It remains ineligible until exactly 12 cases across the six predeclared groups are replaced with real-world images carrying a completed source receipt, reviewed rights/suitability/transformation evidence, and duplicate-audit approval.

Per-case creator, source page, license fields, and notes are in the manifests. `declared` reproduces source metadata and still requires source-page verification before redistribution. `internal_fixture` does not assert public reuse rights. SHA-256 hashes establish identity, not permission.

## Intended Reporting

Results must use the metric definitions and denominators in [`METHODOLOGY.md`](./METHODOLOGY.md), including exact counts and 95% Wilson intervals for binary rates. Reports must separate model availability from model quality, show predeclared slices and small denominators, retain known failures, and identify whether evidence is static, manual, or deployed.

The intended private-beta thresholds are acceptance criteria, not measured results, launch readiness, or safety guarantees. They include zero directly listed severe-allergen misses, zero deterministic under-escalations, zero prohibited assurance claims, zero invalid client-visible results, 100% poor-image retake behavior, zero unsupported visible claims, zero material translation errors, 100% human-approved staff-question intent coverage with no unreviewable targets, at least 95% successful clear/partial-image results, and at most 10% benign high/avoid labels. Exact-label critical repeats must have zero non-ordinal comparisons or label flips and exact dish/readability stability. Every language slice must pass. A fixed 12-case multilingual clear/poor canary must pass with telemetry verified under the same configuration and frozen lineage.

## Limitations

- Menu images cannot establish complete recipes, substitutions, preparation practices, or cross-contact.
- The candidate holdout is synthetic, label-pending, contains no real-world images, and cannot be frozen until the required 12-case subset, completed source lineage, human reviews, computed perceptual report, and independent visual duplicate review exist.
- Related visual variants are correlated; case-level intervals are descriptive and may be too narrow for population inference.
- Language, cuisine, restaurant, and template coverage is sparse and not representative of restaurant traffic. Cuisine is a predeclared slice, but its small denominators do not support broad population claims.
- Dish matching uses normalized names and limited substring matching, which can create matching errors.
- Automated prohibited-language checks and multilingual question-intent matching are lexical proxies. The implemented human workflow evaluates visible claims, translations, and every required dish/language/channel target, but no current-candidate human results exist yet.
- Manual operation can introduce setup or transcription errors; deployed provider behavior can drift.
- Runtime analysis and evaluation tooling support up to four ordered pages. A separate 8-case / 25-page synthetic diagnostic measures page coverage and dish attribution, but it has no model responses and is not holdout or public-claim evidence.
- No benchmark result can guarantee safety, detect unlisted allergens, or prove absence of cross-contact.

The engineering failure registry snapshot for this documentation pass contains 46 entries: 43 resolved and three open blockers, provider regional availability, the missing real-world holdout subset plus human review and duplicate audit, and unmeasured live multi-page completeness. This is a workflow status, not a reliability percentage. The candidate still has zero model-produced benchmark results, every live release phase remains pending, and no launch-readiness claim is available.

## Retirement

If any holdout case or related group influences a prompt, model, schema, policy, ontology, preprocessing, or threshold decision, the entire `groupId` is retired to development. It must be replaced by a newly sourced, non-overlapping group, reviewed while blinded, and incorporated in a new version and corpus hash before a fresh full run. Historical artifacts remain immutable and are never silently relabeled or combined with replacement results.
