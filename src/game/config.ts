export type RacerDefinition = {
  id: string;
  code: string;
  name: string;
  team: string;
  color: number;
  accent: number;
};

export const RACERS: RacerDefinition[] = [
  { id: 'carbon', code: 'CR', name: 'Carbon', team: 'Carbon Racing', color: 0x20242a, accent: 0xd8d8d8 },
  { id: 'silicon', code: 'SV', name: 'Silicon', team: 'Silicon Velocity', color: 0x0a3d62, accent: 0x39c6ff },
  { id: 'dreamer', code: 'DM', name: 'Dreamer', team: 'Dreamer Motorsport', color: 0x6c2bd9, accent: 0xff66d8 },
  { id: 'mirror', code: 'MW', name: 'Mirror', team: 'Mirror Works', color: 0xbfc7d5, accent: 0xffffff },
  { id: 'wave-rider', code: 'WR', name: 'Wave Rider', team: 'Wave Rider', color: 0x1261a0, accent: 0x73dcff },
  { id: 'governotter', code: 'GO', name: 'GovernOtter', team: 'GovernOtter Works Team', color: 0x163c63, accent: 0xd6ad60 },
  { id: 'chimp-monk', code: 'CM', name: 'Chimp Monk', team: 'Chimp Monk Racing', color: 0x5e1212, accent: 0xff5c35 },
  { id: 'chick-monk', code: 'CK', name: 'Chick Monk', team: 'Chick Monk Racing', color: 0xf1bd22, accent: 0xffed8a },
  { id: 'ledger-larry', code: 'LL', name: 'Ledger Larry', team: 'Ledger Racing Authority', color: 0x356149, accent: 0xcaa65a },
  { id: 'battlecase', code: 'BC', name: 'Battlecase', team: 'Battlecase Works', color: 0x383b43, accent: 0xffb23e },
  { id: 'builder', code: 'BU', name: 'Builder', team: 'Builder Works', color: 0xc77818, accent: 0xffda61 },
  { id: 'reality-ledger', code: 'RL', name: 'Reality Ledger', team: 'Reality Ledger', color: 0x251b4d, accent: 0x8bf0ff }
];

export const RACE = {
  trackWidth: 18,
  trackLength: 112,
  slopeRadians: 0.064,
  floorHalfHeight: 0.45,
  marbleRadius: 0.72,
  startZ: -50,
  finishZ: 50,
  gridPresentationSeconds: 2.7,
  countdownSeconds: 3,
  fixedTimeStep: 1 / 60,
  maxSubSteps: 5,
  photoFinishThreshold: 0.22,
  replayWindowSeconds: 5.2,
  replayPlaybackRate: 0.42,
  raceTimeoutSeconds: 55,
  recoveryStallSeconds: 4.5,
  recoveryMinProgress: 0.8,
  recoverySpeedThreshold: 1.25
} as const;

// Legacy Battlecase sector export retained while circuit-specific sectors migrate to TrackRegistry.
export const SECTORS = [
  { id: 'boot', name: 'BOOT STRAIGHT', startZ: -50, endZ: -31 },
  { id: 'gpu', name: 'GPU CANYON', startZ: -31, endZ: -13 },
  { id: 'cooling', name: 'COOLING GAUNTLET', startZ: -13, endZ: 9 },
  { id: 'split', name: 'PARALLAX SPLIT', startZ: 9, endZ: 31 },
  { id: 'sprint', name: 'MOTHERBOARD SPRINT', startZ: 31, endZ: 50 }
] as const;

export type BrbcSpeaker = 'THREVE' | "SIX'T" | 'NOINE';

export type BroadcastEventType =
  | 'opening'
  | 'start'
  | 'lead-change'
  | 'overtake'
  | 'battle'
  | 'collision'
  | 'recovery'
  | 'sector'
  | 'split'
  | 'final-ten'
  | 'finish'
  | 'photo-finish'
  | 'winner'
  | 'replay';

export type BroadcastBeat = {
  speaker: BrbcSpeaker;
  text: string;
};

