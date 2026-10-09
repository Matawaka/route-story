import { test, expect } from '@playwright/test';
import { syntheticGpx } from '../fixtures/synthetic';
test('short-route endpoints and extreme geographic counters fit both styles and formats', async ({page}) => {
  await page.goto('/');
  for(const kind of ['short','extreme'] as const) {
    const results=await page.evaluate(async xml=>{
      const paths=['/src/renderer.ts','/src/gpx.ts','/src/story.ts'];const[{RouteRenderer},{parseGpx},{defaultStoryConfig}]=await Promise.all(paths.map(p=>import(p))),route=parseGpx(xml),results=[];
      for(const style of ['atlas','night'])for(const [width,height] of [[640,360],[360,640]]) {
        const config={...defaultStoryConfig('🚲'.repeat(100)),visualStyle:style,aspectRatio:height>width?'portrait':'landscape'},renderer=new RouteRenderer(route,{features:[]},width,height,style,config),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d')!,native=ctx.fillText.bind(ctx),labels:{text:string;left:number;right:number;top:number;bottom:number}[]=[];
        ctx.fillText=(text,x,y,...rest)=>{const m=ctx.measureText(text);labels.push({text,left:x-m.actualBoundingBoxLeft,right:x+m.actualBoundingBoxRight,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent});native(text,x,y,...rest);};
        renderer.draw(canvas,10);
        const endpoints=labels.filter(l=>['Старт','Финиш'].includes(l.text)),[a,b]=endpoints;
        const pad=Math.min(width,height)*.08;
        results.push({pointCount:route.pointCount,totalKm:route.distanceKm,overlap:endpoints.length===2&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom,overflow:labels.filter(l=>{const endpoint=/^Старт|^Финиш$/.test(l.text);return l.left<(endpoint?4:pad-2)||l.right>width-(endpoint?4:pad-2)||l.top<0||l.bottom>height;}),metres:labels.some(l=>l.text.endsWith(' м')&&l.text.includes('/')),title:labels.find(l=>l.text.startsWith('🚲'))?.text});
        renderer.dispose();canvas.width=canvas.height=0;
      }return results;
    },syntheticGpx(kind==='extreme'?50000:100,kind));
    for(const r of results) { expect(r.pointCount).toBe(kind==='extreme'?50000:100);expect(r.overflow).toEqual([]);expect(r.overlap).toBe(false);expect(r.title).toMatch(/^(🚲)+…$/);expect(r.metres).toBe(kind==='short');if(kind==='extreme')expect(r.totalKm).toBeGreaterThan(100_000_000); }
  }
});
