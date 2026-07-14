# Manual Google AI Studio Eval Workbench

Status: internal evaluation tool. The browser workbench records raw manual model responses. A separate local scorer validates and postprocesses completed runs; neither tool establishes that a result is medically or operationally correct.

## Purpose

Use this workbench when a Sift model candidate must be evaluated manually in Google AI Studio without adding provider calls to the repository tooling. The local server presents the prepared inputs, hides scoring labels, and checkpoints pasted raw JSON after every case.

The workbench itself:

- binds only to `127.0.0.1`;
- loads images and JSON from local files;
- uses no dependencies, remote fonts, analytics, CDNs, or external HTTP calls;
- never opens AI Studio or uploads data on the operator's behalf;
- writes only under `output/ai-evals/manual/<runId>`.

Manual actions in Google AI Studio are outside the workbench's network boundary. Use only synthetic, licensed, public-domain, or expressly approved evaluation data, and follow the active provider terms for anything uploaded there.

## Before A Run

1. Prepare a run from a versioned benchmark manifest, or create a compatible directory with `config.json`, `cases/*.json`, and resolvable local images. Development runs may use the development manifest. Final test-split preparation requires a frozen, lineage-verified holdout package; the current 48-case synthetic candidate cannot freeze until exactly 12 real-world cases, completed source/acquisition/review evidence, label approvals, a byte-bound tool-computed perceptual-hash report, and approved independent visual duplicate review are bound into schema-v3 lineage. The exact format is documented in [`scripts/ai-evals/manual-workbench/README.md`](../../scripts/ai-evals/manual-workbench/README.md).
2. Put the exact model identifier, system prompt, response schema, thinking level, temperature, MIME type, prompt content order, menu-page label behavior, and any other generation-affecting setting in `config.json` and the prepared cases.
3. Give a changed model, prompt, schema, generation config, or case set a new `runId`. Do not reuse an output directory for a different candidate.
4. Seal the repeat count when preparing the run. For example, `--passes 3` means the scorer requires exactly passes 1, 2, and 3. The preparation script defaults to one pass.
5. Generate the four canonical fingerprints:

```powershell
node scripts/ai-evals/manual-workbench/fingerprint.mjs --run "C:\path\to\prepared-run" --write
```

6. Review the resulting `config.json.fingerprints`. Any later config edit makes at least one declared fingerprint stale and blocks startup until the run is deliberately re-prepared.

Preparation also writes `evidence/scoring-manifest.json`. This separate manifest binds the exact source-manifest bytes, scoring expectations, review metadata, grouping, slices, and holdout identity to one `scoringManifestFingerprint`. The fingerprint is copied into the workbench manifest, pass checkpoints, and every response record. Editing labels or source bytes after preparation therefore blocks scoring instead of silently changing the answer key.

## Run One Pass

Start the workbench from the repository root:

```powershell
node scripts/ai-evals/manual-workbench/server.mjs --run "C:\path\to\prepared-run" --pass 1
```

Then open `http://127.0.0.1:4317`.

For every case in each pass:

1. Select the next open case and start a new Google AI Studio chat for that case.
2. Configure AI Studio from the prepared `config.json`; do not change the model, prompt, schema, or generation settings during the run.
3. Follow the displayed content order exactly. The workbench shows whether the user prompt or image comes first and shows the exact `MENU PAGE ...` label used by the Edge Function.
4. Acknowledge the fresh session for the current case. The checkbox resets for every case, is cached in browser session storage for that case and pass, and is persisted in the immutable saved response record.
5. Manually provide the displayed image, page label, profile, and user prompt to the configured AI Studio session.
6. Paste only the raw JSON response into the workbench. Markdown fences and explanatory prose are rejected as invalid JSON.
7. Optionally enter the latency and input, output, and thinking token counts shown by AI Studio. Unknown values remain blank.
8. Save the response. The queue advances to the next open case after the atomic response and checkpoint writes succeed.

Completed cases remain readable but cannot be overwritten. Repeating the same local submission is idempotent only when both the parsed JSON and optional execution metrics match the checkpointed record.

## Score A Completed Run

After every selected case and pass is complete, run the separate scorer:

```powershell
npm.cmd run eval:ai:manual:score -- --run-id <run-id>
```

