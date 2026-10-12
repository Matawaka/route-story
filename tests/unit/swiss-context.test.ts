import {it,expect,beforeAll} from 'vitest';
import {DOMParser as XmlParser,onErrorStopParsing} from '@xmldom/xmldom';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import original from '../../data/swiss-pilot/manifest.json';
import context from '../../data/swiss-phase-c/manifest.json';
import sources from '../../data/swiss-phase-c/sources.json';
import {validateRegionalProjection,regionalWorld,regionalGeographic,type RegionalProjection} from '../../src/regional-projection';
import {TerrainDataset,type TerrainManifest} from '../../src/terrain';
import {validateSwissImagery,swissCameraOptions} from '../../src/swiss-pilot';
import {validateImagery,projectedDetailWeight,type ImageryManifest} from '../../src/imagery';
import {createTerrainCameraPlan,getTerrainCameraStateAt,terrainCorridorDeficit,requiredVisibleAltitude,terrainTexelFootprint,terrainFrameCoverage} from '../../src/terrain-camera';
import {StoryTimeline} from '../../src/timeline';
import {defaultStoryConfig} from '../../src/story';
import {parseGpx} from '../../src/gpx';
beforeAll(()=>Object.defineProperty(globalThis,'DOMParser',{value:class{parseFromString(xml:string){return new XmlParser({onError:onErrorStopParsing}).parseFromString(xml,'application/xml');}},configurable:true}));
const manifest=context.terrain as unknown as TerrainManifest;
const fixture=()=>new TerrainDataset(manifest,manifest.lods[0],Int16Array.from({length:591*591},(_,i)=>Math.round(1800+(i%591)*.05+Math.floor(i/591)*.1)));
it('fixed ordinary OGD context has18 official hashed sources and preserves original detail and route',()=>{
 expect(sources.sources).toHaveLength(18);for(const s of sources.sources){expect(s.sha256).toMatch(/^[a-f0-9]{64}$/);expect(s.url).toMatch(/^https:\/\/data\.geo\.admin\.ch\/ch\.swisstopo\./);expect(s.asset).toMatch(/_2_2056.*\.tif$/);expect(s.crs).toBe('EPSG:2056');expect(s.bytes).toBeLessThan(3000000);if(s.kind==='dem')expect(s.verticalDatum).toBe('LN02');else expect(s.nativeOpticalGsd).toBeNull();}
 expect(context.imagery.high.detail.sha256).toBe(original.imagery.high.detail.sha256);expect(context.route.sha256).toBe(original.route.sha256);expect(createHash('sha256').update(readFileSync('data/swiss-pilot/synthetic.gpx')).digest('hex')).toBe(context.route.sha256);
 expect(context.budgets.meshVertices).toBe(349281);expect(context.budgets.heightGridBytes).toBeLessThanOrEqual(1000000);expect(context.budgets.imagePixels).toBe(2960000);expect(context.budgets.highJpegBytes).toBeLessThan(2*1024*1024);
});
it('3km projection is a reviewed specific extension, not a global relaxation',()=>{
 const p=manifest.regionalProjection!;validateRegionalProjection(p,manifest.origin);
 for(const ref of context.projectionProof.referencePoints){const xy=regionalWorld(p,ref),gp=regionalGeographic(p,ref.world);expect(Math.hypot(xy[0]-ref.world[0],xy[1]-ref.world[1])).toBeLessThan(.005);expect(gp.lon).toBeCloseTo(ref.lon,9);expect(gp.lat).toBeCloseTo(ref.lat,9);}
 expect(()=>validateRegionalProjection({...p,scope:undefined},manifest.origin)).toThrow();expect(()=>validateRegionalProjection({...p,domainMeters:[-2000,-2000,2000,2000]},manifest.origin)).toThrow();expect(()=>validateRegionalProjection({...p,originLV95:[2680500,1157500]},manifest.origin)).toThrow();expect(()=>regionalWorld(p,{lon:6.2,lat:61.28})).toThrow();
});
it('context cannot enter the Sogne/original pilot allowlist; measured LOD is reversible and bounded',()=>{
 const m=context.imagery.high as ImageryManifest;validateSwissImagery(m,'extended');expect(()=>validateSwissImagery(m)).toThrow();expect(()=>validateImagery(m)).toThrow();expect(()=>validateSwissImagery({...m,detailSelection:{...m.detailSelection!,maximumDetailPixels:100}},'extended')).toThrow();
 const a=projectedDetailWeight(m,.5);projectedDetailWeight(m,1.5);expect(projectedDetailWeight(m,.5)).toBe(a);expect(projectedDetailWeight(m,.1)).toBe(0);expect(projectedDetailWeight(m,1.5)).toBe(1);expect(projectedDetailWeight(m,1.5,false)).toBe(0);expect(()=>projectedDetailWeight(m,NaN)).toThrow();
});
it('frame-coverage certificate rejects an uncovered flat world and accepts its covered core',()=>{
 const t=fixture(),pose={position:[0,-100,2400],target:[0,0,1900],bearing:0,pitch:60,roll:0,near:5,far:100000,fov:46,phase:'INTRO',segment:0,clearance:400,visibilityLift:0} as const;
 expect(terrainFrameCoverage(t,pose,1280,720).complete).toBe(true);expect(terrainFrameCoverage(t,{...pose,position:[0,-100,20000]},1280,720).complete).toBe(false);expect(()=>terrainFrameCoverage(t,pose,1280,720,[-1,0,1,1])).toThrow();
});
for(const [w,h] of [[1280,720],[720,1280]])for(const duration of [10,20,30])it(`context camera/grade seeking and all350m legs ${w}x${h}/${duration}s`,()=>{
 const t=fixture(),r=parseGpx(readFileSync('data/swiss-pilot/synthetic.gpx','utf8')),config={...defaultStoryConfig(),durationSeconds:duration as 10|20|30,terrainFlight:'corridor' as const},plan=createTerrainCameraPlan(new StoryTimeline(r,config),t,w,h,swissCameraOptions('route'));
 for(const [a,b] of [[plan.overview,plan.shots[0]],[plan.shots.at(-1)!,plan.overview],...plan.shots.slice(1).map((s,i)=>[plan.shots[i],s])])expect(terrainCorridorDeficit(t,a.position,b.position)).toBeLessThan(1e-6);
 const at=getTerrainCameraStateAt(duration/2,plan);getTerrainCameraStateAt(duration-1,plan);getTerrainCameraStateAt(0,plan);expect(getTerrainCameraStateAt(duration/2,plan)).toEqual(at);
 for(let time=0;time<=duration;time+=.5){const pose=getTerrainCameraStateAt(time,plan),xy=t.world(plan.timeline.at(time).point);expect(pose.clearance).toBeGreaterThanOrEqual(350-1e-6);expect(requiredVisibleAltitude(t,pose.position,pose.target)).toBeLessThanOrEqual(pose.position[2]+1e-6);expect(terrainTexelFootprint(t,pose.position,pose.target,xy,w,h,.5)).toBeLessThanOrEqual(2+1e-6);expect(terrainFrameCoverage(t,pose,w,h).complete).toBe(true);}
});
