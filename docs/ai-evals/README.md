# Sift AI Eval Set

This directory contains Sift's static, manual, and deployed-path menu-analysis reliability sets. Static checks never call a provider. Manual runs record authorized Google AI Studio output. Live checks call the deployed Supabase Edge Function and must remain within the active provider and project limits.

The evals check the behavior Sift must preserve:

- Never use food-safety guarantee language.
- Escalate severe allergy uncertainty.
- Mark unreadable or incomplete menus as `unclear` or `ask_staff`.
- Include practical staff questions for every dish.
- Include restaurant-language questions and user-language references when requested.
- Keep transparency user-facing, not hidden chain-of-thought.

The current repository candidate and shared runtime code use provider/public schema `13`, prompt `2026-07-14.4`, provider validation `2026-07-14.8`, public validation `2026-07-14.4`, risk policy `2026-07-14.4`, ontology `2026-07-14.3`, normalization `2026-07-14.6`, and safety-language rules `2026-07-14.3`; deployment provenance must confirm those exact versions before live evidence is attributed to them. The candidate classifies page purpose at the provider boundary, enforces dish coverage only for readable dish-listing pages, validates dish source-page attribution, profile-scoped evidence, requested-language metadata, non-Latin communication scripts, and staff communication before normalization; preserves page provenance, validated evidence, and explicit uncertainty through deterministic risk policy; and validates the public result with the shared server validator. Each accepted scan makes one provider inference call with no provider retry; unresolved failures become a calm `unclear` result.

## How To Use

1. Run the static fixture and architecture checks:

```powershell
npm.cmd run eval:ai
npm.cmd run eval:ai:architecture
```

2. To validate a saved model response, place it in `docs/ai-evals/sample-output.json`.

3. Run the checks again:

```powershell
npm.cmd run eval:ai -- docs/ai-evals/sample-output.json
```

4. For a manual model pilot, prepare a sealed run and follow [`manual-workbench.md`](./manual-workbench.md):

```powershell
npm.cmd run eval:ai:manual:prepare -- --run-id <run-id> --cases I-001,I-028,I-033
```

The separate controlled multi-page diagnostic can be regenerated, verified, preprocessed, and prepared for the same workbench without changing the development or holdout sets:

```powershell
npm.cmd run eval:ai:multi-page:generate
npm.cmd run eval:ai:multi-page:check
npm.cmd run eval:ai:prepare-images:multi-page
npm.cmd run eval:ai:manual:prepare:multi-page
```

It contains 8 synthetic cases and 25 ordered pages. It is development diagnostic evidence only and cannot support a public accuracy claim.

5. For a deployed-path run, prepare a disposable anonymous user:

```powershell
npm.cmd run eval:ai:live -- prepare
```

Assign that user a server-side test entitlement, then run a paced development diagnostic with a versioned development manifest:

```powershell
npm.cmd run eval:ai:live -- run --phase development --cases all --manifest docs/ai-evals/benchmark-v1/development-v1.json
```

The runner spaces calls 15 seconds apart by default and refuses to exceed 120 claimed calls. Use `--min-call-interval-ms` when the active provider/project limit requires slower pacing. Stop on quota or billing-required responses; never enable billing just to finish the eval.

A final test-split phase must use the promoted frozen manifest, its adjacent lineage record, and the candidate, approval, duplicate-audit/report, canonical development, source-intake, acquisition, and source-review files named by that lineage. Candidate `holdout-v1.json` fails closed and cannot be run directly. Gate and repeat phases also require pinned provider, model, thinking level, and configuration SHA-256. The combined report recomputes metrics from raw phase attempts and frozen input bytes, re-verifies canary telemetry, and re-scores the filled human-review template against its sealed key; stored summary or pass booleans are ignored. It requires a passed frozen-holdout gate, exact-label critical repeats from the same lineage, a fixed 12-case multilingual clear/poor canary, per-language safety gates, and one shared configuration:

