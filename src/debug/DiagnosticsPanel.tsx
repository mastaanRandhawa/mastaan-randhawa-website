import { useEffect, useState } from "react";
import { useGame } from "@/game/store";
import { clearLog, describeEl, exportLog, logEvent, recorder, screenStack } from "./recorder";

/** Snapshot the last second of frames at the moment the player saw something wrong. */
function markFlicker(source: string) {
  const recent = recorder.frames.slice(-75);
  logEvent(
    "user-mark",
    {
      source,
      hidden: document.hidden,
      summary: {
        frames: recent.length,
        maxGapMs: Math.max(0, ...recent.map((f) => f.gapMs)),
        minCalls: Math.min(...recent.map((f) => f.calls)),
        blankFrames: recent.filter((f) => f.blank).length,
      },
      // [frame, gap ms, draw calls, blank 0/1] for the ~1 s before the mark.
      frames: recent.map((f) => [f.f, f.gapMs, f.calls, f.blank ? 1 : 0]),
      onScreen: screenStack(),
    },
    "warn",
  );
}

/** Elements big enough to matter on screen (or dialogs / status regions). */
function isScreenLevel(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const role = el.getAttribute("role");
  if (role === "dialog" || role === "status" || role === "alertdialog") return true;
  const r = el.getBoundingClientRect();
  return r.width * r.height > window.innerWidth * window.innerHeight * 0.15;
}

/**
 * Debug-only watcher + readout (?debug=frames). Logs game-state transitions,
 * window events and every screen-level element that mounts or unmounts, and
 * shows live counters with Copy / Download buttons for the full log.
 */
