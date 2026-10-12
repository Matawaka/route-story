/** Isolated Windows browser process observations, not VRAM or codec memory. */
import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {withServer} from './server.mjs';
import {validateVideo} from '../validate-video.mjs';
if(os.platform()!=='win32'||process.env.SWISS_PILOT!=='1')throw Error('Prepared local Swiss pack and Windows required.');
const extended=process.argv.includes('--extended'),folder=`artifacts/swiss-phase-c/native-${extended?'extended':'reference'}`;mkdirSync(folder,{recursive:true});
const quote=s=>"'"+s.replaceAll("'","''")+"'";
await withServer(async url=>{
 const server=await chromium.launchServer({channel:'msedge',headless:true,host:'127.0.0.1'}),browser=await chromium.connect(server.wsEndpoint()),rootPid=server.process().pid,file=resolve(`${folder}/process-samples.jsonl`),stop=resolve(`${folder}/stop-${rootPid}`);
 // Execute this reviewed read-only sampler as commands; no ExecutionPolicy change.
 const commands=`$RootPid=${rootPid}\n$OutputFile=${quote(file)}\n$StopFile=${quote(stop)}\n`+readFileSync('scripts/acceptance/sample-memory.ps1','utf8').replace(/^param[^\r\n]*[\r\n]+/,'');
 const sampler=spawn('powershell.exe',['-NoProfile','-Command',commands],{windowsHide:true,stdio:['ignore','pipe','pipe']});let samplerError='';sampler.stderr.on('data',b=>samplerError+=b);
 const page=await browser.newPage(),cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');const stages=[],gpu=[],weak=[];
 const heap=async()=>(await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='JSHeapUsedSize').value;
 const stage=async(label,action)=>{const start=Date.now(),heapBefore=await heap();const result=await action();stages.push({label,start,end:Date.now(),heapBefore,heapAfter:await heap()});return result;};
 try{
  await page.goto(url);await stage('browser-baseline',()=>page.waitForTimeout(2000));
  for(let cycle=0;cycle<3;cycle++)for(const [quality,aspect,duration] of [['compatibility','landscape',10],['standard','landscape',20],['standard','portrait',30]]){
   const metrics=await stage(`cycle${cycle}-${quality}-${aspect}-create-seek-cancel-export-dispose`,()=>page.evaluate(async({extended,quality,aspect,duration,cycle})=>{
    const [{loadSwissTerrain,loadSwissImagery,loadSwissRoute,swissCameraOptions},{loadTraveler},{prepareCustomMarker},{parseGpx},{TerrainRenderer},{defaultStoryConfig,exportSettings},{exportVideo}]=await Promise.all(['/src/swiss-pilot.ts','/src/traveler.ts','/src/marker.ts','/src/gpx.ts','/src/terrain-renderer.ts','/src/story.ts','/src/exporter.ts'].map(p=>import(p)));
    const begin=performance.now(),terrain=await loadSwissTerrain(false,undefined,extended?'extended':'pilot'),imagery=await loadSwissImagery(false,undefined,extended?'extended':'pilot'),route=parseGpx(await loadSwissRoute()),traveler=await loadTraveler(),loadMs=performance.now()-begin;
    const temp=document.createElement('canvas');temp.width=temp.height=1254;temp.getContext('2d').fillRect(0,0,1254,1254);const jpg=await new Promise(r=>temp.toBlob(r,'image/jpeg'));temp.width=temp.height=0;
    const custom=cycle%2?await prepareCustomMarker(new File([jpg],'synthetic-local.jpg',{type:'image/jpeg'})):undefined;
    const config={...defaultStoryConfig('Синтетическое Swiss memory demo'),durationSeconds:duration,qualityPreset:quality,aspectRatio:aspect,visualStyle:aspect==='portrait'?'night':'atlas',cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',marker:custom?'custom':'traveler',markerSize:'small',routeColor:'grade',replayPacing:'terrain'},s=exportSettings(config),r=new TerrainRenderer(route,terrain,s.width,s.height,config,imagery,custom||traveler,extended?swissCameraOptions():undefined),c=document.createElement('canvas');
    window.swissMemoryRefs??=[];window.swissMemoryRefs.push(new WeakRef(r));let result;
    try{
     for(const f of [0,.1,.8,.2,.5,.9,0,.5])r.draw(c,duration*f);
     const abort=new AbortController();let cancelled=false;try{await exportVideo({config,signal:abort.signal,draw:(c,t)=>{r.draw(c,t);if(t>0)abort.abort();}});}catch(e){cancelled=e.name==='AbortError';}
     const start=performance.now();window.swissMemoryBlob=await exportVideo({config,draw:(c,t)=>r.draw(c,t)});
     result={loadMs,prepareMs:r.preparedMs,exportMs:performance.now()-start,cancelled,bytes:window.swissMemoryBlob.size,textures:r.gpu.info.memory.textures,geometries:r.gpu.info.memory.geometries,vertices:r.terrainGeometry.attributes.position.count,...s};
    }finally{r.dispose();custom?.dispose();c.width=c.height=0;}
    return{...result,disposedGpu:{textures:r.gpu.info.memory.textures,geometries:r.gpu.info.memory.geometries,zeroCanvas:r.gpu.domElement.width===0&&r.gpu.domElement.height===0}};
   },{extended,quality,aspect,duration,cycle}));gpu.push({cycle,quality,aspect,duration,...metrics});assert.ok(metrics.cancelled&&metrics.disposedGpu.zeroCanvas);assert.equal(metrics.textures,2);assert.equal(metrics.disposedGpu.textures+metrics.disposedGpu.geometries,0);
   if(cycle===2){const path=`${folder}/${quality}-${aspect}-${duration}s.mp4`,pending=page.waitForEvent('download');await page.evaluate(()=>{const u=URL.createObjectURL(window.swissMemoryBlob),a=document.createElement('a');a.href=u;a.download='memory-proof.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});await(await pending).saveAs(path);validateVideo(path,metrics.width,metrics.height,duration);}
   await page.evaluate(()=>delete window.swissMemoryBlob);await stage(`cycle${cycle}-${quality}-${aspect}-retained`,()=>page.waitForTimeout(500));
  }
  await stage('retained-after-all-cycles',()=>page.waitForTimeout(2000));
  await stage('test-only-gc',async()=>{await cdp.send('HeapProfiler.collectGarbage');await page.waitForTimeout(1000);});
  weak.push(await page.evaluate(async()=>({remainingRendererRefs:window.swissMemoryRefs.filter(r=>r.deref()).length,storage:[localStorage.length,sessionStorage.length],databaseNames:(await indexedDB.databases()).map(d=>d.name)})));assert.equal(weak[0].remainingRendererRefs,0);assert.deepEqual(weak[0].storage,[0,0]);assert.deepEqual(weak[0].databaseNames,[]);
  await stage('page-unload',async()=>{await page.goto('about:blank');await page.waitForTimeout(1000);});
 }finally{writeFileSync(stop,'stop');await new Promise(resolve=>{const timer=setTimeout(()=>{sampler.kill();resolve();},5000);sampler.once('exit',()=>{clearTimeout(timer);resolve();});});await browser.close();await server.close();}
 if(samplerError)throw Error(samplerError);assert.ok(existsSync(file),'OS sampler unavailable');const samples=readFileSync(file,'utf8').trim().split('\n').map(l=>JSON.parse(l));assert.ok(samples.length>=20,'Not enough process samples');
 for(const s of stages){const a=samples.filter(r=>r.unixMs>=s.start&&r.unixMs<=s.end);s.sampleCount=a.length;s.privatePeakBytes=a.length?Math.max(...a.map(r=>r.privateSumBytes)):null;s.workingSetPeakBytes=a.length?Math.max(...a.map(r=>r.workingSetSumBytes)):null;s.lastNative=a.at(-1)||null;}
 const files=['src/terrain-renderer.ts','src/terrain-camera.ts','src/swiss-pilot.ts'];const report={date:'2026-10-12',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),testedFileSha256:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')])),extended,os:`${os.type()} ${os.release()}`,method:'Fresh isolated Edge root plus descendants; Windows PrivateMemorySize64 (committed private virtual bytes) and WorkingSet64 (shared pages can be double-counted). Sampled peak, not exact encoder peak. Command lines inspected only for process role and never saved. CDP heap separate; test-only GC never production. GPU driver/VRAM and dedicated codec allocations not measured.',nativeSamplerWithoutExecutionPolicyChange:true,gpuVramPeak:'NOT MEASURED',encoderPeak:'NOT MEASURED',stages,gpu,weak,samples};
 writeFileSync(`${folder}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({extended,samples:samples.length,privatePeakBytes:Math.max(...samples.map(s=>s.privateSumBytes)),workingSetPeakBytes:Math.max(...samples.map(s=>s.workingSetSumBytes)),weak}));
});
