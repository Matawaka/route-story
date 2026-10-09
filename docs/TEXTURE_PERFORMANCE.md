# Photographic prototype measurements

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
