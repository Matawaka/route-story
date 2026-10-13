# Terrain dynamics and local markers

2026-10-13 local candidate: raster markers now reflect horizontally for leftward screen travel, using a stable real edge from the current segment/current camera, including exact start/finish/reverse seeks. No history, coordinate/path change, new texture or depth-test removal. Preferred annotation and optional sprite share the same decision. [Welcome/coverage/marker acceptance](MARKER_UX.md) and [exact evidence](MARKER_UX_EVIDENCE.json) distinguish source frames from independently decoded MP4 frames; this candidate is not yet deployed.

Separate [Swiss pilot](SWISS_PILOT.md) uses the same prepared "Шах - вкрутанидзе" annotation, depth-tested route/timeline/export; its synthetic orthophoto-digitized26points are not a completed electric-unicycle ride. Existing Sogne grade/pacing/marker output is preserved by48 exact720p pixel comparisons. Swiss source/crop is not included in the public package.

## 2026-10-11: colorful rider / JPEG / readable annotation

This correction supersedes the historical silhouette/depth-sprite-only description below. Built-in traveler uses the owner-approved76427B PNG eb39e771… (39873fully transparent pixels), with mandatory fixed first-party hash/decode readiness. The3D demo selects it; point/scheme presets remain. Exact requested256asset differed from the attachment; owner approved the faithful downsample, provenance in RIDER_ASSET.json.

Icons now use the same projected route/DEM anchor after terrain rendering. A pure caption-safe layout keeps the illustration fully visible; displacement has a connector. Exact DEM triangle LOS identifies hidden anchors: dashed connector and За рельефом. Off-screen anchors are hidden. Optional occluded mode preserves Sprite depth; all actual world geometry retains depth. Endpoint labels avoid icons. Three bounded sizes and upright art. Both2D fallbacks use the same prepared raster and safe placement.

Static PNG/WebP/JPG≤2MiB/2048side/4million pixels is byte/header/chunk/animation/MIME/EXIF checked BEFORE decode. JPEG orientation is honored and decoder dimensions checked; only one256²raster survives. JPEG retains its original black background; no keying. Uploaded files/metadata/URLs are not stored/uploaded. Bitmap closes on failure/success, raster clones are disposed on replacement/failure/unload. Fixed CPU source/clones remove a discovered first-frame/seek copy difference; zero-pixel equality assertions remain.

Clean npm.cmd ci:76packages/0vulnerabilities. PLAYWRIGHT_CHANNEL=msedge OWNER_JPEG_PATH=<local owner JPG> FULL_EXPORT_ACCEPTANCE=1 npm.cmd run check:183unit/16files, build,56browser PASS/1external-data skip,2.6min. Original1254²JPEG successfully imported and independently decoded10s240frames after cancel/retry; no owner image committed. New Atlas20s1280×720480frames/Night30s720×1280720frames are H.264/24fps, exact timestamp/full decode/nonblank/preview-export equality. Actual proof/hashes/decoded contact sheets in RIDER_EVIDENCE.json; old DYNAMICS_EVIDENCE.json preserved. Synthetic STATIC ridge fixture proves fully readable annotated hidden anchor and world depth; it is not a new accepted camera trajectory. Eight2D style/aspect/camera checks have zero different initial/seek pixels. Native/GPU peak NOT MEASURED.

Benchmark: scripts/acceptance/rider-performance.mjs, archive07313b5 src into artifacts/sprint11/baseline first; same route/grade/pacing/camera/quality, one warm-up+3steady. CDP JS heap is distinct from native/VRAM and test-only GC never affects production. Private JPEG test is opt-in; routine CI explicitly skips it. No merge/tag/deploy/physical-device revalidation. Swiss is a separate developer-only branch.

New branch `codex/terrain-dynamics-markers`, based on actual merged main126dd98805594a1547b858c02922dfa565c24b81. No PR5/PR8 documentation/version changes included. Photo Pages38010896357 already succeeded with owner environment approval and public HTTPS smoke; this candidate is **not merged or deployed**. Renderer/encoder/source assets,24FPS,360p/720p,10/20/30s and output/file/package bounds remain.

