import type {TerrainDataset,TerrainXY} from './terrain';
import type {TerrainCameraPlan,TerrainCameraState,TerrainPosePoint} from './terrain-camera';
import {projectTerrainPoint,requiredVisibleAltitude,terrainRayBreakpoints,terrainTexelFootprint} from './terrain-camera';
import {wrapDelta} from './geo';
import type {ImageryManifest} from './imagery';

type V=TerrainPosePoint;
type Curve=readonly [V,V,V,V];
export type ShotKind='establishing'|'smooth-follow'|'scenic-side'|'mountain-reveal'|'curve-showcase'|'finale';
export const DIRECTOR_SAFE_AREAS=Object.freeze({
  landscape:Object.freeze({marker:[.12,.29,.88,.65] as const,geography:[.05,.24,.95,.72] as const}),
  portrait:Object.freeze({marker:[.18,.27,.82,.70] as const,geography:[.05,.24,.95,.72] as const})
});
export interface DirectorKey {time:number;progress:number;segment:number;kind:ShotKind;position:V;target:V;reason:string;curvature:number;relief:number;sideBias?:number}
interface Leg {start:number;end:number;segment:number;eye:Curve;gaze:Curve;cut:boolean}
export interface DirectorDiagnostics {
  status:'selected'|'fallback';reason:string;preparationMilliseconds:number;candidates:number;rejected:Record<string,number>;
  proofIntervals:number;proofBudget:number;maximumMeshSlope:number;maximumWorldSpeed:number;keys:readonly DirectorKey[];
  safeArea:{readonly marker:readonly number[];readonly geography:readonly number[]};coverage:'continuous-conservative'|'previous-mode';
  failedInterval?:{start:number;end:number;eye:V;gaze:V;marker:V;fit:boolean;cover:boolean;los:boolean;detail:boolean};
}
export interface DirectorPlan {diagnostics:DirectorDiagnostics;at(seconds:number):TerrainCameraState}
/** Optional editor choices. Defaults are absent, preserving MVP1.6 poses. */
export interface DirectorEdit {readonly segment:number;readonly from:number;readonly to:number;readonly kind:ShotKind}
const BUDGET=30000,MAX_KEYS=32;
const add=(a:V,b:V):V=>a.map((v,i)=>v+b[i]) as unknown as V;
const scale=(a:V,s:number):V=>a.map(v=>v*s) as unknown as V;
const sub=(a:V,b:V):V=>a.map((v,i)=>v-b[i]) as unknown as V;
const lerp=(a:V,b:V,t:number):V=>add(scale(a,1-t),scale(b,t));
const norm=(a:V)=>Math.hypot(...a);
const xyNorm=(a:V)=>Math.hypot(a[0],a[1]);
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
function curveAt(c:Curve,t:number):V {const a=lerp(c[0],c[1],t),b=lerp(c[1],c[2],t),d=lerp(c[2],c[3],t);return lerp(lerp(a,b,t),lerp(b,d,t),t);}
function split(c:Curve):[Curve,Curve] {const a=lerp(c[0],c[1],.5),b=lerp(c[1],c[2],.5),d=lerp(c[2],c[3],.5),e=lerp(a,b,.5),f=lerp(b,d,.5),g=lerp(e,f,.5);return[[c[0],a,e,g],[g,f,d,c[3]]];}
function bounds(points:readonly V[]):readonly [number,number,number,number] {return[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];}
function radius(c:Curve,center:V):V {return [0,1,2].map(i=>Math.max(...c.map(p=>Math.abs(p[i]-center[i])))) as unknown as V;}

/** One bounded CPU scan. Prefix sums reject ANY no-data vertex in a hull, rather
 * than accepting sparse ray/frame samples. Cell corner maxima bound triangles. */
class MeshProof {
  readonly slope:number;private readonly missing:Uint32Array;
  constructor(readonly terrain:TerrainDataset){
    const {width:w,height:h,spacingMeters:s}=terrain.level,values=terrain.heights;
    this.missing=new Uint32Array((w+1)*(h+1));let slope=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=y*w+x,v=values[i],j=(y+1)*(w+1)+x+1;
      this.missing[j]=Number(v===terrain.manifest.noData)+this.missing[j-1]+this.missing[j-w-1]-this.missing[j-w-2];
      if(x<w-1&&y<h-1){const a=v,b=values[i+1],c=values[i+w],d=values[i+w+1];if([a,b,c,d].includes(terrain.manifest.noData))continue;slope=Math.max(slope,Math.hypot(b-a,c-a)/s,Math.hypot(d-c,d-b)/s);}
    }this.slope=slope;
  }
  rectangle(b:readonly number[],needCeiling=false):number|undefined {
    const t=this.terrain,m=t.manifest,s=t.level.spacingMeters,w=t.level.width,h=t.level.height;
    if(b.some(v=>!Number.isFinite(v))||b[2]<b[0]||b[3]<b[1]||b[0]<m.westMeters||b[1]<m.southMeters||b[2]>m.eastMeters||b[3]>m.northMeters)return;
    const x0=Math.max(0,Math.floor((b[0]-m.westMeters)/s)),x1=Math.min(w-1,Math.floor((b[2]-m.westMeters)/s)+1),y0=Math.max(0,Math.floor((b[1]-m.southMeters)/s)),y1=Math.min(h-1,Math.floor((b[3]-m.southMeters)/s)+1),p=this.missing,stride=w+1;
    if(p[(y1+1)*stride+x1+1]-p[y0*stride+x1+1]-p[(y1+1)*stride+x0]+p[y0*stride+x0])return;
    if(!needCeiling)return 0;let ceiling=-Infinity;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)ceiling=Math.max(ceiling,t.heights[y*w+x]);return ceiling;
  }
  localSlope(b:readonly number[]):number {
    const t=this.terrain,w=t.level.width,s=t.level.spacingMeters,m=t.manifest,x0=Math.max(0,Math.floor((b[0]-m.westMeters)/s)),x1=Math.min(w-2,Math.floor((b[2]-m.westMeters)/s)),y0=Math.max(0,Math.floor((b[1]-m.southMeters)/s)),y1=Math.min(t.level.height-2,Math.floor((b[3]-m.southMeters)/s));
    if((x1-x0+1)*(y1-y0+1)>256)return this.slope;let result=0;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const i=y*w+x,[a,b,c,d]=[t.heights[i],t.heights[i+1],t.heights[i+w],t.heights[i+w+1]];if([a,b,c,d].includes(m.noData))return this.slope;result=Math.max(result,Math.hypot(b-a,c-a)/s,Math.hypot(d-c,d-b)/s);}return result;
  }
  gradientRange(b:readonly number[]):readonly [number,number,number,number] {
    const t=this.terrain,w=t.level.width,s=t.level.spacingMeters,m=t.manifest,x0=Math.min(w-2,Math.max(0,Math.floor((b[0]-m.westMeters)/s))),x1=Math.min(w-2,Math.floor((b[2]-m.westMeters)/s)),y0=Math.min(t.level.height-2,Math.max(0,Math.floor((b[1]-m.southMeters)/s))),y1=Math.min(t.level.height-2,Math.floor((b[3]-m.southMeters)/s));
    if((x1-x0+1)*(y1-y0+1)>256)return[-this.slope,-this.slope,this.slope,this.slope];
    let lowX=Infinity,lowY=Infinity,highX=-Infinity,highY=-Infinity;
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const i=y*w+x,[a,bh,c,d]=[t.heights[i],t.heights[i+1],t.heights[i+w],t.heights[i+w+1]],fx0=Math.max(0,(b[0]-m.westMeters)/s-x),fy0=Math.max(0,(b[1]-m.southMeters)/s-y),fx1=Math.min(1,(b[2]-m.westMeters)/s-x),fy1=Math.min(1,(b[3]-m.southMeters)/s-y),gradients:number[][]=[];
      if(fx0+fy0<=1)gradients.push([(bh-a)/s,(c-a)/s]);if(fx1+fy1>=1)gradients.push([(d-c)/s,(d-bh)/s]);
      for(const [dx,dy]of gradients){lowX=Math.min(lowX,dx);lowY=Math.min(lowY,dy);highX=Math.max(highX,dx);highY=Math.max(highY,dy);}
    }return[lowX,lowY,highX,highY];
  }
}

