import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { validateVideo } from '../../scripts/validate-video.mjs';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

test('local marker admission, alpha/orientation, replacement and decoder cleanup',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const {prepareCustomMarker,prepareMarker}=await import('/src/marker.ts');
  const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d')!;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,512,256);ctx.fillStyle='#00ff00';ctx.fillRect(512,256,512,256);
  const blob=await new Promise<Blob>(resolve=>c.toBlob(b=>resolve(b!),'image/png')),close=ImageBitmap.prototype.close;let closes=0;ImageBitmap.prototype.close=function(){closes++;return close.call(this);};
  try{const a=await prepareCustomMarker(new File([blob],'private-name.png',{type:'image/png'})),copy=a.clone(),bitmap=copy.canvas.getContext('2d')!.getImageData(0,0,256,256).data;
   const pixels=(x:number,y:number)=>Array.from(bitmap.slice((y*256+x)*4,(y*256+x)*4+4));const checks={size:[a.canvas.width,a.canvas.height],top:pixels(20,75),bottom:pixels(200,175),transparent:pixels(200,75)};
   a.dispose();a.dispose();const independent=copy.canvas.width;copy.dispose();let rejected=false;try{await prepareCustomMarker(new File(['<svg/>'],'unsafe.png',{type:'image/png'}));}catch{rejected=true;}
   const webp=await new Promise<Blob>(resolve=>c.toBlob(b=>resolve(b!),'image/webp')),w=await prepareCustomMarker(new File([webp],'image.webp',{type:'image/webp'}));w.dispose();
   c.width=1025;const large=await new Promise<Blob>(resolve=>c.toBlob(b=>resolve(b!),'image/png'));let largeRejected=false;try{await prepareCustomMarker(new File([large],'large.png',{type:'image/png'}));}catch{largeRejected=true;}
   let unavailable=false;try{prepareMarker('custom');}catch{unavailable=true;}
   const [{RouteRenderer},{parseGpx},{defaultStoryConfig}]=await Promise.all(['/src/renderer.ts','/src/gpx.ts','/src/story.ts'].map(p=>import(p))),route=parseGpx(await(await fetch('/samples/synthetic.gpx')).text()),failedCloneReleased=[];
   for(const cameraMode of ['classic','cinematic']){const source=prepareMarker('unicycle')!,clone=source.clone.bind(source);let held:ReturnType<typeof prepareMarker>;source.clone=()=>held=clone();let failed=false;
    try{new RouteRenderer(route,{get features(){throw Error('Synthetic renderer preparation failure');},get geography(){throw Error('Synthetic renderer preparation failure');}},640,360,'atlas',{...defaultStoryConfig(),cameraMode,marker:'custom'},source);}catch{failed=true;}finally{source.dispose();}failedCloneReleased.push(failed&&held?.canvas.width===0);
   }
   return{...checks,independent,disposed:[a.canvas.width,copy.canvas.width,w.canvas.width],closes,rejected,largeRejected,unavailable,failedCloneReleased};
  }finally{ImageBitmap.prototype.close=close;}
 });expect(result).toMatchObject({size:[256,256],top:[255,0,0,255],bottom:[0,255,0,255],transparent:[0,0,0,0],independent:256,disposed:[0,0,0],closes:2,rejected:true,largeRejected:true,unavailable:true,failedCloneReleased:[true,true]});
});

