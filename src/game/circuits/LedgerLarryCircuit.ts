import * as THREE from 'three';
import type { CircuitRuntime } from './CircuitRuntime';

export function buildLedgerLarryCircuit(runtime: CircuitRuntime) {
  runtime.buildBase({
    floor: 0x17140f,
    rail: 0x302b21,
    railEmissive: 0x5b421c,
    marker: 0xf0d38a,
    finishPrimary: 0xb88a3f,
    finishAccent: 0x75d9c4,
    sky: 0x050402
  });

  runtime.addTraceGrid(0xc9a966, 0x6fb3a5, [-43, -31, -11, 10, 31, 43]);
  runtime.addStars(0xbca774, 440);

  const carbon = 0x25211a;
  const paper = 0xe2d7b9;
  const brass = 0xb7893e;
  const green = 0x4a725d;
  const red = 0x8b2f22;
  const ink = 0x171a19;

  // INBOX INTAKE — paper-tray guides force the field into an administrative funnel.
  runtime.addAngledBlock(-5.4, -40.5, 5.6, 1.45, -0.39, green, 0x1d3a2c, 2.25);
  runtime.addAngledBlock(5.4, -40.5, 5.6, 1.45, 0.39, green, 0x1d3a2c, 2.25);
  runtime.addBumper(0, -35.3, 1.05, brass, 0x8a5a13);

  // CARBON ROLLERS — rotating bars represent the old black carbon-copy machine rollers.
  runtime.addRotor(-27.2, 0, 12.8, 1.55, carbon, 0x5f5132);
  runtime.addRotor(-20.5, 0, 11.4, -1.86, ink, 0x3f6e62);
  runtime.addRotor(-14.4, 0, 12.0, 2.08, carbon, 0x6b4a19);
  runtime.addBumper(-5.8, -23.7, 1.0, brass, green);
  runtime.addBumper(5.8, -17.2, 1.0, brass, green);

  // AUDIT GATES — alternating paperwork chicanes and physical stamp arms.
  runtime.addAngledBlock(-4.7, -8.0, 4.4, 1.15, -0.48, paper, 0x5a4421, 1.95);
  runtime.addAngledBlock(4.7, -3.0, 4.4, 1.15, 0.48, paper, 0x5a4421, 1.95);
  runtime.addRotor(1.5, -3.6, 5.7, 2.15, red, 0x6f160f);
  runtime.addRotor(6.4, 3.6, 5.7, -2.28, red, 0x6f160f);

  // DUPLICATE / TRIPLICATE — the carbon-copy split. Neither route is privileged.
  runtime.addSplitDivider(20.5, 7.5, green, 0x244c3d);
  runtime.addAngledBlock(-5.2, 14.5, 3.7, 1.0, -0.34, paper, 0x4d3f25, 1.85);
  runtime.addAngledBlock(5.2, 14.5, 3.7, 1.0, 0.34, carbon, 0x355b4c, 1.85);
  runtime.addAngledBlock(-5.1, 27.3, 3.7, 1.0, 0.34, carbon, 0x355b4c, 1.85);
  runtime.addAngledBlock(5.1, 27.3, 3.7, 1.0, -0.34, paper, 0x4d3f25, 1.85);

  // PNEUMATIC DISPATCH — tube mouths act as glancing bumpers into the finish chute.
  runtime.addBumper(-5.6, 35.0, 1.15, green, 0x4db89a);
  runtime.addBumper(5.6, 35.0, 1.15, green, 0x4db89a);
  runtime.addAngledBlock(-3.8, 41.0, 3.8, 1.0, 0.43, brass, 0x684513, 1.75);
  runtime.addAngledBlock(3.8, 41.0, 3.8, 1.0, -0.43, brass, 0x684513, 1.75);
  runtime.addBumper(0, 46.1, 0.82, red, 0x8c281b);

  addOfficeMachinery(runtime, paper, carbon, brass, green, red);
}

