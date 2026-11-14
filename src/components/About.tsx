import { portfolio } from "@/content/portfolio";
import SectionHeading from "./SectionHeading";

const P = portfolio.profile;
const current = portfolio.company.roles.find((r) => r.current) ?? portfolio.company.roles[0];
const certs = portfolio.credentials.filter((c) => c.kind === "certification" && c.expires);

const facts: [string, string][] = [
  ["Now", `${current.title}, ${portfolio.company.name}`],
  ["Before", portfolio.company.roles.filter((r) => r !== current).map((r) => `${r.title} (${r.period})`).join(", ")],
  ["School", `${portfolio.education.degree}, ${portfolio.education.school}`],
  ["Certified", certs.map((c) => c.title.replace(/^Microsoft Certified: /, "Microsoft ")).join("; ")],
  ["Freelance", "Client websites through Doxa Studios"],
  ["Based in", P.location],
];

export default function About() {
  return (
    <section id="about" className="py-16 sm:py-24 bg-zinc-50 dark:bg-zinc-900/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeading n="06" title="About" />

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-10 lg:gap-16 items-start sm:pl-24">
          <div className="max-w-prose">
            {P.bio.map((para, i) => (
              <p key={i} className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed mb-5 last:mb-0">
                {para}
              </p>
            ))}
          </div>

          <dl className="font-mono text-xs sm:text-sm divide-y divide-zinc-200 dark:divide-zinc-800 border-y border-zinc-200 dark:border-zinc-800">
            {facts.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 py-3">
                <dt className="text-zinc-400 dark:text-zinc-500">{k}</dt>
                <dd className="text-zinc-800 dark:text-zinc-200">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
