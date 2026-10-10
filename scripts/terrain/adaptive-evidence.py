"""Only resize/label actual independently decoded video frames; no retouching."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path('artifacts/sprint9/adaptive-full'); output=Path('docs/images');output.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
for style,aspect,duration,size in [('atlas','landscape',20,(384,216)),('night','portrait',30,(270,480))]:
    columns=['dem','single','photo','corridor']; labels=['DEM / original camera','Photo20m / same camera','Photo10/40m / same camera','Photo10/40m / corridor']
    sheet=Image.new('RGB',(size[0]*4,size[1]+60),'#15212b'); draw=ImageDraw.Draw(sheet)
    for i,(mode,label) in enumerate(zip(columns,labels)):
        frame=root/f'{style}-{aspect}-standard-{mode}-{duration/2:.2f}s.png'
        sheet.paste(Image.open(frame).resize(size,Image.Resampling.LANCZOS),(i*size[0],60));draw.text((i*size[0]+8,12),label,font=font,fill='white')
        draw.text((i*size[0]+8,34),f'Same GPX, {duration/2:.2f}s, actual MP4',font=font,fill='white')
    sheet.save(output/f'adaptive-{style}-comparison.jpg',quality=92)
    times=[0,1,2,duration/4,duration/2,duration-1/24]
    sheet=Image.new('RGB',(size[0]*3,(size[1]+40)*2),'#15212b');draw=ImageDraw.Draw(sheet)
    for i,time in enumerate(times):
        x=(i%3)*size[0];y=(i//3)*(size[1]+40)
        frame=root/f'{style}-{aspect}-standard-corridor-{time:.2f}s.png'
        sheet.paste(Image.open(frame).resize(size,Image.Resampling.LANCZOS),(x,y+40));draw.text((x+8,y+10),f'{style.upper()} / {time:.2f}s / decoded MP4',font=font,fill='white')
    sheet.save(output/f'adaptive-{style}-frames.jpg',quality=91)
