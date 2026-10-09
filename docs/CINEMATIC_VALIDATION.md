# Cinematic v1.1 visual acceptance

Candidate: feature/cinematic-route-story-v1.1 / PR [#6](https://github.com/Matawaka/route-story/pull/6). Stable main/tag remains `5f39332b7358949d248da6b2f99ba445ee1b41e8`. This candidate is not deployed or published. Owner visual approval is pending; passing automated tests does not establish audience retention or physical-phone usability.

## Reproducible evidence

`node scripts/acceptance/cinematic.mjs` drives the real UI, loads the labelled 700-point synthetic fjord demo, selects Standard, exports Atlas 16:9/20s and Night 9:16/30s, independently validates H.264/MP4/duration/frames and extracts decoded intro/replay/outro frames. Local outputs are ignored under artifacts/sprint7/cinematic.

`node scripts/acceptance/comparison.mjs` extracts the immutable v1.0.0 renderer with git show and encodes the **same 700-point route**, titles, dimensions and durations for a fair controlled comparison. It also decodes the actual published v1.0.0 videos. Contact sheets explicitly distinguish the published examples (different routes) from the same-route baseline. No source MP4 is modified, retagged or replaced.

Final example hashes, decoded contact sheets and visual observations will be added after the final application checkpoint is exported. Prototype evidence is separately labelled in VISUAL_UPGRADE_AUDIT.md; its performance/hashes are not final-candidate claims.

## Automated checks at the cartography checkpoint

Windows 10.0.26200 x64 / Microsoft Edge 154.0.4258.62 / Node 24.19.0. `PLAYWRIGHT_CHANNEL=msedge FULL_EXPORT_ACCEPTANCE=1 npm.cmd run check`: 111 unit tests, production build, 30 browser tests passed; one licensed-external-data opt-in test intentionally skipped. Full 30s Standard original 5000-point regression passed in both aspects. New exact pixel checks span both styles, both aspects and both quality presets; forward/backward seek and the export draw callback match. These compare uncompressed frames, not lossy decoded H.264 pixel identity.

New geometry coverage: finite/clamped pure camera, smooth intro/replay/outro boundaries, marker-safe framing, exact full overview endpoints, zero/short distance, high latitude, shortest-arc antimeridian, discrete disconnected segment transitions, 50,000 preserved points, no gap bridge and no false Pacific land. Missing local geography blocks export and recovers on retry. Classic/reduced motion and encoder/cancellation/error recovery are preserved. Production network/storage/privacy checks and strict package allowlist remain active.

GPU VRAM, dedicated codec memory, Linux/macOS export, physical Android/iOS and Safari are NOT TESTED for this candidate. Cross-engine results and measured native process memory are recorded separately when available. The package and export ceilings are resource bounds, not proof of universal memory safety.
