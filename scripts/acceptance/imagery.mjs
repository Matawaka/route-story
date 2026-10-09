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
const production=process.argv.includes('--production'),folder=production?'artifacts/sprint9/imagery-production':'artifacts/sprint9/imagery';mkdirSync(folder,{recursive:true});
await (production?withProductionServer:withServer)(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),reports=[],external=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.context().route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 try{for(const [quality,aspect,style] of [['standard','landscape','atlas'],['standard','portrait','night'],['compatibility','landscape','atlas']])for(const surface of ['dem','photo']){
  await page.goto(url);await page.locator('#terrain-demo').click();await page.waitForFunction(()=>!document.querySelector('#export').disabled);
  await page.locator('#ratio').selectOption(aspect);await page.locator('#quality').selectOption(quality);await page.locator('#duration').selectOption('10');await page.locator(`[data-style=${style}]`).click();await page.locator('#story-title').fill('Согне-фьорд · синтетический маршрут');
  await page.locator('#terrain-surface').selectOption(surface);await page.waitForFunction(()=>!document.querySelector('#export').disabled);if(surface==='photo')assert.match(await page.locator('#map-detail-note').textContent(),/Copernicus/);
  const id=`${style}-${aspect}-${quality}-${surface}`,width=aspect==='landscape'?(quality==='standard'?1280:640):720,height=aspect==='landscape'?(quality==='standard'?720:360):1280;
  for(const time of [0,1,2,5,8,9.96])await page.locator('#scrub').fill(String(time));
  await page.locator('#scrub').fill('5');const direct=await page.locator('#preview').evaluate(c=>c.toDataURL());await page.locator('#scrub').fill('2');await page.locator('#scrub').fill('5');assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),direct);
  const pending=page.waitForEvent('download',{timeout:120000});await page.locator('#export').click();const path=`${folder}/${id}-10s.mp4`;await(await pending).saveAs(path);
  const validation=validateVideo(path,width,height,10),frames=[];for(const time of [0,1,2,5,8,9.958333333]){const frame=`${folder}/${id}-${time.toFixed(2)}s.png`;execFileSync(ffmpeg,['-y','-ss',String(time),'-i',path,'-frames:v','1',frame],{windowsHide:true,stdio:'ignore'});frames.push(frame);}
  reports.push({id,surface,quality,aspect,style,validation,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),exportMs:await page.evaluate(()=>performance.getEntriesByName('route-story-export').at(-1).duration),frames});
 }
 const storage=await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,db:await indexedDB.databases()}));assert.deepEqual(storage,{local:0,session:0,db:[]});assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),uncommitted:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8',windowsHide:true}).trim(),browser:`Edge ${browser.version()}`,os:`${os.type()} ${os.release()}`,scope:production?'local production /route-story/ UI; not public HTTPS':'local dev actual UI; not public HTTPS',imagery:JSON.parse(readFileSync('public/imagery/sogne-sentinel.json')),external,errors,storage,reports};writeFileSync(`${folder}/acceptance.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(reports.map(({id,validation,exportMs})=>({id,bytes:validation.bytes,frames:validation.decodedFrames,exportMs})),null,2));
 }catch(error){console.error(await page.locator('#status').textContent());await page.screenshot({path:`${folder}/failure.png`});throw error;}finally{await browser.close();}
});