## One precomputed profile, one timeline

`src/route-dynamics.ts` builds positive-distance edges from original coordinates with the existing Haversine/short-arc RoutePath. Duplicate points remain in source arrays, zero-distance edges never divide. Segment prefixes reset independently; no height smoothing, distance or travel interpolation across a gap. Complete finite GPX elevations take precedence; otherwise a fully covering local DEM supplies the entire profile. Vertical sources are never spliced. DEM coverage/no-data checks occur before preparation. Source and resolution are explicit; usable GPX altitude is not claimed to be surveyed or externally verified.

Within each segment, isolate a GPX altitude spike only when deviation exceeds30m, neighbouring heights differ less than15m and neighbour distance is≤200m. The original elevation array is untouched. Grade is a secant elevation difference divided by horizontal distance in a bounded100m window centred on each edge. Interpolation/binary lookup is O(points log points), not a per-frame scan. GPX residual grades over100% conservatively neutralize the whole profile as unreliable; real DEM cliffs are retained, not misclassified as GPS noise. Incomplete/no-data/stationary profiles use an explicit neutral fallback. This synthetic terrain route is not proof of a rideable road.

Five editable constants in `GRADE_LIMITS`/`GRADE_STYLES`: ≥10% red/.65×, ≥3% orange/.8×, between−3% and3% pale yellow/1×, ≤−3% light green/1.2×, ≤−10% green/1.4×. Colors and arrow/percentage legend work together, rather than requiring red/green perception alone. Scene metrics remain original geographic distance/GPX ascent or point count, not a new estimated recorded speed.

Stylized edge time allocation is `horizontalDistance / relativeSpeed`. Its cumulative allocation is normalized to the existing replay interval; intro/outro and selected total duration do not change. Pure binary lookup maps video time to true cumulative distance; inverse lookup places the120ms segment fade at the correct paced time. Camera and marker consume the same StoryTimeline state. Seeking either direction is frame-history independent. GPX timestamps stay intact for a future separate recorded-speed mode. Foreign-route profiles are rejected.

3D traveled ribbons/one-pixel centre pairs have precomputed `gradeColor` attributes, and retain their original world geometry, depth testing, terrain occlusion and per-segment separation. Untravelled geometry stays subdued. The ordinary single-color mode retains its old shader/attribute layout: unused grade buffers are not allocated. In2D, icons and paced timeline work; the line remains the existing single-color rendering, clearly explained in the UI. Original default point/plain/distance settings remain for regression and comparison.

## Bounded local markers

`src/marker.ts` contains original MIT Canvas silhouettes: dominant single-wheel motor housing/two pedals, bicycle, pedestrian. The attached JPEG was a visual reference; it was not redistributed or converted into a secretly bundled custom image. No external font/image/SVG/URL dependency. Custom PNG/WebP is local, static and optional. Before decoding, inspect file bytes≤1MiB, signature, complete PNG/RIFF chunk boundaries, declared dimensions≤1024², MIME agreement and animation flags/chunks. Reject APNG/animatedWebP/SVG/spoof/truncation; then check actual decoded dimensions. Decoder errors reject safely. ImageBitmap is closed in finally. Only an aspect-preserving, transparent padded256² Canvas survives; raw bytes/file/name/metadata/URLs are not stored.

UI owns one sanitized raster; each renderer gets a private clone. Replacement, failed constructor, disposal and pagehide clear owned rasters; renderer disposal frees GPU texture/material. No object URLs are created for uploaded markers. Export freezes every new control and captures the current renderer/configuration, so a marker replacement cannot change active frames. Invalid replacement preserves the last good marker/route.

2D draws the same sanitized raster. 3D uses a camera-facing Sprite anchored at the exact route XY and DEM+24m visual offset, depthTest=true, with output-pixel sizing and a bottom anchor. This is a legibility annotation, not a life-size vehicle or measured flight height. Artwork remains upright; a separate depth-tested directional arrow follows only the current original edge and is suppressed at segment fades/stationary/end states. The2D cue uses the same edge in screen coordinates. No bearing interpolation or fictitious traversal between segments. Mipmapped256² marker adds one small GPU texture; the photo pack still has exactly two imagery textures.

