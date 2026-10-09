# Performance and memory

## Sprint 7 cinematic comparison — 2026-10-09

Same machine: Windows_NT10.0.26200 x64, Node24.19.0, Microsoft Edge154.0.4258.62. Static main/tag baseline `5f39332b7358949d248da6b2f99ba445ee1b41e8` was measured before source changes. Final application checkpoint is `7443166d02dd3b78225725d69707c3d7a498a6c4`. Raw intermediate/final timings were captured immediately before that commit on the same application tree; they are not measurements of subsequent documentation changes. No other test/browser workload was run concurrently. One interrupted HMR-invalidated run was excluded. Public synthetic-only summaries: [CINEMATIC_EVIDENCE.json](CINEMATIC_EVIDENCE.json); raw files remain ignored under artifacts/sprint7.

Reproduce sequentially with `node scripts/acceptance/performance.mjs`, then `node scripts/acceptance/memory.mjs`. The original dataset generator/counts below are unchanged. Current performance script additionally awaits the fixed local geography; CPU timings exclude its download/module import, while real-UI native-memory testing includes loading/cached layers. One warm-up excluded + three steady runs per case; table medians (range). Selected H.264 profile avc1.42001f, 24fps, unchanged 1.5/5Mbps presets. All eight final case outputs independently decoded with actual dimensions/duration/240 or720 frames and timestamps, with no error.

| Points / GPX bytes / geometry | Preset / seconds | v1.0 export ms | v1.1 export ms (min–max) | v1.1 parse / prepare / preview ms | v1.1 output bytes |
| --- | --- | ---: | --- | --- | ---: |
| 100 / 6,508 / segments | Compatibility /10 | 389.7 | 824.6 (824.3–843.1) | 1.4 /22.9 /27.1 | 1,399,047 |
| 100 / 6,508 / segments | Standard /10 | 686.3 | 2482.5 (2478.7–2523.4) | 1.5 /25.3 /41.8 | 4,563,022 |
| 5000 /320,301 /antimeridian | Compatibility /10 | 380.0 | 707.2 (680.7–789.1) | 52.5 /24.9 /79.4 | 1,371,259 |
| 5000 /320,301 /antimeridian | Standard /10 | 663.3 | 2321.8 (2301.0–2352.7) | 53.8 /26.1 /94.7 | 4,571,877 |
| 20000 /1,267,225 /long | Compatibility /10 | 384.4 | 3275.4 (3266.2–3282.4) | 209.8 /44.1 /262.0 | 2,060,369 |
| 20000 /1,267,225 /long | Standard /10 | 657.2 | 9640.4 (9433.3–9670.9) | 235.5 /48.7 /381.9 | 6,831,221 |
| 50000 /3,075,653 /dense | Compatibility /10 | 397.8 | 786.7 (742.0–822.1) | 546.4 /41.8 /620.2 | 2,089,531 |
| 50000 /3,075,653 /dense | Standard /30 | 1632.1 | 6857.2 (6682.0–6944.1) | 553.7 /59.3 /697.2 | 17,604,648 |

These are Atlas benchmark cases, not a claim that Night or every region has these timings. Cinematic export is materially slower/larger than the static baseline: 50k Standard about4.2× wall time and5.6× bytes; long routes need to draw much more global geography and show larger differences per frame. No settings were silently reduced. Classic remains an explicit lower-motion/static alternative. Parsing code was unchanged; measured differences are not a parsing optimization claim. Worst measured global10s Standard nearly takes real-time to encode on this machine, so lower-resource devices may be significantly slower.

### Measured route-cache optimization

Profile before optimization: full-vector cinematic 50k/Standard30s export 14,197.7ms (14,106.5–14,310); sampled frame-submission median0.3/max853.4ms. Destination Canvas calls could defer large work, so that deceptively small median was not smooth displayed performance. Two fixed, maximum-camera-resolution route buffers avoid repeating large GPS rasterisation; map geography remains vector drawn. Final export6,857.2ms, sampled frame CPU median8.2/max9.2ms; alternating seek median16.0/max26.2ms on this case. Export is about52% faster than the all-vector intermediate, without reducing any route points or removing geographic layers.

