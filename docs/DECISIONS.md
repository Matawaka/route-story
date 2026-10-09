# Decisions

## Sprint 5: exact merged release and separate publication approval

Owner merged PR #4 on 2026-10-09. All four sprint PRs are merged into main `5f39332b7358949d248da6b2f99ba445ee1b41e8`; its tree exactly matches the final Sprint 4 head `3e4d6cb44b654c1b0a5616d20049a3a49e8916ff`. Successful push-to-main CI 37896163991 and a fresh local clean-install/check/package/smoke validate this exact main, rather than relying only on an earlier branch run. Preserve the existing application and sole manual Pages workflow. No new dependency, codec, feature or resource limit.

Sprint 5 authorizes preparatory environment configuration. Actual `github-pages` environment now requires human reviewer Matawaka and permits only the `main` branch. `prevent_self_review=false` allows the solo owner to approve their own initiated run; the agent must never submit that environment approval. Pages site/source is still unconfigured. Enabling Pages, dispatching publication and creating tag/Release/assets remain behind explicit owner permission. Merge permission is not publication permission.

Use the complete reviewed main SHA for deployment and the immutable `v1.0.0` tag. Recheck remote main and its successful main-push CI immediately before authorized dispatch; if the SHA changes, reassess before publishing. Public acceptance must use the returned deploy-pages URL, including a separate full-duration export. Fill public links only after verification. Documentation changes use `codex/sprint-5-public-launch` and a focused PR; no automatic merge or redeployment for documentation.

Existing synthetic Atlas20s/Night30s files are present and independently revalidated; their hashes match Sprint 4. Preserve the original source-commit evidence, do not mislabel these as exports from the public site. Keep diagnostic/API responses and MP4s outside source Git. After public acceptance, finalize Release assets, download each independently and compare hashes. Encoder output may differ after a genuine public-site regeneration.

The owner provided the contest announcement text: GPX is an accepted documented import format, and the minimum includes two styles, two factual information elements, both aspect ratios, actual replay/export and an independently runnable product. Map these requirements to observed evidence, emphasizing actual output. Submission channel was clarified as a comment under the post in the private Telegram channel «Вайбкодинговая». The exact original post URL and agent submission permission/access have not been supplied; prepare copy-ready owner text and do not claim official compliance or submission.

## Sprint 4: reviewed static release, no new product features

On 2026-10-09 the owner had already merged PR #1/#2/#3 into main dd86c372b6d6c757d7327e22366b402f60ad9b4e. Its tree exactly matches verified Sprint 3 488db3b; preserve history and start release/route-story-v1 from that main. The release PR targets main without a stacked dependency. No agent merge or publication is authorized yet.

Prepare a manual-only GitHub Pages workflow with exact reviewed-main SHA and successful main-push acceptance checks. Read-only build/test jobs; pages/id-token write permissions confined to a deployment job that runs only pinned official actions. Owner must separately configure Pages source and a required-reviewer main-only github-pages environment before authorized dispatch. A YAML environment name alone is not approval protection. No automatic push deployment or PAT/secrets. Pages/custom-domain/Timeweb settings remain untouched during preparation.

Validate a public-file allowlist and provenance before uploading dist; include a small source-commit/file-hash manifest, excluding user data and videos. Test the real production bundle at /route-story/ and test the actual anonymous HTTPS URL separately after deployment. Localhost secure context is not HTTPS acceptance. Keep restrictive meta CSP; document the response-header protections that static hosting/meta cannot promise.

Release examples come from two explicitly synthetic public GPX files via the actual UI, not a substitute renderer. Atlas landscape 20s / Night antimeridian portrait 30s, both Standard, must independently decode and play in the tested browser. Keep MP4s out of source Git and publish validated assets only after permission. Package version 1.0.0 denotes the prepared release candidate, not a published tag. Browser/device claims remain limited to Sprint 3 evidence. No major feature, dependency or resource-limit changes.

## Sprint 3: observed compatibility and resource costs

Stack on accepted Sprint 2 head f9f63b5 because PRs #1/#2 remain open. Keep Canvas/Mediabunny/WebCodecs and all limits. Explicit opt-in local scripts test browser engines, large synthetic GPX and Windows process memory; routine CI remains affordable. Playwright mobile emulation is not physical-device acceptance; WebKit is not retail Safari. Windows WebKit preview works but VideoEncoder is absent.

Firefox 157 returned the malformed AVC description recorded in Mozilla bug 2049470. Repair only the exact duplicate-SPS/PPS-header pattern with matching profile bytes before muxing, using original code; valid AVC records pass unchanged and unknown malformed records fail. Do not branch on browser identity. Independent decoding now rejects even recoverable decoder stderr errors.

Profiled individual Canvas stroke-command pressure at 50k points. Use fixed 128-edge batches with disconnected subpaths, retaining deterministic cache boundaries and every point. Before/after OS samples show lower private committed memory but unchanged aggregate working sets; neither proves GPU VRAM use. Invalid import releases the hidden visible canvas too. Test-only GC/WeakRefs and four actual export/cancel/retry cycles observe cleanup without adding a production profiler. PERFORMANCE.md records before/after values and limitations.

## Sprint 3: measured composition defects

