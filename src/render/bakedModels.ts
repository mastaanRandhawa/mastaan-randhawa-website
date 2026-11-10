import type { PropKind, TreeTemplate } from "@/world/treeTemplates";
import type { TreeKind } from "@/world/prefabs/nature";

/**
 * Compact file of pre-baked model templates (trees and ground props), so the
 * game downloads one small file at startup instead of several glTF packs with
 * their textures, and does no texture decoding or baking in the browser.
 *
 * Layout (little-endian): "SKT1", u32 header length, JSON header (padded to
 * 4 bytes), then the binary blob. Shapes shared by several colour variants are
 * stored once: positions as int16 scaled per shape, indices as u16/u32,
 * colours as sRGB u8 per template (scaled so values above 1 survive).
 */
export interface BakedEntry {
  kind?: TreeKind;
  prop?: PropKind;
  t: TreeTemplate;
}

interface Header {
  g: { v: number; i: number; s: number; po: number; io: number; w: 16 | 32 }[];
  t: { k?: TreeKind; p?: PropKind; g: number; co: number; cm: number; a: number }[];
}

const MAGIC = 0x31544b53; // "SKT1"

const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

function same(a: ArrayLike<number>, b: ArrayLike<number>) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function encodeBaked(entries: BakedEntry[]): ArrayBuffer {
  const geoms: { pos: Float32Array; idx: Uint32Array }[] = [];
  const header: Header = { g: [], t: [] };
  const chunks: ArrayBuffer[] = [];
  let off = 0;
  const push = (view: ArrayBufferView) => {
    const pad = (4 - (view.byteLength % 4)) % 4;
    const copy = new Uint8Array(view.byteLength + pad);
    copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    chunks.push(copy.buffer);
    const at = off;
    off += copy.byteLength;
    return at;
  };
  for (const { kind, prop, t } of entries) {
    let g = geoms.findIndex((q) => same(q.idx, t.idx) && same(q.pos, t.pos));
    if (g < 0) {
      g = geoms.length;
      geoms.push({ pos: t.pos, idx: t.idx });
      let s = 1e-6;
      for (let i = 0; i < t.pos.length; i++) s = Math.max(s, Math.abs(t.pos[i]));
      const q = new Int16Array(t.pos.length);
      for (let i = 0; i < t.pos.length; i++) q[i] = Math.round((t.pos[i] / s) * 32767);
      const v = t.pos.length / 3;
      const wide = v > 65535;
      const po = push(q);
      const io = push(wide ? Uint32Array.from(t.idx) : Uint16Array.from(t.idx));
      header.g.push({ v, i: t.idx.length, s, po, io, w: wide ? 32 : 16 });
    }
    let cm = 1;
    for (let i = 0; i < t.col.length; i++) cm = Math.max(cm, t.col[i]);
    const c = new Uint8Array(t.col.length);
    for (let i = 0; i < t.col.length; i++) c[i] = Math.round(Math.min(1, Math.max(0, toSrgb(t.col[i] / cm))) * 255);
    header.t.push({ ...(kind ? { k: kind } : {}), ...(prop ? { p: prop } : {}), g, co: push(c), cm, a: t.aspect });
  }
  let json = new TextEncoder().encode(JSON.stringify(header));
  const jpad = (4 - (json.length % 4)) % 4;
  if (jpad) {
    const j2 = new Uint8Array(json.length + jpad).fill(0x20);
    j2.set(json);
    json = j2;
  }
  const out = new Uint8Array(8 + json.length + off);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, MAGIC, true);
  dv.setUint32(4, json.length, true);
  out.set(json, 8);
  let at = 8 + json.length;
  for (const ch of chunks) {
    out.set(new Uint8Array(ch), at);
    at += ch.byteLength;
  }
  return out.buffer;
}

export function decodeBaked(buf: ArrayBuffer): BakedEntry[] {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== MAGIC) throw new Error("Not a baked model file");
  const jl = dv.getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, jl))) as Header;
  const base = 8 + jl;
  const geoms = header.g.map((g) => {
    const q = new Int16Array(buf, base + g.po, g.v * 3);
    const pos = new Float32Array(q.length);
    const k = g.s / 32767;
    for (let i = 0; i < q.length; i++) pos[i] = q[i] * k;
    const idx = g.w === 32 ? new Uint32Array(buf.slice(base + g.io, base + g.io + g.i * 4)) : Uint32Array.from(new Uint16Array(buf, base + g.io, g.i));
    return { pos, idx };
  });
  // sRGB byte → linear lookup.
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) lut[i] = toLinear(i / 255);
  return header.t.map((t) => {
    const g = geoms[t.g];
    const c = new Uint8Array(buf, base + t.co, g.pos.length);
    const col = new Float32Array(c.length);
    for (let i = 0; i < c.length; i++) col[i] = lut[c[i]] * t.cm;
    return { kind: t.k, prop: t.p, t: { pos: g.pos, idx: g.idx, col, aspect: t.a } };
  });
}
