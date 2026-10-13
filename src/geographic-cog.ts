import {fromCustomClient,BaseClient,BaseResponse,type GeoTIFF} from 'geotiff';
import proj4 from 'proj4';
import {GeographicNetwork,geographicUrl} from './geographic-network';
import {GeographicError,type GeographicPlan,planPoint} from './geographic-plan';
export interface GeographicSource {id:string;href:string;epsg:number;kind:'photo'|'mask'|'dem';date:string;resolution:number;cloud?:number}
class RangeClient extends BaseClient {
 constructor(url:string,private net:GeographicNetwork){super(url);}
 async request(options:RequestInit={}){
  const range=new Headers(options.headers).get('range')?.match(/^bytes=(\d+)-(\d+)$/);if(!range)throw new GeographicError('source','GeoTIFF требует ограниченный запрос фрагмента.');
  const r=await this.net.bytesFrom(this.url,[Number(range[1]),Number(range[2])]);
  return new class extends BaseResponse {get status(){return r.status;}getHeader(n:string){return r.headers.get(n)??undefined;}async getData(){return r.bytes.buffer as ArrayBuffer;}}();
 }
}
export function sourceProjection(epsg:number):(lon:number,lat:number)=>[number,number]{
 if(epsg===4326)return(lon,lat)=>[lon,lat];
 const north=epsg>=32601&&epsg<=32660,south=epsg>=32701&&epsg<=32760;if(!north&&!south)throw new GeographicError('crs','Система координат источника не поддерживается. Исходный GPX не изменяется.');
 const projection=proj4('EPSG:4326',`+proj=utm +zone=${epsg%100} ${south?'+south ':''}+datum=WGS84 +units=m +no_defs`);
 return(lon,lat)=>projection.forward([lon,lat]) as [number,number];
}
export interface SourceRaster {source:GeographicSource;box:number[];width:number;height:number;samples:number;values:ArrayLike<number>;noData:number|null;project:(lon:number,lat:number)=>[number,number];close:()=>Promise<void>}
/** Select an actual COG overview before decoding; never inflate a full native
 * 110km tile into memory. Sequential source preparation, no worker/frame cache. */
