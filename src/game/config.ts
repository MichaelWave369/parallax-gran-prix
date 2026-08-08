export type RacerDefinition = {
  id: string;
  name: string;
  team: string;
  color: number;
  accent: number;
};

export const RACERS: RacerDefinition[] = [
  { id: 'carbon', name: 'Carbon', team: 'Carbon Racing', color: 0x20242a, accent: 0xd8d8d8 },
  { id: 'silicon', name: 'Silicon', team: 'Silicon Velocity', color: 0x0a3d62, accent: 0x39c6ff },
  { id: 'dreamer', name: 'Dreamer', team: 'Dreamer Motorsport', color: 0x6c2bd9, accent: 0xff66d8 },
  { id: 'mirror', name: 'Mirror', team: 'Mirror Works', color: 0xbfc7d5, accent: 0xffffff },
  { id: 'wave-rider', name: 'Wave Rider', team: 'Wave Rider', color: 0x1261a0, accent: 0x73dcff },
  { id: 'governotter', name: 'GovernOtter', team: 'GovernOtter Works Team', color: 0x163c63, accent: 0xd6ad60 },
  { id: 'chimp-monk', name: 'Chimp Monk', team: 'Chimp Monk Racing', color: 0x5e1212, accent: 0xff5c35 },
  { id: 'chick-monk', name: 'Chick Monk', team: 'Chick Monk Racing', color: 0xf1bd22, accent: 0xffed8a },
  { id: 'ledger-larry', name: 'Ledger Larry', team: 'Ledger Racing Authority', color: 0x356149, accent: 0xcaa65a },
  { id: 'battlecase', name: 'Battlecase', team: 'Battlecase Works', color: 0x383b43, accent: 0xffb23e },
  { id: 'builder', name: 'Builder', team: 'Builder Works', color: 0xc77818, accent: 0xffda61 },
  { id: 'reality-ledger', name: 'Reality Ledger', team: 'Reality Ledger', color: 0x251b4d, accent: 0x8bf0ff }
];

export const RACE = {
  trackWidth: 18,
  trackLength: 112,
  slopeRadians: 0.064,
  floorHalfHeight: 0.45,
  marbleRadius: 0.72,
  startZ: -50,
  finishZ: 50,
  countdownSeconds: 3,
  fixedTimeStep: 1 / 60,
  maxSubSteps: 5,
  photoFinishThreshold: 0.22
} as const;

export const SECTORS = [
  { id: 'boot', name: 'BOOT STRAIGHT', startZ: -50, endZ: -31 },
  { id: 'gpu', name: 'GPU CANYON', startZ: -31, endZ: -13 },
  { id: 'cooling', name: 'COOLING GAUNTLET', startZ: -13, endZ: 9 },
  { id: 'split', name: 'PARALLAX SPLIT', startZ: 9, endZ: 31 },
  { id: 'sprint', name: 'MOTHERBOARD SPRINT', startZ: 31, endZ: 50 }
] as const;

export type BroadcastEventType =
  | 'start'
  | 'lead-change'
  | 'collision'
  | 'sector'
  | 'split'
  | 'finish'
  | 'photo-finish'
  | 'winner';

export const BRBC_LINES: Record<BroadcastEventType, string[]> = {
  start: [
    "THREVE: And we're rolling! Welcome to the Parallax Gran Prix!",
    "SIX'T: Initial field vectors stable. Mostly.",
    "NOINE: Quite."
  ],
  'lead-change': [
    'THREVE: NEW LEADER! Look at that vessel move!',
    "SIX'T: Route delta just changed dramatically.",
    'NOINE: Ambitious.'
  ],
  collision: [
    'THREVE: ABSOLUTE SCENES IN THE BATTLECASE!',
    "SIX'T: That was an entirely measurable catastrophe.",
    'NOINE: Bit untidy.'
  ],
  sector: [
    'THREVE: INTO THE NEXT SECTOR THEY GO!',
    "SIX'T: New geometry. New risk profile.",
    'NOINE: Carry on.'
  ],
  split: [
    'THREVE: THE PARALLAX SPLIT! PICK A SIDE!',
    "SIX'T: Divergent routes confirmed. Outcome unresolved.",
    'NOINE: Decisions, decisions.'
  ],
  finish: [
    'THREVE: ONE ACROSS! WHO IS NEXT?!',
    "SIX'T: Finish telemetry confirmed.",
    'NOINE: Splendid.'
  ],
  'photo-finish': [
    'THREVE: THAT IS TOO CLOSE TO CALL WITH EYEBALLS!',
    "SIX'T: Milliseconds. We require the receipt.",
    'NOINE: Rather close.'
  ],
  winner: [
    'THREVE: WE HAVE A WINNER! GOOD HEAVENS!',
    "SIX'T: The simulation has rendered its verdict.",
    'NOINE: Quite.'
  ]
};
