/**
 * Typed portfolio data model. Every field here is rendered by BOTH the 3D game
 * (panels, world signage) and the conventional portfolio view, so content only
 * ever lives in one place: `src/content/portfolio.ts`.
 *
 * `source` fields document where a fact came from so nothing is invented:
 *   - "site"   → the previous mastaanrandhawa.com React components
 *   - "resume" → public/ResumeMay2025Tech.pdf (linked from the site)
 */
export type ContentSource = "site" | "resume";

export interface ProfileLink {
  label: string;
  href: string;
  kind: "github" | "linkedin" | "email" | "resume" | "website" | "credentials";
}

export interface FocusArea {
  title: string;
  description: string;
  color: string;
  icon: "terminal" | "globe" | "database" | "cloud" | "palette" | "zap";
}

export interface Profile {
  name: string;
  firstName: string;
  lastName: string;
  initials: string;
  headline: string;
  shortRole: string;
  intro: string;
  location: string;
  availability: string;
  email: string;
  bio: string[];
  focusAreas: FocusArea[];
  stats: { value: string; label: string }[];
  typewriterLines: string[];
  links: {
    github: string;
    linkedin: string;
    email: string;
    resume: string;
    website: string;
    credentials: string;
  };
  resumeFileLabel: string;
  resumeMeta: string;
}

export type ProjectCategory = "client" | "systems" | "web" | "data";

/** Which hand-built 3D landmark represents a project in the world. */
export type LandmarkKind =
  | "stadium"
  | "brasserie"
  | "salon"
  | "garage"
  | "cpu"
  | "terminal"
  | "cache"
  | "threads"
  | "ipc"
  | "racetrack"
  | "bikeshop"
  | "studio"
  | "observatory";

/** Architecture diagram shown in the project panel. */
export type DiagramKind =
  | "web-platform"
  | "web-site"
  | "pipeline"
  | "cache"
  | "filesystem"
  | "threads"
  | "ipc"
  | "data-pipeline"
  | "3d-site";

export interface Project {
  id: string;
  title: string;
  category: ProjectCategory;
  /** Short line used on world signage and cards. */
  tagline: string;
  /** Description as written on the site. */
  summary: string;
  /** Additional documented facts (site or resume). Never invented. */
  highlights: { text: string; source: ContentSource }[];
  /** Measured results stated on the resume. */
  outcomes?: { text: string; source: ContentSource }[];
  tech: string[];
  context?: string;
  period?: string;
  badge?: string;
  image?: string;
  imageAlt?: string;
  link?: string;
  linkLabel?: string;
  color: string;
  landmark: LandmarkKind;
  diagram: DiagramKind;
  /** Shown in the conventional portfolio grid (site order). */
  showOnSite: boolean;
  source: ContentSource;
}

export interface Skill {
  name: string;
  color: string;
  textColor: string;
  /** Alternate spellings used in project / experience tags. */
  aliases?: string[];
}

export interface SkillCategory {
  id: "frontend" | "systems" | "data-cloud" | "tools";
  label: string;
  islandName: string;
  color: string;
  blurb: string;
  skills: Skill[];
}

export interface ExperienceRole {
  id: string;
  title: string;
  period: string;
  current?: boolean;
  points: string[];
  tags: string[];
}

export interface Company {
  name: string;
  location: string;
  period: string;
  duration: string;
  summary: string;
  roles: ExperienceRole[];
}

export interface Leadership {
  id: string;
  title: string;
  org: string;
  location: string;
  period: string;
  points: string[];
  source: ContentSource;
}

export interface Education {
  school: string;
  degree: string;
  location: string;
  period: string;
  notes: string[];
  source: ContentSource;
}

export interface Credential {
  id: string;
  title: string;
  issuer: "Databricks" | "Microsoft" | "Anthropic";
  issued: string;
  expires?: string;
  note?: string;
  image: string;
  url: string;
  kind: "certification" | "badge";
}

/** Collectible "Flight Log" stories. Each one quotes a documented fact. */
export interface FlightLog {
  id: string;
  title: string;
  body: string;
  source: ContentSource;
  relatedId?: string;
}

export interface Portfolio {
  profile: Profile;
  projects: Project[];
  skillCategories: SkillCategory[];
  company: Company;
  leadership: Leadership[];
  education: Education;
  credentials: Credential[];
  flightLogs: FlightLog[];
  contact: { heading: string; intro: string; connectText: string };
}
