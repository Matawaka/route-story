# Automatic photographic terrain — paused checkpoint

Historical pause checkpoint, superseded by the resumed implementation on 2026-10-13: runtime `b60ff10278b028e9dd571457f9a5f351ba727039`, PR26, actual two GPX/three synthetic China preparations and full MP4 evidence. Continue using IMPLEMENTATION_STATE.md and AUTOMATIC_GEOGRAPHY.md; do not restart this initial spike or infer deployment permission.

Owner explicitly requested a pause on 2026-10-13 with 1% Codex capacity remaining. Resume the existing branch, not a new implementation. Nothing has been merged, deployed, tagged or published.

- Branch: `codex/automatic-photographic-terrain`.
- Base/main: `1c7e5a078472981308d90abef1ee13a7f521038a`; main-push acceptance 38366195077 and protected Pages 38367152785 were successful.
- The separate documentation PR #24 / `codex/gpx-publication-handover` at `86f34aa12a22653a6dde39deeb7bfc45ebf22ffc` remains independent. Do not absorb it.
- Existing baseline `PLAYWRIGHT_CHANNEL=msedge`, `CI=1`, `SWISS_BASELINE=1`, `npm.cmd run check` completed; `test-results/.last-run.json` reports `passed`, no failed tests. The final console counts were not retained from the truncated output. Prior exact main acceptance: 238 unit tests, 62 browser passes and 32 explicit opt-in skips. Do not present these as tests of the new modules.

## Observed source feasibility

The owner explicitly authorized sending only rounded approximate search boxes for the two supplied GPX files, not GPX/points/filename/labels. The private files remain on the owner's Desktop, outside Git. `scripts/acceptance/geography-probe.mjs` takes both paths as arguments and saves STAC responses only in ignored `artifacts/automatic-geography/`.

- Earth Search Sentinel-2 L2A returned actual candidate images for both cases. Probe summer 2025: 65 candidates for Mont Blanc; Malerweg also has low-cloud candidates. Mont Blanc crosses several MGRS footprints; one image cannot be presumed to cover its entire prepared scene.
- Copernicus DEM GLO-30 metadata returns four relevant degree tiles for each case. A metadata intersection is not proof of complete usable camera coverage.
- Actual Microsoft Edge `155.0.4283.45`, anonymous browser origin `http://127.0.0.1:4195`: Earth Search metadata HTTP 200; Sentinel COG HTTP 206, exactly 16,384 requested bytes. Browser cannot read the Content-Range header because it is not exposed by CORS.
- Direct AWS Copernicus DEM COG HTTP 206 works in Node but fails browser CORS, including its regional hostname. Do not claim this direct endpoint works in GitHub Pages.
- Browser-tested alternative: Planetary Computer public STAC HTTP 200; anonymous ephemeral read-link signing HTTP 200; its `elevationeuwest.blob.core.windows.net/copernicus-dem/` COG HTTP 206, exactly 16,384 bytes. No subscription key/account was supplied. This is a third-party data provider, not an application backend. Read tickets must never appear in reports, Git or persistent storage.
- Copernicus Data Space STAC collections loaded HTTP 200 in the browser, but its actual imagery/DEM asset retrieval has NOT been verified.
- No actual crop mosaic, photo-textured scene or MP4 has yet been produced by the new mechanism. Cloud quality within the route corridor remains unverified.

Primary legal references examined: [Sentinel legal notice](https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice), [Copernicus DEM licenses](https://dataspace.copernicus.eu/sites/default/files/media/files/2025-06/copernicus_contributing_mission_data_access_v2_cop_dem_licenses.pdf) (GLO-30-F pages 22–24), [Planetary Computer read-link documentation](https://planetarycomputer.microsoft.com/docs/concepts/sas/), [Earth Search](https://github.com/Element84/earth-search). Both data licenses permit modification/public communication with required source notices and legal conditions. Preserve full DEM attribution and liability notice; do not describe it as public domain. Copernicus DEM is a DSM, WGS84 horizontal / EGM2008 vertical; it is not bare-earth road elevation.

## Saved implementation, incomplete and unused

- Pinned `geotiff@3.0.5` and `proj4@2.22.0`; installation audited 89 packages, 0 vulnerabilities. License packaging and production-size impact still need verification.
- `geographic-plan.ts`: pure finite regional plan, unchanged source coordinates, antimeridian search splitting, outward 0.1-degree search rounding, 55km maximum scene span, bounded grid and image sizes. A wide shared overview is the initial strategy. Irregular/distant segment handling needs dedicated tests and architectural review before claiming a general corridor planner.
- `geographic-network.ts`: restricted providers/paths, no credentials/referrer, no redirects or disk cache, HTTP 206 required for COG ranges, per-response limits, shared 64MiB download/1200-request/180-second preparation limits, two concurrent requests, cancellation. These are new candidate limits, not approved production-cap changes. Review queue cancellation/race correctness and real TIFF behavior.
- `geographic-discovery.ts`: Earth Search Sentinel candidates and Planetary Computer Copernicus DEM 30/90 adapters. Candidate ranking initially uses scene cloud cover; actual SCL corridor assessment and complete coverage are REQUIRED before accepting imagery. A partial GLO-30 set does not yet trigger full GLO-90 coverage fallback. Seasonal search and source failure alternatives need refinement.
- `geographic-cog.ts`: bounded range client, validated UTM/WGS84 transform, overview selection before decode, source-window budgets and raster sampling. It has not been executed against actual COG preparation. Confirm pixel-is-point/area alignment, TIFF tag/decompression budgets, UV orientation and memory, avoid token logging. Two compiler errors were corrected at checkpoint (options structural typing and async close); run TypeScript again.
- No existing controller/provider/CSP/renderer was changed. Main application still only has reviewed Furka/Sogne photographic coverage. There are no runtime external calls from the app because these modules are not connected.

## Immediate next work

1. Inspect status/HEAD/remote and journal; resume this branch. Verify TypeScript checkpoint result and preserve ignored source metadata.
2. Build one complete source preparation pipeline: resample real DEM and Sentinel+SCL mosaics into the existing local metric terrain coordinates, verify full coverage/no-data/cloud mask, generated hashes and truthful source metadata. Avoid full native tile downloads or huge decoder allocations.
3. Feed the existing TerrainRenderer without weakening 350m clearance, exact LOS/camera corridor, 500k mesh/400k ribbon/1MB grid, two textures/3M pixels/2MiB encoded imagery or MP4 bounds. Mont Blanc overview may exceed current camera fit envelope; test and diagnose rather than silently relaxing safety.
4. Integrate through `scene-provider.ts` and the single main controller. Add explicit per-route approximate-area consent BEFORE external calls, source-specific errors/stages, cancellation/retry/stale-response protection and bounded public-geography-only RAM cache. Keep 2D available and export network-free after readiness.
5. Test the actual private Mont Blanc/Malerweg without committing their GPX or route coordinates. Produce real independently decoded 20s landscape/30s portrait MP4 and preview parity. Then test the three owner-specified Chinese WGS84 areas using clearly synthetic local routes.
6. Unit/e2e/clean install/license/package/privacy tests, measured transfer/preparation/native memory where available. Compare browser-only to VPS/free service without inventing infrastructure availability/costs. Publish a focused reviewable PR only after meaningful evidence; no merge/deploy authorization for this task.

The task is NOT COMPLETE. Owner pause is the reason execution stopped; resume only when requested.
