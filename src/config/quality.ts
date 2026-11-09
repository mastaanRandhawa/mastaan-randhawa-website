export type QualityLevel = "low" | "medium" | "high";

export interface QualityPreset {
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  postprocessing: boolean;
  ao: boolean;
  bloom: boolean;
  msaa: number;
  /** Multiplier on scattered props (trees, rocks, flowers). */
  propDensity: number;
  cloudDensity: number;
  drawDistance: number;
  particles: number;
}

export const QUALITY: Record<QualityLevel, QualityPreset> = {
  low: {
    dpr: [0.75, 1],
    shadows: false,
    shadowMapSize: 1024,
    postprocessing: false,
    ao: false,
    bloom: false,
    msaa: 0,
    propDensity: 0.45,
    cloudDensity: 0.45,
    drawDistance: 2200,
    particles: 120,
  },
  medium: {
    dpr: [1, 1.5],
    shadows: true,
    shadowMapSize: 1024,
    postprocessing: true,
    ao: false,
    bloom: true,
    msaa: 4,
    propDensity: 0.75,
    cloudDensity: 0.75,
    drawDistance: 2800,
    particles: 260,
  },
  high: {
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 2048,
    postprocessing: true,
    ao: true,
    bloom: true,
    msaa: 4,
    propDensity: 1,
    cloudDensity: 1,
    drawDistance: 3400,
    particles: 420,
  },
};

/** Best-guess starting quality from device hints; the runtime monitor adjusts it. */
export function detectQuality(): QualityLevel {
  if (typeof window === "undefined") return "medium";
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (coarse || cores <= 4 || mem <= 3) return coarse ? "low" : "medium";
  return "high";
}
