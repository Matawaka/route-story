import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {validateVideo} from '../../scripts/validate-video.mjs';

test('real terrain: both LODs/styles/aspects have deterministic ready frames and visible depth-tested routes',async({page,context})=>{
 const external:string[]=[];await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4173'?r.continue():(external.push(r.request().url()),r.abort()));
 await page.goto('/');await page.locator('#terrain-demo').click();await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#map-detail-note')).toContainText('Kartverket');
 const result=await page.evaluate(async()=>{
  const paths=['/src/terrain-renderer.ts','/src/terrain.ts','/src/gpx.ts','/src/story.ts','/src/exporter.ts'];const [{TerrainRenderer},{loadTerrain},{parseGpx},{defaultStoryConfig},{exportVideo}]=await Promise.all(paths.map(p=>import(p))),route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),results=[];
  for(const [w,h] of [[640,360],[360,640],[1280,720],[720,1280]])for(const style of ['atlas','night']){
   const config={...defaultStoryConfig(route.name),cameraMode:'terrain',visualStyle:style,qualityPreset:w>640||h>640?'standard':'compatibility',aspectRatio:h>w?'portrait':'landscape'},r=new TerrainRenderer(route,await loadTerrain(config.qualityPreset),w,h,config),canvas=document.createElement('canvas');
   try{r.draw(canvas,10);const direct=canvas.toDataURL();r.draw(canvas,20);r.draw(canvas,2);r.draw(canvas,10);const backward=canvas.toDataURL();
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!,pixels=ctx.getImageData(0,0,w,h).data;let highlighted=0;for(let i=0;i<pixels.length;i+=4)if(style==='atlas'?pixels[i]>180&&pixels[i+1]>50&&pixels[i+1]<170&&pixels[i+2]<90:pixels[i]>200&&pixels[i+1]>140&&pixels[i+1]<235&&pixels[i+2]<150)highlighted++;
    const mesh=r.scene.children.find((m:any)=>m.material?.type==='ShaderMaterial') as any;
    r.draw(canvas,0);let framed=true;for(const segment of route.segments)for(const p of segment){const xy=r.terrain.world(p),v=r.camera.position.clone().set(xy[0],r.terrain.meshElevation(xy)!+24,-xy[1]).project(r.camera),x=(v.x+1)*w/2,y=(1-v.y)*h/2;framed&&=x>w*.035&&x<w*.965&&y>Math.min(w,h)*.2&&y<h-Math.min(w,h)*.27;}
    const locations=route.segments.map((s:any[])=>s.map(p=>[p.lon,p.lat,p.elevation])),sourcesUnchanged=JSON.stringify(locations)===JSON.stringify(parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()).segments.map((s:any[])=>s.map(p=>[p.lon,p.lat,p.elevation])));
    results.push({same:direct===backward,highlighted,framed,depthTest:mesh.material.depthTest,level:r.terrain.level.spacingMeters,sourcesUnchanged});
   }finally{r.dispose();}
  }
  const config={...defaultStoryConfig(),cameraMode:'terrain',durationSeconds:4,introSeconds:0,outroSeconds:0},r=new TerrainRenderer(route,await loadTerrain('compatibility'),640,360,config),c=document.createElement('canvas');r.draw(c,1);const reference=c.toDataURL();let equivalent=false;
  try{await exportVideo({config,draw:(target:HTMLCanvasElement,t:number)=>{r.draw(target,t);if(t===1)equivalent=target.toDataURL()===reference;}});}finally{r.dispose();}
  return{results,equivalent};
 });
 expect(result.results).toHaveLength(8);for(const r of result.results){expect(r.same).toBe(true);expect(r.highlighted).toBeGreaterThan(80);expect(r.framed).toBe(true);expect(r.depthTest).toBe(true);expect(r.sourcesUnchanged).toBe(true);}expect(result.equivalent).toBe(true);expect(external).toEqual([]);
});

test('3D readiness failures and unsupported coverage preserve explicit 2D recovery',async({page})=>{
 await page.route('**/terrain/sogne-50m.i16',r=>r.fulfill({body:'corrupt'}));await page.goto('/');await page.locator('#terrain-demo').click();await expect(page.locator('#status')).toContainText('DEM повреждён');await expect(page.locator('#export')).toBeDisabled();
 await expect(page.locator('#route-info')).toContainText('721');await page.locator('#camera-mode').selectOption('cinematic');await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#route-info')).toContainText('721');
 await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();
 await page.unroute('**/terrain/sogne-50m.i16');await page.locator('#camera-mode').selectOption('terrain');await expect(page.locator('#status')).toContainText('Выберите «Кино · 2D»');await expect(page.locator('#export')).toBeDisabled();
 await page.locator('#camera-mode').selectOption('auto');await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#map-detail-note')).toContainText('Используется 2D');
});

