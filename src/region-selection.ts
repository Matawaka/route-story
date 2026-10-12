import type {Route} from './route';
/** Fixed public pack discovery runs locally. No coordinate or GPX is sent to a service.
 * Furka's tested camera corridor is smaller than its 3km surrounding photograph.
 * Exact projection/height/camera checks still follow before preview/export. */
export function regionalPackForRoute(route:Route):'furka'|undefined{
  if(route.pointCount<1)return;
  return route.segments.every(s=>s.every(p=>Number.isFinite(p.lon)&&Number.isFinite(p.lat)&&p.lon>=8.350&&p.lon<=8.363&&p.lat>=46.5610&&p.lat<=46.5690))?'furka':undefined;
}
