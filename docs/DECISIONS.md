# Decisions

## 2026-10-14 — MVP1.5 explicit high-resolution export with a bounded current-frame pipeline

Owner requested1080p/4K, overriding the earlier no4K candidate exclusion for this separate feature only. Preserve360p1.5Mbps/720p5Mbps and old32/48MiB limits; new1080p10Mbps/4K25Mbps use their own bounded file policy. Preview/camera reference remains≤720p; output resolution never changes physical camera, original GPX, elevations/grades/time or permits tighter source-detail zoom. Reuse the current3D context/ready assets and restore preview after success/error/cancellation. New high-resolution single-sample target avoids a4K multisampled swap chain; direct CPU composition-canvas encoding removes one frame copy. Old preset antialiasing/raster backend stays unchanged.2D higher resolutions redraw prepared vectors instead of massive maximum-zoom caches.

Keep Mediabunny/WebCodecs, explicit AVC4.0/5.1 capability plus real single-frame initialization/flush and cleanup. High4.1/5.2/Main/Baseline alternatives are bounded; no silent downgrade. Actual encoded packet count drives progress, and full expected frame count is required before file commit or success. File mode uses supported StreamTarget with1MiB chunks/backpressure and ordinary reserved-MP4 metadata;4K60s requires this path, proven by two real1440frame desktop outputs. No native OS picker UI/physical mobile/macOS claim from OPFS/Windows tests. Buffer fallback remains for FullHD/shorter4K where supported, with independent caps and clear failures. No OPFS persistence in production, user initiates native save picker, raw routes/images never uploaded.

Single controlled10sFurka pair shows sampled private1862→1512MiB, not GPU VRAM/truepeak or universal memory safety. Source-track4K native samples reach about1.9GiB, requiring an experimental warning/device review. Measured speed gain is small; do not promise broad acceleration. Geographic packs/caps/CRS/350m safety/attribution and protected publication workflow unchanged. New release/merge approval still required; no tag/version/publication inferred from the implementation request.

## 2026-10-13 — Owner-authorized PR26 publication through the existing workflow

Following successful local visual review, the owner explicitly approved merge/public deployment. The old manual Pages build would omit BUILD_AUTO_GEOGRAPHY; add one default-false include_automatic_geography input and corresponding explicit release-package mode. Retain candidate mode separately; release.json records approval only for release mode, never for a developer candidate. Keep the same main-only exact-SHA/main-push-CI gate, action pins, least privilege and reviewerMatawaka. Combined approved package remains≤9MiB, decoder addon≤512KiB; no new maps/hosting/paid service/tag/GitHub Release. Anonymous HTTPS smoke verifies the built privacy-consent control and exact four allowed data origins without provider requests; full consented public preparation/export remains an additional local check. Physical mobile60s/source-decoding resource limits remain unverified. No private GPX-derived videos are published.

## 2026-10-13 — Long-route stability and bounded minute video

Owner specifically requested calmer winding-route camera, fewer short-turn marker reflections and a minute option. Use smoothed north-up tracking only for3D tracks>5km, preserving shorter reviewed cinematic plans and all350m/LOS/corridor/source-resolution guards. Gaze/camera are smoothed within segments; original route/marker is not. Heading uses100–250m distance chords and a15% horizontal dead zone with binary segment-bound lookup, never prior playback frames. Extend bounded enum to60s/1440frames, preserving24FPS/resolution/bitrate; explicit minute-only48MiB payload is required for5Mbps60s, old32MiB bound unchanged.

Exact-frame regression exposed a rare1-level background difference; do not introduce a pixel tolerance. Disable framebuffer dithering, composite the real current RGBA frame/marker/credits in a fixed CPU canvas, copy final bytes to preview/export. Keep only bounded current-frame buffers and dispose them. This sacrifices export speed for reproducible output; measured20/30s times rose materially and physical mobile minute-mode remains unverified. Historical measurements remain intact; CAMERA_STABILITY_EVIDENCE contains separate actual results. No deployment/merge permission or new map-pack approval inferred.

## 2026-10-13 — Consented browser-only generic photographic terrain candidate

Use real Earth Search Sentinel-2 RGB/SCL COG windows and Planetary Computer Copernicus DSM rather than manually constructing another list of regions. Browser CORS/HTTP206 were actually verified; direct AWS DEM CORS failed. No VPS/key/payment is needed for the tested path. Keep first-party Furka/Sogne precedence and require fresh approximate-area consent for each user import. GPX/points/labels/file names stay local; no source requests during encoding.

