/** Same machine/reviewed source vs opt-in grade+icon; synthetic data only.
 * First git archive main src into ignored artifacts/sprint10/baseline.
 * No forced production GC, OS policy changes or hardware collection.
 */
import {chromium} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import os from 'node:os';
import {withServer} from './server.mjs';
import {validateVideo} from '../validate-video.mjs';
const folder=process.env.ACCEPTANCE_DIR||'artifacts/sprint10/performance';mkdirSync(folder,{recursive:true});
const spread=values=>{const a=[...values].sort((a,b)=>a-b);return{median:a[Math.floor(a.length/2)],min:a[0],max:a.at(-1)};};
const only=process.argv.includes('--dynamics-only'),previous=only&&existsSync(`${folder}/summary.json`)?JSON.parse(readFileSync(`${folder}/summary.json`)):undefined;
const reports=previous?previous.reports.filter(r=>r.mode!=='dynamics'):[],heaps=previous?previous.heaps.filter(r=>r.mode!=='dynamics'):[];
await withServer(async url=>{for(const mode of only?['dynamics']:['baseline','current-default','dynamics']){
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const heap=async()=>(await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='JSHeapUsedSize').value;
 try{await page.goto(url);const beforeHeap=await heap();
  for(const [quality,aspect,duration] of [['compatibility','landscape',10],['standard','landscape',10],['standard','portrait',30]]){
   const runs=[];for(let repeat=0;repeat<4;repeat++)runs.push(await page.evaluate(async({mode,quality,aspect,duration})=>{
    const prefix=mode==='baseline'?'/artifacts/sprint10/baseline/src/':'/src/';const [{TerrainRenderer},{loadTerrain},{loadImagery},{parseGpx},{defaultStoryConfig,exportSettings},{exportVideo}]=await Promise.all(['terrain-renderer.ts','terrain.ts','imagery.ts','gpx.ts','story.ts','exporter.ts'].map(p=>import(prefix+p)));
    const xml=await(await fetch('/samples/terrain-sogne.gpx')).text(),route=parseGpx(xml),config={...defaultStoryConfig('Synthetic comparison'),visualStyle:aspect==='portrait'?'night':'atlas',qualityPreset:quality,aspectRatio:aspect,durationSeconds:duration,cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',...(mode==='dynamics'?{marker:'unicycle',routeColor:'grade',replayPacing:'terrain'}:{})},settings=exportSettings(config),terrain=await loadTerrain(quality),image=await loadImagery();
    let start=performance.now();const r=new TerrainRenderer(route,terrain,settings.width,settings.height,config,image),prepareMs=performance.now()-start,c=document.createElement('canvas');
    try{const frames=[];for(let i=0;i<30;i++){start=performance.now();r.draw(c,duration*i/29);frames.push(performance.now()-start);}
     start=performance.now();window.benchmarkVideo=await exportVideo({config,draw:(target,t)=>r.draw(target,t)});const exportMs=performance.now()-start;
     const route=r.scene.children.find(o=>o.material?.type==='ShaderMaterial');return{prepareMs,frames,exportMs,bytes:window.benchmarkVideo.size,textures:r.gpu.info.memory.textures,routeAttributeBytes:Object.values(route.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),...settings};
    }finally{r.dispose();c.width=c.height=0;}
   },{mode,quality,aspect,duration}));
   const last=runs.at(-1),pending=page.waitForEvent('download');await page.evaluate(()=>{const u=URL.createObjectURL(window.benchmarkVideo),a=document.createElement('a');a.href=u;a.download='bench.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});const path=`${folder}/${mode}-${quality}-${aspect}.mp4`;await(await pending).saveAs(path);validateVideo(path,last.width,last.height,duration);await page.evaluate(()=>delete window.benchmarkVideo);
   const steady=runs.slice(1);reports.push({mode,quality,aspect,duration,visualStyle:aspect==='portrait'?'night':'atlas',warmup:runs[0],runs:steady,summary:{prepareMs:spread(steady.map(r=>r.prepareMs)),frameMs:spread(steady.flatMap(r=>r.frames)),exportMs:spread(steady.map(r=>r.exportMs)),bytes:spread(steady.map(r=>r.bytes))}});
  }
  const retainedHeap=await heap();await cdp.send('HeapProfiler.collectGarbage');const afterTestGC=await heap();await page.goto('about:blank');heaps.push({mode,beforeHeap,retainedHeap,afterTestGC,unloadHeap:await heap()});console.log({mode,results:reports.filter(r=>r.mode===mode).map(r=>({quality:r.quality,aspect:r.aspect,...r.summary})),heap:heaps.at(-1)});
 }finally{await browser.close();}
}
});
await withServer(async url=>{const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();try{await page.goto(url);const profile=await page.evaluate(async()=>{const {RouteDynamics}=await import('/src/route-dynamics.ts'),{routeMetrics}=await import('/src/geo.ts'),values=[];for(let run=0;run<4;run++){const segments=[Array.from({length:50000},(_,i)=>({lon:6+i*.000001,lat:61,elevation:100+Math.sin(i/1000)*20}))],route={name:'Synthetic 50k',segments,...routeMetrics(segments)},start=performance.now(),p=new RouteDynamics(route);values.push({ms:performance.now()-start,points:p.path.segments[0].length,edges:p.edges.length});}return values;});writeFileSync(`${folder}/summary.json`,JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),uncommitted:true,baseline:'126dd98805594a1547b858c02922dfa565c24b81',os:`${os.type()} ${os.release()} ${os.arch()}`,browser:browser.version(),method:'Isolated Edge per mode; one warm-up, three steady repeats. Same synthetic721-point GPX/resident imagery. Draw wall-time includes submission/copy; not a GPU timer. CDP JS heap separate from native memory. Test-only GC never in production.',nativeMemory:'NOT MEASURED: policy-bypassing legacy sampler rejected; no policy override used.',gpuMemory:'NOT MEASURED; geometry byte lengths and texture counts are bounded resource accounting, not VRAM measurement.',reports,heaps,profile50k:{warmup:profile[0],steady:profile.slice(1),ms:spread(profile.slice(1).map(r=>r.ms))}},null,2));}finally{await browser.close();}});