/** Exact derivative upper bound for the renderer's local projection of each
 * original GPX edge. LV95 is the pinned cubic polynomial, NOT a straight-line
 * approximation of GPX. Longitude uses the same short antimeridian arc. */
function worldSpeedBound(base:TerrainCameraPlan):number {
  let maximum=0;const p=base.terrain.manifest.regionalProjection;
  for(const e of base.timeline.path.edges){
    const span=(e.end-e.start)/base.timeline.path.total;if(span<=0)continue;
    const dx=wrapDelta(e.b.lon-e.a.lon),dy=e.b.lat-e.a.lat;let speed:number;
    if(!p)speed=Math.hypot(dx*6371008.8*Math.PI/180*base.terrain.cos,dy*6371008.8*Math.PI/180);
    else {const vx=Math.abs(dx/p.normalizationDegrees),vy=Math.abs(dy/p.normalizationDegrees);
      // |normalised x|,|y|<=1 in the validated projection domain. Derivatives
      // of [1,x,y,x²,xy,y²,x³,x²y,xy²,y³] are bounded analytically.
      speed=Math.hypot(...p.forwardCoefficients.map(c=>vx*(Math.abs(c[1])+2*Math.abs(c[3])+Math.abs(c[4])+3*Math.abs(c[6])+2*Math.abs(c[7])+Math.abs(c[8]))+vy*(Math.abs(c[2])+Math.abs(c[4])+2*Math.abs(c[5])+Math.abs(c[7])+2*Math.abs(c[8])+3*Math.abs(c[9]))));
    }maximum=Math.max(maximum,speed/span);
  }return maximum;
}
function minimumRayClearance(t:TerrainDataset,eye:V,target:V):number {
  let clearance=Infinity;
  for(const f of terrainRayBreakpoints(t,[target[0],target[1]],[eye[0],eye[1]])){
    const p=lerp(target,eye,f),ground=t.meshElevation([p[0],p[1]]);if(ground===undefined)return-Infinity;clearance=Math.min(clearance,p[2]-ground-Math.min(8,f*80));
  }return clearance;
}
function lineBound(proof:MeshProof,eye:V,target:V,re:V,rt:V,groundAnchor=false):boolean {
  const all=[eye[0]-re[0],eye[1]-re[1],eye[0]+re[0],eye[1]+re[1]],tb=[target[0]-rt[0],target[1]-rt[1],target[0]+rt[0],target[1]+rt[1]],box=[Math.min(all[0],tb[0]),Math.min(all[1],tb[1]),Math.max(all[2],tb[2]),Math.max(all[3],tb[3])];
  if(proof.rectangle(box)===undefined)return false;
  // Ground-anchored marker height moves WITH the mesh. Near its endpoint the
  // clearance is exactly 24m, not two independent altitude uncertainties.
  // The terrain's Lipschitz cone proves all rays outright when their minimum
  // climb exceeds the maximum mesh slope, even on a very long GPX.
  const gap=groundAnchor?24:target[2]-rt[2]-(proof.rectangle(tb,true)??Infinity),climb=eye[2]-re[2]-target[2]-rt[2],distance=Math.hypot(eye[0]-target[0],eye[1]-target[1])+xyNorm(re)+xyNorm(rt);
  if(gap>8+1e-6&&climb>=proof.slope*distance)return true;
  // Lipschitz terrain slopes and endpoint movement bound EVERY intervening
  // ray, not just the midpoint. Positive margin survives continuous motion.
  const margin=Math.max(re[2]+proof.slope*xyNorm(re),rt[2]+proof.slope*xyNorm(rt));
  return minimumRayClearance(proof.terrain,eye,target)>margin+1e-6;
}
/** Bound perspective rays of the entire safe rectangle through the DEM's
 * minimum plane. Perturbation bounds come from normalized-vector Lipschitz
 * estimates; all four plane corners bound the convex geographic footprint. */