```powershell
npm.cmd run eval:ai:live -- run --phase holdout-gate --cases all --manifest <frozen-holdout.json> --preprocessed-manifest <prepared-images.json> --expected-provider gemini --expected-model <model> --expected-thinking <level> --expected-configuration-sha256 <sha256>
npm.cmd run eval:ai:live -- run --phase repeat-critical --cases critical --repeat 3 --manifest <frozen-holdout.json> --expected-provider gemini --expected-model <model> --expected-thinking <level> --expected-configuration-sha256 <sha256>
npm.cmd run eval:ai:live -- run --phase deployed-canary --release-gate --telemetry required --manifest <frozen-holdout.json> --expected-provider gemini --expected-model <model> --expected-thinking <level> --expected-configuration-sha256 <sha256>
npm.cmd run eval:ai:live -- report --manifest <frozen-holdout.json> --preprocessed-manifest <prepared-images.json> --human-review-template <filled-template.json> --human-review-key <sealed-key.json> --expected-provider gemini --expected-model <model> --expected-thinking <level> --expected-configuration-sha256 <sha256>
```

Clean up when finished:

```powershell
npm.cmd run eval:ai:live -- cleanup
```

Delete the disposable auth user server-side so entitlement and usage rows cascade. Raw evidence is written under ignored `output/ai-evals`.

These checks validate broad reliability requirements only. They do not prove that a model is medically or operationally correct.

## Cases

The static cases map to `E-001` through `E-025`. The versioned development manifest adds 60 image cases:

- Japanese ramen menu with severe peanut and sesame allergies.
- Mexican menu with mole, dairy, egg, sesame, and peanut concerns.
- Blurry or unreadable menu.
- Direct listed shellfish allergen.
- Vague sauces and shared fryer.
- Same menu with severe vs mild sesame profile.
- Non-English niche-language menu with unknown restaurant language.
- Low-risk simple item with mild peanut profile.
- Hidden sesame, peanut, dairy, egg, soy, wheat/gluten, shellfish, and tree-nut risk patterns.
- Shared fryer, vague sauce, low-confidence, and poor-image escalation scenarios.
- Spanish, Japanese, French, and unclear-language menu scenarios.

The development image set contains 48 deterministic menu renders and 12 licensed public-domain or Creative Commons photos. Attribution and source URLs are in `licensed-images.json`. The canonical development manifest is `benchmark-v1/development-v1.json`; `image-cases.json` remains its legacy source material.

`benchmark-v1/holdout-v1.json` is a separate 48-case synthetic candidate in Traditional Chinese, Vietnamese, Turkish, Polish, Indonesian, and Dutch. It contains 24 independent menu groups, two cases per group, with four groups per language. Twelve cases form a cross-language slice: one two-case group per menu language uses English as the user's language. The candidate corpus SHA-256 is `426df50420a7364149a96963cc7a181e2d007ddeca9e6200acc399f8149ac2e6`. All 48 labels remain pending human review, and the corpus is not promotion-eligible: freezing requires exactly 12 rights-reviewed real-world cases across the six predeclared groups, a completed source-acquisition receipt, per-case rights/suitability/transformation review, a byte-bound tool-computed perceptual-hash report, and approved independent visual near-duplicate review against the canonical development bytes and every candidate pair. It currently has zero live responses.

`benchmark-v1/real-world-source-candidates.json` is a separate research intake for six possible sources, one per holdout language. It maps only to the six predeclared cross-language groups and contains provenance, declared license metadata, and pending review notes. It deliberately contains no expected dishes, risks, questions, or model outputs. `npm.cmd run eval:ai:sources` uses exact key allowlists, semantic label-leakage checks, canonical Commons filename matching across title/page/download URLs, canonical license declarations, and fixed group mappings. The intake does not modify the candidate image bytes and is not rights approval, annotation, duplicate-audit evidence, or model evidence.

Source acquisition is also isolated from benchmark labels and cases. Download the six candidates with conservative Wikimedia pacing, or verify already downloaded files, under the ignored `output/` tree:

