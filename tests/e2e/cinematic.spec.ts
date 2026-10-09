import {test,expect} from '@playwright/test';
import {cinematicGpx} from '../fixtures/cinematic';
import {syntheticGpx} from '../fixtures/synthetic';

test('cinematic demo has ready local detail; seek and export use identical camera pixels',async({page,context})=>{
  const external:string[]=[];await context.route('**/*',r=>{if(new URL(r.request().url()).origin!=='http://127.0.0.1:4173'){external.push(r.request().url());return r.abort();}return r.continue();});
  await page.goto('/');await page.locator('#cinematic-demo').click();await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#scrub')).toHaveValue('0');await expect(page.locator('#map-detail-note')).toContainText('1:10m');
  const result=await page.evaluate(async xml=>{
    const paths=['/src/renderer.ts','/src/gpx.ts','/src/story.ts','/src/geography.ts','/src/camera.ts','/src/exporter.ts'];const[{RouteRenderer},{parseGpx},{defaultStoryConfig},{loadGeography},{createCameraPlan,getCameraStateAt},{exportVideo}]=await Promise.all(paths.map(p=>import(p)));
    const route=parseGpx(xml),land={features:[],geography:await loadGeography()},results=[];
    for(const [w,h] of [[640,360],[360,640],[1280,720],[720,1280]])for(const style of ['atlas','night']){
      const config={...defaultStoryConfig(route.name),visualStyle:style,aspectRatio:h>w?'portrait':'landscape',qualityPreset:Math.min(w,h)===720?'standard':'compatibility'},renderer=new RouteRenderer(route,land,w,h,style,config),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const plan=createCameraPlan(renderer.timeline,w,h);
      const pixels=(t:number)=>{renderer.draw(canvas,t);return canvas.toDataURL();},middle=pixels(10),before=canvas.getContext('2d').getImageData(0,0,w,h).data;pixels(20);pixels(0);
      const texts:string[]=[],native=canvas.getContext('2d').fillText.bind(canvas.getContext('2d'));canvas.getContext('2d').fillText=(text:string,...args:any[])=>{texts.push(text);return native(text,...args);};
      renderer.draw(canvas,0);renderer.draw(canvas,20);const same=middle===pixels(10),after=canvas.getContext('2d').getImageData(0,0,w,h).data,differences=[];for(let i=0;i<before.length;i+=4)if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]){if(differences.length<3)differences.push({x:(i/4)%w,y:Math.floor(i/4/w),a:Array.from(before.slice(i,i+4)),b:Array.from(after.slice(i,i+4))});}results.push({style,w,h,same,differences,zoom:getCameraStateAt(10,renderer.timeline,plan).zoom,start:texts.includes('Старт'),finish:texts.includes('Финиш'),labels:texts.filter(t=>land.geography.region.labels.some((l:any)=>l.text===t)),geographyPoints:land.geography.region.land.flat(2).length});renderer.dispose();
    }
    const config={...defaultStoryConfig('Камера: экспорт'),durationSeconds:10 as const,aspectRatio:'portrait'},renderer=new RouteRenderer(route,land,360,640,'atlas',config),preview=document.createElement('canvas');preview.width=360;preview.height=640;renderer.draw(preview,5);const expected=preview.toDataURL();let sameExport=false;
    try{await exportVideo({config,draw:(c:HTMLCanvasElement,t:number)=>{renderer.draw(c,t);if(t===5)sameExport=c.toDataURL()===expected;}});}finally{renderer.dispose();}
    return{results,sameExport};
  },cinematicGpx());
  if(result.results.some(r=>!r.same))console.log(JSON.stringify(result.results));
  for(const r of result.results){expect(r.same).toBe(true);expect(r.zoom).toBeGreaterThan(2);expect(r.start).toBe(true);expect(r.finish).toBe(true);expect(r.labels.length).toBeGreaterThan(0);expect(r.geographyPoints).toBeGreaterThan(2000);}expect(result.sameExport).toBe(true);expect(external).toEqual([]);
});

test('missing detail resources prevent partial export and recover on retry',async({page})=>{
  let blocked=true;await page.route('**/maps/fjords-10m.json',r=>blocked?r.fulfill({status:503,body:'Unavailable'}):r.continue());
  await page.goto('/');await page.locator('#cinematic-demo').click();await expect(page.locator('#status')).toContainText('локальные слои карты');await expect(page.locator('#export')).toBeDisabled();await expect(page.locator('#preview')).toBeHidden();
  blocked=false;await page.locator('#cinematic-demo').click();await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#preview')).toBeVisible();
});

