import { RoutePath } from './geo';
import { progressAt } from './animation';
import type { Route, RoutePoint } from './route';
import { validateStoryConfig, type StoryConfig } from './story';
export type StoryPhase = 'INTRO' | 'ROUTE_REPLAY' | 'OUTRO';
export interface StoryState {
  readonly phase: StoryPhase;
  readonly timeSeconds: number;
  readonly timelineProgress: number;
  readonly routeProgress: number;
  readonly point: RoutePoint;
  readonly segment: number;
  readonly index: number;
  readonly travelledKm: number;
  readonly totalKm: number;
  readonly introProgress: number;
  readonly outroProgress: number;
  readonly showStart: boolean;
  readonly showFinish: boolean;
  readonly markerOpacity: number;
  readonly title: string;
  readonly stationary: boolean;
}
/** Precompute once per route/configuration. All frame state depends only on video time. */
export class StoryTimeline {
  readonly config: Readonly<StoryConfig>;
  readonly path: RoutePath;
  private readonly boundaries: number[];
  constructor(readonly route: Route, config: StoryConfig) {
    if (!route.segments.length || route.segments.some(segment => !segment.length)) throw new Error('Для таймлайна нужен непустой маршрут.');
    this.config = validateStoryConfig(config);
    this.path = new RoutePath(route.segments);
    let previous = 0;
    this.boundaries = this.path.edges.filter(edge => { const changed = edge.segment !== previous; previous = edge.segment; return changed; }).map(edge => edge.start / this.path.total);
  }
  at(seconds: number): StoryState {
    if (!Number.isFinite(seconds)) throw new Error('Некорректное время видео.');
    const c = this.config, time = Math.max(0, Math.min(c.durationSeconds, seconds));
    const replayEnd = c.durationSeconds - c.outroSeconds, replayLength = replayEnd - c.introSeconds;
    const phase: StoryPhase = time < c.introSeconds ? 'INTRO' : time >= replayEnd ? 'OUTRO' : 'ROUTE_REPLAY';
    const routeProgress = c.durationSeconds === 4 ? progressAt(time, 4) : phase === 'INTRO' ? 0 : phase === 'OUTRO' ? 1 : (time - c.introSeconds) / replayLength;
    const position = this.path.at(routeProgress);
    let markerOpacity = 1;
    if (c.durationSeconds !== 4 && phase === 'ROUTE_REPLAY' && this.boundaries.length) {
      let lo = 0, hi = this.boundaries.length;
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (this.boundaries[mid] < routeProgress) lo = mid + 1; else hi = mid; }
      const nearest = Math.min(Math.abs(routeProgress - (this.boundaries[lo] ?? Infinity)), Math.abs(routeProgress - (this.boundaries[lo - 1] ?? Infinity)));
      markerOpacity = Math.min(1, nearest * replayLength / 0.12);
    }
    return { phase, timeSeconds: time, timelineProgress: time / c.durationSeconds, routeProgress, point: position.point, segment: position.segment, index: position.index, travelledKm: position.distance, totalKm: this.path.total,
      introProgress: c.introSeconds ? Math.min(1, time / c.introSeconds) : 1,
      outroProgress: c.outroSeconds ? Math.max(0, Math.min(1, (time - replayEnd) / c.outroSeconds)) : Number(phase === 'OUTRO'),
      showStart: true, showFinish: true, markerOpacity, title: c.title, stationary: this.path.total === 0 };
  }
}