The change targets dense route bursts, not every map cost. 5000-point antimeridian Standard increased from intermediate1196.7ms to final2321.8ms; 20k/global Standard from9019.5 to9640.4ms. Buffer sampling/CPU raster determinism carry a real cost. Map clipping reduces offscreen geometry and corrects seam behaviour but is not claimed to solve this global-map bottleneck. No worker, WebGL production framework or spatial index was added.

At720p/2.65× zoom, two3392×1908 RGBA route buffers total51,775,488 nominal pixel bytes (before native overhead). They are never enlarged past preparation scale and are zero-sized on disposal. The map itself is not a scaled low-resolution bitmap. Other caches/encoder/native processes add memory beyond these bytes. A future conditional route-buffer strategy or scoped map detail could be profiled separately; this candidate favours verified determinism and bounded allocations.

Actual 700-point final demo exports: Atlas16:9/20s 5,598.7ms /11,837,253B; Night9:16/30s 18,145.4ms /17,367,156B. Single observations include real rendering/probe/encode/finalization, excluding download/FFmpeg. Night bloom is expensive; neither number is a repeated benchmark. Both videos independently decoded; see CINEMATIC_VALIDATION.md.

### Fresh native-memory comparison

Same Windows OS sampler/root+descendant method as below, four identical real-UI 50k cycles with successful export, quality change, cancellation/retry, replacement and invalid-file cleanup. Static baseline samples176–299ms; cinematic177–263ms. Both samplers ran through the final stages. An intermediate all-vector run exhausted its180s sampler before final cleanup; its missing native observations are not counted as measured. Final cache run completes all stages.

| Observation, bytes | Fresh static v1.0 | Cinematic v1.1 |
| --- | ---: | ---: |
| Empty baseline last private process sum | 276,676,608 | 281,653,248 |
| Observed peak private process sum | 1,022,545,920 | 989,151,232 |
| Working-set sum at private peak | 1,203,224,576 | 1,186,582,528 |
| Main renderer private bytes at that sample | 484,622,336 | 577,998,848 |
| GPU-process CPU private bytes at that sample | 357,281,792 | 243,343,360 |
| Final cleanup private sum | 592,965,632 | 531,619,840 |
| Final cleanup page JS heap used | 13,099,528 | 25,058,048 |
| After test-only GC page JS heap used | 8,813,004 | 14,224,028 |
| After page unload last private sum | 574,357,504 | 495,890,432 |

The3.3% lower observed total peak is not proof of a memory optimization or lower hardware requirement. Work distribution changes: a fixed CPU raster backend and detailed retained geography shift more bytes to the main renderer and JS heap. Working-set sums double-count shared pages; private bytes are committed virtual memory, not RAM. GPU-process values are **not GPU VRAM**. Native/dedicated codec allocations cannot be attributed reliably and remain unmeasured. No production hardware fingerprints/GC/telemetry are collected.

Final cleanup private sums across four cycles:666,320,896;503,926,784;667,570,176;531,619,840B. They do not grow monotonically, and do not return to empty baseline because browsers/codec/map modules cache resources. Test-only GC/WeakRef audit:32 disposed renderers, all old temporary Canvas surfaces zero-sized, zero surviving old renderers and routes, eight tracked routes. This did not identify sustained retention in these cycles; it cannot establish memory safety on arbitrary devices or after unlimited operation. Next release should prioritize expensive global vector scenes/Night bloom and actual low-memory hardware testing before expanding coverage or resolution.

## Historical Sprint 3 performance and memory — 2026-10-09

