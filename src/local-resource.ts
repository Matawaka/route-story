/** Bounded first-party downloads. Only hash-verified public assets enter this
 * small RAM cache; private GPX and uploaded marker bytes never enter it. */
export type ResourceKind = 'terrain' | 'image' | 'map' | 'route' | 'marker';
export type ResourceFailure = 'offline' | 'timeout' | 'unavailable' | 'integrity' | 'resources';
export class ResourceError extends Error {
  constructor(readonly category: ResourceFailure, readonly kind: ResourceKind) {
    super(`Local resource: ${category} (${kind})`); this.name = 'ResourceError';
  }
}
export interface ResourceOptions {
  kind: ResourceKind; limit: number; signal?: AbortSignal; timeoutMs?: number;
  bytes?: number; sha256?: string; progress?: (loaded: number, total?: number) => void;
}
export const RESOURCE_TIMEOUT_MS = 30_000;
export const RESOURCE_CACHE_BYTES = 2 * 1024 * 1024;
const cache = new Map<string, Uint8Array<ArrayBuffer>>();
let cacheBytes = 0;
export function clearResourceCache(): void { cache.clear(); cacheBytes = 0; }
export function resourceCacheSize(): number { return cacheBytes; }
export function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'));
    signal.addEventListener('abort', abort, {once: true});
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
export async function localBytes(url: string, options: ResourceOptions): Promise<Uint8Array<ArrayBuffer>> {
  const {kind, limit, signal, bytes, sha256, progress} = options;
  signal?.throwIfAborted();
  // Fixed relative paths only; loaders keep their own manifest allowlists.
  if (/^(?:[a-z]+:|\/\/)/i.test(url) || url.includes('..') || !Number.isSafeInteger(limit) || limit < 1) throw new ResourceError('integrity', kind);
  if ((sha256 !== undefined && !/^[a-f0-9]{64}$/.test(sha256)) || (bytes !== undefined && (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > limit))) throw new ResourceError('integrity', kind);
  const key = sha256 ? `${url}:${sha256}` : undefined;
  const cached = key && cache.get(key);
  if (cached) { cache.delete(key!); cache.set(key!, cached); progress?.(cached.length, cached.length); return cached.slice(); }
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason ?? new DOMException('Cancelled', 'AbortError'));
  signal?.addEventListener('abort', cancel, {once: true});
  const timer = setTimeout(() => controller.abort(new ResourceError('timeout', kind)), options.timeoutMs ?? RESOURCE_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await abortable(fetch(url, {signal: controller.signal}), controller.signal);
    if (!response.ok || !response.body) throw new ResourceError('unavailable', kind);
    const header = Number(response.headers.get('content-length'));
    if (header > limit) throw new ResourceError('resources', kind);
    reader = response.body.getReader(); const parts: Uint8Array[] = []; let count = 0;
    for (;;) {
      const {done, value} = await abortable(reader.read(), controller.signal);
      if (done) break;
      count += value.byteLength;
      if (count > limit) throw new ResourceError('resources', kind);
      parts.push(value); progress?.(count, bytes ?? (header > 0 ? header : undefined));
    }
    const data = new Uint8Array(count); let offset = 0;
    for (const part of parts) { data.set(part, offset); offset += part.length; }
    if (bytes !== undefined && count !== bytes) throw new ResourceError('integrity', kind);
    if (sha256) {
      const digest = await abortable(crypto.subtle.digest('SHA-256', data), controller.signal);
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      if (hash !== sha256) throw new ResourceError('integrity', kind);
    }
    controller.signal.throwIfAborted();
    if (key && data.length <= RESOURCE_CACHE_BYTES) {
      const prior=cache.get(key);if(prior){cacheBytes-=prior.length;cache.delete(key);}
      while (cacheBytes + data.length > RESOURCE_CACHE_BYTES) {
        const oldest = cache.keys().next().value!; cacheBytes -= cache.get(oldest)!.length; cache.delete(oldest);
      }
      cache.set(key, data.slice()); cacheBytes += data.length;
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof ResourceError) throw error;
    throw new ResourceError(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'unavailable', kind);
  } finally {
    clearTimeout(timer); signal?.removeEventListener('abort', cancel);
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}
