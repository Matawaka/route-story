# Terrain performance and native-memory observations

Measured on2026-10-09, Windows10.0.26200 x64, Edge154.0.4258.62, NVIDIA RTX3090 via ANGLE/D3D11. Specific developer machine; no portable minimum RAM, mobile throughput or universal GPU guarantee. Test tools read hardware metadata locally for this explicit benchmark, never collect it in the application or transmit it.

Final repeated renderer comparison and native3D audit: clean commit `b3937e75430a5a656f765d2f3f89687385d3fb87`. Final production example acceptance: clean `0edebbf31db8c32f1c7e1dbeeac4f1b812bb8562`; later changes select Auto from route-local relief and add decoded-blank detection, leaving the measured explicit2D/3D rendering paths unchanged. Earlier allocation measurements report `3037f30…` with uncommitted follow-up code; they are labelled historical rather than attributed to a clean commit. [TERRAIN_EVIDENCE.json](TERRAIN_EVIDENCE.json) keeps exact origins and compact observations; raw per-process diagnostic files stay ignored.

## Dataset and preparation

Synthetic721-point GPX,30,885B,20.230452km, one authored continuous mountain route, no GPS elevations/timestamps. Large stress fixture deterministically subdivides that same source geometry to50,000 points,2,150,102B: no truncation, private travel history or newly invented historical journey. Distances still come from geographic GPX edges; terrain coordinates are presentation only. Older generic100/5k/20k/50k benchmarks remain in PERFORMANCE.md; this sprint compares the two new renderers on exactly the same terrain-area geometry and a maximum-count stress case.

Real Kartverket DTM10 annual2020 cell6800-3: source ZIP110,515,741B (ignored), EPSG25833/10m. Public derived50m grid962,802B/481,401vertices/960,000triangles;100m grid241,402B/120,701vertices/240,000triangles. Manifest1,285B. One active quality grid is loaded; the fixed cache retains at most the two public grids, never user GPX. Regional pack30×40km. No-data samples0 in both grids; holes elsewhere reject rather than become sea level. Ribbon≤400k vertices plus≤200k centre-trace vertices. Six draw calls for the demonstrated final frame; bounded scene, no texture/whole-frame cache or new tiles during encoding.

Offline repeat from the exact ZIP through `scripts/terrain/prepare.py` reproduced both production grid SHA256 values,0 no-data. Full invocation including source/archive hashes/crop/sampling took1870.44ms in one observation (earlier pre-hash observation1417.96ms is not the same timed scope). rasterio1.4.4/pyproj3.7.2/numpy2.5.3/Pillow12.3.0, GDAL3.10.3/PROJ9.5.1; exact developer requirements in `scripts/terrain/requirements.txt`. No Python/product runtime required for a normal checkout. The script warns about a NumPy2.5 deprecation in Rasterio's window read, but output checksums match; no geometry workaround or ignored data failure.

Browser benchmark reports load wall time, but these are loopback/cached observations, **not internet transfer measurements**. Actual public asset transfer is bounded by these file bytes; a remote v1.1 load has NOT BEEN TESTED. Final local production allowlist is4,775,047B across19 files (before later documentation-only notice changes), below the unchanged5MiB limit. Lazy3D chunk≈548KB minified; Vite's500KB advisory remains visible. Initial2D does not load Three or DEM until requested. Original raster is never bundled.

## Repeated same-route comparison

One warm-up and three steady repeats per configuration, sequentially on one isolated test page. Medians with observed min–max, times in milliseconds. Parse medians5.3–5.7ms. Cached geography/DEM load0ms; do not confuse that with cold transfer. Renderer preparation includes camera/mesh/normals/shader/readiness creation; first usable scene is already drawn in the3D constructor. “First draw” is therefore an additional timed draw, not total import latency. Frame samples include30 selected timestamps; seek uses six forward/backward timestamps. GPU commands can queue: CPU submission/Canvas-copy timing **is not GPU elapsed time**.

| Config | Mode | Prepare median | Additional draw median | Export median (range) | Encoded bytes |
| --- | --- | --- | --- | --- | --- |
| 640×360,Atlas20s | 2D | 23.3 | 2.4 | 1333.0 (1324.3–1338.6) | 3,231,095 |
| 640×360,Atlas20s | 3D100m | 70.5 | 1.9 | 619.3 (596.8–630.1) | 3,863,503 |
| 1280×720,Atlas20s | 2D | 23.8 | 13.3 | 4567.4 (4558.4–4588.3) | 9,936,366 |
| 1280×720,Atlas20s | 3D50m | 192.6 | 4.4 | 1138.7 (1094.5–1158.7) | 12,830,178 |
| 720×1280,Night30s | 2D | 27.6 | 26.8 | 17171.5 (17048.2–17479.3) | 16,415,577 |
| 720×1280,Night30s | 3D50m | 215.7 | 4.5 | 1663.1 (1586.6–1704.6) | 17,908,643 |

Steady sampled frame medians0.2/8.0/22.6ms for2D and0.5/0.5/0.4ms for3D;3D max1.3/2.7/3.2ms. Seek3D medians0.5/0.4/0.5ms. Separate first2D360p sample had48.7ms maximum; report the spread rather than hide it. Only full export includes synchronous GPU capture plus realH.264 encoding. Final output from each configuration is independently decoded480/720frames; same24fps and bitrate1.5/5Mbps.3D produces larger files here. Faster3D export on this GPU does not imply faster imports, less memory or better performance on an unsupported/slow GPU.

