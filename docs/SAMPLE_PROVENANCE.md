# Sample provenance and acceptance

## Committed samples

`public/samples/synthetic.gpx` and `tests/fixtures/*.gpx` were generated for Route Story. They contain synthetic coordinates, no identifiable private journey and no borrowed route data. They are MIT. The UI calls the demo a synthetic teaching example.

## External Hong Kong Trail acceptance

Source: https://github.com/nicholas-fong/Hong-Kong-Trails-GPX-KML. Pinned commit: `93768bfea43b9cce27e0c1bc6609d1ba90028cf0`. File: `HongKong-Trail/GPX-Track/Hong-Kong-Trail-track.gpx`.

Inspected README.md, METHOD.md, CC0-1.0 declaration and actual file before testing. The author describes cleaned OpenStreetMap/Overpass public trail geometry and ASTER GDEM V3 elevations, not a named person's GPS recording. This is a real mapped public trail; no trip dates or duration are inferred. CC0 alone does not settle upstream ODbL/ASTER redistribution terms. **The GPX and derived video/screenshots stay in ignored `.reference/` and `artifacts/` only**; none are copied into Git or CI artifacts. No @wahrier private data or contest materials are used.

Acceptance on 2026-10-08: 4,628 points; 1 segment; 44.779332995 km by production haversine; 44.778533174 km by independent spherical-cosine calculation (under 1 m difference, reflecting floating-point cancellation on very short edges). Start longitude/latitude `114.149506, 22.271277`; finish `114.245614, 22.244715`. Both checked against the original GPX. Export: 640×360 H.264, 4 seconds, 96 independently decoded frames.

Reproduce as an external local test after obtaining the file from its pinned upstream path:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
$env:REAL_GPX_PATH = 'K:\ROUTE STORY\.reference\hong-kong-trail.gpx'
npm.cmd run build
npm.cmd run test:e2e
```

Routine CI omits REAL_GPX_PATH and uses only synthetic data. Remove the variable afterwards to run the routine suite: `Remove-Item Env:REAL_GPX_PATH`.
