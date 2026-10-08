import { drawProof } from './animation';
import { detectEncoder, downloadVideo, exportVideo } from './exporter';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#preview')!;
const button = document.querySelector<HTMLButtonElement>('#export')!;
const status = document.querySelector<HTMLElement>('#status')!;
drawProof(canvas, 1.8);
button.disabled = true;
detectEncoder(640, 360).then(codec => { status.textContent = `Готово · ${codec}`; button.disabled = false; }).catch(error => { status.textContent = error.message; });
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const blob = await exportVideo({ width: 640, height: 360, draw: drawProof, onProgress: p => { status.textContent = `Экспорт: ${Math.round(p * 100)}%`; } });
    downloadVideo(blob, 'route-story-proof.mp4'); status.textContent = 'MP4 создан · 4 секунды';
  } catch (error) { status.textContent = error instanceof Error ? error.message : 'Ошибка экспорта.'; }
  finally { button.disabled = false; }
});
