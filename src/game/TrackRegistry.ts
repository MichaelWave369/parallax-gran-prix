import { SECTORS } from './config';

export type CircuitStatus = 'active' | 'planned';

export type CircuitDefinition = {
  id: string;
  name: string;
  shortName: string;
  status: CircuitStatus;
  seasonRound: number;
  description: string;
  sectors: readonly { id: string; name: string; startZ: number; endZ: number }[];
  features: readonly string[];
};

export const CIRCUITS: CircuitDefinition[] = [
  {
    id: 'battlecase',
    name: 'Battlecase Circuit',
    shortName: 'Battlecase',
    status: 'active',
    seasonRound: 1,
    description: 'A motherboard canyon of heatsinks, cooling hardware, rotating sweepers, and the first physical Parallax Split.',
    sectors: SECTORS,
    features: ['gpu-canyon', 'cooling-gauntlet', 'parallax-split', 'finish-replay']
  },
  { id: 'backspin-96', name: "Backspin '96", shortName: 'Backspin', status: 'planned', seasonRound: 2, description: 'Turntables, grooves, crossfaders, and reverse-motion hazards.', sectors: [], features: ['turntables', 'crossfader'] },
  { id: 'spaungear', name: 'SPAUNGEAR Works', shortName: 'SPAUNGEAR', status: 'planned', seasonRound: 3, description: 'Mechanical transfer points across rotating gear fields.', sectors: [], features: ['gears', 'transfer-gates'] },
  { id: 'mirror-labyrinth', name: 'Mirror Labyrinth', shortName: 'Mirror', status: 'planned', seasonRound: 4, description: 'Symmetry, inverse routes, reflective tunnels, and misleading geometry.', sectors: [], features: ['mirrors', 'inverse-routes'] },
  { id: 'ledger-larry-500', name: 'Ledger Larry 500', shortName: 'Larry 500', status: 'planned', seasonRound: 5, description: 'Administrative machinery, paper rollers, stamps, and catastrophic accounting.', sectors: [], features: ['paperwork', 'audit-gates'] },
  { id: 'phivessel-dream-run', name: 'PhiVessel Dream Run', shortName: 'Dream Run', status: 'planned', seasonRound: 6, description: 'Glowing geometry and shifting dream-state route logic.', sectors: [], features: ['dream-gates', 'dynamic-geometry'] },
  { id: 'carbon-loop', name: 'Carbon Loop', shortName: 'Carbon Loop', status: 'planned', seasonRound: 7, description: 'Feedback loops that can return racers to earlier sections.', sectors: [], features: ['loops', 'reentry'] },
  { id: 'data-center', name: 'Parallax Data Center', shortName: 'Data Center', status: 'planned', seasonRound: 8, description: 'Rack canyons, thermal channels, cooling tubes, and accelerator lanes.', sectors: [], features: ['thermal-lanes', 'rack-canyon'] },
  { id: '369-final', name: 'The 3–6–9 Grand Final', shortName: '3–6–9 Final', status: 'planned', seasonRound: 9, description: 'Three opening paths, six chambers, nine convergence gates, one championship finish.', sectors: [], features: ['3-6-9', 'championship'] }
];

export const ACTIVE_CIRCUIT = CIRCUITS.find((circuit) => circuit.status === 'active') ?? CIRCUITS[0];
