import { Color, Vector3 } from "three";

/** Golden-hour environment palette shared by sky, fog, clouds and lights. */
export const ENV = {
  sunDir: new Vector3(-0.62, 0.36, 0.7).normalize(),
  zenith: new Color("#2f6fb8"),
  horizon: new Color("#f4cfa8"),
  below: new Color("#c8bde0"),
  sunGlow: new Color("#ffb877"),
  fog: new Color("#e9cdb3"),
  sunLight: new Color("#ffe2bf"),
  hemiSky: new Color("#b8d8f2"),
  hemiGround: new Color("#c7a98f"),
  cloudLit: new Color("#fff7ee"),
  cloudShadow: new Color("#a9b0d6"),
  cloudRim: new Color("#ffcf9e"),
};

export const FOG_GLSL = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
#endif
`;
