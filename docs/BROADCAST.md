# BRBC — British Robot Broadcasting Corporation

The BRBC is the official fictional broadcast layer of Parallax Gran Prix.

## Threve

**Role:** Play-by-play

Threve reacts to immediate race action: launches, overtakes, pileups, comebacks, close finishes, and improbable recoveries.

Style: fast, excitable, delighted, occasionally incomprehensible.

## Six't

**Role:** Technical analyst

Six't translates telemetry into understandable race analysis: velocity, spin, route delta, collision chains, field position, and future replay metrics.

Style: precise until the race becomes sufficiently ridiculous.

## Noine

**Role:** Senior commentator

Noine provides dry framing and selective understatement.

Canonical minimal response:

> Quite.

## Broadcast contract

The broadcast system may:

- select commentary lines,
- choose camera emphasis,
- display telemetry,
- trigger replays,
- summarize race events.

The broadcast system may **not**:

- choose the winner,
- change racer physics to manufacture drama,
- hide simulation changes that affect sporting outcome.

## Event flow

```text
Physics world
   ↓
Race state derivation
   ↓
Semantic event
   ↓
BRBC director
   ↓
Threve / Six't / Noine line
   ↓
HUD / audio / replay cue
```

## Future event vocabulary

- `overtake`
- `lead_change`
- `multi_collision`
- `route_split`
- `largest_comeback`
- `photo_finish`
- `stalled_racer`
- `reentry`
- `record_lap`
- `championship_change`

## Future voice mode

Generated or synthesized voice should remain optional. Text commentary must stay usable without cloud services so the base game remains local-friendly and forkable.
