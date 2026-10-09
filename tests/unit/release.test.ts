import {describe,it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';

describe('release authorization refuses unsafe contexts before network access',()=>{
 for(const [name,override,message] of [
  ['PR event',{GITHUB_EVENT_NAME:'pull_request'},'explicitly dispatched'],
  ['feature branch',{GITHUB_REF:'refs/heads/release/route-story-v1'},'no PR/feature-branch deployment'],
  ['stale review',{REVIEWED_SHA:'b'.repeat(40)},'exact reviewed main commit'],
  ['abbreviated review',{REVIEWED_SHA:'aaaaaaa'},'full reviewed SHA required']
 ] as const)it(name,()=>{
  const result=spawnSync(process.execPath,['scripts/check-release-authorization.mjs'],{
   encoding:'utf8',windowsHide:true,env:{...process.env,GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_SHA:'a'.repeat(40),REVIEWED_SHA:'a'.repeat(40),GH_TOKEN:'unused-test-token',...override}
  });
  expect(result.status).not.toBe(0);expect(result.stderr).toContain(message);
 });
});

describe('photo publication package requires an explicit bounded build',()=>{
 it('rejects simultaneous candidate and publication modes',()=>{
  const result=spawnSync(process.execPath,['scripts/package-release.mjs','--imagery-candidate','--imagery-release'],{encoding:'utf8',windowsHide:true,env:{...process.env,BUILD_IMAGERY_PACK:'1'}});
  expect(result.status).not.toBe(0);expect(result.stderr).toContain('never both');
 });
 it('rejects publication without the matching photo build opt-in',()=>{
  const result=spawnSync(process.execPath,['scripts/package-release.mjs','--imagery-release'],{encoding:'utf8',windowsHide:true,env:{...process.env,BUILD_IMAGERY_PACK:'0'}});
  expect(result.status).not.toBe(0);expect(result.stderr).toContain('explicit build opt-in');
 });
});
