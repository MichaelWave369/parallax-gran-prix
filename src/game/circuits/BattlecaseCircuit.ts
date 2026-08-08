import type { CircuitRuntime } from './CircuitRuntime';

export function buildBattlecaseCircuit(runtime: CircuitRuntime) {
  runtime.buildBase({
    floor: 0x0a1420,
    rail: 0x172635,
    railEmissive: 0x05293d,
    marker: 0x78dcff,
    finishPrimary: 0xc89437,
    finishAccent: 0x3ad9ff,
    sky: 0x03060d
  });

  runtime.addTraceGrid(0x1ec8ff, 0xe0a94c, [-38, -31, 31, 47]);

  // GPU Canyon uses glancing faces instead of square walls. The angled geometry
  // keeps momentum moving sideways around the blocks instead of forming dead pockets.
  runtime.addAngledBlock(-5.1, -27.0, 5.0, 1.65, -0.28, 0x37291c, 0x3a1800);
  runtime.addAngledBlock(5.0, -21.0, 5.1, 1.65, 0.28, 0x283341, 0x042a40);
  runtime.addAngledBlock(-4.5, -15.5, 4.3, 1.45, -0.24, 0x37291c, 0x3a1800);

  runtime.addRotor(-7.0, -0.7, 7.2, 1.25, 0x1c526c, 0x0c6b91);
  runtime.addBumper(-5.7, -1.2, 1.1, 0x164d63);
  runtime.addBumper(5.8, 2.0, 1.1, 0x164d63);
  runtime.addRotor(5.2, 0.8, 6.8, -1.05, 0x1c526c, 0x0c6b91);

  runtime.addSplitDivider(20, 8.0, 0x331f50, 0x6c2bd9);
  runtime.addBumper(-5.8, 27.5, 0.95, 0x6b2c85);
  runtime.addBumper(5.8, 25.0, 0.95, 0x6b2c85);

  // The final slalom is also angled so a stopped racer has an escape vector.
  runtime.addAngledBlock(-5.3, 36.5, 3.5, 1.1, -0.3, 0x37291c, 0x3a1800, 1.8);
  runtime.addAngledBlock(5.1, 42.0, 3.5, 1.1, 0.3, 0x283341, 0x042a40, 1.8);

  runtime.addStars(0x7ca9d8, 650);
}
