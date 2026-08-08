# PARALLAX GRAN PRIX

> **Pick your vessel. Enter the field. Reality takes it from there.**

Parallax Gran Prix (PGP) is an open-source, physics-first spectator racing experiment set in the Parallax Universe. Racers are spherical **Field Vessels**. Circuits are strange physical worlds. Outcomes are produced by simulation rather than scripted winners.

The official broadcast team is the **British Robot Broadcasting Corporation (BRBC)**:

- **Threve** — play-by-play
- **Six't** — technical analyst
- **Noine** — senior commentator

## Play online

**https://michaelwave369.github.io/parallax-gran-prix/**

The GitHub Pages workflow builds the Vite application from `main` and deploys the generated `dist` artifact.

## Project status

**Pre-alpha / Slice 3 — Broadcast Director.** Battlecase Circuit now runs as a small live sports production: 12 cannon-es Field Vessels race through physical obstacles while a telemetry-driven BRBC director detects battles and overtakes, chooses camera shots, queues three-announcer exchanges, and records finish replay poses.

## Current Battlecase Circuit

1. **Boot Straight** — launch and field formation.
2. **GPU Canyon** — alternating heatsink blocks create a chicane.
3. **Cooling Gauntlet** — moving physical sweepers and fan-hub bumpers.
4. **Parallax Split** — racers physically choose left or right around a central divider.
5. **Motherboard Sprint** — final slalom into the finish gate.

## Current features

- 12 simulated Field Vessels with identity codes and trackside labels
- deterministic race seed support
- theatrical opening grid presentation
- live timing tower and race telemetry
- moving cannon-es track obstacles
- sector transitions and Parallax Split route receipts
- telemetry-driven BRBC Broadcast Director
- closest-battle detection
- overtake detection
- automatic `grid-wide`, `leader-chase`, `battle-two-shot`, `split-overhead`, and `finish-line` camera direction
- manual spectator camera override modes
- queued Threve → Six't → Noine commentary exchanges
- final-charge British-gibberish mode
- photo-finish detection
- visual-only slow-motion finish replay from recorded poses
- production-aware race receipt
- GitHub Actions CI
- automatic GitHub Pages deployment

## Principles

1. **Physics decides the result.** No hidden winner scripting.
2. **Readable chaos.** Telemetry and receipts should explain what happened.
3. **Spectator-first.** Watching a race should be fun even when you do nothing.
4. **Parallax identity.** Original racers, circuits, announcers, art direction, and lore.
5. **Mod-friendly architecture.** Community circuits and racers should become possible without rewriting the engine.
6. **Broadcast never overrides sport.** BRBC may choose the camera, commentary, or replay — never the winner.
7. **Replay is historical presentation.** Recorded poses are visual evidence, not a second simulation.

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
src/game/RaceEngine.ts          authoritative race runtime + presentation bridge
src/game/BroadcastDirector.ts   telemetry-driven shot/event selection
src/game/ReplayBuffer.ts        recorded visual pose replay
src/main.ts                     live BRBC broadcast UI
docs/                           design, architecture, circuits, broadcast rules
.github/workflows/              CI and GitHub Pages deployment
```

## License

Source code is released under the MIT License. Parallax names, characters, logos, and original visual branding are not granted as trademarks or branding rights by the software license.

---

**Gravity is optional. Glory is everything.**