export async function readSourceRaster(source:GeographicSource,plan:GeographicPlan,net:GeographicNetwork):Promise<SourceRaster|undefined>{
 let href=source.href;if(geographicUrl(href).search)throw new GeographicError('source','В исходных метаданных не допускаются приватные токены.');
 if(source.kind==='dem'){
  const signed=await net.json<{href:string}>('https://planetarycomputer.microsoft.com/api/sas/v1/sign?href='+encodeURIComponent(href));
  const u=geographicUrl(signed.href);if(u.origin!==new URL(href).origin||u.pathname!==new URL(href).pathname)throw new GeographicError('source','Источник изменил адрес DEM.');href=signed.href;
 }
 let tiff:GeoTIFF|undefined;
 try{
  const remoteOptions={allowFullFile:false,blockSize:16384,cacheSize:32};
  tiff=await fromCustomClient(new RangeClient(href,net),remoteOptions,net.signal);
  const base=await tiff.getImage();const keys=base.getGeoKeys(),epsg=keys?.ProjectedCSTypeGeoKey??keys?.GeographicTypeGeoKey;
  if(epsg!==source.epsg||base.getWidth()>30000||base.getHeight()>30000||base.getSamplesPerPixel()!==(source.kind==='photo'?3:1)||!base.isTiled)throw new GeographicError('integrity','Размер, каналы или CRS GeoTIFF не соответствуют проверенному источнику.');
  const project=sourceProjection(source.epsg),corners:number[][]=[];
  for(let i=0;i<=16;i++){const f=i/16;for(const xy of [[plan.bounds[0]+(plan.bounds[2]-plan.bounds[0])*f,plan.bounds[1]],[plan.bounds[0]+(plan.bounds[2]-plan.bounds[0])*f,plan.bounds[3]],[plan.bounds[0],plan.bounds[1]+(plan.bounds[3]-plan.bounds[1])*f],[plan.bounds[2],plan.bounds[1]+(plan.bounds[3]-plan.bounds[1])*f]]){const p=planPoint(plan,xy[0],xy[1]);corners.push(project(p.lon,p.lat));}}
  const baseOrigin=base.getOrigin(),baseResolution=base.getResolution(),pointRaster=keys?.GTRasterTypeGeoKey===2;
  const bits=base.fileDirectory.getValue('BitsPerSample') as number[]|undefined;
  if(!bits||bits.length!==base.getSamplesPerPixel()||bits.some(n=>source.kind==='dem'?![16,32].includes(n):n!==8)||source.kind!=='dem'&&(source.epsg===4326||Math.abs(baseResolution[0]-source.resolution)>.01))throw new GeographicError('integrity','Разрядность или реальное разрешение источника не соответствуют проверенным данным.');
  const ox=baseOrigin[0]-(pointRaster?baseResolution[0]/2:0),oy=baseOrigin[1]-(pointRaster?baseResolution[1]/2:0);
  const bb=[ox,oy+base.getHeight()*baseResolution[1],ox+base.getWidth()*baseResolution[0],oy],box=[Math.max(bb[0],Math.min(...corners.map(p=>p[0]))),Math.max(bb[1],Math.min(...corners.map(p=>p[1]))),Math.min(bb[2],Math.max(...corners.map(p=>p[0]))),Math.min(bb[3],Math.max(...corners.map(p=>p[1])))];
  if(box[0]>=box[2]||box[1]>=box[3]){await tiff.close();return;}
  const desired=source.kind==='dem'?plan.demSpacing:source.kind==='mask'?Math.max(20,plan.imageSpacing):plan.imageSpacing;
  const metresPerUnit=source.epsg===4326?111195:1,rx=desired/metresPerUnit/(source.epsg===4326?Math.cos(plan.origin[1]*Math.PI/180):1),ry=desired/metresPerUnit;
  let image=base;const count=await tiff.getImageCount();if(count>12)throw new GeographicError('resources','GeoTIFF содержит слишком много уровней.');
  for(let i=1;i<count;i++){const candidate=await tiff.getImage(i),res=candidate.getResolution(base);if(Math.abs(res[0])<=rx*1.1&&Math.abs(res[1])<=ry*1.1)image=candidate;}
  const [sx,sy]=image.getResolution(base);
  if(sx<=0||sy>=0||image.getTileWidth()>1024||image.getTileHeight()>1024)throw new GeographicError('integrity','Неподдерживаемая ориентация или размер блока GeoTIFF.');
  const window=[Math.max(0,Math.floor((box[0]-ox)/sx)),Math.max(0,Math.floor((box[3]-oy)/sy)),Math.min(image.getWidth(),Math.ceil((box[2]-ox)/sx)),Math.min(image.getHeight(),Math.ceil((box[1]-oy)/sy))];
  const sourcePixels=(window[2]-window[0])*(window[3]-window[1]);if(sourcePixels>8000000)throw new GeographicError('resources','Фрагмент GeoTIFF слишком велик для браузерного декодирования. Выберите 2D.');
  const width=Math.max(2,Math.ceil((box[2]-box[0])/rx)),height=Math.max(2,Math.ceil((box[3]-box[1])/ry));if(width*height>3000000)throw new GeographicError('resources','Декодированный фрагмент превышает лимит пикселей.');
  net.stage(`Загружаем ${source.kind==='dem'?'DEM':source.kind==='mask'?'маску облаков':'фотографию'} · ${source.id} · получено ${(net.bytes/1048576).toFixed(1)} МиБ`);
  const values=await image.readRasters({window,width,height,interleave:true,resampleMethod:source.kind==='mask'?'nearest':'bilinear',signal:net.signal});
  const actualBox=[ox+window[0]*sx,oy+window[3]*sy,ox+window[2]*sx,oy+window[1]*sy];
  return{source,box:actualBox,width,height,samples:source.kind==='photo'?3:1,values,noData:base.getGDALNoData(),project,close:async()=>{await tiff!.close();}};
 }catch(e){await tiff?.close();if(net.lastError)throw net.lastError;net.signal.throwIfAborted();throw e;}
}
export function rasterSample(r:SourceRaster,lon:number,lat:number,sample=0):number|undefined {
 const [east,north]=r.project(lon,lat),b=r.box;if(east<b[0]||east>=b[2]||north<b[1]||north>=b[3])return;
 const x=Math.min(r.width-1,Math.max(0,Math.floor((east-b[0])/(b[2]-b[0])*r.width))),y=Math.min(r.height-1,Math.max(0,Math.floor((b[3]-north)/(b[3]-b[1])*r.height))),value=r.values[(y*r.width+x)*r.samples+sample];
 return Number.isFinite(value)&&(r.source.kind==='photo'||value!==r.noData)?value:undefined;
}
