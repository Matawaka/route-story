# Swiss Alpine pilot — local review candidate

Real downloaded-and-rendered geography, separate from PR10's rider corrections. **Not deployed**, not a public Swiss pack, not a recorded journey. Production does not import the pilot page/loader/manifest. Sogne,5/6MiB package bounds and protected Pages workflow remain unchanged.

## Selected source and rights

The originally proposed `2671-1159` image/DEM pair was actually downloaded and inspected: mountain rock/lakes, no suitable winding road. The selected SAME1km LV95 tile `2670-1157` contains the Gletsch/Furka road.

|Ordinary OGD COG|Full bytes|Independent SHA256|
|---|---:|---|
|`swissimage-dop10_2023_2670-1157_0.1_2056.tif`|45009298|`5e324e639876a227f397f0dd45de7413a563a8702acd58e5e97b5591e81d8031`|
|`swissalti3d_2024_2670-1157_2_2056_5728.tif`|1186083|`df2126dc6e28098a0127fa099367471638422d07be386732bd82e38380d2eecb`|

[Manifest](../data/swiss-pilot/manifest.json): actual first-party asset URLs, STAC identifiers, source/derived hashes, CRS, preprocessing and independent reference coordinates. Raw COGs/crops remain ignored in `.reference/swiss`, outside Git and public builds. No test-only sample ZIP, map scraping, Google imagery or online export tiles.

[SWISSIMAGE](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10) declares orthorectified RGB/LV95 and native10/25cm classes. This source raster has0.1m pixels, **not independently verified10cm acquisition**. Selected native class remains unknown (`sourceResolutionMeters:null`, conservative published upper bound0.25m). Output is deliberately coarser:1m overview/0.5m detail. Year2023 is the mosaic flight-year convention, not an exact capture day/trip date. Road and vegetation are visibly resolved; no formal cloud/snow-mask or historic weather claim.

