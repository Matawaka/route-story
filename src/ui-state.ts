import { ResourceError } from './local-resource';
import { GeographicError } from './geographic-plan';
export type UiErrorCategory = 'offline' | 'timeout' | 'resource' | 'integrity' | 'coverage' | 'gpx' | 'graphics' | 'memory' | 'codec' | 'export' | 'configuration';
export interface UiError { category: UiErrorCategory; message: string; code: string }
export type UiState =
  | {phase: 'INITIALIZING' | 'EMPTY'}
  | {phase: 'LOADING'; heading: string; stage: string; loaded?: number; total?: number}
  | {phase: 'READY' | 'PLAYING' | 'PAUSED' | 'CANCELLED'; notice?: string}
  | {phase: 'EXPORTING'; progress?: number}
  | {phase: 'ERROR'; error: UiError; blocking?:boolean};
export type ViewMode = 'normal' | 'compact' | 'video';
export function uiError(error: unknown, context: 'gpx' | 'scene' | 'export' | 'configuration'): UiError {
  if(error instanceof GeographicError)return{category:error.code==='timeout'?'timeout':error.code==='integrity'?'integrity':error.code==='resources'?'memory':'resource',message:error.message,code:`geography/${error.code}`};
  if (error instanceof ResourceError) {
    const names = {terrain: 'модель рельефа', image: 'спутниковая карта', map: 'карта', route: 'демонстрационный GPX', marker: 'картинка путешественника'};
    const text = error.category === 'offline' ? 'Нет интернет-соединения. Выберите локальный GPX или попробуйте снова после подключения.'
      : error.category === 'timeout' ? 'Загрузка заняла слишком много времени. Проверьте соединение и попробуйте снова.'
      : error.category === 'integrity' ? `Нарушена целостность данных: ${names[error.kind]}. DEM повреждён или Контрольная сумма не совпадает. Повторите загрузку.`
      : error.category === 'resources' ? 'Файл превышает безопасный ресурсный предел браузера. Выберите другую карту.'
      : `Недоступен ресурс: ${names[error.kind]}${error.kind==='map'?' (локальные слои карты)':''}. Проверьте соединение и попробуйте снова.`;
    return {category: error.category === 'unavailable' ? 'resource' : error.category === 'resources' ? 'memory' : error.category, message: text, code: `${error.kind}/${error.category}`};
  }
  const text = error instanceof Error ? error.message : '';
  const category: UiErrorCategory = /WebGL|3D-контекст|3D-шейдер/i.test(text) ? 'graphics'
    : /покрыти|вне полного|коридор|видимост/i.test(text) ? 'coverage'
    : /памят|ресурс|texture|GPU|allocat|out.of.memory/i.test(text) ? 'memory'
    : /WebCodecs|H.264|кодек|encoder/i.test(text) ? 'codec'
    : /поврежд|сумм|размер.*снимк/i.test(text) ? 'integrity'
    : context === 'scene' ? 'resource' : context === 'configuration' ? 'configuration' : context;
  // Parser/configuration messages are authored locally and do not contain GPX
  // content. Native/export exceptions are not exposed as private diagnostics.
  const message = category === 'graphics' ? 'Недоступен WebGL 2 или потерян 3D-контекст. Повторите подготовку или выберите «Кино · 2D».'
    : category === 'coverage' ? 'Маршрут или безопасный пролёт вне покрытия подготовленной карты. Выберите «Кино · 2D» или другой маршрут.'
    : category === 'codec' ? 'WebCodecs / H.264 не поддерживается для выбранного размера. Предпросмотр доступен; попробуйте «Совместимое · 360p» или другой браузер.'
    : category === 'memory' ? 'Браузеру недостаточно ресурсов для этой сцены. Выберите «Кино · 2D» или совместимое качество.'
    : context === 'gpx' || context === 'configuration' ? text || 'Не удалось принять настройки или GPX.'
    : context === 'export' ? 'Не удалось создать MP4. Повторите экспорт или выберите совместимое качество.'
    : category === 'integrity' ? 'Данные карты повреждены. Повторите загрузку.' : 'Не удалось подготовить карту. Проверьте соединение и попробуйте снова.';
  return {category, message, code: `${context}/${category}`};
}
