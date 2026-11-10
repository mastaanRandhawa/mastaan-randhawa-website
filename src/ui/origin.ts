import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Origin-aware entrances: remembers where the last pointer press happened so a
 * dialog opened by that press can grow out of its trigger. Keyboard-opened
 * dialogs (no recent press) grow from their own centre.
 */
const last = { x: 0, y: 0, t: -Infinity };
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => {
      last.x = e.clientX;
      last.y = e.clientY;
      last.t = performance.now();
    },
    { capture: true, passive: true },
  );
}

/** CSS transform-origin (in the element's own box) pointing at the press that opened it. */
export function useTriggerOrigin(ref: RefObject<HTMLElement>, maxAgeMs = 700): string {
  const [origin, setOrigin] = useState("50% 50%");
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || performance.now() - last.t > maxAgeMs) return;
    const r = el.getBoundingClientRect();
    // Clamp just outside the box so far-away triggers still read as "from that side".
    const x = Math.max(-40, Math.min(r.width + 40, last.x - r.left));
    const y = Math.max(-40, Math.min(r.height + 40, last.y - r.top));
    setOrigin(`${Math.round(x)}px ${Math.round(y)}px`);
    // Measured once, at open: later presses must not move a dialog's origin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return origin;
}
