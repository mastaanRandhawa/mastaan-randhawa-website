# Skybound — Mastaan Randhawa's playable portfolio

**Live site:** [mastaanrandhawa.com](https://mastaanrandhawa.com) · **Developer:** Mastaan Randhawa · Surrey, BC · mastaanrandhawa@gmail.com

A browser-based 3D airplane adventure that doubles as a software-engineering portfolio. Visitors take off from a floating airfield, fly between hand-built islands that each represent a real project, skill area, role or credential, and open polished HTML panels with the details. A conventional portfolio view with the same content is always one click away, and it is the automatic fallback when WebGL is unavailable.

- **Recruiter in a hurry?** The title screen has name, current role, education, credentials and Resume / GitHub / LinkedIn / Email links before any flying.
- **Old links still work.** `/#portfolio`, `/#experience`, `/#skills`, etc. open the classic portfolio at that section. `?view=portfolio` forces the classic view.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build to dist/
npm run preview      # serve dist/ on :4173
npm test             # unit tests (Vitest)
npm run test:e2e     # build + Playwright end-to-end tests (uses your installed Chrome)
```

## Controls

| Input | Action |
| --- | --- |
| W / S (↑ / ↓) | Pitch up / down |
| A / D (← / →) | Bank & turn |
| Q / E | Roll (full barrel rolls) |
| Shift | Boost (uses the boost meter) |
| Space | Air brake |
| F / Enter | Explore the nearby destination |
| M | World map (set waypoints, fast travel) |
| C | Camera: chase → cinematic → cockpit |
| O | Photo mode (drag to orbit, scroll to zoom, capture PNG) |
| R | Reset to last checkpoint |
| Esc / P | Pause menu |

Mouse steering (Settings → Steering → Mouse), gamepads (left stick, RT boost, LT brake, bumpers roll, A explore, Start pause) and touch (virtual stick + boost/brake/explore buttons) are supported. Flight assist is on by default; turn it off in Settings for looser, loop-capable handling.

## Updating the portfolio content

**All personal content lives in [`src/content/portfolio.ts`](src/content/portfolio.ts).** Both the game and the classic view read from it, so edit that file only.

- `profile`: name, headline, bio, links, stats, typewriter lines.
- `projects`: every project. Each has a `landmark` (which 3D landmark represents it), a `diagram` (architecture sketch in its panel), `highlights` / `outcomes` with a `source` (`"site"` or `"resume"`), and `showOnSite` (whether it appears in the classic grid).
- `skillCategories`: skills shown on the four islands of the Skills Archipelago. Skill "evidence" is derived automatically from project/role tags and credentials (`src/content/evidence.ts`). There are no self-rated percentages.
- `company`, `education`, `leadership`, `credentials`: Experience City, Education Summit and Achievement Peaks.
- `flightLogs`: the 10 hidden collectibles. Each quotes a documented fact.

Nothing in the content is invented: every fact comes from the previous site's components or the linked resume PDF (`public/ResumeMay2025Tech.pdf`), and the `source` fields record which.

### Adding a new project island

1. Add the project to `portfolio.projects` with a `landmark` kind.
2. Place it in a region builder in `src/world/regions/*.ts` with `projectIsland(kit, def, out, { projectId, x, y, z, radius, seed, palette })`. That creates the island, landmark, arrival ring, label and destination.
3. Run `npm test`. The layout tests fail if the new island blocks a course, buries a collectible, or lacks a destination.

To create a new landmark style, add a function to `src/world/prefabs/landmarks.ts` and register it in `LANDMARKS`.

## Architecture

```
src/
  content/       Typed portfolio data model + skill evidence (single source of truth)
  config/        Brand name, flight & camera tuning, quality presets, key bindings
  world/         Pure, deterministic world generation (no React)
    terrain.ts     Floating-island generator: noisy outline, pads, strata, analytic surface
    collision.ts   Islands/boxes/cylinders/spheres + spatial hash
    regionKit.ts   Builder that merges each island's scenery into one draw call
    prefabs/       Trees, rocks, buildings, runway, windmills, project landmarks …
    regions/       One file per region (launch, skills, harbor, canyon, city, …)
  game/          Runtime systems (no rendering)
    flight/        Arcade flight model (pure, unit-tested) + scripted takeoff
    gameplay.ts    Fixed 120 Hz timestep, interpolation, rings, courses, discovery, respawn
    store.ts       Zustand store for low-frequency UI/progress state
    save.ts        Versioned, validated localStorage persistence (corruption-safe)
    progression.ts Missions, achievements, unlockable skins, completion
    input.ts       Keyboard / mouse / touch / gamepad → one smoothed input (+ rumble)
    audio.ts       Fully synthesised Web Audio: engine, wind, SFX, generative music
    analytics.ts   No-op analytics seam (nothing is sent anywhere)
  render/        React Three Fiber scene: sky, clouds, lighting, world, airplane, camera, effects
  ui/            Title, HUD, panels, map, pause/settings/log/hangar, photo mode, touch controls
  portfolio/     Classic portfolio view (the original site's components, now data-driven)
```

Key decisions:

- **Flight state lives outside React.** The sim runs at a fixed 120 Hz in `requestAnimationFrame` with render interpolation. HUD numbers update by writing to DOM refs via `game/frameBus.ts`, so flying never triggers React re-renders.
- **One draw call per island.** `MeshBuilder` merges all scenery for an island into a single vertex-coloured geometry. Two custom attributes drive a shared material: `aSway` for wind-swayed foliage and `aEmissive` for glowing windows and lamps. The whole world is about 290k vertices and builds in about 0.5 s, region by region, behind the loading screen.
- **Collision matches the visuals.** Islands collide against the same analytic height function that generates their mesh. Buildings register box/cylinder colliders as they're placed.
- **Progressive loading.** The classic portfolio ships only React plus its own code (about 150 KB gzipped). Three.js, R3F and the game UI load lazily when someone chooses to fly.
- **Adaptive quality.** Quality presets are Low, Medium and High, with Auto as the default. Auto measures real frame rate and steps down if the device struggles. High adds soft shadows, ambient occlusion, MSAA and emissive-only bloom.

## Accessibility & comfort

- Reduced-motion is respected by default (from `prefers-reduced-motion`) and toggleable: calmer camera, no camera shake, speed lines or FOV kicks, and no landmark glances.
- All menus and panels are keyboard-operable HTML with dialog roles, focus management and `aria-live` announcements for discoveries.
- The classic portfolio is always available from the title screen, the HUD and the pause menu, and it is the automatic fallback without WebGL, or if the 3D experience ever throws (error boundary).
- `<noscript>` content and Person JSON-LD keep the essentials visible to crawlers.

## Testing

- **Unit (Vitest, `npm test`):** flight model (stability, assist, banking, barrel rolls, boost, terrain assist, collisions, takeoff); save system (round-trip, corrupt JSON, field-level sanitising, migration); progression; content integrity; and **world layout**. Layout tests check that every geometry vertex is finite and every project, skill area and section has a destination. They also check that every flight log is placed and reachable, that every course ring and the path between rings is collision-free, and that every arrival ring is clear.
- **End-to-end (Playwright, `npm run test:e2e`):** title links and resume PDF; the classic portfolio and its link back to the game; legacy deep links; the no-WebGL fallback; takeoff; keyboard flight; pause; map; and opening a destination panel with F.
- A read-only debug handle (`window.__skybound`) exposes runtime state for these tests and for devtools.

## Deployment

Unchanged from before: GitHub Pages via `.github/workflows/deploy-pages.yml` on pushes to `main` (see [DEPLOY.md](DEPLOY.md)). The site is static and needs no server; `CNAME` keeps the custom domain.

## Assets & attribution

See [ASSETS.md](ASSETS.md). In short, every 3D model, texture, sound and piece of music is generated in code, so there are no third-party model or audio licences to track.
