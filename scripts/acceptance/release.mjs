import {chromium,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import assert from 'node:assert/strict';
import {withProductionServer} from './production.mjs';
import {validateVideo} from '../validate-video.mjs';

// Opt-in acceptance of the real production UI, locally or at the published URL.
// No source-module imports, route uploads, account session or fake exporter.
const smoke=process.argv.includes('--smoke'),remote=process.env.APP_URL;
const directory='artifacts/release';mkdirSync(directory,{recursive:true});
if(remote){const u=new URL(remote);assert.equal(u.protocol,'https:','public acceptance requires HTTPS');assert.ok(!u.username&&!u.password&&!u.search&&!u.hash,'plain public application URL required');assert.ok(u.pathname.endsWith('/'),'application URL must end with /');}
const report={status:'PENDING',scope:remote?'public HTTPS':'local production subpath',publicHttps:false,os:`${os.type()} ${os.release()} ${os.arch()}`,physicalMobile:false,outputs:[]};
async function accept(url){
 const base=new URL(url),channel=process.env.PLAYWRIGHT_CHANNEL||(os.platform()==='win32'?'msedge':undefined);
 const browser=await chromium.launch({channel,headless:true});report.browser={channel:channel||'playwright-chromium',version:browser.version()};report.url=url;
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  const unexpected=[],badResponses=[],errors=[],requests=[];
  await context.route('**/*',r=>{
   const req=r.request(),u=new URL(req.url());if(['data:','blob:'].includes(u.protocol))return r.continue();
   if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname)||!['GET','HEAD'].includes(req.method())){unexpected.push({url:u.href,method:req.method()});return r.abort();}
   requests.push({path:u.pathname,method:req.method()});return r.continue();
  });
  await context.routeWebSocket(/.*/,ws=>{unexpected.push({url:ws.url(),method:'WebSocket'});ws.close();});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
  await page.addInitScript(()=>{
   const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{if(blob instanceof Blob&&blob.type==='video/mp4')window.releaseVideoBlob=blob;return create(blob);};
   window.releaseEncoderConfigs=[];const Native=window.VideoEncoder;
   if(Native)window.VideoEncoder=class extends Native{configure(config){window.releaseEncoderConfigs.push({...config});super.configure(config);}};
  });
  const response=await page.goto(url);assert.equal(response.status(),200);assert.equal(new URL(page.url()).origin,base.origin);
  report.secureContext=await page.evaluate(()=>isSecureContext);assert.equal(report.secureContext,true);report.publicHttps=base.protocol==='https:';
  report.csp={responseHeader:response.headers()['content-security-policy']||null,meta:await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')};
  assert.ok(report.csp.meta.includes("connect-src 'self'")&&report.csp.meta.includes("object-src 'none'"));assert.ok(!/unsafe-inline|unsafe-eval/.test(report.csp.meta));
  const manifestResponse=await context.request.get(url+'release.json');assert.equal(manifestResponse.status(),200);const manifest=await manifestResponse.json();
  assert.equal(manifest.version,'1.0.0');assert.match(manifest.sourceCommit,/^[a-f0-9]{40}$/);if(process.env.EXPECTED_COMMIT)assert.equal(manifest.sourceCommit,process.env.EXPECTED_COMMIT);
  report.sourceCommit=manifest.sourceCommit;report.version=manifest.version;report.packageBytes=manifest.totalBytes;
  for(const file of manifest.files){
   assert.ok(!file.path.startsWith('/')&&!file.path.includes('..'),'local manifest path');
   const res=await context.request.get(url+file.path);assert.equal(res.status(),200);assert.equal(new URL(res.url()).origin,base.origin);
   const body=await res.body();assert.equal(body.length,file.bytes);assert.equal(createHash('sha256').update(body).digest('hex'),file.sha256);
  }
  report.packageHashesVerified=manifest.files.length;
  await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#route-info')).toContainText('синтетический');
  await page.locator('#scrub').fill('3');const first=await page.locator('#preview').evaluate(c=>c.toDataURL());
  await page.locator('#scrub').fill('19');await page.locator('#scrub').fill('3');assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),first);
  await page.locator('#play').click();await page.waitForTimeout(150);await page.locator('#play').click();assert.ok(Number(await page.locator('#scrub').inputValue())>3);
  await page.locator('#duration').selectOption('30');await page.locator('#quality').selectOption('standard');await expect(page.locator('#export')).toBeEnabled();
  let downloads=0;page.on('download',()=>downloads++);await page.locator('#export').click();await page.locator('#cancel').click();
  await expect(page.locator('#status')).toHaveText('Экспорт отменён.');await expect(page.locator('#export')).toBeEnabled();assert.equal(downloads,0);report.cancelAndRecovery='VERIFIED';
  const examples=[
   {name:'atlas-20s',file:'synthetic.gpx',style:'Атлас',aspect:'landscape',seconds:smoke?10:20,title:'Учебный маршрут · ATLAS',width:1280,height:720},
   {name:'night-30s',file:'synthetic-antimeridian.gpx',style:'Ночной',aspect:'portrait',seconds:smoke?10:30,title:'Через 180° · NIGHT',width:720,height:1280}
  ];
  for(const example of examples){
   const sample=await context.request.get(url+'samples/'+example.file),input=await sample.body();assert.equal(sample.status(),200);
   await page.locator('#file').setInputFiles({name:example.file,mimeType:'application/gpx+xml',buffer:input});await expect(page.locator('#export')).toBeEnabled();
   await page.getByRole('button',{name:example.style,exact:true}).click();await page.locator('#story-title').fill(example.title);
   await page.locator('#duration').selectOption(String(example.seconds));await page.locator('#ratio').selectOption(example.aspect);await page.locator('#quality').selectOption('standard');await expect(page.locator('#export')).toBeEnabled();
   const phases=[];
   for(const [phase,time] of [['INTRO',1],['ROUTE_REPLAY',example.seconds/2],['OUTRO',example.seconds-1]]){
    await page.locator('#scrub').fill(String(time));await expect(page.locator('#preview')).toHaveAttribute('data-phase',phase);phases.push({phase,time});
    await page.locator('#preview').screenshot({path:`${directory}/${smoke?'smoke-':''}${example.name}-${phase.toLowerCase()}.png`});
    if(!smoke&&example.aspect==='landscape'&&phase==='ROUTE_REPLAY'){mkdirSync('docs/images',{recursive:true});await page.screenshot({path:'docs/images/route-story.png',fullPage:true});}
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const pending=page.waitForEvent('download',{timeout:90_000});await page.locator('#export').click();const download=await pending;
   const path=`${directory}/${smoke?'smoke-':''}${example.name}.mp4`;await download.saveAs(path);await expect(page.locator('#status')).toContainText('MP4 создан');
   const exportMilliseconds=await page.evaluate(()=>performance.getEntriesByName('route-story-export').at(-1).duration);
   const video=validateVideo(path,example.width,example.height,example.seconds);
   const nativePlayback=await page.evaluate(async()=>{
    const blob=window.releaseVideoBlob,video=document.createElement('video'),url=URL.createObjectURL(blob);video.muted=true;video.preload='auto';
    const wait=event=>new Promise((ok,fail)=>{const timer=setTimeout(()=>done(new Error(`${event} timed out`)),15_000);const success=()=>done(),failure=()=>done(new Error(`Native video error ${video.error?.code}`));function done(error){clearTimeout(timer);video.removeEventListener(event,success);video.removeEventListener('error',failure);error?fail(error):ok();}video.addEventListener(event,success,{once:true});video.addEventListener('error',failure,{once:true});});
    try{
     const ready=wait('loadeddata');video.src=url;await ready;const seek=wait('seeked');video.currentTime=video.duration/2;await seek;
     const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,32,32);
     const before=video.currentTime;await video.play();await new Promise(ok=>setTimeout(ok,150));video.pause();
     return{width:video.videoWidth,height:video.videoHeight,duration:video.duration,pixelVariation:new Set(ctx.getImageData(0,0,32,32).data).size,playbackAdvancedSeconds:video.currentTime-before};
    }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);delete window.releaseVideoBlob;}
   });
   assert.equal(nativePlayback.width,example.width);assert.equal(nativePlayback.height,example.height);assert.ok(Math.abs(nativePlayback.duration-example.seconds)<1/24);assert.ok(nativePlayback.pixelVariation>4);assert.ok(nativePlayback.playbackAdvancedSeconds>0);
   report.outputs.push({name:example.name,source:example.file,sourceBytes:input.length,sourceSha256:createHash('sha256').update(input).digest('hex'),points:(input.toString().match(/<trkpt\b/g)||[]).length,title:example.title,style:example.style,aspect:example.aspect,quality:'standard',phases,exportMilliseconds,encoder:await page.evaluate(()=>window.releaseEncoderConfigs.at(-1)),video,nativePlayback});
   if(example.aspect==='portrait'){await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`${directory}/${smoke?'smoke-':''}portrait-layout.png`,fullPage:true});await page.setViewportSize({width:1280,height:900});}
  }
  const unsupported=await context.newPage();await unsupported.addInitScript(()=>{Object.defineProperty(window,'VideoEncoder',{value:undefined,configurable:true});});await unsupported.goto(url);await unsupported.locator('#demo').click();await expect(unsupported.locator('#preview')).toBeVisible();await expect(unsupported.locator('#export')).toBeDisabled();await expect(unsupported.locator('#status')).toContainText('WebCodecs');await unsupported.close();report.unsupportedEncoder='VERIFIED simulated unavailable API';
  const storage=await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,databases:await indexedDB.databases(),caches:await caches.keys(),cookies:document.cookie}));
  assert.deepEqual(storage,{local:0,session:0,databases:[],caches:[],cookies:''});assert.deepEqual(await context.cookies(),[]);
  await page.reload();await expect(page.locator('#empty')).toBeVisible();await expect(page.locator('#export')).toBeDisabled();
  assert.deepEqual(unexpected,[]);assert.deepEqual(badResponses,[]);assert.deepEqual(errors,[]);assert.ok(requests.some(r=>r.path.endsWith('/maps/ne_110m_land.geojson')));
  report.privacy={storage,unexpectedRequests:unexpected,badResponses,pageErrors:errors,firstPartyBrowserRequests:requests.length,routeLostOnReload:true};report.status='VERIFIED';
 }finally{await browser.close();}
}
try{if(remote)await accept(remote);else await withProductionServer(accept);}catch(error){report.status='FAILED';report.error=error.stack;process.exitCode=1;}
const path=`${directory}/acceptance-${remote?'https':'local'}${smoke?'-smoke':''}.json`;writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,scope:report.scope,sourceCommit:report.sourceCommit,publicHttps:report.publicHttps,report:path,outputs:report.outputs.map(o=>({file:o.video.file,bytes:o.video.bytes,exportMilliseconds:o.exportMilliseconds,frames:o.video.decodedFrames}))}));
if(report.error)console.error(report.error);
