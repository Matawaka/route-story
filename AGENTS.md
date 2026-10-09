# Route Story

Read docs/IMPLEMENTATION_STATE.md before resuming work. Reconcile it with git status and HEAD.

Stack: Vite, TypeScript, Canvas 2D, local GPX processing and real WebCodecs H.264 MP4 export. Sprint 8 adds pinned Three.js for owner-authorized genuine local DEM terrain; see TERRAIN_ARCHITECTURE.md. Russian UI. Prioritize reliability and bounded resources. No React, Remotion, paid services or required remote APIs. MapLibre remains an ignored feasibility tool, not a runtime dependency.

Preview and export share the validated immutable StoryConfig and timestamp-based StoryTimeline. Public durations are 10/20/30 seconds, maximum 720 frames at 24 fps; 4 seconds is internal Classic regression only. Compatibility is 360p/1.5 Mbps, Standard is 720p/5 Mbps with explicit capability checks and no silent downgrade. Cinematic camera uses a pure timestamp function and precomputed per-segment plan; Classic remains available for comparison/reduced motion. Preserve segment gaps, antimeridian short arcs, north-up orientation and precomputed geometry. No mutable UI reads during export. Encoded payload is limited to 32 MiB.

Cinematic geography is bounded local Natural Earth 50m global / 10m western-Norway vectors, with exact provenance/hashes and readiness validation. Do not export before required layers load; never fetch external tiles or geocode GPX. Map labels are sourced anchors, not inferred visits. Retain the 5 MiB production package allowlist, Classic 110m fallback, destination-resolution vector drawing and fixed raster backend for pixel-identical seeking/export. Any new map pack requires licensing, size and actual export verification.

Terrain 3D uses reviewed Kartverket CC BY4.0 crop, ≤500000 mesh /400000 ribbon vertices, ≤1000000B per height grid. DEM and GPX elevations remain separate. Preserve no-data, true1:1 heights, segment cuts, deterministic camera and conservative terrain clearance. Shader/resources/framebuffer must be ready before encoding; context failure offers explicit2D recovery. Keep terrain attribution in output and do not claim an unspecified vertical datum or worldwide terrain coverage. No raw DEM archive in Git. No automatic release/merge/deploy of this candidate.

Photo v1.2 is an opt-in local candidate: reviewed Sentinel2C source/modified-data credit, fixed40m overview/10m patch, at most two resident textures, aggregate≤2MiB JPEG/3million pixels and≤2048 per side. Hash/decode/GPU/shader readiness for BOTH levels precedes export; no encoding-time fetches or private-route requests. Preserve coarse coverage/feathered pure LOD, original20m comparison fixture and unchanged default5MiB package. Optional local camera corridor must prove every crossed DEM cell/intro/outro leg with the same350m clearance and exact LOS; conservative flight remains available. Public pack budget/deployment needs separate approval.

Keep route data in memory. Never upload or persist user routes. No telemetry, external runtime assets, unsafe HTML, executable SVG or dynamic user URLs. Preserve segment boundaries and actual geometry. Reject DTD/entities, malformed XML, invalid coordinates, files over 10 MiB and routes over 50,000 points; never silently truncate.

Use pinned dependencies and document licenses and data provenance. Real test data stays outside Git until its full data license is resolved. Synthetic fixtures are clearly labelled.

Run unit tests, build and browser smoke tests before reporting success. MP4 success requires independent decoding, dimensions, H.264, duration and frame-count checks. Record exact commands, results, branch and commit in the state journal after meaningful commits.

Routine CI retains the 4-second regression and a bounded 20-second Standard export. Full 30-second Standard exports in both aspects use FULL_EXPORT_ACCEPTANCE=1 locally. Windows PowerShell launch commands use npm.cmd without changing execution policy.

Routine photographic camera proof uses4s360p with safety/pixel equality and independent decoding. Full10s720p photo-camera proof uses FULL_EXPORT_ACCEPTANCE=1; virtual CI software graphics exceeded90s. Preserve its assertions rather than making every CI run encode it.

Release publication is manual and requires explicit owner authorization. Pages builds must use the exact reviewed main SHA with successful main-push acceptance; configure a main-only github-pages environment with a required human reviewer before dispatch. Test the actual returned HTTPS URL separately; localhost is not public acceptance. Publish only independently validated synthetic demo assets and verified URLs.

Work on short-lived branches and reviewable PRs after bootstrap. No automatic merges, force pushes or unrelated repository changes. Avoid speculative architecture. No subagents are required.
