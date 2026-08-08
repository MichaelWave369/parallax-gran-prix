# Parallax Gran Prix — Game Design

## Core fantasy

Parallax Gran Prix is a spectator-first physics racing sport. Players choose or follow a **Field Vessel**, enter a strange Parallax circuit, and watch an unscripted physical race unfold.

The key promise is simple:

> **The game does not choose the winner. The race happens.**

## Player modes

### Spectator
Pick a racer, camera, or broadcast view and watch the simulation.

### Race Director
Choose seed, grid, circuit configuration, environmental modifiers, and broadcast style.

### Builder — future
Construct and validate custom circuits with a track editor.

## Race loop

1. Select circuit and seed.
2. Load racers onto the grid.
3. Three-second start countdown.
4. Physics simulation begins.
5. Position and telemetry are derived from the world state.
6. BRBC reacts to notable events.
7. Finish order is recorded.
8. A race receipt preserves the result and seed.

## First roster

- Carbon
- Silicon
- Dreamer
- Mirror
- Wave Rider
- GovernOtter
- Chimp Monk
- Chick Monk
- Ledger Larry
- Battlecase
- Builder
- Reality Ledger

## First championship teams

- Carbon Racing
- Silicon Velocity
- Dreamer Motorsport
- Ledger Racing Authority
- Chimp Monk Racing
- Chick Monk Racing
- Wave Rider
- GovernOtter Works Team

## Design rules

### Physics before drama
Broadcast presentation may emphasize drama, but it must not secretly alter a winner.

### Seeds are receipts
A race seed is shown in the UI. The long-term target is that circuit version + racer configuration + simulation version + seed are sufficient to reproduce a race closely enough for verification.

### Racers are readable
Racer differences should be visible and governed. Cosmetic identity is welcome; hidden pay-to-win stat changes are not.

### Every circuit needs a Parallax Split
A signature branch, hazard, or choice point should create multiple viable paths where local physical state determines what happens next.

## Season 1 circuit slate

1. Battlecase Circuit
2. Backspin '96
3. SPAUNGEAR Works
4. Mirror Labyrinth
5. Ledger Larry 500
6. PhiVessel Dream Run
7. Carbon Loop
8. Parallax Data Center
9. The 3–6–9 Grand Final

## Broadcast identity

Official coverage is provided by the **British Robot Broadcasting Corporation (BRBC)**.

- **Threve** — high-energy play-by-play
- **Six't** — telemetry and technical analysis
- **Noine** — dry senior commentary

The booth should react to simulation events, not a prewritten race script.

## First playable definition

A first playable is successful when a user can:

- load the project in a browser,
- start a 12-vessel race,
- watch bodies collide and overtake,
- see live standings,
- see a winner and finish order,
- reset or change the seed,
- receive event-driven BRBC callouts.
