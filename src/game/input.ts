import { KEY_BINDINGS, type AxisAction, type PressAction } from "@/config/controls";
import type { FlightInput } from "./flight/flightModel";
import type { Settings } from "./save";

/**
 * Unified input layer: keyboard, mouse steering, touch joystick and gamepad all
 * feed one smoothed FlightInput. Discrete actions go through a press handler.
 */
const pressed = new Set<string>();
export const pointer = { x: 0, y: 0, inside: false };
export const touch = { x: 0, y: 0, active: false, boost: false, brake: false };

type PressHandler = (a: PressAction) => void;
let pressHandler: PressHandler | null = null;
export const setPressHandler = (h: PressHandler | null) => {
  pressHandler = h;
};

const codeToAxis = new Map<string, AxisAction>();
const codeToPress = new Map<string, PressAction>();
for (const [action, codes] of Object.entries(KEY_BINDINGS)) {
  for (const code of codes) {
    if (["camera", "map", "pause", "interact", "reset", "photo"].includes(action)) codeToPress.set(code, action as PressAction);
    else codeToAxis.set(code, action as AxisAction);
  }
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

let gameKeysActive = false;
/** When false, keys are not captured (so menus/portfolio scroll normally). */
export const setGameKeysActive = (v: boolean) => {
  gameKeysActive = v;
  if (!v) pressed.clear();
};

export function attachInput(): () => void {
  const down = (e: KeyboardEvent) => {
    if (isTyping(e.target)) return;
    const press = codeToPress.get(e.code);
    if (press && !e.repeat) {
      // Enter on a focused button should click it, not interact.
      if (press === "interact" && e.code === "Enter" && (e.target as HTMLElement)?.tagName === "BUTTON") return;
      pressHandler?.(press);
    }
    if (!gameKeysActive) return;
    if (codeToAxis.has(e.code)) {
      pressed.add(e.code);
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    }
  };
  const up = (e: KeyboardEvent) => pressed.delete(e.code);
  const blur = () => pressed.clear();
  const move = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.inside = (e.target as HTMLElement)?.tagName === "CANVAS";
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  window.addEventListener("pointermove", move, { passive: true });
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    window.removeEventListener("pointermove", move);
  };
}

const axis = (a: AxisAction) => KEY_BINDINGS[a].some((c) => pressed.has(c));
const smooth = { pitch: 0, turn: 0, roll: 0 };
const ramp = (cur: number, target: number, dt: number) => {
  const rate = Math.abs(target) > Math.abs(cur) ? 7 : 10;
  const d = target - cur;
  const step = rate * dt;
  return Math.abs(d) <= step ? target : cur + Math.sign(d) * step;
};
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
const dz = (v: number, d = 0.12) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));

// ── Gamepad ──
const padPrev: boolean[] = [];
const PAD_PRESS: Record<number, PressAction> = { 0: "interact", 3: "camera", 8: "map", 9: "pause", 1: "reset" };

function readPad() {
  const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = Array.from(pads).find((p) => p && p.connected);
  if (!gp) return null;
  gp.buttons.forEach((b, i) => {
    const prev = padPrev[i] ?? false;
    if (b.pressed && !prev && PAD_PRESS[i]) pressHandler?.(PAD_PRESS[i]);
    padPrev[i] = b.pressed;
  });
  return {
    turn: dz(gp.axes[0] ?? 0),
    pitch: -dz(gp.axes[1] ?? 0),
    roll: (gp.buttons[5]?.pressed ? 1 : 0) - (gp.buttons[4]?.pressed ? 1 : 0),
    boost: (gp.buttons[7]?.value ?? 0) > 0.3,
    brake: (gp.buttons[6]?.value ?? 0) > 0.3,
  };
}

export function readFlightInput(dt: number, settings: Settings, out: FlightInput): FlightInput {
  const kp = (axis("pitchUp") ? 1 : 0) - (axis("pitchDown") ? 1 : 0);
  const kt = (axis("turnRight") ? 1 : 0) - (axis("turnLeft") ? 1 : 0);
  const kr = (axis("rollRight") ? 1 : 0) - (axis("rollLeft") ? 1 : 0);
  smooth.pitch = ramp(smooth.pitch, kp, dt);
  smooth.turn = ramp(smooth.turn, kt, dt);
  smooth.roll = ramp(smooth.roll, kr, dt);
  let pitch = smooth.pitch;
  let turn = smooth.turn;
  let roll = smooth.roll;
  let boost = axis("boost");
  let brake = axis("brake");

  if (settings.controlMode === "mouse" && pointer.inside) {
    const s = settings.mouseSensitivity;
    turn += dz(pointer.x * 1.7 * s, 0.05);
    pitch += dz(-pointer.y * 1.7 * s, 0.05);
  }
  if (touch.active) {
    turn += touch.x;
    pitch += touch.y;
  }
  boost ||= touch.boost;
  brake ||= touch.brake;
  const pad = readPad();
  if (pad) {
    turn += pad.turn;
    pitch += pad.pitch;
    roll += pad.roll;
    boost ||= pad.boost;
    brake ||= pad.brake;
  }
  out.pitch = clamp1(pitch) * (settings.invertPitch ? -1 : 1);
  out.turn = clamp1(turn);
  out.roll = clamp1(roll);
  out.boost = boost;
  out.brake = brake;
  return out;
}

export function anyFlightKeyHeld() {
  return pressed.size > 0 || touch.active;
}

/** Controller / phone haptics where supported. */
export function rumble(strength: number, ms = 120) {
  try {
    const pads = navigator.getGamepads?.() ?? [];
    for (const gp of pads) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const act = (gp as any)?.vibrationActuator;
      act?.playEffect?.("dual-rumble", { duration: ms, strongMagnitude: Math.min(1, strength), weakMagnitude: Math.min(1, strength * 0.6) });
    }
    if (touch.active && navigator.vibrate) navigator.vibrate(Math.round(ms * Math.min(1, strength)));
  } catch {
    /* unsupported */
  }
}
