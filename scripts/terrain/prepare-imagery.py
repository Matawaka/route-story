"""Developer-only fixed public Sentinel scene crop; no user route input.
Use pinned scripts/terrain/requirements.txt. Raw crops remain ignored.
"""
import hashlib, json, math, pathlib, time, argparse
import numpy as np
import rasterio
from rasterio.windows import Window
from pyproj import Transformer
from PIL import Image

root=pathlib.Path('.reference/imagery'); output=pathlib.Path('public/imagery'); output.mkdir(exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--level',type=int,choices=[10,20,40],default=20);args=parser.parse_args()
begin=time.perf_counter(); spacing=args.level
expected={
 'LN-scl':'9b69d4d84910381c3eedc6a482f632ec0dee3a7d608945e6322389bf33e0f55d',
 'LN-visual':'b456872d34cf66a43244eeb4f5013bdd5d5afb19a5a4a9936cf085a9b20ff437',
 'LP-scl':'fe62334d502d5bb49f436566084b7a41f1ea3d52527de5c8dcbf80643fc6077a',
 'LP-visual':'e686e8928261007b629b9531d8659b3cc7d56cad76dd555dd6e14359ad5cd45f'}
origin=[6.2,61.28]; bounds=[-8000,-8000,5000,8000] if spacing==10 else [-15000,-20000,15000,20000]; radius=6371008.8
width=(bounds[2]-bounds[0])//spacing; height=(bounds[3]-bounds[1])//spacing
east=bounds[0]+(np.arange(width)+.5)*spacing; north=bounds[3]-(np.arange(height)+.5)*spacing
xx,yy=np.meshgrid(east,north); lon=origin[0]+np.degrees(xx/(radius*math.cos(math.radians(origin[1])))); lat=origin[1]+np.degrees(yy/radius)
sx,sy=Transformer.from_crs(4326,32632,always_xy=True).transform(lon,lat)
rgb=np.zeros((height,width,3),np.uint8); covered=np.zeros((height,width),bool); classes=np.zeros((height,width),np.uint8); sources=[]
for tile in ['LN','LP']:
    identifier=f'S2C_32V{tile}_20250927_0_L2A'
    metadataPath=root/f'{identifier}.json'
    if not metadataPath.exists():
        import urllib.request
        with urllib.request.urlopen(f'https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{identifier}',timeout=40) as response:
            metadataPath.write_bytes(response.read(100000))
    metadata=json.loads(metadataPath.read_text(encoding='utf-8-sig'))
    assert metadata['id']==identifier and metadata['properties']['proj:epsg']==32632
    source={'id':identifier,'acquired':metadata['properties']['datetime'],'sceneCloudPercent':metadata['properties']['eo:cloud_cover'],'product':metadata['properties']['s2:product_uri'],'assets':[]}
    for kind in ['scl','visual']:
        local=root/f'{identifier}-{kind}-crop.tif'
        if not local.exists():
            url=metadata['assets'][kind]['href']
            assert url==f'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/32/V/{tile}/2025/9/{identifier}/{"SCL" if kind=="scl" else "TCI"}.tif'
            with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',GDAL_HTTP_TIMEOUT='40',GDAL_HTTP_MAX_RETRY='2'),rasterio.open(url) as src:
                assert src.crs.to_epsg()==32632
                window=src.window(float(sx.min())-40,float(sy.min())-40,float(sx.max())+40,float(sy.max())+40).round_offsets().round_lengths().intersection(Window(0,0,src.width,src.height))
                data=src.read(window=window); profile=src.profile.copy();profile.update(width=data.shape[2],height=data.shape[1],transform=src.window_transform(window),compress='deflate')
                with rasterio.open(local,'w',**profile) as dest:dest.write(data)
        assert local.stat().st_size<=32*1024*1024
        assert hashlib.sha256(local.read_bytes()).hexdigest()==expected[f'{tile}-{kind}'],'Unreviewed source crop; re-review provenance rather than silently changing imagery'
        with rasterio.open(local) as src:
            assert src.crs.to_epsg()==32632 and src.width*src.height<=18000000
            data=src.read(); inv=~src.transform
            col=inv.a*sx+inv.b*sy+inv.c-.5; row=inv.d*sx+inv.e*sy+inv.f-.5
            ix=np.floor(col).astype(int);iy=np.floor(row).astype(int);valid=(ix>=0)&(iy>=0)&(ix<src.width-1)&(iy<src.height-1)
            ix=np.clip(ix,0,src.width-2);iy=np.clip(iy,0,src.height-2)
            if kind=='visual':
                # Do not invent bright pixels in clipped true-colour shadows.
                # Source SCL identifies missing/defective pixels independently
                # of RGB brightness (legitimate water/shadow may be black).
                valid &= classValid
                weightX=col-ix;weightY=row-iy
                sample=(data[:,iy,ix]*(1-weightX)*(1-weightY)+data[:,iy,ix+1]*weightX*(1-weightY)+data[:,iy+1,ix]*(1-weightX)*weightY+data[:,iy+1,ix+1]*weightX*weightY).transpose(1,2,0)
                choose=valid&~covered;rgb[choose]=np.round(sample[choose]).clip(0,255).astype(np.uint8);classes[choose]=tileClasses[choose];covered[choose]=True
            else:
                cr=np.clip(np.round(row).astype(int),0,src.height-1);cc=np.clip(np.round(col).astype(int),0,src.width-1)
                tileClasses=data[0,cr,cc];classValid=valid&~np.isin(tileClasses,[0,1])
            source['assets'].append({'kind':kind,'url':metadata['assets'][kind]['href'],'cropBytes':local.stat().st_size,'cropSha256':hashlib.sha256(local.read_bytes()).hexdigest(),'cropBounds':list(src.bounds),'crs':'EPSG:32632','sourceSpacingMeters':abs(src.transform.a)})
    sources.append(source)
assert covered.all(),f'{np.sum(~covered)} uncovered pixels; no invented fill'
image=output/f'sogne-sentinel-{spacing}m.jpg';Image.fromarray(rgb).save(image,quality=88,subsampling=0,optimize=True)
assert hashlib.sha256(image.read_bytes()).hexdigest()=={20:'521cddcd174a3d3a3208d9008293287040a1d866d7c755fadbfb5a8a794185ec',40:'ad88bb13cc1e5fb62e9b5575d5ec43176bd61ae22aae9d0f7fbd8e5a1388a441',10:'d74099be2da8bed8fbbbfafb7a5426ca21546adb7d300180869dfb23e5cea996'}[spacing]
maskCount={str(int(c)):int(np.sum(classes==c)) for c in np.unique(classes)}
report={'schema':1,'id':'sogne-sentinel-20250927','origin':origin,'bounds':bounds,'width':width,'height':height,'spacingMeters':spacing,'file':image.name,'bytes':image.stat().st_size,'sha256':hashlib.sha256(image.read_bytes()).hexdigest(),'attribution':'Contains modified Copernicus Sentinel data 2025','licenseUrl':'https://cds.climate.copernicus.eu/licences/ec-sentinel','acquiredDate':'2025-09-27','sourceResolutionMeters':10,'pixelOrientation':'north-up; row0 north; pixel centres; bounds are pixel edges','changes':['fixed regional crop','same local tangent coordinates as DEM',f'bilinear{spacing}m resampling of10m TCI','JPEG quality88 RGB compression'],'sources':sources,'coveragePixels':int(covered.sum()),'classificationCounts':maskCount,'cloudPercent':100*np.sum(np.isin(classes,[8,9,10]))/classes.size,'snowPercent':100*np.sum(classes==11)/classes.size,'cloudShadowPercent':100*np.sum(classes==3)/classes.size,'prepareMs':(time.perf_counter()-begin)*1000}
(output/f'sogne-sentinel-{spacing}m.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
if spacing==20:(output/'sogne-sentinel.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:report[k] for k in ['bytes','sha256','cloudPercent','snowPercent','cloudShadowPercent','prepareMs']}))
