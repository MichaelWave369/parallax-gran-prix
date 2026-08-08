export type DirectorShot =
  | 'grid-wide'
  | 'wide-overview'
  | 'leader-chase'
  | 'battle-two-shot'
  | 'split-overhead'
  | 'finish-line'
  | 'replay-finish';

export type DirectorRacer = {
  id: string;
  name: string;
  place: number;
  z: number;
  progress: number;
  finished: boolean;
};

export type BattleInfo = {
  frontId: string;
  backId: string;
  frontName: string;
  backName: string;
  gap: number;
};

export type DirectorEvent = {
  type: 'overtake' | 'battle' | 'final-ten';
  detail: string;
  focusIds: string[];
};

export type DirectorDecision = {
  shot: DirectorShot;
  focusIds: string[];
  battle?: BattleInfo;
  events: DirectorEvent[];
};

export class BroadcastDirector {
  private previousOrder: string[] = [];
  private lastBattleKey = '';
  private battleCooldownUntil = 0;
  private overtakeCooldownUntil = 0;
  private finalChargeCalled = false;

  reset() {
    this.previousOrder = [];
    this.lastBattleKey = '';
    this.battleCooldownUntil = 0;
    this.overtakeCooldownUntil = 0;
    this.finalChargeCalled = false;
  }

  update(racers: DirectorRacer[], sectorId: string, now: number): DirectorDecision {
    const events: DirectorEvent[] = [];
    const active = racers.filter((racer) => !racer.finished);
    const leader = active[0] ?? racers[0];
    const battle = this.findClosestBattle(active);

    if (this.previousOrder.length) {
      const overtake = this.detectOvertake(racers);
      if (overtake && now >= this.overtakeCooldownUntil) {
        this.overtakeCooldownUntil = now + 2600;
        events.push({
          type: 'overtake',
          detail: `${overtake.name} jumps P${overtake.from} → P${overtake.to}`,
          focusIds: overtake.focusIds
        });
      }
    }
    this.previousOrder = racers.map((racer) => racer.id);

    if (battle) {
      const key = [battle.frontId, battle.backId].sort().join(':');
      if ((key !== this.lastBattleKey || now >= this.battleCooldownUntil) && battle.gap <= 2.35) {
        this.lastBattleKey = key;
        this.battleCooldownUntil = now + 6500;
        events.push({
          type: 'battle',
          detail: `${battle.frontName} / ${battle.backName} — ${battle.gap.toFixed(2)}m`,
          focusIds: [battle.frontId, battle.backId]
        });
      }
    }

    if (leader && !this.finalChargeCalled && leader.progress >= 0.82) {
      this.finalChargeCalled = true;
      events.push({
        type: 'final-ten',
        detail: `${leader.name} leads the final charge`,
        focusIds: battle ? [battle.frontId, battle.backId] : [leader.id]
      });
    }

    let shot: DirectorShot = 'leader-chase';
    let focusIds = leader ? [leader.id] : [];

    if (leader?.progress >= 0.82) {
      shot = 'finish-line';
    } else if (sectorId === 'split') {
      shot = 'split-overhead';
    }

    if (battle && battle.gap <= 2.7 && leader?.progress < 0.9) {
      shot = 'battle-two-shot';
      focusIds = [battle.frontId, battle.backId];
    }

    return { shot, focusIds, battle, events };
  }

  private findClosestBattle(racers: DirectorRacer[]): BattleInfo | undefined {
    let best: BattleInfo | undefined;
    for (let index = 0; index < racers.length - 1; index += 1) {
      const front = racers[index];
      const back = racers[index + 1];
      const gap = Math.abs(front.z - back.z);
      if (!best || gap < best.gap) {
        best = {
          frontId: front.id,
          backId: back.id,
          frontName: front.name,
          backName: back.name,
          gap
        };
      }
    }
    return best;
  }

  private detectOvertake(racers: DirectorRacer[]) {
    let best:
      | { id: string; name: string; from: number; to: number; gain: number; focusIds: string[] }
      | undefined;

    racers.forEach((racer, currentIndex) => {
      const previousIndex = this.previousOrder.indexOf(racer.id);
      if (previousIndex < 0 || previousIndex <= currentIndex) return;
      const gain = previousIndex - currentIndex;
      const adjacent = racers[Math.min(currentIndex + 1, racers.length - 1)];
      const candidate = {
        id: racer.id,
        name: racer.name,
        from: previousIndex + 1,
        to: currentIndex + 1,
        gain,
        focusIds: adjacent && adjacent.id !== racer.id ? [racer.id, adjacent.id] : [racer.id]
      };
      if (!best || candidate.gain > best.gain) best = candidate;
    });

    return best;
  }
}
