/**
 * Terrain personalities for ocean islands. Every shore island picks a preset
 * (`kind`) and may override any parameter (`terrain`) or author specific
 * coastline features (`features`) in its region file. All values are
 * deterministic per island seed, so collision, props and the mesh agree.
 *
 * Lengths are in metres unless noted; "× flare" means relative to the island's
 * natural hillside spread (≈ its height above the sea).
 */
export type IslandKind = "city" | "tropical" | "mountain" | "landmark";

export interface TerrainProfile {
  // ── Island shape ──
  /** How far the top outline wanders from the authored ellipse (fraction of radius). */
  coastlineIrregularity: number;
  /** Broad shoreline features around the island (≈ lobes per revolution). */
  coastlineNoiseScale: number;
  /** Domain warp of the outline noise: bends lobes into asymmetric headlands. */
  coastlineWarpStrength: number;
  /** Most the top outline may pull in from the authored shape (keeps structures on land). */
  maxShrink: number;
  /** Number of random low peninsulas and their reach (× flare). */
  peninsulas: number;
  peninsulaStrength: number;
  /** Number of random coves and how much they pull the shore in (0..1). */
  coves: number;
  coveStrength: number;

  // ── Hills and mountains ──
  /** Hillside spread (× flare): bigger is a broader, gentler landform. */
  slopeSpread: number;
  /** Coastal lowlands (× flare) that fan out at the foot of the hills, varying around the island. */
  lowlandApron: number;
  /** Ridges and gullies running down the hillsides (0..0.45). */
  ridgeStrength: number;
  /** Ridges per revolution. */
  ridgeCount: number;
  /** Rolling hills on the island top (m) and their frequency (cycles per metre). */
  hillHeight: number;
  hillFrequency: number;
  /** Small surface bumps (m). */
  terrainRoughness: number;
  /** Slope (rise/run) above which hillsides show bare rock. */
  rockSlope: number;

  // ── Beaches ──
  baseBeachWidth: number;
  /** 0..1: how much the beach width varies around the island. */
  beachWidthVariation: number;
  /** 0..1: share of the coast that is rocky cliff instead of beach. */
  rockyCoast: number;

  // ── Vegetation ──
  /** Multiplier on hillside tree clumps. */
  treeDensity: number;
  /** 0..1: how strongly trees gather into groves with open meadows between. */
  treeClusterStrength: number;
  /** Steepest slope (rise/run) trees will grow on. */
  maxTreeSlope: number;
}

/** An authored coastline feature at a given angle (radians, island-local, atan2(z, x)). */
export interface CoastFeature {
  type: "peninsula" | "cove";
  angle: number;
  /** Peninsula reach (× flare) or cove depth (0..1). */
  strength?: number;
  /** Angular half-width (radians). */
  width?: number;
}

export const TERRAIN_PRESETS: Record<IslandKind, TerrainProfile> = {
  /** Developed islands: broad gentle land, low hills at the edges, long beaches. */
  city: {
    coastlineIrregularity: 0.07,
    coastlineNoiseScale: 2.2,
    coastlineWarpStrength: 0.6,
    // Buildings run right to the edge: the outline may only grow.
    maxShrink: 0,
    peninsulas: 2,
    peninsulaStrength: 0.6,
    coves: 2,
    coveStrength: 0.45,
    slopeSpread: 1.35,
    lowlandApron: 0.5,
    ridgeStrength: 0.16,
    ridgeCount: 7,
    hillHeight: 1.5,
    hillFrequency: 0.012,
    terrainRoughness: 0.25,
    rockSlope: 1.4,
    baseBeachWidth: 9,
    beachWidthVariation: 0.7,
    rockyCoast: 0.25,
    treeDensity: 0.9,
    treeClusterStrength: 0.55,
    maxTreeSlope: 0.9,
  },
  /** Natural islands: rolling hills, ridges and valleys, palm groves and varied beaches. */
  tropical: {
    coastlineIrregularity: 0.12,
    coastlineNoiseScale: 2.6,
    coastlineWarpStrength: 0.9,
    maxShrink: 0.08,
    peninsulas: 2,
    peninsulaStrength: 0.75,
    coves: 2,
    coveStrength: 0.55,
    slopeSpread: 1.3,
    lowlandApron: 0.42,
    ridgeStrength: 0.3,
    ridgeCount: 8,
    hillHeight: 4,
    hillFrequency: 0.016,
    terrainRoughness: 0.4,
    rockSlope: 1.15,
    baseBeachWidth: 8,
    beachWidthVariation: 0.85,
    rockyCoast: 0.35,
    treeDensity: 1,
    treeClusterStrength: 0.7,
    maxTreeSlope: 0.95,
  },
  /** Challenge islands: connected ridges, rugged coves and cliffs, sparser trees. */
  mountain: {
    coastlineIrregularity: 0.14,
    coastlineNoiseScale: 3.2,
    coastlineWarpStrength: 1.1,
    maxShrink: 0.08,
    peninsulas: 2,
    peninsulaStrength: 0.55,
    coves: 3,
    coveStrength: 0.6,
    slopeSpread: 1.15,
    lowlandApron: 0.25,
    ridgeStrength: 0.42,
    ridgeCount: 7,
    hillHeight: 5,
    hillFrequency: 0.02,
    terrainRoughness: 0.6,
    rockSlope: 0.95,
    baseBeachWidth: 5,
    beachWidthVariation: 0.9,
    rockyCoast: 0.75,
    treeDensity: 0.8,
    treeClusterStrength: 0.75,
    maxTreeSlope: 0.85,
  },
  /** Islands built around a gameplay landmark: clear, readable land with gentle shoulders. */
  landmark: {
    coastlineIrregularity: 0.09,
    coastlineNoiseScale: 2.4,
    coastlineWarpStrength: 0.8,
    maxShrink: 0.05,
    peninsulas: 2,
    peninsulaStrength: 0.65,
    coves: 2,
    coveStrength: 0.5,
    slopeSpread: 1.3,
    lowlandApron: 0.4,
    ridgeStrength: 0.24,
    ridgeCount: 7,
    hillHeight: 2.5,
    hillFrequency: 0.014,
    terrainRoughness: 0.3,
    rockSlope: 1.2,
    baseBeachWidth: 7,
    beachWidthVariation: 0.8,
    rockyCoast: 0.4,
    treeDensity: 0.9,
    treeClusterStrength: 0.6,
    maxTreeSlope: 0.9,
  },
};

export function terrainProfile(kind: IslandKind = "tropical", overrides?: Partial<TerrainProfile>): TerrainProfile {
  return { ...TERRAIN_PRESETS[kind], ...overrides };
}
