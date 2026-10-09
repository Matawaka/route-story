# Browser MP4 proof

## Sprint 3 final acceptance — 2026-10-09

Application code commit `88b410bf9c60e31a24519d715a9040fc9eb8b379` on sprint-3-compatibility-memory, stacked on accepted Sprint 2 f9f63b5. `PLAYWRIGHT_CHANNEL=msedge FULL_EXPORT_ACCEPTANCE=1 npm.cmd run check`: 88 unit tests, build and 24 browser tests passed; one unresolved-license external-data test intentionally skipped (36.0s browser suite). All prior regression assertions retained. No duration/FPS/resolution/point/input limits increased. Dependencies/attributions unchanged; both audit commands report zero vulnerabilities.

Strict independent FFmpeg 6.1.1/ffprobe validation now rejects decoder stderr errors even when process exit/frame count appear successful. This exposed Firefox's malformed AVC headers, repaired only for the demonstrated duplicate-NAL-header pattern before muxing. All 16 final browser-matrix exports passed 10.000s, 240 frames, 24fps, H.264, actual selected dimensions and timestamp checks. Each also decoded/seeks in its tested browser's native HTML video element. Versions, unsupported WebKit and physical-mobile/Safari limitations: COMPATIBILITY.md.

Both original 5000-point full 30s fixtures passed: Atlas landscape 1280×720 / 3,120,320 bytes / 1672.8ms; Night portrait 720×1280 / 3,039,156 bytes / 1724.8ms. Each is 30.000s / 720 decoded frames / 24fps / H.264 / avc1.42001f. Actual final decoded frames at 1/15/29s were extracted with ffmpeg-static and visually inspected, with readable captions/title/metrics and endpoints framed. Memory was not sampled in these original full-test runs; separate Windows process-memory measurements cover 50k real UI cycles.

Final 50,000-point dense Standard export: 1280×720, 30.000s, 720 frames, 3,122,941 bytes, median 1631.6ms (1622.3–1634.8), one warm-up + three steady exports. Seven additional quality/dataset cases independently decoded; two final native-memory sessions also completed Compatibility/Standard/cancel/retry cycles with their last outputs independently validated. PERFORMANCE.md separates CPU timing, JS heap, native working-set/private-commit samples and unmeasured GPU/encoder memory.

64 configuration / 384-frame visual acceptance and explicit segment-boundary states are recorded in VISUAL_VALIDATION.md. Direct/incremental/backward-seek drawing matches exactly across 5000 points; every segment gap remains unbridged. Native encoder/renderer failure, cancellation, invalid-file clearing and successful retry pass. Production privacy/CSP tests retain no cross-origin runtime requests, local/session storage, IndexedDB, caches or cookies. Only synthetic evidence enters GitHub artifacts.

