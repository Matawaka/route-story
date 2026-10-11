"""Bounded, developer-only Swiss crop. No sample-data ZIP, private GPX or runtime tiles.

Requires scripts/terrain/requirements.txt. Ordinary OGD COGs are kept in .reference.
Run from repository root; --download obtains only the two fixed reviewed sources.
"""
import argparse, hashlib, json, pathlib, urllib.request
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from PIL import Image, ImageDraw
from pyproj import Transformer

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCES = [
    ('selected-image.tif', 'ch.swisstopo.swissimage-dop10', 'swissimage-dop10_2023_2670-1157', 'swissimage-dop10_2023_2670-1157_0.1_2056.tif', '5e324e639876a227f397f0dd45de7413a563a8702acd58e5e97b5591e81d8031', 45009298),
    ('selected-dem.tif', 'ch.swisstopo.swissalti3d', 'swissalti3d_2024_2670-1157', 'swissalti3d_2024_2670-1157_2_2056_5728.tif', 'df2126dc6e28098a0127fa099367471638422d07be386732bd82e38380d2eecb', 1186083),
]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def basis(x, y): return np.stack([np.ones_like(x),x,y,x*x,x*y,y*y,x*x*x,x*x*y,x*y*y,y*y*y],axis=-1)
def record(p): return dict(file=p.name, bytes=p.stat().st_size, sha256=sha(p))
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');args=parser.parse_args()
    source_dir=ROOT/'.reference/swiss';out=source_dir/'pilot';out.mkdir(parents=True,exist_ok=True)
    records=[]
    for filename,collection,item,asset,digest,size in SOURCES:
        path=source_dir/filename;url=f'https://data.geo.admin.ch/{collection}/{item}/{asset}'
        if not path.exists() and args.download:
            with urllib.request.urlopen(url,timeout=120) as response, path.open('wb') as dest:
                total=0
                while chunk:=response.read(1024*1024):
                    total+=len(chunk)
                    if total>size: raise ValueError('Source exceeds reviewed length')
                    dest.write(chunk)
        if not path.exists(): raise ValueError(f'Missing {path}; use --download or download the fixed COG URL')
        assert path.stat().st_size==size and sha(path)==digest, 'Full source checksum/length mismatch'
        records.append(dict(collection=collection,item=item,asset=asset,url=url,bytes=size,sha256=digest))
    forward=Transformer.from_crs(4326,2056,always_xy=True);inverse=Transformer.from_crs(2056,4326,always_xy=True)
    E,N=2670500,1157500;lon,lat=inverse.transform(E,N)
    east,north=np.meshgrid(np.linspace(E-500,E+500,21),np.linspace(N-500,N+500,21))
    longitude,latitude=inverse.transform(east,north)
    actual_east,actual_north=forward.transform(longitude,latitude)
    xy=np.stack([actual_east-E,actual_north-N],axis=-1).reshape(-1,2)
    uv=np.stack([(longitude-lon)/.01,(latitude-lat)/.01],axis=-1).reshape(-1,2)
    fc=np.linalg.lstsq(basis(uv[:,0],uv[:,1]),xy,rcond=None)[0]
    source_xy=np.stack([east-E,north-N],axis=-1).reshape(-1,2)
    ic=np.linalg.lstsq(basis(source_xy[:,0]/1000,source_xy[:,1]/1000),np.stack([longitude-lon,latitude-lat],axis=-1).reshape(-1,2),rcond=None)[0]
    e,n=np.meshgrid(np.linspace(E-499.731,E+499.419,87),np.linspace(N-499.251,N+499.873,89));lo,la=inverse.transform(e,n)
    fitted=basis((lo-lon)/.01,(la-lat)/.01)@fc
    exact_e,exact_n=forward.transform(lo,la)
    forward_error=float(np.max(np.hypot(fitted[:,:,0]-(exact_e-E),fitted[:,:,1]-(exact_n-N))))
    back=basis((e-E)/1000,(n-N)/1000)@ic;be,bn=forward.transform(back[:,:,0]+lon,back[:,:,1]+lat)
    inverse_error=float(np.max(np.hypot(be-exact_e,bn-exact_n)))
    assert max(forward_error,inverse_error)<.001
    projection=dict(crs='EPSG:2056',verticalDatum='LN02',originLV95=[E,N],originWgs84=[lon,lat],domainMeters=[-500,-500,500,500],forwardCoefficients=fc.T.tolist(),inverseCoefficients=ic.T.tolist(),normalizationDegrees=.01,normalizationMeters=1000,maximumFitErrorMeters=max(forward_error,inverse_error),operation=forward.description,operationAccuracyMeters=forward.accuracy)
    levels=[]
    with rasterio.open(source_dir/'selected-dem.tif') as dem:
        assert str(dem.crs)=='EPSG:2056' and dem.res==(2,2) and dem.nodata==-9999
        h=dem.read(1)[12:488,12:488][::-1].copy();assert h.shape==(476,476) and np.isfinite(h).all() and not (h==dem.nodata).any()
        assert np.min(h)>-500 and np.max(h)<9000
        for spacing,grid in [(2,h),(50,h[::25,::25])]:
            assert grid.shape==(476,476) if spacing==2 else grid.shape==(20,20)
            p=out/f'furka-{spacing}m.i16';np.rint(grid).astype('<i2').tofile(p)
            levels.append(dict(**record(p),spacingMeters=spacing,width=grid.shape[1],height=grid.shape[0],noDataCount=0))
    terrain=dict(id='furka-swisstopo-pilot',origin=[lon,lat],westMeters=-475,southMeters=-475,eastMeters=475,northMeters=475,lods=levels,noData=-32768,minElevation=int(np.rint(h).min()),maxElevation=int(np.rint(h).max()),verticalScale=1,units='metres',verticalDatum='LN02',sourceCrs='EPSG:2056',sourceResolutionMeters=2,attribution='© swisstopo',regionalProjection=projection)
    def make_image(src,bounds,w,h,name,low=False):
        window=from_bounds(*bounds,transform=src.transform)
        image=src.read(window=window,out_shape=(3,h if not low else h//10,w if not low else w//10),resampling=Resampling.average).transpose(1,2,0)
        # Controlled A/B: low version really loses detail BEFORE resampling to an
        # identical texture grid. This is explicitly labelled, never new source GSD.
        if low:
            # Exact 10m output sample grid for each same geographic extent.
            image=src.read(window=window,out_shape=(3,round((bounds[3]-bounds[1])/10),round((bounds[2]-bounds[0])/10)),resampling=Resampling.average).transpose(1,2,0)
        im=Image.fromarray(image)
        if low: im=im.resize((w,h),Image.Resampling.BILINEAR)
        p=out/name;im.save(p,quality=90,subsampling=0)
        return dict(schema=1,id='furka-swissimage-2023',origin=[lon,lat],bounds=[bounds[0]-E,bounds[1]-N,bounds[2]-E,bounds[3]-N],width=w,height=h,spacingMeters=(bounds[2]-bounds[0])/w,**record(p),attribution='© swisstopo · SWISSIMAGE 2023',acquiredDate='2023 (acquisition year; exact day not verified)',sourceResolutionMeters=.25,effectiveDetailMeters=10 if low else (bounds[2]-bounds[0])/w,nativeResolutionStatus='10cm or25cm acquisition; selected tile not independently classified',boundaryFeatherMeters=40)
    imagery={}
    with rasterio.open(source_dir/'selected-image.tif') as src:
        assert str(src.crs)=='EPSG:2056' and src.res==(.1,.1)
        for mode in ['high','low']:
            m=make_image(src,(2670000,1157000,2671000,1158000),1000,1000,f'furka-{mode}-overview.jpg',mode=='low')
            m['detail']=make_image(src,(2670025,1157025,2670725,1157725),1400,1400,f'furka-{mode}-detail.jpg',mode=='low')
            assert m['bytes']+m['detail']['bytes']<=2*1024*1024
            assert m['width']*m['height']+m['detail']['width']*m['detail']['height']<=3000000
            imagery[mode]=m
        a=src.read(out_shape=(3,1000,1000),resampling=Resampling.average).transpose(1,2,0);im=Image.fromarray(a)
    # Approximate road-centre digitization from the same orthoimage; a synthetic
    # demonstration, NOT a recorded ride or survey-accuracy road dataset.
    pixels=[(170,720),(207,712),(250,692),(300,674),(350,657),(400,640),(450,622),(490,612),(506,610),(514,613),(519,619),(517,626),(510,631),(492,636),(465,646),(433,663),(400,683),(365,706),(330,728),(294,751),(260,773),(228,793),(199,815),(170,835),(143,853),(121,869)]
    points=[inverse.transform(2670000+x,1158000-y) for x,y in pixels]
    gpx='<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Route Story synthetic orthoimage digitization" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Синтетическое демо · серпантин Фурка</name><desc>Approximate manual digitization from SWISSIMAGE © swisstopo. Not a recorded human journey; no historic timestamps or GPX elevations.</desc></metadata><trk><name>Синтетический участок дороги</name><trkseg>'+''.join(f'<trkpt lat="{la:.10f}" lon="{lo:.10f}"/>' for lo,la in points)+'</trkseg></trk></gpx>\n'
    (out/'furka-synthetic.gpx').write_text(gpx,encoding='utf8')
    d=ImageDraw.Draw(im);d.line(pixels,fill=(255,50,20),width=3);im.save(out/'source-route.jpg',quality=92)
    proofs=[]
    for x,y in [(-475,-475),(475,475),(-475,475),(475,-475),(0,0),(150,-125),(-315,-215)]:
        lo,la=inverse.transform(E+x,N+y);proofs.append(dict(lon=lo,lat=la,world=[x,y]))
    manifest=dict(schema=1,developerOnly=True,license='swisstopo OGD terms',licenseUrl='https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices',sourceBoundsLV95=[2670000,1157000,2671000,1158000],sources=records,terrain=terrain,imagery=imagery,route=record(out/'furka-synthetic.gpx'),projectionProof=dict(forwardMaximumMeters=forward_error,inverseMaximumMeters=inverse_error,projRoundTripMaximumMeters=float(np.max(np.hypot(exact_e-e,exact_n-n))),independentCheckCount=87*89,referencePoints=proofs),transformations=['Native0.1m COG pixels do not establish native acquisition GSD','RGB average to1m overview and0.5m detail; JPEG90','Comparison10m average then bilinear to identical texture dimensions, no sharpening','DEM source2m centre grid cropped12:488; reversed rows to south-up i16; rounded±0.5m vertical quantization','Coarse comparison subsamples25: same extent,50m mesh','Local degree3 forward/inverse fit of pinned PROJ EPSG4326/2056 operation; bounded1km domain'],budgets=dict(imageryPixels=2960000,decodedRGBABytes=11840000,heightGridBytes=levels[0]['bytes'],meshVertices=476*476),generatedRouteStatus='synthetic approximate road-centre digitization; no real journey')
    text=json.dumps(manifest,ensure_ascii=False,indent=2)+'\n';(out/'manifest.json').write_text(text,encoding='utf8')
    record_dir=ROOT/'data/swiss-pilot';record_dir.mkdir(parents=True,exist_ok=True);(record_dir/'manifest.json').write_text(text,encoding='utf8');(record_dir/'synthetic.gpx').write_text(gpx,encoding='utf8')
    print(json.dumps(dict(sourceHashesVerified=True,terrainLevels=levels,projectionFitMeters=[forward_error,inverse_error],highImageBytes=imagery['high']['bytes']+imagery['high']['detail']['bytes'],lowImageBytes=imagery['low']['bytes']+imagery['low']['detail']['bytes'],out=str(out))))
if __name__=='__main__':main()
