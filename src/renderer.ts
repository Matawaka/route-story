import type { Route, RoutePoint } from './route';
import { fitProjection, RoutePath } from './geo';
import { progressAt } from './animation';
export type VisualStyle = 'atlas' | 'night';
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
  private readonly path: RoutePath;
  private readonly projection: ReturnType<typeof fitProjection>;
  private readonly projected: [number, number][][];
  constructor(readonly route: Route, readonly land: Land, readonly width: number, readonly height: number, readonly style: VisualStyle) {
    this.base = document.createElement('canvas'); this.base.width = width; this.base.height = height;
    this.path = new RoutePath(route.segments);
    this.projection = fitProjection(route.segments, width, height);
    this.projected = route.segments.map(points => points.map(this.projection.project));
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
    const p = progressAt(seconds), state = this.path.at(p), pad = unit * 0.08;
    ctx.drawImage(this.base, 0, 0);
    ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = unit / 95; ctx.strokeStyle = colors.line;
    this.projected.forEach((points, segment) => {
      if (segment < state.segment || p === 1) this.strokeSegment(ctx, points, this.route.segments[segment]);
      else if (segment === state.segment) {
        this.strokeSegment(ctx, points, this.route.segments[segment], state.index);
        const previous = this.route.segments[segment][Math.max(0, state.index - 1)];
        if (Math.abs(this.projection.localLon(previous.lon) - this.projection.localLon(state.point.lon)) <= 180) {
          const a = this.projection.project(previous), b = this.projection.project(state.point);
          ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
        }
      }
    });
    const marker = (point: RoutePoint, label: string, solid = false) => {
      const [x, y] = this.projection.project(point);
      ctx.beginPath(); ctx.arc(x, y, unit / 65, 0, Math.PI * 2); ctx.fillStyle = solid ? colors.line : colors.water; ctx.fill();
      ctx.strokeStyle = colors.ink; ctx.lineWidth = 1.5; ctx.stroke();
      if (label) { ctx.font = `600 ${unit * 0.032}px system-ui`; ctx.textBaseline = 'middle'; ctx.fillStyle = colors.ink; const tw = ctx.measureText(label).width; ctx.fillText(label, Math.min(w - tw - 8, Math.max(8, x + unit / 38)), Math.max(h * .23, Math.min(h * .78, y - unit * .035))); }
    };
    marker(this.route.segments[0][0], 'Старт'); marker(this.route.segments.at(-1)!.at(-1)!, 'Финиш'); marker(state.point, '', true);
    ctx.fillStyle = colors.water; ctx.fillRect(0, 0, w, h * 0.22); ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = colors.quiet; ctx.font = `600 ${unit * .027}px system-ui`; ctx.fillText('ROUTE STORY', pad, h * .045);
    ctx.fillStyle = colors.ink; ctx.font = `650 ${unit * .057}px system-ui`;
    let title = this.route.name;
    while (ctx.measureText(title).width > w - pad * 2 && title.length) title = title.slice(0, -1);
    ctx.fillText(title === this.route.name ? title : title.slice(0, -1) + '…', pad, h * .092);
    ctx.font = `650 ${unit * .052}px system-ui`; ctx.fillText(`${formatKm(this.route.distanceKm)} км`, pad, h * .83);
    ctx.font = `${unit * .032}px system-ui`; ctx.fillStyle = colors.quiet; ctx.fillText(metricLabel(this.route), pad, h * .902);
    ctx.fillStyle = colors.line; ctx.fillRect(pad, h * .963, (w - 2 * pad) * p, Math.max(2, unit * .005));
  }
  dispose(): void { this.base.width = this.base.height = 0; }
}
