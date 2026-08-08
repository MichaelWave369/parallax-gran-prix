import type { RacerDefinition } from './config';
import type { RunHealthReport } from './RaceHealthMonitor';
import type { RaceReceipt, Standing } from './RaceEngine';
import type { SportingRaceReport } from './SportingIntelligence';

const STORAGE_KEY = 'parallax-gran-prix.weekends.v1';

export type WeekendPhase = 'qualifying' | 'race' | 'complete' | 'exhibition';

export type QualifyingRow = {
  position: number;
  id: string;
  code: string;
  name: string;
  team: string;
  finished: boolean;
  time: number | null;
  progress: number;
};

export type EventWeekendReceipt = {
  schema: 'parallax-gran-prix-event-weekend/v1';
  eventId: string;
  seasonNumber: number;
  round: number;
  circuitId: string;
  eventTitle: string;
  raceSeed: number;
  qualifyingSeed: number;
  qualifyingCompletedAt: string;
  pole: QualifyingRow | null;
  grid: QualifyingRow[];
  qualifyingReceipt?: RaceReceipt;
  qualifyingHealth?: RunHealthReport;
  qualifyingSporting?: SportingRaceReport;
};

type WeekendRecord = EventWeekendReceipt & {
  raceCompletedAt?: string;
};

type WeekendState = {
  version: 1;
  records: WeekendRecord[];
};

type WeekendOptions = {
  seasonNumber: number;
  round: number;
  circuitId: string;
  eventTitle: string;
  raceSeed: number;
  championshipEligible: boolean;
};

export class EventWeekendManager {
  private state: WeekendState;
  private record?: WeekendRecord;
  readonly eventId: string;
  readonly qualifyingSeed: number;

  constructor(private options: WeekendOptions) {
    this.eventId = `S${options.seasonNumber}-R${options.round}-${options.circuitId}`;
    this.qualifyingSeed = deriveQualifyingSeed(options.raceSeed, options.round);
    this.state = this.load();

    if (!options.championshipEligible) return;

    const existing = this.state.records.find((candidate) => candidate.eventId === this.eventId);
    if (existing && existing.raceSeed === options.raceSeed) {
      this.record = existing;
      return;
    }

    if (existing) {
      this.state.records = this.state.records.filter((candidate) => candidate.eventId !== this.eventId);
      this.save();
    }
  }

  getPhase(requested?: string | null): WeekendPhase {
    if (!this.options.championshipEligible) return 'exhibition';
    if (this.record?.raceCompletedAt) return 'complete';
    if (requested === 'qualifying') return 'qualifying';
    if (requested === 'race' && this.record?.grid.length) return 'race';
    return this.record?.grid.length ? 'race' : 'qualifying';
  }

  getSessionSeed(phase: WeekendPhase) {
    return phase === 'qualifying' ? this.qualifyingSeed : this.options.raceSeed;
  }

  getQualifyingResult(): EventWeekendReceipt | undefined {
    return this.record ? this.publicReceipt(this.record) : undefined;
  }

  getRaceGridIds() {
    return this.record?.grid.map((row) => row.id) ?? [];
  }

  applyGridOrder(racers: RacerDefinition[]) {
    const order = this.getRaceGridIds();
    if (!order.length) return;
    const rank = new Map(order.map((id, index) => [id, index]));
    racers.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  }

  recordQualifying(
    standings: Standing[],
    receipt?: RaceReceipt,
    health?: RunHealthReport,
    sporting?: SportingRaceReport
  ) {
    if (!this.options.championshipEligible) return undefined;

    const grid: QualifyingRow[] = standings.map((standing, index) => ({
      position: index + 1,
      id: standing.id,
      code: standing.code,
      name: standing.name,
      team: standing.team,
      finished: standing.finished,
      time: standing.finishTime ?? null,
      progress: standing.progress
    }));

    const next: WeekendRecord = {
      schema: 'parallax-gran-prix-event-weekend/v1',
      eventId: this.eventId,
      seasonNumber: this.options.seasonNumber,
      round: this.options.round,
      circuitId: this.options.circuitId,
      eventTitle: this.options.eventTitle,
      raceSeed: this.options.raceSeed,
      qualifyingSeed: this.qualifyingSeed,
      qualifyingCompletedAt: new Date().toISOString(),
      pole: grid[0] ? { ...grid[0] } : null,
      grid,
      qualifyingReceipt: receipt ? structuredClone(receipt) : undefined,
      qualifyingHealth: health ? structuredClone(health) : undefined,
      qualifyingSporting: sporting ? structuredClone(sporting) : undefined
    };

    this.state.records = this.state.records.filter((candidate) => candidate.eventId !== this.eventId);
    this.state.records.push(next);
    this.state.records = this.state.records.slice(-18);
    this.record = next;
    this.save();
    return this.publicReceipt(next);
  }

  markRaceComplete() {
    if (!this.record) return;
    this.record.raceCompletedAt = new Date().toISOString();
    this.save();
  }

  clearCurrentWeekend() {
    this.state.records = this.state.records.filter((candidate) => candidate.eventId !== this.eventId);
    this.record = undefined;
    this.save();
  }

  getReceipt(): EventWeekendReceipt | undefined {
    return this.record ? this.publicReceipt(this.record) : undefined;
  }

  private publicReceipt(record: WeekendRecord): EventWeekendReceipt {
    return {
      schema: record.schema,
      eventId: record.eventId,
      seasonNumber: record.seasonNumber,
      round: record.round,
      circuitId: record.circuitId,
      eventTitle: record.eventTitle,
      raceSeed: record.raceSeed,
      qualifyingSeed: record.qualifyingSeed,
      qualifyingCompletedAt: record.qualifyingCompletedAt,
      pole: record.pole ? { ...record.pole } : null,
      grid: record.grid.map((row) => ({ ...row })),
      qualifyingReceipt: record.qualifyingReceipt ? structuredClone(record.qualifyingReceipt) : undefined,
      qualifyingHealth: record.qualifyingHealth ? structuredClone(record.qualifyingHealth) : undefined,
      qualifyingSporting: record.qualifyingSporting ? structuredClone(record.qualifyingSporting) : undefined
    };
  }

  private load(): WeekendState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { version: 1, records: [] };
      const parsed = JSON.parse(raw) as Partial<WeekendState>;
      if (parsed.version !== 1 || !Array.isArray(parsed.records)) return { version: 1, records: [] };
      return { version: 1, records: parsed.records as WeekendRecord[] };
    } catch {
      return { version: 1, records: [] };
    }
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}

function deriveQualifyingSeed(raceSeed: number, round: number) {
  const mixed = (((raceSeed ^ 0x369369) >>> 0) * 1664525 + round * 1013904223) >>> 0;
  return (mixed % 999_999_937) || 369;
}
