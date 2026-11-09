import { Color, Vector3 } from "three";

/**
 * Sunny illustrated-ocean palette shared by sky, fog, ocean, clouds and lights:
 * clean blue sky with a warm hazy horizon, rich painted blues and turquoise
 * shallows, creamy clouds with pale blue shade.
 */
export const ENV = {
  sunDir: new Vector3(-0.5, 0.72, 0.48).normalize(),
  zenith: new Color("#3c9be3"),
  skyMid: new Color("#62c0f0"),
  horizon: new Color("#d9eef2"),
  haze: new Color("#f5ecdc"),
  below: new Color("#7fb7d0"),
  sunGlow: new Color("#fff0d2"),
  fog: new Color("#cfe6ee"),
  sunLight: new Color("#fff1de"),
  hemiSky: new Color("#cfe9ff"),
  hemiGround: new Color("#8fc3c6"),
  cloudLit: new Color("#fff5ec"),
  cloudShadow: new Color("#b8d9e9"),
  cloudRim: new Color("#fff9f0"),
  ocean: {
    deep: new Color("#104b86"),
    open: new Color("#1468a8"),
    mid: new Color("#1a86b8"),
    shallow: new Color("#21b6c4"),
    lagoon: new Color("#6fd6d2"),
    foam: new Color("#f4fbf8"),
    shade: new Color("#0d3f72"),
    far: new Color("#8ec5dc"),
  },
};

export const FOG_GLSL = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
#endif
`;
