# Sporting Intelligence Contract — Slice 7

## Purpose

Sporting Intelligence makes Parallax Gran Prix performance measurable across races without changing sporting reality.

The layer observes the same race snapshots available to presentation code and derives:

- per-vessel sector splits
- current-race fastest sectors
- speed-trap observations
- live split deltas
- persistent circuit records
- persistent career statistics
- historical facts that BRBC may cite during commentary

## Authority boundary

**Physics creates the result. Sporting Intelligence measures the result.**

Sporting Intelligence MUST NOT:

- apply forces or impulses
- change cannon-es bodies
- change finish place
- change finish time
- award championship points directly
- alter Recovery Marshal behavior
- invent a missing split or speed observation

The race engine remains authoritative for finishes. The race receipt remains authoritative for championship results.

## Observation model

Race snapshots expose each vessel's normalized track progress at broadcast cadence. Sporting Intelligence maps that progress onto the registered circuit geometry and interpolates forward crossings between consecutive observations.

Sector timing therefore belongs to the **observational telemetry layer**, not the authoritative finish-timing layer. This distinction must remain explicit in UI and exported ledgers.

Speed values are forward-speed estimates derived from observed progress over time and are labeled in metres per second for the circuit coordinate model. They are useful for within-game comparison, records, and commentary; they are not external laboratory measurements.

## Sector splits

Each registered circuit contains ordered sectors. A sector split is recorded the first time a vessel crosses the next sector boundary in the forward direction.

A vessel's final sector is closed using its authoritative finish time when the vessel finishes.

DNFs do not receive a fabricated final-sector split.

## Speed traps

Each playable circuit may register named speed-trap positions. A vessel is measured once per trap on its first forward crossing.

Reversing and crossing the same trap again does not create a second record attempt in the same race.

## Historical records

Championship-eligible race records are copied into a persistent career archive. Exhibition runs may show live Sporting Intelligence but do not write championship/career records.

Persistent records include:

- circuit winning-time record
- fastest observed split for each sector
- fastest observed value for each named speed trap
- racer starts, finishes, wins, podiums, DNFs, total points, best finish, average finish, fastest-sector awards, and circuit wins

The career archive survives `NEW SEASON`; season standings reset independently.

## BRBC historical commentary

BRBC may cite stored statistics when they exist. Examples:

- circuit record entering the event
- historical sector record when entering a sector
- career wins/starts for a winner
- a provisional new sector or speed-trap record during a championship race

If no record exists, BRBC must say the reference is unset rather than inventing one.

## Record admission

A provisional live record becomes persistent only when the race is championship-eligible and the completed event is written to the season/career ledger.

This preserves the ordering:

`physics -> receipt -> sporting envelope -> persistent record`

not:

`record target -> desired result -> physics`

## Slice 7 governance line

> **Measure the race. Remember the race. Never manufacture the race.**
