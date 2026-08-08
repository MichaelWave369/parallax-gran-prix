# BRBC Broadcast Director — Slice 3

The BRBC Broadcast Director is an **observational production system**. It watches authoritative simulation telemetry and decides what the audience sees and hears.

It does **not** modify racer bodies, forces, collisions, finishing order, or timing.

## Runtime flow

```text
cannon-es physics world
        ↓
authoritative racer poses + standings
        ↓
semantic event detection
        ↓
BRBC Broadcast Director
   ↙                 ↘
camera shot          commentary exchange
   ↓                 ↓
visual presentation  Threve → Six't → Noine
```

## Director shots

Slice 3 supports:

- `grid-wide` — pre-race field presentation
- `wide-overview` — user-selected overview
- `leader-chase` — default racing shot
- `battle-two-shot` — frames the closest pair under the battle threshold
- `split-overhead` — emphasizes divergent routes at the Parallax Split
- `finish-line` — takes over for the final charge
- `replay-finish` — fixed finish coverage during recorded-pose replay

AUTO mode is production-directed. Manual camera modes remain spectator controls and do not alter simulation state.

## Semantic events

The director derives these new broadcast events from telemetry:

- `overtake`
- `battle`
- `final-ten`

Existing engine events remain available:

- `opening`
- `start`
- `lead-change`
- `collision`
- `sector`
- `split`
- `finish`
- `photo-finish`
- `winner`
- `replay`

## Three-announcer exchange queue

Events can enqueue a short sequence rather than a single random line.

Typical exchange:

```text
Threve  → immediate emotional call
Six't   → telemetry / mechanism explanation
Noine   → dry conclusion
```

Urgent events such as the final charge, winner, photo finish, and replay may interrupt stale queued commentary so the broadcast remains synchronized with the race.

## Finish replay

The replay buffer samples racer visual poses during the live race. A finish replay reads those recorded poses back at reduced speed.

The replay system:

- does not rewind cannon-es,
- does not rerun collisions,
- does not recompute timing,
- does not change the receipt,
- does not modify the winner.

It is a **visual playback of historical simulation output**.

## Receipt additions

Slice 3 receipts include production telemetry:

- overtakes called,
- director cuts,
- broadcast lines delivered,
- replay frame count.

These values describe presentation activity only. Sporting truth continues to come from the simulation and finish timing.

## Governing rule

> The director may choose the story camera. Reality chooses the story.
