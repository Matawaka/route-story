// Frame sequencing and capability probing adapted from Travel Animation exporter.js.
// Copyright (c) 2026 topmonroe9. MIT; see licenses/TRAVEL_ANIMATION.txt.
import { BufferTarget, StreamTarget, CanvasSource, Mp4OutputFormat, Output, Quality, type StreamTargetChunk } from 'mediabunny';
import { exportSettings, videoByteLimit, requiresFileExport, regressionStoryConfig, validateStoryConfig, type StoryConfig } from './story';
import { normalizeAvcDescription } from './avc';

const BITRATE = 1_500_000;
export function avcCodecs(width:number,height:number):readonly string[]{
  const macroblocks=Math.ceil(width/16)*Math.ceil(height/16);
  return macroblocks>8192?['avc1.640033','avc1.4d0033','avc1.420033','avc1.640034']:macroblocks>3600?['avc1.640028','avc1.4d0028','avc1.420028','avc1.640029']:['avc1.42001f','avc1.4d001f','avc1.64001f'];
}
/** A single actual frame proves initialization/flush, beyond a support promise.
 * It does not establish native-memory safety or replace MP4 decoding acceptance. */
async function probeFrame(config:VideoEncoderConfig,signal?:AbortSignal):Promise<void>{
  const canvas=document.createElement('canvas');canvas.width=config.width;canvas.height=config.height;
  let encoder:VideoEncoder|undefined,frame:VideoFrame|undefined,timer:ReturnType<typeof setTimeout>|undefined,abort:()=>void=()=>{};
  try{
    const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas 2D недоступен для выбранного кадра.');ctx.fillStyle='#376174';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#ffb733';ctx.fillRect(0,0,canvas.width/3,canvas.height/2);
    let packets=0;const failure=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Пробное кодирование H.264 заняло слишком много времени.')),8000);abort=()=>reject(signal?.reason??new DOMException('Cancelled','AbortError'));signal?.addEventListener('abort',abort,{once:true});
      encoder=new VideoEncoder({output:()=>packets++,error:reject});});
    signal?.throwIfAborted();encoder!.configure(config);frame=new VideoFrame(canvas,{timestamp:0});encoder!.encode(frame,{keyFrame:true});frame.close();frame=undefined;
    await Promise.race([encoder!.flush(),failure]);if(!packets)throw Error('H.264 не создал пробный кадр.');
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);frame?.close();if(encoder&&encoder.state!=='closed')encoder.close();canvas.width=canvas.height=0;}
}

export async function detectEncoder(width: number, height: number, bitrate = BITRATE, fps = 24, signal?:AbortSignal): Promise<string> {
  if (!globalThis.isSecureContext || typeof VideoEncoder === 'undefined') {
    throw new Error('Экспорт требует WebCodecs: откройте приложение в современном Chrome или Edge через HTTPS либо localhost.');
  }
  let last='';
  for (const codec of avcCodecs(width,height)) {
    const config: VideoEncoderConfig = { codec, width, height, bitrate, framerate: fps, avc: { format: 'avc' } };
    signal?.throwIfAborted();try { const support=await VideoEncoder.isConfigSupported(config);if(support.supported&&(width*height<=1280*720||support.config?.width===width&&support.config?.height===height)){if(width*height>1280*720)await probeFrame(config,signal);return codec;} } catch(error) { signal?.throwIfAborted();last=error instanceof Error?error.message:''; }
  }
  const pixels=width*height,fallback=pixels>1920*1080?'1080p или 720p':pixels>1280*720?'720p или «Совместимое · 360p»':pixels>640*360?'«Совместимое · 360p»':'другой браузер или устройство';
  throw new Error(`На этом устройстве нет работающего H.264 для ${width} × ${height}. ${last?last+' ':''}Выберите ${fallback}.`);
}

export interface ExportOptions {
  config?: StoryConfig;
  /** Internal Sprint 1 regression adapter; arbitrary dimensions are rejected. */
  width?: number; height?: number;
  draw: (canvas: HTMLCanvasElement, seconds: number) => void | Promise<void>;
  /** Resident CPU composition canvas: avoids another full-frame copy in 3D. */
  canvas?:HTMLCanvasElement;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}
