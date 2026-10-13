import type {Route} from './route';
import {TerrainDataset,terrainWorld,type TerrainManifest} from './terrain';
import type {ImageryManifest,PreparedImagery} from './imagery';
import {GeographicError,planGeography,planPoint,type GeographicPlan} from './geographic-plan';
import {GeographicNetwork} from './geographic-network';
import {discoverGeography} from './geographic-discovery';
import {readSourceRaster,rasterSample,type GeographicSource,type SourceRaster} from './geographic-cog';
export interface GeographicEvidence {schema:1;provider:string;photoSources:GeographicSource[];demSources:GeographicSource[];sourceResolutionMeters:10;demResolutionMeters:number;derivedImageSpacingMeters:number;derivedDemSpacingMeters:number;areaKm2:number;downloadBytes:number;requests:number;preparationMs:number;imageBytes:number;imagePixels:number;demVertices:number;imageSha256:string;demSha256:string;snowFraction:number;cloudFraction:number;routeCloudFraction:number;cloudCheck:string;verticalDatum:'EGM2008';}
interface CachedGeography {key:string;terrain:TerrainDataset;image:Blob;manifest:ImageryManifest;evidence:GeographicEvidence}
let cached:CachedGeography|undefined;
let demCache:{key:string;terrain:TerrainDataset}|undefined;
export function clearGeographicCache():void{cached=undefined;demCache=undefined;}
if(typeof window!=='undefined')window.addEventListener('pagehide',clearGeographicCache);
export function geographicEvidence():GeographicEvidence|undefined{return cached?structuredClone(cached.evidence):undefined;}
export async function prepareDiscoveredTerrain(route:Route,signal:AbortSignal,stage:(name:string)=>void):Promise<TerrainDataset>{
 const plan=planGeography(route),key=JSON.stringify(plan);if(demCache?.key===key)return demCache.terrain;
 clearGeographicCache();const net=new GeographicNetwork(signal,stage),sources=await discoverGeography(plan,net,false),dem=await buildCoveringDem(plan,sources.dem,net);signal.throwIfAborted();if(!dem.terrain.routeCoverage(route))throw new GeographicError('dem','DEM не покрывает полный маршрут.');demCache={key,terrain:dem.terrain};return dem.terrain;
}
const digest=async(bytes:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
const yieldToBrowser=async(signal:AbortSignal)=>{await new Promise(resolve=>setTimeout(resolve,0));signal.throwIfAborted();};
export function usableSceneClass(value:number|undefined):boolean{return value!==undefined&&[2,4,5,6,11].includes(value);}
export const demCredit=(resolution:number)=>`produced using Copernicus WorldDEM-${resolution} © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved`;
export function photoCorridorIndices(plan:GeographicPlan,route:Route):Set<number>{
 const {imageWidth:width,imageHeight:height}=plan,corridor=new Set<number>();let samples=0;
 for(const segment of route.segments)for(let i=0;i<segment.length;i++){const a=segment[Math.max(0,i-1)],b=segment[i],from=terrainWorld({origin:plan.origin},a),to=terrainWorld({origin:plan.origin},b),steps=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/Math.min(50,plan.imageSpacing)));for(let j=0;j<=steps;j++){if(++samples>200000)throw new GeographicError('resources','Превышен бюджет проверки облачности вдоль маршрута.');const f=j/steps,x=from[0]+(to[0]-from[0])*f,y=from[1]+(to[1]-from[1])*f,col=Math.floor((x-plan.bounds[0])/(plan.bounds[2]-plan.bounds[0])*width),row=Math.floor((plan.bounds[3]-y)/(plan.bounds[3]-plan.bounds[1])*height);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(col+dx>=0&&col+dx<width&&row+dy>=0&&row+dy<height)corridor.add((row+dy)*width+col+dx);}}
 return corridor;
}
async function buildDem(plan:GeographicPlan,sources:GeographicSource[],net:GeographicNetwork):Promise<{terrain:TerrainDataset;used:GeographicSource[];hash:string}>{
 const heights=new Int16Array(plan.demWidth*plan.demHeight);heights.fill(-32768);let missing=heights.length;const used:GeographicSource[]=[];
 for(const source of sources){net.signal.throwIfAborted();const raster=await readSourceRaster(source,plan,net);if(!raster)continue;let accepted=0;
  try{for(let row=0;row<plan.demHeight;row++){if(row%32===0)await yieldToBrowser(net.signal);for(let column=0;column<plan.demWidth;column++){const index=row*plan.demWidth+column;if(heights[index]!==-32768)continue;const p=planPoint(plan,plan.bounds[0]+column*plan.demSpacing,plan.bounds[1]+row*plan.demSpacing),value=rasterSample(raster,p.lon,p.lat);if(value===undefined||value< -500||value>9000)continue;heights[index]=Math.round(value);missing--;accepted++;}}if(accepted)used.push(source);}finally{await raster.close();}
  if(!missing)break;
 }
 if(missing)throw new GeographicError('dem','DEM не покрывает всю сцену и безопасный коридор камеры. Отсутствующие высоты не заменяются нулями; доступна 2D.');
 const hash=await digest(heights.buffer),level={file:'in-memory/copernicus.i16',spacingMeters:plan.demSpacing,width:plan.demWidth,height:plan.demHeight,bytes:heights.byteLength,sha256:hash,noDataCount:0};
 const manifest:TerrainManifest={id:'discovered-copernicus-dem',origin:plan.origin,westMeters:plan.bounds[0],southMeters:plan.bounds[1],eastMeters:plan.bounds[2],northMeters:plan.bounds[3],lods:[level],noData:-32768,minElevation:Math.min(...heights.subarray(0,1)),maxElevation:0,verticalScale:1,units:'metres',verticalDatum:'EGM2008',sourceCrs:'EPSG:4326 → local metric WGS84',sourceResolutionMeters:sources[0].resolution,attribution:demCredit(sources[0].resolution)};
 let min=Infinity,max=-Infinity;for(const h of heights){min=Math.min(min,h);max=Math.max(max,h);}manifest.minElevation=min;manifest.maxElevation=max;
 return{terrain:new TerrainDataset(manifest,level,heights),used,hash};
}
async function buildCoveringDem(plan:GeographicPlan,sources:GeographicSource[],net:GeographicNetwork){
 try{return await buildDem(plan,sources,net);}catch(error){if(!(error instanceof GeographicError)||error.code!=='dem'||sources[0]?.resolution!==30)throw error;net.signal.throwIfAborted();net.stage('GLO-30 покрывает не всю сцену · проверяем GLO-90');const fallback=await discoverGeography(plan,net,false,90);return buildDem(plan,fallback.dem,net);}
}
async function buildPhoto(plan:GeographicPlan,sources:{photo:GeographicSource;mask:GeographicSource}[],net:GeographicNetwork,route:Route):Promise<{image:Blob;manifest:ImageryManifest;used:GeographicSource[];snowFraction:number;cloudFraction:number;routeCloudFraction:number}>{
 const width=plan.imageWidth,height=plan.imageHeight,rgba=new Uint8ClampedArray(width*height*4),classes=new Uint8Array(width*height),corridor=photoCorridorIndices(plan,route);let missing=width*height;const used:GeographicSource[]=[];
 const cloudAtRoute=()=>[...corridor].reduce((sum,index)=>sum+(usableSceneClass(classes[index])?0:1),0)/Math.max(1,corridor.size),cloudInScene=()=>classes.reduce((sum,c)=>sum+(usableSceneClass(c)?0:1),0)/classes.length;
 for(const source of sources){net.signal.throwIfAborted();let mask:SourceRaster|undefined,photo:SourceRaster|undefined;
  try{mask=await readSourceRaster(source.mask,plan,net);if(!mask)continue;
   // Check actual unfilled destination pixels against SCL before fetching RGB.
   let useful=false;for(let row=0;row<height&&!useful;row+=8)for(let column=0;column<width;column+=8){if(missing>0?rgba[(row*width+column)*4+3]>0:usableSceneClass(classes[row*width+column]))continue;const p=planPoint(plan,plan.bounds[0]+(column+.5)*(plan.bounds[2]-plan.bounds[0])/width,plan.bounds[3]-(row+.5)*(plan.bounds[3]-plan.bounds[1])/height);const c=rasterSample(mask,p.lon,p.lat);if(c!==undefined&&c>=2&&c<=11){useful=true;break;}}
   if(!useful)continue;photo=await readSourceRaster(source.photo,plan,net);if(!photo)continue;let accepted=0;
   for(let row=0;row<height;row++){if(row%32===0)await yieldToBrowser(net.signal);for(let column=0;column<width;column++){const pixel=row*width+column,index=pixel*4;if(usableSceneClass(classes[pixel]))continue;const p=planPoint(plan,plan.bounds[0]+(column+.5)*(plan.bounds[2]-plan.bounds[0])/width,plan.bounds[3]-(row+.5)*(plan.bounds[3]-plan.bounds[1])/height),classification=rasterSample(mask,p.lon,p.lat);if(classification===undefined||classification<2||classification>11||rgba[index+3]&&!usableSceneClass(classification))continue;const r=rasterSample(photo,p.lon,p.lat,0),g=rasterSample(photo,p.lon,p.lat,1),b=rasterSample(photo,p.lon,p.lat,2);if(r===undefined||g===undefined||b===undefined)continue;rgba[index]=r;rgba[index+1]=g;rgba[index+2]=b;if(!rgba[index+3])missing--;rgba[index+3]=255;classes[pixel]=classification;accepted++;}}
   if(accepted)used.push(source.photo);net.stage(`Проверяем покрытие фото · ${Math.floor((1-missing/(width*height))*100)}% подготовленных пикселей`);
  }finally{await photo?.close();await mask?.close();}
  if(!missing&&cloudInScene()<=.02&&cloudAtRoute()<=.01)break;
 }
 if(missing)throw new GeographicError('quality',`Снимки не покрывают ${Math.ceil(missing/(width*height)*100)}% сцены: отсутствующие пиксели не выдумываются. Можно повторить поиск либо открыть рельеф без фотографии / 2D.`);
 const cloudFraction=cloudInScene(),snowFraction=classes.reduce((sum,c)=>sum+(c===11?1:0),0)/classes.length,routeCloudFraction=cloudAtRoute();
 if(cloudFraction>.02||routeCloudFraction>.01)throw new GeographicError('quality',`Слишком много облаков или неопределённых пикселей: ${(routeCloudFraction*100).toFixed(1)}% у маршрута / ${(cloudFraction*100).toFixed(1)}% сцены. Доступен рельеф без фото или 2D.`);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 let image:Blob;
 try{canvas.getContext('2d')!.putImageData(new ImageData(rgba,width,height),0,0);image=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new GeographicError('resources','Не удалось подготовить фотографию.')),'image/jpeg',.88));}finally{canvas.width=canvas.height=0;}
 if(image.size>2*1024*1024)throw new GeographicError('resources','Подготовленная фотография превышает лимит 2 МиБ. Выберите рельеф без фотографии или 2D.');
 const sha256=await digest(await image.arrayBuffer()),years=[...new Set(used.map(s=>s.date.slice(0,4)))].sort().join(', ');
 const manifest:ImageryManifest={schema:1,id:'discovered-sentinel-2',origin:plan.origin,bounds:plan.bounds,width,height,spacingMeters:plan.imageSpacing,file:'in-memory/sentinel.jpg',bytes:image.size,sha256,attribution:`Contains modified Copernicus Sentinel data ${years}`,acquiredDate:[...new Set(used.map(s=>s.date.slice(0,10)))].sort().join(', '),sourceResolutionMeters:10};
 return{image,manifest,used,snowFraction,cloudFraction,routeCloudFraction};
}
/** Only the consented controller invokes this lazy module. One verified RAM
 * entry (≤1MB grid +2MiB JPEG), no route/markers/history/disk cache retained. */
