import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {spawnSync,execFile} from 'node:child_process';import {promisify} from 'node:util';import os from 'node:os';
import ffmpeg from 'ffmpeg-static';import assert from 'node:assert/strict';import {validateVideo} from '../validate-video.mjs';
const path=process.argv[2];if(!path)throw Error('Supply an owner-consented local GPX path.');
const label=process.argv[3]||'current',full=process.argv.includes('--full'),minute=process.argv.includes('--minute');if(!/^[a-z0-9-]+$/.test(label))throw Error('Safe output label');
const dir=`artifacts/automatic-geography/${label}`;await mkdir(dir,{recursive:true});
if(process.argv.includes('--study')){
 const baseline=spawnSync('git',['show','9eca4e2777d6d4d1a8e5c09375c9aaf2ecac140f:src/terrain-camera.ts'],{encoding:'utf8',windowsHide:true});assert.equal(baseline.status,0,'recoverable historical camera checkpoint');
 await mkdir('.reference/smoothing',{recursive:true});await writeFile('.reference/smoothing/terrain-camera.ts',baseline.stdout.replaceAll("'./","'../../src/"));
}
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
async function assertSamePixels(page,a,b,name){
 if(a===b)return;
 const comparison=await page.evaluate(async([a,b])=>{const bitmaps=await Promise.all([a,b].map(s=>createImageBitmap(new Blob([Uint8Array.from(atob(s.split(',')[1]),c=>c.charCodeAt(0))],{type:'image/png'}))));try{const pixels=bitmaps.map(bitmap=>{const c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);return ctx.getImageData(0,0,c.width,c.height).data;});let channels=0,maximumDelta=0;for(let i=0;i<pixels[0].length;i++){const d=Math.abs(pixels[0][i]-pixels[1][i]);if(d)channels++;maximumDelta=Math.max(maximumDelta,d);}return{width:bitmaps[0].width,height:bitmaps[0].height,sameDimensions:bitmaps[0].width===bitmaps[1].width&&bitmaps[0].height===bitmaps[1].height,channels,maximumDelta};}finally{bitmaps.forEach(b=>b.close());}},[a,b]);
 await writeFile(`${dir}/${name}-pixel-comparison.json`,JSON.stringify(comparison,null,2));for(const [side,s]of[['a',a],['b',b]])await writeFile(`${dir}/${name}-${side}.png`,Buffer.from(s.split(',')[1],'base64'));
 assert.equal(comparison.sameDimensions,true,'frame dimensions');assert.equal(comparison.channels,0,`${name}: every decoded RGBA channel is identical`);
}
const processSession=await browser.newBrowserCDPSession(),memory=[];
async function sampleMemory(phase){if(os.platform()!=='win32')return;try{const {processInfo}=await processSession.send('SystemInfo.getProcessInfo'),ids=processInfo.map(p=>Number(p.id)).filter(id=>Number.isSafeInteger(id)&&id>0);if(!ids.length||ids.length>40)return;const script=`Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress`,{stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:5000});const rows=JSON.parse(stdout),list=Array.isArray(rows)?rows:[rows];let working=0,privateBytes=0;for(const p of list){working+=p.WorkingSet64;privateBytes+=p.PrivateMemorySize64;}memory.push({phase,workingSetBytes:working,privateBytes,processCount:list.length,timestamp:Date.now()});}catch{memory.push({phase,status:'UNAVAILABLE'});}}
try{const page=await browser.newPage({viewport:{width:1440,height:1000}});const outside=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4195/'))outside.push({host:new URL(r.url()).hostname,method:r.method()});});page.on('pageerror',e=>console.log('pageerror',e.message));
 await page.addInitScript(()=>{const Native=window.VideoFrame;window.__sourceFrames={};window.VideoFrame=class extends Native{constructor(source,options){super(source,options);if(source instanceof HTMLCanvasElement&&window.__captureTimestamp===options?.timestamp)window.__sourceFrames[options.timestamp]=source.toDataURL();}};});
 await page.goto('http://127.0.0.1:4195/');await page.locator('#welcome-close').click();await sampleMemory('before-import');await page.locator('#file').setInputFiles(path);await page.waitForFunction(()=>document.body.dataset.state==='READY'||document.body.dataset.state==='ERROR',{},{timeout:30000});
 if(outside.length)throw Error('External requests before consent');
 await page.locator('#find-geography').click();let stage='';const started=Date.now();
 while(Date.now()-started<240000){const state=await page.evaluate(()=>({state:document.body.dataset.state,stage:document.querySelector('#status').textContent}));if(state.stage!==stage){stage=state.stage;console.log(state.state,stage);}if(state.state==='READY'||state.state==='ERROR')break;await page.waitForTimeout(500);}
 const readResult=()=>page.evaluate(()=>({state:document.body.dataset.state,status:document.querySelector('#status').textContent,mode:document.querySelector('#preview').dataset.mode,detail:document.querySelector('#map-detail-note').textContent,distance:document.querySelector('#distance').textContent,segments:document.querySelector('#segments').textContent}));let result=await readResult();const recoveredFailures=[];
 // One explicit test-driver Retry action, not automatic production retries or
 // hidden success. Preserve the original transient error in the report.
 if(result.state==='ERROR'&&/Слишком долгая загрузка|Не удалось загрузить/.test(result.status)&&await page.locator('#retry').isEnabled()){
  recoveredFailures.push({state:result.state,status:result.status});console.log('ONE BOUNDED RETRY',result.status);await page.locator('#retry').click();await page.waitForFunction(()=>document.body.dataset.state==='READY'||document.body.dataset.state==='ERROR',undefined,{timeout:240000});result=await readResult();
 }
 await page.screenshot({path:`${dir}/current-ui.png`,fullPage:true});await writeFile(`${dir}/current-result.json`,JSON.stringify({browser:browser.version(),result,requests:outside.length,hosts:[...new Set(outside.map(r=>r.host))]},null,2));console.log(result);
 if(result.state!=='READY'||result.mode!=='terrain')process.exitCode=1;
 if(full&&result.state==='READY'&&result.mode==='terrain'){
  await sampleMemory('prepared');
  await page.evaluate(async()=>{const {TerrainRenderer}=await import('/src/terrain-renderer.ts'),draw=TerrainRenderer.prototype.draw;TerrainRenderer.prototype.draw=function(canvas,time){window.__studyRenderer=this;try{return draw.call(this,canvas,time);}catch(e){window.__drawFailure={time,message:e.message};throw e;}};});
  const evidence=await page.evaluate(async()=>(await import('/src/geographic-preparation.ts')).geographicEvidence());const outputs=[];
  const ready=async()=>{await page.waitForFunction(()=>document.body.dataset.state!=='LOADING');assert.notEqual(await page.locator('body').getAttribute('data-state'),'ERROR',await page.locator('#status').textContent());await page.waitForFunction(()=>!document.querySelector('#export').disabled);};
  const change=async(id,value)=>{await page.locator(id).selectOption(value);await ready();};
  await change('#quality','standard');await change('#video-captions','none');
  for(const [aspect,style,duration]of[...(process.argv.includes('--minute-only')?[]:[['landscape','atlas',20],['portrait','night',30]]),...(minute?[['landscape','atlas',60],['portrait','night',60]]:[])]){
   await change('#ratio',aspect);await change('#duration',String(duration));await page.locator(`[data-style="${style}"]`).click();await ready();
   if(process.argv.includes('--study')){
    const study=await page.evaluate(async()=>{
     const r=window.__studyRenderer,old=await import('/.reference/smoothing/terrain-camera.ts'),current=await import('/src/terrain-camera.ts');
     const oldPlan=old.createTerrainCameraPlan(r.timeline,r.terrain,r.width,r.height,undefined,r.plan.sourceDetailMeters),plan=r.plan,c=document.createElement('canvas');c.width=r.width;c.height=r.height;
     const frames={};try{r.plan=oldPlan;r.draw(c,r.config.durationSeconds/2);frames.before=c.toDataURL();}finally{r.plan=plan;}r.draw(c,r.config.durationSeconds/2);frames.after=c.toDataURL();
     const analyze=(p,fn)=>{const deltas=[];let previous,minClearance=Infinity;for(let frame=0;frame<=r.config.durationSeconds*24;frame++){const time=frame/24,s=r.timeline.at(time),pose=fn(time,p);minClearance=Math.min(minClearance,pose.clearance);if(s.phase==='ROUTE_REPLAY'&&previous?.segment===s.segment){deltas.push(Math.abs(((pose.bearing-previous.bearing+540)%360)-180));}previous=s.phase==='ROUTE_REPLAY'?pose:undefined;}deltas.sort((a,b)=>a-b);return{maximumYawDegreesPerFrame:Math.max(...deltas),p95YawDegreesPerFrame:deltas[Math.floor(deltas.length*.95)],minimumClearanceMeters:minClearance};};
     return {frames,before:analyze(oldPlan,old.getTerrainCameraStateAt),after:analyze(plan,current.getTerrainCameraStateAt),sameRouteTerrainTimestamp:true,stableFollow:plan.stableFollow};
    });
    for(const side of ['before','after'])await writeFile(`${dir}/${style}-${duration}s-camera-${side}.png`,Buffer.from(study.frames[side].split(',')[1],'base64'));delete study.frames;await writeFile(`${dir}/${style}-${duration}s-camera-study.json`,JSON.stringify(study,null,2));
   }
   await page.locator('#scrub').fill(String(duration/2));const preview=await page.locator('#preview').evaluate(c=>c.toDataURL());await page.locator('#scrub').fill('1');await page.locator('#scrub').fill(String(duration/2));await assertSamePixels(page,await page.locator('#preview').evaluate(c=>c.toDataURL()),preview,`${style}-${duration}s-reverse`);
   await page.evaluate(t=>{window.__captureTimestamp=t;window.__sourceFrames={};},duration*500000);
   await page.screenshot({path:`${dir}/${style}-${aspect}.png`,fullPage:true});
   let sampling=false;const timer=setInterval(()=>{if(!sampling){sampling=true;void sampleMemory('during-export').finally(()=>sampling=false);}},750);
   const before=outside.length,downloadPromise=page.waitForEvent('download',{timeout:180000}),failure=page.waitForFunction(()=>document.body.dataset.state==='ERROR',undefined,{timeout:180000}).then(async()=>{throw Error(JSON.stringify(await page.evaluate(()=>({error:document.querySelector('#status').textContent,frame:window.__drawFailure}))));}),started=performance.now();let download;try{await page.locator('#export').click();download=await Promise.race([downloadPromise,failure]);}finally{clearInterval(timer);}const target=`${dir}/${style}-${duration}s.mp4`;await download.saveAs(target);await ready();const elapsed=performance.now()-started;
   assert.equal(outside.length,before,'no external requests during MP4 encoding');const sourceFrame=await page.evaluate(t=>window.__sourceFrames[t],duration*500000);
   const hash=s=>createHash('sha256').update(s).digest('hex');
   await writeFile(`${dir}/${style}-${duration}s-preview.png`,Buffer.from(preview.split(',')[1],'base64'));await writeFile(`${dir}/${style}-${duration}s-source.png`,Buffer.from(sourceFrame.split(',')[1],'base64'));
   if(hash(sourceFrame)!==hash(preview)){const diagnostic=await page.evaluate(time=>{const r=window.__studyRenderer,c=document.createElement('canvas');r.draw(c,time);return {time,scrub:document.querySelector('#scrub').value,max:document.querySelector('#scrub').max,config:r.config,redraw:c.toDataURL()};},duration/2);await writeFile(`${dir}/parity-diagnostic.json`,JSON.stringify({...diagnostic,redraw:hash(diagnostic.redraw),preview:hash(preview),source:hash(sourceFrame)},null,2));}
   await assertSamePixels(page,sourceFrame,preview,`${style}-${duration}s-source-parity`);
   const width=aspect==='landscape'?1280:720,height=aspect==='landscape'?720:1280,video=validateVideo(target,width,height,duration);
   const decoded=spawnSync(ffmpeg,['-v','error','-i',target,'-vf','scale=32:18,format=gray','-f','rawvideo','-'],{maxBuffer:2*1024*1024,windowsHide:true});assert.equal(decoded.status,0);assert.equal(decoded.stderr.length,0);assert.equal(decoded.stdout.length,video.decodedFrames*576);let minimumRange=255;for(let offset=0;offset<decoded.stdout.length;offset+=576){const frame=decoded.stdout.subarray(offset,offset+576),range=Math.max(...frame)-Math.min(...frame);minimumRange=Math.min(minimumRange,range);assert.ok(range>10,'every decoded frame contains nonblank geographic content');}
   const image=spawnSync(ffmpeg,['-v','error','-ss',String(duration/2),'-i',target,'-frames:v','1','-y',`${dir}/${style}-${duration}s-decoded-middle.png`],{windowsHide:true});assert.equal(image.status,0);
   outputs.push({...video,file:target,exportDownloadMilliseconds:elapsed,sha256:createHash('sha256').update(readFileSync(target)).digest('hex'),minimumGrayRange:minimumRange,previewExportPixelParity:true,reverseSeekPixelParity:true,externalRequestsDuringExport:0});console.log('VALIDATED',style,duration,video.bytes,elapsed);
  }
  await change('#duration','30');await change('#ratio','portrait');
  await page.locator('#export').click();await page.locator('#cancel').click();await page.waitForFunction(()=>document.body.dataset.state==='CANCELLED');
  const retryDownload=page.waitForEvent('download');await page.locator('#export').click();await(await retryDownload).saveAs(`${dir}/retry-30s.mp4`);await ready();validateVideo(`${dir}/retry-30s.mp4`,720,1280,30);
  await page.setViewportSize({width:375,height:812});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${dir}/mobile-viewport.png`,fullPage:true});
  const storage=await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,indexed:(await indexedDB.databases()).length}));assert.deepEqual(storage,{local:0,session:0,indexed:0});
  await sampleMemory('after-export-cancel-retry');await page.locator('#clear-route').click();await sampleMemory('after-route-disposal');
  await writeFile(`${dir}/acceptance.json`,JSON.stringify({status:'VERIFIED LOCAL',sourceCommit:process.env.BUILD_COMMIT||'working-tree',browser:browser.version(),os:`${os.type()} ${os.release()}`,physicalDevice:false,distance:result.distance,segments:result.segments,evidence,outputs,storage,cancelRetry:true,recoveredFailures,externalRequestsBeforeConsent:0,externalMethods:[...new Set(outside.map(r=>r.method))],nativeMemory:{method:'OS Get-Process WorkingSet64/PrivateMemorySize64, unique child PIDs from isolated browser CDP SystemInfo; sampled during exports at 750ms, not an exact peak; working sets may share pages',samples:memory},gpuMemory:'NOT MEASURED',javascriptHeap:'NOT MEASURED'},null,2));
 }
}finally{await browser.close();}
