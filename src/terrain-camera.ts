import type { StoryTimeline, StoryPhase } from './timeline';
import type { TerrainDataset, TerrainXY } from './terrain';
import { ease } from './camera';
export type TerrainPosePoint=readonly [number,number,number]; // east, north, height metres
export interface TerrainCameraState {
  position:TerrainPosePoint; target:TerrainPosePoint; bearing:number; pitch:number; roll:0;
  fov:number; near:number; far:number; phase:StoryPhase; segment:number; clearance:number; visibilityLift:number;
}
interface Shot { progress:number; segment:number; position:TerrainPosePoint; target:TerrainPosePoint; relief:number }
export interface TerrainCameraPlan { terrain:TerrainDataset; timeline:StoryTimeline; shots:Shot[]; overview:Shot; minimumAltitude:number; aspect:number; }
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const pointMix=(a:TerrainPosePoint,b:TerrainPosePoint,t:number):TerrainPosePoint=>t===0?a:t===1?b:[mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
export function projectTerrainPoint(point:TerrainPosePoint,position:TerrainPosePoint,target:TerrainPosePoint,width:number,height:number):[number,number]{
  const direction=target.map((v,i)=>v-position[i]),length=Math.hypot(...direction),f=direction.map(v=>v/length),horizontal=Math.hypot(f[0],f[1]),right=[f[1]/horizontal,-f[0]/horizontal,0],up=[f[2]*right[1],-f[2]*right[0],f[1]*right[0]-f[0]*right[1]],delta=point.map((v,i)=>v-position[i]),dot=(v:number[])=>v.reduce((n,c,i)=>n+c*delta[i],0),depth=dot(f),scale=height/2/Math.tan(46*Math.PI/360);
  return [width/2+dot(right)*scale/depth,height/2-Math.min(width,height)*.04-dot(up)*scale/depth];
}
/** Ray breakpoints are all grid edges and triangle diagonals. Surface height is
 * linear between them, so checking the endpoints bounds the entire ray. */
export function terrainRayBreakpoints(terrain:TerrainDataset,a:TerrainXY,b:TerrainXY):number[]{
  const knots=new Set([0,.1,1]),s=terrain.level.spacingMeters,m=terrain.manifest;
  for(const [from,to,origin] of [[a[0],b[0],m.westMeters],[a[1],b[1],m.southMeters],[a[0]+a[1],b[0]+b[1],m.westMeters+m.southMeters]]){
    if(Math.abs(to-from)<1e-9)continue;
    const low=Math.ceil((Math.min(from,to)-origin)/s),high=Math.floor((Math.max(from,to)-origin)/s);
    for(let i=low;i<=high;i++){const t=(origin+i*s-from)/(to-from);if(t>1e-9&&t<1)knots.add(t);}
  }return [...knots].sort((x,y)=>x-y);
}
/** A global height envelope guarantees clearance along every interpolated trajectory,
 * including positions between keyframes. LOS uses the actual triangular DEM surface. */
export function requiredVisibleAltitude(terrain:TerrainDataset,position:TerrainPosePoint,target:TerrainPosePoint):number{
  let altitude=position[2];
  for(const t of terrainRayBreakpoints(terrain,[target[0],target[1]],[position[0],position[1]])){
    if(t===0)continue;
    const xy:TerrainXY=[mix(target[0],position[0],t),mix(target[1],position[1],t)],ground=terrain.meshElevation(xy);
    if(ground===undefined)throw Error('Линия видимости выходит за доступный DEM. Выберите 2D.');
    // Target is already above the surface. Fade clearance near it to avoid an
    // artificial singularity at the endpoint, while retaining positive clearance.
    altitude=Math.max(altitude,target[2]+(ground+Math.min(8,t*80)-target[2])/t);
  }
  return altitude;
}
export function createTerrainCameraPlan(timeline:StoryTimeline,terrain:TerrainDataset,width:number,height:number):TerrainCameraPlan{
  if(timeline.route.segments.length>128)throw Error('Для 3D допускается до 128 независимых сегментов. Выберите 2D; GPX не сокращается.');
  if(!terrain.routeCoverage(timeline.route))throw Error('Для этого маршрута нет полного локального DEM с безопасным полем камеры или превышен лимит геометрии. Выберите «Кино · 2D».');
  const all=timeline.route.segments.flat().map(p=>terrain.world(p));
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const [x,y] of all){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  const center:TerrainXY=[(minX+maxX)/2,(minY+maxY)/2],minimumAltitude=terrain.max+350,aspect=width/height;
  const radius=Math.max(800,Math.hypot(maxX-minX,maxY-minY,terrain.max-terrain.min)/2),fov=46*Math.PI/180,hfov=2*Math.atan(Math.tan(fov/2)*aspect),distance=radius/Math.sin(Math.min(fov,hfov)/2)*1.35;
  const limits=terrain.getTerrainBounds(),bound=(xy:TerrainXY):TerrainXY=>[clamp(xy[0],limits[0]+300,limits[2]-300),clamp(xy[1],limits[1]+300,limits[3]-300)];
  const target:TerrainPosePoint=[...center,terrain.sampleXY(center)!+100],overviewXY=bound([center[0],center[1]-distance*.38]);
  const overview:Shot={progress:0,segment:0,target,position:[...overviewXY,Math.max(minimumAltitude,distance*.94+target[2])],relief:terrain.max-terrain.min};
  // Fit the actual elevated route into caption-safe perspective space. A
  // bounding circle on a flat map cannot guarantee this on sloping terrain.
  for(let iteration=0;iteration<24;iteration++){
    let fit=true;for(const xy of all){const p:TerrainPosePoint=[...xy,terrain.meshElevation(xy)!+24],[x,y]=projectTerrainPoint(p,overview.position,overview.target,width,height),unit=Math.min(width,height);if(x<unit*.075||x>width-unit*.075||y<unit*.22||y>height-unit*.28){fit=false;break;}}
    if(fit)break;overview.position=[overview.position[0],overview.position[1],overview.position[2]*1.12];if(iteration===23||overview.position[2]>80000)throw Error('Маршрут не помещается в безопасный 3D-обзор. Выберите 2D.');
  }
  const shots:Shot[]=[];
  const progresses=new Set(Array.from({length:241},(_,i)=>i/240));let segment=0;
  for(const edge of timeline.path.edges)if(edge.segment!==segment){segment=edge.segment;const boundary=edge.start/timeline.path.total;progresses.add(boundary);progresses.add(Math.max(0,boundary-1e-10));}
  for(const progress of [...progresses].sort((a,b)=>a-b)){
    const at=timeline.path.at(progress),xy=terrain.world(at.point),near=timeline.path.at(Math.max(0,progress-.008)),ahead=timeline.path.at(Math.min(1,progress+.012));
    const a=near.segment===at.segment?terrain.world(near.point):xy,b=ahead.segment===at.segment?terrain.world(ahead.point):xy;
    let dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<1){dx=0;dy=1;length=1;}
    let localMin=Infinity,localMax=-Infinity;
    for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++){const h=terrain.sampleXY([xy[0]+xx*500,xy[1]+yy*500]);if(h!==undefined){localMin=Math.min(localMin,h);localMax=Math.max(localMax,h);}}
    const relief=localMax-localMin,back=Math.min(3200,1900+relief*.65),side=back*.25,positionXY=bound([xy[0]-dx/length*back+dy/length*side,xy[1]-dy/length*back-dx/length*side]);
    const routeHeight=terrain.meshElevation(xy)!;
    const target:TerrainPosePoint=[...xy,routeHeight+24],base:TerrainPosePoint=[...positionXY,Math.max(minimumAltitude,routeHeight+1550+relief*.4)];
    shots.push({progress,segment:at.segment,position:[base[0],base[1],requiredVisibleAltitude(terrain,base,target)+80],target,relief});
  }
  const unsmoothed=shots.map(s=>s.position);
  for(let i=0;i<shots.length;i++){let x=0,y=0,n=0;for(let j=Math.max(0,i-8);j<=Math.min(shots.length-1,i+8);j++)if(shots[j].segment===shots[i].segment){x+=unsmoothed[j][0];y+=unsmoothed[j][1];n++;}const position:TerrainPosePoint=[x/n,y/n,shots[i].position[2]];shots[i]={...shots[i],position:[position[0],position[1],requiredVisibleAltitude(terrain,position,shots[i].target)+80]};}
  // A symmetric upper envelope removes local altitude oscillation, never lowers
  // a safety requirement, and never averages across disconnected segments.
  for(let i=0;i<shots.length;i++){let h=shots[i].position[2];for(let j=Math.max(0,i-8);j<=Math.min(shots.length-1,i+8);j++)if(shots[j].segment===shots[i].segment)h=Math.max(h,shots[j].position[2]-Math.abs(i-j)*40);shots[i]={...shots[i],position:[shots[i].position[0],shots[i].position[1],h]};}
  return {terrain,timeline,shots,overview,minimumAltitude,aspect};
}
/** Pure timestamp function, no previous frame, wall clock or mutable UI reads. */
export function getTerrainCameraStateAt(seconds:number,plan:TerrainCameraPlan):TerrainCameraState{
  const state=plan.timeline.at(seconds);let lo=0,hi=plan.shots.length-2;while(lo<hi){const middle=Math.ceil((lo+hi)/2);if(plan.shots[middle].progress<=state.routeProgress)lo=middle;else hi=middle-1;}const a=plan.shots[lo],b=plan.shots[lo+1];
  const at=plan.terrain.world(state.point),target:TerrainPosePoint=[...at,plan.terrain.meshElevation(at)!+24];
  const fraction=clamp((state.routeProgress-a.progress)/(b.progress-a.progress),0,1),shot=a.segment===b.segment?{position:pointMix(a.position,b.position,fraction),target}:state.segment===a.segment?a:b;
  let position=shot.position,look=target;
  if(state.phase==='INTRO'){const t=ease(state.introProgress);position=pointMix(plan.overview.position,plan.shots[0].position,t);look=pointMix(plan.overview.target,plan.shots[0].target,t);}
  else if(state.phase==='OUTRO'){const t=ease(state.outroProgress);position=pointMix(plan.shots.at(-1)!.position,plan.overview.position,t);look=pointMix(plan.shots.at(-1)!.target,plan.overview.target,t);}
  const lifted=requiredVisibleAltitude(plan.terrain,position,look),height=Math.max(plan.minimumAltitude,lifted);
  position=[position[0],position[1],height];
  const dx=look[0]-position[0],dy=look[1]-position[1],distance=Math.hypot(dx,dy);
  return {position,target:look,bearing:Math.atan2(dx,dy)*180/Math.PI,pitch:Math.atan2(position[2]-look[2],distance)*180/Math.PI,roll:0,fov:46,near:5,far:100000,phase:state.phase,segment:state.segment,clearance:position[2]-plan.terrain.ceiling([position[0],position[1]])!,visibilityLift:height-shot.position[2]};
}
