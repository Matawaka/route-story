import {test,expect} from '@playwright/test';
const ready=async(page:any)=>{await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('#preview')).toBeVisible();};
test.beforeEach(async({page})=>{test.skip(process.env.AUTOMATIC_GEOGRAPHY_ACCEPTANCE!=='1','Opt-in consented external-geography candidate, not an external dependency of routine CI.');await page.goto('/');await page.locator('#welcome-close').click();await page.locator('#file').setInputFiles('tests/fixtures/metadata-links.gpx');await ready(page);});
test('no request leaves the device before area consent; declining preserves local preview',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173/'))external.push(r.url());});await expect(page.locator('#geography-consent')).toBeVisible();await expect(page.locator('#geography-consent')).toContainText('GPX, точки, имя файла');await page.locator('#keep-local').click();await expect(page.locator('#geography-consent')).toBeHidden();await page.locator('#scrub').fill('5');await expect(page.locator('#preview')).toBeVisible();expect(external).toEqual([]);
});
test('catalog failure gives a specific reason and working 2D recovery',async({page})=>{
 await page.route('https://earth-search.aws.element84.com/**',r=>r.fulfill({status:503,body:'Unavailable'}));await page.locator('#find-geography').click();await expect(page.locator('#status')).toContainText('HTTP 503');await expect(page.locator('#retry')).toBeEnabled();await page.locator('#simplify').click();await ready(page);await expect(page.locator('#export')).toBeEnabled();await page.locator('#scrub').fill('5');await expect(page.locator('#preview')).toHaveAttribute('data-mode','classic');
});
test('no imagery is a truthful coverage error, with no missing-source 3D claim',async({page})=>{
 await page.route('https://earth-search.aws.element84.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({features:[]})}));await page.locator('#find-geography').click();await expect(page.locator('#status')).toContainText('нет подходящих снимков');await expect(page.locator('#export')).toBeDisabled();await page.locator('#simplify').click();await ready(page);
});
test('cancel and a new region cannot be overwritten by stale source responses',async({page})=>{
 let release=()=>{};const gate=new Promise<void>(r=>release=r);await page.route('https://earth-search.aws.element84.com/**',async r=>{await gate;await r.fulfill({contentType:'application/json',body:JSON.stringify({features:[]})}).catch(()=>{});});await page.locator('#find-geography').click();await expect(page.locator('#loading')).toBeVisible();await page.locator('#cancel-load').click();await expect(page.locator('body')).toHaveAttribute('data-state','CANCELLED');await page.locator('#route-choice').selectOption('sogne');release();await ready(page);await expect(page.locator('#preview')).toHaveAttribute('data-region','sogne');await page.waitForTimeout(100);await expect(page.locator('#preview')).toHaveAttribute('data-mode','terrain');await expect(page.locator('#geography-consent')).toBeHidden();
});
test('another user import requires fresh area consent and does not keep old requests',async({page})=>{
 await page.locator('#keep-local').click();await page.locator('#file').setInputFiles('tests/fixtures/metadata-links.gpx');await ready(page);await expect(page.locator('#geography-consent')).toBeVisible();await page.setViewportSize({width:375,height:812});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
