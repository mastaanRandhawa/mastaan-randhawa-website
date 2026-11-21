import { type ReactNode } from "react";
import { motion, MotionConfig, useScroll, useSpring, type HTMLMotionProps, type Variants } from "motion/react";

/**
 * Shared motion language for the portfolio (motion.dev): one easing curve, short
 * distances, content that settles into place as it scrolls into view, once.
 */

/** Soft "expo out": quick start, long gentle settle. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Wrap the page once so every motion component shares timing. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig transition={{ duration: 0.7, ease: EASE }} reducedMotion="never">
      {children}
    </MotionConfig>
  );
}

const VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -8% 0px" } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

type RevealProps = HTMLMotionProps<"div"> & { delay?: number; y?: number };

/** Fades and lifts its content in when it scrolls into view. */
export function Reveal({ delay = 0, y = 18, children, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.7, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

type StaggerProps = HTMLMotionProps<"div"> & { gap?: number; delay?: number; /** Animate on mount instead of on scroll. */ immediate?: boolean };

/** Parent that reveals its <StaggerItem> children one after another. */
export function Stagger({ gap = 0.08, delay = 0, immediate = false, children, ...rest }: StaggerProps) {
  const variants: Variants = { hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } };
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      {...(immediate ? { animate: "show" } : { whileInView: "show", viewport: VIEWPORT })}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={fadeUp} {...rest}>
      {children}
    </motion.div>
  );
}

/** Thin bar under the header that tracks how far down the page you are. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-accent-blue dark:bg-[#7d8aff]"
      style={{ scaleX }}
    />
  );
}
