import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const previous=json('docs/AUTOMATIC_GEOGRAPHY_EVIDENCE.json');
const results=[];
for(const [name,folder] of [['mont-blanc','mont-blanc-final-retry'],['malerweg','malerweg-final']]){
 const dir=`artifacts/automatic-geography/${folder}`,r=json(`${dir}/acceptance.json`),before=previous.results.find(v=>v.case===name);
 assert.equal(r.status,'VERIFIED LOCAL');assert.equal(r.storage.local+r.storage.session+r.storage.indexed,0);
 const outputs=r.outputs.map(v=>{
  assert.equal(createHash('sha256').update(readFileSync(v.file)).digest('hex'),v.sha256);
  assert.equal(v.decodedFrames,v.duration*24);assert.equal(v.codec,'h264');assert.equal(v.previewExportPixelParity,true);assert.equal(v.reverseSeekPixelParity,true);
  return {...v,camera:json(v.file.replace('.mp4','-camera-study.json'))};
 });
 const retry=json(`${dir}/retry-30s.mp4.validation.json`);assert.equal(retry.decodedFrames,720);
 results.push({case:name,browser:r.browser,os:r.os,physicalDevice:r.physicalDevice,outputs,
  preparationMs:r.evidence.preparationMs,downloadBytes:r.evidence.downloadBytes,derivedImageSpacingMeters:r.evidence.derivedImageSpacingMeters,derivedDemSpacingMeters:r.evidence.derivedDemSpacingMeters,
  maximumSampledPrivateBytes:Math.max(...r.nativeMemory.samples.map(v=>v.privateBytes??0)),memoryMethod:r.nativeMemory.method,
  recoveredFailures:r.recoveredFailures??[],cancelRetry:r.cancelRetry,retry:{...retry,sha256:createHash('sha256').update(readFileSync(retry.file)).digest('hex')},
  previousRuntime:before?.sourceCommit,previousOutputs:before?.outputs,
  externalRequestsBeforeConsent:r.externalRequestsBeforeConsent,storage:r.storage});
}
writeFileSync('docs/CAMERA_STABILITY_EVIDENCE.json',JSON.stringify({schema:1,date:'2026-10-13',status:'VERIFIED LOCAL / NOT DEPLOYED',
 runtimeCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),beforeCameraCommit:'9eca4e2777d6d4d1a8e5c09375c9aaf2ecac140f',
 frameCriterion:'Exact uncompressed decoded RGBA equality, no channel tolerance; lossy MP4 independently decoded separately',
 physicalDevices:'NOT TESTED for this new minute/pixel pipeline',gpuVram:'NOT MEASURED',javascriptHeap:'NOT MEASURED',
 performanceLimitations:'Single samples, not medians; some jobs overlapped routine checks. Before/after timings are observations, not a controlled performance benchmark. Longer operation sets prevent a like-for-like native-memory/leak conclusion.',
 privateGpxCommitted:false,privateRouteScreenshotsCommitted:false,results},null,2)+'\n');
console.log('Verified summaries for',results.length,'cases and',results.reduce((n,r)=>n+r.outputs.length+1,0),'real decoded MP4s');
