import { test, expect } from '@playwright/test';
import { syntheticGpx } from '../fixtures/synthetic';
test('fixed stroke batches are independent of frame history and preserve every segment gap',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async xml=>{
    const paths=['/src/renderer.ts','/src/gpx.ts','/src/story.ts','/src/geo.ts'];const[{RouteRenderer},{parseGpx},{defaultStoryConfig},{fitProjection}]=await Promise.all(paths.map(p=>import(p))),route=parseGpx(xml),config=defaultStoryConfig(route.name);
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
    const renderer=new RouteRenderer(route,{features:[]},640,360,'atlas',config),fresh=new RouteRenderer(route,{features:[]},640,360,'atlas',config);
    const project=fitProjection(route.segments,640,360).project,gapPositions=route.segments.slice(1).map((segment,i)=>{const a=project(route.segments[i].at(-1)),b=project(segment[0]);return [Math.round((a[0]+b[0])/2),Math.round((a[1]+b[1])/2)];});
    const gaps=()=>gapPositions.map(([x,y])=>Array.from(canvas.getContext('2d').getImageData(x,y,1,1).data));renderer.draw(canvas,0);const gapsBefore=gaps();
    for(let t=0;t<12;t+=1/24)renderer.draw(canvas,t);renderer.draw(canvas,12);const replay=canvas.toDataURL();fresh.draw(canvas,12);const direct=canvas.toDataURL();renderer.draw(canvas,20);const gapsAfter=gaps();renderer.draw(canvas,12);const backward=canvas.toDataURL();
    renderer.dispose();fresh.dispose();return{same:replay===direct&&direct===backward,points:route.pointCount,gapsBefore,gapsAfter};
  },syntheticGpx(5000,'segments'));
  expect(result.same).toBe(true);expect(result.points).toBe(5000);expect(result.gapsBefore).toEqual(result.gapsAfter);
});
test('native encoder failure closes encoder and temporary canvas resources',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const path='/src/exporter.ts';const{exportVideo}=await import(path),Native=VideoEncoder,instances:VideoEncoder[]=[],canvases:HTMLCanvasElement[]=[],create=document.createElement.bind(document);let error='';
    document.createElement=((tag:string,options?:ElementCreationOptions)=>{const e=create(tag,options);if(e instanceof HTMLCanvasElement)canvases.push(e);return e;}) as typeof document.createElement;
    window.VideoEncoder=class extends Native{constructor(init:VideoEncoderInit){super(init);instances.push(this);}encode(){throw new DOMException('Deliberate encoder failure','EncodingError');}};
    try{await exportVideo({width:640,height:360,draw:(c:HTMLCanvasElement)=>c.getContext('2d')!.fillRect(0,0,10,10)});}catch(e){error=(e as Error).message;}finally{window.VideoEncoder=Native;document.createElement=create;}
    return{error,states:instances.map(i=>i.state),canvasSizes:canvases.map(c=>[c.width,c.height])};
  });
  expect(result.error).toContain('Deliberate encoder failure');expect(result.states.length).toBeGreaterThan(0);expect(result.states.every(s=>s==='closed')).toBe(true);
  expect(result.canvasSizes.length).toBeGreaterThan(0);expect(result.canvasSizes.every(([w,h])=>w===0&&h===0)).toBe(true);
});
test('invalid import releases visible canvas pixels and the next valid import works',async({page})=>{
  await page.goto('/');await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();
  await page.getByLabel('Выбрать GPX-файл').setInputFiles('tests/fixtures/malformed.gpx');await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('#preview')).toHaveAttribute('width','0');await expect(page.locator('#preview')).toHaveAttribute('height','0');
  await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();await expect(page.locator('#preview')).toHaveAttribute('width','640');
});
