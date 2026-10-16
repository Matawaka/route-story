import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateVideo} from '../../scripts/validate-video.mjs';

test('touch editor: proportional timeline, frame steps, scene navigation, projects and real portrait MP4',async({browser})=>{
  test.skip(process.env.MOBILE_EDITOR_ACCEPTANCE!=='1','Opt-in synthetic Furka mobile editor acceptance');
  test.setTimeout(360_000);
  const dir='artifacts/mobile-editor';mkdirSync(dir,{recursive:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,recordVideo:{dir,size:{width:390,height:844}}});
  const external:string[]=[],errors:string[]=[],viewports:{width:number;height:number}[]=[];
  await context.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:4173'?route.continue():(external.push(route.request().url()),route.abort()));
  const page=await context.newPage(),recording=page.video()!;page.on('pageerror',e=>errors.push(e.message));
  const ready=async()=>{
    await expect(page.locator('#export')).toBeEnabled({timeout:120_000});
    await expect(page.locator('body')).toHaveAttribute('data-montage','edited',{timeout:120_000});
  };
  const optionsReady=()=>expect(page.locator('#shot-note')).not.toContainText('Подбираем',{timeout:120_000});
  const selected=page.locator('.scene-card[aria-pressed="true"]');
  const montageScrub=page.locator('#montage-scrub');
  const timelineFrames=()=>page.locator('.timeline-segment').evaluateAll(bands=>bands.map(band=>Number((band as HTMLElement).dataset.frames)));
  const visibleCard=async()=>expect.poll(()=>selected.evaluate(button=>{
    const card=button.getBoundingClientRect(),strip=document.querySelector('#scene-strip')!.getBoundingClientRect();
    return card.left>=strip.left-1&&card.right<=strip.right+1;
  })).toBe(true);
  let passed=false,videoReport:unknown;
  try{
    await page.goto('/');await page.locator('#welcome-close').click();
    await expect(page.locator('#export')).toBeEnabled({timeout:120_000});
    await page.locator('#quality').selectOption('compatibility');await expect(page.locator('#export')).toBeEnabled();
    await page.locator('#edit-story').tap();await ready();
    await expect(page.locator('.scene-card')).toHaveCount(5);
    await expect(page.locator('.timeline-segment')).toHaveCount(5);
    const originalFrames=await timelineFrames();expect(originalFrames.reduce((a,b)=>a+b,0)).toBe(480);
    await expect(page.locator('#scene-position')).toContainText('Сцена 2 из 5');await visibleCard();
    await page.locator('#next-scene').scrollIntoViewIfNeeded();
    const before=await page.evaluate(()=>scrollY);await page.locator('#next-scene').tap();
    await expect(page.locator('#scene-position')).toContainText('Сцена 3 из 5');await visibleCard();
    expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThanOrEqual(1);
    await optionsReady();await expect(page.locator('#scene-shot')).toBeEnabled();
    const choices=await page.locator('#scene-shot option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));
    expect(choices.length).toBeGreaterThan(1);
    // Deliberately issue A → B → A in one event turn. These are real DOM
    // handlers and camera proofs; no renderer, proof result or timer is mocked.
    await page.evaluate(()=>{const cards=document.querySelectorAll<HTMLButtonElement>('.scene-card');cards[2].click();cards[1].click();cards[2].click();});
    await optionsReady();
    const after=await page.locator('#scene-shot option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));
    expect(new Set(after).size).toBe(after.length);expect(after.sort()).toEqual(choices.sort());
    await page.locator('#scene-shot').selectOption(after.find(value=>value!=='auto')!);await ready();
    await page.locator('#scene-duration').fill('7');
    await page.locator('#play').tap();await expect(page.locator('body')).toHaveAttribute('data-state','PLAYING');
    await page.locator('#play').tap();await expect(page.locator('#scene-duration')).toHaveValue('7');
    await page.locator('#apply-scene-duration').tap();await ready();
    const edited=await page.locator('.scene-card').allTextContents();
    const editedFrames=await timelineFrames();expect(editedFrames).not.toEqual(originalFrames);expect(editedFrames[2]).toBe(168);
    // The visible bands represent real duration, including short intro/outro.
    const bands=await page.locator('.timeline-segment').evaluateAll(bands=>bands.map(band=>({width:band.getBoundingClientRect().width,frames:Number((band as HTMLElement).dataset.frames)})));
    const totalWidth=bands.reduce((sum,band)=>sum+band.width,0);
    for(const band of bands)expect(band.width/totalWidth).toBeCloseTo(band.frames/480,2);
    await page.locator('#undo-edit').tap();await ready();expect(await page.locator('.scene-card').allTextContents()).not.toEqual(edited);
    expect(await timelineFrames()).toEqual(originalFrames);
    await page.locator('#redo-edit').tap();await ready();expect(await page.locator('.scene-card').allTextContents()).toEqual(edited);await visibleCard();
    expect(await timelineFrames()).toEqual(editedFrames);

    await page.locator('#play').tap();await expect(page.locator('body')).toHaveAttribute('data-state','PLAYING');
    await page.locator('#next-scene').tap();await expect(page.locator('body')).toHaveAttribute('data-state','PAUSED');
    await page.locator('#next-scene').tap();await expect(page.locator('#scene-position')).toContainText('Сцена 5 из 5');
    await expect(page.locator('#next-scene')).toBeDisabled();await visibleCard();
    expect(await page.locator('#scene-strip').evaluate(strip=>strip.scrollLeft)).toBeGreaterThan(0);
    await page.setViewportSize({width:1280,height:900});await selected.focus();await selected.press('Home');
    await expect(page.locator('#scene-position')).toContainText('Сцена 1 из 5');await expect(page.locator('#previous-scene')).toBeDisabled();
    await selected.press('End');await expect(page.locator('#scene-position')).toContainText('Сцена 5 из 5');
    await selected.press('ArrowLeft');await expect(page.locator('#scene-position')).toContainText('Сцена 4 из 5');
    await expect(page.locator('.scene-card[tabindex="0"]')).toHaveCount(1);await expect(selected).toBeFocused();
    for(const size of [{width:320,height:740},{width:390,height:844},{width:428,height:926},{width:844,height:390}]){
      await page.setViewportSize(size);viewports.push(size);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      for(const id of ['previous-scene','next-scene','play','scrub','montage-scrub','previous-frame','next-frame','scene-scrub','show-scene-frame','scene-duration','apply-scene-duration','save-project']){
        expect((await page.locator('#'+id).boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      for(const id of ['scene-shot','scene-duration','ratio']){
        expect(await page.locator('#'+id).evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
      }
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('#go-to-settings').tap();await expect(page.locator('#route-choice')).toBeInViewport();
    await page.locator('#ratio').selectOption('portrait');await ready();
    await page.locator('#back-to-preview').tap();await expect(page.locator('#preview-title')).toBeInViewport();
    await page.locator('#previous-scene').tap();await optionsReady();await visibleCard();
    const sceneScrub=page.locator('#scene-scrub');
    await montageScrub.focus();await montageScrub.press('Home');
    await expect(page.locator('#scene-position')).toContainText('Сцена 1 из 5');
    await expect(page.locator('#previous-frame')).toBeDisabled();expect(Number(await page.locator('#scrub').inputValue())).toBe(0);
    await montageScrub.press('End');await expect(montageScrub).toHaveValue('479');
    await expect(page.locator('#scene-position')).toContainText('Сцена 5 из 5');await expect(page.locator('#next-frame')).toBeDisabled();
    expect(Number(await page.locator('#scrub').inputValue())).toBeCloseTo(479/24,10);
    // Real touch on the full timeline selects a frame inside the middle scene
    // and pauses replay, without a vertical page jump or a mocked clock.
    await page.locator('#scrub').fill('0');
    await page.locator('#play').tap();await expect(page.locator('body')).toHaveAttribute('data-state','PLAYING');
    await montageScrub.scrollIntoViewIfNeeded();const timelineY=await page.evaluate(()=>scrollY),timelineBox=(await montageScrub.boundingBox())!;
    await montageScrub.tap({position:{x:timelineBox.width/2,y:22}});
    await expect(page.locator('body')).toHaveAttribute('data-state','PAUSED');
    await expect(page.locator('#scene-position')).toContainText('Сцена 3 из 5');await visibleCard();
    expect(Math.abs(await page.evaluate(()=>scrollY)-timelineY)).toBeLessThanOrEqual(1);
    const touchedFrame=Number(await montageScrub.inputValue());expect(touchedFrame).toBeGreaterThan(220);expect(touchedFrame).toBeLessThan(260);
    expect(Number(await page.locator('#scrub').inputValue())).toBeCloseTo(touchedFrame/24,10);
    await expect(page.locator('.timeline-segment[data-selected="true"]')).toHaveCount(1);
    const selectedId=await selected.getAttribute('data-scene');
    await expect(page.locator('.timeline-segment[data-selected="true"]')).toHaveAttribute('data-scene',selectedId!);
    await optionsReady();
    await sceneScrub.fill('0');const startTime=Number(await page.locator('#scrub').inputValue());
    await sceneScrub.fill('13');const frameTime=Number(await page.locator('#scrub').inputValue());
    expect(frameTime).toBeCloseTo(startTime+13/24,10);
    await expect(page.locator('#scene-frame-note')).toContainText('Кадр 14 из 168');
    await expect(montageScrub).toHaveValue(String(Math.round(startTime*24)+13));
    const scenePixels=await page.locator('#preview').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());
    await page.locator('#next-frame').tap();await expect(sceneScrub).toHaveValue('14');
    expect(Number(await page.locator('#scrub').inputValue())).toBeCloseTo(frameTime+1/24,10);
    await page.locator('#previous-frame').tap();await expect(sceneScrub).toHaveValue('13');
    expect(await page.locator('#preview').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL())).toBe(scenePixels);
    await page.locator('#scrub').fill('0');await expect(page.locator('#scene-frame-note')).toContainText('другая сцена');
    await page.locator('#scrub').fill(String(frameTime));
    expect(await page.locator('#preview').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL())).toBe(scenePixels);
    await sceneScrub.focus();await sceneScrub.press('End');await expect(sceneScrub).toHaveValue('167');
    await expect(page.locator('#next-frame')).toBeDisabled();
    await page.locator('#previous-frame').tap();await expect(sceneScrub).toHaveValue('166');
    await sceneScrub.focus();await sceneScrub.press('End');
    expect(Number(await page.locator('#scrub').inputValue())).toBeCloseTo(startTime+167/24,10);
    await sceneScrub.press('Home');await expect(sceneScrub).toHaveValue('0');
    await expect(page.locator('#previous-frame')).toBeDisabled();
    expect(Number(await page.locator('#scrub').inputValue())).toBeCloseTo(startTime,10);
    await sceneScrub.fill('13');await page.locator('#show-scene-frame').tap();
    await expect(page.locator('#preview')).toBeInViewport();
    expect(Number(await page.locator('#scrub').inputValue())).toBeCloseTo(frameTime,10);
    await page.screenshot({path:dir+'/03-mobile-preview.png'});
    await page.locator('#return-to-editor').tap();await expect(page.locator('#storyboard-title')).toBeInViewport();
    await expect(sceneScrub).toHaveValue('13');
    // Record the real transition before tapping: software rendering can finish
    // the seven-second episode before the next remote locator read arrives.
    await page.evaluate(()=>{
      const body=document.body;delete body.dataset.acceptanceReplayStarted;
      const observer=new MutationObserver(records=>{
        if(body.dataset.state==='PLAYING'||records.some(record=>record.oldValue==='PLAYING')){
          body.dataset.acceptanceReplayStarted='true';observer.disconnect();
        }
      });
      observer.observe(body,{attributes:true,attributeFilter:['data-state'],attributeOldValue:true});
    });
    await page.locator('#preview-scene').tap();await expect(page.locator('#preview')).toBeInViewport();
    await expect(page.locator('body')).toHaveAttribute('data-acceptance-replay-started','true');
    await expect(page.locator('body')).toHaveAttribute('data-state','PAUSED',{timeout:20_000});
    await expect(sceneScrub).toHaveValue('167');
    expect(Number(await page.locator('#scrub').inputValue())).toBeCloseTo(startTime+167/24,10);
    await expect(page.locator('#scene-frame-note')).not.toContainText('другая сцена');
    await page.evaluate(()=>{delete document.body.dataset.acceptanceReplayStarted;});
    await page.locator('#return-to-editor').tap();
    await page.locator('#storyboard').evaluate(node=>node.scrollIntoView({block:'start'}));
    await page.screenshot({path:dir+'/01-mobile-storyboard.png'});
    await page.locator('#scene-settings').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/02-mobile-controls.png'});
    const pendingProject=page.waitForEvent('download');await page.locator('#save-project').tap();
    const projectPath=dir+'/synthetic-furka.rstory.json';await(await pendingProject).saveAs(projectPath);
    const project=JSON.parse(readFileSync(projectPath,'utf8'));
    const portraitCards=await page.locator('.scene-card').allTextContents();
    expect(project.montage.scenes.reduce((sum:number,s:{frames:number})=>sum+s.frames,0)).toBe(480);
    expect(JSON.stringify(project)).not.toMatch(/"(?:lat|lon|points|segments|url)"/);
    await page.locator('#scrub').fill('5');const pixels=await page.locator('#preview').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL());
    await page.locator('#scrub').fill('18');await page.locator('#scrub').fill('1');await page.locator('#scrub').fill('5');
    expect(await page.locator('#preview').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL())).toBe(pixels);
    const download=page.waitForEvent('download',{timeout:180_000});await page.locator('#export').tap();
    await expect(page.locator('#next-scene')).toBeDisabled();await expect(page.locator('#previous-scene')).toBeDisabled();
    await expect(sceneScrub).toBeDisabled();await expect(page.locator('#show-scene-frame')).toBeDisabled();
    await expect(montageScrub).toBeDisabled();await expect(page.locator('#previous-frame')).toBeDisabled();await expect(page.locator('#next-frame')).toBeDisabled();
    const file=dir+'/edited-portrait-20s.mp4';await(await download).saveAs(file);await ready();
    videoReport={...validateVideo(file,360,640,20),sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
    await page.reload();await page.locator('#welcome-close').click();await expect(page.locator('#export')).toBeEnabled({timeout:120_000});
    await page.locator('#project-file').setInputFiles(projectPath);await ready();await expect(page.locator('.scene-card')).toHaveCount(5);
    expect(await page.locator('.scene-card').allTextContents()).toEqual(portraitCards);await page.locator('#scrub').fill('5');
    expect(await page.locator('#preview').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL())).toBe(pixels);
    await visibleCard();await expect(sceneScrub).toBeEnabled();
    expect(await timelineFrames()).toEqual(project.montage.scenes.map((scene:{frames:number})=>scene.frames));
    await expect(montageScrub).toHaveValue('120');
    await expect(page.locator('#return-to-editor')).toBeVisible();await page.locator('#collapse-storyboard').tap();
    await expect(page.locator('#return-to-editor')).toBeHidden();
    expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
    expect(external).toEqual([]);expect(errors).toEqual([]);passed=true;
  }finally{
    await context.close();renameSync(await recording.path(),dir+'/interface.webm');
    writeFileSync(dir+'/acceptance.json',JSON.stringify({status:passed?'PASS':'FAILED',sourceCommit:process.env.BUILD_COMMIT,browser:browser.version(),syntheticOnly:true,device:'Touch/mobile viewport emulation; no physical phone tested',checks:['proportional timeline and Undo/Redo/project restoration','touch timeline seek pauses replay without vertical jump','frame step buttons: exact 1/24s, pixel reversal and scene bounds','existing navigation, rapid choices, both aspects, project and H.264 export'],viewports,external,errors,export:videoReport},null,2));
  }
});
