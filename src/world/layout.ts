/** World layout: every region's position, identity and accent colour. */
export type Vec3 = [number, number, number];

export type PanelKind = "about" | "skills" | "project" | "experience" | "education" | "achievements" | "contact";

export interface RegionDef {
  id: RegionId;
  name: string;
  subtitle: string;
  center: Vec3;
  /** Entering this radius (XZ) discovers the region. */
  radius: number;
  accent: string;
  /** Suggested exploration order (drives the objective tracker). */
  order: number;
}

export type RegionId =
  | "launch"
  | "skills"
  | "harbor"
  | "canyon"
  | "gardens"
  | "observatory"
  | "city"
  | "summit"
  | "peaks"
  | "contact";

export const REGIONS: RegionDef[] = [
  { id: "launch", name: "Launch Airfield", subtitle: "Introduction", center: [0, 100, 0], radius: 190, accent: "#f2735a", order: 0 },
  { id: "skills", name: "Skills Archipelago", subtitle: "Languages, frameworks & tools", center: [-560, 118, -150], radius: 230, accent: "#3b5bff", order: 1 },
  { id: "harbor", name: "Doxa Studios Harbor", subtitle: "Client web projects", center: [470, 110, -470], radius: 240, accent: "#f97316", order: 2 },
  { id: "canyon", name: "Systems Canyon", subtitle: "C / C++ systems projects", center: [700, 96, 80], radius: 270, accent: "#2a8c8c", order: 3 },
  { id: "city", name: "Experience City", subtitle: "Work experience", center: [190, 92, 640], radius: 220, accent: "#3fb8af", order: 4 },
  { id: "observatory", name: "Observatory Isle", subtitle: "Data project", center: [-200, 132, 620], radius: 150, accent: "#7a5cd6", order: 5 },
  { id: "gardens", name: "Frontend Gardens", subtitle: "Early web projects", center: [-540, 104, 400], radius: 230, accent: "#c46fc0", order: 6 },
  { id: "summit", name: "Education Summit", subtitle: "Simon Fraser University", center: [-40, 0, -760], radius: 230, accent: "#d9573f", order: 7 },
  { id: "peaks", name: "Achievement Peaks", subtitle: "Certifications & leadership", center: [-520, 150, -660], radius: 200, accent: "#e6b64c", order: 8 },
  { id: "contact", name: "Contact Airfield", subtitle: "Let's connect", center: [620, 100, 560], radius: 200, accent: "#f2735a", order: 9 },
];

export const regionById = (id: string) => REGIONS.find((r) => r.id === id)!;

export const WORLD = {
  /** Soft boundary: beyond this the assist turns you home. */
  radius: 1250,
  cloudSeaY: 0,
  spawn: { x: 0, z: 62, heading: 0 },
};
