# Route Story

Read docs/IMPLEMENTATION_STATE.md before resuming work. Reconcile it with git status and HEAD.

Sprint 1: Vite, TypeScript, Canvas 2D, local GPX processing and real WebCodecs H.264 MP4 export. Russian UI. Prioritize reliability and modest resolution. No React, MapLibre, Three.js, Remotion, paid services or required remote APIs without a documented concrete blocker.

Keep route data in memory. Never upload or persist user routes. No telemetry, external runtime assets, unsafe HTML, executable SVG or dynamic user URLs. Preserve segment boundaries and actual geometry. Reject DTD/entities, malformed XML, invalid coordinates, files over 10 MiB and routes over 50,000 points; never silently truncate.

Use pinned dependencies and document licenses and data provenance. Real test data stays outside Git until its full data license is resolved. Synthetic fixtures are clearly labelled.

Run unit tests, build and browser smoke tests before reporting success. MP4 success requires independent decoding, dimensions, H.264, duration and frame-count checks. Record exact commands, results, branch and commit in the state journal after meaningful commits.

Work on short-lived branches and reviewable PRs after bootstrap. No automatic merges, force pushes or unrelated repository changes. Avoid speculative architecture. No subagents are required.