Remote clean-install acceptance also passed for head 36ac690c06a1c3a9e1bad595d45b3c291acb05c0: [Windows/Edge CI](https://github.com/Matawaka/route-story/actions/runs/37885439388), 88 unit tests, build, 22 browser tests / 3 deliberate opt-in skips, 33.7s browser suite; zero install audit vulnerabilities. Review [PR #3](https://github.com/Matawaka/route-story/pull/3) targets Sprint 2, with no automatic merge. Subsequent journal/README changes do not alter tested application code.

## Sprint 2 — 2026-10-09

Preserved Sprint 1's real four-second regression and added public 10/20/30-second exports from the same validated configuration/timeline as preview. Final local command: `$env:PLAYWRIGHT_CHANNEL='msedge'; $env:FULL_EXPORT_ACCEPTANCE='1'; npm.cmd run check`. Results: 67 unit tests, production build and 20 browser tests passed; one external-data test intentionally skipped; browser suite 31.4s. Full dependency audit: zero vulnerabilities; no dependency/version/license changes.

Independent FFmpeg 6.1.1 + ffprobe verified H.264, correct dimensions, selected duration, 24fps, every decoded frame and changing frame hashes. The validator also checks every frame timestamp against i/24 and duration against 1/24 within 10 microseconds. All nine final synthetic artifacts passed this strengthened validator, including four 10-second style/aspect combinations, medium 20-second Standard (480 frames), both full 30-second Standard outputs and the 4-second proof (96 frames).

Final 5000-point synthetic benchmark on Windows_NT 10.0.26200 x64, Microsoft Edge 154.0.4258.62, available AVC profile avc1.42001f:

| Format/style | Dimensions | Duration | Decoded frames / FPS | Codec | File bytes | Export wall time |
| --- | --- | --- | --- | --- | --- | --- |
| 16:9 / Atlas | 1280×720 | 30.000s | 720 / 24 | H.264 | 2,948,136 | 1574.9ms |
| 9:16 / Night | 720×1280 | 30.000s | 720 / 24 | H.264 | 2,894,908 | 1628.8ms |

Export time includes capability probe, rendering, encoder submission and MP4 finalization; excludes download/independent decoding. Preview-ready wall time was 125.4/121.6ms including the automation round trip. Rendering 120 timestamped frames took 22.0/21.5ms of CPU Canvas submission, not measured GPU/display completion. Peak native encoder/GPU/browser memory was **not reliably measured**. These are observed local figures, not guarantees for other machines.

Actual decoded frames at 1/15/29 seconds were visually inspected. Endpoints remain framed; titles, distance and elevation/point count are readable; captions distinguish intro/replay/outro. All four preview style/aspect combinations and mobile 390×844 layout were inspected. Preview/export pixels match at the same timestamp, repeated backward seeking is deterministic, segment gaps remain unbridged, cancellation/error recovery permit a subsequent real export, and Standard failure never silently switches quality. Production runtime attempts no cross-origin requests and retains no local/session storage, IndexedDB, Cache Storage or cookies.

Reproduce full benchmarks with FULL_EXPORT_ACCEPTANCE=1; routine Windows/Edge CI runs the fast 4-second regression and bounded 20-second Standard test, skipping full 30-second runs and unresolved-license real data. Reports, MP4 and extracted PNGs are ignored under artifacts/; never upload unresolved external-route evidence.

Remote clean-install acceptance for code commit 406fe30af0b980d3ed5654252a91bb2d0d1cf467 also passed: https://github.com/Matawaka/route-story/actions/runs/37829802834. `npm.cmd ci` found zero vulnerabilities; `npm.cmd run check` passed 67 unit tests, build and 18 browser tests, with 3 intentional opt-in skips (external data + both full 30s runs), 30.7s browser suite. Only synthetic evidence was uploaded. A separate local opt-in real public-trail regression passed after this checkpoint: the preserved 4628-point route exported 640×360 H.264, 10.000s, 240 frames at 24fps and correct frame timestamps. Its unresolved-license data/evidence remains excluded from Git/CI.

```powershell
npm.cmd run validate:video -- artifacts/story-standard-30s-landscape.mp4 1280 720 30
npm.cmd run validate:video -- artifacts/story-standard-30s-portrait.mp4 720 1280 30
```

## First proof — 2026-10-08

Before implementing the geographic editor, a Canvas animation with a plain background, animated line, moving point and two factual labels was exported in headless installed Microsoft Edge through WebCodecs + Mediabunny 1.61.3.

Executed `npm run test`, `npm run build`, then `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run test:e2e`. Initial results: 3 unit tests, build and 1 browser export test passed. Independent FFmpeg and ffprobe validation confirmed H.264, 640×360, 4.000 seconds, 96 decoded frames, 24 fps and more than 20 distinct frame hashes. The test blocked cross-origin HTTP requests and observed none.

Local evidence: ignored `artifacts/route-story-proof.mp4` and adjacent `.validation.json`; reproduce with `npm run test:e2e` and `npm run validate:video -- artifacts/route-story-proof.mp4 640 360`.

The exporter uses explicit AVC capability probing, frame times `i/24`, per-frame duration `1/24`, awaited frame submission, cancellation, finalization and finally cleanup. Rendering never uses elapsed encoding time. Unsupported browser/device configurations raise an actionable Russian error. No mock, placeholder or server encoder is used.

Only the tested Edge/Windows encoder is verified here. Other browsers/devices are capability-probed at runtime; Safari and Firefox support is not promised. HTTPS or trustworthy localhost is required.

## Route renderer acceptance

Clean `npm ci` succeeded with 0 audit vulnerabilities. Final `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run check` passed 37 unit tests, TypeScript/Vite build and 10 browser tests; 1 opt-in external-data test intentionally skipped. With REAL_GPX_PATH set to the ignored public trail, all 11 browser tests passed. The first GitHub Windows/Edge CI run also passed: https://github.com/Matawaka/route-story/actions/runs/37811667151; current revision checks are linked from PR #1.

Both Atlas and Night, each in 640×360 and 360×640, independently decoded as H.264, 4.000 seconds, 96 frames at 24 fps. The production bundle exported a decoded portrait video while all cross-origin HTTP/WebSocket requests were blocked; no such requests were attempted. Reload returned to the empty state and local/session storage were empty. Mobile viewport 390×844 had no horizontal overflow.

Renderer cancellation and deliberate failure used real browser encoders; all created encoder instances ended closed. Canvas pixels repeated at the same time exactly, and a midpoint in the gap between disconnected segments remained unchanged. Invalid XML cleared the old preview, DTD was rejected without a request, and encoded HTML metadata stayed inert text. H.264 unavailability disabled export with an actionable error while the map remained usable.

Actual external route result and precise geographic endpoint checks are in SAMPLE_PROVENANCE.md. Its local evidence is never included in public CI artifacts.