test('graded true ribbon and all icon modes retain occlusion, alignment and deterministic frames',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const [{TerrainRenderer},{loadTerrain},{parseGpx},{defaultStoryConfig}]=await Promise.all(['/src/terrain-renderer.ts','/src/terrain.ts','/src/gpx.ts','/src/story.ts'].map(p=>import(p)));
  const route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),before=JSON.stringify(route),results=[];
  for(const quality of ['compatibility','standard'])for(const aspect of ['landscape','portrait'])for(const style of ['atlas','night']){
   const w=quality==='standard'?1280:640,h=quality==='standard'?720:360,config={...defaultStoryConfig(),cameraMode:'terrain',qualityPreset:quality,aspectRatio:aspect,visualStyle:style,routeColor:'grade',replayPacing:'terrain',marker:'unicycle'},r=new TerrainRenderer(route,await loadTerrain(quality),aspect==='portrait'?h:w,aspect==='portrait'?w:h,config),c=document.createElement('canvas');
   try{r.draw(c,10);const direct=c.toDataURL();r.draw(c,17);r.draw(c,3);r.draw(c,10);const mesh=r.scene.children.find((o:any)=>o.material?.type==='ShaderMaterial') as any,sprite=r.scene.children.find((o:any)=>o.isSprite) as any;
    const state=r.timeline.at(10),xy=r.terrain.world(state.point),height=r.terrain.meshElevation(xy)!+24,colors=mesh.geometry.getAttribute('gradeColor'),distinct=new Set<string>();for(let i=0;i<colors.count;i++)distinct.add(`${colors.getX(i)},${colors.getY(i)},${colors.getZ(i)}`);
    results.push({same:direct===c.toDataURL(),depth:mesh.material.depthTest&&sprite.material.depthTest,gradeEnabled:mesh.material.uniforms.gradeEnabled.value,colors:distinct.size,source:r.timeline.dynamics.source,status:r.timeline.dynamics.status,aligned:Math.abs(sprite.position.x-xy[0])+Math.abs(sprite.position.y-height)+Math.abs(sprite.position.z+xy[1])<1e-8,finite:Array.from(mesh.geometry.getAttribute('position').array).every(Number.isFinite)});
    r.dispose();results.at(-1)!.clean=r.scene.children.length===0&&sprite.material.map.image.width===0;
   }finally{r.dispose();}
  }
  return{results,unchanged:before===JSON.stringify(route)};
 });expect(result.unchanged).toBe(true);for(const r of result.results){expect(r).toMatchObject({same:true,depth:true,gradeEnabled:true,aligned:true,finite:true,clean:true,status:'usable'});expect(r.colors).toBeGreaterThan(2);expect(r.source).toContain('DEM');}
});

test('2D Classic/Cinematic markers preserve exact seek, neutral missing heights and local privacy',async({page,context})=>{
 const external:string[]=[];await context.route('**/*',r=>new URL(r.request().url()).origin==='http://127.0.0.1:4173'?r.continue():(external.push(r.request().url()),r.abort()));
 await page.goto('/');await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();await page.locator('#marker').selectOption('unicycle');await expect(page.locator('#export')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  const [{RouteRenderer},{loadGeography},{parseGpx},{defaultStoryConfig}]=await Promise.all(['/src/renderer.ts','/src/geography.ts','/src/gpx.ts','/src/story.ts'].map(p=>import(p))),route=parseGpx(await(await fetch('/samples/synthetic.gpx')).text()),land=await(await fetch('/maps/ne_110m_land.geojson')).json();delete route.segments[0][0].elevation;
  const results=[];for(const camera of ['classic','cinematic'])for(const marker of ['unicycle','bicycle','pedestrian']){
   const r=new RouteRenderer(route,{...land,geography:await loadGeography()},640,360,'atlas',{...defaultStoryConfig(),cameraMode:camera,marker,replayPacing:'terrain'}),c=document.createElement('canvas');try{r.draw(c,10);const a=c.toDataURL();r.draw(c,19);r.draw(c,3);r.draw(c,10);results.push({same:a===c.toDataURL(),neutral:r.timeline.dynamics.status==='missing'});}finally{r.dispose();}
  }return{results,storage:localStorage.length+sessionStorage.length,databases:(await indexedDB.databases()).length};
 });for(const r of result.results)expect(r).toEqual({same:true,neutral:true});expect(result.storage+result.databases).toBe(0);expect(external).toEqual([]);
 await page.setViewportSize({width:393,height:851});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('graded ribbon is actually hidden by the DEM depth surface',async({page})=>{
 await page.goto('/');const proof=await page.evaluate(async()=>{
  const [{TerrainRenderer},{loadTerrain},{parseGpx},{defaultStoryConfig}]=await Promise.all(['/src/terrain-renderer.ts','/src/terrain.ts','/src/gpx.ts','/src/story.ts'].map(p=>import(p))),route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),r=new TerrainRenderer(route,await loadTerrain('standard'),1280,720,{...defaultStoryConfig(),cameraMode:'terrain',routeColor:'grade',terrainFlight:'corridor'}),c=document.createElement('canvas');
  const frame=()=>{r.draw(c,10);return c.toDataURL();};
  try{const visible=frame(),paths=r.scene.children.filter((o:any)=>o.material?.type==='ShaderMaterial');for(const path of paths)path.visible=false;const absent=frame();for(const path of paths){path.visible=true;path.position.y=-10000;}const occluded=frame();for(const path of paths)path.position.y=0;return{visible:visible!==absent,hidden:occluded===absent,restored:frame()===visible};}finally{r.dispose();}
 });expect(proof).toEqual({visible:true,hidden:true,restored:true});
});

