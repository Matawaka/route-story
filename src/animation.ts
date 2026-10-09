export const VIDEO_SECONDS = 4;
export const VIDEO_FPS = 24;

/** Animation time, never inferred travel time. Holds the finished route for 0.5 s. */
export function progressAt(seconds: number, duration = VIDEO_SECONDS): number {
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0) {
    throw new Error('Некорректное время анимации.');
  }
  const t = Math.min(1, Math.max(0, seconds / (duration - Math.min(0.5, duration / 4))));
  return t * t * (3 - 2 * t);
}

export function drawProof(canvas: HTMLCanvasElement, seconds: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D недоступен.');
  const { width: w, height: h } = canvas;
  const p = progressAt(seconds);
  ctx.fillStyle = '#102b2a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#355b54';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.55); ctx.lineTo(w * 0.9, h * 0.55); ctx.stroke();
  ctx.strokeStyle = '#a6e990';
  ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.55); ctx.lineTo(w * (0.1 + 0.8 * p), h * 0.55); ctx.stroke();
  ctx.fillStyle = '#a6e990';
  ctx.beginPath(); ctx.arc(w * (0.1 + 0.8 * p), h * 0.55, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f8f5e9'; ctx.font = `${h * 0.065}px system-ui`;
  ctx.fillText('Тест экспорта · 4 с', w * 0.1, h * 0.2);
  ctx.fillText('640 × 360 · 24 кадра/с', w * 0.1, h * 0.85);
}
