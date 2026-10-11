import { RoutePath } from './geo';
import type { Route, RoutePoint } from './route';

export const GRADE_LIMITS = Object.freeze({ gentle: .03, steep: .10, windowMeters: 100, spikeMeters: 30 });
export const GRADE_STYLES = Object.freeze({
  steepUp: { color: '#ff554d', speed: .65, label: '↑ >10%' },
  up: { color: '#ffa549', speed: .8, label: '↑ 3–10%' },
  flat: { color: '#ffe29a', speed: 1, label: '±3%' },
  down: { color: '#a7efb6', speed: 1.2, label: '↓ 3–10%' },
  steepDown: { color: '#32cf94', speed: 1.4, label: '↓ >10%' },
  neutral: { color: '#e0e6df', speed: 1, label: 'нет надёжного уклона' }
});
export type GradeBand = keyof typeof GRADE_STYLES;
export interface ElevationSource {
  readonly name: string;
  readonly spacingMeters: number;
  covers(route: Route): boolean;
  elevation(point: RoutePoint): number | undefined;
}
export interface GradeEdge {
  readonly startKm: number;
  readonly endKm: number;
  readonly segment: number;
  readonly index: number;
  readonly grade?: number;
  readonly elevationStart?: number;
  readonly elevationEnd?: number;
  readonly band: GradeBand;
  readonly color: string;
  readonly speed: number;
}
export function gradeBand(grade: number): GradeBand {
  return grade >= GRADE_LIMITS.steep ? 'steepUp' : grade >= GRADE_LIMITS.gentle ? 'up' : grade <= -GRADE_LIMITS.steep ? 'steepDown' : grade <= -GRADE_LIMITS.gentle ? 'down' : 'flat';
}
/** O(points log points), independent segments, no mutation or invented elevations.
 * GPX quality is internally screened, not a claim of surveyed altitude accuracy.
 * DEM is a whole-route alternative: vertical datums are never mixed. */
