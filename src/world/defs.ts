import type { PanelKind, RegionId, Vec3 } from "./layout";

export interface RingDef {
  pos: Vec3;
  /** Unit direction the ring faces (flight direction through it). */
  dir: Vec3;
  radius: number;
}

/** A strip the plane can land on. heading = direction of the landing roll. */
export interface LandingSite {
  x: number;
  y: number;
  z: number;
  heading: number;
  length: number;
  /** U-turn side after rollout: 1 = right (default), -1 = left. */
  turn?: number;
}

export interface Destination {
  id: string;
  regionId: RegionId;
  kind: PanelKind;
  contentId?: string;
  label: string;
  sublabel: string;
  /** Label / waypoint anchor. */
  pos: Vec3;
  interactRadius: number;
  ring?: RingDef;
  accent: string;
  landing?: LandingSite;
}

export interface CourseDef {
  id: string;
  name: string;
  regionId: RegionId;
  description: string;
  rings: RingDef[];
  /** Gold, silver, bronze thresholds in seconds. */
  medals: [number, number, number];
  timed: boolean;
}

export interface CollectibleDef {
  id: string;
  pos: Vec3;
  hint: string;
}

export interface RegionExtras {
  destinations: Destination[];
  courses: CourseDef[];
  collectibles: CollectibleDef[];
}

/** Build a ring course from control points; directions follow the path tangent. */
export function courseRings(points: Vec3[], radius = 9, closed = false): RingDef[] {
  return points.map((p, i) => {
    const prev = points[i - 1] ?? (closed ? points[points.length - 1] : null);
    const next = points[i + 1] ?? (closed ? points[0] : null);
    let dx: number;
    let dy: number;
    let dz: number;
    if (prev && next) {
      dx = next[0] - prev[0];
      dy = next[1] - prev[1];
      dz = next[2] - prev[2];
    } else if (next) {
      dx = next[0] - p[0];
      dy = next[1] - p[1];
      dz = next[2] - p[2];
    } else {
      dx = p[0] - prev![0];
      dy = p[1] - prev![1];
      dz = p[2] - prev![2];
    }
    const l = Math.hypot(dx, dy, dz) || 1;
    return { pos: p, dir: [dx / l, dy / l, dz / l], radius };
  });
}

export function ringFacing(pos: Vec3, heading: number, radius = 10, pitch = 0): RingDef {
  return {
    pos,
    dir: [-Math.sin(heading) * Math.cos(pitch), Math.sin(pitch), -Math.cos(heading) * Math.cos(pitch)],
    radius,
  };
}
