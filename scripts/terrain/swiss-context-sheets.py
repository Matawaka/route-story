"""Decoded geographic-detail comparison; other studies explicitly renderer captures."""
import os,pathlib,subprocess
from PIL import Image,ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[2];folder=ROOT/'artifacts/swiss-phase-c/final';out=ROOT/'docs/images';out.mkdir(parents=True,exist_ok=True);ffmpeg=os.environ['FFMPEG_PATH']
def decoded(movie,time,name):
    p=folder/name;subprocess.run([ffmpeg,'-v','error','-y','-ss',str(time),'-i',str(movie),'-frames:v','1',str(p)],check=True,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0);return p
def sheet(name,title,rows,width=600):
    im0=Image.open(rows[0][0][0]);height=round(width*im0.height/im0.width);result=Image.new('RGB',(2*width,45+len(rows)*(height+32)),(18,27,33));draw=ImageDraw.Draw(result);draw.text((10,10),title,fill='white')
    for i,row in enumerate(rows):
        for j,(path,label) in enumerate(row):
            y=45+i*(height+32);draw.text((j*width+10,y),label,fill='white');result.paste(Image.open(path).convert('RGB').resize((width,height),Image.Resampling.LANCZOS),(j*width,y+28))
    result.save(out/name,quality=88)
for aspect,duration in [('landscape',20),('portrait',30)]:
    rows=[];before=[]
    for i,t in enumerate([0,duration*.25,duration*.5,duration-1/24]):
        low=decoded(folder/f'{aspect}-low10m-{duration}s.mp4',t,f'{aspect}-low-decoded-{i}.png');high=decoded(folder/f'{aspect}-high-{duration}s.mp4',t,f'{aspect}-high-decoded-{i}.png');old=decoded(ROOT/f'artifacts/swiss-phase-c/reference-02b/{aspect}-high-{duration}s.mp4',t,f'{aspect}-original-decoded-{i}.png')
        rows.append([(low,f'10m control | decoded {t:.3f}s'),(high,f'detailed | decoded {t:.3f}s')]);before.append([(old,f'PR11 original | decoded {t:.3f}s'),(high,f'Phase C | decoded {t:.3f}s')])
    sheet(f'swiss-context-{aspect}-detail.jpg','SAME camera / mesh / route / marker / MP4 | synthetic demo | © swisstopo',rows,600 if aspect=='landscape' else 300)
    sheet(f'swiss-context-{aspect}-before-after.jpg','OVERALL before/after: coverage + mesh + composition + dynamics | © swisstopo',before,600 if aspect=='landscape' else 300)
for kind,keys,count in [('geometry',['low','high'],4),('composition',['reference','route'],5)]:
    rows=[[(folder/f'studies/{kind}-{k}-{i}.png',f'{k} | source renderer frame{i}') for k in keys] for i in range(count)]
    title='SAME camera | 50m / 5m geometry | source frames, not decoded MP4 | © swisstopo' if kind=='geometry' else 'SAME imagery/mesh/timeline | overview composition only | source frames | © swisstopo'
    sheet(f'swiss-context-{kind}.jpg',title,rows)
print('Actual decoded detail/overall sheets and separately labelled renderer studies saved.')
