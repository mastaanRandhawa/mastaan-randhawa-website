import { Box3, Color, Mesh, MeshStandardMaterial, SRGBColorSpace, Vector2, Vector3, type BufferGeometry, type Object3D, type Texture } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { registerPropTemplates, registerTreeTemplates, type PropKind, type TreeTemplate } from "@/world/treeTemplates";
import { decodeBaked, encodeBaked, type BakedEntry } from "./bakedModels";
import { proceduralTreeTemplates } from "@/world/proceduralTrees";
import type { TreeKind } from "@/world/prefabs/nature";

/**
 * Free models (CC BY, credited in src/content/credits.ts) baked into the
 * world's vertex-coloured format so they merge with the island meshes. Each
 * entry maps nodes of a .glb to a tree kind or a ground-prop kind; `nodes` are
 * matched against the scene's direct-child groups, then any node by name (or
 * the whole scene when omitted).
 */
interface TreeSource {
  url: string;
  kinds: {
    kind?: TreeKind;
    prop?: PropKind;
    /** Node-name pattern; each match is one model, or all matches form one with `merge`. */
    nodes?: RegExp;
    merge?: boolean;
    /** Repaint the foliage (green faces) in these colours, one variant each. */
    leaves?: string[];
    /** Repaint everything that isn't foliage (rock, bark) in these stone colours, one variant each. */
    stone?: string[];
  }[];
}

/** Source packs (served by the dev server from the project's model-src/ folder; not shipped). */
const SRC_BASE = "/model-src/";
/**
 * Round-crowned trees in the pack: a clustered tree, a broad oak and a fluffy
 * tiered one. (three.js strips dots from node names: "Circle.005" → "Circle005".)
 */
const BROADLEAF = /^Circle(005|007)?$/;
export const TREE_SOURCES: TreeSource[] = [
  {
    // "Low Poly Tree Pack" by louieoliva, CC BY 4.0.
    url: "trees/low_poly_tree_pack.glb",
    kinds: [
      // Foliage repainted in the game's own leaf greens (C.leaf / C.leafLight).
      { kind: "round", nodes: BROADLEAF, leaves: ["#83bd67", "#a5cf72"] },
      { kind: "autumn", nodes: BROADLEAF, leaves: ["#eeb24f", "#e48d4a"] },
      { kind: "blossom", nodes: /^Circle00[57]$/, leaves: ["#f2a7b8", "#f6c1cc"] },
      // Birch: the clustered and tiered broadleaves in a light, yellow-green birch foliage.
      { kind: "birch", nodes: /^Circle(007)?$/, leaves: ["#a9c95c", "#bcd673"] },
      { kind: "pine", nodes: /^Circle001$/ },
      // Trunk and slim crown are separate nodes of one cypress-like tree.
      { kind: "poplar", nodes: /^Circle00[34]$/, merge: true },
      { kind: "palm", nodes: /^Circle002$/ },
    ],
  },
  {
    // "Coconut Tree" by sujirour, CC BY 4.0.
    url: "trees/coconut_tree.glb",
    kinds: [{ kind: "palm" }],
  },
  {
    // "Low poly Stylized Nature Pack" by satendra5286, CC BY 4.0 (converted to
    // metallic-roughness materials; colours come from one gradient texture).
    url: "props/nature_pack.glb",
    kinds: [
      // More trees for every kind.
      { kind: "round", nodes: /^Tree(R[123]|RF)$/, leaves: ["#83bd67", "#a5cf72"] },
      { kind: "autumn", nodes: /^TreeR[123]$/, leaves: ["#eeb24f", "#e48d4a"] },
      { kind: "birch", nodes: /^TreeR[12]$/, leaves: ["#a9c95c", "#bcd673"] },
      { kind: "blossom", nodes: /^TreeRC2$/ },
      { kind: "pine", nodes: /^TreeV[123]$/ },
      { kind: "palm", nodes: /^TreeD[123]$/ },
      // Mossy boulders, re-stoned to the islands' warm rock (the moss stays green).
      { prop: "rock", nodes: /^RBg[1-6]$/, stone: ["#d3c6b2", "#c4b6a1"] },
      // Low leafy plants (fan-leaved, one with a red bloom, one blue).
      { prop: "plant", nodes: /^Clump[2356]$/ },
      { prop: "flower", nodes: /^(FlowerY1|FlowerB1|FlowerR2|FlowerM1|FlowerY2|Clump7|Clump8)$/ },
      { prop: "grass", nodes: /^GrassClump1$/, leaves: ["#8cc068", "#a3cf72"] },
      { prop: "mushroom", nodes: /^MushrumY1$/ },
      { prop: "stump", nodes: /^Log$/ },
    ],
  },
  {
    // "Free Pack - Rocks Stylized" by polyone, CC BY 4.0 (the two thin shards are left out).
    url: "props/rocks_stylized.glb",
    kinds: [{ prop: "rock", nodes: /^SM_Rocks_0\d_/, stone: ["#ddd1bf", "#cbbda9"] }],
  },
  {
    // "Stylized Bush" by danielpetrov, CC BY 4.0, in the game's bush greens.
    url: "props/stylized_bush.glb",
    kinds: [{ prop: "bush", leaves: ["#5f9e5c", "#73b064", "#4f8f5a"] }],
  },
];

