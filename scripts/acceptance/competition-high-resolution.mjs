import {withServer} from './server.mjs';
// Keep the child alive in the same Node lifetime as the existing acceptance.
await withServer(async url=>{process.env.APP_URL=url+'/';await import('./high-resolution.mjs');});
