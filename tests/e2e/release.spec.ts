import {test,expect} from '@playwright/test';
import {execFileSync,spawnSync} from 'node:child_process';
import {writeFileSync,unlinkSync} from 'node:fs';
// @ts-expect-error Test-only static host for the actual production repository subpath.
import {withProductionServer} from '../../scripts/acceptance/production.mjs';

test('release package rejects extra data and production works below /route-story/',async({page,context})=>{
 const unexpected='dist/unexpected-synthetic.gpx';
 try{
  writeFileSync(unexpected,'<gpx/>');
  const refused=spawnSync(process.execPath,['scripts/package-release.mjs'],{encoding:'utf8',windowsHide:true});
  expect(refused.status).not.toBe(0);expect(refused.stderr).toContain('Unexpected file in public package');
 }finally{unlinkSync(unexpected);}
 execFileSync(process.execPath,['scripts/package-release.mjs'],{windowsHide:true});
 await withProductionServer(async(url:string)=>{
  const unexpectedRequests:string[]=[],errors:string[]=[];
  await context.route('**/*',r=>{
   const request=r.request(),target=new URL(request.url());
   if(target.origin!==new URL(url).origin||!target.pathname.startsWith('/route-story/')||!['GET','HEAD'].includes(request.method())){unexpectedRequests.push(request.url());return r.abort();}
   return r.continue();
  });
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(url);expect(response?.status()).toBe(200);
  const manifest=await (await page.request.get(url+'release.json')).json();expect(manifest.version).toBe('1.0.0');expect(manifest.sourceCommit).toMatch(/^[a-f0-9]{40}$/);
  await page.locator('#demo').click();await expect(page.locator('#export')).toBeEnabled();
  await expect(page.locator('#route-info')).toContainText('синтетический');
  await page.locator('#scrub').fill('1');await expect(page.locator('#preview')).toHaveAttribute('data-phase','INTRO');
  await page.locator('#scrub').fill('19');await expect(page.locator('#preview')).toHaveAttribute('data-phase','OUTRO');
  for(const file of ['maps/ne_110m_land.geojson','samples/synthetic-antimeridian.gpx','LICENSE','THIRD_PARTY_NOTICES.md','licenses/MEDIABUNNY-MPL-2.0.txt'])expect((await page.request.get(url+file)).status()).toBe(200);
  expect(unexpectedRequests).toEqual([]);expect(errors).toEqual([]);
 });
});
