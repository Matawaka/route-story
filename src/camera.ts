import { longitudeBounds, wrapDelta } from './geo';
import type { RoutePoint } from './route';
import type { StoryTimeline, StoryState } from './timeline';

export type XY = readonly [number, number];
export type Bounds = readonly [number, number, number, number];
export interface CameraState {
  readonly center: XY;
  readonly zoom: number;
  readonly scale: number;
  readonly bearing: 0;
  readonly phase: StoryState['phase'];
  readonly segment: number;
  readonly cutOpacity: number;
}
type Key = { distance: number; center: XY };
type Shot = { start: number; end: number; keys: readonly Key[] };
export interface CameraPlan {
  readonly width: number;
  readonly height: number;
  readonly safe: Bounds;
  readonly overview: XY;
  readonly overviewScale: number;
  readonly maxZoom: number;
  readonly longitude: number;
  readonly cos: number;
  readonly shots: readonly Shot[];
  readonly world: (p: RoutePoint) => XY;
}
export const ease = (t: number) => { const v = Math.min(1, Math.max(0, t)); return v * v * v * (v * (v * 6 - 15) + 10); };
export function boundsOf(points: readonly XY[]): Bounds {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x,y] of points) { x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y); }
  return [x0,y0,x1,y1];
}
const mix = (a: XY, b: XY, t: number): XY => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];

/** Precomputed distance shots, north-up local equirectangular coordinates.
 * Longitude unwrap is shared by camera, geography and GPS; coordinates are never edited.
 * Each segment owns its keys: there is no camera interpolation across a GPX gap.
 */
