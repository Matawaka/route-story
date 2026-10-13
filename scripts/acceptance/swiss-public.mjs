/** Optional regional acceptance on the anonymous, unified static application. */
import{chromium}from'@playwright/test';
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{createHash}from'node:crypto';import{execFileSync}from'node:child_process';
import assert from'node:assert/strict';import os from'node:os';
import{withProductionServer}from'./production.mjs';import{validateVideo}from'../validate-video.mjs';
const remote=process.env.APP_URL,full=process.argv.includes('--full'),folder=process.env.ACCEPTANCE_DIR||'artifacts/swiss-public';
mkdirSync(folder,{recursive:true});
if(remote){assert.equal(new URL(remote).protocol,'https:');assert.match(process.env.EXPECTED_COMMIT??'',/^[a-f0-9]{40}$/,'public acceptance requires the exact deployed SHA');}
// Preserve the measured virtual-runner budget without changing frame/codec checks.
const downloadWaitMs=180000,clickWaitMs=60000;
const ready=page=>page.waitForFunction(()=>!document.querySelector('#export').disabled,undefined,{timeout:60000});
async function change(page,id,value){await page.locator(id).selectOption(value);await ready(page);}
async function exportFile(page,file){console.log(JSON.stringify({stage:'export',file,downloadWaitMs}));const[download]=await Promise.all([page.waitForEvent('download',{timeout:downloadWaitMs}),page.locator('#export').click({timeout:clickWaitMs})]);await download.saveAs(file);}
await(remote?callback=>callback(remote):withProductionServer)(async url=>{
  const base=new URL(url),browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||(os.platform()==='win32'?'msedge':undefined)}),page=await browser.newPage(),external=[],errors=[],bad=[],outputs=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push({url:r.url(),status:r.status()});});
  await page.context().route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(['blob:','data:'].includes(u.protocol))return r.continue();if(u.origin===base.origin&&u.pathname.startsWith(base.pathname)&&['GET','HEAD'].includes(q.method()))return r.continue();external.push({url:q.url(),method:q.method()});return r.abort();});
  try{
    const res=await page.request.get(url+'release.json');assert.equal(res.status(),200);const m=await res.json();assert.deepEqual(m.regionalPacks,['furka']);assert.equal(m.sourceCommit,process.env.EXPECTED_COMMIT||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim());
    for(const f of m.files){const r=await page.request.get(url+f.path);assert.equal(r.status(),200);const b=await r.body();assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);}
    const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));
    const response=await page.goto(url);assert.equal(response.status(),200);assert.equal(await page.evaluate(()=>isSecureContext),true);await ready(page);
    assert.equal(await page.locator('#preview').getAttribute('data-region'),'furka');assert.equal(await page.locator('#preview').getAttribute('data-mode'),'terrain');
    assert.equal(await page.locator('#swiss-demo, #cinematic-demo, #terrain-demo, #demo, .demo-shortcuts').count(),0,'Demo selection has one dropdown without duplicate shortcuts.');
    for(const[id,value]of Object.entries({'route-choice':'furka','route-color':'grade','replay-pacing':'terrain',marker:'traveler',ratio:'landscape',duration:'20',quality:'standard'}))assert.equal(await page.locator('#'+id).inputValue(),value);
    assert.ok(requests.some(p=>p.includes('/regions/furka/')),'The initial demo intentionally loads its fixed first-party regional pack.');assert.ok((await page.locator('#route-info').textContent()).includes('синтетический'));
    await page.locator('#scrub').fill('5');const before=await page.locator('#preview').evaluate(c=>c.toDataURL());await page.locator('#scrub').fill('1');await page.locator('#scrub').fill('5');assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),before);
    await page.locator('#explanations').click();assert.equal(await page.locator('#map-detail-note').isVisible(),false);assert.equal(await page.locator('#source-credit').isVisible(),true);assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),before);
    await page.screenshot({path:`${folder}/main-furka.png`,fullPage:true});await change(page,'#quality','compatibility');await change(page,'#duration','10');
    let cancelledDownloads=0;const listener=()=>cancelledDownloads++;page.on('download',listener);await page.locator('#export').click({timeout:clickWaitMs});await page.locator('#cancel').click({timeout:clickWaitMs});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('отменён')&&!document.querySelector('#export').disabled);assert.equal(cancelledDownloads,0);page.off('download',listener);
    const short=`${folder}/main-furka-10s.mp4`;await exportFile(page,short);outputs.push(validateVideo(short,640,360,10));
    const gpx=await(await page.request.get(url+'regions/furka/furka-synthetic.gpx')).body();await change(page,'#camera-mode','auto');await page.locator('#file').setInputFiles({name:'local.gpx',mimeType:'application/gpx+xml',buffer:gpx});await ready(page);assert.equal(await page.locator('#preview').getAttribute('data-region'),'furka');assert.equal(await page.locator('#route-choice').inputValue(),'custom');
    for(const[aspect,style,duration]of[['landscape','atlas',full?20:10],['portrait','night',full?30:10]]){
      // Legacy public links lead to this same interface. Comparison controls
      // remain only on the developer SWISS_PILOT page.
      await page.goto(url+'swiss-pilot.html');await ready(page);assert.equal(page.url(),url);assert.equal(await page.locator('#coverage').count(),0);
      await page.locator('#scrub').fill('0');await page.locator(`[data-style="${style}"]`).click();await ready(page);await change(page,'#ratio',aspect);await change(page,'#duration',String(duration));
      await page.locator('#scrub').fill(String(duration/2));const pixels=await page.locator('#preview').evaluate(c=>c.toDataURL());await page.locator('#scrub').fill('0');await page.locator('#scrub').fill(String(duration/2));assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),pixels);
      await page.screenshot({path:`${folder}/${style}-${aspect}.png`,fullPage:true});const start=performance.now(),file=`${folder}/${style}-${duration}s.mp4`;await exportFile(page,file);
      outputs.push({...validateVideo(file,aspect==='landscape'?1280:720,aspect==='landscape'?720:1280,duration),exportMilliseconds:performance.now()-start,sha256:createHash('sha256').update(readFileSync(file)).digest('hex')});
    }
    await page.setViewportSize({width:375,height:812});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(await page.evaluate(async()=>[localStorage.length,sessionStorage.length,(await indexedDB.databases()).length]),[0,0,0]);
    await page.addInitScript(()=>Object.defineProperty(globalThis,'VideoEncoder',{configurable:true,value:undefined}));await page.goto(url);await page.waitForFunction(()=>document.querySelector('#encoder-note').textContent.includes('WebCodecs'),undefined,{timeout:60000});assert.equal(await page.locator('#export').isDisabled(),true);await page.locator('#scrub').fill('5');assert.ok((await page.locator('#preview').evaluate(c=>c.toDataURL())).length>1000);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(bad,[]);
    const report={status:'VERIFIED',sourceCommit:m.sourceCommit,url,publicHttps:!!remote,browser:browser.version(),os:`${os.type()} ${os.release()}`,physicalDevice:false,manifestHashes:m.files.length,packageBytes:m.totalBytes,initialSwissAutoload:true,legacyEntryRedirects:true,privateGpxNotUploaded:true,external,errors,bad,outputs};writeFileSync(`${folder}/acceptance.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,source:m.sourceCommit,url,outputs:outputs.map(v=>({file:v.file,bytes:v.bytes,frames:v.decodedFrames}))}));
  }catch(error){const status=await page.locator('#status').textContent({timeout:3000}).catch(()=>null);writeFileSync(`${folder}/failure.json`,JSON.stringify({url,message:error.message,status,external,errors,bad,completedOutputs:outputs},null,2)+'\n');await page.screenshot({path:`${folder}/failure.png`,fullPage:true,timeout:5000}).catch(()=>{});throw error;}finally{await browser.close();}
});
