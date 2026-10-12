"""Acceptance against the actual2m float source, not only its5m display mesh.

No source grid is uploaded to browser memory. Continuous camera legs check all
crossed source cells; every encoded timestamp additionally checks exact native
triangle LOS using the existing positive clearance convention.
"""
import json,pathlib,hashlib,math
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2];m=json.loads((ROOT/'data/swiss-phase-c/manifest.json').read_text(encoding='utf8'));ref=m['nativeAcceptanceReference'];path=ROOT/'.reference/swiss/phase-c'/ref['file'];assert hashlib.sha256(path.read_bytes()).hexdigest()==ref['sha256'];grid=np.fromfile(path,dtype='<f4').reshape(1500,1500)
def corners(x,y):
    assert -1499<=x<=1499 and -1499<=y<=1499,'Source coverage'
    xx=(x+1499)/2;yy=(y+1499)/2;ix=min(1498,math.floor(xx));iy=min(1498,math.floor(yy));return grid[iy,ix],grid[iy,ix+1],grid[iy+1,ix],grid[iy+1,ix+1],xx-ix,yy-iy
def ground(x,y):
    a,b,c,d,fx,fy=map(float,corners(x,y));return a+(b-a)*fx+(c-a)*fy if fx+fy<=1 else d+(c-d)*(1-fx)+(b-d)*(1-fy)
def knots(a,b):
    out={0.,.1,1.}
    for f,t,o in [(a[0],b[0],-1499),(a[1],b[1],-1499),(a[0]+a[1],b[0]+b[1],-2998)]:
        if abs(t-f)<1e-9:continue
        for i in range(math.ceil((min(f,t)-o)/2),math.floor((max(f,t)-o)/2)+1):
            v=(o+i*2-f)/(t-f)
            if 1e-9<v<1:out.add(v)
    return sorted(out)
def mix(a,b,t):return [a[i]+(b[i]-a[i])*t for i in range(3)]
reports=[]
for aspect,duration in [('landscape',20),('portrait',30)]:
    p=ROOT/f'artifacts/swiss-phase-c/final/{aspect}-high-{duration}s.mp4.poses.json';r=json.loads(p.read_text(encoding='utf8'));shots=r['shots'];legs=[(r['overview'],shots[0]['position']),(shots[-1]['position'],r['overview'])]+[(a['position'],b['position']) for a,b in zip(shots,shots[1:]) if a['segment']==b['segment']];minimum=math.inf;count=0;minimum_los=math.inf
    for a,b in legs:
        k=knots(a,b)
        for low,high in zip(k,k[1:]):
            mid=mix(a,b,(low+high)/2);ceiling=max(corners(mid[0],mid[1])[:4]);clearance=min(mix(a,b,low)[2],mix(a,b,high)[2])-ceiling;minimum=min(minimum,float(clearance));count+=1
            assert clearance>=350-1e-5,'Native2m continuous clearance violated'
    for pose in r['poses']:
        a,b=pose['target'],pose['position'];assert a[2]>=ground(a[0],a[1])
        for t in knots(a,b):
            q=mix(a,b,t);clear=q[2]-ground(q[0],q[1]);minimum_los=min(minimum_los,clear)
            assert clear>=min(8,t*80)-1e-5,'Native2m triangle LOS violated'
    reports.append(dict(aspect=aspect,duration=duration,encodedFrames=len(r['poses']),continuousLegs=len(legs),crossedCellIntervals=count,minimumNativeCellClearanceMeters=minimum,minimumNativeTriangleLosMeters=minimum_los,result='PASS'))
report=dict(date='2026-10-12',sourceReference=ref,method='Full verified2m float source (LN02), all crossed cells/diagonals for continuous intro/replay/outro legs; exact triangular LOS at all encoded timestamps.350m unchanged. Additional lifts of the existing pure camera only raise the proved base legs.',reports=reports)
(ROOT/'artifacts/swiss-phase-c/native-camera-proof.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(reports))