function coverageBound(proof:MeshProof,eye:V,target:V,re:V,rt:V,base:TerrainCameraPlan):boolean {
  const delta=sub(target,eye),length=norm(delta),variation=norm(add(re,rt));if(length<=variation)return false;
  const f=scale(delta,1/length),df=2*variation/(length-variation),horizontal=xyNorm(f);if(horizontal<=df)return false;
  const right:V=[f[1]/horizontal,-f[0]/horizontal,0],dr=2*df/(horizontal-df),up:V=[f[2]*right[1],-f[2]*right[0],f[1]*right[0]-f[0]*right[1]],du=df+dr;
  const unit=Math.min(base.width,base.height),screen=base.options?[unit*.075/base.width,unit*.24/base.height,1-unit*.075/base.width,1-unit*.31/base.height]:DIRECTOR_SAFE_AREAS[base.aspect<1?'portrait':'landscape'].geography,scalePixel=base.height/2/Math.tan((base.fov??46)*Math.PI/360),points:V[]=[];
  for(const x of [screen[0],screen[2]])for(const y of [screen[1],screen[3]]){
    const sx=(x*base.width-base.width/2)/scalePixel,sy=(base.height/2-unit*.04-y*base.height)/scalePixel,ray=add(f,add(scale(right,sx),scale(up,sy))),error=df+Math.abs(sx)*dr+Math.abs(sy)*du,down=-ray[2];if(down<=error)return false;
    const low=(eye[2]-re[2]-proof.terrain.min)/(down+error),high=(eye[2]+re[2]-proof.terrain.min)/(down-error);if(low<=0)return false;
    for(const time of [low,high])for(const signX of [-1,1])for(const signY of [-1,1])points.push([eye[0]+ray[0]*time+signX*(re[0]+error*time),eye[1]+ray[1]*time+signY*(re[1]+error*time),proof.terrain.min]);
  }
  const eyeCorners:V[]=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])eyeCorners.push([eye[0]+x*re[0],eye[1]+y*re[1],eye[2]+z*re[2]]);
  const b=bounds([...points,...eyeCorners]);if(proof.rectangle(b)!==undefined)return true;
  // A real mountain boundary may intercept all rays above the minimum plane.
  // The convex hull of ALL uncertain eyes/plane corners bounds the complete
  // moving ray pyramid. Every side intersection is bounded by vertex pairs;
  // boundary-grid minima prove a surface hit before leaving the data extent.
  const t=proof.terrain,m=t.manifest,s=t.level.spacingMeters,vertices=[...points,...eyeCorners];
  if(proof.rectangle([Math.max(b[0],m.westMeters),Math.max(b[1],m.southMeters),Math.min(b[2],m.eastMeters),Math.min(b[3],m.northMeters)])===undefined)return false;
  for(const [axis,value,lower] of [[0,m.westMeters,true],[0,m.eastMeters,false],[1,m.southMeters,true],[1,m.northMeters,false]] as const){
    if(points.every(p=>lower?p[axis]>=value:p[axis]<=value))continue;
    const hits:V[]=[];for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++){const a=vertices[i],b=vertices[j],d=b[axis]-a[axis];if(Math.abs(d)<1e-9)continue;const f=(value-a[axis])/d;if(f>=0&&f<=1)hits.push(lerp(a,b,f));}
    if(!hits.length)return false;const other=1-axis,low=Math.max(other===0?m.westMeters:m.southMeters,Math.min(...hits.map(p=>p[other]))),high=Math.min(other===0?m.eastMeters:m.northMeters,Math.max(...hits.map(p=>p[other]))),origin=other===0?m.westMeters:m.southMeters;
    if(high<low)return false;let floor=Infinity;for(let i=Math.max(0,Math.floor((low-origin)/s));i<=Math.min((axis===0?t.level.height:t.level.width)-1,Math.ceil((high-origin)/s));i++){const index=axis===0?i*t.level.width+(lower?0:t.level.width-1):(lower?0:t.level.height-1)*t.level.width+i,h=t.heights[index];if(h===m.noData)return false;floor=Math.min(floor,h);}
    if(Math.max(...hits.map(p=>p[2]))>floor-1e-6)return false;
  }return true;
}
/** Project a moving marker conservatively. Bound camera basis, marker delta and
 * perspective division; this checks a whole interval rather than frame samples. */
