"""Independent original 2m source check, developer only; never enlarges app caps.

Every cubic Bernstein control hull bounds the WHOLE actual camera leg. Original
float-source cell maxima prove 350m, including intro/outro. Exact native triangle
LOS additionally covers gaze AND original marker at all encoded timestamps.
Continuous runtime LOS is certified against the rendered 5m mesh separately.
"""
import json, pathlib, hashlib, math, datetime
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[2]
ref = json.loads((ROOT/'data/swiss-phase-c/manifest.json').read_text(encoding='utf8'))['nativeAcceptanceReference']
source = ROOT/'.reference/swiss/phase-c'/ref['file']
assert hashlib.sha256(source.read_bytes()).hexdigest() == ref['sha256']
grid = np.fromfile(source, dtype='<f4').reshape(ref['height'], ref['width'])
assert np.isfinite(grid).all() and (grid > -1000).all(), 'Native source no-data'
s, west, south = ref['spacingMeters'], ref['westMeters'], ref['southMeters']
def corners(x, y):
    xx, yy = (x-west)/s, (y-south)/s
    assert 0 <= xx <= ref['width']-1 and 0 <= yy <= ref['height']-1, 'Native coverage'
    ix, iy = min(ref['width']-2, math.floor(xx)), min(ref['height']-2, math.floor(yy))
    return grid[iy, ix], grid[iy, ix+1], grid[iy+1, ix], grid[iy+1, ix+1], xx-ix, yy-iy
def ground(x, y):
    a,b,c,d,fx,fy = map(float, corners(x,y))
    return a+(b-a)*fx+(c-a)*fy if fx+fy <= 1 else d+(c-d)*(1-fx)+(b-d)*(1-fy)
def knots(a,b):
    out = {0., .1, 1.}
    for f,t,o in [(a[0],b[0],west),(a[1],b[1],south),(a[0]+a[1],b[0]+b[1],west+south)]:
        if abs(t-f)<1e-9: continue
        for i in range(math.ceil((min(f,t)-o)/s),math.floor((max(f,t)-o)/s)+1):
            p=(o+i*s-f)/(t-f)
            if 1e-9<p<1: out.add(p)
    return sorted(out)
reports=[]
cases=json.loads((ROOT/'artifacts/director-native/poses.json').read_text())['reports']
for r in cases:
    clearance, los = math.inf, math.inf
    for leg in r['legs']:
        c=np.array(leg['controls']); x0,y0=c[:,:2].min(axis=0); x1,y1=c[:,:2].max(axis=0)
        corners(x0,y0); corners(x1,y1)
        ix0,iy0=math.floor((x0-west)/s),math.floor((y0-south)/s)
        ix1,iy1=min(ref['width']-1,math.floor((x1-west)/s)+1),min(ref['height']-1,math.floor((y1-south)/s)+1)
        value=float(c[:,2].min()-grid[iy0:iy1+1,ix0:ix1+1].max()); clearance=min(clearance,value)
        assert value >= 350+1e-5, 'Whole cubic native 350m clearance'
    for p in r['poses']:
        for name in ['target','marker']:
            a,b=p[name],p['position']
            for t in knots(a,b):
                q=[a[i]+(b[i]-a[i])*t for i in range(3)]; value=q[2]-ground(q[0],q[1]);los=min(los,value)
                assert value >= min(8,t*80)-1e-5, 'Exact native triangle LOS'
    reports.append(dict(aspect=r['aspect'],duration=r['duration'],quality=r['quality'],result='PASS',continuousCubicLegs=len(r['legs']),posesIncludingEndpoints=len(r['poses']),minimumNativeHullClearanceMeters=clearance,minimumNativeTriangleLosMeters=los))
result=dict(date=datetime.datetime.now(datetime.timezone.utc).isoformat(),applicationRuntime=sorted({r['sourceCommit'] for r in cases}),sourceSha256=ref['sha256'],nativeSpacingMeters=s,sourceBytes=source.stat().st_size,method='Whole cubic control-hull native cell ceiling; exact native triangular gaze+marker LOS at every24fps timestamp/endpoints. Not a new continuous-native-LOS interval claim.',reports=reports)
(ROOT/'artifacts/director-native/proof.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
