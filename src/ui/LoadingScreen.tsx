import { motion } from "framer-motion";
import { useGame } from "@/game/store";
import { BRAND } from "@/config/brand";
import { portfolio } from "@/content/portfolio";

export function LoadingScreen() {
  const p = useGame((s) => s.loadProgress);
  const setMode = useGame((s) => s.setMode);
  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-gradient-to-b from-[#3d78b8] via-[#9cc3e3] to-[#f4cfa8]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      role="status"
      aria-live="polite"
    >
      <div className="flex w-[min(360px,80vw)] flex-col items-center text-center">
        <svg viewBox="0 0 64 32" className="mb-6 h-10 w-20 animate-[float_3s_ease-in-out_infinite] text-white" aria-hidden>
          <path d="M4 18 L28 16 L34 6 L38 6 L36 16 L58 15 Q62 16 58 18 L36 18 L38 28 L34 28 L28 19 Z" fill="currentColor" />
        </svg>
        <p className="font-serif text-4xl italic text-white drop-shadow">{BRAND.title}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.3em] text-white/80">{BRAND.subtitle}</p>
        <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-white/30">
          <div className="h-full rounded-full bg-white transition-[width] duration-300" style={{ width: `${Math.round(p * 100)}%` }} />
        </div>
        <p className="mt-3 font-mono text-[11px] text-[#1f3552]/70">Shaping islands… {Math.round(p * 100)}%</p>
        <button onClick={() => setMode("portfolio")} className="mt-8 font-mono text-[11px] text-[#1f3552]/70 underline underline-offset-4 hover:text-[#1f3552]">
          Skip — view {portfolio.profile.firstName}'s portfolio instead
        </button>
      </div>
    </motion.div>
  );
}