[swissALTI3D](https://www.swisstopo.admin.ch/en/height-model-swissalti3d) declares LV95/LN02. Actual2m source spacing does not establish vertical precision; the source may have different lidar/stereo accuracy classes. This existing integer-metre storage adds at most0.5m rounding and retains true1:1 heights. Source no-data is rejected, never filled.

[swisstopo OGD terms](https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices) allow processing/distribution/commercial use with source attribution. MP4 derivatives are our application of these general permissions, not a quoted video-specific clause. `© swisstopo` appears in frames/sheets/provenance. Do not invent a CC license. This mountain-road crop does not contain the special Planet imagery used in major lake centres.

## Alignment and regional contract

Source bounds LV95 `[2670000,1157000,2671000,1158000]`; scene origin `[2670500,1157500]`. DEM crop uses source cell centres `[2670025,1157025,2670975,1157975]`,476×476/2m/453152B/226576vertices, south-up int16 rows. Image UV is east-right/north-up with `flipY=false`. Coarse control samples every25th height:20×20/50m, SAME extent/vertical scale.

Bounded EPSG2056 degree3 forward/inverse fits of the pinned PROJ operation replace a Norwegian-origin assumption ONLY for the new regional descriptor.7743 independent checks give~1e-8m numerical fit error; **not geodetic accuracy**. The operation declares1m accuracy;~1.3mm forward/inverse residual is recorded separately. Runtime rejects outside-domain coordinates, unknown CRS/datums, bad coefficients, unsafe sizes and uncovered paths. Sogne's fixed loader/allowlist/minimum10m remain intact. The2m exception requires a validated bounded regional descriptor and retains500kmesh/400kribbon vertices and1MBheight payload.

[Synthetic GPX](../data/swiss-pilot/synthetic.gpx):26points/842.6m, approximate road-centre digitization from the SAME orthophoto, not a survey or completed electric-unicycle ride. No timestamps/GPX heights; DEM remains separate. No private coordinates are transplanted.

## Resident images and safe camera

1000²/1m overview+1400²/0.5m detail:2960000pixels/1233109JPEG bytes. Both hashes/decode dimensions/textures/shaders/framebuffer are ready before encoding; no fetches or pre-captured frame store during export. The low control is averaged to10m BEFORE bilinear resampling to identical texture grids. Its enlarged grid is not claimed as new information.

The timestamp camera retains350m vertical clearance, exact triangle LOS and every-cell continuous corridor proof including intro/outro. Regional framing distances/20m lateral margin suit the1km scene without changing vertical safety.40m fades/4m-wide depth-tested ribbon/1m anti-z-fighting lift are regional only. Sogne's original framing,1800/450m fades and geometry remain unchanged. Rider "Шах - вкрутанидзе" is an upright annotation tied to the same timeline state.

## Actual evidence

- [Landscape decoded MP4 A/B](images/swiss-landscape-comparison.jpg):20s/1280×720/Atlas, same route/2m DEM/poses/marker/24fps/encoding; only photographic detail differs.
- [Portrait decoded MP4 A/B](images/swiss-portrait-comparison.jpg):30s/720×1280/Night, same controls.
- [Geometry comparison](images/swiss-geometry-comparison.jpg): actual renderer captures,2m versus deliberate50m subsampling, same conservative fine-grid camera. These are explicitly distinguished from decoded photographic MP4 frames.
- Local videos: `artifacts/sprint11/swiss/landscape-high-20s.mp4`, `portrait-high-30s.mp4`; low controls beside them. Full decoding/hashes/metrics in [SWISS_PILOT_EVIDENCE.json](SWISS_PILOT_EVIDENCE.json).

Detailed imagery resolves the road/vegetation where the10m control is soft. The small coverage boundary and empty surroundings are intentionally still visible at overview scale. This is a data/renderer pilot, not worldwide Earth coverage or an audience-retention result. Wider surroundings require a separate measured size/hosting/device decision.

## Reproduce: PowerShell

```powershell
npm.cmd ci
python -m pip install --target .reference/terrain/tools -r scripts/terrain/requirements.txt
$env:PYTHONPATH = (Join-Path (Get-Location) '.reference/terrain/tools')
python scripts/terrain/prepare-swiss-pilot.py --download
$env:SWISS_PILOT = '1'
npm.cmd run dev -- --port 4176 --strictPort
```

Open `http://127.0.0.1:4176/swiss-pilot.html`. The explicit opt-in middleware serves fixed reviewed filenames only. Source download is two ordinary COGs/~46.2MB, not bulk country coverage; no GPX is sent to the provider. Linux/macOS use `npm` and equivalent `PYTHONPATH` assignment.

```powershell
$env:SWISS_PILOT = '1'
$env:PLAYWRIGHT_CHANNEL = 'msedge'
$env:FULL_EXPORT_ACCEPTANCE = '1'
npx.cmd playwright test tests/e2e/swiss.spec.ts
node scripts/acceptance/swiss-performance.mjs
```

Four browser pilot cases explicitly skip in routine CI without prepared sources. Unit CRS/UV/bounds/geometry/camera checks still run. Full application `npm.cmd run check` expects a BASELINE production build: unset `BUILD_IMAGERY_PACK`. Photo package acceptance is a separate explicit opt-in. Never loosen the allowlist for a wrong build mode.

## Pending gates

Source-matched production regression at `724d118ab87b496c84c49fa1e510ea37853da7b7`: [package/acceptance evidence](SWISS_PILOT_PACKAGE_EVIDENCE.json). Baseline complete4905918B≤5MiB; existing Sogne photo complete5911344B≤6MiB. Neither includes Swiss crops/page/manifest. Two actual10s Compatibility Sogne videos independently decode after cancellation/retry with all23manifest hashes and first-party privacy/CSP checks. This is local production acceptance, not a new public deployment.

Human visual review; native GSD class confirmation before public map-pack claims; ordinary-laptop/physical-mobile acceptance; native/GPU peak memory; wider geographic surroundings/size/hosting approval. Previous Sogne device results do not verify this226k-vertex Swiss scene. No merge, tag, deployment, release or contest repost.
