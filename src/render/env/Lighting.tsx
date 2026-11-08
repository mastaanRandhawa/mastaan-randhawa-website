import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { DirectionalLight } from "three";
import { ENV } from "./environment";
import { runtime } from "@/game/runtime";
import type { QualityPreset } from "@/config/quality";

/**
 * Warm golden-hour sun with a shadow frustum that follows the aircraft, so the
 * plane always casts a crisp grounding shadow onto whatever it is flying over.
 */
export function Lighting({ preset }: { preset: QualityPreset }) {
  const sun = useRef<DirectionalLight>(null);
  const span = 150;

  useEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    l.shadow.map?.dispose();
    l.shadow.map = null as never;
    const cam = l.shadow.camera;
    cam.left = -span;
    cam.right = span;
    cam.top = span;
    cam.bottom = -span;
    cam.near = 10;
    cam.far = 1200;
    cam.updateProjectionMatrix();
  }, [preset.shadowMapSize]);

  useFrame(() => {
    const l = sun.current;
    if (!l) return;
    const p = runtime.pose;
    // Snap to shadow texels to stop shimmering while moving.
    const texel = (span * 2) / preset.shadowMapSize;
    const sx = Math.round(p.x / texel) * texel;
    const sz = Math.round(p.z / texel) * texel;
    const sy = Math.round(p.y / texel) * texel;
    l.target.position.set(sx, sy - 20, sz);
    l.position.set(sx + ENV.sunDir.x * 500, sy - 20 + ENV.sunDir.y * 500, sz + ENV.sunDir.z * 500);
    l.target.updateMatrixWorld();
  });

  return (
    <>
      <hemisphereLight args={[ENV.hemiSky, ENV.hemiGround, 1.05]} />
      <ambientLight intensity={0.18} color="#ffe9d6" />
      <directionalLight
        ref={sun}
        color={ENV.sunLight}
        intensity={2.6}
        castShadow={preset.shadows}
        shadow-bias={-0.0004}
        shadow-normalBias={0.9}
      />
      {/* Cool fill from the opposite side keeps shadowed faces readable. */}
      <directionalLight color="#a9c7ff" intensity={0.35} position={[400, 200, -300]} />
    </>
  );
}