export function DiagnosticsPanel() {
  const [, setTick] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Game-state transitions.
    const unsub = useGame.subscribe((s, p) => {
      const changes: Record<string, unknown> = {};
      if (s.mode !== p.mode) changes.mode = s.mode;
      if (s.overlay !== p.overlay) changes.overlay = s.overlay;
      if (s.panel !== p.panel) changes.panel = s.panel ? `${s.panel.kind}:${s.panel.id ?? ""}` : null;
      if (s.quality !== p.quality) changes.quality = `${p.quality} -> ${s.quality}`;
      if (s.cameraMode !== p.cameraMode) changes.cameraMode = s.cameraMode;
      if (s.visit?.stage !== p.visit?.stage) changes.visitStage = s.visit?.stage ?? null;
      if (s.discoveryCard !== p.discoveryCard) changes.discoveryCard = s.discoveryCard ?? null;
      if (s.toasts.length > p.toasts.length) changes.toast = s.toasts[s.toasts.length - 1]?.title;
      if (Object.keys(changes).length) logEvent(s.quality !== p.quality ? "quality-change" : "state", changes, s.quality !== p.quality ? "warn" : "info");
    });
    // Window / page events.
    const onVis = () => logEvent("visibility", { hidden: document.hidden, state: document.visibilityState }, "warn");
    const onResize = () => logEvent("window-resize", { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }, "warn");
    const onBlur = () => logEvent("window-blur");
    const onFocus = () => logEvent("window-focus");
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyK" && !e.repeat) markFlicker("K key");
    };
    window.addEventListener("keydown", onKey);
    const onErr = (e: ErrorEvent) => logEvent("js-error", { message: e.message, at: `${e.filename}:${e.lineno}` }, "warn");
    const onRej = (e: PromiseRejectionEvent) => logEvent("promise-rejection", { reason: String(e.reason).slice(0, 200) }, "warn");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    // Screen-level elements appearing / disappearing.
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n instanceof Element && (n.tagName === "CANVAS" || isScreenLevel(n))) logEvent(n.tagName === "CANVAS" ? "canvas-mounted" : "element-shown", { el: describeEl(n) }, n.tagName === "CANVAS" ? "warn" : "info");
        });
        m.removedNodes.forEach((n) => {
          if (n instanceof Element && (n.tagName === "CANVAS" || n.querySelector?.("canvas"))) logEvent("canvas-removed", { el: describeEl(n) }, "warn");
          else if (n instanceof Element && (n.getAttribute("role") === "dialog" || n.getAttribute("role") === "status")) logEvent("element-hidden", { el: n.tagName.toLowerCase() + (n.getAttribute("aria-label") ? `[${n.getAttribute("aria-label")}]` : "") });
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const iv = window.setInterval(() => setTick((t) => t + 1), 400);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("error", onErr);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("unhandledrejection", onRej);
      mo.disconnect();
      window.clearInterval(iv);
    };
  }, []);

  const c = recorder.counts;
  const frames = recorder.frames;
  const last = frames[frames.length - 1];
  const longest = frames.reduce((m, f) => Math.max(m, f.gapMs), 0);
  const recent = recorder.events.filter((e) => e.kind !== "phase" && e.kind !== "state").slice(-6).reverse();
  const download = () => {
    const blob = new Blob([exportLog()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `skybound-frames-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportLog());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      download();
    }
  };
  const btn = "pointer-events-auto rounded-[4px] px-1.5 py-0.5 shadow-[inset_0_0_0_1px_rgba(244,234,213,0.35)] hover:bg-white/10";
  const keepKeys = (e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.blur();
  return (
    <div className="font-instrument pointer-events-none fixed bottom-2 left-1/2 z-[9999] w-[min(560px,calc(100vw-1rem))] -translate-x-1/2 rounded-[8px] bg-[rgba(13,21,35,0.92)] px-3 py-2 text-[10.5px] leading-[1.5] text-[#f4ead5]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-[#f2735a]">FLIGHT RECORDER</span>
        <span className="flex gap-1.5">
          <button className={`${btn} text-[#ffb3a3]`} onClick={(e) => (keepKeys(e), markFlicker("button"))}>
            mark flicker (K)
          </button>
          <button className={btn} onClick={(e) => (keepKeys(e), void copy())}>
            {copied ? "copied" : "copy log"}
          </button>
          <button className={btn} onClick={(e) => (keepKeys(e), download())}>
            download
          </button>
          <button className={btn} onClick={(e) => (keepKeys(e), clearLog())}>
            clear
          </button>
        </span>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-x-3">
        <span>frames {recorder.frame}</span>
        <span className={c["blank-frame"] ? "text-[#ff8c75]" : ""}>blank {c["blank-frame"] ?? 0}</span>
        <span className={c["draw-calls-collapsed"] ? "text-[#ff8c75]" : ""}>calls dropped {c["draw-calls-collapsed"] ?? 0}</span>
        <span>draw calls {last?.calls ?? 0}</span>
        <span className={c["camera-non-finite"] || c["pose-non-finite"] ? "text-[#ff8c75]" : ""}>bad camera/pose {(c["camera-non-finite"] ?? 0) + (c["pose-non-finite"] ?? 0)}</span>
        <span>longest gap {Math.round(longest)}ms</span>
        <span>long frames {c["long-frame"] ?? 0}</span>
        <span className={c["canvas-resize"] || c["canvas-removed"] ? "text-[#ff8c75]" : ""}>canvas resets {(c["canvas-resize"] ?? 0) + (c["canvas-removed"] ?? 0)}</span>
        <span className={c["webgl-context-lost"] ? "text-[#ff8c75]" : ""}>gpu lost {c["webgl-context-lost"] ?? 0}</span>
        <span className={c["user-mark"] ? "text-[#ffb3a3]" : ""}>your marks {c["user-mark"] ?? 0}</span>
      </div>
      {recent.length > 0 && (
        <div className="mt-1 border-t border-white/10 pt-1 text-[#f4ead5]/75">
          {recent.map((e, i) => (
            <div key={i} className={`truncate ${e.level === "warn" ? "text-[#ffb3a3]" : ""}`}>
              {e.t.toFixed(1)}s #{e.frame} {e.kind} {e.detail ? JSON.stringify(e.detail).slice(0, 90) : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
