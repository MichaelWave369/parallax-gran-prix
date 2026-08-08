# Parallax Gran Prix — Event Weekend Contract

Status: **Slice 8 / Pre-alpha**

## Purpose

A championship round is now an event weekend rather than a single isolated race. The weekend introduces qualifying, grid formation, circuit-specific broadcast packaging, championship implications, and a podium ceremony without allowing presentation or history to rewrite sporting reality.

## Session order

### 1. Qualifying

Qualifying is a real physics session using the same circuit module, Field Vessels, moving hazards, Race Health observer, Sporting Intelligence observer, Broadcast Director, and Recovery Marshal rules as the feature race.

The qualifying seed is deterministically derived from the locked feature-race seed. This creates a distinct but reproducible session.

The terminal qualifying order becomes the feature-race grid:

- finished vessels are ordered by qualifying finish order;
- if qualifying times out, unfinished vessels retain the terminal observed order behind any finishers;
- a qualifying DNF does not award points and does not erase the vessel from the feature race;
- qualifying never becomes a career start, circuit win, or championship result.

### 2. Feature race

The feature race uses the locked feature-race seed and the qualifying-derived starting order.

Once the feature race launches:

- qualifying cannot apply force;
- qualifying cannot change a place;
- qualifying cannot change a finish time;
- qualifying cannot award points;
- qualifying cannot trigger or suppress Recovery Marshal intervention;
- qualifying cannot alter replay poses;
- qualifying cannot alter Sporting Intelligence observations.

**Qualifying may choose where a vessel starts. It may not choose where a vessel finishes.**

## Event receipt

A championship race may include an `EventWeekendReceipt` containing:

- event identity;
- season and round;
- circuit identity;
- event title;
- locked feature-race seed;
- derived qualifying seed;
- qualifying completion timestamp;
- pole position;
- complete qualifying grid;
- qualifying race receipt;
- qualifying Race Health report;
- qualifying Sporting Intelligence report.

The feature race keeps its own independent race receipt, Race Health report, and Sporting Intelligence report. Season history therefore retains both the grid-making session and the result-making session.

## Championship implications

The event layer may calculate and display championship context such as:

- current points leader;
- nearest challenger;
- points gap;
- whether a one-race lead change is mathematically possible.

This is presentation-only context. Championship implications cannot influence simulation forces, grid order, qualifying timing, race timing, steward logic, or points allocation.

## Circuit broadcast package

Each playable circuit may define:

- official event title;
- broadcast kicker;
- hazard note;
- trophy name;
- Noine event tag.

These values affect presentation only.

## Podium

The podium ceremony is derived from the authoritative feature-race standings after the race has finalized.

It cannot modify the top three. It simply presents:

- P1;
- P2;
- P3;
- official circuit trophy;
- receipted finishing times.

Replay remains visual-only and cannot alter podium order.

## Exhibitions

Manual track selection can create an exhibition session.

Exhibitions:

- skip qualifying;
- permit manual simulation seed changes;
- show live Race Health and Sporting Intelligence;
- do not write championship points;
- do not create career starts/wins/podiums;
- do not create circuit, sector, or speed-trap records.

## Governance rule

> **Qualifying sets the grid. Physics sets the result. Receipts preserve both. Broadcast presents both.**

No layer may silently promote a presentation artifact into sporting authority.