export const BRBC_EXCHANGES: Record<BroadcastEventType, BroadcastBeat[][]> = {
  opening: [
    [
      { speaker: 'THREVE', text: 'Good evening, field-watchers! Twelve vessels are locked into the circuit!' },
      { speaker: "SIX'T", text: 'Seed committed. Physics authoritative. Track mechanisms are live.' },
      { speaker: 'NOINE', text: 'Splendid. Release the marbles.' }
    ]
  ],
  start: [
    [
      { speaker: 'THREVE', text: "AND WE'RE ROLLING! PARALLAX GRAN PRIX IS GO!" },
      { speaker: "SIX'T", text: 'Initial velocity field is compressing into the opening sector.' },
      { speaker: 'NOINE', text: 'Try the brakes. Oh. Right.' }
    ]
  ],
  'lead-change': [
    [
      { speaker: 'THREVE', text: 'NEW LEADER — {detail}!' },
      { speaker: "SIX'T", text: 'That position change is confirmed in the live ordering.' },
      { speaker: 'NOINE', text: 'Ambitious.' }
    ]
  ],
  overtake: [
    [
      { speaker: 'THREVE', text: 'HE HAS GONE THROUGH! {detail}!' },
      { speaker: "SIX'T", text: 'Clean positional gain. No steward intervention required.' },
      { speaker: 'NOINE', text: 'Rather well pinched.' }
    ],
    [
      { speaker: 'THREVE', text: 'AROUND THE OUTSIDE — LOOK AT THIS! {detail}!' },
      { speaker: "SIX'T", text: 'Momentum transfer held through contact. Barely.' },
      { speaker: 'NOINE', text: 'Still counts.' }
    ]
  ],
  battle: [
    [
      { speaker: 'THREVE', text: 'WE HAVE A PROPER SCRAP HERE — {detail}!' },
      { speaker: "SIX'T", text: 'The gap is inside our battle threshold. Director is taking the two-shot.' },
      { speaker: 'NOINE', text: 'No elbows, please.' }
    ]
  ],
  collision: [
    [
      { speaker: 'THREVE', text: 'ABSOLUTE SCENES — {detail} HAS FOUND THE FURNITURE!' },
      { speaker: "SIX'T", text: 'That was an entirely measurable catastrophe.' },
      { speaker: 'NOINE', text: 'Bit untidy.' }
    ]
  ],
  recovery: [
    [
      { speaker: 'THREVE', text: 'RECOVERY MARSHAL IS IN — {detail}!' },
      { speaker: "SIX'T", text: 'Deadlock threshold confirmed. Deterministic impulse only; no teleport and the intervention is receipted.' },
      { speaker: 'NOINE', text: 'Give it a shove, then.' }
    ]
  ],
  sector: [
    [
      { speaker: 'THREVE', text: 'INTO {detail} THEY GO!' },
      { speaker: "SIX'T", text: 'New geometry. New risk profile.' },
      { speaker: 'NOINE', text: 'Carry on.' }
    ]
  ],
  split: [
    [
      { speaker: 'THREVE', text: 'THE PARALLAX SPLIT! {detail}!' },
      { speaker: "SIX'T", text: 'Divergent routes confirmed. Outcome unresolved.' },
      { speaker: 'NOINE', text: 'Decisions, decisions.' }
    ]
  ],
  'final-ten': [
    [
      { speaker: 'THREVE', text: 'HERE WE GO — FINAL CHARGE — WOTWOTBLIMEYGOOOO — {detail}!' },
      { speaker: "SIX'T", text: 'Velocity delta is—GOOD LORD—never mind the chart, GO ON THEN!' },
      { speaker: 'NOINE', text: 'RRRAAH-JOLLY-BLAAAAH-WOT-WOT— ... Quite.' }
    ],
    [
      { speaker: 'THREVE', text: 'TEN-SECOND ENERGY NOW — OIYAHBLIMEYFJOOOORGH — {detail}!' },
      { speaker: "SIX'T", text: 'I appear to have stopped doing mathematics.' },
      { speaker: 'NOINE', text: 'Understandable.' }
    ]
  ],
  finish: [
    [
      { speaker: 'THREVE', text: 'ONE ACROSS! {detail}!' },
      { speaker: "SIX'T", text: 'Finish telemetry confirmed.' },
      { speaker: 'NOINE', text: 'Splendid.' }
    ]
  ],
  'photo-finish': [
    [
      { speaker: 'THREVE', text: 'THAT IS TOO CLOSE TO CALL WITH EYEBALLS — {detail}!' },
      { speaker: "SIX'T", text: 'Milliseconds. We require the receipt and the finish replay.' },
      { speaker: 'NOINE', text: 'Rather close.' }
    ]
  ],
  winner: [
    [
      { speaker: 'THREVE', text: 'WE HAVE A WINNER! {detail}! GOOD HEAVENS!' },
      { speaker: "SIX'T", text: 'The simulation has rendered its verdict.' },
      { speaker: 'NOINE', text: 'Quite.' }
    ]
  ],
  replay: [
    [
      { speaker: 'THREVE', text: 'ROLL THE BRBC FINISH REPLAY!' },
      { speaker: "SIX'T", text: 'Recorded poses only. Physics state remains untouched.' },
      { speaker: 'NOINE', text: 'Again, but slower.' }
    ]
  ]
};
