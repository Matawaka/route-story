import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='artifacts/marker-facing';
test('short zigzags do not reflect the rendered upright rider and exact seeking remains stable',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const [{RouteRenderer},{routeMetrics},{defaultStoryConfig},{loadTraveler},{loadGeography}]=await Promise.all(['/src/renderer.ts','/src/geo.ts','/src/story.ts','/src/traveler.ts','/src/geography.ts'].map(p=>import(p)));
  const segments=[Array.from({length:1001},(_,i)=>({lon:6+(i%2?-.00002:.00002),lat:61+i*.00001}))],route={name:'Синтетический зигзаг',segments,...routeMetrics(segments)},asset=await loadTraveler(),land={...await(await fetch('/maps/ne_110m_land.geojson')).json(),geography:await loadGeography()},results=[];
  for(const visualStyle of ['atlas','night'])for(const aspectRatio of ['landscape','portrait']){
   const w=aspectRatio==='landscape'?640:360,h=aspectRatio==='landscape'?360:640,r=new RouteRenderer(route,land,w,h,visualStyle,{...defaultStoryConfig(),visualStyle,aspectRatio,durationSeconds:60,cameraMode:'cinematic',marker:'traveler'},asset),c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true})!,native=ctx.drawImage.bind(ctx),signs=[];
   ctx.drawImage=((image:CanvasImageSource,...args:number[])=>{if(image===(r as any).markerAsset.canvas)signs.push(ctx.getTransform().a);native(image,...args as [number,number]);}) as typeof ctx.drawImage;
   try{for(let i=1;i<200;i++)r.draw(c,2+56*i/200);r.draw(c,30);const first=c.toDataURL();r.draw(c,59);r.draw(c,1);r.draw(c,30);results.push({visualStyle,aspectRatio,allUpright:signs.every(v=>v===1),draws:signs.length,reverseEqual:first===c.toDataURL()});}finally{r.dispose();}
  }return results;
 });for(const r of result){expect(r.draws).toBeGreaterThan(190);expect(r.allUpright).toBe(true);expect(r.reverseEqual).toBe(true);}
});
test('all raster markers reflect horizontally without rotating, mutating their source or leaking transforms',async({page})=>{
  await page.goto('/');const result=await page.evaluate(async()=>{
    const [{loadTraveler},{prepareMarker,MarkerAsset,drawMarker}]=await Promise.all([import('/src/traveler.ts'),import('/src/marker.ts')]);
    const custom=document.createElement('canvas');custom.width=custom.height=256;const cc=custom.getContext('2d',{willReadFrequently:true})!;cc.fillStyle='#f00';cc.fillRect(20,10,40,160);cc.fillStyle='#00f';cc.fillRect(160,100,70,70);
    const assets=[prepareMarker('traveler',await loadTraveler()),...['unicycle','bicycle','pedestrian'].map(k=>prepareMarker(k)),new MarkerAsset(custom)],results=[];
    for(const asset of assets){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d',{willReadFrequently:true})!,source=Array.from(asset.canvas.getContext('2d')!.getImageData(0,0,256,256).data);
      try{drawMarker(ctx,asset,128,256,256,[1,0],false);const right=ctx.getImageData(0,0,256,256).data,rightPng=c.toDataURL();ctx.clearRect(0,0,256,256);drawMarker(ctx,asset,128,256,256,[-1,0],false);const left=ctx.getImageData(0,0,256,256).data,leftPng=c.toDataURL();let differences=0;
        for(let y=0;y<256;y++)for(let x=0;x<256;x++)for(let k=0;k<4;k++)if(right[(y*256+x)*4+k]!==left[(y*256+255-x)*4+k])differences++;
        const after=asset.canvas.getContext('2d')!.getImageData(0,0,256,256).data;
        results.push({differences,sourceUnchanged:source.every((v,i)=>v===after[i]),identity:ctx.getTransform().isIdentity,right:rightPng,left:leftPng});
      }finally{asset.dispose();}
    }return results;
  });
  for(const r of result)expect(r).toMatchObject({differences:0,sourceUnchanged:true,identity:true});mkdirSync(out,{recursive:true});
  writeFileSync(out+'/traveler-right.png',Buffer.from(result[0].right.split(',')[1],'base64'));writeFileSync(out+'/traveler-left.png',Buffer.from(result[0].left.split(',')[1],'base64'));
});

