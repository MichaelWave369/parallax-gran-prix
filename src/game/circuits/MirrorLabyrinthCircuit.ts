import * as THREE from 'three';
import type { CircuitRuntime } from './CircuitRuntime';

export function buildMirrorLabyrinthCircuit(runtime: CircuitRuntime) {
  runtime.buildBase({
    floor: 0x071019,
    rail: 0x314554,
    railEmissive: 0x0b546b,
    marker: 0xaeeeff,
    finishPrimary: 0xc9dbe6,
    finishAccent: 0x9b6cff,
    sky: 0x010308
  });

  runtime.addTraceGrid(0x93efff, 0xbd84ff, [-42, -31, -11, 10, 31, 43]);
  runtime.addStars(0xc6ecff, 900);

  const silver = 0x7d8e9d;
  const pale = 0xccecff;
  const cyan = 0x43dfff;
  const violet = 0x8c62ff;
  const deep = 0x171c32;

  // REFLECTION ENTRY — mirrored feed guides produce two equally valid approaches.
  runtime.addAngledBlock(-5.2, -40, 5.4, 1.5, -0.38, silver, 0x173f55, 2.4);
  runtime.addAngledBlock(5.2, -40, 5.4, 1.5, 0.38, silver, 0x173f55, 2.4);
  runtime.addBumper(0, -35.5, 1.05, pale, cyan);

  // SYMMETRY HALL — every physical guide has a mirrored counterpart.
  [
    [-4.8, -27, -0.48],
    [4.8, -27, 0.48],
    [-4.1, -20.5, 0.52],
    [4.1, -20.5, -0.52],
    [-5.0, -14.3, -0.44],
    [5.0, -14.3, 0.44]
  ].forEach(([x, z, angle], index) => {
    runtime.addAngledBlock(x, z, 4.2, 1.15, angle, index % 2 ? deep : silver, index % 2 ? 0x29195d : 0x123d50, 2.05);
  });

  // INVERSE GATES — opposing sweepers rotate in opposite directions.
  runtime.addRotor(-6.5, -4.2, 5.0, 1.75, silver, cyan);
  runtime.addRotor(-6.5, 4.2, 5.0, -1.75, deep, violet);
  runtime.addRotor(3.8, -4.0, 4.8, -2.05, deep, violet);
  runtime.addRotor(3.8, 4.0, 4.8, 2.05, silver, cyan);
  runtime.addBumper(0, -1.2, 0.9, pale, violet);

  // MIRROR SPLIT — the central spine forces an explicit left/right commitment.
  runtime.addSplitDivider(20.5, 7.6, 0x45566a, 0x6a45d8);
  runtime.addAngledBlock(-5.1, 14.5, 3.8, 1.0, -0.34, silver, cyan, 1.9);
  runtime.addAngledBlock(5.1, 14.5, 3.8, 1.0, 0.34, silver, cyan, 1.9);
  runtime.addAngledBlock(-5.0, 27.4, 3.7, 1.0, 0.34, deep, violet, 1.9);
  runtime.addAngledBlock(5.0, 27.4, 3.7, 1.0, -0.34, deep, violet, 1.9);

  // PRISM SPRINT — symmetric glancing facets keep the last sector fast but readable.
  runtime.addBumper(-5.2, 35.2, 1.08, pale, cyan);
  runtime.addBumper(5.2, 35.2, 1.08, pale, violet);
  runtime.addAngledBlock(-3.9, 41.0, 3.8, 1.0, 0.45, silver, violet, 1.8);
  runtime.addAngledBlock(3.9, 41.0, 3.8, 1.0, -0.45, silver, cyan, 1.8);
  runtime.addBumper(0, 46.0, 0.82, pale, cyan);

  addMirrorArchitecture(runtime, cyan, violet, pale);
}

function addMirrorArchitecture(runtime: CircuitRuntime, cyan: number, violet: number, pale: number) {
  const panelMaterial = new THREE.MeshPhysicalMaterial({
    color: pale,
    metalness: 0.98,
    roughness: 0.045,
    transparent: true,
    opacity: 0.48,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    side: THREE.DoubleSide
  });

  const edgeMaterial = new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.56 });
  [-34, -23, -12, 0, 12, 24, 36, 45].forEach((z, index) => {
    const y = runtime.trackHeightAt(z) + 3.0;
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), panelMaterial);
      panel.position.set(side * 10.3, y, z);
      panel.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      runtime.scene.add(panel);

      const edge = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.045, 5, 4), edgeMaterial);
      edge.position.set(side * 10.22, y, z);
      edge.rotation.y = Math.PI / 2;
      edge.rotation.z = Math.PI / 4;
      runtime.scene.add(edge);
    }

    if (index % 2 === 0) {
      const prism = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.15, 0),
        new THREE.MeshPhysicalMaterial({
          color: index % 4 === 0 ? cyan : violet,
          metalness: 0.25,
          roughness: 0.08,
          transparent: true,
          opacity: 0.62,
          transmission: 0.12,
          emissive: index % 4 === 0 ? cyan : violet,
          emissiveIntensity: 0.18
        })
      );
      prism.position.set(index % 4 === 0 ? -12.8 : 12.8, y + 1.4, z + 2.0);
      prism.rotation.y = index * 0.37;
      runtime.scene.add(prism);
    }
  });
}
