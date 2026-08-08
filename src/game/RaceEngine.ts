import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BRBC_LINES, RACERS, RACE, SECTORS, type BroadcastEventType, type RacerDefinition } from './config';

type RaceState = 'ready' | 'countdown' | 'running' | 'finished';
export type CameraMode = 'auto' | 'chase' | 'wide' | 'finish';

type RacerRuntime = {
  def: RacerDefinition;
  body: CANNON.Body;
  group: THREE.Group;
  finishTime?: number;
  finishPlace?: number;
};

type RotorRuntime = {
  body: CANNON.Body;
  mesh: THREE.Mesh;
  angle: number;
  speed: number;
};

export type Standing = {
  place: number;
  id: string;
  name: string;
  team: string;
  progress: number;
  finished: boolean;
  finishTime?: number;
};

export type RaceReceipt = {
  seed: number;
  winner: string;
  winningTime: number | null;
  margin: number | null;
  photoFinish: boolean;
  leadChanges: number;
  collisionEvents: number;
  splitLeft: number;
  splitRight: number;
  finishers: number;
};

export type RaceSnapshot = {
  state: RaceState;
  elapsed: number;
  countdown: number;
  leader?: Standing;
  standings: Standing[];
  seed: number;
  sector: string;
  cameraMode: CameraMode;
  receipt?: RaceReceipt;
};

export type BroadcastMessage = {
  speaker: 'THREVE' | "SIX'T" | 'NOINE';
  text: string;
  type: BroadcastEventType;
  time: number;
};

type RaceEngineOptions = {
  seed?: number;
  onSnapshot?: (snapshot: RaceSnapshot) => void;
  onBroadcast?: (message: BroadcastMessage) => void;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed || 0x369;
  }

  next() {
    let x = this.state | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x | 0;
    return ((x >>> 0) % 1_000_000) / 1_000_000;
  }

  range(min: number, max: number) {
    return min + (max - min) * this.next();
  }
}

