import type { IslandTerrain } from "./terrain";

/**
 * Collision world: islands (analytic heightfield + underside profile), boxes
 * (yaw-rotated), vertical cylinders and spheres. A uniform spatial hash on XZ
 * keeps queries to a handful of candidates.
 */
export type Collider =
  | { type: "box"; x: number; y: number; z: number; hx: number; hy: number; hz: number; ry: number }
  | { type: "cyl"; x: number; z: number; y0: number; y1: number; r: number }
  | { type: "sphere"; x: number; y: number; z: number; r: number }
  | { type: "island"; terrain: IslandTerrain };

export interface Contact {
  nx: number;
  ny: number;
  nz: number;
  depth: number;
  kind: Collider["type"];
}

const CELL = 96;

function bounds(c: Collider): [number, number, number, number] {
  switch (c.type) {
    case "box": {
      const r = Math.hypot(c.hx, c.hz);
      return [c.x - r, c.z - r, c.x + r, c.z + r];
    }
    case "cyl":
      return [c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r];
    case "sphere":
      return [c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r];
    case "island": {
      const t = c.terrain;
      const r = t.boundRadius + 4;
      return [t.p.x - r, t.p.z - r, t.p.x + r, t.p.z + r];
    }
  }
}

export class CollisionWorld {
  private grid = new Map<string, Collider[]>();
  private islands: IslandTerrain[] = [];
  readonly all: Collider[] = [];

  add(c: Collider) {
    this.all.push(c);
    if (c.type === "island") this.islands.push(c.terrain);
    const [x0, z0, x1, z1] = bounds(c);
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) {
      for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
        const k = `${i},${j}`;
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(c);
      }
    }
  }

  candidates(x: number, z: number): Collider[] {
    return this.grid.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? EMPTY;
  }

  /** Highest solid surface below/at (x,z) — islands and box/cylinder tops. */
  groundAt(x: number, z: number, maxY = Infinity): number {
    let best = -Infinity;
    for (const c of this.candidates(x, z)) {
      let top: number | null = null;
      if (c.type === "island") top = c.terrain.topAt(x, z);
      else if (c.type === "box") {
        const lx = x - c.x;
        const lz = z - c.z;
        const cs = Math.cos(-c.ry);
        const sn = Math.sin(-c.ry);
        if (Math.abs(lx * cs - lz * sn) <= c.hx && Math.abs(lx * sn + lz * cs) <= c.hz) top = c.y + c.hy;
      } else if (c.type === "cyl") {
        if (Math.hypot(x - c.x, z - c.z) <= c.r) top = c.y1;
      }
      if (top !== null && top > best && top <= maxY) best = top;
    }
    return best;
  }

  /** Resolve a sphere against nearby colliders; returns the deepest contact. */
  collide(x: number, y: number, z: number, r: number): Contact | null {
    let best: Contact | null = null;
    for (const c of this.candidates(x, z)) {
      const hit = collideOne(c, x, y, z, r);
      if (hit && (!best || hit.depth > best.depth)) best = hit;
    }
    return best;
  }
}

const EMPTY: Collider[] = [];

