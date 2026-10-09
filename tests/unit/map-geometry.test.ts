import {describe,it,expect} from 'vitest';
import {clipRing,clipLine} from '../../src/map-geometry';
import type {XY,Bounds} from '../../src/camera';
const box:Bounds=[0,0,10,10];
describe('prepared basemap clipping',()=>{
  it('retains inner geometry, clips enclosing polygons and never edits the source',()=>{
    const ring:XY[]=[[-100,-100],[100,-100],[100,100],[-100,100],[-100,-100]],source=JSON.stringify(ring),clipped=clipRing(ring,box);
    expect(clipped.length).toBe(4);expect(clipped.every(([x,y])=>x>=0&&x<=10&&y>=0&&y<=10)).toBe(true);expect(JSON.stringify(ring)).toBe(source);
    expect(clipRing([[1,1],[2,1],[2,2],[1,1]],box)).toEqual([[1,1],[2,1],[2,2]]);expect(clipRing([[20,20],[30,20],[30,30]],box)).toEqual([]);
  });
  it('clips real edges without connecting offscreen excursions or projection seams',()=>{
    expect(clipLine([[-5,5],[15,5]],box)).toEqual([[[0,5],[10,5]]]);expect(clipLine([[1,1],[2,1],[20,20],[30,30],[3,3],[4,3]],box).length).toBe(2);
    expect(clipLine([[-179,0],[179,0]],[-180,-10,180,10],180)).toEqual([]);
  });
});
