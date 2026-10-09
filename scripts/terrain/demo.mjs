/** Authored synthetic geometry, not a historical trip or a navigable path. */
import {writeFileSync} from 'node:fs';
const origin=[6.2,61.28],r=6371008.8,rad=Math.PI/180,cos=Math.cos(origin[1]*rad);
const anchors=[[-5500,-5500],[-4200,-3100],[-2200,-2100],[-900,-900],[800,600],[1700,2500],[2800,4400],[1300,5600],[-800,4300],[-2100,2400]];
const points=[];
for(let i=0;i<anchors.length-1;i++)for(let j=0;j<80;j++){
 const t=j/80,a=anchors[Math.max(0,i-1)],b=anchors[i],c=anchors[i+1],d=anchors[Math.min(anchors.length-1,i+2)];
 const sample=k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t);
 points.push([sample(0),sample(1)]);
}points.push(anchors.at(-1));
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Route Story synthetic terrain demonstration" xmlns="http://www.topografix.com/GPX/1/1"><metadata><name>Над склонами Согне-фьорда · синтетический маршрут</name><desc>Entirely synthetic authored coordinates over real Kartverket terrain. Not a historical journey, road or hiking recommendation. No fabricated GPX elevation or timestamps.</desc></metadata><trk><name>Над склонами Согне-фьорда · синтетический маршрут</name><trkseg>\n${points.map(([x,y])=>`<trkpt lat="${(origin[1]+y/(r*rad)).toFixed(7)}" lon="${(origin[0]+x/(r*rad*cos)).toFixed(7)}"/>`).join('\n')}\n</trkseg></trk></gpx>\n`;
writeFileSync('public/samples/terrain-sogne.gpx',xml);console.log({points:points.length,bytes:Buffer.byteLength(xml)});
