import type {RoutePoint} from './route';
export interface RegionalProjection {
  crs:'EPSG:2056'; verticalDatum:'LN02'; originLV95:number[]; originWgs84:number[];
  domainMeters:number[]; forwardCoefficients:number[][]; inverseCoefficients:number[][];
  normalizationDegrees:number; normalizationMeters:number; maximumFitErrorMeters:number;
}
export function validateRegionalProjection(p:RegionalProjection,origin:readonly number[]):void {
  const pair=(a:number[],length:number)=>Array.isArray(a)&&a.length===length&&a.every(Number.isFinite);
  if(!p||p.crs!=='EPSG:2056'||p.verticalDatum!=='LN02'||!pair(p.originLV95,2)||!pair(p.originWgs84,2)||!pair(p.domainMeters,4)||p.normalizationDegrees!==.01||p.normalizationMeters!==1000||!Number.isFinite(p.maximumFitErrorMeters)||p.maximumFitErrorMeters<0||p.maximumFitErrorMeters>.001||p.originWgs84.some((v,i)=>v!==origin[i])||p.originLV95[0]<2400000||p.originLV95[0]>2900000||p.originLV95[1]<1000000||p.originLV95[1]>1400000||p.domainMeters[2]-p.domainMeters[0]>2000||p.domainMeters[3]-p.domainMeters[1]>2000||p.domainMeters[2]<=p.domainMeters[0]||p.domainMeters[3]<=p.domainMeters[1]||p.domainMeters.some(v=>Math.abs(v)>2000))throw Error('Непроверенная региональная проекция LV95.');
  for(const [c,limit] of [[p.forwardCoefficients,5000],[p.inverseCoefficients,1]] as const)if(!Array.isArray(c)||c.length!==2||c.some(row=>!pair(row,10)||row.some(v=>Math.abs(v)>limit)))throw Error('Некорректные коэффициенты региональной проекции.');
}
const basis=(x:number,y:number)=>[1,x,y,x*x,x*y,y*y,x*x*x,x*x*y,x*y*y,y*y*y];
const evaluate=(c:number[][],x:number,y:number):[number,number]=>{const b=basis(x,y);return c.map(row=>row.reduce((n,v,i)=>n+v*b[i],0)) as [number,number];};
/** Pinned PROJ operation fitted only over the reviewed 1km scene. The fit's
 * numerical error is distinct from PROJ's 1m stated geodetic accuracy. */
export function regionalWorld(p:RegionalProjection,point:RoutePoint):[number,number]{
  if(!Number.isFinite(point.lon)||!Number.isFinite(point.lat))throw Error('Некорректные координаты GPX.');
  const x=(point.lon-p.originWgs84[0])/.01,y=(point.lat-p.originWgs84[1])/.01;
  if(Math.abs(x)>1||Math.abs(y)>1)throw Error('GPX вне ограниченной региональной проекции.');
  const result=evaluate(p.forwardCoefficients,x,y),b=p.domainMeters;
  // Millimetre allowance covers the declared PROJ forward/inverse round trip,
  // not extrapolation to another tile or a transplanted GPX.
  if(result[0]<b[0]-.003||result[1]<b[1]-.003||result[0]>b[2]+.003||result[1]>b[3]+.003)throw Error('GPX вне проверенного регионального преобразования.');
  return result;
}
export function regionalGeographic(p:RegionalProjection,xy:readonly number[]):RoutePoint{
  if(xy.length!==2||xy.some(v=>!Number.isFinite(v))||xy[0]<p.domainMeters[0]||xy[1]<p.domainMeters[1]||xy[0]>p.domainMeters[2]||xy[1]>p.domainMeters[3])throw Error('Координаты вне регионального преобразования.');
  const [lon,lat]=evaluate(p.inverseCoefficients,xy[0]/1000,xy[1]/1000);return{lon:lon+p.originWgs84[0],lat:lat+p.originWgs84[1]};
}
