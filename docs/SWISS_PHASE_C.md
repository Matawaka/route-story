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
