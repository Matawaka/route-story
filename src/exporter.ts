// Frame sequencing and capability probing adapted from Travel Animation exporter.js.
// Copyright (c) 2026 topmonroe9. MIT; see licenses/TRAVEL_ANIMATION.txt.
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality } from 'mediabunny';
import { exportSettings, MAX_VIDEO_BYTES, regressionStoryConfig, validateStoryConfig, type StoryConfig } from './story';
import { normalizeAvcDescription } from './avc';

const BITRATE = 1_500_000;
const CODECS = ['avc1.42001f', 'avc1.4d001f', 'avc1.64001f'];

export async function detectEncoder(width: number, height: number, bitrate = BITRATE, fps = 24): Promise<string> {
  if (!globalThis.isSecureContext || typeof VideoEncoder === 'undefined') {
    throw new Error('Экспорт требует WebCodecs: откройте приложение в современном Chrome или Edge через HTTPS либо localhost.');
  }
  for (const codec of CODECS) {
    const config: VideoEncoderConfig = { codec, width, height, bitrate, framerate: fps, avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(config)).supported) return codec; } catch { /* Try next AVC profile. */ }
  }
  throw new Error('На этом устройстве нет доступного кодировщика H.264. Попробуйте Chrome или Edge на другом устройстве.');
}

export async function exportVideo(options: {
  config?: StoryConfig;
  /** Internal Sprint 1 regression adapter; arbitrary dimensions are rejected. */
  width?: number; height?: number;
  draw: (canvas: HTMLCanvasElement, seconds: number) => void | Promise<void>;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}): Promise<Blob> {
  const { signal } = options;
  if (!options.config && !((options.width === 640 && options.height === 360) || (options.width === 360 && options.height === 640))) {
    throw new Error('Нужны настройки видео; регрессия допускает только 640×360 или 360×640.');
  }
  const config = validateStoryConfig(options.config ?? { ...regressionStoryConfig(), aspectRatio: options.height === 640 ? 'portrait' : 'landscape' });
  const { width, height, bitrate, fps, frameCount } = exportSettings(config);
  signal?.throwIfAborted();
  const codec = await detectEncoder(width, height, bitrate, fps);
  signal?.throwIfAborted();
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  let encodedBytes = 0;
  const source = new CanvasSource(canvas, { codec: 'avc', fullCodecString: codec, quality: new Quality({ bitrate }), keyFrameInterval: 2,
    onEncodedPacket: (packet, metadata) => {
      if (metadata?.decoderConfig?.description) metadata.decoderConfig.description = normalizeAvcDescription(metadata.decoderConfig.description);
      encodedBytes += packet.data.byteLength; if (encodedBytes > MAX_VIDEO_BYTES) throw new Error('Видео превысило лимит 32 МиБ. Выберите более короткое видео или совместимое качество.');
    }
  });
  output.addVideoTrack(source, { frameRate: fps });
  let complete = false;
  try {
    await output.start();
    for (let frame = 0; frame < frameCount; frame++) {
      signal?.throwIfAborted();
      // A renderer readiness barrier may complete asynchronously. Never capture
      // a partially loaded scene; still retain only the current frame.
      await options.draw(canvas, frame / fps);
      await source.add(frame / fps, 1 / fps);
      options.onProgress?.(0.98 * (frame + 1) / frameCount);
      // Let input and cancellation events run even on fast software encoders.
      if (frame % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    signal?.throwIfAborted();
    source.close();
    await output.finalize();
    if (!target.buffer) throw new Error('Кодировщик не создал MP4.');
    if (target.buffer.byteLength > MAX_VIDEO_BYTES + 1024 * 1024) throw new Error('MP4 превысил допустимый размер.');
    signal?.throwIfAborted();
    complete = true;
    options.onProgress?.(1);
    return new Blob([target.buffer], { type: 'video/mp4' });
  } finally {
    try { source.close(); } finally {
      try { if (!complete) await output.cancel(); } finally { canvas.width = canvas.height = 0; }
    }
  }
}

export function downloadVideo(blob: Blob, filename = 'route-story.mp4'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
