/** Narrow real3D check, not a claim of universal browser/mobile support. */
import {chromium,firefox,webkit} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import {withServer} from './server.mjs';
import {validateVideo} from '../validate-video.mjs';
const folder='artifacts/sprint8/compatibility';mkdirSync(folder,{recursive:true});const reports=[];
await withServer(async url=>{for(const [name,engine,channel] of [['Edge',chromium,'msedge'],['Chrome',chromium,'chrome'],['Playwright Firefox',firefox,undefined],['Playwright WebKit',webkit,undefined]]){
 let browser;const result={name,os:`${os.type()} ${os.release()} ${os.arch()}`,physicalMobile:false,status:'NOT TESTED'};
 try{
  browser=await engine.launch({channel,headless:true});result.version=browser.version();const page=await browser.newPage();await page.goto(url);
  result.preview=await page.evaluate(async()=>{
   const paths=['/src/terrain-renderer.ts','/src/terrain.ts','/src/gpx.ts','/src/story.ts','/src/exporter.ts'];const [{TerrainRenderer},{loadTerrain},{parseGpx},{defaultStoryConfig},{exportVideo,detectEncoder}]=await Promise.all(paths.map(p=>import(p))),route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),config={...defaultStoryConfig('Synthetic terrain capability'),cameraMode:'terrain',durationSeconds:4,introSeconds:0,outroSeconds:0};
   let renderer;try{renderer=new TerrainRenderer(route,await loadTerrain('compatibility'),640,360,config);}catch(e){return{terrain:false,error:e.message};}
   const canvas=document.createElement('canvas');try{
    renderer.draw(canvas,1);const direct=canvas.toDataURL();renderer.draw(canvas,3);renderer.draw(canvas,1);const deterministic=direct===canvas.toDataURL();
    const context=renderer.gpu.getContext(),extension=context.getExtension('WEBGL_debug_renderer_info'),gpu=extension?context.getParameter(extension.UNMASKED_RENDERER_WEBGL):context.getParameter(context.RENDERER);
    try{const codec=await detectEncoder(640,360);window.capabilityBlob=await exportVideo({config,draw:(c,t)=>renderer.draw(c,t)});return{terrain:true,deterministic,codec,gpu,bytes:window.capabilityBlob.size};}
    catch(e){return{terrain:true,deterministic,gpu,encoder:false,error:e.message};}
   }finally{renderer.dispose();canvas.width=canvas.height=0;}
  });
  if(result.preview.codec){const pending=page.waitForEvent('download');await page.evaluate(()=>{const u=URL.createObjectURL(window.capabilityBlob),a=document.createElement('a');a.href=u;a.download='capability.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});const path=`${folder}/${name.replaceAll(' ','-')}.mp4`;await(await pending).saveAs(path);result.video=validateVideo(path,640,360,4);result.status='VERIFIED';}
  else result.status='UNSUPPORTED';
 }catch(error){result.status='ENVIRONMENT BLOCKED';result.error=error.message;}finally{if(browser)await browser.close();reports.push(result);console.log(result);}
}});
writeFileSync(`${folder}/matrix.json`,JSON.stringify(reports,null,2));
