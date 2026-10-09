# Route Story

Read docs/IMPLEMENTATION_STATE.md before resuming work. Reconcile it with git status and HEAD.

Stack: Vite, TypeScript, Canvas 2D, local GPX processing and real WebCodecs H.264 MP4 export. Russian UI. Prioritize reliability and bounded resources. No React, MapLibre, Three.js, Remotion, paid services or required remote APIs without a documented concrete blocker.

Preview and export share the validated immutable StoryConfig and timestamp-based StoryTimeline. Public durations are 10/20/30 seconds, maximum 720 frames at 24 fps; 4 seconds is internal regression only. Compatibility is 360p/1.5 Mbps, Standard is 720p/5 Mbps with explicit capability checks and no silent downgrade. Keep the static route-fitting camera, segment gaps and precomputed geometry. No mutable UI reads during export. Encoded payload is limited to 32 MiB.

Keep route data in memory. Never upload or persist user routes. No telemetry, external runtime assets, unsafe HTML, executable SVG or dynamic user URLs. Preserve segment boundaries and actual geometry. Reject DTD/entities, malformed XML, invalid coordinates, files over 10 MiB and routes over 50,000 points; never silently truncate.

Use pinned dependencies and document licenses and data provenance. Real test data stays outside Git until its full data license is resolved. Synthetic fixtures are clearly labelled.

Run unit tests, build and browser smoke tests before reporting success. MP4 success requires independent decoding, dimensions, H.264, duration and frame-count checks. Record exact commands, results, branch and commit in the state journal after meaningful commits.

Routine CI retains the 4-second regression and a bounded 20-second Standard export. Full 30-second Standard exports in both aspects use FULL_EXPORT_ACCEPTANCE=1 locally. Windows PowerShell launch commands use npm.cmd without changing execution policy.

Release publication is manual and requires explicit owner authorization. Pages builds must use the exact reviewed main SHA with successful main-push acceptance; configure a main-only github-pages environment with a required human reviewer before dispatch. Test the actual returned HTTPS URL separately; localhost is not public acceptance. Publish only independently validated synthetic demo assets and verified URLs.

Work on short-lived branches and reviewable PRs after bootstrap. No automatic merges, force pushes or unrelated repository changes. Avoid speculative architecture. No subagents are required.
