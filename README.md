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

**Pre-alpha / Slice 8 — Event Production + Ledger Larry 500.** PGP now has five playable circuits and a full championship-event weekend flow: a separate physics qualifying sprint sets the feature-race grid, the feature race remains independently physics-authoritative, qualifying telemetry is preserved with the championship event, circuit-specific BRBC packages frame each venue, and completed feature races receive a podium/trophy presentation.

## Championship event weekend

A scheduled championship round now has two separate simulated sessions:

1. **Qualifying** — all 12 Field Vessels run the real circuit under a deterministic qualifying seed. The observed terminal order sets the official feature-race grid. Qualifying awards zero championship points.
2. **Feature Race** — the circuit reloads using the locked race seed and qualifying-derived starting order. Once launched, qualifying has no authority over the race outcome.

The event ledger preserves:

- race seed
- qualifying seed
- qualifying order and pole position
- full qualifying race receipt
- qualifying Race Health envelope
- qualifying Sporting Intelligence envelope
- feature-race receipt
- feature-race Race Health envelope
- feature-race Sporting Intelligence envelope

**Qualifying may choose where a vessel starts. It may not choose where a vessel finishes.**

Manual exhibition runs skip qualifying and do not write championship, career, or circuit records.

## Playable circuits

### Round 1 — Battlecase Circuit

1. **Boot Straight**
2. **GPU Canyon**
3. **Cooling Gauntlet**
4. **Parallax Split**
5. **Motherboard Sprint**

Official event package: **Battlecase Circuit Grand Prix** · trophy: **The Golden Boot Sector**

### Round 2 — Backspin '96

1. **Drop the Needle**
2. **Groove Run**
3. **Tonearm Crossing**
4. **Crossfader Split**
5. **Speaker Stack Sprint**

Official event package: **Backspin '96 Classic** · trophy: **The Golden Crossfader**

### Round 3 — SPAUNGEAR Works

1. **Forge Entry**
2. **Pinion Field**
3. **Transfer Gates**
4. **Crown Mesh**
5. **Output Shaft**

Official event package: **SPAUNGEAR Works 500** · trophy: **The Brass Crown Gear**

### Round 4 — Mirror Labyrinth

1. **Reflection Entry** — mirrored feed guides and a neutral center bumper.
2. **Symmetry Hall** — paired geometry with left/right physical counterparts.
3. **Inverse Gates** — opposing sweepers rotate in inverse directions.
4. **Mirror Split** — two reflected routes around a central spine.
5. **Prism Sprint** — mirrored glancing facets into the finish.

Official event package: **Mirror Labyrinth Reflection Cup** · trophy: **The Prism Crown**

### Round 5 — Ledger Larry 500

1. **Inbox Intake** — paper-tray feed guides funnel the field into the machine.
2. **Carbon Rollers** — rotating carbon-copy bars and old-office machinery.
3. **Audit Gates** — alternating paperwork chicanes and giant stamp arms.
4. **Duplicate / Triplicate** — a physical two-route carbon-copy split.
5. **Pneumatic Dispatch** — tube-mouth bumpers and filing-machine geometry into the finish.

Official event package: **Ledger Larry 500** · trophy: **The Golden Carbon Copy**

> **HEY, WHERE'S MY CARBONS?**

## Season 1 circuit registry

1. Battlecase Circuit — playable
2. Backspin '96 — playable
3. SPAUNGEAR Works — playable
4. Mirror Labyrinth — playable
5. Ledger Larry 500 — playable
6. PhiVessel Dream Run — planned
7. Carbon Loop — planned
8. Parallax Data Center — planned
9. The 3–6–9 Grand Final — planned

## Current features

- 12 simulated Field Vessels with identity codes and trackside labels
- deterministic feature-race seed support
- deterministic derived qualifying seed for scheduled championship events
- separate physics-authoritative qualifying session
- qualifying-derived feature-race starting grid
- full qualifying provenance preserved with championship event records
- event-specific titles, kickers, hazard notes, trophies, and Noine tags
- pre-race grid cards with qualifying timing and championship points
- live championship-implication telemetry
- post-race BRBC podium ceremony
- modular `CircuitRuntime` + circuit module resolver
- five genuinely different playable circuit modules
- circuit-aware sectors, split cameras, race receipts, and season routing
- deterministic **Recovery Marshal** after verified low-speed/no-progress deadlocks
- observational **Race Health Monitor** with per-vessel run states
- DNF diagnostics with zero-points championship handling
- smart screen-space label deconfliction
- observational **Sporting Intelligence**
- per-vessel sector splits
- named circuit speed traps
- live timing deltas and forward-speed estimates
- persistent circuit winning-time records
- persistent sector and speed-trap records
- persistent career archive across season resets
- career starts, finishes, wins, podiums, DNFs, points, best/average finish, fastest-sector awards, and circuit wins
- BRBC commentary enriched with actual stored historical statistics
- provisional BRBC record callouts when an eligible feature race beats stored sector/speed records
- theatrical opening grid presentation
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
- circuit-aware `NEXT ROUND` flow
- manual playable-track switch for exhibitions
- JSON season + career + event-weekend ledger export
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
12. **Sporting Intelligence is observational.** Splits, speed traps, deltas, and records measure races; they do not manufacture them.
13. **Career memory survives seasons.** `NEW SEASON` resets the championship table, not the historical record archive.
14. **Qualifying authority ends at the grid.** It determines starting order only; feature-race physics determines the result.
15. **Exhibitions do not launder records.** Manual test runs can display telemetry but cannot become championship/career history.

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
src/game/RaceEngine.ts                         authoritative race runtime + presentation bridge
src/game/EventWeekendManager.ts                qualifying/grid provenance + event-weekend state
src/game/RaceHealthMonitor.ts                  observational health/DNF diagnostics
src/game/SportingIntelligence.ts               observational splits, speed traps, and record envelope
src/game/SmartLabelDeclutter.ts                presentation-only label deconfliction
src/game/circuits/CircuitRuntime.ts            reusable physical/visual circuit construction tools
src/game/circuits/CircuitEngine.ts             playable circuit resolver
src/game/circuits/BattlecaseCircuit.ts         Round 1 circuit module
src/game/circuits/Backspin96Circuit.ts         Round 2 circuit module
src/game/circuits/SpaungearCircuit.ts          Round 3 circuit module
src/game/circuits/MirrorLabyrinthCircuit.ts    Round 4 circuit module
src/game/circuits/LedgerLarryCircuit.ts        Round 5 circuit module
src/game/BroadcastDirector.ts                  telemetry-driven shot/event selection
src/game/ReplayBuffer.ts                       recorded visual pose replay
src/game/SeasonManager.ts                      season + persistent career/circuit/event records
src/game/TrackRegistry.ts                      Season 1 circuit + speed-trap + broadcast-package metadata
src/main.ts                                    live BRBC broadcast + event/race operations UI
src/event.css                                  event-weekend + podium presentation layer
docs/EVENT_WEEKEND.md                          qualifying and event-production governance contract
docs/RACE_HEALTH.md                            run-health governance and DNF contract
docs/SPORTING_INTELLIGENCE.md                  split/record governance contract
docs/                                          design, architecture, circuits, broadcast, race operations
.github/workflows/                             CI and GitHub Pages deployment
```

## License

Source code is released under the MIT License. Parallax names, characters, logos, and original visual branding are not granted as trademarks or branding rights by the software license.

---

**Gravity is optional. Glory is everything.**
