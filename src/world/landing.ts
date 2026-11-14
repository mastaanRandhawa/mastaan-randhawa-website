import type { LandingSite } from "./defs";

/** Height of the aircraft's origin above the ground when its wheels touch. */
export const GEAR_HEIGHT = 1.55;
export const GLIDE = 0.13; // ~7.4° approach
export const APPROACH_LEN = 45;

type V3 = [number, number, number];

/**
 * Derived geometry for one landing: approach entry, touchdown, and a short
 * stop right after it, so a whole landing fits in a few seconds. The plane
 * parks where it stops, still facing down the strip.
 *
 * Departure has two corridors. If the climb straight ahead is clear it rolls
 * on down the strip; otherwise (strips laid out toward a canyon wall or a
 * peak) it taxis a U-turn onto the parallel lane and leaves back over the
 * approach, which is clear by design.
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
  // Brake hard after touchdown, but leave ~30 m of strip ahead for a straight-on take-off roll.
  const stop = Math.min(half - Math.min(12, site.length * 0.12), touch + Math.max(10, Math.min(26, half - 30 - touch)));
  const turnR = 2.5 * (site.turn ?? 1);
  return {
    dir: [dx, dz] as [number, number],
    right: [rx, rz] as [number, number],
    groundY: site.y,
    entry: at(touch - APPROACH_LEN, 0, g + APPROACH_LEN * Math.tan(GLIDE)),
    touchdown: at(touch),
    stop: at(stop),
    turnRadius: turnR,
    /** Parked where it stopped, still facing down the strip. */
    park: at(stop),
    parkHeading: site.heading,
    /** Straight-on departure: lifts off further down the strip, climbs out past the far end. */
    liftoff: at(Math.min(half, stop + 30)),
    climbOut: at(half + 160, 0, g + 160 * 0.2 + 12),
    /** Turn-back departure: U-turn onto the parallel lane, then out over the approach. */
    lane: at(stop, turnR * 2),
    laneHeading: site.heading + Math.PI,
    backLiftoff: at(Math.max(-half + 4, stop - 30), turnR * 2),
    backClimbOut: at(-half - 160, turnR * 2, g + 160 * 0.2 + 12),
    at,
  };
}

export type LandingPlan = ReturnType<typeof landingPlan>;

/** True if a small sphere swept from a to b touches nothing (same test the world checks use). */
export function corridorClear(collide: (x: number, y: number, z: number, r: number) => unknown, a: V3, b: V3, step = 3, r = 2.2): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (collide(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, r)) return false;
  }
  return true;
}

/** Whether the straight-on departure is clear; otherwise the plane turns back. */
export function straightDepartureClear(plan: LandingPlan, collide: (x: number, y: number, z: number, r: number) => unknown): boolean {
  const up = (p: V3): V3 => [p[0], p[1] + 2.5, p[2]];
  return corridorClear(collide, up(plan.park), up(plan.liftoff)) && corridorClear(collide, up(plan.liftoff), plan.climbOut);
}
