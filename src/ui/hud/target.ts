import { useGame } from "@/game/store";
import { currentMission } from "@/game/progression";
import { courseById, destinationById, getWorld, worldReady } from "@/world/world";

export interface Target {
  x: number;
  y: number;
  z: number;
  label: string;
  accent: string;
  kind: "ring" | "destination";
}

/** Where the waypoint currently points: explicit pick > active course ring > mission. */
export function currentTarget(): Target | null {
  if (!worldReady()) return null;
  const s = useGame.getState();
  if (s.course) {
    const c = courseById(s.course.id);
    const r = c?.rings[s.course.next];
    if (r) return { x: r.pos[0], y: r.pos[1], z: r.pos[2], label: `${c!.name} · ring ${s.course.next + 1}/${c!.rings.length}`, accent: "#ffcf70", kind: "ring" };
  }
  if (s.waypoint) {
    const d = destinationById(s.waypoint);
    if (d) return { x: d.pos[0], y: d.pos[1], z: d.pos[2], label: d.label, accent: d.accent, kind: "destination" };
  }
  const m = currentMission(s.progress);
  if (!m) return null;
  const id = m.targets.find((t) => !s.progress.viewed.includes(t)) ?? m.targets[0];
  if (!id) return null;
  const d = getWorld().destinations.find((x) => x.id === id);
  if (!d) return null;
  return { x: d.pos[0], y: d.pos[1], z: d.pos[2], label: d.label, accent: d.accent, kind: "destination" };
}
