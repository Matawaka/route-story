import type {Bounds,XY} from './camera';
/** Clip only basemap geometry at preparation time; GPS coordinates/path are never clipped. */
export function clipRing(points:readonly XY[],box:Bounds):XY[] {
  let output=points.slice();
  if(output.length>1&&output[0][0]===output.at(-1)![0]&&output[0][1]===output.at(-1)![1])output.pop();
  for(const [axis,value,sign] of [[0,box[0],1],[0,box[2],-1],[1,box[1],1],[1,box[3],-1]]){
    const input=output;output=[];
    for(let i=0;i<input.length;i++){
      const a=input[(i+input.length-1)%input.length],b=input[i],ai=(a[axis]-value)*sign>=0,bi=(b[axis]-value)*sign>=0;
      if(ai!==bi){const t=(value-a[axis])/(b[axis]-a[axis]);output.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}if(bi)output.push(b);
    }
  }
  return output.length<3?[]:output;
}
export function clipLine(points:readonly XY[],box:Bounds,maxJump=Infinity):XY[][] {
  const output:XY[][]=[];let part:XY[]=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];let low=0,high=1;
    if(Math.abs(b[0]-a[0])>maxJump){if(part.length>1)output.push(part);part=[];continue;}
    for(let axis=0;axis<2;axis++){
      const d=b[axis]-a[axis];if(d===0){if(a[axis]<box[axis]||a[axis]>box[axis+2])high=-1;continue;}
      let t0=(box[axis]-a[axis])/d,t1=(box[axis+2]-a[axis])/d;if(t0>t1)[t0,t1]=[t1,t0];low=Math.max(low,t0);high=Math.min(high,t1);
    }
    if(high<low){if(part.length>1)output.push(part);part=[];continue;}
    const start:XY=[a[0]+(b[0]-a[0])*low,a[1]+(b[1]-a[1])*low],end:XY=[a[0]+(b[0]-a[0])*high,a[1]+(b[1]-a[1])*high];
    if(part.length&&Math.abs(part.at(-1)![0]-start[0])<1e-10&&Math.abs(part.at(-1)![1]-start[1])<1e-10)part.push(end);
    else{if(part.length>1)output.push(part);part=[start,end];}
  }
  if(part.length>1)output.push(part);return output;
}
