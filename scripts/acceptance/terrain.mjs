import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import os from 'node:os';
import assert from 'node:assert/strict';
import ffmpeg from 'ffmpeg-static';
import {withServer} from './server.mjs';
import {withProductionServer} from './production.mjs';
import {validateVideo} from '../validate-video.mjs';
const production=process.argv.includes('--production'),folder=production?'artifacts/sprint8/final':'artifacts/sprint8/terrain';mkdirSync(folder,{recursive:true});
await (production?withProductionServer:withServer)(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),reports=[],errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL/.test(m.text()))errors.push(m.text());});
 const badResponses=[];page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
 await page.context().route('**/*',r=>{const u=new URL(r.request().url()),base=new URL(url);return u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&['GET','HEAD'].includes(r.request().method())?r.continue():(external.push({url:u.href,method:r.request().method()}),r.abort());});
 await page.context().routeWebSocket(/.*/,ws=>{external.push({url:ws.url(),method:'WebSocket'});ws.close();});
 let manifest;
 if(production){const response=await page.goto(url);assert.equal(response.status(),200);assert.equal(await page.evaluate(()=>isSecureContext),true);const csp=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');assert.ok(csp.includes("connect-src 'self'")&&!/unsafe-inline|unsafe-eval/.test(csp));manifest=await(await page.request.get(url+'release.json')).json();assert.equal(manifest.sourceCommit,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim());for(const file of manifest.files){const res=await page.request.get(url+file.path);assert.equal(res.status(),200);const bytes=await res.body();assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}}
 try{for(const [style,aspect,duration] of [['atlas','landscape',20],['night','portrait',30]]){
  await page.goto(url);await page.locator('#terrain-demo').click();await page.waitForFunction(()=>!document.querySelector('#export').disabled,{},{timeout:30000});
  await page.locator('#ratio').selectOption(aspect);await page.locator('#duration').selectOption(String(duration));await page.locator(`[data-style=${style}]`).click();await page.locator('#story-title').fill(style==='atlas'?'Над склонами · синтетический маршрут':'Фьорды и хребты · синтетический маршрут');await page.waitForFunction(()=>!document.querySelector('#export').disabled);
  for(const t of [0,1,2,duration/4,duration/2,duration-2,duration]){await page.locator('#scrub').fill(String(t));await page.locator('#preview').screenshot({path:`${folder}/${style}-${t}s-preview.png`});}
  const pending=page.waitForEvent('download',{timeout:120000});await page.locator('#export').click();const path=`${folder}/${style}-${duration}s.mp4`;await(await pending).saveAs(path);
  const width=aspect==='portrait'?720:1280,height=aspect==='portrait'?1280:720,video=validateVideo(path,width,height,duration);
  // Inspect only the central geographic area of EVERY decoded frame, excluding
  // HUD. Distinct frame hashes alone cannot catch a blank map behind a counter.
  const statistics=execFileSync(ffmpeg,['-v','error','-i',path,'-vf','crop=iw*0.8:ih*0.5:iw*0.1:ih*0.25,signalstats,metadata=print:file=-','-f','null','-'],{windowsHide:true,encoding:'utf8',maxBuffer:8*1024*1024});
  const minima=[...statistics.matchAll(/lavfi\.signalstats\.YMIN=(\d+)/g)].map(m=>Number(m[1])),maxima=[...statistics.matchAll(/lavfi\.signalstats\.YMAX=(\d+)/g)].map(m=>Number(m[1]));assert.equal(minima.length,duration*24);assert.equal(maxima.length,minima.length);const minimumMapLumaSpread=Math.min(...maxima.map((v,i)=>v-minima[i]));assert.ok(minimumMapLumaSpread>=8,'Blank/flat geographic frame detected');
  for(const time of [0,1,2,duration/4,duration/2,duration-2,duration-1/24])execFileSync(ffmpeg,['-y','-ss',String(time),'-i',path,'-frames:v','1',`${folder}/${style}-${time.toFixed(2)}s-decoded.png`],{windowsHide:true,stdio:'ignore'});
  reports.push({style,aspect,duration,video,minimumMapLumaSpread,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),exportMs:await page.evaluate(()=>performance.getEntriesByName('route-story-export').at(-1).duration)});
 }
 const storage=await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,databases:await indexedDB.databases()}));assert.deepEqual(storage,{local:0,session:0,databases:[]});
 await page.setViewportSize({width:393,height:851});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(errors.length||external.length||badResponses.length)throw Error(JSON.stringify({errors,external,badResponses}));
 writeFileSync(`${folder}/acceptance.json`,JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),uncommitted:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8',windowsHide:true}).trim(),scope:production?'local production /route-story/ subpath':'development',publicHttps:false,packageBytes:manifest?.totalBytes,manifestHashes:manifest?.files.length,os:`${os.type()} ${os.release()} ${os.arch()}`,browser:`Edge ${browser.version()}`,errors,external,badResponses,storage,mobileViewportOverflow:false,reports},null,2));console.log(JSON.stringify(reports,null,2));
 }catch(error){console.log(await page.locator('#status').textContent());await page.screenshot({path:`${folder}/failure.png`});throw error;}finally{await browser.close();}
});