export class RaceEngine {
  private container: HTMLElement;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  private renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  private world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  private racers: RacerRuntime[] = [];
  private rotors: RotorRuntime[] = [];
  private finished: RacerRuntime[] = [];
  private splitChoices = new Map<string, 'LEFT' | 'RIGHT'>();
  private state: RaceState = 'ready';
  private cameraMode: CameraMode = 'auto';
  private seed: number;
  private random: SeededRandom;
  private raceStartMs = 0;
  private countdownStartMs = 0;
  private lastFrameMs = performance.now();
  private lastSnapshotMs = 0;
  private lastLeaderId = '';
  private lastSectorId = '';
  private collisionCalloutAt = 0;
  private animationFrame = 0;
  private leadChanges = 0;
  private collisionEvents = 0;
  private photoFinishAnnounced = false;
  private splitAnnounced = false;
  private receipt?: RaceReceipt;
  private onSnapshot?: (snapshot: RaceSnapshot) => void;
  private onBroadcast?: (message: BroadcastMessage) => void;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, options: RaceEngineOptions = {}) {
    this.container = container;
    this.seed = options.seed ?? Math.floor(Date.now() % 1_000_000_000);
    this.random = new SeededRandom(this.seed);
    this.onSnapshot = options.onSnapshot;
    this.onBroadcast = options.onBroadcast;

    this.scene.background = new THREE.Color(0x03060d);
    this.scene.fog = new THREE.FogExp2(0x03060d, 0.0105);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.container.appendChild(this.renderer.domElement);

    this.world.allowSleep = true;
    this.world.solver.iterations = 14;

    this.buildLighting();
    this.buildBattlecaseCircuit();
    this.spawnRacers();

    this.camera.position.set(0, 24, RACE.startZ - 12);
    this.camera.lookAt(0, 1, RACE.startZ + 12);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();
    this.emitSnapshot(performance.now());
    this.animationFrame = requestAnimationFrame(this.animate);
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.container.replaceChildren();
  }

  startRace() {
    if (this.state !== 'ready' && this.state !== 'finished') return;
    if (this.state === 'finished') this.resetRace();
    this.state = 'countdown';
    this.countdownStartMs = performance.now();
    this.emitSnapshot(this.countdownStartMs);
  }

  resetRace(seed = this.seed) {
    this.seed = seed;
    this.random = new SeededRandom(seed);
    this.state = 'ready';
    this.finished = [];
    this.splitChoices.clear();
    this.lastLeaderId = '';
    this.lastSectorId = '';
    this.raceStartMs = 0;
    this.leadChanges = 0;
    this.collisionEvents = 0;
    this.photoFinishAnnounced = false;
    this.splitAnnounced = false;
    this.receipt = undefined;

    this.racers.forEach((racer, index) => {
      const lane = index % 6;
      const row = Math.floor(index / 6);
      const x = -7.2 + lane * 2.88 + (row ? 0.7 : 0);
      const z = RACE.startZ - row * 2.1;
      racer.body.position.set(x, this.trackHeightAt(z) + 1.5, z);
      racer.body.velocity.set(0, 0, 0);
      racer.body.angularVelocity.set(0, 0, 0);
      racer.body.quaternion.set(0, 0, 0, 1);
      racer.finishTime = undefined;
      racer.finishPlace = undefined;
      racer.body.sleep();
    });

    this.emitSnapshot(performance.now());
  }

  setSeed(seed: number) {
    this.resetRace(Math.abs(Math.trunc(seed)) || 369);
  }

  getSeed() {
    return this.seed;
  }

  cycleCameraMode() {
    const modes: CameraMode[] = ['auto', 'chase', 'wide', 'finish'];
    const next = (modes.indexOf(this.cameraMode) + 1) % modes.length;
    this.cameraMode = modes[next];
    this.emitSnapshot(performance.now());
    return this.cameraMode;
  }

  private buildLighting() {
    const ambient = new THREE.HemisphereLight(0x8dc7ff, 0x130a04, 1.55);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffd58a, 4.8);
    key.position.set(-12, 28, -25);
    this.scene.add(key);

    const cyan = new THREE.PointLight(0x24bfff, 28, 52, 2);
    cyan.position.set(10, 7, -15);
    this.scene.add(cyan);

    const amber = new THREE.PointLight(0xff8a22, 24, 48, 2);
    amber.position.set(-10, 7, 25);
    this.scene.add(amber);

    const splitLight = new THREE.PointLight(0xb253ff, 22, 35, 2);
    splitLight.position.set(0, 8, 20);
    this.scene.add(splitLight);
  }

  private buildBattlecaseCircuit() {
    const floorMaterial = new CANNON.Material('track');
    const marbleMaterial = new CANNON.Material('marble');
    this.world.defaultContactMaterial.friction = 0.23;
    this.world.defaultContactMaterial.restitution = 0.24;
    this.world.addContactMaterial(new CANNON.ContactMaterial(floorMaterial, marbleMaterial, {
      friction: 0.31,
      restitution: 0.24
    }));

    const floorShape = new CANNON.Box(new CANNON.Vec3(RACE.trackWidth / 2, RACE.floorHalfHeight, RACE.trackLength / 2));
    const floorBody = new CANNON.Body({ mass: 0, material: floorMaterial, shape: floorShape });
    floorBody.position.set(0, 0, 0);
    floorBody.quaternion.setFromEuler(RACE.slopeRadians, 0, 0);
    this.world.addBody(floorBody);

    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(RACE.trackWidth, RACE.floorHalfHeight * 2, RACE.trackLength),
      new THREE.MeshStandardMaterial({ color: 0x0a1420, metalness: 0.8, roughness: 0.32 })
    );
    floorMesh.rotation.x = RACE.slopeRadians;
    this.scene.add(floorMesh);

    this.addMotherboardTraces();
    this.addRail(-RACE.trackWidth / 2 - 0.25, floorMaterial);
    this.addRail(RACE.trackWidth / 2 + 0.25, floorMaterial);

    // GPU Canyon: alternating heatsink blocks force a fast chicane.
    [
      { x: -5.2, z: -27, w: 5.1, d: 2.2 },
      { x: 5.0, z: -21, w: 5.4, d: 2.2 },
      { x: -4.4, z: -15.5, w: 4.6, d: 1.8 }
    ].forEach((o, i) => this.addObstacle(o.x, o.z, o.w, o.d, i));

    // Cooling Gauntlet: physical rotating sweepers plus fixed fan-hub bumpers.
    this.addRotor(-7, -0.7, 7.4, 1.25);
    this.addBumper(-5.7, -1.2, 1.15, 0x164d63);
    this.addBumper(5.8, 2.0, 1.15, 0x164d63);
    this.addRotor(5.2, 0.8, 7.0, -1.05);

    // Parallax Split: a real divider creates left/right routes with different traffic.
    this.addSplitDivider();
    this.addBumper(-5.8, 27.5, 1.0, 0x6b2c85);
    this.addBumper(5.8, 25.0, 1.0, 0x6b2c85);

    // Final sprint: a narrow last slalom before the line.
    this.addObstacle(-5.4, 36.5, 3.7, 1.3, 4);
    this.addObstacle(5.2, 42.0, 3.7, 1.3, 5);

    this.addSectorMarkers();
    this.addFinishGate();
    this.addBattlecaseDecor();

    (this.world as CANNON.World & { __pgpMarbleMaterial?: CANNON.Material }).__pgpMarbleMaterial = marbleMaterial;
  }

  private addMotherboardTraces() {
    const trace = new THREE.MeshBasicMaterial({ color: 0x1ec8ff, transparent: true, opacity: 0.34 });
    const goldTrace = new THREE.MeshBasicMaterial({ color: 0xe0a94c, transparent: true, opacity: 0.24 });
    for (let x = -6; x <= 6; x += 3) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, RACE.trackLength - 4), trace);
      line.position.set(x, 0.57, 0);
      line.rotation.x = RACE.slopeRadians;
      this.scene.add(line);
    }
    [-38, -31, 31, 47].forEach((z) => {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(RACE.trackWidth - 2, 0.025, 0.16), goldTrace);
      bridge.position.set(0, this.trackHeightAt(z) + 0.05, z);
      this.scene.add(bridge);
    });
  }

  private addRail(x: number, material: CANNON.Material) {
    const shape = new CANNON.Box(new CANNON.Vec3(0.32, 0.9, RACE.trackLength / 2));
    const body = new CANNON.Body({ mass: 0, material, shape });
    body.position.set(x, 0.8, 0);
    body.quaternion.setFromEuler(RACE.slopeRadians, 0, 0);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 1.8, RACE.trackLength),
      new THREE.MeshStandardMaterial({ color: 0x172635, metalness: 0.9, roughness: 0.25, emissive: 0x05293d, emissiveIntensity: 0.7 })
    );
    mesh.position.copy(body.position as unknown as THREE.Vector3);
    mesh.quaternion.copy(body.quaternion as unknown as THREE.Quaternion);
    this.scene.add(mesh);
  }

  private addObstacle(x: number, z: number, width: number, depth: number, index: number) {
    const y = this.trackHeightAt(z) + 1.18;
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, 1.1, depth / 2));
    const body = new CANNON.Body({ mass: 0, shape });
    body.position.set(x, y, z);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 2.2, depth),
      new THREE.MeshStandardMaterial({
        color: index % 2 ? 0x283341 : 0x37291c,
        metalness: 0.88,
        roughness: 0.28,
        emissive: index % 2 ? 0x042a40 : 0x3a1800,
        emissiveIntensity: 0.78
      })
    );
    mesh.position.copy(body.position as unknown as THREE.Vector3);
    this.scene.add(mesh);
  }

  private addBumper(x: number, z: number, radius: number, color: number) {
    const y = this.trackHeightAt(z) + radius;
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(radius) });
    body.position.set(x, y, z);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 18),
      new THREE.MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.24, emissive: color, emissiveIntensity: 0.28 })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
  }

  private addRotor(z: number, x: number, width: number, speed: number) {
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
      new THREE.MeshStandardMaterial({ color: 0x1c526c, metalness: 0.92, roughness: 0.2, emissive: 0x0c6b91, emissiveIntensity: 0.8 })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.rotors.push({ body, mesh, angle: this.random.range(0, Math.PI * 2), speed });
  }

  private addSplitDivider() {
    const z = 20;
    const width = 1.45;
    const depth = 8.4;
    const y = this.trackHeightAt(z) + 0.95;
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(width / 2, 0.9, depth)) });
    body.position.set(0, y, z);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 1.8, depth * 2),
      new THREE.MeshStandardMaterial({ color: 0x331f50, metalness: 0.82, roughness: 0.25, emissive: 0x6c2bd9, emissiveIntensity: 0.62 })
    );
    mesh.position.set(0, y, z);
    this.scene.add(mesh);

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 3.2, 4),
      new THREE.MeshStandardMaterial({ color: 0xd8ad58, metalness: 0.9, roughness: 0.2, emissive: 0x5a3200, emissiveIntensity: 0.65 })
    );
    crown.position.set(0, y + 2.4, z - depth + 0.7);
    crown.rotation.y = Math.PI / 4;
    this.scene.add(crown);
  }

  private addSectorMarkers() {
    const material = new THREE.MeshBasicMaterial({ color: 0x78dcff, transparent: true, opacity: 0.24 });
    SECTORS.slice(1).forEach((sector) => {
      const z = sector.startZ;
      const marker = new THREE.Mesh(new THREE.BoxGeometry(RACE.trackWidth - 1.2, 0.035, 0.26), material);
      marker.position.set(0, this.trackHeightAt(z) + 0.07, z);
      this.scene.add(marker);
    });
  }

  private addFinishGate() {
    const z = RACE.finishZ;
    const y = this.trackHeightAt(z);
    const gold = new THREE.MeshStandardMaterial({ color: 0xc89437, metalness: 0.88, roughness: 0.22, emissive: 0x472400, emissiveIntensity: 0.8 });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x3ad9ff });

    const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 0.5), gold);
    left.position.set(-RACE.trackWidth / 2 + 0.35, y + 3, z);
    this.scene.add(left);

    const right = left.clone();
    right.position.x *= -1;
    this.scene.add(right);

    const top = new THREE.Mesh(new THREE.BoxGeometry(RACE.trackWidth - 0.7, 0.5, 0.5), gold);
    top.position.set(0, y + 5.8, z);
    this.scene.add(top);

    const line = new THREE.Mesh(new THREE.BoxGeometry(RACE.trackWidth - 1.4, 0.05, 0.4), cyan);
    line.position.set(0, y + 0.55, z);
    this.scene.add(line);
  }

  private addBattlecaseDecor() {
    const fanMaterial = new THREE.MeshStandardMaterial({ color: 0x1b2e40, metalness: 0.9, roughness: 0.24, emissive: 0x053854, emissiveIntensity: 0.9 });
    [-39, -5, 19, 40].forEach((z, idx) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.28, 10, 40), fanMaterial);
      ring.position.set(idx % 2 ? -12.5 : 12.5, this.trackHeightAt(z) + 3.8, z);
      ring.rotation.y = Math.PI / 2;
      this.scene.add(ring);

      for (let blade = 0; blade < 5; blade += 1) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.0, 0.12), fanMaterial);
        b.position.copy(ring.position);
        b.rotation.z = (blade / 5) * Math.PI * 2;
        b.rotation.y = Math.PI / 2;
        this.scene.add(b);
      }
    });

    const stars = new THREE.BufferGeometry();
    const points: number[] = [];
    for (let i = 0; i < 650; i += 1) {
      points.push(this.random.range(-90, 90), this.random.range(8, 70), this.random.range(-120, 120));
    }
    stars.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    this.scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0x7ca9d8, size: 0.13 })));
  }

  private spawnRacers() {
    const marbleMaterial = (this.world as CANNON.World & { __pgpMarbleMaterial?: CANNON.Material }).__pgpMarbleMaterial;

    RACERS.forEach((def, index) => {
      const lane = index % 6;
      const row = Math.floor(index / 6);
      const x = -7.2 + lane * 2.88 + (row ? 0.7 : 0);
      const z = RACE.startZ - row * 2.1;
      const body = new CANNON.Body({
        mass: 1.15 + this.random.range(-0.08, 0.08),
        material: marbleMaterial,
        shape: new CANNON.Sphere(RACE.marbleRadius),
        position: new CANNON.Vec3(x, this.trackHeightAt(z) + 1.5, z),
        linearDamping: 0.018,
        angularDamping: 0.014,
        allowSleep: true,
        sleepSpeedLimit: 0.08,
        sleepTimeLimit: 0.5
      });
      this.world.addBody(body);
      body.sleep();

      const group = new THREE.Group();
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(RACE.marbleRadius, 30, 24),
        new THREE.MeshStandardMaterial({
          color: def.color,
          metalness: 0.58,
          roughness: 0.24,
          emissive: def.accent,
          emissiveIntensity: 0.16
        })
      );
      group.add(sphere);

      const cage = new THREE.Mesh(
        new THREE.IcosahedronGeometry(RACE.marbleRadius * 1.015, 2),
        new THREE.MeshBasicMaterial({ color: def.accent, wireframe: true, transparent: true, opacity: 0.2 })
      );
      group.add(cage);
      this.scene.add(group);

      const runtime: RacerRuntime = { def, body, group };
      body.addEventListener('collide', () => this.handleCollision(runtime));
      this.racers.push(runtime);
    });
  }

  private handleCollision(racer: RacerRuntime) {
    if (this.state !== 'running') return;
    const now = performance.now();
    if (now < this.collisionCalloutAt) return;
    if (racer.body.velocity.length() < 4.5) return;
    this.collisionEvents += 1;
    this.collisionCalloutAt = now + 3800;
    this.broadcast('collision', racer.def.name);
  }

  private launchRace(now: number) {
    this.state = 'running';
    this.raceStartMs = now;
    this.racers.forEach((racer, index) => {
      racer.body.wakeUp();
      const lateral = this.random.range(-0.5, 0.5);
      const forward = this.random.range(1.1, 2.7) + index * 0.002;
      racer.body.velocity.set(lateral, 0, forward);
      racer.body.angularVelocity.set(
        this.random.range(-2.4, 2.4),
        this.random.range(-1.4, 1.4),
        this.random.range(-2.4, 2.4)
      );
    });
    this.broadcast('start');
  }

  private animate = (now: number) => {
    this.animationFrame = requestAnimationFrame(this.animate);
    const dt = Math.min((now - this.lastFrameMs) / 1000, 0.1);
    this.lastFrameMs = now;

    if (this.state === 'countdown') {
      const elapsed = (now - this.countdownStartMs) / 1000;
      if (elapsed >= RACE.countdownSeconds) this.launchRace(now);
    }

    this.updateTrackMechanics(dt);

    if (this.state === 'running') {
      this.world.step(RACE.fixedTimeStep, dt, RACE.maxSubSteps);
      this.checkFinishers(now);
      this.checkLeader();
      this.checkSector();
      this.checkSplitChoices();

      const elapsed = (now - this.raceStartMs) / 1000;
      if (elapsed > 48) this.finalizeRace();
    }

    this.syncVisuals();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);

    if (now - this.lastSnapshotMs > 120) this.emitSnapshot(now);
  };

  private updateTrackMechanics(dt: number) {
    this.rotors.forEach((rotor) => {
      rotor.angle += rotor.speed * dt;
      rotor.body.quaternion.setFromEuler(0, rotor.angle, 0);
      rotor.mesh.quaternion.set(0, rotor.body.quaternion.x, rotor.body.quaternion.y, rotor.body.quaternion.z, rotor.body.quaternion.w);
    });
  }

  private syncVisuals() {
    this.racers.forEach((racer) => {
      racer.group.position.set(racer.body.position.x, racer.body.position.y, racer.body.position.z);
      racer.group.quaternion.set(racer.body.quaternion.x, racer.body.quaternion.y, racer.body.quaternion.z, racer.body.quaternion.w);
    });
  }

  private checkFinishers(now: number) {
    this.racers.forEach((racer) => {
      if (racer.finishPlace || racer.body.position.z < RACE.finishZ) return;
      racer.finishPlace = this.finished.length + 1;
      racer.finishTime = (now - this.raceStartMs) / 1000;
      this.finished.push(racer);
      this.broadcast(racer.finishPlace === 1 ? 'winner' : 'finish', `${racer.def.name} — P${racer.finishPlace}`);
    });

    if (this.finished.length >= 2 && !this.photoFinishAnnounced) {
      const first = this.finished[0].finishTime ?? 0;
      const second = this.finished[1].finishTime ?? 0;
      const gap = second - first;
      if (gap <= RACE.photoFinishThreshold) {
        this.photoFinishAnnounced = true;
        this.broadcast('photo-finish', `${this.finished[0].def.name} / ${this.finished[1].def.name} — Δ${gap.toFixed(3)}s`);
      }
    }

    if (this.finished.length === this.racers.length) this.finalizeRace();
  }

  private finalizeRace() {
    if (this.state === 'finished') return;
    this.state = 'finished';
    this.racers.forEach((racer) => racer.body.sleep());
    this.receipt = this.buildReceipt();
    this.emitSnapshot(performance.now());
  }

  private buildReceipt(): RaceReceipt {
    const first = this.finished[0];
    const second = this.finished[1];
    const winningTime = first?.finishTime ?? null;
    const margin = first?.finishTime !== undefined && second?.finishTime !== undefined
      ? second.finishTime - first.finishTime
      : null;
    const choices = [...this.splitChoices.values()];

    return {
      seed: this.seed,
      winner: first?.def.name ?? 'NO FINISHER',
      winningTime,
      margin,
      photoFinish: margin !== null && margin <= RACE.photoFinishThreshold,
      leadChanges: this.leadChanges,
      collisionEvents: this.collisionEvents,
      splitLeft: choices.filter((choice) => choice === 'LEFT').length,
      splitRight: choices.filter((choice) => choice === 'RIGHT').length,
      finishers: this.finished.length
    };
  }

  private checkLeader() {
    const standings = this.calculateStandings();
    const leader = standings[0];
    if (!leader || leader.id === this.lastLeaderId) return;
    const previous = this.lastLeaderId;
    this.lastLeaderId = leader.id;
    if (previous) {
      this.leadChanges += 1;
      this.broadcast('lead-change', leader.name);
    }
  }

  private checkSector() {
    const leader = this.calculateStandings()[0];
    if (!leader) return;
    const runtime = this.racers.find((racer) => racer.def.id === leader.id);
    if (!runtime) return;
    const sector = this.sectorAt(runtime.body.position.z);
    if (sector.id === this.lastSectorId) return;
    const previous = this.lastSectorId;
    this.lastSectorId = sector.id;
    if (previous) this.broadcast('sector', sector.name);
  }

  private checkSplitChoices() {
    this.racers.forEach((racer) => {
      if (this.splitChoices.has(racer.def.id)) return;
      if (racer.body.position.z < 10.5 || racer.body.position.z > 16) return;
      const choice = racer.body.position.x < 0 ? 'LEFT' : 'RIGHT';
      this.splitChoices.set(racer.def.id, choice);
      if (!this.splitAnnounced) {
        this.splitAnnounced = true;
        this.broadcast('split', `${racer.def.name} commits ${choice}`);
      }
    });
  }

  private updateCamera() {
    const standings = this.calculateStandings();
    const leader = standings[0];
    const targetRacer = leader ? this.racers.find((r) => r.def.id === leader.id) : this.racers[0];
    if (!targetRacer) return;

    const effectiveMode = this.cameraMode === 'auto'
      ? leader && leader.progress > 0.78
        ? 'finish'
        : leader && leader.progress < 0.18
          ? 'wide'
          : 'chase'
      : this.cameraMode;

    if (effectiveMode === 'wide') {
      const desired = new THREE.Vector3(0, 34, targetRacer.body.position.z - 6);
      this.camera.position.lerp(desired, 0.035);
      this.camera.lookAt(0, this.trackHeightAt(targetRacer.body.position.z), targetRacer.body.position.z + 11);
      return;
    }

    if (effectiveMode === 'finish') {
      const desired = new THREE.Vector3(0, 13, RACE.finishZ - 19);
      this.camera.position.lerp(desired, 0.055);
      this.camera.lookAt(0, this.trackHeightAt(RACE.finishZ) + 1, RACE.finishZ + 2);
      return;
    }

    const z = targetRacer.body.position.z;
    const y = Math.max(8, targetRacer.body.position.y + 11);
    const desired = new THREE.Vector3(targetRacer.body.position.x * 0.22, y, z - 17);
    this.camera.position.lerp(desired, 0.05);
    const look = new THREE.Vector3(targetRacer.body.position.x * 0.32, targetRacer.body.position.y, z + 8);
    this.camera.lookAt(look);
  }

  private calculateStandings(): Standing[] {
    const ordered = [...this.racers].sort((a, b) => {
      if (a.finishPlace && b.finishPlace) return a.finishPlace - b.finishPlace;
      if (a.finishPlace) return -1;
      if (b.finishPlace) return 1;
      return b.body.position.z - a.body.position.z;
    });

    return ordered.map((racer, index) => ({
      place: racer.finishPlace ?? index + 1,
      id: racer.def.id,
      name: racer.def.name,
      team: racer.def.team,
      progress: clamp01((racer.body.position.z - RACE.startZ) / (RACE.finishZ - RACE.startZ)),
      finished: Boolean(racer.finishPlace),
      finishTime: racer.finishTime
    }));
  }

  private emitSnapshot(now: number) {
    this.lastSnapshotMs = now;
    const standings = this.calculateStandings();
    const countdown = this.state === 'countdown'
      ? Math.max(0, Math.ceil(RACE.countdownSeconds - (now - this.countdownStartMs) / 1000))
      : 0;
    const elapsed = this.raceStartMs ? Math.max(0, (now - this.raceStartMs) / 1000) : 0;
    const leaderRuntime = standings[0] ? this.racers.find((racer) => racer.def.id === standings[0].id) : undefined;
    const sector = this.sectorAt(leaderRuntime?.body.position.z ?? RACE.startZ).name;

    this.onSnapshot?.({
      state: this.state,
      elapsed,
      countdown,
      leader: standings[0],
      standings,
      seed: this.seed,
      sector,
      cameraMode: this.cameraMode,
      receipt: this.receipt
    });
  }

  private broadcast(type: BroadcastEventType, detail?: string) {
    if (!this.onBroadcast) return;
    const raw = this.pickLine(type);
    const colon = raw.indexOf(':');
    const explicitSpeaker = colon > 0 ? raw.slice(0, colon) : '';
    const speaker = explicitSpeaker === 'THREVE' || explicitSpeaker === "SIX'T" || explicitSpeaker === 'NOINE'
      ? explicitSpeaker
      : (['THREVE', "SIX'T", 'NOINE'] as const)[Math.floor(this.random.next() * 3)];
    const baseText = colon > 0 && explicitSpeaker === speaker ? raw.slice(colon + 1).trim() : raw;
    const text = detail ? `${baseText} — ${detail}` : baseText;

    this.onBroadcast({ speaker, text, type, time: performance.now() });
  }

  private pickLine(type: BroadcastEventType) {
    const lines = BRBC_LINES[type];
    return lines[Math.floor(this.random.next() * lines.length)];
  }

  private sectorAt(z: number) {
    return SECTORS.find((sector) => z >= sector.startZ && z < sector.endZ) ?? SECTORS[SECTORS.length - 1];
  }

  private trackHeightAt(z: number) {
    return -z * Math.tan(RACE.slopeRadians) + RACE.floorHalfHeight;
  }

  private resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
}
