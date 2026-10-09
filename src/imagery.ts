import type {TerrainDataset,TerrainXY} from './terrain';

export interface ImageryManifest {
  schema:1; id:string; origin:readonly number[]; bounds:readonly number[];
  width:number; height:number; spacingMeters:number; file:string; bytes:number; sha256:string;
  attribution:string; acquiredDate:string; sourceResolutionMeters:number;
  detail?:ImageryManifest;
}
export const MAX_IMAGE_BYTES=2*1024*1024,MAX_IMAGE_PIXELS=3_000_000,MAX_TEXTURE_SIDE=2048;
export function validateImagery(m:ImageryManifest):Readonly<ImageryManifest>{
  if(!m||m.schema!==1||m.id!=='sogne-sentinel-20250927'||!['sogne-sentinel-20m.jpg','sogne-sentinel-40m.jpg','sogne-sentinel-10m.jpg'].includes(m.file)||m.acquiredDate!=='2025-09-27'||m.attribution!=='Contains modified Copernicus Sentinel data 2025')throw Error('Неизвестный источник снимка. Выберите поверхность DEM.');
  if(m.origin?.length!==2||m.bounds?.length!==4||![...m.origin,...m.bounds].every(Number.isFinite)||m.bounds[2]<=m.bounds[0]||m.bounds[3]<=m.bounds[1])throw Error('Некорректная привязка снимка.');
  if(![m.width,m.height,m.bytes].every(Number.isSafeInteger)||m.width<2||m.height<2||m.width>MAX_TEXTURE_SIDE||m.height>MAX_TEXTURE_SIDE||m.width*m.height>MAX_IMAGE_PIXELS||m.bytes<1||m.bytes>MAX_IMAGE_BYTES||!Number.isFinite(m.spacingMeters)||m.spacingMeters<10||m.spacingMeters>100||m.sourceResolutionMeters!==10||!/^[a-f0-9]{64}$/.test(m.sha256))throw Error('Снимок превышает лимиты или повреждён.');
  if(Math.abs((m.bounds[2]-m.bounds[0])/m.width-m.spacingMeters)>.001||Math.abs((m.bounds[3]-m.bounds[1])/m.height-m.spacingMeters)>.001)throw Error('Размер снимка не соответствует геопривязке.');
  if(m.file!==`sogne-sentinel-${m.spacingMeters}m.jpg`||m.origin[0]!==6.2||m.origin[1]!==61.28)throw Error('Непроверенная региональная привязка снимка.');
  let detail:Readonly<ImageryManifest>|undefined;
  if(m.detail){if(m.detail.detail)throw Error('Допускаются только два уровня снимка.');detail=validateImagery(m.detail);
    if(m.file!=='sogne-sentinel-40m.jpg'||detail.file!=='sogne-sentinel-10m.jpg'||detail.origin.some((v,i)=>v!==m.origin[i])||detail.bounds[0]<m.bounds[0]||detail.bounds[1]<m.bounds[1]||detail.bounds[2]>m.bounds[2]||detail.bounds[3]>m.bounds[3]||m.bytes+detail.bytes>MAX_IMAGE_BYTES||m.width*m.height+detail.width*detail.height>MAX_IMAGE_PIXELS)throw Error('Уровни снимка не совпадают или превышают общий бюджет.');
  }
  return Object.freeze({...m,origin:Object.freeze([...m.origin]),bounds:Object.freeze([...m.bounds]),detail});
}
/** Pure scale choice, no hysteresis/frame history. Culling can only suppress
 * detail; the fully resident global crop remains an honest coverage fallback. */
export function imageryDetailWeight(m:ImageryManifest,distance:number,fov:number,height:number,visible=true):number{
  if(![distance,fov,height].every(Number.isFinite)||distance<=0||fov<=0||fov>=180||height<=0)throw Error('Некорректный масштаб снимка.');
  if(!m.detail||!visible)return 0;
  const metresPerPixel=distance*2*Math.tan(fov*Math.PI/360)/height,s=m.detail.spacingMeters,t=Math.min(1,Math.max(0,(metresPerPixel-s*1.5)/(s*3.5-s*1.5)));
  return 1-t*t*(3-2*t);
}
/** North-up source pixels, Texture.flipY=false: north is v0, south is v1. */
export function imageryUV(m:ImageryManifest,[east,north]:TerrainXY):readonly [number,number]{
  if(!Number.isFinite(east)||!Number.isFinite(north))throw Error('Некорректные координаты текстуры.');
  return [(east-m.bounds[0])/(m.bounds[2]-m.bounds[0]),(m.bounds[3]-north)/(m.bounds[3]-m.bounds[1])];
}
export function imageryCoversTerrain(m:ImageryManifest,t:TerrainDataset):boolean{
  const d=t.manifest;return m.origin[0]===d.origin[0]&&m.origin[1]===d.origin[1]&&m.bounds[0]<=d.westMeters&&m.bounds[1]<=d.southMeters&&m.bounds[2]>=d.eastMeters&&m.bounds[3]>=d.northMeters;
}
async function boundedResponse(response:Response,limit:number):Promise<Uint8Array<ArrayBuffer>>{
  if(!response.ok||!response.body)throw Error('Локальный снимок недоступен. Выберите поверхность DEM.');
  const reader=response.body.getReader(),chunks:Uint8Array[]= [];let bytes=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit)throw Error('Снимок превышает допустимый размер.');chunks.push(value);}}
  catch(error){await reader.cancel();throw error;}finally{reader.releaseLock();}
  const result=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
export interface PreparedImagery { readonly manifest:Readonly<ImageryManifest>; readonly bitmap:ImageBitmap; readonly detailBitmap?:ImageBitmap; dispose():void }
/** No route coordinates or dynamic URLs. No decoded-image cache: renderer owns
 * one resident bitmap and releases it after replacement/error/page disposal. */
export async function loadImagery(signal?:AbortSignal,comparisonOnly=false):Promise<PreparedImagery>{
  signal?.throwIfAborted();
  const root=`${import.meta.env.BASE_URL}imagery/`;
  const manifest=validateImagery(JSON.parse(new TextDecoder().decode(await boundedResponse(await fetch(root+(comparisonOnly?'sogne-sentinel-20m.json':'sogne-sentinel.json'),{signal}),16384))));
  signal?.throwIfAborted();
  const decode=async(m:ImageryManifest)=>{
  const bytes=await boundedResponse(await fetch(root+m.file,{signal}),MAX_IMAGE_BYTES);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(bytes.length!==m.bytes||hash!==m.sha256)throw Error('Контрольная сумма снимка не совпадает. Выберите поверхность DEM.');
  signal?.throwIfAborted();
  const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}),{imageOrientation:'none',colorSpaceConversion:'none'});
  if(bitmap.width!==m.width||bitmap.height!==m.height){bitmap.close();throw Error('Размер декодированного снимка не совпадает.');}
  if(signal?.aborted){bitmap.close();signal.throwIfAborted();}
  return bitmap;};
  const bitmap=await decode(manifest);let detailBitmap:ImageBitmap|undefined;
  try{if(manifest.detail)detailBitmap=await decode(manifest.detail);signal?.throwIfAborted();return Object.freeze({manifest,bitmap,detailBitmap,dispose:()=>{bitmap.close();detailBitmap?.close();}});}catch(error){bitmap.close();detailBitmap?.close();throw error;}
}
