import type { Route, RoutePoint } from './route';
import { fitProjection } from './geo';
import { StoryTimeline } from './timeline';
import { regressionStoryConfig, type StoryConfig, type VisualStyle } from './story';
export type { VisualStyle } from './story';
export type Land = { features: { geometry: { type: string; coordinates: number[][][] | number[][][][] } }[] };
const palette = {
  atlas: { water: '#ecefe6', land: '#dae2d1', coast: '#bdcbb6', grid: '#d7ded1', ink: '#1c3b32', quiet: '#58695e', line: '#297856', track: '#7c9982' },
  night: { water: '#102825', land: '#1b3932', coast: '#2c5045', grid: '#23443a', ink: '#f4f3e5', quiet: '#a3b7a4', line: '#b8ed8d', track: '#638171' }
};
export function metricLabel(route: Route): string {
  return route.elevationGain !== undefined ? `Набор высоты ${Math.round(route.elevationGain).toLocaleString('ru-RU')} м` : `${route.pointCount.toLocaleString('ru-RU')} точек маршрута`;
}
export const formatKm = (km: number) => km.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export class RouteRenderer {
  private readonly base: HTMLCanvasElement;
  readonly timeline: StoryTimeline;
  readonly config: Readonly<StoryConfig>;
  private readonly projection: ReturnType<typeof fitProjection>;
  private readonly projected: [number, number][][];
  private readonly highlight: HTMLCanvasElement;
  private readonly edges: { a: [number, number]; b: [number, number] }[] = [];
  private readonly prefixes: number[][] = [];
  private paintedEdges = 0;
  constructor(readonly route: Route, readonly land: Land, readonly width: number, readonly height: number, readonly style: VisualStyle, config?: StoryConfig) {
    this.base = document.createElement('canvas'); this.base.width = width; this.base.height = height;
    this.highlight = document.createElement('canvas'); this.highlight.width = width; this.highlight.height = height;
    this.timeline = new StoryTimeline(route, config ?? { ...regressionStoryConfig(route.name), visualStyle: style, aspectRatio: height > width ? 'portrait' : 'landscape' });
    this.config = this.timeline.config;
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
    this.drawBase();
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
  draw(canvas: HTMLCanvasElement, seconds: number): void {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D недоступен.');
    const { width: w, height: h } = this; const unit = Math.min(w, h), colors = palette[this.style];
    const state = this.timeline.at(seconds), p = state.routeProgress, pad = unit * 0.08;
    ctx.drawImage(this.base, 0, 0);
    ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = unit / 95; ctx.strokeStyle = colors.line;
    const target = p === 1 ? this.edges.length : this.prefixes[state.segment][state.index];
    const highlighted = this.highlight.getContext('2d')!;
    // Ascending edge strokes are replayed in exactly the same order after backward seeks.
    if (target < this.paintedEdges) { highlighted.clearRect(0, 0, w, h); this.paintedEdges = 0; }
    highlighted.strokeStyle = colors.line; highlighted.lineWidth = unit / 95; highlighted.lineCap = highlighted.lineJoin = 'round';
    while (this.paintedEdges < target) {
      const edge = this.edges[this.paintedEdges++]; highlighted.beginPath(); highlighted.moveTo(...edge.a); highlighted.lineTo(...edge.b); highlighted.stroke();
    }
    ctx.drawImage(this.highlight, 0, 0);
    if (p < 1) {
      const previous = this.route.segments[state.segment][Math.max(0, state.index - 1)];
      if (Math.abs(this.projection.localLon(previous.lon) - this.projection.localLon(state.point.lon)) <= 180) {
        const a = this.projection.project(previous), b = this.projection.project(state.point);
        ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      }
    }
    const marker = (point: RoutePoint, label: string, solid = false) => {
      const [x, y] = this.projection.project(point);
      ctx.beginPath(); ctx.arc(x, y, unit / 65, 0, Math.PI * 2); ctx.fillStyle = solid ? colors.line : colors.water; ctx.fill();
      ctx.strokeStyle = colors.ink; ctx.lineWidth = 1.5; ctx.stroke();
      if (label) { ctx.font = `600 ${unit * 0.032}px system-ui`; ctx.textBaseline = 'middle'; ctx.fillStyle = colors.ink; const tw = ctx.measureText(label).width; ctx.fillText(label, Math.min(w - tw - 8, Math.max(8, x + unit / 38)), Math.max(h * .23, Math.min(h * .78, y - unit * .035))); }
    };
    const start = this.route.segments[0][0], finish = this.route.segments.at(-1)!.at(-1)!;
    const sameEndpoint = Math.abs(start.lat - finish.lat) < 1e-8 && Math.abs(this.projection.localLon(start.lon) - this.projection.localLon(finish.lon)) < 1e-8;
    if (state.showStart) marker(start, sameEndpoint ? 'Старт / финиш' : 'Старт');
    if (state.showFinish && !sameEndpoint) marker(finish, 'Финиш');
    ctx.save(); ctx.globalAlpha = state.markerOpacity; marker(state.point, '', true); ctx.restore();
    ctx.fillStyle = colors.water; ctx.fillRect(0, 0, w, h * 0.22); ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = colors.quiet; ctx.font = `600 ${unit * .027}px system-ui`; ctx.fillText('ROUTE STORY', pad, h * .045);
    const storytelling = this.config.durationSeconds !== 4;
    if (storytelling && state.phase === 'OUTRO') {
      ctx.save(); ctx.globalAlpha = Math.min(1, state.outroProgress * 4); ctx.textAlign = 'right';
      ctx.fillText('Matawaka', w - pad, h * .045); ctx.restore();
    }
    ctx.fillStyle = colors.ink; ctx.font = `650 ${unit * .057}px system-ui`;
    const titlePoints = Array.from(state.title), titleLength = titlePoints.length;
    while (ctx.measureText(titlePoints.join('') + (titlePoints.length < titleLength ? '…' : '')).width > w - pad * 2 && titlePoints.length) titlePoints.pop();
    ctx.fillText(titlePoints.join('') + (titlePoints.length < titleLength ? '…' : ''), pad, h * .092);
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
    ctx.font = `650 ${unit * .052}px system-ui`;
    ctx.fillText(storytelling && state.phase === 'OUTRO' ? `Всего ${formatKm(state.totalKm)} км` : `${formatKm(state.travelledKm)} / ${formatKm(state.totalKm)} км`, pad, h * .83);
    ctx.font = `${unit * .032}px system-ui`; ctx.fillStyle = colors.quiet; ctx.fillText(metricLabel(this.route), pad, h * .902);
    ctx.fillStyle = colors.line; ctx.fillRect(pad, h * .963, (w - 2 * pad) * state.timelineProgress, Math.max(2, unit * .005));
  }
  dispose(): void { this.base.width = this.base.height = this.highlight.width = this.highlight.height = 0; }
}
