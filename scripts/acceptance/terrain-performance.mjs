/** Same-machine, same-route 2D/3D comparison. Opt-in, never routine CI. */
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {withServer} from './server.mjs';
import {validateVideo} from '../validate-video.mjs';
const folder=process.argv.includes('--after')?'artifacts/sprint8/performance-after':'artifacts/sprint8/performance';mkdirSync(folder,{recursive:true});
const spread=v=>{const s=[...v].sort((a,b)=>a-b);return {median:s[Math.floor(s.length/2)],min:s[0],max:s.at(-1)};};
const xml=readFileSync('public/samples/terrain-sogne.gpx','utf8'),reports=[];
await withServer(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
 try{await page.goto(url);for(const mode of process.argv.includes('--terrain-only')?['terrain']:['cinematic','terrain'])for(const [quality,aspect,duration] of [['compatibility','landscape',20],['standard','landscape',20],['standard','portrait',30]]){
  const runs=[];for(let repeat=0;repeat<4;repeat++){
   const r=await page.evaluate(async({xml,mode,quality,aspect,duration})=>{
    const paths=['/src/terrain-renderer.ts','/src/terrain.ts','/src/renderer.ts','/src/geography.ts','/src/gpx.ts','/src/story.ts','/src/exporter.ts'];
    const [{TerrainRenderer},{loadTerrain},{RouteRenderer},{loadGeography},{parseGpx},{defaultStoryConfig,exportSettings},{exportVideo,detectEncoder}]=await Promise.all(paths.map(p=>import(p)));
    let begin=performance.now();const route=parseGpx(xml),parseMs=performance.now()-begin,config={...defaultStoryConfig('Synthetic benchmark'),cameraMode:mode,qualityPreset:quality,aspectRatio:aspect,durationSeconds:duration,visualStyle:aspect==='portrait'?'night':'atlas'},settings=exportSettings(config);
    begin=performance.now();const data=mode==='terrain'?await loadTerrain(quality):{features:[],geography:await loadGeography()},loadMs=performance.now()-begin;
    begin=performance.now();const renderer=mode==='terrain'?new TerrainRenderer(route,data,settings.width,settings.height,config):new RouteRenderer(route,data,settings.width,settings.height,config.visualStyle,config),prepareMs=performance.now()-begin,c=document.createElement('canvas');c.width=settings.width;c.height=settings.height;
    try{begin=performance.now();renderer.draw(c,0);const firstFrameMs=performance.now()-begin,frames=[],seek=[];for(let i=0;i<30;i++){begin=performance.now();renderer.draw(c,i*duration/29);frames.push(performance.now()-begin);}for(const t of [.1,.9,.2,.8,.3,.7]){begin=performance.now();renderer.draw(c,t*duration);seek.push(performance.now()-begin);}
     const codec=await detectEncoder(settings.width,settings.height,settings.bitrate);begin=performance.now();window.terrainBenchmarkBlob=await exportVideo({config,draw:(target,t)=>renderer.draw(target,t)});
     const exportMs=performance.now()-begin,gpu=mode==='terrain'?{vertices:renderer.terrainGeometry.attributes.position.count,triangles:renderer.terrainGeometry.index.count/3,drawCalls:renderer.gpu.info.render.calls}:null;
     return {pointCount:route.pointCount,distanceKm:route.distanceKm,parseMs,loadMs,prepareMs,firstFrameMs,frames,seek,exportMs,bytes:window.terrainBenchmarkBlob.size,codec,gpu,...settings};
    }finally{renderer.dispose();c.width=c.height=0;}
   },{xml,mode,quality,aspect,duration});r.warmup=repeat===0;runs.push(r);
   if(repeat===3){const pending=page.waitForEvent('download');await page.evaluate(()=>{const u=URL.createObjectURL(window.terrainBenchmarkBlob),a=document.createElement('a');a.href=u;a.download='benchmark.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});const path=`${folder}/${mode}-${quality}-${aspect}.mp4`;await(await pending).saveAs(path);r.video=validateVideo(path,r.width,r.height,duration);}
   await page.evaluate(()=>delete window.terrainBenchmarkBlob);
  }
  const steady=runs.slice(1),summary=Object.fromEntries(['parseMs','loadMs','prepareMs','firstFrameMs','exportMs','bytes'].map(k=>[k,spread(steady.map(r=>r[k]))]));summary.frames=spread(steady.flatMap(r=>r.frames));summary.seek=spread(steady.flatMap(r=>r.seek));reports.push({mode,quality,aspect,duration,runs,summary});console.log({mode,quality,aspect,duration,summary});
 }}finally{writeFileSync(`${folder}/comparison.json`,JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),uncommitted:true,os:`${os.type()} ${os.release()} ${os.arch()}`,browser:browser.version(),method:'One warm-up then3 steady repeats, same721-point synthetic route; frame timing includes destination Canvas draw/copy but is not a GPU timer. Native/GPU memory measured separately or unmeasured.',gpxBytes:Buffer.byteLength(xml),reports},null,2));await browser.close();}
});
