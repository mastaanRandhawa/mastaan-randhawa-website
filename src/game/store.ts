import { create } from "zustand";
import { detectQuality, type QualityLevel } from "@/config/quality";
import { ACHIEVEMENTS, derivedAchievements, unlockedSkins, SKINS } from "./progression";
import { loadSave, writeSave, hasProgress, defaultProgress, type Progress, type Settings, type SkinId, type Medal } from "./save";
import { track } from "./analytics";
import type { PanelKind } from "@/world/layout";
import { portfolio } from "@/content/portfolio";

export type AppMode = "loading" | "title" | "flying" | "portfolio";
export type Overlay = null | "pause" | "settings" | "map" | "log" | "hangar" | "controls";
export type CameraMode = "chase" | "cinematic" | "cockpit";

export interface Toast {
  id: number;
  kind: "region" | "achievement" | "collectible" | "course" | "info" | "skin";
  title: string;
  body?: string;
  accent?: string;
}

export interface PanelState {
  kind: PanelKind;
  id?: string;
}

export interface CourseRun {
  id: string;
  next: number;
  startedAt: number;
  lastRingAt: number;
}

export interface CourseResult {
  id: string;
  name: string;
  time: number;
  medal: Medal;
  best: number;
  newBest: boolean;
}

interface GameStore {
  mode: AppMode;
  loadProgress: number;
  overlay: Overlay;
  panel: PanelState | null;
  photoMode: boolean;
  cameraMode: CameraMode;
  nearby: string | null;
  discoveryCard: string | null;
  waypoint: string | null;
  course: CourseRun | null;
  courseResult: CourseResult | null;
  tutorialStep: number;
  toasts: Toast[];
  quality: QualityLevel;
  progress: Progress;
  settings: Settings;
  hadSave: boolean;
  webglOk: boolean;
  isTouch: boolean;
  openLog: string | null;

  setMode: (m: AppMode) => void;
  setLoadProgress: (v: number) => void;
  setOverlay: (o: Overlay) => void;
  openPanel: (p: PanelState) => void;
  closePanel: () => void;
  setPhoto: (v: boolean) => void;
  cycleCamera: () => void;
  setNearby: (id: string | null) => void;
  setDiscoveryCard: (id: string | null) => void;
  setWaypoint: (id: string | null) => void;
  setCourse: (c: CourseRun | null) => void;
  setCourseResult: (r: CourseResult | null) => void;
  setTutorialStep: (n: number) => void;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  setQuality: (q: QualityLevel) => void;
  updateSettings: (s: Partial<Settings>) => void;
  setSkin: (s: SkinId) => void;
  discoverRegion: (id: string, name: string, accent?: string) => boolean;
  markViewed: (key: string) => void;
  collect: (id: string) => boolean;
  unlock: (id: string) => void;
  recordCourse: (id: string, name: string, time: number, medals: [number, number, number]) => CourseResult;
  setTutorialDone: () => void;
  addFlightTime: (s: number) => void;
  resetProgress: () => void;
  setOpenLog: (id: string | null) => void;
}

const saved = loadSave();
let toastId = 1;

function initialQuality(s: Settings): QualityLevel {
  return s.quality === "auto" ? detectQuality() : s.quality;
}

