# Cinematic v1.1 release candidate

This branch builds on immutable v1.0.0 main `5f39332b7358949d248da6b2f99ba445ee1b41e8`; PR #5's separate publication documentation is not included. It changes visual output, not the video pipeline or user-data policy. It requires owner visual review before merge or publication.

## Camera and frame identity

`camera.ts` prepares an immutable plan from the validated `StoryTimeline`, original segmented coordinates and destination dimensions. Longitude is centred on the shortest circular interval; longitude deltas use the short arc. The north-up local equirectangular projection uses a fixed cosine factor, clamped to 0.01. This is a presentation projection, not a source of geographic metrics.

`getCameraStateAt(seconds, timeline, plan)` is pure. Intro/outro use quintic easing and logarithmic zoom interpolation. Replay interpolates precomputed distance keys with bounded look-ahead and smooth centre/zoom changes. Keys belong to individual GPX segments; disconnected segments cut with the timeline's marker fade rather than interpolate fictional travel. The complete route is framed at the exact beginning and end. A safe rectangle reserves space for screen captions; the marker remains inside it. Ordinary routes approach 2.65× overview scale; short routes are capped at 1.18× and stationary routes at 1×. There is no bearing rotation, random state, wall-clock animation or independent replay clock.

Preview and Mediabunny export call the same `RouteRenderer.draw(canvas, timestamp)` using a validated configuration snapshot. Camera, glow/pulse and captions derive from that timestamp. CPU-backed 2D destination surfaces (`willReadFrequently`) avoid changing antialiasing when a browser migrates a GPU surface after readback. Browser tests compare exact uncompressed pixels after forward/backward seeks and inside the export draw callback. H.264 is lossy; decoded video is validated for expected content and timing rather than byte-for-byte equality with PNGs.

Classic preserves the original static renderer, palette, geometry and four-second regression. It is selectable for comparison/reduced motion. The initial UI respects `prefers-reduced-motion`; the explicit cinematic demo deliberately selects the cinematic mode.

## Geographic layers and readiness

The selected approach is destination-resolution Canvas vector geography, with precompiled/cullable Path2D objects. World-space land, water, real labels, GPS route and markers share the camera transform. Captions, metrics, progress and branding use screen coordinates. There are no fictional terrain contours, streets, towns or route simplification.

The 1:50m global pack contains land, lakes and rivers. A small 1:10m western-Norway pack adds coast/islands and five Natural Earth populated-place labels within [3.5,59,9,62.5]. Names and coordinates come from the pinned source, not GPX reverse geocoding. Layer visibility and label collision checks depend on camera scale and caption/marker bounds. Elsewhere the UI/video explicitly indicates the coarse global fallback. Natural Earth cannot provide worldwide street-level context; even 1:10m is cartographic generalisation and unsuitable for navigation.

Basemap polygons are sequentially unwrapped by shortest longitude steps, aligned across ring holes, copied by world period and clipped to one finite world tile and the route's possible camera envelope. Original coast edges are clipped separately so clipping boundaries never become invented coastlines. Line excursions start separate paths. GPS coordinates are never clipped or reduced. Polar and antimeridian tests include a real open-Pacific water pixel to prevent false seam-spanning land.

`loadGeography` loads only two fixed first-party URLs, validates their schema/coordinates/limits and caches their readiness promises. Cinematic preview/export construction waits for both required resources. Missing/invalid assets produce an explicit error and leave export unavailable; retry resets failed promises. Export cannot quietly encode partially loaded tiles. Each pack is capped at 4 MiB, 200,000 coordinates and 5,000 labels. The production allowlist remains below 5 MiB; full downloaded source geography is development-only and excluded from Git and deployment.

## Bounded route buffers

Profiling first found excessive repeated route rasterisation: the full-vector 50,000-point Standard/30s export took 14.2s and sampled frame submissions reached 853ms. The final renderer retains fixed 128-edge batches and renders untravelled/travelled route buffers at the maximum planned camera scale. At 720p and 2.65×, each buffer is bounded by 3392×1908 (or the portrait transpose); two RGBA pixel surfaces account for approximately 51.8 MB before browser overhead. The map is always vector-drawn at the destination; route buffers are never enlarged beyond their prepared resolution.

Complete travelled batches are added in a fixed order; at most 127 partial edges are drawn directly per frame. Backward seeking clears/rebuilds the prefix deterministically. This changes rasterisation, not coordinates, cumulative geographic distance or segment gaps. `dispose` zeroes both buffers, removes paths/labels/projected references and preserves the existing exporter cleanup. This is a bounded memory trade-off, not a total browser-memory guarantee. Measurements and before/after costs are in PERFORMANCE.md.

## Reproduction

Use Node 22.12+ and pinned `npm.cmd ci`. Run `PLAYWRIGHT_CHANNEL=msedge FULL_EXPORT_ACCEPTANCE=1 npm.cmd run check` using PowerShell environment assignments. Opt-in commands:

```powershell
node scripts/build-cinematic-demo.mjs
node scripts/build-geography.mjs
node scripts/acceptance/cinematic.mjs
node scripts/acceptance/comparison.mjs
node scripts/acceptance/performance.mjs
node scripts/acceptance/memory.mjs
```

The geography generator downloads pinned public-domain source files only as an explicit developer action; no production remote calls exist. Source/output hashes and byte counts are in GEOGRAPHY_SOURCES.json. Timed browser acceptance commands must run sequentially without changing application source: Vite hot reload otherwise invalidates measurements. Scripts own a temporary localhost server on port 4183 and close it afterwards. Output videos/diagnostics remain in ignored artifacts, not the deployment package.

The bounded MapLibre spike used an ignored npm extraction of maplibre-gl@6.13.0, not an installed production dependency. To reproduce it: download that exact npm tarball with `npm.cmd pack maplibre-gl@6.13.0 --pack-destination .reference`, extract under `.reference/maplibre-spike`, then run `node scripts/acceptance/map-spike.mjs`. It proves a GeoJSON WebGL capture with a loaded-frame barrier, not regional PMTiles support. Details/limits and primary references are in VISUAL_UPGRADE_AUDIT.md.