Bound one prepared regional scene by55km span,64MiB download/180s/1200requests/two concurrent requests and original grid/texture/MP4 limits. Source no-data fraction participates in candidate ranking; acquire coverage before alternate cloud observations. SCL policy≤2% scene/≤1% route corridor is disclosed, source10m differs from derived10/30/50m imagery and30/80/120m mesh. DSM EGM2008 is not GPX altitude or bare-earth road data. All timestamp camera states pass before export; generic65° FOV and finite texel-scale bisection retain350m/LOS/80km bounds, legacy46° views stay unchanged.

10 full independently decoded MP4s from two actual owner GPX and three explicitly synthetic China scenes validate the initial implementation. These are local results, not a public deployment or mobile certification. Browser native private memory approached1GiB in samples; physical-device acceptance remains required. BUILD_AUTO_GEOGRAPHY is opt-in; candidate decoder≤512KiB is separately measured, old5/6/9MiB builds and protected workflow remain intact. No merge/release/deploy permission is inferred from previous PR approvals. Detailed evidence and limitations: AUTOMATIC_GEOGRAPHY.md / AUTOMATIC_GEOGRAPHY_EVIDENCE.json.

## 2026-10-13 — First-user instructions, covered choices and upright marker reflection

Owner requested a welcome before initial demo playback. Use a dismissible inline Russian guide with four steps, start/upload/close and a reusable «Как пользоваться» button. Initial Swiss preparation remains background work; playback waits acceptance, reduced-motion remains static. Explicit user input cancels pending initial playback, so ownGPX cannot be overwritten by a late demo. Guide/view state stays outside StoryConfig/export and storage.

Use the SAME regional provider for coverage admission and loading. Existing strict Furka descriptor plus tiny source-checked Sogne bounds use the same terrain projection. Offer only covered terrain/photo modes and restore options before demo presets; explain absent photo/DEM in a persistent preview notice visible in compact/video-only modes. Metadata admission never replaces actual no-data/mesh/350m/LOS/readiness checks. No new region/service/map fetch architecture.

Reflect raster markers when their current genuine segment edge projects leftward; bounded local 3D tangent accounts for the current camera. Start/finish use real edges, isolated points have no fabricated bearing. Artwork stays upright, source pixels remain unchanged, a separate cue follows travel. Canvas transforms or existing sprite UV implement reflection without an extra bitmap/texture. Depth-tested world geometry and dashed occlusion remain intact. Arbitrary custom art is mirrored relative to its original orientation, not semantically recognised.

Code milestone d9311381adb5038af1e43b99fec8f078107fa368:238unit/build,62routine browserPASS/32explicit skips,32fullPASS/1local-owner-JPEG skip; independent20/30s Sogne/Furka H.264 videos and production subpath checks. Exact sizes/hashes and timing boundaries in MARKER_UX_EVIDENCE.json; previous5/6/9MiB limits unchanged. Native/GPU peaks/new physical devices unmeasured/untested. This new candidate needs owner merge/publication approval; previous PR23 permission does not automatically publish it.

## 2026-10-13 — Standard GPX links are inert metadata

