# Photographic prototype measurements

## Approved adaptive comparison — clean7c12286994ae58b7731eb773341ccc217da03272

Routine-CI limit observed independently: run37970102266 unit155/build pass,39browser pass, but new10s720p camera-photo export exceeded90s on virtual graphics. Preserve full assertion set as opt-in FULL_EXPORT_ACCEPTANCE; routine4s360p proof still checks every camera pose, corridor, both textures, exact seek/export pixels and independent MP4 decoding. A fast RTX3090 export is not evidence of software-GPU throughput. This test-scope correction does not modify the application renderer/exporter.

Same Windows/Edge/RTX3090 machine,721point31609B synthetic GPX, identical10s/aspects/styles. `node scripts/acceptance/terrain-performance.mjs --adaptive`: one warm-up+3steady repeats **each** for legacy20m, adaptive10/40m with same camera, adaptive with local corridor. Camera refinement is deliberately a separate comparison; it changes framing, not source geography/metrics. Medians/min–max wall time below. These overlap and do not establish universal speed improvement or a material export regression.

| Output |20m original-camera export |10/40m same-camera export |10/40m corridor export | Prepare20m/adaptive/corridor | Output bytes20m/adaptive/corridor |
| --- | --- | --- | --- | --- | --- |
| Atlas640×360,10s |457.9ms[437.9–458.2] |463.3ms[436.9–466.0] |446.7ms[436.2–511.0] |110.7/109.8/104.5ms |2097183/2093849/2097514 |
| Atlas1280×720,10s |726.6ms[715.0–797.6] |742.1ms[739.5–753.0] |692.7ms[658.2–721.3] |257.7/225.0/209.7ms |6982397/7008834/7058751 |
| Night720×1280,10s |752.7ms[689.0–780.2] |739.4ms[707.9–818.7] |687.6ms[661.9–692.1] |226.6/221.4/210.2ms |7102486/7158104/7102583 |

Warm local hash/fetch/decode medians34.6–39.4ms, not internet latency. CPU draw/copy0.5ms median, seeking0.5–0.6ms; no hardware GPU timer. Standard uses same481401mesh vertices/960000triangles; adaptive two resident textures versus original one. Image payload997049B versus1127607B;2830000 versus3000000pixels. Calculated RGBA11.32MB/mip-chain≈15.1MB, not observed VRAM. Baseline current package4787451B<5MiB; opt-in adaptive candidate5792186B/22allowlisted files, including1004838Bphotographic assets/manifest. Extra public deployment budget remains unapproved, existing workflow/default package unchanged.

`node scripts/acceptance/imagery-memory.mjs --adaptive`: isolated Edge process tree per case,3identical720p10simport→seek→export→cancel/retry→invalid-cleanup cycles. Private committed bytes are not resident RAM; working-set sums can count shared pages twice. CDP JS heap is separate. No production GC or automatic hardware diagnostics.

| Observation(bytes) |20m original |10/40m same camera |10/40m corridor |
| --- | --- | --- | --- |
| Baseline private |301006848 |311209984 |316928000 |
| Sampled private peak |899739648 |826531840 |879779840 |
| Sampled working-set peak |1026834432 |1002237952 |1031127040 |
| Largest stage-end JS heap |22907224 |25535328 |24731692 |
| Retained private,3cycles |734814208;792535040;778457088 |737988608;757436416;768245760 |743882752;828858368;804614144 |
| Private after test-only GC |682913792 |665792512 |686952448 |
| JS after test-only GC |15264460 |15345212 |15361688 |

Sampler intervals195–517ms; peaks are observed samples, not guaranteed maxima. All audits6renderers disposed,GL surfaces zeroed, both imagery bitmaps closed,zero retained old renderer/image WeakRefs,zero storage. Adaptive retained private grows≈30MB across these3cycles, then drops after test GC; caches/codec buffers are plausible, not proved attribution. No confirmed retained-resource defect was found; longer-device soak is recommended. Do not claim leak-free memory or portable improvements from these three separate sessions. GPU VRAM/dedicated encoder memory/native mobile memory UNMEASURED. Raw files ignored; sanitized evidence TEXTURE_EVIDENCE.json omits process IDs.

## Full actual footage and production proof

`node scripts/acceptance/imagery.mjs --full --compare` at clean7c12286:12outputs cover DEM/original20m/adaptive/corridor, both Standard aspects and360p landscape. Every H264 frame decoded,24fps/timestamps/selected duration checked, every central geographic frame has luma spread≥8. Same-camera comparison uses same route/duration/timestamps; corridor deliberately changes camera. Actual decoded contact sheets `docs/images/adaptive-*-comparison.jpg` and `adaptive-*-frames.jpg`. No AI/retouching or audience-retention claim.

| Adaptive corridor output | Duration/frames | Bytes | Export(single observation) | SHA256 |
| --- | --- | --- | --- | --- |
| Atlas1280×720 |20s/480 |13464236 |1259.2ms |99863c2f9c5c8d1ad5cda7c5318e9ad64a50937b76b504e8cb4bfc11c0893221 |
| Night720×1280 |30s/720 |19415975 |1705.7ms |0213a1156f7235d51872509d4976d8c85529511bda3803ad927946414b258b98 |

`BUILD_IMAGERY_PACK=1 npm.cmd run build; node scripts/package-release.mjs --imagery-candidate; ACCEPTANCE_DIR=artifacts/sprint9/adaptive-production node scripts/acceptance/imagery.mjs --production --full`:9real production UI outputs (DEM/adaptive/corridor,20/30sStandard+10sCompatibility),22asset hashes verified under local/route-story/,privacy/seek/decode/nonblank assertions passed. Reviewed package source7c12286; uncommitted contact-sheet/evidence-only files do not enter its allowlist. This is **not public v1.2 acceptance**. Exact one-off timings/hashes are kept separately from medians in TEXTURE_EVIDENCE.json. All Windows env examples require `$env:NAME='value'` syntax.

