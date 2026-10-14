import {readGpx,parseGpx} from './gpx';
import {detectEncoder,downloadVideo,exportVideo,exportVideoToFile,type VideoFileWriter} from './exporter';
import {formatDistance} from './renderer';
import type {Route} from './route';
import {defaultStoryConfig,exportSettings,previewSettings,exportSizeEstimate,requiresFileExport,formatVideoTime,validateStoryConfig,videoFilename,type StoryConfig} from './story';
import {prepareCustomMarker,type MarkerAsset} from './marker';
import {disposeTraveler} from './traveler';
import {prepareScene,type SceneRenderer,type PreparedScene} from './scene-provider';
import {sceneAvailability,type SceneAvailability} from './scene-availability';
import {localBytes,abortable,clearResourceCache} from './local-resource';
import {uiError,type UiState,type ViewMode} from './ui-state';
import './style.css';
declare const __IMAGERY_ENABLED__:boolean;
declare const __SWISS_ENABLED__:boolean;
declare const __AUTO_GEOGRAPHY_ENABLED__:boolean;
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=el<HTMLCanvasElement>('preview'),file=el<HTMLInputElement>('file'),title=el<HTMLInputElement>('story-title');
const play=el<HTMLButtonElement>('play'),scrub=el<HTMLInputElement>('scrub'),button=el<HTMLButtonElement>('export');
const choice=el<HTMLSelectElement>('route-choice'),markerFile=el<HTMLInputElement>('marker-file');
const selects=['ratio','duration','quality','camera-mode','terrain-surface','terrain-flight','route-color','replay-pacing','marker','marker-size','marker-presentation','video-captions'] as const;
const control=(id:typeof selects[number])=>el<HTMLSelectElement>(id);
const markerNoteBase=el('marker-note').textContent??'';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state:UiState={phase:'INITIALIZING'},view:ViewMode='normal';
let route:Route|undefined,renderer:SceneRenderer|undefined,scene:PreparedScene|undefined;
let story:Readonly<StoryConfig>=defaultStoryConfig(),customMarker:MarkerAsset|undefined;
let style:StoryConfig['visualStyle']='atlas',animationId=0,titleTimer:ReturnType<typeof setTimeout>|undefined,contextCleanup:(()=>void)|undefined;
let operation:AbortController|undefined,exportController:AbortController|undefined;
let encoder:{status:'checking'|'supported'|'unavailable';message?:string}={status:'checking'};
type Source={name:string;synthetic:boolean;read:(signal:AbortSignal)=>Promise<Route>};
let source:Source|undefined,retryAction:(()=>void)|undefined;
let availability:SceneAvailability|undefined,welcomeVisible=true,startupPlayAllowed=false,startupPlayPending=false;
let geographicConsent=false,geographyDeclined=false;
let probeSequence=0;
let probeController:AbortController|undefined;
type SaveHandle={createWritable():Promise<FileSystemWritableFileStream>};
const filePicker=(window as Window&{showSaveFilePicker?:(options:unknown)=>Promise<SaveHandle>}).showSaveFilePicker;
function qualityNote():void{
  const s=exportSettings(story),high=story.qualityPreset==='fullhd'||story.qualityPreset==='ultra';
  el('quality-note').textContent=`${s.width} × ${s.height} · 24 кадра/с · примерно ${(exportSizeEstimate(story)/1048576).toFixed(0)} МиБ. ${story.qualityPreset==='ultra'?'Экспериментальный 4K: высокая нагрузка, зависит от устройства. Детализация исходной фотографии не повышается.':high?'Full HD: повышенная нагрузка.':'Размер зависит от сцены.'}${requiresFileExport(story)?' Для минуты 4K обязательна запись в файл.':''}`;
  el('direct-file-label').hidden=!high||!filePicker;el<HTMLInputElement>('direct-file').disabled=busyExport();
  if(!high)el<HTMLInputElement>('direct-file').checked=false;
  el('export-note').textContent=`${story.durationSeconds} секунд · ${s.width} × ${s.height} · 24 кадра/с · H.264`;
}
const sceneOptions={
  'camera-mode':Array.from(control('camera-mode').options).map(o=>o.cloneNode(true) as HTMLOptionElement),
  'terrain-surface':Array.from(control('terrain-surface').options).map(o=>o.cloneNode(true) as HTMLOptionElement)
};
const busyExport=()=>state.phase==='EXPORTING',busyLoad=()=>state.phase==='LOADING';
const swissHeading='Подготавливаем 3D-маршрут по Швейцарским Альпам';
el('empty-swiss').hidden=!__SWISS_ENABLED__;
if(!__SWISS_ENABLED__)choice.querySelector<HTMLOptionElement>('[value="furka"]')?.remove();
el('welcome-start').textContent=__SWISS_ENABLED__?'Начать 3D-демо':'Начать работу';el('welcome-demo-note').hidden=!__SWISS_ENABLED__;
if(reducedMotion&&!__SWISS_ENABLED__)control('camera-mode').value='classic';