for(const aspect of ['landscape','portrait'])test(`real graded unicycle MP4, frame equivalence and recovery (${aspect})`,async({page})=>{
 test.setTimeout(process.env.FULL_EXPORT_ACCEPTANCE?180000:90000);
 const full=!!process.env.FULL_EXPORT_ACCEPTANCE,duration=full?(aspect==='landscape'?20:30):4,width=aspect==='landscape'?(full?1280:640):(full?720:360),height=aspect==='landscape'?(full?720:360):(full?1280:640);
 await page.goto('/');const proof=await page.evaluate(async({duration,width,height,aspect,full})=>{
  const [{TerrainRenderer},{loadTerrain},{loadImagery},{parseGpx},{defaultStoryConfig},{exportVideo}]=await Promise.all(['/src/terrain-renderer.ts','/src/terrain.ts','/src/imagery.ts','/src/gpx.ts','/src/story.ts','/src/exporter.ts'].map(p=>import(p))),route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),config={...defaultStoryConfig('Синтетический пример · моноколесо'),durationSeconds:duration,introSeconds:full?2:.5,outroSeconds:full?2:.5,aspectRatio:aspect,qualityPreset:full?'standard':'compatibility',cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',routeColor:'grade',replayPacing:'terrain',marker:'unicycle',visualStyle:aspect==='portrait'?'night':'atlas'},r=new TerrainRenderer(route,await loadTerrain(config.qualityPreset),width,height,config,await loadImagery()),canvas=document.createElement('canvas');
  try{r.draw(canvas,duration/2);const reference=canvas.toDataURL();const controller=new AbortController();let cancelled=false;try{await exportVideo({config,signal:controller.signal,draw:(c:HTMLCanvasElement,t:number)=>{r.draw(c,t);if(t>0)controller.abort();}});}catch(e){cancelled=(e as Error).name==='AbortError';}
   let equivalent=false;const start=performance.now();(window as any).dynamicsVideo=await exportVideo({config,draw:(c:HTMLCanvasElement,t:number)=>{r.draw(c,t);if(t===duration/2)equivalent=c.toDataURL()===reference;}});const ms=performance.now()-start;
   const frames=[];for(const t of [0,duration*.25,duration*.5,duration*.75,duration-1/24]){r.draw(canvas,t);frames.push(canvas.toDataURL());}
   r.draw(canvas,duration/2);const image=canvas.getContext('2d')!.getImageData(0,0,width,height).data,preview=[];for(let i=0;i<image.length;i+=64)preview.push(image[i],image[i+1],image[i+2]);
   return{equivalent,cancelled,ms,frames,preview,textures:r.gpu.info.memory.textures,duration};
  }finally{r.dispose();}
 },{duration,width,height,aspect,full});expect(proof.equivalent).toBe(true);expect(proof.cancelled).toBe(true);expect(proof.textures).toBe(3);
 const pending=page.waitForEvent('download');await page.evaluate(()=>{const url=URL.createObjectURL((window as any).dynamicsVideo),a=document.createElement('a');a.href=url;a.download='proof.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 const dir=`artifacts/sprint10/${full?'full':'routine'}`,path=`${dir}/${aspect}-unicycle-${duration}s.mp4`;mkdirSync(dir,{recursive:true});await(await pending).saveAs(path);const report=validateVideo(path,width,height,duration);expect(report.decodedFrames).toBe(duration*24);
 const decoded=execFileSync(ffmpeg!,['-v','error','-ss',String(duration/2),'-i',path,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{windowsHide:true,maxBuffer:8*1024*1024});let error=0,sample=0;for(let i=0;i<decoded.length;i+=64)for(let channel=0;channel<3;channel++)error+=Math.abs(decoded[i+channel]-proof.preview[sample++]);const decodedPixelError=error/sample;expect(decodedPixelError).toBeLessThan(15);
 const small=execFileSync(ffmpeg!,['-v','error','-i',path,'-vf','scale=64:36','-f','rawvideo','-pix_fmt','gray','-'],{windowsHide:true,maxBuffer:3*1024*1024});for(let at=0;at<small.length;at+=64*36){const frame=small.subarray(at,at+64*36),mean=frame.reduce((n,v)=>n+v,0)/frame.length,variance=frame.reduce((n,v)=>n+(v-mean)**2,0)/frame.length;expect(variance).toBeGreaterThan(25);}
 const {writeFileSync}=await import('node:fs');writeFileSync(`${path}.proof.json`,JSON.stringify({...report,exportMs:proof.ms,previewExportEqual:proof.equivalent,decodedPixelError,allFramesNonblank:true,cancelledThenRetried:proof.cancelled,source:'synthetic',browser:await page.evaluate(()=>navigator.userAgent)},null,2));for(let i=0;i<proof.frames.length;i++)writeFileSync(`${path}.frame-${i}.png`,Buffer.from(proof.frames[i].split(',')[1],'base64'));
});

test('custom local PNG in the UI exports and recovers from rejected replacement/cancel',async({page,context})=>{
 const uploads:string[]=[];context.on('request',r=>{if(r.method()!=='GET')uploads.push(r.url());});await page.goto('/');await page.locator('#terrain-demo').click();await expect(page.locator('#export')).toBeEnabled();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;x.fillStyle='#e85cd3';x.beginPath();x.arc(64,64,50,0,Math.PI*2);x.fill();x.fillStyle='#45dfea';x.fillRect(40,20,40,40);return c.toDataURL().split(',')[1];});
 await page.locator('#marker-file').setInputFiles({name:'local.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await expect(page.locator('#marker')).toHaveValue('custom');await expect(page.locator('#export')).toBeEnabled();
 await page.locator('#route-color').selectOption('grade');await expect(page.locator('#export')).toBeEnabled();await page.locator('#replay-pacing').selectOption('terrain');await expect(page.locator('#export')).toBeEnabled();await page.locator('#duration').selectOption('10');await expect(page.locator('#export')).toBeEnabled();await page.locator('#quality').selectOption('compatibility');await expect(page.locator('#export')).toBeEnabled();
 await page.locator('#marker-file').setInputFiles({name:'spoof.png',mimeType:'image/png',buffer:Buffer.from('<svg onload="alert(1)"/>')});await expect(page.locator('#status')).toContainText('SVG');await expect(page.locator('#export')).toBeEnabled();
 await page.locator('#export').click();await expect(page.locator('#marker-file')).toBeDisabled();await expect(page.locator('#marker')).toBeDisabled();await page.locator('#cancel').click();await expect(page.locator('#status')).toContainText('отменён');
 const pending=page.waitForEvent('download');await page.locator('#export').click();const path=test.info().outputPath('custom.mp4');await(await pending).saveAs(path);expect(validateVideo(path,360,640,10).decodedFrames).toBe(240);
 const decoded=execFileSync(ffmpeg!,['-v','error','-ss','5','-i',path,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{windowsHide:true,maxBuffer:2*1024*1024});let customPixels=0;for(let i=0;i<decoded.length;i+=4)if(decoded[i]>160&&decoded[i+1]<150&&decoded[i+2]>155)customPixels++;expect(customPixels).toBeGreaterThan(20);
 await expect(page.locator('#export')).toBeEnabled();await page.locator('#marker').selectOption('pedestrian');await expect(page.locator('#export')).toBeEnabled();expect(uploads).toEqual([]);
});