function framingBound(eye:V,gaze:V,marker:V,re:V,rg:V,rm:V,base:TerrainCameraPlan,safe:readonly number[]=DIRECTOR_SAFE_AREAS[base.aspect<1?'portrait':'landscape'].marker):boolean {
  const delta=sub(gaze,eye),len=norm(delta),dv=norm(add(re,rg));if(len<=dv)return false;
  const f=scale(delta,1/len),df=2*dv/(len-dv),horizontal=xyNorm(f);if(horizontal<=df)return false;
  const r:V=[f[1]/horizontal,-f[0]/horizontal,0],dr=2*df/(horizontal-df),u:V=[f[2]*r[1],-f[2]*r[0],f[1]*r[0]-f[0]*r[1]],du=df+dr;
  const d=sub(marker,eye),rd=norm(add(re,rm)),dot=(a:V)=>a.reduce((n,v,i)=>n+v*d[i],0),depth=dot(f),dd=rd+df*(norm(d)+rd);if(depth<=dd)return false;
  const pixel=projectTerrainPoint(marker,eye,gaze,base.width,base.height,base.fov??46),s=base.height/2/Math.tan((base.fov??46)*Math.PI/360),bx=(rd+dr*(norm(d)+rd)+Math.abs(dot(r))*dd/depth)*s/(depth-dd),by=(rd+du*(norm(d)+rd)+Math.abs(dot(u))*dd/depth)*s/(depth-dd);
  return pixel[0]-bx>=base.width*safe[0]&&pixel[0]+bx<=base.width*safe[2]&&pixel[1]-by>=base.height*safe[1]&&pixel[1]+by<=base.height*safe[3];
}
function projectionDetailBound(proof:MeshProof,eye:V,gaze:V,marker:V,re:V,rg:V,rm:V,base:TerrainCameraPlan,spacing:number):boolean {
  const d=sub(gaze,eye),len=norm(d),variation=norm(add(re,rg));if(len<=variation)return false;
  const f=scale(d,1/len),df=2*variation/(len-variation),horizontal=xyNorm(f);if(horizontal<=df)return false;
  const right:V=[f[1]/horizontal,-f[0]/horizontal,0],dr=2*df/(horizontal-df),up:V=[f[2]*right[1],-f[2]*right[0],f[1]*right[0]-f[0]*right[1]],du=df+dr;
  const ground:V=[marker[0],marker[1],marker[2]-24],delta=sub(ground,eye),rd=norm(add(re,rm)),dot=(a:V,b:V)=>a.reduce((n,v,i)=>n+v*b[i],0),depth=dot(f,delta),depthError=rd+df*(norm(delta)+rd),minimumDepth=depth-depthError;
  if(minimumDepth<=0)return false;
  const box=[ground[0]-rm[0]-spacing,ground[1]-rm[1]-spacing,ground[0]+rm[0]+spacing,ground[1]+rm[1]+spacing];if(proof.rectangle(box)===undefined)return false;
  const markerBox=[ground[0]-rm[0],ground[1]-rm[1],ground[0]+rm[0],ground[1]+rm[1]],gradient=proof.gradientRange(markerBox),pixelScale=base.height/2/Math.tan((base.fov??46)*Math.PI/360);
  for(const offset of [[spacing,0],[0,spacing]]){
    const q:TerrainXY=[ground[0]+offset[0],ground[1]+offset[1]],height=proof.terrain.meshElevation(q);if(height===undefined)return false;
    const other=proof.gradientRange([markerBox[0]+offset[0],markerBox[1]+offset[1],markerBox[2]+offset[0],markerBox[3]+offset[1]]);if([...gradient,...other].some(v=>!Number.isFinite(v)))return false;
    const difference=Math.hypot(Math.max(Math.abs(other[0]-gradient[2]),Math.abs(other[2]-gradient[0])),Math.max(Math.abs(other[1]-gradient[3]),Math.abs(other[3]-gradient[1]))),edgeHeightError=difference*xyNorm(rm);
    const edge:V=[offset[0],offset[1],height-ground[2]],ez=dot(f,edge),ezError=df*norm(edge)+(1+df)*edgeHeightError,denominator=minimumDepth*(minimumDepth+ez-ezError);if(denominator<=0)return false;
    let squared=0;
    for(const [axis,error] of [[right,dr],[up,du]] as const){
      const ep=dot(axis,edge),pp=dot(axis,delta),epError=error*norm(edge)+(1+error)*edgeHeightError,ppError=rd+error*(norm(delta)+rd);
      // Exact perspective difference numerator retains foreshortening of the
      // actual east/north surface edge. Perturbation errors cover EVERY pose
      // and both moving mesh endpoints within this interval.
      const numerator=ep*depth-pp*ez,numeratorError=epError*(Math.abs(depth)+depthError)+Math.abs(ep)*depthError+ppError*(Math.abs(ez)+ezError)+Math.abs(pp)*ezError;
      squared+=(Math.abs(numerator)+numeratorError)**2;
    }
    if(pixelScale*Math.sqrt(squared)/denominator>2)return false;
  }return true;
}

function rawPose(seconds:number,leg:Leg,base:TerrainCameraPlan):TerrainCameraState {
  const f=clamp((seconds-leg.start)/(leg.end-leg.start),0,1),eye=curveAt(leg.eye,f),target=curveAt(leg.gaze,f),state=base.timeline.at(seconds),dx=target[0]-eye[0],dy=target[1]-eye[1];
  return{position:eye,target,bearing:Math.atan2(dx,dy)*180/Math.PI,pitch:Math.atan2(eye[2]-target[2],Math.hypot(dx,dy))*180/Math.PI,roll:0,fov:base.fov??46,near:5,far:100000,phase:state.phase,segment:state.segment,clearance:eye[2]-base.terrain.ceiling([eye[0],eye[1]])!,visibilityLift:0};
}
function curveFor(keys:readonly DirectorKey[],i:number,field:'position'|'target'):Curve {
  const a=keys[i],b=keys[i+1],dt=b.time-a.time;
  const tangent=(at:number):V=>{
    const key=keys[at],prev=keys[at-1],next=keys[at+1];
    if(!prev||!next)return[0,0,0];
    // A segment cut is an edit, not a stop: one-sided tangents avoid forcing
    // the next road shot to accelerate from rest in a tiny distance allocation.
    // These controls belong ONLY to their own segment and are fully re-proved.
    if(prev.segment!==key.segment&&next.segment===key.segment)return scale(sub(next[field],key[field]),1/(next.time-key.time));
    if(next.segment!==key.segment&&prev.segment===key.segment)return scale(sub(key[field],prev[field]),1/(key.time-prev.time));
    if(prev.segment!==key.segment||next.segment!==key.segment)return[0,0,0];
    const d=scale(sub(next[field],prev[field]),1/(next.time-prev.time)),limit=Math.min(norm(sub(key[field],prev[field]))/(key.time-prev.time),norm(sub(next[field],key[field]))/(next.time-key.time));
    return norm(d)>limit?scale(d,limit/norm(d)):d;
  };
  return[a[field],add(a[field],scale(tangent(i),dt/3)),sub(b[field],scale(tangent(i+1),dt/3)),b[field]];
}
function stableAnchor(base:TerrainCameraPlan,progress:number,segment:number):TerrainXY {
  let x=0,y=0,n=0;const half=Math.min(.025,Math.max(.001,120/(base.timeline.path.total*1000||1)));
  for(let i=-4;i<=4;i++){const at=base.timeline.path.at(clamp(progress+i*half/4,0,1));if(at.segment!==segment)continue;const xy=base.terrain.world(at.point);x+=xy[0];y+=xy[1];n++;}return[x/n,y/n];
}
function analyze(base:TerrainCameraPlan,progress:number){
  const at=base.timeline.path.at(progress),xy=base.terrain.world(at.point),heading=base.timeline.path.headingPoints(at.segment,at.index,at.distance)??[at.point,at.point],a=base.terrain.world(heading[0]),b=base.terrain.world(heading[1]);
  let dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<1){dx=0;dy=1;length=1;}
  const window=Math.min(.035,Math.max(.004,180/(base.timeline.path.total*1000||1))),before=base.timeline.path.at(clamp(progress-window,0,1)),after=base.timeline.path.at(clamp(progress+window,0,1));
  let curvature=0;if(before.segment===at.segment&&after.segment===at.segment){const p=base.terrain.world(before.point),q=base.terrain.world(after.point),u=[xy[0]-p[0],xy[1]-p[1]],v=[q[0]-xy[0],q[1]-xy[1]];if(Math.hypot(...u)>2&&Math.hypot(...v)>2)curvature=Math.abs(Math.atan2(u[0]*v[1]-u[1]*v[0],u[0]*v[0]+u[1]*v[1]));}
  let low=Infinity,high=-Infinity,left=0,right=0;const step=base.terrain.manifest.regionalProjection?100:400;
  for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){const h=base.terrain.meshElevation([xy[0]+x*step,xy[1]+y*step]);if(h!==undefined){low=Math.min(low,h);high=Math.max(high,h);if(x<0)left+=h;if(x>0)right+=h;}}
  return{progress,segment:at.segment,xy,dx:dx/length,dy:dy/length,curvature,relief:high-low,preferredSide:left<right?-1:1};
}

