import type { StoryConfig } from './story';
import { drawMarker, type MarkerAsset } from './marker';
export type MarkerRect = readonly [number,number,number,number];
export const intersectsMarker = (a:MarkerRect,b:MarkerRect):boolean => a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
export const markerSize = (config:StoryConfig,unit:number):number => unit*({small:.09,medium:.135,large:.17}[config.markerSize??'medium']);
/** The anchor never moves. Only the annotation shifts within caption-safe
 * bounds, joined by a connector. Off-screen anchors are never rescued. */
export function annotationAt(x:number,y:number,z:number,width:number,height:number,size:number,safe:MarkerRect):{box:MarkerRect;x:number;y:number}|undefined {
  if(![x,y,z,width,height,size,...safe].every(Number.isFinite)||size<=0||z < -1||z>1||x<0||x>width||y<0||y>height)return;
  const left=Math.max(safe[0],Math.min(safe[2]-size,x-size/2)),top=Math.max(safe[1],Math.min(safe[3]-size,y-size-8));
  return {box:[left,top,left+size,top+size],x:left+size/2,y:top+size};
}
export function drawAnnotation(ctx:CanvasRenderingContext2D,asset:MarkerAsset,anchor:readonly[number,number],layout:NonNullable<ReturnType<typeof annotationAt>>,size:number,occluded:boolean,direction?:readonly[number,number],showOcclusionCaption=true):void {
  ctx.save();ctx.strokeStyle='#fff5da';ctx.lineWidth=Math.max(1,size*.025);ctx.setLineDash(occluded?[size*.08,size*.06]:[]);
  ctx.beginPath();ctx.moveTo(...anchor);ctx.lineTo(layout.x,layout.y);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(...anchor,Math.max(2,size*.035),0,Math.PI*2);ctx.stroke();
  ctx.shadowColor='#fff5dad9';ctx.shadowBlur=size*.055;drawMarker(ctx,asset,layout.x,layout.y,size,direction);ctx.shadowBlur=0;
  if(occluded&&showOcclusionCaption){ctx.font=`600 ${Math.max(9,size*.15)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='top';ctx.fillStyle='#071521e6';const text='За рельефом',tw=ctx.measureText(text).width;ctx.fillRect(layout.x-tw/2-3,layout.y+2,tw+6,size*.19);ctx.fillStyle='#fff5da';ctx.fillText(text,layout.x,layout.y+3);}
  ctx.restore();
}
