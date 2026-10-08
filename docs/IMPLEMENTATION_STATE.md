# Implementation state

- Confirmed sprint start: **2026-10-08**, Asia/Yekaterinburg. Actual implementation began today after owner instruction to begin Sprint 1.
- Phase: Sprint 1 checkpoint delivered for owner review; no merge or deployment performed.
- Branch: sprint-1-gpx-mp4.
- Last recorded meaningful commit: 326ac7a561d3f93016a0c0fcdf3cef3f106f27ab (GPX/map implementation pushed to GitHub). This follow-up includes the tested no-truncation fallback-name correction and handoff journal. Current HEAD: use `git rev-parse HEAD`.
- Completed: safe native GPX parsing; segments, duplicates, elevations/times/metadata; true geographic distance; shortest-arc antimeridian handling; cached local Canvas map; Russian UI; two styles; 16:9 and 9:16; deterministic preview/scrub/play/export; cancellation/failure cleanup; license distribution; public-trail external acceptance; pinned Windows/Edge CI workflow.
- Tests: `npm ci` — clean install passed, audit 0 vulnerabilities; final `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run check` — 37 unit tests passed, production build passed, 10 browser tests passed, 1 external-data test intentionally skipped. Earlier explicit `$env:REAL_GPX_PATH='K:\ROUTE STORY\.reference\hong-kong-trail.gpx'; npm run test:e2e` — all 11 browser tests passed, including real public-trail acceptance. Independent FFmpeg/ffprobe decoded 96 H.264 frames at 640×360 or 360×640, 4.000 seconds, 24 fps. Production offline test found no cross-origin requests and no retained route. Deterministic canvas and no-bridge pixels, unsupported encoder, cleanup/cancellation and mobile layout passed. Logs: ignored artifacts/clean-install.log, clean-check.log and final-check.log. `git diff --check` passed.
- Known environment failure: Windows sandbox helper cannot start. Approved elevated shell commands work.
- Pending owner decisions: none blocking Sprint 1. No automatic PR merge.
- Known product limits: only Edge/Windows H.264 encoder independently verified; device availability is probed. Coarse map omits small islands/streets. Four-second video and modest dimensions intentionally fixed for checkpoint. Hong Kong sample redistribution unresolved, so it is excluded from Git and routine CI.
- Repository: https://github.com/Matawaka/route-story. Review PR: https://github.com/Matawaka/route-story/pull/1 (open, unmerged).
- GitHub CI: first Windows/Edge run passed clean install, 36 unit tests, build, 10 browser tests and synthetic evidence upload: https://github.com/Matawaka/route-story/actions/runs/37811667151. The final pushed follow-up is verified separately through the PR's current checks before delivery.
- Local evidence: artifacts/route-story-proof.mp4, production-portrait.mp4 and adjacent validation JSON; desktop/mobile preview PNGs; external artifacts/real-route.mp4 and real-route-acceptance.json remain ignored.
- Launch: `npm ci; npm run build; npm run preview` in K:\ROUTE STORY; open the printed localhost URL. Playwright-owned verification servers are stopped after tests.
- Pending owner decision: review/approve PR before any merge. No automatic merge.
- Immediate next phase recommendation: verify additional browser/device encoders and bounded longer exports, then improve geographic/elevation clarity. Keep real-sample redistribution unresolved until its upstream obligations are settled. Owner may revise scope after viewing the prototype.

This file is a journal. Commit SHAs refer to the previous meaningful code commit to avoid a self-referential hash; `git rev-parse HEAD` is authoritative for the current checkout.
