// Owner-consented approximate-area source feasibility. Private GPX stays local.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { DOMParser } from '@xmldom/xmldom';
const paths=process.argv.slice(2);if(paths.length!==2)throw Error('Supply the two owner-consented local GPX paths; files never leave this computer.');
const root='artifacts/automatic-geography';await mkdir(root,{recursive:true});
for(const [label,path] of [['mont-blanc',paths[0]],['malerweg',paths[1]]]){
 const doc=new DOMParser().parseFromString(await readFile(path,'utf8'),'text/xml');
 const pts=[...Array.from(doc.getElementsByTagName('trkpt')),...Array.from(doc.getElementsByTagName('rtept'))];
 const xs=pts.map(p=>Number(p.getAttribute('lon'))),ys=pts.map(p=>Number(p.getAttribute('lat')));
 const bbox=[Math.floor(Math.min(...xs)*10)/10,Math.floor(Math.min(...ys)*10)/10,Math.ceil(Math.max(...xs)*10)/10,Math.ceil(Math.max(...ys)*10)/10];
 for(const collection of ['sentinel-2-l2a','cop-dem-glo-30']){
  const url=new URL('https://earth-search.aws.element84.com/v1/search');url.searchParams.set('collections',collection);url.searchParams.set('bbox',bbox.join(','));url.searchParams.set('limit',collection.startsWith('sentinel')?'100':'20');
  if(collection.startsWith('sentinel')){url.searchParams.set('datetime','2025-06-01T00:00:00Z/2025-09-30T23:59:59Z');url.searchParams.set('query',JSON.stringify({'eo:cloud_cover':{lt:20}}));}
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`${collection}: ${response.status}`);const data=await response.json();
  await writeFile(`${root}/${label}-${collection}.json`,JSON.stringify(data,null,2));
  const features=data.features.sort((a,b)=>(a.properties['eo:cloud_cover']??0)-(b.properties['eo:cloud_cover']??0));
  console.log(label,collection,features.length,features.slice(0,5).map(f=>({id:f.id,bbox:f.bbox,date:f.properties.datetime,cloud:f.properties['eo:cloud_cover'],epsg:f.properties['proj:epsg'],assets:Object.fromEntries(Object.entries(f.assets).filter(([k])=>['visual','scl','data'].includes(k)).map(([k,v])=>[k,v.href]))})));
 }
}
