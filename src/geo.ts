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
  // Minimum span gives stationary / duplicate-point routes a finite, useful view.
  const spanX = Math.max((east - west) * cos, 0.01), spanY = Math.max(north - south, 0.01);
  const scale = Math.min((width - margin * 2) / spanX, (bottom - top) / spanY);
  const project = (p: RoutePoint): [number, number] => [width / 2 + (localLon(p.lon) - (west + east) / 2) * cos * scale, (top + bottom) / 2 - (p.lat - middleLat) * scale];
  return { project, localLon, scale, cos, center, middleLat };
}

/** Distance-indexed path. No distance or interpolation is added across GPX segments. */
export class RoutePath {
  readonly edges: { a: RoutePoint; b: RoutePoint; start: number; end: number; segment: number; index: number }[] = [];
  readonly total: number;
  constructor(readonly segments: RoutePoint[][]) {
    let distance = 0;
    segments.forEach((points, segment) => {
      for (let index = 1; index < points.length; index++) {
        const length = haversine(points[index - 1], points[index]);
        if (length > 0) this.edges.push({ a: points[index - 1], b: points[index], start: distance, end: distance + length, segment, index });
        distance += length;
      }
    });
    this.total = distance;
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
}
