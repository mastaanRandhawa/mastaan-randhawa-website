import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useGame } from "@/game/store";
import { Kbd } from "./kit";

type Step = { title: string; keys?: string[][]; touch?: string; hint?: string };

const STEPS: Record<number, Step> = {
  1: { title: "You're airborne — take the controls", keys: [["W", "S"], ["A", "D"]], touch: "Drag the left stick to climb, dive and turn", hint: "pitch · bank & turn" },
  2: { title: "Fly through the glowing rings", hint: "Follow the arrow and the gold marker on the compass" },
  3: { title: "Hold Shift to boost", keys: [["Shift"], ["Space"]], touch: "Use the BOOST and BRAKE buttons", hint: "boost · air brake" },
  4: { title: "Show off a little", keys: [["Q", "E"], ["C"], ["M"]], touch: "Tap the map button to see the world", hint: "barrel roll · camera · map" },
  5: { title: "Launch Airfield discovered", keys: [["F"]], touch: "Tap EXPLORE to read the briefing", hint: "open the pilot's briefing" },
};

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
    if (step !== 4 && step !== 5) return;
    const t = setTimeout(() => setStep(step === 4 ? 4 : 0), step === 5 ? 14000 : 99999);
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="pointer-events-none fixed inset-x-0 top-[18%] z-20 mx-auto w-[min(460px,calc(100vw-1.5rem))] max-sm:top-auto max-sm:bottom-[13rem]"
        >
          <div className="pointer-events-auto flex items-center justify-between gap-4 rounded-2xl bg-[#1f3552]/70 px-5 py-3 text-white shadow-2xl ring-1 ring-white/20 backdrop-blur-md">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ffcf70]">Flight school · {Math.min(step, 4)}/4</p>
              <p className="mt-0.5 text-base font-semibold">{s.title}</p>
              {isTouch && s.touch ? (
                <p className="mt-1 text-xs text-white/75">{s.touch}</p>
              ) : (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-white/75">
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
              <button onClick={skip} className="ml-2 flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] text-white/70 hover:bg-white/10 hover:text-white" aria-label="Skip tutorial">
                Skip <X size={12} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
