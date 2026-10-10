/** Opt-in real UI, same route/camera/time/size DEM/photo comparison. */
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import assert from 'node:assert/strict';
import ffmpeg from 'ffmpeg-static';
import {withServer} from './server.mjs';
import {withProductionServer} from './production.mjs';
import {validateVideo} from '../validate-video.mjs';
const remote=process.env.APP_URL,production=!!remote||process.argv.includes('--production'),published=!!remote||process.argv.includes('--release'),smoke=process.argv.includes('--smoke'),full=process.argv.includes('--full'),compare=process.argv.includes('--compare');
assert.ok(!compare||!production,'legacy20m comparison is developer-only, excluded from public package');assert.ok(!smoke||!full,'choose bounded smoke or full acceptance');
if(remote){const u=new URL(remote);assert.equal(u.protocol,'https:');assert.ok(!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname.endsWith('/'),'plain public HTTPS application URL required');assert.match(process.env.EXPECTED_COMMIT??'',/^[a-f0-9]{40}$/,'public photo acceptance requires exact deployed SHA');}
const folder=process.env.ACCEPTANCE_DIR||(full?'artifacts/sprint9/adaptive-full':production?'artifacts/sprint9/imagery-production':'artifacts/sprint9/imagery');mkdirSync(folder,{recursive:true});
const run=remote?async accept=>accept(remote):production?withProductionServer:withServer;
await run(async url=>{
 const base=new URL(url),browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||(os.platform()==='win32'?'msedge':undefined),headless:true}),page=await browser.newPage(),reports=[],external=[],errors=[],badResponses=[];
 let csp;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
 await page.context().route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(['data:','blob:'].includes(u.protocol))return r.continue();return u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&['GET','HEAD'].includes(req.method())?r.continue():(external.push({url:req.url(),method:req.method()}),r.abort());});
 await page.context().routeWebSocket(/.*/,ws=>{external.push({url:ws.url(),method:'WebSocket'});ws.close();});
 await page.addInitScript(()=>{window.photoEncoderConfigs=[];const Native=window.VideoEncoder;if(Native)window.VideoEncoder=class extends Native{configure(config){window.photoEncoderConfigs.push({...config});super.configure(config);}};});
 let manifest;
 try{
 if(production){const response=await page.request.get(url+'release.json');assert.equal(response.status(),200);manifest=await response.json();assert.equal(manifest.imageryPack,'sogne-sentinel-adaptive');assert.equal(manifest.publicationApproved,published);if(!published)assert.equal(manifest.candidate,'photo-prototype');assert.equal(manifest.sourceCommit,process.env.EXPECTED_COMMIT||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim());assert.equal(manifest.version,process.env.EXPECTED_VERSION||JSON.parse(readFileSync('package.json')).version);for(const file of manifest.files){assert.ok(!file.path.startsWith('/')&&!file.path.includes('..'));const res=await page.request.get(url+file.path);assert.equal(res.status(),200);assert.equal(new URL(res.url()).origin,base.origin);const bytes=await res.body();assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}}
 const scenarios=smoke?[['compatibility','landscape','atlas','photo'],['compatibility','portrait','night','corridor']]:[['standard','landscape','atlas'],['standard','portrait','night'],['compatibility','landscape','atlas']].flatMap(config=>(compare?['dem','single','photo','corridor']:['dem','photo','corridor']).map(surface=>[...config,surface]));
 let cancelAndRecovery='NOT TESTED';
 for(const [quality,aspect,style,surface] of scenarios){
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});assert.equal(response.status(),200);assert.equal(await page.evaluate(()=>isSecureContext),true);
  csp={responseHeader:response.headers()['content-security-policy']||null,meta:await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')};if(production){assert.ok(csp.meta.includes("connect-src 'self'")&&csp.meta.includes("object-src 'none'"));assert.ok(!/unsafe-inline|unsafe-eval/.test(csp.meta));}
  await page.locator('#terrain-demo').click();await page.waitForFunction(()=>!document.querySelector('#export').disabled);
  const duration=full&&quality==='standard'?(style==='atlas'?20:30):10;
  await page.locator('#ratio').selectOption(aspect);await page.locator('#quality').selectOption(quality);await page.locator('#duration').selectOption(String(duration));await page.locator(`[data-style=${style}]`).click();await page.locator('#story-title').fill('Согне-фьорд · синтетический маршрут');
  if(surface==='single')await page.route('**/imagery/sogne-sentinel.json',r=>r.fulfill({contentType:'application/json',body:readFileSync('public/imagery/sogne-sentinel-20m.json')}));
  await page.locator('#terrain-flight').selectOption(surface==='corridor'?'corridor':'conservative');await page.locator('#terrain-surface').selectOption(surface==='dem'?'dem':'photo');await page.waitForFunction(()=>!document.querySelector('#export').disabled);if(surface!=='dem')assert.match(await page.locator('#map-detail-note').textContent(),/Copernicus/);
  const id=`${style}-${aspect}-${quality}-${surface}`,wide=quality==='standard'?1280:640,short=quality==='standard'?720:360,width=aspect==='landscape'?wide:short,height=aspect==='landscape'?short:wide;
  await page.locator('#scrub').fill(String(duration/2));const direct=await page.locator('#preview').evaluate(c=>c.toDataURL());await page.locator('#scrub').fill('2');await page.locator('#scrub').fill(String(duration/2));assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),direct);
  if(smoke&&reports.length===0){let downloads=0;const listener=()=>downloads++;page.on('download',listener);await page.locator('#export').click();await page.locator('#cancel').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Экспорт отменён.'&&!document.querySelector('#export').disabled);assert.equal(downloads,0);page.off('download',listener);cancelAndRecovery='VERIFIED';}
  const pending=page.waitForEvent('download',{timeout:120000});await page.locator('#export').click();const path=`${folder}/${id}-${duration}s.mp4`;await(await pending).saveAs(path);
  const validation=validateVideo(path,width,height,duration),frames=[];for(const time of [0,1,2,duration/4,duration/2,duration-2,duration-1/24]){const frame=`${folder}/${id}-${time.toFixed(2)}s.png`;execFileSync(ffmpeg,['-y','-ss',String(time),'-i',path,'-frames:v','1',frame],{windowsHide:true,stdio:'ignore'});frames.push(frame);}
  const stats=execFileSync(ffmpeg,['-v','error','-i',path,'-vf','crop=iw*0.8:ih*0.5:iw*0.1:ih*0.25,signalstats,metadata=print:file=-','-f','null','-'],{windowsHide:true,encoding:'utf8',maxBuffer:8*1024*1024}),lo=[...stats.matchAll(/lavfi\.signalstats\.YMIN=(\d+)/g)].map(m=>Number(m[1])),hi=[...stats.matchAll(/lavfi\.signalstats\.YMAX=(\d+)/g)].map(m=>Number(m[1]));assert.equal(lo.length,duration*24);assert.equal(hi.length,duration*24);const minimumMapLumaSpread=Math.min(...hi.map((h,i)=>h-lo[i]));assert.ok(minimumMapLumaSpread>=8,'blank geographic frame');
  reports.push({id,surface,quality,aspect,style,validation,minimumMapLumaSpread,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),exportMs:await page.evaluate(()=>performance.getEntriesByName('route-story-export').at(-1).duration),encoder:await page.evaluate(()=>window.photoEncoderConfigs.at(-1)),frames});
  if(surface==='single')await page.unroute('**/imagery/sogne-sentinel.json');
 }
 const storage=await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,db:await indexedDB.databases()}));assert.deepEqual(storage,{local:0,session:0,db:[]});assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
 const report={status:'VERIFIED',sourceCommit:manifest?.sourceCommit||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),...(!remote?{uncommitted:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8',windowsHide:true}).trim()}:{}),browser:{channel:process.env.PLAYWRIGHT_CHANNEL||(os.platform()==='win32'?'msedge':'playwright-chromium'),version:browser.version()},os:`${os.type()} ${os.release()}`,physicalMobile:false,scope:remote?'public HTTPS':production?'local production /route-story/ UI; not public HTTPS':'local dev actual UI; not public HTTPS',url,publicHttps:!!remote,csp,version:manifest?.version,manifestHashes:manifest?.files.length,packageBytes:manifest?.totalBytes,imagery:JSON.parse(readFileSync('public/imagery/sogne-sentinel.json')),cancelAndRecovery,external,errors,badResponses,storage,reports};writeFileSync(`${folder}/acceptance.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(reports.map(({id,validation,exportMs})=>({id,bytes:validation.bytes,frames:validation.decodedFrames,exportMs})),null,2));
 }catch(error){console.error(await page.locator('#status').textContent());await page.screenshot({path:`${folder}/failure.png`});throw error;}finally{await browser.close();}
});
