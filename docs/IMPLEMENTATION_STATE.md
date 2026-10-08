# Implementation state

- Confirmed sprint start: **2026-10-08**, Asia/Yekaterinburg. Actual implementation began today after owner instruction to begin Sprint 1.
- Phase: all local acceptance checks passed; commit, PR and CI delivery.
- Branch: sprint-1-gpx-mp4.
- Last commit: 5bb815e1b689bb99988d29fc3d9f2d7eeb1756df (MP4 proof milestone); current GPX implementation is not committed yet.
- Completed: safe native GPX parsing; segments, duplicates, elevations/times/metadata; true geographic distance; shortest-arc antimeridian handling; cached local Canvas map; Russian UI; two styles; 16:9 and 9:16; deterministic preview/scrub/play/export; cancellation/failure cleanup; license distribution; public-trail external acceptance; pinned Windows/Edge CI workflow.
- Tests: `npm ci` — clean install passed, audit 0 vulnerabilities; `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run check` — 36 unit tests passed, production build passed, 10 browser tests passed, 1 external-data test intentionally skipped. Earlier explicit `$env:REAL_GPX_PATH='K:\ROUTE STORY\.reference\hong-kong-trail.gpx'; npm run test:e2e` — all 11 browser tests passed, including real public-trail acceptance. Independent FFmpeg/ffprobe decoded 96 H.264 frames at 640×360 or 360×640, 4.000 seconds, 24 fps. Production offline test found no cross-origin requests and no retained route. Deterministic canvas and no-bridge pixels, unsupported encoder, cleanup/cancellation and mobile layout passed. Logs: ignored artifacts/clean-install.log and clean-check.log. `git diff --check` passed.
- Known environment failure: Windows sandbox helper cannot start. Approved elevated shell commands work.
- Pending owner decisions: none blocking Sprint 1. No automatic PR merge.
- Known product limits: only Edge/Windows H.264 encoder independently verified; device availability is probed. Coarse map omits small islands/streets. Four-second video and modest dimensions intentionally fixed for checkpoint. Hong Kong sample redistribution unresolved, so it is excluded from Git and routine CI.
- Next: commit the GPX milestone, open a PR, verify CI and deliver preview/evidence. No merge without owner approval.

This file is a journal. Commit SHAs refer to the previous meaningful code commit to avoid a self-referential hash; `git rev-parse HEAD` is authoritative for the current checkout.
