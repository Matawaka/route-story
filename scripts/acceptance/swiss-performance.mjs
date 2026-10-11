/** Opt-in fixed Swiss pack; one warm-up and three identical steady trials. */
import{chromium}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';import{withServer}from'./server.mjs';import{validateVideo}from'../validate-video.mjs';
if(process.env.SWISS_PILOT!=='1')throw Error('Explicit SWISS_PILOT=1 and prepared local OGD sources required.');
const folder='artifacts/sprint11/swiss/performance';mkdirSync(folder,{recursive:true});const reports=[];
const spread=values=>{const a=[...values].sort((x,y)=>x-y);return{median:a[Math.floor(a.length/2)],min:a[0],max:a.at(-1)};};
await withServer(async url=>{for(const low of [true,false]){
 const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}),page=await browser.newPage(),cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const heap=async()=>(await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='JSHeapUsedSize').value;
 try{await page.goto(url);const baselineHeap=await heap(),cycles=[];for(const aspect of ['landscape','portrait']){
  const runs=[];for(let repeat=0;repeat<4;repeat++){
   const result=await page.evaluate(async({low,aspect})=>{
    const[{TerrainRenderer},{loadSwissTerrain,loadSwissImagery,loadSwissRoute},{loadTraveler},{parseGpx},{defaultStoryConfig,exportSettings},{exportVideo}]=await Promise.all(['/src/terrain-renderer.ts','/src/swiss-pilot.ts','/src/traveler.ts','/src/gpx.ts','/src/story.ts','/src/exporter.ts'].map(p=>import(p)));
    let start=performance.now();const terrain=await loadSwissTerrain(),imagery=await loadSwissImagery(low),source=await loadTraveler(),route=parseGpx(await loadSwissRoute()),loadMs=performance.now()-start,config={...defaultStoryConfig('Synthetic Swiss comparison'),durationSeconds:10,qualityPreset:'standard',aspectRatio:aspect,visualStyle:aspect==='portrait'?'night':'atlas',cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',marker:'traveler',markerSize:'small'},settings=exportSettings(config);
    start=performance.now();const r=new TerrainRenderer(route,terrain,settings.width,settings.height,config,imagery,source),prepareMs=performance.now()-start,c=document.createElement('canvas');try{
     const frameMs=[];for(let i=0;i<30;i++){start=performance.now();r.draw(c,10*i/29);frameMs.push(performance.now()-start);}
     const abort=new AbortController();let cancelled=false;try{await exportVideo({config,signal:abort.signal,draw:(c,t)=>{r.draw(c,t);if(t>0)abort.abort();}});}catch(e){cancelled=e.name==='AbortError';}
     start=performance.now();window.swissBench=await exportVideo({config,draw:(c,t)=>r.draw(c,t)});return{loadMs,prepareMs,exportMs:performance.now()-start,frameMs,bytes:window.swissBench.size,textures:r.gpu.info.memory.textures,vertices:r.terrainGeometry.attributes.position.count,cancelled,...settings,userAgent:navigator.userAgent};
    }finally{r.dispose();c.width=c.height=0;}
   },{low,aspect});runs.push(result);cycles.push({aspect,repeat,heapAfterDispose:await heap()});
  }
  const path=`${folder}/${low?'low10m':'high'}-${aspect}-10s.mp4`,download=page.waitForEvent('download');await page.evaluate(()=>{const u=URL.createObjectURL(window.swissBench),a=document.createElement('a');a.href=u;a.download='swiss-benchmark.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});await(await download).saveAs(path);validateVideo(path,runs[0].width,runs[0].height,10);await page.evaluate(()=>delete window.swissBench);
  const steady=runs.slice(1),summary={loadMs:spread(steady.map(r=>r.loadMs)),prepareMs:spread(steady.map(r=>r.prepareMs)),exportMs:spread(steady.map(r=>r.exportMs)),frameMs:spread(steady.flatMap(r=>r.frameMs)),bytes:spread(steady.map(r=>r.bytes))};reports.push({mode:low?'low10m':'high',aspect,duration:10,warmup:runs[0],runs:steady,summary});console.log(JSON.stringify({mode:low?'low10m':'high',aspect,summary}));
 }
 const retainedHeap=await heap();await cdp.send('HeapProfiler.collectGarbage');reports.push({mode:low?'low10m':'high',heap:{baselineHeap,retainedHeap,afterTestOnlyGC:await heap(),cycles}});
 }finally{await browser.close();}
}});
writeFileSync(`${folder}/summary.json`,JSON.stringify({method:'Isolated Edge sessions; same26point Swiss route/2m DEM/camera/720p24fps. One warmup+3steady per aspect;10s videos; export cancelled before each successful retry. CPU draw submission+copy is not GPU timer. CDP JS heap, test-onlyGC: never production. Native/VRAM peaks NOT MEASURED.',nativeMemory:'NOT MEASURED',gpuMemory:'NOT MEASURED',reports},null,2));
