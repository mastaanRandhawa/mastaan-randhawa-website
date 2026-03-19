import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

type Project = {
  title: string;
  description: string;
  image: string;
  tags: string[];
  link?: string;
  color: string;
};

const projects: Project[] = [
  {
    title: "AK Wraps Website",
    description:
      "Built AK Wraps website with THREE.js 3D elements, HTML5, CSS3, Bootstrap 5, and JavaScript ES6+. Features lazy loading, performance optimization, and smooth animations.",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop",
    tags: ["Three.js", "JavaScript", "Bootstrap", "Docker"],
    link: "https://akwraps.ca/landingPage",
    color: "#0015ff",
  },
  {
    title: "RISC-V Processor",
    description:
      "RISC-V processor implementation in C/C++/Assembly with custom slt-type instructions, register management, and instruction decoding. Includes pipelining optimization and memory management.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&auto=format&fit=crop",
    tags: ["C", "C++", "Assembly"],
    color: "#1f464d",
  },
  {
    title: "LS Command Implementation",
    description:
      "Custom `ls` command implementation in C, mimicking Unix's ls utility with inode display and long-format listing options.",
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=600&q=80&auto=format&fit=crop",
    tags: ["C"],
    color: "#1f464d",
  },
  {
    title: "Multi-Level Cache System",
    description:
      "Multi-level cache system in C/C++ with LRU and LFU eviction policies. Implemented efficient memory management and cache optimization techniques.",
    image:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80&auto=format&fit=crop",
    tags: ["C", "C++"],
    color: "#1f464d",
  },
  {
    title: "Concurrent Data Communication",
    description:
      "Concurrent data communication framework in C using mutex locks for thread-safe operations. Implements secure multi-threading and synchronization mechanisms.",
    image:
      "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&q=80&auto=format&fit=crop",
    tags: ["C"],
    color: "#ff5941",
  },
  {
    title: "IPC Implementation",
    description:
      "IPC architecture in C with global variable management. Supports POSIX IPC mechanisms and inter-process communication protocols.",
    image:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&q=80&auto=format&fit=crop",
    tags: ["C"],
    color: "#ff5941",
  },
  {
    title: "Ferrari Website",
    description:
      "Ferrari-themed website showcasing front-end development skills with HTML, CSS, JavaScript, and Bootstrap. Features elegant design and dynamic user interactions.",
    image:
      "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=600&q=80&auto=format&fit=crop",
    tags: ["HTML", "CSS", "JavaScript", "Bootstrap"],
    link: "https://mastaanrandhawa.github.io/Ferrari-Website/",
    color: "#E794DA",
  },
  {
    title: "Roar Cycle Website",
    description:
      "Mobile bike repair service website with user-friendly design and streamlined booking system. Built with HTML, CSS, JavaScript, and Bootstrap.",
    image:
      "https://images.unsplash.com/photo-1558618047-3f12a22c64e6?w=600&q=80&auto=format&fit=crop",
    tags: ["HTML", "CSS", "JavaScript", "Bootstrap"],
    link: "https://mastaanrandhawa.github.io/Roar-Cycle/",
    color: "#E794DA",
  },
  {
    title: "Logo Design Website",
    description:
      "Professional logo design website demonstrating expertise in creating seamless user experiences. Features modern UI/UX design with HTML, CSS, JavaScript, and Bootstrap.",
    image:
      "https://images.unsplash.com/photo-1626785774625-ddcddc3445e9?w=600&q=80&auto=format&fit=crop",
    tags: ["HTML", "CSS", "JavaScript", "Bootstrap"],
    link: "https://mastaanrandhawa.github.io/Logo-Design-Website/",
    color: "#E794DA",
  },
];

const INITIAL_VISIBLE = 3;

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-zinc-900/50">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <img
          src={project.image}
          alt={project.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Color accent bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: project.color }}
        />
        {project.link && (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 rounded-full text-zinc-700 dark:text-zinc-300 hover:text-accent-blue opacity-0 group-hover:opacity-100 transition-all duration-200"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-mono font-semibold text-zinc-900 dark:text-white mb-2 group-hover:text-accent-blue transition-colors">
          {project.title}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 line-clamp-3">
          {project.description}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-xs px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Portfolio() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? projects : projects.slice(0, INITIAL_VISIBLE);

  return (
    <section id="portfolio" className="py-16 sm:py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            My Work
          </span>
          <h2 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl text-zinc-900 dark:text-white mt-2 mb-4">
            Portfolio
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl">
            A collection of projects showcasing my skills in web development, system programming,
            and software engineering.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {visible.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>

        {/* Show more / less */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-2 font-mono text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded-full hover:border-accent-blue hover:text-accent-blue dark:hover:border-accent-blue dark:hover:text-accent-blue transition-all duration-200"
          >
            {showAll ? (
              <>
                Show Less <ChevronUp size={16} />
              </>
            ) : (
              <>
                Show More Projects <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
