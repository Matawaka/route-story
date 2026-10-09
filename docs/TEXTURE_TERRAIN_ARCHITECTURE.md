# Photo terrain prototype — v1.2 candidate

New `feature/phototextured-terrain-v1.2` starts at merged main8f4d0f6. Independent v1.1 stabilization PR8 and documentation PR5 are not absorbed. Stable v1.0 tag/assets remain immutable. Owner separately requested deploying **accepted main8f4d0f6** before physical tests; existing protected run37962492130 awaits owner environment review. That deployment does not contain this imagery prototype.

## Proven photographic result

Actual Sentinel2C2025-09-27 orthorectified RGB is sampled from EPSG32632 into **the same local east/north coordinates as the existing DEM**. Pixel centres align to20m texture cells; mesh coordinates/heights/triangles and existing50m/100m LODs are unchanged. UV north is0 and south1; ImageBitmap decoding without orientation/color transforms plus Texture.flipY=false ensures north-up, independently tested at corners/pixel centres. No flat background photo plane, pseudo3D or synthetic geographic features.

The existing Three renderer receives an already decoded `PreparedImagery`; config stores immutable `terrainSurface:'dem'|'photo'`. DEM-only, Cinematic2D and Classic remain available. Mesh texture uses sRGB, linear filtering, generated mipmaps and clamped edges, without altitude colour multiplication/contour strokes. Existing normal-based hemisphere/directional lighting and fog remain deterministic artistic presentation, not historical sun/weather. Camera/timeline/drape/distance/segment logic is identical for controlled comparison.

## Readiness and ownership

Loader whitelists one local manifest/filename and bounds streamed bytes≤2MiB, dimensions≤2048, pixels≤3million. Validates georeference, exact bytes/SHA256 and decoded dimensions. No route is sent to a service. Renderer checks complete DEM coverage and MAX_TEXTURE_SIZE, uploads/compiles/draws the actual scene before enabling export. All240frames of10s proofs use **one resident texture**, no resource fetching in encoding callbacks and no pre-capture archive. Thus resource readiness covers the entire fixed regional camera plan; asynchronous tile readiness is not assumed.

Replacement aborts obsolete image fetch/decode work, closes obsolete ImageBitmaps and avoids stale state. Export controls freeze; shader/context/coverage errors retain explicit DEM/2D recovery with GPX intact. Constructor failure/disposal/pagehide release image, texture, geometry and GL surface. Native GPU caches may persist; dispose does not imply immediate process-memory return.

## Budget and future LOD gate

Baseline production is still≤5MiB. Default build excludes `public/imagery` and hides photo control; normal package allowlist still rejects unexpected assets. Development serves only first-party sample. `BUILD_IMAGERY_PACK=1` builds a local opt-in photographic candidate; **the existing Pages workflow does not set it**, and the default release allowlist rejects this extra pack. No deployment increase or new publication path is introduced.

Current texture1127607B plus manifest,3million RGBA pixels≈12MB decoded; estimated GPU base+mip chain≈16MB (allocation calculation, **not measured VRAM**), plus3.85MB Standard UV buffer. Camera may show coverage edge/blurred slopes/shadow clipping. This single20m source texture with mipmaps is a **prototype**, not completed geographic multi-resolution LOD or nationwide/street-level mapping.

Owner sees decoded comparisons and genuine10s MP4s before major pack expansion. Proposed next accepted step: one coarse regional overview plus bounded higher-detail patches from the **same verified10m scene**, shared alignment, feathered valid coverage, camera-frustum/footprint selection and complete deterministic residency plan. Avoid promising resolution absent from source; no nationwide DEM/image downloads. New source/detail or baseline budget increases need measured assets/licensing and owner review before deployment. Local camera-clearance refinement remains deferred until this visual basis is accepted; current safe global envelope is preserved.

## Reproduce

Windows: `npm.cmd ci`, `npm.cmd run build`, `$env:PLAYWRIGHT_CHANNEL='msedge'; npm.cmd run check`; real prototype UI/export evidence: `node scripts/acceptance/imagery.mjs`; comparisons: `python scripts/terrain/imagery-evidence.py` with pinned terrain preprocessing environment. Actual files: ignored artifacts/sprint9/imagery; committed decoded contact sheets: docs/images/imagery-*.jpg. Acquisition/rights/crop hashes: IMAGERY_SOURCE_AUDIT.md and public/imagery/sogne-sentinel.json. A new local deployment package is not permission to publish.
