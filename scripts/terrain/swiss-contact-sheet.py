"""Actual FFmpeg-decoded A/B frames; no CSS preview or sharpening."""
import os, pathlib, subprocess
from PIL import Image, ImageDraw
root=pathlib.Path(__file__).resolve().parents[2];folder=root/'artifacts/sprint11/swiss';out=root/'docs/images';out.mkdir(parents=True,exist_ok=True)
ffmpeg=os.environ['FFMPEG_PATH']
for aspect,duration in [('landscape',20),('portrait',30)]:
    width=600 if aspect=='landscape' else 300;height=round(width*(720/1280 if aspect=='landscape' else 1280/720))
    times=[0,duration*.25,duration*.5,duration-1/24];sheet=Image.new('RGB',(width*2,height*len(times)+len(times)*32+45),(20,27,34));draw=ImageDraw.Draw(sheet)
    draw.text((12,10),'SAME CAMERA / DEM / MP4 settings | synthetic Furka demo | © swisstopo',fill='white')
    for row,t in enumerate(times):
        for col,mode in enumerate(['low10m','high']):
            movie=folder/f'{aspect}-{mode}-{duration}s.mp4';p=folder/f'{aspect}-{mode}-decoded-{row}.png'
            subprocess.run([ffmpeg,'-v','error','-y','-ss',str(t),'-i',str(movie),'-frames:v','1',str(p)],check=True,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
            im=Image.open(p).convert('RGB').resize((width,height),Image.Resampling.LANCZOS);y=45+row*(height+32)
            draw.text((col*width+10,y),f'{mode}: decoded t={t:.3f}s',fill='white');sheet.paste(im,(col*width,y+28))
    sheet.save(out/f'swiss-{aspect}-comparison.jpg',quality=88)
geom=folder/'geometry';sheet=Image.new('RGB',(1200,4*369+35),(20,27,34));draw=ImageDraw.Draw(sheet);draw.text((10,8),'SAME conservative camera | 50m subsampled mesh / original 2m mesh | © swisstopo',fill='white')
for row in range(4):
    for col,mode in enumerate(['low','high']):
        im=Image.open(geom/f'{mode}-{row}.png').convert('RGB').resize((600,337),Image.Resampling.LANCZOS);y=35+row*369;draw.text((col*600+10,y),'50m comparison' if mode=='low' else 'swissALTI3D 2m',fill='white');sheet.paste(im,(col*600,y+28))
sheet.save(out/'swiss-geometry-comparison.jpg',quality=88)
print('Decoded MP4 and separately labelled same-camera geometry contact sheets saved.')
