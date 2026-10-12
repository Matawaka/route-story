# Swiss Phase C — bounded developer experiment

## Reference, 2026-10-12

Base `02b498a32242b3e1514529087c546fb4e253e62a`, PR11 OPEN/retargeted to main. PR10 MERGED at actual main `64fcf2933f62f678808198d331775d7ceccc3d3d`; main-push CI38194730545 SUCCESS. PR12/13 closed alternatives are excluded. New branch `codex/swiss-extended-coverage`, no merge/tag/deploy/public package change.

Clean `npm.cmd ci`76packages/77audited/0vulnerabilities; `npm.cmd test`189PASS/17files; build PASS; `SWISS_PILOT=1 PLAYWRIGHT_CHANNEL=msedge FULL_EXPORT_ACCEPTANCE=1 npx.cmd playwright test tests/e2e/swiss.spec.ts`4PASS/39.8s. Original full COG/derived hashes rechecked and original/newly decoded reference artifacts kept separately under ignored `artifacts/swiss-phase-c/reference-02b`; source archive `.reference/swiss/baseline-02b-source.zip`. Historical evidence is not overwritten.

Actual camera-to-route-ground distances: landscape opening1479m/replay~578–607m, portrait opening2424m/replay~589–607m. Local projected ground spacing near rider: landscape1.73m/output-pixel opening/~0.69–0.75 replay; portrait1.60 opening/~0.36–0.41 replay. This is a local tangent/surface sample, not source acquisition GSD. Actual mesh intersections on a9×9 caption-safe screen grid: opening35%landscape/52%portrait, replay58–84%landscape/93–100%portrait. Full-image corners at the route-height plane extend to approximately[-1399,-882,1039,812]local metres; this plane estimate is not mountain visibility proof.

## Bounded alternatives before implementation

|Candidate|Predictable resource budget|Tradeoff|
|---|---|---|
|A:3km overview plus original700m detail; one derived5m mesh|601²=361201vertices/722402Bheight;1000²overview+1400²detail=2960000pixels/11.84MBRGBA/~15.79MBmips; mesh arrays~24.54MB, JPEG must actually fit2MiB|Same two resident textures, no tile paging/seam topology. Runtime mesh is explicitly5m resampled from official2m source; old2m pilot stays available for comparison. Existing500kmesh/1MBheight caps unchanged|
|B:fixed coarse outer mesh plus original2m inner patch|e.g151²/20m outer+476²fine=249377vertices/~0.5MBheight; same image cap if atlas/two samplers|Requires stitched fine/coarse boundaries and identical CPU collision/LOS topology, or additional texture samplers. Higher implementation/proof cost; not chosen before measured need|

A is the initial simplest candidate. Official2m overview COGs supply only the surrounding view; the original independently hashed0.1m source remains the route-detail source. No native10cm promise. Actual compressed bytes/coverage/mesh error/native memory/export result must be measured before acceptance. Three-kilometre extent is chosen from both aspect ratios' reference poses with margin, not nationwide rectangular downloading. Wider camera composition is separately evaluated; it cannot silently expand the required terrain or relax350m safety.

No success claim for the expanded prototype at this checkpoint. Device/native-memory/continuous terrain/MP4/production gates remain next; physical laptop/mobile unavailable here must be reported NOT TESTED.

## Actual local acceptance (supersedes pending prototype gates above)

Working checkpoint8cddc95879665566a85908db99cfffdf0e611fd6 plus final instrumentation/UI/evidence fixes. Full `SWISS_PILOT=1 PLAYWRIGHT_CHANNEL=msedge FULL_EXPORT_ACCEPTANCE=1 OWNER_JPEG_PATH=<local original JPEG> npm.cmd run check`:199unit/18files/build PASS;66browser PASS/1external-data skip,4.0min. Original Swiss4cases and all Sogne/GPX/segment/antimeridian/marker-security/cancellation/context/30s5000point regressions retained. Audit0vulnerabilities. Exact video/current tested-file hashes in [Phase C evidence](SWISS_PHASE_C_EVIDENCE.json); historical PR11 evidence kept separately.

Atlas20s1280×720480frames/Night30s720×1280720frames actualH.264/24FPS MP4s fully independently decoded, every timestamp/duration/nonblank/changing image checked. Same-camera low10m/high A/B holds source geometry/DEMs/marker/grade/pacing/viewport/encoder settings fixed. Initial/reverse seek/preview-export source pixels match exactly; lossy decoded meanRGB error is separate. Counter/legend and endpoint/rider collisions checked by actualCanvas text bounds. Compatibility customPNG10s export/cancelretry and original ownerJPEG/privacy regressions pass. Same-data camera and5/50m geometry studies are separately labelled actual renderer captures, not decoded MP4.

[Landscape decoded detail A/B](images/swiss-context-landscape-detail.jpg), [portrait](images/swiss-context-portrait-detail.jpg), [overall before/after](images/swiss-context-landscape-before-after.jpg), [geometry](images/swiss-context-geometry.jpg), [camera composition](images/swiss-context-composition.jpg). Overall comparison changes coverage/mesh/composition/dynamics and is NOT the isolated detail study. Wider surroundings materially remove the tiny-square presentation; representative9×9 map-ray samples are100%covered in both formats at six times. Source detail occupies at most~0.97landscape/~1.73portrait destination pixels in actual final video. Underlying roads/vegetation are real source data, no sharpening/AI features.

Native2m float-source acceptance independently checks continuous242camera legs/2632crossed cell intervals per aspect, including intro/outro: minimum507.03m source-cell clearance, all encoded480/720poses exact native triangleLOS pass (minimum~21.4m). No350m relaxation.5m rendered approximation versus original2m mesh along1025road samples: RMSE0.636m/max3.122m;9797off-grid1km samples RMSE0.501m/max7.518m. These are approximation differences, not surveying precision. Original2m scene is retained where finer local geometry is preferable.

Repeated performance/native methods and limitations: [performance](SWISS_PILOT_PERFORMANCE.md). Measured~1GBsampled native browser private peaks dominate the~15MBJSheap. No physical laptop/mobile test or reliable dedicatedVRAM/encoder measurement is invented. Pixel-identical48Sogne destination frames prove unchanged legacy rendering after the scoped extensions.

Chosen future plan: a fixed first-party regional overview plus one bounded route-detail corridor, with offline source selection/coverage/CRC/CRS preparation and every-frame camera/readiness proof. Fixed patch topology/atlas or local tile manifest is deferred until a longer real route actually exceeds this coverage; no runtime public-tile harvesting or GPX service query. Small rectangular pack is justified here by twoaspect overview frusta and unchanged3million-pixel/two-sampler budget; an irregular stitched mesh would add proof cost without a measured benefit.

Actual developer UI [screenshot](images/swiss-context-ui.jpg) selects the approved `Шах - вкрутанидзе` by default. Desktop Edge375pixel viewport has document width375/no horizontal overflow, no page errors or external requests; this is layout emulation, not physical mobile verification. Both decoded before/after sheets and the portrait same-camera detail study were visually inspected after the final full run.

Source-matched production gate at858a582: baseline4909672B≤5MiB, photo5915098B≤6MiB including release manifests, no Swiss files or page; photo publicationApproved=false. [Package evidence](SWISS_PHASE_C_PACKAGE_EVIDENCE.json) records every allowlisted hash and local production smoke:23manifest hashes/licenses/CSP/privacy/seek/cancelretry plus two independently decoded10s360p Sogne MP4s. Historical PR11 evidence remains unchanged.

Pending: reviewable stacked PR targeting PR11, owner visual approval/device testing/new Swiss hosting decision. No publication claimed.
