import type { CircuitRuntime } from './CircuitRuntime';

export function buildBackspin96Circuit(runtime: CircuitRuntime) {
  runtime.buildBase({
    floor: 0x120d1d,
    rail: 0x281735,
    railEmissive: 0x5d1a6d,
    marker: 0xff5bc8,
    finishPrimary: 0xd9a247,
    finishAccent: 0x55ddff,
    sky: 0x05030a
  });

  runtime.addTraceGrid(0xff4dc3, 0x58dfff, [-39, -31, -11, 10, 31, 47]);

  // Giant record platters establish the visual identity while the physical race
  // stays on the shared sloped competition surface.
  runtime.addTurntableVisual(-24, 7.0, 0x0e0d12, 0xff4dc3);
  runtime.addTurntableVisual(18, 6.6, 0x0b1018, 0x55ddff);

  // Groove guides are shallow and oblique: enough to redirect, never enough to make a flat prison wall.
  runtime.addAngledBlock(-4.9, -28.5, 5.0, 0.8, -0.34, 0x35142f, 0xff2fae, 0.85);
  runtime.addAngledBlock(4.7, -22.0, 4.8, 0.8, 0.34, 0x142c3a, 0x2ac9ff, 0.85);
  runtime.addAngledBlock(-4.2, -15.5, 4.0, 0.7, -0.3, 0x35142f, 0xff2fae, 0.8);

  // Tonearms sweep the deck like oversized DJ hardware.
  runtime.addRotor(-5.5, -1.5, 8.0, 1.1, 0x8f6c2d, 0xffcc67);
  runtime.addRotor(4.0, 1.7, 7.4, -1.25, 0x3d5e70, 0x55ddff);
  runtime.addBumper(-6.0, 0.5, 1.05, 0x6c245f, 0xff4dc3);
  runtime.addBumper(6.0, 1.5, 1.05, 0x1d5d75, 0x55ddff);

  // The crossfader is Backspin's Parallax Split: left deck vs right deck.
  runtime.addSplitDivider(20, 7.8, 0x3a2148, 0xff4dc3);
  runtime.addAngledBlock(-5.5, 27.5, 3.4, 0.9, -0.28, 0x33142d, 0xff2fae, 1.05);
  runtime.addAngledBlock(5.5, 27.5, 3.4, 0.9, 0.28, 0x14313d, 0x2ac9ff, 1.05);

  // Speaker cones become physical kickers for the final sprint.
  runtime.addSpeakerVisual(-5.8, 35.5, 1.65, 0x24192e, 0xff4dc3);
  runtime.addSpeakerVisual(5.8, 39.5, 1.65, 0x142a35, 0x55ddff);
  runtime.addSpeakerVisual(-1.5, 44.5, 1.35, 0x2f2416, 0xffc85e);

  runtime.addStars(0xb56cff, 760);
}
