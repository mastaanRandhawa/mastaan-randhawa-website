import { Gravity, MatterBody } from "@/components/ui/gravity";

type Skill = {
  name: string;
  color: string;
  textColor: string;
  x: string;
  y: string;
};

const skills: Skill[] = [
  // Frontend — blue tones
  { name: "HTML5", color: "#E84D1C", textColor: "#fff", x: "10%", y: "5%" },
  { name: "CSS3", color: "#0015ff", textColor: "#fff", x: "22%", y: "8%" },
  { name: "JavaScript", color: "#ffd726", textColor: "#1a1a1a", x: "38%", y: "4%" },
  { name: "React.js", color: "#0015ff", textColor: "#fff", x: "52%", y: "9%" },
  { name: "Three.js", color: "#1a1a1a", textColor: "#fff", x: "66%", y: "5%" },
  { name: "Bootstrap", color: "#7952b3", textColor: "#fff", x: "80%", y: "8%" },

  // Backend — teal/dark
  { name: "C/C++", color: "#1f464d", textColor: "#fff", x: "15%", y: "20%" },
  { name: "Assembly", color: "#1f464d", textColor: "#fff", x: "30%", y: "16%" },
  { name: "Node.js", color: "#3d9140", textColor: "#fff", x: "47%", y: "22%" },
  { name: "Python", color: "#1f464d", textColor: "#fff", x: "62%", y: "18%" },
  { name: "Spring Boot", color: "#6db33f", textColor: "#fff", x: "78%", y: "23%" },

  // Tools — red/orange
  { name: "MongoDB", color: "#ff5941", textColor: "#fff", x: "8%", y: "35%" },
  { name: "MySQL", color: "#ff5941", textColor: "#fff", x: "25%", y: "30%" },
  { name: "Docker", color: "#2496ed", textColor: "#fff", x: "42%", y: "38%" },
  { name: "Git/GitHub", color: "#ff5941", textColor: "#fff", x: "58%", y: "32%" },
  { name: "AWS", color: "#f97316", textColor: "#fff", x: "72%", y: "36%" },
  { name: "Figma", color: "#E794DA", textColor: "#1a1a1a", x: "88%", y: "30%" },
];

const categories = [
  { label: "Frontend", color: "#0015ff" },
  { label: "Backend & Systems", color: "#1f464d" },
  { label: "Database & Tools", color: "#ff5941" },
];

export default function Skills() {
  return (
    <section id="skills" className="py-24 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="mb-4">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            Technical Skills
          </span>
          <h2 className="font-serif italic text-4xl sm:text-5xl text-zinc-900 dark:text-white mt-2 mb-4">
            My Toolkit
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mb-6">
            A comprehensive overview of my technical expertise. Grab and toss the skill pills around!
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          {categories.map((cat) => (
            <div key={cat.label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{cat.label}</span>
            </div>
          ))}
        </div>

        {/* Physics container */}
        <div className="relative w-full h-[420px] sm:h-[480px] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
          <Gravity gravity={{ x: 0, y: 1 }} className="w-full h-full">
            {skills.map((skill) => (
              <MatterBody
                key={skill.name}
                matterBodyOptions={{ friction: 0.5, restitution: 0.3, density: 0.002 }}
                x={skill.x}
                y={skill.y}
              >
                <div
                  className="font-mono text-sm font-medium rounded-full px-5 py-2.5 whitespace-nowrap select-none hover:cursor-grab active:cursor-grabbing shadow-sm"
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
