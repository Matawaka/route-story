"""Contact sheets only resize actual independently decoded MP4 frames."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path('artifacts/sprint9/imagery');output=Path('docs/images');output.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
for style,aspect,size in [('atlas','landscape',(640,360)),('night','portrait',(360,640))]:
    sheet=Image.new('RGB',(size[0]*2, size[1]+60),'#15212b');d=ImageDraw.Draw(sheet)
    for x,surface in enumerate(['dem','photo']):
        file=root/f'{style}-{aspect}-standard-{surface}-5.00s.png';sheet.paste(Image.open(file).resize(size,Image.Resampling.LANCZOS),(x*size[0],60));d.text((x*size[0]+15,15),f'{surface.upper()} / same route, camera, 5.00s',font=font,fill='white')
    sheet.save(output/f'imagery-{style}-comparison.jpg',quality=90)
    sheet=Image.new('RGB',(size[0]*3,size[1]*2+80),'#15212b');d=ImageDraw.Draw(sheet)
    for i,t in enumerate(['0.00','1.00','2.00','5.00','8.00','9.96']):
        col=i%3;row=i//3;file=root/f'{style}-{aspect}-standard-photo-{t}s.png';sheet.paste(Image.open(file).resize(size,Image.Resampling.LANCZOS),(col*size[0],row*(size[1]+40)+40));d.text((col*size[0]+12,row*(size[1]+40)+10),f'{style.upper()} / {t}s / actual decoded MP4',font=font,fill='white')
    sheet.save(output/f'imagery-{style}-frames.jpg',quality=87)
