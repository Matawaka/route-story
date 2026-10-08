# Implementation state

- Confirmed sprint start: **2026-10-08**, Asia/Yekaterinburg. Actual implementation began today after owner instruction to begin Sprint 1.
- Phase: Sprint 1 checkpoint delivered for owner review; no merge or deployment performed.
- Branch: sprint-1-gpx-mp4.
- Last recorded meaningful code commit: 5b4b4a13a2cf7c5a210ec2513fe40a9709a9e1cd (final no-truncation correction and handoff, pushed to GitHub). This journal-only update records its completed remote checks. Current HEAD: use `git rev-parse HEAD`.
- Completed: safe native GPX parsing; segments, duplicates, elevations/times/metadata; true geographic distance; shortest-arc antimeridian handling; cached local Canvas map; Russian UI; two styles; 16:9 and 9:16; deterministic preview/scrub/play/export; cancellation/failure cleanup; license distribution; public-trail external acceptance; pinned Windows/Edge CI workflow.
- Tests: `npm ci` — clean install passed, audit 0 vulnerabilities; final `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run check` — 37 unit tests passed, production build passed, 10 browser tests passed, 1 external-data test intentionally skipped. Earlier explicit `$env:REAL_GPX_PATH='K:\ROUTE STORY\.reference\hong-kong-trail.gpx'; npm run test:e2e` — all 11 browser tests passed, including real public-trail acceptance. Independent FFmpeg/ffprobe decoded 96 H.264 frames at 640×360 or 360×640, 4.000 seconds, 24 fps. Production offline test found no cross-origin requests and no retained route. Deterministic canvas and no-bridge pixels, unsupported encoder, cleanup/cancellation and mobile layout passed. Logs: ignored artifacts/clean-install.log, clean-check.log and final-check.log. `git diff --check` passed.
- Known environment failure: Windows sandbox helper cannot start. Approved elevated shell commands work.
- Known product limits: only Edge/Windows H.264 encoder independently verified; device availability is probed. Coarse map omits small islands/streets. Four-second video and modest dimensions intentionally fixed for checkpoint. Hong Kong sample redistribution unresolved, so it is excluded from Git and routine CI.
- Repository: https://github.com/Matawaka/route-story. Review PR: https://github.com/Matawaka/route-story/pull/1 (open, unmerged).
- GitHub CI: final code commit 5b4b4a1 passed clean install, 37 unit tests, build, 10 browser tests (1 external-data skip) and synthetic evidence upload: https://github.com/Matawaka/route-story/actions/runs/37812961005. Initial code milestone also passed: https://github.com/Matawaka/route-story/actions/runs/37811667151. Both runs completed successfully; journal-only changes do not alter tested code.
- Local evidence: artifacts/route-story-proof.mp4, production-portrait.mp4 and adjacent validation JSON; desktop/mobile preview PNGs; external artifacts/real-route.mp4 and real-route-acceptance.json remain ignored.
- Launch in Windows PowerShell: `npm.cmd ci; npm.cmd run build; npm.cmd run preview` in K:\ROUTE STORY; open the printed localhost URL. Explicit `.cmd` avoids a blocked npm.ps1 without changing system ExecutionPolicy. Playwright-owned verification servers are stopped after tests.
- Pending owner decision: review/approve PR before any merge. No automatic merge.
- Immediate next phase recommendation: verify additional browser/device encoders and bounded longer exports, then improve geographic/elevation clarity. Keep real-sample redistribution unresolved until its upstream obligations are settled. Owner may revise scope after viewing the prototype.

This file is a journal. Commit SHAs refer to the previous meaningful code commit to avoid a self-referential hash; `git rev-parse HEAD` is authoritative for the current checkout.

## 2026-10-08: PowerShell launch follow-up

Owner encountered blocked `C:\Program Files\nodejs\npm.ps1` under the system execution policy. README and external-test launch commands now explicitly use `npm.cmd`/`npx.cmd` for Windows PowerShell; Linux/macOS still use the unsuffixed commands. No system policy was changed.

Baseline HEAD before this documentation fix: 7382a5bbd2dcabedf65de466212afbc9fa88de36. Validation: separate `powershell.exe -NoProfile -ExecutionPolicy Restricted -Command 'npm.cmd --version; npm.cmd run build; exit $LASTEXITCODE'` passed (npm 11.17.0, TypeScript/Vite build). `npm.cmd run preview -- --port 4173 --strictPort` started successfully; HTTP GET http://127.0.0.1:4173/ returned 200 with Route Story content. The user-facing local preview remains running for this follow-up. `git diff --check` passed. No application-code changes; the existing acceptance suite remains applicable.
