import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { portfolio as content } from "@/content/portfolio";

type Project = {
  title: string;
  description: string;
  image: string;
  tags: string[];
  link?: string;
  color: string;
  badge?: string;
};

const projects: Project[] = content.projects
  .filter((p) => p.showOnSite)
  .map((p) => ({ title: p.title, description: p.summary, image: p.image ?? "", tags: p.tech, link: p.link, color: p.color, badge: p.badge }));

const INITIAL_VISIBLE = 6;

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
        {project.badge && (
          <span className="absolute top-3 left-3 font-mono text-[11px] bg-white/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 rounded-full px-2.5 py-1">
            {project.badge}
          </span>
        )}
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
            and software engineering, including client sites built at Doxa Studios.
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
