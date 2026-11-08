import { useEffect, useRef, useState } from "react";
import { touch } from "@/game/input";
import { useGame } from "@/game/store";
import { destinationById } from "@/world/world";
import { panelFor } from "./panels/panelFor";

/** Virtual flight stick + action buttons (pointer events, no page scroll). */
export function MobileControls() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const nearby = useGame((s) => s.nearby);
  const card = useGame((s) => s.discoveryCard);
  const id = useRef<number | null>(null);

  useEffect(() => () => {
    touch.active = false;
    touch.x = touch.y = 0;
    touch.boost = touch.brake = false;
  }, []);

  const update = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const R = r.width / 2;
    let dx = (e.clientX - (r.left + R)) / R;
    let dy = (e.clientY - (r.top + R)) / R;
    const l = Math.hypot(dx, dy);
    if (l > 1) {
      dx /= l;
      dy /= l;
    }
    setKnob({ x: dx * R * 0.6, y: dy * R * 0.6 });
    touch.x = dx;
    touch.y = -dy;
  };

  const hold = (key: "boost" | "brake") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      touch[key] = true;
    },
    onPointerUp: () => (touch[key] = false),
    onPointerCancel: () => (touch[key] = false),
  });

  const explore = () => {
    const d = destinationById(nearby ?? card ?? "");
    if (d) useGame.getState().openPanel(panelFor(d));
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none" style={{ touchAction: "none" }}>
      <div
        ref={base}
        className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.5rem,env(safe-area-inset-left))] h-36 w-36 rounded-full bg-white/10 ring-2 ring-white/30 backdrop-blur-sm"
        onPointerDown={(e) => {
          id.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          touch.active = true;
          update(e);
        }}
        onPointerMove={(e) => id.current === e.pointerId && update(e)}
        onPointerUp={() => {
          id.current = null;
          touch.active = false;
          touch.x = touch.y = 0;
          setKnob({ x: 0, y: 0 });
        }}
        aria-label="Flight stick"
        role="slider"
        aria-valuenow={0}
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 shadow-lg" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
      </div>
      <div className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] flex flex-col items-end gap-3">
        {(nearby || card) && (
          <button onClick={explore} className="rounded-full bg-[#f2735a] px-5 py-3 font-mono text-xs font-bold text-white shadow-lg">
            EXPLORE
          </button>
        )}
        <div className="flex gap-3">
          <button {...hold("brake")} className="h-16 w-16 rounded-full bg-[#1f3552]/60 font-mono text-[10px] font-bold text-white ring-2 ring-white/30">
            BRAKE
          </button>
          <button {...hold("boost")} className="h-20 w-20 rounded-full bg-[#ffcf70]/90 font-mono text-[11px] font-bold text-[#1f3552] ring-2 ring-white/50">
            BOOST
          </button>
        </div>
      </div>
    </div>
  );
}
