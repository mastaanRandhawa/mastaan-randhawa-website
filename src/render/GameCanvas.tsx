import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { NeutralToneMapping, PCFSoftShadowMap, WebGLRenderer } from "three";
import { useGame } from "@/game/store";
import { QUALITY, type QualityLevel } from "@/config/quality";
import { tick } from "@/game/gameplay";
import { emitFrame } from "@/game/frameBus";
import { runtime } from "@/game/runtime";
import { worldUniforms } from "./materials/worldMaterial";
import type { World } from "@/world/world";
import { Sky } from "./env/Sky";
import { Lighting } from "./env/Lighting";
import { Clouds } from "./env/Clouds";
import { Mist } from "./env/Mist";
import { Ocean } from "./env/Ocean";
import { ENV } from "./env/environment";
import { WorldView } from "./world/WorldView";
import { GameplayObjects } from "./world/GameplayObjects";
import { Ambient } from "./world/Ambient";
import { Boats } from "./world/Boats";
import { Critters } from "./world/Critters";
import { Grass } from "./world/Grass";
import { Airplane } from "./airplane/Airplane";
import { CameraRig } from "./camera/CameraRig";
import { Effects } from "./Effects";
import { FrameMonitor } from "./FrameMonitor";
import { DEBUG } from "@/debug/recorder";



function Loop() {
  useFrame((_, dt) => {
    worldUniforms.uTime.value += Math.min(dt, 0.1);
    tick(dt);
  }, -2);
  useFrame(({ camera }, dt) => {
    runtime.fps = runtime.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
    emitFrame(camera, dt);
  });
  return null;
}

/** Dev-only handle for frame-diff diagnostics (flicker / z-fighting hunts). */
function Capture() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __r3f?: typeof get }).__r3f = get;
  }, [get]);
  return null;
}

const ORDER: QualityLevel[] = ["low", "medium", "high"];

/**
 * Measures frame rate in 3 s windows. Two slow windows in a row step quality
 * down; sustained headroom steps it back up, at most twice per session to
 * avoid oscillating.
 */
function AdaptiveQuality({ onDecline, onIncline }: { onDecline: () => void; onIncline: () => void }) {
  const s = useRef({ t: 0, frames: 0, slow: 0, fast: 0, ups: 0, warm: 0 });
  useFrame((_, dt) => {
    const st = s.current;
    if (document.hidden || dt > 0.25) return;
    st.warm += dt;
    if (st.warm < 4) return; // ignore shader-compile hitches at start
    st.t += dt;
    st.frames++;
    if (st.t < 3) return;
    const fps = st.frames / st.t;
    st.t = 0;
    st.frames = 0;
    if (fps < 40) {
      st.slow++;
      st.fast = 0;
      if (st.slow >= 2) {
        st.slow = 0;
        onDecline();
      }
    } else if (fps > 72) {
      st.fast++;
      st.slow = 0;
      if (st.fast >= 4 && st.ups < 2) {
        st.fast = 0;
        st.ups++;
        onIncline();
      }
    } else {
      st.slow = 0;
      st.fast = 0;
    }
  });
  return null;
}

export default function GameCanvas({ world }: { world: World }) {
  const quality = useGame((s) => s.quality);
  const auto = useGame((s) => s.settings.quality === "auto");
  const setQuality = useGame((s) => s.setQuality);
  const preset = QUALITY[quality];

  const step = (dir: 1 | -1) => {
    if (!auto) return;
    const i = ORDER.indexOf(useGame.getState().quality);
    const n = ORDER[Math.max(0, Math.min(2, i + dir))];
    if (n !== useGame.getState().quality) setQuality(n);
  };

  return (
    <Canvas
      className="!fixed inset-0"
      shadows={preset.shadows ? { type: PCFSoftShadowMap } : false}
      dpr={preset.dpr}
      gl={(canvas) => {
        // A truly opaque canvas. three.js always asks for an alpha context (its
        // `alpha` option only sets the clear alpha), and a transparent canvas lets
        // a compositor hiccup show the page behind it for a frame. Creating the
        // context ourselves with alpha: false removes that path entirely.
        const attrs = { alpha: false, antialias: !preset.postprocessing, powerPreference: "high-performance" as const, stencil: false, depth: true, preserveDrawingBuffer: false };
        const el = canvas as HTMLCanvasElement;
        const context = (el.getContext("webgl2", attrs as WebGLContextAttributes) as unknown as WebGLRenderingContext | null) ?? undefined;
        return new WebGLRenderer({ canvas: el, context, ...attrs });
      }}
      camera={{ fov: 50, near: 0.5, far: 6000, position: [20, 110, 90] }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.setClearColor(ENV.horizon, 1);
        gl.toneMappingExposure = 1.0;
      }}
      aria-label="3D flight world"
    >
      <color attach="background" args={[ENV.horizon]} />
      <fog attach="fog" args={[ENV.fog, 420, preset.drawDistance]} />
      <AdaptiveQuality onDecline={() => step(-1)} onIncline={() => step(1)} />
      <Suspense fallback={null}>
        <Sky />
        <Lighting preset={preset} />
        <Ocean world={world} density={preset.cloudDensity} />
        <Clouds density={preset.cloudDensity} />
        <WorldView world={world} shadows={preset.shadows} />
        <Grass world={world} density={preset.propDensity} />
        <Mist world={world} density={preset.cloudDensity} />
        <GameplayObjects world={world} />
        <Ambient preset={preset} />
        <Critters world={world} density={preset.propDensity} />
        <Boats world={world} count={Math.round(16 * preset.propDensity)} />
        {/* The plane model streams in on its own so the world never waits on it. */}
        <Suspense fallback={null}>
          <Airplane />
        </Suspense>
        <CameraRig />
        <Loop />
        <Capture />
        {DEBUG && <FrameMonitor />}
        <Effects preset={preset} />
      </Suspense>
    </Canvas>
  );
}
