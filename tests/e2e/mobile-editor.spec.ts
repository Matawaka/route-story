import {test,expect} from '@playwright/test';
import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateVideo} from '../../scripts/validate-video.mjs';

test('touch editor: scene navigation, rapid choices, keyboard, projects and real portrait MP4',async({browser})=>{
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
    await page.locator('#undo-edit').tap();await ready();expect(await page.locator('.scene-card').allTextContents()).not.toEqual(edited);
    await page.locator('#redo-edit').tap();await ready();expect(await page.locator('.scene-card').allTextContents()).toEqual(edited);await visibleCard();

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
      for(const id of ['previous-scene','next-scene','play','scrub','scene-duration','apply-scene-duration','save-project']){
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
    const file=dir+'/edited-portrait-20s.mp4';await(await download).saveAs(file);await ready();
    videoReport={...validateVideo(file,360,640,20),sha256:createHash('sha256').update(readFileSync(file)).digest('hex')};
    await page.reload();await page.locator('#welcome-close').click();await expect(page.locator('#export')).toBeEnabled({timeout:120_000});
    await page.locator('#project-file').setInputFiles(projectPath);await ready();await expect(page.locator('.scene-card')).toHaveCount(5);
    expect(await page.locator('.scene-card').allTextContents()).toEqual(portraitCards);await page.locator('#scrub').fill('5');
    expect(await page.locator('#preview').evaluate((canvas:HTMLCanvasElement)=>canvas.toDataURL())).toBe(pixels);
    await visibleCard();expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);
    expect(external).toEqual([]);expect(errors).toEqual([]);passed=true;
  }finally{
    await context.close();renameSync(await recording.path(),dir+'/interface.webm');
    writeFileSync(dir+'/acceptance.json',JSON.stringify({status:passed?'PASS':'FAILED',sourceCommit:process.env.BUILD_COMMIT,browser:browser.version(),syntheticOnly:true,device:'Touch/mobile viewport emulation; no physical phone tested',viewports,external,errors,export:videoReport},null,2));
  }
});