Measured environment: Windows_NT 10.0.26200 x64, Node 24.19.0, headless Microsoft Edge 154.0.4258.62 in fresh isolated Playwright sessions. H.264 profile probe selected avc1.42001f, 24 fps, Compatibility 640×360 / 1.5 Mbps, Standard 1280×720 / 5 Mbps. These are observations on one machine, not guarantees for other devices. No hardware inventory or private route was collected.

## Reproduction and datasets

After `npm.cmd ci`, run sequentially in the repository; do not run benchmarks concurrently:

```powershell
node scripts/acceptance/performance.mjs
node scripts/acceptance/memory.mjs
```

The scripts own a localhost Vite server on port 4183 and stop it afterwards. `memory.mjs` requires Windows and installed Edge; it launches a hidden, process-scoped PowerShell sampler. Its temporary `-ExecutionPolicy Bypass` applies only to that trusted local measurement script, without changing system policy. Reports, synthetic MP4s and raw samples are ignored under `artifacts/sprint3/`. No profiling, GC or diagnostic transmission is added to production. Run original full video acceptance separately with `PLAYWRIGHT_CHANNEL=msedge`, `FULL_EXPORT_ACCEPTANCE=1`, `npm.cmd run check`.

`tests/fixtures/synthetic.ts` is a deterministic MIT generator, explicitly synthetic. It creates exactly the requested point count, duplicates every seventh eligible coordinate, includes integer elevations, preserves segment order, and keeps the final coordinate. Cases: 100 points / four disconnected segments; 5,000 / antimeridian; 20,000 / long-distance sine geometry; 50,000 / dense local geometry. Native repeatability uses 50,000 points / four disconnected segments, then replaces it with 100 dense points. Short and 86–89° latitude cases are additionally covered by visual/geographic tests. All generated files remain below the unchanged 10 MiB input limit. 50,001 points are explicitly rejected in a unit test; no truncation.

Each performance case has one excluded warm-up and three measured steady runs in one isolated browser session. Tables show medians; parentheses show min–max. Modules/base-map fetching are excluded from CPU timings. Parsing includes validation and geographic metrics. Renderer preparation includes timeline, projection, coordinate/edge caches and base-map drawing. The separately measured projection is diagnostic and is **not** added to preview initialization. Initialization is parse + preparation + first draw. Sixty forward frame submissions and ten alternating forward/backward seeks per run measure Canvas CPU submission, not GPU/display completion. Clock resolution can yield zero samples; those mean below the timer resolution. Export wall time includes probing, encoding and finalization, excluding download/independent decoding. Each case's last steady output is independently decoded with strict FFmpeg/ffprobe validation.

## Measured batch checkpoint

Before: accepted Sprint 2 renderer (plus independent Sprint 3 decoder verification). After: fixed 128-edge stroke batches and invalid-import visible-canvas cleanup; browser/scripts and geometry unchanged. Files: `performance-before.json`, `performance-batch.json`, `memory-before.json`, `memory-batch.json`.

| Points / geometry | GPX bytes | Quality / seconds | Parse ms | Prepare ms | Preview ms | Export ms (range) | Output bytes |
| --- | ---: | --- | ---: | ---: | ---: | --- | ---: |
| 100 / segments | 6,508 | Compatibility / 10 | 1.9 | 1.7 | 4.1 | 427.9 (406.4–440.3) | 289,927 |
| 100 / segments | 6,508 | Standard / 10 | 1.5 | 1.7 | 3.7 | 653.1 (646.5–665.2) | 653,514 |
| 5,000 / antimeridian | 320,301 | Compatibility / 10 | 55.7 | 3.6 | 59.1 | 406.8 (378.8–412.5) | 350,499 |
| 5,000 / antimeridian | 320,301 | Standard / 10 | 53.3 | 5.8 | 59.5 | 661.4 (649.8–685.4) | 790,203 |
| 20,000 / long | 1,267,225 | Compatibility / 10 | 212.4 | 9.8 | 222.8 | 396.9 (387.3–400.0) | 623,356 |
| 20,000 / long | 1,267,225 | Standard / 10 | 210.7 | 10.0 | 219.8 | 655.3 (646.4–682.5) | 1,303,353 |
| 50,000 / dense | 3,075,653 | Compatibility / 10 | 505.6 | 26.4 | 529.5 | 395.4 (394.1–398.2) | 454,887 |
| 50,000 / dense | 3,075,653 | Standard / 30 | 521.6 | 22.6 | 547.1 | 1644.3 (1632.5–1674.3) | 2,980,856 |