The official [GPX1.1 schema](https://www.topografix.com/GPX/1/1/) defines link metadata for files/tracks/points. A global blacklist accidentally treated the owner's standard metadata link as an executable HTML link. Exempt only exact lowercase link in the accepted GPX namespace from that element-name blacklist; parse only existing route fields and discard the link/URL. Do not fetch metadata or introduce anchor elements. Continue scanning children/attributes, rejecting actual scripts, foreign HTML links, SVG, event handlers, unsafe URL protocols, DTD/entities and invalid coordinates. Validate original files locally without publishing their data; reproduce the failure with a synthetic fixture. This correction needs its own reviewed PR and owner merge/deploy approval.

Owner-approved PR22 was merged and protected Pages38348908938 publicly verified on exact main d014d9dbe0318611789bb77545d4d18d2c52d921. Personal environment approval and exact-main pushCI were respected. Caption configuration/credits/limits unchanged by the GPX fix; no new publication is implied for it.

## 2026-10-13 — Optional captions are immutable video configuration

Add StoryConfig.captionMode full/none (validated enum, legacy default full) and an explicit selector in main, independent of interface view mode. Hide optional in-frame title/HUD/endpoint/geographic labels/legend/progress/branding and their large backplates without changing route/timeline/camera/framing/pacing. Preserve exact required DEM/imagery credits, legible bounded source backplate and dashed occlusion cue. No fabricated attribution for a local2D diagram without loaded geography. Preview/export share one config; controls frozen during export, no mutable DOM reads. Retain user title/filename and existing durations/fps/payload/memory/source/camera safety. New local candidate requires its own owner review and publication authorization; prior PR20 approval does not merge/deploy this feature.


## 2026-10-13 — One demo selector after owner visual review

Remove the four redundant demo shortcuts below the route dropdown, including their listeners and obsolete CSS. Keep all existing dropdown choices and contextual Empty recovery actions. Browser and external acceptance automation must use the same actual dropdown, never retain hidden substitute buttons. Export-conflict assertions continue proving that route changes are disabled during export and restored after failure. No renderer or exported-frame changes. Owner approved the visuals and deployment after this correction; exact-main CI and personal protected Pages approval remain mandatory.


## 2026-10-12 — One public controller / Swiss startup / bounded UX recovery

Base actual main d1c2b85f1ebbd2c7d167982b97fc6aa956ea2d83; independent codex/unified-route-story-ux, not docsPR18. Main's StoryConfig/StoryTimeline/export pipeline remain authoritative. A small scene-provider reuses existing local regionalPackForRoute and verified Swiss/Sogne loaders, rather than a parallel geography selector. Main owns a discriminated UX state, one preparation AbortController and a separate encoder capability result. Initial Swiss autoplay runs only once; reduced motion prepares static genuine3D, not a silent2D substitution. Imports leaving a regional demo choose the visible existing Auto policy with explicit effective-mode/fallback information.

Normal dev uses the already reviewed first-party public Furka pack; developer comparison sources remain opt-in SWISS_PILOT=1. Production build remains opt-in BUILD_SWISS_PACK=1 to retain the baseline5MiB/Sogne6MiB/combined9MiB gates. The legacy public Swiss URL redirects to the single main UI. No extra controller/workflow/hosting or map data was introduced. Camera/350m/LOS/UV/grade/attribution/source-coordinate proof is unchanged.

Every local download has a30s deadline including stalled streams, strict byte/hash admission and user cancellation. SHA-verified public-byte LRU≤2MiB supports retry; no private GPX/marker cache or persistence. CPU cache is additional bounded RAM, not a claim about total native/GPU memory. Initial progress reports truthful stages, not artificial overall percentages. Encoder probing has a10s deadline; preview remains available when unsupported. UI view modes are outside StoryConfig and preserve exported pixels. Errors expose authored recovery advice/categories, not raw native/private diagnostics. Rejected marker replacements retain the prior valid renderer/encoder; video failure restores controls and supports retry.

Existing tests intentionally updated only for this behaviour: fresh corruption tests evict the verified byte cache, native export errors assert the safe public message/category rather than a raw exception, and production reload restores the public demo rather than an empty page when Swiss is enabled. Geometry/hash/MP4/network/privacy assertions remain intact. New UI stays pending owner visual approval/merge/publication; previous broader release permission does not publish this new task.

## 2026-10-12 — cross-platform source bytes and next regional priorities

Authorized Swiss publication exposed a real Ubuntu source-checksum failure before deployment, despite passing Windows main CI. Preserve both reviewed GPX files as exact -text blobs and test Git-object bytes, not only OS-transformed working files. Keep original checksum and geometry. PR17 is the focused blocker fix; publication resumes only after exact PR/main CI and required human Pages review. The unsuccessful run does not establish public acceptance.

Owner selected China and Georgia as next detailed-map priorities. Research can use official Sentinel2 and Copernicus GLO30 sources as bounded regional candidates; no selected crop or national high-resolution rights/coverage are yet validated. Country prioritization does not mean detailed assets already exist. Keep Sogne/Furka selection and truthful global2D fallback, local-only GPX matching, existing resource guards and per-pack provenance/export checks.

## 2026-10-12 — approved Swiss publication and optional regional resources

Owner approved actual Phase C videos and explicitly authorized merge/deploy/necessary package increase. PR11 merged as b1c9ea8bbfb2d800c3f2d8108d6e09641e3c1015; PR14 retargeted to main, diff and unchanged synthetic merge tree revalidated, merged as c12a3a7a764a8a734c4edd51a37b283bec1968d7. Main CI38213253405 SUCCESS. No closed alternative implementations or unrelated documentation PR absorbed.

Publish only the approved 5m DEM/high3m overview/unchanged0.5m detail/syntheticGPX plus provenance, about2.02MB, as an optional fixed first-party pack. Reference2m/control50m/low10m/rawCOGs/native2m9MB remain local. Combined release cap9MiB is explicit under owner size authorization; existing baseline5MiB/Sogne6MiB and runtime/image/GPX/frame bounds remain. Existing manual protected workflow gets include_swiss opt-in with no permissions/reviewer/branch-policy change. Protected human approval cannot be performed by the agent.

Main discovers the fixed Furka camera corridor from GPX coordinates locally, fetches its assets only after appropriate 3D/Auto selection, then performs exact projection/coverage/camera/resource checks. Outside prepared regions retain the existing2D worldwide overview, including Eurasia; no claim of continent-wide photographic or street-level mapping. First-party regional requests can reveal which public pack was selected but never contain route coordinates/content; no analytics/persistence. Arbitrary private GPX uses rendered5m safety proof, while extra native2m proof is specifically the approved demo. Device Swiss support remains NOT TESTED/experimental; explicit publication approval supersedes earlier requirement to wait for those unavailable checks. No tag/GitHub Release or competition re-submission authorization inferred.

## 2026-10-12: extend Swiss context without a second renderer or bigger public pack

Reconcile merged PR10/main64fcf293, PR11 head02b498a retargeted to main, closed PR12/13 excluded. Separate phase-C branch from PR11 retains original1km2m data/evidence. Source-selected9+9ordinary OGD2023/2024 tiles give3km context with only~12MBraw download, using provider2m overview variants instead of nationwide0.1m photography.

Choose one3m overview+unchanged0.5m route detail and a declared5m mesh from verified2m source.349281vertices/698562B/2960000pixels/1295550JPEGbytes remain within existing caps. Fixed multiple patches can use fewer outer vertices but need stitched CPU/GPU/LOS topology or more samplers; not justified for this short route. No tile framework, workers, newdependency, external runtime data or public budget change. Native optical GSD/date/height accuracy remain distinct from output spacing.

Only reviewed fixed3km EPSG2056/LN02 scope expands its fit domain; oldSogne/original validators remain strict. Pure measured projected-ground LOD and a2pixel detail guard, stronger route-volume overview, all350mcontinuous/LOS checks retained. Caption-safe frame coverage is proved from the complete grid using minimum-plane/real-edge bounds; no unknown terrain assumption. Whole-frame corners outside that rectangle have separate visual evidence, not a universal certificate.5m approximation is measured and source2m acceptance independently checks camera trajectories.

Keep grade/pacing/rider architecture from merged PR10. Move grade legend away from counter only in the developer candidate; oldSogne pixels must match exactly. Native process memory measurement is permitted locally and reported separately from CDP/GPU/encoder allocations; no hardware fingerprint telemetry. Clear observable codec/GPU/memory failures offer Sogne/2D, without promising protection from OS tab termination. Native memory near1GB makes actual device testing mandatory before any Swiss public release. No merge/tag/deploy/contest update authority inferred.

## 2026-10-11: real Swiss source-data pilot with bounded regional coordinates

Keep PR10 rider/JPEG corrections independent. A separate `codex/swiss-alps-pilot` branch depends on PR10 and adds only a local developer candidate. Use verified ordinary swisstopo OGD COGs from tile 2670-1157, after inspecting and rejecting the initially suggested roadless 2671-1159. No test-only ZIP, online tiles, private route relocation or fabricated historical journey. A labelled 842.6m synthetic road-centre approximation belongs to this actual Swiss image/DEM scene.

Introduce a validated bounded EPSG2056/LN02 projection descriptor with pinned PROJ-derived fits and independent numeric checks. Permit 2m DEM only through this regional contract, retaining mesh/ribbon/height caps and the original Sogne 10m rule. Source optical GSD remains null/unknown despite 0.1m COG pixels; 0.5/1m output and 2m source grid are engineering spacing, not new information/height-accuracy claims. True 1:1 terrain and 350m/LOS/corridor safety remain mandatory.

Reuse two resident images with existing texture bounds, not a new tile stack. Keep the small pack/crops out of production and raw files out of Git; reproducible fixed-name developer serving only. Same-camera 10m/downsample versus high-detail full MP4s isolate source detail; separately labelled 50m/2m captures isolate mesh detail. Preserve Sogne pixels, package limits, workflow and stable releases. Human visual review, surrounding coverage, native-memory/device evidence and explicit hosting/budget approval precede any Swiss release. No merge/deploy/tag/repost authority is inferred.

## 2026-10-11: owner-reported marker corrections

Continue PR10 on07313b5, base main126dd988. Preferred icon annotation is separate from depth-tested DEM/ribbon. Exact timeline/world anchor plus a pure safe layout; off-screen anchors stay hidden, occluded anchors have a dashed connector and explicit caption. Endpoint labels avoid the raster. Optional occluded Sprite remains available. Three bounded sizes, upright art, same-edge direction cue, no false segment traversal.

Requested exact256PNG was absent; owner explicitly approved a faithful256² downsample of the attached1254²alpha image. Source/derived hashes and actual pixels are recorded in RIDER_ASSET.json. No substituted stock/code image, cropping or background removal. LOCAL image bounds change to2MiB/2048side/4million decoded pixels; static JPEG with bounded EXIF orientation joins PNG/WebP. Fixed CPU marker rasters/clones are needed for exact initial/backward seek pixels; preserve equality assertions. Existing public5/6MiB/export/source/workflow bounds remain. Swiss developer pilot stays separate and excluded from production pending its own evidence/size approval.

## 2026-10-11: independent terrain dynamics and local markers

Resume actual merged main126dd988 after successful protected photo deployment38010896357; do not absorb independent PR5/PR8 or modify stable tags. PartsA–C belong in `codex/terrain-dynamics-markers`, with owner review before merge/publication. Existing24fps/720p/duration/32MiB export and5/6MiB package limits, source licenses, two photographic textures and protected workflow remain unchanged.

Use one precomputed RouteDynamics profile and the existing StoryTimeline. Prefer complete finite GPX elevations, otherwise one covering DEM; never mix vertical datums.100m segment-local secant smoothing and bounded isolated GPX-spike correction preserve source data and genuine DEM cliffs. Five grade bands encode uphill/downhill with color plus arrow/percentage legend; missing/unreliable heights neutralize both grade and pacing. Time allocation distance/relativeSpeed normalizes to the existing replay interval. This is stylized pacing, not recorded vehicle speed. Default distance/plain/point path remains available: all independently decoded frames match measured baseline MP4s (container bytes are separate); grade GPU attributes exist only when selected.

Use original Canvas silhouettes and one sanitized256² local raster for custom static PNG/WebP. Admission bounds file bytes/signature/chunks/declared dimensions/animation before decode, verifies decoded dimensions, closes ImageBitmap and never stores raw file/metadata or creates a user-image URL. Clone ownership prevents UI replacement from invalidating a renderer/export. A bottom-anchored pixel-sized depth-tested Sprite gives legibility; upright artwork plus a separate same-edge direction cue avoids sideways rider/custom art and fictitious segment bearings. This is an annotation, not a life-size3D vehicle.

Source-detail guard stays developer-only: actual10m footprint~7.75portrait pixels at close flight, reducing it to~2 requires lifting the camera from1663m to7906m. The40m guard loses too much close-flight composition. Safety/LOS remain proved, but no automatic camera/default change or invented detail. Recommend a separate short Swiss Alpine source crop after selected native-resolution/coverage/license checks; ordinary swisstopo OGD permits reuse with credit, product-page sample ZIPs do not. No new Swiss/PDOK/NAIP/LINZ data bundled or private GPX relocated. Record estimates separately from actual performance/asset measurements.

## 2026-10-09: owner-approved bounded photo publication

Owner explicitly approved the actual Atlas20s/Night30s videos, public deployment and increased local package size. Supersedes the earlier pending photo publication/budget gate below. Limit the COMPLETE adaptive package to6MiB including release.json, baseline≤5MiB and unchanged image runtime bounds (two textures,≤2MiB JPEG/3million pixels/2048 sides). Measured prior candidate5792186B excluding its small manifest; no nationwide pack or unbounded asset approval.

Reuse the existing manual protected Pages workflow with optional include_imagery=false by default. True enables the exact three reviewed files, BUILD_IMAGERY_PACK=1 and --imagery-release; candidate mode remains explicitly publicationApproved=false. Public mode records owner authorization, not successful deployment. Exact reviewed main/passing main-push CI and personal human environment review remain mandatory; permissions/action pins unchanged. Add bounded actual HTTPS photo smoke (10s360p, both aspects, hash/CSP/privacy/reversible seek/cancel/retry/all-frame independent decoding); full20/30s720p public proof remains an opt-in local verified-GPU activity. No source renderer/exporter changes.

No explicit authorization to merge PR9 or PR8/tag a stable release has been given. Prepare reviewable PR9 publication changes first, then obtain the missing merge decision. PR5/PR8 stay independent, v1.0 tag/assets immutable, no competition repost.

## Sprint9 follow-up: approved detail and proved local corridor

Owner approved actual photographic prototype and requested further detail. Use the SAME reviewed scene/crops for40m overview plus bounded10m patch (997049B/2830000pixels), both resident before export. Pure scale/frustum choice,450m feather, mipmaps, fixed regional coverage and explicit missing-resource error; original20m developer fixture retained. No new service/source/codec/DEM and no public budget increase. Add optional local corridor with unchanged350m clearance, exact crossed-cell bounds for all interpolated legs/intro/outro, final triangle LOS and conservative default. Tests independently preserve coordinates/segments/seeking/pixel equivalence.

Protected accepted-main run37962492130 completed after owner approval; actual Pages URL/19manifest hashes/source8f4d0f6 and public20/30s3D MP4s verified separately. Owner reports successful Xiaomi14/Pad2/MacBookM2 tests and Chrome/Brave/Safari; missing versions/pairing are explicitly unmeasured, not fabricated. Candidate remains1.1.0-rc.1; PR8 final version and stable tag/release require review/final owner release approval. No photo deployment or contest repost.

## Sprint9: lawful photo proof before regional LOD expansion

Use actual Copernicus Sentinel2C L2A20250927 scenes32VLN/32VLP, fixed Sogne regional windows, official open-data terms with required modified-data attribution. Norwegian ortho reuse rights are unresolved; no unauthorized image scraping. Source10m RGB is resampled20m into existing DEM local coordinates. Preserve heights and conservative camera exactly for comparison. One validated resident texture, readiness draw and deterministic mipmaps prove true3D photographic MP4 before designing complex tiles. Optional candidate pack is excluded from default≤5MiB production; no budget or v1.2 deployment approval. Major multi-resolution packs/local-clearance refinement wait for owner visual review of actual footage. Prior DEM/2D/Classic fallback remains available. Reproduction/source-window hashes and real output evidence are recorded separately from publishedv1.0.

Owner's follow-up explicitly authorizes deploying **already accepted merged main8f4d0f6** before Xiaomi14/Pad2/MacBookM2 physical tests. Reuse protected manual workflow/run37962492130, owner approves environment personally. This is candidate access for testing; final stablev1.1.0 tag/release approval remains pending. No inference that devices have passed; no v1.2 public changes or new deployment mechanism.

## Sprint 8: genuine bounded DEM mesh and safe timestamp camera

Owner accepts Sprint7 visual cost and explicitly requests terrain3D. Static Canvas cannot represent a genuine height surface/depth camera; this is the concrete reason for the documented Three exception. Stack feature/terrain-aware-3d/PR#7 on accepted PR#6 a704f67. Stable main/tag/Pages5f39332/v1.0.0, public assets, manual workflow/protected environment and unrelated PR#5 remain unchanged. No merge/publication/contest repost.

Read official Kartverket DTM10 annual2020 cell6800-3 metadata/free-product terms/CC BY4. Keep original110MB ignored; publish reviewed30×40km50m/100m derivative grids, source/asset hashes, attribution and processing changes. EPSG25833→local tangent metres; heights1:1. Supplied2020 metadata/raster do not identify vertical datum; record it as unspecified, do not assertNN2000 or overwrite GPX elevation. No navigation/survey/bridge-tunnel/bathymetry claims.

Both real MapLibre raster-dem and Three4s3D MP4 proofs decode independently. Choose exact Three0.186.1/MIT for bounded mesh/camera/triangle LOS access and explicit disposal. One-tile MapLibre readiness/query is not a verified whole-route tile pipeline; unselected engine is not distributed. Preserve Mediabunny/H.264, sequential awaited optional draw barrier, allfps/duration/size/frame/payload limits. Static package remains<5MiB, so no limit revision.

Pure terrain camera uses actual local relief, smoothed per-segment direction/look-ahead, perspective fit, globalmaxDEM+350m flight envelope and exact grid/triangle-ray occlusion checks. Final pose ignores playback history. Intro/outro gaze clamps above mesh+24m; real full-timeline audit found/fixed a ridge-target singularity missed by replay-only tests. Reject missing/out-of-bounds heights, non-finite/>80km flight and excessivegeometry; explicitly recover in2D with source/config retained. Auto uses route-local≥100m relief and explains fallback. Classic/reduced-motion retained.

Depth-tested subdivided ribbon retains everyGPXedge/segment and geographic distance;≤200k extra1px centre-trace vertices improve overview without defeating occlusion. Destination-resolution normals/light/height contours and compact screen-space overlays; regional edge fade is presentation only. No textures, fabricated roads/places, historical weather, GPU fingerprint collection or remote assets.

Profiled temporary index arrays/per-vertex colour objects justify typed-index/scalar-colour allocation only, not a framework rewrite. Final same-route RTX3090 measurements show fasterGPUexport but heavier preparation/native memory: private-commit peak1.145GB vs2D0.877GB. Separate heap/process sums/VRAM-unmeasured/cache retention; no universal memory-safety claim. Full videos/contact sheets/safety/evidence in TERRAIN_CAMERA_VALIDATION.md/TERRAIN_PERFORMANCE.md/TERRAIN_EVIDENCE.json. Await owner's full-video visual review before merge or deployment.

## Sprint 7: cinematic camera and bounded local cartography

Owner replaces release freeze with v1.1 visual development. Stable main/tag5f39332 and published v1.0.0/Pages remain unchanged; PR #5 docs stay separate. New branch feature/cinematic-route-story-v1.1 / PR #6 targets main. No merge/publication/contest repost authorization. Owner reports the competition comment already submitted.

Use one StoryTimeline plus pure CameraPlan/CameraState. Precompute per-segment smoothed distance keys; north-up equirectangular world coordinates use the route's circular longitude bounds and fixed latitude cosine. Intro/outro quintic easing, log-scale zoom interpolation, bounded look-ahead, marker-safe framing. Disconnected segments cut under a short fade rather than a fictitious camera journey. Stationary tracks have no follow zoom; metre-scale routes have <=1.18x. Ordinary replay has <=2.65x. Classic retains v1.0 renderer and four-second regression; prefers-reduced-motion initially selects it. No independent pacing clock or invented historical speed.

A real local MapLibre6.13.0 feasibility MP4 and observed Pages HTTP206 range support establish basic viability, not a verified PMTiles regional pipeline. Choose prepared Canvas vectors plus NE50m global/NE10m fjord pack after measured source/output sizes; provenance and comparison in VISUAL_UPGRADE_AUDIT.md / GEOGRAPHY_SOURCES.json. No new runtime dependency, OSM data or package-size increase. 5MiB allowlist remains enforced. Map packs load from fixed first-party paths and validate before renderer/export; missing packs fail explicitly and can retry. Regional clipped fill boundaries are never drawn as fabricated coasts. Generalised geography remains honest about missing street-scale detail.

World-space Path2D and route chunks render at destination resolution through the camera; screen-space captions/metrics/branding stay upright. Atlas parchment/blue water/rust route and serif title differ from Night navy/amber trace/glow. Real place labels use collision filtering; no reverse geocoding or stop inference. Global fallback is explicitly labelled. Fixed CPU raster surface prevents Chromium GPU-to-CPU readback switching from changing antialiased pixels; exact reversible pixel tests, measured performance and memory determine the cost. Batching and culling preserve all route points. Do not silently trade resolution/duration for performance.

Measured full-vector dense50k/30s export14.2s and853ms CPU frame bursts justify two bounded maximum-zoom route buffers. Final6.86s with unchanged coordinates, exact-seek pixels and explicit memory/disposal tests. Geography remains vector, no low-resolution map enlargement. This improves the dense-route bottleneck but retains material cost versus static v1.0 and some small/global-route regressions; all measurements/limits in PERFORMANCE.md. v1.1.0-rc.1 is local/review-only. Existing stable tag, public assets, protected Pages environment and publication workflow remain unchanged.

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
