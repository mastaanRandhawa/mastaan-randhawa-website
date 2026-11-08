/**
 * Centralised flight + camera tuning. Units: world units (~metres) and seconds.
 * Angles in radians. Tweak these to change game feel — nothing else hardcodes them.
 */
export interface FlightTuning {
  baseSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  acceleration: number;
  deceleration: number;
  /** Speed gained diving / lost climbing, per unit of sin(pitch). */
  gravityEffect: number;
  pitchRate: number;
  pitchResponse: number;
  maxPitch: number;
  /** How quickly pitch eases back toward level with no input (assist). */
  pitchAutoLevel: number;
  rollRate: number;
  maxBank: number;
  bankResponse: number;
  /** Bank-induced heading change (coordinated turn strength). */
  turnRate: number;
  /** Immediate yaw from A/D so steering feels responsive before the bank builds. */
  directYaw: number;
  /** 0 = W always climbs in world space; 1 = W pitches around the wing axis. */
  pitchBankCoupling: number;
  /** How fast velocity aligns with the nose (lower = more drift / inertia). */
  grip: number;
  verticalSpeedLimit: number;
  boostDrain: number;
  boostRecharge: number;
  /** Below this ground clearance (units) the assist gently pulls up. */
  terrainAssistClearance: number;
  crashImpactSpeed: number;
  bounce: number;
  collisionRadius: number;
  ceiling: number;
  floor: number;
}

export const ASSISTED: FlightTuning = {
  baseSpeed: 48,
  maxSpeed: 96,
  minSpeed: 24,
  acceleration: 26,
  deceleration: 30,
  gravityEffect: 14,
  pitchRate: 1.15,
  pitchResponse: 6,
  maxPitch: 1.05,
  pitchAutoLevel: 0.5,
  rollRate: 4.2,
  maxBank: 1.0,
  bankResponse: 4.5,
  turnRate: 0.95,
  directYaw: 0.28,
  pitchBankCoupling: 0.35,
  grip: 3.2,
  verticalSpeedLimit: 46,
  boostDrain: 0.22,
  boostRecharge: 0.14,
  terrainAssistClearance: 14,
  crashImpactSpeed: 46,
  bounce: 0.35,
  collisionRadius: 2.6,
  ceiling: 620,
  floor: -60,
};

export const ADVANCED: FlightTuning = {
  ...ASSISTED,
  pitchRate: 1.45,
  pitchResponse: 7,
  maxPitch: 1.48,
  pitchAutoLevel: 0.05,
  rollRate: 5.2,
  maxBank: 1.45,
  bankResponse: 3.2,
  turnRate: 1.1,
  directYaw: 0.18,
  pitchBankCoupling: 1,
  grip: 2.4,
  verticalSpeedLimit: 70,
  terrainAssistClearance: 0,
  crashImpactSpeed: 36,
};

export const CAMERA = {
  fovBase: 60,
  fovBoost: 13,
  chase: {
    distance: 14,
    height: 4.4,
    lookAhead: 7,
    boostPullback: 4.5,
    lateralShift: 1.4,
    rollFollow: 0.14,
    pitchFollow: 0.6,
    posDamping: 6.5,
    lookDamping: 12,
  },
  cinematic: {
    distance: 30,
    height: 9,
    lateral: 13,
    posDamping: 2.4,
    lookDamping: 4,
  },
  cockpit: { offset: [0, 1.25, 0.55] as const },
};

export const SIM = {
  hz: 120,
  maxFrameDelta: 0.1,
  maxSubSteps: 8,
};
