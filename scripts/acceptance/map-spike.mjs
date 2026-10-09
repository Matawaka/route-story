/** Opt-in investigation only; downloaded MapLibre stays ignored and never enters dist. */
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,statSync} from 'node:fs';
import {withServer} from './server.mjs';
import {validateVideo} from '../validate-video.mjs';
mkdirSync('artifacts/sprint7',{recursive:true});
const response=await fetch('https://matawaka.github.io/route-story/maps/ne_110m_land.geojson',{headers:{Range:'bytes=0-126'}});
const range={status:response.status,contentRange:response.headers.get('content-range'),acceptRanges:response.headers.get('accept-ranges'),receivedBytes:(await response.arrayBuffer()).byteLength};
await withServer(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage(),external=[];
 await page.context().route('**/*',r=>{if(new URL(r.request().url()).origin!==new URL(url).origin){external.push(r.request().url());return r.abort();}return r.continue();});
 try{
  await page.goto(url);const result=await page.evaluate(async()=>{
   const path='/.reference/maplibre-spike/package/dist/maplibre-gl.mjs',gl=await import(path);gl.setWorkerUrl('/.reference/maplibre-spike/package/dist/maplibre-gl-worker.mjs');
   const container=document.createElement('div');container.style.width='640px';container.style.height='360px';document.body.append(container);
   const geography=await(await fetch('/maps/ne_110m_land.geojson')).json(),begin=performance.now();
   const map=new gl.Map({container,center:[5.3,60.4],zoom:6,interactive:false,attributionControl:false,canvasContextAttributes:{preserveDrawingBuffer:true},fadeDuration:0,style:{version:8,transition:{duration:0,delay:0},sources:{land:{type:'geojson',data:geography}},layers:[{id:'water',type:'background',paint:{'background-color':'#a9c8ce'}},{id:'land',type:'fill',source:'land',paint:{'fill-color':'#e5e3ce'}}]}});
   const ready=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Map idle timeout')),10000);map.once('idle',()=>{clearTimeout(timer);resolve();});});
   await ready();const loadMs=performance.now()-begin,canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');
   const capture=async t=>{const pending=ready();map.jumpTo({center:[5.3+t*.2,60.4+t*.12],zoom:6+t*.7});map.triggerRepaint();await pending;ctx.drawImage(map.getCanvas(),0,0);return canvas.toDataURL();};
   const first=await capture(.5);await capture(1);const repeated=await capture(.5),captures=[],start=performance.now();
   for(let i=0;i<96;i++){await capture(i/95);captures.push(await createImageBitmap(map.getCanvas()));}
   const captureMs=performance.now()-start,exportPath='/src/exporter.ts',{exportVideo}=await import(exportPath),exportStart=performance.now();
   try{window.spikeBlob=await exportVideo({width:640,height:360,draw:(target,t)=>target.getContext('2d').drawImage(captures[Math.round(t*24)],0,0)});return{loadMs,captureMs,encodeMs:performance.now()-exportStart,deterministic:first===repeated,allTilesLoaded:map.areTilesLoaded(),canvasCaptureSupported:true,mapLibreVersion:gl.getVersion(),bytes:window.spikeBlob.size};}
   finally{for(const bitmap of captures)bitmap.close();map.remove();container.remove();canvas.width=canvas.height=0;}
  });
  const pending=page.waitForEvent('download');await page.evaluate(()=>{const u=URL.createObjectURL(window.spikeBlob),a=document.createElement('a');a.href=u;a.download='map-spike.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});await(await pending).saveAs('artifacts/sprint7/maplibre-spike.mp4');
  result.video=validateVideo('artifacts/sprint7/maplibre-spike.mp4',640,360,4);result.external=external;result.browser=`Edge ${browser.version()}`;result.httpRange=range;
  result.runtimeBytes=['maplibre-gl.mjs','maplibre-gl-worker.mjs','maplibre-gl.css'].reduce((n,f)=>n+statSync(`.reference/maplibre-spike/package/dist/${f}`).size,0);
  result.limitations='GeoJSON source spike, not a verified regional MVT/PMTiles package. 96-frame pre-capture is diagnostic only and is not a production export design. Native/GPU memory unmeasured.';
  writeFileSync('artifacts/sprint7/maplibre-spike.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }finally{await browser.close();}
});
