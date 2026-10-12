import { defineConfig } from 'vite';
import { copyFileSync, cpSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
export default defineConfig(({command})=>({
  publicDir:command==='serve'?'public':false,
  define:{__IMAGERY_ENABLED__:JSON.stringify(command==='serve'||process.env.BUILD_IMAGERY_PACK==='1')},
  base: './', server: { watch: { ignored: ['**/artifacts/**', '**/.reference/**', '**/test-results/**'] } },
  plugins: [
    {name:'developer-swiss-pilot',apply:'serve',configureServer(server){
      if(process.env.SWISS_PILOT!=='1')return;
      const allowed=new Set(['furka-2m.i16','furka-50m.i16','furka-high-overview.jpg','furka-high-detail.jpg','furka-low-overview.jpg','furka-low-detail.jpg','furka-synthetic.gpx']);
      const contextFiles=new Set(['furka-context-5m.i16','furka-context-50m.i16','furka-context-high-overview.jpg','furka-context-high-detail.jpg','furka-context-low-overview.jpg','furka-context-low-detail.jpg']);
      server.middlewares.use((req,res,next)=>{
        const extended=req.url?.startsWith('/__swiss-phase-c/');if(!extended&&!req.url?.startsWith('/__swiss-pilot/'))return next();
        const name=req.url!.slice(extended?'/__swiss-phase-c/'.length:'/__swiss-pilot/'.length);if(req.method!=='GET'||!(extended?contextFiles:allowed).has(name)){res.statusCode=404;res.end();return;}
        try{const bytes=readFileSync(`.reference/swiss/${extended?'phase-c':'pilot'}/${name}`);if(bytes.length>2*1024*1024)throw Error('Bounded pilot resource');res.setHeader('Content-Type',name.endsWith('.jpg')?'image/jpeg':name.endsWith('.gpx')?'application/gpx+xml':'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(bytes);}
        catch{res.statusCode=404;res.end('Prepare the developer-only Swiss pack first.');}
      });
    }},
    { name: 'development-style-csp', apply: 'serve', transformIndexHtml: html => html.replace("style-src 'self';", "style-src 'self' 'unsafe-inline';") },
    { name: 'distribute-license-notices', apply: 'build', closeBundle() {
      // Baseline remains ≤5MiB. Photo pack is a local opt-in candidate; existing
      // protected Pages workflow does not enable it or bypass package checks.
      for(const name of readdirSync('public'))if(name!=='imagery')cpSync(`public/${name}`,`dist/${name}`,{recursive:true});
      if(process.env.BUILD_IMAGERY_PACK==='1'){mkdirSync('dist/imagery',{recursive:true});for(const name of ['sogne-sentinel.json','sogne-sentinel-40m.jpg','sogne-sentinel-10m.jpg'])copyFileSync(`public/imagery/${name}`,`dist/imagery/${name}`);}
      mkdirSync('dist/licenses', { recursive: true });
      for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) copyFileSync(name, `dist/${name}`);
      for (const name of readdirSync('licenses')) copyFileSync(`licenses/${name}`, `dist/licenses/${name}`);
    } }
  ]
}));
