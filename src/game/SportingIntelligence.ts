import { RACERS, RACE } from './config';
import type { RaceSnapshot } from './RaceEngine';
import type { CircuitDefinition, CircuitSector, SpeedTrapDefinition } from './TrackRegistry';

export type SportingSplit = {
  racerId: string;
  racerCode: string;
  racerName: string;
  sectorId: string;
  sectorName: string;
  duration: number;
  completedAt: number;
};

export type SpeedTrapHit = {
  racerId: string;
  racerCode: string;
  racerName: string;
  trapId: string;
  trapName: string;
  speed: number;
  elapsed: number;
};

export type SportingRacerReport = {
  id: string;
  code: string;
  name: string;
  topSpeed: number;
  splits: SportingSplit[];
  speedTraps: SpeedTrapHit[];
};

export type SportingRaceReport = {
  schema: 'parallax-gran-prix-sporting-intelligence/v1';
  circuitId: string;
  circuitName: string;
  fastestSectors: SportingSplit[];
  speedTrapRecords: SpeedTrapHit[];
  topSpeed: SpeedTrapHit | null;
  intelligenceEvents: number;
  racers: SportingRacerReport[];
};

export type SportingRacerLive = {
  id: string;
  code: string;
  name: string;
  sectorId: string;
  sectorName: string;
  speed: number;
  topSpeed: number;
  lastSplit?: SportingSplit;
  deltaToRaceBest: number | null;
};

export type SportingEvent =
  | {
      type: 'sector-split';
      split: SportingSplit;
      raceBest: boolean;
      previousBest: SportingSplit | null;
    }
  | {
      type: 'speed-trap';
      hit: SpeedTrapHit;
      raceBest: boolean;
      previousBest: SpeedTrapHit | null;
    };

