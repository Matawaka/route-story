/** Local source-detail observation, not a global sampling bound or a camera override. */
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {withServer} from './server.mjs';
if(process.env.SWISS_PILOT!=='1')throw Error('Prepare the opt-in Swiss pack first.');
const rows=[];
await withServer(async url=>{
  const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}),page=await browser.newPage();
  try{await page.goto(url);for(const aspect of ['landscape','portrait']){
    rows.push(...await page.evaluate(async aspect=>{
      const [{loadSwissTerrain,loadSwissImagery,loadSwissRoute},{loadTraveler},{parseGpx},{TerrainRenderer},{defaultStoryConfig,exportSettings}]=await Promise.all(['/src/swiss-pilot.ts','/src/traveler.ts','/src/gpx.ts','/src/terrain-renderer.ts','/src/story.ts'].map(p=>import(p)));
      const terrain=await loadSwissTerrain(),imagery=await loadSwissImagery(),rider=await loadTraveler(),route=parseGpx(await loadSwissRoute()),config={...defaultStoryConfig('Synthetic Swiss footprint'),durationSeconds:20,qualityPreset:'standard',aspectRatio:aspect,cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',marker:'traveler',markerSize:'small'},s=exportSettings(config),r=new TerrainRenderer(route,terrain,s.width,s.height,config,imagery,rider),canvas=document.createElement('canvas');
      try{return [0,2,5,10,15,19.9].map(time=>{
        r.draw(canvas,time);const anchor=r.marker.position,xy=[anchor.x,-anchor.z];
        const project=(x,y)=>{const v=anchor.clone().set(x,terrain.meshElevation([x,y]),-y).project(r.camera);return[(v.x+1)*s.width/2,(1-v.y)*s.height/2];},p=project(...xy);
        const sample=meters=>{const e=project(xy[0]+meters,xy[1]),n=project(xy[0],xy[1]+meters);return Math.max(Math.hypot(e[0]-p[0],e[1]-p[1]),Math.hypot(n[0]-p[0],n[1]-p[1]));};
        return {aspect,time,anchorLocalMeters:xy,output:[s.width,s.height],detailHalfMeterTexelPixels:sample(.5),overviewOneMeterTexelPixels:sample(1),lowControlTenMeterTexelPixels:sample(10)};
      });}finally{r.dispose();canvas.width=canvas.height=0;}
    },aspect));
  }}finally{await browser.close();}
});
mkdirSync('artifacts/sprint11/swiss',{recursive:true});
const report={method:'Projected east/north mesh edges at the genuine timeline anchor; maximum edge length in destination pixels. Same 20s Standard corridor camera. Local samples only, not an all-surface or occlusion bound. Actual native acquisition class remains unknown; 0.5m/1m refer to derived texture spacing. No sharpening or camera modification.',rows};
writeFileSync('artifacts/sprint11/swiss/detail-footprint.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({aspect,time,detailHalfMeterTexelPixels,lowControlTenMeterTexelPixels})=>({aspect,time,detailHalfMeterTexelPixels,lowControlTenMeterTexelPixels}))));
