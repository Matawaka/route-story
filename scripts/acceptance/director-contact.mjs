import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import ffmpeg from 'ffmpeg-static';

// Decode, resize, and label actual MP4 pixels. No geographic retouching.
// Only explicitly synthetic Furka sheets may be committed; owner GPX stays ignored.
const label=process.argv[2]??'furka',aspect=process.argv[3]??'portrait';
assert.ok(['furka','mont-blanc','malerweg'].includes(label));assert.ok(['landscape','portrait'].includes(aspect));
assert.ok(label==='furka'||aspect==='portrait');
const duration=aspect==='portrait'?30:20,dir=`artifacts/high-resolution/director-review-${label}-ab-fullhd`,report=JSON.parse(readFileSync(`${dir}/acceptance.json`));
assert.equal(report.status,'VERIFIED LOCAL');
const modes=['terrain','director'],videos=modes.map(mode=>report.outputs.find(v=>v.camera.mode===mode&&v.duration===duration&&v.width>v.height===(aspect==='landscape')));
assert.ok(videos.every(Boolean));assert.deepEqual(videos[0].sceneIdentity,videos[1].sceneIdentity,'only camera changes');assert.deepEqual(videos[0].encoder,videos[1].encoder,'same encoder settings');
const times=[0,duration*.2,duration*.4,duration*.65,duration-1/24].map(t=>Math.floor(t*24)/24),cellW=aspect==='portrait'?270:360,cellH=aspect==='portrait'?480:203;
const temp=`${dir}/contact`;mkdirSync(temp,{recursive:true});
const inputs=[];for(const [row,video]of videos.entries())for(const [col,t]of times.entries()){
 const file=`${temp}/${row}-${col}.png`,r=spawnSync(ffmpeg,['-v','error','-i',video.file,'-ss',String(t),'-frames:v','1','-vf',`scale=${cellW}:${cellH}:flags=lanczos`,'-y',file],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);inputs.push(file);
}
const font=process.platform==='win32'?'C\\:/Windows/Fonts/segoeui.ttf':'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const tiles=inputs.map((_,i)=>`[${i}:v]pad=${cellW}:${cellH+36}:0:36:color=0x142433,drawtext=fontfile='${font}':text='${i<5?'A Follow':'B Director'}  ${times[i%5].toFixed(2)} s':fontsize=18:fontcolor=white:x=8:y=6[p${i}]`).join(';');
const graph=tiles+';'+[0,1].map(row=>Array.from({length:5},(_,col)=>`[p${row*5+col}]`).join('')+`hstack=inputs=5[row${row}]`).join(';')+';[row0][row1]vstack=inputs=2,pad=iw:ih+44:0:0:color=0x142433'+`,drawtext=fontfile='${font}':text='${label==='furka'?'Furka · synthetic road fixture · © swisstopo':'Private owner GPX · local review only'} · same data / timestamps / encoding':fontsize=18:fontcolor=white:x=8:y=h-32[v]`;
const out=label==='furka'?`docs/evidence/director-furka-${aspect}-comparison.jpg`:`${dir}/comparison.jpg`;
mkdirSync('docs/evidence',{recursive:true});const result=spawnSync(ffmpeg,['-v','error',...inputs.flatMap(f=>['-i',f]),'-filter_complex',graph,'-map','[v]','-frames:v','1','-q:v','2','-y',out],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);
writeFileSync(`${temp}/frames.json`,JSON.stringify({label,aspect,duration,times,sourceCommit:report.sourceCommit,onlyCameraChanges:true,output:out,private:label!=='furka'},null,2));console.log(out);
