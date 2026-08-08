import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RACE } from '../config';
import type { CircuitSector } from '../TrackRegistry';

export type CircuitRandom = {
  range(min: number, max: number): number;
};

export type RotorRuntime = {
  body: CANNON.Body;
  mesh: THREE.Mesh;
  angle: number;
  speed: number;
};

export type CircuitPalette = {
  floor: number;
  rail: number;
  railEmissive: number;
  marker: number;
  finishPrimary: number;
  finishAccent: number;
  sky: number;
};

export class CircuitRuntime {
  readonly rotors: RotorRuntime[] = [];
  readonly marbleMaterial = new CANNON.Material('marble');
  private floorMaterial = new CANNON.Material('track');

  constructor(
    readonly scene: THREE.Scene,
    readonly world: CANNON.World,
    readonly random: CircuitRandom,
    readonly sectors: readonly CircuitSector[]
  ) {}

  buildBase(palette: CircuitPalette) {
    this.scene.background = new THREE.Color(palette.sky);
    this.world.defaultContactMaterial.friction = 0.23;
    this.world.defaultContactMaterial.restitution = 0.24;
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.floorMaterial, this.marbleMaterial, {
      friction: 0.31,
      restitution: 0.24
    }));

    const floorBody = new CANNON.Body({
      mass: 0,
      material: this.floorMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(RACE.trackWidth / 2, RACE.floorHalfHeight, RACE.trackLength / 2))
    });
    floorBody.quaternion.setFromEuler(RACE.slopeRadians, 0, 0);
    this.world.addBody(floorBody);

    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(RACE.trackWidth, RACE.floorHalfHeight * 2, RACE.trackLength),
      new THREE.MeshStandardMaterial({ color: palette.floor, metalness: 0.8, roughness: 0.32 })
    );
    floorMesh.rotation.x = RACE.slopeRadians;
    this.scene.add(floorMesh);

    this.addRail(-RACE.trackWidth / 2 - 0.25, palette.rail, palette.railEmissive);
    this.addRail(RACE.trackWidth / 2 + 0.25, palette.rail, palette.railEmissive);
    this.addSectorMarkers(palette.marker);
    this.addFinishGate(palette.finishPrimary, palette.finishAccent);

    (this.world as CANNON.World & { __pgpMarbleMaterial?: CANNON.Material }).__pgpMarbleMaterial = this.marbleMaterial;
  }

  trackHeightAt(z: number) {
    return -z * Math.tan(RACE.slopeRadians) + RACE.floorHalfHeight;
  }

  addTraceGrid(primary: number, secondary: number, bridges: number[] = []) {
    const lineMaterial = new THREE.MeshBasicMaterial({ color: primary, transparent: true, opacity: 0.32 });
    const bridgeMaterial = new THREE.MeshBasicMaterial({ color: secondary, transparent: true, opacity: 0.24 });
    for (let x = -6; x <= 6; x += 3) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, RACE.trackLength - 4), lineMaterial);
      line.position.set(x, 0.57, 0);
      line.rotation.x = RACE.slopeRadians;
      this.scene.add(line);
    }
    bridges.forEach((z) => {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(RACE.trackWidth - 2, 0.025, 0.16), bridgeMaterial);
      bridge.position.set(0, this.trackHeightAt(z) + 0.05, z);
      this.scene.add(bridge);
    });
  }

  addAngledBlock(
    x: number,
    z: number,
    width: number,
    depth: number,
    angleY: number,
    color: number,
    emissive: number,
    height = 2.2
  ) {
    const y = this.trackHeightAt(z) + height / 2 + 0.08;
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2))
    });
    body.position.set(x, y, z);
    body.quaternion.setFromEuler(0, angleY, 0);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.88,
        roughness: 0.27,
        emissive,
        emissiveIntensity: 0.72
      })
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = angleY;
    this.scene.add(mesh);
    return body;
  }

  addBumper(x: number, z: number, radius: number, color: number, emissive = color) {
    const y = this.trackHeightAt(z) + radius;
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(radius) });
    body.position.set(x, y, z);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 18),
      new THREE.MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.24, emissive, emissiveIntensity: 0.3 })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return body;
  }

  addRotor(z: number, x: number, width: number, speed: number, color: number, emissive: number) {
    const y = this.trackHeightAt(z) + 1.1;
    const body = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Box(new CANNON.Vec3(width / 2, 0.32, 0.42))
    });
    body.position.set(x, y, z);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.64, 0.84),
      new THREE.MeshStandardMaterial({ color, metalness: 0.92, roughness: 0.2, emissive, emissiveIntensity: 0.85 })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.rotors.push({ body, mesh, angle: this.random.range(0, Math.PI * 2), speed });
  }

  addSplitDivider(z: number, halfDepth: number, color: number, emissive: number) {
    const width = 1.3;
    const y = this.trackHeightAt(z) + 0.95;
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(width / 2, 0.9, halfDepth))
    });
    body.position.set(0, y, z);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 1.8, halfDepth * 2),
      new THREE.MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.25, emissive, emissiveIntensity: 0.62 })
    );
    mesh.position.set(0, y, z);
    this.scene.add(mesh);

    // Rounded nose prevents the square leading edge from creating a dead pocket.
    this.addBumper(0, z - halfDepth - 0.15, 1.05, color, emissive);
  }

  addTurntableVisual(z: number, radius: number, color: number, accent: number) {
    const y = this.trackHeightAt(z) + 0.08;
    const platter = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 0.12, 64),
      new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.34, emissive: accent, emissiveIntensity: 0.15 })
    );
    platter.position.set(0, y, z);
    this.scene.add(platter);

    for (const scale of [0.3, 0.52, 0.74, 0.92]) {
      const groove = new THREE.Mesh(
        new THREE.TorusGeometry(radius * scale, 0.035, 6, 64),
        new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.33 })
      );
      groove.rotation.x = Math.PI / 2;
      groove.position.set(0, y + 0.08, z);
      this.scene.add(groove);
    }
  }

  addSpeakerVisual(x: number, z: number, radius: number, color: number, accent: number) {
    const y = this.trackHeightAt(z) + radius + 0.35;
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.45, radius, 0.55, 32),
      new THREE.MeshStandardMaterial({ color, metalness: 0.68, roughness: 0.3, emissive: accent, emissiveIntensity: 0.2 })
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(x, y, z);
    this.scene.add(cone);
    this.addBumper(x, z, radius * 0.56, color, accent);
  }

  addStars(color: number, count = 650) {
    const stars = new THREE.BufferGeometry();
    const points: number[] = [];
    for (let index = 0; index < count; index += 1) {
      points.push(
        this.random.range(-90, 90),
        this.random.range(8, 70),
        this.random.range(-120, 120)
      );
    }
    stars.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    this.scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color, size: 0.13 })));
  }

  private addRail(x: number, color: number, emissive: number) {
    const body = new CANNON.Body({
      mass: 0,
      material: this.floorMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(0.32, 0.9, RACE.trackLength / 2))
    });
    body.position.set(x, 0.8, 0);
    body.quaternion.setFromEuler(RACE.slopeRadians, 0, 0);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 1.8, RACE.trackLength),
      new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.25, emissive, emissiveIntensity: 0.7 })
    );
    mesh.position.copy(body.position as unknown as THREE.Vector3);
    mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    this.scene.add(mesh);
  }

  private addSectorMarkers(color: number) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.24 });
    this.sectors.slice(1).forEach((sector) => {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(RACE.trackWidth - 1.2, 0.035, 0.26), material);
      marker.position.set(0, this.trackHeightAt(sector.startZ) + 0.07, sector.startZ);
      this.scene.add(marker);
    });
  }

  private addFinishGate(primary: number, accent: number) {
    const z = RACE.finishZ;
    const y = this.trackHeightAt(z);
    const main = new THREE.MeshStandardMaterial({
      color: primary,
      metalness: 0.88,
      roughness: 0.22,
      emissive: primary,
      emissiveIntensity: 0.22
    });
    const glow = new THREE.MeshBasicMaterial({ color: accent });

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), main);
    left.position.set(-RACE.trackWidth / 2 + 0.35, y + 3, z);
    this.scene.add(left);
    const right = left.clone();
    right.position.x *= -1;
    this.scene.add(right);

    const top = new THREE.Mesh(new THREE.BoxGeometry(RACE.trackWidth - 0.7, 0.5, 0.5), main);
    top.position.set(0, y + 5.8, z);
    this.scene.add(top);

    const line = new THREE.Mesh(new THREE.BoxGeometry(RACE.trackWidth - 1.4, 0.05, 0.4), glow);
    line.position.set(0, y + 0.55, z);
    this.scene.add(line);
  }
}
