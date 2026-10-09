import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
// @ts-expect-error Node-only independent validator
import { validateVideo } from '../../scripts/validate-video.mjs';

for (const style of ['Атлас', 'Ночной']) for (const ratio of ['landscape', 'portrait']) {
  test(`${style} ${ratio}: import and independently decode route MP4`, async ({ page }) => {
    await page.goto('/'); await expect(page.locator('.workspace')).toHaveCSS('display','grid'); await page.getByLabel('Выбрать GPX-файл').setInputFiles('tests/fixtures/segmented.gpx');
    await expect(page.locator('#distance')).toHaveText('215,68 км'); await expect(page.locator('#segments')).toHaveText('2');
    await expect(page.locator('#metric-value')).toHaveText('10 м');
    await page.getByRole('button', { name: style, exact: true }).click(); await page.getByLabel('Формат видео').selectOption(ratio);
    await expect(page.locator('#export')).toBeEnabled();
    const pending = page.waitForEvent('download'); await page.locator('#export').click(); const download = await pending;
    mkdirSync('artifacts', {recursive:true}); const path = `artifacts/route-${style === 'Атлас' ? 'atlas' : 'night'}-${ratio}.mp4`; await download.saveAs(path);
    expect(validateVideo(path, ratio === 'portrait' ? 360 : 640, ratio === 'portrait' ? 640 : 360).decodedFrames).toBe(96);
    await expect(page.locator('#status')).toContainText('MP4 создан');
  });
}

test('production bundle stays on its own origin, supports mobile and retains no route', async ({ page, context }) => {
  const external: string[] = [], errors: string[] = [];
  await context.route('**/*', r => { const url = new URL(r.request().url()); if (url.origin !== 'http://127.0.0.1:4174') { external.push(url.href); return r.abort(); } return r.continue(); });
  await context.routeWebSocket(/.*/, ws => { if (!ws.url().startsWith('ws://127.0.0.1:4174')) external.push(ws.url()); ws.close(); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4174/'); await page.getByRole('button', { name: /Открыть учебный/ }).click(); await expect(page.locator('#export')).toBeEnabled();
  const notice = await page.request.get('http://127.0.0.1:4174/THIRD_PARTY_NOTICES.md'); expect(notice.ok()).toBe(true); expect(await notice.text()).toContain('MPL-2.0');
  const license = await page.request.get('http://127.0.0.1:4174/licenses/MEDIABUNNY-MPL-2.0.txt'); expect(license.ok()).toBe(true); expect(await license.text()).toContain('Mozilla Public License');
  await expect(page.locator('#route-info')).toContainText('синтетический');
  mkdirSync('artifacts', {recursive:true}); await page.screenshot({path:'artifacts/desktop-preview.png',fullPage:true});
  await page.setViewportSize({width:390,height:844}); await page.getByLabel('Формат видео').selectOption('portrait');
  await expect(page.locator('#export')).toBeEnabled(); await page.screenshot({path:'artifacts/mobile-preview.png',fullPage:true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const pending = page.waitForEvent('download'); await page.locator('#export').click(); await (await pending).saveAs('artifacts/production-portrait.mp4');
  expect(validateVideo('artifacts/production-portrait.mp4',360,640).decodedFrames).toBe(96);
  expect(await page.evaluate(() => ({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
  await page.reload(); await expect(page.locator('#empty')).toBeVisible(); await expect(page.locator('#export')).toBeDisabled();
  expect(external).toEqual([]); expect(errors).toEqual([]);
});

test('invalid GPX clears stale preview; metadata remains inert text', async ({ page }) => {
  const requests: string[] = []; page.on('request', r => { if (r.url().includes('evil.test')) requests.push(r.url()); });
  await page.goto('/'); await page.getByRole('button', {name:/Открыть учебный/}).click(); await expect(page.locator('#export')).toBeEnabled();
  await page.getByLabel('Выбрать GPX-файл').setInputFiles('tests/fixtures/malformed.gpx'); await expect(page.locator('#status')).toHaveClass(/error/); await expect(page.locator('#empty')).toBeVisible(); await expect(page.locator('#export')).toBeDisabled();
  await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'evil.gpx',mimeType:'application/xml',buffer:Buffer.from('<!DOCTYPE gpx SYSTEM "https://evil.test/schema"><gpx/>')});
  await expect(page.locator('#status')).toContainText('DTD'); expect(requests).toEqual([]);
  await page.getByLabel('Выбрать GPX-файл').setInputFiles({name:'safe.gpx',mimeType:'application/xml',buffer:Buffer.from('<gpx><metadata><name>&lt;img src=x onerror=alert(1)&gt;</name></metadata><rte><rtept lon="0" lat="0"/><rtept lon="1" lat="0"/></rte></gpx>')});
  await expect(page.locator('#route-info')).toContainText('<img'); expect(await page.locator('#route-info img').count()).toBe(0); await expect(page.locator('#metric-value')).toHaveText('2');
});

test('unsupported encoder receives actionable error while map still works', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window,'VideoEncoder',{value:undefined,configurable:true}); });
  await page.goto('/'); await page.getByRole('button',{name:/Открыть учебный/}).click(); await expect(page.locator('#preview')).toBeVisible(); await expect(page.locator('#status')).toContainText('WebCodecs'); await expect(page.locator('#export')).toBeDisabled();
});

test('real encoder resources close after cancellation and renderer failure', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path='/src/exporter.ts'; const {exportVideo}=await import(path);
    const Native = VideoEncoder, instances: VideoEncoder[]=[];
    window.VideoEncoder=class extends Native { constructor(init: VideoEncoderInit) { super(init); instances.push(this); } };
    const errors: string[]=[];
    try {
      const controller=new AbortController();
      try { await exportVideo({width:640,height:360,draw:(c:HTMLCanvasElement)=>{c.getContext('2d')!.fillRect(0,0,100,100);},signal:controller.signal,onProgress:(p:number)=>{if(p>.1)controller.abort();}}); } catch(e) {errors.push((e as Error).name);}
      try { await exportVideo({width:640,height:360,draw:(_c:HTMLCanvasElement,t:number)=>{if(t>.1)throw new Error('Deliberate renderer failure');}}); } catch(e) {errors.push((e as Error).message);}
      return {errors,states:instances.map(i=>i.state)};
    } finally { window.VideoEncoder=Native; }
  });
  expect(result.errors).toEqual(['AbortError','Deliberate renderer failure']); expect(result.states.length).toBeGreaterThanOrEqual(2); expect(result.states.every(s=>s==='closed')).toBe(true);
});

