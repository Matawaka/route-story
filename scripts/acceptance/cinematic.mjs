import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import ffmpeg from 'ffmpeg-static';
import { withServer } from './server.mjs';
import { validateVideo } from '../validate-video.mjs';
const prototype=process.argv.includes('--prototype'),folder=`artifacts/sprint7/${prototype?'camera-prototype':'cinematic'}`;
mkdirSync(folder,{recursive:true});
await withServer(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),reports=[];
 const external=[],errors=[];await page.context().route('**/*',r=>{if(new URL(r.request().url()).origin!==new URL(url).origin){external.push(r.request().url());return r.abort();}return r.continue();});page.on('pageerror',e=>errors.push(e.message));
 try{
  for(const [style,aspect,duration] of [['atlas','landscape',20],['night','portrait',30]]){
   await page.goto(url);await page.locator(prototype?'#demo':'#cinematic-demo').click();await page.waitForFunction(()=>!document.querySelector('#export').disabled);
   await page.locator('#camera-mode').selectOption('cinematic');await page.locator('#quality').selectOption('standard');await page.locator('#ratio').selectOption(aspect);await page.locator('#duration').selectOption(String(duration));await page.locator(`[data-style=${style}]`).click();await page.locator('#story-title').fill(prototype?'Камера · прототип':style==='atlas'?'Между островами':'Свет фьордов');await page.waitForFunction(()=>!document.querySelector('#export').disabled);
   for(const time of [0,1,2,duration/4,duration/2,duration-2,duration]){await page.locator('#scrub').fill(String(time));await page.locator('#preview').screenshot({path:`${folder}/${style}-${time}s-preview.png`});}
   const pending=page.waitForEvent('download');await page.locator('#export').click();const path=`${folder}/${style}-${duration}s.mp4`;await(await pending).saveAs(path);
   const width=aspect==='portrait'?720:1280,height=aspect==='portrait'?1280:720,video=validateVideo(path,width,height,duration);
   for(const time of [0,1,2,duration/4,duration/2,duration-2,duration-1/24])execFileSync(ffmpeg,['-y','-ss',String(time),'-i',path,'-frames:v','1',`${folder}/${style}-${time.toFixed(2)}s-decoded.png`],{windowsHide:true,stdio:'ignore'});
   reports.push({style,aspect,duration,video,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),exportMs:await page.evaluate(()=>performance.getEntriesByName('route-story-export').at(-1).duration)});
  }
  if(external.length||errors.length)throw new Error(JSON.stringify({external,errors}));
  writeFileSync(`${folder}/acceptance.json`,JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),os:`${os.type()} ${os.release()} ${os.arch()}`,browser:`Microsoft Edge ${browser.version()}`,external,errors,reports},null,2));console.log(JSON.stringify(reports,null,2));
 }finally{await browser.close();}
});
