export type VisualStyle = 'atlas' | 'night';
export type AspectRatio = 'landscape' | 'portrait';
export type QualityPreset = 'compatibility' | 'standard' | 'fullhd' | 'ultra';
export type CameraMode = 'cinematic' | 'classic' | 'terrain' | 'auto';
export type StoryDuration = 4 | 10 | 20 | 30 | 60;
export interface StoryConfig {
  readonly durationSeconds: StoryDuration;
  readonly introSeconds: number;
  readonly outroSeconds: number;
  readonly title: string;
  readonly visualStyle: VisualStyle;
  readonly aspectRatio: AspectRatio;
  readonly qualityPreset: QualityPreset;
  /** Omitted legacy configurations retain the classic renderer. */
  readonly cameraMode?: CameraMode;
  readonly terrainSurface?: 'dem' | 'photo';
  readonly terrainFlight?: 'conservative' | 'corridor';
  readonly routeColor?: 'plain' | 'grade';
  readonly replayPacing?: 'distance' | 'terrain';
  readonly marker?: 'point' | 'traveler' | 'unicycle' | 'bicycle' | 'pedestrian' | 'custom';
  readonly markerPresentation?: 'annotation' | 'occluded';
  readonly markerSize?: 'small' | 'medium' | 'large';
  /** Screen overlays only; geographic state and required credits are unchanged. */
  readonly captionMode?: 'full' | 'none';
}
export const TITLE_LIMIT = 200;
export const FPS = 24;
export const MAX_VIDEO_BYTES = 32 * 1024 * 1024;
/** The owner-requested minute preset retains 720p/5 Mbps; shorter presets keep their old bound. */
export const MAX_MINUTE_VIDEO_BYTES = 48 * 1024 * 1024;
export const QUALITY_PRESETS = Object.freeze({
  compatibility:Object.freeze({long:640,short:360,bitrate:1_500_000,label:'360p'}),
  standard:Object.freeze({long:1280,short:720,bitrate:5_000_000,label:'720p'}),
  fullhd:Object.freeze({long:1920,short:1080,bitrate:10_000_000,label:'1080p'}),
  ultra:Object.freeze({long:3840,short:2160,bitrate:25_000_000,label:'4K'})
});
/** New-resolution caps are independent; old 32/48 MiB policies never expand. */
export function videoByteLimit(config:StoryConfig):number {
  if(config.qualityPreset==='fullhd'||config.qualityPreset==='ultra')return Math.ceil((QUALITY_PRESETS[config.qualityPreset].bitrate*config.durationSeconds/8*1.25+4*1024*1024)/(8*1024*1024))*8*1024*1024;
  return config.durationSeconds===60?MAX_MINUTE_VIDEO_BYTES:MAX_VIDEO_BYTES;
}
export function exportSizeEstimate(config:StoryConfig):number {const c=validateStoryConfig(config);return QUALITY_PRESETS[c.qualityPreset].bitrate*c.durationSeconds/8;}
export function requiresFileExport(config:StoryConfig):boolean{return config.qualityPreset==='ultra'&&config.durationSeconds===60;}

