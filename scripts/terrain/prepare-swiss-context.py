"""Fixed 3km Swiss context; ordinary OGD sources, never runtime tile loading.

Pinned requirements are shared with the original pilot. Source list/hashes are
reviewed in data/swiss-phase-c/sources.json. Original 1km pilot is never overwritten.
"""
import argparse,hashlib,json,pathlib,urllib.request
import numpy as np
import rasterio
from rasterio.warp import reproject
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from PIL import Image
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def file_record(p):return dict(file=p.name,bytes=p.stat().st_size,sha256=sha(p))
def basis(x,y):return np.stack([np.ones_like(x),x,y,x*x,x*y,y*y,x*x*x,x*x*y,x*y*y,y*y*y],axis=-1)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--download',action='store_true');args=parser.parse_args()
    record_dir=ROOT/'data/swiss-phase-c';sources=json.loads((record_dir/'sources.json').read_text(encoding='utf8'))['sources'];original=json.loads((ROOT/'data/swiss-pilot/manifest.json').read_text(encoding='utf8'));out=ROOT/'.reference/swiss/phase-c';raw=out/'source';raw.mkdir(parents=True,exist_ok=True)
    rgb=np.zeros((3,1500,1500),dtype=np.uint8);heights=np.full((1500,1500),np.nan,dtype=np.float32);coverage={kind:set() for kind in ['image','dem']}
    for s in sources:
        assert s['kind'] in coverage and s['rasterSpacingMeters']==2 and s['crs']=='EPSG:2056' and s['url'].startswith('https://data.geo.admin.ch/')
        path=raw/s['asset'];assert path.name==s['asset'] and '/' not in s['asset'] and s['asset'].endswith('.tif')
        if not path.exists() and args.download:
            with urllib.request.urlopen(s['url'],timeout=60) as r,path.open('wb') as f:
                count=0
                while chunk:=r.read(256*1024):
                    count+=len(chunk);assert count<=s['bytes'];f.write(chunk)
        assert path.stat().st_size==s['bytes'] and sha(path)==s['sha256'],'Official full source checksum mismatch'
        west,south,east,north=s['tileBoundsLV95'];col=int((west-2669000)/2);row=int((1159000-north)/2)
        assert west in [2669000,2670000,2671000] and south in [1156000,1157000,1158000] and (west,south) not in coverage[s['kind']];coverage[s['kind']].add((west,south))
        with rasterio.open(path) as src:
            assert str(src.crs)=='EPSG:2056' and src.res==(2,2) and src.width==src.height==500 and list(src.bounds)==[west,south,east,north]
            assert np.all(src.read_masks()==255),'No hidden imagery/height no-data interpolation'
            if s['kind']=='image':assert src.count==3;rgb[:,row:row+500,col:col+500]=src.read()
            else:
                h=src.read(1);assert np.isfinite(h).all() and not (h==src.nodata).any();heights[row:row+500,col:col+500]=h
    assert len(coverage['image'])==len(coverage['dem'])==9 and np.isfinite(heights).all()
    # Developer-only physical-source acceptance reference; never served to the
    # browser or included in a runtime/production asset list.
    native_reference=out/'source-2m.f32';heights[::-1].astype('<f4').tofile(native_reference)
    E,N=2670500,1157500;inv=Transformer.from_crs(2056,4326,always_xy=True);fwd=Transformer.from_crs(4326,2056,always_xy=True);lon,lat=original['terrain']['origin'];normal=.02
    ee,nn=np.meshgrid(np.linspace(E-1500,E+1500,31),np.linspace(N-1500,N+1500,31));lo,la=inv.transform(ee,nn);ae,an=fwd.transform(lo,la)
    fc=np.linalg.lstsq(basis(((lo-lon)/normal).ravel(),((la-lat)/normal).ravel()),np.stack([ae-E,an-N],axis=-1).reshape(-1,2),rcond=None)[0]
    ic=np.linalg.lstsq(basis(((ee-E)/1000).ravel(),((nn-N)/1000).ravel()),np.stack([lo-lon,la-lat],axis=-1).reshape(-1,2),rcond=None)[0]
    e,n=np.meshgrid(np.linspace(E-1499.63,E+1499.45,97),np.linspace(N-1499.29,N+1499.79,101));l,a=inv.transform(e,n);exact_e,exact_n=fwd.transform(l,a);fit=basis((l-lon)/normal,(a-lat)/normal)@fc;back=basis((e-E)/1000,(n-N)/1000)@ic;be,bn=fwd.transform(back[:,:,0]+lon,back[:,:,1]+lat)
    error_f=float(np.max(np.hypot(fit[:,:,0]-(exact_e-E),fit[:,:,1]-(exact_n-N))));error_i=float(np.max(np.hypot(be-exact_e,bn-exact_n)));assert max(error_f,error_i)<.001
    projection=dict(scope='furka-context-3km',crs='EPSG:2056',verticalDatum='LN02',originLV95=[E,N],originWgs84=[lon,lat],domainMeters=[-1500,-1500,1500,1500],normalizationDegrees=normal,normalizationMeters=1000,forwardCoefficients=fc.T.tolist(),inverseCoefficients=ic.T.tolist(),maximumFitErrorMeters=max(error_f,error_i),operation=fwd.description,operationAccuracyMeters=fwd.accuracy)
    # Source pixel centres have exact2m spacing. Bilinear5m preparation is
    # explicitly recorded; source accuracy is NOT the runtime mesh spacing.
    coords=np.arange(-1475,1475.001,5);xx,yy=np.meshgrid((coords+1499)/2,(1499-coords)/2);ix=np.floor(xx).astype(int);iy=np.floor(yy).astype(int);fx=xx-ix;fy=yy-iy
    grid=(heights[iy,ix]*(1-fx)+heights[iy,ix+1]*fx)*(1-fy)+(heights[iy+1,ix]*(1-fx)+heights[iy+1,ix+1]*fx)*fy
    assert grid.shape==(591,591) and np.isfinite(grid).all() and grid.min()>-500 and grid.max()<9000
    levels=[]
    for spacing,g in [(5,grid),(50,grid[::10,::10])]:
        p=out/f'furka-context-{spacing}m.i16';np.rint(g).astype('<i2').tofile(p);assert p.stat().st_size<=1000000 and g.size<=500000
        levels.append(dict(**file_record(p),spacingMeters=spacing,width=g.shape[1],height=g.shape[0],noDataCount=0))
    terrain=dict(id='furka-context-swisstopo',origin=[lon,lat],westMeters=-1475,southMeters=-1475,eastMeters=1475,northMeters=1475,lods=levels,noData=-32768,minElevation=int(np.rint(grid).min()),maxElevation=int(np.rint(grid).max()),verticalScale=1,units='metres',verticalDatum='LN02',sourceCrs='EPSG:2056',sourceResolutionMeters=2,attribution='© swisstopo',regionalProjection=projection)
    image_transform=from_origin(2669000,1159000,2,2)
    def overview(low):
        w=300 if low else 1000;array=np.zeros((3,w,w),dtype=np.uint8)
        for b in range(3):reproject(rgb[b],array[b],src_transform=image_transform,src_crs='EPSG:2056',dst_transform=from_origin(2669000,1159000,3000/w,3000/w),dst_crs='EPSG:2056',resampling=Resampling.average)
        im=Image.fromarray(array.transpose(1,2,0));im=im.resize((1000,1000),Image.Resampling.BILINEAR) if low else im
        p=out/f'furka-context-{"low" if low else "high"}-overview.jpg';im.save(p,quality=90,subsampling=0)
        return dict(schema=1,id='furka-context-swissimage-2023',origin=[lon,lat],bounds=[-1500,-1500,1500,1500],width=1000,height=1000,spacingMeters=3,**file_record(p),attribution='© swisstopo · SWISSIMAGE 2023',acquiredDate='2023 mosaic year; exact days unverified',sourceResolutionMeters=None,providerRasterSpacingMeters=2,effectiveDetailMeters=10 if low else 3,boundaryFeatherMeters=40)
    imagery={}
    for low in [False,True]:
        mode='low' if low else 'high';m=overview(low);old=original['imagery'][mode]['detail'];src=ROOT/'.reference/swiss/pilot'/old['file'];assert sha(src)==old['sha256'];p=out/f'furka-context-{mode}-detail.jpg';p.write_bytes(src.read_bytes());m['detail']={**old,**file_record(p),'id':m['id'],'acquiredDate':m['acquiredDate']};m['detailSelection']={'policy':'projected-ground-texel','fullDetailPixels':.67,'coarsePixels':.3,'maximumDetailPixels':2};assert m['bytes']+m['detail']['bytes']<=2*1024*1024 and m['width']*m['height']+old['width']*old['height']<=3000000;imagery[mode]=m
    refs=[]
    for x,y in [(-1475,-1475),(1475,1475),(-1475,1475),(1475,-1475),(0,0),(150,-125),(-315,-215)]:
        lo,la=inv.transform(E+x,N+y);refs.append(dict(lon=lo,lat=la,world=[x,y]))
    record=dict(schema=1,developerOnly=True,sourceBoundsLV95=[2669000,1156000,2672000,1159000],sources=sources,route=original['route'],terrain=terrain,imagery=imagery,cameraReference=dict(bounds=[-475,-475,475,475],reliefMeters=original['terrain']['maxElevation']-original['terrain']['minElevation']),projectionProof=dict(forwardMaximumMeters=error_f,inverseMaximumMeters=error_i,independentCheckCount=97*101,referencePoints=refs),budgets=dict(meshVertices=grid.size,heightGridBytes=levels[0]['bytes'],imagePixels=2960000,decodedRGBABytes=11840000,estimatedMipBytes=15786667,meshArrayBytes=grid.size*44+(590*590)*6*4,highJpegBytes=imagery['high']['bytes']+imagery['high']['detail']['bytes']),processing=['9 ordinary verified2023 SWISSIMAGE2m overview COGs; original0.1m detail source remains unchanged','9 ordinary verified2024 swissALTI3D2m/LV95/LN02 COGs','Bilinear source2m to runtime5m, rounded≤0.5m; no missing data or height exaggeration','Two fully resident textures:3m overview/unchanged0.5m detail; JPEG90, no sharpening','Explicit10m average/bilinear control with same output grids','Pure3km bounded PROJ fit; old1km reference retained separately'],licenseUrl='https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices',attribution='© swisstopo',nativeOpticalGsd='NOT CLASSIFIED; provider/output raster spacing is separate')
    record['nativeAcceptanceReference']={**file_record(native_reference),'spacingMeters':2,'width':1500,'height':1500,'westMeters':-1499,'southMeters':-1499,'developerOnly':True}
    (record_dir/'manifest.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(dict(sourceBytes=sum(s['bytes'] for s in sources),budgets=record['budgets'],projectionFit=[error_f,error_i],noData=0)))
if __name__=='__main__':main()