function setState(next:UiState):void{state=next;renderState();}
function setSceneOptions(id:keyof typeof sceneOptions,allowed:readonly string[],fallback:string):void{
  const select=control(id),previous=select.value;select.replaceChildren(...sceneOptions[id].filter(o=>allowed.includes(o.value)).map(o=>o.cloneNode(true)));select.value=allowed.includes(previous)?previous:fallback;
}
function restoreSceneOptions():void{for(const id of Object.keys(sceneOptions) as (keyof typeof sceneOptions)[])setSceneOptions(id,sceneOptions[id].map(o=>o.value),id==='camera-mode'?'cinematic':'dem');}
function updateSceneOptions():void{
  const discovered=__AUTO_GEOGRAPHY_ENABLED__&&geographicConsent;
  setSceneOptions('camera-mode',availability?.terrain||discovered?['cinematic','auto','terrain','director','classic']:['cinematic','classic'],'cinematic');
  setSceneOptions('terrain-surface',availability?.photo||discovered?['dem','photo']:['dem'],'dem');
  const active=!!(availability?.terrain||discovered)&&['terrain','auto','director'].includes(control('camera-mode').value);
  for(const id of ['terrain-surface','terrain-surface-label','terrain-flight','terrain-flight-label','route-color','marker-presentation']){el(id).hidden=!active;document.querySelector<HTMLLabelElement>(`label[for="${id}"]`)?.toggleAttribute('hidden',!active);}
  el('coverage-note').textContent=availability?.notice??'';el('coverage-note').hidden=!route||!availability?.notice;
  el('geography-consent').hidden=!__AUTO_GEOGRAPHY_ENABLED__||!route||!!availability?.terrain||geographicConsent||geographyDeclined;
}
function dismissWelcome(playInitial=false):void{
  welcomeVisible=false;el('welcome').hidden=true;startupPlayAllowed=playInitial;
  if(!playInitial)startupPlayPending=false;
  if(playInitial&&startupPlayPending&&!reducedMotion&&source?.name==='furka'&&renderer&&!busyLoad()&&!busyExport()){startupPlayPending=false;startPlay();}
}
function renderState():void{
  document.body.dataset.state=state.phase;
  const loading=busyLoad(),exporting=busyExport(),available=!!renderer;
  el<HTMLButtonElement>('find-geography').disabled=loading||exporting;el<HTMLButtonElement>('keep-local').disabled=exporting;
  el('loading').hidden=!loading;el('empty').hidden=available||loading;canvas.hidden=!available||loading;
  el('loading').setAttribute('aria-busy',String(loading));
  if(state.phase==='LOADING'){el('loading-heading').textContent=state.heading;el('loading-stage').textContent=state.stage;}
  const status=el('status');status.classList.toggle('error',state.phase==='ERROR'||encoder.status==='unavailable');
  status.textContent=state.phase==='ERROR'?state.error.message:state.phase==='LOADING'?state.stage
    :state.phase==='EXPORTING'?state.progress===undefined?'Подготовка экспорта…':`Создаём видео — ${Math.round(state.progress*100)}%`
    :state.phase==='EMPTY'?'Выберите демонстрацию или загрузите GPX.':state.phase==='INITIALIZING'?'Подготавливаем Route Story…'
    :('notice' in state?state.notice:undefined)??(encoder.status==='unavailable'?encoder.message??'MP4 недоступен.':'Маршрут готов. Можно сохранить видео.');
  el('cancel').hidden=!exporting;el<HTMLProgressElement>('export-progress').hidden=!exporting;
  if(state.phase==='EXPORTING'){const progress=el<HTMLProgressElement>('export-progress');if(state.progress===undefined)progress.removeAttribute('value');else progress.value=state.progress*100;}
  el('recovery-actions').hidden=!(state.phase==='ERROR'||state.phase==='CANCELLED');el<HTMLButtonElement>('retry').disabled=!retryAction;
  el('simplify').hidden=!route||exporting;el('error-details').hidden=state.phase!=='ERROR';el('error-code').textContent=state.phase==='ERROR'?state.error.code:'';
  el('encoder-note').hidden=!available||loading||encoder.status!=='unavailable';el('encoder-note').textContent=encoder.message??'';
  el('compatibility').hidden=!available||encoder.status!=='unavailable'||control('quality').value==='compatibility';
  button.disabled=!available||loading||exporting||encoder.status!=='supported'||state.phase==='ERROR'&&state.blocking!==false;
  play.disabled=scrub.disabled=!available||loading||exporting;play.textContent=state.phase==='PLAYING'?'Ⅱ':'▶';play.setAttribute('aria-label',state.phase==='PLAYING'?'Пауза':'Воспроизвести');
  title.disabled=!route||exporting;for(const id of selects)control(id).disabled=exporting||loading&&!route;markerFile.disabled=exporting||loading;
  for(const id of ['file','route-choice','clear-route','empty-file','empty-swiss','empty-other'])el<HTMLInputElement>(id).disabled=exporting;
  for(const card of document.querySelectorAll<HTMLButtonElement>('[data-style]'))card.disabled=exporting||loading;el('facts').hidden=!route;
  el<HTMLButtonElement>('show-welcome').disabled=exporting;
  qualityNote();
}
function stop():void{cancelAnimationFrame(animationId);animationId=0;if(state.phase==='PLAYING')setState({phase:'PAUSED'});}
function releaseRenderer():void{contextCleanup?.();contextCleanup=undefined;renderer?.dispose();renderer=undefined;scene=undefined;delete canvas.dataset.region;}
function failure(error:unknown,context:'gpx'|'scene'|'export'|'configuration'):void{stop();setState({phase:'ERROR',error:uiError(error,context)});}
function draw():boolean{
  const time=Number(scrub.value);try{renderer?.draw(canvas,time);}catch(error){releaseRenderer();failure(error,'scene');return false;}
  el('time').textContent=`${formatVideoTime(time)} / ${formatVideoTime(story.durationSeconds)}`;
  if(renderer){const frame=renderer.timeline.at(time);canvas.dataset.phase=frame.phase;el('preview-phase').textContent=`${frame.phase==='INTRO'?'Вступление':frame.phase==='OUTRO'?'Финиш':'Повтор маршрута'} · сегмент ${frame.segment+1} из ${route!.segments.length}${frame.stationary?' · нет непрерывного перемещения в GPX':''}`;}return true;
}
function startPlay():void{
  if(!renderer||busyLoad()||busyExport())return;dismissWelcome();if(state.phase==='PLAYING'){stop();return;}
  if(Number(scrub.value)>=story.durationSeconds)scrub.value='0';setState({phase:'PLAYING'});const started=performance.now()-Number(scrub.value)*1000;
  const tick=(now:number)=>{if(state.phase!=='PLAYING')return;scrub.value=String(Math.min(story.durationSeconds,(now-started)/1000));if(!draw())return;if(Number(scrub.value)>=story.durationSeconds)setState({phase:'PAUSED'});else animationId=requestAnimationFrame(tick);};animationId=requestAnimationFrame(tick);
}
function begin(heading:string):AbortController{
  clearTimeout(titleTimer);operation?.abort();const next=new AbortController();operation=next;stop();encoder={status:'checking'};setState({phase:'LOADING',heading,stage:'Проверяем маршрут и необходимые ресурсы'});return next;
}
function stageFor(op:AbortController,heading:string):(stage:string)=>void{return stage=>{if(operation===op&&!op.signal.aborted)setState({phase:'LOADING',heading,stage});};}
function configFromControls():Readonly<StoryConfig>{
  return validateStoryConfig({...story,title:title.value,durationSeconds:Number(control('duration').value) as StoryConfig['durationSeconds'],visualStyle:style,
    aspectRatio:control('ratio').value as StoryConfig['aspectRatio'],qualityPreset:control('quality').value as StoryConfig['qualityPreset'],cameraMode:control('camera-mode').value as StoryConfig['cameraMode'],terrainSurface:control('terrain-surface').value as StoryConfig['terrainSurface'],terrainFlight:control('terrain-flight').value as StoryConfig['terrainFlight'],routeColor:control('route-color').value as StoryConfig['routeColor'],replayPacing:control('replay-pacing').value as StoryConfig['replayPacing'],marker:control('marker').value as StoryConfig['marker'],markerSize:control('marker-size').value as StoryConfig['markerSize'],markerPresentation:control('marker-presentation').value as StoryConfig['markerPresentation'],captionMode:control('video-captions').value as StoryConfig['captionMode']},false);
}
async function probe(op:AbortController):Promise<void>{
  const sequence=++probeSequence;
  probeController?.abort();const deadline=new AbortController();probeController=deadline;const cancel=()=>deadline.abort(op.signal.reason);op.signal.addEventListener('abort',cancel,{once:true});const timer=setTimeout(()=>deadline.abort(Error('H.264 capability timeout')),10_000);
  try{const settings=exportSettings(story);if(renderer&&'gpu' in renderer)renderer.assertOutputSize(settings.width,settings.height);if(requiresFileExport(story)&&!filePicker)throw Error('Для минуты 4K нужна запись в файл; браузер не поддерживает выбор файла. Выберите 30 секунд или 1080p.');await abortable(detectEncoder(settings.width,settings.height,settings.bitrate,settings.fps,deadline.signal),deadline.signal);if(sequence===probeSequence&&operation===op&&!op.signal.aborted)encoder={status:'supported'};}
  catch(error){if(sequence===probeSequence&&operation===op&&!op.signal.aborted){const message=error instanceof Error?error.message:'Проверка H.264 не завершилась.';encoder={status:'unavailable',message:message+' Предпросмотр доступен. Выберите другое качество.'};if((story.qualityPreset==='ultra'||story.qualityPreset==='fullhd')&&!requiresFileExport(story)&&!/время|timeout/i.test(message)){const option=control('quality').selectedOptions[0];option.disabled=true;option.title=message;}}}
  finally{clearTimeout(timer);op.signal.removeEventListener('abort',cancel);if(probeController===deadline)probeController=undefined;if(operation===op&&!op.signal.aborted)renderState();}
}
async function configure(op?:AbortController,autoplay=false):Promise<void>{
  if(busyExport()||!route||op&&(operation!==op||op.signal.aborted))return;const heading=source?.name==='furka'?swissHeading:'Подготавливаем маршрут',current=op??begin(heading),signal=current.signal;
  updateSceneOptions();try{story=configFromControls();title.removeAttribute('aria-invalid');}catch(error){title.setAttribute('aria-invalid','true');if(operation===current)failure(error,'configuration');return;}
  // Old GPU resources leave before another pair of photo textures is decoded.
  releaseRenderer();renderState();
  try{
    const prepared=await prepareScene(route,story,signal,stageFor(current,heading),customMarker,geographicConsent);
    if(operation!==current||signal.aborted){prepared.renderer.dispose();return;}
    scene=prepared;renderer=prepared.renderer;if(prepared.region==='discovered'){availability={terrain:true,photo:true};updateSceneOptions();}const settings=previewSettings(story);canvas.width=settings.width;canvas.height=settings.height;
    canvas.classList.toggle('portrait',story.aspectRatio==='portrait');canvas.dataset.region=prepared.region;canvas.dataset.mode=renderer.config.cameraMode;canvas.dataset.captions=renderer.config.captionMode;
    scrub.max=String(story.durationSeconds);scrub.value=String(Math.min(Number(scrub.value),story.durationSeconds));el('preview-format').textContent=story.aspectRatio==='portrait'?'9:16':'16:9';
    el('scene-name').textContent=`${prepared.region==='furka'?'Швейцария · Furka':prepared.region==='sogne'?'Норвегия · Sogne':'Маршрут'} · ${['terrain','director'].includes(renderer.config.cameraMode??'')?'3D':'2D'}${source?.synthetic?' · демо':''}`;
    el('source-credit').textContent=prepared.credit;el('map-detail-note').textContent=`${prepared.notice??''} ${prepared.credit} · ${prepared.detail}`.trim();
    el('dynamics-note').textContent=`${renderer.timeline.dynamics.note}. Уклон: красный ↑≥10%, оранжевый ↑≥3%, нейтральный ±3%, светло-зелёный ↓≥3%, зелёный ↓≥10%. ${story.replayPacing==='terrain'?'Стилизованный темп по уклону':'Равномерный темп'} · это не реальная скорость. ${['terrain','director'].includes(renderer.config.cameraMode??'')?'Цвет 3D-пути соответствует выбранному режиму.':'В 2D путь сохраняет одноцветное оформление.'}`;
    canvas.setAttribute('aria-label',`История «${story.title}»: карта маршрута со стартом и финишем`);qualityNote();
    if('gpu' in renderer){const gpuCanvas=renderer.gpu.domElement;const lost=()=>{if(operation!==current)return;exportController?.abort(Error('3D-контекст потерян'));current.abort();releaseRenderer();failure(Error('3D-контекст потерян'),'scene');};gpuCanvas.addEventListener('webglcontextlost',lost);contextCleanup=()=>gpuCanvas.removeEventListener('webglcontextlost',lost);}
    stageFor(current,heading)('Готовим предпросмотр');if(!draw())return;setState({phase:'READY',notice:prepared.notice??(autoplay&&reducedMotion?'3D-демо готово. Нажмите ▶ для воспроизведения.':undefined)});
    if(autoplay&&!reducedMotion){startupPlayPending=true;if(!welcomeVisible&&startupPlayAllowed)startPlay();}await probe(current);
  }catch(error){if(operation!==current||signal.aborted)return;releaseRenderer();failure(error,'scene');}
}
function updateFacts():void{
  if(!route)return;el('distance').textContent=formatDistance(route.distanceKm);el('segments').textContent=String(route.segments.length);
  el('metric-name').textContent=route.elevationGain!==undefined?'Набор высоты по GPX':'Точки маршрута';el('metric-value').textContent=route.elevationGain!==undefined?`${Math.round(route.elevationGain).toLocaleString('ru-RU')} м`:route.pointCount.toLocaleString('ru-RU');
  el('route-info').textContent=`${route.name} · ${route.pointCount.toLocaleString('ru-RU')} точек${source?.synthetic?' · синтетический пример, не реальная поездка':''}`;
}
async function importSource(next:Source,autoplay=false):Promise<void>{
  if(busyExport())return;source=next;retryAction=()=>void importSource(next,false);const heading=next.name==='furka'?swissHeading:'Подготавливаем маршрут',op=begin(heading);
  releaseRenderer();route=undefined;availability=undefined;el('coverage-note').hidden=true;canvas.width=canvas.height=0;renderState();
  geographicConsent=false;geographyDeclined=false;el('geography-consent').hidden=true;
  try{stageFor(op,heading)('Читаем GPX · координаты остаются на вашем устройстве');const loaded=await next.read(op.signal);op.signal.throwIfAborted();if(operation!==op)return;
    route=loaded;availability=sceneAvailability(loaded,__SWISS_ENABLED__,__IMAGERY_ENABLED__);title.value=loaded.name;updateFacts();scrub.value=next.name==='sample'||next.name==='custom'?control('duration').value:'0';retryAction=()=>void configure();await configure(op,autoplay);
  }catch(error){if(operation!==op||op.signal.aborted)return;route=undefined;availability=undefined;updateSceneOptions();releaseRenderer();canvas.width=canvas.height=0;el('route-info').textContent='Файл не принят. Выберите другой GPX.';failure(error,'gpx');}
}
function preset(values:Partial<Record<typeof selects[number],string>>):void{for(const [id,value] of Object.entries(values))control(id as typeof selects[number]).value=value!;}
function selectDemo(name:'furka'|'sogne'|'fjords'|'sample',autoplay=false):void{
  if(busyExport()||(name==='furka'&&!__SWISS_ENABLED__))return;choice.value=name;
  if(!autoplay)dismissWelcome();restoreSceneOptions();
  if(name==='furka')preset({'camera-mode':'terrain','terrain-surface':'photo','terrain-flight':'corridor',ratio:'landscape',quality:'standard',duration:'20','route-color':'grade','replay-pacing':'terrain',marker:'traveler','marker-size':'medium','marker-presentation':'annotation'});
  if(name==='sogne')preset({'camera-mode':'terrain','terrain-surface':'dem','terrain-flight':'conservative',ratio:'portrait',quality:'standard',duration:'20',marker:'traveler'});
  if(name==='fjords')preset({'camera-mode':'cinematic',ratio:'portrait',quality:'standard',duration:'20'});
  if(name==='sample')preset({'camera-mode':reducedMotion?'classic':'cinematic','terrain-surface':'dem','terrain-flight':'conservative','route-color':'plain','replay-pacing':'distance',marker:'point'});
  if(control('marker').value!=='custom'){customMarker?.dispose();customMarker=undefined;}
  const paths={sample:'synthetic.gpx',fjords:'cinematic-fjords.gpx',sogne:'terrain-sogne.gpx'};
  void importSource({name,synthetic:true,read:async signal=>{if(name==='furka'){const swiss=await import('./swiss-pilot');signal.throwIfAborted();return parseGpx(await swiss.loadSwissRoute(signal));}return parseGpx(new TextDecoder('utf-8',{fatal:true}).decode(await localBytes(`${import.meta.env.BASE_URL}samples/${paths[name]}`,{signal,kind:'route',limit:10*1024*1024})));}},autoplay);
}
function clearRoute():void{
  if(busyExport())return;clearTimeout(titleTimer);operation?.abort();operation=undefined;stop();releaseRenderer();route=undefined;source=undefined;retryAction=undefined;customMarker?.dispose();customMarker=undefined;canvas.width=canvas.height=0;delete canvas.dataset.phase;delete canvas.dataset.mode;
  availability=undefined;updateSceneOptions();dismissWelcome();choice.value='empty';el('route-info').textContent='Маршрут не выбран.';el('scene-name').textContent='Route Story';el('source-credit').textContent='Источники карты: Natural Earth';setState({phase:'EMPTY'});
}
el('find-geography').addEventListener('click',()=>{if(!route||busyExport()||busyLoad())return;dismissWelcome();geographicConsent=true;restoreSceneOptions();preset({'camera-mode':'terrain','terrain-surface':'photo','terrain-flight':'conservative','route-color':'grade','replay-pacing':'terrain',marker:'traveler'});scrub.value='0';void configure();});
el('keep-local').addEventListener('click',()=>{geographyDeclined=true;el('geography-consent').hidden=true;});
function setView(next:ViewMode):void{
  dismissWelcome();
  view=next;document.body.dataset.view=view;document.body.dataset.settings='closed';el('explanations').textContent=view==='normal'?'Скрыть пояснения':'Показать пояснения';el('explanations').setAttribute('aria-pressed',String(view!=='normal'));
  el('video-only').textContent=view==='video'?'Вернуть интерфейс':'Только видео';el('video-only').setAttribute('aria-pressed',String(view==='video'));el('show-settings').hidden=view!=='video';el('show-settings').setAttribute('aria-expanded','false');
  window.scrollTo({top:0,behavior:'instant'});
}
function showSettings():void{if(view==='video'){document.body.dataset.settings='open';el('show-settings').setAttribute('aria-expanded','true');}choice.focus();}

