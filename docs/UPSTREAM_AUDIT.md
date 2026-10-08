# Travel Animation source audit

Inspected actual source at [840029273c420ed68e1483eb6c4d2ea464eb5109](https://github.com/topmonroe9/travel-animation/tree/840029273c420ed68e1483eb6c4d2ea464eb5109) on 2026-10-08. License: MIT, Copyright (c) 2026 topmonroe9.

| Module | Finding | Sprint 1 decision |
| --- | --- | --- |
| src/geo.js | Small dependency-free haversine, Mercator and cumulative-distance/binary-search helpers; single continuous Polyline and naive longitude bounds. | Adapt the haversine and lookup pattern to typed segment-aware geometry, clamp rounding error and wrap longitude. Preserve MIT notice. Do not copy whole module. |
| src/timeline.js | Deterministic `at(t)` timeline; extensive stop/intro/outro and map-camera orchestration. | Reuse deterministic time-to-state principle; replace with small pure progress function. No stops or camera simulation in Sprint 1. |
| src/hud.js | Canvas HUD shared by preview/export, tied to i18n and galleries. | Replace with two factual labels and local system fonts. Shared renderer principle only. |
| src/exporter.js | WebCodecs H.264, external Mp4Muxer global, deterministic timestamps, queue throttling. Some failures lack finally cleanup. | Adapt explicit capability probe and frame sequencing. Replace muxer with maintained Mediabunny CanvasSource; always close/cancel resources and release download URLs. |
| src/scene.js | MapLibre remote OpenFreeMap styles, AWS DEM tiles, optional Three.js, car/gallery/stops complexity. | Replace fully with Canvas and bundled Natural Earth. No upstream UX copy or runtime remote domains. |

## Muxer review

npm metadata on 2026-10-08: mp4-muxer 5.2.2 is deprecated in favor of Mediabunny; MIT. Mediabunny 1.61.3 is MPL-2.0 and browser-compatible. [Official writing guide](https://mediabunny.dev/guide/writing-media-files), [media sources](https://mediabunny.dev/guide/media-sources), [repository/license](https://github.com/Vanilagy/mediabunny).

Use an unmodified, locally bundled, pinned Mediabunny dependency; distribute MPL text and a versioned source link. Route Story's original files remain MIT; adapted upstream snippets retain the upstream MIT notice. WebCodecs requires a secure context (HTTPS or trustworthy localhost) and an available encoder; probe actual configuration rather than assume browser support. See [WebCodecs specification](https://www.w3.org/TR/webcodecs/).

Independent FFmpeg/ffprobe decoding will verify output before the renderer proceeds. No success is inferred solely from receiving a Blob.
