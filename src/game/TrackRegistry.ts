export type CircuitStatus = 'playable' | 'planned';

export type CircuitSector = {
  id: string;
  name: string;
  startZ: number;
  endZ: number;
};

export type SpeedTrapDefinition = {
  id: string;
  name: string;
  z: number;
};

export type CircuitDefinition = {
  id: string;
  name: string;
  shortName: string;
  status: CircuitStatus;
  seasonRound: number;
  description: string;
  sectors: readonly CircuitSector[];
  speedTraps?: readonly SpeedTrapDefinition[];
  features: readonly string[];
};

export const BATTLECASE_SECTORS: readonly CircuitSector[] = [
  { id: 'boot', name: 'BOOT STRAIGHT', startZ: -50, endZ: -31 },
  { id: 'gpu', name: 'GPU CANYON', startZ: -31, endZ: -13 },
  { id: 'cooling', name: 'COOLING GAUNTLET', startZ: -13, endZ: 9 },
  { id: 'split', name: 'PARALLAX SPLIT', startZ: 9, endZ: 31 },
  { id: 'sprint', name: 'MOTHERBOARD SPRINT', startZ: 31, endZ: 50 }
] as const;

export const BACKSPIN_SECTORS: readonly CircuitSector[] = [
  { id: 'needle', name: 'DROP THE NEEDLE', startZ: -50, endZ: -31 },
  { id: 'groove', name: 'GROOVE RUN', startZ: -31, endZ: -11 },
  { id: 'tonearm', name: 'TONEARM CROSSING', startZ: -11, endZ: 10 },
  { id: 'split', name: 'CROSSFADER SPLIT', startZ: 10, endZ: 31 },
  { id: 'speaker', name: 'SPEAKER STACK SPRINT', startZ: 31, endZ: 50 }
] as const;

export const SPAUNGEAR_SECTORS: readonly CircuitSector[] = [
  { id: 'forge', name: 'FORGE ENTRY', startZ: -50, endZ: -31 },
  { id: 'pinion', name: 'PINION FIELD', startZ: -31, endZ: -11 },
  { id: 'transfer', name: 'TRANSFER GATES', startZ: -11, endZ: 10 },
  { id: 'split', name: 'CROWN MESH', startZ: 10, endZ: 31 },
  { id: 'output', name: 'OUTPUT SHAFT', startZ: 31, endZ: 50 }
] as const;

export const MIRROR_SECTORS: readonly CircuitSector[] = [
  { id: 'reflection', name: 'REFLECTION ENTRY', startZ: -50, endZ: -31 },
  { id: 'symmetry', name: 'SYMMETRY HALL', startZ: -31, endZ: -11 },
  { id: 'inverse', name: 'INVERSE GATES', startZ: -11, endZ: 10 },
  { id: 'split', name: 'MIRROR SPLIT', startZ: 10, endZ: 31 },
  { id: 'prism', name: 'PRISM SPRINT', startZ: 31, endZ: 50 }
] as const;

export const CIRCUITS: CircuitDefinition[] = [
  {
    id: 'battlecase',
    name: 'Battlecase Circuit',
    shortName: 'Battlecase',
    status: 'playable',
    seasonRound: 1,
    description: 'A motherboard canyon of heatsinks, cooling hardware, rotating sweepers, and the first physical Parallax Split.',
    sectors: BATTLECASE_SECTORS,
    speedTraps: [
      { id: 'gpu-exit', name: 'GPU EXIT', z: -14 },
      { id: 'board-speed', name: 'BOARD SPEED', z: 42 }
    ],
    features: ['gpu-canyon', 'cooling-gauntlet', 'parallax-split', 'speed-traps', 'finish-replay', 'recovery-marshal']
  },
  {
    id: 'backspin-96',
    name: "Backspin '96",
    shortName: 'Backspin',
    status: 'playable',
    seasonRound: 2,
    description: 'A giant DJ deck of platter grooves, tonearm sweepers, a crossfader split, and speaker-cone kickers.',
    sectors: BACKSPIN_SECTORS,
    speedTraps: [
      { id: 'groove-trap', name: 'GROOVE TRAP', z: -12 },
      { id: 'speaker-trap', name: 'SPEAKER TRAP', z: 42 }
    ],
    features: ['turntables', 'tonearms', 'crossfader', 'speaker-kickers', 'speed-traps', 'finish-replay', 'recovery-marshal']
  },
  {
    id: 'spaungear',
    name: 'SPAUNGEAR Works',
    shortName: 'SPAUNGEAR',
    status: 'playable',
    seasonRound: 3,
    description: 'A mechanical transfer works of pinion fields, rotating timing bars, crown-mesh splits, and output-shaft hazards.',
    sectors: SPAUNGEAR_SECTORS,
    speedTraps: [
      { id: 'pinion-trap', name: 'PINION TRAP', z: -12 },
      { id: 'output-trap', name: 'OUTPUT TRAP', z: 42 }
    ],
    features: ['gear-fields', 'transfer-gates', 'crown-mesh', 'timing-windows', 'speed-traps', 'finish-replay', 'recovery-marshal']
  },
  {
    id: 'mirror-labyrinth',
    name: 'Mirror Labyrinth',
    shortName: 'Mirror',
    status: 'playable',
    seasonRound: 4,
    description: 'A mirrored field of symmetric guides, inverse rotating gates, reflective route ambiguity, and a two-path Mirror Split.',
    sectors: MIRROR_SECTORS,
    speedTraps: [
      { id: 'symmetry-trap', name: 'SYMMETRY TRAP', z: -12 },
      { id: 'prism-trap', name: 'PRISM TRAP', z: 42 }
    ],
    features: ['mirrors', 'symmetry-hall', 'inverse-gates', 'mirror-split', 'prism-sprint', 'speed-traps', 'finish-replay', 'recovery-marshal']
  },
  { id: 'ledger-larry-500', name: 'Ledger Larry 500', shortName: 'Larry 500', status: 'planned', seasonRound: 5, description: 'Administrative machinery, paper rollers, stamps, and catastrophic accounting.', sectors: [], features: ['paperwork', 'audit-gates'] },
  { id: 'phivessel-dream-run', name: 'PhiVessel Dream Run', shortName: 'Dream Run', status: 'planned', seasonRound: 6, description: 'Glowing geometry and shifting dream-state route logic.', sectors: [], features: ['dream-gates', 'dynamic-geometry'] },
  { id: 'carbon-loop', name: 'Carbon Loop', shortName: 'Carbon Loop', status: 'planned', seasonRound: 7, description: 'Feedback loops that can return racers to earlier sections.', sectors: [], features: ['loops', 'reentry'] },
  { id: 'data-center', name: 'Parallax Data Center', shortName: 'Data Center', status: 'planned', seasonRound: 8, description: 'Rack canyons, thermal channels, cooling tubes, and accelerator lanes.', sectors: [], features: ['thermal-lanes', 'rack-canyon'] },
  { id: '369-final', name: 'The 3–6–9 Grand Final', shortName: '3–6–9 Final', status: 'planned', seasonRound: 9, description: 'Three opening paths, six chambers, nine convergence gates, one championship finish.', sectors: [], features: ['3-6-9', 'championship'] }
];

export function getCircuitById(id: string) {
  return CIRCUITS.find((circuit) => circuit.id === id);
}

export function getCircuitForRound(round: number) {
  return CIRCUITS.find((circuit) => circuit.seasonRound === round);
}

export function getPlayableCircuits() {
  return CIRCUITS.filter((circuit) => circuit.status === 'playable');
}

export const ACTIVE_CIRCUIT = getCircuitById('battlecase') ?? CIRCUITS[0];
