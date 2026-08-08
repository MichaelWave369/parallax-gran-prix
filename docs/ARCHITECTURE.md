# Parallax Gran Prix — Architecture

## Prototype stack

- TypeScript
- Vite
- Three.js for rendering
- cannon-es for rigid-body physics

## Runtime layers

### Simulation
Owns bodies, static circuit geometry, start state, collision response, finish detection, and seed-driven launch variation.

### Race state
Derives standings, progress, finish places, elapsed time, and winner state from simulation state.

### Broadcast event layer
Turns important race facts into semantic events such as:

- `start`
- `lead-change`
- `collision`
- `finish`
- `winner`

BRBC presentation consumes these events. The broadcast layer does not decide race outcomes.

### Rendering
Three.js mirrors simulation transforms and renders the circuit, racers, lighting, and spectator camera.

### HUD
DOM UI displays race control, seed, state, timer, live standings, and current BRBC callout.

## Determinism direction

The current prototype uses a seeded pseudo-random generator for starting variation and scene decoration. Exact deterministic replay across browsers is **not yet guaranteed** because floating-point physics engines can vary by platform and engine version.

The target receipt should eventually include:

```json
{
  "simulationVersion": "...",
  "circuitVersion": "...",
  "seed": 369,
  "racerConfigHash": "...",
  "finishOrder": [],
  "finishTimes": []
}
```

## Planned modules

```text
src/
  game/
    RaceEngine.ts
    config.ts
  broadcast/
    EventBus.ts
    BrbcDirector.ts
    CommentaryRules.ts
  race/
    Timing.ts
    Standings.ts
    Receipt.ts
  circuits/
    CircuitSchema.ts
    BattlecaseCircuit.ts
  replay/
    Recorder.ts
    Playback.ts
```

The first playable intentionally keeps several of these concerns together in `RaceEngine.ts`. They should be split once behavior stabilizes rather than prematurely abstracted.

## Governance boundary

Simulation state is authoritative for sporting results. Rendering, commentary, camera direction, cosmetics, and UI may interpret that state but must not silently rewrite it.