const sampleCache = new Map<Texture, { data: Uint8ClampedArray; w: number; h: number } | null>();
function texels(tex: Texture) {
  if (sampleCache.has(tex)) return sampleCache.get(tex)!;
  const img = tex.image as CanvasImageSource & { width: number; height: number };
  let out: { data: Uint8ClampedArray; w: number; h: number } | null = null;
  if (img?.width) {
    const c = document.createElement("canvas");
    c.width = Math.min(256, img.width);
    c.height = Math.min(256, img.height);
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, 0, 0, c.width, c.height);
    out = { data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
  }
  sampleCache.set(tex, out);
  return out;
}

const tmpC = new Color();
const tmpV = new Vector3();
const uv = new Vector2();

const leafC = new Color();

/**
 * Bakes every mesh under `roots` into one template: height 1, trunk base at
 * the origin (so leaning palms and lopsided crowns stand where they're planted).
 */
function bake(roots: Object3D[], leaf?: string, stone?: string): TreeTemplate | null {
  const box = new Box3();
  for (const r of roots) {
    r.updateMatrixWorld(true);
    box.expandByObject(r);
  }
  const size = box.getSize(new Vector3());
  if (size.y <= 0) return null;
  const k = 1 / size.y;
  if (leaf) leafC.set(leaf);
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  /** Offsets (into col) of the non-foliage vertices: rock, bark, petals. */
  const bare: number[] = [];
  for (const root of roots) root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const geo = mesh.geometry as BufferGeometry;
    const p = geo.getAttribute("position");
    const uvs = geo.getAttribute("uv");
    const vc = geo.getAttribute("color");
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial;
    const tex = mat.map ? texels(mat.map) : null;
    const base = pos.length / 3;
    for (let i = 0; i < p.count; i++) {
      tmpV.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      pos.push(tmpV.x * k, (tmpV.y - box.min.y) * k, tmpV.z * k);
      tmpC.copy(mat.color ?? tmpC.setRGB(1, 1, 1));
      if (tex && uvs) {
        uv.set(uvs.getX(i), uvs.getY(i));
        if (mat.map) mat.map.transformUv(uv);
        const x = Math.min(tex.w - 1, Math.max(0, Math.floor(uv.x * tex.w)));
        const y = Math.min(tex.h - 1, Math.max(0, Math.floor(uv.y * tex.h)));
        const j = (y * tex.w + x) * 4;
        const t = new Color().setRGB(tex.data[j] / 255, tex.data[j + 1] / 255, tex.data[j + 2] / 255, SRGBColorSpace);
        tmpC.multiply(t);
      }
      if (vc) tmpC.multiply(new Color(vc.getX(i), vc.getY(i), vc.getZ(i)));
      const green = tmpC.g > tmpC.r * 1.15 && tmpC.g > tmpC.b * 1.15;
      if (!green) bare.push(col.length);
      // Foliage repaint: green-dominant colours take the leaf colour at their own brightness.
      if (leaf && green) {
        const lum = 0.2126 * tmpC.r + 0.7152 * tmpC.g + 0.0722 * tmpC.b;
        // 0.35 ≈ the pack's mid foliage luminance, so mid greens map to the leaf colour itself.
        tmpC.copy(leafC).multiplyScalar(Math.min(1.25, Math.max(0.6, Math.pow(lum / 0.35, 0.6))));
      }
      col.push(tmpC.r, tmpC.g, tmpC.b);
    }
    const index = geo.getIndex();
    if (index) for (let i = 0; i < index.count; i++) idx.push(base + index.getX(i));
    else for (let i = 0; i < p.count; i++) idx.push(base + i);
  });
  if (!idx.length) return null;
  if (stone && bare.length) {
    // Re-stone: every non-foliage vertex takes the stone colour at its own
    // brightness relative to the model's average, so the facets keep their shading.
    const lum = (o: number) => 0.2126 * col[o] + 0.7152 * col[o + 1] + 0.0722 * col[o + 2];
    let mean = 0;
    for (const o of bare) mean += lum(o);
    mean = Math.max(1e-4, mean / bare.length);
    leafC.set(stone);
    for (const o of bare) {
      const f = Math.min(1.3, Math.max(0.6, Math.pow(lum(o) / mean, 0.7)));
      col[o] = leafC.r * f;
      col[o + 1] = leafC.g * f;
      col[o + 2] = leafC.b * f;
    }
  }
  // Centre on the trunk: the mean of the lowest 4% of vertices.
  let bx = 0;
  let bz = 0;
  let bn = 0;
  for (let i = 0; i < pos.length; i += 3) {
    if (pos[i + 1] < 0.04) {
      bx += pos[i];
      bz += pos[i + 2];
      bn++;
    }
  }
  if (bn) {
    bx /= bn;
    bz /= bn;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] -= bx;
      pos[i + 2] -= bz;
    }
  }
  return { pos: new Float32Array(pos), col: new Float32Array(col), idx: new Uint32Array(idx), aspect: Math.max(size.x, size.z) / size.y };
}

