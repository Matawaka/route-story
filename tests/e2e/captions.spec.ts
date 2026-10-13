import{test,expect}from'@playwright/test';
import{mkdirSync,readFileSync,writeFileSync}from'node:fs';
import{execFileSync}from'node:child_process';
import{createHash}from'node:crypto';
import ffmpeg from'ffmpeg-static';
import{validateVideo}from'../../scripts/validate-video.mjs';
const folder='artifacts/video-captions';
const ready=async(page:any)=>{await expect(page.locator('#export')).toBeEnabled({timeout:60000});};
const seek=async(page:any,time:number)=>{await page.locator('#scrub').fill(String(time));return page.locator('#preview').evaluate((c:HTMLCanvasElement)=>c.toDataURL());};
const observe=async(page:any)=>page.evaluate(()=>{const native=CanvasRenderingContext2D.prototype.fillText;(window as any).captionTexts=[];CanvasRenderingContext2D.prototype.fillText=function(...args:Parameters<typeof native>){(window as any).captionTexts.push(String(args[0]));return native.apply(this,args);};});
const drawTexts=async(page:any,time:number)=>{await page.evaluate(()=>(window as any).captionTexts=[]);await seek(page,time);return page.evaluate(()=>(window as any).captionTexts as string[]);};

test('Classic and Cinematic captions are reversible in both styles/aspects; UI visibility stays independent',async({page})=>{
  await page.goto('/');await page.locator('#route-choice').selectOption('sample');await ready(page);await observe(page);mkdirSync(folder,{recursive:true});
  for(const camera of ['classic','cinematic'])for(const aspect of ['landscape','portrait'])for(const style of ['atlas','night']){
    for(const[id,value]of [['camera-mode',camera],['ratio',aspect],['video-captions','full']]){await page.locator('#'+id).selectOption(value);await ready(page);}await page.locator(`[data-style=${style}]`).click();await ready(page);
    const before=await seek(page,6),full=await drawTexts(page,6);expect(full).toContain('Учебный маршрут');expect(full.some(t=>t.includes('сегмент'))).toBe(true);
    await page.locator('#video-captions').selectOption('none');await ready(page);await expect(page.locator('#preview')).toHaveAttribute('data-captions','none');
    for(const time of [0,6,20]){const text=await drawTexts(page,time);expect(text).toEqual(['Natural Earth']);}
    const clean=await seek(page,6);expect(clean).not.toBe(before);await seek(page,18);expect(await seek(page,6)).toBe(clean);
    await page.locator('#explanations').click();expect(await seek(page,6)).toBe(clean);await page.locator('#explanations').click();
    await page.locator('#preview').screenshot({path:`${folder}/${camera}-${style}-${aspect}-clean.png`});
    await page.locator('#video-captions').selectOption('full');await ready(page);expect(await seek(page,6)).toBe(before);await expect(page.locator('#story-title')).toHaveValue('Учебный маршрут');
  }
});

