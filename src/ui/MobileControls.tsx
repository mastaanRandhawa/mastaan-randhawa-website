import { useEffect, useRef, useState } from "react";
import { Gauge, Zap } from "lucide-react";
import { touch } from "@/game/input";
import { useGame } from "@/game/store";
import { destinationById } from "@/world/world";
import { panelFor } from "./panels/panelFor";
import { startVisit } from "@/game/visit";

/** Virtual flight stick + action buttons (pointer events, no page scroll). */
export function MobileControls() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const nearby = useGame((s) => s.nearby);
  const card = useGame((s) => s.discoveryCard);
  const id = useRef<number | null>(null);

  useEffect(
    () => () => {
      touch.active = false;
      touch.x = touch.y = 0;
      touch.boost = touch.brake = false;
    },
    [],
  );

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
    touch.y = dy; // pull the stick down/back to climb
  };

  const hold = (key: "boost" | "brake") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      touch[key] = true;
    },
    onPointerUp: () => (touch[key] = false),
    onPointerCancel: () => (touch[key] = false),
    onLostPointerCapture: () => (touch[key] = false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  // Recentre on lift-off, and also when the OS steals the touch (call, notification, gesture).
  const release = () => {
    id.current = null;
    touch.active = false;
    touch.x = touch.y = 0;
    setKnob({ x: 0, y: 0 });
  };

  const explore = () => {
    const d = destinationById(nearby ?? card ?? "");
    if (d && !startVisit(d.id)) useGame.getState().openPanel(panelFor(d));
  };

  return (
    <div className="font-sf pointer-events-none fixed inset-0 z-10 select-none" style={{ touchAction: "none" }}>
      <div
        ref={base}
        className="mat-dark pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-[max(1.5rem,env(safe-area-inset-left))] h-36 w-36 rounded-full short:bottom-[max(1rem,env(safe-area-inset-bottom))] short:h-28 short:w-28"
        onPointerDown={(e) => {
          id.current = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          touch.active = true;
          update(e);
        }}
        onPointerMove={(e) => id.current === e.pointerId && update(e)}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        aria-label="Flight stick"
        role="slider"
        aria-valuenow={0}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 rounded-full bg-white short:h-11 short:w-11 shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>
      <div className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] flex flex-col items-end gap-3 short:bottom-[max(1rem,env(safe-area-inset-bottom))] short:gap-2">
        {(nearby || card) && (
          <button onClick={explore} className="h-11 max-w-[11rem] truncate rounded-full bg-[#6fb7e0] px-5 text-[15px] font-semibold text-white shadow-lg">
            Land at {destinationById(nearby ?? card ?? "")?.label ?? "island"}
          </button>
        )}
        <div className="flex items-end gap-3">
          <button {...hold("brake")} className="mat-dark grid h-16 w-16 place-items-center short:h-14 short:w-14 rounded-full text-[11px] font-semibold text-white">
            <Gauge size={20} />
            Brake
          </button>
          <button {...hold("boost")} className="grid h-20 w-20 place-items-center rounded-full bg-[#f2735a] short:h-16 short:w-16 text-[12px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(255,159,10,0.8)]">
            <Zap size={22} fill="white" />
            Boost
          </button>
        </div>
      </div>
    </div>
  );
}
