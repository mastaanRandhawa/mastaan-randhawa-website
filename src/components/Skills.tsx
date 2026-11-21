import type { CSSProperties } from "react";
import { Gravity, MatterBody } from "@/components/ui/gravity";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { portfolio as content } from "@/content/portfolio";
import SectionHeading from "./SectionHeading";

type Skill = {
  name: string;
  color: string;
  textColor: string;
  x: string;
  y: string;
  shape: "pill" | "squircle" | "sharp" | "blob" | "circle" | "tag";
  angle?: number;
};

const SHAPES: Skill["shape"][] = ["squircle", "pill", "blob", "sharp", "circle", "tag"];
// Positions are generated from the shared content model: one band per category.
const skills: Skill[] = content.skillCategories.flatMap((cat, row) =>
  cat.skills.map((sk, i) => {
    const perRow = 6;
    const r = row * 2 + Math.floor(i / perRow);
    const col = i % perRow;
    return {
      name: sk.name,
      color: sk.color,
      textColor: sk.textColor,
      x: `${8 + col * 15 + (r % 2) * 6}%`,
      y: `${4 + r * 11}%`,
      shape: SHAPES[(i + row) % SHAPES.length],
      angle: ((i * 37 + row * 11) % 17) - 8,
    };
  }),
);

const shapeClass: Record<Skill["shape"], string> = {
  pill:      "rounded-full px-4 py-2 sm:px-5 sm:py-2.5",
  squircle:  "rounded-xl px-4 py-2 sm:px-5 sm:py-2.5",
  sharp:     "rounded-md px-4 py-2 sm:px-5 sm:py-2.5",
  blob:      "rounded-[40%_60%_55%_45%/45%_55%_60%_40%] px-4 py-2.5 sm:px-5 sm:py-3",
  circle:    "rounded-full p-3 sm:p-4 aspect-square flex items-center justify-center text-center",
  tag:       "rounded-sm rounded-tl-2xl rounded-br-2xl px-4 py-2 sm:px-5 sm:py-2.5",
};

function rgb(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}

function isLight(hex: string) {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

/** Light text gets a dark halo and dark text a light one, so labels stay readable over the gradient. */
function labelShadow(textColor: string) {
  return isLight(textColor) ? "0 1px 2px rgba(0,0,0,0.45)" : "0 0 3px rgba(255,255,255,0.5)";
}

/** Small deterministic hash, so each skill keeps the same gradient direction on every visit. */
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The skill's colour with one light-to-dark gradient over it at 30% opacity. No texture, no animation. */
function bubbleStyle(skill: Skill): CSSProperties {
  const angle = hash(skill.name) % 360;
  return {
    backgroundColor: skill.color,
    backgroundImage: `linear-gradient(${angle}deg, rgba(255,255,255,0.3), rgba(0,0,0,0.3))`,
    color: skill.textColor,
    textShadow: labelShadow(skill.textColor),
  };
}

const categories = content.skillCategories.map((c) => ({ label: c.label, color: c.color }));

export default function Skills() {
  return (
    <section id="skills" className="py-16 sm:py-24 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <SectionHeading n="02" title="Skills">
          What I've actually used, at work or in the projects above. They're physics objects, so you can pick them up and throw them.
        </SectionHeading>

        {/* Legend */}
        <Stagger gap={0.06} className="flex flex-wrap gap-3 sm:gap-4 mb-5 sm:mb-6">
          {categories.map((cat) => (
            <StaggerItem key={cat.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{cat.label}</span>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Physics container — taller on larger screens, touch-friendly sizing on mobile */}
        <Reveal y={0} className="relative w-full h-[460px] sm:h-[500px] lg:h-[560px] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
          <Gravity gravity={{ x: 0, y: 0.35 }} className="w-full h-full">
            {skills.map((skill) => (
              <MatterBody
                key={skill.name}
                matterBodyOptions={{
                  friction: 0.6,
                  restitution: 0.4,
                  density: 0.0008,
                  frictionAir: 0.04,
                }}
                x={skill.x}
                y={skill.y}
                angle={skill.angle ?? 0}
              >
                <div
                  className={`font-mono text-xs sm:text-sm font-bold whitespace-nowrap select-none shadow-sm touch-none ring-1 ring-inset ring-white/10 ${shapeClass[skill.shape]}`}
                  style={bubbleStyle(skill)}
                >
                  {skill.name}
                </div>
              </MatterBody>
            ))}
          </Gravity>
        </Reveal>
      </div>
    </section>
  );
}