All outputs: H.264, actual selected dimensions, 24 fps, 240 frames / 10.000s or 720 frames / 30.000s; all frame timestamps and durations checked within 10 µs; no decoder errors. Output byte changes reflect changed rasterization of joins/batch boundaries, not removed GPX points.

| 50,000 dense points | Before | After |
| --- | --- | --- |
| Compatibility / 10s export ms | 701.3 (688.9–794.0) | 395.4 (394.1–398.2) |
| Standard / 30s export ms | 1751.8 (1743.0–1773.5) | 1644.3 (1632.5–1674.3) |
| Standard sampled frame CPU ms | median 0.3, range 0–53.9 | median 0.2, range 0–6.2 |
| Standard alternating seek CPU ms | median 3.4, range 0.1–13.8 | median 1.0, range 0–2.5 |
| Standard diagnostic projection ms | 6.7 (5.0–7.6) | 3.7 (3.7–4.3) |

Projection code was unchanged at this checkpoint; its timing variation is not claimed as an optimization. Small routes show normal noise and no consistent speedup. The demonstrated cost was many individual Canvas stroke commands on large routes. The smallest change batches contiguous edges in fixed groups of 128, caches complete groups, and submits at most 127 residual edges. GPX gaps and projection seams start separate subpaths. Fixed group boundaries keep direct draw, incremental playback and backward seek pixel-identical; a 5,000-point browser test checks this and every disconnected segment gap. No framework, worker, alternate projection or point reduction was introduced.

## OS memory observations

Method: isolated browser root PID and its `Win32_Process` descendants, sampled using `Get-Process.WorkingSet64` and `PrivateMemorySize64`. Process roles are recorded cautiously from Chromium process type; command lines are not written. Sampling intervals were 166–420ms before and 167–277ms after (100ms requested delay plus OS-query overhead). Peaks are **observed sample maxima**, not exact allocation peaks. A stage with no sample is reported null.

- Working-set sums can count shared pages more than once; they are not unique physical RAM.
- Private bytes mean private committed virtual memory, not resident RAM, JS heap or GPU VRAM.
- CDP values measure the page JS heap separately; they exclude other processes/native encoder buffers.
- GPU-process private bytes are CPU-side process memory, **not measured GPU memory**. Dedicated encoder memory and GPU VRAM remain unmeasured. Utility-process memory is not attributed to a particular codec.
- Encoded Blob bytes are reported separately; the 32 MiB output cap is not a browser-memory cap.

Four identical real UI cycles: import 50k → scrub → Compatibility/10s export → Standard/30s export → cancel → successful retry → replace with 100 points → invalid import → three-second cleanup observation. Last-cycle exports were independently decoded. No monotonic-memory assertion is made. Natural GC/browser caches can retain memory. A separate test-only CDP GC observation and page unload follow the four cycles.

| Observation (bytes) | Before | After |
| --- | ---: | ---: |
| Empty baseline last private sum | 270,266,368 | 276,549,632 |
| Overall observed peak private sum | 1,204,207,616 | 907,104,256 |
| Working-set sum at that private peak | 1,085,665,280 | 1,084,231,680 |
| GPU-process private bytes at that peak | 715,517,952 | 342,495,232 |
| Main renderer private bytes at that peak | 311,955,456 | 395,862,016 |
| Last cleanup private sum | 569,028,608 | 582,995,968 |
| Last cleanup page JS heap used | 13,054,872 | 13,067,460 |
| After test-only GC page JS heap used | 8,770,632 | 8,781,144 |
| After page unload last private sum | 557,219,840 | 557,772,800 |

