# Decisions

## 2026-10-08: first checkpoint

The GitHub destination was empty. Establish a minimal main bootstrap, then implement Sprint 1 on a short-lived branch and open a PR. No merge without owner approval.

Use Vite/TypeScript/Canvas 2D with no mandatory backend. GPX and video processing stay in the browser; assets and fonts stay local. Russian is the only MVP UI language.

Prove video export first. Choose Mediabunny (MPL-2.0, unmodified dependency) over deprecated mp4-muxer. Use WebCodecs capability detection, deterministic timestamps and sequential frame submission/backpressure. Start with 640×360 and 360×640, 24 fps, four seconds. Browser encoder availability is device-dependent; unsupported devices receive an actionable Russian error.

Use bundled public-domain Natural Earth land outlines. Preserve GPX segments and shortest longitude arcs across the antimeridian. Do not infer speed, dates or trip duration from animation time.

The Hong Kong sample candidate is derived from OpenStreetMap and ASTER elevation. Its repository CC0 statement does not settle all upstream database terms. Do not bundle it; allow an explicitly documented external manual acceptance test, kept in ignored local storage. All committed fixtures and demo geometry are synthetic.

The first renderer uses a route-centered equirectangular projection (latitude-adjusted longitude scale) and the smallest circular longitude interval. This keeps the entire original route geometry visible without a tile dependency. Haversine distance uses the mean Earth radius 6371.0088 km. Coarse 1:110m outlines may omit small islands; this is made explicit in the UI.

Keep production CSP restricted to local resources. Vite injects styles in development, so a serve-only HTML transform allows inline styles there; the production build retains `style-src 'self'`. The build copies all notices and license texts into dist. No user metadata becomes HTML or URLs.

Windows/Edge CI exercises the platform actually verified for H.264 encoding, using exact action SHAs and Node 24.19.0. It does not opt into external real GPX data; only synthetic export artifacts are uploaded.
