# Browser capability acceptance — 2026-10-09

Environment: Windows_NT 10.0.26200 x64, headless isolated browsers controlled by pinned Playwright 1.64.0. These observations describe these builds/configurations, not every release or physical mobile device. All routes are deterministic synthetic data. No device diagnostics are collected by the production application.

| Environment | Version | Import/Canvas/replay/seek | H.264 export | Classification |
| --- | --- | --- | --- | --- |
| Installed Microsoft Edge desktop | 154.0.4258.62 | VERIFIED | Four resolutions, 10s/240 frames | VERIFIED |
| Installed Google Chrome desktop | 154.0.8037.98 | VERIFIED | Four resolutions, 10s/240 frames | VERIFIED |
| Playwright Firefox desktop build | 157.0 | VERIFIED | Four resolutions after narrow avcC repair | VERIFIED (tested build) |
| Playwright WebKit Windows build | 27.2 | VERIFIED | VideoEncoder absent; export disabled with explanation | UNSUPPORTED for MP4 |
| Playwright Chromium / Pixel 5 emulation | 156.0.8078.4 | VERIFIED, viewport/touch only | Four resolutions on desktop Windows encoder | VERIFIED emulation only |
| Physical Android Chrome | — | NOT TESTED | NOT TESTED | NOT TESTED: no connected physical device |
| Physical iOS Safari / macOS Safari | — | NOT TESTED | NOT TESTED | NOT TESTED: no Apple test hardware |

All tested encoders selected avc1.42001f. Each export was independently verified as H.264, exact dimensions (640×360, 360×640, 1280×720, 720×1280), 10.000s, 24fps, 240 decoded frames, correct frame timestamps and changing image. No decoder errors are permitted. The final matrix also loaded each of the 16 MP4 Blobs in the tested browser's native HTML video element, decoded a frame, sought to 5s and verified dimensions/duration/nonuniform pixels. That checks the actual tested browser decoder as well as independent FFmpeg; it does not certify other players/devices. Preview remains available when encoding is unsupported. Tests also cover reversible seeking, playback, responsive overflow, local-only HTTP requests, empty storage and empty state after reload. Chromium mobile emulation uses the Pixel 5 preset (393×851, touch/mobile viewport); it does not test an Android encoder, battery, physical display or mobile memory. WebKit on Windows is not Safari.

Firefox originally produced a decodable file with malformed out-of-band SPS/PPS headers and FFmpeg errors. Local byte inspection matched [Mozilla bug 2049470](https://bugzilla.mozilla.org/show_bug.cgi?id=2049470): duplicate NAL headers in decoderConfig.description. The workaround matches only that demonstrated byte pattern, fixes NAL lengths/reserved bits, leaves encoded frames untouched, and passes valid descriptions unchanged. Unknown corrupt configurations fail explicitly. No user-agent detection, telemetry, library patch or replacement pipeline. Unit fixtures are bytes from a synthetic local export; implementation is original MIT code, not copied browser code. The independent validator now rejects any stderr at `-v error`, even when all frames happen to decode.

Reproduce from repository root, Node 24.19.0:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = 'K:\ROUTE STORY\.reference\browsers'
npx.cmd playwright install chromium firefox webkit
node scripts/acceptance/compatibility.mjs
```

Downloads are pinned by the existing Playwright package: Chromium revision 1248, Firefox 1555, WebKit 2370. Installed Chrome/Edge versions are reported at execution. No new dependency is added; test browser binaries remain ignored under .reference/. The script owns a temporary dev server on port 4183 and closes isolated sessions. Raw JSON, screenshots and synthetic videos are ignored under artifacts/sprint3/. Launch failures are recorded as ENVIRONMENT BLOCKED rather than passes; none remained in this run. Test failures produce FAILED and a nonzero process exit. Routine CI stays Windows/Edge; the full browser matrix is opt-in.
