import {test,expect} from '@playwright/test';
import {validateVideo} from '../../scripts/validate-video.mjs';

test('photo is on the true mesh with north-up UVs, unchanged heights/camera and identical seek/export frames',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const paths=['/src/terrain-renderer.ts','/src/terrain.ts','/src/imagery.ts','/src/gpx.ts','/src/story.ts','/src/terrain-camera.ts','/src/exporter.ts'];
  const [{TerrainRenderer},{loadTerrain},{loadImagery},{parseGpx},{defaultStoryConfig},{getTerrainCameraStateAt},{exportVideo}]=await Promise.all(paths.map(p=>import(p)));
  const route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),config={...defaultStoryConfig(),cameraMode:'terrain',durationSeconds:10,terrainSurface:'photo'},terrain=await loadTerrain('compatibility'),image=await loadImagery(),r=new TerrainRenderer(route,terrain,640,360,config,image),dem=new TerrainRenderer(route,terrain,640,360,{...config,terrainSurface:'dem'}),canvas=document.createElement('canvas');
  try{r.draw(canvas,5);const direct=canvas.toDataURL();dem.draw(canvas,5);const different=direct!==canvas.toDataURL();r.draw(canvas,8);r.draw(canvas,2);r.draw(canvas,5);const reversible=direct===canvas.toDataURL();
   const uv=r.terrainGeometry.getAttribute('uv'),positions=r.terrainGeometry.getAttribute('position'),sameHeights=JSON.stringify(Array.from(positions.array))===JSON.stringify(Array.from(dem.terrainGeometry.getAttribute('position').array));
   const sameCamera=[0,1,2,5,8,10].every(t=>JSON.stringify(getTerrainCameraStateAt(t,r.plan))===JSON.stringify(getTerrainCameraStateAt(t,dem.plan)));
   const material=r.scene.children.find((m:any)=>m.material?.map)?.material as any;let equivalent=false;await exportVideo({config,draw:(c:HTMLCanvasElement,t:number)=>{r.draw(c,t);if(t===5)equivalent=c.toDataURL()===direct;}});
   return{different,reversible,sameHeights,sameCamera,equivalent,uv:[uv.getX(0),uv.getY(0),uv.getX(uv.count-1),uv.getY(uv.count-1)],hasMap:!!material.map,flipY:material.map.flipY,vertexColors:material.vertexColors,maxTextures:r.gpu.info.memory.textures};
  }finally{r.dispose();dem.dispose();canvas.width=canvas.height=0;}
 });
 expect(result).toMatchObject({different:true,reversible:true,sameHeights:true,sameCamera:true,equivalent:true,uv:[0,1,1,0],hasMap:true,flipY:false,vertexColors:false,maxTextures:1});
});

test('photo readiness blocks export; corrupted/missing assets retain GPX and explicit DEM recovery',async({page})=>{
 await page.goto('/');await page.locator('#terrain-demo').click();await expect(page.locator('#export')).toBeEnabled();
 let release:()=>void=()=>{};const pending=new Promise<void>(resolve=>release=resolve);await page.route('**/imagery/sogne-sentinel-20m.jpg',async r=>{await pending;await r.continue();});
 await page.locator('#terrain-surface').selectOption('photo');await expect(page.locator('#export')).toBeDisabled();release();await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#map-detail-note')).toContainText('Copernicus');
 await page.unroute('**/imagery/sogne-sentinel-20m.jpg');await page.route('**/imagery/sogne-sentinel-20m.jpg',r=>r.fulfill({body:'corrupt',contentType:'image/jpeg'}));
 await page.locator('#terrain-surface').selectOption('dem');await expect(page.locator('#export')).toBeEnabled();await page.locator('#terrain-surface').selectOption('photo');await expect(page.locator('#status')).toContainText('Контрольная сумма');await expect(page.locator('#export')).toBeDisabled();await expect(page.locator('#route-info')).toContainText('721');await page.locator('#terrain-surface').selectOption('dem');await expect(page.locator('#export')).toBeEnabled();
 await page.locator('#camera-mode').selectOption('cinematic');await expect(page.locator('#export')).toBeEnabled();
});

test('photo cancellation/retry makes a decodable10s MP4 with first-party-only loads and no persistence',async({page,context})=>{
 const external:string[]=[];await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4173'?r.continue():(external.push(r.request().url()),r.abort()));
 await page.goto('/');await page.locator('#terrain-demo').click();await expect(page.locator('#export')).toBeEnabled();await page.locator('#quality').selectOption('compatibility');await page.locator('#duration').selectOption('10');await page.locator('#terrain-surface').selectOption('photo');await expect(page.locator('#export')).toBeEnabled();
 await page.locator('#export').click();await expect(page.locator('#terrain-surface')).toBeDisabled();await page.locator('#cancel').click();await expect(page.locator('#status')).toContainText('отменён');await expect(page.locator('#export')).toBeEnabled();
 const pending=page.waitForEvent('download');await page.locator('#export').click();const path=test.info().outputPath('photo.mp4');await(await pending).saveAs(path);expect(validateVideo(path,360,640,10).decodedFrames).toBe(240);await expect(page.locator('#terrain-surface')).toBeEnabled();
 const unsupported=await page.evaluate(async()=>{Object.defineProperty(globalThis,'VideoEncoder',{configurable:true,value:undefined});});void unsupported;await page.locator('#ratio').selectOption('landscape');await expect(page.locator('#status')).toContainText('WebCodecs');await expect(page.locator('#export')).toBeDisabled();await page.locator('#scrub').fill('5');await expect(page.locator('#preview')).toHaveAttribute('data-phase','ROUTE_REPLAY');
 expect(await page.evaluate(async()=>({local:localStorage.length,session:sessionStorage.length,db:await indexedDB.databases()}))).toEqual({local:0,session:0,db:[]});expect(external).toEqual([]);
});

test('obsolete image preparation is cancelled without stale state or loss of the2D route',async({page})=>{
 await page.goto('/');await page.locator('#terrain-demo').click();await expect(page.locator('#export')).toBeEnabled();let release:()=>void=()=>{};const pending=new Promise<void>(resolve=>release=resolve);
 await page.route('**/imagery/sogne-sentinel-20m.jpg',async r=>{await pending;try{await r.continue();}catch{/* abandoned request */}});await page.locator('#terrain-surface').selectOption('photo');await expect(page.locator('#export')).toBeDisabled();await page.locator('#camera-mode').selectOption('cinematic');await expect(page.locator('#export')).toBeEnabled();release();await page.locator('#scrub').fill('5');await expect(page.locator('#map-detail-note')).toContainText('Natural Earth');await expect(page.locator('#route-info')).toContainText('721');await expect(page.locator('#status')).not.toContainText('abort');
});
