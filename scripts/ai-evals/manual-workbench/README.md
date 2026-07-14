# Manual AI Eval Workbench

Dependency-free local Node workbench for recording manual Google AI Studio responses. It binds only to `127.0.0.1`, serves no remote assets, makes no outbound requests, and writes one immutable response per case and pass.

The operator guide is at [`docs/ai-evals/manual-workbench.md`](../../../docs/ai-evals/manual-workbench.md).

## Commands

Run these commands from the Sift repository root.

Prepare a version-locked development run:

```powershell
npm.cmd run eval:ai:manual:prepare -- --run-id <run-id> --cases I-001,I-028,I-033
```

Use `--manifest` and `--preprocessed-manifest` for a different versioned corpus. Candidate holdout preparation is rejected until all selected review statuses are approved.

Prepare or refresh the canonical fingerprints after `config.json` is final:

```powershell
node scripts/ai-evals/manual-workbench/fingerprint.mjs --run "C:\path\to\prepared-run" --write
```

Start pass 1:

```powershell
node scripts/ai-evals/manual-workbench/server.mjs --run "C:\path\to\prepared-run" --pass 1
```

Open `http://127.0.0.1:4317`. Use another local port when needed:

```powershell
node scripts/ai-evals/manual-workbench/server.mjs --run "C:\path\to\prepared-run" --pass 1 --port 4319
```

Restart the same command to resume. Start a separate pass by changing `--pass`; responses stay isolated under the same run ID.

Check the running process:

```powershell
Invoke-RestMethod http://127.0.0.1:4317/healthz
Invoke-RestMethod http://127.0.0.1:4317/status
```

Run syntax and end-to-end checks:

```powershell
Get-ChildItem scripts/ai-evals/manual-workbench -Recurse -File |
  Where-Object { $_.Extension -in '.mjs', '.js' } |
  ForEach-Object { node --check $_.FullName }

node scripts/ai-evals/manual-workbench/self-test.mjs
```

Score a complete run with:

```powershell
npm.cmd run eval:ai:manual:score -- --run-id <run-id>
```

No dependency install step is required.

## Prepared Run Format

```text
prepared-run/
  config.json
  cases/
    001.json
    002.json
  images/
    I-001.jpg
    I-002.jpg
```

`config.json` must define `runId`, `model`, `prompt`, and `schema`. The complete JSON values are fingerprinted, so these fields can be strings or structured objects. Put every generation-affecting setting in the config before fingerprinting.

```json
{
  "formatVersion": 1,
  "runId": "candidate-2026-07-13-manual",
  "model": {
    "provider": "google-ai-studio",
    "name": "exact-model-id"
  },
  "prompt": {
    "version": "2026-07-13.5",
    "system": "Exact system instruction used in AI Studio"
  },
  "schema": {
    "version": "7",
    "responseSchema": {}
  },
  "generationConfig": {
    "thinkingLevel": "low",
    "temperature": 0,
    "responseMimeType": "application/json"
  },
  "imageBaseDirectory": ".",
  "freshSessionReminder": "Start a fresh Google AI Studio chat before this pass, then keep the model and settings unchanged."
}
```

`fingerprint.mjs --write` atomically adds:

```json
{
  "fingerprints": {
    "model": "sha256:...",
    "prompt": "sha256:...",
    "schema": "sha256:...",
    "config": "sha256:..."
  }
}
```

The config fingerprint covers the complete `config.json` except the self-referential `fingerprints` field. The server refuses to start when a declared fingerprint is missing or stale.

Each `cases/*.json` file may contain one case object or an array. Required input fields are:

```json
{
  "id": "I-001",
  "name": "Garden Mezze - clear",
  "imagePath": "images/I-001.jpg",
  "profile": {
    "preferredLanguage": "English",
    "allergies": []
  },
  "userPrompt": "Exact per-case user prompt",
  "expected": {
    "privateScoringData": "This is never served to the browser"
  }
}
```

The browser receives only `id`, `name`, `image`, `profile`, `userPrompt`, completion state, and a saved raw response. Unknown fields, including `expected`, `labels`, `groundTruth`, and `evaluation`, are discarded by the loader before any API response is built.

Relative image paths resolve from `imageBaseDirectory`, which itself resolves from the prepared-run directory. Absolute local image paths are also accepted. Supported browser image types are AVIF, GIF, JPEG, PNG, and WebP.

## Output And Resume

The repository-relative output layout is fixed:

```text
output/ai-evals/manual/<runId>/
  manifest.json
  pass-001/
    checkpoint.json
    responses/
      <case-id>-<hash>.json
  pass-002/
    checkpoint.json
    responses/
```

- A response file is written to a same-directory temporary file, flushed, and renamed into place.
- A checkpoint is atomically replaced after every accepted case.
- Resume scans immutable response files as the source of truth and rebuilds the checkpoint, so a crash between those two writes cannot duplicate or lose a completed case.
- Retrying semantically identical JSON is idempotent. A different response for a completed case is rejected.
- The run manifest locks all four config fingerprints plus the input-only case-set fingerprint. Configuration or case drift requires a new run ID; existing evidence is never silently mixed.

## Endpoints

- `GET /healthz` or `GET /api/health`: process health.
- `GET /status` or `GET /api/status`: run, pass, progress, output path, and fingerprints.
- `GET /api/bootstrap`: allowlisted UI state and queue.
- `GET /api/cases/<id>`: allowlisted case detail and saved response, when present.
- `GET /api/cases/<id>/image`: the image declared for that case.
- `POST /api/responses`: fingerprint-locked raw JSON submission.

The server does not enable CORS, rejects foreign Host and Origin values, uses a self-only content security policy, and cannot be configured to bind beyond loopback.
