# Browser MP4 proof

## First proof — 2026-10-08

Before implementing the geographic editor, a Canvas animation with a plain background, animated line, moving point and two factual labels was exported in headless installed Microsoft Edge through WebCodecs + Mediabunny 1.61.3.

Executed `npm run test`, `npm run build`, then `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run test:e2e`. Initial results: 3 unit tests, build and 1 browser export test passed. Independent FFmpeg and ffprobe validation confirmed H.264, 640×360, 4.000 seconds, 96 decoded frames, 24 fps and more than 20 distinct frame hashes. The test blocked cross-origin HTTP requests and observed none.

Local evidence: ignored `artifacts/route-story-proof.mp4` and adjacent `.validation.json`; reproduce with `npm run test:e2e` and `npm run validate:video -- artifacts/route-story-proof.mp4 640 360`.

The exporter uses explicit AVC capability probing, frame times `i/24`, per-frame duration `1/24`, awaited frame submission, cancellation, finalization and finally cleanup. Rendering never uses elapsed encoding time. Unsupported browser/device configurations raise an actionable Russian error. No mock, placeholder or server encoder is used.

Only the tested Edge/Windows encoder is verified here. Other browsers/devices are capability-probed at runtime; Safari and Firefox support is not promised. HTTPS or trustworthy localhost is required.

## Route renderer acceptance

Clean `npm ci` succeeded with 0 audit vulnerabilities. `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run check` passed 36 unit tests, TypeScript/Vite build and 10 browser tests; 1 opt-in external-data test intentionally skipped. With REAL_GPX_PATH set to the ignored public trail, all 11 browser tests passed.

Both Atlas and Night, each in 640×360 and 360×640, independently decoded as H.264, 4.000 seconds, 96 frames at 24 fps. The production bundle exported a decoded portrait video while all cross-origin HTTP/WebSocket requests were blocked; no such requests were attempted. Reload returned to the empty state and local/session storage were empty. Mobile viewport 390×844 had no horizontal overflow.

Renderer cancellation and deliberate failure used real browser encoders; all created encoder instances ended closed. Canvas pixels repeated at the same time exactly, and a midpoint in the gap between disconnected segments remained unchanged. Invalid XML cleared the old preview, DTD was rejected without a request, and encoded HTML metadata stayed inert text. H.264 unavailability disabled export with an actionable error while the map remained usable.

Actual external route result and precise geographic endpoint checks are in SAMPLE_PROVENANCE.md. Its local evidence is never included in public CI artifacts.
