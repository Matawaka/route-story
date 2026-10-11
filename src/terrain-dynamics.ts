import { RoutePath } from './geo';
import type { RoutePoint } from './route';

/** Distance-indexed DEM grade and illustrative replay pacing, never actual speed. */
export class RouteDynamics {
  readonly grades: Float32Array;
  readonly hasData: boolean;
  private readonly weightedTime: Float64Array;
  private readonly totalWeight: number;

  constructor(readonly path: RoutePath, elevationAt: (point: RoutePoint) => number | undefined) {
    const edges=path.edges,n=edges.length;
    this.grades=new Float32Array(n);
    this.weightedTime=new Float64Array(n+1);
    if(!n||!Number.isFinite(path.total)||path.total<=0) {this.hasData=false;this.totalWeight=0;return;}
    const a=new Float64Array(n),b=new Float64Array(n);
    for(let i=0;i<n;i++){
      const left=elevationAt(edges[i].a),right=elevationAt(edges[i].b);
      if(left===undefined||right===undefined||!Number.isFinite(left)||!Number.isFinite(right)){
        this.hasData=false;this.totalWeight=0;return;
      }
      a[i]=left;b[i]=right;
    }
    const elevationAtDistance=(distance:number,begin:number,end:number):number=>{
      let lo=begin,hi=end;
      while(lo<hi){const mid=(lo+hi)>>>1;if(edges[mid].end<distance)lo=mid+1;else hi=mid;}
      const edge=edges[lo],ratio=Math.max(0,Math.min(1,(distance-edge.start)/(edge.end-edge.start)));
      return a[lo]+(b[lo]-a[lo])*ratio;
    };
    let begin=0;
    while(begin<n){
      let end=begin;while(end+1<n&&edges[end+1].segment===edges[begin].segment)end++;
      const first=edges[begin].start,last=edges[end].end;
      for(let i=begin;i<=end;i++){
        const middle=(edges[i].start+edges[i].end)/2;
        const d0=Math.max(first,middle-.075),d1=Math.min(last,middle+.075);
        // Under 10 metres of evidence is too short for a reliable steep grade.
        const grade=d1-d0<.01?0:(elevationAtDistance(d1,begin,end)-elevationAtDistance(d0,begin,end))/((d1-d0)*1000);
        this.grades[i]=Math.max(-.25,Math.min(.25,grade));
      }
      begin=end+1;
    }
    let total=0;
    for(let i=0;i<n;i++){
      const distance=edges[i].end-edges[i].start;
      total+=distance/speedForGrade(this.grades[i]);
      this.weightedTime[i+1]=total;
    }
    this.totalWeight=total;
    this.hasData=Number.isFinite(total)&&total>0;
  }

  /** Map video-time fraction to distance fraction, preserving total duration. */
  distanceAtProgress(progress:number):number {
    if(!Number.isFinite(progress))throw Error('Некорректная доля анимации.');
    const fraction=Math.max(0,Math.min(1,progress));
    if(!this.hasData||fraction===0||fraction===1)return fraction;
    const t=fraction*this.totalWeight;
    let lo=0,hi=this.path.edges.length-1;
    while(lo<hi){const mid=(lo+hi)>>>1;if(this.weightedTime[mid+1]<t)lo=mid+1;else hi=mid;}
    const edge=this.path.edges[lo],weight=this.weightedTime[lo+1]-this.weightedTime[lo];
    const local=weight>0?Math.max(0,Math.min(1,(t-this.weightedTime[lo])/weight)):0;
    return (edge.start+(edge.end-edge.start)*local)/this.path.total;
  }
}

/** Continuous bounded relative factors; never represent measured vehicle speed. */
export function speedForGrade(grade:number):number {
  if(!Number.isFinite(grade))throw Error('Некорректный уклон.');
  const g=Math.max(-.25,Math.min(.25,grade));
  if(g>=.10)return .65;
  if(g>=.03)return .8-(g-.03)/.07*.15;
  if(g>=0)return 1-g/.03*.2;
  if(g<=-.10)return 1.4;
  if(g<=-.03)return 1.2+(-g-.03)/.07*.2;
  return 1-g/.03*.2;
}
