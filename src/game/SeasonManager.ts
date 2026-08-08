import { RACERS } from './config';
import type { EventWeekendReceipt } from './EventWeekendManager';
import type { RunHealthReport } from './RaceHealthMonitor';
import type { RaceReceipt, Standing } from './RaceEngine';
import type { SportingRaceReport, SportingSplit, SpeedTrapHit } from './SportingIntelligence';
import { CIRCUITS, type CircuitDefinition } from './TrackRegistry';

const STORAGE_KEY = 'parallax-gran-prix.season.v1';
const CAREER_KEY = 'parallax-gran-prix.career.v1';
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0] as const;

export type SeasonRaceResult = Pick<Standing, 'place' | 'id' | 'code' | 'name' | 'team' | 'finishTime'> & {
  finished?: boolean;
};

export type SeasonRaceRecord = {
  id: string;
  seasonNumber?: number;
  round: number;
  circuitId: string;
  circuitName: string;
  seed: number;
  completedAt: string;
  receipt: RaceReceipt;
  health?: RunHealthReport;
  sporting?: SportingRaceReport;
  weekend?: EventWeekendReceipt;
  results: SeasonRaceResult[];
};

export type DriverStanding = {
  id: string;
  code: string;
  name: string;
  team: string;
  points: number;
  wins: number;
  podiums: number;
  dnfs: number;
};

export type TeamStanding = {
  team: string;
  points: number;
  wins: number;
  dnfs: number;
};

export type ChampionshipImplication = {
  baseline: boolean;
  leader: DriverStanding | null;
  challenger: DriverStanding | null;
  gap: number;
  maxSingleRaceSwing: number;
  leadInPlay: boolean;
  narrative: string;
};

export type CareerDriverStat = {
  id: string;
  code: string;
  name: string;
  team: string;
  starts: number;
  finishes: number;
  wins: number;
  podiums: number;
  dnfs: number;
  totalPoints: number;
  bestFinish: number | null;
  averageFinish: number | null;
  fastestSectorAwards: number;
  circuitWins: Record<string, number>;
};

export type CircuitRaceRecord = {
  racerId: string;
  racerCode: string;
  racerName: string;
  time: number;
  seasonNumber: number;
  round: number;
  seed: number;
};

export type CircuitSectorRecord = SportingSplit & {
  seasonNumber: number;
  round: number;
  seed: number;
};

export type CircuitSpeedRecord = SpeedTrapHit & {
  seasonNumber: number;
  round: number;
  seed: number;
};

export type CircuitRecords = {
  circuitId: string;
  raceStarts: number;
  raceRecord?: CircuitRaceRecord;
  sectorRecords: Record<string, CircuitSectorRecord>;
  speedTrapRecords: Record<string, CircuitSpeedRecord>;
};

export type SeasonState = {
  version: 1;
  seasonNumber: number;
  createdAt: string;
  races: SeasonRaceRecord[];
};

type CareerState = {
  version: 1;
  races: SeasonRaceRecord[];
};

export class SeasonManager {
  private state: SeasonState;
  private career: CareerState;

  constructor() {
    this.state = this.load();
    this.career = this.loadCareer(this.state.races);
    this.saveCareer();
  }

  getState() {
    return structuredClone(this.state);
  }

  getNextRoundNumber() {
    return this.state.races.length + 1;
  }

  suggestSeed() {
    const round = this.getNextRoundNumber();
    return 369_000 + this.state.seasonNumber * 1_000 + round * 37;
  }

  recordRace(
    receipt: RaceReceipt,
    standings: Standing[],
    circuit: CircuitDefinition,
    health?: RunHealthReport,
    sporting?: SportingRaceReport,
    weekend?: EventWeekendReceipt
  ) {
    const round = this.getNextRoundNumber();
    if (circuit.seasonRound !== round) return undefined;

    const record: SeasonRaceRecord = {
      id: `S${this.state.seasonNumber}-R${round}-${receipt.seed}`,
      seasonNumber: this.state.seasonNumber,
      round,
      circuitId: circuit.id,
      circuitName: circuit.name,
      seed: receipt.seed,
      completedAt: new Date().toISOString(),
      receipt: structuredClone(receipt),
      health: health ? structuredClone(health) : undefined,
      sporting: sporting ? structuredClone(sporting) : undefined,
      weekend: weekend ? structuredClone(weekend) : undefined,
      results: standings.map((standing) => ({
        place: standing.place,
        id: standing.id,
        code: standing.code,
        name: standing.name,
        team: standing.team,
        finishTime: standing.finishTime,
        finished: standing.finished
      }))
    };
    this.state.races.push(record);
    if (!this.career.races.some((race) => race.id === record.id)) this.career.races.push(structuredClone(record));
    this.save();
    this.saveCareer();
    return record;
  }

