import{describe,it,expect}from'vitest';
import{defaultStoryConfig,exportSettings,previewSettings,videoByteLimit,exportSizeEstimate,requiresFileExport,videoFilename}from'../../src/story';
import{avcCodecs}from'../../src/exporter';
import{StoryTimeline}from'../../src/timeline';import{routeMetrics}from'../../src/geo';import{createCameraPlan,getCameraStateAt,cameraProject}from'../../src/camera';
describe('bounded resolution and output policy',()=>{
 it.each([['fullhd',1920,1080,10_000_000],['ultra',3840,2160,25_000_000]] as const)('real %s dimensions and lighter fixed preview',(qualityPreset,width,height,bitrate)=>{
  for(const aspectRatio of ['landscape','portrait'] as const){const c={...defaultStoryConfig(),qualityPreset,aspectRatio};expect(exportSettings(c)).toMatchObject({width:aspectRatio==='portrait'?height:width,height:aspectRatio==='portrait'?width:height,bitrate,fps:24});expect(previewSettings(c)).toMatchObject({width:aspectRatio==='portrait'?720:1280,height:aspectRatio==='portrait'?1280:720});expect(videoFilename(c)).toContain(qualityPreset==='fullhd'?'1080p':'4K');}
 });
 it('preserves old limits and only allows bounded new size estimates',()=>{
  for(const qualityPreset of ['compatibility','standard'] as const)for(const durationSeconds of [10,20,30,60] as const)expect(videoByteLimit({...defaultStoryConfig(),qualityPreset,durationSeconds})).toBe((durationSeconds===60?48:32)*1048576);
  for(const qualityPreset of ['fullhd','ultra'] as const)for(const durationSeconds of [10,20,30,60] as const){const c={...defaultStoryConfig(),qualityPreset,durationSeconds};expect(videoByteLimit(c)).toBeGreaterThan(exportSizeEstimate(c));expect(videoByteLimit(c)).toBeLessThanOrEqual(232*1048576);}
 });
 it('requires actual file streaming for a 4K minute, with ordinary fallback remaining',()=>{expect(requiresFileExport({...defaultStoryConfig(),qualityPreset:'ultra',durationSeconds:60})).toBe(true);expect(requiresFileExport({...defaultStoryConfig(),qualityPreset:'ultra',durationSeconds:30})).toBe(false);expect(requiresFileExport({...defaultStoryConfig(),qualityPreset:'fullhd',durationSeconds:60})).toBe(false);});
 it('uses appropriate AVC macroblock levels in both aspects',()=>{
  expect(avcCodecs(1280,720)[0]).toBe('avc1.42001f');expect(avcCodecs(1920,1080)[0]).toBe('avc1.640028');expect(avcCodecs(1080,1920)[0]).toBe('avc1.640028');expect(avcCodecs(3840,2160)[0]).toBe('avc1.640033');expect(avcCodecs(2160,3840)[0]).toBe('avc1.640033');
 });
 it('2D high-resolution rasterization preserves normalized geographic composition',()=>{
  const segments=[[{lon:179.6,lat:12},{lon:-179.8,lat:12.1},{lon:-179.4,lat:12.3}],[{lon:-179.3,lat:12.5},{lon:-179.1,lat:12.6}]],route={name:'Synthetic antimeridian segments',segments,...routeMetrics(segments)};
  for(const aspectRatio of ['landscape','portrait'] as const){const c={...defaultStoryConfig(),qualityPreset:'standard' as const,aspectRatio},timeline=new StoryTimeline(route,c),s=exportSettings(c),base=createCameraPlan(timeline,s.width,s.height);
   for(const qualityPreset of ['fullhd','ultra'] as const){const high=new StoryTimeline(route,{...c,qualityPreset}),out=exportSettings(high.config),plan=createCameraPlan(high,out.width,out.height);for(const time of [0,2,5,10,18,20,5]){
    expect(high.at(time)).toEqual(timeline.at(time));const a=getCameraStateAt(time,timeline,base),b=getCameraStateAt(time,high,plan);expect(b.zoom).toBeCloseTo(a.zoom,10);expect(b.center).toEqual(a.center);const point=high.at(time).point,p=cameraProject(base.world(point),a,base),q=cameraProject(plan.world(point),b,plan);expect(q[0]/out.width).toBeCloseTo(p[0]/s.width,10);expect(q[1]/out.height).toBeCloseTo(p[1]/s.height,10);
   }}
  }
 });
});
