import { useEffect, useState } from "react";
import { Plane } from "lucide-react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Portfolio from "@/components/Portfolio";
import Skills from "@/components/Skills";
import Experience from "@/components/Experience";
import Certifications from "@/components/Certifications";
import Education from "@/components/Education";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Resume from "@/components/Resume";
import Footer from "@/components/Footer";
import { BRAND } from "@/config/brand";
import { useGame } from "@/game/store";

type Theme = "light" | "dark";

/**
 * The conventional portfolio: the original site's sections, now reading from
 * the shared content model. Always reachable, and the fallback when WebGL is
 * unavailable.
 */
export default function PortfolioView({ onFly }: { onFly?: () => void }) {
  const webglOk = useGame((s) => s.webglOk);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem("theme") as Theme | null) ?? "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => () => document.documentElement.classList.remove("dark"), []);

  // Honour deep links like /#experience once the sections exist.
  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
    else window.scrollTo(0, 0);
  }, []);

  const title = BRAND.title.charAt(0) + BRAND.title.slice(1).toLowerCase();

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors duration-300">
      <Header theme={theme} onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))} onFly={onFly} />
      <main>
        <Hero />
        {onFly ? (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 mb-6">
            <button
              onClick={onFly}
              className="group flex w-full items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#3d78b8] to-[#f2a541] p-4 sm:p-5 text-left text-white shadow-lg transition hover:shadow-xl"
            >
              <span>
                <span className="block font-mono text-[11px] uppercase tracking-[0.25em] text-white/80">{BRAND.tagline}</span>
                <span className="block font-serif italic text-2xl sm:text-3xl">
                  {title} — {BRAND.subtitle}
                </span>
                <span className="block text-sm text-white/85">Fly a little plane between floating islands that hold every project on this page.</span>
              </span>
              <Plane className="shrink-0 transition-transform group-hover:translate-x-1" size={28} />
            </button>
          </div>
        ) : (
          !webglOk && (
            <p className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 mb-6 font-mono text-xs text-zinc-500">
              The interactive 3D version ({title}) needs WebGL, which isn't available in this browser — everything is right here instead.
            </p>
          )
        )}
        <Portfolio />
        <Skills />
        <Experience />
        <Certifications />
        <Education />
        <About />
        <Contact />
        <Resume />
      </main>
      <Footer />
    </div>
  );
}
