import { spawn } from 'node:child_process';
/** Dedicated dev server for opt-in tools; does not reuse an unrelated user's tab/server. */
export async function withServer(run) {
  const port = 4183, url = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'], { windowsHide: true, stdio: 'pipe' });
  let log = ''; child.stdout.on('data', b => { log += b; }); child.stderr.on('data', b => { log += b; });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(`Acceptance server failed: ${log}`);
      try { if ((await fetch(url)).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve,100));
    }
    if (!ready) throw new Error('Acceptance server timeout.');
    return await run(url);
  } finally { child.kill(); }
}
