/** Developer-only fixed regional pack. Not imported by the production entry. */
import record from '../data/swiss-pilot/manifest.json';
import context from '../data/swiss-phase-c/manifest.json';
import {TerrainDataset,type TerrainManifest} from './terrain';
import type {TerrainCameraOptions} from './terrain-camera';
import {getTerrainCameraStateAt,terrainFrameCoverage} from './terrain-camera';
import type {TerrainRenderer} from './terrain-renderer';
import {MAX_IMAGE_BYTES,MAX_IMAGE_PIXELS,MAX_TEXTURE_SIDE,type ImageryManifest,type PreparedImagery} from './imagery';
import {localBytes} from './local-resource';
const files=new Set(['furka-2m.i16','furka-50m.i16','furka-high-overview.jpg','furka-high-detail.jpg','furka-low-overview.jpg','furka-low-detail.jpg','furka-synthetic.gpx']);
declare const __SWISS_PUBLIC__:boolean;
for(const name of ['furka-context-5m.i16','furka-context-50m.i16','furka-context-high-overview.jpg','furka-context-high-detail.jpg','furka-context-low-overview.jpg','furka-context-low-detail.jpg'])files.add(name);
export type SwissCoverage='pilot'|'extended';
export const swissPilotRecord=record;
export const swissContextRecord=context;
export function swissCameraOptions(overview:'reference'|'route'='reference'):TerrainCameraOptions{return{framingBounds:context.cameraReference.bounds,framingReliefMeters:context.cameraReference.reliefMeters,overview,detailSpacingMeters:.5,maximumTexelPixels:2};}
export function validateSwissFrames(r:TerrainRenderer):{frames:number;coverage:'VERIFIED'|'original-pilot';minimumPlaneMarginMeters:number}{
  if(!r.plan.options)return{frames:r.config.durationSeconds*24,coverage:'original-pilot',minimumPlaneMarginMeters:0};
  if(r.terrain.heights.some(h=>h===r.terrain.manifest.noData))throw Error('Неполный DEM: экспорт Swiss остановлен.');
  const u=Math.min(r.width,r.height),screen=[u*.075/r.width,u*.24/r.height,1-u*.075/r.width,1-u*.31/r.height];let margin=Infinity;
  // Continuous flight legs have already been proved by the camera planner.
  // This additionally proves the map-safe ray cone at every encoded timestamp.
  for(let i=0;i<r.config.durationSeconds*24;i++){const pose=getTerrainCameraStateAt(i/24,r.plan),coverage=terrainFrameCoverage(r.terrain,pose,r.width,r.height,screen);if(!coverage.complete)throw Error('Для этого ракурса не доказано полное покрытие карты. Выберите обзорный вариант или Sogne/2D.');margin=Math.min(margin,coverage.minimumMarginMeters);}
  return{frames:r.config.durationSeconds*24,coverage:'VERIFIED',minimumPlaneMarginMeters:margin};
}
async function checked(file:string,bytes:number,sha256:string,limit:number,signal?:AbortSignal){
  if(!files.has(file))throw Error('Непроверенный ресурс Swiss pilot.');
  if(bytes>limit||bytes<1||!/^[a-f0-9]{64}$/.test(sha256))throw Error('Некорректный размер или хеш регионального ресурса.');
  const url=__SWISS_PUBLIC__?`${import.meta.env.BASE_URL}regions/furka/${file}`:`/${file.startsWith('furka-context-')?'__swiss-phase-c':'__swiss-pilot'}/${file}`;
  return localBytes(url,{limit,bytes,sha256,signal,kind:file.endsWith('.jpg')?'image':file.endsWith('.gpx')?'route':'terrain'});
}
export function validateSwissImagery(m:ImageryManifest,coverage:SwissCoverage='pilot'):void{
  const extended=coverage==='extended';
  if(!m||m.id!==(extended?'furka-context-swissimage-2023':'furka-swissimage-2023')||m.schema!==1||!files.has(m.file)||m.file.startsWith('furka-context-')!==extended||!m.file.endsWith('.jpg')||m.origin?.length!==2||m.origin.some((n,i)=>n!==record.terrain.origin[i])||m.attribution!=='© swisstopo · SWISSIMAGE 2023'||m.sourceResolutionMeters!==null||m.bounds?.length!==4||!m.bounds.every(Number.isFinite)||m.bounds[2]<=m.bounds[0]||m.bounds[3]<=m.bounds[1]||m.bounds.some(v=>Math.abs(v)>(extended?1500:500))||![m.width,m.height,m.bytes].every(Number.isSafeInteger)||m.width<2||m.height<2||m.width>MAX_TEXTURE_SIDE||m.height>MAX_TEXTURE_SIDE||m.bytes<1||m.bytes>MAX_IMAGE_BYTES||m.width*m.height>MAX_IMAGE_PIXELS||!Number.isFinite(m.spacingMeters)||m.spacingMeters<.5||m.spacingMeters>10||Math.abs((m.bounds[2]-m.bounds[0])/m.width-m.spacingMeters)>.001||Math.abs((m.bounds[3]-m.bounds[1])/m.height-m.spacingMeters)>.001||!/^[a-f0-9]{64}$/.test(m.sha256))throw Error('Непроверенный снимок Swiss pilot.');
  if(m.detailSelection){const p=m.detailSelection;if(!extended||p.policy!=='projected-ground-texel'||p.fullDetailPixels!==.67||p.coarsePixels!==.3||p.maximumDetailPixels!==2)throw Error('Непроверенная политика масштаба Swiss.');}
  if(m.detail){const d=m.detail;if(d.detail)throw Error('Только два уровня регионального снимка.');validateSwissImagery(d,coverage);if(extended&&!m.detailSelection||d.bounds[0]<m.bounds[0]||d.bounds[1]<m.bounds[1]||d.bounds[2]>m.bounds[2]||d.bounds[3]>m.bounds[3]||m.bytes+d.bytes>MAX_IMAGE_BYTES||m.width*m.height+d.width*d.height>MAX_IMAGE_PIXELS)throw Error('Уровни снимка не совпадают или превышают бюджет.');}
}
export async function loadSwissTerrain(coarse=false,signal?:AbortSignal,coverage:SwissCoverage='pilot'):Promise<TerrainDataset>{
  const manifest=structuredClone((coverage==='extended'?context:record).terrain) as unknown as TerrainManifest,level=manifest.lods[coarse?1:0],bytes=await checked(level.file,level.bytes,level.sha256,1000000,signal);
  return new TerrainDataset(manifest,level,new Int16Array(bytes.buffer));
}
export async function loadSwissImagery(low=false,signal?:AbortSignal,coverage:SwissCoverage='pilot'):Promise<PreparedImagery>{
  const manifest=structuredClone((coverage==='extended'?context:record).imagery[low?'low':'high']) as ImageryManifest;validateSwissImagery(manifest,coverage);
  const decode=async(m:ImageryManifest)=>{
    const bytes=await checked(m.file,m.bytes,m.sha256,MAX_IMAGE_BYTES,signal),b=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}),{imageOrientation:'none',colorSpaceConversion:'none'});
    if(b.width!==m.width||b.height!==m.height||signal?.aborted){b.close();signal?.throwIfAborted();throw Error('Неверные размеры регионального снимка.');}return b;
  };
  const bitmap=await decode(manifest);let detailBitmap:ImageBitmap|undefined;let disposed=false;
  try{detailBitmap=await decode(manifest.detail!);signal?.throwIfAborted();return Object.freeze({manifest,bitmap,detailBitmap,dispose(){if(!disposed){disposed=true;bitmap.close();detailBitmap?.close();}}});}
  catch(e){bitmap.close();detailBitmap?.close();throw e;}
}
export async function loadSwissRoute(signal?:AbortSignal):Promise<string>{const r=record.route;return new TextDecoder('utf-8',{fatal:true}).decode(await checked(r.file,r.bytes,r.sha256,1024*1024,signal));}