The50k/30s/1280×7203D stress output independently decodes720 distinct frames/H.264/24fps,18,849,018B. Two timed UI export observations1808.1/1760.7ms include waiting for download, so they are separate from the inner export medians. Cycle3 time includes independent FFmpeg validation and is excluded from throughput comparison.

## Allocation optimisation

Profiling identified a concrete constructor cost: large growable index arrays and a new/cloned colour object for every terrain vertex. PreallocatedUint32Array indices and scalar colour interpolation remove those transient objects. Historical controlled before/after runs, unchanged rendered bytes, one warm-up/three repeats:

| Terrain preparation | Before | Immediate after (range) |
| --- | --- | --- |
| 100m360p | 104.8ms | 74.0ms |
| 50m landscape | 309.8ms | 197.0ms |
| 50m portrait | 259.4ms | 179.2ms |

Subsequent final version adds centre trace and transition safety; current preparation is70.5/192.6/215.7ms above. GPU/cache/scheduling changed observed export times substantially between runs; the constructor-only optimisation is **not claimed to cause the whole export speed difference**. Native peak did not consistently decrease, so no blanket memory-reduction claim. No Worker/OffscreenCanvas/WASM/spatial-index rewrite.

## Native memory: methodology and limitations

Isolated Edge browser root+descendants, Windows `PrivateMemorySize64` and `WorkingSet64`, sampled by existing `sample-memory.ps1`. Three cycles each: import50k, scrub, Compatibility export, Standard30s export, cancel/retry, replace with721 points, invalid import, retention wait, then explicit test-onlyGC and page unload. No production forcedGC. Peak values are sampled process-tree sums, not continuous true peaks.

Private bytes represent committed private virtual memory, not resident physical RAM. Working-set sums can double-count shared pages. Browser/GPU/renderer roles are reported in local raw diagnostics; attribution to a dedicated encoder cannot be established. **GPU VRAM and dedicated codec allocations UNMEASURED**. CDP heap is a separate stage sample, not total native/GPU memory.

| Run | Private-commit peak | Working-set sum peak | Largest stage JS heap sample | After testGC private / JS heap |
| --- | --- | --- | --- | --- |
| Same-route2D | 876,539,904B | 1,099,489,280B | 70,473,304B | 482,988,032 /14,222,572B |
| Initial3D | 1,133,375,488B | 1,300,443,136B | 147,397,232B | 631,738,368 /15,511,100B |
| Allocation-optimised3D | 1,106,493,440B | 1,272,623,104B | 98,221,932B | 670,961,664 /15,497,048B |
| Final3D | 1,145,262,080B | 1,287,032,832B | 103,247,200B | 645,971,968 /15,528,756B |

Final3D baseline private299,651,072B; retained after repeated cycles989,671,424→1,004,036,096→841,052,160B, after unload631,345,152B. Sampling178–320ms; some very short seek/invalid-import stages have no sample and are explicitly null.2D interval173–315ms; earlier3D174–299/195–306ms. Final3D private peak≈1092.2MiB versus2D835.9MiB, about31% more. This is a material resource cost.

Every focused run's test-only WeakRef audit found18 disposed renderers, zero-sized canvases and0 retained prior renderer/route objects; local/session storage empty. Retention fluctuates and falls by the third final cycle, rather than growing monotonically. This audit gives no confirmed persistent old-route retention in these cases; it does **not prove universal leak absence** or explain every retained native cache. Browser/driver/media caches remain material after cleanup. Do not promise mobile memory safety, minimum RAM or memory returning exactly to baseline.

## Commands and source reproduction

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
node scripts/acceptance/terrain-performance.mjs --final
node scripts/acceptance/terrain-memory.mjs --terrain-only --final
# Omit --terrain-only for a fresh isolated2D/3D native comparison
node scripts/acceptance/terrain-camera.mjs
```

For optional offline DEM regeneration, download only the exact reviewed110MB archive from [TERRAIN_DATA_SOURCES.json](TERRAIN_DATA_SOURCES.json), keep it outsideGit in `.reference/terrain/dtm6800-3.zip`, install pinned Python developer requirements into an ignored environment, then:

```powershell
python -m pip install -r scripts/terrain/requirements.txt
python scripts/terrain/prepare.py .reference/terrain/dtm6800-3.zip --output artifacts/sprint8/reproduced
```

The script accepts only the exact ZIP/TIFF hashes and known extracted filename, reads a bounded crop, uses source no-data and inverse CRS sampling, rounds≤0.5m to signed integer metres and never accepts user routes. Compare output grids with public hashes. No full-country DEM, dynamic remote URL or implicit datum conversion. Quantisation/resampling errors are not a claim of survey accuracy. Nine sampled100m east-axis distances compared with WGS84Geod show −0.175% to+0.916% local-projection error; this is not an exhaustive bound. GPX geographic distance remains unchanged and is not calculated in the tangent frame.

## Recommended follow-up

Review actual full videos first. Test a physical mobile device before any mobile3D/export claim. A lower-memory GPU/driver and different browser require new native profiling; consider bounded scene reduction only with measured visual tradeoffs. Resolve vertical datum from an authoritative dataset specification before adding surveyed altitude labels. Wider regional coverage and closer valley flight require separate source/license/camera work. Keep current2D/Classic fallback and all output limits. No automatic merge, publication or contest-material replacement.
