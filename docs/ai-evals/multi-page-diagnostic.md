# Multi-page AI diagnostic corpus

`multi-page-cases.json` is a controlled, synthetic development corpus for diagnosing Sift's ordered multi-page menu analysis path. It is deliberately separate from the 60-case development benchmark, the 48-case holdout, shared scoring, and the live evaluation runner.

## Evidence boundary

This corpus provides development diagnostic evidence only. It is not a holdout, a release gate, or evidence for a public accuracy claim. Its labels are deterministic fixture expectations and have not been promoted through the benchmark review or holdout-freezing process.

Do not combine results from these cases with holdout metrics or publish them as product accuracy. Use them to localize multi-page regressions, inspect page attribution, and compare behavior during development.

## Coverage

| Case | Language | Pages | Primary diagnostic |
| --- | --- | ---: | --- |
| `MP-001` | English | 2 | Direct peanut evidence first appears on page 2 |
| `MP-002` | Spanish | 3 | Benign page, severe sesame/shellfish page, and an uncertain broth page |
| `MP-003` | Japanese | 4 | One repeated dish must be deduplicated with source pages 1 and 3 |
| `MP-004` | Simplified Chinese | 3 | One deliberately poor page among two readable pages |
| `MP-005` | Thai | 2 | Cropped second page with visible peanut evidence |
| `MP-006` | German | 3 | Partial occlusion and glare with mustard and white-wine evidence |
| `MP-007` | Italian | 4 | Shellfish and dairy evidence distributed across four pages |
| `MP-008` | English | 4 | Clear maximum-page control with dairy and soy evidence |

Profiles vary severity and cross-contact settings and collectively cover peanut, sesame, soy, shellfish, dairy, mustard, and sulfites. The challenged images are rendered before deterministic quality transforms, so blur, crop, glare, and occlusion are visible in the checked-in JPEGs.

## Manifest contract

- `imagePaths` is the ordered request-page sequence and contains two to four unique JPEG paths.
- `expectations.pages` has one contiguous page assessment per image, including readability, retake status, visible issues, content labels, and visible dish names.
- `expectations.dishes` contains one record per deduplicated dish. `sourcePageNumbers` preserves every visible source page, and `allowedRiskRange` uses the benchmark's ordinal risk vocabulary.
- `expected` retains compact `readability`, `minimumRisks`, and `benignDishes` fields for legacy-style diagnostic adapters. This corpus is not connected to an existing runner by default.
- `imageSha256s` binds each ordered path to the generated JPEG bytes.

## Generate and verify

Python 3 and Pillow are required, matching the repository's other controlled image generators.

```powershell
python scripts/generate-ai-multipage-fixtures.py --write
python scripts/generate-ai-multipage-fixtures.py --check
node scripts/ai-evals/multi-page-corpus-self-test.mjs
```

The self-test enforces the fixed eight-case size, unique IDs and paths, two-to-four-page limits, exact page expectation counts, valid source page numbers, JPEG existence and hashes, four-page coverage, and the required scenario, language, and allergen coverage.
