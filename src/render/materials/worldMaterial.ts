import { MeshStandardMaterial, type Material } from "three";

/** Global uniforms shared by every world material (updated once per frame). */
export const worldUniforms = {
  uTime: { value: 0 },
  uWind: { value: 1 },
};

let shared: MeshStandardMaterial | null = null;

/**
 * Faceted vertex-colour material for all merged scenery.
 * - aSway: wind displacement for foliage/flags (vertex shader)
 * - aEmissive: per-vertex glow for windows, lamps and screens
 */
export function worldMaterial(): MeshStandardMaterial {
  if (shared) return shared;
  const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = worldUniforms.uTime;
    shader.uniforms.uWind = worldUniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute float aSway;
attribute float aEmissive;
uniform float uTime;
uniform float uWind;
varying float vEmissive;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vEmissive = aEmissive;
if (aSway > 0.0) {
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  float ph = wp.x * 0.07 + wp.z * 0.05;
  float s = aSway * uWind;
  transformed.x += (sin(uTime * 1.6 + ph) * 0.55 + sin(uTime * 3.3 + ph * 2.7) * 0.18) * s;
  transformed.z += (cos(uTime * 1.25 + ph * 1.3) * 0.4) * s;
}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying float vEmissive;`)
      .replace(
        "#include <normal_fragment_begin>",
        `float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
// Faceted low-poly look up close. Far away, triangles shrink below a 2x2 pixel
// quad and derivative normals become noise that sparkles as the camera moves,
// so blend to the interpolated vertex normal with distance.
vec3 flatN = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) );
vec3 smoothN = normalize( vNormal );
// Mostly soft, painted shading with just a hint of facets; fully smooth far away.
vec3 normal = normalize( mix( flatN, smoothN, max( 0.62, smoothstep( 140.0, 460.0, length( vViewPosition ) ) ) ) );
vec3 nonPerturbedNormal = normal;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
// Fade small lights with distance so sub-pixel windows/edge lights never twinkle.
totalEmissiveRadiance += vColor.rgb * vEmissive * 1.5 * (1.0 - smoothstep(220.0, 650.0, length(vViewPosition)));`,
      );
  };
  m.customProgramCacheKey = () => "skybound-world-v4";
  shared = m;
  return m;
}

export function disposeMaterial(m: Material | Material[]) {
  (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
}
