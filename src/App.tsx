import { lazy, Suspense, useEffect, useState } from "react";
import { useGame } from "@/game/store";
import PortfolioView from "@/portfolio/PortfolioView";
import { GameErrorBoundary } from "@/ui/ErrorBoundary";

const GameShell = lazy(() => import("@/ui/GameShell"));

/** Old section anchors stay valid: they open the classic portfolio at that section. */
const SECTION_IDS = ["portfolio", "skills", "experience", "certifications", "education", "about", "contact", "resume"];

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function wantsPortfolio(): boolean {
  const hash = window.location.hash.replace("#", "");
  const params = new URLSearchParams(window.location.search);
  return SECTION_IDS.includes(hash) || params.get("view") === "portfolio";
}

export default function App() {
  const mode = useGame((s) => s.mode);
  const setMode = useGame((s) => s.setMode);
  const [gameRequested, setGameRequested] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const webgl = useState(() => hasWebGL())[0];

  useEffect(() => {
    useGame.setState({ webglOk: webgl });
    if (!webgl || wantsPortfolio()) setMode("portfolio");
    else setGameRequested(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode !== "portfolio") setGameRequested(true);
    document.documentElement.classList.toggle("game-mode", mode !== "portfolio");
  }, [mode]);

  return (
    <>
      {mode === "portfolio" && <PortfolioView onFly={webgl && !crashed ? () => setMode(gameRequested ? "title" : "loading") : undefined} />}
      {gameRequested && webgl && !crashed && (
        <GameErrorBoundary
          onFail={() => {
            setCrashed(true);
            setMode("portfolio");
          }}
        >
          <Suspense fallback={mode === "portfolio" ? null : <BootScreen />}>
            <GameShell hidden={mode === "portfolio"} />
          </Suspense>
        </GameErrorBoundary>
      )}
    </>
  );
}

function BootScreen() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-[#f4cfa8]">
      <p className="font-mono text-xs tracking-[0.3em] text-[#1f3552]/70">LOADING</p>
    </div>
  );
}
