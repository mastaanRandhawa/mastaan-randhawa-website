# Assets & attribution

| Asset | Source | Licence / notes |
| --- | --- | --- |
| Airplane, islands, buildings, landmarks, trees, clouds, rings | Generated procedurally in code (`src/render/airplane`, `src/world`) | Original work, part of this repository |
| Sky, cloud sea, waterfalls, contrails | Custom GLSL shaders (`src/render`) | Original work |
| World signage text | Drawn at runtime onto canvas textures using the site's fonts | Original work |
| Engine, wind, chimes, ambient music | Synthesised live with the Web Audio API (`src/game/audio.ts`) | Original work; no audio files |
| Fonts: Azeret Mono, Playfair Display, Inter | Google Fonts (loaded in `index.html`) | SIL Open Font License 1.1 |
| Icons | [Lucide](https://lucide.dev) (`lucide-react`) | ISC |
| Project screenshots (`public/imgs/*-site.jpg`, `akwrapsimage.png`) | Mastaan Randhawa's own projects | Owner's work |
| Credential badges (`public/imgs/badges/*`) | Issued by Databricks, Microsoft and Anthropic to Mastaan Randhawa | Shown as earned credentials, each linking to the issuer's verification page |
| Older project thumbnails in the classic grid | Unsplash URLs carried over from the previous site | Unsplash Licence; the game panels show architecture diagrams instead |

No external 3D model packs (Kenney, Quaternius, Poly Pizza, Sketchfab) are used. Everything is procedural so the art direction stays consistent, the bundle stays small, and there are no licence obligations.
