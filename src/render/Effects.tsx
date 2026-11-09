import { useMemo } from "react";
import { Bloom, EffectComposer, HueSaturation, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, Effect, ToneMappingMode } from "postprocessing";
import type { QualityPreset } from "@/config/quality";

/**
 * Illustration finish: a static paper grain (fine tooth + soft fibres), a
 * gentle split tone (cool shadows, warm highlights) and a slight lift of the
 * blacks, so the render reads like a printed, hand-painted picture.
 */
const paintFrag = /* glsl */ `
float pg_hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float pg_noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(pg_hash(i), pg_hash(i + vec2(1, 0)), f.x), mix(pg_hash(i + vec2(0, 1)), pg_hash(i + vec2(1, 1)), f.x), f.y);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  // Split tone: cool, slightly blue shadows; warm, creamy highlights.
  c += mix(vec3(-0.01, 0.004, 0.03), vec3(0.025, 0.012, -0.018), smoothstep(0.15, 0.85, l));
  // Lifted blacks: nothing goes inky.
  c = c * 0.96 + 0.025;
  // Paper: fine tooth plus soft fibre blotches, fixed to the screen like a print.
  vec2 px = uv * resolution;
  float tooth = pg_hash(floor(px * 0.75)) - 0.5;
  float fibre = pg_noise(px * 0.035) * 0.6 + pg_noise(px * 0.11) * 0.4 - 0.5;
  c *= 1.0 + tooth * 0.045 + fibre * 0.035;
  outputColor = vec4(clamp(c, 0.0, 1.0), inputColor.a);
}`;

class PaintEffect extends Effect {
  constructor() {
    super("PaintEffect", paintFrag, { blendFunction: BlendFunction.NORMAL });
  }
}

/** Restrained grading: soft cool AO, emissive-only bloom, faint vignette, paper finish. */
export function Effects({ preset }: { preset: QualityPreset }) {
  const paint = useMemo(() => new PaintEffect(), []);
  if (!preset.postprocessing) return null;
  return (
    <EffectComposer multisampling={preset.msaa} enableNormalPass={false}>
      {preset.ao ? <N8AO aoRadius={4} intensity={1.0} distanceFalloff={1.2} halfRes quality="performance" color="#2e5a7a" /> : <></>}
      {preset.bloom ? <Bloom mipmapBlur intensity={0.22} luminanceThreshold={1.5} luminanceSmoothing={0.3} radius={0.55} /> : <></>}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <HueSaturation saturation={0.04} />
      <primitive object={paint} />
      <Vignette offset={0.38} darkness={0.22} eskil={false} />
    </EffectComposer>
  );
}
