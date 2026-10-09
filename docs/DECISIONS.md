# Decisions

## Sprint 8: genuine bounded DEM mesh and safe timestamp camera

Owner accepts Sprint7 visual cost and explicitly requests terrain3D. Static Canvas cannot represent a genuine height surface/depth camera; this is the concrete reason for the documented Three exception. Stack feature/terrain-aware-3d/PR#7 on accepted PR#6 a704f67. Stable main/tag/Pages5f39332/v1.0.0, public assets, manual workflow/protected environment and unrelated PR#5 remain unchanged. No merge/publication/contest repost.

Read official Kartverket DTM10 annual2020 cell6800-3 metadata/free-product terms/CC BY4. Keep original110MB ignored; publish reviewed30×40km50m/100m derivative grids, source/asset hashes, attribution and processing changes. EPSG25833→local tangent metres; heights1:1. Supplied2020 metadata/raster do not identify vertical datum; record it as unspecified, do not assertNN2000 or overwrite GPX elevation. No navigation/survey/bridge-tunnel/bathymetry claims.

Both real MapLibre raster-dem and Three4s3D MP4 proofs decode independently. Choose exact Three0.186.1/MIT for bounded mesh/camera/triangle LOS access and explicit disposal. One-tile MapLibre readiness/query is not a verified whole-route tile pipeline; unselected engine is not distributed. Preserve Mediabunny/H.264, sequential awaited optional draw barrier, allfps/duration/size/frame/payload limits. Static package remains<5MiB, so no limit revision.

Pure terrain camera uses actual local relief, smoothed per-segment direction/look-ahead, perspective fit, globalmaxDEM+350m flight envelope and exact grid/triangle-ray occlusion checks. Final pose ignores playback history. Intro/outro gaze clamps above mesh+24m; real full-timeline audit found/fixed a ridge-target singularity missed by replay-only tests. Reject missing/out-of-bounds heights, non-finite/>80km flight and excessivegeometry; explicitly recover in2D with source/config retained. Auto uses route-local≥100m relief and explains fallback. Classic/reduced-motion retained.

Depth-tested subdivided ribbon retains everyGPXedge/segment and geographic distance;≤200k extra1px centre-trace vertices improve overview without defeating occlusion. Destination-resolution normals/light/height contours and compact screen-space overlays; regional edge fade is presentation only. No textures, fabricated roads/places, historical weather, GPU fingerprint collection or remote assets.

Profiled temporary index arrays/per-vertex colour objects justify typed-index/scalar-colour allocation only, not a framework rewrite. Final same-route RTX3090 measurements show fasterGPUexport but heavier preparation/native memory: private-commit peak1.145GB vs2D0.877GB. Separate heap/process sums/VRAM-unmeasured/cache retention; no universal memory-safety claim. Full videos/contact sheets/safety/evidence in TERRAIN_CAMERA_VALIDATION.md/TERRAIN_PERFORMANCE.md/TERRAIN_EVIDENCE.json. Await owner's full-video visual review before merge or deployment.

## Sprint 7: cinematic camera and bounded local cartography

Owner replaces release freeze with v1.1 visual development. Stable main/tag5f39332 and published v1.0.0/Pages remain unchanged; PR #5 docs stay separate. New branch feature/cinematic-route-story-v1.1 / PR #6 targets main. No merge/publication/contest repost authorization. Owner reports the competition comment already submitted.

Use one StoryTimeline plus pure CameraPlan/CameraState. Precompute per-segment smoothed distance keys; north-up equirectangular world coordinates use the route's circular longitude bounds and fixed latitude cosine. Intro/outro quintic easing, log-scale zoom interpolation, bounded look-ahead, marker-safe framing. Disconnected segments cut under a short fade rather than a fictitious camera journey. Stationary tracks have no follow zoom; metre-scale routes have <=1.18x. Ordinary replay has <=2.65x. Classic retains v1.0 renderer and four-second regression; prefers-reduced-motion initially selects it. No independent pacing clock or invented historical speed.

A real local MapLibre6.13.0 feasibility MP4 and observed Pages HTTP206 range support establish basic viability, not a verified PMTiles regional pipeline. Choose prepared Canvas vectors plus NE50m global/NE10m fjord pack after measured source/output sizes; provenance and comparison in VISUAL_UPGRADE_AUDIT.md / GEOGRAPHY_SOURCES.json. No new runtime dependency, OSM data or package-size increase. 5MiB allowlist remains enforced. Map packs load from fixed first-party paths and validate before renderer/export; missing packs fail explicitly and can retry. Regional clipped fill boundaries are never drawn as fabricated coasts. Generalised geography remains honest about missing street-scale detail.

