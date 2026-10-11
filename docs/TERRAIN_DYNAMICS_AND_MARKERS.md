# Terrain Dynamics and electric-unicycle route markers — draft feature

Status: PR #12 (grade and artistic pacing), stacked PR #13 (icon and local uploads). Both are **unmerged**, not deployed. This document does not claim video acceptance.

## Elevation and timing

- When the user opts into **«Цвет и темп по уклону DEM»** in 3D, route heights come from the *locally supplied, covered Kartverket DEM*, not raw GPX altitudes or invented speed telemetry. GPX geographic points and lengths are unchanged.
- A ±75 metre distance window estimates local grade, limited to ±25% for visual mapping. Windows reset for every GPX segment and never cross gaps.
- Higher grades fade towards red; level ground is yellow; descents fade towards green.
- Relative artistic pacing is 0.65× on very steep climbs, 0.8× for moderate climbs, 1× flat, 1.2× for moderate descents and 1.4× for steep descents. The replay time allocations are normalized: final MP4 duration does not change.
- If DEM has missing or invalid samples, dynamics automatically falls back to the original neutral/linear renderer.
- This does **not** depict measured riding speed. GPX recorded timestamps and their relationship to actual speed are not changed.
- The toggle is off by default; old visuals, 2D-only routes and video acceptance remain in place.

## Marker choices

- Point (previous default).
- Small locally drawn silhouette of a rider, monowheel, backpack and rack.
- User image decoded strictly as PNG/WebP by signature and image decoder; limit 1 MiB input, 1024px per source side, 256×256 downsampled bitmap.
- No uploaded SVG, remote URLs or file storage. Raw image data is never uploaded. The decoded bitmap is disposed at pagehide or after a safe replacement.
- 2D renderers draw the resolved image directly; Three.js terrain uses a depth-tested billboard sprite.
- Preview and MP4 use the same renderer and timestamp-derived state. Explicit full decoded-video confirmation is still required before publishing this feature.
- The image is an artistic route representation, not a claim that the recorded device had the exact depicted geometry.

## Deferred region upgrade

The existing approved Sogne Sentinel-2 10/40m textures and 6 MiB release budget remain unchanged. A separate, licensing-verified Swiss SWISSIMAGE / swissALTI3D region may be evaluated as a future bounded demonstration, but must not be silently blended with an unrelated rider's GPX.

## Next required gates

1. GitHub CI on **exact** heads of PR #12 and PR #13.
2. Functional preview of 2D/3D icons and color+speed gradient.
3. MP4 H.264 independent decoding and preview/export pixel equivalence in both aspects.
4. Memory/resource checks for upload/replacement and DEM photo modes.
5. Explicit owner review and merge, then protected deployment flow. No bypass of environment approval.
