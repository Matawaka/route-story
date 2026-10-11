/** Exact Sogne pixels against PR10 e6dd365, prior to the regional extension.
 * Archive that commit's src into artifacts/sprint11/sogne-baseline first. */
import{chromium}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';import{withServer}from'./server.mjs';
let proof;
await withServer(async url=>{const b=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}),p=await b.newPage();try{await p.goto(url);proof=await p.evaluate(async()=>{
 const results=[];
 for(const aspect of ['landscape','portrait'])for(const style of ['atlas','night'])for(const graded of [false,true]){
  const width=aspect==='landscape'?1280:720,height=aspect==='landscape'?720:1280,renderers=[];
  try{
   for(const root of ['/artifacts/sprint11/sogne-baseline/src/','/src/']){
    const[{TerrainRenderer},{loadTerrain},{loadImagery},{parseGpx},{defaultStoryConfig},{loadTraveler}]=await Promise.all(['terrain-renderer.ts','terrain.ts','imagery.ts','gpx.ts','story.ts','traveler.ts'].map(f=>import(root+f))),route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),config={...defaultStoryConfig('Sogne pixel regression'),qualityPreset:'standard',aspectRatio:aspect,visualStyle:style,cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',routeColor:graded?'grade':'plain',replayPacing:graded?'terrain':'distance',marker:'traveler'};
    renderers.push(new TerrainRenderer(route,await loadTerrain('standard'),width,height,config,await loadImagery(),await loadTraveler()));
   }
   const canvases=[document.createElement('canvas'),document.createElement('canvas')];
   for(const time of [0,2,5,10,15,20-1/24]){
    const pixels=renderers.map((r,i)=>{r.draw(canvases[i],time);return canvases[i].getContext('2d').getImageData(0,0,width,height).data;});let different=0;for(let i=0;i<pixels[0].length;i++)if(pixels[0][i]!==pixels[1][i])different++;
    if(different)throw Error(`Sogne pixels changed: ${aspect}/${style}/${graded}/${time}, ${different}`);results.push({aspect,style,graded,time,different});
   }
  }finally{renderers.forEach(r=>r.dispose());}
 }return{baseline:'e6dd3659a77c8a5f4db2568f581dcfeded057ed5',checks:results,userAgent:navigator.userAgent};
 });}finally{await b.close();}});
mkdirSync('artifacts/sprint11/swiss',{recursive:true});writeFileSync('artifacts/sprint11/swiss/sogne-regression.json',JSON.stringify(proof,null,2));console.log(`${proof.checks.length} exact Sogne frame checks PASS; zero changed bytes`);
