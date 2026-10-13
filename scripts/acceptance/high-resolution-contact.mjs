import{spawnSync}from'node:child_process';import{mkdirSync}from'node:fs';import assert from'node:assert/strict';import ffmpeg from'ffmpeg-static';
// Synthetic Furka only: same route/20s duration/10s timestamp/style/camera.
const folders=['furka-720-regression-standard','furka-final-fullhd','furka-final-ultra'];mkdirSync('docs/evidence',{recursive:true});
const font=process.platform==='win32'?'C\\:/Windows/Fonts/segoeui.ttf':'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const args=['-v','error',...folders.flatMap(f=>['-i',`artifacts/high-resolution/${f}/landscape-20s-decoded.png`])];
const graph=folders.map((_,i)=>`[${i}:v]scale=640:360,pad=640:430:0:40:color=0x142433,drawtext=fontfile='${font}':text='${['720p','Full HD 1080p','Ultra HD 4K'][i]}':fontsize=24:fontcolor=white:x=12:y=6[p${i}]`).join(';')+`;[p0][p1][p2]hstack=inputs=3,drawtext=fontfile='${font}':text='Furka · synthetic route · same 10s timestamp · © swisstopo / SWISSIMAGE 2023':fontsize=22:fontcolor=white:x=16:y=400[v]`;
const output='docs/evidence/high-resolution-furka-comparison.png',r=spawnSync(ffmpeg,[...args,'-filter_complex',graph,'-map','[v]','-frames:v','1','-y',output],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);console.log(output);
