# Cinematic Camera Director — MVP 1.6 candidate

This is the optional `director` mode in the existing Route Story application, PR #29. It is based on production main `554fc7f24f762f6438da0c506a60c6c79258cbae`; it is not a new public release. Existing Classic, 2D Cinematic and terrain-follow values remain available. No new geographic services, textures, dependencies, GPX transformations, export presets or publication permissions are introduced.

## Preparation and shot selection

The existing scene provider supplies validated original segments, StoryTimeline/terrain pacing, the covering DEM and ready imagery. `camera-director.ts` analyzes 8/12/18/24 distance samples for 10/20/30/60 seconds, reducing that count to reserve intro/outro and segment-cut keys. The total is at most 32 keys; more than eight active segments use the prior camera with an explanation. Curvature uses a distance window rather than adjacent GPX points; local relief and the preferred valley side come from a bounded DEM neighborhood. These are aesthetic heuristics, not identification of named mountains, actual passes or an objective beauty score.

Candidate eyes and targets first pass data, clearance, exact line-of-sight and marker-framing checks. Three bounded lateral offsets are then ranked by readable composition. A chosen lateral bias remains stable within a segment where feasible. Long/global tracks keep a north-up axis and lookahead, while a short regional road can use a side view. At most one/two/three separated expressive windows are selected for 10–20/30/60 seconds. Cosine weighting turns curvature into curve-showcase views or relief into a gradual reveal, with smooth-follow between them. Establishing/finale keys make a local pullback. On a long route the ending is **not** a claim that the whole route is visible; the common caption now says «Итог маршрута».

The current grammar is restrained: side/reveal/curve views modulate a coherent camera axis. It does not attempt free orbits, semantic landmark recognition, terrain segmentation into named valleys, or mandatory use of every shot type. If any complete trajectory cannot be certified, the prior camera remains active and the UI explains why. A director dropdown selection alone is not evidence that the director was selected internally.

## Continuous safety, not endpoint or sparse-frame checks

Eye and gaze use bounded time-aware cubic Bézier controls with C1 continuity inside an original segment. They need not be C2; acceleration is measured rather than claimed continuous. Segment gaps cut using the existing timeline fade. At a cut, one-sided tangents belong only to their own segment: a moving shot need not accelerate from rest after an edit. They are included in the complete curve proof. The exact story start/end still have zero tangents. No fictitious connecting flight or marker movement is introduced.

* Every complete eye control hull is inside valid DEM cells and above their maximum vertex height plus **350 m**. Mesh triangles are bounded by those vertices. Raising keys triggers rebuilding and checking the actual final hull; endpoint safety is insufficient.
* A bounded prefix grid rejects every no-data vertex in a conservative rectangle. Triangle gradients give terrain Lipschitz bounds. Original GPX edge/projection derivative bounds cover marker movement, including the short antimeridian arc and the pinned LV95 polynomial.
* Adaptive de Casteljau intervals bound eye/gaze/marker movement over the entire interval. Exact mesh-ray breakpoints retain the existing **8 m LOS ramp**, including its switch at ray fraction 0.1. Lipschitz perturbation margins or a ground-anchor slope cone prove every intervening ray. A proof is never replaced by a few sampled frames.
* Camera-basis, depth and perspective-division perturbation bounds keep the marker center inside a normalized caption-safe rectangle. Two bounded same-segment road reference anchors are checked as well: at least a 50 m requested distance window, enlarged for coarse source spacing, capped at segment length/12. This proves those references, **not every route vertex in a large visible road section**.
* An uncertain ray-pyramid hull proves geographic coverage of the useful map area. When the minimum-height-plane footprint extends past the DEM, boundary-grid minima must prove terrain interception before the ray leaves coverage. The complete eye-to-plane hull is checked for no-data, not only its ground footprint. Frames may contain intentional background outside the useful map rectangle; no terrain/photo continuation is fabricated.
* Exact east/north source-texel perspective differences, including slope variation, enforce a conservative **two destination pixels per source texel at the canonical preview reference**. This is a camera guard based on verified derived spacing, not a claim of finer native optical GSD. Higher output resolution does not permit a closer camera.