export type VideoFileWriter=Pick<FileSystemWritableFileStream,'write'|'close'|'abort'>;
export async function exportVideo(options:ExportOptions):Promise<Blob>{return await encodeVideo(options) as Blob;}
export async function exportVideoToFile(options:ExportOptions,writable:VideoFileWriter):Promise<{bytes:number}>{try{return await encodeVideo(options,writable) as {bytes:number};}catch(error){await writable.abort().catch(()=>{});throw error;}}
async function encodeVideo(options:ExportOptions,writable?:VideoFileWriter):Promise<Blob|{bytes:number}>{
  const { signal } = options;
  if (!options.config && !((options.width === 640 && options.height === 360) || (options.width === 360 && options.height === 640))) {
    throw new Error('Нужны настройки видео; регрессия допускает только 640×360 или 360×640.');
  }
  const config = validateStoryConfig(options.config ?? { ...regressionStoryConfig(), aspectRatio: options.height === 640 ? 'portrait' : 'landscape' });
  const { width, height, bitrate, fps, frameCount } = exportSettings(config);
  const byteLimit = videoByteLimit(config);
  if(requiresFileExport(config)&&!writable)throw Error('4K на 60 секунд требует прямой записи в файл. Выберите запись в файл, 30 секунд или 1080p.');
  signal?.throwIfAborted();
  const codec = await detectEncoder(width, height, bitrate, fps,signal);
  signal?.throwIfAborted();
  const canvas = options.canvas??document.createElement('canvas');if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  let finalizing=false,fileCommitted=false,writtenBytes=0,encodedBytes=0,encodedFrames=0;
  const target = writable?new StreamTarget(new WritableStream<StreamTargetChunk>({
    async write(chunk){signal?.throwIfAborted();const end=chunk.position+chunk.data.byteLength;if(!Number.isSafeInteger(end)||end>byteLimit+1024*1024)throw Error('Файл MP4 превысил выбранный предел.');try{await writable.write(chunk);}catch{throw Error('Не удалось записать MP4 в файл. Проверьте свободное место и разрешение на запись.');}writtenBytes=Math.max(writtenBytes,end);},
    async close(){if(!finalizing||signal?.aborted){await writable.abort();return;}if(encodedFrames!==frameCount)throw Error('H.264 создал неполное число кадров. Повторите экспорт или выберите другое качество.');try{await writable.close();}catch{throw Error('Не удалось завершить запись MP4. Проверьте свободное место и попробуйте снова.');}fileCommitted=true;},
    async abort(reason){await writable.abort(reason);}
  },{highWaterMark:1}),{chunked:true,chunkSize:1024*1024}):new BufferTarget();
  // reserve creates an ordinary seekable MP4 with bounded metadata, not fMP4.
  // New memory-mode presets avoid the muxer's second all-media fast-start store.
  const output = new Output({ format: new Mp4OutputFormat({ fastStart:writable?'reserve':width*height>1280*720?false:'in-memory' }), target });
  const source = new CanvasSource(canvas, { codec: 'avc', fullCodecString: codec, quality: new Quality({ bitrate }), keyFrameInterval: 2,
    onEncodedPacket: (packet, metadata) => {
      if (metadata?.decoderConfig?.description) metadata.decoderConfig.description = normalizeAvcDescription(metadata.decoderConfig.description);
      encodedBytes += packet.data.byteLength; if (encodedBytes > byteLimit) throw new Error(`Видео превысило лимит ${byteLimit / 1024 / 1024} МиБ. Выберите более короткое видео или совместимое качество.`);
      if(++encodedFrames>frameCount)throw Error('H.264 вернул неожиданное число кадров.');
      if(!signal?.aborted)options.onProgress?.(.98*encodedFrames/frameCount);
    }
  });
  output.addVideoTrack(source, { frameRate: fps,...(writable?{maximumPacketCount:frameCount}:{}) });
  let complete = false;
  try {
    await output.start();
    for (let frame = 0; frame < frameCount; frame++) {
      signal?.throwIfAborted();
      // A renderer readiness barrier may complete asynchronously. Never capture
      // a partially loaded scene; still retain only the current frame.
      await options.draw(canvas, frame / fps);
      signal?.throwIfAborted();
      await source.add(frame / fps, 1 / fps);
      // A high-resolution readback can be slow under software graphics. Give
      // real pointer/keyboard cancellation a turn after every such frame.
      if (width * height > 1280 * 720 || frame % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    signal?.throwIfAborted();
    source.close();
    finalizing=true;await output.finalize();
    if(encodedFrames!==frameCount)throw Error('H.264 создал неполное число кадров. Повторите экспорт или выберите другое качество.');
    if(writable&&!fileCommitted)throw Error('Файл MP4 не завершён.');
    const buffer=target instanceof BufferTarget?target.buffer:undefined;
    if(!writable&&!buffer)throw new Error('Кодировщик не создал MP4.');
    if(buffer&&buffer.byteLength>byteLimit+1024*1024)throw new Error('MP4 превысил допустимый размер.');
    if(!fileCommitted)signal?.throwIfAborted();
    complete = true;
    options.onProgress?.(1);
    return writable?{bytes:writtenBytes}:new Blob([buffer!], { type: 'video/mp4' });
  } finally {
    if(!complete)finalizing=false;
    try { source.close(); } finally {
      try { if (!complete&&output.state!=='finalized') await output.cancel(); } finally { if(writable&&!fileCommitted)await writable.abort().catch(()=>{});if(!options.canvas)canvas.width = canvas.height = 0; }
    }
  }
}

export function downloadVideo(blob: Blob, filename = 'route-story.mp4'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
