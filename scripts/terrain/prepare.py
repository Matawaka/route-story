"""Bounded developer-only DEM preprocessing; rasterio 1.4.4 / pyproj 3.7.2.
Original licensed GeoTIFF stays outside Git. Never processes user GPX.
"""
import argparse, hashlib, json, math, pathlib, time
import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.windows import Window
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument('source', type=pathlib.Path)
p.add_argument('--output', type=pathlib.Path, default=pathlib.Path('public/terrain'))
a = p.parse_args(); begin = time.perf_counter(); a.output.mkdir(parents=True, exist_ok=True)
origin = [6.2, 61.28]; radius = 6371008.8; cosine = math.cos(math.radians(origin[1]))
project = Transformer.from_crs(4326, 25833, always_xy=True)
with rasterio.open(a.source) as source:
    assert source.crs.to_epsg() == 25833 and source.count == 1
    # Read only the crop, not a national raster. Local tangent approximation is
    # used only for scene geometry; geographic GPX distance remains Haversine.
    x, y = project.transform([5.88, 6.52,5.88,6.52], [61.09, 61.47,61.47,61.09])
    window = source.window(min(x)-1000, min(y)-1000, max(x)+1000, max(y)+1000).round_offsets().round_lengths()
    window = window.intersection(Window(0, 0, source.width, source.height))
    raster = source.read(1, window=window); transform = source.window_transform(window)
    inverse = ~transform
    def sample(lon, lat):
        east, north = project.transform(lon, lat)
        col = inverse.a*east + inverse.b*north + inverse.c - .5
        row = inverse.d*east + inverse.e*north + inverse.f - .5
        ix, iy = np.floor(col).astype(int), np.floor(row).astype(int)
        valid = (ix>=0)&(iy>=0)&(ix+1<raster.shape[1])&(iy+1<raster.shape[0])
        ix=np.clip(ix,0,raster.shape[1]-2); iy=np.clip(iy,0,raster.shape[0]-2)
        corners=[raster[iy,ix],raster[iy,ix+1],raster[iy+1,ix],raster[iy+1,ix+1]]
        for corner in corners: valid &= np.isfinite(corner)&(corner!=source.nodata)
        fx=col-ix; fy=row-iy
        height=(corners[0]*(1-fx)+corners[1]*fx)*(1-fy)+(corners[2]*(1-fx)+corners[3]*fx)*fy
        return np.where(valid,height,np.nan)
    lods=[]
    for spacing in [50,100]:
        width=30000//spacing+1; height=40000//spacing+1
        xx,yy=np.meshgrid(np.linspace(-15000,15000,width),np.linspace(-20000,20000,height))
        values=sample(origin[0]+np.degrees(xx/(radius*cosine)),origin[1]+np.degrees(yy/radius))
        encoded=np.where(np.isfinite(values),np.rint(values),-32768).astype('<i2')
        name=f'sogne-{spacing}m.i16'; data=encoded.tobytes(); (a.output/name).write_bytes(data)
        lods.append(dict(file=name,spacingMeters=spacing,width=width,height=height,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),noDataCount=int(np.isnan(values).sum())))
    # Diagnostic MapLibre raster-dem: one genuine z9 tile, no runtime remote tiles.
    z=10; tx=int((origin[0]+180)/360*2**z); ty=int((1-math.asinh(math.tan(math.radians(origin[1])))/math.pi)/2*2**z)
    col,row=np.meshgrid(np.arange(512)+.5,np.arange(512)+.5)
    lon=(tx+col/512)/2**z*360-180
    lat=np.degrees(np.arctan(np.sinh(math.pi*(1-2*(ty+row/512)/2**z))))
    tile=sample(lon,lat); rgb=np.rint((np.nan_to_num(tile)+10000)*10).astype(np.uint32)
    Image.fromarray(np.stack([(rgb>>16)&255,(rgb>>8)&255,rgb&255],axis=-1).astype(np.uint8)).save('.reference/terrain/terrain-rgb.png')
    manifest=dict(id='kartverket-dtm10-2020-sogne',origin=origin,westMeters=-15000,southMeters=-20000,eastMeters=15000,northMeters=20000,lods=lods,noData=-32768,minElevation=float(np.nanmin(values)),maxElevation=float(np.nanmax(values)),verticalScale=1,units='metres',verticalDatum='Unspecified in supplied 2020 metadata and GeoTIFF; no assumed NN2000 conversion',sourceCrs='EPSG:25833',sourceResolutionMeters=10,attribution='© Kartverket · CC BY 4.0 · cropped/resampled',sourceSha256=hashlib.sha256(a.source.read_bytes()).hexdigest(),mapLibreSpike=dict(z=z,x=tx,y=ty,noDataPixels=int(np.isnan(tile).sum())),preprocessingMs=round((time.perf_counter()-begin)*1000,2))
    # Timing is diagnostic, not part of a reproducible production manifest.
    processing_ms=manifest.pop('preprocessingMs')
    (a.output/'sogne.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    manifest['preprocessingMs']=processing_ms
    print(json.dumps(manifest,indent=2))