The two permitted scale attempts share **30,000 proof intervals** and a depth bound of 18. Exceeding a budget produces an explicit fallback. The asynchronous generator yields every 128 intervals and checks cancellation before GPU allocation. After preparation only frozen poses/keys remain; proof grids and scratch candidate arrays are not retained by the timestamp closure. Per-frame evaluation is a bounded key lookup and cubic evaluation, without full DEM ray casting or geographic discovery.

## Independent portrait composition and resolution identity

For one aspect ratio every quality, including 360p, plans at the same ≤720p reference. Changing 720p/1080p/4K output does not select different shots or change time, grade, marker coordinates, source quality or geographic sizes. For Sogne director mode the same existing 50 m mesh is loaded at all qualities; older camera modes retain their original 360p/100 m choice.

Portrait is a separately planned view, not a crop: it has a distinct regional camera axis, follow distance, lookahead and safe region. Marker-center safe areas are landscape `[.12,.29,.88,.65]`, portrait `[.18,.27,.82,.70]`; actual road framing uses the renderer's format-scaled HUD margins. The approved rider stays upright and follows the original world anchor. Screen annotation/attribution behavior is unchanged.

Preview, forward/reverse seek and export consume the same immutable StoryConfig, timeline and prepared plan. Exact pixel tests apply at the **same resolution**. Across resolutions the tests compare geometric/time identity, not raster bytes. H.264 is lossy; decoded MP4s are checked independently for timing, frame count, changing nonblank geography and actual visual content.

## Reproduction and privacy

Use pinned `npm.cmd ci`, `npm.cmd run check` with `PLAYWRIGHT_CHANNEL=msedge`. The photographic UI/cancel/failure regression is opt-in:

```powershell
$env:PLAYWRIGHT_CHANNEL='msedge'
$env:SWISS_BASELINE='0'
$env:DIRECTOR_ACCEPTANCE='1'
npx.cmd playwright test tests/e2e/camera-director.spec.ts
```

Run the reviewer server with `BUILD_AUTO_GEOGRAPHY=1`, `SWISS_BASELINE=0`. Full actual-video A/B uses the existing acceptance tool:

```powershell
$env:APP_URL='http://127.0.0.1:4197/'
$env:BUILD_COMMIT='<exact tested runtime SHA>'
$env:HIGH_RES_QUALITY='fullhd'
$env:HIGH_RES_CAMERAS='terrain,director'
$env:HIGH_RES_REQUIRE_DIRECTOR='1'
$env:HIGH_RES_CAPTIONS='full'
$env:HIGH_RES_DURATIONS='20,30'
$env:HIGH_RES_CASES='20:landscape,30:portrait'
node scripts/acceptance/high-resolution.mjs furka director-review-furka-ab
```

Use a private path instead of `furka` for owner GPX. Existing per-import approximate-area consent is mandatory; the owner authorized the Mont Blanc/Malerweg test requests. Raw reports, geographic origins, private route hashes, frames and videos remain ignored. Only synthetic Furka contact sheets and sanitized aggregate evidence may be versioned. Do not edit runtime source during video measurements; Vite reload invalidates them. `HIGH_RES_STREAM=1` tests a temporary real file sink, not physical native-picker acceptance or production OPFS persistence.

Contact sheets are reproduced with `node scripts/acceptance/director-contact.mjs furka portrait` (also landscape, or private mont-blanc/malerweg portrait). `director-report.mjs` checks the real local files, decoding reports, hashes and A/B identities, omitting private fingerprints/poses. Routine CI emits a bounded synthetic Sogne DEM-only pair under `artifacts/director-ci`; both 4-second/360p files are independently decoded and included by the existing seven-day artifact upload. They are not substitutes for the full local photographic videos.

Actual results and remaining limits are recorded in CAMERA_DIRECTOR_EVIDENCE.json, CAMERA_DIRECTOR_PERFORMANCE.md and the implementation journal. Windows/Edge/RTX 3090 observations are not physical Mac/mobile acceptance, universal smoothness, proof of increased audience retention, or a native/GPU peak-memory measurement. Owner visual review and separate merge/publication authorization remain required.
