import { Gravity, MatterBody } from "@/components/ui/gravity";

type Skill = {
  name: string;
  color: string;
  textColor: string;
  x: string;
  y: string;
  shape: "pill" | "squircle" | "sharp" | "blob" | "circle" | "tag";
  angle?: number;
};

const skills: Skill[] = [
  // Frontend
  { name: "HTML5",       color: "#E84D1C", textColor: "#fff",     x: "10%", y: "5%",  shape: "squircle", angle: -6  },
  { name: "CSS3",        color: "#0015ff", textColor: "#fff",     x: "22%", y: "6%",  shape: "pill"                },
  { name: "JavaScript",  color: "#ffd726", textColor: "#1a1a1a",  x: "36%", y: "4%",  shape: "blob",     angle: 8   },
  { name: "React.js",    color: "#0015ff", textColor: "#fff",     x: "52%", y: "7%",  shape: "sharp",    angle: -4  },
  { name: "Three.js",    color: "#1a1a1a", textColor: "#fff",     x: "65%", y: "5%",  shape: "circle"              },
  { name: "Bootstrap",   color: "#7952b3", textColor: "#fff",     x: "78%", y: "6%",  shape: "tag",      angle: 5   },

  // Backend & Systems
  { name: "C/C++",       color: "#1f464d", textColor: "#fff",     x: "14%", y: "20%", shape: "pill",     angle: -8  },
  { name: "Assembly",    color: "#1f464d", textColor: "#fff",     x: "28%", y: "18%", shape: "sharp"               },
  { name: "Node.js",     color: "#3d9140", textColor: "#fff",     x: "44%", y: "22%", shape: "squircle", angle: 6   },
  { name: "Python",      color: "#2b5797", textColor: "#fff",     x: "60%", y: "19%", shape: "blob",     angle: -5  },
  { name: "Spring Boot", color: "#6db33f", textColor: "#fff",     x: "76%", y: "21%", shape: "pill",     angle: 4   },

  // Database & Tools
  { name: "MongoDB",     color: "#ff5941", textColor: "#fff",     x: "8%",  y: "38%", shape: "circle"              },
  { name: "MySQL",       color: "#e8710a", textColor: "#fff",     x: "22%", y: "34%", shape: "tag",      angle: -7  },
  { name: "Docker",      color: "#2496ed", textColor: "#fff",     x: "38%", y: "40%", shape: "squircle", angle: 5   },
  { name: "Git/GitHub",  color: "#ff5941", textColor: "#fff",     x: "54%", y: "36%", shape: "sharp",    angle: -4  },
  { name: "AWS",         color: "#f97316", textColor: "#fff",     x: "69%", y: "38%", shape: "blob",     angle: 9   },
  { name: "Figma",       color: "#E794DA", textColor: "#1a1a1a",  x: "82%", y: "34%", shape: "pill"                },
  { name: "SQL",         color: "#00758f", textColor: "#fff",     x: "14%", y: "52%", shape: "sharp",    angle: 5   },
  { name: "Databricks",  color: "#ff3621", textColor: "#fff",     x: "34%", y: "50%", shape: "tag",      angle: -6  },
  { name: "Azure",       color: "#0078d4", textColor: "#fff",     x: "56%", y: "53%", shape: "squircle", angle: 7   },
  { name: "TypeScript",  color: "#3178c6", textColor: "#fff",     x: "74%", y: "52%", shape: "pill",     angle: -4  },
  { name: "Tailwind CSS",color: "#06b6d4", textColor: "#083344",  x: "89%", y: "50%", shape: "blob",     angle: 6   },

  // Data & Cloud
  { name: "Apache Spark",     color: "#e25a1c", textColor: "#fff",     x: "9%",  y: "66%", shape: "squircle", angle: -5 },
  { name: "Delta Lake",       color: "#00add4", textColor: "#06232b",  x: "24%", y: "68%", shape: "pill",     angle: 4  },
  { name: "ETL",              color: "#a855f7", textColor: "#fff",     x: "37%", y: "65%", shape: "circle"             },
  { name: "Data Pipelines",   color: "#ff5941", textColor: "#fff",     x: "51%", y: "67%", shape: "tag",      angle: -7 },
  { name: "Microsoft Sentinel", color: "#243a5e", textColor: "#fff",   x: "68%", y: "66%", shape: "sharp",    angle: 5  },
  { name: "KQL",              color: "#5b21b6", textColor: "#fff",     x: "83%", y: "68%", shape: "blob",     angle: -6 },

  // More tools
  { name: "REST APIs",   color: "#1f464d", textColor: "#fff",     x: "10%", y: "80%", shape: "pill",     angle: 6   },
  { name: "SQLite",      color: "#0f80cc", textColor: "#fff",     x: "25%", y: "82%", shape: "sharp",    angle: -4  },
  { name: "Render",      color: "#46e3b7", textColor: "#1a1a1a",  x: "39%", y: "80%", shape: "squircle", angle: 5   },
  { name: "Event Hubs",  color: "#005ba1", textColor: "#fff",     x: "54%", y: "82%", shape: "tag",      angle: -5  },
  { name: "Claude",      color: "#d97757", textColor: "#fff",     x: "69%", y: "80%", shape: "pill",     angle: 4   },
  { name: "Linux",       color: "#fcc624", textColor: "#1a1a1a",  x: "84%", y: "82%", shape: "squircle", angle: -7  },
];

const shapeClass: Record<Skill["shape"], string> = {
  pill:      "rounded-full px-4 py-2 sm:px-5 sm:py-2.5",
  squircle:  "rounded-xl px-4 py-2 sm:px-5 sm:py-2.5",
  sharp:     "rounded-md px-4 py-2 sm:px-5 sm:py-2.5",
  blob:      "rounded-[40%_60%_55%_45%/45%_55%_60%_40%] px-4 py-2.5 sm:px-5 sm:py-3",
  circle:    "rounded-full p-3 sm:p-4 aspect-square flex items-center justify-center text-center",
  tag:       "rounded-sm rounded-tl-2xl rounded-br-2xl px-4 py-2 sm:px-5 sm:py-2.5",
};

const categories = [
  { label: "Frontend",          color: "#0015ff" },
  { label: "Backend & Systems", color: "#1f464d" },
  { label: "Database & Tools",  color: "#ff5941" },
  { label: "Data & Cloud",      color: "#00add4" },
];

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
