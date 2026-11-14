import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { useGame, simRunning } from "@/game/store";
import { attachInput, setGameKeysActive, setPressHandler } from "@/game/input";
import { audio } from "@/game/audio";
import { buildWorld, destinationById, type World } from "@/world/world";
import { QUALITY } from "@/config/quality";
import { resetToCheckpoint } from "@/game/gameplay";
import { departVisit, startVisit } from "@/game/visit";
import { LoadingScreen } from "./LoadingScreen";
import { TitleScreen } from "./TitleScreen";
import { HUD } from "./hud/HUD";
import { Toasts } from "./Toasts";
import { Tutorial } from "./Tutorial";
import { PauseMenu } from "./PauseMenu";
import { DetailPanel } from "./panels/DetailPanel";
import { DiscoveryCard } from "./DiscoveryCard";
import { WorldMap } from "./WorldMap";
import { MobileControls } from "./MobileControls";
import { CourseResult } from "./CourseResult";
import { LogReader } from "./LogReader";
import { VisitStatus } from "./hud/VisitStatus";
import { panelFor } from "./panels/panelFor";
import { runtime, resetFlightAt, look } from "@/game/runtime";
import { getWorld } from "@/world/world";
import { DEBUG } from "@/debug/recorder";
import { DiagnosticsPanel } from "@/debug/DiagnosticsPanel";

declare global {
  interface Window {
    __skybound?: {
      runtime: typeof runtime;
      store: typeof useGame;
      audio: typeof audio;
      resetFlightAt: typeof resetFlightAt;
      world: typeof getWorld;
      startVisit: typeof startVisit;
      look: typeof look;
    };
  }
}
if (typeof window !== "undefined") window.__skybound = { runtime, store: useGame, audio, resetFlightAt, world: getWorld, startVisit, look };

const GameCanvas = lazy(() => import("@/render/GameCanvas"));

export default function GameShell({ hidden }: { hidden: boolean }) {
  const mode = useGame((s) => s.mode);
  const overlay = useGame((s) => s.overlay);
  const panel = useGame((s) => s.panel);
  const isTouch = useGame((s) => s.isTouch);
  const settings = useGame((s) => s.settings);
  const [world, setWorld] = useState<World | null>(null);

  // Build the world (progressively) + wait for web fonts used by world signage.
  useEffect(() => {
    let cancelled = false;
    const density = QUALITY[useGame.getState().quality].propDensity;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    const fontReady = Promise.race([
      Promise.all([
        fonts?.load("700 48px 'Nunito'"),
        fonts?.load("800 48px 'Zain'"),
        fonts?.load("800 48px 'Nunito'"),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]).catch(() => undefined);
    // Every tree is a baked glTF model; the world waits for them (up to 20 s).
    const treesReady = import("@/render/treeAssets").then((m) => m.loadTreeModels()).catch(() => undefined);
    void Promise.all([fontReady, treesReady]).then(() =>
      buildWorld(density, (f) => useGame.getState().setLoadProgress(0.15 + f * 0.8)).then((w) => {
        if (cancelled) return;
        setWorld(w);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Input wiring.
  useEffect(() => {
    const detach = attachInput();
    setPressHandler((a) => {
      const s = useGame.getState();
      if (s.mode === "portfolio") return;
      if (s.mode === "title") {
        if (a === "interact") document.getElementById("start-flying")?.click();
        return;
      }
      if (s.mode !== "flying") return;
      switch (a) {
        case "pause":
          if (s.openLog) s.setOpenLog(null);
          else if (s.panel) s.closePanel();
          else if (s.overlay && s.overlay !== "pause") s.setOverlay(s.overlay === "map" ? null : "pause");
          else s.setOverlay(s.overlay ? null : "pause");
          audio.play("click");
          break;
        case "map":
          if (!s.panel) s.setOverlay(s.overlay === "map" ? null : "map");
          break;
        case "camera":
          if (simRunning(s)) s.cycleCamera();
          break;
        case "reset":
          if (simRunning(s)) resetToCheckpoint();
          break;
        case "interact": {
          if (!simRunning(s) || runtime.phase === "visit") return;
          const id = s.nearby ?? s.discoveryCard;
          const d = id ? destinationById(id) : null;
          if (d && !startVisit(d.id)) {
            audio.play("open");
            s.openPanel(panelFor(d));
          }
          break;
        }
      }
    });
    return () => {
      detach();
      setPressHandler(null);
    };
  }, []);

  // Closing a panel while parked on an island = take off again.
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (prev.panel && !s.panel && runtime.visit?.stage === "landed") departVisit(false);
      }),
    [],
  );

  // Capture flight keys only while actually flying.
  useEffect(
    () =>
      useGame.subscribe((s) => {
        setGameKeysActive(simRunning(s));
      }),
    [],
  );

  // Auto-pause when the tab is hidden.
  useEffect(() => {
    const vis = () => {
      const s = useGame.getState();
      if (document.hidden && simRunning(s)) s.setOverlay("pause");
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  useEffect(() => audio.setVolumes(settings), [settings]);
  // The in-game "Reduce motion" setting also quiets CSS transitions (see index.css).
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", settings.reducedMotion && !hidden);
    return () => document.documentElement.classList.remove("reduce-motion");
  }, [settings.reducedMotion, hidden]);

  useEffect(() => {
    if (world && mode === "loading") {
      useGame.getState().setLoadProgress(1);
      const t = setTimeout(() => useGame.getState().setMode("title"), 350);
      return () => clearTimeout(t);
    }
  }, [world, mode]);

  return (
    // Framer animations honour the OS setting, or are always reduced when the player asks.
    <MotionConfig reducedMotion={settings.reducedMotion ? "always" : "user"}>
    <div
      className={hidden ? "hidden" : "fixed inset-0 overflow-hidden select-none"}
      style={hidden ? undefined : { background: "linear-gradient(180deg,#3c9be3 0%,#62c0f0 30%,#d9eef2 49%,#f5ecdc 51%,#1a86b8 53%,#1468a8 100%)" }}
      aria-hidden={hidden}
    >
      {world && (
        <Suspense fallback={null}>
          <GameCanvas world={world} />
        </Suspense>
      )}
      {DEBUG && !hidden && <DiagnosticsPanel />}
      <AnimatePresence>{mode === "loading" && <LoadingScreen key="loading" />}</AnimatePresence>
      <AnimatePresence>{mode === "title" && world && <TitleScreen key="title" />}</AnimatePresence>
      {mode === "flying" && world && (
        <>
          <HUD world={world} />
          <VisitStatus />
          <Tutorial />
          <DiscoveryCard />
          <CourseResult />
          {isTouch && simRunning({ mode, overlay, panel }) && <MobileControls />}
          <AnimatePresence>{panel && <DetailPanel key="panel" panel={panel} />}</AnimatePresence>
          <AnimatePresence>{overlay === "map" && <WorldMap key="map" world={world} />}</AnimatePresence>
          <AnimatePresence>{overlay && overlay !== "map" && <PauseMenu key="pause" />}</AnimatePresence>
          <LogReader />
        </>
      )}
      <Toasts />
    </div>
    </MotionConfig>
  );
}
