import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
// @ts-expect-error Node-only independent video validator
import { validateVideo } from '../../scripts/validate-video.mjs';

test('10/20/30-second labels and phases support reversible keyboard seeking', async ({page}) => {
  await page.goto('/');await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();
  for(const seconds of [10,20,30]) {
    await page.getByLabel('Длительность видео').selectOption(String(seconds));await expect(page.locator('#scrub')).toHaveAttribute('max',String(seconds));
    await page.locator('#scrub').fill('0');await expect(page.locator('#preview')).toHaveAttribute('data-phase','INTRO');await expect(page.locator('#time')).toHaveText(`0:00 / 0:${seconds}`);
    await page.locator('#scrub').fill('3');await expect(page.locator('#preview')).toHaveAttribute('data-phase','ROUTE_REPLAY');const first=await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL());
    await page.locator('#scrub').fill(String(seconds));await expect(page.locator('#preview')).toHaveAttribute('data-phase','OUTRO');
    await page.locator('#scrub').fill('3');expect(await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(first);
    await page.locator('#scrub').focus();await page.keyboard.press('ArrowRight');expect(Number(await page.locator('#scrub').inputValue())).toBeGreaterThan(3);
  }
});

test('bounded medium 20-second Standard export independently decodes', async ({page}) => {
  await page.goto('/');await page.locator('#demo').click();await page.getByLabel('Качество видео').selectOption('standard');await expect(page.locator('#export')).toBeEnabled();
  await expect(page.locator('#preview')).toHaveAttribute('width','1280');await expect(page.locator('#preview')).toHaveAttribute('height','720');
  const pending=page.waitForEvent('download');await page.locator('#export').click();const download=await pending;mkdirSync('artifacts',{recursive:true});const path='artifacts/story-standard-20s.mp4';await download.saveAs(path);
  expect(validateVideo(path,1280,720,20).decodedFrames).toBe(480);await expect(page.locator('#status')).toContainText('20 секунд');
});

test('export snapshot ignores mutation and reproduces the preview frame', async ({page}) => {
  await page.goto('/');await page.locator('#demo').click();await page.getByLabel('Длительность видео').selectOption('10');await expect(page.locator('#export')).toBeEnabled();await page.locator('#scrub').fill('6');
  const result=await page.evaluate(async()=>{
    const paths=['/src/exporter.ts','/src/renderer.ts','/src/story.ts','/src/gpx.ts'];
    const [{exportVideo},{RouteRenderer},{defaultStoryConfig},{parseGpx}]=await Promise.all(paths.map(p=>import(p)));
    const route=parseGpx(await(await fetch('/samples/synthetic.gpx')).text()),land=await(await fetch('/maps/ne_110m_land.geojson')).json();
    const mutable={...defaultStoryConfig(route.name),durationSeconds:10};const renderer=new RouteRenderer(route,land,640,360,'atlas',mutable);let matched=false,frames=0;
    try { const blob=await exportVideo({config:mutable,draw:(canvas:HTMLCanvasElement,t:number)=>{renderer.draw(canvas,t);frames++;if(t===6)matched=canvas.toDataURL()===(document.querySelector('#preview') as HTMLCanvasElement).toDataURL();},onProgress:()=>{mutable.durationSeconds=30;}}); return {matched,frames,bytes:blob.size}; }
    finally{renderer.dispose();}
  });
  expect(result.matched).toBe(true);expect(result.frames).toBe(240);expect(result.bytes).toBeGreaterThan(1000);
});

test('UI cancellation restores controls and a subsequent export succeeds', async ({page})=>{
  await page.goto('/');await page.locator('#demo').click();await page.getByLabel('Длительность видео').selectOption('30');await expect(page.locator('#export')).toBeEnabled();
  const downloads:string[]=[];page.on('download',d=>downloads.push(d.suggestedFilename()));await page.locator('#export').click();await expect(page.locator('#cancel')).toBeVisible();
  for(const id of ['duration','quality','ratio','file','demo','scrub','story-title'])await expect(page.locator(`#${id}`)).toBeDisabled();
  await page.locator('#cancel').click();await expect(page.locator('#status')).toHaveText('Экспорт отменён.');await expect(page.locator('#export')).toBeEnabled();expect(downloads).toEqual([]);
  await page.getByLabel('Длительность видео').selectOption('10');await expect(page.locator('#export')).toBeEnabled();const pending=page.waitForEvent('download');await page.locator('#export').click();const d=await pending;expect(d.suggestedFilename()).toContain('10s');await expect(page.locator('#duration')).toBeEnabled();
});