export const useGame = create<GameStore>((set, get) => {
  /** Apply a progress mutation, then derive achievements / skins and toast new ones. */
  const commit = (next: Progress) => {
    const prev = get().progress;
    const derived = derivedAchievements(next).filter((a) => !next.achievements.includes(a));
    if (derived.length) next = { ...next, achievements: [...next.achievements, ...derived] };
    set({ progress: next });
    for (const id of derived) {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) get().toast({ kind: "achievement", title: a.title, body: a.description });
      track("achievement", { id });
    }
    const before = unlockedSkins(prev);
    for (const s of unlockedSkins(next)) {
      if (!before.includes(s)) {
        const def = SKINS.find((k) => k.id === s)!;
        get().toast({ kind: "skin", title: `New skin: ${def.name}`, body: "Equip it in the Hangar (pause menu).", accent: def.accent });
      }
    }
  };

  return {
    mode: "loading",
    loadProgress: 0,
    overlay: null,
    panel: null,
    photoMode: false,
    cameraMode: "chase",
    nearby: null,
    discoveryCard: null,
    waypoint: null,
    course: null,
    courseResult: null,
    tutorialStep: 0,
    toasts: [],
    quality: initialQuality(saved.settings),
    progress: saved.progress,
    settings: saved.settings,
    hadSave: hasProgress(saved.progress),
    webglOk: true,
    isTouch: typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches,
    openLog: null,

    setMode: (mode) => {
      set({ mode, overlay: null, panel: null, photoMode: false });
      track("mode", { mode });
    },
    setLoadProgress: (loadProgress) => set({ loadProgress }),
    setOverlay: (overlay) => set({ overlay }),
    openPanel: (panel) => {
      set({ panel, discoveryCard: null });
      const key = panel.kind === "project" ? `project-${panel.id}` : panel.kind === "skills" ? `skills-${panel.id}` : panel.kind;
      get().markViewed(key);
      track("panel", { key });
    },
    closePanel: () => set({ panel: null }),
    setPhoto: (photoMode) => set({ photoMode, overlay: null }),
    cycleCamera: () => {
      const order: CameraMode[] = ["chase", "cinematic", "cockpit"];
      const i = order.indexOf(get().cameraMode);
      set({ cameraMode: order[(i + 1) % order.length] });
    },
    setNearby: (nearby) => {
      if (get().nearby !== nearby) set({ nearby });
    },
    setDiscoveryCard: (discoveryCard) => set({ discoveryCard }),
    setWaypoint: (waypoint) => set({ waypoint }),
    setCourse: (course) => set({ course }),
    setCourseResult: (courseResult) => set({ courseResult }),
    setTutorialStep: (tutorialStep) => set({ tutorialStep }),
    toast: (t) => {
      const id = toastId++;
      set({ toasts: [...get().toasts.slice(-3), { ...t, id }] });
      setTimeout(() => get().dismissToast(id), t.kind === "achievement" || t.kind === "skin" ? 5200 : 4200);
    },
    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    setQuality: (quality) => set({ quality }),
    updateSettings: (s) => {
      const settings = { ...get().settings, ...s };
      set({ settings });
      if (s.quality) set({ quality: initialQuality(settings) });
    },
    setSkin: (skin) => {
      if (unlockedSkins(get().progress).includes(skin)) set({ progress: { ...get().progress, skin } });
    },
    discoverRegion: (id, name, accent) => {
      const p = get().progress;
      if (p.discoveredRegions.includes(id)) return false;
      get().toast({ kind: "region", title: name, body: "Region discovered", accent });
      track("discover", { id });
      commit({ ...p, discoveredRegions: [...p.discoveredRegions, id] });
      return true;
    },
    markViewed: (key) => {
      const p = get().progress;
      if (p.viewed.includes(key)) return;
      commit({ ...p, viewed: [...p.viewed, key] });
    },
    collect: (id) => {
      const p = get().progress;
      if (p.collectibles.includes(id)) return false;
      const log = portfolio.flightLogs.find((l) => l.id === id);
      get().toast({
        kind: "collectible",
        title: `Flight log found: ${log?.title ?? id}`,
        body: `${p.collectibles.length + 1} / ${portfolio.flightLogs.length} — read it in the Flight Log`,
      });
      commit({ ...p, collectibles: [...p.collectibles, id] });
      set({ openLog: id });
      return true;
    },
    unlock: (id) => {
      const p = get().progress;
      if (p.achievements.includes(id)) return;
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) get().toast({ kind: "achievement", title: a.title, body: a.description });
      track("achievement", { id });
      commit({ ...p, achievements: [...p.achievements, id] });
    },
    recordCourse: (id, name, time, medals) => {
      const p = get().progress;
      const medal: Medal = time <= medals[0] ? "gold" : time <= medals[1] ? "silver" : time <= medals[2] ? "bronze" : "finish";
      const prev = p.courses[id];
      const newBest = !prev || time < prev.best;
      const rank = { gold: 3, silver: 2, bronze: 1, finish: 0 };
      const best = newBest ? time : prev.best;
      const bestMedal = prev && rank[prev.medal] > rank[medal] ? prev.medal : medal;
      commit({ ...p, courses: { ...p.courses, [id]: { best, medal: bestMedal } } });
      track("course", { id, time, medal });
      const result = { id, name, time, medal, best, newBest };
      set({ courseResult: result });
      return result;
    },
    setTutorialDone: () => {
      const p = get().progress;
      if (!p.tutorialDone) commit({ ...p, tutorialDone: true });
    },
    addFlightTime: (s) => set({ progress: { ...get().progress, flightSeconds: get().progress.flightSeconds + s } }),
    resetProgress: () => set({ progress: defaultProgress(), hadSave: false }),
    setOpenLog: (openLog) => set({ openLog }),
  };
});

// ── Persist (debounced) ──
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useGame.subscribe((s, prev) => {
  if (s.progress === prev.progress && s.settings === prev.settings) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const st = useGame.getState();
    writeSave({ v: 1, progress: { ...st.progress, lastPlayed: Date.now() }, settings: st.settings });
  }, 400);
});

/** True when the flight simulation should advance. */
export function simRunning(s: Pick<GameStore, "mode" | "overlay" | "panel" | "photoMode">) {
  return s.mode === "flying" && s.overlay === null && s.panel === null && !s.photoMode;
}
