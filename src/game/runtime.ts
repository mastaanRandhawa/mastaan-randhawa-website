import { createFlightState, type FlightState } from "./flight/flightModel";
import { WORLD } from "@/world/layout";
import type { Visit } from "./visit";

/**
 * High-frequency mutable game state. Lives OUTSIDE React so the 120 Hz sim and
 * the 60+ fps renderer never trigger component re-renders. UI reads it inside
 * requestAnimationFrame callbacks.
 */
export type FlightPhase = "parked" | "takeoff" | "flying" | "respawning" | "visit";

export interface Pose {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
}

export const runtime = {
  flight: createFlightState(WORLD.spawn.x, 101.55, WORLD.spawn.z, WORLD.spawn.heading, 0) as FlightState,
  prev: { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0 } as Pose,
  /** Interpolated pose used for rendering. */
  pose: { x: 0, y: 0, z: 0, heading: 0, pitch: 0, roll: 0 } as Pose,
  phase: "parked" as FlightPhase,
  phaseTime: 0,
  simTime: 0,
  accumulator: 0,
  checkpoint: { x: 0, y: 160, z: -40, heading: 0 },
  /** Camera shake energy (decays). */
  shake: 0,
  respawnT: 0,
  /** Seconds spent in current course since start. */
  courseTime: 0,
  /** Temporary camera glance toward a discovered landmark. */
  glance: null as null | { x: number; y: number; z: number; t: number; dur: number },
  fps: 60,
  lastImpactAt: -10,
  /** Smoothed control inputs for control-surface animation. */
  ctl: { pitch: 0, turn: 0, roll: 0 },
  /** Set when a ring is passed (for HUD flash). */
  ringFlashAt: -10,
  speedRecord: 0,
  airborneTime: 0,
  /** Active island visit (autopilot landing / takeoff), if any. */
  visit: null as Visit | null,
  /** White flash for skips (decays each frame). */
  flash: 0,
  /** Edge-of-world warning shown for this excursion. */
  boundsWarned: false,
  /** Last touchdown, for the dust puff. */
  dust: null as null | { x: number; y: number; z: number; at: number },
};

/** Free-look around the plane while flying (mouse drag + wheel). Eases back when idle. */
export const look = { yaw: 0, pitch: 0, zoom: 1, dragging: false, lastInput: -10 };


export function resetFlightAt(x: number, y: number, z: number, heading: number, speed: number) {
  const f = createFlightState(x, y, z, heading, speed);
  runtime.flight = f;
  Object.assign(runtime.prev, { x, y, z, heading, pitch: 0, roll: 0 });
  Object.assign(runtime.pose, runtime.prev);
  runtime.accumulator = 0;
}

export function parkAtSpawn() {
  resetFlightAt(WORLD.spawn.x, 101.55, WORLD.spawn.z, WORLD.spawn.heading, 0);
  runtime.flight.gear = 1;
  runtime.flight.onGround = true;
  runtime.phase = "parked";
  runtime.phaseTime = 0;
}