```powershell
npm.cmd run eval:ai:sources:acquire:self-test
npm.cmd run eval:ai:sources:acquire -- --download
npm.cmd run eval:ai:sources:acquire -- --check-local
```

The schema-v2 acquisition manifest is written only by `--download`, checkpoints after each verified source, and is marked `complete` only after all six decoded JPEGs match their source identity, dimensions, and SHA-256 receipt. `--check-local` refuses stale, partial, or caller-created receipts. The current ignored local receipt is schema v1 and therefore intentionally untrusted; a fresh schema-v2 receipt remains pending after Wikimedia returned HTTP 429 during the refresh. The tool uses conservative pacing and one bounded `Retry-After` retry. Acquisition cannot approve rights, add labels, modify holdout cases, or freeze the benchmark.

After reviewed source images replace the six predeclared groups and the mixed candidate is rebuilt, generate the separate evidence template from that exact candidate and completed acquisition receipt:

```powershell
node scripts/ai-evals/promote-holdout.mjs source-review-template --candidate <mixed-candidate.json> --acquisition <schema-v2-acquisition.json> --output <source-review.json>
```

The template remains pending until independent reviewers approve rights, benchmark suitability, and each image transformation and attach evidence hashes for the exact original and transformed bytes.

The holdout cannot become frozen by changing its status field, supplying a caller-selected case count, choosing a substitute development manifest, or approving synthetic labels alone. `scripts/ai-evals/promote-holdout.mjs` recomputes perceptual hashes from actual candidate and canonical development image bytes, then pins those bytes, the six required real-world groups, exact source-intake and completed acquisition bytes, per-case source/output hashes, a separate source-review artifact, label approvals, the perceptual report, and the independent visual-review artifact. The self-test proves this contract rejects forged or incomplete artifacts; it does not prove reviewer independence or that a real visual audit was performed. Promotion writes a new frozen manifest and schema-v3 lineage record; final loaders reconstruct and verify every bound artifact before accepting test cases.

Four factor-isolated Gemini comparisons are declared in `benchmark-v1/experiments-v1.json`: 1,600 versus 2,048-pixel preprocessing, unspecified versus high media resolution, low versus medium thinking, and instruction-first versus image-first content order. The plan is `planned_unexecuted`; it contains no model result and selects no winning setting.

Manual preparation writes a separate scoring manifest bound to the exact source-manifest bytes, expectations, review state, groups, slices, and holdout lineage. Its fingerprint is copied into checkpoints and immutable response records, preventing a response from being scored against changed labels. Manual and live reports can capture latency and optional input, output, and thinking token counts. Scoring reports exact-label risk confusion separately from range-labeled risk checks and predeclares slices for group, source type, language, cuisine, quality, critical status, allergen, severity, and cross-contact sensitivity.

Human review remains required for visible-text support, translation fidelity, and each required staff-question intent by dish, language, and channel. Any unsupported visible claim, material translation error, missed intent, unreviewable required item, or incomplete expected coverage blocks the human release gate. Combined reporting re-scores the filled template against its sealed key instead of trusting a saved pass flag. No benchmark-v1 reliability percentage or launch-readiness claim is currently reportable.

The engineering failure registry snapshot for this documentation pass contains 46 entries: 43 resolved and three open (`FAIL-003`, provider regional availability; `FAIL-031`, missing real-world holdout subset and duplicate audit; `FAIL-033`, missing live multi-page completeness coverage). Registry resolution means the named engineering regression has evidence-backed coverage; it is not a substitute for live model or human evaluation. All live release gates remain pending.

Read the public claim boundaries in [`benchmark-v1/BENCHMARK_CARD.md`](./benchmark-v1/BENCHMARK_CARD.md), the scoring protocol in [`benchmark-v1/METHODOLOGY.md`](./benchmark-v1/METHODOLOGY.md), and the runtime/file architecture in [`../ai-reliability-architecture.md`](../ai-reliability-architecture.md).
