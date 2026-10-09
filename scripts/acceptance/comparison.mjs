import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ffmpeg from 'ffmpeg-static';
import { withServer } from './server.mjs';
import { validateVideo } from '../validate-video.mjs';
import { cinematicGpx } from '../../tests/fixtures/cinematic.ts';

const stable='5f39332b7358949d248da6b2f99ba445ee1b41e8',folder='artifacts/sprint7/comparison';
mkdirSync('.reference',{recursive:true});mkdirSync(folder,{recursive:true});
// Actual immutable renderer, not a recreation. Only module paths are adapted to the dev server.
const source=execFileSync('git',['show',`${stable}:src/renderer.ts`],{encoding:'utf8',windowsHide:true});
writeFileSync('.reference/sprint7-v1-renderer.ts',source.replaceAll("from './","from '/src/"));
await withServer(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),reports=[];
 try{
  await page.goto(url);
  for(const [style,aspect,duration] of [['atlas','landscape',20],['night','portrait',30]]){
   const config={durationSeconds:duration,introSeconds:2,outroSeconds:2,title:style==='atlas'?'Между островами':'Свет фьордов',visualStyle:style,aspectRatio:aspect,qualityPreset:'standard',cameraMode:'classic'};
   await page.evaluate(async({xml,config})=>{
    const paths=['/.reference/sprint7-v1-renderer.ts','/src/gpx.ts','/src/exporter.ts'];
    const [{RouteRenderer},{parseGpx},{exportVideo}]=await Promise.all(paths.map(p=>import(p))),land=await(await fetch('/maps/ne_110m_land.geojson')).json();
    const w=config.aspectRatio==='portrait'?720:1280,h=config.aspectRatio==='portrait'?1280:720,renderer=new RouteRenderer(parseGpx(xml),land,w,h,config.visualStyle,config);
    try{const blob=await exportVideo({config,draw:(c,t)=>renderer.draw(c,t)});window.comparisonBlob=blob;}finally{renderer.dispose();}
   },{xml:cinematicGpx(),config});
   const pending=page.waitForEvent('download');await page.evaluate(()=>{const url=URL.createObjectURL(window.comparisonBlob),a=document.createElement('a');a.href=url;a.download='baseline.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
   const path=`${folder}/v1-${style}-${duration}s.mp4`;await(await pending).saveAs(path);await page.evaluate(()=>{delete window.comparisonBlob;});
   const width=aspect==='portrait'?720:1280,height=aspect==='portrait'?1280:720,video=validateVideo(path,width,height,duration);
   reports.push({rendererCommit:stable,route:'same synthetic 700-point cinematic-fjords.gpx',style,aspect,duration,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),video});
  }
  writeFileSync(`${folder}/controlled-baseline.json`,JSON.stringify({browser:browser.version(),reports},null,2));
 }finally{await browser.close();}
});

// Contact sheets consist of actual decoded video frames, never preview-only CSS or generated art.
const atlasTimes=[1,2,10,19.958333],nightTimes=[1,2,15,29.958333];
const groups=[
 ['atlas',atlasTimes,`artifacts/sprint6/downloaded-assets/atlas-20s.mp4`,`${folder}/v1-atlas-20s.mp4`,'artifacts/sprint7/cinematic/atlas-20s.mp4'],
 ['night',nightTimes,`artifacts/sprint6/downloaded-assets/night-30s.mp4`,`${folder}/v1-night-30s.mp4`,'artifacts/sprint7/cinematic/night-30s.mp4']
];
const sheets=[];
for(const [style,times,...videos] of groups){
 const rows=[];
 for(let row=0;row<videos.length;row++){
  if(!existsSync(videos[row]))throw new Error(`Missing reviewed comparison source: ${videos[row]}`);
  const frames=[];
  for(const time of times){const path=`${folder}/${style}-${row}-${time}.png`;execFileSync(ffmpeg,['-y','-ss',String(time),'-i',videos[row],'-frames:v','1',path],{windowsHide:true,stdio:'ignore'});frames.push({time,image:`data:image/png;base64,${readFileSync(path).toString('base64')}`});}
  rows.push({label:['Published v1.0.0 · original release route','v1.0.0 renderer · same 700-point route','v1.1 RC · same 700-point route'][row],frames});
 }
 sheets.push({style,rows});
}
mkdirSync('docs/images',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 for(const sheet of sheets){
  const data=await page.evaluate(async({style,rows})=>{
   const cellW=style==='night'?240:416,cellH=style==='night'?427:234,margin=16,labelH=30;
   const canvas=document.createElement('canvas');canvas.width=4*cellW+2*margin;canvas.height=rows.length*(cellH+labelH+margin)+margin;const ctx=canvas.getContext('2d');ctx.fillStyle='#111c26';ctx.fillRect(0,0,canvas.width,canvas.height);
   for(let r=0;r<rows.length;r++){
    const y=margin+r*(cellH+labelH+margin);ctx.fillStyle='#f4efe5';ctx.font='15px sans-serif';ctx.fillText(rows[r].label,margin,y+19);
    for(let i=0;i<rows[r].frames.length;i++){const frame=rows[r].frames[i],img=new Image();img.src=frame.image;await img.decode();const x=margin+i*cellW;ctx.drawImage(img,x,y+labelH,cellW,cellH);ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(x+5,y+labelH+5,58,22);ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.fillText(`${frame.time.toFixed(2)}s`,x+10,y+labelH+21);}
   }
   return canvas.toDataURL('image/png').split(',')[1];
  },sheet);
  writeFileSync(`docs/images/cinematic-${sheet.style}-comparison.png`,Buffer.from(data,'base64'));
 }
}finally{await browser.close();}
console.log('Controlled baseline MP4s independently decoded; two contact sheets written from actual video frames.');