  getDriverStandings(): DriverStanding[] {
    const rows = RACERS.map((racer) => ({
      id: racer.id,
      code: racer.code,
      name: racer.name,
      team: racer.team,
      points: 0,
      wins: 0,
      podiums: 0,
      dnfs: 0
    }));
    const byId = new Map(rows.map((row) => [row.id, row]));

    this.state.races.forEach((race) => {
      race.results.forEach((result) => {
        const row = byId.get(result.id);
        if (!row) return;
        const finished = result.finished ?? result.finishTime !== undefined;
        if (!finished) {
          row.dnfs += 1;
          return;
        }
        row.points += POINTS[result.place - 1] ?? 0;
        if (result.place === 1) row.wins += 1;
        if (result.place <= 3) row.podiums += 1;
      });
    });

    return rows.sort((a, b) =>
      b.points - a.points
      || b.wins - a.wins
      || b.podiums - a.podiums
      || a.dnfs - b.dnfs
      || a.name.localeCompare(b.name)
    );
  }

  getChampionshipImplications(): ChampionshipImplication {
    const drivers = this.getDriverStandings();
    if (!this.state.races.length) {
      return {
        baseline: true,
        leader: null,
        challenger: null,
        gap: 0,
        maxSingleRaceSwing: POINTS[0],
        leadInPlay: true,
        narrative: 'Championship baseline: no points scored yet.'
      };
    }

    const leader = drivers[0] ?? null;
    const challenger = drivers[1] ?? null;
    const gap = leader && challenger ? Math.max(0, leader.points - challenger.points) : 0;
    const leadInPlay = Boolean(leader && challenger && gap <= POINTS[0]);
    const narrative = leader && challenger
      ? leadInPlay
        ? `${challenger.code} trails ${leader.code} by ${gap} pts — the championship lead is mathematically in play this round.`
        : `${leader.code} leads ${challenger.code} by ${gap} pts — one race cannot erase the full margin.`
      : 'Championship implication unavailable.';

    return {
      baseline: false,
      leader,
      challenger,
      gap,
      maxSingleRaceSwing: POINTS[0],
      leadInPlay,
      narrative
    };
  }

  getTeamStandings(): TeamStanding[] {
    const teams = new Map<string, TeamStanding>();
    this.getDriverStandings().forEach((driver) => {
      const row = teams.get(driver.team) ?? { team: driver.team, points: 0, wins: 0, dnfs: 0 };
      row.points += driver.points;
      row.wins += driver.wins;
      row.dnfs += driver.dnfs;
      teams.set(driver.team, row);
    });
    return [...teams.values()].sort((a, b) =>
      b.points - a.points || b.wins - a.wins || a.dnfs - b.dnfs || a.team.localeCompare(b.team)
    );
  }

  getCareerStats(): CareerDriverStat[] {
    const rows = RACERS.map((racer) => ({
      id: racer.id,
      code: racer.code,
      name: racer.name,
      team: racer.team,
      starts: 0,
      finishes: 0,
      wins: 0,
      podiums: 0,
      dnfs: 0,
      totalPoints: 0,
      bestFinish: null as number | null,
      averageFinish: null as number | null,
      fastestSectorAwards: 0,
      circuitWins: {} as Record<string, number>,
      finishTotal: 0
    }));
    const byId = new Map(rows.map((row) => [row.id, row]));

    this.career.races.forEach((race) => {
      race.results.forEach((result) => {
        const row = byId.get(result.id);
        if (!row) return;
        row.starts += 1;
        const finished = result.finished ?? result.finishTime !== undefined;
        if (!finished) {
          row.dnfs += 1;
          return;
        }
        row.finishes += 1;
        row.finishTotal += result.place;
        row.totalPoints += POINTS[result.place - 1] ?? 0;
        row.bestFinish = row.bestFinish === null ? result.place : Math.min(row.bestFinish, result.place);
        if (result.place === 1) {
          row.wins += 1;
          row.circuitWins[race.circuitId] = (row.circuitWins[race.circuitId] ?? 0) + 1;
        }
        if (result.place <= 3) row.podiums += 1;
      });

      race.sporting?.fastestSectors.forEach((split) => {
        const row = byId.get(split.racerId);
        if (row) row.fastestSectorAwards += 1;
      });
    });

    return rows.map(({ finishTotal, ...row }) => ({
      ...row,
      averageFinish: row.finishes ? finishTotal / row.finishes : null
    })).sort((a, b) =>
      b.wins - a.wins
      || b.totalPoints - a.totalPoints
      || b.podiums - a.podiums
      || b.fastestSectorAwards - a.fastestSectorAwards
      || a.dnfs - b.dnfs
      || a.name.localeCompare(b.name)
    );
  }

