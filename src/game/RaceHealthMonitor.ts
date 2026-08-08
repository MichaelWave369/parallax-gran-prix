import { RACERS } from './config';
import type { BroadcastMessage, RaceSnapshot } from './RaceEngine';

export type HealthState = 'GREEN' | 'WATCH' | 'STALLED' | 'RECOVERED' | 'FINISHED' | 'DNF';

export type RacerHealth = {
  id: string;
  code: string;
  name: string;
  state: HealthState;
  progress: number;
  noProgressSeconds: number;
  recoveries: number;
};

export type RecoveryLogEntry = {
  racerId: string;
  racerName: string;
  elapsed: number;
  line: string;
};

export type RunHealthReport = {
  schema: 'parallax-gran-prix-run-health/v1';
  score: number;
  recoveries: number;
  dnfs: number;
  stalled: number;
  watch: number;
  finishers: number;
  racers: RacerHealth[];
  recoveryLog: RecoveryLogEntry[];
};

type InternalHealth = RacerHealth & {
  lastProgress: number;
  lastMovementAt: number;
  recoveredUntil: number;
};

export class RaceHealthMonitor {
  private rows = new Map<string, InternalHealth>();
  private recoveryLog: RecoveryLogEntry[] = [];
  private lastElapsed = 0;

  constructor() {
    this.reset();
  }

  reset(now = performance.now()) {
    this.recoveryLog = [];
    this.lastElapsed = 0;
    this.rows = new Map(RACERS.map((racer) => [racer.id, {
      id: racer.id,
      code: racer.code,
      name: racer.name,
      state: 'GREEN' as HealthState,
      progress: 0,
      noProgressSeconds: 0,
      recoveries: 0,
      lastProgress: 0,
      lastMovementAt: now,
      recoveredUntil: 0
    }]));
  }

  observeSnapshot(snapshot: RaceSnapshot, now = performance.now()) {
    this.lastElapsed = snapshot.elapsed;

    if (snapshot.state === 'ready' || snapshot.state === 'grid' || snapshot.state === 'countdown') {
      snapshot.standings.forEach((standing) => {
        const row = this.rows.get(standing.id);
        if (!row) return;
        row.progress = standing.progress;
        row.lastProgress = standing.progress;
        row.lastMovementAt = now;
        row.noProgressSeconds = 0;
        row.state = standing.finished ? 'FINISHED' : 'GREEN';
      });
      return;
    }

    snapshot.standings.forEach((standing) => {
      const row = this.rows.get(standing.id);
      if (!row) return;
      row.progress = standing.progress;

      if (standing.finished) {
        row.state = 'FINISHED';
        row.noProgressSeconds = 0;
        row.lastProgress = standing.progress;
        row.lastMovementAt = now;
        return;
      }

      if (snapshot.state === 'finished') {
        row.state = 'DNF';
        row.noProgressSeconds = Math.max(0, (now - row.lastMovementAt) / 1000);
        return;
      }

      const delta = standing.progress - row.lastProgress;
      if (delta >= 0.006) {
        row.lastProgress = standing.progress;
        row.lastMovementAt = now;
        row.noProgressSeconds = 0;
        row.state = now < row.recoveredUntil ? 'RECOVERED' : 'GREEN';
        return;
      }

      row.noProgressSeconds = Math.max(0, (now - row.lastMovementAt) / 1000);
      if (now < row.recoveredUntil) row.state = 'RECOVERED';
      else if (row.noProgressSeconds >= 4.1) row.state = 'STALLED';
      else if (row.noProgressSeconds >= 2.0) row.state = 'WATCH';
      else row.state = 'GREEN';
    });
  }

  observeBroadcast(message: BroadcastMessage, now = performance.now()) {
    if (message.type !== 'recovery') return;
    const text = message.text.toLowerCase();
    const racer = RACERS.find((candidate) => text.includes(candidate.name.toLowerCase()));
    if (!racer) return;
    const row = this.rows.get(racer.id);
    if (!row) return;

    row.recoveries += 1;
    row.state = 'RECOVERED';
    row.recoveredUntil = now + 2800;
    row.lastMovementAt = now;
    row.lastProgress = row.progress;
    row.noProgressSeconds = 0;
    this.recoveryLog.push({
      racerId: racer.id,
      racerName: racer.name,
      elapsed: this.lastElapsed,
      line: message.text
    });
  }

  getRacer(id: string): RacerHealth | undefined {
    const row = this.rows.get(id);
    return row ? this.publicRow(row) : undefined;
  }

  getReport(): RunHealthReport {
    const racers = [...this.rows.values()].map((row) => this.publicRow(row));
    const recoveries = racers.reduce((sum, row) => sum + row.recoveries, 0);
    const dnfs = racers.filter((row) => row.state === 'DNF').length;
    const stalled = racers.filter((row) => row.state === 'STALLED').length;
    const watch = racers.filter((row) => row.state === 'WATCH').length;
    const finishers = racers.filter((row) => row.state === 'FINISHED').length;
    const score = Math.max(0, Math.round(100 - recoveries * 4 - dnfs * 12 - stalled * 7 - watch * 2));

    return {
      schema: 'parallax-gran-prix-run-health/v1',
      score,
      recoveries,
      dnfs,
      stalled,
      watch,
      finishers,
      racers,
      recoveryLog: this.recoveryLog.map((entry) => ({ ...entry }))
    };
  }

  private publicRow(row: InternalHealth): RacerHealth {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      state: row.state,
      progress: row.progress,
      noProgressSeconds: row.noProgressSeconds,
      recoveries: row.recoveries
    };
  }
}