Observed private-commit peak fell 24.7%; working-set sums did **not** materially fall. The process distribution changed. This supports reducing native command-buffer pressure, not a claim of a 25% reduction in physical RAM. Each version used one cold browser session with four cycles; hardware/driver caching and sampling limit causal certainty.

Standard export private peaks over cycles: before 1,143,177,216 / 1,190,940,672 / 1,193,861,120 / 1,203,564,544; after 782,987,264 / 835,870,720 / 844,713,984 / 901,611,520. Retained last private sums after cleanup: before 684,519,424 / 743,137,280 / 736,129,024 / 569,028,608; after 773,140,480 / 744,296,448 / 776,896,512 / 582,995,968. Retention is not consistently improved and does not grow monotonically through cleanup. No confirmed leak is inferred from these runs; no universal memory-safety claim.

Test-only WeakRefs observed 32 disposed renderer instances, all cached canvases resized to zero, and zero surviving old renderers after explicit test GC. Invalid imports now also resize the visible canvas to zero rather than retaining hidden route pixels. Encoder failure, cancellation, renderer failure and retry are tested independently. Page unload aborts export/stops replay/disposes caches. No production GC or speculative disposal rewrite.

## Limits and next release

Parsing/validation dominates large-route preview initialization (~0.5s at 50k here); it remains synchronous and can briefly block input. Native resource use remains substantial, even after batching. Low-RAM physical mobile devices, other drivers, GPU VRAM and dedicated codec memory are not measured. Do not raise existing file/point/video limits or silently lower requested export settings. A real mobile stress/cancel/retry run and OS-specific memory observation should precede a mobile export support claim. No evidence currently justifies workers/WebGL/WASM or a pipeline replacement.

## Title layout before/after

Long 200-unit titles previously ran an ellipsis/measureText loop on every frame. Cache the title, static metric and fitting font sizes at renderer construction, with no change to validated source text. Separate opt-in visual measurements use 100 dense synthetic points, six captured states, one warm-up + three steady submissions of 120 frames. Instrumented Canvas fillText measures glyph bounds in **both** versions, so this timing includes diagnostic overhead and is not production FPS/GPU completion.

Baseline uses `VISUAL_BASELINE_REF=d440732` with `visual.mjs`: it copies that commit's public renderer into an ignored local fixture, rewrites its imports to the current source modules, and reports known old defects without calling it acceptance. The new projection is shared for this isolated text comparison; dense geometry is unaffected by its minimum-span change. Clear the environment variable to test current acceptance. Geometry/palette/font layout also changed, so the observed difference is the full small composition change, dominated by removed repeated text measurement; no isolated per-function causal precision is claimed.

| Style / quality / aspect | Before 120 draws ms (range) | After ms (range) |
| --- | --- | --- |
| Atlas / Compatibility / 16:9 | 70.3 (69.0–79.8) | 11.4 (11.1–12.0) |
| Atlas / Compatibility / 9:16 | 74.8 (68.3–75.2) | 11.0 (10.0–11.2) |
| Atlas / Standard / 16:9 | 66.0 (63.4–68.2) | 9.9 (9.7–10.5) |
| Atlas / Standard / 9:16 | 70.3 (70.0–74.8) | 9.8 (9.5–9.8) |
| Night / Compatibility / 16:9 | 65.8 (63.2–66.7) | 10.4 (9.6–11.1) |
| Night / Compatibility / 9:16 | 67.9 (67.7–71.0) | 9.9 (9.3–10.4) |
| Night / Standard / 16:9 | 65.7 (65.7–71.4) | 9.5 (9.4–9.9) |
| Night / Standard / 9:16 | 69.2 (68.6–71.3) | 9.4 (9.4–10.1) |