export class RouteDynamics {
  readonly path: RoutePath;
  readonly edges: readonly GradeEdge[];
  readonly status: 'usable' | 'missing' | 'unreliable' | 'stationary';
  readonly source: string;
  readonly note: string;
  readonly correctedSpikes: number;
  private readonly allocations: Float64Array;
  private readonly totalAllocation: number;
  constructor(route: Route, dem?: ElevationSource, path = new RoutePath(route.segments)) {
    if(path.segments!==route.segments)throw Error('Геометрия профиля относится к другому маршруту.');
    this.path = path;
    const complete = route.segments.every(s => s.every(p => p.elevation !== undefined && Number.isFinite(p.elevation)));
    let heights = complete ? route.segments.map(s => s.map(p => p.elevation!)) : dem?.covers(route) ? route.segments.map(s => s.map(p => dem.elevation(p))) : undefined;
    this.source = complete ? 'GPX' : heights ? dem!.name : 'нет высот';
    let status: typeof this.status = !path.total ? 'stationary' : heights?.every(s => s.every(h => h !== undefined && Number.isFinite(h))) ? 'usable' : 'missing';
    if (status !== 'usable') heights = undefined;
    let spikes = 0;
    const edgeGrades = new Map<number, { grade: number; a: number; b: number }>();
    let offset = 0, cursor = 0;
    for (let segment = 0; segment < route.segments.length; segment++) {
      const first = cursor;
      while (cursor < path.edges.length && path.edges[cursor].segment === segment) cursor++;
      const original = route.segments[segment], segmentEdges = path.edges.slice(first, cursor);
      if (heights) {
        const distance = new Float64Array(original.length);
        for (const e of segmentEdges) distance[e.index] = e.end - offset;
        for (let i = 1; i < distance.length; i++) if (!distance[i]) distance[i] = distance[i - 1];
        const raw = heights[segment] as number[], filtered = [...raw];
        for (let i = 1; i + 1 < raw.length; i++) {
          const span = (distance[i + 1] - distance[i - 1]) * 1000;
          if (complete && span > 0 && span <= GRADE_LIMITS.windowMeters * 2 && Math.abs(raw[i] - (raw[i - 1] + raw[i + 1]) / 2) > GRADE_LIMITS.spikeMeters && Math.abs(raw[i + 1] - raw[i - 1]) < GRADE_LIMITS.spikeMeters / 2) { filtered[i] = (raw[i - 1] + raw[i + 1]) / 2; spikes++; }
        }
        const at = (km: number) => {
          let lo = 0, hi = distance.length - 1;
          while (lo < hi) { const mid = (lo + hi) >>> 1; if (distance[mid] < km) lo = mid + 1; else hi = mid; }
          if (!lo || distance[lo] === distance[lo - 1]) return filtered[lo];
          const t = (km - distance[lo - 1]) / (distance[lo] - distance[lo - 1]);
          return filtered[lo - 1] + (filtered[lo] - filtered[lo - 1]) * t;
        };
        for (let j = 0; j < segmentEdges.length; j++) {
          const e = segmentEdges[j];
          const centre = (e.start + e.end) / 2 - offset, half = GRADE_LIMITS.windowMeters / 2000;
          const a = Math.max(0, centre - half), b = Math.min(distance.at(-1)!, centre + half);
          const grade = (at(b) - at(a)) / ((b - a) * 1000);
          // Very short altitude discontinuities cannot provide a credible grade.
          // Real DEM cliffs can exceed 100%; this is not a GPS altitude artifact
          // and not evidence that a synthetic route is a rideable road.
          if (!Number.isFinite(grade) || (complete && Math.abs(grade) > 1)) status = 'unreliable';
          edgeGrades.set(first + j, { grade, a: filtered[e.index - 1], b: filtered[e.index] });
        }
      }
      offset = segmentEdges.at(-1)?.end ?? offset;
    }
    this.correctedSpikes = spikes;
    this.status = status;
    this.note = status === 'usable' ? `${this.source} · окно ${GRADE_LIMITS.windowMeters} м${complete ? ' · точность высот GPX не проверена' : ` · шаг DEM ${dem!.spacingMeters} м`}` : status === 'stationary' ? 'Стоящий маршрут: уклон и темп не применяются.' : status === 'unreliable' ? 'Недостоверные перепады высот: нейтральный путь и равномерный темп.' : 'Полных высот нет: нейтральный путь и равномерный темп.';
    this.edges = Object.freeze(path.edges.map((e, i) => {
      const sample = status === 'usable' ? edgeGrades.get(i) : undefined, band = sample ? gradeBand(sample.grade) : 'neutral';
      return Object.freeze({ startKm: e.start, endKm: e.end, segment: e.segment, index: e.index, grade: sample?.grade, elevationStart: sample?.a, elevationEnd: sample?.b, band, ...GRADE_STYLES[band] });
    }));
    this.allocations = new Float64Array(this.edges.length + 1);
    for (let i = 0; i < this.edges.length; i++) this.allocations[i + 1] = this.allocations[i] + (this.edges[i].endKm - this.edges[i].startKm) / this.edges[i].speed;
    this.totalAllocation = this.allocations.at(-1)!;
  }
  /** Normalized stylized video time -> true cumulative geographic distance. */
  atDistance(km: number): GradeEdge | undefined {
    if(!Number.isFinite(km))throw Error('Некорректное расстояние профиля.');
    if (!this.edges.length) return;
    let lo=0, hi=this.edges.length-1;
    while(lo<hi){const mid=(lo+hi)>>>1;if(this.edges[mid].endKm<=km)lo=mid+1;else hi=mid;}
    return this.edges[lo];
  }
  distanceProgressAt(time: number): number {
    if (!Number.isFinite(time)) throw Error('Некорректное время темпа.');
    const t = Math.max(0, Math.min(1, time));
    if (!this.totalAllocation || t === 0 || t === 1) return t;
    const allocation = t * this.totalAllocation;
    let lo = 0, hi = this.edges.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (this.allocations[mid + 1] <= allocation) lo = mid + 1; else hi = mid; }
    const e = this.edges[lo];
    return (e.startKm + (allocation - this.allocations[lo]) * e.speed) / this.path.total;
  }
  timeProgressAt(distance: number): number {
    if (!Number.isFinite(distance)) throw Error('Некорректное расстояние темпа.');
    const p = Math.max(0, Math.min(1, distance));
    if (!this.totalAllocation || p === 0 || p === 1) return p;
    const km = p * this.path.total;
    let lo = 0, hi = this.edges.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (this.edges[mid].endKm <= km) lo = mid + 1; else hi = mid; }
    return (this.allocations[lo] + (km - this.edges[lo].startKm) / this.edges[lo].speed) / this.totalAllocation;
  }
}
