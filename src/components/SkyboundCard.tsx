import { Dithering } from "@paper-design/shaders-react";
import { ArrowRight, Plane } from "lucide-react";

import { BRAND } from "@/config/brand";
import { Reveal } from "@/components/ui/motion";

const NAVY = "#0d1b3e";
const CORAL = "#f2735a";

/**
 * Invitation to the flyable version, between the hero and the projects.
 * Same dithering as the hero, in the game's coral, so the two read as a pair.
 */
export default function SkyboundCard({ onFly }: { onFly: () => void }) {
  const title = BRAND.title.charAt(0) + BRAND.title.slice(1).toLowerCase();

  return (
    <Reveal className="max-w-6xl mx-auto px-4 sm:px-6 mb-16 sm:mb-20">
      <button
        onClick={onFly}
        className="group relative grid w-full overflow-hidden rounded-3xl text-left text-white shadow-[0_24px_60px_-28px_rgba(13,27,62,0.65)] ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-0.5 md:grid-cols-[1.25fr_1fr]"
        style={{ backgroundColor: NAVY }}
      >
        {/* Shader: a band on top on phones, the right side from md up; fades into the navy. */}
        <span className="relative block h-36 md:order-last md:h-auto md:min-h-[15rem]" aria-hidden="true">
          <Dithering
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            colorBack={NAVY}
            colorFront={CORAL}
            shape="warp"
            type="4x4"
            pxSize={3}
            scale={0.9}
            speed={0.25}
          />
          <span className="absolute z-10 inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0d1b3e] to-[#0d1b3e]/0 md:inset-y-0 md:-left-px md:right-auto md:h-auto md:w-40 md:bg-gradient-to-r" />
          <Plane
            size={30}
            className="absolute z-10 right-6 top-6 md:right-8 md:top-8 text-white drop-shadow transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-2"
          />
        </span>

        <span className="relative flex flex-col justify-center gap-4 p-6 sm:p-8 md:p-10">
          <span className="font-instrument text-[11px] uppercase tracking-[0.25em] text-[#ff9a85]">{BRAND.tagline}</span>
          <span className="font-serif font-bold text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            {title}
            <span className="block text-white/60">{BRAND.subtitle}</span>
          </span>
          <span className="max-w-md text-sm sm:text-base leading-relaxed text-white/75">
            Fly a little plane between floating islands that hold every project on this page.
          </span>
          <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-[#f2735a] px-5 py-2.5 text-sm font-semibold text-white transition-colors group-hover:bg-[#ff8c75]">
            Take off
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </span>
      </button>
    </Reveal>
  );
}
