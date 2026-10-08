import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';
import ffprobe from '@ffprobe-installer/ffprobe';
import assert from 'node:assert/strict';

export function validateVideo(path, width, height, durationSeconds = 4, fps = 24) {
  assert.ok([4,10,20,30].includes(durationSeconds), 'bounded expected duration');
  assert.equal(fps,24,'expected frame rate');
  const expectedFrames = durationSeconds * fps;
  const metadata = JSON.parse(execFileSync(process.env.FFPROBE_PATH || ffprobe.path, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8' }));
  const stream = metadata.streams.find(item => item.codec_type === 'video');
  assert.ok(stream, 'video stream'); assert.equal(stream.codec_name, 'h264');
  assert.equal(stream.width, width); assert.equal(stream.height, height);
  assert.ok(Math.abs(Number(metadata.format.duration) - durationSeconds) <= 1 / fps, 'requested duration');
  assert.equal(stream.avg_frame_rate,`${fps}/1`,'requested frame rate');
  assert.equal(Number(stream.nb_read_frames), expectedFrames, 'all expected frames decoded');
  const timestamps = JSON.parse(execFileSync(process.env.FFPROBE_PATH || ffprobe.path, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=best_effort_timestamp_time,pkt_duration_time', '-of', 'json', path], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })).frames;
  assert.equal(timestamps.length, expectedFrames, 'all frame timestamps present');
  timestamps.forEach((frame, index) => {
    assert.ok(Math.abs(Number(frame.best_effort_timestamp_time) - index / fps) < 0.00001, `frame ${index} has deterministic timestamp`);
    assert.ok(Math.abs(Number(frame.pkt_duration_time) - 1 / fps) < 0.00001, `frame ${index} has requested duration`);
  });
  const hashes = execFileSync(process.env.FFMPEG_PATH || ffmpeg, ['-v', 'error', '-i', path, '-map', '0:v:0', '-f', 'framemd5', '-'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const frames = hashes.split('\n').filter(line => line && !line.startsWith('#'));
  assert.equal(frames.length, expectedFrames, 'FFmpeg independently decoded every frame');
  assert.ok(new Set(frames.map(line => line.split(',').at(-1).trim())).size > 20, 'actual changing animation');
  assert.ok(readFileSync(path).subarray(4, 8).equals(Buffer.from('ftyp')), 'MP4 signature');
  const report = { file: path, codec: stream.codec_name, width, height, duration: Number(metadata.format.duration), decodedFrames: frames.length, fps: stream.avg_frame_rate, frameTimestampsVerified: true, bytes: Number(metadata.format.size), validator: 'Independent FFmpeg + ffprobe', ffmpegVersion: execFileSync(process.env.FFMPEG_PATH || ffmpeg, ['-version'], { encoding: 'utf8' }).split('\n')[0] };
  writeFileSync(path + '.validation.json', JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (process.argv[1]?.endsWith('validate-video.mjs') && process.argv[2]) console.log(validateVideo(process.argv[2], Number(process.argv[3] || 640), Number(process.argv[4] || 360), Number(process.argv[5] || 4)));
