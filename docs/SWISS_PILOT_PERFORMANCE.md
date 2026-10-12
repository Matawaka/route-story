# Swiss pilot performance — observed locally

## Phase C measurements, 2026-10-12

Separate same-machine1warm+3steady runs, identical26point route/marker/grade/pacing, with original2m/1km versus extended5m/3km/camera composition. This overall comparison includes geometry/coverage/camera changes; separate extended10m/high detail rows isolate photography. Raw artifacts/swiss-phase-c/performance/report.json retain every sample and independent video decode.

|Median[min–max]ms|Original10s360p|Extended10s360p|Original20s720p16:9|Extended20s720p16:9|Original30s720p9:16|Extended30s720p9:16|
|---|---:|---:|---:|---:|---:|---:|
|Load/hash/decode|52.9[50.4–54.3]|48.2[47.4–48.9]|48.0[46.4–52.1]|48.9[45.8–51.0]|47.2[45.4–47.7]|48.6[47.6–49.7]|
|Renderer prepare|148.8[141.2–188.2]|155.2[153.7–156.7]|177.9[176.7–205.9]|161.4[159.4–169.5]|170.7[163.4–193.3]|186.7[172.9–223.7]|
|Additional frame resource proof|0|10.1[8.1–10.5]|0|14.2[13.9–14.4]|0|19.9[19.8–20.0]|
|Export|519.2[496.6–600.8]|509.2[504.1–550.5]|1223.2[1204.6–1288.2]|1262.8[1156.8–1279.5]|1655.3[1643.6–1703.6]|1752.0[1733.4–1880.6]|

CPU frame medians0.8→0.9ms; submission+destination copy, not GPU elapsed. Full Standard exports show about40ms/97ms median extra cost; overlaps/session variation preclude a universal speed claim. Detailed extended files13178741B/19361126B in the benchmark; separately finalized acceptance files/hashes are recorded in Phase C evidence.

Windows isolated Edge process-tree profiling now measures **native committed private bytes separately from JS heap**. Three cycles of360p10s/720p20s/720p30s, scrub/reverse seek, cancel/retry, JPEG/approved raster replacement and disposal. Reference/extended sampled private peaks1035673600B/990482432B; working-set sums1122942976B/1139912704B. Working sets double-count shared pages; private bytes are committed virtual memory, not physical RSS. This is a small sampled run, not proof of lower peak memory. Command lines are inspected only for role and never saved; samples cover only the fresh browser root and children.

Reference/extended private baseline291.9/287.8MB; retained after cycles553.3/577.9MB; after test-onlyGC420.5/435.6MB. CDP JS retained17.01/16.30MB; afterGC14.67/14.70MB. All recorded Three textures/geometries disposed to0 and rendererWeakRefs0, storage/IndexedDB actually checked empty. Native retention is nonmonotonic; normal driver/browser caching is possible, no confirmed leak inferred. Never forceGC in production. **VRAM and dedicated encoder peaks remain NOT MEASURED. Physical mobile/ordinary laptop NOT TESTED.** A tab killed byOS memory pressure cannot be caught byJavaScript; clear fallback handles observable failures.

Asset allocations remain bounded:11.84MBRGBA/~15.79MBmips unchanged, mesh arrays15.38→23.72MB (about8.34MBmore), runtime heights0.45→0.70MB, JPEG1.23→1.30MB. These are analytical buffers, not measured total VRAM. The original data remains a smaller geometric fallback. Native-source2m camera verification is separate from runtime5m rendering; geometric approximation and source surveying accuracy must not be confused.

Historical PR11 observations follow unchanged.

Windows10.0.26200/Edge155, the same RTX3090 development machine as earlier Sogne evidence. Ordinary laptop/mobile NOT TESTED. `SWISS_PILOT=1 node scripts/acceptance/swiss-performance.mjs`: isolated sessions, one warm-up excluded + three steady10s720p24fps runs/aspect/source mode, cancellation before every successful retry. No concurrent rendering benchmarks. CPU draw includes submission/Canvas copy, **not GPU timer**.

|Median[min–max]ms|10m16:9|Detailed16:9|10m9:16|Detailed9:16|
|---|---:|---:|---:|---:|
|Fetch/hash/decode|33.6[32.3–36.6]|49.9[45.9–51.8]|30.8[29.2–33.4]|44.0[42.8–45.8]|
|Prepare renderer|172.0[145.2–185.9]|176.0[151.2–182.6]|163.8[143.9–181.8]|166.2[154.0–180.8]|
|Export10s|719.3[713.4–734.4]|740.1[738.3–764.5]|734.7[733.4–751.4]|747.4[708.6–760.0]|
|Output bytes|6604937|6909752|6329870|6812005|

CPU frame medians0.8ms both landscape cases; portrait0.8→0.7ms, tail up to8.1ms. Three repeats/overlapping spreads do not prove speed improvement. Detailed source increases decode time/encoded complexity; observed export difference13–21ms/10s, not a universal device prediction. Final benchmark outputs independently decode. Separate full20/30s MP4 results are recorded per file in [evidence](SWISS_PILOT_EVIDENCE.json), not substituted for medians.

## Memory and bounds

CDP JS heap baseline6.92MB/session; retained after eight repeated load/scrub/cancel/export/dispose cycles27.36MB(control)/27.38MB(detail); test-onlyGC14.27/14.27MB. Individual samples fluctuate rather than rising monotonically; raw observations are retained in the evidence. The last output Blob/shared modules/cached rider are part of that observation. These data neither confirm a leak nor prove memory safety; no forced production GC.

Browser native working set/private bytes, renderer/media-process attribution, encoder peak and VRAM: **NOT MEASURED**. CDP is not a substitute.

Analytical allocations, not measured peaks:

- 2960000 image pixels:11840000B decodedRGBA;~15786667B complete GPU mip chains, before driver copies.
- 226576mesh vertices: position/color/normal/UV+triangle-index arrays15384344B; Three.js/driver copies extra. Fine heights453152B; coarse control800B.
- At most two geographic textures; CPU256²rider/source clone, no annotation sprite GPU upload. Ribbon remains within400k vertices.
- High runtimeJPEG1233109B; low control283156B, same GPU texture dimensions. Raw45MBimage/1.19MBDEM remain offline developer inputs.

## Preserve Sogne

`scripts/acceptance/swiss-sogne-regression.mjs` against PR10 `e6dd3659a77c8a5f4db2568f581dcfeded057ed5`:48 destination720p frames, Atlas/Night/both aspects/plain-distance and grade-terrain/six timestamps, **zero changed RGBA bytes**. Archived source/local historical evidence is preserved. Swiss and Sogne are different datasets and are not reported as a geographic before/after timing comparison.

No renderer rewrite/unbounded LOD. Next work should address regional edges, native memory/device evidence and explicit package approval before expanding coverage.

## Source detail in destination pixels

`SWISS_PILOT=1 node scripts/acceptance/swiss-detail-footprint.mjs` projects east/north ground edges at the timeline anchor with the unchanged 20s Standard camera. During replay, a derived 0.5m texel spans about 0.67–0.72 destination pixels in landscape / 1.18–1.29 in portrait; the 10m control spans about 12.9–15.7 / 23.0–27.9. The portrait close-up is near useful derived detail without forcing the camera kilometres higher. These are local surface samples, not a bound for every visible pixel or a claim about independently classified native acquisition GSD. Raw per-timestamp observations are preserved in the machine-readable evidence.
