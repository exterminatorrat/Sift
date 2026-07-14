# Sift AI Human Adjudication

Status: engineering workflow. Human judgments are required; this tool never creates or infers review labels.

## Purpose

Automated schema and risk checks cannot determine whether text was truly visible in a menu image or whether a restaurant-language translation preserved safety-critical meaning. This workflow creates a separate, blinded human-review layer for three questions:

1. Is every `dish.transparency.visibleMenuText` claim actually supported by readable menu text?
2. Are restaurant messages and staff questions faithful translations of their user-language source?
3. Does each question set satisfy the predeclared staff-question intent for the correct dish, question channel, and required language?

The workflow is independent of the production scorer. It consumes normalized attempt evidence, emits a reviewer-only template and a separate sealed traceability key, then recomputes scoring from only complete, fingerprint-consistent human reviews. Stored human-review pass booleans are never release evidence.

## Commands

Prepare a blinded review:

```powershell
node scripts/ai-evals/human-review/generate.mjs `
  --input output/ai-evals/<phase-or-manual-run>/human-review-input.json `
  --manifest docs/ai-evals/benchmark-v1/<manifest>.json
```

The default output is ignored by Git:

```text
output/ai-evals/human-review/<deterministic-review-id>/
  images/A001.jpg
  review-template.json
  review-key.json
```

Give the reviewer only `review-template.json` and the neutral files under `images/`. Do not give them `review-key.json`, benchmark expectations, automated scores, risk labels, provider identity, or configuration details.

The reviewer must fill all item judgments plus:

```json
{
  "reviewer": {
    "id": "reviewer-language-01",
    "startedAt": "2026-07-14T08:00:00.000Z",
    "completedAt": "2026-07-14T09:00:00.000Z"
  }
}
```

Score the completed template:

```powershell
node scripts/ai-evals/human-review/score.mjs `
  --template output/ai-evals/human-review/<review-id>/review-template.json `
  --key output/ai-evals/human-review/<review-id>/review-key.json
```

Run the isolated regression test:

```powershell
node scripts/ai-evals/human-review/self-test.mjs
```

## Accepted Inputs

The generator accepts:

- A current live-evaluation artifact with `inputIdentity.sha256`, `configurationProvenance`, and `results[].output`.
- A normalized/scored attempt artifact with `runId`, `runFingerprint`, `configurationFingerprint`, and `attempts[].output`.

The manual scorer emits a compatible immutable `human-review-input.json`. Every output dish must include `transparency.visibleMenuText`. Aggregate manual reports that omit attempt outputs are rejected because claims, translations, and question intent cannot be independently reviewed. Every attempt must belong to one run/input fingerprint and one configuration fingerprint. Missing or mixed identity fails closed.

Pass the frozen holdout manifest through `--manifest` when preparing release evidence. The generator automatically loads and verifies its lineage sidecar and the bound candidate, approvals, duplicate audit, and development manifest. The manifest supplies the exact predeclared question requirements. A development or unverified manifest can support diagnostic review, but it is not release-eligible.

A normalized attempt artifact has this minimum shape:

```json
{
  "artifactType": "sift-normalized-ai-attempts",
  "runId": "candidate-v1",
  "runFingerprint": "sha256:<64 hex characters>",
  "configurationFingerprint": "sha256:<64 hex characters>",
  "attempts": [
    {
      "caseId": "I-001",
      "pass": 1,
      "runFingerprint": "sha256:<same run fingerprint>",
      "configurationFingerprint": "sha256:<same configuration fingerprint>",
      "output": {
        "dishes": [],
        "restaurantMessage": null
      }
    }
  ]
}
```

Attempt-level run and configuration fingerprints are required and must exactly match the root identity. This duplication is intentional: it lets the generator prove that attempts from different runs or configurations were not silently combined.

## Labels

Visible-text claims:

- `supported`: the claim is readable in the supplied menu image and preserves its meaning.
- `unsupported`: the claim is not present in readable text or materially adds content that is not visible.
- `unreadable`: the relevant image region or image itself cannot be responsibly adjudicated.

Translation fidelity:

- `faithful`: the target preserves allergy, dish, preparation, severity, and uncertainty meaning.
- `material_error`: the target omits, adds, or changes meaning in a way that could affect restaurant communication.
- `unreviewable`: the reviewer cannot responsibly judge the language pair, or source/target text is unavailable.

Question intent:

- `meets_intent`: the displayed questions address the specified intent for the named dish, allergen set, question channel, and required language.
- `misses_intent`: the questions omit or materially change the required intent, target the wrong dish or allergen, use the wrong channel, or are not in the required language.
- `unreviewable`: the reviewer cannot responsibly judge the intent or language.

Use reviewers who can independently read the menu language and each translation pair. A reviewer must choose `unreviewable`, not guess, when they lack the required language competence or image evidence.

## Metrics

Visible-text hallucination is reported as:

```text
numerator   = unsupported claims
denominator = supported + unsupported claims
rate        = numerator / denominator
```

`unreadable` claims are reported separately and excluded from the denominator. The report includes a Wilson 95% confidence interval; the rate and interval are `null` when the denominator is zero.

Translation reporting includes `faithful`, `material_error`, and `unreviewable` counts for all translations, restaurant messages, and staff questions. Fidelity and material-error rates use `faithful + material_error` as the denominator. `unreviewable` items are reported separately, not silently counted as correct or incorrect. Both rates include Wilson 95% intervals.

Question-intent reporting includes `meets_intent`, `misses_intent`, and `unreviewable` for every manifest requirement and each required dish, language, and channel target. The complete human release gate passes only when the review is frozen-manifest and lineage bound, every expected visible-claim, translation, and question-intent item is present, and there are zero unsupported visible claims, zero material translation errors, zero missed intents, and zero unreviewable required items. This human gate is not a standalone reliability claim. Combined reporting re-scores the filled template and sealed key supplied with `--human-review-template` and `--human-review-key`, then verifies that their run, configuration, question-requirements, manifest, and holdout-lineage fingerprints match the recomputed frozen-holdout phase.

## Integrity And Blinding

- Reviewer-facing attempt and dish references are neutral (`A001`, `D01`).
- Images are copied under neutral filenames when local source images are available.
- The reviewer template excludes case IDs, benchmark labels, risk scores, expected answers, provider/model identity, and configuration fingerprints.
- The separate key preserves source case/pass mapping and immutable content fingerprints.
- Frozen-manifest lineage, candidate, approval, duplicate-audit, development-manifest, and question-requirement fingerprints are bound into the review key; changing requirement text, scope, language, channel, or any source artifact invalidates the review.
- Scoring requires exact item coverage, a reviewer ID, valid start/completion timestamps, and allowed judgments for every item.
- Altered item text, missing or duplicate items, invalid key fingerprints, mixed run/config identities, forged stored decisions, and incomplete reviews are rejected.
- Output remains local under the ignored `output/` tree by default. Do not commit raw reviewer files unless a separate privacy review approves it.

This workflow measures agreement with human adjudication. It does not prove that a dish is safe, replace restaurant confirmation, or remove the need for qualified allergy-domain review.
