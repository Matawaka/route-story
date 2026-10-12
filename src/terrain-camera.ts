import type { StoryTimeline, StoryPhase } from './timeline';
import type { TerrainDataset, TerrainXY } from './terrain';
import { ease } from './camera';
export type TerrainPosePoint=readonly [number,number,number]; // east, north, height metres
export interface TerrainCameraState {
  position:TerrainPosePoint; target:TerrainPosePoint; bearing:number; pitch:number; roll:0;
  fov:number; near:number; far:number; phase:StoryPhase; segment:number; clearance:number; visibilityLift:number;
}
export interface TerrainCameraOptions {
  /** Reviewed developer composition; original callers leave this undefined. */
  framingBounds:readonly number[]; framingReliefMeters:number;
  overview:'reference'|'route'; detailSpacingMeters:.5; maximumTexelPixels:2;
}
interface Shot { progress:number; segment:number; position:TerrainPosePoint; target:TerrainPosePoint; relief:number }
export interface TerrainCameraPlan { terrain:TerrainDataset; timeline:StoryTimeline; shots:Shot[]; overview:Shot; minimumAltitude:number; aspect:number; flight:'conservative'|'corridor'; width:number;height:number;options?:Readonly<TerrainCameraOptions>; }
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
  const targetGround=terrain.meshElevation([target[0],target[1]]);
  if(targetGround===undefined||target[2]<targetGround)throw Error('Точка обзора недоступна над DEM. Выберите 2D.');
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
/** Conservative proof for every point of a straight camera leg: the maximum
 * corner height of each crossed cell bounds its triangles. Camera height is
 * linear, so its minimum on that interval lies at an endpoint. No time sampling
 * or lowered safety clearance is used, including intro/outro trajectories. */
