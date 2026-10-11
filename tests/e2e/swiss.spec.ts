import {test,expect} from '@playwright/test';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {validateVideo} from '../../scripts/validate-video.mjs';
test.skip(process.env.SWISS_PILOT!=='1'||!existsSync('.reference/swiss/pilot/furka-2m.i16'),'Opt-in Swiss OGD assets must be prepared locally; not part of the production package or routine CI.');
for(const aspect of ['landscape','portrait'])test(`actual Swiss same-camera low/high 3D MP4 and full decode ${aspect}`,async({page})=>{
 test.setTimeout(180000);const full=process.env.FULL_EXPORT_ACCEPTANCE==='1',duration=full?(aspect==='landscape'?20:30):10,width=aspect==='landscape'?1280:720,height=aspect==='landscape'?720:1280,dir='artifacts/sprint11/swiss';mkdirSync(dir,{recursive:true});const unexpected:string[]=[],requests:string[]=[];
 page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!=='http://127.0.0.1:4173')unexpected.push(r.url());requests.push(r.url());});await page.goto('/');
 let sharedPoses:unknown;for(const low of [true,false]){
  const proof=await page.evaluate(async({width,height,duration,aspect,low})=>{
   const [{loadSwissTerrain,loadSwissImagery,loadSwissRoute,swissPilotRecord},{loadTraveler},{parseGpx},{TerrainRenderer},{defaultStoryConfig},{exportVideo},{getTerrainCameraStateAt,requiredVisibleAltitude}]=await Promise.all(['/src/swiss-pilot.ts','/src/traveler.ts','/src/gpx.ts','/src/terrain-renderer.ts','/src/story.ts','/src/exporter.ts','/src/terrain-camera.ts'].map(p=>import(p)));
   const begin=performance.now(),terrain=await loadSwissTerrain(),imagery=await loadSwissImagery(low),source=await loadTraveler(),route=parseGpx(await loadSwissRoute()),loadMs=performance.now()-begin;
   const config={...defaultStoryConfig('Синтетическое демо · Фурка'),durationSeconds:duration,qualityPreset:'standard',cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',marker:'traveler',markerSize:'small',visualStyle:aspect==='landscape'?'atlas':'night',aspectRatio:aspect},r=new TerrainRenderer(route,terrain,width,height,config,imagery,source),c=document.createElement('canvas'),poses=[],frames=[],times=[0,duration*.1,duration*.25,duration*.5,duration*.75,duration-1/24];
   try{
    for(let frame=0;frame<duration*24;frame++){const pose=getTerrainCameraStateAt(frame/24,r.plan);if(pose.clearance<349.999||requiredVisibleAltitude(terrain,pose.position,pose.target)>pose.position[2]+1e-6)throw Error('Terrain safety violated');poses.push({position:pose.position,target:pose.target});}
    for(const t of times){r.draw(c,t);frames.push(c.toDataURL());}r.draw(c,duration/2);const reference=c.toDataURL();r.draw(c,duration*.8);r.draw(c,0);r.draw(c,duration/2);const seekEqual=c.toDataURL()===reference;
    const abort=new AbortController();let cancelled=false;try{await exportVideo({config,signal:abort.signal,draw:(c,t)=>{r.draw(c,t);if(t>0)abort.abort();}});}catch(e){cancelled=(e as Error).name==='AbortError';}
    const start=performance.now();let exportEqual=false;(window as any).swissVideo=await exportVideo({config,draw:(c,t)=>{r.draw(c,t);if(t===duration/2)exportEqual=c.toDataURL()===reference;}});const exportMs=performance.now()-start;r.draw(c,duration/2);const sample=c.getContext('2d').getImageData(0,0,width,height).data,preview=[];for(let i=0;i<sample.length;i+=64)preview.push(sample[i],sample[i+1],sample[i+2]);
    return{frames,poses,seekEqual,exportEqual,cancelled,loadMs,preparedMs:r.preparedMs,exportMs,preview,textures:r.gpu.info.memory.textures,vertices:r.terrainGeometry.attributes.position.count,sourceHashesVerified:true,imageBytes:low?swissPilotRecord.imagery.low.bytes+swissPilotRecord.imagery.low.detail.bytes:swissPilotRecord.imagery.high.bytes+swissPilotRecord.imagery.high.detail.bytes,userAgent:navigator.userAgent};
   }finally{r.dispose();}
  },{width,height,duration,aspect,low});expect(proof.seekEqual&&proof.exportEqual&&proof.cancelled).toBe(true);expect(proof.textures).toBe(2);expect(proof.vertices).toBe(226576);if(sharedPoses)expect(proof.poses).toEqual(sharedPoses);else sharedPoses=proof.poses;
  const name=`${aspect}-${low?'low10m':'high'}-${duration}s`,path=`${dir}/${name}.mp4`,download=page.waitForEvent('download');await page.evaluate(()=>{const url=URL.createObjectURL((window as any).swissVideo),a=document.createElement('a');a.href=url;a.download='swiss.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});await(await download).saveAs(path);const report=validateVideo(path,width,height,duration);expect(report.decodedFrames).toBe(duration*24);
  const decoded=execFileSync(ffmpeg!,['-v','error','-ss',String(duration/2),'-i',path,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{windowsHide:true,maxBuffer:8*1024*1024});let error=0,j=0;for(let i=0;i<decoded.length;i+=64)for(let k=0;k<3;k++)error+=Math.abs(decoded[i+k]-proof.preview[j++]);expect(error/j).toBeLessThan(15);
  const small=execFileSync(ffmpeg!,['-v','error','-i',path,'-vf','scale=64:36','-f','rawvideo','-pix_fmt','gray','-'],{windowsHide:true,maxBuffer:3*1024*1024});for(let i=0;i<small.length;i+=2304){const a=small.subarray(i,i+2304),mean=a.reduce((n,v)=>n+v,0)/a.length;expect(a.reduce((n,v)=>n+(v-mean)**2,0)/a.length).toBeGreaterThan(25);}
  for(let i=0;i<proof.frames.length;i++)writeFileSync(`${dir}/${name}-source-${i}.png`,Buffer.from(proof.frames[i].split(',')[1],'base64'));
  const {frames,preview,poses,...metrics}=proof;writeFileSync(`${path}.proof.json`,JSON.stringify({...report,...metrics,previewDecodedMeanError:error/j,allFramesNonblank:true,sameCameraVerified:true,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')},null,2));
 }
 expect(unexpected).toEqual([]);const storage=await page.evaluate(()=>[localStorage.length,sessionStorage.length]);expect(storage).toEqual([0,0]);
});
test('Swiss bounds/hash admission and explicit no-asset failure retain honest local behaviour',async({page})=>{
 await page.goto('/swiss-pilot.html');await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#status')).toContainText('Синтетическое');
 await page.route('**/__swiss-pilot/furka-high-detail.jpg',r=>r.fulfill({body:Buffer.from([1,2]),contentType:'image/jpeg'}));const error=await page.evaluate(async()=>{const {loadSwissImagery}=await import('/src/swiss-pilot.ts');try{await loadSwissImagery();return 'unexpected success';}catch(e){return(e as Error).message;}});expect(error).toContain('повреждён');
});
test('same-camera Swiss 2m versus deliberately coarse 50m mesh comparison',async({page})=>{
 await page.goto('/');const frames=await page.evaluate(async()=>{
  const [{loadSwissTerrain,loadSwissRoute},{loadTraveler},{parseGpx},{TerrainRenderer},{defaultStoryConfig},{getTerrainCameraStateAt}]=await Promise.all(['/src/swiss-pilot.ts','/src/traveler.ts','/src/gpx.ts','/src/terrain-renderer.ts','/src/story.ts','/src/terrain-camera.ts'].map(p=>import(p))),fine=await loadSwissTerrain(),coarse=await loadSwissTerrain(true),route=parseGpx(await loadSwissRoute()),asset=await loadTraveler(),config={...defaultStoryConfig('Синтетическое демо · Фурка'),qualityPreset:'standard',cameraMode:'terrain',terrainSurface:'dem',terrainFlight:'conservative',marker:'traveler',markerSize:'small'},a=new TerrainRenderer(route,fine,1280,720,config,undefined,asset),b=new TerrainRenderer(route,coarse,1280,720,config,undefined,asset),c=document.createElement('canvas'),out=[];
  try{
   // Scientific comparison only: both meshes use the SAME fine-grid, global
   // maximum+350m camera envelope. No production override/control is exposed.
   (b as any).plan=a.plan;
   for(const time of [0,5,10,20-1/24]){const pose=getTerrainCameraStateAt(time,a.plan);if(pose.position[2]<coarse.max+350)throw Error('Coarse mesh clearance');a.draw(c,time);const high=c.toDataURL();b.draw(c,time);const low=c.toDataURL();if(a.camera.position.distanceTo(b.camera.position)>1e-9||a.camera.quaternion.angleTo(b.camera.quaternion)>1e-7)throw Error('Geometry comparison changed camera');out.push({time,high,low,fineVertices:a.terrainGeometry.attributes.position.count,coarseVertices:b.terrainGeometry.attributes.position.count});}
   return out;
  }finally{a.dispose();b.dispose();}
 });mkdirSync('artifacts/sprint11/swiss/geometry',{recursive:true});for(let i=0;i<frames.length;i++){const f=frames[i];expect(f.fineVertices).toBe(226576);expect(f.coarseVertices).toBe(400);for(const type of ['high','low'] as const)writeFileSync(`artifacts/sprint11/swiss/geometry/${type}-${i}.png`,Buffer.from(f[type].split(',')[1],'base64'));}
});
