# Parallax Gran Prix — Race Health Contract

Slice 6 adds an observational **Race Health** layer. It exists to explain whether the physical race is flowing cleanly, whether a vessel is approaching a deadlock, and whether the Recovery Marshal had to intervene.

## Authority boundary

Race Health does **not** control the simulation.

It may:

- observe progress and finish state,
- classify a vessel as `GREEN`, `WATCH`, `STALLED`, `RECOVERED`, `FINISHED`, or `DNF`,
- display health state in the broadcast UI,
- preserve recovery history beside the race receipt,
- preserve a health envelope in the season ledger,
- report DNFs and recovery counts.

It may not:

- move a vessel,
- assign a place,
- award points,
- change a finish time,
- hide a Recovery Marshal intervention.

The existing Recovery Marshal remains a physical-system function: after a verified low-speed/no-progress deadlock it may apply a deterministic impulse to the existing cannon-es body. It never teleports a vessel and every intervention remains counted by the authoritative race receipt.

## Health states

- `GREEN` — normal forward progress.
- `WATCH` — little forward progress for roughly two seconds.
- `STALLED` — observational stall threshold reached; the physics Recovery Marshal may soon qualify independently.
- `RECOVERED` — a receipted Recovery Marshal event was observed recently.
- `FINISHED` — finish crossing recorded by RaceEngine.
- `DNF` — race ended without a recorded finish crossing.

The health monitor is deliberately not the same code path as the Recovery Marshal. One observes. One may act physically. This separation makes it harder for presentation logic to become hidden sporting logic.

## DNF scoring rule

A DNF earns **zero championship points**, regardless of where the unfinished vessel happened to be on track when the race timeout ended.

Older local Season 1 records remain readable. When an older record lacks the explicit `finished` boolean, `finishTime` is used as the compatibility signal.

## Field Health score

The UI derives a lightweight 0–100 Field Health score from observable conditions such as recoveries, DNFs, current stalls, and watch states. The score is a broadcast diagnostic only. It does not affect race results or championship points.

## Smart label deconfliction

The three-dimensional racer name sprites are presentation overlays. Slice 6 installs a renderer-side deconfliction hook that fades labels which project into the same small screen-space cluster. It does not hide or modify the physical vessel and has no input into RaceEngine ordering.

## Ledger rule

**Physics creates results. Receipts preserve results. Race Health explains run quality.**
