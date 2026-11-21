import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { MotionProvider, ScrollProgress } from "@/components/ui/motion";
import Hero from "@/components/Hero";
import SkyboundCard from "@/components/SkyboundCard";
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
      return (localStorage.getItem("theme") as Theme | null) ?? "dark";
    } catch {
      return "dark";
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
    <MotionProvider>
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white transition-colors duration-300">
      <ScrollProgress />
      <Header theme={theme} onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))} onFly={onFly} />
      <main>
        <Hero isDark={theme === "dark"} />
        {onFly ? (
          <SkyboundCard onFly={onFly} />
        ) : (
          !webglOk && (
            <p className="max-w-6xl mx-auto px-4 sm:px-6 mt-2 mb-6 font-mono text-xs text-zinc-500">
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
    </MotionProvider>
  );
}
