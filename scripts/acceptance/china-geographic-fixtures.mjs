// Owner-provided independent WGS84 areas; synthetic tests, never real journeys.
import {writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('artifacts/automatic-geography',{recursive:true});
const areas=[[35.308667,105.065472],[36.897417,103.697250],[44.308790,86.022867]];
for(let i=0;i<areas.length;i++){
 const [lat,lon]=areas[i],points=Array.from({length:25},(_,j)=>`<trkpt lat="${lat+.004*Math.sin(j/24*Math.PI)}" lon="${lon+(j/24-.5)*.01}"/>`).join('');
 writeFileSync(`artifacts/automatic-geography/china-${i+1}.gpx`,`<?xml version="1.0"?><gpx version="1.1" creator="Route Story synthetic geographic test" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Synthetic China test ${i+1} — not a historical journey</name></metadata><trk><trkseg>${points}</trkseg></trk></gpx>`);
}
