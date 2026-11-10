/** Third-party assets used in Skybound, shown under Settings → Credits. */
export interface Credit {
  title: string;
  author: string;
  authorUrl: string;
  source: string;
  license: string;
  licenseUrl?: string;
  /** What it is used for in the game. */
  use: string;
}

export const CREDITS: Credit[] = [
  {
    title: "Mitsubishi B2M2 - Game Art 1 Stylized Plane",
    author: "Pyush Chamoli",
    authorUrl: "https://sketchfab.com/bladesides",
    source: "https://sketchfab.com/3d-models/mitsubishi-b2m2-game-art-1-stylized-plane-f1e14a5afe094b21b5019f335374a84a",
    license: "Sketchfab Standard",
    licenseUrl: "https://sketchfab.com/licenses",
    use: "Player aircraft (repainted)",
  },
  {
    title: "Low Poly Tree Pack",
    author: "louieoliva",
    authorUrl: "https://sketchfab.com/louieoliva",
    source: "https://sketchfab.com/3d-models/low-poly-tree-pack-ea6e844754da494a9c38501b4fff92ad",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    use: "Island trees (rescaled; some foliage recoloured)",
  },
  {
    title: "Coconut Tree",
    author: "sujirour",
    authorUrl: "https://sketchfab.com/sujirour",
    source: "https://sketchfab.com/3d-models/coconut-tree-d141941578044b0f861ca83b36d4c411",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    use: "Beach palms (rescaled)",
  },
  {
    title: "Low poly Stylized Nature Pack",
    author: "Satendra Saraswat",
    authorUrl: "https://sketchfab.com/satendra5286",
    source: "https://sketchfab.com/3d-models/low-poly-stylized-nature-pack-9c773e846c6e4448b26b2cdecb2b91bf",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    use: "Trees, mossy boulders, plants, flowers, grass, mushrooms and stumps (rescaled; some recoloured)",
  },
  {
    title: "Free Pack - Rocks Stylized",
    author: "PolyOne Studio",
    authorUrl: "https://sketchfab.com/polyone",
    source: "https://sketchfab.com/3d-models/free-pack-rocks-stylized-7c60b4d1b8ab4187965f30c5e0212fc0",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    use: "Rocks and boulders (rescaled; recoloured)",
  },
  {
    title: "Stylized Bush",
    author: "Daniel (danielpetrov)",
    authorUrl: "https://sketchfab.com/danielpetrov",
    source: "https://sketchfab.com/3d-models/stylized-bush-9d9ce79d3ae040619e96d5b22c7de1a6",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    use: "Bushes (rescaled; recoloured)",
  },
];
