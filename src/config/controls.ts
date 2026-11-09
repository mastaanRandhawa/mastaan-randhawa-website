/** Configurable key bindings (KeyboardEvent.code values). */
export type AxisAction = "pitchUp" | "pitchDown" | "turnLeft" | "turnRight" | "rollLeft" | "rollRight" | "boost" | "brake";
export type PressAction = "camera" | "map" | "pause" | "interact" | "reset" | "photo";

export const KEY_BINDINGS: Record<AxisAction | PressAction, string[]> = {
  // Flight-stick convention: pull back (S / ↓) to climb, push forward (W / ↑) to dive.
  pitchUp: ["KeyS", "ArrowDown"],
  pitchDown: ["KeyW", "ArrowUp"],
  turnLeft: ["KeyA", "ArrowLeft"],
  turnRight: ["KeyD", "ArrowRight"],
  rollLeft: ["KeyQ"],
  rollRight: ["KeyE"],
  boost: ["ShiftLeft", "ShiftRight"],
  brake: ["Space"],
  camera: ["KeyC"],
  map: ["KeyM"],
  pause: ["Escape", "KeyP"],
  interact: ["KeyF", "Enter"],
  reset: ["KeyR"],
  photo: ["KeyO"],
};

export const CONTROL_HELP: { keys: string[]; label: string }[] = [
  { keys: ["S"], label: "Climb (pull back)" },
  { keys: ["W"], label: "Dive (push forward)" },
  { keys: ["A", "D"], label: "Bank & turn" },
  { keys: ["Q", "E"], label: "Roll" },
  { keys: ["Shift"], label: "Boost" },
  { keys: ["Space"], label: "Air brake" },
  { keys: ["F"], label: "Interact" },
  { keys: ["M"], label: "World map" },
  { keys: ["C"], label: "Camera" },
  { keys: ["R"], label: "Reset to checkpoint" },
  { keys: ["O"], label: "Photo mode" },
  { keys: ["Esc"], label: "Pause" },
];
