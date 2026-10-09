// Frame sequencing and capability probing adapted from Travel Animation exporter.js.
// Copyright (c) 2026 topmonroe9. MIT; see licenses/TRAVEL_ANIMATION.txt.
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality } from 'mediabunny';
import { VIDEO_FPS, VIDEO_SECONDS } from './animation';

const BITRATE = 1_500_000;
const CODECS = ['avc1.42001f', 'avc1.4d001f', 'avc1.64001f'];

export async function detectEncoder(width: number, height: number): Promise<string> {
  if (!globalThis.isSecureContext || typeof VideoEncoder === 'undefined') {
    throw new Error('Экспорт требует WebCodecs: откройте приложение в современном Chrome или Edge через HTTPS либо localhost.');
  }
  for (const codec of CODECS) {
    const config: VideoEncoderConfig = { codec, width, height, bitrate: BITRATE, framerate: VIDEO_FPS, avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(config)).supported) return codec; } catch { /* Try next AVC profile. */ }
  }
  throw new Error('На этом устройстве нет доступного кодировщика H.264. Попробуйте Chrome или Edge на другом устройстве.');
}

export async function exportVideo(options: {
  width: number; height: number;
  draw: (canvas: HTMLCanvasElement, seconds: number) => void;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
}): Promise<Blob> {
  const { width, height, signal } = options;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width % 2 || height % 2 || width < 2 || height < 2 || width > 1920 || height > 1920) {
    throw new Error('Размер видео должен быть чётным и не превышать 1920 пикселей.');
  }
  signal?.throwIfAborted();
  const codec = await detectEncoder(width, height);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
  const source = new CanvasSource(canvas, { codec: 'avc', fullCodecString: codec, quality: new Quality({ bitrate: BITRATE }), keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: VIDEO_FPS });
  let complete = false;
  try {
    await output.start();
    for (let frame = 0; frame < VIDEO_SECONDS * VIDEO_FPS; frame++) {
      signal?.throwIfAborted();
      options.draw(canvas, frame / VIDEO_FPS);
      await source.add(frame / VIDEO_FPS, 1 / VIDEO_FPS);
      options.onProgress?.((frame + 1) / (VIDEO_SECONDS * VIDEO_FPS));
      // Let input and cancellation events run even on fast software encoders.
      if (frame % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    source.close();
    await output.finalize();
    if (!target.buffer) throw new Error('Кодировщик не создал MP4.');
    complete = true;
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
