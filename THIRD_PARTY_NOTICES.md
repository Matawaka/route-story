# Third-party notices and provenance

Route Story's original application code is MIT, Copyright (c) 2026 Dmitrii Olegovich Kuznetsov (Matawaka). Dependency versions are exact in package.json and fully locked in package-lock.json.

## Travel Animation — MIT

Copyright (c) 2026 topmonroe9. Small geographic/export algorithm adaptations only; no original UI or assets copied. Source: https://github.com/topmonroe9/travel-animation/tree/840029273c420ed68e1483eb6c4d2ea464eb5109. Full notice: licenses/TRAVEL_ANIMATION.txt.

## Mediabunny 1.61.3 — MPL-2.0

Unmodified dependency bundled locally by Vite. Copyright as stated in its source files, Vanilagy. Full MPL text: licenses/MEDIABUNNY-MPL-2.0.txt. Corresponding source: https://github.com/Vanilagy/mediabunny/tree/v1.61.3 and https://registry.npmjs.org/mediabunny/-/mediabunny-1.61.3.tgz. Files containing covered library code retain MPL terms; original Route Story source remains MIT. Distribute this notice and license with built assets. No application-source relicensing is required merely by importing this unmodified library.

## Natural Earth — public domain

Bundled `public/maps/ne_110m_land.geojson` (138,160 bytes), unmodified 1:110m land outlines. Source: https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_110m_land.geojson. Terms: https://www.naturalearthdata.com/about/terms-of-use/. These are coarse geographic outlines, not street maps or navigation data. Credit shown in the application.

## Development tools

Vite 8.3.4 and Vitest 5.0.3: MIT; TypeScript 7.0.2 and Playwright 1.64.0: Apache-2.0; Node type declarations: MIT. These are development/CI tools, not runtime downloads. FFmpeg static and ffprobe installer binaries are development-only independent validators; their upstream licenses/build metadata (including GPL terms) accompany their npm packages and binaries. They are never included in `dist` or browser bundles. FFmpeg: https://ffmpeg.org/legal.html; binaries/source provenance: https://github.com/eugeneware/ffmpeg-static and https://github.com/SavageCore/node-ffprobe-installer. Use FFMPEG_PATH/FFPROBE_PATH for independently installed tools.

## Route test data

Committed demo and test GPX files are generated synthetic geometry, MIT, explicitly labelled as synthetic. They describe no person's journey.

External manual acceptance candidate: public Hong Kong Trail geometry by nicholas-fong, repository commit 93768bfea43b9cce27e0c1bc6609d1ba90028cf0. Repository declares CC0-1.0; METHOD.md describes OpenStreetMap/Overpass geometry and ASTER GDEM V3 elevations. The upstream database/elevation obligations have not been resolved for redistribution. **No candidate GPX is bundled or committed.** Local ignored acceptance files and videos derived from that route must stay out of the public repository. This is a mapped public trail, not an identified user's private GPS recording. See docs/SAMPLE_PROVENANCE.md.