export function terrainCorridorDeficit(terrain:TerrainDataset,a:TerrainPosePoint,b:TerrainPosePoint):number{
  const knots=terrainRayBreakpoints(terrain,[a[0],a[1]],[b[0],b[1]]);let deficit=0;
  for(let i=1;i<knots.length;i++){const low=knots[i-1],high=knots[i],middle=(low+high)/2,ceiling=terrain.ceiling([mix(a[0],b[0],middle),mix(a[1],b[1],middle)]);
    if(ceiling===undefined)throw Error('Коридор камеры выходит за полный DEM. Выберите безопасный режим или 2D.');
    deficit=Math.max(deficit,ceiling+350-Math.min(mix(a[2],b[2],low),mix(a[2],b[2],high)));
  }
  for(const p of [a,b]){const ceiling=terrain.ceiling([p[0],p[1]]);if(ceiling===undefined)throw Error('Положение камеры вне DEM.');deficit=Math.max(deficit,ceiling+350-p[2]);}
  return Math.max(0,deficit);
}
export function createTerrainCameraPlan(timeline:StoryTimeline,terrain:TerrainDataset,width:number,height:number,options?:TerrainCameraOptions):TerrainCameraPlan{
  if(timeline.route.segments.length>128)throw Error('Для 3D допускается до 128 независимых сегментов. Выберите 2D; GPX не сокращается.');
  if(!terrain.routeCoverage(timeline.route))throw Error('Для этого маршрута нет полного локального DEM с безопасным полем камеры или превышен лимит геометрии. Выберите «Кино · 2D».');
  const all=timeline.route.segments.flat().map(p=>terrain.world(p));
  if(options){const b=options.framingBounds,m=terrain.getTerrainBounds();if(terrain.manifest.regionalProjection?.scope!=='furka-context-3km'||b.length!==4||!b.every(Number.isFinite)||b[0]<m[0]||b[1]<m[1]||b[2]>m[2]||b[3]>m[3]||b[2]<=b[0]||b[3]<=b[1]||all.some(p=>p[0]<b[0]+20||p[1]<b[1]+20||p[0]>b[2]-20||p[1]>b[3]-20)||!Number.isFinite(options.framingReliefMeters)||options.framingReliefMeters<0||options.framingReliefMeters>9500||!['reference','route'].includes(options.overview)||options.detailSpacingMeters!==.5||options.maximumTexelPixels!==2)throw Error('Непроверенный ракурс Swiss Phase C.');options=Object.freeze({...options,framingBounds:Object.freeze([...b])});}
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const [x,y] of all){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  const flight=timeline.config.terrainFlight??'conservative';
  const center:TerrainXY=[(minX+maxX)/2,(minY+maxY)/2],minimumAltitude=flight==='conservative'?terrain.max+350:0,aspect=width/height;
  const regional=!!terrain.manifest.regionalProjection;
  let framingRelief=options?.framingReliefMeters??terrain.max-terrain.min;
  if(options?.overview==='route'){let low=Infinity,high=-Infinity;for(const p of all){const h=terrain.meshElevation(p)!;low=Math.min(low,h);high=Math.max(high,h);}framingRelief=high-low;}
  const radius=Math.max(regional?100:800,Math.hypot(maxX-minX,maxY-minY,framingRelief)/2),fov=46*Math.PI/180,hfov=2*Math.atan(Math.tan(fov/2)*aspect),distance=radius/Math.sin(Math.min(fov,hfov)/2)*1.35;
  const limits=options?.framingBounds??terrain.getTerrainBounds(),margin=regional?20:300,bound=(xy:TerrainXY):TerrainXY=>[clamp(xy[0],limits[0]+margin,limits[2]-margin),clamp(xy[1],limits[1]+margin,limits[3]-margin)];
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
    const sampleStep=regional?100:500;
    for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++){const h=terrain.sampleXY([xy[0]+xx*sampleStep,xy[1]+yy*sampleStep]);if(h!==undefined){localMin=Math.min(localMin,h);localMax=Math.max(localMax,h);}}
    const relief=localMax-localMin,back=regional?Math.min(350,180+relief*.15):flight==='corridor'?Math.min(2400,1200+relief*.35):Math.min(3200,1900+relief*.65),side=back*.25,positionXY=bound([xy[0]-dx/length*back+dy/length*side,xy[1]-dy/length*back-dx/length*side]);
    const routeHeight=terrain.meshElevation(xy)!;
    const target:TerrainPosePoint=[...xy,routeHeight+24],base:TerrainPosePoint=[...positionXY,Math.max(minimumAltitude,terrain.ceiling(positionXY)!+350,routeHeight+(regional?350+relief*.15:flight==='corridor'?750+relief*.25:1550+relief*.4))];
    shots.push({progress,segment:at.segment,position:[base[0],base[1],requiredVisibleAltitude(terrain,base,target)+80],target,relief});
  }
  const unsmoothed=shots.map(s=>s.position);
  for(let i=0;i<shots.length;i++){let x=0,y=0,n=0;for(let j=Math.max(0,i-8);j<=Math.min(shots.length-1,i+8);j++)if(shots[j].segment===shots[i].segment){x+=unsmoothed[j][0];y+=unsmoothed[j][1];n++;}const position:TerrainPosePoint=[x/n,y/n,shots[i].position[2]];shots[i]={...shots[i],position:[position[0],position[1],requiredVisibleAltitude(terrain,position,shots[i].target)+80]};}
  // A local upper envelope suppresses altitude oscillation, never lowers
  // a safety requirement, and never averages across disconnected segments.
  for(let i=0;i<shots.length;i++){let h=shots[i].position[2];for(let j=Math.max(0,i-8);j<=Math.min(shots.length-1,i+8);j++)if(shots[j].segment===shots[i].segment)h=Math.max(h,shots[j].position[2]-Math.abs(i-j)*40);shots[i]={...shots[i],position:[shots[i].position[0],shots[i].position[1],h]};}
  if(flight==='corridor'){
    const raise=(a:Shot,b:Shot)=>{const lift=terrainCorridorDeficit(terrain,a.position,b.position);if(lift>0){a.position=[a.position[0],a.position[1],a.position[2]+lift];b.position=[b.position[0],b.position[1],b.position[2]+lift];}};
    raise(overview,shots[0]);for(let i=1;i<shots.length;i++)if(shots[i-1].segment===shots[i].segment)raise(shots[i-1],shots[i]);raise(shots.at(-1)!,overview);
    // Raising an endpoint cannot invalidate an already proved leg. Recheck
    // every leg to make the invariant explicit before exposing the plan.
    const pairs:[Shot,Shot][]=[[overview,shots[0]],[shots.at(-1)!,overview]];for(let i=1;i<shots.length;i++)if(shots[i-1].segment===shots[i].segment)pairs.push([shots[i-1],shots[i]]);
    for(const [a,b] of pairs)if(terrainCorridorDeficit(terrain,a.position,b.position)>1e-6)throw Error('Не удалось доказать безопасный коридор камеры.');
  }
  return {terrain,timeline,shots,overview,minimumAltitude,aspect,flight,width,height,options};
}
/** Measured ground-edge projection at the real route anchor. Local, not an
 * all-visible-pixels bound or native optical GSD measurement. */
