import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { QualityPreset } from "@/config/quality";

/** Restrained grading: soft AO, emissive-only bloom, gentle vignette. */
export function Effects({ preset }: { preset: QualityPreset }) {
  if (!preset.postprocessing) return null;
  return (
    <EffectComposer multisampling={preset.msaa} enableNormalPass={false}>
      {preset.ao ? <N8AO aoRadius={5} intensity={1.6} distanceFalloff={1.2} halfRes quality="performance" color="#3b2d4a" /> : <></>}
      {preset.bloom ? <Bloom mipmapBlur intensity={0.4} luminanceThreshold={1.4} luminanceSmoothing={0.25} radius={0.6} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={0.06} />
      <BrightnessContrast contrast={0.04} brightness={0.01} />
      <Vignette offset={0.32} darkness={0.42} eskil={false} />
    </EffectComposer>
  );
}
