export type VisualStyle = 'atlas' | 'night';
export type AspectRatio = 'landscape' | 'portrait';
export type QualityPreset = 'compatibility' | 'standard';
export type StoryDuration = 4 | 10 | 20 | 30;
export interface StoryConfig {
  readonly durationSeconds: StoryDuration;
  readonly introSeconds: number;
  readonly outroSeconds: number;
  readonly title: string;
  readonly visualStyle: VisualStyle;
  readonly aspectRatio: AspectRatio;
  readonly qualityPreset: QualityPreset;
}
export const TITLE_LIMIT = 200;
export const FPS = 24;
export const MAX_VIDEO_BYTES = 32 * 1024 * 1024;

export function validateStoryConfig(input: StoryConfig, allowRegression = true): Readonly<StoryConfig> {
  if (!input || ![10, 20, 30, ...(allowRegression ? [4] : [])].includes(input.durationSeconds)) throw new Error('Длительность видео: только 10, 20 или 30 секунд.');
  for (const seconds of [input.introSeconds, input.outroSeconds]) {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 3) throw new Error('Вступление и финал: от 0 до 3 секунд.');
  }
  if (input.durationSeconds - input.introSeconds - input.outroSeconds < 1) throw new Error('Для повтора маршрута должна оставаться хотя бы 1 секунда.');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > TITLE_LIMIT || /[\u0000-\u001f\u007f]/.test(input.title)) throw new Error(`Название: от 1 до ${TITLE_LIMIT} символов, без управляющих знаков.`);
  if (!['atlas', 'night'].includes(input.visualStyle) || !['landscape', 'portrait'].includes(input.aspectRatio) || !['compatibility', 'standard'].includes(input.qualityPreset)) throw new Error('Неизвестный стиль, формат или качество видео.');
  return Object.freeze({ durationSeconds: input.durationSeconds, introSeconds: input.introSeconds, outroSeconds: input.outroSeconds, title: input.title.trim(), visualStyle: input.visualStyle, aspectRatio: input.aspectRatio, qualityPreset: input.qualityPreset });
}
export function defaultStoryConfig(title = 'Мой маршрут'): Readonly<StoryConfig> {
  return validateStoryConfig({ durationSeconds: 20, introSeconds: 2, outroSeconds: 2, title, visualStyle: 'atlas', aspectRatio: 'landscape', qualityPreset: 'compatibility' });
}
export function regressionStoryConfig(title = 'Тест экспорта'): Readonly<StoryConfig> {
  return validateStoryConfig({ ...defaultStoryConfig(title), durationSeconds: 4, introSeconds: 0, outroSeconds: 0 });
}
export function exportSettings(config: StoryConfig) {
  const { qualityPreset, aspectRatio, durationSeconds } = validateStoryConfig(config);
  const longSide = qualityPreset === 'standard' ? 1280 : 640, shortSide = qualityPreset === 'standard' ? 720 : 360;
  return Object.freeze({ width: aspectRatio === 'portrait' ? shortSide : longSide, height: aspectRatio === 'portrait' ? longSide : shortSide, fps: FPS, frameCount: durationSeconds * FPS, bitrate: qualityPreset === 'standard' ? 5_000_000 : 1_500_000 });
}
export function formatVideoTime(seconds: number): string {
  const time = Math.max(0, Math.floor(seconds));
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
}
export function videoFilename(config: StoryConfig): string {
  const title = validateStoryConfig(config).title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').replace(/\s+/g, '-');
  // Prefix avoids reserved Windows device filenames; shortening is only a filename presentation rule.
  return `route-story-${Array.from(title).slice(0, 60).join('') || 'route'}-${config.durationSeconds}s-${config.aspectRatio === 'portrait' ? '9x16' : '16x9'}-${config.qualityPreset === 'standard' ? '720p' : '360p'}.mp4`;
}