test('Canvas rendering is deterministic and never draws a bridge across segments', async ({page}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const renderPath='/src/renderer.ts',gpxPath='/src/gpx.ts'; const {RouteRenderer}=await import(renderPath),{parseGpx}=await import(gpxPath);
    const route=parseGpx('<gpx><trk><trkseg><trkpt lon="0" lat="0"/><trkpt lon="1" lat="0"/></trkseg><trkseg><trkpt lon="10" lat="0"/><trkpt lon="11" lat="0"/></trkseg></trk></gpx>');
    const renderer=new RouteRenderer(route,{features:[]},640,360,'atlas'); const canvas=document.createElement('canvas'); canvas.width=640;canvas.height=360;
    const pixel=()=>Array.from(canvas.getContext('2d')!.getImageData(320,182,1,1).data);
    renderer.draw(canvas,0); const gapBefore=pixel();renderer.draw(canvas,4);const gapAfter=pixel();
    renderer.draw(canvas,1.5);const first=canvas.toDataURL();renderer.draw(canvas,3);renderer.draw(canvas,1.5);const second=canvas.toDataURL(); renderer.dispose();
    return {gapBefore,gapAfter,same:first===second};
  });
  expect(result.same).toBe(true);expect(result.gapAfter).toEqual(result.gapBefore);
});

test('external public trail acceptance (opt-in, never bundled)', async ({page}) => {
  test.skip(!process.env.REAL_GPX_PATH,'External data terms unresolved; opt in with a local ignored path.');
  const xml=readFileSync(process.env.REAL_GPX_PATH!,'utf8');
  const points=[...xml.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g)].map(m=>({lat:Number(m[1]),lon:Number(m[2])}));
  // Independent spherical cosine calculation, separate from production haversine implementation.
  let reference=0; const rad=(x:number)=>x*Math.PI/180;
  for(let i=1;i<points.length;i++){ const a=points[i-1],b=points[i]; reference+=6371.0088*Math.acos(Math.min(1,Math.max(-1,Math.sin(rad(a.lat))*Math.sin(rad(b.lat))+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lon-a.lon))))); }
  await page.goto('/'); await page.getByLabel('Выбрать GPX-файл').setInputFiles(process.env.REAL_GPX_PATH!); await expect(page.locator('#export')).toBeEnabled();
  const parsed=await page.evaluate(async xml=>{ const path='/src/gpx.ts'; const {parseGpx}=await import(path); const r=parseGpx(xml);return {name:r.name,pointCount:r.pointCount,distance:r.distanceKm,segments:r.segments.length,start:r.segments[0][0],finish:r.segments.at(-1).at(-1)};},xml);
  expect(parsed.pointCount).toBe(points.length); expect(parsed.start.lat).toBe(points[0].lat); expect(parsed.start.lon).toBe(points[0].lon); expect(parsed.finish.lat).toBe(points.at(-1)!.lat); expect(parsed.finish.lon).toBe(points.at(-1)!.lon); expect(Math.abs(parsed.distance-reference)).toBeLessThan(.001);
  mkdirSync('artifacts',{recursive:true}); await page.screenshot({path:'artifacts/real-route-preview.png',fullPage:true});
  const pending=page.waitForEvent('download'); await page.locator('#export').click(); await (await pending).saveAs('artifacts/real-route.mp4');
  const video=validateVideo('artifacts/real-route.mp4',640,360); writeFileSync('artifacts/real-route-acceptance.json',JSON.stringify({route:parsed,independentDistanceKm:reference,video},null,2));
});