Raw repeated reports: ignored visual-baseline.json and preserved visual-text-after.json. Initial exploratory single-pass reports remain visual-before.json; those are not substituted for the repeated results above.

## Final-code confirmation

On pushed application commit `88b410bf9c60e31a24519d715a9040fc9eb8b379`, both scripts were rerun sequentially after composition changes. Same environment/datasets, one warm-up + three steady performance runs; all eight final MP4s independently passed strict decoding. Raw `performance-final.json`:

| Points | Quality / resolution / seconds | Parse ms | Prepare ms | Preview ms | Export median ms (min–max) | MP4 bytes |
| ---: | --- | ---: | ---: | ---: | --- | ---: |
| 100 | Compatibility / 640×360 / 10 | 1.8 | 1.9 | 3.8 | 378.5 (374.3–476.1) | 289,794 |
| 100 | Standard / 1280×720 / 10 | 1.2 | 1.9 | 3.8 | 642.4 (642.2–648.7) | 660,796 |
| 5,000 | Compatibility / 640×360 / 10 | 54.3 | 3.2 | 58.0 | 431.8 (424.3–465.4) | 343,291 |
| 5,000 | Standard / 1280×720 / 10 | 53.5 | 6.2 | 60.1 | 682.3 (668.1–696.2) | 781,777 |
| 20,000 | Compatibility / 640×360 / 10 | 216.3 | 14.4 | 225.5 | 395.3 (385.2–412.9) | 625,809 |
| 20,000 | Standard / 1280×720 / 10 | 209.3 | 16.6 | 222.1 | 666.4 (649.7–678.3) | 1,313,388 |
| 50,000 | Compatibility / 640×360 / 10 | 524.5 | 26.7 | 552.2 | 405.4 (388.3–427.9) | 481,261 |
| 50,000 | Standard / 1280×720 / 30 | 543.7 | 32.6 | 577.9 | 1631.6 (1622.3–1634.8) | 3,122,941 |

Final 50k Standard: sampled frame CPU median 0.2ms (0–1.3), alternating seek median 1.0ms (0.1–2.5), standalone projection 6.0ms (5.9–6.5). Page JS heap after the three steady exports: 34,798,152 / 30,704,592 / 30,129,964 bytes; these are separate non-GC observations, not native-memory peaks. Additional original Sprint 2 fixtures (5,000 points) passed 30s/720p acceptance in both formats: landscape 3,120,320 bytes / 1672.8ms, portrait 3,039,156 bytes / 1724.8ms, both 720 independently decoded frames.

Two more fresh native-memory sessions on final code observed private-sum peaks 990,760,960 and 987,529,216 bytes (working-set sums at those peaks 1,166,938,112 / 1,191,362,560). Sampling intervals 171–269ms and 172–272ms. This variability versus the earlier batch-only 907,104,256-byte sample must remain visible; do not substitute the lowest run as a final RAM guarantee. After-change observed private peaks across these three sessions are 18–25% below the one before session, while working-set sums do not improve. No robust physical-RAM or GPU-memory reduction claim.

Final-code cleanup private sums over four cycles: first session 748,638,208 / 753,938,432 / 898,502,656 / 580,812,800; route-audit session 765,112,320 / 749,932,544 / 852,647,936 / 569,372,672. Last session after test-only GC: page JS heap 8,813,568 bytes and last private sum 549,507,072; after page unload 9,191,856 and 546,557,952 respectively. Retention rises mid-session then falls; no sustained monotonic leak is confirmed. An extended test-only WeakRef audit also tracked eight distinct prior route objects: all eight and all 32 disposed renderers were collectible after invalid cleanup/explicit test GC; cached canvases were zero-sized. Files: memory-final.json, memory-route-audit.json, resource-audit.json. Dedicated encoder/GPU VRAM remain unmeasured.
