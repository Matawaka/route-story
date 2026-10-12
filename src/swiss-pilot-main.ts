import {loadSwissTerrain,loadSwissImagery,loadSwissRoute,swissCameraOptions,validateSwissFrames,type SwissCoverage} from './swiss-pilot';
import {loadTraveler,disposeTraveler} from './traveler';
import {prepareCustomMarker,type MarkerAsset} from './marker';
import {parseGpx} from './gpx';
import {TerrainRenderer} from './terrain-renderer';
import {defaultStoryConfig,exportSettings,type StoryConfig} from './story';
import {detectEncoder,exportVideo} from './exporter';
const element=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const c=element<HTMLCanvasElement>('preview'),seek=element<HTMLInputElement>('seek'),status=element('status'),button=element<HTMLButtonElement>('export'),cancel=element<HTMLButtonElement>('cancel'),file=element<HTMLInputElement>('marker-file');
let renderer:TerrainRenderer|undefined,abort:AbortController|undefined,preparation:AbortController|undefined,custom:MarkerAsset|undefined,playing=false,last=0,serial=0,markerSerial=0,unloaded=false;
const controls=Array.from(document.querySelectorAll<HTMLSelectElement|HTMLButtonElement|HTMLInputElement>('select,button,input'));
const seconds=()=>Number(element<HTMLSelectElement>('duration').value);
function failure(error:unknown){playing=false;button.disabled=true;status.textContent=`${(error as Error).message} Предпросмотр/экспорт Sogne и 2D доступны по ссылке ниже.`;}
async function configure(){
  if(abort||unloaded)return;
  const token=++serial;preparation?.abort();preparation=new AbortController();const signal=preparation.signal;playing=false;button.disabled=true;status.textContent='Проверка хешей, двух снимков, GPU и покрытия всех кадров…';
  let image:Awaited<ReturnType<typeof loadSwissImagery>>|undefined;
  try{
    const coverage=element<HTMLSelectElement>('coverage').value as SwissCoverage,duration=seconds();seek.max=String(duration);seek.value=String(Math.min(duration,Number(seek.value)));element('seek-label').textContent=`Позиция в ${duration}-секундном видео`;
    const config:StoryConfig={...defaultStoryConfig('Синтетическое демо · Фурка'),durationSeconds:duration as StoryConfig['durationSeconds'],qualityPreset:element<HTMLSelectElement>('quality').value as StoryConfig['qualityPreset'],cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',marker:element<HTMLSelectElement>('marker').value as StoryConfig['marker'],markerSize:'small',routeColor:element<HTMLSelectElement>('grade').value as StoryConfig['routeColor'],replayPacing:element<HTMLSelectElement>('pacing').value as StoryConfig['replayPacing'],visualStyle:element<HTMLSelectElement>('style').value as StoryConfig['visualStyle'],aspectRatio:element<HTMLSelectElement>('aspect').value as StoryConfig['aspectRatio']};
    if(config.marker==='custom'&&!custom)throw Error('Загрузите локальный PNG/WebP/JPG для своей картинки.');
    const terrain=await loadSwissTerrain(element<HTMLSelectElement>('dem').value==='coarse',signal,coverage);image=await loadSwissImagery(element<HTMLSelectElement>('detail').value==='low',signal,coverage);const route=parseGpx(await loadSwissRoute(signal)),traveler=await loadTraveler(),s=exportSettings(config);
    if(unloaded||token!==serial){image.dispose();return;}signal.throwIfAborted();
    renderer?.dispose();renderer=undefined;
    const next=new TerrainRenderer(route,terrain,s.width,s.height,config,image,config.marker==='custom'?custom:traveler,coverage==='extended'?swissCameraOptions(element<HTMLSelectElement>('composition').value as 'reference'|'route'):undefined);image=undefined;
    try{const proof=validateSwissFrames(next);c.dataset.coverage=proof.coverage;renderer=next;next.draw(c,Number(seek.value));}catch(e){next.dispose();throw e;}
    await detectEncoder(s.width,s.height,s.bitrate,s.fps);if(token===serial&&!unloaded){button.disabled=false;status.textContent=`Готово. Синтетическое демо · © swisstopo · ${coverage==='extended'?'контекст 3 км / mesh 5 м':'базис 1 км / mesh 2 м'}. Темп по уклону — художественная анимация.`;}
  }catch(e){image?.dispose();if(token===serial&&!unloaded&&(e as Error).name!=='AbortError')failure(e);}
}
for(const control of document.querySelectorAll('select'))control.addEventListener('change',()=>void configure());
file.addEventListener('change',async()=>{
  const upload=file.files?.[0];if(!upload||abort||unloaded)return;const token=++markerSerial,wasDisabled=button.disabled;button.disabled=true;playing=false;
  try{const next=await prepareCustomMarker(upload);if(unloaded||token!==markerSerial){next.dispose();return;}custom?.dispose();custom=next;element<HTMLSelectElement>('marker').value='custom';element('marker-note').textContent=next.type==='image/jpeg'?'JPG загружен. Для прозрачного фона используйте PNG/WebP.':'Картинка подготовлена локально; прозрачность сохранена.';await configure();}
  catch(e){if(token===markerSerial){status.textContent=(e as Error).message;button.disabled=wasDisabled;}}finally{if(token===markerSerial)file.value='';}
});
function draw(){try{renderer?.draw(c,Number(seek.value));}catch(e){renderer?.dispose();renderer=undefined;failure(e);}}
seek.addEventListener('input',()=>{playing=false;draw();});
element('play').addEventListener('click',()=>{if(!renderer)return;playing=!playing;if(Number(seek.value)>=seconds())seek.value='0';last=performance.now();});
function tick(now:number){if(playing&&renderer){seek.value=String(Math.min(seconds(),Number(seek.value)+(now-last)/1000));draw();if(Number(seek.value)>=seconds())playing=false;}last=now;if(!unloaded)requestAnimationFrame(tick);}requestAnimationFrame(tick);
button.addEventListener('click',async()=>{
  if(!renderer||abort)return;playing=false;const snapshot=renderer;abort=new AbortController();controls.forEach(c=>c.disabled=true);cancel.disabled=false;let failed=false;
  try{validateSwissFrames(snapshot);const blob=await exportVideo({config:snapshot.config,signal:abort.signal,draw:(c,t)=>snapshot.draw(c,t),onProgress:p=>{status.textContent=`Экспорт: ${Math.round(p*100)}%`;}});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`swiss-furka-${snapshot.config.visualStyle}-${snapshot.config.aspectRatio}-${snapshot.config.durationSeconds}s.mp4`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='MP4 создан локально.';}
  catch(e){failed=(e as Error).name!=='AbortError';status.textContent=failed?(e as Error).message:'Экспорт отменён. Можно повторить.';}
  finally{abort=undefined;controls.forEach(c=>c.disabled=false);cancel.disabled=true;button.disabled=failed||!renderer;}
});
cancel.addEventListener('click',()=>abort?.abort());window.addEventListener('pagehide',()=>{unloaded=true;++serial;++markerSerial;playing=false;preparation?.abort();abort?.abort();renderer?.dispose();renderer=undefined;custom?.dispose();custom=undefined;disposeTraveler();});void configure();
