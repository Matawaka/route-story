/** Opt-in real DEM comparison. Unselected engines remain outside production. */
import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync,statSync} from 'node:fs';
import {withServer} from './server.mjs';
import {validateVideo} from '../validate-video.mjs';
mkdirSync('artifacts/sprint8/spike',{recursive:true});
await withServer(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
 const external=[];await page.context().route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(external.push(r.request().url()),r.abort()));
 try{for(const engine of ['three','maplibre']){
  await page.goto(url);
  const result=await page.evaluate(async engine=>{
   const manifest=await(await fetch('/terrain/sogne.json')).json(),start=performance.now();
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');
   let draw,dispose,stats;
   if(engine==='three'){
    const T=await import('/.reference/terrain/three/node_modules/three/build/three.module.js');
    const level=manifest.lods[1],heights=new Int16Array(await(await fetch('/terrain/'+level.file)).arrayBuffer());
    const geometry=new T.BufferGeometry(),vertices=[],colors=[],indices=[];
    for(let y=0;y<level.height;y++)for(let x=0;x<level.width;x++){
     const h=heights[y*level.width+x];if(h===manifest.noData)throw Error('Missing DEM');
     vertices.push(manifest.westMeters+x*level.spacingMeters,h,-manifest.southMeters-y*level.spacingMeters);
     const c=new T.Color().setRGB(.23+h/5000,.38+h/6000,.28+h/5000);colors.push(c.r,c.g,c.b);
     if(x<level.width-1&&y<level.height-1){const i=y*level.width+x;indices.push(i,i+1,i+level.width,i+1,i+level.width+1,i+level.width);}
    }
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const scene=new T.Scene();scene.background=new T.Color('#aacad6');const material=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide});scene.add(new T.Mesh(geometry,material));scene.add(new T.HemisphereLight(0xeaf5ff,0x42503c,2));const light=new T.DirectionalLight(0xffffff,2);light.position.set(-5000,8000,3000);scene.add(light);
    const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(640,360,false);const camera=new T.PerspectiveCamera(48,640/360,10,80000);
    draw=t=>{camera.position.set(-3500+t*900,3300,-1800+t*500);camera.lookAt(1000,600,-4000);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);};
    dispose=()=>{geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();};stats={version:T.REVISION,vertices:vertices.length/3,triangles:indices.length/3,dependencyBytes:null};
   }else{
    const gl=await import('/.reference/maplibre-spike/package/dist/maplibre-gl.mjs');gl.setWorkerUrl('/.reference/maplibre-spike/package/dist/maplibre-gl-worker.mjs');
    const container=document.createElement('div');container.style.width='640px';container.style.height='360px';document.body.append(container);
    const {z,x,y}=manifest.mapLibreSpike,lon=v=>v/2**z*360-180,lat=v=>Math.atan(Math.sinh(Math.PI*(1-2*v/2**z)))*180/Math.PI;
    const map=new gl.Map({container,center:[6.17,61.25],zoom:11.7,pitch:60,bearing:20,interactive:false,attributionControl:false,canvasContextAttributes:{preserveDrawingBuffer:true},fadeDuration:0,style:{version:8,transition:{duration:0,delay:0},sources:{dem:{type:'raster-dem',tiles:['/.reference/terrain/terrain-rgb.png'],tileSize:512,minzoom:z,maxzoom:z,bounds:[lon(x),lat(y+1),lon(x+1),lat(y)],encoding:'mapbox'}},terrain:{source:'dem',exaggeration:1},layers:[{id:'base',type:'background',paint:{'background-color':'#bacaae'}},{id:'relief',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':.8,'hillshade-shadow-color':'#314331','hillshade-highlight-color':'#f4edd3'}}]}});
    const ready=()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Terrain readiness timeout')),15000);map.once('idle',()=>{clearTimeout(timer);resolve();});map.triggerRepaint();});
    await ready();
    draw=async t=>{const pending=ready();map.jumpTo({center:[6.17+t*.008,61.25+t*.005],zoom:11.7,pitch:60,bearing:20+t*5});await pending;if(!map.areTilesLoaded())throw Error('Missing tiles');ctx.drawImage(map.getCanvas(),0,0);};
    dispose=()=>{map.remove();container.remove();};stats={version:gl.getVersion(),elevation:map.queryTerrainElevation([6.17,61.25]),spikeTileNoDataEdgePixels:manifest.mapLibreSpike.noDataPixels};
   }
   try{
    await draw(1);const first=canvas.toDataURL();await draw(3);await draw(1);const deterministic=first===canvas.toDataURL();
    const preparedMs=performance.now()-start,{exportVideo}=await import('/src/exporter.ts'),begin=performance.now();
    window.terrainSpikeBlob=await exportVideo({width:640,height:360,draw:async(target,t)=>{await draw(t);target.getContext('2d').drawImage(canvas,0,0);}});
    return{engine,preparedMs,exportMs:performance.now()-begin,deterministic,bytes:window.terrainSpikeBlob.size,...stats};
   }finally{dispose();canvas.width=canvas.height=0;}
  },engine);
  const pending=page.waitForEvent('download');await page.evaluate(()=>{const u=URL.createObjectURL(window.terrainSpikeBlob),a=document.createElement('a');a.href=u;a.download='terrain.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});
  const path=`artifacts/sprint8/spike/${engine}-4s.mp4`;await(await pending).saveAs(path);result.video=validateVideo(path,640,360,4);result.browser=browser.version();result.external=external;
  writeFileSync(`artifacts/sprint8/spike/${engine}.json`,JSON.stringify(result,null,2));console.log(result);
 }}finally{await browser.close();}
});