file.addEventListener('change',()=>{const selected=file.files?.[0];file.value='';if(!selected||busyExport())return;
  dismissWelcome();restoreSceneOptions();
  // Leaving a regional 3D demo selects the existing explicit Auto policy.
  // Its effective 2D/3D mode and fallback notice remain visible, never disguised.
  if(source?.synthetic&&control('camera-mode').value==='terrain')control('camera-mode').value='auto';
  choice.value='custom';void importSource({name:'custom',synthetic:false,read:async signal=>{const parsed=await readGpx(selected);signal.throwIfAborted();return parsed;}});});
choice.addEventListener('change',()=>{if(choice.value==='custom'){file.click();return;}if(choice.value==='empty')clearRoute();else selectDemo(choice.value as 'furka'|'sogne'|'fjords'|'sample');});
el('empty-swiss').addEventListener('click',()=>selectDemo('furka'));
el('clear-route').addEventListener('click',clearRoute);el('empty-file').addEventListener('click',()=>file.click());el('empty-other').addEventListener('click',showSettings);el('change-route').addEventListener('click',showSettings);
el('explanations').addEventListener('click',()=>setView(view==='normal'?'compact':'normal'));el('video-only').addEventListener('click',()=>setView(view==='video'?'normal':'video'));
el('show-settings').addEventListener('click',()=>{const open=document.body.dataset.settings!=='open';document.body.dataset.settings=open?'open':'closed';el('show-settings').setAttribute('aria-expanded',String(open));if(open)choice.focus();});
el('retry').addEventListener('click',()=>retryAction?.());el('simplify').addEventListener('click',()=>{
  if(busyExport())return;
  if(state.phase==='ERROR'&&state.error.code.startsWith('marker/'))control('marker').value='point';
  control('camera-mode').value='classic';void configure();
});el('compatibility').addEventListener('click',()=>{control('quality').value='compatibility';void configure();});
el('cancel-load').addEventListener('click',()=>{clearTimeout(titleTimer);operation?.abort();operation=undefined;releaseRenderer();setState({phase:'CANCELLED',notice:'Подготовка отменена. Можно повторить или выбрать другой маршрут.'});});
for(const id of selects)control(id).addEventListener('change',()=>{
  if(busyExport())return;dismissWelcome();
  if(id==='ratio')for(const option of Array.from(control('quality').options)){option.disabled=false;option.title='';}
  if(id==='quality'){
    el<HTMLInputElement>('direct-file').checked=control('quality').value==='ultra'&&!!filePicker;
    if(renderer&&operation&&!operation.signal.aborted&&story.qualityPreset!=='compatibility'&&control('quality').value!=='compatibility'&&!busyLoad()){
      stop();story=configFromControls();encoder={status:'checking'};setState({phase:'READY'});void probe(operation);return;
    }
  }
  if(id==='marker'&&control('marker').value!=='custom'){customMarker?.dispose();customMarker=undefined;}void configure();
});
title.addEventListener('input',()=>{
  if(busyExport()||!route)return;dismissWelcome();const op=begin('Обновляем название истории');
  stageFor(op,'Обновляем название истории')('Название обновится после ввода · экспорт временно недоступен');
  titleTimer=setTimeout(()=>void configure(op),180);
});
for(const card of document.querySelectorAll<HTMLButtonElement>('[data-style]'))card.addEventListener('click',()=>{if(busyExport())return;dismissWelcome();style=card.dataset.style as StoryConfig['visualStyle'];for(const item of document.querySelectorAll<HTMLButtonElement>('[data-style]')){item.classList.toggle('active',item===card);item.setAttribute('aria-pressed',String(item===card));}void configure();});
markerFile.addEventListener('change',async()=>{
  const selected=markerFile.files?.[0];markerFile.value='';if(!selected||busyExport())return;dismissWelcome();const previousEncoder=encoder,op=begin('Подготавливаем картинку маркера локально');
  try{const prepared=await prepareCustomMarker(selected);if(operation!==op||op.signal.aborted){prepared.dispose();return;}customMarker?.dispose();customMarker=prepared;control('marker').value='custom';const notice=prepared.type==='image/jpeg'?'JPG загружен. Для прозрачного фона используйте PNG/WebP.':'';el('marker-note').textContent=markerNoteBase+' '+notice;
    if(route)await configure(op);else setState({phase:'EMPTY'});if(notice&&renderer&&encoder.status==='supported')setState({phase:'READY',notice});
  }catch(error){if(operation!==op||op.signal.aborted)return;encoder=previousEncoder;setState({phase:'ERROR',error:uiError(error,'configuration'),blocking:false});}
});
scrub.addEventListener('input',()=>{if(busyExport()||busyLoad())return;dismissWelcome();stop();if(draw())setState({phase:'PAUSED'});});play.addEventListener('click',startPlay);el('cancel').addEventListener('click',()=>exportController?.abort());
el('welcome-start').addEventListener('click',()=>{dismissWelcome(true);if(!renderer&&!busyLoad())choice.focus();});el('welcome-close').addEventListener('click',()=>dismissWelcome(true));
el('welcome-file').addEventListener('click',()=>{dismissWelcome();file.click();});
el('show-welcome').addEventListener('click',()=>{if(busyExport())return;stop();startupPlayPending=false;startupPlayAllowed=false;welcomeVisible=true;el('welcome').hidden=false;el('welcome-start').textContent='Продолжить';el('welcome-start').focus();window.scrollTo({top:0,behavior:'instant'});});
button.addEventListener('click',async()=>{
  if(!renderer||busyExport()||busyLoad()||encoder.status!=='supported')return;dismissWelcome();stop();const active=renderer,config=validateStoryConfig({...active.config,qualityPreset:story.qualityPreset}),controller=new AbortController(),size=exportSettings(config),original=[active.width,active.height] as const;exportController=controller;setState({phase:'EXPORTING'});performance.mark('route-story-export-start');
  let temporary:SceneRenderer|undefined,writable:VideoFileWriter|undefined,fileDone=false;
  try{
    // Picker is invoked during the click's user activation, before any await.
    const handle=el<HTMLInputElement>('direct-file').checked&&filePicker?await filePicker.call(window,{suggestedName:videoFilename(config),types:[{description:'Видео MP4',accept:{'video/mp4':['.mp4']}}]}):undefined;
    controller.signal.throwIfAborted();if(handle)writable=await handle.createWritable();
    if('gpu' in active){active.setOutputSize(size.width,size.height);active.captureFrame(0);}else if(active.width!==size.width||active.height!==size.height)temporary=active.atResolution(config,size.width,size.height);
    const render=temporary??active,options={config,canvas:'gpu' in render?render.encodingCanvas:undefined,draw:(target:HTMLCanvasElement,time:number)=>'gpu' in render?render.captureFrame(time):render.draw(target,time),signal:controller.signal,onProgress:(progress:number)=>setState({phase:'EXPORTING' as const,progress})};
    let bytes:number;
    if(writable){bytes=(await exportVideoToFile(options,writable)).bytes;fileDone=true;}
    else{const blob=await exportVideo(options);bytes=blob.size;downloadVideo(blob,videoFilename(config));}
    performance.mark('route-story-export-end');performance.measure('route-story-export','route-story-export-start','route-story-export-end');setState({phase:'READY',notice:`MP4 создан · ${config.durationSeconds} секунд · ${(bytes/1024/1024).toFixed(1)} МиБ. Видео готово${writable?' · файл записан':''}.`});
  }
  catch(error){if(controller.signal.aborted&&controller.signal.reason instanceof Error&&/3D-контекст/.test(controller.signal.reason.message))failure(controller.signal.reason,'scene');else if(controller.signal.aborted||error instanceof DOMException&&error.name==='AbortError')setState({phase:'CANCELLED',notice:'Экспорт отменён.'});else{retryAction=()=>{if(renderer){setState({phase:'READY'});button.click();}else void configure();};setState({phase:'ERROR',error:uiError(error,'export'),blocking:!renderer});}}
  finally{temporary?.dispose();if(writable&&!fileDone)await writable.abort().catch(()=>{});if(renderer===active&&'gpu' in active){try{active.setOutputSize(...original);draw();}catch(error){releaseRenderer();failure(error,'scene');}}exportController=undefined;renderState();}
});
window.addEventListener('pagehide',()=>{clearTimeout(titleTimer);operation?.abort();probeController?.abort();exportController?.abort();cancelAnimationFrame(animationId);releaseRenderer();customMarker?.dispose();customMarker=undefined;disposeTraveler();clearResourceCache();route=undefined;source=undefined;});
updateSceneOptions();renderState();
// Only initial startup selects Switzerland; no retry or timer restores it.
if(__SWISS_ENABLED__)selectDemo('furka',true);else setState({phase:'EMPTY'});
