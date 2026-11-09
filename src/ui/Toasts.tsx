import { AnimatePresence, motion } from "framer-motion";
import { Award, BookOpen, Compass, Flag, Info, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { audio } from "@/game/audio";
import { SYSTEM } from "./kit";

const ICON = { region: Compass, achievement: Award, collectible: BookOpen, course: Flag, info: Info, skin: Sparkles };
const TINT = { region: SYSTEM.teal, achievement: SYSTEM.yellow, collectible: SYSTEM.orange, course: SYSTEM.green, info: SYSTEM.gray, skin: SYSTEM.purple };
const HEADER = { region: "Region discovered", achievement: "Achievement", collectible: "Flight log found", course: "Course", info: "Notice", skin: "Hangar" };

/** Torn-off edge for the printed slips. */
const TEAR = "polygon(0 0,100% 0,100% calc(100% - 5px),97% 100%,94% calc(100% - 5px),91% 100%,88% calc(100% - 5px),85% 100%,82% calc(100% - 5px),79% 100%,76% calc(100% - 5px),73% 100%,70% calc(100% - 5px),67% 100%,64% calc(100% - 5px),61% 100%,58% calc(100% - 5px),55% 100%,52% calc(100% - 5px),49% 100%,46% calc(100% - 5px),43% 100%,40% calc(100% - 5px),37% 100%,34% calc(100% - 5px),31% 100%,28% calc(100% - 5px),25% 100%,22% calc(100% - 5px),19% 100%,16% calc(100% - 5px),13% 100%,10% calc(100% - 5px),7% 100%,4% calc(100% - 5px),1% 100%,0 calc(100% - 5px))";

/** Printed message slips, like a cockpit printer feeding out a note. */
export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const dismiss = useGame((s) => s.dismissToast);
  const last = toasts[toasts.length - 1];
  useEffect(() => {
    if (last?.kind === "achievement" || last?.kind === "skin") audio.play("achievement");
  }, [last?.id, last?.kind]);
  return (
    <div className="font-sf pointer-events-none fixed right-4 top-[70px] z-40 flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2 max-sm:inset-x-0 max-sm:top-2 max-sm:mx-auto" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          const tint = t.kind === "region" && t.accent ? t.accent : TINT[t.kind];
          return (
            <motion.button
              key={t.id}
              layout={!reduced}
              initial={{ opacity: 0, clipPath: reduced ? "inset(0 0 0 0)" : "inset(0 0 100% 0)" }}
              animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
              exit={{ opacity: 0, x: reduced ? 0 : 24, transition: { duration: 0.2 } }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => dismiss(t.id)}
              className="pointer-events-auto text-left drop-shadow-[0_10px_18px_rgba(8,12,22,0.35)]"
            >
              <div className="mat-light flex gap-3 rounded-t-[6px] px-3.5 pb-4 pt-2.5" style={{ clipPath: TEAR }}>
                <span className="mt-0.5 w-[3px] shrink-0 self-stretch rounded-full" style={{ backgroundColor: tint }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="legend flex items-center gap-1.5 text-[9.5px]" style={{ color: tint === SYSTEM.yellow ? "#8a6418" : "#5d6b80" }}>
                      <Icon size={11} strokeWidth={2.2} style={{ color: tint }} /> {HEADER[t.kind]}
                    </span>
                    <span className="legend text-[9px] text-[#5d6b80]/70">now</span>
                  </div>
                  <p className="mt-0.5 text-[14.5px] font-semibold leading-snug text-[#1f3552]">{t.title}</p>
                  {t.body && t.kind !== "region" && <p className="text-[12.5px] leading-snug text-[#4a5a70]">{t.body}</p>}
                </div>
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
