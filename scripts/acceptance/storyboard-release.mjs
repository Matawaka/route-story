import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expect} from '@playwright/test';

// Real built UI only: shared by local candidate and the protected HTTPS smoke.
// All routes used here are the existing synthetic first-party Furka fixture.
export async function acceptStoryboard(page,directory){
 const ready=()=>expect(page.locator('#export')).toBeEnabled({timeout:120000});
 if(await page.locator('#welcome').isVisible())await page.locator('#welcome-close').click();
 await ready();if(await page.locator('body').getAttribute('data-state')==='PLAYING')await page.locator('#play').click();
 await page.locator('#quality').selectOption('compatibility');await ready();
 await page.locator('#duration').selectOption('20');await ready();
 await page.locator('#edit-story').click();await ready();
 await expect(page.locator('body')).toHaveAttribute('data-montage','edited');await expect(page.locator('.scene-card')).toHaveCount(5);
 await page.locator('.scene-card').nth(2).click();await expect(page.locator('#scene-shot')).toBeEnabled({timeout:120000});
 const shot=await page.locator('#scene-shot option').nth(1).getAttribute('value');assert.ok(shot);await page.locator('#scene-shot').selectOption(shot);await ready();
 const original=await page.locator('.scene-card').allTextContents();await page.locator('#scene-duration').fill('7');
 await page.locator('#play').click();await page.locator('#play').click();await expect(page.locator('#scene-duration')).toHaveValue('7');
 await page.locator('#apply-scene-duration').click();await ready();const edited=await page.locator('.scene-card').allTextContents();assert.notDeepEqual(edited,original);
 await page.locator('#undo-edit').click();await ready();assert.deepEqual(await page.locator('.scene-card').allTextContents(),original);
 await page.locator('#redo-edit').click();await ready();assert.deepEqual(await page.locator('.scene-card').allTextContents(),edited);
 await page.locator('#scrub').fill('5');const reference=await page.locator('#preview').evaluate(c=>c.toDataURL());
 await page.locator('#scrub').fill('19');await page.locator('#scrub').fill('0');await page.locator('#scrub').fill('5');assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),reference);
 await page.screenshot({path:directory+'/storyboard-landscape.png',fullPage:true});
 const pending=page.waitForEvent('download');await page.locator('#save-project').click();const file=directory+'/synthetic-furka.rstory.json';await(await pending).saveAs(file);
 const project=JSON.parse(readFileSync(file));assert.equal(project.schema,'route-story.project/v1');assert.equal(project.montage.scenes.reduce((n,s)=>n+s.frames,0),480);assert.doesNotMatch(JSON.stringify(project),/"(?:lat|lon|points|segments|url)"/);
 await page.locator('#ratio').selectOption('portrait');await ready();await expect(page.locator('#montage-format')).toContainText('9:16');
 await page.screenshot({path:directory+'/storyboard-portrait.png',fullPage:true});
 await page.reload();if(await page.locator('#welcome').isVisible())await page.locator('#welcome-close').click();await ready();
 await page.locator('#project-file').setInputFiles(file);await expect(page.locator('body')).toHaveAttribute('data-montage','edited',{timeout:120000});await ready();
 assert.deepEqual(await page.locator('.scene-card').allTextContents(),edited);await page.locator('#scrub').fill('5');assert.equal(await page.locator('#preview').evaluate(c=>c.toDataURL()),reference);
 // Leave the existing fresh-session/route privacy assertions in release.mjs
 // running afterward; this helper creates no browser storage or external call.
 return{status:'PASS',syntheticFixture:'Furka',shot,sceneTimeUndoRedo:true,draftPreserved:true,exactReverseSeek:true,projectReopenExactPixels:true,aspects:['landscape','portrait'],editedMp4:'Separate full recorded production and high-resolution acceptance; not re-encoded by this bounded HTTPS UI check'};
}
