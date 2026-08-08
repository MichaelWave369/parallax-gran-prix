import type { CircuitDefinition } from '../TrackRegistry';
import { getCircuitById } from '../TrackRegistry';
import type { CircuitRuntime } from './CircuitRuntime';
import { buildBattlecaseCircuit } from './BattlecaseCircuit';
import { buildBackspin96Circuit } from './Backspin96Circuit';
import { buildSpaungearCircuit } from './SpaungearCircuit';
import { buildMirrorLabyrinthCircuit } from './MirrorLabyrinthCircuit';
import { buildLedgerLarryCircuit } from './LedgerLarryCircuit';

export type CircuitModule = CircuitDefinition & {
  build(runtime: CircuitRuntime): void;
  splitWindow?: { startZ: number; endZ: number };
  splitCameraZ?: number;
};

type BuilderConfig = Pick<CircuitModule, 'build' | 'splitWindow' | 'splitCameraZ'>;

const BUILDERS: Record<string, BuilderConfig> = {
  battlecase: {
    build: buildBattlecaseCircuit,
    splitWindow: { startZ: 10.5, endZ: 16 },
    splitCameraZ: 21
  },
  'backspin-96': {
    build: buildBackspin96Circuit,
    splitWindow: { startZ: 11.5, endZ: 17.5 },
    splitCameraZ: 21
  },
  spaungear: {
    build: buildSpaungearCircuit,
    splitWindow: { startZ: 13.2, endZ: 18.8 },
    splitCameraZ: 21
  },
  'mirror-labyrinth': {
    build: buildMirrorLabyrinthCircuit,
    splitWindow: { startZ: 12.6, endZ: 18.4 },
    splitCameraZ: 21
  },
  'ledger-larry-500': {
    build: buildLedgerLarryCircuit,
    splitWindow: { startZ: 12.8, endZ: 18.6 },
    splitCameraZ: 21
  }
};

export function getCircuitModule(id: string): CircuitModule {
  const definition = getCircuitById(id) ?? getCircuitById('battlecase');
  if (!definition) throw new Error('Battlecase circuit definition is missing');
  const builder = BUILDERS[definition.id];
  if (!builder || definition.status !== 'playable') {
    const fallback = getCircuitById('battlecase');
    if (!fallback) throw new Error('No playable circuit is registered');
    return { ...fallback, ...BUILDERS.battlecase };
  }
  return { ...definition, ...builder };
}