test('title editor uses inert text, strict limits and a safe filename',async({page})=>{
  const external:string[]=[];page.on('request',r=>{if(r.url().includes('evil.test'))external.push(r.url());});
  await page.goto('/');await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();
  const title=page.getByLabel('Название истории');await expect(title).toHaveValue('Учебный маршрут');await expect(title).toHaveAttribute('maxlength','200');
  await title.fill('');await expect(title).toHaveAttribute('aria-invalid','true');await expect(page.locator('#export')).toBeDisabled();
  // Bypass the DOM maxlength to verify configuration validation also enforces the bound.
  await title.evaluate((e:HTMLInputElement)=>{e.value='x'.repeat(201);e.dispatchEvent(new Event('input',{bubbles:true}));});await expect(page.locator('#export')).toBeDisabled();
  await title.fill('x'.repeat(200));await expect(page.locator('#export')).toBeEnabled();
  const text='<img src=https://evil.test/x onerror=alert(1)> / CON';await title.fill(text);await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#preview')).toHaveAttribute('aria-label',`История «${text}»: карта маршрута со стартом и финишем`);
  expect(await page.locator('img').count()).toBe(0);expect(external).toEqual([]);
  await page.getByLabel('Длительность видео').selectOption('10');await expect(page.locator('#export')).toBeEnabled();const pending=page.waitForEvent('download');await page.locator('#export').click();const d=await pending;
  expect(d.suggestedFilename()).not.toMatch(/[<>:"/\\|?*]/);expect(d.suggestedFilename()).toContain('10s-16x9-360p');
});

test('visible storytelling scenes preserve two factual metrics in all styles/formats',async({page})=>{
  await page.goto('/');await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();
  await page.evaluate(()=>{const native=CanvasRenderingContext2D.prototype.fillText;Object.assign(window,{paintedText:[]});CanvasRenderingContext2D.prototype.fillText=function(text:string,...args:Parameters<typeof native> extends [string,...infer P]?P:never){(window as any).paintedText.push(text);return native.call(this,text,...args);};});
  mkdirSync('artifacts',{recursive:true});
  for(const style of ['Атлас','Ночной'])for(const aspect of ['landscape','portrait']){
    await page.getByRole('button',{name:style,exact:true}).click();await page.getByLabel('Формат видео').selectOption(aspect);await expect(page.locator('#export')).toBeEnabled();
    const sceneFrames:string[]=[];
    for(const [scene,time] of [['intro',1],['replay',10],['outro',19]] as const){
      await page.evaluate(()=>{(window as any).paintedText=[];});await page.locator('#scrub').fill(String(time));
      const labels=await page.evaluate(()=>(window as any).paintedText as string[]);expect(labels).toContain('ROUTE STORY');expect(labels.some(s=>s.includes('км'))).toBe(true);expect(labels.some(s=>s.includes('Набор высоты')||s.includes('точек маршрута'))).toBe(true);
      expect(labels).toContain(scene==='intro'?'Ваш путь по GPX':scene==='outro'?'Финиш · весь маршрут':'Повтор маршрута · сегмент 1 из 1');if(scene==='outro')expect(labels).toContain('Matawaka');
      sceneFrames.push(await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL()));await page.locator('#preview').screenshot({path:`artifacts/scene-${style==='Атлас'?'atlas':'night'}-${aspect}-${scene}.png`});
    }
    expect(new Set(sceneFrames).size).toBe(3);
  }
});

test('Standard capability failure offers explicit Compatibility recovery',async({page})=>{
  await page.addInitScript(()=>{const probe=VideoEncoder.isConfigSupported.bind(VideoEncoder);VideoEncoder.isConfigSupported=async config=>config.width!>640||config.height!>640?{supported:false,config}:probe(config);});
  await page.goto('/');await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();await page.getByLabel('Качество видео').selectOption('standard');
  await expect(page.locator('#status')).toContainText('Совместимое');await expect(page.locator('#export')).toBeDisabled();await expect(page.locator('#quality')).toHaveValue('standard');await expect(page.locator('#preview')).toHaveAttribute('width','1280');
  await page.getByLabel('Качество видео').selectOption('compatibility');await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#preview')).toHaveAttribute('width','640');
});

test('UI restores a valid state after renderer failure and can export again',async({page})=>{
  await page.goto('/');await page.locator('#demo').click();await page.getByLabel('Длительность видео').selectOption('10');await expect(page.locator('#export')).toBeEnabled();
  await page.evaluate(async()=>{const path='/src/renderer.ts';const {RouteRenderer}=await import(path),native=RouteRenderer.prototype.draw;RouteRenderer.prototype.draw=function(...args:any[]){RouteRenderer.prototype.draw=native;throw new Error('Deliberate export failure');};});
  await page.locator('#export').click();await expect(page.locator('#status')).toContainText('Не удалось создать MP4: Deliberate export failure');await expect(page.locator('#cancel')).toBeHidden();
  for(const id of ['export','duration','quality','ratio','file','demo','scrub','story-title'])await expect(page.locator(`#${id}`)).toBeEnabled();
  const pending=page.waitForEvent('download');await page.locator('#export').click();await pending;await expect(page.locator('#status')).toContainText('MP4 создан');
});

for(const aspect of ['landscape','portrait'])test(`full local acceptance: 30s Standard ${aspect}, 5000 points`,async({page,browser})=>{
  test.skip(process.env.FULL_EXPORT_ACCEPTANCE!=='1','Full 30s/720p benchmark is opt-in, not repeated in routine CI.');test.setTimeout(180_000);
  const points=Array.from({length:5000},(_,i)=>`<trkpt lat="${(45+Math.sin(i/140)*.025).toFixed(7)}" lon="${(7+i*.000025).toFixed(7)}"/>`).join('');
  const xml=`<gpx><metadata><name>Синтетический маршрут · 5000 точек</name></metadata><trk><trkseg>${points}</trkseg></trk></gpx>`;
  await page.goto('/');const before=await page.evaluate(()=>performance.now());await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'synthetic-5000.gpx',mimeType:'application/xml',buffer:Buffer.from(xml)});
  await expect(page.locator('#export')).toBeEnabled();const previewReadyWallMs=await page.evaluate(start=>performance.now()-start,before);
  await page.getByLabel('Длительность видео').selectOption('30');await page.getByLabel('Качество видео').selectOption('standard');await page.getByLabel('Формат видео').selectOption(aspect);
  await page.getByRole('button',{name:aspect==='portrait'?'Ночной':'Атлас',exact:true}).click();await expect(page.locator('#export')).toBeEnabled();
  const pending=page.waitForEvent('download');await page.locator('#export').click();const download=await pending;mkdirSync('artifacts',{recursive:true});const path=`artifacts/story-standard-30s-${aspect}.mp4`;await download.saveAs(path);
  const width=aspect==='portrait'?720:1280,height=aspect==='portrait'?1280:720,video=validateVideo(path,width,height,30);
  const measurements=await page.evaluate(async({xml,width,height,aspect})=>{
    const paths=['/src/exporter.ts','/src/renderer.ts','/src/story.ts','/src/gpx.ts'];const [{detectEncoder},{RouteRenderer},{defaultStoryConfig},{parseGpx}]=await Promise.all(paths.map(p=>import(p)));
    const route=parseGpx(xml),land=await(await fetch('/maps/ne_110m_land.geojson')).json(),config={...defaultStoryConfig(route.name),durationSeconds:30,qualityPreset:'standard',aspectRatio:aspect,visualStyle:aspect==='portrait'?'night':'atlas'};
    const renderer=new RouteRenderer(route,land,width,height,config.visualStyle,config),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const start=performance.now();for(let i=0;i<120;i++)renderer.draw(canvas,i*30/119);const render120FramesWallMs=performance.now()-start;renderer.dispose();
    return {exportWallMs:performance.getEntriesByName('route-story-export').at(-1)!.duration,render120FramesWallMs,encoder:await detectEncoder(width,height,5_000_000,24),userAgent:navigator.userAgent};
  },{xml,width,height,aspect});
  const report={os:`${os.type()} ${os.release()} ${os.arch()}`,browser:`Microsoft Edge ${browser.version()}`,pointCount:5000,previewReadyWallMs,...measurements,peakMemoryBytes:null,peakMemoryNote:'Not reliably measured; JS heap alone excludes native encoder/GPU buffers.',video};
  writeFileSync(path+'.benchmark.json',JSON.stringify(report,null,2));await page.screenshot({path:`artifacts/story-30s-${aspect}-preview.png`,fullPage:true});expect(video.decodedFrames).toBe(720);
});