test('unavailable WebGL retains the imported GPX and Auto explains its 2D choice',async({page})=>{
 await page.addInitScript(()=>{const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:any[]){if(type==='webgl2'||type==='webgl')return null;return native.call(this,type,...args);} as typeof native;});
 await page.goto('/');await page.locator('#terrain-demo').click();await expect(page.locator('#status')).toContainText('WebGL 2');await expect(page.locator('#route-info')).toContainText('721');await expect(page.locator('#export')).toBeDisabled();
 await page.locator('#camera-mode').selectOption('auto');await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#map-detail-note')).toContainText('Используется 2D');await expect(page.locator('#route-info')).toContainText('721');
});

test('unsupported H.264 keeps the ready 3D preview and reversible seeking',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'VideoEncoder',{value:undefined,configurable:true});});
 await page.goto('/');await page.locator('#terrain-demo').click();await expect(page.locator('#status')).toContainText('WebCodecs');await expect(page.locator('#export')).toBeDisabled();await expect(page.locator('#preview')).toBeVisible();
 await page.locator('#scrub').fill('4');await expect(page.locator('#time')).toContainText('0:04');await page.locator('#scrub').fill('1');await expect(page.locator('#time')).toContainText('0:01');await expect(page.locator('#route-info')).toContainText('721');
});

test('a real shader compilation failure rejects export and releases its temporary canvas',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const paths=['/src/terrain-renderer.ts','/src/terrain.ts','/src/gpx.ts','/src/story.ts','/src/exporter.ts'];const [{TerrainRenderer},{loadTerrain},{parseGpx},{defaultStoryConfig},{exportVideo}]=await Promise.all(paths.map(p=>import(p))),route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),config={...defaultStoryConfig(),cameraMode:'terrain',durationSeconds:4,introSeconds:0,outroSeconds:0},r=new TerrainRenderer(route,await loadTerrain('compatibility'),640,360,config);
  const mesh=r.scene.children.find((m:any)=>m.material?.type==='ShaderMaterial') as any;mesh.material.fragmentShader='this is deliberately invalid GLSL';mesh.material.needsUpdate=true;
  let error='',target:HTMLCanvasElement|undefined;try{await exportVideo({config,draw:(c:HTMLCanvasElement,t:number)=>{target=c;r.draw(c,t);}});}catch(e){error=(e as Error).message;}finally{r.dispose();}
  return{error,target:target?[target.width,target.height]:[],surface:[r.gpu.domElement.width,r.gpu.domElement.height],children:r.scene.children.length};
 });expect(result.error).toContain('3D-шейдер');expect(result.target).toEqual([0,0]);expect(result.surface).toEqual([0,0]);expect(result.children).toBe(0);
});

test('real 3D context loss, successful disposal, cancellation and retry',async({page},testInfo)=>{
 await page.goto('/');await page.locator('#terrain-demo').click();await expect(page.locator('#export')).toBeEnabled();
 const loss=await page.evaluate(async()=>{
  const paths=['/src/terrain-renderer.ts','/src/terrain.ts','/src/gpx.ts','/src/story.ts'];const [{TerrainRenderer},{loadTerrain},{parseGpx},{defaultStoryConfig}]=await Promise.all(paths.map(p=>import(p))),route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),r=new TerrainRenderer(route,await loadTerrain('compatibility'),640,360,{...defaultStoryConfig(),cameraMode:'terrain'}),canvas=document.createElement('canvas');
  r.gpu.getContext().getExtension('WEBGL_lose_context')!.loseContext();await new Promise(resolve=>setTimeout(resolve,100));let error='';try{r.draw(canvas,10);}catch(e){error=(e as Error).message;}r.dispose();return{error,canvas:[r.gpu.domElement.width,r.gpu.domElement.height],children:r.scene.children.length};
 });expect(loss.error).toContain('контекст потерян');expect(loss.canvas).toEqual([0,0]);expect(loss.children).toBe(0);
 await page.locator('#quality').selectOption('compatibility');await expect(page.locator('#export')).toBeEnabled();await page.locator('#export').click();await page.locator('#cancel').click();await expect(page.locator('#status')).toHaveText('Экспорт отменён.');await expect(page.locator('#export')).toBeEnabled();
 await page.locator('#duration').selectOption('10');const pending=page.waitForEvent('download');await page.locator('#export').click();const download=await pending,path=testInfo.outputPath('terrain-10s.mp4');await download.saveAs(path);const video=validateVideo(path,360,640,10);expect(video.decodedFrames).toBe(240);await expect(page.locator('#export')).toBeEnabled();
});