export function validateStoryConfig(input: StoryConfig, allowRegression = true): Readonly<StoryConfig> {
  if (!input || ![10, 20, 30, 60, ...(allowRegression ? [4] : [])].includes(input.durationSeconds)) throw new Error('Длительность видео: только 10, 20, 30 или 60 секунд.');
  for (const seconds of [input.introSeconds, input.outroSeconds]) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 3) throw new Error('Вступление и финал: от 0 до 3 секунд.');
  }
  if (input.durationSeconds - input.introSeconds - input.outroSeconds < 1) throw new Error('Для повтора маршрута должна оставаться хотя бы 1 секунда.');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > TITLE_LIMIT || /[\u0000-\u001f\u007f]/.test(input.title)) throw new Error(`Название: от 1 до ${TITLE_LIMIT} символов, без управляющих знаков.`);
  if (!['atlas', 'night'].includes(input.visualStyle) || !['landscape', 'portrait'].includes(input.aspectRatio) || !['compatibility', 'standard', 'fullhd', 'ultra'].includes(input.qualityPreset)) throw new Error('Неизвестный стиль, формат или качество видео.');
  if (input.cameraMode !== undefined && !['cinematic', 'classic', 'terrain', 'auto'].includes(input.cameraMode)) throw new Error('Неизвестный режим камеры.');
  if(input.terrainSurface!==undefined&&!['dem','photo'].includes(input.terrainSurface))throw Error('Неизвестная поверхность рельефа.');
  if(input.terrainFlight!==undefined&&!['conservative','corridor'].includes(input.terrainFlight))throw Error('Неизвестный режим 3D-пролёта.');
  if(input.routeColor!==undefined&&!['plain','grade'].includes(input.routeColor))throw Error('Неизвестный цвет пути.');
  if(input.replayPacing!==undefined&&!['distance','terrain'].includes(input.replayPacing))throw Error('Неизвестный темп анимации.');
  if(input.marker!==undefined&&!['point','traveler','unicycle','bicycle','pedestrian','custom'].includes(input.marker))throw Error('Неизвестный маркер.');
  if(input.markerPresentation!==undefined&&!['annotation','occluded'].includes(input.markerPresentation))throw Error('Неизвестная видимость маркера.');
  if(input.markerSize!==undefined&&!['small','medium','large'].includes(input.markerSize))throw Error('Неизвестный размер маркера.');
  if(input.captionMode!==undefined&&!['full','none'].includes(input.captionMode))throw Error('Неизвестный режим подписей в видео.');
  return Object.freeze({ durationSeconds: input.durationSeconds, introSeconds: input.introSeconds, outroSeconds: input.outroSeconds, title: input.title.trim(), visualStyle: input.visualStyle, aspectRatio: input.aspectRatio, qualityPreset: input.qualityPreset, cameraMode: input.cameraMode ?? 'classic',terrainSurface:input.terrainSurface??'dem',terrainFlight:input.terrainFlight??'conservative',routeColor:input.routeColor??'plain',replayPacing:input.replayPacing??'distance',marker:input.marker??'point',markerPresentation:input.markerPresentation??'annotation',markerSize:input.markerSize??'medium',captionMode:input.captionMode??'full' });
}
export function defaultStoryConfig(title = 'Мой маршрут'): Readonly<StoryConfig> {
  return validateStoryConfig({ durationSeconds: 20, introSeconds: 2, outroSeconds: 2, title, visualStyle: 'atlas', aspectRatio: 'landscape', qualityPreset: 'compatibility', cameraMode: 'cinematic' });
}
export function regressionStoryConfig(title = 'Тест экспорта'): Readonly<StoryConfig> {
  return validateStoryConfig({ ...defaultStoryConfig(title), durationSeconds: 4, introSeconds: 0, outroSeconds: 0, cameraMode: 'classic' });
}
export function exportSettings(config: StoryConfig) {
  const { qualityPreset, aspectRatio, durationSeconds } = validateStoryConfig(config);
  const {long:longSide,short:shortSide,bitrate}=QUALITY_PRESETS[qualityPreset];
  return Object.freeze({ width: aspectRatio === 'portrait' ? shortSide : longSide, height: aspectRatio === 'portrait' ? longSide : shortSide, fps: FPS, frameCount: durationSeconds * FPS, bitrate });
}
/** Preview and camera planning use the established <=720p framing reference. */
export function previewSettings(config:StoryConfig){return exportSettings({...config,qualityPreset:config.qualityPreset==='compatibility'?'compatibility':'standard'});}
export function formatVideoTime(seconds: number): string {
  const time = Math.max(0, Math.floor(seconds));
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
}
export function videoFilename(config: StoryConfig): string {
  const title = validateStoryConfig(config).title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').replace(/\s+/g, '-');
  // Prefix avoids reserved Windows device filenames; shortening is only a filename presentation rule.
  return `route-story-${Array.from(title).slice(0, 60).join('') || 'route'}-${config.durationSeconds}s-${config.aspectRatio === 'portrait' ? '9x16' : '16x9'}-${QUALITY_PRESETS[config.qualityPreset].label}.mp4`;
}
