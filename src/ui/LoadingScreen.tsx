import { motion } from "framer-motion";
import { useGame } from "@/game/store";
import { BRAND } from "@/config/brand";
import { portfolio } from "@/content/portfolio";

/** Launch screen: app icon, name and a thin progress bar. */
export function LoadingScreen() {
  const p = useGame((s) => s.loadProgress);
  const setMode = useGame((s) => s.setMode);
  return (
    <motion.div
      className="font-sf fixed inset-0 z-50 grid place-items-center bg-gradient-to-b from-[#2f6fb8] via-[#8fbde3] to-[#f4cfa8]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.7 } }}
      role="status"
      aria-live="polite"
    >
      <div className="flex w-[min(300px,80vw)] flex-col items-center text-center">
        <div className="grid h-[92px] w-[92px] place-items-center rounded-[12px] bg-gradient-to-b from-[#5aa9ff] to-[#2b5c8a] shadow-[0_18px_40px_-12px_rgba(0,64,160,0.6),inset_0_1px_0_rgba(255,255,255,0.4)]">
          <svg viewBox="0 0 64 32" className="h-9 w-[4.5rem] animate-[float_3s_ease-in-out_infinite] text-white" aria-hidden>
            <path d="M4 18 L28 16 L34 6 L38 6 L36 16 L58 15 Q62 16 58 18 L36 18 L38 28 L34 28 L28 19 Z" fill="currentColor" />
          </svg>
        </div>
        <p className="font-sf-display mt-5 text-[28px] font-bold text-white drop-shadow">{BRAND.title.charAt(0) + BRAND.title.slice(1).toLowerCase()}</p>
        <div className="mt-6 h-[5px] w-full overflow-hidden rounded-full bg-white/35">
          <div className="h-full rounded-full bg-white transition-[width] duration-300" style={{ width: `${Math.round(p * 100)}%` }} />
        </div>
        <p className="mt-3 text-[13px] font-medium text-[#1f3552]/70">Preparing the skies…</p>
        <button onClick={() => setMode("portfolio")} className="mt-8 text-[15px] font-medium text-[#2b5c8a] hover:opacity-70">
          View {portfolio.profile.firstName}'s portfolio instead
        </button>
      </div>
    </motion.div>
  );
}
