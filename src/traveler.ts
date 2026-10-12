import { MarkerAsset, prepareCustomMarker } from './marker';
export const TRAVELER_SHA256='eb39e771f2fab21c7607b9d863c3d4a2b8b8275e2f5df772e7036e7d15e01fd6';
let asset:MarkerAsset|undefined,pending:Promise<MarkerAsset>|undefined,unloading=false;
/** Fixed first-party versioned resource. Never a user URL. All renderers clone
 * the ready raster before exposing preview/export; no encoding-time fetch. */
export function loadTraveler():Promise<MarkerAsset>{
  if(asset)return Promise.resolve(asset);if(pending)return pending;
  pending=(async()=>{
    const response=await fetch(`${import.meta.env.BASE_URL}markers/traveler-euc-256.png`);
    if(!response.ok)throw Error('Картинка путешественника недоступна. Выберите точку.');
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength!==76427||Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')!==TRAVELER_SHA256)throw Error('Картинка путешественника повреждена. Выберите точку.');
    const prepared=await prepareCustomMarker(new File([bytes],'traveler.png',{type:'image/png'}));
    if(unloading){prepared.dispose();throw Error('Страница закрыта.');}asset=prepared;return prepared;
  })().catch(error=>{pending=undefined;throw error;});return pending;
}
export function disposeTraveler():void{unloading=true;asset?.dispose();asset=undefined;pending=undefined;}
