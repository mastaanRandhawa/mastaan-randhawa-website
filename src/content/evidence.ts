import { portfolio } from "./portfolio";
import type { Skill } from "./types";

/**
 * Evidence of practical use for each skill, derived ONLY from tags that already
 * exist on projects, experience roles, and credentials. No percentages.
 */
export interface SkillEvidence {
  projects: { id: string; title: string }[];
  roles: { id: string; title: string }[];
  credentials: { id: string; title: string }[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, "");

function matches(skill: Skill, tag: string): boolean {
  const t = norm(tag);
  return [skill.name, ...(skill.aliases ?? [])].some((n) => norm(n) === t);
}

const CREDENTIAL_SKILLS: Record<string, string[]> = {
  "databricks-de-associate": ["Databricks", "Apache Spark", "Delta Lake", "ETL", "Data Pipelines", "SQL"],
  "ms-secops": ["Microsoft Sentinel", "KQL", "Azure"],
  "anthropic-agent-skills": ["Claude"],
  "db-devops": ["Databricks", "Git/GitHub"],
  "db-lakeflow-pipelines": ["Databricks", "Data Pipelines", "Apache Spark"],
  "db-lakeflow-jobs": ["Databricks"],
  "db-lakeflow-connect": ["Databricks", "ETL"],
};

export function evidenceFor(skill: Skill): SkillEvidence {
  return {
    projects: portfolio.projects
      .filter((p) => p.tech.some((t) => matches(skill, t)))
      .map((p) => ({ id: p.id, title: p.title })),
    roles: portfolio.company.roles
      .filter((r) => r.tags.some((t) => matches(skill, t)))
      .map((r) => ({ id: r.id, title: r.title })),
    credentials: portfolio.credentials
      .filter((c) => (CREDENTIAL_SKILLS[c.id] ?? []).includes(skill.name))
      .map((c) => ({ id: c.id, title: c.title })),
  };
}

export function evidenceSummary(skill: Skill): string {
  const e = evidenceFor(skill);
  const parts: string[] = [];
  if (e.roles.length) parts.push(`used at ThoughtsWin as ${e.roles.map((r) => r.title).join(" & ")}`);
  if (e.projects.length) parts.push(`${e.projects.length} project${e.projects.length > 1 ? "s" : ""}`);
  if (e.credentials.length) parts.push(`${e.credentials.length} credential${e.credentials.length > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" · ") : "Listed in toolkit";
}
