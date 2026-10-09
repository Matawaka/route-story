# v1.1.0 release readiness

## Current public and device checkpoint — 2026-10-09

The owner personally approved protected run [37962492130](https://github.com/Matawaka/route-story/actions/runs/37962492130). Build/deploy/HTTPS acceptance **SUCCESS**. Actual returned URL [https://matawaka.github.io/route-story/](https://matawaka.github.io/route-story/) anonymously verified; release.json1.1.0-rc.1/exact accepted main8f4d0f6,19manifest hashes,4774481B. This is accepted DEM-only code, no photo-v1.2 deployment. Stablev1.0 tag/release assets are immutable; the public app has advanced to the accepted3D candidate.

Independent Windows10.0.26200/Edge154.0.4258.62 `APP_URL=... EXPECTED_COMMIT=8f4d0f6 EXPECTED_VERSION=1.1.0-rc.1 node scripts/acceptance/release.mjs --smoke` passed anonymous200/secure context/assets/hashes/licenses/metaCSP/no external requests/storage,controls/cancelretry/unsupported-encoder simulation/native playback and two real10sStandard MP4s. HTTP response CSP header was absent; restrictive HTML meta CSP observed. `APP_URL=... EXPECTED_COMMIT=8f4d0f6 node scripts/acceptance/terrain.mjs --production` also passed full real public3D Atlas20s1280×720/480frames/12812946B/export1238.7ms and Night30s720×1280/720frames/17894633B/export1755.8ms. Both H264/24fps/alltimestamps/everyframe FFmpeg6.1.1 decoded,minimum central-map luma spread129/155,no missing responses/external calls/storage. Actual public file SHA256 Atlas`dcb982a2ed6ad8b14c7fcfcbf7b89721679865c67ba7207b28f49d77136ab938`,Night`2be3efe61ff42e39de200cad76200d543bf8d16f6112f65e81d221db6b80a0c8`. One-off times are not benchmarks. A first full run hit navigation timeout; bounded DOM-readiness retry passed, not a hidden initial success.

Owner explicitly reports **all requested checks and video qualities/aspects passed on Xiaomi14,XiaomiPad2,MacBookM2**, using Chrome,Brave,Safari. This is owner-run aggregate acceptance on the public candidate. OS/browser versions,individual device-browser pairing,GPU/thermal/memory measurements were not provided; do not fabricate them or extend this result to physicaliOS/other Safari/Android builds. No known owner-reported blocker. [Sanitized public/device evidence](V1_1_PUBLIC_ACCEPTANCE.json) preserves historical local results separately.

Required device gate is satisfied by the owner's report. **Final stable publication still PENDING**: owner reviews/authorizes merging this version-only PR8, exact resulting main passesCI/package validation, final stable release approved. Existing human-reviewed workflow must be reused for that exact SHA; no second deployment system, auto merge, movedv1.0 tag or photo publication. The sections below are the historical pre-deployment checkpoint/checklist and local proof; completed public/device results above supersede their PENDING fields.

Remote acceptance tooling now supports APP_URL/EXPECTED_COMMIT/output-folder overrides without source-module imports or mutation of production UI/export settings. `ACCEPTANCE_DIR` preserves prior local and public reports; in PowerShell use `$env:NAME='value'`.

## Historical pre-deployment readiness and checklist

Sprint7/8 were accepted and merged by the owner. Reviewed main is `8f4d0f665d3f6df7f9fdef0d356a33310d2800ab`; [main-push CI37958144808](https://github.com/Matawaka/route-story/actions/runs/37958144808) is SUCCESS. PR6 merge `ff6c76d7cad6454b42134bb9ea8cb554be7db277`, PR7 merge `8f4d0f6…`. The independent documentation PR5 remains open and is not included here.

This stabilization promotes package/lockfile to1.1.0 without changing rendering. Published v1.0.0, its assets/tag and protected manual Pages workflow remain unchanged. Publication is **PENDING**: required owner-run device acceptance and final owner approval are outstanding. A passing desktop test is not physical-device verification.

Owner follow-up authorizes **candidate deployment before device checks** to enable external testing on reported Xiaomi14, XiaomiPad2 and MacBookM2. These are available-device statements, not acceptance results. Protected manual run [37962492130](https://github.com/Matawaka/route-story/actions/runs/37962492130) builds accepted main8f4d0f6 (still1.1.0-rc.1), build SUCCESS/deploy WAITING owner review as of this checkpoint. This permission does not merge PR8, deploy v1.2 or publish the final stable tag. After owner approval, inspect actual returned URL/source manifest and public HTTPS acceptance; never label a pending deployment successful.

## Owner-run checklist

Use this candidate's local preview on an ordinary laptop. For a physical phone, use an owner-approved HTTPS candidate or a secure local test arrangement; plain LAN HTTP cannot test WebCodecs. Do not deploy to bypass this requirement. The existing public site remains v1.0 until an approved release.

Record each device separately using the following form. GPU may be recorded as unknown; do not collect/transmit fingerprints automatically.

| Field/check | Owner observation |
| --- | --- |
| Date; candidate SHA/version | PENDING |
| Physical device or emulation | PENDING |
| OS; browser/version | PENDING |
| Available GPU (if known) | PENDING |
| Import public synthetic GPX; correct start/finish/segments | PENDING |
| 2D Cinematic and Classic; play/backward seek | PENDING |
| Terrain demo; 3D preview or clear WebGL error with usable2D recovery | PENDING |
| Atlas/Night;16:9/9:16; readable overlays | PENDING |
| H.264 capability for360p;720p separately | PENDING |
| Short10s MP4 where supported; open/play downloaded file | PENDING |
| Cancel and retry; controls recover | PENDING |
| Unsupported encoding: explanation, preview remains usable | PENDING |
| Device thermal/memory symptoms or context loss | PENDING |

If MP4 is unsupported, record UNSUPPORTED rather than failure of route preview. A test that cannot be run is NOT TESTED/ENVIRONMENT BLOCKED. Do not infer physical Safari/Android support from desktop or emulation. Never upload a personal GPX for diagnostics.

## Release sequence

1. Review stabilization PR and its exact checks; owner merges separately.
2. Record device results, resolve confirmed blockers, request final release approval.
3. Verify resulting main SHA and successful main-push CI. Re-run package integrity against that SHA.
4. Reuse existing manual protected Pages workflow on that exact reviewed SHA. Owner approves the environment personally.
5. Verify actual returned HTTPS URL and version/source/hash manifest, then perform public export acceptance.
6. Publish a new immutable v1.1.0 tag/release only after approval and acceptance, with independently decoded synthetic MP4s and finalized hashes. Never move v1.0.0.

Historical desktop/MP4/memory evidence remains in TERRAIN_EVIDENCE.json and associated Sprint8 documents. It is not overwritten with unperformed device or public tests.

## Current-version local production evidence

Accepted application plus version promotion at `a9d480eab25b54145b25ed6396a0f5a091b75224`, clean tree. `npm.cmd run build; npm.cmd run release:package; $env:ACCEPTANCE_DIR='artifacts/sprint9/v1.1'; node scripts/acceptance/terrain.mjs --production`: PASS, Windows10.0.26200/Edge154.0.4258.62. Actual production UI below local `/route-story/`,19 manifest hashes/4775792B validated,0 errors/external requests/bad responses/storage/viewport overflow. This is not public HTTPS acceptance.

| True3D output | Independently decoded | Bytes | Export wall clock (one observation) | SHA256 |
| --- | --- | --- | --- | --- |
| Atlas20s1280×720 | H.26424fps480frames | 12812946 |1198.1ms | a77ed890451a34d72c46ed6590b2c2d4501f58dc8af22660208b88bb96102588 |
| Night30s720×1280 | H.26424fps720frames | 17894633 |1771.0ms | a0cc84ff7eeaebd6de1af5e42a1dccfc9edcea13f4d865b8d2af91897168dffd |

FFmpeg6.1.1/ffprobe validate actual dimensions/container/codec/time/frame timestamps and every frame. Central-map minimum luma spread129/155; no blank geographic frames. Files/reports remain local under `artifacts/sprint9/v1.1`; new encoder bytes are not assigned old Sprint8 hashes. No new memory benchmark is claimed for this version-only change.
