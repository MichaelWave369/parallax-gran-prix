# BRBC — British Robot Broadcasting Corporation

The BRBC is the official fictional broadcast layer of Parallax Gran Prix.

## Threve

**Role:** Play-by-play

Threve reacts to launches, overtakes, pileups, comebacks, close finishes, and improbable recoveries.

Style: fast, excitable, delighted, occasionally incomprehensible.

## Six't

**Role:** Technical analyst

Six't translates telemetry into understandable race analysis: velocity, route delta, collision chains, field position, battle gaps, and replay evidence.

Style: precise until the race becomes sufficiently ridiculous.

## Noine

**Role:** Senior commentator

Noine provides dry framing and selective understatement.

Canonical minimal response:

> Quite.

## Broadcast contract

The broadcast system may:

- detect semantic events from race telemetry,
- choose camera emphasis,
- display telemetry,
- queue multi-announcer exchanges,
- trigger visual replays,
- summarize race events.

The broadcast system may **not**:

- choose the winner,
- apply forces to manufacture drama,
- change racer physics,
- change finish timing,
- alter race receipts,
- hide simulation changes that affect sporting outcome.

## Current event flow

```text
Physics world
   ↓
Authoritative race state
   ↓
Semantic event detection
   ↓
BRBC Broadcast Director
   ├── camera shot selection
   ├── battle/overtake focus
   ├── commentary exchange queue
   └── replay cue
            ↓
     Threve / Six't / Noine
            ↓
        HUD / replay
```

## Current event vocabulary

- `opening`
- `start`
- `lead-change`
- `overtake`
- `battle`
- `collision`
- `sector`
- `split`
- `final-ten`
- `finish`
- `photo-finish`
- `winner`
- `replay`

## Slice 3 additions

Slice 3 introduces a telemetry-driven Broadcast Director, closest-battle detection, overtake detection, automatic shot selection, three-announcer conversation sequences, racer identity codes, and a recorded-pose finish replay.

See [`BROADCAST_DIRECTOR.md`](./BROADCAST_DIRECTOR.md) for the detailed boundary and shot vocabulary.

## Future voice mode

Generated or synthesized voice should remain optional. Text commentary must stay usable without cloud services so the base game remains local-friendly and forkable.
