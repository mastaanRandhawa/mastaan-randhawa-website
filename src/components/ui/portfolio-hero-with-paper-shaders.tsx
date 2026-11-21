import type { ReactNode } from "react";
import { Dithering, type DitheringProps } from "@paper-design/shaders-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { EASE } from "@/components/ui/motion";

type ShaderOptions = Partial<
  Pick<DitheringProps, "shape" | "type" | "pxSize" | "scale" | "rotation" | "speed" | "offsetX" | "offsetY">
>;

export type PortfolioHeroProps = {
  /** Text side of the hero (name, role, links…). */
  children: ReactNode;
  /** Follows the site's theme instead of keeping its own toggle. */
  isDark: boolean;
  /** Dithering colours per theme; the background should match the page so the panel blends in. */
  colors?: {
    light: { back: string; front: string };
    dark: { back: string; front: string };
  };
  shader?: ShaderOptions;
  className?: string;
  /** Classes for the text column. */
  contentClassName?: string;
};

const DEFAULT_COLORS = {
  light: { back: "#ffffff", front: "#0015ff" },
  dark: { back: "#09090b", front: "#5c6cff" },
};

/**
 * Split hero: content on the left, an animated dithering shader on the right.
 * Adapted from the "portfolio hero with paper shaders" component: the theme now
 * comes from the page, the content is passed in, and on small screens the shader
 * becomes a band under the text. The shader fades into the page at the bottom so
 * the next section continues from it.
 */
export default function PortfolioHero({
  children,
  isDark,
  colors = DEFAULT_COLORS,
  shader,
  className,
  contentClassName,
}: PortfolioHeroProps) {
  const palette = isDark ? colors.dark : colors.light;

  return (
    <section className={cn("relative grid grid-cols-1 lg:grid-cols-2 lg:min-h-[100svh]", className)}>
      <div className={cn("relative z-10 flex flex-col", contentClassName)}>{children}</div>

      {/* Phones: the shader leads, under the header, like a cover image. Desktop: right half. */}
      <motion.div
        className="relative order-first lg:order-none mt-14 sm:mt-16 h-[38svh] min-h-[240px] lg:h-auto lg:min-h-0 overflow-hidden"
        aria-hidden="true"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
      >
        <Dithering
          style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
          colorBack={palette.back}
          colorFront={palette.front}
          shape="sphere"
          type="4x4"
          pxSize={3}
          scale={0.8}
          {...shader}
          speed={shader?.speed ?? 0.15}
        />
        {/* Soft edge into the page below: the text on phones, the next section on desktop. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 lg:h-32 bg-gradient-to-t from-white dark:from-zinc-950 to-transparent" />
      </motion.div>
    </section>
  );
}
