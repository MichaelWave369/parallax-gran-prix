# PARALLAX GRAN PRIX

> **Pick your vessel. Enter the field. Reality takes it from there.**

Parallax Gran Prix (PGP) is an open-source, physics-first spectator racing experiment set in the Parallax Universe. Racers are spherical **Field Vessels**. Circuits are strange physical worlds. Outcomes are produced by simulation rather than scripted winners.

The official broadcast team is the **British Robot Broadcasting Corporation (BRBC)**:

- **Threve** — play-by-play
- **Six't** — technical analyst
- **Noine** — senior commentator

## Play online

GitHub Pages deployment is configured for:

**https://michaelwave369.github.io/parallax-gran-prix/**

The Pages workflow builds the same Vite application from `main` and deploys the generated `dist` artifact.

## Project status

**Pre-alpha / Slice 2.** The Battlecase Circuit is now a playable browser race with 12 physics racers, seeded simulation, live standings, sector-aware cameras, moving physical obstacles, a real left/right Parallax Split, photo-finish detection, race receipts, and event-driven BRBC commentary.

## Current Battlecase Circuit

1. **Boot Straight** — launch and field formation.
2. **GPU Canyon** — alternating heatsink blocks create a chicane.
3. **Cooling Gauntlet** — moving physical sweepers and fan-hub bumpers.
4. **Parallax Split** — racers physically choose left or right around a central divider.
5. **Motherboard Sprint** — final slalom into the finish gate.

## Current features

- 12 simulated Field Vessels
- Battlecase Circuit Slice 2
- deterministic race seed support
- live timing and position tracking
- automatic, chase, wide, and finish cameras
- moving cannon-es track obstacles
- sector transitions
- Parallax Split route receipts
- photo-finish detection
- BRBC event feed
- post-race receipt
- GitHub Actions CI
- GitHub Pages deployment workflow

## Principles

1. **Physics decides the result.** No hidden winner scripting.
2. **Readable chaos.** Telemetry and receipts should explain what happened.
3. **Spectator-first.** Watching a race should be fun even when you do nothing.
4. **Parallax identity.** Original racers, circuits, announcers, art direction, and lore.
5. **Mod-friendly architecture.** Community circuits and racers should become possible without rewriting the engine.
6. **Broadcast never overrides sport.** BRBC may dramatize simulation events but cannot alter finishing order.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The project uses a Vite base path of `/parallax-gran-prix/` for GitHub Pages.

## Technology

**TypeScript + Vite + Three.js + cannon-es**

## Repository map

```text
src/                 playable browser prototype
docs/                design, architecture, circuits, broadcast rules
.github/workflows/    CI and GitHub Pages deployment
```

## License

Source code is released under the MIT License. Parallax names, characters, logos, and original visual branding are not granted as trademarks or branding rights by the software license.

---

**Gravity is optional. Glory is everything.**
