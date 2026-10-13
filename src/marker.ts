import type { StoryConfig } from './story';
import type { RoutePath } from './geo';
import type { RoutePoint } from './route';
export const MARKER_LIMITS = Object.freeze({ bytes: 2 * 1024 * 1024, inputSide: 2048, pixels: 4_000_000, textureSide: 256 });
const invalid = () => Error('Маркер: статический PNG, WebP или JPG до 2 МиБ, 2048 × 2048 и 4 млн пикселей. SVG и анимация не принимаются.');
/** Check signature AND declared dimensions before invoking any image decoder. */
export function inspectMarker(bytes: Uint8Array, mime = ''): { type: string; width: number; height: number; orientation?: number } {
  if (!bytes.length || bytes.length > MARKER_LIMITS.bytes) throw invalid();
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (at: number, n: number) => String.fromCharCode(...bytes.subarray(at, at + n));
  let type = '', width = 0, height = 0, image = false, ended = false, orientation: number | undefined;
  if (bytes.length >= 33 && [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)) {
    type='image/png'; if(ascii(12,4)!=='IHDR'||v.getUint32(8)!==13)throw invalid();
    width=v.getUint32(16);height=v.getUint32(20);
    for(let at=8;at+12<=bytes.length;){const n=v.getUint32(at),kind=ascii(at+4,4);if(n>bytes.length-at-12||['acTL','fcTL','fdAT'].includes(kind)||(kind==='IHDR'&&at!==8)||(kind==='IEND'&&n!==0))throw invalid();if(kind==='IDAT')image=true;at+=n+12;if(kind==='IEND'){ended=at===bytes.length;break;}}
  } else if(bytes.length>=20&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP') {
    type='image/webp';if(v.getUint32(4,true)+8!==bytes.length)throw invalid();
    for(let at=12;at+8<=bytes.length;){const kind=ascii(at,4),n=v.getUint32(at+4,true),data=at+8;if(n>bytes.length-data||kind==='ANIM'||kind==='ANMF')throw invalid();
      if(kind==='VP8X'){if(at!==12||width||image||n!==10||bytes[data]&2)throw invalid();width=1+bytes[data+4]+(bytes[data+5]<<8)+(bytes[data+6]<<16);height=1+bytes[data+7]+(bytes[data+8]<<8)+(bytes[data+9]<<16);}
      if(kind==='VP8 '){if(image||n<10||ascii(data+3,3)!=='\x9d\x01\x2a')throw invalid();const w=v.getUint16(data+6,true)&16383,h=v.getUint16(data+8,true)&16383;if(width&&(width!==w||height!==h))throw invalid();width=w;height=h;image=true;}
      if(kind==='VP8L'){if(image||n<5||bytes[data]!==47)throw invalid();const bits=v.getUint32(data+1,true),w=(bits&16383)+1,h=((bits>>>14)&16383)+1;if(width&&(width!==w||height!==h))throw invalid();width=w;height=h;image=true;}
      if(width>MARKER_LIMITS.inputSide||height>MARKER_LIMITS.inputSide)throw invalid();
      at=data+n+(n%2);ended=at===bytes.length;
    }
  } else if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216){
    type='image/jpeg';orientation=1;let at=2,frame=false,exif=false;
    while(at<bytes.length){
      if(bytes[at++]!==255)throw invalid();while(bytes[at]===255)at++;const kind=bytes[at++];
      if(kind===217){ended=at===bytes.length;break;}
      if(kind===0||kind===216||kind===undefined||at+2>bytes.length)throw invalid();
      const n=v.getUint16(at),data=at+2,end=at+n;if(n<2||end>bytes.length)throw invalid();
      if([192,193,194].includes(kind)){
        if(frame||n<8||bytes[data]!==8)throw invalid();height=v.getUint16(data+1);width=v.getUint16(data+3);const components=bytes[data+5];if(![1,3].includes(components)||n!==8+3*components)throw invalid();frame=true;
      }else if(kind>=192&&kind<=207&&![196,200,204].includes(kind))throw invalid();
      if(kind===225&&ascii(data,6)==='Exif\0\0'){
        if(exif)throw invalid();exif=true;const t=data+6,le=ascii(t,2)==='II';if((!le&&ascii(t,2)!=='MM')||t+8>end||v.getUint16(t+2,le)!==42)throw invalid();
        const offset=v.getUint32(t+4,le),ifd=t+offset;if(offset<8||ifd+2>end)throw invalid();const count=v.getUint16(ifd,le);if(count>256||ifd+2+count*12+4>end)throw invalid();
        let found=false;for(let i=0;i<count;i++){const entry=ifd+2+i*12;if(v.getUint16(entry,le)===274){if(found||v.getUint16(entry+2,le)!==3||v.getUint32(entry+4,le)!==1)throw invalid();orientation=v.getUint16(entry+8,le);if(orientation<1||orientation>8)throw invalid();found=true;}}
      }
      if(kind===226&&ascii(data,4)==='MPF\0')throw invalid(); // Multi-picture JPEG is outside the static-image contract.
      at=end;
      if(kind===218){
        if(!frame||n<6)throw invalid();image=true;
        // Traverse bounded entropy data without decoding; stuffed FF00 and
        // restart markers stay in the scan. All other markers are parsed above.
        while(at<bytes.length){if(bytes[at]!==255){at++;continue;}let next=at+1;while(bytes[next]===255)next++;const k=bytes[next];if(k===0||(k>=208&&k<=215)){at=next+1;continue;}break;}
      }
    }
  }
  if(!type||!image||!ended||(mime&&mime!==type)||width<1||height<1||width>MARKER_LIMITS.inputSide||height>MARKER_LIMITS.inputSide||width*height>MARKER_LIMITS.pixels)throw invalid();
  return {type,width,height,...(orientation===undefined?{}:{orientation})};
}
/** Only the sanitized 256² raster survives. No URLs, raw file or metadata retained. */
export class MarkerAsset {
  private disposed=false;
  constructor(readonly canvas: HTMLCanvasElement,readonly type='image/png') {}
  clone(): MarkerAsset { if(this.disposed)throw Error('Картинка маркера освобождена.');const c=document.createElement('canvas');c.width=c.height=MARKER_LIMITS.textureSide;c.getContext('2d',{willReadFrequently:true})!.drawImage(this.canvas,0,0);return new MarkerAsset(c,this.type); }
  dispose(): void { if(this.disposed)return;this.disposed=true;this.canvas.width=this.canvas.height=0; }
}
export async function prepareCustomMarker(file: File): Promise<MarkerAsset> {
  if(file.size>MARKER_LIMITS.bytes)throw invalid();
  const bytes=new Uint8Array(await file.arrayBuffer()),info=inspectMarker(bytes,file.type);
  let bitmap:ImageBitmap|undefined;
  try{
    bitmap=await createImageBitmap(new Blob([bytes],{type:info.type}),{imageOrientation:info.type==='image/jpeg'?'from-image':'none'});
    const swap=(info.orientation??1)>=5;
    if(bitmap.width!==(swap?info.height:info.width)||bitmap.height!==(swap?info.width:info.height))throw invalid();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=MARKER_LIMITS.textureSide;
    const scale=Math.min(1,MARKER_LIMITS.textureSide/Math.max(bitmap.width,bitmap.height)),w=bitmap.width*scale,h=bitmap.height*scale;
    canvas.getContext('2d',{willReadFrequently:true})!.drawImage(bitmap,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    return new MarkerAsset(canvas,info.type);
  }catch{throw invalid();}finally{bitmap?.close();}
}
/** Original MIT code-native silhouettes; fixed raster shared by 2D and GPU. */
export function prepareMarker(kind: StoryConfig['marker'], custom?: MarkerAsset): MarkerAsset | undefined {
  if(!kind||kind==='point')return;
  if(kind==='custom'){if(!custom)throw Error('Выберите PNG/WebP/JPG для своего маркера.');return custom.clone();}
  if(kind==='traveler'){if(!custom)throw Error('Сначала подготовьте встроенного путешественника.');return custom.clone();}
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d',{willReadFrequently:true})!;
  c.lineCap=c.lineJoin='round';c.strokeStyle='#102c37';c.fillStyle='#fff1ce';c.lineWidth=18;
  const line=(points:number[][])=>{for(const color of ['#102c37','#fff1ce']){c.strokeStyle=color;c.lineWidth=color==='#102c37'?30:15;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}};
  const circle=(x:number,y:number,r:number)=>{c.strokeStyle='#102c37';c.fillStyle='#fff1ce';c.lineWidth=10;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.stroke();};
  if(kind==='unicycle'){
    // The single wheel is the dominant silhouette, legible even on small frames.
    // Two foot pedals and a motor housing distinguish it from a bicycle wheel.
    circle(128,137,84);c.strokeStyle='#e6843e';c.lineWidth=12;c.beginPath();c.arc(128,137,61,0,Math.PI*2);c.stroke();
    c.fillStyle='#102c37';c.beginPath();c.arc(128,137,41,0,Math.PI*2);c.fill();
    c.fillStyle='#f59a48';c.strokeStyle='#102c37';c.lineWidth=9;c.beginPath();c.roundRect(103,39,50,99,16);c.fill();c.stroke();
    line([[32,175],[80,175]]);line([[177,175],[224,175]]);
  }else if(kind==='bicycle'){
    circle(64,191,38);circle(194,191,38);line([[64,191],[105,129],[147,191],[64,191]]);line([[147,191],[175,125],[194,191]]);
    line([[111,109],[146,137],[139,179]]);line([[112,106],[143,75],[173,116]]);circle(145,46,20);
  }else{
    line([[126,104],[111,146],[82,210]]);line([[115,144],[155,168],[182,211]]);line([[125,91],[87,127],[65,115]]);line([[127,93],[159,127],[188,117]]);circle(129,51,23);
  }
  return new MarkerAsset(canvas);
}
export function markerFacesLeft(direction?:readonly[number,number]):boolean {
  if (!direction || !direction.every(Number.isFinite)) return false;
  const length=Math.hypot(...direction);
  // A tiny relative dead zone avoids horizontal reflection from vertical rounding noise.
  return length>1e-6 && direction[0]<-length*.001;
}
export function routeMarkerDirection(path:RoutePath,segment:number,index:number,project:(point:RoutePoint)=>readonly[number,number]):readonly[number,number]|undefined {
  const edge=path.edgeAt(segment,index);if(!edge)return;
  const a=project(edge.a),b=project(edge.b),direction=[b[0]-a[0],b[1]-a[1]] as const;
  return direction.every(Number.isFinite)&&Math.hypot(...direction)>1e-6?direction:undefined;
}
export function drawMarker(ctx:CanvasRenderingContext2D,asset:MarkerAsset,x:number,y:number,size:number,direction?:readonly [number,number],showDirectionCue=true):void {
  // Keep human/custom artwork upright. A separate cue follows the actual edge;
  // no interpolated bearing or arrow is drawn across a disconnected segment.
  if(showDirectionCue&&direction&&direction.every(Number.isFinite)&&Math.hypot(...direction)>1e-6){const angle=Math.atan2(direction[1],direction[0]);ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(size*.36,-size*.11);ctx.lineTo(size*.53,0);ctx.lineTo(size*.36,size*.11);ctx.strokeStyle='#102c37';ctx.lineWidth=size*.1;ctx.lineCap=ctx.lineJoin='round';ctx.stroke();ctx.strokeStyle='#fff1ce';ctx.lineWidth=size*.04;ctx.stroke();ctx.restore();}
  ctx.save();try{ctx.translate(x,y);if(markerFacesLeft(direction))ctx.scale(-1,1);ctx.drawImage(asset.canvas,-size/2,-size,size,size);}finally{ctx.restore();}
}
