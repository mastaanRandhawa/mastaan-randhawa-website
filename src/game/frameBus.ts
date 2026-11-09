import type { Camera } from "three";

/** Per-frame listeners for DOM overlays that update without React re-renders. */
type Listener = (camera: Camera, dt: number) => void;
const listeners = new Set<Listener>();

export function onFrame(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function emitFrame(camera: Camera, dt: number) {
  for (const l of listeners) l(camera, dt);
}
