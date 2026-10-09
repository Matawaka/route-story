# Imagery feasibility — fixed public Sogne region

Checked2026-10-09. No private GPX was sent to any service. Developer queries use the already public DEM origin6.2°E61.28°N/30×40km region. Runtime accepts only bounded first-party derived assets; no satellite service is called by the application.

| Candidate | Geographic/detail feasibility | Rights and decision |
| --- | --- | --- |
| Geonorge/Norge i bilder orthophotos | Norway coverage; project-specific dates/GSD/owners. A suitable open downloadable project with all redistribution/video rights was not established | [Kartverket terms](https://www.kartverket.no/api-og-data/vilkar-for-bruk) distinguish screenshot use from licensed imagery and copying of third-party/Geovekst data. **NOT APPROVED** for texture packaging; no scraping/WMS tile harvesting |
| Copernicus Sentinel2 L2A | Actual32VLN/32VLP scenes obtained;10m RGB orthorectified coverage | **SELECTED**. [Official legal notice](https://cds.climate.copernicus.eu/licences/ec-sentinel) permits reproduction/distribution/public communication/adaptation. [Official creative/commercial FAQ](https://www.copernicus.eu/en/faq) confirms creative derivative use with credit. A rendered redistributed MP4 is an adaptation/public communication under these rights, our interpretation of the cited terms |
| OpenAerialMap | Suitable Sogne item not obtained in this bounded investigation; specific scene/GSD/date/cloud unknown | [Provider legal page](https://openaerialmap.org/legal/) describes open licensing. A particular item's license must still be checked. **NOT TESTED**, not claimed regionally available |
| USGS NAIP | Separate US demo only; irrelevant to Norway. [Official archive](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-aerial-photography-national-agriculture-imagery-program-naip) describes orthorectified imagery/public-domain use | **NOT SELECTED**. No US pack downloaded. Broad mixed imagery services may include third-party imagery; never assume every displayed layer is NAIP/public domain |
| Google Photorealistic/GoogleEarth | Commercial reference only | **EXCLUDED**, no API/key/billing/video-redistribution evaluation or import |

## Actual selected data

Sentinel2C, one datatake20250927T110841, relative orbit137. `S2C_32VLN_20250927_0_L2A` acquired11:14:21.781Z, `S2C_32VLP_20250927_0_L2A` acquired11:14:08.408Z. UTM32N WGS84 EPSG32632. SourceTCI10m, SCL20m, source tiles10980×10980. [Official product specification](https://sentiwiki.copernicus.eu/web/s2-products) describes L2A UTM/WGS84 ortho-images and TCI/SCL resolutions. Copernicus performs terrain correction; our DEM is a separately dated2020 Kartverket model, not the orthorectification DEM and not proof of subpixel surveying alignment.

[Provider EarthSearch documentation](https://github.com/Element84/earth-search/blob/main/README.md) identifies the public COG distribution. Query API is developer-only. Direct TCI/SCL URLs, exact product names, cropped raster bounds, bytes and SHA256 are in [public manifest](../public/imagery/sogne-sentinel.json). Source crop hashes refer to **actually downloaded/repacked bounded GeoTIFF windows**, not the full original remote scenes. Full-scene downloads failed/partial and are not accepted source files; complete remote-file SHA256 is UNMEASURED. Reviewed crops can be reproduced from listed immutable scene URLs and verified before further processing. No raw source raster enters Git.

Scene-wide cloud0.228456%/0.441697%. Inside the actual3million sampled regional pixels: SCL cloud/cirrus0.0252333%, snow/ice0.4618333%, cloud-shadow class0%. Source terrain shadows/dark pixels remain; black RGB alone is not classified as missing. SCL0/1 rejects absent/defective coverage. All3million output pixels have valid classified source coverage. These algorithmic classification observations are not a guarantee of cloud-free photography or historical journey weather.

Derived texture1500×2000 RGB,20m/pixel,1127607B JPEGquality88/subsampling0, SHA256`521cddcd174a3d3a3208d9008293287040a1d866d7c755fadbfb5a8a794185ec`. True-colour sensor data, no AI-generated geography, no invented roads/trees/buildings. Source10m resolution cannot show street-level buildings; close views remain soft. Acquisition was autumn with a low sun and strong mountain shadows.

## Credit and reproducibility

Output shows **Contains modified Copernicus Sentinel data 2025**, alongside the existing KartverketCCBY4.0 DEM credit. [Notices](../THIRD_PARTY_NOTICES.md) link terms and describe changes: crop, local reprojection, bilinear20m resampling, JPEG compression, DEM draping and deterministic artistic illumination. Dataset reuse is governed by Copernicus terms, not the application's MIT license; no EU/ESA endorsement is claimed.

Pinned preprocessing dependencies are shared with `scripts/terrain/requirements.txt`. Run `python scripts/terrain/prepare-imagery.py` in that environment. Fixed scene metadata under ignored `.reference/imagery/` must first be downloaded from each EarthSearch item URL; the script reads bounded windows over HTTP Range, caches only those reviewed developer crops and checks their hashes on rerun. Browser never accesses those URLs. Production baseline remains≤5MiB; texture pack is separate opt-in local candidate, no approved deployment size increase.
