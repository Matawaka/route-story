import {GeographicError} from './geographic-plan';
export const GEOGRAPHIC_ORIGINS=['https://earth-search.aws.element84.com','https://planetarycomputer.microsoft.com','https://sentinel-cogs.s3.us-west-2.amazonaws.com','https://elevationeuwest.blob.core.windows.net'] as const;
export function geographicUrl(value:string):URL {
 const u=new URL(value);if(!GEOGRAPHIC_ORIGINS.includes(u.origin as typeof GEOGRAPHIC_ORIGINS[number])||u.username||u.password||u.hash)throw new GeographicError('source','Источник данных не входит в проверенный список.');
 const valid=u.origin===GEOGRAPHIC_ORIGINS[0]?/^\/v1\/search$/.test(u.pathname):u.origin===GEOGRAPHIC_ORIGINS[1]?/^\/api\/(stac\/v1\/search|sas\/v1\/sign)$/.test(u.pathname):u.origin===GEOGRAPHIC_ORIGINS[2]?/^\/sentinel-s2-l2a-cogs\/[\w/.-]+\/(TCI|SCL)\.tif$/.test(u.pathname):/^\/copernicus-dem\/[\w/.-]+\.tif$/.test(u.pathname);
 if(!valid)throw new GeographicError('source','Неподтверждённый путь географического источника.');return u;
}
/** No disk cache, credentials, GPX, labels or filename. Two concurrent range
 * requests; finite transfer/request/deadline limits shared by one preparation. */
export class GeographicNetwork {
 bytes=0;requests=0;private active=0;private waiting:(()=>void)[]=[];readonly started=performance.now();
 constructor(readonly signal:AbortSignal,readonly stage:(text:string)=>void){}
 async bytesFrom(url:string,range?:readonly [number,number]):Promise<{bytes:Uint8Array;headers:Headers;status:number}>{
  geographicUrl(url);this.signal.throwIfAborted();if(performance.now()-this.started>180000||++this.requests>1200)throw new GeographicError('timeout','Подготовка географии превысила ограничение времени или запросов. Можно повторить или открыть 2D.');
  if(range&&(!range.every(Number.isSafeInteger)||range[0]<0||range[1]<range[0]||range[1]-range[0]+1>8*1024*1024))throw new GeographicError('resources','Фрагмент исходного файла превышает безопасный размер.');
  if(this.active>=2)await new Promise<void>((resolve,reject)=>{const done=()=>{this.signal.removeEventListener('abort',cancel);resolve();},cancel=()=>{this.waiting=this.waiting.filter(f=>f!==done);reject(this.signal.reason);};this.waiting.push(done);this.signal.addEventListener('abort',cancel,{once:true});});
  this.signal.throwIfAborted();this.active++;
  const combined=AbortSignal.any([this.signal,AbortSignal.timeout(30000)]);let response:Response|undefined;
  try{
   response=await fetch(url,{headers:range?{Range:`bytes=${range[0]}-${range[1]}`}:{},signal:combined,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store'});
   if(!response.ok||range&&response.status!==206)throw new GeographicError(response.status===401||response.status===403?'auth':'source',range&&response.status===200?'Источник не поддерживает чтение фрагментов. Полный огромный GeoTIFF не скачивается.':`Географический источник недоступен (HTTP ${response.status}). Можно повторить или выбрать 2D.`);
   const max=range?range[1]-range[0]+1:2*1024*1024,declared=Number(response.headers.get('content-length'));if(declared>max)throw new GeographicError('resources','Ответ источника превышает безопасный размер.');
   const reader=response.body!.getReader(),parts:Uint8Array[]=[];let size=0;
   try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;this.bytes+=chunk.value.length;if(size>max||this.bytes>64*1024*1024)throw new GeographicError('resources','Достигнут лимит загрузки географии 64 МиБ. Маршрут доступен в 2D.');parts.push(chunk.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   if(range&&size!==max)throw new GeographicError('integrity','Источник вернул неполный фрагмент GeoTIFF.');
   const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}return{bytes,headers:response.headers,status:response.status};
  }catch(e){this.signal.throwIfAborted();if(e instanceof GeographicError)throw e;throw new GeographicError(combined.aborted?'timeout':'network',combined.aborted?'Слишком долгая загрузка географических данных. Можно повторить.':'Не удалось получить географические данные. Проверьте соединение; источник может блокировать доступ из браузера.');}
  finally{await response?.body?.cancel().catch(()=>{});this.active--;this.waiting.shift()?.();}
 }
 async json<T>(url:string):Promise<T>{const r=await this.bytesFrom(url);try{return JSON.parse(new TextDecoder().decode(r.bytes)) as T;}catch{throw new GeographicError('integrity','Повреждены метаданные источника.');}}
}
