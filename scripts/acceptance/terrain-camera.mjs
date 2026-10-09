/** Opt-in actual-pack geometry audit, independent of animation history. */
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {withServer} from './server.mjs';
mkdirSync('artifacts/sprint8/camera',{recursive:true});
await withServer(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
 try{await page.goto(url);const reports=await page.evaluate(async()=>{
  const paths=['/src/terrain.ts','/src/terrain-camera.ts','/src/timeline.ts','/src/story.ts','/src/gpx.ts'];const [{loadTerrain},{createTerrainCameraPlan,getTerrainCameraStateAt,projectTerrainPoint},{StoryTimeline},{defaultStoryConfig},{parseGpx}]=await Promise.all(paths.map(p=>import(p))),route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),reports=[];
  for(const [width,height,seconds,quality] of [[640,360,20,'compatibility'],[1280,720,20,'standard'],[720,1280,30,'standard']]){
   const terrain=await loadTerrain(quality),timeline=new StoryTimeline(route,{...defaultStoryConfig(),cameraMode:'terrain',durationSeconds:seconds}),plan=createTerrainCameraPlan(timeline,terrain,width,height),poses=Array.from({length:seconds*24+1},(_,i)=>getTerrainCameraStateAt(i/24,plan));
   let clearance=Infinity,los=Infinity,maxStep=0,finite=true,markerSafe=true;
   for(let i=0;i<poses.length;i++){const c=poses[i];finite&&=[...c.position,...c.target,c.pitch,c.bearing,c.clearance].every(Number.isFinite);clearance=Math.min(clearance,c.clearance);
    if(i&&c.segment===poses[i-1].segment)maxStep=Math.max(maxStep,Math.hypot(...c.position.map((v,j)=>v-poses[i-1].position[j])));
    // Dense independent ray sampler: not the planner's grid-intersection test.
    for(let j=0;j<=128;j++){const f=j/128,xy=[c.target[0]+(c.position[0]-c.target[0])*f,c.target[1]+(c.position[1]-c.target[1])*f],ground=terrain.meshElevation(xy);if(ground===undefined)finite=false;else los=Math.min(los,c.target[2]+(c.position[2]-c.target[2])*f-ground);}
    if(c.phase==='ROUTE_REPLAY'){const [x,y]=projectTerrainPoint(c.target,c.position,c.target,width,height),u=Math.min(width,height);markerSafe&&=x>u*.075&&x<width-u*.075&&y>u*.22&&y<height-u*.28;}
   }
   const forward=poses[Math.floor(poses.length/2)];for(let i=poses.length-1;i>=0;i-=17)getTerrainCameraStateAt(i/24,plan);
   const deterministic=JSON.stringify(forward)===JSON.stringify(getTerrainCameraStateAt(Math.floor(poses.length/2)/24,plan));
   reports.push({width,height,seconds,quality,states:poses.length,finite,deterministic,markerSafe,minimumCameraClearanceMeters:clearance,minimumIndependentRayClearanceMeters:los,maxStepAt24fpsMeters:maxStep,overviewEqualsEnding:JSON.stringify(poses[0].position)===JSON.stringify(poses.at(-1).position),heightRangeMeters:[Math.min(...poses.map(c=>c.position[2])),Math.max(...poses.map(c=>c.position[2]))],pitchRangeDegrees:[Math.min(...poses.map(c=>c.pitch)),Math.max(...poses.map(c=>c.pitch))],keyframes:[0,1,2,seconds/4,seconds/2,seconds-2,seconds].map(t=>({t,...getTerrainCameraStateAt(t,plan)}))});
  }return reports;
 });console.log(JSON.stringify(reports.map(({keyframes,...r})=>r),null,2));for(const r of reports){assert.ok(r.finite&&r.deterministic&&r.markerSafe&&r.overviewEqualsEnding);assert.ok(r.minimumCameraClearanceMeters>=350&&r.minimumIndependentRayClearanceMeters>=0);}
 writeFileSync('artifacts/sprint8/camera/validation.json',JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),reports},null,2));console.log(JSON.stringify(reports.map(({keyframes,...r})=>r),null,2));
 }finally{await browser.close();}
});
