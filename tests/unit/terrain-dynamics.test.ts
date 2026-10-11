import { describe,expect,it } from 'vitest';
import { RoutePath, routeMetrics } from '../../src/geo';
import { RouteDynamics, speedForGrade } from '../../src/terrain-dynamics';
import { StoryTimeline } from '../../src/timeline';
import { defaultStoryConfig } from '../../src/story';
import type {RoutePoint,Route} from '../../src/route';

const point=(lon:number,elevation:number):RoutePoint=>({lon,lat:0,elevation});
const path=(segments:RoutePoint[][])=>new RoutePath(segments);
const altitude=(p:RoutePoint)=>p.elevation;

describe('DEM grade and artistic pacing',()=>{
  it('maps grade to bounded factors',()=>{
    expect(speedForGrade(.10)).toBe(.65);
    expect(speedForGrade(.03)).toBeCloseTo(.8);
    expect(speedForGrade(0)).toBe(1);
    expect(speedForGrade(-.03)).toBeCloseTo(1.2);
    expect(speedForGrade(-.10)).toBe(1.4);
    expect(()=>speedForGrade(NaN)).toThrow();
  });
  it('slows steep uphill and speeds downhill while preserving duration and reversible seek',()=>{
    const segments=[[point(0,0),point(.001,25),point(.002,0)]];
    const p=path(segments),d=new RouteDynamics(p,altitude);
    expect(d.hasData).toBe(true);
    expect(d.grades[0]).toBeGreaterThan(.10);
    expect(d.grades[1]).toBeLessThan(-.10);
    expect(d.distanceAtProgress(.5)).toBeLessThan(.5);
    expect(d.distanceAtProgress(0)).toBe(0);
    expect(d.distanceAtProgress(1)).toBe(1);
    let last=-1;
    for(let t=0;t<=100;t++){const now=d.distanceAtProgress(t/100);expect(now).toBeGreaterThanOrEqual(last);last=now;}
    const route:Route={segments,name:'Synthetic',...routeMetrics(segments)};
    const timeline=new StoryTimeline(route,{...defaultStoryConfig(),terrainDynamics:true},altitude);
    const mid=timeline.at(10);
    expect(mid.routeProgress).toBeLessThan(.5);
    expect(timeline.at(18).routeProgress).toBe(1);
    timeline.at(17);timeline.at(2);expect(timeline.at(10)).toEqual(mid);
  });
  it('is neutral on flat disconnected segments even when the elevations jump',()=>{
    const segments=[[point(0,10),point(.001,10)],[point(.002,500),point(.003,500)]];
    const d=new RouteDynamics(path(segments),altitude);
    expect([...d.grades]).toEqual([0,0]);
    expect(d.distanceAtProgress(.5)).toBeCloseTo(.5,6);
  });
  it('fails closed on missing elevation and keeps ordinary replay',()=>{
    const segments=[[point(0,10),{lon:.001,lat:0}]];
    const d=new RouteDynamics(path(segments),altitude);
    expect(d.hasData).toBe(false);
    expect(d.distanceAtProgress(.25)).toBe(.25);
    const route:Route={segments,name:'No heights',...routeMetrics(segments)};
    const timeline=new StoryTimeline(route,{...defaultStoryConfig(),terrainDynamics:true},altitude);
    expect(timeline.dynamics).toBeUndefined();
    expect(timeline.at(6).routeProgress).toBeCloseTo(.25);
  });
  it('smooths short-edge altitude noise over a fixed distance window',()=>{
    const segments=[Array.from({length:101},(_,i)=>point(i*.00001,100+(i%2?2:-2)))];
    const d=new RouteDynamics(path(segments),altitude);
    expect(d.hasData).toBe(true);
    expect(Math.abs(d.grades[50])).toBeLessThan(.06);
  });
  it('handles stationary tracks, repeated points and invalid fractions',()=>{
    const d=new RouteDynamics(path([[point(0,10),point(0,10)]]),altitude);
    expect(d.hasData).toBe(false);expect(d.distanceAtProgress(.5)).toBe(.5);
    expect(()=>d.distanceAtProgress(NaN)).toThrow();
  });
});
