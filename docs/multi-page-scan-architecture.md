# Multi-page Scan Architecture

## Goal

Treat up to four menu photos as one ordered scan session. Users can capture pages repeatedly, review or remove them, and submit the collection through one quota event and one model analysis.

The four-page limit is a reliability boundary, not only a UI choice. It bounds upload time, provider input size, model output size, memory use, and the number of dishes that must fit the structured response.

## User Flow

1. A new camera scan clears any previous pending session.
2. First-time camera users see the existing capture guide.
3. Each shutter press preprocesses one page and appends it to the session without leaving the camera.
4. The camera tray shows pages in capture order with remove controls and a `count / 4` status.
5. The review action opens the multi-page preview.
6. Preview lets the user inspect, remove, or add another page before analysis.
7. Analysis submits all pages in order and stores every local page URI on the resulting scan.

Uploading from the photo library uses the same session and preview boundaries. The picker supports ordered multi-selection up to the remaining page count.

## Client Boundaries

### Session owner

`App.tsx` owns `pendingImages: PreparedMenuImage[]`. This keeps the collection intact while navigation moves among the camera guide, camera, preview, and loading screens.

Session invariants:

- Images are ordered by capture or library-selection order.
- A session contains between zero and four prepared JPEGs.
- Aggregate base64 content cannot exceed 12,000,000 characters.
- Starting a new scan clears the previous session.
- A rate-limit retry preserves the session; success and terminal fallback clear it.

### Capture and preprocessing

`MenuCameraScreen` owns transient camera state only: permission, readiness, flash, in-flight capture, and camera errors. It requests session mutations through callbacks.

`imageService` preprocesses every image independently with the existing versioned JPEG pipeline. Multi-select preparation is sequential to avoid holding several full-resolution image transformations in memory simultaneously.

### Preview and saved scans

`ImagePreviewScreen` receives the ordered session and exposes page selection, removal, add-page, and analyze actions.

`ScanResult.imageUris` stores all pages. `ScanResult.imageUri` remains the first page for existing history cards and old saved scans. Validation accepts either shape.

## API Contract

New clients send:

```json
{
  "profile": {},
  "images": [
    { "imageBase64": "...", "mimeType": "image/jpeg" },
    { "imageBase64": "...", "mimeType": "image/jpeg" }
  ],
  "restaurantLanguage": "..."
}
```

The Edge Function still accepts the legacy single-image fields:

```json
{
  "profile": {},
  "imageBase64": "...",
  "mimeType": "image/jpeg"
}
```

The request normalizer rejects ambiguous payloads that provide both forms. It validates each image, the image count, the per-image size, and the aggregate size before claiming a scan quota or calling a provider.

Default server limits:

- `MAX_MENU_IMAGE_COUNT=4`
- `MAX_IMAGE_BASE64_LENGTH=3000000`
- `MAX_TOTAL_IMAGE_BASE64_LENGTH=12000000`

## Provider Handling

Gemini, OpenAI, and NVIDIA receive one user turn containing the shared prompt followed by ordered page-label and image pairs. Labels use `Menu page N of M` so page order is explicit across providers.

One provider call is intentional for this release:

- One scan consumes one provider request and one quota event.
- The model can use menu-wide legends and section context across pages.
- The prompt tells the model to deduplicate dishes when adjacent photos overlap.

The shared prompt treats unreadable required pages conservatively and evaluates all attached pages as one menu. The deterministic risk policy remains the final escalation boundary after model normalization.

## Failure Behavior

- Camera capture failure leaves existing pages untouched.
- A page that would exceed the client size budget is not appended.
- Library selections that exceed the aggregate budget are partially accepted in order and disclosed to the user.
- A poor required page can set the aggregate scan to `unclear` and request a retake.
- Provider, parsing, or validation failures return the existing conservative fallback with all page URIs retained locally.
- Legacy single-image callers follow the same normalized provider path.

## Verification Matrix

Automated checks:

- Typecheck all app state, screen props, and result normalization.
- Run deterministic AI evals after the shared prompt change.
- Parse-check the Edge Function TypeScript when Deno is unavailable.

Manual checks:

- Capture one page and confirm the legacy user flow still works.
- Capture four pages, remove the second, add a replacement, and verify order in preview.
- Select multiple library images and verify the picker respects remaining slots.
- Confirm the fifth capture and oversized aggregate payload are blocked.
- Disable camera permission and confirm library selection remains available.
- Trigger a rate limit and confirm preview pages remain available for retry.
- Open a saved multi-page result and page through all original photos.
- Send one legacy request and one new array request to the deployed Edge Function.

## Follow-up Work

Before raising the four-page limit, measure request size, provider latency, output truncation, dish recall, and duplicate-dish rate on real multi-page menus. Per-page image-quality fields and dish-to-page evidence references should be added before supporting substantially larger menus or parallel per-page model calls.