test('classic/reduced-motion fallback remains available; camera controls lock during export',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#demo').click();await expect(page.locator('#camera-mode')).toHaveValue('classic');await expect(page.locator('#export')).toBeEnabled();
  await page.locator('#camera-mode').selectOption('cinematic');await page.locator('#duration').selectOption('30');await expect(page.locator('#export')).toBeEnabled();await page.locator('#export').click();await expect(page.locator('#camera-mode')).toBeDisabled();await expect(page.locator('#cinematic-demo')).toBeDisabled();await page.locator('#cancel').click();await expect(page.locator('#status')).toHaveText('Экспорт отменён.');await expect(page.locator('#camera-mode')).toBeEnabled();await page.locator('#camera-mode').selectOption('classic');await expect(page.locator('#export')).toBeEnabled();
});

test('cinematic polar, antimeridian, dense and disconnected routes are finite and reversible',async({page})=>{
  await page.goto('/');
  for(const kind of ['polar','antimeridian','short','segments','dense'] as const){
    const result=await page.evaluate(async xml=>{const paths=['/src/renderer.ts','/src/gpx.ts','/src/story.ts'];const[{RouteRenderer},{parseGpx},{defaultStoryConfig}]=await Promise.all(paths.map(p=>import(p))),route=parseGpx(xml),renderer=new RouteRenderer(route,{features:[]},360,640,'night',{...defaultStoryConfig(route.name),visualStyle:'night',aspectRatio:'portrait'}),canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;
      renderer.draw(canvas,10);const first=canvas.toDataURL();for(const t of [0,2,7,15,18,20])renderer.draw(canvas,t);renderer.draw(canvas,10);const second=canvas.toDataURL();renderer.dispose();return{same:first===second,points:route.pointCount};
    },syntheticGpx(kind==='dense'?50000:100,kind));expect(result.same).toBe(true);expect(result.points).toBe(kind==='dense'?50000:100);
  }
});

test('cinematic marker aligns with genuine coordinates; overview has no gap bridge or false Pacific land',async({page})=>{
  await page.goto('/');const result=await page.evaluate(async()=>{
    const paths=['/src/renderer.ts','/src/gpx.ts','/src/story.ts','/src/camera.ts','/src/geography.ts','/src/cinematic.ts'];const[{RouteRenderer},{parseGpx},{defaultStoryConfig},{createCameraPlan,getCameraStateAt,cameraProject},{loadGeography},{cinematicPalette}]=await Promise.all(paths.map(p=>import(p)));
    const route=parseGpx('<gpx><trk><trkseg><trkpt lon="0" lat="0"/><trkpt lon="1" lat="0"/></trkseg><trkseg><trkpt lon="10" lat="0"/><trkpt lon="11" lat="0"/></trkseg></trk></gpx>'),renderer=new RouteRenderer(route,{features:[]},640,360,'atlas',defaultStoryConfig()),plan=createCameraPlan(renderer.timeline,640,360),canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!,gap=cameraProject(plan.world({lon:5.5,lat:0}),getCameraStateAt(0,renderer.timeline,plan),plan),pixel=()=>Array.from(ctx.getImageData(Math.round(gap[0]),Math.round(gap[1]),1,1).data);
    renderer.draw(canvas,0);const before=pixel();renderer.draw(canvas,20);const after=pixel();const arcs:number[][]=[],native=ctx.arc.bind(ctx);ctx.arc=(...args:Parameters<typeof native>)=>{arcs.push(args.slice(0,3));return native(...args);};renderer.draw(canvas,6);const expected=cameraProject(plan.world(renderer.timeline.at(6).point),getCameraStateAt(6,renderer.timeline,plan),plan),aligned=arcs.some(([x,y,r])=>Math.abs(r-360*.012)<1e-8&&Math.hypot(x-expected[0],y-expected[1])<1e-8);renderer.dispose();
    const anti=parseGpx('<gpx><trk><trkseg><trkpt lon="179.7" lat="15"/><trkpt lon="-179.7" lat="15"/></trkseg></trk></gpx>'),ocean=new RouteRenderer(anti,{features:[],geography:await loadGeography()},640,360,'night',{...defaultStoryConfig(),visualStyle:'night'}),oceanPlan=createCameraPlan(ocean.timeline,640,360);ocean.draw(canvas,0);const xy=cameraProject(oceanPlan.world({lon:180,lat:15.08}),getCameraStateAt(0,ocean.timeline,oceanPlan),oceanPlan),sample=Array.from(ctx.getImageData(Math.round(xy[0]),Math.round(xy[1]),1,1).data),water=cinematicPalette.night.water.slice(1).match(/../g).map((s:string)=>parseInt(s,16));ocean.dispose();return{before,after,aligned,sample,water};
  });expect(result.after).toEqual(result.before);expect(result.aligned).toBe(true);expect(result.sample.slice(0,3)).toEqual(result.water);
});