function collideOne(c: Collider, x: number, y: number, z: number, r: number): Contact | null {
  switch (c.type) {
    case "sphere": {
      const dx = x - c.x;
      const dy = y - c.y;
      const dz = z - c.z;
      const d = Math.hypot(dx, dy, dz);
      const pen = c.r + r - d;
      if (pen <= 0) return null;
      const inv = d > 1e-6 ? 1 / d : 0;
      return { nx: dx * inv, ny: d > 1e-6 ? dy * inv : 1, nz: dz * inv, depth: pen, kind: "sphere" };
    }
    case "cyl": {
      if (y + r < c.y0 || y - r > c.y1) return null;
      const dx = x - c.x;
      const dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const penSide = c.r + r - d;
      if (penSide <= 0) return null;
      const penTop = c.y1 + r - y;
      if (penTop < penSide && y > c.y1 - r * 0.5) return { nx: 0, ny: 1, nz: 0, depth: penTop, kind: "cyl" };
      const inv = d > 1e-6 ? 1 / d : 0;
      return { nx: d > 1e-6 ? dx * inv : 1, ny: 0, nz: dz * inv, depth: penSide, kind: "cyl" };
    }
    case "box": {
      const cs = Math.cos(-c.ry);
      const sn = Math.sin(-c.ry);
      const dx = x - c.x;
      const dz = z - c.z;
      const lx = dx * cs - dz * sn;
      const lz = dx * sn + dz * cs;
      const ly = y - c.y;
      const qx = Math.max(-c.hx, Math.min(c.hx, lx));
      const qy = Math.max(-c.hy, Math.min(c.hy, ly));
      const qz = Math.max(-c.hz, Math.min(c.hz, lz));
      let ex = lx - qx;
      let ey = ly - qy;
      let ez = lz - qz;
      let d = Math.hypot(ex, ey, ez);
      let depth: number;
      if (d > 1e-6) {
        depth = r - d;
        if (depth <= 0) return null;
        ex /= d;
        ey /= d;
        ez /= d;
      } else {
        // Centre inside: push out along least-penetration axis.
        const px = c.hx - Math.abs(lx);
        const py = c.hy - Math.abs(ly);
        const pz = c.hz - Math.abs(lz);
        if (py <= px && py <= pz) {
          ex = 0;
          ey = Math.sign(ly) || 1;
          ez = 0;
          depth = py + r;
        } else if (px <= pz) {
          ex = Math.sign(lx) || 1;
          ey = 0;
          ez = 0;
          depth = px + r;
        } else {
          ex = 0;
          ey = 0;
          ez = Math.sign(lz) || 1;
          depth = pz + r;
        }
      }
      // Rotate normal back to world.
      const wc = Math.cos(c.ry);
      const ws = Math.sin(c.ry);
      return { nx: ex * wc - ez * ws, ny: ey, nz: ex * ws + ez * wc, depth, kind: "box" };
    }
    case "island":
      return collideIsland(c.terrain, x, y, z, r);
  }
}

function collideIsland(t: IslandTerrain, x: number, y: number, z: number, r: number): Contact | null {
  const p = t.p;
  if (y - r > p.y + t.maxTop + 2 || y + r < t.bottomY - 10) return null;
  const lx = x - p.x;
  const lz = z - p.z;
  const rho = t.rho(lx, lz);
  const edgeLen = p.radius * Math.max(0.6, t.edge(Math.atan2(lz / p.sz, lx / p.sx)));
  const pad = r / edgeLen;
  if (rho > 1 + pad) return null;
  const ly = y - p.y;
  const top = t.heightLocal(lx, lz);

  // Top surface contact.
  if (rho <= 1 && ly > top - 8) {
    const pen = top + r - ly;
    if (pen <= 0) return null;
    const e = 1.2;
    const gx = (t.heightLocal(lx + e, lz) - t.heightLocal(lx - e, lz)) / (2 * e);
    const gz = (t.heightLocal(lx, lz + e) - t.heightLocal(lx, lz - e)) / (2 * e);
    const inv = 1 / Math.hypot(gx, 1, gz);
    return { nx: -gx * inv, ny: inv, nz: -gz * inv, depth: pen, kind: "island" };
  }

  // Underside / cliff contact.
  const depthFrac = (top - p.rimDrop - ly - 2.5) / Math.max(1, p.depth - 2.5);
  if (depthFrac > 1.05) return null;
  const tt = Math.max(0, Math.min(1, depthFrac));
  const f = t.profileAt(tt);
  const pen = (f + pad - rho) * edgeLen;
  if (pen <= 0) return null;
  const ndx = lx / (p.sx * p.sx);
  const ndz = lz / (p.sz * p.sz);
  const nl = Math.hypot(ndx, ndz) || 1;
  const down = p.profile === "column" ? 0 : -0.35 * tt;
  const inv = 1 / Math.hypot(1, down);
  return { nx: (ndx / nl) * inv, ny: down * inv, nz: (ndz / nl) * inv, depth: Math.min(pen, r * 2), kind: "island" };
}
