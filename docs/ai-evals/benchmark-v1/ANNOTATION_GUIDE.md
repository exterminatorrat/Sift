# Sift Benchmark v1 Annotation Guide

## Purpose and status

`development-v1.json` is the versioned development snapshot of the 60 cases in `docs/ai-evals/image-cases.json`. It is for prompt, evaluator, and annotation development. It is not a held-out test set, and results on it must not be presented as unbiased test performance.

The manifest follows `benchmark-manifest.schema.json` version `1.0.0`. Treat a published manifest version as immutable. Any change to case membership, grouping, labels, ranges, question requirements, source bytes, or reviewer decisions requires a new manifest version.

The generated `development-v1` reviewer state is intentionally `pending`. The legacy expectations have been migrated, but no human approval is invented.

## Leakage groups

The split unit is an underlying menu or source template, never an individual image. Assign groups to development, validation, or test before sampling cases.

The 60 current cases form 23 groups:

- 12 controlled template groups, each containing four render or quality variants of the same menu.
- 11 licensed menu groups.
- `L-009` and `L-010` share `licensed/sawadee-thai-restaurant` because they are pages from the same restaurant menu.

All cases with the same `groupId` must remain in one split. Profile severity, user language, crop, blur, glare, skew, page number, or other image variation does not create an independent leakage unit. Near-duplicates or additional pages discovered later must join the existing underlying-menu group.

## Evidence labels

Apply a label to the specific claim being annotated, not to the case as a whole.

| Label | Use when | Do not use when |
| --- | --- | --- |
| `confirmed_visible` | Legible menu text directly names the ingredient, allergen, derivative, preparation method, or cross-contact fact needed for the claim. | The fact is inferred from cuisine, a dish name alone, unreadable text, or off-image knowledge. |
| `confirmed_external` | A reliable external source directly supports the claim and every supporting HTTPS URL is recorded in `evidenceSourceUrls`. | The URL only establishes image provenance or licensing, or the source does not address the exact menu/dish claim. |
| `plausible_pattern` | A recipe, cuisine, sauce, fryer, or preparation pattern makes the concern plausible but staff confirmation is still required. | The relevant fact is visibly confirmed or there is no reasonable basis for the pattern. |
| `unknown_unobservable` | The image, menu, or available sources cannot establish the claim, including ingredient absence, cross-contact absence, or unreadable content. | A direct visible or cited fact is available. |

Rules:

1. Annotate only what the evidence supports. A familiar recipe is not proof of this restaurant's recipe.
2. Absence is usually unobservable. A simple description can support a tolerant `low_risk` to `ask_staff` range, but it cannot confirm allergen-free preparation.
3. Provenance and license pages are not food-safety evidence unless they independently document the exact claim.
4. `confirmed_external` requires at least one direct HTTPS source in `evidenceSourceUrls`.
5. When labels conflict, prefer the more conservative evidence claim and record the disagreement for review.

For the legacy migration, `directListed: true` maps to `confirmed_visible`. Other minimum-risk targets map to `plausible_pattern`. Benign controls and poor or unannotated menu-level claims map to `unknown_unobservable`. No current case is generated as `confirmed_external`.

## Allowed risk ranges

Ordinal concern increases in this order:

`low_risk` -> `ask_staff` -> `high_risk` -> `avoid_unless_confirmed`

`unclear` is non-ordinal. Use it when image or translation uncertainty prevents a reliable assessment, not as a point between two ordinal levels.

Each `allowedRiskRange.levels` array is the authoritative accepted set. For an ordinal range, `minimum` and `maximum` are inclusive and `levels` must contain every contiguous level between them. A non-ordinal unclear range has null bounds and exactly `levels: ["unclear"]`.

The legacy conversion is:

| Legacy expectation | v1 allowed levels |
| --- | --- |
| Minimum `ask_staff` | `ask_staff`, `high_risk`, `avoid_unless_confirmed` |
| Minimum `high_risk` | `high_risk`, `avoid_unless_confirmed` |
| Minimum `avoid_unless_confirmed` | `avoid_unless_confirmed` |
| Benign control | `low_risk`, `ask_staff` |
| Poor image overall risk | `unclear` |
| No legacy menu-level expectation | `status: not_annotated`, null range |

Do not score a `not_annotated` target as correct or incorrect. Do not silently widen a range to make a model pass. A range change is an annotation change and requires review plus a new manifest version.

## Required questions

Question requirements describe semantic intent, not exact wording. Equivalent clear phrasing may pass.

| Intent | Requirement |
| --- | --- |
| `request_readable_menu` | Ask for a clearer menu, retake, or direct staff help when the image is poor. |
| `confirm_ingredients` | Ask staff to confirm relevant ingredients for each returned dish. |
| `confirm_preparation` | Ask about the preparation detail behind each named `plausible_pattern` target. |
| `confirm_cross_contact` | Ask about shared equipment or handling for allergies marked `avoidCrossContact`. |

`requiredLanguages` lists the user's preferred language first and the restaurant language second, with duplicates removed. When two languages are listed, the semantic question must be available in both. A translation must preserve the allergen, dish, and preparation intent.

Question evaluation must reject empty, generic prompts such as "Is this safe?" when they omit the required allergen or preparation intent. It must not require an exact sentence match.

## Provenance and licensing

Every case records:

- The source manifest path and source case ID.
- A SHA-256 hash of the canonical source record.
- The controlled fixture generator path or licensed source page.
- Source title and creator when available.
- License status, identifier, attribution flag, source page, and notes.

`internal_fixture` means only that the image is a repository-controlled test fixture. It does not assert a public license or external reuse rights. `declared` copies the identifier in the source record; reviewers must verify the linked source page before redistribution. Hashes establish identity, not permission.

## Hashes and reproducibility

Each `image.sha256` is SHA-256 over the image's raw bytes. `corpus.sourceManifest.sha256` is SHA-256 over the raw bytes of `docs/ai-evals/image-cases.json`.

`corpus.sha256` is SHA-256 over compact canonical JSON with recursively sorted object keys and array order preserved. The hashed value has this shape:

```json
{
  "sourceManifestSha256": "<source manifest digest>",
  "cases": [
    {
      "id": "<case id>",
      "groupId": "<leakage group id>",
      "imagePath": "<repository-relative path>",
      "imageSha256": "<raw image digest>"
    }
  ]
}
```

Cases are ordered by ID. The builder reads source images but never writes or transforms them. A source JSON or image-byte change makes `--check` fail until a deliberately versioned manifest is generated.

## Review workflow

1. Verify the image hash and inspect the exact image associated with the case.
2. Confirm the leakage group before reviewing labels.
3. Review readability, retake behavior, each dish evidence label, risk range, and required question intent.
4. Verify provenance and license fields independently from food-safety evidence.
5. Record a stable reviewer ID and UTC ISO 8601 review time in a new versioned manifest definition.
6. Require a second reviewer for every `critical` case before promotion to a frozen validation or test set.
7. Resolve disagreements explicitly. Do not average labels or widen ranges without a documented decision.

A reviewer must not approve a case they authored alone when it is critical. Reviewer notes should explain exceptions, ambiguity, or rejected evidence without including personal data.

## Build and validate

From the repository root:

```powershell
node scripts/ai-evals/build-benchmark-manifest.mjs --write
node scripts/ai-evals/build-benchmark-manifest.mjs --check
```

The script uses only Node.js built-ins. `--write` emits canonical JSON at `docs/ai-evals/benchmark-v1/development-v1.json`; `--check` rebuilds in memory, validates schema-aligned invariants and hashes, and requires byte-for-byte canonical output.
