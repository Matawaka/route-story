/** Developer-only fixed regional pack. Not imported by the production entry. */
import record from '../data/swiss-pilot/manifest.json';
import {TerrainDataset,type TerrainManifest} from './terrain';
import {MAX_IMAGE_BYTES,MAX_IMAGE_PIXELS,MAX_TEXTURE_SIDE,type ImageryManifest,type PreparedImagery} from './imagery';
const files=new Set(['furka-2m.i16','furka-50m.i16','furka-high-overview.jpg','furka-high-detail.jpg','furka-low-overview.jpg','furka-low-detail.jpg','furka-synthetic.gpx']);
export const swissPilotRecord=record;
async function resource(file:string,limit:number,signal?:AbortSignal):Promise<Uint8Array<ArrayBuffer>>{
  if(!files.has(file))throw Error('Непроверенный ресурс Swiss pilot.');signal?.throwIfAborted();
  const r=await fetch(`/__swiss-pilot/${file}`,{signal});if(!r.ok||!r.body)throw Error('Швейцарский пакет доступен только в локальном режиме SWISS_PILOT=1 после подготовки данных.');
  const reader=r.body.getReader(),parts:Uint8Array[]=[];let count=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;count+=value.byteLength;if(count>limit)throw Error('Региональный файл превысил лимит.');parts.push(value);}}
  catch(e){await reader.cancel();throw e;}finally{reader.releaseLock();}
  const out=new Uint8Array(count);let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;
}
async function checked(file:string,bytes:number,sha256:string,limit:number,signal?:AbortSignal){
  if(bytes>limit||bytes<1||!/^[a-f0-9]{64}$/.test(sha256))throw Error('Некорректный размер или хеш регионального ресурса.');
  const data=await resource(file,limit,signal),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
  if(data.byteLength!==bytes||hash!==sha256)throw Error('Региональный ресурс повреждён.');signal?.throwIfAborted();return data;
}
export function validateSwissImagery(m:ImageryManifest):void{
  if(m.id!=='furka-swissimage-2023'||m.schema!==1||!files.has(m.file)||!m.file.endsWith('.jpg')||m.origin.some((n,i)=>n!==record.terrain.origin[i])||m.attribution!=='© swisstopo · SWISSIMAGE 2023'||m.sourceResolutionMeters!==.25||!m.bounds.every(Number.isFinite)||m.bounds.length!==4||m.bounds[2]<=m.bounds[0]||m.bounds[3]<=m.bounds[1]||m.bounds.some(v=>Math.abs(v)>500)||![m.width,m.height,m.bytes].every(Number.isSafeInteger)||m.width<2||m.height<2||m.width>MAX_TEXTURE_SIDE||m.height>MAX_TEXTURE_SIDE||m.bytes<1||m.bytes>MAX_IMAGE_BYTES||m.width*m.height>MAX_IMAGE_PIXELS||!Number.isFinite(m.spacingMeters)||m.spacingMeters<.5||m.spacingMeters>10||Math.abs((m.bounds[2]-m.bounds[0])/m.width-m.spacingMeters)>.001||Math.abs((m.bounds[3]-m.bounds[1])/m.height-m.spacingMeters)>.001||!/^[a-f0-9]{64}$/.test(m.sha256))throw Error('Непроверенный снимок Swiss pilot.');
  if(m.detail){const d=m.detail;if(d.detail)throw Error('Только два уровня регионального снимка.');validateSwissImagery(d);if(d.bounds[0]<m.bounds[0]||d.bounds[1]<m.bounds[1]||d.bounds[2]>m.bounds[2]||d.bounds[3]>m.bounds[3]||m.bytes+d.bytes>MAX_IMAGE_BYTES||m.width*m.height+d.width*d.height>MAX_IMAGE_PIXELS)throw Error('Уровни снимка не совпадают или превышают бюджет.');}
}
export async function loadSwissTerrain(coarse=false,signal?:AbortSignal):Promise<TerrainDataset>{
  const manifest=structuredClone(record.terrain) as unknown as TerrainManifest,level=manifest.lods[coarse?1:0],bytes=await checked(level.file,level.bytes,level.sha256,1000000,signal);
  return new TerrainDataset(manifest,level,new Int16Array(bytes.buffer));
}
export async function loadSwissImagery(low=false,signal?:AbortSignal):Promise<PreparedImagery>{
  const manifest=structuredClone(record.imagery[low?'low':'high']) as ImageryManifest;validateSwissImagery(manifest);
  const decode=async(m:ImageryManifest)=>{
    const bytes=await checked(m.file,m.bytes,m.sha256,MAX_IMAGE_BYTES,signal),b=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}),{imageOrientation:'none',colorSpaceConversion:'none'});
    if(b.width!==m.width||b.height!==m.height||signal?.aborted){b.close();signal?.throwIfAborted();throw Error('Неверные размеры регионального снимка.');}return b;
  };
  const bitmap=await decode(manifest);let detailBitmap:ImageBitmap|undefined;let disposed=false;
  try{detailBitmap=await decode(manifest.detail!);signal?.throwIfAborted();return Object.freeze({manifest,bitmap,detailBitmap,dispose(){if(!disposed){disposed=true;bitmap.close();detailBitmap?.close();}}});}
  catch(e){bitmap.close();detailBitmap?.close();throw e;}
}
export async function loadSwissRoute(signal?:AbortSignal):Promise<string>{const r=record.route;return new TextDecoder('utf-8',{fatal:true}).decode(await checked(r.file,r.bytes,r.sha256,1024*1024,signal));}