export function terrainTexelFootprint(terrain:TerrainDataset,position:TerrainPosePoint,target:TerrainPosePoint,xy:TerrainXY,width:number,height:number,spacing:number):number{
  const h=terrain.meshElevation(xy),e:TerrainXY=[xy[0]+spacing,xy[1]],n:TerrainXY=[xy[0],xy[1]+spacing],eh=terrain.meshElevation(e),nh=terrain.meshElevation(n);if(h===undefined||eh===undefined||nh===undefined||!Number.isFinite(spacing)||spacing<=0)throw Error('Детализация вне полного DEM.');
  const p=projectTerrainPoint([...xy,h],position,target,width,height),a=projectTerrainPoint([...e,eh],position,target,width,height),b=projectTerrainPoint([...n,nh],position,target,width,height),pixels=Math.max(Math.hypot(a[0]-p[0],a[1]-p[1]),Math.hypot(b[0]-p[0],b[1]-p[1]));if(!Number.isFinite(pixels)||pixels<=0)throw Error('Некорректный масштаб земли.');return pixels;
}
/** Pure timestamp function, no previous frame, wall clock or mutable UI reads. */
export function terrainFrameCoverage(terrain:TerrainDataset,pose:TerrainCameraState,width:number,height:number,screen:readonly number[]=[.05,.24,.95,.72]):{complete:boolean;minimumMarginMeters:number;corners:TerrainXY[]}{
  // All rays in the screen rectangle must reach the complete mesh before its
  // minimum-height plane. Four plane corners bound its convex footprint.
  if(screen.length!==4||!screen.every(Number.isFinite)||screen[0]<0||screen[1]<0||screen[2]>1||screen[3]>1||screen[0]>=screen[2]||screen[1]>=screen[3])throw Error('Некорректная область кадра.');
  const delta=pose.target.map((v,i)=>v-pose.position[i]),length=Math.hypot(...delta),f=delta.map(v=>v/length),horizontal=Math.hypot(f[0],f[1]);if(horizontal<1e-9)return{complete:false,minimumMarginMeters:-Infinity,corners:[]};
  const right=[f[1]/horizontal,-f[0]/horizontal,0],up=[f[2]*right[1],-f[2]*right[0],f[1]*right[0]-f[0]*right[1]],scale=height/2/Math.tan(pose.fov*Math.PI/360),bounds=terrain.getTerrainBounds(),corners:TerrainXY[]=[];let margin=Infinity;
  for(const x of [screen[0],screen[2]])for(const y of [screen[1],screen[3]]){
    const sx=(x*width-width/2)/scale,sy=(height/2-Math.min(width,height)*.04-y*height)/scale,ray=f.map((v,i)=>v+right[i]*sx+up[i]*sy);if(ray[2]>=-1e-9)return{complete:false,minimumMarginMeters:-Infinity,corners};
    const t=(terrain.min-pose.position[2])/ray[2],xy:TerrainXY=[pose.position[0]+ray[0]*t,pose.position[1]+ray[1]*t];if(t<=0)return{complete:false,minimumMarginMeters:-Infinity,corners};corners.push(xy);margin=Math.min(margin,xy[0]-bounds[0],xy[1]-bounds[1],bounds[2]-xy[0],bounds[3]-xy[1]);
  }
  if(margin>=0)return{complete:true,minimumMarginMeters:margin,corners};
  // The minimum plane can be too pessimistic where the boundary is a real
  // mountain. Intersect the ray pyramid with each crossed DEM side. Its vertex
  // heights bound every exiting ray; actual boundary-grid minima then prove
  // an intervening surface intersection. No unseen height is extrapolated.
  const vertices:TerrainPosePoint[]=[pose.position,...corners.map(p=>[p[0],p[1],terrain.min] as TerrainPosePoint)],edges=[[0,1],[0,2],[0,3],[0,4],[1,2],[1,3],[2,4],[3,4]];
  for(const [axis,value,isLower] of [[0,bounds[0],true],[0,bounds[2],false],[1,bounds[1],true],[1,bounds[3],false]] as const){
    if(corners.every(p=>isLower?p[axis]>=value:p[axis]<=value))continue;
    const hits:TerrainPosePoint[]=[];for(const [a,b] of edges){const from=vertices[a],to=vertices[b],d=to[axis]-from[axis];if(Math.abs(d)<1e-9)continue;const t=(value-from[axis])/d;if(t>=0&&t<=1)hits.push(pointMix(from,to,t));}
    if(!hits.length)return{complete:false,minimumMarginMeters:margin,corners};
    const other=1-axis,low=Math.max(bounds[other],Math.min(...hits.map(p=>p[other]))),high=Math.min(bounds[other+2],Math.max(...hits.map(p=>p[other]))),step=terrain.level.spacingMeters;let floor=Infinity;
    const first=Math.max(0,Math.floor((low-bounds[other])/step)),last=Math.min((axis===0?terrain.level.height:terrain.level.width)-1,Math.ceil((high-bounds[other])/step));
    if(high<low||last<first)return{complete:false,minimumMarginMeters:margin,corners};
    for(let i=first;i<=last;i++){const index=axis===0?i*terrain.level.width+(isLower?0:terrain.level.width-1):(isLower?0:terrain.level.height-1)*terrain.level.width+i,h=terrain.heights[index];if(h===terrain.manifest.noData)return{complete:false,minimumMarginMeters:margin,corners};floor=Math.min(floor,h);}
    if(Math.max(...hits.map(p=>p[2]))>floor-1e-6)return{complete:false,minimumMarginMeters:margin,corners};
  }
  return{complete:true,minimumMarginMeters:margin,corners};
}
export function getTerrainCameraStateAt(seconds:number,plan:TerrainCameraPlan):TerrainCameraState{
  const state=plan.timeline.at(seconds);let lo=0,hi=plan.shots.length-2;while(lo<hi){const middle=Math.ceil((lo+hi)/2);if(plan.shots[middle].progress<=state.routeProgress)lo=middle;else hi=middle-1;}const a=plan.shots[lo],b=plan.shots[lo+1];
  const at=plan.terrain.world(state.point),target:TerrainPosePoint=[...at,plan.terrain.meshElevation(at)!+24];
  const fraction=clamp((state.routeProgress-a.progress)/(b.progress-a.progress),0,1),shot=a.segment===b.segment?{position:pointMix(a.position,b.position,fraction),target}:state.segment===a.segment?a:b;
  let position=shot.position,look=target;
  if(state.phase==='INTRO'){const t=ease(state.introProgress);position=pointMix(plan.overview.position,plan.shots[0].position,t);look=pointMix(plan.overview.target,plan.shots[0].target,t);}
  else if(state.phase==='OUTRO'){const t=ease(state.outroProgress);position=pointMix(plan.shots.at(-1)!.position,plan.overview.position,t);look=pointMix(plan.shots.at(-1)!.target,plan.overview.target,t);}
  // A straight interpolation between two above-ground targets can enter a
  // ridge. Keep the gaze above the exact mesh before solving LOS; otherwise
  // the near-target division would demand an arbitrarily high flight.
  const ground=plan.terrain.meshElevation([look[0],look[1]]);
  if(ground===undefined)throw Error('Переход камеры выходит за DEM. Выберите 2D.');
  look=[look[0],look[1],Math.max(look[2],ground+24)];
  const ceiling=plan.terrain.ceiling([position[0],position[1]]);if(ceiling===undefined)throw Error('Камера вне полного DEM.');
  const lifted=requiredVisibleAltitude(plan.terrain,position,look);let height=Math.max(plan.minimumAltitude,lifted,ceiling+350);
  if(plan.options){for(let i=0;i<8;i++){const pixels=terrainTexelFootprint(plan.terrain,[position[0],position[1],height],look,at,plan.width,plan.height,plan.options.detailSpacingMeters);if(pixels<=plan.options.maximumTexelPixels+1e-6)break;height+=Math.max(1,height-look[2])*(pixels/plan.options.maximumTexelPixels-1)*1.05;if(i===7)throw Error('Для этого ракурса недостаточно реальной детализации. Выберите обзорный вариант.');}}
  if(!Number.isFinite(height)||height>80000)throw Error('Безопасный 3D-ракурс недоступен. Выберите 2D.');
  position=[position[0],position[1],height];
  const dx=look[0]-position[0],dy=look[1]-position[1],distance=Math.hypot(dx,dy);
  return {position,target:look,bearing:Math.atan2(dx,dy)*180/Math.PI,pitch:Math.atan2(position[2]-look[2],distance)*180/Math.PI,roll:0,fov:46,near:5,far:100000,phase:state.phase,segment:state.segment,clearance:position[2]-plan.terrain.ceiling([position[0],position[1]])!,visibilityLift:height-shot.position[2]};
}
