import {readdirSync,readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve('dist'),files=[],imageryCandidate=process.argv.includes('--imagery-candidate');
function walk(dir,prefix=''){for(const name of readdirSync(dir)){const file=join(dir,name),relative=prefix+name,stat=lstatSync(file);assert.ok(!stat.isSymbolicLink(),`No links in release package: ${relative}`);if(stat.isDirectory())walk(file,relative+'/');else files.push(relative);}}
walk(root);
const fixed=['index.html','LICENSE','THIRD_PARTY_NOTICES.md','licenses/MEDIABUNNY-MPL-2.0.txt','licenses/TRAVEL_ANIMATION.txt','licenses/THREE-MIT.txt','maps/ne_110m_land.geojson','maps/world-50m.json','maps/fjords-10m.json','samples/cinematic-fjords.gpx','samples/terrain-sogne.gpx','samples/synthetic.gpx','samples/synthetic-antimeridian.gpx','terrain/sogne.json','terrain/sogne-50m.i16','terrain/sogne-100m.i16'];
if(imageryCandidate){
 assert.equal(process.env.BUILD_IMAGERY_PACK,'1','local photo candidate requires explicit opt-in');
 fixed.push('imagery/sogne-sentinel.json','imagery/sogne-sentinel-40m.jpg','imagery/sogne-sentinel-10m.jpg');
 const metadata=JSON.parse(readFileSync('public/imagery/sogne-sentinel.json','utf8'));let pixels=0,bytes=0;
 assert.equal(metadata.file,'sogne-sentinel-40m.jpg');assert.equal(metadata.detail.file,'sogne-sentinel-10m.jpg');assert.ok(!metadata.detail.detail);
 for(const level of [metadata,metadata.detail]){const image=readFileSync('public/imagery/'+level.file);pixels+=level.width*level.height;bytes+=image.length;assert.ok(level.width<=2048&&level.height<=2048);assert.equal(image.length,level.bytes);assert.equal(createHash('sha256').update(image).digest('hex'),level.sha256);}
 assert.ok(pixels<=3000000&&bytes<=2*1024*1024);
}
for(const name of fixed)assert.ok(files.includes(name),`Required public file ${name}`);
for(const file of files)assert.ok(fixed.includes(file)||file==='release.json'||/^assets\/[a-zA-Z0-9_-]+\.(js|css)$/.test(file),`Unexpected file in public package: ${file}`);
const html=readFileSync(join(root,'index.html'),'utf8');
assert.ok(html.includes('http-equiv="Content-Security-Policy"'));assert.ok(!/unsafe-inline|unsafe-eval|https?:\/\//.test(html),'restrictive local-only HTML');
assert.ok(!/(?:src|href)="\//.test(html),'HTML assets must support repository subpath');
assert.ok(html.includes("connect-src 'self'")&&html.includes("object-src 'none'"));
for(const file of fixed)if(file!=='index.html'){
 const source=file==='LICENSE'||file==='THIRD_PARTY_NOTICES.md'||file.startsWith('licenses/')?file:join('public',file);
 assert.ok(readFileSync(join(root,file)).equals(readFileSync(source)),`Public provenance unchanged: ${file}`);
}
const sourceCommit=process.env.BUILD_COMMIT||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();assert.match(sourceCommit,/^[a-f0-9]{40}$/);
const entries=files.filter(f=>f!=='release.json').sort().map(path=>{const data=readFileSync(join(root,path));return{path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};});
const totalBytes=entries.reduce((n,e)=>n+e.bytes,0),photoBytes=entries.filter(e=>e.path.startsWith('imagery/')).reduce((n,e)=>n+e.bytes,0);assert.ok(totalBytes-photoBytes<=5*1024*1024&&photoBytes<=2*1024*1024+16384,'bounded baseline and separate local-only photo candidate, no video/benchmark/private files');
const version=JSON.parse(readFileSync('package.json')).version;
writeFileSync(join(root,'release.json'),JSON.stringify({schema:1,app:'Route Story',version,sourceCommit,totalBytes,...(imageryCandidate?{candidate:'photo-prototype',publicationApproved:false,baselineBytes:totalBytes-photoBytes,photoBytes}:{}),files:entries},null,2)+'\n');
console.log(JSON.stringify({sourceCommit,version,totalBytes,publicFiles:entries.length}));
