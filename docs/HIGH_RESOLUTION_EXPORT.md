# Full HD / 4K export candidate — MVP 1.5

Development branch: `codex/full-hd-4k-export`, base main `1826118db1e72a7284dfdb24a447cad7adf98537`. New modes require owner review before merge/deployment. Existing protected Pages workflow is unchanged. This document describes implementation; final measured acceptance belongs in the accompanying evidence file, not inferred support for every browser.

| Preset | Landscape / portrait | FPS | Configured bitrate | Status |
| --- | --- | --- | --- | --- |
| Compatibility | 640×360 / 360×640 | 24 | 1.5 Mbps | Existing behavior retained |
| Standard | 1280×720 / 720×1280 | 24 | 5 Mbps | Existing behavior retained |
| Full HD | 1920×1080 / 1080×1920 | 24 | 10 Mbps | Candidate; actual encoder initialization required |
| Ultra HD | 3840×2160 / 2160×3840 | 24 | 25 Mbps | Experimental; capability/allocation/resource checks required |

Public durations remain10/20/30/60s;4s is internal regression. Bitrate×duration/8 is a labeled size estimate, not a measured file size or promise. Selected resolution never silently falls back.

## One scene, lighter preview

`previewSettings` caps new-preset preview at720p while preserving old360p. The geographic camera plan uses this established framing reference: source-resolution guard,350m terrain clearance, full-cell corridor and exact LOS tests remain intact. Increasing output pixels never changes GPX coordinates, normalized framing, time/distance/grade/pacing or permits a closer camera. More destination pixels do not create more satellite information. Source GSD/derived spacing and provenance remain visible.

At export the resident terrain renderer resizes its output, preserving the same mesh, route, textures and camera plan. There is no second terrain renderer/GPU context or repeated source download. After completion/cancellation/failure it restores preview dimensions and disposes destination resources. HD-only quality changes reuse the prepared scene. Old Compatibility terrain LOD remains unchanged; HD/FullHD/4K use the established Standard terrain data.2D creates a temporary destination renderer from prepared local geography, disposes it afterward, and redraws high-resolution routes from precomputed vector paths rather than allocating two giant maximum-zoom raster caches.

## Codec and readiness

Old AVC Level3.1 preference order is retained.1080p tries High/Main/Baseline Level4.0 (then High4.1);4K tries High/Main/Baseline5.1 (then High5.2), chosen by macroblock counts at24FPS. Higher-resolution preflight actually configures/encodes/flushes one frame and closes its encoder, VideoFrame and Canvas even on failure/timeout. Only one preflight remains active during rapid quality changes. This proves initialization only, not prolonged device safety. Independent full-file decoding is still mandatory.

WebGL viewport, renderbuffer/texture limits, selected pixel budget, framebuffer completeness, graphics errors and context loss are checked. A complete destination-resolution render precedes encoding. Prepared imagery/hash/GPU readiness barriers remain unchanged. No per-frame external requests or missing tiles. Missing encoder/GPU support leaves preview usable and offers explicit lower quality.

## Current-frame memory

Only current frames are retained. A4K RGBA surface is33,177,600B (31.64MiB),1080p8,294,400B (7.91MiB). Two reused readback/orientation arrays plus a CPU composition canvas remain; the encoder receives this already composed canvas directly. Removing the extra destination canvas/getImageData copy saves one simultaneous nominal surface and one full-frame transfer per exported frame. Preview still receives exact opaque bytes. Framebuffer dithering stays disabled; same-resolution source/preview equality is not weakened.

`preserveDrawingBuffer=false` is safe because readback is synchronous immediately after rendering. New resolutions use one single-sample render target with ordinary depth testing instead of enlarging the browser's multisampled swap chain.720p/360p retain their original antialiasing path. At4K the target's nominal RGBA+32bit-depth allocation is about63.28MiB; actual driver storage/overhead/encoder/GPU memory cannot be inferred from this arithmetic. Render-target sampling differs from MSAA, so comparative edge pixels may differ; geography/camera do not. Same-backend same-size pixel equality remains required.

## Saving and file bounds

Old360p/720p memory-mode BufferTarget/fast-start behavior and32MiB payload/48MiB minute bound stay unchanged. New memory-mode presets use ordinary MP4 metadata at the end, avoiding an additional all-media fast-start store. File mode uses Mediabunny's supported StreamTarget,1MiB chunks, backpressure and reserved ordinary MP4 metadata (`maximumPacketCount` fixed to expected frames); this is not a WebM fallback or fragmented MP4.

| Duration | FullHD payload bound | 4K payload bound |
| --- | ---: | ---: |
| 10s | 24MiB | 48MiB |
| 20s | 40MiB | 80MiB |
| 30s | 56MiB | 120MiB |
| 60s | 96MiB | 232MiB |

New bounds derive from configured bitrate×duration plus25% reserve and4MiB, rounded to8MiB; separate1MiB container allowance remains. Both packet accumulation and actual stream positions are bounded. These file policies are not global browser-memory guarantees.4K minute requires direct file saving and separate stress acceptance before public release. Browsers without File System Access retain bounded memory/download for shorter4K and FullHD; unsupported4K minute explains the file requirement and offers30s/1080p. No user data is automatically stored in OPFS or sent to a server.

The user initiates the native file picker; abort/error prevents committing an incomplete write and permits retry. Write/close failures report free-space/permission guidance without revealing paths. Test acceptance exercises a real temporary OPFS FileSystemWritableFileStream and deletes it afterward; the native OS picker UI is separately NOT TESTED by that automation.

## Reproducible acceptance

PowerShell: `npm.cmd ci`; `npm.cmd run check`. For local source-backed tests: `$env:BUILD_AUTO_GEOGRAPHY='1'`; `$env:SWISS_BASELINE='0'`; `npm.cmd run dev -- --port 4196 --strictPort`.

`HIGH_RES_QUALITY=fullhd|ultra|standard`, `HIGH_RES_DURATIONS=10,20,30`, optionally `HIGH_RES_STREAM=1`, then `node scripts/acceptance/high-resolution.mjs furka <label>` (or `sogne`, or an owner-consented local GPX path). For a minute set durations60 and stream1. For controlled GPU-buffer comparison, `HIGH_RES_FRAMEBUFFER=1` uses the former multisampled framebuffer; default uses the bounded target with identical route/camera/output/encoder. No permission to publish private GPX or videos is implied.

The driver records actual MP4/PTS/all-frame FFmpeg/ffprobe validation, central-map nonblank checks, changing frames, exact equal-size source/preview, normalized camera/time equivalence, cancellation, no encoding-time network calls and sampled isolated-browser Windows private/working-set memory. Sampling misses possible peaks; working sets can share pages. Native private bytes are not JS heap or GPU VRAM. Physical macOS/Android/iOS support and audience effects must not be inferred from Windows tests or viewport emulation.
