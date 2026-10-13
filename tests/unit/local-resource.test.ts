import {afterEach,describe,expect,it,vi} from 'vitest';
import {abortable,clearResourceCache,localBytes,ResourceError,resourceCacheSize,RESOURCE_CACHE_BYTES} from '../../src/local-resource';
import {uiError} from '../../src/ui-state';
const hash=async(bytes:Uint8Array<ArrayBuffer>)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();clearResourceCache();});
describe('bounded local resources and UX failures',()=>{
  it('validates bytes and SHA before caching; cached copies cannot be mutated',async()=>{
    const bytes=new Uint8Array([1,2,3]),sha256=await hash(bytes),fetcher=vi.fn(async()=>new Response(bytes));vi.stubGlobal('fetch',fetcher);
    const opts={kind:'terrain' as const,limit:3,bytes:3,sha256};const first=await localBytes('./terrain/test.i16',opts);first[0]=9;
    expect(await localBytes('./terrain/test.i16',opts)).toEqual(bytes);expect(fetcher).toHaveBeenCalledTimes(1);expect(resourceCacheSize()).toBe(3);
  });
  it('rejects corruption and retries a failed resource rather than caching it',async()=>{
    const bytes=new Uint8Array([1,2]),sha256=await hash(bytes),fetcher=vi.fn().mockResolvedValueOnce(new Response(new Uint8Array([3,4]))).mockResolvedValueOnce(new Response(bytes));vi.stubGlobal('fetch',fetcher);
    const opts={kind:'image' as const,limit:2,bytes:2,sha256};await expect(localBytes('./image.jpg',opts)).rejects.toMatchObject({category:'integrity'});expect(resourceCacheSize()).toBe(0);
    expect(await localBytes('./image.jpg',opts)).toEqual(bytes);expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('bounds streamed data even without Content-Length',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Uint8Array(11))));await expect(localBytes('./x',{kind:'image',limit:10})).rejects.toMatchObject({category:'resources'});expect(resourceCacheSize()).toBe(0);
  });
  it('times out a stalled response and cancels the stream',async()=>{
    vi.useFakeTimers();const cancel=vi.fn();vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ReadableStream({cancel}))));
    const result=expect(localBytes('./x',{kind:'terrain',limit:10,timeoutMs:20})).rejects.toMatchObject({category:'timeout'});
    await vi.advanceTimersByTimeAsync(21);await result;expect(cancel).toHaveBeenCalled();expect(resourceCacheSize()).toBe(0);
  });
  it('ignores stale operations promptly even when the underlying API cannot abort',async()=>{
    const controller=new AbortController();const result=expect(abortable(new Promise(()=>{}),controller.signal)).rejects.toMatchObject({name:'AbortError'});controller.abort();await result;
  });
  it('rejects external URLs, traversal and invalid expected bounds',async()=>{
    for(const url of ['https://example.com/a','//example.com/a','../a'])await expect(localBytes(url,{kind:'map',limit:10})).rejects.toBeInstanceOf(ResourceError);
    await expect(localBytes('./x',{kind:'terrain',limit:10,bytes:11})).rejects.toMatchObject({category:'integrity'});
  });
  it('evicts old public bytes within the fixed RAM budget',async()=>{
    const bytes=new Uint8Array(RESOURCE_CACHE_BYTES/2+1),sha256=await hash(bytes);vi.stubGlobal('fetch',vi.fn(async()=>new Response(bytes)));
    for(const path of ['./one','./two','./three'])await localBytes(path,{kind:'image',limit:bytes.length,sha256});expect(resourceCacheSize()).toBe(bytes.length);clearResourceCache();expect(resourceCacheSize()).toBe(0);
  });
  it('classifies real failures with recovery guidance without private native diagnostics',()=>{
    expect(uiError(new ResourceError('timeout','image'),'scene').category).toBe('timeout');
    expect(uiError(new ResourceError('integrity','terrain'),'scene').message).toContain('целостность');
    expect(uiError(Error('WebGL 2 lost'),'scene')).toMatchObject({category:'graphics'});
    expect(uiError(Error('Маршрут вне полного покрытия DEM'),'scene')).toMatchObject({category:'coverage'});
    expect(uiError(Error('WebCodecs unsupported'),'export')).toMatchObject({category:'codec'});
    expect(uiError(Error('Private native diagnostic / GPX coordinates'),'export').message).not.toContain('Private');
  });
});