test('Classic/Cinematic rider faces each real edge at intro/replay/outro with exact reverse seeking in all styles/aspects',async({page})=>{
  await page.goto('/');const results=await page.evaluate(async()=>{
    const [{RouteRenderer},{routeMetrics},{defaultStoryConfig},{loadTraveler},{loadGeography}]=await Promise.all(['/src/renderer.ts','/src/geo.ts','/src/story.ts','/src/traveler.ts','/src/geography.ts'].map(p=>import(p)));
    const segments=[[{lon:6.02,lat:61},{lon:6.01,lat:61},{lon:6.02,lat:61}]],route={name:'Синтетический поворот',segments,...routeMetrics(segments)},land={...await(await fetch('/maps/ne_110m_land.geojson')).json(),geography:await loadGeography()},asset=await loadTraveler(),results=[];
    for(const cameraMode of ['classic','cinematic'])for(const visualStyle of ['atlas','night'])for(const aspectRatio of ['landscape','portrait']){
      const w=aspectRatio==='landscape'?640:360,h=aspectRatio==='landscape'?360:640,r=new RouteRenderer(route,land,w,h,visualStyle,{...defaultStoryConfig(),cameraMode,visualStyle,aspectRatio,marker:'traveler'},asset),c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true})!,native=ctx.drawImage.bind(ctx);let transforms:number[][]=[];
      ctx.drawImage=((image:CanvasImageSource,...args:number[])=>{if(image===(r as any).markerAsset.canvas){const t=ctx.getTransform();transforms.push([t.a,t.b,t.c,t.d]);}native(image,...args as [number,number]);}) as typeof ctx.drawImage;
      try{const poses=[];for(const[t,left]of [[0,true],[4,true],[14,false],[20,false]] as const){transforms=[];r.draw(c,t);poses.push({time:t,left,transform:transforms[0],frame:c.toDataURL()});}r.draw(c,4);const first=c.toDataURL();r.draw(c,20);r.draw(c,0);r.draw(c,4);results.push({cameraMode,visualStyle,aspectRatio,poses,seekEqual:c.toDataURL()===first});}finally{r.dispose();}
    }return results;
  });mkdirSync(out,{recursive:true});
  // Canvas may represent a mathematically zero matrix component as -0 after reflection.
  for(const r of results){expect(r.seekEqual).toBe(true);for(const p of r.poses)expect(p.transform.map(v=>v===0?0:v)).toEqual([p.left?-1:1,0,0,1]);
    if(r.cameraMode==='cinematic'&&r.visualStyle==='atlas'&&r.aspectRatio==='landscape')for(const p of r.poses.filter(p=>p.time===4||p.time===14))writeFileSync(`${out}/2d-${p.left?'left':'right'}.png`,Buffer.from(p.frame.split(',')[1],'base64'));
  }
});

test('3D annotation and depth-tested sprite use the same local screen direction without extra textures or seek history',async({page})=>{
  await page.goto('/');const result=await page.evaluate(async()=>{
    const [{TerrainRenderer},{loadTerrain},{loadImagery},{parseGpx},{defaultStoryConfig},{loadTraveler}]=await Promise.all(['/src/terrain-renderer.ts','/src/terrain.ts','/src/imagery.ts','/src/gpx.ts','/src/story.ts','/src/traveler.ts'].map(p=>import(p))),route=parseGpx(await(await fetch('/samples/terrain-sogne.gpx')).text()),asset=await loadTraveler(),results=[];
    for(const presentation of ['annotation','occluded']){
      const config={...defaultStoryConfig(),durationSeconds:4,introSeconds:.5,outroSeconds:.5,cameraMode:'terrain',terrainSurface:'photo',terrainFlight:'corridor',marker:'traveler',markerPresentation:presentation},r=new TerrainRenderer(route,await loadTerrain('compatibility'),640,360,config,await loadImagery(),asset),c=document.createElement('canvas');c.width=640;c.height=360;const ctx=(r as any).frameCanvas.getContext('2d',{willReadFrequently:true})!,native=ctx.drawImage.bind(ctx);let scales:number[]=[];
      ctx.drawImage=((image:CanvasImageSource,...args:number[])=>{if(image===(r as any).markerAsset.canvas)scales.push(ctx.getTransform().a);native(image,...args as [number,number]);}) as typeof ctx.drawImage;
      try{const poses=[];for(const time of [0,.5,1,1.5,2,2.5,3,3.999]){scales=[];r.draw(c,time);const sprite=(r as any).marker;poses.push({time,repeat:sprite.material.map.repeat.x,offset:sprite.material.map.offset.x,annotationScale:scales[0],textures:r.gpu.info.memory.textures,depthTest:sprite.material.depthTest,frame:c.toDataURL()});}r.draw(c,1);const first=c.toDataURL();r.draw(c,3);r.draw(c,0);r.draw(c,1);results.push({presentation,poses,seekEqual:first===c.toDataURL()});}finally{r.dispose();if((r as any).frameCanvas.width!==0||(r as any).framePixels.length!==0||(r as any).frameImage!==undefined)throw Error('Frame resources retained after disposal');}
    }return results;
  });mkdirSync(out,{recursive:true});
  for(const r of result){expect(r.seekEqual).toBe(true);expect(new Set(r.poses.map(p=>p.repeat))).toEqual(new Set([-1,1]));expect(new Set(r.poses.map(p=>p.textures)).size).toBe(1);expect(r.poses[0].textures).toBeLessThanOrEqual(3);
    for(const p of r.poses){expect(p.depthTest).toBe(true);expect(p.offset).toBe(p.repeat===-1?1:0);if(r.presentation==='annotation'&&p.annotationScale!==undefined)expect(p.annotationScale).toBe(p.repeat);}
    if(r.presentation==='annotation')for(const left of [true,false]){const p=r.poses.find(p=>p.repeat===(left?-1:1)&&p.annotationScale!==undefined)!;expect(p).toBeDefined();writeFileSync(`${out}/3d-${left?'left':'right'}.png`,Buffer.from(p.frame.split(',')[1],'base64'));}
  }
});
