import {writeFileSync} from 'node:fs';
import {cinematicGpx} from '../tests/fixtures/cinematic.ts';
writeFileSync('public/samples/cinematic-fjords.gpx',cinematicGpx());
