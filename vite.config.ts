import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
export default defineConfig({
  base: './', server: { watch: { ignored: ['**/artifacts/**', '**/.reference/**', '**/test-results/**'] } },
  plugins: [
    { name: 'development-style-csp', apply: 'serve', transformIndexHtml: html => html.replace("style-src 'self';", "style-src 'self' 'unsafe-inline';") },
    { name: 'distribute-license-notices', apply: 'build', closeBundle() {
      mkdirSync('dist/licenses', { recursive: true });
      for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) copyFileSync(name, `dist/${name}`);
      for (const name of readdirSync('licenses')) copyFileSync(`licenses/${name}`, `dist/licenses/${name}`);
    } }
  ]
});
