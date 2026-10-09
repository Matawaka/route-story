"""Compose real decoded frames and a data-derived clearance profile. No generated
geography, recolouring, private GPX, or product runtime dependency. Pillow only.
"""
import array, json, math, pathlib, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

root=pathlib.Path('.'); output=root/'docs/images'; output.mkdir(exist_ok=True)
ffmpeg=subprocess.check_output(['node','--input-type=module','-e',"import f from 'ffmpeg-static';process.stdout.write(f);"],text=True).strip()
def font(size):
    for p in ['C:/Windows/Fonts/segoeui.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if pathlib.Path(p).exists(): return ImageFont.truetype(p,size)
    return ImageFont.load_default(size=size)
def frame(video,time):
    path=root/'artifacts/sprint8/contact-frames'/f'{video.stem}-{time:.2f}.png';path.parent.mkdir(exist_ok=True)
    subprocess.run([ffmpeg,'-y','-ss',str(time),'-i',str(video),'-frames:v','1',str(path)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    return Image.open(path).convert('RGB')
for style,aspect,duration in [('atlas','landscape',20),('night','portrait',30)]:
    width=450 if aspect=='landscape' else 240; height=round(width*(720/1280 if aspect=='landscape' else 1280/720))
    times=[0,duration/2,duration-1/24]; sheet=Image.new('RGB',(width*3+48,(height+38)*2+105),'#101b26');d=ImageDraw.Draw(sheet)
    d.text((16,12),f'{style.upper()} | SAME SYNTHETIC GPX | 721 points | 2D vs real DEM 3D',font=font(18),fill='#f1eadb')
    for row,mode in enumerate(['cinematic','terrain']):
        video=root/f'artifacts/sprint8/performance-final/{mode}-standard-{aspect}.mp4'
        for col,time in enumerate(times):
            x=16+col*(width+8); y=49+row*(height+38)
            sheet.paste(frame(video,time).resize((width,height),Image.Resampling.LANCZOS),(x,y))
            d.text((x,y+height+5),f'{"2D v1.1" if row==0 else "3D DEM"} | {time:.2f}s',font=font(16),fill='#e9e6db')
    d.text((16,sheet.height-23),'Actual FFmpeg-decoded exports. No scene edits. 3D: © Kartverket / CC BY 4.0.',font=font(13),fill='#bac8d3')
    sheet.save(output/f'terrain-{style}-comparison.jpg',quality=92)
    times=[0,1,2,duration/4,duration/2,duration-1/24]; sheet=Image.new('RGB',(width*3+48,(height+38)*2+105),'#101b26');d=ImageDraw.Draw(sheet)
    d.text((16,12),f'{style.upper()} | 3D TERRAIN | {duration}s | decoded production export',font=font(18),fill='#f1eadb')
    for i,time in enumerate(times):
        x=16+(i%3)*(width+8);y=49+(i//3)*(height+38)
        source=root/f'artifacts/sprint8/final/{style}-{duration}s.mp4';sheet.paste(frame(source,time).resize((width,height),Image.Resampling.LANCZOS),(x,y))
        d.text((x,y+height+5),f'{time:.2f}s | '+(['overview','descent','start','relief / follow','marker follow','final overview'][i]),font=font(15),fill='#e9e6db')
    d.text((16,sheet.height-23),'Synthetic journey, genuine DEM. Heights 1:1. Local pack; not navigation.',font=font(13),fill='#bac8d3')
    sheet.save(output/f'terrain-{style}-frames.jpg',quality=92)

# Exact same triangle interpolation, independent offline ray sample.
audit=json.loads((root/'artifacts/sprint8/camera/validation.json').read_text());case=next(r for r in audit['reports'] if r['width']==1280)
pose=next(c for c in case['keyframes'] if c['t']==10);m=json.loads((root/'public/terrain/sogne.json').read_text());level=m['lods'][0]
heights=array.array('h');heights.frombytes((root/'public/terrain'/level['file']).read_bytes())
if sys.byteorder!='little':heights.byteswap()
def elevation(x,y):
    xx=(x-m['westMeters'])/level['spacingMeters'];yy=(y-m['southMeters'])/level['spacingMeters'];ix=min(level['width']-2,math.floor(xx));iy=min(level['height']-2,math.floor(yy));fx=xx-ix;fy=yy-iy;i=iy*level['width']+ix
    a,b,c,d=[heights[j] for j in [i,i+1,i+level['width'],i+level['width']+1]]
    assert -32768 not in [a,b,c,d]
    return a+(b-a)*fx+(c-a)*fy if fx+fy<=1 else d+(c-d)*(1-fx)+(b-d)*(1-fy)
target=pose['target'];camera=pose['position'];distance=math.hypot(camera[0]-target[0],camera[1]-target[1]);samples=[]
for i in range(1001):
    f=i/1000;x=target[0]+(camera[0]-target[0])*f;y=target[1]+(camera[1]-target[1])*f
    samples.append((f*distance,elevation(x,y),target[2]+(camera[2]-target[2])*f))
image=Image.new('RGB',(1100,510),'#101b26');d=ImageDraw.Draw(image);left,right,top,bottom=85,1030,90,405;maximum=math.ceil(camera[2]/500)*500
xy=lambda dist,height:(left+dist/distance*(right-left),bottom-height/maximum*(bottom-top))
d.text((32,18),'Camera clearance | actual 50 m DEM | Atlas at 10.00 s',font=font(25),fill='#f3e6cc')
for height in range(0,maximum+1,500):
    y=xy(0,height)[1];d.line((left,y,right,y),fill='#2e4050');d.text((12,y-9),str(height),font=font(15),fill='#bac8d3')
ground=[xy(s[0],s[1]) for s in samples];d.polygon([(left,bottom),*ground,(right,bottom)],fill='#445a48');d.line(ground,fill='#adba86',width=3)
d.line([xy(s[0],s[2]) for s in samples],fill='#f3c76a',width=3)
for location,label in [(xy(0,target[2]),'look-at / marker'),(xy(distance,camera[2]),'camera')]:
    x,y=location;d.ellipse((x-5,y-5,x+5,y+5),fill='#f3c76a');d.text((max(left,min(right-155,x+12)),y-(60 if label.startswith('look') else 24)),label,font=font(17),fill='#f3c76a')
d.text((left,bottom+14),f'0 m                      horizontal ray distance: {distance:.0f} m',font=font(16),fill='#bac8d3')
d.text((32,455),f'Camera clearance (conservative cell ceiling): {pose["clearance"]:.1f} m. Mesh and source GPX heights remain separate.',font=font(16),fill='#e9e6db')
d.text((32,480),'© Kartverket / CC BY 4.0. Quantised 50 m surface; vertical datum unspecified. No claim about real flight safety.',font=font(14),fill='#bac8d3')
image.save(output/'terrain-clearance.png')
def read(name):return json.loads((root/name).read_text())
def memory(name):
    raw=read(name);stages=raw['stages'];samples=raw['samples'];times=[s['unixMs'] for s in samples];intervals=[b-a for a,b in zip(times,times[1:])]
    return dict(sourceCommit=raw['sourceCommit'],uncommitted=raw['uncommitted'],pointCount=raw['pointCount'],gpxBytes=raw['gpxBytes'],method=raw['method'],audit=raw['audit'],samples=len(samples),sampleIntervalMs=[min(intervals),max(intervals)],privatePeakBytes=max(s['privateSumBytes'] for s in samples),workingSetPeakBytes=max(s['workingSetSumBytes'] for s in samples),largestStageSampledJsHeapBytes=max(s[k]['JSHeapUsedSize'] for s in stages for k in ['heapBefore','heapAfter']),stages=[dict(label=s['label'],privateBytes=s['lastNative']['privateSumBytes'] if s['lastNative'] else None,workingSetBytes=s['lastNative']['workingSetSumBytes'] if s['lastNative'] else None,jsHeap=s['heapAfter']) for s in stages if s['label']=='baseline' or s['label'].endswith('retained') or s['label'] in ['test-only-gc','page-unload']])
performance=read('artifacts/sprint8/performance-final/comparison.json');acceptance=read('artifacts/sprint8/final/acceptance.json');matrix=read('artifacts/sprint8/compatibility/matrix.json')
evidence=dict(schema=1,date='2026-10-09',candidate=True,published=False,acceptance=acceptance,camera=audit,performance=dict(sourceCommit=performance['sourceCommit'],uncommitted=performance['uncommitted'],os=performance['os'],browser=performance['browser'],method=performance['method'],gpxBytes=performance['gpxBytes'],reports=[dict(mode=r['mode'],quality=r['quality'],aspect=r['aspect'],duration=r['duration'],summary=r['summary']) for r in performance['reports']]),memory=dict(baseline2D=memory('artifacts/sprint8/memory/cinematic.json'),initial3D=memory('artifacts/sprint8/memory/terrain.json'),allocationOptimised3D=memory('artifacts/sprint8/memory-after/terrain.json'),final3D=memory('artifacts/sprint8/memory-final/terrain.json')),browserMatrix=[dict(name=r['name'],os=r['os'],version=r.get('version'),status=r['status'],terrain=r.get('preview',{}).get('terrain'),deterministic=r.get('preview',{}).get('deterministic'),codec=r.get('preview',{}).get('codec'),bytes=r.get('preview',{}).get('bytes'),error=r.get('preview',{}).get('error')) for r in matrix],projection=read('artifacts/sprint8/projection.json'))
(root/'docs/TERRAIN_EVIDENCE.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf8')
print('Created four decoded-frame contact sheets and a measured clearance profile.')
