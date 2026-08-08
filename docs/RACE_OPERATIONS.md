# Parallax Gran Prix — Race Operations

Slice 4 turns individual Battlecase races into a persistent local championship.

## Season state

Season state is stored in the browser under a versioned local-storage key. The runtime stores:

- season number,
- completed race receipts,
- full finishing order for each race,
- simulation seed,
- circuit identity,
- completion timestamp.

The season layer does not alter the physics simulation.

## Points

The current championship table uses:

`25–18–15–12–10–8–6–4–2–1–0–0`

Driver standings are derived from saved finishing orders. Team standings aggregate driver points by team name so multi-racer teams can be supported later without changing the ledger format.

## Round workflow

1. Prepare a simulation seed.
2. Run the authoritative physics race.
3. Produce the race receipt.
4. Record the finishing order and receipt into local season history.
5. Recompute driver and team standings.
6. Prepare the next round with a new seed.

A user may also deliberately rerun an older seed. The repeated race is still a new championship event because the event record includes its own round and timestamp.

## Export

`EXPORT LEDGER` downloads a JSON document containing:

- schema identifier,
- export timestamp,
- points system,
- complete season state,
- derived driver standings,
- derived team standings.

This keeps the championship inspectable outside the application.

## Circuit registry

`src/game/TrackRegistry.ts` is the first circuit contract. It identifies the active circuit and the planned nine-round Season 1 slate without requiring the UI to hard-code Battlecase metadata.

The registry currently separates circuit identity from circuit implementation. A later slice should move geometry construction behind a proper circuit-builder interface.

## Authority boundary

Race Operations may:

- preserve receipts,
- compute championship points,
- choose a future simulation seed,
- display historical results,
- export season data.

Race Operations may **not**:

- alter a completed result,
- award hidden bonus points,
- modify racer bodies during a race,
- replace a race receipt with presentation-derived data.

**Receipts create standings. Standings do not create receipts.**