/**
 * Loads and registers all tree and prop models (the world waits for them, up
 * to `timeoutMs`). Never rejects: a failed load leaves the islands bare.
 *
 * The game ships one small pre-baked file (models/baked/templates.bin). The
 * source packs live in model-src/ and are only read in development: open the
 * game with `?bake-models` to re-bake them and save a fresh file (see the
 * dev-server hook in vite.config.ts) after changing TREE_SOURCES or a model.
 */
let loading: Promise<void> | null = null;
export function loadTreeModels(timeoutMs = 20000): Promise<void> {
  // Once per page: React may run the loading effect twice in development.
  loading ??= load(timeoutMs);
  return loading;
}

const BAKED_URL = `${import.meta.env.BASE_URL}models/baked/templates.bin`;

async function load(timeoutMs: number): Promise<void> {
  const rebake = import.meta.env.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).has("bake-models");
  const work = (async () => {
    let entries: BakedEntry[] | null = null;
    if (!rebake) {
      try {
        const res = await fetch(BAKED_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        entries = decodeBaked(await res.arrayBuffer());
      } catch (e) {
        console.warn("[models] no baked file", e);
      }
    }
    // Development fallback (and the re-bake path): bake from the source packs.
    if (!entries && import.meta.env.DEV) {
      entries = await bakeSources();
      if (rebake) await saveBaked(entries);
    }
    // Registered in a fixed order, so the world comes out the same every load:
    // the trees generated in code first, then the model packs.
    for (const { kind, t } of proceduralTreeTemplates()) registerTreeTemplates(kind, [t]);
    for (const { kind, prop, t } of entries ?? []) {
      if (kind) registerTreeTemplates(kind, [t]);
      if (prop) registerPropTemplates(prop, [t]);
    }
  })();
  await Promise.race([work.catch((e) => console.warn("[models] load failed", e)), new Promise((r) => setTimeout(r, timeoutMs))]);
}

async function saveBaked(entries: BakedEntry[]) {
  const body = encodeBaked(entries);
  const res = await fetch("/__save-baked-models", { method: "POST", body });
  console.info(`[models] baked ${entries.length} templates, ${Math.round(body.byteLength / 1024)} KB →`, res.ok ? "saved" : `save failed (${res.status})`);
}

/** Bakes every TREE_SOURCES entry from the glTF packs in model-src/ (development only). */
async function bakeSources(): Promise<BakedEntry[]> {
  const loader = new GLTFLoader();
  const perSource = await Promise.all(
    TREE_SOURCES.map(async (src) => {
      const found: BakedEntry[] = [];
      try {
        const gltf = await loader.loadAsync(SRC_BASE + src.url);
        // World matrices of every node (Sketchfab exports nest rotated FBX roots).
        gltf.scene.updateMatrixWorld(true);
        const groups = gltf.scene.children.length === 1 && !(gltf.scene.children[0] as Mesh).isMesh ? gltf.scene.children[0].children : gltf.scene.children;
        for (const { kind, prop, nodes, merge, leaves, stone } of src.kinds) {
          const picks = nodes ? findNodes(gltf.scene, groups, nodes) : [gltf.scene];
          const models = merge ? [picks] : picks.map((p) => [p]);
          const out: (TreeTemplate | null)[] = [];
          for (const m of models) for (const leaf of leaves ?? [undefined]) for (const st of stone ?? [undefined]) out.push(bake(m, leaf, st));
          for (const t of out) if (t) found.push({ kind, prop, t });
        }
      } catch (e) {
        console.warn("[models] could not load", src.url, e);
      }
      return found;
    }),
  );
  return perSource.flat();
}

function findNodes(scene: Object3D, groups: Object3D[], re: RegExp): Object3D[] {
  const direct = groups.filter((g) => re.test(g.name));
  if (direct.length) return direct;
  const deep: Object3D[] = [];
  scene.traverse((o) => {
    if (o !== scene && re.test(o.name) && !deep.some((d) => isAncestor(d, o))) deep.push(o);
  });
  return deep;
}

function isAncestor(a: Object3D, b: Object3D) {
  for (let p = b.parent; p; p = p.parent) if (p === a) return true;
  return false;
}