## Source-detail study, separate from product defaults

`scripts/acceptance/imagery-detail-study.mjs` compares the same721-point synthetic route, camera timeline, Sentinel10/40m assets and50m DEM at720p. It measures target-slant metres/output-pixel and actual projected east/north source-sized ground edges at representative marker locations; those local samples do not bound every pixel on sloping terrain.

At the middle replay frame,10m source texel: landscape~4.36output pixels (proxy4.49); portrait~7.75pixels (proxy7.99). No higher output resolution or sharpening can create missing geography. A developer-only continuous10m focus envelope raises camera altitude, giving~1.99/2.00pixels in the same scene while keeping XY/data/350m clearance and exact crossed-cell leg proof. Middle altitude rises from1663m to4485m/7906m: this materially changes the cinematic composition. A40m envelope forces~17–31km altitude and loses close-flight storytelling. Both experiments produce genuine decoded4s720p videos, with no new asset/resolution/duration limits.

The safeguard is **not enabled in the application**. Fine-patch focus does not sharpen the40m fallback or guarantee all sloping ground pixels. Keep accepted close-camera behaviour until separate visual approval of the tradeoff; no production camera/collision tests were relaxed. [High-resolution-region study](HIGH_RESOLUTION_REGION_STUDY.md) recommends a separately licensed bounded Swiss road crop, not unbounded runtime tiles or relocation of user's GPS.

## Evidence and reproduction

Runtime checkpoint `226cdc4444c5647bd493626f4f2cc309edcc758e`; measured baseline is main126dd988. After duplicate-header hardening, frozen-code `PLAYWRIGHT_CHANNEL=msedge FULL_EXPORT_ACCEPTANCE=1 npm.cmd run check`:178unit pass/15files, TypeScript/Vite build pass,50browser pass/1intentional external-data skip. Subsequent failure-only2D clone cleanup: build/2focused browser tests pass; at226cdc4 all7new browser tests pass with full20/30s proofs (48.9s). All existing assertions retained. Full/production dependency audits:0vulnerabilities. Candidate production19file baseline4814689B+3193Bmanifest;22file photo5819424B+3884Bmanifest=5823308B, below6MiB. Exact provenance/hash/CSP/subpath checks and local production photo smoke passed at226cdc4: two10s360p/240frame H.264 files, cancellation/retry, reversible seek, no errors/external requests/storage. These are local evidence, not a deployment of this candidate.

Environment: Windows10.0.26200 x64, Edge155.0.4283.45, NVIDIA GeForce RTX3090. No new physical-phone/Mac compatibility claim. Latest full Atlas20s1280×720:480frames/13460006B/export2620ms; Night30s720×1280:720frames/19382211B/export3777.2ms (single proof run, separate from repeated benchmark). Both H.264 Constrained Baseline/24fps with exact timestamps and independent complete error-free decoding, changing/nonblank frames and cancellation→successful retry. Exact render-source preview/export pixels; decoded mean RGB errors1.81/1.48 are separately reported because H.264 is lossy.

### Repeated performance, one warm-up plus three steady trials

Same721-point synthetic route, resident images/camera/quality, isolated Edge per mode, Atlas landscape/Night portrait. Final all-mode benchmark is at226cdc4; earlier all-Atlas trial retained separately under ignored artifacts. Small samples, sequential browser sessions and overlapping spread do **not** establish an encoding speed improvement. Frame wall time includes drawing submission/Canvas copy, not a GPU timer.

| Export case | Baseline main median [min–max] ms | New plain/point median [min–max] ms | Grade/pacing/EUC median [min–max] ms | New prepare / sampled frame median ms |
|---|---|---|---|---|
| 10s640×360 |777.0 [691.8–791.3]|1036.8 [834.4–1154.3]|1176.4 [983.7–1186.8]|169.3 /0.8|
| 10s1280×720 |1506.5 [1501.0–1534.5]|1628.4 [1453.4–1678.7]|1233.4 [1152.6–1311.6]|393.8 /0.6|
| 30s720×1280 |3979.1 [3827.4–4039.7]|3881.4 [3813.3–4078.6]|3388.6 [3195.8–3935.8]|398.4 /0.6|

