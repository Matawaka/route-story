"""Geometry approximation observation; not DEM vertical accuracy."""
import json,pathlib,xml.etree.ElementTree as ET,math
import numpy as np
from pyproj import Transformer
ROOT=pathlib.Path(__file__).resolve().parents[2]
old=np.fromfile(ROOT/'.reference/swiss/pilot/furka-2m.i16',dtype='<i2').reshape(476,476)
new=np.fromfile(ROOT/'.reference/swiss/phase-c/furka-context-5m.i16',dtype='<i2').reshape(591,591)
def height(grid,spacing,minimum,x,y):
    xx=(x-minimum)/spacing;yy=(y-minimum)/spacing;ix=min(grid.shape[1]-2,math.floor(xx));iy=min(grid.shape[0]-2,math.floor(yy));fx=xx-ix;fy=yy-iy
    a,b,c,d=map(float,[grid[iy,ix],grid[iy,ix+1],grid[iy+1,ix],grid[iy+1,ix+1]])
    return a+(b-a)*fx+(c-a)*fy if fx+fy<=1 else d+(c-d)*(1-fx)+(b-d)*(1-fy)
tree=ET.parse(ROOT/'data/swiss-pilot/synthetic.gpx');pts=[(float(e.attrib['lon']),float(e.attrib['lat'])) for e in tree.iter() if e.tag.endswith('trkpt')]
projection=Transformer.from_crs(4326,2056,always_xy=True);errors=[]
for a,b in zip(pts,pts[1:]):
    for t in np.linspace(0,1,41):
        e,n=projection.transform(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);x,y=e-2670500,n-1157500;errors.append(height(new,5,-1475,x,y)-height(old,2,-475,x,y))
sample=[]
for x in np.linspace(-474.71,474.39,97):
    for y in np.linspace(-474.11,474.69,101):sample.append(height(new,5,-1475,x,y)-height(old,2,-475,x,y))
def stats(values):return dict(samples=len(values),meanSignedMeters=float(np.mean(values)),rmseMeters=float(np.sqrt(np.mean(np.array(values)**2))),maximumAbsoluteMeters=float(np.max(np.abs(values))))
report=dict(date='2026-10-12',method='Same PROJ geographic coordinates/triangular mesh interpolation; original rounded2m grid versus derived rounded5m grid. Approximation difference is not source survey precision or road-centre survey accuracy.',route=stats(errors),originalKilometreSample=stats(sample))
out=ROOT/'artifacts/swiss-phase-c';out.mkdir(parents=True,exist_ok=True);(out/'mesh-approximation.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(report))
