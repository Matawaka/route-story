import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { withServer } from './server.mjs';
import { syntheticGpx } from '../../tests/fixtures/synthetic.ts';
mkdirSync('artifacts/sprint3/visual',{recursive:true});
const results=[];
const baselineRef=process.env.VISUAL_BASELINE_REF;
let rendererPath='/src/renderer.ts';
if(baselineRef){
 mkdirSync('.reference',{recursive:true});
 const source=execFileSync('git',['show',`${baselineRef}:src/renderer.ts`],{encoding:'utf8',windowsHide:true});
 writeFileSync('.reference/sprint3-baseline-renderer.ts',source.replace(/from '\.\//g,"from '/src/"));
 rendererPath='/.reference/sprint3-baseline-renderer.ts';
}
await withServer(async url=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
 try{
  await page.goto(url);
  for(const kind of ['dense','segments','antimeridian','long','polar','short','coastal','extreme'])for(const style of ['atlas','night'])for(const quality of ['compatibility','standard'])for(const aspect of ['landscape','portrait']){
   const xml=syntheticGpx(kind==='extreme'?50000:100,kind,'Синтетический маршрут с очень длинным названием · '.repeat(4));
   const result=await page.evaluate(async({xml,style,quality,aspect,rendererPath})=>{
    const paths=['/src/gpx.ts',rendererPath,'/src/story.ts','/src/geography.ts'];const[{parseGpx},{RouteRenderer},{defaultStoryConfig,exportSettings},{loadGeography}]=await Promise.all(paths.map(p=>import(p)));
    const route=parseGpx(xml),land={...await(await fetch('/maps/ne_110m_land.geojson')).json(),geography:await loadGeography()},config={...defaultStoryConfig(route.name),visualStyle:style,qualityPreset:quality,aspectRatio:aspect},s=exportSettings(config),renderer=new RouteRenderer(route,land,s.width,s.height,style,config),canvas=document.createElement('canvas');canvas.width=s.width;canvas.height=s.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true}),native=ctx.fillText.bind(ctx),labels=[];let time=0;
    ctx.fillText=(text,x,y,...rest)=>{const metrics=ctx.measureText(text);labels.push({time,text,x,y,width:metrics.width,font:ctx.font,align:ctx.textAlign,baseline:ctx.textBaseline,left:x-metrics.actualBoundingBoxLeft,right:x+metrics.actualBoundingBoxRight,top:y-metrics.actualBoundingBoxAscent,bottom:y+metrics.actualBoundingBoxDescent});native(text,x,y,...rest);};
    const path=renderer.timeline.path,edge=path.edges.find(e=>e.segment>0),transition=edge?config.introSeconds+(config.durationSeconds-config.introSeconds-config.outroSeconds)*edge.start/path.total+1/24:10.02,times=[1,3,10,transition,17.99,19];
    const frames=[];for(const t of times){time=t;renderer.draw(canvas,t);frames.push({t,png:canvas.toDataURL(),state:renderer.timeline.at(t)});}
    const frameLabels=labels.splice(0),timings=[];
    for(let repeat=0;repeat<4;repeat++){labels.length=0;const start=performance.now();for(let i=0;i<120;i++)renderer.draw(canvas,i*20/119);if(repeat)timings.push(performance.now()-start);}
    timings.sort((a,b)=>a-b);const render120Ms=timings[1];
    renderer.dispose();return{width:s.width,height:s.height,frames:frames.map(({t,png,state})=>({t,png,phase:state.phase,segment:state.segment})),labels:frameLabels,render120Ms,render120RangeMs:[timings[0],timings[2]]};
   },{xml,style,quality,aspect,rendererPath});
   for(const frame of result.frames){writeFileSync(`artifacts/sprint3/visual/${baselineRef?'baseline-':''}${kind}-${style}-${quality}-${aspect}-${frame.t}.png`,Buffer.from(frame.png.split(',')[1],'base64'));delete frame.png;}
   const pad=Math.min(result.width,result.height)*.08;
   const overflow=result.labels.filter(l=>{const endpoint=/^Старт|^Финиш$/.test(l.text);return l.left<(endpoint?4:pad-2)||l.right>result.width-(endpoint?4:pad-2)||l.top<0||l.bottom>result.height;}),overlaps=[];
   for(const frame of result.frames){const markers=result.labels.filter(l=>l.time===frame.t&&['Старт','Финиш'].includes(l.text));if(markers.length===2){const[a,b]=markers;if(a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom)overlaps.push(frame.t);}}
   results.push({kind,style,quality,aspect,...result,overflow,overlaps});
  }
  writeFileSync(`artifacts/sprint3/visual${baselineRef?'-baseline':''}.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({baselineRef,configurations:results.length,overflow:results.filter(r=>r.overflow.length).map(({kind,style,quality,aspect,overflow})=>({kind,style,quality,aspect,count:overflow.length})),overlaps:results.filter(r=>r.overlaps.length).map(({kind,style,quality,aspect,overlaps})=>({kind,style,quality,aspect,overlaps})),titleRender120Ms:results.filter(r=>r.kind==='dense').map(({style,quality,aspect,render120Ms,render120RangeMs})=>({style,quality,aspect,render120Ms,render120RangeMs}))}));
  // Baseline mode records known old defects; it is measurement, not acceptance.
  if(!baselineRef&&results.some(r=>r.overflow.length||r.overlaps.length))throw new Error('Visual geometry validation failed; inspect visual.json.');
 }finally{await browser.close();}
});