The360p opt-in median is~0.4s/+51% above baseline; plain new mode is also~0.26s above baseline. This measured cost is disclosed. Additional icon/material/grade buffers are real, but these3trials cannot isolate their cost from encoder/session variability;720p varies in the opposite direction. Verify the new mode on ordinary hardware before publication, rather than claiming a universal speed result.

50k original-point grade preparation median66.7ms [60.9–85.5], warm-up76.6ms, all50000points/49999edges retained. Default route ribbon attributes remain232000B at720p and129920B at360p, same as baseline. An initial unconditional grade buffer was removed: opt-in only adds12B per ribbon/centre-line vertex; measured ribbon totals406000/227360B. All decoded plain-mode frames match baseline by independent full FFmpeg framemd5 comparison, while encoded container bytes differ; neither container identity nor cross-machine encoder identity is claimed. Marker has one256²RGBA image, analytical base0.25MiB/mips~0.33MiB; photographic images still exactly two. Geometry sizes/texture counts are bounded accounting, not measured VRAM.

CDP JS heap before~6.6–6.9MB; retained before test-onlyGC baseline16.40MB/new17.18MB, after test-onlyGC14.46/14.55MB. All renderers disposed; browser caches/temporary allocations and differing timing remain. This does not prove a native leak or universal memory safety. Native browser/encoder/GPU peak memory **NOT MEASURED** in this run; previous native-memory reports are historical, not reused as new measurements. No force-GC in production. Existing controlled context-failure, below-terrain occlusion, upload-disposal and cancellation/retry regressions all pass.

`docs/DYNAMICS_EVIDENCE.json` records independent FFmpeg reports, actual artifact hashes, repeated benchmark medians/spread and limitations. `artifacts/sprint10/` is ignored; only synthetic decoded contact sheets/reports are committed. [Atlas comparison](images/dynamics-atlas-comparison.jpg), [portrait comparison](images/dynamics-night-comparison.jpg), [detail-guard comparison](images/imagery-detail-study.jpg).

Windows commands, with no execution-policy changes:

```powershell
npm.cmd ci
$env:PLAYWRIGHT_CHANNEL='msedge'
npm.cmd run check
$env:FULL_EXPORT_ACCEPTANCE='1'
npx.cmd playwright test tests/e2e/dynamics.spec.ts
git archive 126dd98805594a1547b858c02922dfa565c24b81 src --output=artifacts/sprint10/baseline-src.zip
Expand-Archive -LiteralPath artifacts/sprint10/baseline-src.zip -DestinationPath artifacts/sprint10/baseline -Force
node scripts/acceptance/dynamics-performance.mjs
node scripts/acceptance/imagery-detail-study.mjs
node scripts/acceptance/imagery-detail-study.mjs --coarse
node scripts/acceptance/dynamics-evidence.mjs
```

Baseline archive needs the ignored directory created first. Developer tools use their own local server/isolated Edge sessions, no unrelated tabs. One warm-up then three steady repeats; frame wall time includes drawing submission/Canvas copy, not GPU elapsed time. CDP JS heap is not native/GPU/codec memory. Native/GPU peak memory is **NOT MEASURED** in this sprint; automatic review rejected the previous policy-bypassing sampler, so the new tool does not use a policy override. Test-only GC is labelled and never used in production. Buffer sizes/texture counts are resource accounting, not proof of universal memory safety or a new physical-device acceptance.

Routine exports4s360p; opt-in20s1280×720/480frames and30s720×1280/720frames. Assertions require exact render-source preview/export equality, independent H.264 decode/timestamps/frame count, all-frame nonblank variance, decoded-frame mean pixel difference<15 (lossy codec), cancellation/retry and privacy. Local UI custom PNG10s export is separately decoded; upload limits/alpha/north-up orientation/cloning/close/disposal are tested. Full project privacy/CSP/GPX/antimeridian/segment/context-loss regressions remain.