export async function prepareDiscoveredGeography(route:Route,signal:AbortSignal,stage:(name:string)=>void):Promise<{terrain:TerrainDataset;imagery:PreparedImagery;evidence:GeographicEvidence}>{
 stage('Анализируем маршрут · определяем ограниченный охват');const plan=planGeography(route),key=JSON.stringify(plan);const started=performance.now();
 if(cached?.key!==key){if(demCache?.key!==key)clearGeographicCache();const net=new GeographicNetwork(signal,stage),sources=await discoverGeography(plan,net);
  stage('Проверяем качество и DEM · преобразуем координаты');const dem=await buildCoveringDem(plan,sources.dem,net);
  if(!dem.terrain.routeCoverage(route))throw new GeographicError('dem','Маршрут вне полного DEM или превышает бюджет проверки геометрии. GPX не сокращается.');
  signal.throwIfAborted();demCache={key,terrain:dem.terrain};
  const photo=await buildPhoto(plan,sources.photos,net,route);signal.throwIfAborted();
  const evidence:GeographicEvidence={schema:1,provider:'Earth Search Sentinel-2 + Planetary Computer Copernicus DEM',photoSources:photo.used,demSources:dem.used,sourceResolutionMeters:10,demResolutionMeters:dem.terrain.manifest.sourceResolutionMeters,derivedImageSpacingMeters:plan.imageSpacing,derivedDemSpacingMeters:plan.demSpacing,areaKm2:plan.areaKm2,downloadBytes:net.bytes,requests:net.requests,preparationMs:performance.now()-started,imageBytes:photo.image.size,imagePixels:plan.imageWidth*plan.imageHeight,demVertices:plan.demWidth*plan.demHeight,imageSha256:photo.manifest.sha256,demSha256:dem.hash,snowFraction:photo.snowFraction,cloudFraction:photo.cloudFraction,routeCloudFraction:photo.routeCloudFraction,cloudCheck:'SCL at every prepared texel; no-data/saturation rejected, clear classes preferred; ≤2% scene / ≤1% sampled route corridor cloudy or uncertain. Different dates may be mosaicked.',verticalDatum:'EGM2008'};
  cached={key,terrain:dem.terrain,image:photo.image,manifest:photo.manifest,evidence};
 }
 const entry=cached!;stage('Проверяем целостность подготовленной фотографии');
 if(await digest(await entry.image.arrayBuffer())!==entry.manifest.sha256||await digest(entry.terrain.heights.buffer as ArrayBuffer)!==entry.evidence.demSha256)throw new GeographicError('integrity','Повреждены фотография или DEM в памяти.');signal.throwIfAborted();
 const bitmap=await createImageBitmap(entry.image,{imageOrientation:'none',colorSpaceConversion:'none'});if(signal.aborted){bitmap.close();signal.throwIfAborted();}
 if(bitmap.width!==entry.manifest.width||bitmap.height!==entry.manifest.height){bitmap.close();throw new GeographicError('integrity','Размер фотографии не соответствует манифесту.');}
 return{terrain:entry.terrain,imagery:{manifest:Object.freeze(entry.manifest),bitmap,dispose:()=>bitmap.close()},evidence:entry.evidence};
}
