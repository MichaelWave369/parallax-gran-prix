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

**Pre-alpha / Slice 6 — Race Health + SPAUNGEAR Works.** PGP now has three playable circuit modules plus an observational Race Health layer. The broadcast can show vessel health, Watch/Stalled/Recovered/DNF states, a visible Recovery Marshal indicator, saved run-health envelopes, and smarter 3D-label deconfliction. DNFs are now explicitly preserved and receive zero championship points.

## Playable circuits

### Round 1 — Battlecase Circuit

1. **Boot Straight**
2. **GPU Canyon** — angled heatsink chicanes replace square dead-pocket walls.
3. **Cooling Gauntlet** — rotating sweepers and fan-hub bumpers.
4. **Parallax Split** — rounded split nose and two physical routes.
5. **Motherboard Sprint** — angled final slalom into the finish gate.

### Round 2 — Backspin '96

1. **Drop the Needle**
2. **Groove Run** — giant record platters and oblique groove guides.
3. **Tonearm Crossing** — sweeping tonearm hazards.
4. **Crossfader Split** — left-deck / right-deck route decision.
5. **Speaker Stack Sprint** — speaker-cone physical kickers into the finish.

### Round 3 — SPAUNGEAR Works

1. **Forge Entry** — oblique feed guides and factory arches.
2. **Pinion Field** — successive rotating timing bars through giant gear scenery.
3. **Transfer Gates** — alternating physical windows and crossover hazards.
4. **Crown Mesh** — a central split through the crown-gear field.
5. **Output Shaft** — final mechanical transfer into the finish gate.

## Season 1 circuit registry

1. Battlecase Circuit — playable
2. Backspin '96 — playable
3. SPAUNGEAR Works — playable
4. Mirror Labyrinth — planned
5. Ledger Larry 500 — planned
6. PhiVessel Dream Run — planned
7. Carbon Loop — planned
8. Parallax Data Center — planned
9. The 3–6–9 Grand Final — planned

## Current features

- 12 simulated Field Vessels with identity codes and trackside labels
- deterministic race seed support
- modular `CircuitRuntime` + circuit module resolver
- three genuinely different playable circuit modules
- circuit-aware sectors, split cameras, race receipts, and season routing
- Battlecase dead-pocket geometry repair
- deterministic **Recovery Marshal** after a verified low-speed/no-progress deadlock
- every Recovery Marshal intervention counted in the race receipt
- observational **Race Health Monitor** with per-vessel run states
- live Field Health score and visible Recovery Marshal state
- DNF diagnostics with zero-points championship handling
- run-health envelope preserved with championship race records
- smart screen-space deconfliction for crowded 3D racer labels
- theatrical opening grid presentation
- live timing tower and race telemetry
- moving cannon-es track obstacles
- telemetry-driven BRBC Broadcast Director
- closest-battle and overtake detection
- automatic TV-style camera direction plus manual spectator overrides
- queued Threve → Six't → Noine commentary exchanges
- final-charge British-gibberish mode
- photo-finish detection
- visual-only slow-motion finish replay from recorded poses
- persistent local Season 1 championship
- `25–18–15–12–10–8–6–4–2–1` points table for finishers
- driver and team standings with DNF counts
- saved race receipt history
- circuit-aware `NEXT ROUND` flow
- manual playable-track switch for exhibitions
- JSON season-ledger export
- GitHub Actions CI
- automatic GitHub Pages deployment

## Principles

1. **Physics decides the result.** No hidden winner scripting.
2. **Readable chaos.** Telemetry and receipts should explain what happened.
3. **Spectator-first.** Watching a race should be fun even when you do nothing.
4. **Parallax identity.** Original racers, circuits, announcers, art direction, and lore.
5. **Mod-friendly architecture.** New circuits plug into the shared race engine.
6. **Broadcast never overrides sport.** BRBC may choose the camera, commentary, or replay — never the winner.
7. **Replay is historical presentation.** Recorded poses are visual evidence, not a second simulation.
8. **Receipts create standings.** Championship state is derived from recorded race results, never the reverse.
9. **Recovery is explicit.** Deadlock recovery uses a deterministic physical impulse, never teleportation, and every intervention is receipted.
10. **Health is observational.** Race Health may diagnose run quality but cannot control physics or award points.
11. **DNF means DNF.** An unfinished vessel receives zero championship points regardless of progress position at timeout.

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
src/game/RaceEngine.ts                    authoritative race runtime + presentation bridge
src/game/RaceHealthMonitor.ts             observational health/DNF diagnostics
src/game/SmartLabelDeclutter.ts           presentation-only label deconfliction
src/game/circuits/CircuitRuntime.ts       reusable physical/visual circuit construction tools
src/game/circuits/CircuitEngine.ts        playable circuit resolver
src/game/circuits/BattlecaseCircuit.ts    Round 1 circuit module
src/game/circuits/Backspin96Circuit.ts    Round 2 circuit module
src/game/circuits/SpaungearCircuit.ts     Round 3 circuit module
src/game/BroadcastDirector.ts             telemetry-driven shot/event selection
src/game/ReplayBuffer.ts                  recorded visual pose replay
src/game/SeasonManager.ts                 persistent race history + championship derivation
src/game/TrackRegistry.ts                 Season 1 circuit identity/metadata contract
src/main.ts                               live BRBC broadcast + race operations UI
docs/RACE_HEALTH.md                       run-health governance and DNF contract
docs/                                     design, architecture, circuits, broadcast, race operations
.github/workflows/                        CI and GitHub Pages deployment
```

## License

Source code is released under the MIT License. Parallax names, characters, logos, and original visual branding are not granted as trademarks or branding rights by the software license.

---

**Gravity is optional. Glory is everything.**
