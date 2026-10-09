import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { syntheticGpx } from '../../tests/fixtures/synthetic.ts';
import { withServer } from './server.mjs';
import { validateVideo } from '../validate-video.mjs';
if(os.platform()!=='win32')throw new Error('This opt-in native sampler requires Windows. No other platform is claimed measured.');
mkdirSync('artifacts/sprint3',{recursive:true});
await withServer(async url=>{
  const server=await chromium.launchServer({channel:'msedge',headless:true,host:'127.0.0.1'}),rootPid=server.process().pid;
  let browser;
  try {browser=await chromium.connect(server.wsEndpoint());}catch(error){await server.close();throw error;}
  const file=resolve(`artifacts/sprint3/memory-${rootPid}.jsonl`),stop=resolve(`artifacts/sprint3/stop-memory-${rootPid}-${Date.now()}`),stages=[];
  const sampler=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve('scripts/acceptance/sample-memory.ps1'),'-RootPid',String(rootPid),'-OutputFile',file,'-StopFile',stop],{windowsHide:true,stdio:'pipe'});
  let samplerError='';sampler.stderr.on('data',b=>{samplerError+=b;});
  const page=await browser.newPage(),cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  const heap=async()=>{const{metrics}=await cdp.send('Performance.getMetrics');return Object.fromEntries(metrics.filter(m=>['JSHeapUsedSize','JSHeapTotalSize'].includes(m.name)).map(m=>[m.name,m.value]));};
  const stage=async(label,action)=>{const start=Date.now(),heapBefore=await heap(),value=await action(),heapAfter=await heap();stages.push({label,start,end:Date.now(),heapBefore,heapAfter});return value;};
  try{
    await page.goto(url);for(let i=0;i<50&&(!existsSync(file)||readFileSync(file,'utf8').split('\n').length<3);i++)await page.waitForTimeout(100);
    if(!existsSync(file)||readFileSync(file,'utf8').trim().length===0)throw new Error(`OS sampler unavailable: ${samplerError}`);
    await stage('baseline-empty',()=>page.waitForTimeout(1000));
    const xml=syntheticGpx(50000,'segments');
    for(let cycle=0;cycle<4;cycle++){
      await stage(`cycle-${cycle}-import-50000`,async()=>{await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'synthetic-50000.gpx',mimeType:'application/xml',buffer:Buffer.from(xml)});await page.waitForFunction(()=>!document.querySelector('#export').disabled);});
      await stage(`cycle-${cycle}-seek`,async()=>{for(const t of [1,19,3,17,5,15])await page.locator('#scrub').fill(String(t));});
      await page.locator('#duration').selectOption('10');await page.locator('#quality').selectOption('compatibility');await page.waitForFunction(()=>!document.querySelector('#export').disabled);
      for(const quality of ['compatibility','standard']){
        await page.locator('#quality').selectOption(quality);await page.locator('#duration').selectOption(quality==='standard'?'30':'10');await page.waitForFunction(()=>!document.querySelector('#export').disabled);
        await stage(`cycle-${cycle}-export-${quality}`,async()=>{const pending=page.waitForEvent('download');await page.locator('#export').click();const d=await pending;if(cycle===3){const path=`artifacts/sprint3/memory-${quality}.mp4`;await d.saveAs(path);validateVideo(path,quality==='standard'?1280:640,quality==='standard'?720:360,quality==='standard'?30:10);}});
      }
      await stage(`cycle-${cycle}-cancel`,async()=>{await page.locator('#export').click();await page.locator('#cancel').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Экспорт отменён.');});
      await stage(`cycle-${cycle}-retry`,async()=>{const pending=page.waitForEvent('download');await page.locator('#export').click();await pending;});
      await stage(`cycle-${cycle}-replace-100`,async()=>{await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'synthetic-100.gpx',mimeType:'application/xml',buffer:Buffer.from(syntheticGpx(100))});await page.waitForFunction(()=>!document.querySelector('#export').disabled);});
      await stage(`cycle-${cycle}-invalid-cleanup`,async()=>{await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'invalid.gpx',mimeType:'application/xml',buffer:Buffer.from('<gpx>')});await page.locator('#empty').waitFor({state:'visible'});});
      await stage(`cycle-${cycle}-retained-after-cleanup`,()=>page.waitForTimeout(3000));
    }
    assert.deepEqual(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
    // Test-only GC observation; never shipped or called by production application.
    await stage('test-only-gc',async()=>{await cdp.send('HeapProfiler.collectGarbage');await page.waitForTimeout(1000);});
    await stage('after-page-unload',async()=>{await page.goto('about:blank');await page.waitForTimeout(1000);});
  }finally{writeFileSync(stop,'stop');await new Promise(resolve=>{const timer=setTimeout(()=>{sampler.kill();resolve();},3000);sampler.once('exit',()=>{clearTimeout(timer);resolve();});});await browser.close();await server.close();}
  if(samplerError)throw new Error(samplerError);
  const samples=readFileSync(file,'utf8').trim().split('\n').map(s=>JSON.parse(s)),intervals=samples.slice(1).map((s,i)=>s.unixMs-samples[i].unixMs);
  for(const stage of stages){const selected=samples.filter(s=>s.unixMs>=stage.start&&s.unixMs<=stage.end);stage.sampleCount=selected.length;stage.privatePeakBytes=selected.length?Math.max(...selected.map(s=>s.privateSumBytes)):null;stage.workingSetSumPeakBytes=selected.length?Math.max(...selected.map(s=>s.workingSetSumBytes)):null;stage.lastNative=selected.at(-1)??null;}
  writeFileSync('artifacts/sprint3/memory.json',JSON.stringify({os:`${os.type()} ${os.release()} ${os.arch()}`,rootPid,method:'Windows Get-Process WorkingSet64 / PrivateMemorySize64 for root and Win32_Process descendants of isolated Edge. Working set sum double-counts shared pages; private bytes are private committed virtual memory. Observed sampled peaks, not exact allocation peaks. CDP page JS heap is separate. GPU VRAM and dedicated encoder memory unmeasured.',sampleIntervalMs:{min:Math.min(...intervals),max:Math.max(...intervals)},stages,samples},null,2));
  console.log(JSON.stringify(stages.map(({label,privatePeakBytes,workingSetSumPeakBytes,heapAfter,sampleCount})=>({label,privatePeakBytes,workingSetSumPeakBytes,heapAfter,sampleCount})),null,2));
});
