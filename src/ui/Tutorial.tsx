import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, X } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { Kbd } from "./kit";

type Step = { title: string; keys?: string[][]; touch?: string; hint?: string };

const STEPS: Record<number, Step> = {
  1: { title: "You're airborne. Take the controls.", keys: [["S", "W"], ["A", "D"]], touch: "Pull the stick back to climb, push it forward to dive.", hint: "S climbs · W dives · A/D bank and turn" },
  2: { title: "Fly through the glowing rings", hint: "Follow the blue arrow and the dot on the compass." },
  3: { title: "Hold Shift to boost", keys: [["Shift"], ["Space"]], touch: "Use the Boost and Brake buttons.", hint: "boost · air brake" },
  4: { title: "Show off a little", keys: [["Q", "E"], ["C"], ["M"]], touch: "Tap the map button to see the world.", hint: "barrel roll · camera · map" },
  5: { title: "Launch Airfield discovered", keys: [["F"]], touch: "Tap Explore to read the briefing.", hint: "open the pilot's briefing" },
};

/** TipKit-style hints. */
export function Tutorial() {
  const step = useGame((s) => s.tutorialStep);
  const setStep = useGame((s) => s.setTutorialStep);
  const isTouch = useGame((s) => s.isTouch);
  const panel = useGame((s) => s.panel);
  const viewedAbout = useGame((s) => s.progress.viewed.includes("about"));
  const s = STEPS[step];

  useEffect(() => {
    if (step === 5 && viewedAbout) setStep(0);
  }, [step, viewedAbout, setStep]);
  useEffect(() => {
    if (step !== 5) return;
    const t = setTimeout(() => setStep(0), 14000);
    return () => clearTimeout(t);
  }, [step, setStep]);

  const skip = () => {
    useGame.getState().setTutorialDone();
    useGame.getState().setCourse(null);
    setStep(0);
  };

  return (
    <AnimatePresence>
      {s && !panel && (
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="font-sf pointer-events-none fixed inset-x-0 top-[17%] z-20 mx-auto w-[min(440px,calc(100vw-1.5rem))] max-sm:bottom-[13rem] max-sm:top-auto"
        >
          <div className="mat-dark pointer-events-auto flex items-start gap-3 rounded-[12px] p-4 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e6b64c]/20 text-[#e6b64c]">
              <Lightbulb size={18} strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-white/55">Flight School · {Math.min(step, 4)} of 4</p>
              <p className="text-[17px] font-semibold leading-snug">{s.title}</p>
              {isTouch && s.touch ? (
                <p className="mt-1 text-[14px] text-white/70">{s.touch}</p>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-white/70">
                  {s.keys?.map((g, i) => (
                    <span key={i} className="flex gap-1">
                      {g.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  ))}
                  <span>{s.hint}</span>
                </div>
              )}
            </div>
            {step < 5 && (
              <button onClick={skip} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 text-white/80 hover:bg-white/25" aria-label="Skip tutorial" title="Skip tutorial">
                <X size={14} strokeWidth={2.6} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