  getCircuitRecords(circuitId: string): CircuitRecords {
    const records: CircuitRecords = {
      circuitId,
      raceStarts: 0,
      sectorRecords: {},
      speedTrapRecords: {}
    };

    this.career.races.filter((race) => race.circuitId === circuitId).forEach((race) => {
      records.raceStarts += 1;
      const seasonNumber = this.raceSeasonNumber(race);
      const winner = race.results.find((result) => (result.finished ?? result.finishTime !== undefined) && result.place === 1);
      const time = race.receipt.winningTime;
      if (winner && time !== null && (!records.raceRecord || time < records.raceRecord.time)) {
        records.raceRecord = {
          racerId: winner.id,
          racerCode: winner.code,
          racerName: winner.name,
          time,
          seasonNumber,
          round: race.round,
          seed: race.seed
        };
      }

      race.sporting?.fastestSectors.forEach((split) => {
        const existing = records.sectorRecords[split.sectorId];
        if (!existing || split.duration < existing.duration) {
          records.sectorRecords[split.sectorId] = {
            ...structuredClone(split),
            seasonNumber,
            round: race.round,
            seed: race.seed
          };
        }
      });

      race.sporting?.speedTrapRecords.forEach((hit) => {
        const existing = records.speedTrapRecords[hit.trapId];
        if (!existing || hit.speed > existing.speed) {
          records.speedTrapRecords[hit.trapId] = {
            ...structuredClone(hit),
            seasonNumber,
            round: race.round,
            seed: race.seed
          };
        }
      });
    });

    return records;
  }

  resetSeason() {
    this.state = {
      version: 1,
      seasonNumber: this.state.seasonNumber + 1,
      createdAt: new Date().toISOString(),
      races: []
    };
    this.save();
  }

  exportLedger() {
    return JSON.stringify({
      schema: 'parallax-gran-prix-season-ledger/v1',
      exportedAt: new Date().toISOString(),
      pointsSystem: [...POINTS],
      dnfRule: 'DNF results receive zero championship points.',
      qualifyingRule: 'Championship qualifying sets the starting grid only. The feature race remains physics-authoritative after launch.',
      seasonWriteRule: 'Only the circuit scheduled for the current championship round may be recorded by SeasonManager.',
      season: this.state,
      drivers: this.getDriverStandings(),
      teams: this.getTeamStandings(),
      implications: this.getChampionshipImplications(),
      career: this.career,
      careerDrivers: this.getCareerStats(),
      circuitRecords: CIRCUITS.filter((circuit) => circuit.status === 'playable')
        .map((circuit) => this.getCircuitRecords(circuit.id))
    }, null, 2);
  }

  private load(): SeasonState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.newState(1);
      const parsed = JSON.parse(raw) as Partial<SeasonState>;
      if (parsed.version !== 1 || !Array.isArray(parsed.races)) return this.newState(1);
      return {
        version: 1,
        seasonNumber: Math.max(1, Math.trunc(parsed.seasonNumber ?? 1)),
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
        races: parsed.races as SeasonRaceRecord[]
      };
    } catch {
      return this.newState(1);
    }
  }

  private loadCareer(seedRaces: SeasonRaceRecord[]): CareerState {
    try {
      const raw = localStorage.getItem(CAREER_KEY);
      if (!raw) return { version: 1, races: structuredClone(seedRaces) };
      const parsed = JSON.parse(raw) as Partial<CareerState>;
      if (parsed.version !== 1 || !Array.isArray(parsed.races)) return { version: 1, races: structuredClone(seedRaces) };
      return { version: 1, races: parsed.races as SeasonRaceRecord[] };
    } catch {
      return { version: 1, races: structuredClone(seedRaces) };
    }
  }

  private raceSeasonNumber(race: SeasonRaceRecord) {
    if (race.seasonNumber) return race.seasonNumber;
    const match = /^S(\d+)-/.exec(race.id);
    return match ? Math.max(1, Number(match[1])) : 1;
  }

  private newState(seasonNumber: number): SeasonState {
    return { version: 1, seasonNumber, createdAt: new Date().toISOString(), races: [] };
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  private saveCareer() {
    localStorage.setItem(CAREER_KEY, JSON.stringify(this.career));
  }
}
