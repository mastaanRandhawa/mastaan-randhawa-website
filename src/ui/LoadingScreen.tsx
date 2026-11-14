import { motion } from "framer-motion";
import { useGame } from "@/game/store";
import { BRAND } from "@/config/brand";
import { portfolio } from "@/content/portfolio";

/** What the world builder is doing at a given load fraction (see GameShell). */
function stage(p: number) {
  if (p < 0.15) return "Fetching the fleet";
  if (p < 0.55) return "Raising the islands";
  if (p < 0.95) return "Planting trees";
  return "Clear for take-off";
}

const rise = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

/**
 * Launch screen in the title screen's own voice: mono legend, the bold
 * wordmark and a hairline progress bar over an open sky.
 */
export function LoadingScreen() {
  const p = useGame((s) => s.loadProgress);
  const setMode = useGame((s) => s.setMode);
  const pct = Math.round(Math.min(1, Math.max(0, p)) * 100);
  return (
    <motion.div
      className="font-sf fixed inset-0 z-50 overflow-hidden"
      style={{ background: "linear-gradient(180deg,#2f86d6 0%,#5fb3ea 38%,#a9daf2 68%,#eaf3ef 100%)" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.7 } }}
    >
      {/* Soft drifting cloud banks (stilled by reduced motion). */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-25%] top-[12%] h-[34vh] w-[70vw] animate-[drift_60s_linear_infinite]"
        style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.28), rgba(255,255,255,0))" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-30%] top-[55%] h-[40vh] w-[80vw] animate-[drift_80s_linear_infinite_reverse]"
        style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.35), rgba(255,255,255,0))" }}
      />

      <div className="safe-pad relative grid h-full place-items-center px-6">
        <div className="flex w-[min(360px,88vw)] flex-col items-center text-center">
          <motion.p custom={0} variants={rise} initial="hidden" animate="show" className="legend whitespace-nowrap text-white/80">
            A playable portfolio
            <span className="hidden sm:inline">
              <span className="mx-1.5 text-[#f2735a]">/</span> {BRAND.subtitle}
            </span>
          </motion.p>
          <motion.h1
            custom={1}
            variants={rise}
            initial="hidden"
            animate="show"
            className="font-sf-display mt-2 text-[clamp(3rem,9vw,4.6rem)] leading-[0.95] text-white drop-shadow-[0_4px_24px_rgba(13,21,35,0.25)]"
          >
            {BRAND.title.charAt(0) + BRAND.title.slice(1).toLowerCase()}
            <span className="text-[#f2735a]">.</span>
          </motion.h1>

          <motion.div custom={2} variants={rise} initial="hidden" animate="show" className="mt-9 w-full">
            <div
              className="h-[3px] w-full overflow-hidden rounded-full bg-white/30"
              role="progressbar"
              aria-label="Loading the world"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div className="h-full origin-left rounded-full bg-white transition-transform duration-300 ease-out" style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
            <div className="mt-2.5 flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-[#1f3552]/80" aria-live="polite">
              <span>{stage(p)}…</span>
              <span className="tabular min-w-[4ch] text-right">{pct}%</span>
            </div>
          </motion.div>

          <motion.button
            custom={3}
            variants={rise}
            initial="hidden"
            animate="show"
            onClick={() => setMode("portfolio")}
            className="hit-area mt-10 rounded-full px-4 py-2 text-[14px] font-medium text-[#1f3552]/80 underline decoration-[#1f3552]/25 underline-offset-4 transition-colors hover:text-[#1f3552] hover:decoration-[#f2735a]"
          >
            Skip to {portfolio.profile.firstName}'s portfolio
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
