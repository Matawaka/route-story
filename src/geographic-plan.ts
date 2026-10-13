import type {Route,RoutePoint} from './route';
import {wrapDelta} from './geo';
import {terrainWorld} from './terrain';
export class GeographicError extends Error { constructor(readonly code:string,message:string){super(message);this.name='GeographicError';} }
export interface GeographicPlan { origin:[number,number];bounds:[number,number,number,number];searchBoxes:readonly (readonly number[])[];demSpacing:number;imageSpacing:number;demWidth:number;demHeight:number;imageWidth:number;imageHeight:number;areaKm2:number }
const R=6371008.8,rad=Math.PI/180;
/** Finite regional scenes, never a world rectangle across the antimeridian.
 * Distant disconnected segments fail explicitly rather than downloading the gap.
 * A shared overview fits within the existing mesh/texture budgets. */
export function planGeography(route:Route):GeographicPlan {
 const points=route.segments.flat();if(!points.length||points.length>50000)throw new GeographicError('resources','Маршрут превышает лимит географической подготовки. Доступна 2D-карта без сокращения GPX.');
 const first=points[0].lon;let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
 for(const p of points){if(!Number.isFinite(p.lon)||!Number.isFinite(p.lat)||Math.abs(p.lat)>75)throw new GeographicError('coverage','Автоматическая фотокарта пока доступна между 75° ю. ш. и 75° с. ш. Выберите 2D.');const x=first+wrapDelta(p.lon-first);west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,p.lat);north=Math.max(north,p.lat);}
 const origin:[number,number]=[wrapDelta((west+east)/2),(south+north)/2];
 const a=terrainWorld({origin},{lon:west,lat:south}),b=terrainWorld({origin},{lon:east,lat:north});
 const span=Math.max(b[0]-a[0],b[1]-a[1]);if(span>55000)throw new GeographicError('resources','Географический охват маршрута больше 55 км. Подготовка такой сцены превышает текущий бюджет; GPX целиком доступен в 2D.');
 const margin=Math.max(6000,Math.hypot(b[0]-a[0],b[1]-a[1])*.28);
 const demSpacing=Math.max(30,Math.ceil((span+2*margin)/600/10)*10);
 const bounds:[number,number,number,number]=[Math.floor((a[0]-margin)/demSpacing)*demSpacing,Math.floor((a[1]-margin)/demSpacing)*demSpacing,Math.ceil((b[0]+margin)/demSpacing)*demSpacing,Math.ceil((b[1]+margin)/demSpacing)*demSpacing];
 const dx=bounds[2]-bounds[0],dy=bounds[3]-bounds[1],imageSpacing=Math.max(10,Math.ceil(Math.max(dx,dy)/1500/10)*10);
 const demWidth=Math.round(dx/demSpacing)+1,demHeight=Math.round(dy/demSpacing)+1,imageWidth=Math.ceil(dx/imageSpacing),imageHeight=Math.ceil(dy/imageSpacing);
 if(demWidth*demHeight>500000||demWidth*demHeight*2>1000000||imageWidth*imageHeight>3000000||imageWidth>2048||imageHeight>2048)throw new GeographicError('resources','Сцена не помещается в безопасный бюджет устройства. Выберите 2D.');
 // 0.1° outward rounding: providers receive broad search areas, no route points.
 const lat0=Math.floor((origin[1]+bounds[1]/R/rad)*10)/10,lat1=Math.ceil((origin[1]+bounds[3]/R/rad)*10)/10;
 const lon0=Math.floor((origin[0]+bounds[0]/R/rad/Math.cos(origin[1]*rad))*10)/10,lon1=Math.ceil((origin[0]+bounds[2]/R/rad/Math.cos(origin[1]*rad))*10)/10;
 const searchBoxes=lon0< -180?[[lon0+360,lat0,180,lat1],[-180,lat0,lon1,lat1]]:lon1>180?[[lon0,lat0,180,lat1],[-180,lat0,lon1-360,lat1]]:[[lon0,lat0,lon1,lat1]];
 return{origin,bounds,searchBoxes,demSpacing,imageSpacing,demWidth,demHeight,imageWidth,imageHeight,areaKm2:dx*dy/1e6};
}
export function planPoint(plan:GeographicPlan,x:number,y:number):RoutePoint{return{lon:wrapDelta(plan.origin[0]+x/R/rad/Math.cos(plan.origin[1]*rad)),lat:plan.origin[1]+y/R/rad};}