function addOfficeMachinery(
  runtime: CircuitRuntime,
  paper: number,
  carbon: number,
  brass: number,
  green: number,
  red: number
) {
  const paperMaterial = new THREE.MeshStandardMaterial({
    color: paper,
    roughness: 0.72,
    metalness: 0.02
  });
  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: carbon,
    roughness: 0.38,
    metalness: 0.62,
    emissive: 0x1f1b13,
    emissiveIntensity: 0.28
  });
  const brassMaterial = new THREE.MeshStandardMaterial({
    color: brass,
    roughness: 0.28,
    metalness: 0.88,
    emissive: 0x3d280c,
    emissiveIntensity: 0.35
  });
  const tubeMaterial = new THREE.MeshStandardMaterial({
    color: green,
    roughness: 0.22,
    metalness: 0.74,
    emissive: 0x173c32,
    emissiveIntensity: 0.58
  });

  // Paper stacks and carbon sheets flank the course like impossible filing cabinets.
  [-37, -24, -9, 4, 18, 33, 45].forEach((z, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const baseY = runtime.trackHeightAt(z) + 1.0;
    for (let sheet = 0; sheet < 5; sheet += 1) {
      const page = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 3.0), sheet % 2 ? carbonMaterial : paperMaterial);
      page.position.set(side * 12.0, baseY + sheet * 0.12, z + sheet * 0.08);
      page.rotation.y = (side * 0.04) + sheet * 0.015;
      runtime.scene.add(page);
    }
  });

  // Carbon-copy machine rollers: decorative cylinders echo the physical rotor bars.
  [-27.2, -20.5, -14.4].forEach((z, index) => {
    for (const side of [-1, 1]) {
      const roller = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 5.8, 28),
        index === 1 ? brassMaterial : carbonMaterial
      );
      roller.rotation.z = Math.PI / 2;
      roller.position.set(side * 11.5, runtime.trackHeightAt(z) + 3.1, z);
      runtime.scene.add(roller);
    }
  });

  // Giant red audit stamps hang over the gate section.
  [-5.2, 4.0].forEach((z, index) => {
    const stamp = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.82, 2.8, 24), new THREE.MeshStandardMaterial({
      color: red,
      roughness: 0.38,
      metalness: 0.28,
      emissive: 0x3a0b07,
      emissiveIntensity: 0.42
    }));
    handle.position.y = 1.4;
    stamp.add(handle);
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 2.1), carbonMaterial);
    stamp.add(base);
    stamp.position.set(index ? 11.7 : -11.7, runtime.trackHeightAt(z) + 4.0, z);
    stamp.rotation.z = index ? -0.13 : 0.13;
    runtime.scene.add(stamp);
  });

  // Pneumatic dispatch tubes and glowing mouths at the last sector.
  [35, 43].forEach((z, index) => {
    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.32, 10, 40), tubeMaterial);
      ring.position.set(side * 11.7, runtime.trackHeightAt(z) + 3.2, z);
      ring.rotation.y = Math.PI / 2;
      runtime.scene.add(ring);

      const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 6.5, 32, 1, true), tubeMaterial);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(side * 14.5, runtime.trackHeightAt(z) + 3.2, z + (index ? 1.0 : -1.0));
      runtime.scene.add(tube);
    }
  });

  // The mandatory carbon-copy machine sign.
  const sign = new THREE.Group();
  const signPlate = new THREE.Mesh(new THREE.BoxGeometry(9.8, 3.0, 0.35), carbonMaterial);
  sign.add(signPlate);
  const signTrim = new THREE.Mesh(new THREE.BoxGeometry(10.2, 3.4, 0.16), brassMaterial);
  signTrim.position.z = 0.23;
  sign.add(signTrim);
  sign.position.set(0, runtime.trackHeightAt(-2) + 8.6, -2);
  runtime.scene.add(sign);
}