type RacerRuntime = {
  id: string;
  code: string;
  name: string;
  lastZ: number;
  lastElapsed: number;
  currentSectorIndex: number;
  sectorEntryElapsed: number;
  speed: number;
  topSpeed: number;
  finished: boolean;
  splits: SportingSplit[];
  speedTraps: SpeedTrapHit[];
  seenTraps: Set<string>;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class SportingIntelligence {
  private racers = new Map<string, RacerRuntime>();
  private fastestSectors = new Map<string, SportingSplit>();
  private fastestTraps = new Map<string, SpeedTrapHit>();
  private latestEvent?: SportingEvent;
  private intelligenceEvents = 0;

  constructor(private circuit: CircuitDefinition) {
    this.reset();
  }

  reset() {
    this.fastestSectors.clear();
    this.fastestTraps.clear();
    this.latestEvent = undefined;
    this.intelligenceEvents = 0;
    this.racers = new Map(RACERS.map((racer) => [racer.id, {
      id: racer.id,
      code: racer.code,
      name: racer.name,
      lastZ: RACE.startZ,
      lastElapsed: 0,
      currentSectorIndex: 0,
      sectorEntryElapsed: 0,
      speed: 0,
      topSpeed: 0,
      finished: false,
      splits: [],
      speedTraps: [],
      seenTraps: new Set<string>()
    }]));
  }

  observeSnapshot(snapshot: RaceSnapshot): SportingEvent[] {
    const events: SportingEvent[] = [];

    snapshot.standings.forEach((standing) => {
      const row = this.racers.get(standing.id);
      if (!row) return;

      const z = this.progressToZ(standing.progress);
      const elapsed = snapshot.elapsed;

      if (snapshot.state === 'ready' || snapshot.state === 'grid' || snapshot.state === 'countdown') {
        row.lastZ = z;
        row.lastElapsed = 0;
        row.currentSectorIndex = this.sectorIndexAt(z);
        row.sectorEntryElapsed = 0;
        row.speed = 0;
        return;
      }

      const dt = elapsed - row.lastElapsed;
      const dz = z - row.lastZ;
      const instantSpeed = dt > 0.015 ? Math.max(0, dz / dt) : row.speed;
      if (dt > 0.015) {
        row.speed = row.speed > 0 ? row.speed * 0.52 + instantSpeed * 0.48 : instantSpeed;
        row.topSpeed = Math.max(row.topSpeed, row.speed);
      }

      if (!row.finished) {
        this.captureSpeedTraps(row, row.lastZ, z, row.lastElapsed, elapsed, row.speed, events);
        this.captureSectorCrossings(row, row.lastZ, z, row.lastElapsed, elapsed, events);
      }

      if (standing.finished && !row.finished) {
        row.finished = true;
        this.completeFinalSector(row, standing.finishTime ?? elapsed, events);
      }

      row.lastZ = z;
      row.lastElapsed = elapsed;
    });

    if (events.length) {
      this.latestEvent = events.at(-1);
      this.intelligenceEvents += events.length;
    }
    return events;
  }

  getRacer(id: string): SportingRacerLive | undefined {
    const row = this.racers.get(id);
    if (!row) return undefined;
    const sector = this.circuit.sectors[row.currentSectorIndex] ?? this.circuit.sectors[0];
    const lastSplit = row.splits.at(-1);
    const raceBest = lastSplit ? this.fastestSectors.get(lastSplit.sectorId) : undefined;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      sectorId: sector?.id ?? 'track',
      sectorName: sector?.name ?? 'TRACK',
      speed: row.speed,
      topSpeed: row.topSpeed,
      lastSplit,
      deltaToRaceBest: lastSplit && raceBest ? lastSplit.duration - raceBest.duration : null
    };
  }

  getLatestEvent() {
    return this.latestEvent;
  }

  getReport(): SportingRaceReport {
    const fastestSectors = this.circuit.sectors
      .map((sector) => this.fastestSectors.get(sector.id))
      .filter((split): split is SportingSplit => Boolean(split))
      .map((split) => ({ ...split }));

    const speedTrapRecords = (this.circuit.speedTraps ?? [])
      .map((trap) => this.fastestTraps.get(trap.id))
      .filter((hit): hit is SpeedTrapHit => Boolean(hit))
      .map((hit) => ({ ...hit }));

    const allTrapHits = [...this.racers.values()].flatMap((row) => row.speedTraps);
    const topSpeed = allTrapHits.reduce<SpeedTrapHit | null>((best, hit) =>
      !best || hit.speed > best.speed ? hit : best, null);

    return {
      schema: 'parallax-gran-prix-sporting-intelligence/v1',
      circuitId: this.circuit.id,
      circuitName: this.circuit.name,
      fastestSectors,
      speedTrapRecords,
      topSpeed: topSpeed ? { ...topSpeed } : null,
      intelligenceEvents: this.intelligenceEvents,
      racers: [...this.racers.values()].map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        topSpeed: row.topSpeed,
        splits: row.splits.map((split) => ({ ...split })),
        speedTraps: row.speedTraps.map((hit) => ({ ...hit }))
      }))
    };
  }

  private captureSectorCrossings(
    row: RacerRuntime,
    fromZ: number,
    toZ: number,
    fromElapsed: number,
    toElapsed: number,
    events: SportingEvent[]
  ) {
    if (toZ <= fromZ || !this.circuit.sectors.length) return;
    const targetIndex = this.sectorIndexAt(toZ);
    if (targetIndex <= row.currentSectorIndex) return;

    while (row.currentSectorIndex < targetIndex) {
      const nextIndex = row.currentSectorIndex + 1;
      const boundary = this.circuit.sectors[nextIndex]?.startZ;
      if (boundary === undefined) break;
      const fraction = clamp((boundary - fromZ) / Math.max(0.0001, toZ - fromZ), 0, 1);
      const crossingElapsed = fromElapsed + (toElapsed - fromElapsed) * fraction;
      this.completeSector(row, row.currentSectorIndex, crossingElapsed, events);
      row.currentSectorIndex = nextIndex;
      row.sectorEntryElapsed = crossingElapsed;
    }
  }

  private completeFinalSector(row: RacerRuntime, finishElapsed: number, events: SportingEvent[]) {
    const sector = this.circuit.sectors[row.currentSectorIndex];
    if (!sector || row.splits.some((split) => split.sectorId === sector.id)) return;
    this.completeSector(row, row.currentSectorIndex, finishElapsed, events);
  }

  private completeSector(
    row: RacerRuntime,
    sectorIndex: number,
    completedAt: number,
    events: SportingEvent[]
  ) {
    const sector = this.circuit.sectors[sectorIndex];
    if (!sector) return;
    const duration = completedAt - row.sectorEntryElapsed;
    if (!Number.isFinite(duration) || duration <= 0.04) return;

    const split: SportingSplit = {
      racerId: row.id,
      racerCode: row.code,
      racerName: row.name,
      sectorId: sector.id,
      sectorName: sector.name,
      duration,
      completedAt
    };
    row.splits.push(split);

    const previousBest = this.fastestSectors.get(sector.id) ?? null;
    const raceBest = !previousBest || split.duration < previousBest.duration;
    if (raceBest) this.fastestSectors.set(sector.id, split);
    events.push({ type: 'sector-split', split: { ...split }, raceBest, previousBest: previousBest ? { ...previousBest } : null });
  }

  private captureSpeedTraps(
    row: RacerRuntime,
    fromZ: number,
    toZ: number,
    fromElapsed: number,
    toElapsed: number,
    estimatedSpeed: number,
    events: SportingEvent[]
  ) {
    if (toZ <= fromZ) return;
    (this.circuit.speedTraps ?? []).forEach((trap) => {
      if (row.seenTraps.has(trap.id)) return;
      if (!(fromZ < trap.z && toZ >= trap.z)) return;

      const fraction = clamp((trap.z - fromZ) / Math.max(0.0001, toZ - fromZ), 0, 1);
      const elapsed = fromElapsed + (toElapsed - fromElapsed) * fraction;
      const hit: SpeedTrapHit = {
        racerId: row.id,
        racerCode: row.code,
        racerName: row.name,
        trapId: trap.id,
        trapName: trap.name,
        speed: Math.max(0, estimatedSpeed),
        elapsed
      };
      row.seenTraps.add(trap.id);
      row.speedTraps.push(hit);

      const previousBest = this.fastestTraps.get(trap.id) ?? null;
      const raceBest = !previousBest || hit.speed > previousBest.speed;
      if (raceBest) this.fastestTraps.set(trap.id, hit);
      events.push({ type: 'speed-trap', hit: { ...hit }, raceBest, previousBest: previousBest ? { ...previousBest } : null });
    });
  }

  private sectorIndexAt(z: number) {
    if (!this.circuit.sectors.length) return 0;
    const index = this.circuit.sectors.findIndex((sector) => z >= sector.startZ && z < sector.endZ);
    if (index >= 0) return index;
    if (z >= this.circuit.sectors.at(-1)!.endZ) return this.circuit.sectors.length - 1;
    return 0;
  }

  private progressToZ(progress: number) {
    return RACE.startZ + clamp(progress, 0, 1) * (RACE.finishZ - RACE.startZ);
  }
}

export function formatSpeedTrap(trap: SpeedTrapDefinition | undefined) {
  return trap ? `${trap.name} @ z${trap.z}` : 'NO TRAP';
}