Retain the static equirectangular camera/Natural Earth outlines. Document high-latitude distortion and coarse coast/island limits; do not substitute online maps or guessed geography. Very short routes use a bounded 0.0001° minimum span rather than the prior kilometre-scale floor; stationary views keep 0.01°. Separate close endpoint labels outside both markers, add small map-colour backing and reserve overlay margins. Short distances use metres consistently, large counters fit by font size without hiding digits, and long title ellipsis/static metric layout are cached. Route contrast is tested against both flat map surfaces. Raw 64-configuration/384-frame evidence and repeated title CPU measurements are local opt-in, not expensive new CI jobs. VISUAL_VALIDATION.md records checks and limits; no duration/FPS/resolution increase.

## Sprint 2: bounded replay and shared timeline

Sprint 1 PR #1 remains unmerged. Base branch: sprint-1-gpx-mp4 at 7caf13d; work branch: sprint-2-story-timeline. Use a stacked PR so the Sprint 2 diff excludes the existing implementation.

Keep the original Vite/Canvas/Mediabunny architecture. StoryConfig is an immutable validated plain object. Public durations: 10, 20 (default), 30 seconds; internal 4-second mode preserves regression timing. Intro/outro are each 0–3 seconds, with at least one second for replay; default public scenes use 2 seconds each. Titles remain inert text, 1–200 UTF-16 code units, consistent with the GPX metadata limit. Filenames alone have a documented shorter presentation form.

StoryTimeline precomputes the RoutePath once and returns pure timestamp-based state. Public replay advances linearly with recorded geographic distance; video time is never presented as trip time or real speed. Marker transitions between disconnected segments are discrete with a brief deterministic fade. Static route-fit framing stays the default.

Compatibility remains the safe default (360p, 24 fps, 1.5 Mbps). Standard is explicit (720p, 24 fps, 5 Mbps), capability-probed at the actual dimensions. No silent fallback. Export is bounded to 720 frames, 30 seconds, the two documented resolutions and 32 MiB encoded payload. Standard capability and performance must be measured before acceptance.

## Sprint 2: minimal scenes and resource verification

Retain a static map and reserved header/HUD areas. Intro/outro captions fade solely from timeline state; attribution appears only in the outro. No zoom, camera-follow, media or additional dependencies. Two factual values stay readable: geographic distance and complete-series elevation gain (otherwise recorded point count). Coincident start/finish use a shared label. Long canvas titles use a code-point-safe ellipsis; validated source text is unchanged. User title is passed only to Canvas text, DOM text/attributes and a sanitized download filename.

Cache projected route strokes; append newly reached edges and rebuild the same ordered strokes after backward seeking. This avoids rescanning the full geographic dataset every frame and preserves deterministic pixels. Bound export configuration before any asynchronous operation, await encoder backpressure, retain cancellation/cleanup and refuse oversized payloads. No arbitrary resolutions/FPS/durations are exposed.

Both 30s/720p formats independently decoded locally after P0 (81a21150b5fe5bf0d9b43b399061f884db3521c3). Final presentation changes require renewed acceptance. Benchmarks measure export wall time including capability probing/encode/finalize, excluding download and independent decoding. Render timing measures CPU Canvas submission only. Native encoder/GPU peak memory cannot be inferred from JS heap and remains unmeasured. Routine CI performs 4s regression + 20s Standard acceptance; two 30s/5000-point runs are explicit local opt-in.

## 2026-10-08: first checkpoint

The GitHub destination was empty. Establish a minimal main bootstrap, then implement Sprint 1 on a short-lived branch and open a PR. No merge without owner approval.

Use Vite/TypeScript/Canvas 2D with no mandatory backend. GPX and video processing stay in the browser; assets and fonts stay local. Russian is the only MVP UI language.

Prove video export first. Choose Mediabunny (MPL-2.0, unmodified dependency) over deprecated mp4-muxer. Use WebCodecs capability detection, deterministic timestamps and sequential frame submission/backpressure. Start with 640×360 and 360×640, 24 fps, four seconds. Browser encoder availability is device-dependent; unsupported devices receive an actionable Russian error.

Use bundled public-domain Natural Earth land outlines. Preserve GPX segments and shortest longitude arcs across the antimeridian. Do not infer speed, dates or trip duration from animation time.

The Hong Kong sample candidate is derived from OpenStreetMap and ASTER elevation. Its repository CC0 statement does not settle all upstream database terms. Do not bundle it; allow an explicitly documented external manual acceptance test, kept in ignored local storage. All committed fixtures and demo geometry are synthetic.

The first renderer uses a route-centered equirectangular projection (latitude-adjusted longitude scale) and the smallest circular longitude interval. This keeps the entire original route geometry visible without a tile dependency. Haversine distance uses the mean Earth radius 6371.0088 km. Coarse 1:110m outlines may omit small islands; this is made explicit in the UI.

Keep production CSP restricted to local resources. Vite injects styles in development, so a serve-only HTML transform allows inline styles there; the production build retains `style-src 'self'`. The build copies all notices and license texts into dist. No user metadata becomes HTML or URLs.

Windows/Edge CI exercises the platform actually verified for H.264 encoding, using exact action SHAs and Node 24.19.0. It does not opt into external real GPX data; only synthetic export artifacts are uploaded.
