import {chromium} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {withServer} from './server.mjs';
import {validateVideo} from '../validate-video.mjs';
if(os.platform()!=='win32')throw Error('Windows process-tree sampler required.');
const folder=process.argv.includes('--final')?'artifacts/sprint8/memory-final':process.argv.includes('--after')?'artifacts/sprint8/memory-after':'artifacts/sprint8/memory';mkdirSync(folder,{recursive:true});
const original=readFileSync('public/samples/terrain-sogne.gpx','utf8'),matches=[...original.matchAll(/<trkpt lat="([^"]+)" lon="([^"]+)"\/>/g)].map(m=>[Number(m[1]),Number(m[2])]);
const points=Array.from({length:50000},(_,i)=>{const at=i*(matches.length-1)/49999,j=Math.min(matches.length-2,Math.floor(at)),t=at-j;return `<trkpt lat="${(matches[j][0]+(matches[j+1][0]-matches[j][0])*t).toFixed(8)}" lon="${(matches[j][1]+(matches[j+1][1]-matches[j][1])*t).toFixed(8)}"/>`;});
const large=`<gpx creator="Synthetic terrain stress"><trk><name>Synthetic 50000</name><trkseg>${points.join('')}</trkseg></trk></gpx>`;
writeFileSync(`${folder}/synthetic-50000.gpx`,large);
await withServer(async url=>{for(const mode of process.argv.includes('--terrain-only')?['terrain']:['cinematic','terrain']){
 const server=await chromium.launchServer({channel:'msedge',headless:true,host:'127.0.0.1'}),browser=await chromium.connect(server.wsEndpoint()),rootPid=server.process().pid;
 const file=resolve(`${folder}/${mode}-${rootPid}.jsonl`),stop=resolve(`${folder}/stop-${mode}-${rootPid}`),stages=[];
 const sampler=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve('scripts/acceptance/sample-memory.ps1'),'-RootPid',String(rootPid),'-OutputFile',file,'-StopFile',stop],{windowsHide:true,stdio:'pipe'});let samplerError='';sampler.stderr.on('data',b=>samplerError+=b);
 const page=await browser.newPage(),cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const heap=async()=>{const{metrics}=await cdp.send('Performance.getMetrics');return Object.fromEntries(metrics.filter(m=>['JSHeapUsedSize','JSHeapTotalSize'].includes(m.name)).map(m=>[m.name,m.value]));};
 const stage=async(label,action)=>{const start=Date.now(),heapBefore=await heap();const result=await action();stages.push({label,start,end:Date.now(),heapBefore,heapAfter:await heap()});return result;};
 let audit;
 try{await page.goto(url);await page.locator('#camera-mode').selectOption(mode);
  await page.evaluate(async mode=>{const path=mode==='terrain'?'/src/terrain-renderer.ts':'/src/renderer.ts',m=await import(path),C=mode==='terrain'?m.TerrainRenderer:m.RouteRenderer,draw=C.prototype.draw,dispose=C.prototype.dispose,seen=new WeakSet(),routes=new WeakSet();window.terrainAudit={renderers:[],routes:[],disposed:0,zero:true};
   C.prototype.draw=function(...args){if(!seen.has(this)){seen.add(this);window.terrainAudit.renderers.push(new WeakRef(this));}const route=this.timeline.route;if(!routes.has(route)){routes.add(route);window.terrainAudit.routes.push(new WeakRef(route));}return draw.apply(this,args);};
   C.prototype.dispose=function(){dispose.call(this);window.terrainAudit.disposed++;window.terrainAudit.zero&&=mode==='terrain'?this.gpu.domElement.width===0&&this.gpu.domElement.height===0:this.base.width===0&&this.highlight.width===0;};
  },mode);
  for(let i=0;i<30&&(!existsSync(file)||readFileSync(file,'utf8').split('\n').length<3);i++)await page.waitForTimeout(100);
  await stage('baseline',()=>page.waitForTimeout(1500));
  for(let cycle=0;cycle<3;cycle++){
   await stage(`cycle${cycle}-import50000`,async()=>{await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'synthetic.gpx',mimeType:'application/xml',buffer:Buffer.from(large)});await page.waitForFunction(()=>!document.querySelector('#export').disabled);});
   await stage(`cycle${cycle}-seek`,async()=>{for(const t of [1,19,3,17,5,15])await page.locator('#scrub').fill(String(Math.min(Number(await page.locator('#scrub').getAttribute('max')),t)));});
   for(const quality of ['compatibility','standard']){
    await page.locator('#quality').selectOption(quality);await page.locator('#duration').selectOption(quality==='standard'?'30':'10');await page.waitForFunction(()=>!document.querySelector('#export').disabled);
    await stage(`cycle${cycle}-export-${quality}`,async()=>{const start=performance.now(),pending=page.waitForEvent('download');await page.locator('#export').click();const d=await pending;if(cycle===2){const path=`${folder}/${mode}-${quality}.mp4`;await d.saveAs(path);validateVideo(path,quality==='standard'?1280:640,quality==='standard'?720:360,quality==='standard'?30:10);}console.log({mode,cycle,quality,exportWallMs:performance.now()-start});});
   }
   await stage(`cycle${cycle}-cancel`,async()=>{await page.locator('#export').click();await page.locator('#cancel').click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Экспорт отменён.');});
   await stage(`cycle${cycle}-retry`,async()=>{const pending=page.waitForEvent('download');await page.locator('#export').click();await pending;});
   await stage(`cycle${cycle}-replace`,async()=>{await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'synthetic-small.gpx',mimeType:'application/xml',buffer:Buffer.from(original)});await page.waitForFunction(()=>!document.querySelector('#export').disabled);});
   await stage(`cycle${cycle}-invalid`,async()=>{await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'invalid.gpx',mimeType:'application/xml',buffer:Buffer.from('<gpx>')});await page.locator('#empty').waitFor({state:'visible'});});
   await stage(`cycle${cycle}-retained`,()=>page.waitForTimeout(2000));
  }
  await stage('test-only-gc',async()=>{await cdp.send('HeapProfiler.collectGarbage');await page.waitForTimeout(1000);});
  audit=await page.evaluate(()=>({disposed:window.terrainAudit.disposed,zero:window.terrainAudit.zero,remainingRenderers:window.terrainAudit.renderers.filter(r=>r.deref()).length,remainingRoutes:window.terrainAudit.routes.filter(r=>r.deref()).length,local:localStorage.length,session:sessionStorage.length}));assert.equal(audit.remainingRenderers,0);assert.equal(audit.remainingRoutes,0);assert.equal(audit.zero,true);assert.equal(audit.local+audit.session,0);
  await stage('page-unload',async()=>{await page.goto('about:blank');await page.waitForTimeout(1000);});
 }finally{writeFileSync(stop,'stop');await new Promise(resolve=>{const timer=setTimeout(()=>{sampler.kill();resolve();},3000);sampler.once('exit',()=>{clearTimeout(timer);resolve();});});await browser.close();await server.close();}
 if(samplerError)throw Error(samplerError);const samples=readFileSync(file,'utf8').trim().split('\n').map(l=>JSON.parse(l));for(const s of stages){const a=samples.filter(r=>r.unixMs>=s.start&&r.unixMs<=s.end);s.sampleCount=a.length;s.privatePeakBytes=a.length?Math.max(...a.map(r=>r.privateSumBytes)):null;s.workingSetPeakBytes=a.length?Math.max(...a.map(r=>r.workingSetSumBytes)):null;s.lastNative=a.at(-1)||null;}
 writeFileSync(`${folder}/${mode}.json`,JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),uncommitted:!!execFileSync('git', ['status','--porcelain'], {encoding:'utf8',windowsHide:true}).trim(),os:`${os.type()} ${os.release()} ${os.arch()}`,mode,pointCount:50000,gpxBytes:Buffer.byteLength(large),method:'Separate isolated Edge root plus descendants; Windows PrivateMemorySize64 and WorkingSet64 sums. Private bytes are committed virtual memory, not resident physical memory; working-set sums double-count shared pages. Sampled peaks; CDP heap is separate. GPU VRAM and dedicated codec memory unmeasured. Test-only GC, never production.',audit,stages,samples},null,2));console.log({mode,audit,privatePeakBytes:Math.max(...samples.map(s=>s.privateSumBytes))});
}});
