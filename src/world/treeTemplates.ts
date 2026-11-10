/**
 * Baked tree and ground-decoration models (from glTF packs, see
 * src/render/treeAssets.ts) that the world builder stamps as its trees,
 * rocks, bushes, flowers and grass. Pure data so the world stays deterministic
 * and testable: when nothing is registered (unit tests, or the models failed to
 * load) no trees are placed.
 */
import type { TreeKind } from "./prefabs/nature";

export interface TreeTemplate {
  /** Local positions: base centred at the origin, height normalised to 1. */
  pos: Float32Array;
  /** Linear RGB per vertex (materials, textures and vertex colours baked in). */
  col: Float32Array;
  idx: Uint32Array;
  /** Width / height, used to keep crowns from overhanging pads too far. */
  aspect: number;
}

/** Real-world height (m) for a scale-1 tree of each kind. */
export const TREE_HEIGHT: Record<TreeKind, number> = {
  pine: 7.4,
  round: 6,
  autumn: 6,
  blossom: 6,
  poplar: 8,
  birch: 7,
  palm: 8.4,
};

const registry = new Map<TreeKind, TreeTemplate[]>();

/** Adds variants for a kind (several packs can contribute to one kind). */
export function registerTreeTemplates(kind: TreeKind, list: TreeTemplate[]) {
  if (list.length) registry.set(kind, [...(registry.get(kind) ?? []), ...list]);
}

export function treeTemplates(kind: TreeKind): TreeTemplate[] | undefined {
  return registry.get(kind);
}

export function clearTreeTemplates() {
  registry.clear();
  props.clear();
}

/** Ground decorations baked from the same model packs. */
export type PropKind = "rock" | "bush" | "plant" | "flower" | "grass" | "mushroom" | "stump";

const props = new Map<PropKind, TreeTemplate[]>();

export function registerPropTemplates(kind: PropKind, list: TreeTemplate[]) {
  if (list.length) props.set(kind, [...(props.get(kind) ?? []), ...list]);
}

export function propTemplates(kind: PropKind): TreeTemplate[] | undefined {
  return props.get(kind);
}
