import { AnimatePresence, motion } from "framer-motion";
import { Award, BookOpen, Compass, Flag, Info, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { audio } from "@/game/audio";

const ICON = { region: Compass, achievement: Award, collectible: BookOpen, course: Flag, info: Info, skin: Sparkles };

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const last = toasts[toasts.length - 1];
  useEffect(() => {
    if (last?.kind === "achievement" || last?.kind === "skin") audio.play("achievement");
  }, [last?.id, last?.kind]);
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-40 flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICON[t.kind];
          const accent = t.accent ?? (t.kind === "achievement" ? "#e6b64c" : t.kind === "collectible" ? "#ffc65a" : "#3fb8af");
          const big = t.kind === "region";
          return (
            <motion.div
              key={t.id}
              layout={!reduced}
              initial={{ opacity: 0, x: reduced ? 0 : 40, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: reduced ? 0 : 30, transition: { duration: 0.25 } }}
              className="flex items-start gap-3 rounded-2xl bg-[#fbf6ec]/95 p-3 pr-4 text-[#1f3552] shadow-[0_16px_40px_-16px_rgba(31,53,82,0.6)] ring-1 ring-[#1f3552]/10 backdrop-blur"
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${accent}22`, color: accent }}>
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                {t.kind === "achievement" && <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b88a1c]">Achievement unlocked</p>}
                {big && <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>{t.body}</p>}
                <p className={big ? "font-serif text-xl italic leading-tight" : "text-sm font-semibold leading-snug"}>{t.title}</p>
                {!big && t.body && <p className="text-xs leading-snug text-[#1f3552]/70">{t.body}</p>}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
