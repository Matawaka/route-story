/** One regional provider for the main UI. Route matching remains the existing
 * conservative, local region-selection interface; no coordinate requests. */
import type {Route} from './route';
import type {StoryConfig} from './story';
import {previewSettings,validateStoryConfig} from './story';
import {RouteRenderer,type Land} from './renderer';
import type {TerrainRenderer} from './terrain-renderer';
import {loadTerrain} from './terrain';
import {loadImagery,type PreparedImagery} from './imagery';
import {loadGeography} from './geography';
import {sceneAvailability} from './scene-availability';
import {loadTraveler} from './traveler';
import type {MarkerAsset} from './marker';
import {localBytes,abortable,ResourceError} from './local-resource';
declare const __SWISS_ENABLED__:boolean;
declare const __IMAGERY_ENABLED__:boolean;
declare const __AUTO_GEOGRAPHY_ENABLED__:boolean;
export type SceneRenderer=RouteRenderer|TerrainRenderer;
export interface PreparedScene {renderer:SceneRenderer; region:'furka'|'sogne'|'global'|'discovered'; credit:string; detail:string; notice?:string; geographicEvidence?:import('./geographic-preparation').GeographicEvidence}
let land:Promise<Land>|undefined;
function loadLand(signal:AbortSignal):Promise<Land>{
  if(!land)land=localBytes(`${import.meta.env.BASE_URL}maps/ne_110m_land.geojson`,{kind:'map',limit:4*1024*1024})
    .then(bytes=>JSON.parse(new TextDecoder().decode(bytes)) as Land).catch(error=>{land=undefined;throw error;});
  return abortable(land,signal);
}
export async function prepareScene(route:Route,requested:Readonly<StoryConfig>,signal:AbortSignal,stage:(name:string)=>void,custom?:MarkerAsset,geographicConsent=false):Promise<PreparedScene>{
  const settings=previewSettings(requested);let config=requested,notice:string|undefined;
  const available=sceneAvailability(route,__SWISS_ENABLED__,__IMAGERY_ENABLED__);
  if(__AUTO_GEOGRAPHY_ENABLED__&&geographicConsent&&!available.terrain&&['terrain','auto','director'].includes(config.cameraMode??'')){
    const {prepareDiscoveredGeography,prepareDiscoveredTerrain}=await import('./geographic-preparation');
    const prepared=config.terrainSurface==='photo'?await prepareDiscoveredGeography(route,signal,stage):{terrain:await prepareDiscoveredTerrain(route,signal,stage),imagery:undefined,evidence:undefined};let next:TerrainRenderer|undefined;
    try{const readyMarker=config.marker==='traveler'?await loadTraveler(signal):custom;config=validateStoryConfig({...config,cameraMode:config.cameraMode==='director'?'director':'terrain'});stage('Подготавливаем 3D-рельеф · проверяем безопасную камеру');
      const {TerrainRenderer}=await import('./terrain-renderer');signal.throwIfAborted();next=new TerrainRenderer(route,prepared.terrain,settings.width,settings.height,config,prepared.imagery,readyMarker);signal.throwIfAborted();
      const {getTerrainCameraStateAt}=await import('./terrain-camera');
      for(let frame=0;frame<=config.durationSeconds*settings.fps;frame++){if(frame%48===0){await new Promise(resolve=>setTimeout(resolve,0));signal.throwIfAborted();}getTerrainCameraStateAt(frame/settings.fps,next.plan);}
      const e=prepared.evidence;return{renderer:next,region:'discovered',credit:prepared.terrain.manifest.attribution+(prepared.imagery?' · '+prepared.imagery.manifest.attribution:''),detail:e?`Sentinel-2: источник 10 м / подготовленный слой ${e.derivedImageSpacingMeters} м; даты снимков ${prepared.imagery!.manifest.acquiredDate}. Copernicus DSM ${e.demResolutionMeters} м / сетка ${e.derivedDemSpacingMeters} м · EGM2008 · охват ${Math.round(e.areaKm2)} км². Загружено ${(e.downloadBytes/1048576).toFixed(1)} МиБ. Облачные/неопределённые пиксели у маршрута: ${(e.routeCloudFraction*100).toFixed(2)}%. Это обзорная фотокарта, без детализации отдельных улиц.`:`Copernicus DSM ${prepared.terrain.manifest.sourceResolutionMeters} м / сетка ${prepared.terrain.level.spacingMeters} м · EGM2008 · настоящие высоты, без фотографии.`,geographicEvidence:e,notice:next.plan.director?.diagnostics.reason};
    }catch(error){next?.dispose();if(!next)prepared.imagery?.dispose();throw error;}
  }
  if(['terrain','auto','director'].includes(config.cameraMode??'')){
    if(!available.terrain){if(config.cameraMode!=='auto')throw Error('Картографической информации выбранной местности нет: DEM недоступен. Выберите обзорную карту 2D.');notice=available.notice;config=validateStoryConfig({...requested,cameraMode:'cinematic'});}
    else if(config.terrainSurface==='photo'&&!available.photo)throw Error('Фотокарты выбранной местности нет в этой сборке. Выберите поверхность DEM или обзорную карту 2D.');
  }
  const readyMarker=config.marker==='traveler'?await loadTraveler(signal):custom;
  signal.throwIfAborted();
  if(['terrain','auto','director'].includes(config.cameraMode??'')){
    let imagery:PreparedImagery|undefined,next:TerrainRenderer|undefined;
    try{
      stage('Получаем модель рельефа · проверяем целостность данных');
      const swiss=available.region==='furka'?await import('./swiss-pilot'):undefined;
      const terrain=swiss?await swiss.loadSwissTerrain(false,signal,'extended'):await loadTerrain(config.qualityPreset,signal);
      if(!terrain.routeCoverage(route)||(config.cameraMode==='auto'&&terrain.routeReliefMeters(route)<100))throw Error('Маршрут вне полного покрытия DEM или без выразительного рельефа.');
      config=validateStoryConfig({...config,cameraMode:config.cameraMode==='director'?'director':'terrain'});
      if(config.terrainSurface==='photo'){
        stage('Загружаем спутниковые изображения · проверяем целостность данных');
        imagery=swiss?await swiss.loadSwissImagery(false,signal,'extended'):await loadImagery(signal);
      }
      stage('Подготавливаем 3D-сцену · проверяем безопасный пролёт');
      const {TerrainRenderer}=await import('./terrain-renderer');signal.throwIfAborted();
      next=new TerrainRenderer(route,terrain,settings.width,settings.height,config,imagery,readyMarker,swiss?.swissCameraOptions('route'));
      swiss?.validateSwissFrames(next);signal.throwIfAborted();
      return{renderer:next,region:swiss?'furka':'sogne',credit:swiss?'© swisstopo · SWISSIMAGE / swissALTI3D':'© Kartverket · CC BY 4.0'+(imagery?' · Contains modified Copernicus Sentinel data 2025':''),
        notice:next.plan.director?.diagnostics.reason,
        detail:swiss?'Фурка · DEM 5 м из источника 2 м · LV95/LN02 · высоты 1:1. Фото: обзор 3 м / участок 0,5 м; нативный класс 10/25 см не установлен. Экспериментальный регион: физические устройства ещё не проверены.'
          :`Согне-фьорд · DEM ${terrain.level.spacingMeters} м · высоты 1:1; вертикальный датум источника не указан.${imagery?' Contains modified Copernicus Sentinel data 2025. Фото: общий слой 40 м / участок 10 м · снимок 27.09.2025.':''}`};
    }catch(error){next?.dispose();if(!next)imagery?.dispose();signal.throwIfAborted();if(requested.cameraMode!=='auto')throw error;
      notice='Авто: этот 3D-пакет недоступен для маршрута. Используется 2D.';config=validateStoryConfig({...requested,cameraMode:'cinematic'});
    }
  }
  stage('Подготавливаем локальную 2D-карту');
  let base:Land;
  try{base=await loadLand(signal);}catch(error){
    signal.throwIfAborted();
    // Explicit Classic/2D recovery can draw truthful local GPX geometry even
    // if the geographic background is unavailable. No fictitious map detail.
    if(config.cameraMode!=='classic'||!(error instanceof ResourceError)||!['offline','timeout','unavailable'].includes(error.category))throw error;
    return{renderer:new RouteRenderer(route,{features:[]},settings.width,settings.height,config.visualStyle,config,readyMarker),region:'global',credit:'Локальная геометрия GPX · без географической подложки',detail:'Базовая карта недоступна. Показана схема исходного GPX; координаты и расстояние сохранены.',notice:'Открыта упрощённая 2D-схема GPX без подложки. Повтор карты доступен при восстановлении соединения.'};
  }
  const map=config.cameraMode==='cinematic'?{...base,geography:await loadGeography(signal)}:base;
  signal.throwIfAborted();
  const bounds=map.geography?.region.extent,covered=bounds&&route.segments.every(s=>s.every(p=>p.lon>=bounds[0]&&p.lon<=bounds[2]&&p.lat>=bounds[1]&&p.lat<=bounds[3]));
  return{renderer:new RouteRenderer(route,map,settings.width,settings.height,config.visualStyle,config,readyMarker),region:'global',credit:'Natural Earth · public domain',detail:`${covered?'Фьорды, острова и подписи 1:10m':'Обзорная география '+(config.cameraMode==='classic'?'1:110m':'1:50m')}, без улиц. Время видео и темп анимации не являются длительностью поездки или реальной скоростью.`,notice};
}
