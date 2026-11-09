import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Mesh, ShaderMaterial } from "three";
import { ENV } from "./environment";

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

/**
 * Painted daytime sky: deep blue overhead easing to a pale, slightly warm
 * horizon haze, a soft sun bloom (no hard disc) and faint brushy banding.
 */
const frag = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uHaze;
uniform vec3 uBelow;
uniform vec3 uGlow;
varying vec3 vDir;
float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float vn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  // Wide, soft brush strokes break up the gradient a little.
  float az = atan(d.z, d.x);
  float stroke = vn(vec2(az * 3.0, h * 9.0)) * 0.5 + vn(vec2(az * 7.0, h * 22.0)) * 0.5;
  float hh = h + (stroke - 0.5) * 0.025;
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, hh));
  col = mix(col, uZenith, smoothstep(0.18, 0.85, hh));
  // Warm haze hugging the horizon line.
  col = mix(col, uHaze, (1.0 - smoothstep(0.0, 0.09, abs(hh))) * 0.55);
  col = mix(col, uBelow, smoothstep(0.0, -0.25, h));
  float sd = max(dot(d, uSunDir), 0.0);
  col = mix(col, uGlow, pow(sd, 8.0) * 0.35 + pow(sd, 90.0) * 0.5);
  col = mix(col, vec3(1.0, 0.98, 0.93), smoothstep(0.9986, 0.9993, sd) * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function Sky() {
  const ref = useRef<Mesh>(null);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uSunDir: { value: ENV.sunDir },
          uZenith: { value: ENV.zenith },
          uMid: { value: ENV.skyMid },
          uHorizon: { value: ENV.horizon },
          uHaze: { value: ENV.haze },
          uBelow: { value: ENV.below },
          uGlow: { value: ENV.sunGlow },
        },
      }),
    [],
  );
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={mat} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[4000, 48, 24]} />
    </mesh>
  );
}
