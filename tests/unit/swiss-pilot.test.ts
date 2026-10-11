import {it,expect,beforeAll} from 'vitest';
import {DOMParser as XmlParser,onErrorStopParsing} from '@xmldom/xmldom';
import record from '../../data/swiss-pilot/manifest.json';
import {TerrainDataset,type TerrainManifest} from '../../src/terrain';
import {validateSwissImagery} from '../../src/swiss-pilot';
import {validateImagery,imageryUV,imageryCoversTerrain,type ImageryManifest} from '../../src/imagery';
import {regionalWorld,regionalGeographic,validateRegionalProjection,type RegionalProjection} from '../../src/regional-projection';
import {createTerrainCameraPlan,getTerrainCameraStateAt,terrainCorridorDeficit,requiredVisibleAltitude} from '../../src/terrain-camera';
import {StoryTimeline} from '../../src/timeline';
import {defaultStoryConfig} from '../../src/story';
import {parseGpx} from '../../src/gpx';
import {readFileSync} from 'node:fs';
const m=record.terrain as unknown as TerrainManifest,p=m.regionalProjection!;
beforeAll(()=>{Object.defineProperty(globalThis,'DOMParser',{value:class{parseFromString(xml:string){return new XmlParser({onError:onErrorStopParsing}).parseFromString(xml,'application/xml');}},configurable:true});});
function fixture(){return new TerrainDataset(m,m.lods[0],Int16Array.from({length:476*476},(_,i)=>Math.round(1800+(i%476)*.25+Math.floor(i/476)*.5)));}
it('LV95 forward/inverse match independent pinned PROJ corners and interior references',()=>{
 validateRegionalProjection(p,m.origin);
 for(const point of record.projectionProof.referencePoints){const xy=regionalWorld(p,point);expect(Math.hypot(xy[0]-point.world[0],xy[1]-point.world[1])).toBeLessThan(.005);const gp=regionalGeographic(p,point.world);expect(gp.lon).toBeCloseTo(point.lon,10);expect(gp.lat).toBeCloseTo(point.lat,10);}
 expect(record.projectionProof.independentCheckCount).toBe(7743);expect(record.projectionProof.forwardMaximumMeters).toBeLessThan(.001);expect(record.projectionProof.inverseMaximumMeters).toBeLessThan(.001);
});
it('regional CRS coefficients/domain/datums are bounded; old unreviewed fine DEM remains rejected',()=>{
 const t=fixture();expect(t.heights.byteLength).toBe(453152);expect(()=>new TerrainDataset({...m,regionalProjection:undefined},m.lods[0],t.heights)).toThrow();
 for(const altered of [{...p,crs:'EPSG:3857'},{...p,domainMeters:[-1e6,-500,500,500]},{...p,forwardCoefficients:[[NaN],[]]},{...p,maximumFitErrorMeters:1}])expect(()=>validateRegionalProjection(altered as RegionalProjection,m.origin)).toThrow();
 expect(()=>new TerrainDataset({...m,verticalDatum:'unknown'},m.lods[0],t.heights)).toThrow();expect(()=>regionalWorld(p,{lon:6.2,lat:61.28})).toThrow();expect(()=>regionalWorld(p,{lon:m.origin[0]+.008,lat:m.origin[1]})).toThrow();expect(()=>regionalGeographic(p,[501,0])).toThrow();
});
it('two same-origin photo levels stay north-up, matching the mesh, bounded and separate from Sogne',()=>{
 const image=record.imagery.high as ImageryManifest;validateSwissImagery(image);expect(imageryCoversTerrain(image,fixture())).toBe(true);expect(imageryUV(image,[-500,500])).toEqual([0,0]);expect(imageryUV(image,[500,-500])).toEqual([1,1]);expect(()=>validateImagery(image)).toThrow();
 for(const bad of [{...image,width:4096},{...image,bytes:3e6},{...image,origin:[6.2,61.28]},{...image,detail:{...image.detail!,bounds:[-600,-500,500,500]}},{...image,sha256:'broken'}])expect(()=>validateSwissImagery(bad)).toThrow();
 expect(record.budgets.imageryPixels).toBe(2960000);expect(record.budgets.meshVertices).toBe(226576);expect(record.imagery.high.bytes+record.imagery.high.detail.bytes).toBeLessThan(2*1024*1024);
});
it('synthetic winding road is local, retains points, and has no invented trip times/heights',()=>{
 const r=parseGpx(readFileSync('data/swiss-pilot/synthetic.gpx','utf8')),t=fixture();expect(r.segments[0]).toHaveLength(26);expect(r.distanceKm).toBeGreaterThan(.5);expect(r.distanceKm).toBeLessThan(1);expect(t.routeCoverage(r)).toBe(true);expect(r.segments.flat().every(p=>p.elevation===undefined&&p.time===undefined)).toBe(true);
});
for(const [w,h] of [[1280,720],[720,1280]])it(`bounded regional camera proves all 350m-clearance legs and exact seeks ${w}x${h}`,()=>{
 const t=fixture(),r=parseGpx(readFileSync('data/swiss-pilot/synthetic.gpx','utf8')),plan=createTerrainCameraPlan(new StoryTimeline(r,{...defaultStoryConfig(),terrainFlight:'corridor'}),t,w,h);
 expect(terrainCorridorDeficit(t,plan.overview.position,plan.shots[0].position)).toBeLessThan(1e-6);expect(terrainCorridorDeficit(t,plan.shots.at(-1)!.position,plan.overview.position)).toBeLessThan(1e-6);
 for(let i=1;i<plan.shots.length;i++)expect(terrainCorridorDeficit(t,plan.shots[i-1].position,plan.shots[i].position)).toBeLessThan(1e-6);
 const a=getTerrainCameraStateAt(10,plan);getTerrainCameraStateAt(18,plan);getTerrainCameraStateAt(0,plan);expect(getTerrainCameraStateAt(10,plan)).toEqual(a);
 for(let time=0;time<=20;time+=.125){const c=getTerrainCameraStateAt(time,plan);expect(c.clearance).toBeGreaterThanOrEqual(350-1e-6);expect(requiredVisibleAltitude(t,c.position,c.target)).toBeLessThanOrEqual(c.position[2]+1e-6);expect(c.position.every(Number.isFinite)).toBe(true);}
});
