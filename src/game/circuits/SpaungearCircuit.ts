import * as THREE from 'three';
import type { CircuitRuntime } from './CircuitRuntime';

const IRON = 0x20252a;
const BRASS = 0xc58a2b;
const COPPER = 0x8d4b24;
const TEAL = 0x1f7783;
const LIME = 0xa3d65c;

export function buildSpaungearCircuit(runtime: CircuitRuntime) {
  runtime.buildBase({
    floor: 0x11161a,
    rail: 0x2a3338,
    railEmissive: 0x17393e,
    marker: 0xe5a744,
    finishPrimary: BRASS,
    finishAccent: LIME,
    sky: 0x020504
  });

  runtime.addTraceGrid(0xb7742a, 0x3fa4a9, [-31, -11, 10, 31, 44]);

  // FORGE ENTRY — angled feed guides avoid square dead pockets.
  runtime.addAngledBlock(-5.9, -37, 5.3, 1.5, -0.32, IRON, COPPER);
  runtime.addAngledBlock(5.9, -31.8, 5.3, 1.5, 0.32, IRON, COPPER);
  addGearVisual(runtime, -5.8, -40, 3.2, BRASS, 14);
  addGearVisual(runtime, 6.4, -34, 2.7, TEAL, 12);

  // PINION FIELD — successive rotating spokes create timing windows.
  runtime.addRotor(-25.5, -2.8, 7.0, 1.42, 0x78501f, BRASS);
  runtime.addRotor(-19.2, 3.1, 7.4, -1.18, 0x315d61, TEAL);
  runtime.addRotor(-13.2, -2.0, 6.6, 1.7, 0x6d3b22, COPPER);
  runtime.addBumper(-6.4, -22.5, 1.1, 0x514128, BRASS);
  runtime.addBumper(6.4, -16.5, 1.1, 0x274f52, TEAL);
  addGearVisual(runtime, 0, -22, 4.1, BRASS, 18);
  addGearVisual(runtime, 0, -14, 3.3, TEAL, 16);

  // TRANSFER GATES — glancing geometry funnels vessels through alternating windows.
  runtime.addAngledBlock(-5.8, -7.2, 5.8, 1.3, -0.42, 0x3a3025, BRASS);
  runtime.addAngledBlock(5.8, -2.0, 5.8, 1.3, 0.42, 0x26383a, TEAL);
  runtime.addAngledBlock(-5.6, 3.2, 5.3, 1.25, -0.36, 0x49301f, COPPER);
  runtime.addRotor(7.2, 0, 9.2, -0.92, 0x805c27, BRASS);

  // CROWN MESH — physical split through the central crown gear.
  runtime.addSplitDivider(20.5, 6.2, 0x4a3520, BRASS);
  runtime.addBumper(-5.8, 17.0, 1.05, 0x65502a, BRASS);
  runtime.addBumper(5.8, 24.0, 1.05, 0x285d62, TEAL);
  runtime.addRotor(28.0, -2.7, 6.5, 1.24, 0x5f431e, BRASS);
  addGearVisual(runtime, 0, 20.5, 4.6, BRASS, 20);

  // OUTPUT SHAFT — last mechanical transfer before the line.
  runtime.addAngledBlock(-5.6, 35.2, 4.7, 1.25, -0.34, 0x2d3538, TEAL);
  runtime.addAngledBlock(5.6, 40.4, 4.7, 1.25, 0.34, 0x44301e, BRASS);
  runtime.addRotor(44.7, 0, 7.3, -1.52, 0x64441e, BRASS);
  runtime.addBumper(-5.8, 46.0, 0.92, 0x3d5424, LIME);
  runtime.addBumper(5.8, 46.8, 0.92, 0x3d5424, LIME);
  addGearVisual(runtime, 0, 42.5, 3.4, LIME, 14);

  addFactoryArches(runtime);
  runtime.addStars(0x78949a, 430);
}

function addGearVisual(
  runtime: CircuitRuntime,
  x: number,
  z: number,
  radius: number,
  color: number,
  teeth: number
) {
  const y = runtime.trackHeightAt(z) + 0.16;
  const group = new THREE.Group();
  group.position.set(x, y, z);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.24, 10, 48),
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.9,
      roughness: 0.3,
      emissive: color,
      emissiveIntensity: 0.12
    })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.26, radius * 0.26, 0.18, 24),
    new THREE.MeshStandardMaterial({ color: IRON, metalness: 0.88, roughness: 0.26 })
  );
  group.add(hub);

  for (let index = 0; index < teeth; index += 1) {
    const angle = (index / teeth) * Math.PI * 2;
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.18, 0.78),
      new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.28 })
    );
    tooth.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    tooth.rotation.y = -angle;
    group.add(tooth);
  }

  runtime.scene.add(group);
}

function addFactoryArches(runtime: CircuitRuntime) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x263034,
    metalness: 0.92,
    roughness: 0.25,
    emissive: 0x17363a,
    emissiveIntensity: 0.35
  });

  [-42, -9, 12, 34].forEach((z, index) => {
    const y = runtime.trackHeightAt(z);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.45, 6.8, 0.45), material);
    left.position.set(-9.3, y + 3.4, z);
    runtime.scene.add(left);
    const right = left.clone();
    right.position.x = 9.3;
    runtime.scene.add(right);
    const top = new THREE.Mesh(new THREE.BoxGeometry(19, 0.4, 0.55), material);
    top.position.set(0, y + 6.55, z);
    runtime.scene.add(top);

    const lamp = new THREE.PointLight(index % 2 ? TEAL : BRASS, 14, 28, 2);
    lamp.position.set(0, y + 5.6, z);
    runtime.scene.add(lamp);
  });
}
