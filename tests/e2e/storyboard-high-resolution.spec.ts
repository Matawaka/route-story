import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateVideo} from '../../scripts/validate-video.mjs';

// One real edited export per job keeps software-GPU acceptance bounded. It
// retains full duration, real pointer cancellation and independent H.264 decode.
test('MVP1.7 edited high-resolution UI: cancel, retry, exact frames and project',async({page})=>{
 test.skip(process.env.MVP17_HIGH_RES!=='1','Opt-in real Full HD / 4K montage');
 test.setTimeout(900_000);
 const quality=process.env.HIGH_RES_QUALITY??'fullhd',aspect=process.env.HIGH_RES_ASPECT??'landscape';
 expect(['fullhd','ultra']).toContain(quality);expect(['landscape','portrait']).toContain(aspect);
 const dir=`artifacts/mvp17-${quality}-${aspect}`;mkdirSync(dir,{recursive:true});
 const report:any={status:'PENDING',sourceCommit:process.env.BUILD_COMMIT??process.env.GITHUB_SHA,quality,aspect,syntheticOnly:true,physicalDevices:'NOT TESTED'};
 const errors:string[]=[],external:string[]=[];let downloads=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('download',()=>downloads++);
 await page.context().route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4173'?r.continue():(external.push(r.request().url()),r.abort()));
 await page.addInitScript(()=>{
  const Native=window.VideoFrame;
  window.VideoFrame=class extends Native{constructor(source:any,options:any){super(source,options);if(source instanceof HTMLCanvasElement&&options?.timestamp===5_000_000)(window as any).__editedSource=source.toDataURL();}};
 });
 const ready=()=>expect(page.locator('#export')).toBeEnabled({timeout:120_000});
 try{
  await page.goto('/');await page.locator('#welcome-close').click();await ready();
  await page.locator('#route-choice').selectOption('furka');await ready();
  await page.locator('#duration').selectOption('10');await ready();await page.locator('#ratio').selectOption(aspect);await ready();
  await page.locator('#edit-story').click();await ready();await expect(page.locator('body')).toHaveAttribute('data-montage','edited');
  await expect(page.locator('.scene-card')).toHaveCount(3);await page.locator('.scene-card').nth(1).click();
  await expect(page.locator('#scene-shot')).toBeEnabled({timeout:120_000});
  const shot=await page.locator('#scene-shot option').nth(1).getAttribute('value');expect(shot).toBeTruthy();
  await page.locator('#scene-shot').selectOption(shot!);await ready();
  await page.locator('.scene-card').nth(0).click();await page.locator('#scene-duration').fill('3');
  const originalCards=await page.locator('.scene-card').allTextContents();await page.locator('#apply-scene-duration').click();await ready();
  const cards=await page.locator('.scene-card').allTextContents();expect(cards).not.toEqual(originalCards);
  await page.locator('#undo-edit').click();await ready();expect(await page.locator('.scene-card').allTextContents()).toEqual(originalCards);
  await page.locator('#redo-edit').click();await ready();expect(await page.locator('.scene-card').allTextContents()).toEqual(cards);
  await page.locator('#quality').selectOption(quality);await ready();
  await page.locator('#scrub').fill('5');
  // Observe the existing resident renderer, without changing draw/encode pixels.
  await page.evaluate(async()=>{
   const {TerrainRenderer}=await import('/src/terrain-renderer.ts'),draw=TerrainRenderer.prototype.draw;
   TerrainRenderer.prototype.draw=function(c:HTMLCanvasElement,t:number){(window as any).__editedRenderer=this;return draw.call(this,c,t);};
  });
  await page.locator('#scrub').fill('1');await page.locator('#scrub').fill('5');
  const preview=await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  await page.locator('#scrub').fill('9');await page.locator('#scrub').fill('0');await page.locator('#scrub').fill('5');
  expect(await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(preview);
  const long=quality==='ultra'?3840:1920,short=quality==='ultra'?2160:1080,width=aspect==='portrait'?short:long,height=aspect==='portrait'?long:short;
  const reference=await page.evaluate(({width,height})=>{
   const r=(window as any).__editedRenderer,original=[r.width,r.height],c=document.createElement('canvas');(window as any).__editedGpu=r.gpu;
   try{r.setOutputSize(width,height);r.draw(c,5);return c.toDataURL();}finally{r.setOutputSize(...original);r.draw(document.querySelector('#preview'),5);c.width=c.height=0;}
  },{width,height});
  const projectFile=dir+'/synthetic-furka.rstory.json',save=page.waitForEvent('download');await page.locator('#save-project').click();await(await save).saveAs(projectFile);
  const project=JSON.parse(readFileSync(projectFile,'utf8'));expect(project.montage.scenes.reduce((n:number,s:any)=>n+s.frames,0)).toBe(240);
  expect(JSON.stringify(project)).not.toMatch(/"(?:lat|lon|points|segments|url)"/);
  const before=downloads,cancelStarted=Date.now();await page.locator('#export').click();
  await page.waitForFunction(()=>Number((document.querySelector('#export-progress') as HTMLProgressElement).value)>0,undefined,{timeout:90_000});
  await page.locator('#cancel').click();await expect(page.locator('body')).toHaveAttribute('data-state','CANCELLED',{timeout:30_000});await ready();
  expect(downloads).toBe(before);expect(await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(preview);
  report.cancel={status:'PASS',actualPointerClick:true,noDownload:true,milliseconds:Date.now()-cancelStarted};
  const pending=page.waitForEvent('download',{timeout:600_000}),started=Date.now();await page.locator('#export').click();
  const file=dir+'/edited-10s.mp4';await(await pending).saveAs(file);await ready();await expect(page.locator('#status')).toContainText('MP4 создан');
  report.export={...validateVideo(file,width,height,10),sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),milliseconds:Date.now()-started};
  expect(await page.evaluate(()=> (window as any).__editedSource)).toBe(reference);
  expect(await page.evaluate(()=> (window as any).__editedGpu===(window as any).__editedRenderer.gpu)).toBe(true);
  expect(await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(preview);
  await page.reload();await page.locator('#welcome-close').click();await ready();
  await page.locator('#project-file').setInputFiles(projectFile);await expect(page.locator('body')).toHaveAttribute('data-montage','edited',{timeout:120_000});await ready();
  await expect(page.locator('.scene-card')).toHaveCount(3);expect(await page.locator('.scene-card').allTextContents()).toEqual(cards);
  await page.locator('#scrub').fill('5');expect(await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(preview);
  await page.screenshot({path:dir+'/storyboard.png',fullPage:true});
  expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);expect(errors).toEqual([]);expect(external).toEqual([]);
  report.exactPreviewEncoderAndReverseSeek=true;report.oneGpu=true;report.projectReopen=true;report.status='PASS';
 }catch(error){report.status='FAILED';report.error=String(error);throw error;}
 finally{report.errors=errors;report.external=external;writeFileSync(dir+'/acceptance.json',JSON.stringify(report,null,2));}
});
