# v1.0.0 visual audit and v1.1 concept — 2026-10-09

Baseline is immutable main/tag `5f39332b7358949d248da6b2f99ba445ee1b41e8`. PR #5 is OPEN at e684719 and is excluded from the visual branch. The owner reports the contest entry already posted; the agent has not posted or independently inspected the private Telegram comment.

Inspected actual published [Atlas 20s](https://github.com/Matawaka/route-story/releases/download/v1.0.0/atlas-20s.mp4) and [Night 30s](https://github.com/Matawaka/route-story/releases/download/v1.0.0/night-30s.mp4), their independently verified downloads and decoded 1s/midpoint/final frames, plus `docs/images/route-story.png`. Download hashes: Atlas cc9eca7f4c39363997b2f51369f242f9ae9444eac94a1fc3c3b5395622d5c938; Night cb3d7553e859c2e4fe0ca469299a9eb126d9641d245ae9d8d2334195932b69fe. Original assets stay untouched in ignored artifacts/sprint6/downloaded-assets.

| Observed limitation | Code cause at the baseline | Measurable upgrade target |
| --- | --- | --- |
| First 2s show almost the same map and route; only caption fades | renderer.drawBase called once; timeline intro changes alpha but never projection | Zoom ratio >2 on ordinary replay; smooth opening transform |
| No follow shot, even on 30s route | geo.fitProjection computed once in renderer constructor | Time-dependent pure camera, marker inside a safe rectangle |
| Flat land/sea, no recognisable fjords or water network | only 138,160-byte Natural Earth 1:110m land GeoJSON | Global 1:50m water layers + real regional 1:10m coast/islands/labels |
| 42% of frame covered by opaque captions | fillRect top .22h and bottom .20h; route fit restricted to .25–.76h | Full-frame geography; translucent margins and compact captions |
| Portrait ocean example is a thin horizontal stripe surrounded by emptiness | static fit must show a wide complete route throughout | Close follow shot; opening/ending preserve complete overview |
| Travel looks like uniformly painting a line | one stroke, plain circular marker, fixed scene composition | Layered geographically aligned stroke, leading pulse, deliberate scenes |
| Final shot repeats opening composition with only distance changed | outro has no camera/director state | Visible smooth return from follow to full route overview |
| Atlas and Night largely share the same green hierarchy | identical geometry/HUD plus green palette swap | Atlas parchment/water/editorial; Night blue-black/amber digital trace |

Camera storyboard: overview/title at t=0 → eased approach to first segment over intro → distance-driven north-up follow with bounded look-ahead and gentle zoom variation → fade/cut at disconnected segments → eased final full-route overview. The same plan scales to 10/20/30s using StoryTimeline boundaries; no second replay clock or geographical alteration. Static Classic remains available and is the internal four-second regression mode.

## Bounded basemap comparison

Natural Earth declares its vector data [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Its [1:10m physical layers](https://www.naturalearthdata.com/downloads/10m-physical-vectors/) supply coastline/islands/rivers/lakes, not worldwide streets. Source revision ca96624a56bd078437bca8184e78163e5039ad19 is pinned. Measured source sizes: 10m land 10,157,965B; coast 10,110,735B; lakes 5,043,554B; rivers 7,307,743B; populated places 19,359,003B. These full sources remain development-only. Generated stripped 50m global geography: 2,413,275B. Western Norway 10m clipped pack [3.5,59,9,62.5]: 124,200B, 41 land polygons, 27 coast polylines, one lake/river, five sourced place labels. No OSM redistribution obligation or runtime map service is introduced.

MapLibre 6.13.0 (BSD-3-Clause) was downloaded only into ignored .reference for an actual Edge154/Windows10.0.26200 GeoJSON feasibility spike. Self-hosted module/worker/CSS total 1,670,961B. Load 276.6ms; 96 idle-barrier captures 667.1ms; existing H.264 encoder 469.2ms. Real 640×360/4s/96-frame MP4 independently decoded; repeated camera snapshot exactly equal, all requested tiles loaded, no external request. This proves basic WebGL capture, **not** a complete regional PMTiles export. Diagnostic pre-capture retained 96 ImageBitmaps, unsuitable as a final long-export design; native/GPU memory was not measured in the spike.

The existing Pages geography asset answered an actual Range bytes=0-126 request with 206, Content-Range bytes 0-126/138160, exactly 127 bytes. Range capability is observed for that asset; no new PMTiles deployment is claimed. [PMTiles](https://docs.protomaps.com/pmtiles/) uses ranges; [Protomaps](https://docs.protomaps.com/basemaps/downloads) global OSM basemap is ~120GB and a regional extraction would require its own bounded package, ODbL attribution and fully loaded deterministic per-frame capture. The regional MVT package and multi-browser readiness are NOT TESTED here.

Selected for v1.1: destination-resolution **Canvas vector** redraw with precompiled/cullable Path2D, 50m global fallback and small 10m fjord pack. It provides demonstrated geographic improvement without an async tile pyramid/WebGL dependency or changing the working encoder. MapLibre is viable future work when street-level regional data and async export can be verified. No claim that Canvas/NE solves worldwide local street detail. No package-limit increase is necessary: geography is below 4MiB and final production package must remain under 5MiB.

## Prototype checkpoint

Baseline check: 92 unit tests, build, 23 browser passes/3 intentional skips. Pure camera checkpoint: 106 unit tests (14 new camera cases), build, focused 12 browser passes/2 full-export skips. Real camera-prototype Atlas20s/1280×720/480 frames: 7,935,597B, 1951.7ms; Night30s/720×1280/720: 13,767,664B, 2711.7ms. Both H.264/24fps, every timestamp and error-free decoding verified; no external requests. These are single prototype observations, not medians or final visual approval. Actual decoded frames show closer view and follow, but still expose the coarse baseline geography. Final art/detail and comparison evidence follow this checkpoint.