World-space Path2D and route chunks render at destination resolution through the camera; screen-space captions/metrics/branding stay upright. Atlas parchment/blue water/rust route and serif title differ from Night navy/amber trace/glow. Real place labels use collision filtering; no reverse geocoding or stop inference. Global fallback is explicitly labelled. Fixed CPU raster surface prevents Chromium GPU-to-CPU readback switching from changing antialiased pixels; exact reversible pixel tests, measured performance and memory determine the cost. Batching and culling preserve all route points. Do not silently trade resolution/duration for performance.

Measured full-vector dense50k/30s export14.2s and853ms CPU frame bursts justify two bounded maximum-zoom route buffers. Final6.86s with unchanged coordinates, exact-seek pixels and explicit memory/disposal tests. Geography remains vector, no low-resolution map enlargement. This improves the dense-route bottleneck but retains material cost versus static v1.0 and some small/global-route regressions; all measurements/limits in PERFORMANCE.md. v1.1.0-rc.1 is local/review-only. Existing stable tag, public assets, protected Pages environment and publication workflow remain unchanged.

## Sprint 4: reviewed static release, no new product features


On 2026-10-09 the owner had already merged PR #1/#2/#3 into main dd86c372b6d6c757d7327e22366b402f60ad9b4e. Its tree exactly matches verified Sprint 3 488db3b; preserve history and start release/route-story-v1 from that main. The release PR targets main without a stacked dependency. No agent merge or publication is authorized yet.

Prepare a manual-only GitHub Pages workflow with exact reviewed-main SHA and successful main-push acceptance checks. Read-only build/test jobs; pages/id-token write permissions confined to a deployment job that runs only pinned official actions. Owner must separately configure Pages source and a required-reviewer main-only github-pages environment before authorized dispatch. A YAML environment name alone is not approval protection. No automatic push deployment or PAT/secrets. Pages/custom-domain/Timeweb settings remain untouched during preparation.

Validate a public-file allowlist and provenance before uploading dist; include a small source-commit/file-hash manifest, excluding user data and videos. Test the real production bundle at /route-story/ and test the actual anonymous HTTPS URL separately after deployment. Localhost secure context is not HTTPS acceptance. Keep restrictive meta CSP; document the response-header protections that static hosting/meta cannot promise.

Release examples come from two explicitly synthetic public GPX files via the actual UI, not a substitute renderer. Atlas landscape 20s / Night antimeridian portrait 30s, both Standard, must independently decode and play in the tested browser. Keep MP4s out of source Git and publish validated assets only after permission. Package version 1.0.0 denotes the prepared release candidate, not a published tag. Browser/device claims remain limited to Sprint 3 evidence. No major feature, dependency or resource-limit changes.

## Sprint 3: observed compatibility and resource costs

Stack on accepted Sprint 2 head f9f63b5 because PRs #1/#2 remain open. Keep Canvas/Mediabunny/WebCodecs and all limits. Explicit opt-in local scripts test browser engines, large synthetic GPX and Windows process memory; routine CI remains affordable. Playwright mobile emulation is not physical-device acceptance; WebKit is not retail Safari. Windows WebKit preview works but VideoEncoder is absent.

Firefox 157 returned the malformed AVC description recorded in Mozilla bug 2049470. Repair only the exact duplicate-SPS/PPS-header pattern with matching profile bytes before muxing, using original code; valid AVC records pass unchanged and unknown malformed records fail. Do not branch on browser identity. Independent decoding now rejects even recoverable decoder stderr errors.

Profiled individual Canvas stroke-command pressure at 50k points. Use fixed 128-edge batches with disconnected subpaths, retaining deterministic cache boundaries and every point. Before/after OS samples show lower private committed memory but unchanged aggregate working sets; neither proves GPU VRAM use. Invalid import releases the hidden visible canvas too. Test-only GC/WeakRefs and four actual export/cancel/retry cycles observe cleanup without adding a production profiler. PERFORMANCE.md records before/after values and limitations.

## Sprint 3: measured composition defects

Retain the static equirectangular camera/Natural Earth outlines. Document high-latitude distortion and coarse coast/island limits; do not substitute online maps or guessed geography. Very short routes use a bounded 0.0001° minimum span rather than the prior kilometre-scale floor; stationary views keep 0.01°. Separate close endpoint labels outside both markers, add small map-colour backing and reserve overlay margins. Short distances use metres consistently, large counters fit by font size without hiding digits, and long title ellipsis/static metric layout are cached. Route contrast is tested against both flat map surfaces. Raw 64-configuration/384-frame evidence and repeated title CPU measurements are local opt-in, not expensive new CI jobs. VISUAL_VALIDATION.md records checks and limits; no duration/FPS/resolution increase.