export function createCameraPlan(timeline: StoryTimeline, width: number, height: number): CameraPlan {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('Invalid camera viewport.');
  const points=timeline.route.segments.flat(),longitude=longitudeBounds(points).center;
  let south=90,north=-90;for(const p of points){south=Math.min(south,p.lat);north=Math.max(north,p.lat);}
  const cos=Math.max(.01,Math.cos((south+north)/2*Math.PI/180));
  const world=(p:RoutePoint):XY=>[wrapDelta(p.lon-longitude)*cos,-p.lat];
  const bounds=boundsOf(points.map(world)),unit=Math.min(width,height),pad=unit*.1;
  const safe:Bounds=[pad,height*.20,width-pad,height*.81];
  const stationary=timeline.path.total===0,minSpan=stationary?.01:.0001;
  const overview:XY=[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2];
  const overviewScale=Math.min((safe[2]-safe[0])/Math.max(minSpan,bounds[2]-bounds[0]),(safe[3]-safe[1])/Math.max(minSpan,bounds[3]-bounds[1]));
  // A metre-scale route needs an informative overview rather than extreme follow zoom.
  const maxZoom=stationary?1:timeline.path.total<.02?1.18:2.65;
  let edgeIndex=0,previousEnd=0;
  const shots:Shot[]=timeline.route.segments.map((segment,index)=>{
    const begin=edgeIndex;while(edgeIndex<timeline.path.edges.length&&timeline.path.edges[edgeIndex].segment===index)edgeIndex++;
    const edges=timeline.path.edges.slice(begin,edgeIndex),start=edges[0]?.start??previousEnd,end=edges.at(-1)?.end??start;
    previousEnd=end;
    const at=(distance:number):XY=>{
      if(!edges.length)return world(segment[0]);
      let lo=0,hi=edges.length-1;while(lo<hi){const m=(lo+hi)>>>1;if(edges[m].end<distance)lo=m+1;else hi=m;}
      const edge=edges[lo],t=Math.min(1,Math.max(0,(distance-edge.start)/(edge.end-edge.start)));
      const a=world(edge.a),b=world(edge.b);
      // Match RoutePath's shortest arc even when an edge crosses the projection seam.
      return [a[0]+wrapDelta(edge.b.lon-edge.a.lon)*cos*t,a[1]+(b[1]-a[1])*t];
    };
    const count=edges.length?Math.max(2,Math.ceil(256*(end-start)/Math.max(timeline.path.total,1e-12))):1;
    const keys:Key[]=[];
    for(let i=0;i<=count;i++){
      const distance=start+(end-start)*i/count,radius=(end-start)*.025;
      // Symmetric route smoothing plus modest forward look-ahead, bounded to this segment.
      const samples=[-.8,-.4,0,.4,.8].map(k=>at(Math.min(end,Math.max(start,distance+radius*(k+.5)))));
      keys.push(Object.freeze({distance,center:Object.freeze([samples.reduce((s,p)=>s+p[0],0)/5,samples.reduce((s,p)=>s+p[1],0)/5]) as XY}));
    }
    return Object.freeze({start,end,keys:Object.freeze(keys)});
  });
  return Object.freeze({width,height,safe:Object.freeze(safe),overview:Object.freeze(overview),overviewScale,maxZoom,longitude,cos,shots:Object.freeze(shots),world});
}
function shotCenter(shot:Shot,distance:number):XY {
  const keys=shot.keys;if(keys.length<2||shot.end===shot.start)return keys[0].center;
  const position=Math.min(keys.length-1,Math.max(0,(distance-shot.start)/(shot.end-shot.start)*(keys.length-1))),index=Math.min(keys.length-2,Math.floor(position)),t=position-index;
  const p0=keys[Math.max(0,index-1)].center,p1=keys[index].center,p2=keys[index+1].center,p3=keys[Math.min(keys.length-1,index+2)].center;
  // C1 cubic interpolation; no history-dependent damping or requestAnimationFrame state.
  return [0,1].map(axis=>.5*((2*p1[axis])+(-p0[axis]+p2[axis])*t+(2*p0[axis]-5*p1[axis]+4*p2[axis]-p3[axis])*t*t+(-p0[axis]+3*p1[axis]-3*p2[axis]+p3[axis])*t*t*t)) as unknown as XY;
}
function follow(state:StoryState,plan:CameraPlan):{center:XY;zoom:number} {
  const shot=plan.shots[state.segment],fraction=shot.end===shot.start?0:(state.travelledKm-shot.start)/(shot.end-shot.start);
  const zoom=1+(plan.maxZoom-1)*(.9+.1*Math.sin(Math.PI*Math.min(1,Math.max(0,fraction)))**2);
  let center=shotCenter(shot,state.travelledKm);
  // Guarantee that the genuine location marker stays inside the caption-safe rectangle.
  const marker=plan.world(state.point),scale=plan.overviewScale*zoom;
  const dx=(plan.safe[2]-plan.safe[0])*.26/scale,dy=(plan.safe[3]-plan.safe[1])*.26/scale;
  center=[Math.min(marker[0]+dx,Math.max(marker[0]-dx,center[0])),Math.min(marker[1]+dy,Math.max(marker[1]-dy,center[1]))];
  return {center,zoom};
}
export function getCameraStateAt(seconds:number,timeline:StoryTimeline,plan:CameraPlan):Readonly<CameraState> {
  const state=timeline.at(seconds);
  let center=plan.overview,zoom=1;
  if(timeline.config.cameraMode==='cinematic'&&!state.stationary){
    if(state.phase==='INTRO'){
      const first=follow(timeline.at(timeline.config.introSeconds),plan),t=ease(state.introProgress);
      center=mix(plan.overview,first.center,t);zoom=Math.exp(Math.log(first.zoom)*t);
    }else if(state.phase==='OUTRO'){
      const last=follow(timeline.at(timeline.config.durationSeconds-timeline.config.outroSeconds),plan),t=ease(state.outroProgress);
      center=mix(last.center,plan.overview,t);zoom=Math.exp(Math.log(last.zoom)*(1-t));
    }else {const shot=follow(state,plan);center=shot.center;zoom=shot.zoom;}
  }
  return Object.freeze({center:Object.freeze(center),zoom,scale:plan.overviewScale*zoom,bearing:0,phase:state.phase,segment:state.segment,cutOpacity:state.phase==='ROUTE_REPLAY'?1-state.markerOpacity:0});
}
export function cameraProject(point:XY,camera:CameraState,plan:CameraPlan):XY {
  return [plan.width/2+(point[0]-camera.center[0])*camera.scale,(plan.safe[1]+plan.safe[3])/2+(point[1]-camera.center[1])*camera.scale];
}
