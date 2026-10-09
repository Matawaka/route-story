import { readGpx, parseGpx } from './gpx';
import { detectEncoder, downloadVideo, exportVideo } from './exporter';
import { RouteRenderer, formatDistance, type Land, type VisualStyle } from './renderer';
import type { Route } from './route';
import { defaultStoryConfig, exportSettings, formatVideoTime, validateStoryConfig, videoFilename, type StoryConfig } from './story';
import './style.css';
import { loadGeography } from './geography';
import { loadTerrain } from './terrain';
import type { TerrainRenderer } from './terrain-renderer';
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('preview'), file = el<HTMLInputElement>('file'), demo = el<HTMLButtonElement>('demo');
const button = el<HTMLButtonElement>('export'), cancel = el<HTMLButtonElement>('cancel');
const play = el<HTMLButtonElement>('play'), scrub = el<HTMLInputElement>('scrub'), ratio = el<HTMLSelectElement>('ratio');
const duration = el<HTMLSelectElement>('duration'), quality = el<HTMLSelectElement>('quality');
const cameraMode=el<HTMLSelectElement>('camera-mode');
const cinematicDemo=el<HTMLButtonElement>('cinematic-demo');
const terrainDemo=el<HTMLButtonElement>('terrain-demo');
const title = el<HTMLInputElement>('story-title');
let story: Readonly<StoryConfig> = defaultStoryConfig();
if(matchMedia('(prefers-reduced-motion: reduce)').matches){story=validateStoryConfig({...story,cameraMode:'classic'});cameraMode.value='classic';}
let route: Route | undefined, renderer: RouteRenderer | TerrainRenderer | undefined, style: VisualStyle = 'atlas';
let exporting = false, loading = false, animationId = 0, playing = false, loadId = 0, probeId = 0;
let controller: AbortController | undefined;
const landPromise: Promise<Land> = fetch(`${import.meta.env.BASE_URL}maps/ne_110m_land.geojson`).then(response => { if (!response.ok) throw new Error('Не удалось загрузить локальную карту.'); return response.json(); });
landPromise.catch(error => message(error.message, true));
function message(text: string, error = false) { el('status').textContent = text; el('status').classList.toggle('error', error); }
function stop() { playing = false; cancelAnimationFrame(animationId); play.textContent = '▶'; play.setAttribute('aria-label', 'Воспроизвести'); }
function draw() {
  const time = Number(scrub.value);
  try{renderer?.draw(canvas,time);}catch(error){stop();button.disabled=true;message((error as Error).message,true);return;}
  el('time').textContent = `${formatVideoTime(time)} / ${formatVideoTime(story.durationSeconds)}`;
  if (renderer) { const state = renderer.timeline.at(time); canvas.dataset.phase = state.phase;
    el('preview-phase').textContent = `${state.phase === 'INTRO' ? 'Вступление' : state.phase === 'OUTRO' ? 'Финиш' : 'Повтор маршрута'} · сегмент ${state.segment + 1} из ${route!.segments.length}${state.stationary ? ' · нет непрерывного перемещения в GPX' : ''}`;
  }
}
async function configure(): Promise<void> {
  if (exporting) return;
  const currentProbe = ++probeId; button.disabled = true; if (!route) return;
  try {
    story = validateStoryConfig({ ...story, title: title.value, durationSeconds: Number(duration.value) as StoryConfig['durationSeconds'], visualStyle: style, aspectRatio: ratio.value as StoryConfig['aspectRatio'], qualityPreset: quality.value as StoryConfig['qualityPreset'],cameraMode:cameraMode.value as StoryConfig['cameraMode'] }, false);
    title.removeAttribute('aria-invalid');
  } catch (error) { title.setAttribute('aria-invalid', 'true'); stop(); message((error as Error).message, true); return; }
  let config=story,terrain:Awaited<ReturnType<typeof loadTerrain>>|undefined,terrainNote='';
  if(config.cameraMode==='terrain'||config.cameraMode==='auto'){
    try{terrain=await loadTerrain(config.qualityPreset);if(!terrain.routeCoverage(route)||(config.cameraMode==='auto'&&terrain.routeReliefMeters(route)<100))throw Error('Маршрут вне полного DEM-пакета или вокруг пути нет выразительного рельефа.');}
    catch(error){terrain=undefined;if(config.cameraMode==='terrain')throw Error(`${(error as Error).message} Выберите «Кино · 2D».`);terrainNote=`Авто: ${(error as Error).message} Используется 2D.`;}
    config=validateStoryConfig({...config,cameraMode:terrain?'terrain':'cinematic'});
  }
  const landBase = await landPromise;
  let land=config.cameraMode==='cinematic'?{...landBase,geography:await loadGeography()}:landBase;
  if (currentProbe !== probeId) return;
  stop(); renderer?.dispose();renderer=undefined; const portrait = ratio.value === 'portrait';
  const settings = exportSettings(story); canvas.width = settings.width; canvas.height = settings.height;
  scrub.max = String(story.durationSeconds); scrub.value = String(Math.min(Number(scrub.value), story.durationSeconds));
  canvas.classList.toggle('portrait', portrait); el('preview-format').textContent = portrait ? '9:16' : '16:9';
  if(terrain){const {TerrainRenderer}=await import('./terrain-renderer');if(currentProbe!==probeId)return;
    try{renderer=new TerrainRenderer(route,terrain,canvas.width,canvas.height,config);}
    catch(error){if(story.cameraMode!=='auto')throw error;terrain=undefined;terrainNote=`Авто: ${(error as Error).message} Используется 2D.`;config=validateStoryConfig({...config,cameraMode:'cinematic'});land={...landBase,geography:await loadGeography()};if(currentProbe!==probeId)return;renderer=new RouteRenderer(route,land,canvas.width,canvas.height,style,config);}
  }
  else renderer = new RouteRenderer(route, land, canvas.width, canvas.height, style, config);
  draw();
  const region=land.geography?.region.extent,covered=region&&route.segments.every(s=>s.every(p=>p.lon>=region[0]&&p.lon<=region[2]&&p.lat>=region[1]&&p.lat<=region[3]));
  el('map-detail-note').textContent=terrain?`Рельеф: © Kartverket · CC BY 4.0 · DEM ${terrain.level.spacingMeters} м · без преувеличения высот. Локальный пакет Согне-фьорда; высоты GPX сохранены. Вертикальный датум источника не указан. Не для навигации.`:`${terrainNote} Карта: Natural Earth · ${covered?'фьорды, острова и подписи 1:10m':'обзорная география '+(config.cameraMode==='cinematic'?'1:50m':'1:110m')} · без улиц. Время видео не является длительностью поездки.`;
  canvas.setAttribute('aria-label', `История «${story.title}»: карта маршрута со стартом и финишем`);
  el('export-note').textContent = `${story.durationSeconds} секунд · ${canvas.width} × ${canvas.height} · 24 кадра/с · H.264`;
  try { await detectEncoder(canvas.width, canvas.height, settings.bitrate, settings.fps); if (currentProbe === probeId) { button.disabled = exporting || loading; message('Маршрут готов. Можно сохранить видео.'); } }
  catch (error) { if (currentProbe === probeId) message((error as Error).message + (story.qualityPreset === 'standard' ? ' Выберите «Совместимое · 360p».' : ''), true); }
}
async function importRoute(read: () => Promise<Route>, synthetic = false) {
  if (exporting) return; const currentLoad = ++loadId; ++probeId; loading = true; button.disabled = true; stop();
  message('Читаем GPX на вашем устройстве…');
  try {
    const loaded = await read(); await landPromise; if (currentLoad !== loadId) return;
    renderer?.dispose();renderer=undefined;canvas.width=canvas.height=0;
    route = loaded; story = validateStoryConfig({ ...story, title: loaded.name }); title.value = story.title; title.disabled = false; loading = false; scrub.value = duration.value; canvas.hidden = false; el('empty').hidden = true; el('facts').hidden = false; play.disabled = scrub.disabled = false;
    el('distance').textContent = formatDistance(route.distanceKm); el('segments').textContent = String(route.segments.length);
    el('metric-name').textContent = route.elevationGain !== undefined ? 'Набор высоты по GPX' : 'Точки маршрута';
    el('metric-value').textContent = route.elevationGain !== undefined ? `${Math.round(route.elevationGain).toLocaleString('ru-RU')} м` : route.pointCount.toLocaleString('ru-RU');
    el('route-info').textContent = `${route.name} · ${route.pointCount.toLocaleString('ru-RU')} точек${synthetic ? ' · синтетический пример' : ''}`;
    // A valid GPX must survive map/GPU preparation failure so selecting 2D can
    // recover without another import. Only file/parser failures clear route data.
    try{await configure();}catch(error){stop();button.disabled=true;message((error as Error).message,true);}
  } catch (error) {
    if (currentLoad !== loadId) return;
    route = undefined; renderer?.dispose(); renderer = undefined; canvas.hidden = true; el('empty').hidden = false; el('facts').hidden = true;
    // Release the visible canvas's last route image as well as the private render caches.
    canvas.width = canvas.height = 0; delete canvas.dataset.phase; canvas.setAttribute('aria-label', 'Карта маршрута со стартом и финишем');
    play.disabled = scrub.disabled = title.disabled = true; el('route-info').textContent = 'Файл не принят. Выберите другой GPX.'; message((error as Error).message, true);
  } finally { if (currentLoad === loadId) loading = false; }
}
file.addEventListener('change', () => { const selected = file.files?.[0]; if (selected) void importRoute(() => readGpx(selected)); file.value = ''; });
demo.addEventListener('click', () => void importRoute(async () => { const response = await fetch(`${import.meta.env.BASE_URL}samples/synthetic.gpx`); if (!response.ok) throw new Error('Учебный GPX недоступен.'); return parseGpx(await response.text()); }, true));
cinematicDemo.addEventListener('click',()=>{
  if(exporting)return;
  cameraMode.value='cinematic';ratio.value='portrait';quality.value='standard';duration.value='20';
  void importRoute(async()=>{const response=await fetch(`${import.meta.env.BASE_URL}samples/cinematic-fjords.gpx`);if(!response.ok)throw new Error('Кино-демо недоступно.');return parseGpx(await response.text());},true).then(()=>{scrub.value='0';draw();});
});
terrainDemo.addEventListener('click',()=>{
  if(exporting)return;cameraMode.value='terrain';ratio.value='portrait';quality.value='standard';duration.value='20';
  void importRoute(async()=>{const r=await fetch(`${import.meta.env.BASE_URL}samples/terrain-sogne.gpx`);if(!r.ok)throw Error('3D-демо недоступно.');return parseGpx(await r.text());},true).then(()=>{scrub.value='0';draw();});
});
document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(card => card.addEventListener('click', () => {
  if (exporting) return; style = card.dataset.style as VisualStyle;
  document.querySelectorAll<HTMLButtonElement>('[data-style]').forEach(item => { item.classList.toggle('active', item === card); item.setAttribute('aria-pressed', String(item === card)); });
  void configure().catch(error => message(error.message, true));
}));
ratio.addEventListener('change', () => void configure().catch(error => message(error.message, true)));
duration.addEventListener('change', () => void configure().catch(error => message(error.message, true)));
quality.addEventListener('change', () => void configure().catch(error => message(error.message, true)));
cameraMode.addEventListener('change',()=>void configure().catch(error=>message(error.message,true)));
title.addEventListener('input', () => void configure().catch(error => message(error.message, true)));
scrub.addEventListener('input', () => { stop(); draw(); });
play.addEventListener('click', () => {
  if (!renderer) return; if (playing) { stop(); return; }
  if (Number(scrub.value) >= story.durationSeconds) scrub.value = '0'; playing = true; play.textContent = 'Ⅱ'; play.setAttribute('aria-label', 'Пауза');
  const started = performance.now() - Number(scrub.value) * 1000;
  const tick = (now: number) => { scrub.value = String(Math.min(story.durationSeconds, (now - started) / 1000)); draw(); if (Number(scrub.value) >= story.durationSeconds) stop(); else animationId = requestAnimationFrame(tick); };
  animationId = requestAnimationFrame(tick);
});
cancel.addEventListener('click', () => controller?.abort());
button.addEventListener('click', async () => {
  if (!renderer || exporting || loading) return;
  exporting = true; stop(); controller = new AbortController(); cancel.hidden = false;
  const controls = [button, file, demo, cinematicDemo, terrainDemo, ratio, duration, quality, title, cameraMode, play, scrub, ...document.querySelectorAll<HTMLButtonElement>('[data-style]')]; controls.forEach(control => control.disabled = true);
  const active = renderer;
  try {
    performance.clearMarks('route-story-export-start'); performance.clearMarks('route-story-export-end'); performance.clearMeasures('route-story-export');
    performance.mark('route-story-export-start');
    const blob = await exportVideo({ config: active.config, draw: (target, seconds) => active.draw(target, seconds), signal: controller.signal, onProgress: p => message(`Экспорт: ${Math.floor(p * 100)}%`) });
    performance.mark('route-story-export-end'); performance.measure('route-story-export', 'route-story-export-start', 'route-story-export-end');
    downloadVideo(blob, videoFilename(active.config)); message(`MP4 создан · ${active.config.durationSeconds} секунд. Файл сохранён на ваше устройство.`);
  } catch (error) { message((error as Error).name === 'AbortError' ? 'Экспорт отменён.' : `Не удалось создать MP4: ${(error as Error).message}`, (error as Error).name !== 'AbortError'); }
  finally { exporting = false; controller = undefined; cancel.hidden = true; controls.forEach(control => control.disabled = false); }
});
window.addEventListener('pagehide', () => { controller?.abort(); stop(); renderer?.dispose(); });
