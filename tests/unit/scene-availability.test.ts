import {describe,it,expect,beforeAll} from 'vitest';
import {readFileSync} from 'node:fs';
import {DOMParser as XmlParser,onErrorStopParsing} from '@xmldom/xmldom';
import {parseGpx} from '../../src/gpx';
import {sceneAvailability} from '../../src/scene-availability';
import {routeMetrics} from '../../src/geo';
import {terrainWorld} from '../../src/terrain';
import sogne from '../../public/terrain/sogne.json';
import descriptor from '../../data/sogne-coverage.json';
beforeAll(()=>{globalThis.DOMParser=class extends XmlParser{constructor(){super({onError:onErrorStopParsing});}} as unknown as typeof DOMParser;});
const make=(segments:{lon:number;lat:number}[][])=>({name:'Синтетический тест',segments,...routeMetrics(segments)});
describe('real local map availability',()=>{
  it('keeps the tiny bundled descriptor identical to the reviewed runtime manifest',()=>{
    expect(descriptor.sourceId).toBe(sogne.id);expect(descriptor.sourceManifest).toBe('public/terrain/sogne.json');
    for(const key of ['origin','westMeters','southMeters','eastMeters','northMeters'] as const)expect(descriptor[key]).toEqual(sogne[key]);
  });
  it('offers only the shipped photographic/DEM packs covering the complete route',()=>{
    const swiss=parseGpx(readFileSync('data/swiss-pilot/synthetic.gpx','utf8')),norway=parseGpx(readFileSync('public/samples/terrain-sogne.gpx','utf8'));
    expect(sceneAvailability(swiss,true,false)).toMatchObject({region:'furka',terrain:true,photo:true});
    expect(sceneAvailability(swiss,false,true)).toMatchObject({terrain:false,photo:false});
    expect(sceneAvailability(norway,true,true)).toEqual({region:'sogne',terrain:true,photo:true});
    expect(sceneAvailability(norway,true,false)).toMatchObject({region:'sogne',terrain:true,photo:false,notice:expect.stringContaining('Фотокарты')});
  });
  it('does not offer a partial DEM for foreign, mixed, empty or nonfinite routes',()=>{
    const swiss=parseGpx(readFileSync('data/swiss-pilot/synthetic.gpx','utf8'));
    for(const route of [make([[{lon:0,lat:0}]]),make([...swiss.segments,[{lon:6.2,lat:61.28}]]),make([]),make([[{lon:NaN,lat:61}]]),make([[{lon:179,lat:80},{lon:-179,lat:80}]])])expect(sceneAvailability(route,true,true)).toMatchObject({terrain:false,photo:false,notice:expect.stringContaining('картографической информации')});
  });
  it('uses the same metric projection and bounded safety margin as Sogne DEM',()=>{
    const origin=sogne.origin as [number,number],descriptor={origin};expect(terrainWorld(descriptor,{lon:origin[0],lat:origin[1]})).toEqual([0,0]);
    const lat=origin[1]+19000/(6371008.8*Math.PI/180);expect(sceneAvailability(make([[{lon:origin[0],lat}]]),false,true).terrain).toBe(false);
    const insideLat=origin[1]+17000/(6371008.8*Math.PI/180);expect(sceneAvailability(make([[{lon:origin[0],lat:insideLat}]]),false,true).terrain).toBe(true);
  });
});
