# Circuit Engine + Recovery Marshal

Slice 5 separates **race authority** from **circuit construction**.

## Runtime boundary

```text
TrackRegistry metadata
        ↓
CircuitEngine resolver
        ↓
Circuit module
        ↓
CircuitRuntime geometry / physics helpers
        ↓
RaceEngine
        ↓
Broadcast Director / Replay / Season Operations
```

`RaceEngine` owns race state, timing, racer bodies, finishing order, replay capture, BRBC events, and receipts.

A circuit module owns the physical/visual world that those racer bodies move through.

A circuit module may add:

- static barriers,
- angled chicanes,
- bumpers,
- kinematic sweepers,
- route dividers,
- sector markers,
- decorative geometry,
- circuit-specific colors and visual identity.

It must not directly choose finishing order or championship points.

## Slice 5 playable modules

### `BattlecaseCircuit`

Battlecase was extracted from the monolithic race engine. Its major flat obstacle faces were replaced with oblique chicanes and the Parallax Split receives a rounded nose. The purpose is to preserve collision drama while reducing zero-escape pockets.

### `Backspin96Circuit`

Backspin '96 proves the circuit API can express a genuinely different world without replacing the race engine.

Physical / visual motifs:

- record platters,
- groove guides,
- moving tonearms,
- crossfader split,
- speaker-cone kickers,
- magenta/cyan/gold broadcast palette.

## Recovery Marshal

Physical tracks can still create rare deadlocks. PGP therefore has a last-resort **Recovery Marshal**.

A racer becomes eligible only when:

1. it is still racing,
2. it has failed to make the configured minimum forward progress for the configured stall interval,
3. its current speed is below the recovery speed threshold.

The marshal then applies a deterministic physical impulse to the existing cannon-es body.

The marshal does **not**:

- teleport the racer,
- assign a new position,
- change its finishing place directly,
- choose a winner,
- hide the intervention.

Each use increments `recoveryInterventions` in the final race receipt and can trigger a BRBC recovery callout.

## Governance rule

> **Fix geometry first. Recover physics second. Never rewrite the result.**

The Recovery Marshal is a safety valve, not a drama generator. Circuit designers should prefer glancing geometry, escape vectors, rounded noses, and adequate lane gaps so interventions trend toward zero.

## Adding the next circuit

1. Register metadata and sectors in `TrackRegistry.ts`.
2. Add a circuit module under `src/game/circuits/`.
3. Build through `CircuitRuntime` helpers.
4. Register the module in `CircuitEngine.ts`.
5. Define split window/camera metadata if needed.
6. Verify CI.
7. Run multiple seeds and inspect Recovery Marshal counts.
8. Only then mark the circuit `playable`.