async function movieProof(page:any,terrain:boolean,aspect:string,full:boolean){
  const duration=full?(aspect==='landscape'?20:30):10,quality=full?'standard':'compatibility',width=full?(aspect==='landscape'?1280:720):(aspect==='landscape'?640:360),height=full?(aspect==='landscape'?720:1280):(aspect==='landscape'?360:640);
  for(const[id,value]of [['ratio',aspect],['duration',String(duration)],['quality',quality]]){await page.locator('#'+id).selectOption(value);await ready(page);}if(aspect==='portrait'){await page.locator('[data-style=night]').click();await ready(page);}
  await page.locator('#video-captions').selectOption('none');await ready(page);await observe(page);
  const time=duration/2,png=await seek(page,time),text=await drawTexts(page,time);expect(text.length).toBeGreaterThan(0);expect(text.every(t=>terrain?t.includes('swisstopo'):t==='Natural Earth')).toBe(true);
  const reference=await page.locator('#preview').evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,c.height).data));
  await page.evaluate(async({time,png,terrain})=>{const module=terrain?'/src/terrain-renderer.ts':'/src/renderer.ts',loaded=await import(module),Renderer=terrain?loaded.TerrainRenderer:loaded.RouteRenderer,native=Renderer.prototype.draw;(window as any).captionParity=false;Renderer.prototype.draw=function(c:HTMLCanvasElement,t:number){const result=native.call(this,c,t);if(document.body.dataset.state==='EXPORTING'&&t===time)(window as any).captionParity=c.toDataURL()===png;return result;};},{time,png,terrain});
  await page.locator('#export').click();await expect(page.locator('#video-captions')).toBeDisabled();await page.locator('#cancel').click();await expect(page.locator('#status')).toHaveText('Экспорт отменён.');await ready(page);
  await page.evaluate(()=>(window as any).captionTexts=[]);mkdirSync(folder,{recursive:true});const download=page.waitForEvent('download',{timeout:150000}),started=performance.now();await page.locator('#export').click();
  // A forced DOM change cannot modify the immutable active export snapshot.
  await page.locator('#video-captions').evaluate((select:HTMLSelectElement)=>{select.value='full';select.dispatchEvent(new Event('change',{bubbles:true}));});
  const file=`${folder}/${terrain?'swiss':'cinematic'}-${aspect}-${duration}s-clean.mp4`;await(await download).saveAs(file);const exportMs=performance.now()-started;expect(await page.evaluate(()=>(window as any).captionParity)).toBe(true);
  const exported=await page.evaluate(()=>(window as any).captionTexts as string[]);expect(exported.length).toBeGreaterThanOrEqual(duration*24);expect(exported.every(t=>terrain?t.includes('swisstopo'):t==='Natural Earth')).toBe(true);
  const video=validateVideo(file,width,height,duration),decoded=execFileSync(ffmpeg!,['-v','error','-ss',String(time),'-i',file,'-frames:v','1','-pix_fmt','rgba','-f','rawvideo','-'],{windowsHide:true,maxBuffer:8*1024*1024});let mae=0;for(let i=0;i<decoded.length;i+=4)for(let k=0;k<3;k++)mae+=Math.abs(decoded[i+k]-reference[i+k]);mae/=width*height*3;expect(mae).toBeLessThan(15);
  const grey=execFileSync(ffmpeg!,['-v','error','-i',file,'-vf','crop=iw*0.8:ih*0.5:iw*0.1:ih*0.25,scale=64:36','-pix_fmt','gray','-f','rawvideo','-'],{windowsHide:true,maxBuffer:3*1024*1024});expect(grey.length).toBe(duration*24*2304);let minimumVariance=Infinity;for(let i=0;i<grey.length;i+=2304){const frame=grey.subarray(i,i+2304),mean=frame.reduce((s,v)=>s+v,0)/2304;minimumVariance=Math.min(minimumVariance,frame.reduce((s,v)=>s+(v-mean)**2,0)/2304);}expect(minimumVariance).toBeGreaterThan(5);
  execFileSync(ffmpeg!,['-y','-v','error','-ss',String(time),'-i',file,'-frames:v','1',`${file}-decoded.png`],{windowsHide:true});
  await page.locator('#video-captions').selectOption('none');await ready(page);expect(await seek(page,time)).toBe(png);writeFileSync(`${file}-preview.png`,Buffer.from(png.split(',')[1],'base64'));
  await page.locator('#video-captions').selectOption('full');await ready(page);const restored=await drawTexts(page,time);expect(restored.some(t=>t.includes('Синтетическое')||t==='Учебный маршрут')).toBe(true);writeFileSync(`${file}-full.png`,Buffer.from((await seek(page,time)).split(',')[1],'base64'));
  expect(await page.evaluate(async()=>[localStorage.length,sessionStorage.length,(await indexedDB.databases()).length])).toEqual([0,0,0]);
  writeFileSync(file+'.proof.json',JSON.stringify({...video,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{windowsHide:true,encoding:'utf8'}).trim(),captionMode:'none',exportMs,exactPreviewExport:true,decodedMeanAbsoluteError:mae,minimumGeographicFrameVariance:minimumVariance,sourceCredits:text,sha256:createHash('sha256').update(readFileSync(file)).digest('hex'),browser:await page.evaluate(()=>navigator.userAgent),physicalDevice:false},null,2));
}

test('clean 2D MP4 keeps credits, matches preview and freezes captions until cancellation/success',async({page})=>{await page.goto('/');await page.locator('#route-choice').selectOption('sample');await ready(page);await movieProof(page,false,'landscape',false);});
test('hidden occlusion caption retains the dashed geographic anchor cue',async({page})=>{
  await page.goto('/');const result=await page.evaluate(async()=>{
    const paths=['/src/marker.ts','/src/marker-annotation.ts'],[{MarkerAsset},{drawAnnotation}]=await Promise.all(paths.map(p=>import(p))),image=document.createElement('canvas');image.width=image.height=256;const asset=new MarkerAsset(image),canvas=document.createElement('canvas');canvas.width=canvas.height=360;const ctx=canvas.getContext('2d')!,native=ctx.setLineDash.bind(ctx),text:string[]=[],dashes:number[][]=[];ctx.setLineDash=(v:number[])=>{dashes.push([...v]);native(v);};ctx.fillText=(value:string)=>{text.push(value);};
    try{const layout={x:180,y:180,box:[155,130,205,180]};drawAnnotation(ctx,asset,[180,190],layout,50,true,undefined,false);const hidden=[...text];drawAnnotation(ctx,asset,[180,190],layout,50,true,undefined,true);return{hidden,shown:text,dashed:dashes.some(v=>v.length===2&&v.every(x=>x>0))};}finally{asset.dispose();}
  });expect(result.hidden).toEqual([]);expect(result.shown).toContain('За рельефом');expect(result.dashed).toBe(true);
});
for(const aspect of ['landscape','portrait'])test(`opt-in clean Swiss photo MP4 ${aspect}`,async({page,context})=>{
  test.skip(process.env.UNIFIED_UX_ACCEPTANCE!=='1','Opt-in real Swiss resources; ordinary CI retains clean 2D video proof.');test.setTimeout(180000);const external:string[]=[];context.on('request',r=>{if(/^https?:/.test(r.url())&&(r.method()!=='GET'||new URL(r.url()).origin!=='http://127.0.0.1:4173'))external.push(r.url());});
  await page.goto('/');await page.locator('#route-choice').selectOption('furka');await ready(page);await expect(page.locator('#preview')).toHaveAttribute('data-region','furka');await movieProof(page,true,aspect,process.env.FULL_EXPORT_ACCEPTANCE==='1');expect(external).toEqual([]);
});
