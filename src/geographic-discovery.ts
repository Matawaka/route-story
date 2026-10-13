import {GeographicNetwork} from './geographic-network';
import type {GeographicPlan} from './geographic-plan';
import {GeographicError} from './geographic-plan';
import type {GeographicSource} from './geographic-cog';
interface Item {id:string;properties:Record<string,unknown>;assets:Record<string,{href:string}>}
interface Items {features:Item[]}
export interface GeographicCandidates {photos:{photo:GeographicSource;mask:GeographicSource}[];dem:GeographicSource[];demResolution:number}
export async function discoverGeography(plan:GeographicPlan,net:GeographicNetwork):Promise<GeographicCandidates>{
 const photoItems=new Map<string,Item>(),demItems=new Map<string,Item>();
 const year=new Date().getUTCFullYear()-1,season=plan.origin[1]>=0?`${year}-05-01T00:00:00Z/${year}-10-01T00:00:00Z`:`${year}-01-01T00:00:00Z/${year}-04-01T00:00:00Z`;
 net.stage('Ищем доступные фотографии · Sentinel-2 / Earth Search');
 for(const box of plan.searchBoxes){
  const url=new URL('https://earth-search.aws.element84.com/v1/search');url.searchParams.set('collections','sentinel-2-l2a');url.searchParams.set('bbox',box.join(','));url.searchParams.set('datetime',season);url.searchParams.set('limit','100');url.searchParams.set('query',JSON.stringify({'eo:cloud_cover':{lt:20}}));
  const data=await net.json<Items>(url.href);if(!Array.isArray(data.features)||data.features.length>100)throw new GeographicError('integrity','Неправильный ответ каталога снимков.');for(const item of data.features)photoItems.set(item.id,item);
 }
 const sorted=[...photoItems.values()].filter(i=>i.assets.visual&&i.assets.scl&&Number.isFinite(i.properties['eo:cloud_cover'])).sort((a,b)=>Number(a.properties['eo:cloud_cover'])-Number(b.properties['eo:cloud_cover']));
 // At most three observations per MGRS footprint; crop quality, not scene cloud
 // percentage alone, decides acceptance. No unlimited pagination or retries.
 const footprints=new Map<string,number>(),photos:GeographicCandidates['photos']=[];
 for(const i of sorted){const grid=i.id.match(/_(\d{2}[A-Z]{3})_/)?.[1];if(!grid||(footprints.get(grid)??0)>=3)continue;footprints.set(grid,(footprints.get(grid)??0)+1);
  const epsg=Number(i.properties['proj:epsg']),date=String(i.properties.datetime);if(!/^(19|20)\d{2}-\d\d-\d\dT/.test(date))continue;
  const common={id:i.id,epsg,date,cloud:Number(i.properties['eo:cloud_cover'])};photos.push({photo:{...common,kind:'photo',href:i.assets.visual.href,resolution:10},mask:{...common,kind:'mask',href:i.assets.scl.href,resolution:20}});
  if(photos.length===12)break;
 }
 if(!photos.length)throw new GeographicError('coverage','В открытом каталоге нет подходящих снимков за выбранный сезон. Можно повторить или выбрать 2D.');
 net.stage('Проверяем совместимый DEM · Copernicus / Planetary Computer');
 let demResolution=30;
 for(const resolution of [30,90]){
  for(const box of plan.searchBoxes){const u=new URL('https://planetarycomputer.microsoft.com/api/stac/v1/search');u.searchParams.set('collections',`cop-dem-glo-${resolution}`);u.searchParams.set('bbox',box.join(','));u.searchParams.set('limit','24');const items=await net.json<Items>(u.href);if(!Array.isArray(items.features)||items.features.length>24)throw new GeographicError('integrity','Неправильный ответ каталога DEM.');for(const i of items.features)if(i.assets.data)demItems.set(i.id,i);}
  if(demItems.size){demResolution=resolution;break;}
 }
 if(!demItems.size||demItems.size>16)throw new GeographicError('dem','Совместимый открытый DEM не найден или покрытие слишком велико. Выберите 2D.');
 const dem=[...demItems.values()].map(i=>({id:i.id,href:i.assets.data.href,epsg:4326,kind:'dem' as const,date:String(i.properties.datetime),resolution:demResolution}));
 return{photos,dem,demResolution};
}
