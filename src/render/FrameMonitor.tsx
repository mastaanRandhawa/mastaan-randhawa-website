import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ENV } from "./env/environment";
import { runtime } from "@/game/runtime";
import { useGame } from "@/game/store";
import { logEvent, pushFrame, recorder, screenStack } from "@/debug/recorder";

const finite3 = (v: { x: number; y: number; z: number }) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

/**
 * Per-frame render probe (debug only, ?debug=frames). Runs first and last in
 * every frame: resets the renderer's counters, then after the post-processing
 * pass checks what was actually drawn. A frame is flagged when the finished
 * pixels are only the clear colour, when draw calls collapse, or when the
 * camera / plane hold non-finite values. Each flag records the state of the
 * game and which page elements sit on top of the canvas at that moment.
 */
export function FrameMonitor() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const st = useRef({ last: 0, w: 0, h: 0, dpr: 0, phase: "", stage: "" as string | null, median: 0, flashing: false });
  const probe = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 5;
    c.height = 1;
    return c.getContext("2d", { willReadFrequently: true })!;
  }, []);
  const clear = useMemo(() => ENV.horizon.clone().convertLinearToSRGB(), []);

  useEffect(() => {
    // Count the whole frame (scene + every post pass), not just the last pass.
    const prev = gl.info.autoReset;
    gl.info.autoReset = false;
    const ctx = gl.getContext();
    const ext = ctx.getExtension("WEBGL_debug_renderer_info");
    const attrs = ctx.getContextAttributes();
    recorder.env = {
      renderer: ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "unknown",
      contextAlpha: attrs?.alpha,
      antialias: attrs?.antialias,
      dpr: window.devicePixelRatio,
      viewport: [window.innerWidth, window.innerHeight],
      quality: useGame.getState().quality,
      settings: useGame.getState().settings,
    };
    logEvent("probe-start", recorder.env);
    const cv = gl.domElement;
    const lost = (e: Event) => logEvent("webgl-context-lost", { type: e.type }, "warn");
    const restored = () => logEvent("webgl-context-restored", {}, "warn");
    cv.addEventListener("webglcontextlost", lost);
    cv.addEventListener("webglcontextrestored", restored);
    return () => {
      gl.info.autoReset = prev;
      cv.removeEventListener("webglcontextlost", lost);
      cv.removeEventListener("webglcontextrestored", restored);
    };
  }, [gl]);

  // First in the frame: start counting.
  useFrame(() => {
    recorder.frame++;
    gl.info.reset();
  }, -100);

  // Last in the frame: inspect what was drawn.
  useFrame(() => {
    const s = st.current;
    const t = performance.now();
    const gap = s.last ? t - s.last : 0;
    s.last = t;
    const cv = gl.domElement;
    if (cv.width !== s.w || cv.height !== s.h || window.devicePixelRatio !== s.dpr) {
      if (s.w) logEvent("canvas-resize", { from: [s.w, s.h, s.dpr], to: [cv.width, cv.height, window.devicePixelRatio] }, "warn");
      s.w = cv.width;
      s.h = cv.height;
      s.dpr = window.devicePixelRatio;
    }
    // Pixels actually produced this frame.
    const pts = [[0.5, 0.5], [0.25, 0.3], [0.75, 0.3], [0.3, 0.75], [0.7, 0.75]];
    pts.forEach(([u, v], i) => probe.drawImage(cv, Math.floor(u * cv.width), Math.floor(v * cv.height), 1, 1, i, 0, 1, 1));
    const px = probe.getImageData(0, 0, 5, 1).data;
    // A frame with nothing drawn is one flat colour everywhere (after tone mapping
    // and grading the clear colour comes out as a beige, not the raw #f4cfa8), so
    // flag frames whose sample points are all the same colour, whatever it is.
    let lo = [255, 255, 255];
    let hi = [0, 0, 0];
    let transparent = false;
    for (let i = 0; i < 5; i++) {
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], px[i * 4 + k]);
        hi[k] = Math.max(hi[k], px[i * 4 + k]);
      }
      if (px[i * 4 + 3] < 10) transparent = true;
    }
    const uniform = hi[0] - lo[0] <= 6 && hi[1] - lo[1] <= 6 && hi[2] - lo[2] <= 6;
    const blank = transparent || uniform;
    void clear;
    lo = hi = [];
    const calls = gl.info.render.calls;
    const tris = gl.info.render.triangles;
    s.median = s.median ? s.median * 0.97 + calls * 0.03 : calls;
    const camOk = finite3(camera.position) && camera.projectionMatrix.elements.every(Number.isFinite) && camera.matrixWorldInverse.elements.every(Number.isFinite);
    const p = runtime.pose;
    const poseOk = [p.x, p.y, p.z, p.heading, p.pitch, p.roll].every(Number.isFinite);
    const stage = runtime.visit?.stage ?? null;
    pushFrame({ f: recorder.frame, t: +(t / 1000).toFixed(3), gapMs: +gap.toFixed(1), calls, tris, blank, phase: runtime.phase, stage, cam: [+camera.position.x.toFixed(1), +camera.position.y.toFixed(1), +camera.position.z.toFixed(1)] });

    const g = useGame.getState();
    const context = () => ({
      calls,
      tris,
      medianCalls: Math.round(s.median),
      pixels: Array.from(px),
      camera: { pos: camera.position.toArray().map((v) => +v.toFixed(2)), near: camera.near, far: camera.far, fov: (camera as { fov?: number }).fov },
      pose: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), heading: +p.heading.toFixed(3), pitch: +p.pitch.toFixed(3), roll: +p.roll.toFixed(3) },
      phase: runtime.phase,
      stage,
      flash: +runtime.flash.toFixed(3),
      respawnT: +runtime.respawnT.toFixed(3),
      mode: g.mode,
      overlay: g.overlay,
      panel: g.panel?.kind ?? null,
      quality: g.quality,
      cameraMode: g.cameraMode,
      hidden: document.hidden,
      onScreen: screenStack(),
    });
    if (blank) logEvent("blank-frame", context(), "warn");
    else if (s.median > 20 && calls < s.median * 0.25) logEvent("draw-calls-collapsed", context(), "warn");
    if (!camOk) logEvent("camera-non-finite", context(), "warn");
    if (!poseOk) logEvent("pose-non-finite", context(), "warn");
    if (gap > 120 && !document.hidden) logEvent("long-frame", { gapMs: Math.round(gap), calls, phase: runtime.phase, stage });
    if (runtime.phase !== s.phase || stage !== s.stage) {
      logEvent("phase", { phase: runtime.phase, stage });
      s.phase = runtime.phase;
      s.stage = stage;
    }
    const flashing = runtime.flash > 0.5 || runtime.phase === "respawning";
    if (flashing && !s.flashing) logEvent("fade-overlay", { flash: +runtime.flash.toFixed(2), phase: runtime.phase });
    s.flashing = flashing;
  }, 100);
  return null;
}
