import type { Route, RoutePoint } from './route';
import { routeMetrics } from './geo';
export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_POINTS = 50_000;
const GPX_NAMESPACES = new Set(['', 'http://www.topografix.com/GPX/1/0', 'http://www.topografix.com/GPX/1/1']);

function children(parent: Element, name: string): Element[] {
  return Array.from(parent.childNodes).filter((node): node is Element => node.nodeType === 1 && (node as Element).localName === name && (node as Element).namespaceURI === parent.namespaceURI);
}
function text(parent: Element, name: string, max = 200): string | undefined {
  const nodes = children(parent, name);
  if (nodes.length > 1) throw new Error(`GPX содержит повторяющееся поле ${name}.`);
  const value = nodes[0]?.textContent?.trim();
  if (value && value.length > max) throw new Error(`Поле ${name} слишком длинное (максимум ${max} символов).`);
  return value || undefined;
}
function number(value: string | null | undefined, label: string, min = -Infinity, max = Infinity): number {
  if (!value?.trim() || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) throw new Error(`Некорректное значение: ${label}.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Значение вне допустимых границ: ${label}.`);
  return n;
}
function point(element: Element): RoutePoint {
  const p: RoutePoint = { lon: number(element.getAttribute('lon'), 'долгота', -180, 180), lat: number(element.getAttribute('lat'), 'широта', -90, 90) };
  const elevation = text(element, 'ele', 100);
  if (children(element, 'ele').length) p.elevation = number(elevation, 'высота', -12_000, 100_000);
  const time = text(element, 'time', 100);
  if (children(element, 'time').length) {
    if (!time || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(time) || !Number.isFinite(Date.parse(time))) throw new Error('Некорректная временная метка GPX.');
    const [year, month, day] = time.slice(0, 10).split('-').map(Number);
    const date = new Date(0); date.setUTCFullYear(year, month - 1, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || Number(time.slice(11, 13)) > 23 || Number(time.slice(14, 16)) > 59 || Number(time.slice(17, 19)) > 59) throw new Error('Некорректная дата GPX.');
    p.time = time;
  }
  return p;
}

function preflight(xml: string): void {
  if (new TextEncoder().encode(xml).byteLength > MAX_BYTES) throw new Error('Максимальный размер GPX — 10 МиБ.');
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error('DTD и ENTITY запрещены.');
  // Bound tree depth and element count before asking the native XML parser to allocate a DOM.
  let depth = 0, elements = 0;
  const tokens = xml.matchAll(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/?[^>]+>/g);
  for (const [token] of tokens) {
    if (token.startsWith('<!') || token.startsWith('<?')) continue;
    if (token.startsWith('</')) depth--;
    else { elements++; if (!/\/\s*>$/.test(token)) depth++; }
    if (depth > 64 || elements > 300_000) throw new Error('Слишком сложный GPX: превышен лимит структуры.');
  }
}

export function parseGpx(xml: string, fallbackName = 'Мой маршрут'): Route {
  preflight(xml);
  let doc: Document;
  try { doc = new DOMParser().parseFromString(xml, 'application/xml'); } catch { throw new Error('Не удалось прочитать XML в GPX.'); }
  if (doc.getElementsByTagName('parsererror').length || !doc.documentElement) throw new Error('Некорректный XML в GPX.');
  const root = doc.documentElement;
  if (root.localName !== 'gpx' || !GPX_NAMESPACES.has(root.namespaceURI || '')) throw new Error('Файл должен содержать GPX 1.0 или 1.1.');
  let points = 0;
  const stack: Element[] = [root];
  while (stack.length) {
    const element = stack.pop()!;
    if (['script', 'svg', 'iframe', 'object', 'embed', 'style', 'link', 'image'].includes(element.localName.toLowerCase())) throw new Error('Исполняемое содержимое в GPX запрещено.');
    for (const attribute of Array.from(element.attributes)) if (/^on/i.test(attribute.localName) || /^\s*(?:javascript|vbscript|data):/i.test(attribute.value)) throw new Error('Небезопасное содержимое в GPX.');
    if (['trkpt', 'rtept', 'wpt'].includes(element.localName)) {
      if (++points > MAX_POINTS) throw new Error('Максимум 50 000 точек. Файл не обрезан.');
      const parent = element.parentNode as Element;
      const valid = element.localName === 'trkpt' ? parent.localName === 'trkseg' && (parent.parentNode as Element)?.localName === 'trk' && parent.parentNode?.parentNode === root
        : element.localName === 'rtept' ? parent.localName === 'rte' && parent.parentNode === root : parent === root;
      if (!valid || element.namespaceURI !== root.namespaceURI || parent.namespaceURI !== root.namespaceURI) throw new Error('Точка GPX находится вне стандартного трека или маршрута.');
      if (element.localName === 'wpt') point(element);
    }
    for (const child of Array.from(element.childNodes)) if (child.nodeType === 1) stack.push(child as Element);
  }
  const segments: RoutePoint[][] = [];
  let trackName: string | undefined;
  // Preserve source order, including interleaved tracks and routes.
  for (const item of Array.from(root.childNodes)) {
    if (item.nodeType !== 1) continue;
    const element = item as Element;
    if (element.namespaceURI !== root.namespaceURI) continue;
    if (element.localName === 'trk') {
      trackName ||= text(element, 'name');
      for (const segment of children(element, 'trkseg')) {
        const pts = children(segment, 'trkpt').map(point); if (pts.length) segments.push(pts);
      }
    } else if (element.localName === 'rte') {
      trackName ||= text(element, 'name');
      const pts = children(element, 'rtept').map(point); if (pts.length) segments.push(pts);
    }
  }
  if (!segments.length) throw new Error('В GPX нет точек трека или маршрута.');
  const metadata = children(root, 'metadata')[0] || root;
  const name = text(metadata, 'name') || trackName || fallbackName;
  const creator = root.getAttribute('creator') || undefined;
  if (creator && creator.length > 200) throw new Error('Поле creator слишком длинное.');
  return { segments, name, description: text(metadata, 'desc', 2000), creator, ...routeMetrics(segments) };
}

export async function readGpx(file: File): Promise<Route> {
  if (file.size > MAX_BYTES) throw new Error('Максимальный размер GPX — 10 МиБ.');
  // TextDecoder's fatal mode prevents silent replacement of corrupt UTF-8 bytes.
  let xml: string;
  try { xml = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); } catch { throw new Error('GPX должен быть корректным текстом UTF-8.'); }
  if (/^\s*<\?xml[^?]*encoding\s*=\s*["'](?!utf-8["'])/i.test(xml)) throw new Error('Поддерживается только кодировка UTF-8.');
  return parseGpx(xml, file.name.replace(/\.gpx$/i, '').slice(0, 200) || 'Мой маршрут');
}
