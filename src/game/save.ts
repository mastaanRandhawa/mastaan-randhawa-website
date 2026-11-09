import { BRAND } from "@/config/brand";
import type { QualityLevel } from "@/config/quality";

export type SkinId = "classic" | "sunset" | "midnight" | "cloud";
export type Medal = "gold" | "silver" | "bronze" | "finish";

export interface Settings {
  quality: QualityLevel | "auto";
  controlMode: "keyboard" | "mouse";
  mouseSensitivity: number;
  invertPitch: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  reducedMotion: boolean;
  cameraShake: boolean;
  showFps: boolean;
  showLabels: boolean;
}

export interface Progress {
  discoveredRegions: string[];
  viewed: string[];
  collectibles: string[];
  achievements: string[];
  courses: Record<string, { best: number; medal: Medal }>;
  skin: SkinId;
  tutorialDone: boolean;
  flightSeconds: number;
  lastPlayed: number;
}

export interface SaveData {
  v: number;
  progress: Progress;
  settings: Settings;
}

export const SAVE_VERSION = 1;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function defaultSettings(): Settings {
  return {
    quality: "auto",
    controlMode: "keyboard",
    mouseSensitivity: 1,
    invertPitch: false,
    masterVolume: 0.8,
    musicVolume: 0.45,
    sfxVolume: 0.8,
    muted: false,
    reducedMotion: prefersReducedMotion(),
    cameraShake: !prefersReducedMotion(),
    showFps: false,
    showLabels: true,
  };
}

export function defaultProgress(): Progress {
  return {
    discoveredRegions: [],
    viewed: [],
    collectibles: [],
    achievements: [],
    courses: {},
    skin: "classic",
    tutorialDone: false,
    flightSeconds: 0,
    lastPlayed: 0,
  };
}

// ── Validation: sanitise field-by-field so one bad value never wipes a save ──
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const strArr = (v: unknown, fallback: string[]) =>
  Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === "string" && x.length < 80))).slice(0, 500) : fallback;
const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : fallback;

export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!isObj(raw)) return d;
  return {
    quality: oneOf(raw.quality, ["auto", "low", "medium", "high"] as const, d.quality),
    controlMode: oneOf(raw.controlMode, ["keyboard", "mouse"] as const, d.controlMode),
    mouseSensitivity: num(raw.mouseSensitivity, d.mouseSensitivity, 0.3, 2.5),
    invertPitch: bool(raw.invertPitch, d.invertPitch),
    masterVolume: num(raw.masterVolume, d.masterVolume, 0, 1),
    musicVolume: num(raw.musicVolume, d.musicVolume, 0, 1),
    sfxVolume: num(raw.sfxVolume, d.sfxVolume, 0, 1),
    muted: bool(raw.muted, d.muted),
    reducedMotion: bool(raw.reducedMotion, d.reducedMotion),
    cameraShake: bool(raw.cameraShake, d.cameraShake),
    showFps: bool(raw.showFps, d.showFps),
    showLabels: bool(raw.showLabels, d.showLabels),
  };
}

export function sanitizeProgress(raw: unknown): Progress {
  const d = defaultProgress();
  if (!isObj(raw)) return d;
  const courses: Progress["courses"] = {};
  if (isObj(raw.courses)) {
    for (const [k, v] of Object.entries(raw.courses)) {
      if (!isObj(v) || k.length > 40) continue;
      const best = num(v.best, NaN, 0, 3600);
      if (Number.isNaN(best)) continue;
      courses[k] = { best, medal: oneOf(v.medal, ["gold", "silver", "bronze", "finish"] as const, "finish") };
    }
  }
  return {
    discoveredRegions: strArr(raw.discoveredRegions, d.discoveredRegions),
    viewed: strArr(raw.viewed, d.viewed),
    collectibles: strArr(raw.collectibles, d.collectibles),
    achievements: strArr(raw.achievements, d.achievements),
    courses,
    skin: oneOf(raw.skin, ["classic", "sunset", "midnight", "cloud"] as const, d.skin),
    tutorialDone: bool(raw.tutorialDone, d.tutorialDone),
    flightSeconds: num(raw.flightSeconds, 0, 0, 1e7),
    lastPlayed: num(raw.lastPlayed, 0, 0, 1e14),
  };
}

/** Upgrade older save shapes. v0 (no version) stored progress at the root. */
export function migrate(raw: unknown): SaveData {
  if (!isObj(raw)) return { v: SAVE_VERSION, progress: defaultProgress(), settings: defaultSettings() };
  const v = typeof raw.v === "number" ? raw.v : 0;
  if (v === 0) return { v: SAVE_VERSION, progress: sanitizeProgress(raw), settings: sanitizeSettings(raw.settings) };
  return { v: SAVE_VERSION, progress: sanitizeProgress(raw.progress), settings: sanitizeSettings(raw.settings) };
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadSave(key: string = BRAND.saveKey): SaveData {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return migrate(null);
    return migrate(JSON.parse(raw));
  } catch {
    // Corrupt JSON — keep a copy for debugging, start fresh.
    try {
      const s = storage();
      const bad = s?.getItem(key);
      if (bad) s?.setItem(`${key}.corrupt`, bad.slice(0, 20000));
    } catch {
      /* ignore */
    }
    return migrate(null);
  }
}

export function writeSave(data: SaveData, key: string = BRAND.saveKey): boolean {
  try {
    storage()?.setItem(key, JSON.stringify({ ...data, v: SAVE_VERSION }));
    return true;
  } catch {
    return false;
  }
}

export function hasProgress(p: Progress) {
  return p.tutorialDone || p.discoveredRegions.length > 0 || p.viewed.length > 0;
}

export function clearSave(key: string = BRAND.saveKey) {
  try {
    storage()?.removeItem(key);
  } catch {
    /* ignore */
  }
}
