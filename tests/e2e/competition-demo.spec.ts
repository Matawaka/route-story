import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateVideo} from '../../scripts/validate-video.mjs';

test('competition: real UI route style replay editor projects and H264 in both aspects',async({browser})=>{
 test.skip(process.env.COMPETITION_DEMO!=='1','Synthetic competition recording is opt-in');
 test.setTimeout(420_000);
 const dir='artifacts/competition';mkdirSync(dir,{recursive:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir,size:{width:1440,height:1000}}});
 const external:string[]=[],errors:string[]=[],steps:{name:string;milliseconds:number}[]=[];
 const started=Date.now();const mark=(name:string)=>steps.push({name,milliseconds:Date.now()-started});
 await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4173'?r.continue():(external.push(r.request().url()),r.abort()));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const video=page.video()!;
 const ready=()=>page.waitForFunction(()=>!document.querySelector<HTMLButtonElement>('#export')!.disabled,undefined,{timeout:120_000});
 const stop=async()=>{if(await page.locator('body').getAttribute('data-state')==='PLAYING')await page.locator('#play').click();};
 const reports:any[]=[];let passed=false;
 try{
  await page.goto('http://127.0.0.1:4173/');await page.locator('#welcome-close').click();await ready();await stop();
  mark('select synthetic Furka route');await page.locator('#route-choice').selectOption('furka');await ready();await stop();
  await page.locator('#duration').selectOption('10');await ready();await page.locator('#quality').selectOption('compatibility');await ready();
  mark('choose Atlas style');await page.locator('[data-style="night"]').click();await ready();await page.locator('[data-style="atlas"]').click();await ready();
  await page.locator('#scrub').fill('0');mark('play actual replay');await page.locator('#play').click();
  await page.waitForFunction(()=>Number(document.querySelector<HTMLInputElement>('#scrub')!.value)>2.5);await stop();
  await page.locator('#scrub').fill('5');await page.screenshot({path:dir+'/01-route-replay.png',fullPage:true});
  mark('open storyboard editor');await page.locator('#edit-story').click();await ready();
  await expect(page.locator('body')).toHaveAttribute('data-montage','edited');await expect(page.locator('#storyboard')).toBeVisible();
  await page.locator('.scene-card').nth(2).click();
  await page.waitForFunction(()=>document.querySelector<HTMLSelectElement>('#scene-shot')!.options.length>1&&!document.querySelector<HTMLSelectElement>('#scene-shot')!.disabled,undefined,{timeout:120_000});
  const shot=await page.locator('#scene-shot option').nth(1).getAttribute('value');mark('choose certified shot');await page.locator('#scene-shot').selectOption(shot!);await ready();
  await page.locator('#scene-duration').fill('4');mark('edit scene time');await page.locator('#apply-scene-duration').click();await ready();
  const cards=await page.locator('.scene-card').allTextContents();
  await page.locator('#undo-edit').click();await ready();expect(await page.locator('.scene-card').allTextContents()).not.toEqual(cards);
  await page.locator('#redo-edit').click();await ready();expect(await page.locator('.scene-card').allTextContents()).toEqual(cards);mark('Undo Redo passed');
  await page.locator('#scrub').fill('5');const reference=await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
  await page.locator('#scrub').fill('9');await page.locator('#scrub').fill('1');await page.locator('#scrub').fill('5');
  expect(await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(reference);
  await page.locator('#storyboard').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/02-storyboard-landscape.png',fullPage:true});
  const save=page.waitForEvent('download');await page.locator('#save-project').click();const projectPath=dir+'/synthetic-furka.rstory.json';await(await save).saveAs(projectPath);
  const project=JSON.parse(readFileSync(projectPath,'utf8'));expect(project.schema).toBe('route-story.project/v1');expect(JSON.stringify(project)).not.toMatch(/"(?:lat|lon|points|segments|url)"/);
  expect(project.montage.scenes.reduce((n:number,s:any)=>n+s.frames,0)).toBe(240);
  for(const aspect of ['landscape','portrait'] as const){
   if(aspect==='portrait'){await page.locator('#ratio').selectOption(aspect);await ready();await expect(page.locator('#montage-format')).toContainText('9:16');await page.locator('#scrub').fill('5');await page.screenshot({path:dir+'/03-storyboard-portrait.png',fullPage:true});}
   mark('export actual edited '+aspect+' MP4');const pending=page.waitForEvent('download',{timeout:180_000});await page.locator('#export').click();const file=dir+'/edited-'+aspect+'-10s.mp4';await(await pending).saveAs(file);await ready();
   await expect(page.locator('#status')).toContainText('MP4 создан');reports.push({...validateVideo(file,aspect==='landscape'?640:360,aspect==='landscape'?360:640,10),sha256:createHash('sha256').update(readFileSync(file)).digest('hex')});
  }
  await page.reload();await page.locator('#welcome-close').click();await ready();await stop();await page.locator('#project-file').setInputFiles(projectPath);await ready();
  expect(await page.locator('.scene-card').allTextContents()).toEqual(cards);await page.locator('#scrub').fill('5');
  expect(await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(reference);mark('project reopened with exact same pixels');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:dir+'/04-storyboard-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);expect(external).toEqual([]);expect(errors).toEqual([]);passed=true;
 }finally{
  await context.close();renameSync(await video.path(),dir+'/interface.webm');
  writeFileSync(dir+'/acceptance.json',JSON.stringify({status:passed?'PASS':'FAILED',sourceHead:'d1b75ca2e5997bf2647b86983f653fa5f8c535f8',evidenceHead:process.env.GITHUB_SHA??'local',browser:browser.version(),syntheticOnly:true,recording:'Real Playwright recording of the application UI; never generated artwork',external,errors,steps,exports:reports,physicalDevices:'NOT TESTED'},null,2));
 }
});
