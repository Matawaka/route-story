import { describe, expect, it } from 'vitest';
import { createCameraPlan, getCameraStateAt, cameraProject } from '../../src/camera';
import { StoryTimeline } from '../../src/timeline';
import { defaultStoryConfig, validateStoryConfig } from '../../src/story';
import { routeMetrics } from '../../src/geo';
import type { RoutePoint } from '../../src/route';
function prepare(segments:RoutePoint[][],width=720,height=1280,durationSeconds:10|20|30=20){const timeline=new StoryTimeline({name:'Synthetic',segments,...routeMetrics(segments)},{...defaultStoryConfig(),durationSeconds});return{timeline,plan:createCameraPlan(timeline,width,height)};}
const ordinary=[[{lon:5.1,lat:60},{lon:5.2,lat:60.1},{lon:5.6,lat:60.2},{lon:6,lat:60.5}]];
describe('pure cinematic camera',()=>{
  it.each([10,20,30] as const)('overview → closer follow → overview at %is without frame history',duration=>{
    const {timeline,plan}=prepare(ordinary,720,1280,duration),at=(t:number)=>getCameraStateAt(t,timeline,plan);
    expect(at(0).zoom).toBe(1);expect(at(duration/2).zoom).toBeGreaterThan(2);expect(at(duration).zoom).toBe(1);expect(at(duration).center).toEqual(plan.overview);
    const middle=at(duration/2);at(duration);at(0);expect(at(duration/2)).toEqual(middle);expect(at(3).center).not.toEqual(at(duration-3).center);
    for(const t of [2,duration-2]){const before=at(t-1e-6),after=at(t+1e-6);expect(Math.hypot(before.center[0]-after.center[0],before.center[1]-after.center[1])).toBeLessThan(1e-5);expect(Math.abs(before.zoom-after.zoom)).toBeLessThan(1e-5);}
  });
  it.each([[640,360],[360,640],[1280,720],[720,1280]])('frames endpoints and keeps marker in safe areas at %sx%s',(w,h)=>{
    const {timeline,plan}=prepare(ordinary,w,h);
    for(const time of [0,20])for(const p of ordinary[0]){const [x,y]=cameraProject(plan.world(p),getCameraStateAt(time,timeline,plan),plan);expect(x).toBeGreaterThanOrEqual(plan.safe[0]-1e-8);expect(x).toBeLessThanOrEqual(plan.safe[2]+1e-8);expect(y).toBeGreaterThanOrEqual(plan.safe[1]-1e-8);expect(y).toBeLessThanOrEqual(plan.safe[3]+1e-8);}
    for(let t=2;t<18;t+=.05){const state=timeline.at(t),camera=getCameraStateAt(t,timeline,plan),[x,y]=cameraProject(plan.world(state.point),camera,plan);expect(x).toBeGreaterThan(plan.safe[0]);expect(x).toBeLessThan(plan.safe[2]);expect(y).toBeGreaterThan(plan.safe[1]);expect(y).toBeLessThan(plan.safe[3]);expect(camera.zoom).toBeGreaterThanOrEqual(1);expect(camera.zoom).toBeLessThanOrEqual(plan.maxZoom+1e-10);}
  });
  it('preserves antimeridian short-arc tracking and source coordinates',()=>{
    const segments=[[{lon:179.6,lat:15},{lon:-179.9,lat:15.2},{lon:-179.6,lat:15}]],source=JSON.stringify(segments),{timeline,plan}=prepare(segments);
    expect(Math.abs(plan.world(segments[0][0])[0]-plan.world(segments[0][2])[0])).toBeLessThan(1);
    let previous=getCameraStateAt(2,timeline,plan);for(let t=2.01;t<18;t+=.01){const current=getCameraStateAt(t,timeline,plan);expect(Math.abs(current.center[0]-previous.center[0])).toBeLessThan(.01);previous=current;}expect(JSON.stringify(segments)).toBe(source);
  });
  it('cuts rather than interpolating a disconnected geographic journey',()=>{
    const segments=[[{lon:0,lat:0},{lon:1,lat:0}],[{lon:10,lat:0},{lon:11,lat:0}]],{timeline,plan}=prepare(segments);
    const before=getCameraStateAt(9.999,timeline,plan),after=getCameraStateAt(10,timeline,plan);
    expect(before.segment).toBe(0);expect(after.segment).toBe(1);expect(after.cutOpacity).toBe(1);expect(after.center[0]-before.center[0]).toBeGreaterThan(8);
    expect(getCameraStateAt(10.3,timeline,plan).cutOpacity).toBe(0);
  });
  it.each([{points:[{lon:7,lat:45},{lon:7,lat:45}]},{points:[{lon:7,lat:45},{lon:7.00001,lat:45.00001}]},{points:[{lon:-150,lat:-50},{lon:140,lat:60}]},{points:[{lon:-30,lat:86},{lon:30,lat:89}]}])('bounds degenerate/short/long/polar geometry',({points})=>{
    const {timeline,plan}=prepare([points]);for(let t=0;t<=20;t+=.1){const state=getCameraStateAt(t,timeline,plan);expect([...state.center,state.zoom,state.scale].every(Number.isFinite)).toBe(true);expect(state.scale).toBeGreaterThan(0);expect(state.zoom).toBeLessThanOrEqual(2.65);}
    if(timeline.path.total<.02)expect(plan.maxZoom).toBeLessThanOrEqual(1.18);
  });
  it('classic mode is fixed and invalid input fails before rendering',()=>{
    const {timeline,plan}=prepare(ordinary),classic=new StoryTimeline(timeline.route,{...timeline.config,cameraMode:'classic'});
    for(const t of [0,2,10,18,20]){const c=getCameraStateAt(t,classic,plan);expect(c.center).toEqual(plan.overview);expect(c.zoom).toBe(1);}
    expect(()=>getCameraStateAt(NaN,timeline,plan)).toThrow();expect(()=>createCameraPlan(timeline,Infinity,720)).toThrow();expect(()=>validateStoryConfig({...defaultStoryConfig(),cameraMode:'invalid' as 'classic'})).toThrow();
  });
});
