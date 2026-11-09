import { P, T } from "@/render/geometry/MeshBuilder";
import type { RegionKit } from "../regionKit";
import type { RegionDef, Vec3 } from "../layout";
import type { RegionExtras } from "../defs";
import { courseRings } from "../defs";
import { PALETTES } from "../terrain";
import { C } from "../palette";
import { floatingRocks, rock, tree, decorate } from "../prefabs/nature";
import { processBuilding } from "../prefabs/landmarks";
import { skyDock } from "../prefabs/structures";
import { approachRing, medalsFor, projectIsland } from "./common";
import { mulberry32 } from "../noise";
import { projectById } from "@/content/portfolio";

export function buildCanyon(kit: RegionKit, def: RegionDef, out: RegionExtras) {
  const [cx, cy, cz] = def.center;
  const rnd = mulberry32(6060);

  // ── Mesas lining a north→south corridor (shared centreline) ──
  const centre = (z: number) => cx + Math.sin((z - cz) / 70) * 18;
  const ARCH_ROWS = [2, 5];
  const archY = cy + 40;
  const mesaTops: { x: number; z: number; top: number; r: number }[] = [];
  for (let i = 0; i < 8; i++) {
    for (const side of [-1, 1]) {
      const z = cz - 150 + i * 52 + (side > 0 ? 24 : 0);
      const r = 13 + rnd() * 7;
      const x = centre(z) + side * (50 + rnd() * 12);
      const top = ARCH_ROWS.includes(i) ? archY + 14 + rnd() * 12 : cy + 10 + rnd() * 55;
      const I = kit.island({
        id: `mesa-${i}-${side}`,
        x,
        y: top,
        z,
        radius: r,
        seed: 6100 + i * 7 + (side > 0 ? 3 : 0),
        hilliness: 1.5,
        depth: top - (cy - 90),
        profile: "column",
        layers: 9,
        segments: 20,
        rings: 4,
        irregularity: 0.2,
        palette: PALETTES.desert,
      });
      if (rnd() > 0.4) tree(I, (rnd() - 0.5) * r * 0.6, (rnd() - 0.5) * r * 0.6, rnd() > 0.5 ? "pine" : "autumn", 1);
      if (rnd() > 0.5) rock(I, (rnd() - 0.5) * r * 0.8, (rnd() - 0.5) * r * 0.8, 1.6, undefined, 0.2);
      mesaTops.push({ x, z, top, r });
    }
  }
  // Stone arches spanning the corridor high above the course (fly under them).
  for (const zi of ARCH_ROWS) {
    const a = mesaTops[zi * 2];
    const b2 = mesaTops[zi * 2 + 1];
    const len = Math.hypot(b2.x - a.x, b2.z - a.z);
    const ry = Math.atan2(b2.x - a.x, b2.z - a.z);
    kit.world.add(P.box(), T((a.x + b2.x) / 2, archY, (a.z + b2.z) / 2, 7, 5, len, ry), "#c58b62");
    kit.world.add(P.box(), T((a.x + b2.x) / 2, archY + 2.8, (a.z + b2.z) / 2, 7.4, 1, len, ry), "#d9b07a");
    kit.box((a.x + b2.x) / 2, archY, (a.z + b2.z) / 2, 3.5, 2.5, len / 2, ry);
  }

  // ── Canyon Run: weave down the corridor ──
  const pts: Vec3[] = [];
  for (let i = -1; i <= 8; i++) {
    const z = cz - 165 + i * 48;
    pts.push([centre(z) + Math.sin(i * 1.7) * 6, cy + 8 + Math.sin(i * 0.8) * 9, z]);
  }
  out.courses.push({
    id: "canyon-run",
    name: "Canyon Run",
    regionId: "canyon",
    description: "Thread the mesas of Systems Canyon, north to south.",
    timed: true,
    rings: courseRings(pts, 9),
    medals: medalsFor(pts),
  });

  // ── Project islands on the canyon rims ──
  const cpuIsl = projectIsland(kit, def, out, { projectId: "risc-v", x: cx - 170, y: cy + 12, z: cz - 70, radius: 40, seed: 6201, palette: PALETTES.tech, trees: 10, kinds: ["pine", "poplar"] });
  out.collectibles.push({ id: "log-riscv", pos: cpuIsl.w(0, -56, 0), hint: "Below the tip of the RISC-V chip island" });
  projectIsland(kit, def, out, { projectId: "ls-command", x: cx - 165, y: cy + 2, z: cz + 95, radius: 32, seed: 6202, palette: PALETTES.meadow, trees: 12 });
  const cacheIsl = projectIsland(kit, def, out, { projectId: "cache", x: cx + 170, y: cy + 4, z: cz - 60, radius: 32, seed: 6203, palette: PALETTES.lavender, trees: 10 });
  out.collectibles.push({ id: "log-cache", pos: cacheIsl.w(0, cacheIsl.h(0, 0) + 30, 0), hint: "On top of the L1 cache" });
  projectIsland(kit, def, out, { projectId: "concurrent", x: cx + 165, y: cy + 14, z: cz + 100, radius: 34, seed: 6204, palette: PALETTES.autumn, trees: 10 });

  // ── IPC: two process islands joined by a pipe that carries messages ──
  const ipc = projectById("ipc")!;
  const ay = cy + 2;
  const A = kit.island({ id: "ipc-a", x: cx - 60, y: ay, z: cz + 250, radius: 27, seed: 6301, hilliness: 1.5, depth: 42, palette: PALETTES.tech, pads: [{ x: 0, z: 0, r: 9, h: 0 }] });
  const B = kit.island({ id: "ipc-b", x: cx + 60, y: ay + 6, z: cz + 250, radius: 27, seed: 6302, hilliness: 1.5, depth: 42, palette: PALETTES.tech, pads: [{ x: 0, z: 0, r: 9, h: 0 }] });
  processBuilding(A, 0, 0, "PROCESS A", ipc.color);
  processBuilding(B, 0, 0, "PROCESS B", "#3fb8af");
  for (const I of [A, B]) {
    decorate(I, { trees: 6, bushes: 6, flowers: 6, grass: 8, rocks: 3 });
    floatingRocks(I, 4);
  }
  const pipeY = ay + 9;
  const x0 = cx - 55;
  const x1 = cx + 55;
  kit.world.add(P.cyl(10), T(cx, pipeY, cz + 250, 2.2, x1 - x0, 2.2, 0, 0, Math.PI / 2), C.metal);
  for (let k = 0; k < 6; k++) kit.world.add(P.cyl(10), T(x0 + 10 + k * 18, pipeY, cz + 250, 2.6, 0.6, 2.6, 0, 0, Math.PI / 2), ipc.color);
  kit.world.add(P.cyl(10), T(cx, pipeY - 6, cz + 250, 0.8, 12, 0.8), C.metalDark);
  kit.world.add(P.cyl(6), T(cx, pipeY - 12.5, cz + 250, 12, 1, 12), "#e6b64c", { emissive: 0.4 });
  kit.anchor("sign", cx, pipeY - 11.9, cz + 250, { data: { lines: ["SHARED MEMORY"], w: 9, h: 1.6, bg: "#1f3552", fg: "#ffcf70", font: 60, rx: -Math.PI / 2 } });
  kit.cyl(cx, cz + 250, pipeY - 13, pipeY - 12, 6);
  kit.box(cx, pipeY, cz + 250, (x1 - x0) / 2, 1.2, 1.2);
  kit.anchor("pulses", 0, 0, 0, { data: { points: [[x0, pipeY, cz + 250.1], [x1, pipeY, cz + 250.1]], color: "#ffcf70", count: 5, speed: 0.2, size: 1.1 } });
  kit.anchor("pulses", 0, 0, 0, { data: { points: [[x1, pipeY + 1.6, cz + 250], [x0, pipeY + 1.6, cz + 250]], color: "#7fe3d8", count: 4, speed: 0.17, size: 0.8 } });
  out.destinations.push({
    id: "project-ipc",
    regionId: "canyon",
    kind: "project",
    contentId: "ipc",
    label: ipc.title,
    sublabel: ipc.tagline,
    pos: [cx, pipeY + 14, cz + 250],
    interactRadius: 95,
    ring: approachRing(def, cx, ay, cz + 250, 30, 22, 12),
    accent: ipc.color,
    landing: skyDock(kit, cx, ay + 2, cz + 297, -Math.PI / 2, 72),
  });
}
