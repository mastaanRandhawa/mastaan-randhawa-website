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

const frag = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uBelow;
uniform vec3 uGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float up = pow(smoothstep(-0.02, 0.6, h), 0.42);
  vec3 col = mix(uHorizon, uZenith, up);
  col = mix(col, uBelow, smoothstep(0.0, -0.3, h));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uGlow * (pow(sd, 5.0) * 0.38 + pow(sd, 48.0) * 0.55);
  col = mix(col, uGlow, pow(1.0 - abs(h), 10.0) * pow(sd * 0.5 + 0.5, 4.0) * 0.45);
  col += vec3(1.0, 0.93, 0.8) * smoothstep(0.99935, 0.99965, sd) * 3.0;
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
          uHorizon: { value: ENV.horizon },
          uBelow: { value: ENV.below },
          uGlow: { value: ENV.sunGlow },
        },
      }),
    [],
  );
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <mesh ref={ref} material={mat} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[4000, 32, 16]} />
    </mesh>
  );
}
