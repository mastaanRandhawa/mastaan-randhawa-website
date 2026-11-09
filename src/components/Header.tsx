import { useState, useEffect, useRef } from "react";
import { Menu, X, Moon, Sun, Plane, ChevronDown, FileText } from "lucide-react";
import { portfolio } from "@/content/portfolio";

type HeaderProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onFly?: () => void;
};

/** The pages most visitors want, always visible. */
const primaryLinks = [
  { label: "Work", href: "#portfolio" },
  { label: "Experience", href: "#experience" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

/** Less-frequent sections live under "More" (and in the footer). */
export const secondaryLinks = [
  { label: "Skills", href: "#skills" },
  { label: "Certifications", href: "#certifications" },
  { label: "Education", href: "#education" },
  { label: "Resume", href: "#resume" },
];

const linkClass = "font-mono text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors relative group";

export default function Header({ theme, onToggleTheme, onFly }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      if (menuOpen) setMenuOpen(false);
      if (moreOpen) setMoreOpen(false);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen, moreOpen]);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md shadow-sm border-b border-zinc-200 dark:border-zinc-800" : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        <a href="#" className="font-mono font-bold text-lg tracking-tight text-zinc-900 dark:text-white hover:text-accent-blue transition-colors">
          MR<span className="text-accent-blue">.</span>
        </a>

        {/* Desktop nav: four primary links + More */}
        <ul className="hidden md:flex items-center gap-6 lg:gap-8">
          {primaryLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={linkClass}>
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-accent-blue group-hover:w-full transition-all duration-300" />
              </a>
            </li>
          ))}
          <li ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`${linkClass} inline-flex items-center gap-1`}
            >
              More <ChevronDown size={14} className={`transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            <div
              role="menu"
              className={`absolute right-0 top-full mt-3 w-48 origin-top-right rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-1.5 shadow-lg transition-all duration-200 ${
                moreOpen ? "opacity-100 scale-100 translate-y-0" : "pointer-events-none opacity-0 scale-95 -translate-y-1"
              }`}
            >
              {secondaryLinks.map((link) => (
                <a
                  key={link.href}
                  role="menuitem"
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className="block rounded-lg px-3 py-2 font-mono text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </li>
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={portfolio.profile.links.resume}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 px-3.5 py-1.5 font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-accent-blue hover:text-accent-blue transition-colors"
          >
            <FileText size={13} /> Résumé
          </a>
          {onFly && (
            <button
              onClick={onFly}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f2735a] px-3.5 py-1.5 font-mono text-xs font-semibold text-white shadow-sm transition hover:bg-[#e8624a]"
            >
              <Plane size={14} /> <span className="hidden sm:inline">Fly the 3D version</span>
              <span className="sm:hidden">Fly</span>
            </button>
          )}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center text-zinc-700 dark:text-zinc-300"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu: primary links, then the rest */}
      <div
        className={`md:hidden overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 transition-[max-height,opacity] duration-300 ${
          menuOpen ? "max-h-[28rem] opacity-100 border-b" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 py-4">
          <ul className="flex flex-col gap-3.5">
            {primaryLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setMenuOpen(false)} className="block font-mono text-base text-zinc-800 dark:text-zinc-200 hover:text-accent-blue transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            {secondaryLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="font-mono text-sm text-zinc-500 dark:text-zinc-400 hover:text-accent-blue transition-colors">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
