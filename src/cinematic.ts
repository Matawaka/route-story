import type { RoutePoint } from './route';
import type { StoryTimeline } from './timeline';
import { boundsOf, cameraProject, createCameraPlan, getCameraStateAt, ease, type Bounds, type XY } from './camera';
import { haversine, wrapDelta } from './geo';
import { clipRing,clipLine } from './map-geometry';
import type { GeographyPack } from './geography';
import { formatDistance, metricLabel, type Land } from './renderer';

type Shape={path:Path2D;bounds:Bounds};
type Chunk=Shape&{segment:number;startIndex:number;endIndex:number};
type MapShape=Shape&{kind:'land'|'lakes'|'rivers'|'coast';regional:boolean};
export const cinematicPalette={
  atlas:{water:'#a9c8ce',land:'#e5e3ce',coast:'#758e89',ink:'#203f43',quiet:'#3d5c60',line:'#ae421c',track:'#6b7770',halo:'#fff7e3',panel:'#f7f3e9'},
  night:{water:'#071521',land:'#173443',coast:'#3a6275',ink:'#f4f3e8',quiet:'#b4c7d1',line:'#ffd477',track:'#638392',halo:'#0a1723',panel:'#0b1b2b'}
};
/** Destination-resolution vector renderer: map/world strokes move, captions never do. */
export class CinematicRenderer {
  readonly plan;
  private readonly maps:MapShape[]=[];
  private readonly labels:{point:XY;text:string}[]=[];
  private readonly region?:Bounds;
  readonly regionalCoverage:boolean;
  private readonly chunks:Chunk[]=[];
  private readonly points:XY[][];
  private readonly routeBase:HTMLCanvasElement;
  private readonly routeTrace:HTMLCanvasElement;
  private readonly cacheScale:number;
  private paintedChunks=0;
  private readonly title:string;
  private readonly metric:string;
  private readonly titleFamily:string;
  constructor(readonly timeline:StoryTimeline,readonly land:Land,readonly width:number,readonly height:number){
    this.plan=createCameraPlan(timeline,width,height);
    this.points=timeline.route.segments.map(s=>s.map(this.plan.world));
    const routeBounds=boundsOf(this.points.flat()),dx=width/this.plan.overviewScale,dy=height/this.plan.overviewScale;
    const envelope:Bounds=[Math.max(-180*this.plan.cos,routeBounds[0]-dx),Math.max(-90,routeBounds[1]-dy),Math.min(180*this.plan.cos,routeBounds[2]+dx),Math.min(90,routeBounds[3]+dy)];
    const polyline=(points:readonly XY[],kind:'rivers'|'coast',regional:boolean)=>{
      for(const part of clipLine(points,envelope,180*this.plan.cos)){
        const path=new Path2D();path.moveTo(...part[0]);for(const point of part.slice(1))path.lineTo(...point);this.maps.push({path,bounds:boundsOf(part),kind,regional});
      }
    };
    const polygon=(polygon:readonly number[][][],kind:'land'|'lakes',regional:boolean)=>{
      const path=new Path2D(),points:XY[]=[];
      const rings=polygon.map(ring=>{
        const result:XY[]=[this.plan.world({lon:ring[0][0],lat:ring[0][1]})];
        for(let i=1;i<ring.length;i++)result.push([result[i-1][0]+wrapDelta(ring[i][0]-ring[i-1][0])*this.plan.cos,-ring[i][1]]);
        return result;
      });
      const outerCenter=(boundsOf(rings[0])[0]+boundsOf(rings[0])[2])/2,period=360*this.plan.cos;
      for(let r=1;r<rings.length;r++){const b=boundsOf(rings[r]),shift=Math.round((outerCenter-(b[0]+b[2])/2)/period)*period;rings[r]=rings[r].map(p=>[p[0]+shift,p[1]]);}
      for(const shift of [-period,0,period])for(const ring of rings){
        const world=ring.map(p=>[p[0]+shift,p[1]] as XY),clipped=clipRing(world,envelope);
        if(clipped.length){path.moveTo(...clipped[0]);for(const p of clipped.slice(1))path.lineTo(...p);path.closePath();points.push(...clipped);}
        if(!regional&&kind==='land')polyline(world,'coast',false);
      }
      if(points.length)this.maps.push({path,bounds:boundsOf(points),kind,regional});
    };
    const pack=(pack:GeographyPack,regional:boolean)=>{
      for(const p of pack.land)polygon(p,'land',regional);for(const p of pack.lakes)polygon(p,'lakes',regional);
      for(const kind of ['rivers','coast'] as const)for(const line of pack[kind])polyline(line.map(([lon,lat])=>this.plan.world({lon,lat})),kind,regional);
      for(const l of pack.labels)this.labels.push({point:this.plan.world({lon:l.point[0],lat:l.point[1]}),text:l.text});
    };
    this.regionalCoverage=false;
    if(land.geography){
      pack(land.geography.world,false);pack(land.geography.region,true);
      const [west,south,east,north]=land.geography.region.extent,a=this.plan.world({lon:west,lat:north}),b=this.plan.world({lon:east,lat:south});
      this.region=[a[0],a[1],b[0],b[1]];
      this.regionalCoverage=timeline.route.segments.every(s=>s.every(p=>p.lon>=west&&p.lon<=east&&p.lat>=south&&p.lat<=north));
    }else for(const feature of land.features){
      const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates as number[][][]]:feature.geometry.coordinates as number[][][][];
      for(const p of polygons)polygon(p,'land',false);
    }
    this.points.forEach((points,segment)=>{
      for(let start=0;start<points.length-1;start+=128){
        const end=Math.min(points.length-1,start+128),path=new Path2D();path.moveTo(...points[start]);
        for(let i=start+1;i<=end;i++){if(Math.abs(points[i][0]-points[i-1][0])>180*this.plan.cos)path.moveTo(...points[i]);else path.lineTo(...points[i]);}
        this.chunks.push({path,bounds:boundsOf(points.slice(start,end+1)),segment,startIndex:start,endIndex:end});
      }
    });
    this.cacheScale=this.plan.overviewScale*this.plan.maxZoom;
    this.routeBase=document.createElement('canvas');this.routeTrace=document.createElement('canvas');
    for(const c of [this.routeBase,this.routeTrace]){c.width=Math.ceil(width*this.plan.maxZoom);c.height=Math.ceil(height*this.plan.maxZoom);}
    const base=this.cacheContext(this.routeBase),colors=cinematicPalette[timeline.config.visualStyle],unit=Math.min(width,height);
    base.lineCap=base.lineJoin='round';base.strokeStyle=colors.halo;base.lineWidth=unit*.021/this.cacheScale;
    for(const c of this.chunks)base.stroke(c.path);
    base.strokeStyle=colors.track;base.lineWidth=unit*.0065/this.cacheScale;for(const c of this.chunks)base.stroke(c.path);
    this.titleFamily=timeline.config.visualStyle==='atlas'?'Georgia, serif':'system-ui';
    const measure=document.createElement('canvas').getContext('2d')!;measure.font=`650 ${unit*.058}px ${this.titleFamily}`;
    const points=Array.from(timeline.config.title),length=points.length;
    while(points.length&&measure.measureText(points.join('')+(points.length<length?'…':'')).width>width-unit*.16)points.pop();
    this.title=points.join('')+(points.length<length?'…':'');this.metric=metricLabel(timeline.route);
  }
  private cacheContext(canvas:HTMLCanvasElement):CanvasRenderingContext2D {
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
    ctx.setTransform(this.cacheScale,0,0,this.cacheScale,canvas.width/2-this.plan.overview[0]*this.cacheScale,canvas.height/2-this.plan.overview[1]*this.cacheScale);
    return ctx;
  }
  draw(canvas:HTMLCanvasElement,seconds:number):void {
    // A fixed CPU raster surface avoids Chromium switching GPU/CPU after readback,
    // which otherwise changes a few antialiased vector pixels after seeking.
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas 2D недоступен.');
    const camera=getCameraStateAt(seconds,this.timeline,this.plan),state=this.timeline.at(seconds),colors=cinematicPalette[this.timeline.config.visualStyle];
    const w=this.width,h=this.height,unit=Math.min(w,h),pad=unit*.08;
    const view:Bounds=[camera.center[0]-w/2/camera.scale,camera.center[1]-h/camera.scale,camera.center[0]+w/2/camera.scale,camera.center[1]+h/camera.scale];
    const visible=(bounds:Bounds)=>bounds[0]<=view[2]&&bounds[2]>=view[0]&&bounds[1]<=view[3]&&bounds[3]>=view[1];
    ctx.resetTransform();ctx.globalAlpha=1;ctx.lineCap='round';ctx.lineJoin='round';ctx.fillStyle=colors.water;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(w/2,(this.plan.safe[1]+this.plan.safe[3])/2);ctx.scale(camera.scale,camera.scale);ctx.translate(-camera.center[0],-camera.center[1]);
    const mapShape=(shape:MapShape)=>{
      ctx.lineWidth=unit*.0018/camera.scale;
      if(shape.kind==='land'){ctx.fillStyle=colors.land;ctx.fill(shape.path,'evenodd');}
      else if(shape.kind==='lakes'){ctx.fillStyle=colors.water;ctx.fill(shape.path,'evenodd');ctx.strokeStyle=colors.coast;ctx.stroke(shape.path);}
      else{ctx.strokeStyle=shape.kind==='coast'?colors.coast:colors.water;ctx.lineWidth=unit*(shape.kind==='coast'?.002:.003)/camera.scale;ctx.stroke(shape.path);}
    };
    const insideRegion=this.region&&view[0]>=this.region[0]&&view[2]<=this.region[2]&&view[1]>=this.region[1]&&view[3]<=this.region[3];
    if(!insideRegion)for(const kind of ['land','lakes','rivers','coast'])for(const shape of this.maps)if(!shape.regional&&shape.kind===kind&&visible(shape.bounds))mapShape(shape);
    if(this.region&&visible(this.region)){
      ctx.save();ctx.beginPath();ctx.rect(this.region[0],this.region[1],this.region[2]-this.region[0],this.region[3]-this.region[1]);ctx.clip();ctx.fillStyle=colors.water;ctx.fillRect(this.region[0],this.region[1],this.region[2]-this.region[0],this.region[3]-this.region[1]);
      for(const shape of this.maps)if(shape.regional&&visible(shape.bounds))mapShape(shape);ctx.restore();
    }
    ctx.restore();
    // Two bounded route surfaces prepared at the maximum destination zoom. No map bitmap
    // is enlarged. Fixed chunk order reproduces exact direct/backward seek pixels.
    const next=this.chunks.findIndex(c=>c.segment>state.segment||(c.segment===state.segment&&c.endIndex>=state.index)),target=state.routeProgress===1||next===-1?this.chunks.length:next;
    const trace=this.cacheContext(this.routeTrace);
    if(target<this.paintedChunks){trace.resetTransform();trace.clearRect(0,0,this.routeTrace.width,this.routeTrace.height);this.cacheContext(this.routeTrace);this.paintedChunks=0;}
    trace.lineCap=trace.lineJoin='round';trace.strokeStyle=colors.line;trace.lineWidth=unit*.0115/this.cacheScale;
    while(this.paintedChunks<target)trace.stroke(this.chunks[this.paintedChunks++].path);
    const factor=camera.scale/this.cacheScale,offsetX=w/2+(this.plan.overview[0]-camera.center[0])*camera.scale-this.routeBase.width*factor/2,offsetY=(this.plan.safe[1]+this.plan.safe[3])/2+(this.plan.overview[1]-camera.center[1])*camera.scale-this.routeBase.height*factor/2;
    ctx.drawImage(this.routeBase,offsetX,offsetY,this.routeBase.width*factor,this.routeBase.height*factor);
    if(this.timeline.config.visualStyle==='night'){ctx.save();ctx.globalAlpha=.2;ctx.shadowColor=colors.line;ctx.shadowBlur=unit*.012;ctx.drawImage(this.routeTrace,offsetX,offsetY,this.routeTrace.width*factor,this.routeTrace.height*factor);ctx.restore();}
    ctx.drawImage(this.routeTrace,offsetX,offsetY,this.routeTrace.width*factor,this.routeTrace.height*factor);
    const chunk=this.chunks[target];
    if(state.routeProgress<1&&chunk?.segment===state.segment&&chunk.startIndex<state.index){
      const path=new Path2D();path.moveTo(...this.points[state.segment][chunk.startIndex]);
      for(let i=chunk.startIndex+1;i<state.index;i++){const a=this.points[state.segment][i-1],b=this.points[state.segment][i];if(Math.abs(b[0]-a[0])>180*this.plan.cos)path.moveTo(...b);else path.lineTo(...b);}
      const point=this.plan.world(state.point),previous=this.points[state.segment][Math.max(0,state.index-1)];if(Math.abs(point[0]-previous[0])<=180*this.plan.cos)path.lineTo(...point);
      ctx.save();ctx.translate(w/2,(this.plan.safe[1]+this.plan.safe[3])/2);ctx.scale(camera.scale,camera.scale);ctx.translate(-camera.center[0],-camera.center[1]);ctx.strokeStyle=colors.line;ctx.lineWidth=unit*.0115/this.cacheScale;ctx.lineCap=ctx.lineJoin='round';ctx.stroke(path);ctx.restore();
    }
    const occupied:Bounds[]=[];
    const intersects=(a:Bounds,b:Bounds)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
    const marker=(point:RoutePoint,label:string,leading=false)=>{
      const [x,y]=cameraProject(this.plan.world(point),camera,this.plan);if(x<pad||x>w-pad||y<this.plan.safe[1]-1||y>this.plan.safe[3]+1)return;
      const radius=unit*(leading?.012:.008);
      ctx.save();ctx.globalAlpha=leading?state.markerOpacity:1;
      if(leading){ctx.strokeStyle=colors.line;ctx.lineWidth=unit*.002;ctx.beginPath();ctx.arc(x,y,radius*(1.9+.25*Math.sin(state.timeSeconds*Math.PI*2)),0,Math.PI*2);ctx.globalAlpha*=.45;ctx.stroke();ctx.globalAlpha=state.markerOpacity;}
      if(label==='Финиш'&&state.phase==='OUTRO'){ctx.strokeStyle=colors.line;ctx.lineWidth=unit*.003;ctx.beginPath();ctx.arc(x,y,radius*(1.5+ease(state.outroProgress)),0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle=leading?colors.line:colors.panel;ctx.strokeStyle=colors.ink;ctx.lineWidth=unit*.0025;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
      if(label){ctx.font=`600 ${unit*.026}px system-ui`;ctx.textAlign='left';ctx.textBaseline='middle';const tw=ctx.measureText(label).width,lx=Math.min(w-pad-tw,Math.max(pad,x+unit*.025));let ly=Math.max(h*.20+unit*.025,Math.min(h*.85-unit*.025,y+(label==='Старт'?unit*.04:-unit*.04))),box:Bounds=[lx-unit*.008,ly-unit*.022,lx+tw+unit*.008,ly+unit*.022];
        if(occupied.some(b=>intersects(box,b))){ly=Math.max(h*.20+unit*.025,Math.min(h*.85-unit*.025,ly+unit*.07));box=[box[0],ly-unit*.022,box[2],ly+unit*.022];}
        occupied.push(box);ctx.fillStyle=colors.panel;ctx.fillRect(box[0],box[1],box[2]-box[0],box[3]-box[1]);ctx.fillStyle=colors.ink;ctx.fillText(label,lx,ly);}
      occupied.push([x-unit*.035,y-unit*.035,x+unit*.035,y+unit*.035]);
      ctx.restore();
    };
    marker(this.timeline.route.segments[0][0],'Старт');marker(this.timeline.route.segments.at(-1)!.at(-1)!,'Финиш');marker(state.point,'',true);
    // Source labels are geographical anchors, not inferred stops or reverse geocoding.
    ctx.textBaseline='middle';ctx.textAlign='left';ctx.font=`500 ${unit*.025}px system-ui`;
    for(const label of this.labels){const [x,y]=cameraProject(label.point,camera,this.plan),tw=ctx.measureText(label.text).width,box:Bounds=[x-unit*.012,y-unit*.020,x+tw+unit*.028,y+unit*.020];
      if(box[0]<pad||box[2]>w-pad||box[1]<h*.23||box[3]>h*.82||occupied.some(b=>intersects(box,b)))continue;
      occupied.push(box);ctx.fillStyle=colors.panel+'d9';ctx.fillRect(...[box[0],box[1],box[2]-box[0],box[3]-box[1]] as [number,number,number,number]);ctx.fillStyle=colors.quiet;ctx.beginPath();ctx.arc(x,y,unit*.0028,0,Math.PI*2);ctx.fill();ctx.fillText(label.text,x+unit*.013,y);
    }
    if(camera.cutOpacity>0){ctx.fillStyle=colors.panel;ctx.globalAlpha=camera.cutOpacity*.85;ctx.fillRect(0,h*.18,w,h*.66);ctx.globalAlpha=1;}
    // Screen-space composition; the geography continues beneath translucent edge gradients.
    const gradient=ctx.createLinearGradient(0,0,0,h*.22);gradient.addColorStop(0,colors.panel);gradient.addColorStop(1,colors.panel+'00');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h*.22);
    const bottom=ctx.createLinearGradient(0,h*.8,0,h);bottom.addColorStop(0,colors.panel+'00');bottom.addColorStop(.55,colors.panel+'ee');bottom.addColorStop(1,colors.panel);ctx.fillStyle=bottom;ctx.fillRect(0,h*.8,w,h*.2);
    ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=colors.quiet;ctx.font=`600 ${unit*.022}px system-ui`;ctx.fillText('ROUTE STORY',pad,h*.035);
    const impact=state.phase==='INTRO'?1-ease(Math.max(0,(state.introProgress-.65)/.35)):state.phase==='OUTRO'?ease(state.outroProgress):0;
    ctx.fillStyle=colors.ink;ctx.font=`650 ${unit*(.035+.023*impact)}px ${this.titleFamily}`;ctx.fillText(this.title,pad,h*.072);
    ctx.fillStyle=colors.quiet;ctx.font=`${unit*.026}px system-ui`;
    ctx.fillText(state.phase==='INTRO'?'Ваш путь по GPX':state.phase==='OUTRO'?'Финиш · весь маршрут':`Повтор маршрута · сегмент ${state.segment+1} из ${this.timeline.route.segments.length}`,pad,h*.135);
    const total=this.timeline.path.total,text=state.phase==='OUTRO'?`Всего ${formatDistance(total)}`:`${formatDistance(state.travelledKm,total).replace(/ (км|м)$/,'')} / ${formatDistance(total)}`;
    const fit=(text:string,size:number,weight='')=>{ctx.font=`${weight} ${size}px system-ui`;ctx.font=`${weight} ${Math.min(size,size*(w-2*pad)/Math.max(1,ctx.measureText(text).width))}px system-ui`;};
    ctx.fillStyle=colors.ink;fit(text,unit*.050,'650');ctx.fillText(text,pad,h-unit*.158);
    ctx.fillStyle=colors.quiet;fit(this.metric,unit*.027);ctx.fillText(this.metric,pad,h-unit*.092);
    ctx.font=`${unit*.019}px system-ui`;ctx.fillText(`Natural Earth · ${this.regionalCoverage?'фьорды 1:10m':'обзорная карта'} · без улиц`,pad,h-unit*.045);
    if(state.phase==='OUTRO'){ctx.font=`600 ${unit*.022}px system-ui`;ctx.textAlign='right';ctx.fillText('Matawaka',w-pad,h*.035);}
    ctx.fillStyle=colors.track;ctx.globalAlpha=.4;ctx.fillRect(pad,h*.991,w-2*pad,unit*.004);ctx.globalAlpha=1;ctx.fillStyle=colors.line;ctx.fillRect(pad,h*.991,(w-2*pad)*state.timelineProgress,unit*.004);
    // North is fixed because this release deliberately avoids rotating camera shots.
    const compassX=w-pad-unit*.016;
    ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle=colors.quiet;ctx.font=`600 ${unit*.019}px system-ui`;ctx.fillText('N',compassX,h*.23);ctx.strokeStyle=colors.quiet;ctx.lineWidth=unit*.002;ctx.beginPath();ctx.moveTo(compassX,h*.25+unit*.035);ctx.lineTo(compassX,h*.25);ctx.lineTo(compassX-unit*.006,h*.25+unit*.009);ctx.stroke();
    const lat=Math.min(89.9,Math.max(-89.9,-camera.center[1])),lon=this.plan.longitude+camera.center[0]/this.plan.cos,bar=unit*.10;
    const km=haversine({lat,lon},{lat,lon:lon+bar/camera.scale/this.plan.cos});
    ctx.textAlign='right';ctx.font=`${unit*.018}px system-ui`;ctx.fillText(formatDistance(km),w-pad,h*.80);ctx.beginPath();ctx.moveTo(w-pad-bar,h*.80+unit*.017);ctx.lineTo(w-pad,h*.80+unit*.017);ctx.stroke();
  }
  dispose():void {this.routeBase.width=this.routeBase.height=this.routeTrace.width=this.routeTrace.height=0;this.maps.length=this.chunks.length=this.labels.length=0;this.points.length=0;}
}
