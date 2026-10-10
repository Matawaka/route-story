"""Two resident, bounded LODs from the SAME reviewed TCI/SCL crops.
Run prepare-imagery.py first on a fresh checkout to create pinned source crops.
No GPS input, dynamic geographic downloads or invented geographic pixels.
"""
import json, pathlib, subprocess, sys
for level in [40,10]:subprocess.run([sys.executable,'scripts/terrain/prepare-imagery.py','--level',str(level)],check=True)
root=pathlib.Path('public/imagery')
coarse=json.loads((root/'sogne-sentinel-40m.json').read_text())
fine=json.loads((root/'sogne-sentinel-10m.json').read_text())
assert coarse['width']*coarse['height']+fine['width']*fine['height']<=3000000
assert coarse['bytes']+fine['bytes']<=2*1024*1024
coarse['detail']=fine
(root/'sogne-sentinel.json').write_text(json.dumps(coarse,indent=2)+'\n',encoding='utf8')
for level in [40,10]:(root/f'sogne-sentinel-{level}m.json').unlink()
print(json.dumps({'imageBytes':coarse['bytes']+fine['bytes'],'pixels':coarse['width']*coarse['height']+fine['width']*fine['height'],'levels':[40,10]}))