/** Bounded, explainable shot selection. Every accepted cubic is certified via
 * its complete Bernstein hull + Lipschitz interval proofs before it is exposed.
 * Proof failure keeps the existing camera; it never relaxes 350m/LOS/no-data. */
function* buildDirector(base:TerrainCameraPlan,imagery:Readonly<ImageryManifest>|undefined,boost:number,budget:number,edits:readonly DirectorEdit[]=[]):Generator<void,DirectorPlan> {
  const start=performance.now(),safe=DIRECTOR_SAFE_AREAS[base.aspect<1?'portrait':'landscape'],diagnostics:DirectorDiagnostics={status:'fallback',reason:'',preparationMilliseconds:0,candidates:0,rejected:{},proofIntervals:0,proofBudget:BUDGET,maximumMeshSlope:0,maximumWorldSpeed:0,keys:[],safeArea:safe,coverage:'previous-mode'};
  const fallback=(reason:string):DirectorPlan=>{diagnostics.reason=reason;diagnostics.preparationMilliseconds=performance.now()-start;return{diagnostics,at(){throw Error('Fallback director has no trajectory');}};};
  const reject=(reason:string)=>diagnostics.rejected[reason]=(diagnostics.rejected[reason]??0)+1;
  if(!base.timeline.path.total)return fallback('Неподвижный маршрут: сохранена спокойная камера.');
  if(base.timeline.route.segments.length>8)return fallback('Слишком много независимых сегментов для ограниченного режиссёрского плана; сохранено прежнее сопровождение.');
  const proof=new MeshProof(base.terrain),speed=worldSpeedBound(base);diagnostics.maximumMeshSlope=proof.slope;diagnostics.maximumWorldSpeed=speed;
  const spacing=base.sourceDetailMeters??base.options?.detailSpacingMeters??imagery?.spacingMeters;
  const ranges=new Map<number,[number,number]>();for(const e of base.timeline.path.edges){const range=ranges.get(e.segment);if(range)range[1]=e.end/base.timeline.path.total;else ranges.set(e.segment,[e.start/base.timeline.path.total,e.end/base.timeline.path.total]);}
  // Use only prepared metadata. No new resources or network requests.
  if(imagery&&(imagery.bounds[0]>base.terrain.manifest.westMeters||imagery.bounds[1]>base.terrain.manifest.southMeters||imagery.bounds[2]<base.terrain.manifest.eastMeters||imagery.bounds[3]<base.terrain.manifest.northMeters))return fallback('Фотография не покрывает полный режиссёрский коридор.');
  const desired=base.timeline.config.durationSeconds===10?8:base.timeline.config.durationSeconds===20?12:base.timeline.config.durationSeconds===30?18:24,segments=new Set(base.timeline.path.edges.map(e=>e.segment)).size,phaseKeys=Number(base.timeline.config.introSeconds>0)+Number(base.timeline.config.outroSeconds>0),count=Math.min(desired,MAX_KEYS-1-2*Math.max(0,segments-1)-phaseKeys),progresses=new Set(Array.from({length:count+1},(_,i)=>i/count));
  let previous=0;for(const e of base.timeline.path.edges)if(e.segment!==previous){previous=e.segment;progresses.add(e.start/base.timeline.path.total);progresses.add(Math.max(0,e.start/base.timeline.path.total-1e-10));}
  if(progresses.size>MAX_KEYS)return fallback('Превышен ограниченный бюджет сцен; сохранено прежнее сопровождение.');
  const samples=[...progresses].sort((a,b)=>a-b).map(p=>analyze(base,p)),keys:DirectorKey[]=[],portrait=base.aspect<1,regional=!!base.terrain.manifest.regionalProjection,replay=base.timeline.config.durationSeconds-base.timeline.config.introSeconds-base.timeline.config.outroSeconds;
  const boundary=base.terrain.getTerrainBounds(),bound=(x:number,y:number):TerrainXY=>[clamp(x,boundary[0]+30,boundary[2]-30),clamp(y,boundary[1]+30,boundary[3]-30)];
  const events:typeof samples=[];
  for(const s of [...samples].filter(s=>s.progress>.15&&s.progress<.85&&(s.curvature>.45||s.relief>250)).sort((a,b)=>b.curvature*300+b.relief-a.curvature*300-a.relief)){
    if(events.every(e=>Math.abs(e.progress-s.progress)>.22))events.push(s);
    if(events.length>=(base.timeline.config.durationSeconds<=20?1:base.timeline.config.durationSeconds<=30?2:3))break;
  }
  let side=1;const scenic=[...samples].sort((a,b)=>b.relief+b.curvature*250-a.relief-a.curvature*250)[0];side=scenic.preferredSide;
  const sideBias=new Map<number,number>();
  for(const s of samples){
    const anchor=stableAnchor(base,s.progress,s.segment),h=base.terrain.meshElevation(anchor);if(h===undefined)return fallback('Сглаженный взгляд пересекает отсутствующий DEM.');
    // One regional axis for a segment avoids following every micro-turn. Short
    // winding roads get a genuine side angle; long paths retain calm north-up.
    const event=events.find(e=>Math.abs(e.progress-s.progress)<.15),weight=event?Math.cos((s.progress-event.progress)/.15*Math.PI/2)**2:0;
    const heading=regional?(portrait?-.32:.48)*side:0,back=regional?(portrait?290:240):2400,offset=(regional?back*.35*side:back*(portrait?.10:.15)*side)+weight*back*(portrait?.10:.22)*side,eyeXY=bound(anchor[0]+Math.sin(heading)*back+offset,anchor[1]-Math.cos(heading)*back);
    const ahead=portrait?back*.10:back*.04,dx=regional?s.dx:0,dy=regional?s.dy:1,gazeXY=bound(anchor[0]+dx*ahead,anchor[1]+dy*ahead),gh=base.terrain.meshElevation(gazeXY);if(gh===undefined)return fallback('Опережающий взгляд вне полного DEM.');
    let eye:V=[...eyeXY,Math.max(base.minimumAltitude,base.terrain.ceiling(eyeXY)!+350,h+(regional?420:1800)+s.relief*.06+weight*(event&&event.curvature>.45?0:regional?60:200))];
    const target:V=[...gazeXY,gh+50],marker:V=[...s.xy,base.terrain.meshElevation(s.xy)!+24];
    eye=[eye[0],eye[1],Math.max(requiredVisibleAltitude(base.terrain,eye,target),requiredVisibleAltitude(base.terrain,eye,marker))+40];
    if(spacing){for(let guard=0;guard<16&&!projectionDetailBound(proof,eye,target,marker,[0,0,0],[0,0,0],[0,0,0],base,spacing*1.15);guard++)eye=[eye[0],eye[1],target[2]+(eye[2]-target[2])*1.1];}
    eye=[eye[0],eye[1],target[2]+(eye[2]-target[2])*boost];
    if(base.sourceDetailMeters){let guard=0;while(terrainTexelFootprint(base.terrain,eye,target,s.xy,base.width,base.height,base.sourceDetailMeters,base.fov??46)>1.8&&guard++<24)eye=[eye[0],eye[1],eye[2]*1.10];}
    const time=base.timeline.config.introSeconds+(base.timeline.config.replayPacing==='terrain'?base.timeline.dynamics.timeProgressAt(s.progress):s.progress)*replay;
    const expressive:ShotKind=weight>.5?(event!.curvature>.45?'curve-showcase':'mountain-reveal'):weight>.1?'scenic-side':'smooth-follow';
    const variants=[0,.10,-.10],candidates:DirectorKey[]=[];
    for(const shift of variants){diagnostics.candidates++;const position:V=[eye[0]+shift*back,eye[1],eye[2]],pixel=projectTerrainPoint(marker,position,target,base.width,base.height,base.fov??46);
      if(!base.terrain.contains([position[0],position[1]],30)){reject('camera-coverage');continue;}if(pixel.some(v=>!Number.isFinite(v))||pixel[0]<base.width*safe.marker[0]||pixel[0]>base.width*safe.marker[2]||pixel[1]<base.height*safe.marker[1]||pixel[1]>base.height*safe.marker[3]){reject('marker-safe-area');continue;}
      if(position[2]<base.terrain.ceiling([position[0],position[1]])!+350||minimumRayClearance(base.terrain,position,marker)<=0||minimumRayClearance(base.terrain,position,target)<=0){reject('candidate-clearance-or-visibility');continue;}
      candidates.push({time,progress:s.progress,segment:s.segment,kind:expressive,position,target,reason:expressive==='curve-showcase'?'Устойчивый изгиб дороги':expressive==='mountain-reveal'?'Выраженный локальный перепад DEM':expressive==='scenic-side'?'Сторона с более низким рельефом и проверенной видимостью':'Сглаженное опережающее сопровождение',curvature:s.curvature,relief:s.relief,sideBias:shift});}
    if(!candidates.length)return fallback('Не найден читаемый ракурс маркера; сохранено прежнее сопровождение.');
    // Prefer visible valley side, then smallest screen displacement. No RNG.
    const previousBias=sideBias.get(s.segment),preferred=candidates.find(k=>k.sideBias===previousBias),selected=preferred??candidates.sort((a,b)=>Math.abs(projectTerrainPoint(marker,a.position,a.target,base.width,base.height,base.fov??46)[0]/base.width-.5)-Math.abs(projectTerrainPoint(marker,b.position,b.target,base.width,base.height,base.fov??46)[0]/base.width-.5))[0];
    sideBias.set(s.segment,selected.sideBias!);keys.push(selected);
  }
  if(base.timeline.config.introSeconds){const first=keys[0],p:V=[first.position[0],first.position[1],first.position[2]+(regional?120:800)];keys.unshift({...first,time:0,kind:'establishing',position:p,reason:'Локальный обзор настоящего ландшафта; без вылета за покрытие'});}
  if(base.timeline.config.outroSeconds){const last=keys.at(-1)!;keys.push({...last,time:base.timeline.config.durationSeconds,kind:'finale',position:[last.position[0],last.position[1],last.position[2]+(regional?120:800)],reason:'Плавное раскрытие пройденного участка'});}
  // An edited camera is re-proved as ONE complete plan, including neighboring
  // C1 transitions. No concatenation of independently safe but incompatible poses.
  for(const edit of edits){
    if(!Number.isSafeInteger(edit.segment)||!Number.isFinite(edit.from)||!Number.isFinite(edit.to)||edit.from<0||edit.to>1||edit.to<edit.from)throw Error('Некорректный участок редактирования камеры.');
    for(const key of keys){
      if(key.segment!==edit.segment)continue;
      if(edit.kind==='establishing'||edit.kind==='finale'){
        if(key.kind===edit.kind)key.position=[key.position[0],key.position[1],key.position[2]+(regional?90:300)];
        continue;
      }
      if(key.time<=base.timeline.config.introSeconds||key.time>=base.timeline.config.durationSeconds-base.timeline.config.outroSeconds||key.progress<=edit.from||key.progress>=edit.to)continue;
      const weight=Math.sin(Math.PI*(key.progress-edit.from)/(edit.to-edit.from))**2,amount=regional?65:450;
      const sideShift=edit.kind==='scenic-side'?amount:edit.kind==='curve-showcase'?-amount*.65:edit.kind==='smooth-follow'?-amount*.25:0;
      const lift=edit.kind==='mountain-reveal'?(regional?100:350):edit.kind==='smooth-follow'?35:0;
      key.position=[key.position[0]+weight*sideShift*side,key.position[1],key.position[2]+weight*lift];key.kind=edit.kind;key.reason='Выбранный пользователем ракурс; полный коридор и переходы проверяются заново';
    }
  }
  if(keys.length>MAX_KEYS)return fallback('Превышен полный бюджет сцен с вступлением и финалом; сохранено прежнее сопровождение.');
  // Lift each COMPLETE control hull above all crossed cells, including intro
  // and outro. Raising key z values preserves the resulting curve's convex
  // bound. Rebuild and verify rather than assume its endpoints are sufficient.
  for(let iteration=0;iteration<4;iteration++){
    let changed=false;
    for(let i=0;i+1<keys.length;i++)if(keys[i].segment===keys[i+1].segment){const eye=curveFor(keys,i,'position'),gaze=curveFor(keys,i,'target'),ceiling=proof.rectangle(bounds(eye),true),gazeCeiling=proof.rectangle(bounds(gaze),true);if(ceiling===undefined||gazeCeiling===undefined)return fallback('Кривая камеры пересекает отсутствующие данные или границу DEM.');
      const lift=Math.max(0,ceiling+350-Math.min(...eye.map(p=>p[2]))),gazeLift=Math.max(0,gazeCeiling+24-Math.min(...gaze.map(p=>p[2])));
      if(lift>1e-6){for(const k of [keys[i],keys[i+1]])k.position=[k.position[0],k.position[1],k.position[2]+lift+1];changed=true;}
      if(gazeLift>1e-6){for(const k of [keys[i],keys[i+1]])k.target=[k.target[0],k.target[1],k.target[2]+gazeLift+1];changed=true;}
    }if(!changed)break;
  }
  const legs:Leg[]=[];
  diagnostics.keys=keys.map(k=>({...k}));
  for(let i=0;i+1<keys.length;i++){
    const a=keys[i],b=keys[i+1],leg:Leg={start:a.time,end:b.time,segment:a.segment,eye:curveFor(keys,i,'position'),gaze:curveFor(keys,i,'target'),cut:a.segment!==b.segment};
    if([...leg.eye,...leg.gaze].some(p=>p.some(v=>!Number.isFinite(v))||p[2]>80000))return fallback('Безопасный диапазон высоты режиссёра превышен; сохранено прежнее сопровождение.');
    if(leg.cut){legs.push(leg);continue;}
    if(leg.end<=leg.start)return fallback('Временные ключи режиссёра неоднозначны.');
    const ceiling=proof.rectangle(bounds(leg.eye),true);if(ceiling===undefined||Math.min(...leg.eye.map(p=>p[2]))<ceiling+350-1e-6)return fallback('Не доказана непрерывная высота кривой камеры.');
    const stack=[{eye:leg.eye,gaze:leg.gaze,a:leg.start,b:leg.end,depth:0}];
    while(stack.length){
      const part=stack.pop()!;if(diagnostics.proofIntervals>=budget)return fallback('Проверка режиссёрского коридора достигла ограниченного бюджета; сохранено прежнее сопровождение.');diagnostics.proofIntervals++;
      if(diagnostics.proofIntervals%128===0)yield;
      const mid=(part.a+part.b)/2,eye=curveAt(part.eye,.5),gaze=curveAt(part.gaze,.5),re=radius(part.eye,eye),rg=radius(part.gaze,gaze),state=base.timeline.at(mid),xy=base.terrain.world(state.point),ground=base.terrain.meshElevation(xy);if(ground===undefined)return fallback('Нет полного DEM у фактического маркера.');
      const marker:V=[...xy,ground+24],p0=base.timeline.at(part.a).routeProgress,p1=base.timeline.at(part.b).routeProgress,r=speed*Math.max(Math.abs(state.routeProgress-p0),Math.abs(p1-state.routeProgress)),rm:V=[r,r,proof.slope*Math.SQRT2*r];
      let fit=framingBound(eye,gaze,marker,re,rg,rm,base);
      const range=ranges.get(state.segment);
      if(fit&&range){
        const unit=Math.min(base.width,base.height),window=Math.min(Math.max(50,(spacing??5)*10)/(base.timeline.path.total*1000),(range[1]-range[0])/12),roadSafe=[unit*.075/base.width,unit*.24/base.height,1-unit*.075/base.width,1-unit*(base.options?.overview!==undefined?.31:.29)/base.height];
        for(const offset of [-window,window]){
          const progress=(p:number)=>clamp(p+offset,range[0],Math.max(range[0],range[1]-1e-12)),midProgress=progress(state.routeProgress),at=base.timeline.path.at(midProgress),xy=base.terrain.world(at.point),ground=base.terrain.meshElevation(xy);if(ground===undefined){fit=false;break;}
          const radius=speed*Math.max(Math.abs(midProgress-progress(p0)),Math.abs(progress(p1)-midProgress)),error:V=[radius,radius,proof.slope*Math.SQRT2*radius];
          if(at.segment!==state.segment||!framingBound(eye,gaze,[...xy,ground+24],re,rg,error,base,roadSafe)){fit=false;break;}
        }
      }
      const cover=coverageBound(proof,eye,gaze,re,rg,base),los=lineBound(proof,eye,gaze,re,rg)&&lineBound(proof,eye,marker,re,rm,true),detail=!spacing||projectionDetailBound(proof,eye,gaze,marker,re,rg,rm,base,spacing);
      if(fit&&cover&&los&&detail)continue;
      diagnostics.failedInterval={start:part.a,end:part.b,eye,gaze,marker,fit,cover,los,detail};
      if(part.depth>=18){const reason=!cover?'photographic-coverage':!fit?'continuous-marker-framing':!los?'continuous-line-of-sight':'source-detail',label={'photographic-coverage':'полный охват фотографии','continuous-marker-framing':'читаемое положение маркера','continuous-line-of-sight':'непрерывная видимость','source-detail':'допустимая детализация фотографии'}[reason];reject(reason);return fallback(`Не доказан ${label}; сохранено прежнее сопровождение.`);}
      const [e0,e1]=split(part.eye),[g0,g1]=split(part.gaze);stack.push({eye:e1,gaze:g1,a:mid,b:part.b,depth:part.depth+1},{eye:e0,gaze:g0,a:part.a,b:mid,depth:part.depth+1});
    }legs.push(leg);
  }
  delete diagnostics.failedInterval;diagnostics.status='selected';diagnostics.reason='Кино · Автоматический режиссёр: допустимые ракурсы и непрерывный коридор проверены.';diagnostics.keys=keys.map(k=>Object.freeze({...k,position:Object.freeze([...k.position]) as unknown as V,target:Object.freeze([...k.target]) as unknown as V}));diagnostics.coverage='continuous-conservative';diagnostics.preparationMilliseconds=performance.now()-start;
  return{diagnostics,at:directorAt(base,legs,keys)};
}
/** Only the frozen poses/keys survive preparation; the prefix grid, gradients,
 * candidate scratch arrays and proof stack cannot be retained by this closure. */
