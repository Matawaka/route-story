import type { Route, RoutePoint } from './route';
import { wrapDelta } from './geo';
export type TerrainXY = readonly [number, number];
export interface TerrainLevel { file:string; spacingMeters:number; width:number; height:number; bytes:number; sha256:string; noDataCount:number }
export interface TerrainManifest {
  id:string; origin:[number,number]; westMeters:number; southMeters:number; eastMeters:number; northMeters:number;
  lods:TerrainLevel[]; noData:number; minElevation:number; maxElevation:number; verticalScale:number;
  units:string; verticalDatum:string; sourceCrs:string; sourceResolutionMeters:number; attribution:string;
}
const R=6371008.8, rad=Math.PI/180;
/** A bounded, local tangent scene in metres. GPX distance is never calculated here. */
export class TerrainDataset {
  readonly cos:number;
  readonly min:number;
  readonly max:number;
  constructor(readonly manifest:TerrainManifest,readonly level:TerrainLevel,readonly heights:Int16Array){
    if(!manifest||!manifest.origin.every(Number.isFinite)||Math.abs(manifest.origin[1])>=89||manifest.units!=='metres'||manifest.verticalScale!==1||manifest.noData!==-32768||!Number.isFinite(level.spacingMeters)||level.spacingMeters<10||level.spacingMeters>500||!Number.isInteger(level.width)||!Number.isInteger(level.height)||level.width<2||level.height<2||level.width*level.height>500000||heights.length!==level.width*level.height)throw Error('Некорректный или слишком большой DEM.');
    if(![manifest.westMeters,manifest.southMeters,manifest.eastMeters,manifest.northMeters].every(Number.isFinite)||Math.abs((manifest.eastMeters-manifest.westMeters)-(level.width-1)*level.spacingMeters)>.001||Math.abs((manifest.northMeters-manifest.southMeters)-(level.height-1)*level.spacingMeters)>.001)throw Error('Размеры DEM не соответствуют сетке.');
    this.cos=Math.cos(manifest.origin[1]*rad);let min=Infinity,max=-Infinity;
    for(const value of heights)if(value!==manifest.noData){if(value < -500||value>9000)throw Error('Высоты DEM вне поддерживаемого диапазона.');min=Math.min(min,value);max=Math.max(max,value);}
    if(!Number.isFinite(min))throw Error('DEM не содержит высот.');this.min=min;this.max=max;
  }
  world(p:RoutePoint):TerrainXY{return [R*rad*wrapDelta(p.lon-this.manifest.origin[0])*this.cos,R*rad*(p.lat-this.manifest.origin[1])];}
  geographic([x,y]:TerrainXY):RoutePoint{return {lon:wrapDelta(this.manifest.origin[0]+x/(R*rad*this.cos)),lat:this.manifest.origin[1]+y/(R*rad)};}
  contains([x,y]:TerrainXY,margin=0):boolean{const m=this.manifest;return Number.isFinite(x)&&Number.isFinite(y)&&x>=m.westMeters+margin&&x<=m.eastMeters-margin&&y>=m.southMeters+margin&&y<=m.northMeters-margin;}
  /** No interpolation through missing corners, no invented sea-level fill. */
  sampleXY([x,y]:TerrainXY):number|undefined{
    if(!this.contains([x,y]))return;
    const s=this.level.spacingMeters,xx=(x-this.manifest.westMeters)/s,yy=(y-this.manifest.southMeters)/s;
    const ix=Math.min(this.level.width-2,Math.floor(xx)),iy=Math.min(this.level.height-2,Math.floor(yy)),fx=xx-ix,fy=yy-iy,i=iy*this.level.width+ix;
    const [a,b,c,d]=[this.heights[i],this.heights[i+1],this.heights[i+this.level.width],this.heights[i+this.level.width+1]];
    if([a,b,c,d].includes(this.manifest.noData))return;
    return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
  }
  sampleElevation(latitude:number,longitude:number){return this.sampleXY(this.world({lat:latitude,lon:longitude}));}
  meshElevation([x,y]:TerrainXY):number|undefined{
    if(!this.contains([x,y]))return;const s=this.level.spacingMeters,xx=(x-this.manifest.westMeters)/s,yy=(y-this.manifest.southMeters)/s,ix=Math.min(this.level.width-2,Math.floor(xx)),iy=Math.min(this.level.height-2,Math.floor(yy)),fx=xx-ix,fy=yy-iy,i=iy*this.level.width+ix;
    const [a,b,c,d]=[this.heights[i],this.heights[i+1],this.heights[i+this.level.width],this.heights[i+this.level.width+1]];if([a,b,c,d].includes(this.manifest.noData))return;
    return fx+fy<=1?a+(b-a)*fx+(c-a)*fy:d+(c-d)*(1-fx)+(b-d)*(1-fy);
  }
  /** Conservative cell maximum bounds both bilinear sampling and mesh triangles. */
  ceiling([x,y]:TerrainXY):number|undefined{
    if(!this.contains([x,y]))return;const s=this.level.spacingMeters,ix=Math.min(this.level.width-2,Math.floor((x-this.manifest.westMeters)/s)),iy=Math.min(this.level.height-2,Math.floor((y-this.manifest.southMeters)/s)),i=iy*this.level.width+ix;
    const corners=[this.heights[i],this.heights[i+1],this.heights[i+this.level.width],this.heights[i+this.level.width+1]];
    return corners.includes(this.manifest.noData)?undefined:Math.max(...corners);
  }
  getTerrainBounds(){return [this.manifest.westMeters,this.manifest.southMeters,this.manifest.eastMeters,this.manifest.northMeters] as const;}
  getTerrainResolution(){return this.level.spacingMeters;}
  getTerrainMinMax(){return {min:this.min,max:this.max};}
  getTerrainCoverage(){return {id:this.manifest.id,origin:this.manifest.origin,bounds:this.getTerrainBounds(),noDataSamples:this.heights.reduce((n,h)=>n+Number(h===this.manifest.noData),0)};}
  routeCoverage(route:Route,margin=2000):boolean{
    let samples=0;
    for(const segment of route.segments){for(let i=0;i<segment.length;i++){
      const xy=this.world(segment[i]);if(!this.contains(xy,margin)||this.sampleXY(xy)===undefined)return false;
      if(i){const a=this.world(segment[i-1]),steps=Math.ceil(Math.hypot(xy[0]-a[0],xy[1]-a[1])/this.level.spacingMeters);
        samples+=steps;if(samples>200000)return false;
        for(let j=1;j<steps;j++)if(this.sampleXY([a[0]+(xy[0]-a[0])*j/steps,a[1]+(xy[1]-a[1])*j/steps])===undefined)return false;
      }
    }}return true;
  }
}
const cache=new Map<string,Promise<TerrainDataset>>();
export function loadTerrain(quality:'compatibility'|'standard'):Promise<TerrainDataset>{
  const key=quality==='standard'?'50':'100';if(cache.has(key))return cache.get(key)!;
  const promise=(async()=>{
    const root=`${import.meta.env.BASE_URL}terrain/`,response=await fetch(root+'sogne.json');if(!response.ok)throw Error('Локальный DEM недоступен. Выберите 2D.');
    const manifest:TerrainManifest=await response.json(),level=manifest.lods.find(l=>l.file===`sogne-${key}m.i16`);if(!level||level.bytes>1000000)throw Error('Неизвестный размер DEM.');
    const r=await fetch(root+level.file);if(!r.ok)throw Error('Не удалось загрузить высоты. Выберите 2D.');const buffer=await r.arrayBuffer();
    if(buffer.byteLength!==level.bytes)throw Error('DEM повреждён.');const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==level.sha256)throw Error('Контрольная сумма DEM не совпадает.');
    return new TerrainDataset(manifest,level,new Int16Array(buffer));
  })();cache.set(key,promise);promise.catch(()=>cache.delete(key));return promise;
}
