import type { Route, RoutePoint } from './route';
import { fitProjection } from './geo';
import { StoryTimeline } from './timeline';
import { CinematicRenderer } from './cinematic';
import type { CinematicGeography } from './geography';
import { regressionStoryConfig, type StoryConfig, type VisualStyle } from './story';
export type { VisualStyle } from './story';
export type Land = { features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[];geography?:CinematicGeography };
export const palette = {
  atlas: { water: '#ecefe6', land: '#dae2d1', coast: '#bdcbb6', grid: '#d7ded1', ink: '#1c3b32', quiet: '#58695e', line: '#216542', track: '#667f6d' },
  night: { water: '#102825', land: '#1b3932', coast: '#2c5045', grid: '#23443a', ink: '#f4f3e5', quiet: '#a3b7a4', line: '#b8ed8d', track: '#769382' }
};
export function metricLabel(route: Route): string {
  return route.elevationGain !== undefined ? `Набор высоты ${Math.round(route.elevationGain).toLocaleString('ru-RU')} м` : `${route.pointCount.toLocaleString('ru-RU')} точек маршрута`;
}
export const formatKm = (km: number) => km.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatDistance = (km: number, totalKm = km) => totalKm < 1 ? `${(km * 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} м` : `${formatKm(km)} км`;
const STROKE_BATCH = 128;
export class RouteRenderer {
  private readonly base: HTMLCanvasElement;
  readonly timeline: StoryTimeline;
  readonly config: Readonly<StoryConfig>;
  private readonly projection!: ReturnType<typeof fitProjection>;
  private readonly projected!: [number, number][][];
  private readonly cinematic?: CinematicRenderer;
  private readonly highlight: HTMLCanvasElement;
  private readonly edges: { a: [number, number]; b: [number, number] }[] = [];
  private readonly prefixes: number[][] = [];
  private readonly displayTitle!: string;
  private readonly metric!: string;
  private readonly distanceFont!: number;
  private readonly metricFont!: number;
  private readonly endpointLabels!: { text: string; x: number; y: number; width: number }[];
  private paintedEdges = 0;
  constructor(readonly route: Route, readonly land: Land, readonly width: number, readonly height: number, readonly style: VisualStyle, config?: StoryConfig) {
    this.base = document.createElement('canvas'); this.base.width = width; this.base.height = height;
    this.highlight = document.createElement('canvas'); this.highlight.width = width; this.highlight.height = height;
    this.timeline = new StoryTimeline(route, config ?? { ...regressionStoryConfig(route.name), visualStyle: style, aspectRatio: height > width ? 'portrait' : 'landscape' });
    this.config = this.timeline.config;
    if(this.config.cameraMode==='cinematic') {
      this.base.width=this.base.height=this.highlight.width=this.highlight.height=0;
      this.cinematic=new CinematicRenderer(this.timeline,land,width,height);return;
    }
    this.projection = fitProjection(route.segments, width, height);
    this.projected = route.segments.map(points => points.map(this.projection.project));
    this.projected.forEach((points, segment) => {
      const prefix: number[] = [this.edges.length];
      for (let i = 1; i < points.length; i++) {
        prefix[i] = this.edges.length;
        const coordinates = route.segments[segment];
        if (Math.abs(this.projection.localLon(coordinates[i].lon) - this.projection.localLon(coordinates[i - 1].lon)) <= 180) this.edges.push({ a: points[i - 1], b: points[i] });
      }
      this.prefixes.push(prefix);
    });
    const unit = Math.min(width, height), available = width - unit * .16, ctx = this.base.getContext('2d')!;
    ctx.font = `650 ${unit * .057}px system-ui`;
    const titlePoints = Array.from(this.config.title), titleLength = titlePoints.length;
    while (ctx.measureText(titlePoints.join('') + (titlePoints.length < titleLength ? '…' : '')).width > available && titlePoints.length) titlePoints.pop();
    this.displayTitle = titlePoints.join('') + (titlePoints.length < titleLength ? '…' : '');
    this.metric = metricLabel(route);
    const fitFont = (text: string, size: number, weight = '') => { ctx.font = `${weight} ${size}px system-ui`; return Math.min(size, size * available / Math.max(1, ctx.measureText(text).width)); };
    this.distanceFont = fitFont(this.distanceText(this.timeline.path.total, false), unit * .052, '650');
    this.metricFont = fitFont(this.metric, unit * .032);
    const start = route.segments[0][0], finish = route.segments.at(-1)!.at(-1)!;
    const sameEndpoint = Math.abs(start.lat - finish.lat) < 1e-8 && Math.abs(this.projection.localLon(start.lon) - this.projection.localLon(finish.lon)) < 1e-8;
    ctx.font = `600 ${unit * .032}px system-ui`;
    this.endpointLabels = (sameEndpoint ? [[start, 'Старт / финиш']] : [[start, 'Старт'], [finish, 'Финиш']]).map(([point, text]) => {
      const [x,y] = this.projection.project(point as RoutePoint), label = text as string, tw = ctx.measureText(label).width;
      return { text: label, width: tw, x: Math.min(width - tw - 8, Math.max(8, x + unit * .035)), y: Math.max(height * .23 + unit * .025, Math.min(height * .78 - unit * .025, y - unit * .055)) };
    });
    if (this.endpointLabels.length === 2) {
      const [a,b] = this.endpointLabels;
      const [sx,sy] = this.projection.project(start), [fx,fy] = this.projection.project(finish);
      if (Math.hypot(sx - fx, sy - fy) < unit * .25) {
        // Put close endpoint labels outside their shared footprint, away from both markers.
        const place = (label: typeof a, x: number, y: number, left: boolean, below: boolean) => {
          label.x = Math.max(8, Math.min(width - label.width - 8, x + (left ? -label.width - unit * .035 : unit * .035)));
          label.y = Math.max(height * .23 + unit * .025, Math.min(height * .78 - unit * .025, y + (below ? 1 : -1) * unit * .055));
        };
        place(a,sx,sy,sx <= fx,sy >= fy); place(b,fx,fy,fx < sx,fy > sy);
      }
      if (a.x < b.x + b.width + unit * .018 && b.x < a.x + a.width + unit * .018 && Math.abs(a.y - b.y) < unit * .05) {
        const [,y] = this.projection.project(finish);
        b.y = Math.min(height * .78 - unit * .025, Math.max(a.y + unit * .06, y + unit * .055));
      }
    }
    this.drawBase();
  }
  private distanceText(travelled: number, outro: boolean): string {
    const total = this.timeline.path.total;
    return outro ? `Всего ${formatDistance(total)}` : `${formatDistance(travelled, total).replace(/ (км|м)$/, '')} / ${formatDistance(total)}`;
  }
  private drawBase(): void {
    const ctx = this.base.getContext('2d')!; const colors = palette[this.style]; const { width: w, height: h } = this;
    ctx.fillStyle = colors.water; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = colors.grid; ctx.lineWidth = 0.5;
    const step = Math.min(w, h) / 8;
    for (let x = 0; x < w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = colors.land; ctx.strokeStyle = colors.coast;
    for (const feature of this.land.features) {
      const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates as number[][][]] : feature.geometry.coordinates as number[][][][];
      for (const polygon of polygons) {
        ctx.beginPath();
        for (const ring of polygon) {
          let previous: number | undefined;
          ring.forEach(([lon, lat], index) => {
            const [x, y] = this.projection.project({ lon, lat }); const local = this.projection.localLon(lon);
            if (index === 0 || (previous !== undefined && Math.abs(local - previous) > 180)) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            previous = local;
          }); ctx.closePath();
        } ctx.fill('evenodd'); ctx.stroke();
      }
    }
    ctx.strokeStyle = colors.track; ctx.lineWidth = Math.max(1.5, Math.min(w, h) / 150); ctx.lineCap = ctx.lineJoin = 'round';
    this.projected.forEach((points, segment) => this.strokeSegment(ctx, points, this.route.segments[segment]));
  }
  private strokeSegment(ctx: CanvasRenderingContext2D, points: [number, number][], coordinates: RoutePoint[], end = points.length): void {
    ctx.beginPath();
    for (let i = 0; i < end; i++) {
      const [x, y] = points[i];
      if (i === 0 || Math.abs(this.projection.localLon(coordinates[i].lon) - this.projection.localLon(coordinates[i - 1].lon)) > 180) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    } ctx.stroke();
  }
  private strokeEdges(ctx: CanvasRenderingContext2D, begin: number, end: number): void {
    if (begin === end) return;
    ctx.beginPath();
    for (let i = begin; i < end; i++) {
      const edge = this.edges[i];
      // Array identity also separates GPX segments and skipped projection seams.
      if (i === begin || this.edges[i - 1].b !== edge.a) ctx.moveTo(...edge.a);
      ctx.lineTo(...edge.b);
    }
    ctx.stroke();
  }
  draw(canvas: HTMLCanvasElement, seconds: number): void {
    if(this.cinematic){this.cinematic.draw(canvas,seconds);return;}
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D недоступен.');
    const { width: w, height: h } = this; const unit = Math.min(w, h), colors = palette[this.style];
    const state = this.timeline.at(seconds), p = state.routeProgress, pad = unit * 0.08;
    ctx.drawImage(this.base, 0, 0);
    ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = unit / 95; ctx.strokeStyle = colors.line;
    const target = p === 1 ? this.edges.length : this.prefixes[state.segment][state.index];
    const cachedTarget = Math.floor(target / STROKE_BATCH) * STROKE_BATCH;
    const highlighted = this.highlight.getContext('2d')!;
    // Fixed batch boundaries, independent of frame/seek history, preserve exact pixels.
    if (cachedTarget < this.paintedEdges) { highlighted.clearRect(0, 0, w, h); this.paintedEdges = 0; }
    highlighted.strokeStyle = colors.line; highlighted.lineWidth = unit / 95; highlighted.lineCap = highlighted.lineJoin = 'round';
    while (this.paintedEdges < cachedTarget) {
      this.strokeEdges(highlighted, this.paintedEdges, this.paintedEdges + STROKE_BATCH);
      this.paintedEdges += STROKE_BATCH;
    }
    ctx.drawImage(this.highlight, 0, 0);
    this.strokeEdges(ctx, this.paintedEdges, target);
    if (p < 1) {
      const previous = this.route.segments[state.segment][Math.max(0, state.index - 1)];
      if (Math.abs(this.projection.localLon(previous.lon) - this.projection.localLon(state.point.lon)) <= 180) {
        const a = this.projection.project(previous), b = this.projection.project(state.point);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      }
    }
    const marker = (point: RoutePoint, solid = false) => {
      const [x, y] = this.projection.project(point);
      ctx.beginPath(); ctx.arc(x, y, unit / 65, 0, Math.PI * 2); ctx.fillStyle = solid ? colors.line : colors.water; ctx.fill();
      ctx.strokeStyle = colors.ink; ctx.lineWidth = 1.5; ctx.stroke();
    };
    const start = this.route.segments[0][0], finish = this.route.segments.at(-1)!.at(-1)!;
    if (state.showStart) marker(start);
    if (state.showFinish && this.endpointLabels.length === 2) marker(finish);
    ctx.save(); ctx.globalAlpha = state.markerOpacity; marker(state.point, true); ctx.restore();
    ctx.font = `600 ${unit * .032}px system-ui`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (const label of this.endpointLabels) {
      const padding = unit * .009;
      ctx.fillStyle = colors.water; ctx.fillRect(label.x - padding, label.y - unit * .025, label.width + 2 * padding, unit * .05);
      ctx.fillStyle = colors.ink; ctx.fillText(label.text, label.x, label.y);
    }
    ctx.fillStyle = colors.water; ctx.fillRect(0, 0, w, h * 0.22); ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = colors.quiet; ctx.font = `600 ${unit * .027}px system-ui`; ctx.fillText('ROUTE STORY', pad, h * .045);
    const storytelling = this.config.durationSeconds !== 4;
    if (storytelling && state.phase === 'OUTRO') {
      ctx.save(); ctx.globalAlpha = Math.min(1, state.outroProgress * 4); ctx.textAlign = 'right';
      ctx.fillText('Matawaka', w - pad, h * .045); ctx.restore();
    }
    ctx.fillStyle = colors.ink; ctx.font = `650 ${unit * .057}px system-ui`;
    ctx.fillText(this.displayTitle, pad, h * .092);
    if (storytelling) {
      ctx.save(); ctx.fillStyle = colors.quiet; ctx.font = `${unit * .03}px system-ui`;
      if (state.phase === 'INTRO') {
        ctx.globalAlpha = Math.min(1, state.introProgress * 4, (1 - state.introProgress) * 4);
        ctx.fillText('Ваш путь по GPX', pad, h * .167);
      } else if (state.phase === 'OUTRO') {
        ctx.globalAlpha = Math.min(1, state.outroProgress * 4);
        ctx.fillText('Финиш · весь маршрут', pad, h * .167);
      } else ctx.fillText(`Повтор маршрута · сегмент ${state.segment + 1} из ${this.route.segments.length}`, pad, h * .167);
      ctx.restore();
    }
    ctx.font = `650 ${this.distanceFont}px system-ui`;
    ctx.fillText(this.distanceText(state.travelledKm, storytelling && state.phase === 'OUTRO'), pad, h * .83);
    ctx.font = `${this.metricFont}px system-ui`; ctx.fillStyle = colors.quiet; ctx.fillText(this.metric, pad, h * .902);
    ctx.fillStyle = colors.line; ctx.fillRect(pad, h * .963, (w - 2 * pad) * state.timelineProgress, Math.max(2, unit * .005));
  }
  dispose(): void { this.cinematic?.dispose();this.base.width = this.base.height = this.highlight.width = this.highlight.height = 0; }
}
