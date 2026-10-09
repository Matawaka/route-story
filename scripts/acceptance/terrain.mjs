import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import os from 'node:os';
import ffmpeg from 'ffmpeg-static';
import {withServer} from './server.mjs';
import {validateVideo} from '../validate-video.mjs';
const folder='artifacts/sprint8/terrain';mkdirSync(folder,{recursive:true});
await withServer(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),reports=[],errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL/.test(m.text()))errors.push(m.text());});
 await page.context().route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 try{for(const [style,aspect,duration] of [['atlas','landscape',20],['night','portrait',30]]){
  await page.goto(url);await page.locator('#terrain-demo').click();await page.waitForFunction(()=>!document.querySelector('#export').disabled,{},{timeout:30000});
  await page.locator('#ratio').selectOption(aspect);await page.locator('#duration').selectOption(String(duration));await page.locator(`[data-style=${style}]`).click();await page.locator('#story-title').fill(style==='atlas'?'Над склонами · синтетический маршрут':'Фьорды и хребты · синтетический маршрут');await page.waitForFunction(()=>!document.querySelector('#export').disabled);
  for(const t of [0,1,2,duration/4,duration/2,duration-2,duration]){await page.locator('#scrub').fill(String(t));await page.locator('#preview').screenshot({path:`${folder}/${style}-${t}s-preview.png`});}
  const pending=page.waitForEvent('download',{timeout:120000});await page.locator('#export').click();const path=`${folder}/${style}-${duration}s.mp4`;await(await pending).saveAs(path);
  const width=aspect==='portrait'?720:1280,height=aspect==='portrait'?1280:720,video=validateVideo(path,width,height,duration);
  for(const time of [0,1,2,duration/4,duration/2,duration-2,duration-1/24])execFileSync(ffmpeg,['-y','-ss',String(time),'-i',path,'-frames:v','1',`${folder}/${style}-${time.toFixed(2)}s-decoded.png`],{windowsHide:true,stdio:'ignore'});
  reports.push({style,aspect,duration,video,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),exportMs:await page.evaluate(()=>performance.getEntriesByName('route-story-export').at(-1).duration)});
 }
 if(errors.length||external.length)throw Error(JSON.stringify({errors,external}));
 writeFileSync(`${folder}/acceptance.json`,JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),uncommitted:true,os:`${os.type()} ${os.release()} ${os.arch()}`,browser:`Edge ${browser.version()}`,errors,external,reports},null,2));console.log(JSON.stringify(reports,null,2));
 }catch(error){console.log(await page.locator('#status').textContent());await page.screenshot({path:`${folder}/failure.png`});throw error;}finally{await browser.close();}
});
