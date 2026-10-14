import{describe,it,expect,beforeAll}from'vitest';
import{readFileSync}from'node:fs';
import{DOMParser as XmlParser,onErrorStopParsing}from'@xmldom/xmldom';
import swiss from '../../data/swiss-phase-c/manifest.json';
import{TerrainDataset,type TerrainManifest}from'../../src/terrain';
import{parseGpx}from'../../src/gpx';
import{StoryTimeline}from'../../src/timeline';
import{RouteDynamics}from'../../src/route-dynamics';
import{defaultStoryConfig}from'../../src/story';
import{createTerrainCameraPlan,requiredVisibleAltitude,terrainFrameCoverage,projectTerrainPoint}from'../../src/terrain-camera';
import{createCameraDirector,DIRECTOR_SAFE_AREAS}from'../../src/camera-director';
import{automaticMontage,editShot,editDuration}from'../../src/montage';
import{prepareMontage,isPreparedMontage}from'../../src/montage-camera';
beforeAll(()=>Object.defineProperty(globalThis,'DOMParser',{value:class{parseFromString(xml:string){return new XmlParser({onError:onErrorStopParsing}).parseFromString(xml,'application/xml');}},configurable:true}));
function scene(aspect:'landscape'|'portrait'){
 const m=swiss.terrain as unknown as TerrainManifest,l=m.lods[0],bytes=readFileSync('public/regions/furka/'+l.file),terrain=new TerrainDataset(m,l,new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2)),route=parseGpx(readFileSync('public/regions/furka/furka-synthetic.gpx','utf8')),config={...defaultStoryConfig(),aspectRatio:aspect,durationSeconds:30 as const,cameraMode:'director' as const,replayPacing:'terrain' as const,terrainFlight:'corridor' as const},timeline=new StoryTimeline(route,config,new RouteDynamics(route,{name:'swisstopo DEM',spacingMeters:5,covers:r=>terrain.routeCoverage(r),elevation:p=>terrain.sampleElevation(p.lat,p.lon)})),plan=createTerrainCameraPlan(timeline,terrain,aspect==='portrait'?720:1280,aspect==='portrait'?1280:720,{framingBounds:swiss.cameraReference.bounds,framingReliefMeters:swiss.cameraReference.reliefMeters,overview:'route',detailSpacingMeters:.5,maximumTexelPixels:2});plan.director=createCameraDirector(plan);return plan;
}
describe('edited real terrain camera uses complete existing safety proof',()=>{
 for(const aspect of ['landscape','portrait']as const)it(`re-proves alternate ${aspect} poses and retimes the SAME marker/camera`,async()=>{
  const base=scene(aspect),auto=automaticMontage(base.timeline),id=auto.scenes[2].id,choices=[];
  for(const shot of ['scenic-side','mountain-reveal','curve-showcase']as const){try{const model=editDuration(editShot(auto,id,aspect,shot),id,240),p=await prepareMontage(model,base,undefined,new AbortController().signal);expect(isPreparedMontage(p)).toBe(true);expect(p.director.diagnostics.proofIntervals).toBeLessThanOrEqual(30000);for(let i=0;i<=720;i++){const out=i/24,time=p.playback.sourceTime(out),pose=p.director.at(time),state=p.playback.at(out),xy=base.terrain.world(state.point),marker=[...xy,base.terrain.meshElevation(xy)!+24]as const;expect(pose.segment).toBe(state.segment);expect(pose.clearance).toBeGreaterThanOrEqual(350-1e-6);expect(requiredVisibleAltitude(base.terrain,pose.position,marker)).toBeCloseTo(pose.position[2],6);expect(terrainFrameCoverage(base.terrain,pose,base.width,base.height).complete).toBe(true);const pixel=projectTerrainPoint(marker,pose.position,pose.target,base.width,base.height),safe=DIRECTOR_SAFE_AREAS[aspect].marker;expect(pixel[0]/base.width).toBeGreaterThan(safe[0]);expect(pixel[0]/base.width).toBeLessThan(safe[2]);expect(pixel[1]/base.height).toBeGreaterThan(safe[1]);expect(pixel[1]/base.height).toBeLessThan(safe[3]);}choices.push(p);}catch(e){if((e as Error).message.startsWith('Этот монтажный ракурс недоступен'))continue;throw e;}}
  expect(choices.length).toBeGreaterThanOrEqual(2);expect(isPreparedMontage({validation:'continuous-certified'})).toBe(false);
 },20000);
 it('timing-only changes reuse a certified plan, cancellation rejects stale updates',async()=>{const base=scene('portrait'),m=automaticMontage(base.timeline),a=await prepareMontage(m,base,undefined,new AbortController().signal),b=await prepareMontage(editDuration(m,m.scenes[2].id,240),base,undefined,new AbortController().signal,a);expect(b.director).toBe(a.director);const c=new AbortController();c.abort();await expect(prepareMontage(m,base,undefined,c.signal)).rejects.toMatchObject({name:'AbortError'});});
});
