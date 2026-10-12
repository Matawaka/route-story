/** Developer-only bounded camera experiment. Never installed into the UI/export
 * defaults: compare the same source scene, then review composition separately. */
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {withServer} from './server.mjs';
import {validateVideo} from '../validate-video.mjs';
const coarse=process.argv.includes('--coarse'),folder='artifacts/sprint10/detail-study';mkdirSync(folder,{recursive:true});const reports=[];
await withServer(async url=>{const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();try{await page.goto(url);
 for(const aspect of ['landscape','portrait'])for(const guarded of [false,true]){
  const r=await page.evaluate(async({aspect,guarded,coarse})=>{
   const [{TerrainRenderer},{loadTerrain},{loadImagery},{parseGpx},{defaultStoryConfig},{exportVideo},{getTerrainCameraStateAt,terrainCorridorDeficit}]=await Promise.all(['/src/terrain-renderer.ts','/src/terrain.ts','/src/imagery.ts','/src/gpx.ts','/src/story.ts','/src/exporter.ts','/src/terrain-camera.ts'].map(p=>import(p)));
   const width=aspect==='portrait'?720:1280,height=aspect==='portrait'?1280:720,route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),config={...defaultStoryConfig('Synthetic detail study'),cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',qualityPreset:'standard',aspectRatio:aspect,durationSeconds:4,introSeconds:.5,outroSeconds:.5},renderer=new TerrainRenderer(route,await loadTerrain('standard'),width,height,config,await loadImagery()),c=document.createElement('canvas');
   try{
    if(guarded){
     // Fine-patch focus safeguard; the coarse fallback is still40m and is NOT
     // promised two-pixel sharpness. One continuous10m envelope avoids altitude
     // jumps at coverage boundaries. TARGET SLANT proxy, not every ground pixel.
     const range=(coarse?40:10)/2*height/(2*Math.tan(46*Math.PI/360)),lift=s=>{const [x,y,z]=s.position,[tx,ty,tz]=s.target,horizontal=Math.hypot(x-tx,y-ty),next=Math.max(z,tz+Math.sqrt(Math.max(0,range*range-horizontal*horizontal)));if(next>80000)throw Error('Detail envelope exceeds existing altitude bound');return{...s,position:[x,y,next]};};
     renderer.plan.shots=renderer.plan.shots.map(lift);renderer.plan.overview=lift(renderer.plan.overview);
    }
    const legs=[[renderer.plan.overview,renderer.plan.shots[0]],[renderer.plan.shots.at(-1),renderer.plan.overview],...renderer.plan.shots.slice(1).map((s,i)=>[renderer.plan.shots[i],s]).filter(([a,b])=>a.segment===b.segment)];const proven=legs.every(([a,b])=>terrainCorridorDeficit(renderer.terrain,a.position,b.position)<1e-6);
    let minimum=Infinity;for(let frame=0;frame<=96;frame++)minimum=Math.min(minimum,getTerrainCameraStateAt(frame/24,renderer.plan).clearance);
    const scenes=[];for(const t of [.5,1,2,3.5]){renderer.draw(c,t);const pose=getTerrainCameraStateAt(t,renderer.plan),state=renderer.timeline.at(t),xy=renderer.terrain.world(state.point),m=renderer.imagery.manifest,b=m.detail.bounds,fine=xy[0]>=b[0]+450&&xy[0]<=b[2]-450&&xy[1]>=b[1]+450&&xy[1]<=b[3]-450,gsd=fine?m.detail.spacingMeters:m.spacingMeters;
     const project=([x,y])=>{const v=renderer.camera.position.clone().set(x,renderer.terrain.meshElevation([x,y]),-y).project(renderer.camera);return[(v.x+1)*width/2,(1-v.y)*height/2];},p=project(xy),east=project([xy[0]+gsd,xy[1]]),north=project([xy[0],xy[1]+gsd]),footprint=Math.max(Math.hypot(east[0]-p[0],east[1]-p[1]),Math.hypot(north[0]-p[0],north[1]-p[1]));
     const metresPerPixel=Math.hypot(...pose.position.map((v,i)=>v-pose.target[i]))*2*Math.tan(pose.fov*Math.PI/360)/height;
     scenes.push({time:t,gsd,metresPerPixel,sourceTexelPixelsProxy:gsd/metresPerPixel,measuredGroundTexelPixels:footprint,altitude:pose.position[2],frame:c.toDataURL()});
    }
    window.detailVideo=await exportVideo({config,draw:(target,t)=>renderer.draw(target,t)});return{width,height,proven,minimum,scenes};
   }finally{renderer.dispose();c.width=c.height=0;}
  },{aspect,guarded,coarse});
  if(!r.proven||r.minimum<349.999)throw Error('Detail guard failed original terrain safety');const name=`${aspect}-${guarded?(coarse?'coarse-guard':'guard'):'original'}`,pending=page.waitForEvent('download');await page.evaluate(()=>{const u=URL.createObjectURL(window.detailVideo),a=document.createElement('a');a.href=u;a.download='detail.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});const path=`${folder}/${name}.mp4`;await(await pending).saveAs(path);const validation=validateVideo(path,r.width,r.height,4);
  for(const s of r.scenes){writeFileSync(`${folder}/${name}-${s.time}s.png`,Buffer.from(s.frame.split(',')[1],'base64'));delete s.frame;}reports.push({name,...r,validation});
 }
}finally{await browser.close();}});writeFileSync(`${folder}/${coarse?'coarse-study':'study'}.json`,JSON.stringify({guardSourceMeters:coarse?40:10,method:'Same721-point synthetic route, resident10/40m assets, DEM50m, fixed24FPS and720p. Target slant metres/output pixel proxy plus actual projected source-sized east/north surface edges at the route marker. These local samples do not bound every ground pixel. Developer-only guard raises altitude, never reduces350m clearance or changes XY/source coordinates; exact crossed-cell leg proof retained. Not enabled in product.',reports},null,2));
