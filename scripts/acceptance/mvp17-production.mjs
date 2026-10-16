import {spawnSync,spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {withProductionServer} from './production.mjs';

// Builds and verifies a downloadable candidate only. No deployment, tag,
// GitHub environment change or remote write is performed here.
const dir='artifacts/mvp17-production';mkdirSync(dir,{recursive:true});
const run=(file,args,env)=>{const r=spawnSync(process.execPath,[file,...args],{stdio:'inherit',env:{...process.env,...env},windowsHide:true});assert.equal(r.status,0,`${file} failed`);};
const report={status:'PENDING',version:JSON.parse(readFileSync('package.json')).version,sourceCommit:process.env.BUILD_COMMIT,packages:[],publicDeployment:false};
try{
 for(const mode of ['baseline','sogne','combined']){
  const env={BUILD_IMAGERY_PACK:mode==='baseline'?'0':'1',BUILD_SWISS_PACK:mode==='combined'?'1':'0',BUILD_AUTO_GEOGRAPHY:mode==='combined'?'1':'0'};
  run('node_modules/vite/bin/vite.js',['build'],env);
  const args=mode==='baseline'?[]:mode==='sogne'?['--imagery-candidate']:['--imagery-candidate','--swiss-release','--automatic-geography-candidate'];
  run('scripts/package-release.mjs',args,env);
  const manifest=JSON.parse(readFileSync('dist/release.json'));assert.equal(manifest.version,'1.7.0-rc.1');
  report.packages.push({mode,totalBytes:manifest.totalBytes,manifestBytes:readFileSync('dist/release.json').length,files:manifest.files.length,limitBytes:manifest.packageLimitBytes??5*1024*1024});
 }
 run('scripts/acceptance/release.mjs',['--smoke'],{ACCEPTANCE_DIR:dir});
 await withProductionServer(async url=>{
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test','tests/e2e/competition-demo.spec.ts'],{stdio:'inherit',windowsHide:true,env:{...process.env,MVP17_PRODUCTION_URL:url,COMPETITION_DEMO:'1'}});
   child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`production storyboard test exited ${code}`)));
  });
 });
 run('scripts/acceptance/competition-media.mjs',[],{});
 report.status='PASS';
}catch(error){report.status='FAILED';report.error=String(error);process.exitCode=1;}
writeFileSync(dir+'/package-acceptance.json',JSON.stringify(report,null,2));
