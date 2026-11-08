import { ExternalLink } from "lucide-react";
import { portfolio } from "@/content/portfolio";

type Credential = {
  title: string;
  issuer: string;
  issued: string;
  expires?: string;
  note?: string;
  image: string;
  url: string;
};

const issuerColor: Record<string, string> = {
  Databricks: "#ff5941",
  Microsoft: "#0015ff",
  Anthropic: "#f97316",
};

const certifications: Credential[] = portfolio.credentials.filter((c) => c.kind === "certification");

const badges: Credential[] = portfolio.credentials.filter((c) => c.kind === "badge");

function CertificationCard({ cred }: { cred: Credential }) {
  const color = issuerColor[cred.issuer] ?? "#0015ff";
  return (
    <a
      href={cred.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Verify credential: ${cred.title}`}
      className="group relative flex flex-col bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-zinc-900/50"
    >
      {/* Badge */}
      <div className="relative h-44 flex items-center justify-center bg-white dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 p-5">
        <img
          src={cred.image}
          alt={`${cred.title} badge`}
          loading="lazy"
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: color }}
        />
        <span className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 dark:bg-zinc-900/90 rounded-full text-zinc-700 dark:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ExternalLink size={14} />
        </span>
      </div>

      {/* Details */}
      <div className="p-5">
        <p className="font-mono text-xs uppercase tracking-widest mb-2" style={{ color }}>
          {cred.issuer}
        </p>
        <h4 className="font-mono font-semibold text-sm text-zinc-900 dark:text-white leading-snug mb-3 group-hover:text-accent-blue transition-colors">
          {cred.title}
        </h4>
        {cred.note && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{cred.note}</p>
        )}
        <p className="font-mono text-xs text-zinc-400">
          Issued {cred.issued}
          {cred.expires && <> · Expires {cred.expires}</>}
        </p>
      </div>
    </a>
  );
}

function BadgeCard({ cred }: { cred: Credential }) {
  return (
    <a
      href={cred.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Verify credential: ${cred.title}`}
      className="group flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:border-zinc-400 dark:hover:border-zinc-600 hover:-translate-y-0.5 transition-all duration-200"
    >
      <img
        src={cred.image}
        alt={`${cred.title} badge`}
        loading="lazy"
        className="w-16 h-16 sm:w-20 sm:h-20 object-contain flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
      />
      <div className="min-w-0">
        <h4 className="font-mono font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white leading-snug mb-1.5 group-hover:text-accent-blue transition-colors">
          {cred.title}
        </h4>
        <p className="font-mono text-xs text-zinc-400">
          {cred.issuer} · {cred.issued}
        </p>
      </div>
    </a>
  );
}

export default function Certifications() {
  return (
    <section id="certifications" className="py-16 sm:py-24 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <span className="font-mono text-xs text-accent-blue uppercase tracking-widest">
            Credentials
          </span>
          <h2 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl text-zinc-900 dark:text-white mt-2 mb-4">
            Certifications
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 max-w-xl">
            Professional certifications and badges in data engineering, cloud security, and AI.
            Click any badge to verify it with the issuer.
          </p>
        </div>

        {/* Certifications */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {certifications.map((cred) => (
            <CertificationCard key={cred.title} cred={cred} />
          ))}
        </div>

        {/* Knowledge badges */}
        <h3 className="font-mono font-semibold text-zinc-900 dark:text-white mt-10 sm:mt-14 mb-5 sm:mb-6">
          Databricks Knowledge Badges
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {badges.map((cred) => (
            <BadgeCard key={cred.title} cred={cred} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <a
            href={portfolio.profile.links.credentials}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded-full hover:border-accent-blue hover:text-accent-blue dark:hover:border-accent-blue dark:hover:text-accent-blue transition-all duration-200"
          >
            View on LinkedIn <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
