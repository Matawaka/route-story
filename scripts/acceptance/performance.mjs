import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import os from 'node:os';
import { withServer } from './server.mjs';
import { syntheticGpx } from '../../tests/fixtures/synthetic.ts';
import { validateVideo } from '../validate-video.mjs';
export const summarize = values => {const sorted=[...values].sort((a,b)=>a-b);return{median:sorted[Math.floor(sorted.length/2)],min:sorted[0],max:sorted.at(-1)};};
mkdirSync('artifacts/sprint3',{recursive:true});
const results=[];
await withServer(async url=>{
  const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
  const session=await page.context().newCDPSession(page);await session.send('Performance.enable');
  const heap=async()=>{const{metrics}=await session.send('Performance.getMetrics');return Object.fromEntries(metrics.filter(m=>['JSHeapUsedSize','JSHeapTotalSize'].includes(m.name)).map(m=>[m.name,m.value]));};
  try {
    await page.goto(url);
    for(const [count,kind] of [[100,'segments'],[5000,'antimeridian'],[20000,'long'],[50000,'dense']])for(const quality of ['compatibility','standard']){
      const xml=syntheticGpx(count,kind),duration=count===50000&&quality==='standard'?30:10,iterations=[];
      for(let repeat=0;repeat<4;repeat++){
        const metrics=await page.evaluate(async({xml,quality,duration})=>{
          const paths=['/src/gpx.ts','/src/geo.ts','/src/renderer.ts','/src/story.ts','/src/exporter.ts','/src/geography.ts'];const[{parseGpx},{fitProjection},{RouteRenderer},{defaultStoryConfig,exportSettings},{detectEncoder,exportVideo},{loadGeography}]=await Promise.all(paths.map(p=>import(p)));
          const land={...await(await fetch('/maps/ne_110m_land.geojson')).json(),geography:await loadGeography()},config={...defaultStoryConfig('Синтетический benchmark'),durationSeconds:duration,qualityPreset:quality},settings=exportSettings(config);
          let begin=performance.now();const route=parseGpx(xml),parseMs=performance.now()-begin;
          begin=performance.now();fitProjection(route.segments,settings.width,settings.height);const projectionDiagnosticMs=performance.now()-begin;
          begin=performance.now();const renderer=new RouteRenderer(route,land,settings.width,settings.height,'atlas',config),prepareMs=performance.now()-begin;
          const canvas=document.createElement('canvas');canvas.width=settings.width;canvas.height=settings.height;
          begin=performance.now();renderer.draw(canvas,0);const firstFrameMs=performance.now()-begin,frameMs=[],seekMs=[];
          for(let i=0;i<60;i++){begin=performance.now();renderer.draw(canvas,i*duration/59);frameMs.push(performance.now()-begin);}
          for(const fraction of [.2,.9,.1,.8,.3,.7,.4,.6,.05,.95]){begin=performance.now();renderer.draw(canvas,duration*fraction);seekMs.push(performance.now()-begin);}
          const codec=await detectEncoder(settings.width,settings.height,settings.bitrate,24);
          try {begin=performance.now();const blob=await exportVideo({config,draw:(c,t)=>renderer.draw(c,t)}),exportMs=performance.now()-begin;
            (window).benchmarkBlob=blob;return{pointCount:route.pointCount,segments:route.segments.length,parseMs,projectionDiagnosticMs,prepareMs,firstFrameMs,previewInitializationMs:parseMs+prepareMs+firstFrameMs,frameMs,seekMs,exportMs,bytes:blob.size,codec,...settings};
          }finally{renderer.dispose();canvas.width=canvas.height=0;}
        },{xml,quality,duration});
        assert.equal(metrics.pointCount,count);metrics.heapAfterExport=await heap();metrics.warmup=repeat===0;iterations.push(metrics);
        if(repeat===3){const pending=page.waitForEvent('download');await page.evaluate(()=>{const url=URL.createObjectURL(window.benchmarkBlob),a=document.createElement('a');a.href=url;a.download='synthetic.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});const d=await pending,path=`artifacts/sprint3/benchmark-${count}-${quality}.mp4`;await d.saveAs(path);metrics.video=validateVideo(path,metrics.width,metrics.height,duration);}
        await page.evaluate(()=>{delete window.benchmarkBlob;});
      }
      const steady=iterations.slice(1),summary=Object.fromEntries(['parseMs','projectionDiagnosticMs','prepareMs','firstFrameMs','previewInitializationMs','exportMs','bytes'].map(key=>[key,summarize(steady.map(r=>r[key]))]));
      summary.frameMs=summarize(steady.flatMap(r=>r.frameMs));summary.seekMs=summarize(steady.flatMap(r=>r.seekMs));
      const result={count,kind,gpxBytes:Buffer.byteLength(xml),quality,duration,iterations,summary};results.push(result);console.log(JSON.stringify({count,kind,quality,duration,...summary}));
    }
    writeFileSync('artifacts/sprint3/performance.json',JSON.stringify({os:`${os.type()} ${os.release()} ${os.arch()}`,browser:`Edge ${browser.version()}`,method:'One warm-up + three steady runs in one isolated browser. Pure CPU timings; assets/module imports excluded. CDP JS heap is not native memory.',results},null,2));
  } finally {await browser.close();}
});
