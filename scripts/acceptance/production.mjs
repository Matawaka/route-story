import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
// Local test-only static host; never a required product backend.
export async function withProductionServer(run){
 const root=resolve('dist'),prefix='/route-story/';
 const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.gpx':'application/gpx+xml','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
 const server=createServer(async(req,res)=>{try{
   const url=new URL(req.url,'http://127.0.0.1');
   if(url.pathname==='/route-story'){res.writeHead(301,{Location:prefix});res.end();return;}
   if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
   const file=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');
   if(!file.startsWith(root+sep)||!(await stat(file)).isFile())throw new Error('Not public file');
   res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}});
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(4185,'127.0.0.1',ok);});
 try{return await run('http://127.0.0.1:4185'+prefix);}finally{await new Promise(ok=>server.close(ok));}
}
