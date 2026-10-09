import { defineConfig } from 'vite';
import { copyFileSync, cpSync, mkdirSync, readdirSync } from 'node:fs';
export default defineConfig(({command})=>({
  publicDir:command==='serve'?'public':false,
  define:{__IMAGERY_ENABLED__:JSON.stringify(command==='serve'||process.env.BUILD_IMAGERY_PACK==='1')},
  base: './', server: { watch: { ignored: ['**/artifacts/**', '**/.reference/**', '**/test-results/**'] } },
  plugins: [
    { name: 'development-style-csp', apply: 'serve', transformIndexHtml: html => html.replace("style-src 'self';", "style-src 'self' 'unsafe-inline';") },
    { name: 'distribute-license-notices', apply: 'build', closeBundle() {
      // Baseline remains ≤5MiB. Photo pack is a local opt-in candidate; existing
      // protected Pages workflow does not enable it or bypass package checks.
      for(const name of readdirSync('public'))if(name!=='imagery'||process.env.BUILD_IMAGERY_PACK==='1')cpSync(`public/${name}`,`dist/${name}`,{recursive:true});
      mkdirSync('dist/licenses', { recursive: true });
      for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) copyFileSync(name, `dist/${name}`);
      for (const name of readdirSync('licenses')) copyFileSync(`licenses/${name}`, `dist/licenses/${name}`);
    } }
  ]
}));
