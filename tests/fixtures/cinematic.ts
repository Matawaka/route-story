/** MIT. Invented demonstration geometry in western Norway; no historical trip or navigation claim. */
export function cinematicGpx():string {
  const anchors=[[5.29,60.395],[5.21,60.43],[5.08,60.49],[4.95,60.59],[4.99,60.70],[5.18,60.77],[5.04,60.9],[5.06,61.035],[5.3,61.08],[5.5,61.075],[5.69,61.10],[5.87,61.145],[6.02,61.19],[6.19,61.18],[6.37,61.19],[6.5,61.26],[6.75,61.30],[6.92,61.25]];
  const count=700,points=[];
  for(let i=0;i<count;i++){
    const position=i/(count-1)*(anchors.length-1),index=Math.min(anchors.length-2,Math.floor(position)),t=position-index;
    const a=anchors[Math.max(0,index-1)],b=anchors[index],c=anchors[index+1],d=anchors[Math.min(anchors.length-1,index+2)];
    const xy=[0,1].map(axis=>.5*(2*b[axis]+(-a[axis]+c[axis])*t+(2*a[axis]-5*b[axis]+4*c[axis]-d[axis])*t*t+(-a[axis]+3*b[axis]-3*c[axis]+d[axis])*t*t*t));
    points.push(`<trkpt lat="${xy[1].toFixed(6)}" lon="${xy[0].toFixed(6)}"/>`);
  }
  return `<gpx version="1.1" creator="Matawaka synthetic cinematic demonstration"><metadata><name>Фьорды · синтетический маршрут</name><desc>SYNTHETIC. Invented demonstration, not a historical journey, road or navigable itinerary. MIT.</desc></metadata><trk><trkseg>${points.join('')}</trkseg></trk></gpx>\n`;
}
