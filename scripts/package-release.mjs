import {readdirSync,readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve('dist'),files=[],imageryCandidate=process.argv.includes('--imagery-candidate'),imageryRelease=process.argv.includes('--imagery-release'),imageryPack=imageryCandidate||imageryRelease;
const swissPack=process.argv.includes('--swiss-release');if(swissPack)assert.equal(process.env.BUILD_SWISS_PACK,'1','Swiss pack requires the owner-authorized opt-in build');
const geographyCandidate=process.argv.includes('--automatic-geography-candidate');if(geographyCandidate)assert.equal(process.env.BUILD_AUTO_GEOGRAPHY,'1','Automatic geography is a separately reviewed opt-in candidate');
assert.ok(!(imageryCandidate&&imageryRelease),'choose candidate or owner-authorized imagery release, never both');
if(imageryPack)assert.equal(process.env.BUILD_IMAGERY_PACK,'1','photo package requires explicit build opt-in');
function walk(dir,prefix=''){for(const name of readdirSync(dir)){const file=join(dir,name),relative=prefix+name,stat=lstatSync(file);assert.ok(!stat.isSymbolicLink(),`No links in release package: ${relative}`);if(stat.isDirectory())walk(file,relative+'/');else files.push(relative);}}
walk(root);
const fixed=['index.html','LICENSE','THIRD_PARTY_NOTICES.md','licenses/MEDIABUNNY-MPL-2.0.txt','licenses/TRAVEL_ANIMATION.txt','licenses/THREE-MIT.txt','maps/ne_110m_land.geojson','maps/world-50m.json','maps/fjords-10m.json','samples/cinematic-fjords.gpx','samples/terrain-sogne.gpx','samples/synthetic.gpx','samples/synthetic-antimeridian.gpx','terrain/sogne.json','terrain/sogne-50m.i16','terrain/sogne-100m.i16'];
fixed.push('markers/traveler-euc-256.png');
fixed.push('licenses/GEOGRAPHIC_DEPENDENCIES.txt');
if(swissPack){fixed.push('swiss-pilot.html','regions/furka/manifest.json');const m=JSON.parse(readFileSync('public/regions/furka/manifest.json'));assert.equal(m.publication.ownerAuthorized,'2026-10-12');for(const e of [m.terrain.lods[0],m.imagery.high,m.imagery.high.detail,m.route]){const path='regions/furka/'+e.file,data=readFileSync('public/'+path);assert.equal(data.length,e.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),e.sha256);fixed.push(path);}assert.ok(m.budgets.imagePixels<=3000000&&m.budgets.meshVertices<=500000);}
const rider=readFileSync('public/markers/traveler-euc-256.png');assert.equal(rider.length,76427);assert.equal(createHash('sha256').update(rider).digest('hex'),'eb39e771f2fab21c7607b9d863c3d4a2b8b8275e2f5df772e7036e7d15e01fd6');
if(imageryPack){
 fixed.push('imagery/sogne-sentinel.json','imagery/sogne-sentinel-40m.jpg','imagery/sogne-sentinel-10m.jpg');
 const metadata=JSON.parse(readFileSync('public/imagery/sogne-sentinel.json','utf8'));let pixels=0,bytes=0;
 assert.equal(metadata.file,'sogne-sentinel-40m.jpg');assert.equal(metadata.detail.file,'sogne-sentinel-10m.jpg');assert.ok(!metadata.detail.detail);
 for(const level of [metadata,metadata.detail]){const image=readFileSync('public/imagery/'+level.file);pixels+=level.width*level.height;bytes+=image.length;assert.ok(level.width<=2048&&level.height<=2048);assert.equal(image.length,level.bytes);assert.equal(createHash('sha256').update(image).digest('hex'),level.sha256);}
 assert.ok(pixels<=3000000&&bytes<=2*1024*1024);
}
for(const name of fixed)assert.ok(files.includes(name),`Required public file ${name}`);
for(const file of files)assert.ok(fixed.includes(file)||file==='release.json'||/^assets\/[a-zA-Z0-9_-]+\.(js|css)$/.test(file)||geographyCandidate&&/^assets\/pako\.esm-[a-zA-Z0-9_-]+\.js$/.test(file),`Unexpected file in public package: ${file}`);
const html=readFileSync(join(root,'index.html'),'utf8');
const geographicConnect="connect-src 'self' https://earth-search.aws.element84.com https://planetarycomputer.microsoft.com https://sentinel-cogs.s3.us-west-2.amazonaws.com https://elevationeuwest.blob.core.windows.net;";
if(geographyCandidate)assert.ok(html.includes(geographicConnect),'exact reviewed geography origins, no wildcard');
const checkedHtml=geographyCandidate?html.replace(geographicConnect,"connect-src 'self';"):html;
assert.ok(html.includes('http-equiv="Content-Security-Policy"'));assert.ok(!/unsafe-inline|unsafe-eval|https?:\/\//.test(checkedHtml),'restrictive HTML; external geography only in explicit consented candidate');
assert.ok(!/(?:src|href)="\//.test(html),'HTML assets must support repository subpath');
assert.ok(html.includes("connect-src 'self'")&&html.includes("object-src 'none'"));
if(swissPack){const h=readFileSync(join(root,'swiss-pilot.html'),'utf8');assert.ok(h.includes('http-equiv="Content-Security-Policy"')&&!/unsafe-inline|unsafe-eval|https?:\/\//.test(h));assert.ok(!/(?:src|href)="\//.test(h),'Swiss entry supports repository subpath');}
for(const file of fixed)if(file!=='index.html'&&file!=='swiss-pilot.html'){
 const source=file==='LICENSE'||file==='THIRD_PARTY_NOTICES.md'||file.startsWith('licenses/')?file:join('public',file);
 assert.ok(readFileSync(join(root,file)).equals(readFileSync(source)),`Public provenance unchanged: ${file}`);
}
const sourceCommit=process.env.BUILD_COMMIT||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();assert.match(sourceCommit,/^[a-f0-9]{40}$/);
const entries=files.filter(f=>f!=='release.json').sort().map(path=>{const data=readFileSync(join(root,path));return{path,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};});
const totalBytes=entries.reduce((n,e)=>n+e.bytes,0),photoBytes=entries.filter(e=>e.path.startsWith('imagery/')).reduce((n,e)=>n+e.bytes,0),swissBytes=entries.filter(e=>e.path.startsWith('regions/furka/')).reduce((n,e)=>n+e.bytes,0),addonBytes=geographyCandidate?entries.filter(e=>/^assets\/(geographic-preparation|raw|deflate|packbits|webimage|basedecoder|lzw|jpeg|pako\.esm|zstd|lerc)-/.test(e.path)).reduce((n,e)=>n+e.bytes,0):0,packageLimitBytes=((swissPack?9:imageryPack?6:5)+(geographyCandidate&&!swissPack?.5:0))*1024*1024;
assert.ok(addonBytes<=512*1024&&totalBytes-photoBytes-swissBytes-addonBytes<=5*1024*1024&&photoBytes<=2*1024*1024+16384&&swissBytes<=2200000,'bounded baseline and reviewed regional photo packs; candidate decoder addon ≤512KiB, no video/private files');
const version=JSON.parse(readFileSync('package.json')).version;
const manifest=JSON.stringify({schema:1,app:'Route Story',version,sourceCommit,totalBytes,...(imageryPack?{imageryPack:'sogne-sentinel-adaptive',publicationApproved:imageryRelease,...(imageryCandidate?{candidate:'photo-prototype'}:{}),packageLimitBytes,baselineBytes:totalBytes-photoBytes-swissBytes-addonBytes,photoBytes}:{}),...(swissPack?{regionalPacks:['furka'],swissBytes,packageLimitBytes}:{}),...(geographyCandidate?{automaticGeography:'experimental-candidate',automaticGeographyPublicationApproved:false,addonBytes,addonLimitBytes:512*1024,packageLimitBytes}:{}),files:entries},null,2)+'\n';
assert.ok(Buffer.byteLength(manifest)<=16384&&totalBytes+Buffer.byteLength(manifest)<=packageLimitBytes,'complete public package including manifest exceeds reviewed limit');
writeFileSync(join(root,'release.json'),manifest);
console.log(JSON.stringify({sourceCommit,version,totalBytes,manifestBytes:Buffer.byteLength(manifest),packageLimitBytes,publicFiles:entries.length,imageryRelease}));
