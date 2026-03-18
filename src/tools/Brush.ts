export interface BrushConfig {
  name: string;
  baseWidth: number;
  pressureCurve: (p: number) => number;
  opacityCurve: (p: number) => number;
  color: string;
  smoothing: number;
}
