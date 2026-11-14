import { Color, Vector3 } from "three";

/**
 * Bright painted-seascape palette shared by sky, fog, ocean, clouds and lights:
 * saturated cyan sky paling to a clean horizon, a deep royal-blue sea in flat
 * shapes (lighter toward the horizon), big soft clouds with pink-white tops and
 * lavender-blue undersides. Little haze, so colours stay clear at distance.
 */
export const ENV = {
  sunDir: new Vector3(-0.5, 0.72, 0.48).normalize(),
  zenith: new Color("#1290e6"),
  skyMid: new Color("#3fb0f2"),
  horizon: new Color("#b9e4f8"),
  haze: new Color("#e6f4fb"),
  below: new Color("#2a6cc0"),
  sunGlow: new Color("#fff4e2"),
  fog: new Color("#9fd0f2"),
  sunLight: new Color("#fff3e4"),
  hemiSky: new Color("#cbe8ff"),
  hemiGround: new Color("#3f7fca"),
  cloudLit: new Color("#fffaf7"),
  cloudShadow: new Color("#a9c3ee"),
  cloudRim: new Color("#ffffff"),
  /** Warm blush on the sunlit tops of clouds. */
  cloudWarm: new Color("#ffdfe3"),
  ocean: {
    deep: new Color("#143f92"),
    open: new Color("#1c58b0"),
    mid: new Color("#2468bd"),
    shallow: new Color("#259fd0"),
    lagoon: new Color("#69cfe0"),
    foam: new Color("#f7fbff"),
    shade: new Color("#123a85"),
    far: new Color("#4f98d8"),
  },
};

export const FOG_GLSL = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
#endif
`;