## Sprint 2: bounded replay and shared timeline

Sprint 1 PR #1 remains unmerged. Base branch: sprint-1-gpx-mp4 at 7caf13d; work branch: sprint-2-story-timeline. Use a stacked PR so the Sprint 2 diff excludes the existing implementation.

Keep the original Vite/Canvas/Mediabunny architecture. StoryConfig is an immutable validated plain object. Public durations: 10, 20 (default), 30 seconds; internal 4-second mode preserves regression timing. Intro/outro are each 0–3 seconds, with at least one second for replay; default public scenes use 2 seconds each. Titles remain inert text, 1–200 UTF-16 code units, consistent with the GPX metadata limit. Filenames alone have a documented shorter presentation form.

StoryTimeline precomputes the RoutePath once and returns pure timestamp-based state. Public replay advances linearly with recorded geographic distance; video time is never presented as trip time or real speed. Marker transitions between disconnected segments are discrete with a brief deterministic fade. Static route-fit framing stays the default.

Compatibility remains the safe default (360p, 24 fps, 1.5 Mbps). Standard is explicit (720p, 24 fps, 5 Mbps), capability-probed at the actual dimensions. No silent fallback. Export is bounded to 720 frames, 30 seconds, the two documented resolutions and 32 MiB encoded payload. Standard capability and performance must be measured before acceptance.

## Sprint 2: minimal scenes and resource verification

Retain a static map and reserved header/HUD areas. Intro/outro captions fade solely from timeline state; attribution appears only in the outro. No zoom, camera-follow, media or additional dependencies. Two factual values stay readable: geographic distance and complete-series elevation gain (otherwise recorded point count). Coincident start/finish use a shared label. Long canvas titles use a code-point-safe ellipsis; validated source text is unchanged. User title is passed only to Canvas text, DOM text/attributes and a sanitized download filename.

Cache projected route strokes; append newly reached edges and rebuild the same ordered strokes after backward seeking. This avoids rescanning the full geographic dataset every frame and preserves deterministic pixels. Bound export configuration before any asynchronous operation, await encoder backpressure, retain cancellation/cleanup and refuse oversized payloads. No arbitrary resolutions/FPS/durations are exposed.

Both 30s/720p formats independently decoded locally after P0 (81a21150b5fe5bf0d9b43b399061f884db3521c3). Final presentation changes require renewed acceptance. Benchmarks measure export wall time including capability probing/encode/finalize, excluding download and independent decoding. Render timing measures CPU Canvas submission only. Native encoder/GPU peak memory cannot be inferred from JS heap and remains unmeasured. Routine CI performs 4s regression + 20s Standard acceptance; two 30s/5000-point runs are explicit local opt-in.

## 2026-10-08: first checkpoint

The GitHub destination was empty. Establish a minimal main bootstrap, then implement Sprint 1 on a short-lived branch and open a PR. No merge without owner approval.

Use Vite/TypeScript/Canvas 2D with no mandatory backend. GPX and video processing stay in the browser; assets and fonts stay local. Russian is the only MVP UI language.

Prove video export first. Choose Mediabunny (MPL-2.0, unmodified dependency) over deprecated mp4-muxer. Use WebCodecs capability detection, deterministic timestamps and sequential frame submission/backpressure. Start with 640×360 and 360×640, 24 fps, four seconds. Browser encoder availability is device-dependent; unsupported devices receive an actionable Russian error.

Use bundled public-domain Natural Earth land outlines. Preserve GPX segments and shortest longitude arcs across the antimeridian. Do not infer speed, dates or trip duration from animation time.

The Hong Kong sample candidate is derived from OpenStreetMap and ASTER elevation. Its repository CC0 statement does not settle all upstream database terms. Do not bundle it; allow an explicitly documented external manual acceptance test, kept in ignored local storage. All committed fixtures and demo geometry are synthetic.

The first renderer uses a route-centered equirectangular projection (latitude-adjusted longitude scale) and the smallest circular longitude interval. This keeps the entire original route geometry visible without a tile dependency. Haversine distance uses the mean Earth radius 6371.0088 km. Coarse 1:110m outlines may omit small islands; this is made explicit in the UI.

Keep production CSP restricted to local resources. Vite injects styles in development, so a serve-only HTML transform allows inline styles there; the production build retains `style-src 'self'`. The build copies all notices and license texts into dist. No user metadata becomes HTML or URLs.

Windows/Edge CI exercises the platform actually verified for H.264 encoding, using exact action SHAs and Node 24.19.0. It does not opt into external real GPX data; only synthetic export artifacts are uploaded.
