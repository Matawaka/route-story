import { test,expect } from '@playwright/test';

test('unicycle marker opt-in renders in Classic and remains reversible',async({page})=>{
  await page.goto('/');
  await page.locator('#demo').click();
  await expect(page.locator('#export')).toBeEnabled();
  await page.locator('#camera-mode').selectOption('classic');
  await expect(page.locator('#export')).toBeEnabled();
  await page.locator('#scrub').evaluate((element)=>{const input=element as HTMLInputElement;input.value='10';input.dispatchEvent(new Event('input',{bubbles:true}));});
  const original=await page.locator('#preview').evaluate((e)=> (e as HTMLCanvasElement).toDataURL());
  await page.locator('#marker-style').selectOption('unicycle');
  await expect(page.locator('#export')).toBeEnabled();
  const changed=await page.locator('#preview').evaluate((e)=> (e as HTMLCanvasElement).toDataURL());
  expect(changed).not.toEqual(original);
  await page.locator('#marker-style').selectOption('dot');
  await expect(page.locator('#export')).toBeEnabled();
  const restored=await page.locator('#preview').evaluate((e)=> (e as HTMLCanvasElement).toDataURL());
  expect(restored).toEqual(original);
});

test('custom PNG upload stays local, rejects SVG and preserves chosen marker',async({page})=>{
  const requests:string[]=[];
  page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:'))requests.push(request.url());});
  await page.goto('/');
  await page.locator('#demo').click();
  await expect(page.locator('#export')).toBeEnabled();
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGFEAAAAASUVORK5CYII=','base64');
  await page.locator('#marker-file').setInputFiles({name:'safe.png',mimeType:'image/png',buffer:png});
  await expect(page.locator('#marker-style')).toHaveValue('custom');
  await expect(page.locator('#export')).toBeEnabled();
  await page.locator('#marker-file').setInputFiles({name:'invalid.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')});
  await expect(page.locator('#status')).toContainText('PNG или WebP');
  await expect(page.locator('#marker-style')).toHaveValue('custom');
  expect(requests).toEqual([]);
});
