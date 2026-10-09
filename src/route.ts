export interface RoutePoint { lon: number; lat: number; elevation?: number; time?: string }
export interface Route {
  segments: RoutePoint[][];
  name: string;
  description?: string;
  creator?: string;
  pointCount: number;
  distanceKm: number;
  elevationGain?: number;
}
