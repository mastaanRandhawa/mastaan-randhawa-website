import type { LandingSite } from "./defs";

/** Height of the aircraft's origin above the ground when its wheels touch. */
export const GEAR_HEIGHT = 1.55;
export const GLIDE = 0.13; // ~7.4° approach
export const APPROACH_LEN = 150;

type V3 = [number, number, number];

/**
 * Derived geometry for one landing: approach entry, touchdown, stop point,
 * parking spot after the U-turn, and the liftoff point for departure.
 */
export function landingPlan(site: LandingSite) {
  const dx = -Math.sin(site.heading);
  const dz = -Math.cos(site.heading);
  const rx = -dz; // right of the landing direction
  const rz = dx;
  const half = site.length / 2;
  const g = site.y + GEAR_HEIGHT;
  const at = (d: number, lat = 0, y = g): V3 => [site.x + dx * d + rx * lat, y, site.z + dz * d + rz * lat];
  const touch = -half + Math.min(20, site.length * 0.16);
  const stop = half - Math.min(12, site.length * 0.12);
  const turnR = 2.5 * (site.turn ?? 1);
  return {
    dir: [dx, dz] as [number, number],
    right: [rx, rz] as [number, number],
    groundY: site.y,
    entry: at(touch - APPROACH_LEN, 0, g + APPROACH_LEN * Math.tan(GLIDE)),
    touchdown: at(touch),
    stop: at(stop),
    turnRadius: turnR,
    /** Parked after the U-turn, facing back down the strip. */
    park: at(stop, turnR * 2),
    parkHeading: site.heading + Math.PI,
    /** Departure roll runs from park back toward the threshold. */
    liftoff: at(Math.max(-half + 4, stop - Math.min(44, site.length * 0.75)), turnR * 2),
    climbOut: at(-half - 160, turnR * 2, g + 160 * 0.2 + 12),
    at,
  };
}

export type LandingPlan = ReturnType<typeof landingPlan>;
