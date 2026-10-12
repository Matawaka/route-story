/** Consolidate actual local proofs; fail rather than copy stale MP4 hashes. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {validateVideo} from '../validate-video.mjs';
const json=file=>JSON.parse(readFileSync(file,'utf8'));
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const folder='artifacts/sprint11/swiss',manifest=json('data/swiss-pilot/manifest.json');
const verified=[];
for(const aspect of ['landscape','portrait'])for(const mode of ['low10m','high']){
  const duration=aspect==='landscape'?20:30,file=`${folder}/${aspect}-${mode}-${duration}s.mp4`,proof=json(file+'.proof.json');
  assert.equal(proof.sha256,hash(file),'Proof hash must describe current MP4');
  assert.ok(proof.seekEqual&&proof.exportEqual&&proof.cancelled&&proof.sameCameraVerified&&proof.allFramesNonblank&&proof.endpointLabelsAvoidRider);
  const validation=validateVideo(file,proof.width,proof.height,duration);assert.equal(proof.bytes,validation.bytes);
  verified.push({...proof,...validation});
}
const performance=json(`${folder}/performance/summary.json`);
const benchmarks=[];
for(const r of performance.reports.filter(r=>r.summary)){
  const file=`${folder}/performance/${r.mode}-${r.aspect}-10s.mp4`;
  benchmarks.push({...validateVideo(file,r.warmup.width,r.warmup.height,10),sha256:hash(file)});
}
const sogne=json(`${folder}/sogne-regression.json`);assert.equal(sogne.checks.length,48);assert.ok(sogne.checks.every(c=>c.different===0));
const phaseA=[];
for(const [aspect,duration] of [['landscape',20],['portrait',30]]){
  const file=`artifacts/sprint11/full/${aspect}-traveler-${duration}s.mp4`,proof=json(file+'.proof.json');
  assert.equal(proof.sha256,hash(file));phaseA.push(proof);
}
const files=['src/terrain.ts','src/terrain-camera.ts','src/terrain-renderer.ts','src/regional-projection.ts','src/swiss-pilot.ts','src/swiss-pilot-main.ts','src/imagery.ts','tests/e2e/swiss.spec.ts','data/swiss-pilot/manifest.json'];
const report={schema:1,date:'2026-10-11',scope:'Local developer candidate only; no public Swiss deployment',branch:'codex/swiss-alps-pilot',testedParentCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),testedSourceSha256:Object.fromEntries(files.map(f=>[f,hash(f)])),dependency:{pullRequest:'https://github.com/Matawaka/route-story/pull/10',head:'3113f4367171fed21907a53ccd4c5b0fd5c83cf1',main:'126dd98805594a1547b858c02922dfa565c24b81'},environment:{os:'Windows 10.0.26200 x64',browserUserAgent:verified[0].userAgent,gpu:'Same previously documented NVIDIA RTX 3090 development computer; no fresh hardware fingerprint collection',physicalMobile:'NOT TESTED',ordinaryLaptop:'NOT TESTED'},sourceManifest:'data/swiss-pilot/manifest.json',sources:manifest.sources,derivedBoundsAndBudgets:manifest.budgets,nativeAcquisitionResolution:'NOT CLASSIFIED: source raster 0.1m, native published classes 0.1/0.25m; derived output 0.5/1m',projectionProof:manifest.projectionProof,finalRegression:{command:'SWISS_PILOT=1 PLAYWRIGHT_CHANNEL=msedge FULL_EXPORT_ACCEPTANCE=1 OWNER_JPEG_PATH=<local file> npm.cmd run check (BUILD_IMAGERY_PACK unset)',cleanInstall:'npm.cmd ci: 76 packages installed / 77 audited / 0 vulnerabilities',unit:{passed:189,files:17,failed:0},build:'PASS',browser:{passed:61,failed:0,skipped:1,skipReason:'External-data GPX opt-in intentionally unavailable',elapsedMinutes:3.1},initialWrongBuildMode:{browserPassed:60,browserFailed:1,browserSkipped:1,reason:'BUILD_IMAGERY_PACK=1 supplied to baseline release allowlist test; guard correctly rejected extra files. Corrected full run above; no assertions weakened.'},dependencyAudit:'npm.cmd audit: 0 vulnerabilities'},videos:verified,benchmarkVideos:benchmarks,performance,localTexelFootprint:json(`${folder}/detail-footprint.json`),sognePixelRegression:sogne,latestPhaseAExports:phaseA,historicalPhaseAEvidence:'docs/RIDER_EVIDENCE.json preserved',memoryLimitations:{nativeBrowserProcess:'NOT MEASURED',rendererMediaProcesses:'NOT MEASURED',gpuPeak:'NOT MEASURED',encoderPeak:'NOT MEASURED',jsHeap:'CDP observations in performance; test-only GC is never production',analyticalDecodedRgbaBytes:11840000,analyticalMipChainBytes:15786667,analyticalMeshArraysBytes:15384344,heightGridBytes:453152},knownLimitations:['Small 1km coverage boundary and empty overview surroundings remain visible','Selected optical native GSD/date within year not independently resolved','Integer-metre DEM storage adds up to 0.5m rounding; source height accuracy is separate','Native/GPU peaks and lower-powered/physical-mobile acceptance unavailable','No Swiss public package, hosting approval or deployment'],ownerGate:'Visual review of actual MP4/decoded comparisons before any Swiss merge/hosting/package expansion'};
writeFileSync('docs/SWISS_PILOT_EVIDENCE.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'VERIFIED locally',videos:verified.map(v=>({file:v.file,frames:v.decodedFrames,bytes:v.bytes,sha256:v.sha256})),sogneUnchangedFrames:48}));
