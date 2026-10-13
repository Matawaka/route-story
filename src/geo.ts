// Haversine and cumulative-distance lookup adapted from Travel Animation geo.js.
// Copyright (c) 2026 topmonroe9. MIT; see licenses/TRAVEL_ANIMATION.txt.
import type { Route, RoutePoint } from './route';
const rad = (degrees: number) => degrees * Math.PI / 180;
export const wrapDelta = (degrees: number) => ((degrees + 180) % 360 + 360) % 360 - 180;
export function haversine(a: RoutePoint, b: RoutePoint): number {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(wrapDelta(b.lon - a.lon)) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
export function routeMetrics(segments: RoutePoint[][]): Pick<Route, 'pointCount' | 'distanceKm' | 'elevationGain'> {
  let distanceKm = 0, pointCount = 0, gain = 0, elevationPairs = 0;
  for (const points of segments) {
    pointCount += points.length;
    for (let i = 1; i < points.length; i++) {
      distanceKm += haversine(points[i - 1], points[i]);
      if (points[i].elevation !== undefined && points[i - 1].elevation !== undefined) {
        gain += Math.max(0, points[i].elevation! - points[i - 1].elevation!); elevationPairs++;
      }
    }
  }
  // A partial elevation series cannot justify a complete route ascent metric.
  const completeElevation = segments.every(points => points.every(p => p.elevation !== undefined));
  return { pointCount, distanceKm, elevationGain: completeElevation && elevationPairs > 0 ? gain : undefined };
}

/** Find the smallest circular interval containing all route longitudes. */
export function longitudeBounds(points: RoutePoint[]): { west: number; east: number; center: number } {
  const values = points.map(p => ((p.lon % 360) + 360) % 360).sort((a, b) => a - b);
  let largest = -1, start = values[0];
  for (let i = 0; i < values.length; i++) {
    const next = i + 1 < values.length ? values[i + 1] : values[0] + 360;
    if (next - values[i] > largest) { largest = next - values[i]; start = next % 360; }
  }
  const span = 360 - largest;
  return { west: start, east: start + span, center: start + span / 2 };
}

export function fitProjection(segments: RoutePoint[][], width: number, height: number) {
  const points = segments.flat();
  const { center } = longitudeBounds(points);
  let south = 90, north = -90;
  for (const p of points) { south = Math.min(south, p.lat); north = Math.max(north, p.lat); }
  const middleLat = (south + north) / 2;
  const cos = Math.max(0.01, Math.cos(rad(middleLat)));
  const localLon = (lon: number) => center + wrapDelta(lon - center);
  let west = Infinity, east = -Infinity;
  for (const p of points) { const x = localLon(p.lon); west = Math.min(west, x); east = Math.max(east, x); }
  const margin = Math.min(width, height) * 0.12;
  const top = height * 0.25, bottom = height * 0.76;
  // Bound extreme zoom, but do not hide metre-scale tracks in a kilometre-wide view.
  // Stationary geometry keeps the previous finite overview; source points are unchanged.
  const minimumSpan = east === west && north === south ? 0.01 : 0.0001;
  const spanX = Math.max((east - west) * cos, minimumSpan), spanY = Math.max(north - south, minimumSpan);
  const scale = Math.min((width - margin * 2) / spanX, (bottom - top) / spanY);
  const project = (p: RoutePoint): [number, number] => [width / 2 + (localLon(p.lon) - (west + east) / 2) * cos * scale, (top + bottom) / 2 - (p.lat - middleLat) * scale];
  return { project, localLon, scale, cos, center, middleLat };
}

/** Distance-indexed path. No distance or interpolation is added across GPX segments. */
export class RoutePath {
  readonly edges: { a: RoutePoint; b: RoutePoint; start: number; end: number; segment: number; index: number }[] = [];
  readonly total: number;
  private readonly segmentRanges: {first:number;last:number;start:number;end:number}[] = [];
  constructor(readonly segments: RoutePoint[][]) {
    let distance = 0;
    segments.forEach((points, segment) => {
      const first=this.edges.length,start=distance;
      for (let index = 1; index < points.length; index++) {
        const length = haversine(points[index - 1], points[index]);
        if (length > 0) this.edges.push({ a: points[index - 1], b: points[index], start: distance, end: distance + length, segment, index });
        distance += length;
      }
      this.segmentRanges.push({first,last:this.edges.length-1,start,end:distance});
    });
    this.total = distance;
  }
  /** A distance-window chord suppresses tiny zigzags without changing the actual marker point.
   * Binary searches stay inside one original segment, including exact endpoints and duplicates. */
  headingPoints(segment:number,index:number,distance?:number):readonly [RoutePoint,RoutePoint]|undefined {
    const edge=this.edgeAt(segment,index),range=this.segmentRanges[segment];if(!edge||!range)return;
    const center=Math.min(range.end,Math.max(range.start,distance??(edge.start+edge.end)/2));
    const radius=Math.min(.125,Math.max(.05,(range.end-range.start)*.005)); // 100–250 m full window
    const local=(d:number):RoutePoint=>{
      let lo=range.first,hi=range.last;while(lo<hi){const m=(lo+hi)>>>1;if(this.edges[m].end<d)lo=m+1;else hi=m;}
      const e=this.edges[lo],t=Math.min(1,Math.max(0,(d-e.start)/(e.end-e.start)));
      return {lat:e.a.lat+(e.b.lat-e.a.lat)*t,lon:wrapDelta(e.a.lon+wrapDelta(e.b.lon-e.a.lon)*t)};
    };
    return [local(Math.max(range.start,center-radius)),local(Math.min(range.end,center+radius))];
  }
  at(progress: number): { point: RoutePoint; segment: number; index: number; distance: number } {
    const fraction = Math.min(1, Math.max(0, progress));
    if (fraction === 1) { const segment = this.segments.length - 1; return { point: this.segments[segment].at(-1)!, segment, index: this.segments[segment].length - 1, distance: this.total }; }
    if (fraction === 0 || !this.edges.length) return { point: this.segments[0][0], segment: 0, index: 0, distance: 0 };
    const distance = fraction * this.total;
    let lo = 0, hi = this.edges.length - 1;
    while (lo < hi) { const middle = (lo + hi) >>> 1; if (this.edges[middle].end <= distance) lo = middle + 1; else hi = middle; }
    const edge = this.edges[lo];
    const t = Math.min(1, Math.max(0, (distance - edge.start) / (edge.end - edge.start)));
    return { point: { lon: wrapDelta(edge.a.lon + wrapDelta(edge.b.lon - edge.a.lon) * t), lat: edge.a.lat + (edge.b.lat - edge.a.lat) * t }, segment: edge.segment, index: edge.index, distance };
  }
  /** Stable heading edge at start/finish and duplicate points; never cross a gap. */
  edgeAt(segment: number, index: number): (typeof this.edges)[number] | undefined {
    if (!Number.isInteger(segment) || !Number.isInteger(index) || segment < 0 || index < 0 || segment >= this.segments.length || index >= this.segments[segment].length) return;
    const target = Math.max(1,index); let lo = 0, hi = this.edges.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1, edge = this.edges[mid]; if (edge.segment < segment || (edge.segment === segment && edge.index < target)) lo = mid + 1; else hi = mid; }
    if (this.edges[lo]?.segment === segment) return this.edges[lo];
    if (this.edges[lo-1]?.segment === segment) return this.edges[lo-1];
  }
}
