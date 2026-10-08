# Browser MP4 proof

## First proof — 2026-10-08

Before implementing the geographic editor, a Canvas animation with a plain background, animated line, moving point and two factual labels was exported in headless installed Microsoft Edge through WebCodecs + Mediabunny 1.61.3.

Executed `npm run test`, `npm run build`, then `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run test:e2e`. Initial results: 3 unit tests, build and 1 browser export test passed. Independent FFmpeg and ffprobe validation confirmed H.264, 640×360, 4.000 seconds, 96 decoded frames, 24 fps and more than 20 distinct frame hashes. The test blocked cross-origin HTTP requests and observed none.

Local evidence: ignored `artifacts/route-story-proof.mp4` and adjacent `.validation.json`; reproduce with `npm run test:e2e` and `npm run validate:video -- artifacts/route-story-proof.mp4 640 360`.

The exporter uses explicit AVC capability probing, frame times `i/24`, per-frame duration `1/24`, awaited frame submission, cancellation, finalization and finally cleanup. Rendering never uses elapsed encoding time. Unsupported browser/device configurations raise an actionable Russian error. No mock, placeholder or server encoder is used.

Only the tested Edge/Windows encoder is verified here. Other browsers/devices are capability-probed at runtime; Safari and Firefox support is not promised. HTTPS or trustworthy localhost is required.
