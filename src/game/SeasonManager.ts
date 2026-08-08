import { RACERS } from './config';
import type { RaceReceipt, Standing } from './RaceEngine';
import type { CircuitDefinition } from './TrackRegistry';

const STORAGE_KEY = 'parallax-gran-prix.season.v1';
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0] as const;

export type SeasonRaceRecord = {
  id: string;
  round: number;
  circuitId: string;
  circuitName: string;
  seed: number;
  completedAt: string;
  receipt: RaceReceipt;
  results: Array<Pick<Standing, 'place' | 'id' | 'code' | 'name' | 'team' | 'finishTime'>>;
};

export type DriverStanding = {
  id: string;
  code: string;
  name: string;
  team: string;
  points: number;
  wins: number;
  podiums: number;
};

export type TeamStanding = {
  team: string;
  points: number;
  wins: number;
};

export type SeasonState = {
  version: 1;
  seasonNumber: number;
  createdAt: string;
  races: SeasonRaceRecord[];
};

export class SeasonManager {
  private state: SeasonState;

  constructor() {
    this.state = this.load();
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

  recordRace(receipt: RaceReceipt, standings: Standing[], circuit: CircuitDefinition) {
    const round = this.getNextRoundNumber();
    const record: SeasonRaceRecord = {
      id: `S${this.state.seasonNumber}-R${round}-${receipt.seed}`,
      round,
      circuitId: circuit.id,
      circuitName: circuit.name,
      seed: receipt.seed,
      completedAt: new Date().toISOString(),
      receipt: structuredClone(receipt),
      results: standings.map((standing) => ({
        place: standing.place,
        id: standing.id,
        code: standing.code,
        name: standing.name,
        team: standing.team,
        finishTime: standing.finishTime
      }))
    };
    this.state.races.push(record);
    this.save();
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
      podiums: 0
    }));
    const byId = new Map(rows.map((row) => [row.id, row]));

    this.state.races.forEach((race) => {
      race.results.forEach((result) => {
        const row = byId.get(result.id);
        if (!row) return;
        row.points += POINTS[result.place - 1] ?? 0;
        if (result.place === 1) row.wins += 1;
        if (result.place <= 3) row.podiums += 1;
      });
    });

    return rows.sort((a, b) =>
      b.points - a.points || b.wins - a.wins || b.podiums - a.podiums || a.name.localeCompare(b.name)
    );
  }

  getTeamStandings(): TeamStanding[] {
    const teams = new Map<string, TeamStanding>();
    this.getDriverStandings().forEach((driver) => {
      const row = teams.get(driver.team) ?? { team: driver.team, points: 0, wins: 0 };
      row.points += driver.points;
      row.wins += driver.wins;
      teams.set(driver.team, row);
    });
    return [...teams.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.team.localeCompare(b.team));
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
      season: this.state,
      drivers: this.getDriverStandings(),
      teams: this.getTeamStandings()
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

  private newState(seasonNumber: number): SeasonState {
    return { version: 1, seasonNumber, createdAt: new Date().toISOString(), races: [] };
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}
