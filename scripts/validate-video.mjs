import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';
import ffprobe from '@ffprobe-installer/ffprobe';
import assert from 'node:assert/strict';

export function validateVideo(path, width, height) {
  const metadata = JSON.parse(execFileSync(process.env.FFPROBE_PATH || ffprobe.path, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8' }));
  const stream = metadata.streams.find(item => item.codec_type === 'video');
  assert.ok(stream, 'video stream'); assert.equal(stream.codec_name, 'h264');
  assert.equal(stream.width, width); assert.equal(stream.height, height);
  assert.ok(Math.abs(Number(metadata.format.duration) - 4) <= 1 / 24, 'four-second duration');
  assert.equal(Number(stream.nb_read_frames), 96, 'all expected frames decoded');
  const hashes = execFileSync(process.env.FFMPEG_PATH || ffmpeg, ['-v', 'error', '-i', path, '-map', '0:v:0', '-f', 'framemd5', '-'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const frames = hashes.split('\n').filter(line => line && !line.startsWith('#'));
  assert.equal(frames.length, 96, 'FFmpeg independently decoded every frame');
  assert.ok(new Set(frames.map(line => line.split(',').at(-1).trim())).size > 20, 'actual changing animation');
  assert.ok(readFileSync(path).subarray(4, 8).equals(Buffer.from('ftyp')), 'MP4 signature');
  const report = { file: path, codec: stream.codec_name, width, height, duration: Number(metadata.format.duration), decodedFrames: frames.length, fps: stream.avg_frame_rate, bytes: Number(metadata.format.size), validator: 'Independent FFmpeg + ffprobe', ffmpegVersion: execFileSync(process.env.FFMPEG_PATH || ffmpeg, ['-version'], { encoding: 'utf8' }).split('\n')[0] };
  writeFileSync(path + '.validation.json', JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (process.argv[1]?.endsWith('validate-video.mjs') && process.argv[2]) console.log(validateVideo(process.argv[2], Number(process.argv[3] || 640), Number(process.argv[4] || 360)));
