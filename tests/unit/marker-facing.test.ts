import {describe,it,expect} from 'vitest';
import {markerFacesLeft,routeMarkerDirection} from '../../src/marker';
import {RoutePath,fitProjection} from '../../src/geo';
describe('deterministic marker facing',()=>{
  it('ignores repeated short lateral zigzags while retaining the original points and exact reverse seeking',()=>{
    const points=Array.from({length:1001},(_,i)=>({lon:6+(i%2?-.00002:.00002),lat:61+i*.00001})),path=new RoutePath([points]),before=JSON.stringify(points),project=({lon,lat}:{lon:number;lat:number})=>[lon,-lat] as const;
    const at=(p:number)=>{const s=path.at(p);return markerFacesLeft(routeMarkerDirection(path,s.segment,s.index,project,s.distance));};
    for(let i=1;i<999;i++)expect(at(i/1000)).toBe(false);expect(at(.4)).toBe(at(.4));at(.9);expect(at(.4)).toBe(false);expect(JSON.stringify(points)).toBe(before);
  });
  it('reflects only leftward screen motion; vertical/stationary/nonfinite vectors stay neutral',()=>{
    for(const d of [[-1,0],[-1,2],[-20,-3]] as const)expect(markerFacesLeft(d)).toBe(true);
    for(const d of [[1,0],[0,1],[0,-1],[0,0],[-.00001,1],[NaN,1],[-1,Infinity]] as const)expect(markerFacesLeft(d)).toBe(false);
    expect(markerFacesLeft()).toBe(false);
  });
  it('keeps heading at exact start/end and reverses at a real turn without playback history',()=>{
    const path=new RoutePath([[{lon:2,lat:0},{lon:1,lat:0},{lon:3,lat:0}]]),project=({lon,lat}:{lon:number;lat:number})=>[lon,-lat] as const;
    const at=(t:number)=>{const p=path.at(t);return markerFacesLeft(routeMarkerDirection(path,p.segment,p.index,project));};
    expect(at(0)).toBe(true);expect(at(.2)).toBe(true);expect(at(.6)).toBe(false);expect(at(1)).toBe(false);expect(at(.2)).toBe(true);
    const mirrored=routeMarkerDirection(path,0,1,p=>[-p.lon,p.lat]);expect(markerFacesLeft(mirrored)).toBe(false);
  });
  it('has no invented bearing at a segment gap or stationary isolated point',()=>{
    const path=new RoutePath([[{lon:2,lat:0},{lon:1,lat:0}],[{lon:50,lat:0}],[{lon:80,lat:0},{lon:81,lat:0}]]),project=({lon,lat}:{lon:number;lat:number})=>[lon,lat] as const;
    expect(markerFacesLeft(routeMarkerDirection(path,0,1,project))).toBe(true);expect(routeMarkerDirection(path,1,0,project)).toBeUndefined();expect(markerFacesLeft(routeMarkerDirection(path,2,0,project))).toBe(false);
    expect(routeMarkerDirection(new RoutePath([[{lon:1,lat:0},{lon:1,lat:0}]]),0,0,project)).toBeUndefined();
    expect(routeMarkerDirection(path,0,0,()=>[NaN,1])).toBeUndefined();
  });
  it('follows the short antimeridian arc in portrait/landscape at high latitudes',()=>{
    for(const[w,h]of [[640,360],[360,640]])for(const lat of [0,80]){
      const east=[{lon:179,lat},{lon:-179,lat}],west=[...east].reverse();
      expect(markerFacesLeft(routeMarkerDirection(new RoutePath([east]),0,0,fitProjection([east],w,h).project))).toBe(false);
      expect(markerFacesLeft(routeMarkerDirection(new RoutePath([west]),0,1,fitProjection([west],w,h).project))).toBe(true);
    }
  });
});
