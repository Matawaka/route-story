/** Development-only, pinned public-domain Natural Earth sources. No runtime remote calls. */
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const revision='ca96624a56bd078437bca8184e78163e5039ad19',folder='.reference/natural-earth';
mkdirSync(folder,{recursive:true});mkdirSync('public/maps',{recursive:true});
const sources=[];
async function source(name){
 const url=`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${revision}/geojson/ne_${name}.geojson`,file=`${folder}/ne_${name}.geojson`;
 if(!existsSync(file)){const response=await fetch(url);assert.ok(response.ok,`${name}: HTTP ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.length<25*1024*1024);writeFileSync(file,bytes);}
 const bytes=readFileSync(file);sources.push({name,url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});return JSON.parse(bytes).features;
}
const region=[3.5,59,9,62.5],inside=([x,y])=>x>=region[0]&&x<=region[2]&&y>=region[1]&&y<=region[3];
const round=p=>p.map(n=>Number(n.toFixed(6)));
function clipRing(input){
 let points=input.slice(0,-1);
 for(const [axis,value,sign] of [[0,region[0],1],[0,region[2],-1],[1,region[1],1],[1,region[3],-1]]){
  const output=[];for(let i=0;i<points.length;i++){const a=points[(i+points.length-1)%points.length],b=points[i],ai=(a[axis]-value)*sign>=0,bi=(b[axis]-value)*sign>=0;
   if(ai!==bi){const t=(value-a[axis])/(b[axis]-a[axis]);output.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}if(bi)output.push(b);
  }points=output;
 }
 if(points.length<3)return[];return [...points,points[0]].map(round);
}
function clipEdge(a,b){
 let low=0,high=1;for(let axis=0;axis<2;axis++){const d=b[axis]-a[axis];if(d===0){if(a[axis]<region[axis]||a[axis]>region[axis+2])return null;continue;}let t0=(region[axis]-a[axis])/d,t1=(region[axis+2]-a[axis])/d;if(t0>t1)[t0,t1]=[t1,t0];low=Math.max(low,t0);high=Math.min(high,t1);if(high<low)return null;}
 return [round([a[0]+(b[0]-a[0])*low,a[1]+(b[1]-a[1])*low]),round([a[0]+(b[0]-a[0])*high,a[1]+(b[1]-a[1])*high])];
}
function polygons(features,regional=false){return features.flatMap(f=>{
 const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 return polygons.map(p=>regional?p.map(clipRing).filter(r=>r.length):p.map(r=>r.map(round))).filter(p=>p.length);
});}
function lines(features,regional=false){return features.flatMap(f=>{
 const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates;
 if(!regional)return lines.map(l=>l.map(round));
 return lines.flatMap(line=>{const output=[];let part=[];for(let i=1;i<line.length;i++){const edge=clipEdge(line[i-1],line[i]);if(!edge){if(part.length>1)output.push(part);part=[];continue;}if(part.length&&JSON.stringify(part.at(-1))===JSON.stringify(edge[0]))part.push(edge[1]);else{if(part.length>1)output.push(part);part=edge;}}if(part.length>1)output.push(part);return output;});
});}
const world={schema:1,name:'Natural Earth 1:50m',extent:[-180,-90,180,90],land:polygons(await source('50m_land')),lakes:polygons(await source('50m_lakes')),rivers:lines(await source('50m_rivers_lake_centerlines')),coast:[],labels:[]};
const pack={schema:1,name:'Western Norway · Natural Earth 1:10m',extent:region,land:polygons(await source('10m_land'),true),coast:lines(await source('10m_coastline'),true),lakes:polygons(await source('10m_lakes'),true),rivers:lines(await source('10m_rivers_lake_centerlines'),true),labels:(await source('10m_populated_places')).filter(f=>inside(f.geometry.coordinates)).map(f=>({point:round(f.geometry.coordinates),text:f.properties.NAME,rank:f.properties.SCALERANK})).sort((a,b)=>a.rank-b.rank||a.text.localeCompare(b.text,'en'))};
const outputs=[];for(const [name,data] of [['world-50m.json',world],['fjords-10m.json',pack]]){const bytes=Buffer.from(JSON.stringify(data)+'\n');writeFileSync(`public/maps/${name}`,bytes);outputs.push({path:`maps/${name}`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),polygons:data.land.length,lakes:data.lakes.length,rivers:data.rivers.length,coastlines:data.coast.length,labels:data.labels.length});}
assert.ok(outputs.reduce((n,f)=>n+f.bytes,0)<4*1024*1024,'Bound geography assets independently of the 5 MiB static package');
writeFileSync('docs/GEOGRAPHY_SOURCES.json',JSON.stringify({schema:1,license:'public domain',revision,region,transformation:'Strip unused properties; six-decimal coordinates; axis-aligned polygon/line clipping for the regional pack. Fill clipping edges are not coastlines. GPS data is untouched.',sources,outputs},null,2)+'\n');console.log(JSON.stringify(outputs,null,2));
