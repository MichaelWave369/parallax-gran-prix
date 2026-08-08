import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BRBC_LINES, RACERS, RACE, type BroadcastEventType, type RacerDefinition } from './config';

type RaceState = 'ready' | 'countdown' | 'running' | 'finished';

type RacerRuntime = {
  def: RacerDefinition;
  body: CANNON.Body;
  group: THREE.Group;
  finishTime?: number;
  finishPlace?: number;
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

export type RaceSnapshot = {
  state: RaceState;
  elapsed: number;
  countdown: number;
  leader?: Standing;
  standings: Standing[];
  seed: number;
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
  private finished: RacerRuntime[] = [];
  private state: RaceState = 'ready';
  private seed: number;
  private random: SeededRandom;
  private raceStartMs = 0;
  private countdownStartMs = 0;
  private lastFrameMs = performance.now();
  private lastSnapshotMs = 0;
  private lastLeaderId = '';
  private collisionCalloutAt = 0;
  private animationFrame = 0;
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
    this.scene.fog = new THREE.FogExp2(0x03060d, 0.012);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.world.allowSleep = true;
    this.world.solver.iterations = 12;

    this.buildLighting();
    this.buildBattlecaseCircuit();
    this.spawnRacers();

    this.camera.position.set(0, 15, RACE.startZ - 15);
    this.camera.lookAt(0, 1, RACE.startZ + 10);

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
    this.lastLeaderId = '';
    this.raceStartMs = 0;

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

  private buildLighting() {
    const ambient = new THREE.HemisphereLight(0x8dc7ff, 0x130a04, 1.4);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffd58a, 4.5);
    key.position.set(-12, 24, -20);
    this.scene.add(key);

    const cyan = new THREE.PointLight(0x24bfff, 24, 45, 2);
    cyan.position.set(10, 6, -12);
    this.scene.add(cyan);

    const amber = new THREE.PointLight(0xff8a22, 20, 40, 2);
    amber.position.set(-10, 5, 18);
    this.scene.add(amber);
  }

  private buildBattlecaseCircuit() {
    const floorMaterial = new CANNON.Material('track');
    const marbleMaterial = new CANNON.Material('marble');
    this.world.defaultContactMaterial.friction = 0.23;
    this.world.defaultContactMaterial.restitution = 0.24;
    this.world.addContactMaterial(new CANNON.ContactMaterial(floorMaterial, marbleMaterial, {
      friction: 0.32,
      restitution: 0.22
    }));

    const floorShape = new CANNON.Box(new CANNON.Vec3(RACE.trackWidth / 2, RACE.floorHalfHeight, RACE.trackLength / 2));
    const floorBody = new CANNON.Body({ mass: 0, material: floorMaterial, shape: floorShape });
    floorBody.position.set(0, 0, 0);
    floorBody.quaternion.setFromEuler(RACE.slopeRadians, 0, 0);
    this.world.addBody(floorBody);

    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(RACE.trackWidth, RACE.floorHalfHeight * 2, RACE.trackLength),
      new THREE.MeshStandardMaterial({ color: 0x0b1521, metalness: 0.78, roughness: 0.34 })
    );
    floorMesh.rotation.x = RACE.slopeRadians;
    this.scene.add(floorMesh);

    const laneMaterial = new THREE.MeshBasicMaterial({ color: 0x1ec8ff, transparent: true, opacity: 0.34 });
    for (let x = -6; x <= 6; x += 3) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.018, RACE.trackLength - 4), laneMaterial);
      line.position.set(x, 0.56, 0);
      line.rotation.x = RACE.slopeRadians;
      this.scene.add(line);
    }

    this.addRail(-RACE.trackWidth / 2 - 0.25, floorMaterial);
    this.addRail(RACE.trackWidth / 2 + 0.25, floorMaterial);

    const obstacles = [
      { x: -4.2, z: -19, w: 3.6, d: 1.25 },
      { x: 3.9, z: -8, w: 4.2, d: 1.25 },
      { x: -1.2, z: 4, w: 4.8, d: 1.05 },
      { x: 4.5, z: 16, w: 3.4, d: 1.4 },
      { x: -4.4, z: 27, w: 3.6, d: 1.25 }
    ];

    obstacles.forEach((o, i) => this.addObstacle(o.x, o.z, o.w, o.d, i));
    this.addFinishGate();
    this.addBattlecaseDecor();

    // Keep the material alive for racer bodies.
    (this.world as CANNON.World & { __pgpMarbleMaterial?: CANNON.Material }).__pgpMarbleMaterial = marbleMaterial;
  }

  private addRail(x: number, material: CANNON.Material) {
    const shape = new CANNON.Box(new CANNON.Vec3(0.32, 0.85, RACE.trackLength / 2));
    const body = new CANNON.Body({ mass: 0, material, shape });
    body.position.set(x, 0.78, 0);
    body.quaternion.setFromEuler(RACE.slopeRadians, 0, 0);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 1.7, RACE.trackLength),
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
        metalness: 0.85,
        roughness: 0.31,
        emissive: index % 2 ? 0x042a40 : 0x3a1800,
        emissiveIntensity: 0.8
      })
    );
    mesh.position.copy(body.position as unknown as THREE.Vector3);
    this.scene.add(mesh);
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
    [-28, -3, 23].forEach((z, idx) => {
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
    for (let i = 0; i < 500; i += 1) {
      points.push(this.random.range(-90, 90), this.random.range(8, 70), this.random.range(-100, 100));
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
    this.collisionCalloutAt = now + 4300;
    this.broadcast('collision', `${racer.def.name}: ${this.pickLine('collision')}`);
  }

  private launchRace(now: number) {
    this.state = 'running';
    this.raceStartMs = now;
    this.racers.forEach((racer, index) => {
      racer.body.wakeUp();
      const lateral = this.random.range(-0.45, 0.45);
      const forward = this.random.range(0.9, 2.4) + index * 0.002;
      racer.body.velocity.set(lateral, 0, forward);
      racer.body.angularVelocity.set(
        this.random.range(-2.2, 2.2),
        this.random.range(-1.2, 1.2),
        this.random.range(-2.2, 2.2)
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

    if (this.state === 'running') {
      this.world.step(RACE.fixedTimeStep, dt, RACE.maxSubSteps);
      this.checkFinishers(now);
      this.checkLeader();
    }

    this.syncVisuals();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);

    if (now - this.lastSnapshotMs > 120) this.emitSnapshot(now);
  };

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

    if (this.finished.length === this.racers.length) {
      this.state = 'finished';
      this.racers.forEach((racer) => racer.body.sleep());
    }
  }

  private checkLeader() {
    const standings = this.calculateStandings();
    const leader = standings[0];
    if (!leader || leader.id === this.lastLeaderId) return;
    const previous = this.lastLeaderId;
    this.lastLeaderId = leader.id;
    if (previous) this.broadcast('lead-change', leader.name);
  }

  private updateCamera() {
    const standings = this.calculateStandings();
    const leader = standings[0];
    const targetRacer = leader ? this.racers.find((r) => r.def.id === leader.id) : this.racers[0];
    if (!targetRacer) return;

    const z = targetRacer.body.position.z;
    const y = Math.max(8, targetRacer.body.position.y + 11);
    const desired = new THREE.Vector3(0, y, z - 17);
    this.camera.position.lerp(desired, 0.045);
    const look = new THREE.Vector3(targetRacer.body.position.x * 0.25, targetRacer.body.position.y, z + 8);
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

    this.onSnapshot?.({
      state: this.state,
      elapsed,
      countdown,
      leader: standings[0],
      standings,
      seed: this.seed
    });
  }

  private broadcast(type: BroadcastEventType, detail?: string) {
    if (!this.onBroadcast) return;
    const raw = detail && type === 'collision'
      ? `${this.pickLine(type)} — ${detail.split(':')[0]}`
      : detail
        ? `${this.pickLine(type)} — ${detail}`
        : this.pickLine(type);
    const colon = raw.indexOf(':');
    const explicitSpeaker = colon > 0 ? raw.slice(0, colon) : '';
    const speaker = explicitSpeaker === 'THREVE' || explicitSpeaker === "SIX'T" || explicitSpeaker === 'NOINE'
      ? explicitSpeaker
      : (['THREVE', "SIX'T", 'NOINE'] as const)[Math.floor(this.random.next() * 3)];
    const text = colon > 0 && explicitSpeaker === speaker ? raw.slice(colon + 1).trim() : raw;

    this.onBroadcast({ speaker, text, type, time: performance.now() });
  }

  private pickLine(type: BroadcastEventType) {
    const lines = BRBC_LINES[type];
    return lines[Math.floor(this.random.next() * lines.length)];
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
