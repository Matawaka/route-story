import {loadSwissTerrain,loadSwissImagery,loadSwissRoute} from './swiss-pilot';
import {loadTraveler,disposeTraveler} from './traveler';
import {parseGpx} from './gpx';
import {TerrainRenderer} from './terrain-renderer';
import {defaultStoryConfig,exportSettings} from './story';
import {detectEncoder,exportVideo} from './exporter';
const element=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const c=element<HTMLCanvasElement>('preview'),seek=element<HTMLInputElement>('seek'),status=element('status'),button=element<HTMLButtonElement>('export'),cancel=element<HTMLButtonElement>('cancel');
let renderer:TerrainRenderer|undefined,abort:AbortController|undefined,playing=false,last=0,serial=0,unloaded=false;
const controls=Array.from(document.querySelectorAll<HTMLSelectElement|HTMLButtonElement|HTMLInputElement>('select,button,input'));
async function configure(){
  const token=++serial;playing=false;button.disabled=true;status.textContent='Проверка хешей, декодирование двух снимков и подготовка GPU…';
  let imagery:Awaited<ReturnType<typeof loadSwissImagery>>|undefined;
  try{
    const config={...defaultStoryConfig('Синтетическое демо · Фурка'),qualityPreset:'standard' as const,cameraMode:'terrain' as const,terrainSurface:'photo' as const,terrainFlight:'corridor' as const,marker:'traveler' as const,markerSize:'small' as const,visualStyle:element<HTMLSelectElement>('style').value as 'atlas'|'night',aspectRatio:element<HTMLSelectElement>('aspect').value as 'landscape'|'portrait'};
    const terrain=await loadSwissTerrain(element<HTMLSelectElement>('dem').value==='coarse');imagery=await loadSwissImagery(element<HTMLSelectElement>('detail').value==='low');const route=parseGpx(await loadSwissRoute()),traveler=await loadTraveler(),s=exportSettings(config);
    if(unloaded||token!==serial){imagery.dispose();return;}
    const next=new TerrainRenderer(route,terrain,s.width,s.height,config,imagery,traveler);imagery=undefined;renderer?.dispose();renderer=next;renderer.draw(c,Number(seek.value));
    try{await detectEncoder(s.width,s.height,s.bitrate,s.fps);if(token===serial){button.disabled=false;status.textContent='Готово. Синтетическое демо · © swisstopo · Шах - вкрутанидзе';}}
    catch(e){status.textContent=`Предпросмотр работает. ${(e as Error).message}`;}
  }catch(e){imagery?.dispose();status.textContent=(e as Error).message;}
}
for(const control of document.querySelectorAll('select'))control.addEventListener('change',configure);
seek.addEventListener('input',()=>{playing=false;renderer?.draw(c,Number(seek.value));});
element('play').addEventListener('click',()=>{playing=!playing;if(Number(seek.value)>=20)seek.value='0';last=performance.now();});
function tick(now:number){if(playing&&renderer){seek.value=String(Math.min(20,Number(seek.value)+(now-last)/1000));renderer.draw(c,Number(seek.value));if(Number(seek.value)>=20)playing=false;}last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
button.addEventListener('click',async()=>{
  if(!renderer||abort)return;playing=false;const snapshot=renderer;abort=new AbortController();controls.forEach(c=>c.disabled=true);cancel.disabled=false;
  try{const blob=await exportVideo({config:snapshot.config,signal:abort.signal,draw:(c,t)=>snapshot.draw(c,t),onProgress:p=>{status.textContent=`Экспорт: ${Math.round(p*100)}%`;}});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`swiss-furka-${snapshot.config.visualStyle}-${snapshot.config.aspectRatio}-20s.mp4`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='MP4 создан локально.';}
  catch(e){status.textContent=(e as Error).name==='AbortError'?'Экспорт отменён. Можно повторить.':(e as Error).message;}
  finally{abort=undefined;controls.forEach(c=>c.disabled=false);cancel.disabled=true;}
});
cancel.addEventListener('click',()=>abort?.abort());window.addEventListener('pagehide',()=>{unloaded=true;++serial;playing=false;abort?.abort();renderer?.dispose();renderer=undefined;disposeTraveler();});void configure();
