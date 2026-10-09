import { chromium, firefox, webkit, devices } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import assert from 'node:assert/strict';
import { withServer } from './server.mjs';
import { validateVideo } from '../validate-video.mjs';
import { syntheticGpx } from '../../tests/fixtures/synthetic.ts';
mkdirSync('artifacts/sprint3',{recursive:true});
const environments = [
  { name:'edge-desktop', type:chromium, launch:{channel:'msedge'}, emulation:false },
  { name:'chrome-desktop', type:chromium, launch:{channel:'chrome'}, emulation:false },
  { name:'firefox-playwright', type:firefox, launch:{}, emulation:false },
  { name:'webkit-playwright', type:webkit, launch:{}, emulation:false },
  { name:'chromium-mobile-emulation', type:chromium, launch:{}, emulation:true }
];
await withServer(async url => {
  const reports=[];
  for(const environment of environments) {
    let browser;
    const report={name:environment.name,os:`${os.type()} ${os.release()} ${os.arch()}`,emulation:environment.emulation,physicalMobile:false,configurations:[]};
    try {
      browser=await environment.type.launch({headless:true,timeout:20_000,...environment.launch});report.version=browser.version();
    } catch(error) { report.status='ENVIRONMENT BLOCKED';report.reason=error.message.slice(0,500);reports.push(report);continue; }
    try {
      const context=await browser.newContext(environment.emulation?devices['Pixel 5']:{viewport:{width:1280,height:900}}),page=await context.newPage();
      const external=[],errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==url){external.push(r.request().url());return r.abort();}return r.continue();});
      await page.goto(url);await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'synthetic-matrix.gpx',mimeType:'application/xml',buffer:Buffer.from(syntheticGpx(100,'segments'))});
      await page.locator('#preview').waitFor({state:'visible'});await page.locator('#scrub').fill('3');const first=await page.locator('#preview').evaluate(c=>c.toDataURL());await page.locator('#scrub').fill('19');await page.locator('#scrub').fill('3');assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),first);
      await page.locator('#play').click();await page.waitForTimeout(150);await page.locator('#play').click();assert.ok(Number(await page.locator('#scrub').inputValue())>3);
      if(environment.emulation) {await page.locator('#play').tap();await page.waitForTimeout(100);await page.locator('#play').tap();await page.locator('#scrub').tap();}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      report.preview='VERIFIED';report.webCodecs=await page.evaluate(()=>typeof VideoEncoder!=='undefined');
      await page.getByLabel('Длительность видео').selectOption('10');
      for(const quality of ['compatibility','standard'])for(const aspect of ['landscape','portrait']) {
        await page.locator('#quality').selectOption(quality);await page.locator('#ratio').selectOption(aspect);await page.getByRole('button',{name:aspect==='portrait'?'Ночной':'Атлас',exact:true}).click();
        const capability=await page.evaluate(async()=>{const path='/src/exporter.ts';const{detectEncoder}=await import(path),canvas=document.querySelector('#preview');try{return{codec:await detectEncoder(canvas.width,canvas.height,document.querySelector('#quality').value==='standard'?5_000_000:1_500_000)}}catch(e){return{reason:e.message}}});
        const item={quality,aspect,...capability,width:await page.locator('#preview').getAttribute('width'),height:await page.locator('#preview').getAttribute('height')};
        if(capability.codec) {
          await page.waitForFunction(()=>!document.querySelector('#export').disabled);const pending=page.waitForEvent('download',{timeout:60_000});await page.locator('#export').click();const d=await pending,path=`artifacts/sprint3/matrix-${environment.name}-${quality}-${aspect}.mp4`;await d.saveAs(path);item.video=validateVideo(path,Number(item.width),Number(item.height),10);item.status='VERIFIED';
        } else { assert.equal(await page.locator('#export').isDisabled(),true);assert.ok((await page.locator('#status').textContent()).length>20);item.status='UNSUPPORTED'; }
        report.configurations.push(item);
      }
      await page.screenshot({path:`artifacts/sprint3/matrix-${environment.name}.png`,fullPage:true});assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
      assert.deepEqual(await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,db:await indexedDB.databases(),cache:await caches.keys()})),{local:0,session:0,db:[],cache:[]});
      await page.reload();await page.locator('#empty').waitFor({state:'visible'});report.privacy='VERIFIED';report.status=report.configurations.some(c=>c.status==='VERIFIED')?'VERIFIED':'UNSUPPORTED';
    } catch(error) {report.status='FAILED';report.reason=error.stack;}
    finally {await browser.close();}
    reports.push(report);console.log(JSON.stringify(report));
  }
  reports.push({name:'physical-Android-Chrome',status:'NOT TESTED',reason:'No connected physical device or legitimate remote device environment available.'},{name:'physical-iOS-Safari',status:'NOT TESTED',reason:'No Apple hardware/device environment available; Playwright WebKit is not Safari.'});
  writeFileSync('artifacts/sprint3/compatibility.json',JSON.stringify(reports,null,2));
  if(reports.some(r=>r.status==='FAILED'))process.exitCode=1;
});
