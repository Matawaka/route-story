import{test,expect}from'@playwright/test';
import{writeFileSync,mkdirSync}from'node:fs';
// @ts-expect-error Independent test-only Node decoder.
import{validateVideo}from'../../scripts/validate-video.mjs';
test('high resolution keeps 720p preview and unsupported encoder preserves usable seeking',async({page})=>{
 await page.addInitScript(()=>{const Native=window.VideoEncoder;window.VideoEncoder=class extends Native{static async isConfigSupported(c:VideoEncoderConfig){return c.width*c.height>1280*720?{supported:false,config:c}:super.isConfigSupported(c);}};});
 await page.goto('/');await page.locator('#route-choice').selectOption('sample');await expect(page.locator('#export')).toBeEnabled();await page.locator('#quality').selectOption('fullhd');await expect(page.locator('#encoder-note')).toContainText('1920 × 1080');await expect(page.locator('#export')).toBeDisabled();expect(await page.locator('#preview').evaluate(c=>[c.width,c.height])).toEqual([1280,720]);await page.locator('#scrub').fill('5');const frame=await page.locator('#preview').evaluate(c=>c.toDataURL());await page.locator('#scrub').fill('19');await page.locator('#scrub').fill('5');expect(await page.locator('#preview').evaluate(c=>c.toDataURL())).toEqual(frame);await page.locator('#quality').selectOption('standard');await expect(page.locator('#export')).toBeEnabled();
});
test('actual probe failure closes every new encoder and temporary canvas',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const{detectEncoder}=await import('/src/exporter.ts'),Native=VideoEncoder,instances:VideoEncoder[]=[],canvases:HTMLCanvasElement[]=[],create=document.createElement.bind(document);let message='';
  window.VideoEncoder=class extends Native{constructor(init:VideoEncoderInit){super(init);instances.push(this);}static async isConfigSupported(c:VideoEncoderConfig){return{supported:true,config:c};}configure(){throw Error('Deliberate real-probe failure');}};
  document.createElement=((tag:string)=>{const c=create(tag);if(c instanceof HTMLCanvasElement)canvases.push(c);return c;}) as typeof document.createElement;
  try{await detectEncoder(1920,1080,10_000_000);}catch(e){message=(e as Error).message;}finally{window.VideoEncoder=Native;document.createElement=create;}return{message,states:instances.map(e=>e.state),sizes:canvases.map(c=>[c.width,c.height])};
 });expect(result.message).toContain('Deliberate real-probe failure');expect(result.states).toHaveLength(4);expect(result.states.every(s=>s==='closed')).toBe(true);expect(result.sizes.every(s=>s[0]===0&&s[1]===0)).toBe(true);
});
test('write failure aborts the file without claiming completion',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const{exportVideoToFile}=await import('/src/exporter.ts'),{regressionStoryConfig}=await import('/src/story.ts');let closes=0,aborts=0,message='';
  try{await exportVideoToFile({config:regressionStoryConfig(),draw:c=>{c.getContext('2d')!.fillRect(0,0,c.width,c.height);}}, {write:async()=>{throw new DOMException('private/path not displayed','QuotaExceededError');},close:async()=>{closes++;},abort:async()=>{aborts++;}});}catch(e){message=(e as Error).message;}return{closes,aborts,message};
 });expect(result.closes).toBe(0);expect(result.aborts).toBeGreaterThan(0);expect(result.message).toContain('свободное место');expect(result.message).not.toContain('private/path');
});
test('real local file target cancels, retries and produces ordinary decodable MP4',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const{exportVideoToFile}=await import('/src/exporter.ts'),{regressionStoryConfig}=await import('/src/story.ts'),root=await navigator.storage.getDirectory(),handle=await root.getFileHandle('synthetic-stream-regression.mp4',{create:true}),config=regressionStoryConfig();
  const draw=(c:HTMLCanvasElement,t:number)=>{const x=c.getContext('2d')!;x.fillStyle='#10364e';x.fillRect(0,0,c.width,c.height);x.fillStyle='#f9b942';x.fillRect(t*100,40,80,90);};let cancellation='';const controller=new AbortController();
  try{await exportVideoToFile({config,draw,signal:controller.signal,onProgress:p=>{if(p>.1)controller.abort();}},await handle.createWritable());}catch(e){cancellation=(e as Error).name;}
  const cancelledBytes=(await handle.getFile()).size,output=await exportVideoToFile({config,draw},await handle.createWritable()),bytes=Array.from(new Uint8Array(await(await handle.getFile()).arrayBuffer()));await root.removeEntry('synthetic-stream-regression.mp4');return{cancellation,cancelledBytes,output,bytes};
 });expect(result.cancellation).toBe('AbortError');expect(result.cancelledBytes).toBe(0);expect(result.output.bytes).toBe(result.bytes.length);mkdirSync('artifacts',{recursive:true});const file='artifacts/synthetic-stream-regression.mp4';writeFileSync(file,Buffer.from(result.bytes));validateVideo(file,640,360,4);
});