The scorer rejects missing, extra, duplicate, malformed, mixed-config, or mixed-scoring-manifest responses. A provisional report may explicitly allow missing cases or whole passes with `--allow-incomplete`; extra passes are always rejected. It then applies schema-13 provider validation, shared normalization, deterministic risk policy, shared public-result validation, the actual client validator, and benchmark scoring. Saved reports contain sanitized aggregates, including execution-metric coverage and distributions when recorded, rather than prompts, profiles, menu text, images, or full model output. Automated multilingual question-intent coverage is a lexical proxy and still requires human review of visible-text support, translations, and question meaning.

A complete score also emits immutable `human-review-input.json`, which preserves normalized attempt outputs plus the run and scoring fingerprints needed by the blinded human-review workflow. A manual score alone is not a release claim. Combined reporting independently re-scores the filled human-review template against its sealed key, recomputes phase metrics from raw attempts and frozen inputs, and re-verifies canary telemetry. It remains blocked until visible claims, translations, and question intents pass human review; exact-label critical repeats pass on the same lineage; every required language slice passes; and the fixed 12-case same-configuration canary passes with verified telemetry.

## Resume

After an interruption, rerun the exact same command with the same prepared directory, run ID, and pass number:

```powershell
node scripts/ai-evals/manual-workbench/server.mjs --run "C:\path\to\prepared-run" --pass 1
```

The server validates the stored manifest, checkpoint, and every response record before serving the queue. It reconstructs completion from the response files and selects the first unfinished case.

Do not delete or edit `manifest.json`, checkpoints, or response files to bypass a mismatch. Preserve the existing evidence and start a new run ID when the evaluated configuration or case inputs changed.

## Additional Passes

Increment `--pass` for each prepared repeat. Every case in that pass still requires its own fresh AI Studio chat:

```powershell
node scripts/ai-evals/manual-workbench/server.mjs --run "C:\path\to\prepared-run" --pass 2
```

Passes share the locked run manifest but have separate response and checkpoint directories. The server refuses a pass above `config.json.executionPlan.expectedPasses`, and the scorer requires the complete sequence from 1 through that expected count.

## Operational Checks

Health:

```powershell
Invoke-RestMethod http://127.0.0.1:4317/healthz
```

Progress and active identity:

```powershell
Invoke-RestMethod http://127.0.0.1:4317/status | ConvertTo-Json -Depth 6
```

Stop the server with `Ctrl+C` after the pass.

## Blocking Errors

| Error | Meaning | Action |
| --- | --- | --- |
| Missing fingerprints | `config.json` was not sealed | Run `fingerprint.mjs --write` after reviewing the config |
| Config fingerprint mismatch | Declared model, prompt, schema, or full-config hash is stale | Re-prepare deliberately; use a new run ID if evaluation already began |
| Scoring manifest mismatch | Source bytes, expectations, review metadata, groups, slices, or holdout identity differ from the sealed scoring evidence | Preserve the run and prepare a new run ID; do not edit evidence in place |
| Stored identity mismatch | Existing output belongs to a different config or case set | Preserve it and start a new run ID |
| Submission fingerprint mismatch | The browser submission does not match the active server identity | Reload the workbench; do not mix tabs or servers |
| Fresh session required | The current case was not acknowledged as a new AI Studio chat | Start a new chat for that case and select its acknowledgement checkbox |
| Invalid execution metrics | A supplied metric is negative, fractional, or outside the safe integer range | Correct the value or leave the optional field blank |
| Missing or unexpected pass | Saved pass directories do not match the sealed execution plan | Complete the missing pass, use `--allow-incomplete` for a provisional report, or preserve the evidence and prepare a new run |
| Case already completed | A different JSON response is being submitted for an immutable case/pass | Keep the saved evidence or start another pass |
| Invalid raw JSON | The paste contains fences, prose, truncation, or malformed JSON | Paste the provider's raw valid JSON only |

## Verification

Run the dependency-free end-to-end self-test:

```powershell
node scripts/ai-evals/manual-workbench/self-test.mjs
```

It verifies neutral browser-facing names, label non-disclosure, exact input metadata, per-case fresh-session evidence, sealed pass counts, optional execution metrics, local-only Host/Origin rules, config and scoring-manifest fingerprint rejection, atomic checkpoints, idempotent submission handling, conflicting-duplicate rejection, restart resume, pass isolation, and tampered-response rejection. "Idempotent" here describes resubmitting identical evidence to the local recorder; it is not a provider retry. Sift's runtime makes one provider inference call per accepted scan. No manual run currently supplies model-produced Benchmark v1 results.
