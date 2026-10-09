# Sprint 3 performance and memory — 2026-10-09

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
