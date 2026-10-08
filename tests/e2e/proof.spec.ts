import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
// @ts-expect-error Node-only independent decoder script
import { validateVideo } from '../../scripts/validate-video.mjs';

test('real four-second H.264 proof with independent decoding', async ({ page }) => {
  const external: string[] = [];
  await page.route('**/*', route => { const url = new URL(route.request().url()); if (url.origin !== 'http://127.0.0.1:4173') { external.push(url.href); return route.abort(); } return route.continue(); });
  await page.goto('/');
  const pending = page.waitForEvent('download');
  await page.evaluate(async () => {
    const animationPath = '/src/animation.ts', exporterPath = '/src/exporter.ts';
    const { drawProof } = await import(animationPath), { exportVideo, downloadVideo } = await import(exporterPath);
    const blob = await exportVideo({ width: 640, height: 360, draw: drawProof });
    downloadVideo(blob, 'route-story-proof.mp4');
  });
  const download = await pending;
  mkdirSync('artifacts', { recursive: true });
  const path = 'artifacts/route-story-proof.mp4'; await download.saveAs(path);
  expect(validateVideo(path, 640, 360).decodedFrames).toBe(96);
  expect(external).toEqual([]);
});
