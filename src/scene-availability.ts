import type {Route} from './route';
import {terrainWorld,type TerrainManifest} from './terrain';
import {regionalPackForRoute} from './region-selection';
import sogne from '../data/sogne-coverage.json';
export interface SceneAvailability {region?:'furka'|'sogne';terrain:boolean;photo:boolean;notice?:string}
/** Metadata-only admission. Actual no-data, mesh/LOS and readiness checks still
 * happen in the SAME provider after loading. Never query a service with a GPX. */
export function sceneAvailability(route:Route,swissEnabled:boolean,imageryEnabled:boolean):SceneAvailability {
  const nonempty=route.pointCount>0&&route.segments.length>0&&route.segments.every(s=>s.length>0);
  if(nonempty&&swissEnabled&&regionalPackForRoute(route)==='furka')return{region:'furka',terrain:true,photo:true};
  const m=sogne as unknown as TerrainManifest,cos=Math.cos(m.origin[1]*Math.PI/180),margin=2000;
  const covered=nonempty&&route.segments.every(s=>s.every(p=>{
    const[x,y]=terrainWorld(m,p,cos);return Number.isFinite(x)&&Number.isFinite(y)&&x>=m.westMeters+margin&&x<=m.eastMeters-margin&&y>=m.southMeters+margin&&y<=m.northMeters-margin;
  }));
  if(covered)return{region:'sogne',terrain:true,photo:imageryEnabled,...(!imageryEnabled?{notice:'Фотокарты выбранной местности в этой сборке нет. Доступны DEM и обзорная карта 2D.'}:{})};
  return{terrain:false,photo:false,notice:'Подробной картографической информации выбранной местности нет: фотокарта и DEM недоступны. Доступна обзорная карта 2D.'};
}