function directorAt(base:TerrainCameraPlan,legs:readonly Leg[],keys:readonly DirectorKey[]):DirectorPlan['at'] {
  const immutableLegs=Object.freeze(legs.map(l=>Object.freeze({...l,eye:Object.freeze(l.eye.map(v=>Object.freeze([...v]) as unknown as V)) as unknown as Curve,gaze:Object.freeze(l.gaze.map(v=>Object.freeze([...v]) as unknown as V)) as unknown as Curve}))),immutableKeys=Object.freeze(keys.map(k=>Object.freeze({...k,position:Object.freeze([...k.position]) as unknown as V,target:Object.freeze([...k.target]) as unknown as V})));
  return(seconds:number)=>{if(!Number.isFinite(seconds))throw Error('Некорректное время камеры.');const time=clamp(seconds,0,base.timeline.config.durationSeconds);let lo=0,hi=immutableLegs.length-1;while(lo<hi){const m=(lo+hi+1)>>>1;if(immutableLegs[m].start<=time)lo=m;else hi=m-1;}const leg=immutableLegs[lo];if(leg.cut){const s=base.timeline.at(time),key=s.segment===immutableKeys[lo].segment?immutableKeys[lo]:immutableKeys[lo+1],fixed:Leg={...leg,eye:[key.position,key.position,key.position,key.position],gaze:[key.target,key.target,key.target,key.target]};return rawPose(time,fixed,base);}return rawPose(time,leg,base);};
}
function* directorSteps(base:TerrainCameraPlan,imagery?:Readonly<ImageryManifest>,edits:readonly DirectorEdit[]=[]):Generator<void,DirectorPlan> {
  const start=performance.now();let plan:DirectorPlan;
  try{plan=yield* buildDirector(base,imagery,1,BUDGET,edits);
    // Both attempts share ONE proof budget. Recheck the whole wider trajectory.
    if(plan.diagnostics.status==='fallback'&&(plan.diagnostics.rejected['source-detail']||plan.diagnostics.rejected['continuous-marker-framing'])){
      const previous=plan.diagnostics,reason=previous.rejected['source-detail']?'source-detail':'continuous-marker-framing';plan=yield* buildDirector(base,imagery,1.25,BUDGET-previous.proofIntervals,edits);plan.diagnostics.rejected[reason+'-at-first-scale']=1;plan.diagnostics.proofIntervals+=previous.proofIntervals;plan.diagnostics.candidates+=previous.candidates;
    }
  }catch(error){
    if(!(error instanceof Error)||!(/DEM|доступн|ракурс|камер|детализац|проекц/.test(error.message)))throw error;
    return{diagnostics:{status:'fallback',reason:'Для режиссёрского ракурса нет полного безопасного DEM; сохранено прежнее сопровождение.',preparationMilliseconds:performance.now()-start,candidates:0,rejected:{'terrain-validation':1},proofIntervals:0,proofBudget:BUDGET,maximumMeshSlope:0,maximumWorldSpeed:0,keys:[],safeArea:DIRECTOR_SAFE_AREAS[base.aspect<1?'portrait':'landscape'],coverage:'previous-mode'},at(){throw Error('Fallback director has no trajectory');}};
  }
  plan.diagnostics.preparationMilliseconds=performance.now()-start;return plan;
}
export function createCameraDirector(base:TerrainCameraPlan,imagery?:Readonly<ImageryManifest>):DirectorPlan {
  const steps=directorSteps(base,imagery);let result=steps.next();while(!result.done)result=steps.next();return result.value;
}
/** Same deterministic algorithm; scheduling changes responsiveness, never poses.
 * Cancellation happens before any GPU allocation or publication of this plan. */
export async function prepareCameraDirector(base:TerrainCameraPlan,imagery:Readonly<ImageryManifest>|undefined,signal:AbortSignal,edits:readonly DirectorEdit[]=[]):Promise<DirectorPlan> {
  if(edits.length>24)throw Error('Превышено количество монтажных сцен.');
  const steps=directorSteps(base,imagery,edits);try{signal.throwIfAborted();let result=steps.next();while(!result.done){await new Promise(resolve=>setTimeout(resolve,0));signal.throwIfAborted();result=steps.next();}signal.throwIfAborted();return result.value;}finally{steps.return(undefined as never);}
}
