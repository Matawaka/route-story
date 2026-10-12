# Swiss publication — owner-approved regional candidate

## Owner device check after the protected deployment

Use the actual deployed application only after release.json identifies the reviewed deployment SHA. Physical Swiss tests are currently NOT TESTED; prior Sogne success does not establish Swiss support. Please record device, OS/browser version and result for Xiaomi14, XiaomiPad2 and MacBookM2:

1. Open the main application and choose the Alps demo; check the synthetic-route label and ©swisstopo credit. Check the rider near start/finish and reverse seeking.
2. Preview Atlas/Night in16:9/9:16; compare close and overview shots, road alignment and surrounding terrain.
3. Export10sCompatibility, then10sStandard if the encoder supports it. Open the downloaded actual MP4 and verify it plays through the ending.
4. Cancel export, retry successfully, then change theme/aspect and repeat. Replace a local PNG/WebP/JPEG marker and confirm visibility; private images and GPX stay local.
5. If3D/context/codec preparation fails, record the actual message and verify Sogne or2D preview/recovery. Report reload/tab termination separately; the application cannot catch an OS-killed tab.

These checks establish only the tested browser/device/settings. They do not establish universal mobile support or a native/GPU memory bound. No device fingerprint is collected or uploaded automatically.

Owner approval2026-10-12 covers actual reviewed videos, merge/deploy and required size increase. PR11/14 are merged; publication packaging is a focused follow-up on actual mainc12a3a7. Version remains1.2.0-rc.1; stable tags/assets immutable. Main-push CI and protected human Pages approval still precede deployment.

Furka high-detail pack:1995842B for2JPEGs+5m height grid+unchanged842.6m syntheticGPX, plus23010B source manifest. No raw COG,9MB native reference,2m/control meshes or low imagery enter the public build. Original comparisons stay available locally/recoverably. Two textures/2960000pixels/349281mesh vertices/698562Bheight remain unchanged. Complete optional combined build cap9MiB; baseline5MiB/Sogne6MiB are retained. Source hashes and ©swisstopo notices are kept.

```powershell
node scripts/terrain/promote-swiss-pack.mjs
$env:BUILD_IMAGERY_PACK = '1'
$env:BUILD_SWISS_PACK = '1'
npm.cmd run build
node scripts/package-release.mjs --imagery-release --swiss-release
$env:PLAYWRIGHT_CHANNEL = 'msedge'
node scripts/acceptance/swiss-public.mjs --full
```

Source preparation is reproduced by the pinned commands in SWISS_PILOT.md; promotion checks every derived hash before copying approved outputs. Public entry swiss-pilot.html hides unavailable developer A/B controls, retains styles/aspects/durations/quality/grade/pacing/custom markers, reports experimental support, and links to Sogne/2D. Main offers the synthetic Alps demo and recognizes a conservative Furka corridor for private GPX in3D/Auto. Regional matching occurs locally; the route is not transplanted or sent to a server. Required imagery/height/GPU resources and every encoded camera timestamp are ready before export. An unsuitable route/camera gives a truthful2D fallback/error.

Eurasia/global overview uses existing local Natural Earth; detailed photo/DEM coverage is only the prepared Sogne/Furka areas. Owner permission to load maps is not evidence that licensed detail for all Eurasia exists. Future expansion should use fixed regional manifests and bounded first-party offline-ready packs, selected by local bounds, with source/rights/budget/actual-video review for each. Do not add uncontrolled public imagery tiles/geocoding/paid APIs. First-party pack downloads expose the selected region name to ordinary hosting logs; no coordinates/privateGPX/diagnostics are transmitted.

Extra native2m camera proof remains specific to the approved synthetic route. Uploaded GPX is checked against the actual rendered5m geometry/350m/LOS/frame cone; no universal source surveying/device guarantee. Physical Swiss Xiaomi/MacBook/ordinary laptop tests remain NOT TESTED, sampled desktop browser private peak~1GB. Observable GPU/codec/readiness failures preserve explicit2D recovery; OS tab termination cannot be caught. Package-size authorization does not raise those memory bounds.

Deployment/public acceptance URL and exact SHA: PENDING final publication workflow and human environment review. Do not interpret local production acceptance as public HTTPS success.

2026-10-12 publication attempt38219324249 stopped on Ubuntu source-GPX byte validation before deployment. PR17 preserves both source and published Git blobs and adds an OS-independent regression. Source36550b9 has203unit PASS and full local20/30s decoded acceptance; [saved evidence](SWISS_PUBLICATION_EVIDENCE.json). Exact future merged main, protected deployment and actual HTTPS acceptance remain PENDING; never report the failed run as a public update.

The owner's next geographic priorities are **China and Georgia**. First candidates: [Sentinel2 RGB10m](https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2), whose [legal notice](https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice) permits reuse/modification/distribution with source credit; and [Copernicus GLO30](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM), a global30m **DSM**, including vegetation/buildings, not a2m bare-earth road model. Its separate [GLO30-F licence, pages22–24](https://dataspace.copernicus.eu/sites/default/files/media/files/2025-06/copernicus_contributing_mission_data_access_v2_cop_dem_licenses.pdf) requires source, modified-data and downstream notices. These are source candidates checked2026-10-12, not downloaded/tested Chinese or Georgian packs. Exact corridor/source identifiers/clouds/no-data/vertical datum/derived hashes and honest attainable detail must be verified before integration;10m imagery cannot provide Swiss road-level detail. No privateGPX/coordinate query or runtime provider call was added.
