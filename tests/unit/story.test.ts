import { describe, expect, it } from 'vitest';
import { defaultStoryConfig, exportSettings, formatVideoTime, regressionStoryConfig, validateStoryConfig, videoFilename } from '../../src/story';
import { StoryTimeline } from '../../src/timeline';
import { routeMetrics } from '../../src/geo';
import type { Route } from '../../src/route';
const segments = [[{ lon: 0, lat: 0 }, { lon: 1, lat: 0 }], [{ lon: 10, lat: 0 }, { lon: 11, lat: 0 }]];
const route: Route = { name: 'Synthetic', segments, ...routeMetrics(segments) };
describe('bounded immutable story configuration', () => {
  it('defaults to 20s with two-second intro/outro', () => { expect(defaultStoryConfig().durationSeconds).toBe(20); expect(defaultStoryConfig().introSeconds).toBe(2); expect(Object.isFrozen(defaultStoryConfig())).toBe(true); });
  it.each([10,20,30] as const)('accepts %is and exact frame counts', durationSeconds => { expect(exportSettings({ ...defaultStoryConfig(), durationSeconds }).frameCount).toBe(durationSeconds*24); });
  it.each([NaN,Infinity,-1,0,4,9,31,1000])('rejects public duration %s', duration => { expect(()=>validateStoryConfig({...defaultStoryConfig(),durationSeconds:duration as 20},false)).toThrow(); });
  it.each([NaN,Infinity,-1,4])('rejects invalid intro/outro %s', value => { expect(()=>validateStoryConfig({...defaultStoryConfig(),introSeconds:value})).toThrow(); expect(()=>validateStoryConfig({...defaultStoryConfig(),outroSeconds:value})).toThrow(); });
  it('rejects a timeline without replay space', () => { expect(()=>validateStoryConfig({...regressionStoryConfig(),introSeconds:2,outroSeconds:2})).toThrow(); });
  it.each(['', ' ', 'x'.repeat(201), 'a\nb'])('rejects invalid title %#', title => { expect(()=>validateStoryConfig({...defaultStoryConfig(),title})).toThrow(); });
  it('accepts inert HTML-looking text, sanitizes only the filename and preserves the title', () => { const c=validateStoryConfig({...defaultStoryConfig(),title:'<img src=x onerror=alert(1)> / CON'}); expect(c.title).toContain('<img'); expect(videoFilename(c)).not.toMatch(/[<>:"/\\|?*]/); expect(videoFilename(c)).toMatch(/^route-story-.+20s-16x9-360p\.mp4$/); });
  it('has exact bounded preset dimensions', () => { expect(exportSettings({...defaultStoryConfig(),qualityPreset:'standard',aspectRatio:'portrait'})).toMatchObject({width:720,height:1280,fps:24,bitrate:5_000_000}); expect(exportSettings(defaultStoryConfig())).toMatchObject({width:640,height:360}); });
  it('rejects unknown presets/styles/aspects and formats all labels', () => { for(const key of ['qualityPreset','visualStyle','aspectRatio'])expect(()=>validateStoryConfig({...defaultStoryConfig(),[key]:'evil'})).toThrow(); expect(formatVideoTime(20)).toBe('0:20');expect(formatVideoTime(30)).toBe('0:30'); });
});
describe('shared deterministic timeline', () => {
  it.each([10,20,30] as const)('has exact intro/replay/outro boundaries for %is', durationSeconds => {
    const t=new StoryTimeline(route,{...defaultStoryConfig(),durationSeconds});
    expect(t.at(0)).toMatchObject({phase:'INTRO',routeProgress:0,point:segments[0][0],travelledKm:0});
    expect(t.at(2)).toMatchObject({phase:'ROUTE_REPLAY',routeProgress:0}); expect(t.at(durationSeconds-2)).toMatchObject({phase:'OUTRO',routeProgress:1,point:segments[1][1]});
    expect(t.at(durationSeconds).timelineProgress).toBe(1); expect(t.at(-10)).toEqual(t.at(0));expect(t.at(100)).toEqual(t.at(durationSeconds));
  });
  it('supports reversible seeking and exact distance progression without gaps', () => {
    const t=new StoryTimeline(route,defaultStoryConfig());const a=t.at(6);t.at(19);expect(t.at(6)).toEqual(a);expect(a.travelledKm).toBeCloseTo(t.path.total*.25);expect(t.at(9.99).point.lon).toBeLessThan(1);expect(t.at(10).point.lon).toBe(10);expect(t.at(10).markerOpacity).toBe(0);expect(t.at(10.3).markerOpacity).toBe(1);
  });
  it('keeps regression timing and handles duplicates, stationary tracks and antimeridian', () => {
    expect(new StoryTimeline(route,regressionStoryConfig()).at(3.5).routeProgress).toBe(1);
    const s=[[{lon:179,lat:0},{lon:179,lat:0},{lon:-179,lat:0}]];const t=new StoryTimeline({...route,segments:s,...routeMetrics(s)},defaultStoryConfig());expect(Math.abs(t.at(10).point.lon)).toBe(180);
    const still=[[{lon:1,lat:1},{lon:1,lat:1}]];const stationary=new StoryTimeline({...route,segments:still,...routeMetrics(still)},defaultStoryConfig());expect(stationary.at(10)).toMatchObject({stationary:true,travelledKm:0,point:{lon:1,lat:1}});
  });
  it('rejects nonfinite time and empty geometry', () => {expect(()=>new StoryTimeline(route,defaultStoryConfig()).at(NaN)).toThrow();expect(()=>new StoryTimeline({...route,segments:[]},defaultStoryConfig())).toThrow();});
});
