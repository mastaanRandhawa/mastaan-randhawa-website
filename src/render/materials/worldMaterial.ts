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
 * - grassy ground (green, level, not swaying) gets a painted texture: patches
 *   of lighter and darker green, and fine blade grain up close
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
varying float vEmissive;
varying float vSway;
varying vec3 vWorldPos;
varying vec3 vWorldN;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vEmissive = aEmissive;
vSway = aSway;
vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWorldN = normalize(mat3(modelMatrix) * objectNormal);
if (aSway > 0.0) {
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  float ph = wp.x * 0.07 + wp.z * 0.05;
  float s = aSway * uWind;
  transformed.x += (sin(uTime * 1.6 + ph) * 0.55 + sin(uTime * 3.3 + ph * 2.7) * 0.18) * s;
  transformed.z += (cos(uTime * 1.25 + ph * 1.3) * 0.4) * s;
}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying float vEmissive;
varying float vSway;
varying vec3 vWorldPos;
varying vec3 vWorldN;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
{
  // Grass texture: only on green, level ground that isn't foliage.
  vec3 c = diffuseColor.rgb;
  float green = smoothstep(1.02, 1.18, c.g / max(c.r, 1e-3)) * smoothstep(1.1, 1.35, c.g / max(c.b, 1e-3));
  float level = smoothstep(0.45, 0.75, vWorldN.y);
  float g = green * level * (1.0 - step(0.001, vSway));
  if (g > 0.0) {
    vec2 w = vWorldPos.xz;
    float dist = length(vViewPosition);
    // Broad patches of light and dark green, then smaller clumps.
    float big = gNoise(w * 0.045) * 0.6 + gNoise(w * 0.11 + 7.0) * 0.4;
    float mid = gNoise(w * 0.42 + 3.0);
    vec3 tint = mix(vec3(0.78, 0.88, 0.78), vec3(1.18, 1.14, 0.86), smoothstep(0.2, 0.8, big));
    tint *= mix(0.88, 1.1, mid);
    // Fine blade grain: streaks, faded out with distance so it never shimmers.
    float grain = gNoise(vec2(w.x * 6.0, w.y * 1.6)) * 0.5 + gNoise(vec2(w.x * 1.7, w.y * 5.5) + 11.0) * 0.5;
    tint *= 1.0 + (grain - 0.5) * 0.3 * (1.0 - smoothstep(30.0, 110.0, dist));
    diffuseColor.rgb = mix(c, c * tint, g);
  }
}`,
      )
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
  m.customProgramCacheKey = () => "skybound-world-v5";
  shared = m;
  return m;
}

export function disposeMaterial(m: Material | Material[]) {
  (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
}
