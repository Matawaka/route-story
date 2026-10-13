import {describe,it,expect} from 'vitest';
import {planGeography,planPoint} from '../../src/geographic-plan';
import {terrainWorld} from '../../src/terrain';
import {sourceProjection,rasterSample,type SourceRaster} from '../../src/geographic-cog';
import {usableSceneClass} from '../../src/geographic-preparation';
import type {Route} from '../../src/route';
const route=(segments:Route['segments']):Route=>({segments,name:'Synthetic',pointCount:segments.flat().length,distanceKm:1});
describe('bounded generic coverage, without changing GPX',()=>{
 it.each([.5,1,5,20,50])('prepares a %s km extent within original memory caps',km=>{const r=route([[{lon:10,lat:45},{lon:10+km/78.6,lat:45}]]),copy=JSON.stringify(r),p=planGeography(r);expect(p.demWidth*p.demHeight).toBeLessThanOrEqual(500000);expect(p.demWidth*p.demHeight*2).toBeLessThanOrEqual(1000000);expect(p.imageWidth*p.imageHeight).toBeLessThanOrEqual(3000000);expect(Math.max(p.imageWidth,p.imageHeight)).toBeLessThanOrEqual(2048);expect(JSON.stringify(r)).toBe(copy);for(const point of r.segments[0]){const xy=terrainWorld({origin:p.origin},point);expect(xy[0]).toBeGreaterThan(p.bounds[0]+2000);expect(xy[0]).toBeLessThan(p.bounds[2]-2000);}});
 it('stationary and repeated coordinates stay finite',()=>{const p=planGeography(route([[{lon:20,lat:50},{lon:20,lat:50}]]));expect(p.areaKm2).toBeGreaterThan(0);expect(Object.values(p).filter(v=>typeof v==='number').every(Number.isFinite)).toBe(true);});
 it('splits the antimeridian into two bounded searches',()=>{const p=planGeography(route([[{lon:179.99,lat:40},{lon:-179.99,lat:40}]]));expect(p.searchBoxes).toHaveLength(2);for(const box of p.searchBoxes){expect(box[0]).toBeGreaterThanOrEqual(-180);expect(box[2]).toBeLessThanOrEqual(180);expect(box[2]-box[0]).toBeLessThan(1);}expect(p.bounds[2]-p.bounds[0]).toBeLessThan(20000);});
 it('does not silently cut a long or distant disconnected route',()=>{const r=route([[{lon:0,lat:40}],[{lon:10,lat:40}]]);expect(()=>planGeography(r)).toThrow('55 км');expect(r.segments).toHaveLength(2);});
 it('does not treat polar coordinates as an ordinary supported scene',()=>expect(()=>planGeography(route([[{lon:0,lat:80}]]))).toThrow('75°'));
 it('rounds the external area outwards, without uploading point geometry',()=>{const p=planGeography(route([[{lon:12.345678,lat:50.123456}]]));for(const box of p.searchBoxes)for(const coordinate of box)expect(coordinate*10).toBeCloseTo(Math.round(coordinate*10),9);expect(Object.keys(p)).not.toContain('segments');});
 it('world/inverse coordinates preserve WGS84 and the short arc',()=>{const p=planGeography(route([[{lon:179.99,lat:45}]])),point={lon:-179.99,lat:45.01},xy=terrainWorld({origin:p.origin},point),back=planPoint(p,...xy);expect(back.lon).toBeCloseTo(point.lon,10);expect(back.lat).toBeCloseTo(point.lat,10);});
});
describe('source coordinates and classification',()=>{
 it('known UTM central meridians and hemispheres',()=>{expect(sourceProjection(32632)(9,0)[0]).toBeCloseTo(500000,5);expect(sourceProjection(32732)(9,0)[1]).toBeCloseTo(10000000,5);expect(sourceProjection(4326)(9,45)).toEqual([9,45]);expect(()=>sourceProjection(3857)).toThrow('координат');});
 it('north-up photo and DEM sampling, no-data and genuine zero RGB channels',()=>{const r:SourceRaster={source:{id:'synthetic',href:'',epsg:4326,kind:'dem',date:'',resolution:30},box:[0,0,2,2],width:2,height:2,samples:1,values:[100,200,-32768,0],noData:-32768,project:(x,y)=>[x,y],close:async()=>{}};expect(rasterSample(r,.5,1.5)).toBe(100);expect(rasterSample(r,.5,.5)).toBeUndefined();expect(rasterSample(r,1.5,.5)).toBe(0);expect(rasterSample(r,3,3)).toBeUndefined();r.source.kind='photo';r.noData=0;expect(rasterSample(r,1.5,.5)).toBe(0);});
 it('SCL cloud/cirrus/shadow/unknown are separate from clear snow and water',()=>{for(const c of [2,4,5,6,11])expect(usableSceneClass(c)).toBe(true);for(const c of [undefined,0,1,3,7,8,9,10])expect(usableSceneClass(c)).toBe(false);});
});
