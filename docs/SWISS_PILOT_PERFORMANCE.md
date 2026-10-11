# Swiss pilot performance — observed locally

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
