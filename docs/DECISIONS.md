# Decisions

## Sprint 2: bounded replay and shared timeline

Sprint 1 PR #1 remains unmerged. Base branch: sprint-1-gpx-mp4 at 7caf13d; work branch: sprint-2-story-timeline. Use a stacked PR so the Sprint 2 diff excludes the existing implementation.

Keep the original Vite/Canvas/Mediabunny architecture. StoryConfig is an immutable validated plain object. Public durations: 10, 20 (default), 30 seconds; internal 4-second mode preserves regression timing. Intro/outro are each 0–3 seconds, with at least one second for replay; default public scenes use 2 seconds each. Titles remain inert text, 1–200 UTF-16 code units, consistent with the GPX metadata limit. Filenames alone have a documented shorter presentation form.

StoryTimeline precomputes the RoutePath once and returns pure timestamp-based state. Public replay advances linearly with recorded geographic distance; video time is never presented as trip time or real speed. Marker transitions between disconnected segments are discrete with a brief deterministic fade. Static route-fit framing stays the default.

Compatibility remains the safe default (360p, 24 fps, 1.5 Mbps). Standard is explicit (720p, 24 fps, 5 Mbps), capability-probed at the actual dimensions. No silent fallback. Export is bounded to 720 frames, 30 seconds, the two documented resolutions and 32 MiB encoded payload. Standard capability and performance must be measured before acceptance.

## 2026-10-08: first checkpoint

The GitHub destination was empty. Establish a minimal main bootstrap, then implement Sprint 1 on a short-lived branch and open a PR. No merge without owner approval.

Use Vite/TypeScript/Canvas 2D with no mandatory backend. GPX and video processing stay in the browser; assets and fonts stay local. Russian is the only MVP UI language.

Prove video export first. Choose Mediabunny (MPL-2.0, unmodified dependency) over deprecated mp4-muxer. Use WebCodecs capability detection, deterministic timestamps and sequential frame submission/backpressure. Start with 640×360 and 360×640, 24 fps, four seconds. Browser encoder availability is device-dependent; unsupported devices receive an actionable Russian error.

Use bundled public-domain Natural Earth land outlines. Preserve GPX segments and shortest longitude arcs across the antimeridian. Do not infer speed, dates or trip duration from animation time.

The Hong Kong sample candidate is derived from OpenStreetMap and ASTER elevation. Its repository CC0 statement does not settle all upstream database terms. Do not bundle it; allow an explicitly documented external manual acceptance test, kept in ignored local storage. All committed fixtures and demo geometry are synthetic.

The first renderer uses a route-centered equirectangular projection (latitude-adjusted longitude scale) and the smallest circular longitude interval. This keeps the entire original route geometry visible without a tile dependency. Haversine distance uses the mean Earth radius 6371.0088 km. Coarse 1:110m outlines may omit small islands; this is made explicit in the UI.

Keep production CSP restricted to local resources. Vite injects styles in development, so a serve-only HTML transform allows inline styles there; the production build retains `style-src 'self'`. The build copies all notices and license texts into dist. No user metadata becomes HTML or URLs.

Windows/Edge CI exercises the platform actually verified for H.264 encoding, using exact action SHAs and Node 24.19.0. It does not opt into external real GPX data; only synthetic export artifacts are uploaded.
