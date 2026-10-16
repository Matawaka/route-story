import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// Reuse the existing packager and provenance/allowlist/CSP checks. Never deploy.
const dir='artifacts/mobile-editor';mkdirSync(dir,{recursive:true});
const version=JSON.parse(readFileSync('package.json')).version;
const report={status:'PENDING',version,sourceCommit:process.env.BUILD_COMMIT,packages:[],publicDeployment:false};
const run=(file,args,env)=>{
  const result=spawnSync(process.execPath,[file,...args],{stdio:'inherit',windowsHide:true,env:{...process.env,...env}});
  assert.equal(result.status,0,`${file} failed`);
};
try{
  for(const mode of ['baseline','sogne','combined']){
    const env={BUILD_IMAGERY_PACK:mode==='baseline'?'0':'1',BUILD_SWISS_PACK:mode==='combined'?'1':'0',BUILD_AUTO_GEOGRAPHY:mode==='combined'?'1':'0'};
    run('node_modules/vite/bin/vite.js',['build'],env);
    run('scripts/package-release.mjs',mode==='baseline'?[]:mode==='sogne'?['--imagery-candidate']:['--imagery-candidate','--swiss-release','--automatic-geography-candidate'],env);
    const bytes=readFileSync('dist/release.json'),manifest=JSON.parse(bytes);
    assert.equal(manifest.version,version);assert.equal(manifest.sourceCommit,report.sourceCommit);
    const completeBytes=manifest.totalBytes+bytes.length,limitBytes=manifest.packageLimitBytes??5*1024*1024;
    assert.ok(completeBytes<=limitBytes);
    writeFileSync(`${dir}/package-${mode}.json`,bytes);
    report.packages.push({mode,completeBytes,limitBytes,files:manifest.files.length});
  }
  report.status='PASS';
}catch(error){report.status='FAILED';report.error=String(error);process.exitCode=1;}
writeFileSync(dir+'/package-acceptance.json',JSON.stringify(report,null,2));