Visible limits: source10m cannot reproduce street/building detail; close terrain remains soft, actual low-sun autumn shadows make Night dark, regional outer edge fades into the background. Finer unseen terrain/buildings are not represented by the collision proof. Owner confirmed working v1.1 on Xiaomi/MacBook; photographicv1.2/native/GPU measurements on those devices remain NOT TESTED. Review these genuine20/30sMP4s before authorizing any v1.2 deployment/budget increase.

## Historical20m prototype measurements (preserved)

Windows10.0.26200 x64 / installed Edge154.0.4258.62, same RTX3090 development computer as Sprint8. No physical phone/ordinary laptop result is inferred. Source `f4bb3ae38307735c4c947d1b2feebe08b49bc61a`, clean tree. The earlier uncommitted trial and a native run interrupted by Vite reload are not accepted measurements. No performance optimisation or audience-retention improvement is claimed.

## Same-route timing

`node scripts/acceptance/terrain-performance.mjs --imagery`:721 synthetic points,31609B checked-out GPX, same duration10s, camera/aspect/style for DEM/photo. One warm-up then3 steady repeats per case. Encoder AVC capability checked at actual size. Last outputs in each case independently FFmpeg/ffprobe decoded240H.264 frames. Medians below, export spread min–max in brackets. Browser/HTTP cache warm; load includes photo fetch/hash/decode, not internet download latency. No source-coordinate/height/camera/codec change.

| Output | DEM prepare | Photo prepare + load | DEM export | Photo export | DEM/photo bytes |
| --- | --- | --- | --- | --- | --- |
| Atlas640×360,10s |76.7ms |121.5+34.8ms |413.0ms[392.0–433.4] |419.3ms[392.0–421.8] |2048801 /2097183 |
| Atlas1280×720,10s |182.9ms |214.7+34.3ms |692.9ms[681.6–748.7] |689.0ms[661.7–697.0] |6749307 /6982397 |
| Night720×1280,10s |182.3ms |215.9+34.6ms |693.9ms[674.9–729.6] |673.0ms[665.2–722.3] |6360083 /7102486 |

Parsing median5.3–6.0ms. Sampled frame CPU draw/copy medians0.4–0.6ms, seeking0.4–0.5ms; not hardware GPU elapsed-time measurements. Texture increases preparation/load by≈67ms in Standard; export spreads overlap, no established speed-up. Image detail increases encoded bytes. Actual UI production one-off timings are recorded separately, not mixed with medians. Raw measurements: ignored artifacts/sprint9/performance/comparison.json; sanitized copy TEXTURE_EVIDENCE.json. Different browsers/codecs/devices may behave differently.

## Native and JS memory

`node scripts/acceptance/imagery-memory.mjs`: fresh isolated Edge root+descendants **per surface**,721points/portrait720p/10s,3import→scrub→export→cancel/retry→invalid-import cleanup cycles. Existing Windows process-tree sampler reads PrivateMemorySize64/WorkingSet64 at188–302ms intervals. Private bytes measure committed virtual memory, **not resident RAM**. Working-set sums can double-count shared pages. CDP JSHeapUsedSize is separate; misses native textures/codec/GPU. Peaks are sampled, not continuous guaranteed maxima.

| Observation (bytes) | DEM | Photo |
| --- | --- | --- |
| Baseline private commit |319983616 |299651072 |
| Sampled process-tree private peak |806879232 |905814016 |
| Sampled process-tree working-set peak |978792448 |1032335360 |
| Largest stage-end JS heap |22105556 |24814644 |
| Retained private after3cycles |748052480;783429632;758132736 |735928320;829644800;815558656 |
| Private after **test-only** GC |657297408 |733069312 |
| JS after test-only GC |15127648 |15222640 |

Photo sampled private peak is≈94.4MiB higher in these separate sessions. Baselines differ and codecs/drivers cache allocations; this is an observation, not exact texture-only attribution. Both audits:6renderers disposed, GL surfaces zeroed, images closed,0 retained old renderer/image WeakRefs after test-only GC, empty storage. Retained values fluctuate/drop; three cycles do not establish universal memory safety or rule out long-run leaks. Test GC never runs in production. Dedicated GPU VRAM, GPU frame time, codec-only memory, phone/laptop native memory **UNMEASURED**.

## Assets and limits

Real20m derivative JPEG1127607B,1500×2000≤2048,3million pixels. Calculated bitmap RGBA≈12MB and mip chain≈16MB; Standard UV buffer≈3.85MB. These are allocation-size estimates, not observed VRAM. Baseline package4782351B≤5MiB (19files). Opt-in local photographic build5913713B/21files before final record edits, photoJPEG+manifest≈1.13MB. Normal publication allowlist rejects the photo pack; extra deployment budget has **not** been approved. `BUILD_IMAGERY_PACK=1` plus `node scripts/package-release.mjs --imagery-candidate` creates only a local review package marked publicationApproved=false. Existing protected Pages workflow unchanged/default path only.

## Next accepted work

Review actual decoded shots before LOD/camera expansion. A verified10m close patch/coarse overview may reduce blur, but cannot invent building detail beyond the source. Measure any proposed resolution/memory increase on MacBook/physical Xiaomi devices and an ordinary laptop. Current global-clearance camera remains safe but high; local corridor planner needs independent trajectory/LOS proof before lower flights. No workers/offscreen/cloud pipeline is justified by these timings.
