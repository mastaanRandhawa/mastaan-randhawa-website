import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { DirectionalLight } from "three";
import { ENV } from "./environment";
import { runtime } from "@/game/runtime";
import type { QualityPreset } from "@/config/quality";

/**
 * Soft, warm midday sun. Only the aircraft casts a shadow (scenery receives it),
 * so the plane always throws a crisp grounding shadow onto whatever it flies
 * over, with no shadow acne or frustum edges sweeping across the islands.
 */
export function Lighting({ preset }: { preset: QualityPreset }) {
  const sun = useRef<DirectionalLight>(null);
  // Only the aircraft casts, so a tight box gives a crisp shadow wherever it lands.
  const span = 9;

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
    cam.near = 1;
    cam.far = 1800;
    cam.updateProjectionMatrix();
  }, [preset.shadowMapSize]);

  useFrame(() => {
    const l = sun.current;
    if (!l) return;
    const p = runtime.pose;
    l.target.position.set(p.x, p.y, p.z);
    l.position.set(p.x + ENV.sunDir.x * 400, p.y + ENV.sunDir.y * 400, p.z + ENV.sunDir.z * 400);
    l.target.updateMatrixWorld();
  });

  return (
    <>
      {/* Sky above, sea-blue bounce below: shadows read cool, never muddy. */}
      <hemisphereLight args={[ENV.hemiSky, ENV.hemiGround, 1.25]} />
      <ambientLight intensity={0.22} color="#fff4e6" />
      <directionalLight
        ref={sun}
        color={ENV.sunLight}
        intensity={2.2}
        castShadow={preset.shadows}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
      {/* Cool fill from the opposite side keeps shadowed faces soft and readable. */}
      <directionalLight color="#b9dcff" intensity={0.45} position={[400, 200, -300]} />
    </>
  );
}
