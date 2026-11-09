import { Gravity, MatterBody } from "@/components/ui/gravity";
import { portfolio as content } from "@/content/portfolio";

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

const categories = content.skillCategories.map((c) => ({ label: c.label, color: c.color }));

export default function Skills() {
  return (
    <section id="skills" className="py-16 sm:py-24 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-4">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            Technical Skills
          </span>
          <h2 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl text-zinc-900 dark:text-white mt-2 mb-4">
            My Toolkit
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl mb-5 sm:mb-6">
            A comprehensive overview of my technical expertise. Grab and toss the skill pills around!
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-5 sm:mb-6">
          {categories.map((cat) => (
            <div key={cat.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{cat.label}</span>
            </div>
          ))}
        </div>

        {/* Physics container — taller on larger screens, touch-friendly sizing on mobile */}
        <div className="relative w-full h-[460px] sm:h-[500px] lg:h-[560px] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
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
                  className={`font-mono text-xs sm:text-sm font-medium whitespace-nowrap select-none shadow-sm touch-none ${shapeClass[skill.shape]}`}
                  style={{ backgroundColor: skill.color, color: skill.textColor }}
                >
                  {skill.name}
                </div>
              </MatterBody>
            ))}
          </Gravity>
        </div>

        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-600 mt-3 text-center">
          Physics-powered — grab and throw the skills around
        </p>
      </div>
    </section>
  );
}
