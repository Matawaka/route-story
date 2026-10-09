import type { RoutePoint } from './route';
import type { StoryTimeline } from './timeline';
import { boundsOf, cameraProject, createCameraPlan, getCameraStateAt, type Bounds, type XY } from './camera';
import { formatDistance, metricLabel, type Land } from './renderer';

type Shape={path:Path2D;bounds:Bounds};
type Chunk=Shape&{segment:number;startIndex:number;endIndex:number};
export const cinematicPalette={
  atlas:{water:'#a9c8ce',land:'#e5e3ce',coast:'#758e89',ink:'#203f43',quiet:'#3d5c60',line:'#ae421c',track:'#6b7770',halo:'#fff7e3',panel:'#f7f3e9'},
  night:{water:'#071521',land:'#173443',coast:'#3a6275',ink:'#f4f3e8',quiet:'#b4c7d1',line:'#ffd477',track:'#638392',halo:'#0a1723',panel:'#0b1b2b'}
};
/** Destination-resolution vector renderer: map/world strokes move, captions never do. */
export class CinematicRenderer {
  readonly plan;
  private readonly maps:Shape[]=[];
  private readonly chunks:Chunk[]=[];
  private readonly points:XY[][];
  private readonly title:string;
  private readonly metric:string;
  constructor(readonly timeline:StoryTimeline,readonly land:Land,readonly width:number,readonly height:number){
    this.plan=createCameraPlan(timeline,width,height);
    this.points=timeline.route.segments.map(s=>s.map(this.plan.world));
    for(const feature of land.features){
      const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates as number[][][]]:feature.geometry.coordinates as number[][][][];
      for(const polygon of polygons){
        const path=new Path2D(),points:XY[]=[];
        for(const ring of polygon){let previous:XY|undefined;for(const [lon,lat] of ring){const p=this.plan.world({lon,lat});points.push(p);if(!previous||Math.abs(p[0]-previous[0])>180*this.plan.cos)path.moveTo(...p);else path.lineTo(...p);previous=p;}path.closePath();}
        if(points.length)this.maps.push({path,bounds:boundsOf(points)});
      }
    }
    this.points.forEach((points,segment)=>{
      for(let start=0;start<points.length-1;start+=128){
        const end=Math.min(points.length-1,start+128),path=new Path2D();path.moveTo(...points[start]);
        for(let i=start+1;i<=end;i++){if(Math.abs(points[i][0]-points[i-1][0])>180*this.plan.cos)path.moveTo(...points[i]);else path.lineTo(...points[i]);}
        this.chunks.push({path,bounds:boundsOf(points.slice(start,end+1)),segment,startIndex:start,endIndex:end});
      }
    });
    const measure=document.createElement('canvas').getContext('2d')!,unit=Math.min(width,height);measure.font=`650 ${unit*.058}px system-ui`;
    const points=Array.from(timeline.config.title),length=points.length;
    while(points.length&&measure.measureText(points.join('')+(points.length<length?'…':'')).width>width-unit*.16)points.pop();
    this.title=points.join('')+(points.length<length?'…':'');this.metric=metricLabel(timeline.route);
  }
  draw(canvas:HTMLCanvasElement,seconds:number):void {
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D недоступен.');
    const camera=getCameraStateAt(seconds,this.timeline,this.plan),state=this.timeline.at(seconds),colors=cinematicPalette[this.timeline.config.visualStyle];
    const w=this.width,h=this.height,unit=Math.min(w,h),pad=unit*.08;
    const view:Bounds=[camera.center[0]-w/2/camera.scale,camera.center[1]-h/camera.scale,camera.center[0]+w/2/camera.scale,camera.center[1]+h/camera.scale];
    const visible=(bounds:Bounds)=>bounds[0]<=view[2]&&bounds[2]>=view[0]&&bounds[1]<=view[3]&&bounds[3]>=view[1];
    ctx.resetTransform();ctx.globalAlpha=1;ctx.fillStyle=colors.water;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(w/2,(this.plan.safe[1]+this.plan.safe[3])/2);ctx.scale(camera.scale,camera.scale);ctx.translate(-camera.center[0],-camera.center[1]);
    ctx.fillStyle=colors.land;ctx.strokeStyle=colors.coast;ctx.lineWidth=unit*.0018/camera.scale;
    for(const shape of this.maps)if(visible(shape.bounds)){ctx.fill(shape.path,'evenodd');ctx.stroke(shape.path);}
    ctx.lineCap=ctx.lineJoin='round';
    const stroke=(path:Path2D,color:string,width:number)=>{ctx.strokeStyle=color;ctx.lineWidth=width/camera.scale;ctx.stroke(path);};
    for(const chunk of this.chunks)if(visible(chunk.bounds)){stroke(chunk.path,colors.halo,unit*.012);stroke(chunk.path,colors.track,unit*.005);}
    const drawTravelled=(path:Path2D)=>{
      if(this.timeline.config.visualStyle==='night'){ctx.globalAlpha=.14;stroke(path,colors.line,unit*.032);ctx.globalAlpha=.23;stroke(path,colors.line,unit*.020);ctx.globalAlpha=1;}
      stroke(path,colors.halo,unit*.014);stroke(path,colors.line,unit*.0075);
    };
    for(const chunk of this.chunks){
      if(chunk.segment>state.segment)break;if(!visible(chunk.bounds))continue;
      if(state.routeProgress===1||chunk.segment<state.segment||chunk.endIndex<state.index)drawTravelled(chunk.path);
      else if(chunk.startIndex<state.index&&chunk.segment===state.segment){
        const start=chunk.startIndex,path=new Path2D();path.moveTo(...this.points[state.segment][start]);
        for(let i=start+1;i<state.index;i++){const a=this.points[state.segment][i-1],b=this.points[state.segment][i];if(Math.abs(b[0]-a[0])>180*this.plan.cos)path.moveTo(...b);else path.lineTo(...b);}
        const point=this.plan.world(state.point),previous=this.points[state.segment][Math.max(0,state.index-1)];
        if(Math.abs(point[0]-previous[0])<=180*this.plan.cos)path.lineTo(...point);drawTravelled(path);
      }
    }
    ctx.restore();
    const marker=(point:RoutePoint,label:string,leading=false)=>{
      const [x,y]=cameraProject(this.plan.world(point),camera,this.plan);if(x<pad||x>w-pad||y<h*.19||y>h*.82)return;
      const radius=unit*(leading?.012:.008);
      ctx.save();ctx.globalAlpha=leading?state.markerOpacity:1;
      if(leading){ctx.strokeStyle=colors.line;ctx.lineWidth=unit*.002;ctx.beginPath();ctx.arc(x,y,radius*(1.9+.25*Math.sin(state.timeSeconds*Math.PI*2)),0,Math.PI*2);ctx.globalAlpha*=.45;ctx.stroke();ctx.globalAlpha=state.markerOpacity;}
      ctx.fillStyle=leading?colors.line:colors.panel;ctx.strokeStyle=colors.ink;ctx.lineWidth=unit*.0025;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
      if(label){ctx.font=`600 ${unit*.026}px system-ui`;ctx.textAlign='left';ctx.textBaseline='middle';const tw=ctx.measureText(label).width,lx=Math.min(w-pad-tw,Math.max(pad,x+unit*.025)),ly=y+(label==='Старт'?unit*.035:-unit*.035);ctx.fillStyle=colors.panel;ctx.fillRect(lx-unit*.008,ly-unit*.022,tw+unit*.016,unit*.044);ctx.fillStyle=colors.ink;ctx.fillText(label,lx,ly);}
      ctx.restore();
    };
    marker(this.timeline.route.segments[0][0],'Старт');marker(this.timeline.route.segments.at(-1)!.at(-1)!,'Финиш');marker(state.point,'',true);
    if(camera.cutOpacity>0){ctx.fillStyle=colors.panel;ctx.globalAlpha=camera.cutOpacity*.85;ctx.fillRect(0,h*.18,w,h*.66);ctx.globalAlpha=1;}
    // Screen-space composition; the geography continues beneath translucent edge gradients.
    const gradient=ctx.createLinearGradient(0,0,0,h*.22);gradient.addColorStop(0,colors.panel);gradient.addColorStop(1,colors.panel+'00');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h*.22);
    const bottom=ctx.createLinearGradient(0,h*.8,0,h);bottom.addColorStop(0,colors.panel+'00');bottom.addColorStop(.55,colors.panel+'ee');bottom.addColorStop(1,colors.panel);ctx.fillStyle=bottom;ctx.fillRect(0,h*.8,w,h*.2);
    ctx.textAlign='left';ctx.textBaseline='top';ctx.fillStyle=colors.quiet;ctx.font=`600 ${unit*.022}px system-ui`;ctx.fillText('ROUTE STORY',pad,h*.035);
    ctx.fillStyle=colors.ink;ctx.font=`650 ${unit*.058}px system-ui`;ctx.fillText(this.title,pad,h*.072);
    ctx.fillStyle=colors.quiet;ctx.font=`${unit*.026}px system-ui`;
    ctx.fillText(state.phase==='INTRO'?'Ваш путь по GPX':state.phase==='OUTRO'?'Финиш · весь маршрут':`Повтор маршрута · сегмент ${state.segment+1} из ${this.timeline.route.segments.length}`,pad,h*.155);
    const total=this.timeline.path.total,text=state.phase==='OUTRO'?`Всего ${formatDistance(total)}`:`${formatDistance(state.travelledKm,total).replace(/ (км|м)$/,'')} / ${formatDistance(total)}`;
    const fit=(text:string,size:number,weight='')=>{ctx.font=`${weight} ${size}px system-ui`;ctx.font=`${weight} ${Math.min(size,size*(w-2*pad)/Math.max(1,ctx.measureText(text).width))}px system-ui`;};
    ctx.fillStyle=colors.ink;fit(text,unit*.050,'650');ctx.fillText(text,pad,h*.855);
    ctx.fillStyle=colors.quiet;fit(this.metric,unit*.030);ctx.fillText(this.metric,pad,h*.913);
    if(state.phase==='OUTRO'){ctx.font=`600 ${unit*.022}px system-ui`;ctx.textAlign='right';ctx.fillText('Matawaka',w-pad,h*.035);}
    ctx.fillStyle=colors.track;ctx.globalAlpha=.4;ctx.fillRect(pad,h*.973,w-2*pad,unit*.004);ctx.globalAlpha=1;ctx.fillStyle=colors.line;ctx.fillRect(pad,h*.973,(w-2*pad)*state.timelineProgress,unit*.004);
  }
  dispose():void {this.maps.length=this.chunks.length=0;this.points.length=0;}
}
