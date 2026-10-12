# Swiss publication — owner-approved regional candidate

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
