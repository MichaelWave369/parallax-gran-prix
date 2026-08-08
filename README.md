# PARALLAX GRAN PRIX

> **Pick your vessel. Enter the field. Reality takes it from there.**

Parallax Gran Prix (PGP) is an open-source, physics-first spectator racing experiment set in the Parallax Universe. Racers are spherical **Field Vessels**. Circuits are strange physical worlds. Outcomes are produced by simulation rather than scripted winners.

The official broadcast team is the **British Robot Broadcasting Corporation (BRBC)**:

- **Threve** — play-by-play
- **Six't** — technical analyst
- **Noine** — senior commentator

## Project status

**Pre-alpha / foundation build.** The first playable target is a browser-based Battlecase Circuit prototype with 12 physics racers, race timing, standings, spectator cameras, telemetry, and event-driven BRBC commentary.

## First playable target

- 12 simulated Field Vessels
- Battlecase Circuit
- deterministic race seed support
- lap/checkpoint timing
- position tracking
- spectator / chase cameras
- BRBC event feed
- post-race receipt

## Principles

1. **Physics decides the result.** No hidden winner scripting.
2. **Readable chaos.** Telemetry and replay should explain what happened.
3. **Spectator-first.** Watching a race should be fun even when you do nothing.
4. **Parallax identity.** Original racers, circuits, announcers, art direction, and lore.
5. **Mod-friendly architecture.** Community circuits and racers should become possible without rewriting the engine.

## Technology direction

The initial browser prototype uses **TypeScript + Vite + Three.js + cannon-es**.

## Repository map

```text
src/                 playable browser prototype
docs/                design, architecture, circuits, broadcast rules
public/               static assets
```

## License

Source code is released under the MIT License. Parallax names, characters, logos, and original visual branding are not granted as trademarks or branding rights by the software license.

---

**Gravity is optional. Glory is everything.**
