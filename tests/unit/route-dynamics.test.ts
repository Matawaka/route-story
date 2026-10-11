import { describe, it, expect } from 'vitest';
import { RouteDynamics, gradeBand } from '../../src/route-dynamics';
import { routeMetrics } from '../../src/geo';
import { StoryTimeline } from '../../src/timeline';
import { defaultStoryConfig } from '../../src/story';
import type { Route, RoutePoint } from '../../src/route';
const route = (segments: RoutePoint[][]): Route => ({ name: 'Synthetic', segments, ...routeMetrics(segments) });
const ramp = (grade: number, startLon = 0) => Array.from({ length: 101 }, (_, i) => ({ lon: startLon+i*.00009, lat: 0, elevation: 100+i*10*grade }));
describe('bounded elevation dynamics', () => {
  it.each([0, .05, .15, -.05, -.15])('smooths a %.2f ramp without changing the track', grade => {
    const r = route([ramp(grade)]), before = JSON.stringify(r), p = new RouteDynamics(r);
    expect(p.status).toBe('usable'); expect(p.edges[50].grade).toBeCloseTo(grade, 3);
    expect(p.edges[50].band).toBe(gradeBand(grade)); expect(JSON.stringify(r)).toBe(before);
  });
  it('filters an isolated altitude artifact and bounded alternating noise', () => {
    const points = ramp(.05).map((p,i)=>({...p,elevation:p.elevation+(i%2?1:-1)}));points[50].elevation+=400;
    const p=new RouteDynamics(route([points]));expect(p.correctedSpikes).toBe(1);expect(p.status).toBe('usable');
    expect(p.edges[50].grade).toBeGreaterThan(.03);expect(p.edges[50].grade).toBeLessThan(.08);
  });
  it('does not infer grades across separated segments or duplicate coordinates', () => {
    const a=ramp(.05), b=ramp(-.05,30).map(p=>({...p,elevation:p.elevation+2000}));a.splice(20,0,{...a[20]});
    const p=new RouteDynamics(route([a,b]));expect(p.edges).toHaveLength(200);expect(p.edges[99].grade).toBeCloseTo(.05,3);expect(p.edges[100].grade).toBeCloseTo(-.05,3);
    expect(p.path.total).toBeLessThan(3);expect(p.edges.every(e=>Number.isFinite(e.speed))).toBe(true);
  });
  it('uses a whole covering DEM for missing GPX; never mixes altitude sources', () => {
    const r=route([ramp(.05)]);delete r.segments[0][50].elevation;
    const missing=new RouteDynamics(r);expect(missing.status).toBe('missing');expect(missing.edges.every(e=>e.band==='neutral'&&e.speed===1)).toBe(true);
    const dem={name:'Test DEM',spacingMeters:50,covers:()=>true,elevation:(p:RoutePoint)=>p.lon*10000};
    expect(new RouteDynamics(r,dem).source).toBe('Test DEM');expect(new RouteDynamics(r,{...dem,covers:()=>false}).status).toBe('missing');
    expect(new RouteDynamics(r,{...dem,elevation:()=>undefined}).status).toBe('missing');
  });
  it('rejects residual implausible slopes and handles stationary tracks',()=>{
    expect(new RouteDynamics(route([[{lon:0,lat:0,elevation:0},{lon:.00001,lat:0,elevation:200}]])).status).toBe('unreliable');
    const p=new RouteDynamics(route([[{lon:0,lat:0},{lon:0,lat:0}]]));expect(p.status).toBe('stationary');expect(p.distanceProgressAt(.5)).toBe(.5);
  });
  it('allocates more video time uphill, with exact invertible deterministic seeking',()=>{
    const r=route([ramp(.15),ramp(-.15,30)]), p=new RouteDynamics(r);
    expect(p.distanceProgressAt(.5)).toBeLessThan(.5);expect(p.timeProgressAt(.5)).toBeGreaterThan(.5);
    for(const t of [0,.1,.5,.9,1])expect(p.timeProgressAt(p.distanceProgressAt(t))).toBeCloseTo(t,12);
    const config={...defaultStoryConfig(),replayPacing:'terrain' as const}, timeline=new StoryTimeline(r,config,p);
    const state=timeline.at(10);timeline.at(18);expect(timeline.at(10)).toEqual(state);expect(timeline.at(2).point).toEqual(r.segments[0][0]);expect(timeline.at(18).point).toEqual(r.segments[1].at(-1));
    const boundary=2+p.timeProgressAt(.5)*16;expect(timeline.at(boundary).markerOpacity).toBeLessThan(1e-8);
    expect(timeline.at(20).travelledKm).toBe(p.path.total);expect(timeline.at(10).timelineProgress).toBe(.5);
  });
  it('keeps antimeridian arcs short and validates non-finite query inputs',()=>{
    const p=new RouteDynamics(route([[{lon:179.9,lat:75,elevation:10},{lon:-179.9,lat:75,elevation:100}]]));expect(p.path.total).toBeLessThan(6);
    expect(()=>p.distanceProgressAt(NaN)).toThrow();expect(()=>p.timeProgressAt(Infinity)).toThrow();
  });
  it('refuses a profile bound to another route',()=>{
    const a=route([ramp(.1)]),b=route([ramp(-.1)]);expect(()=>new StoryTimeline(b,defaultStoryConfig(),new RouteDynamics(a))).toThrow('другому');
  });
  it('prepares all 50,000 points without truncation, even with many segments',()=>{
    const r=route(Array.from({length:5000},(_,s)=>Array.from({length:10},(_,i)=>({lon:s*.001+i*.00001,lat:60,elevation:i}))));
    const p=new RouteDynamics(r);expect(p.path.segments.reduce((n,s)=>n+s.length,0)).toBe(50000);expect(p.edges).toHaveLength(45000);expect(p.distanceProgressAt(1)).toBe(1);
  });
});
