import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  BRBC_EXCHANGES,
  RACERS,
  RACE,
  SECTORS,
  type BrbcSpeaker,
  type BroadcastEventType,
  type RacerDefinition
} from './config';
import {
  BroadcastDirector,
  type BattleInfo,
  type DirectorDecision,
  type DirectorShot
} from './BroadcastDirector';
import { ReplayBuffer, type ReplayFrame, type ReplayPose } from './ReplayBuffer';

export type RaceState = 'ready' | 'grid' | 'countdown' | 'running' | 'finished';
export type CameraMode = 'auto' | 'chase' | 'wide' | 'finish';

type RacerRuntime = {
  def: RacerDefinition;
  body: CANNON.Body;
  group: THREE.Group;
  label: THREE.Sprite;
  finishTime?: number;
  finishPlace?: number;
};

type RotorRuntime = {
  body: CANNON.Body;
  mesh: THREE.Mesh;
  angle: number;
  speed: number;
};

type QueuedBroadcast = BroadcastMessage & {
  dueAt: number;
};

export type Standing = {
  place: number;
  id: string;
  code: string;
  name: string;
  team: string;
  accent: string;
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
  overtakes: number;
  collisionEvents: number;
  directorCuts: number;
  broadcastLines: number;
  replayFrames: number;
  splitLeft: number;
  splitRight: number;
  finishers: number;
};

export type RaceSnapshot = {
  state: RaceState;
  elapsed: number;
  countdown: number;
  gridProgress: number;
  leader?: Standing;
  standings: Standing[];
  seed: number;
  sector: string;
  cameraMode: CameraMode;
  cameraShot: DirectorShot;
  battle?: BattleInfo;
  replayActive: boolean;
  replayAvailable: boolean;
  receipt?: RaceReceipt;
};

export type BroadcastMessage = {
  speaker: BrbcSpeaker;
  text: string;
  type: BroadcastEventType;
  time: number;
  sequenceId: number;
  lineIndex: number;
  lineCount: number;
};

type RaceEngineOptions = {
  seed?: number;
  onSnapshot?: (snapshot: RaceSnapshot) => void;
  onBroadcast?: (message: BroadcastMessage) => void;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const colorCss = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

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
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  private renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  private world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  private racers: RacerRuntime[] = [];
  private rotors: RotorRuntime[] = [];
  private finished: RacerRuntime[] = [];
  private splitChoices = new Map<string, 'LEFT' | 'RIGHT'>();
  private director = new BroadcastDirector();
  private directorDecision: DirectorDecision = { shot: 'grid-wide', focusIds: [], events: [] };
  private replayBuffer = new ReplayBuffer(RACE.replayWindowSeconds * 1000, 50);
  private replayFrames: ReplayFrame[] = [];
  private replayActive = false;
  private replayStartMs = 0;
  private state: RaceState = 'ready';
  private cameraMode: CameraMode = 'auto';
  private actualCameraShot: DirectorShot = 'grid-wide';
  private random: SeededRandom;
  private seed: number;
  private gridStartMs = 0;
  private raceStartMs = 0;
  private raceEndMs = 0;
  private countdownStartMs = 0;
  private winnerCrossMs = 0;
  private lastFrameMs = performance.now();
  private lastSnapshotMs = 0;
  private lastDirectorMs = 0;
  private lastLeaderId = '';
  private lastSectorId = '';
  private collisionCalloutAt = 0;
  private leadChanges = 0;
  private overtakeEvents = 0;
  private collisionEvents = 0;
  private directorCuts = 0;
  private broadcastLines = 0;
  private photoFinishAnnounced = false;
  private splitAnnounced = false;
  private receipt?: RaceReceipt;
  private animationFrame = 0;
  private resizeObserver: ResizeObserver;
  private broadcastQueue: QueuedBroadcast[] = [];
  private broadcastSequence = 0;
  private lastQueuedDue = 0;

  constructor(
    private container: HTMLElement,
    private options: RaceEngineOptions = {}
  ) {
    this.seed = options.seed ?? Math.floor(Date.now() % 1_000_000_000);
    this.random = new SeededRandom(this.seed);

    this.scene.background = new THREE.Color(0x03060d);
    this.scene.fog = new THREE.FogExp2(0x03060d, 0.0105);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    container.appendChild(this.renderer.domElement);

    this.world.allowSleep = true;
    this.world.solver.iterations = 14;
    this.buildLighting();
    this.buildCircuit();
    this.spawnRacers();

    this.camera.position.set(0, 30, RACE.startZ - 10);
    this.camera.lookAt(0, 1, RACE.startZ + 14);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
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
    const now = performance.now();
    this.state = 'grid';
    this.gridStartMs = now;
    this.broadcastQueue = [];
    this.lastQueuedDue = now;
    this.enqueueConversation('opening', undefined, true);
    this.emitSnapshot(now);
  }

  resetRace(seed = this.seed) {
    this.seed = seed;
    this.random = new SeededRandom(seed);
    this.state = 'ready';
    this.finished = [];
    this.splitChoices.clear();
    this.director.reset();
    this.directorDecision = { shot: 'grid-wide', focusIds: [], events: [] };
    this.replayBuffer.reset();
    this.replayFrames = [];
    this.replayActive = false;
    this.gridStartMs = 0;
    this.raceStartMs = 0;
    this.raceEndMs = 0;
    this.winnerCrossMs = 0;
    this.lastLeaderId = '';
    this.lastSectorId = '';
    this.leadChanges = 0;
    this.overtakeEvents = 0;
    this.collisionEvents = 0;
    this.directorCuts = 0;
    this.broadcastLines = 0;
    this.photoFinishAnnounced = false;
    this.splitAnnounced = false;
    this.receipt = undefined;
    this.broadcastQueue = [];
    this.lastQueuedDue = 0;
    this.actualCameraShot = 'grid-wide';

    this.racers.forEach((racer, index) => {
      const { x, z } = this.startPosition(index);
      racer.body.position.set(x, this.trackHeightAt(z) + 1.5, z);
      racer.body.velocity.set(0, 0, 0);
      racer.body.angularVelocity.set(0, 0, 0);
      racer.body.quaternion.set(0, 0, 0, 1);
      racer.finishTime = undefined;
      racer.finishPlace = undefined;
      racer.body.sleep();
    });

    this.syncVisuals();
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
    this.cameraMode = modes[(modes.indexOf(this.cameraMode) + 1) % modes.length];
    this.emitSnapshot(performance.now());
    return this.cameraMode;
  }

  playFinishReplay() {
    if (this.state !== 'finished' || this.replayFrames.length < 2 || this.replayActive) return false;
    this.replayActive = true;
    this.replayStartMs = performance.now();
    this.enqueueConversation('replay', undefined, true);
    this.emitSnapshot(this.replayStartMs);
    return true;
  }

  private startPosition(index: number) {
    const lane = index % 6;
    const row = Math.floor(index / 6);
    return { x: -7.2 + lane * 2.88 + (row ? 0.7 : 0), z: RACE.startZ - row * 2.1 };
  }

  private buildLighting() {
    this.scene.add(new THREE.HemisphereLight(0x8dc7ff, 0x130a04, 1.55));
    const key = new THREE.DirectionalLight(0xffd58a, 4.8);
    key.position.set(-12, 28, -25);
    this.scene.add(key);

    for (const [color, intensity, x, z] of [
      [0x24bfff, 28, 10, -15],
      [0xff8a22, 24, -10, 25],
      [0xb253ff, 22, 0, 20]
    ] as const) {
      const light = new THREE.PointLight(color, intensity, 50, 2);
      light.position.set(x, 7, z);
      this.scene.add(light);
    }
  }

  private buildCircuit() {
    const floorMaterial = new CANNON.Material('track');
    const marbleMaterial = new CANNON.Material('marble');
    this.world.defaultContactMaterial.friction = 0.23;
    this.world.defaultContactMaterial.restitution = 0.24;
    this.world.addContactMaterial(new CANNON.ContactMaterial(floorMaterial, marbleMaterial, {
      friction: 0.31,
      restitution: 0.24
    }));

    const floorBody = new CANNON.Body({
      mass: 0,
      material: floorMaterial,
      shape: new CANNON.Box(new CANNON.Vec3(RACE.trackWidth / 2, RACE.floorHalfHeight, RACE.trackLength / 2))
    });
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

    [
      [-5.2, -27, 5.1, 2.2],
      [5.0, -21, 5.4, 2.2],
      [-4.4, -15.5, 4.6, 1.8]
    ].forEach(([x, z, width, depth], index) => this.addObstacle(x, z, width, depth, index));

    this.addRotor(-7, -0.7, 7.4, 1.25);
    this.addBumper(-5.7, -1.2, 1.15, 0x164d63);
    this.addBumper(5.8, 2.0, 1.15, 0x164d63);
    this.addRotor(5.2, 0.8, 7.0, -1.05);

    this.addSplitDivider();
    this.addBumper(-5.8, 27.5, 1.0, 0x6b2c85);
    this.addBumper(5.8, 25.0, 1.0, 0x6b2c85);
    this.addObstacle(-5.4, 36.5, 3.7, 1.3, 4);
    this.addObstacle(5.2, 42.0, 3.7, 1.3, 5);

    this.addSectorMarkers();
    this.addFinishGate();
    this.addDecor();
    (this.world as CANNON.World & { __pgpMarbleMaterial?: CANNON.Material }).__pgpMarbleMaterial = marbleMaterial;
  }

  private addMotherboardTraces() {
    const cyan = new THREE.MeshBasicMaterial({ color: 0x1ec8ff, transparent: true, opacity: 0.34 });
    const gold = new THREE.MeshBasicMaterial({ color: 0xe0a94c, transparent: true, opacity: 0.24 });
    for (let x = -6; x <= 6; x += 3) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, RACE.trackLength - 4), cyan);
      line.position.set(x, 0.57, 0);
      line.rotation.x = RACE.slopeRadians;
      this.scene.add(line);
    }
    [-38, -31, 31, 47].forEach((z) => {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(RACE.trackWidth - 2, 0.025, 0.16), gold);
      bridge.position.set(0, this.trackHeightAt(z) + 0.05, z);
      this.scene.add(bridge);
    });
  }

  private addRail(x: number, material: CANNON.Material) {
    const body = new CANNON.Body({
      mass: 0,
      material,
      shape: new CANNON.Box(new CANNON.Vec3(0.32, 0.9, RACE.trackLength / 2))
    });
    body.position.set(x, 0.8, 0);
    body.quaternion.setFromEuler(RACE.slopeRadians, 0, 0);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 1.8, RACE.trackLength),
      new THREE.MeshStandardMaterial({
        color: 0x172635,
        metalness: 0.9,
        roughness: 0.25,
        emissive: 0x05293d,
        emissiveIntensity: 0.7
      })
    );
    mesh.position.set(body.position.x, body.position.y, body.position.z);
    mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    this.scene.add(mesh);
  }

  private addObstacle(x: number, z: number, width: number, depth: number, index: number) {
    const y = this.trackHeightAt(z) + 1.18;
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(width / 2, 1.1, depth / 2))
    });
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
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
  }

  private addBumper(x: number, z: number, radius: number, color: number) {
    const y = this.trackHeightAt(z) + radius;
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Sphere(radius) });
    body.position.set(x, y, z);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 18),
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.82,
        roughness: 0.24,
        emissive: color,
        emissiveIntensity: 0.28
      })
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
      new THREE.MeshStandardMaterial({
        color: 0x1c526c,
        metalness: 0.92,
        roughness: 0.2,
        emissive: 0x0c6b91,
        emissiveIntensity: 0.8
      })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.rotors.push({ body, mesh, angle: this.random.range(0, Math.PI * 2), speed });
  }

  private addSplitDivider() {
    const z = 20;
    const width = 1.45;
    const halfDepth = 8.4;
    const y = this.trackHeightAt(z) + 0.95;
    const body = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(width / 2, 0.9, halfDepth))
    });
    body.position.set(0, y, z);
    this.world.addBody(body);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 1.8, halfDepth * 2),
      new THREE.MeshStandardMaterial({
        color: 0x331f50,
        metalness: 0.82,
        roughness: 0.25,
        emissive: 0x6c2bd9,
        emissiveIntensity: 0.62
      })
    );
    mesh.position.set(0, y, z);
    this.scene.add(mesh);

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(1.45, 3.2, 4),
      new THREE.MeshStandardMaterial({
        color: 0xd8ad58,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0x5a3200,
        emissiveIntensity: 0.65
      })
    );
    crown.position.set(0, y + 2.4, z - halfDepth + 0.7);
    crown.rotation.y = Math.PI / 4;
    this.scene.add(crown);
  }

  private addSectorMarkers() {
    const material = new THREE.MeshBasicMaterial({ color: 0x78dcff, transparent: true, opacity: 0.24 });
    SECTORS.slice(1).forEach((sector) => {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(RACE.trackWidth - 1.2, 0.035, 0.26),
        material
      );
      marker.position.set(0, this.trackHeightAt(sector.startZ) + 0.07, sector.startZ);
      this.scene.add(marker);
    });
  }

  private addFinishGate() {
    const z = RACE.finishZ;
    const y = this.trackHeightAt(z);
    const gold = new THREE.MeshStandardMaterial({
      color: 0xc89437,
      metalness: 0.88,
      roughness: 0.22,
      emissive: 0x472400,
      emissiveIntensity: 0.8
    });
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

  private addDecor() {
    const fanMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b2e40,
      metalness: 0.9,
      roughness: 0.24,
      emissive: 0x053854,
      emissiveIntensity: 0.9
    });

    [-39, -5, 19, 40].forEach((z, index) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.28, 10, 40), fanMaterial);
      ring.position.set(index % 2 ? -12.5 : 12.5, this.trackHeightAt(z) + 3.8, z);
      ring.rotation.y = Math.PI / 2;
      this.scene.add(ring);

      for (let blade = 0; blade < 5; blade += 1) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.0, 0.12), fanMaterial);
        mesh.position.copy(ring.position);
        mesh.rotation.z = (blade / 5) * Math.PI * 2;
        mesh.rotation.y = Math.PI / 2;
        this.scene.add(mesh);
      }
    });

    const stars = new THREE.BufferGeometry();
    const points: number[] = [];
    for (let index = 0; index < 650; index += 1) {
      points.push(
        this.random.range(-90, 90),
        this.random.range(8, 70),
        this.random.range(-120, 120)
      );
    }
    stars.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    this.scene.add(new THREE.Points(
      stars,
      new THREE.PointsMaterial({ color: 0x7ca9d8, size: 0.13 })
    ));
  }

  private spawnRacers() {
    const marbleMaterial = (this.world as CANNON.World & {
      __pgpMarbleMaterial?: CANNON.Material;
    }).__pgpMarbleMaterial;

    RACERS.forEach((def, index) => {
      const { x, z } = this.startPosition(index);
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
      const isMirror = def.id === 'mirror';
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(RACE.marbleRadius, 30, 24),
        new THREE.MeshStandardMaterial({
          color: def.color,
          metalness: isMirror ? 0.96 : 0.58,
          roughness: isMirror ? 0.08 : 0.24,
          emissive: def.accent,
          emissiveIntensity: def.id === 'dreamer' ? 0.28 : 0.16
        })
      );
      group.add(sphere);

      const equator = new THREE.Mesh(
        new THREE.TorusGeometry(RACE.marbleRadius * 1.015, 0.035, 8, 32),
        new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.92 })
      );
      equator.rotation.x = Math.PI / 2;
      group.add(equator);

      const cage = new THREE.Mesh(
        new THREE.IcosahedronGeometry(RACE.marbleRadius * 1.022, 2),
        new THREE.MeshBasicMaterial({
          color: def.accent,
          wireframe: true,
          transparent: true,
          opacity: def.id === 'reality-ledger' ? 0.34 : 0.14
        })
      );
      group.add(cage);

      const marker = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.38, 6),
        new THREE.MeshBasicMaterial({ color: def.accent })
      );
      marker.position.y = RACE.marbleRadius * 0.98;
      group.add(marker);

      const label = this.makeRacerLabel(def);
      this.scene.add(group);
      this.scene.add(label);

      const runtime: RacerRuntime = { def, body, group, label };
      body.addEventListener('collide', () => this.handleCollision(runtime));
      this.racers.push(runtime);
    });
  }

  private makeRacerLabel(def: RacerDefinition) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = 'rgba(2, 8, 15, 0.78)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = colorCss(def.accent);
      context.lineWidth = 4;
      context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      context.fillStyle = colorCss(def.accent);
      context.font = '900 30px system-ui, sans-serif';
      context.textAlign = 'left';
      context.fillText(def.code, 18, 49);
      context.fillStyle = '#f5f1e8';
      context.font = '800 20px system-ui, sans-serif';
      context.fillText(def.name.toUpperCase().slice(0, 14), 74, 47);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: true
    }));
    sprite.scale.set(3.4, 1.05, 1);
    return sprite;
  }

  private handleCollision(racer: RacerRuntime) {
    if (this.state !== 'running') return;
    const now = performance.now();
    if (now < this.collisionCalloutAt) return;
    if (racer.body.velocity.length() < 4.5) return;
    this.collisionEvents += 1;
    this.collisionCalloutAt = now + 3800;
    this.enqueueConversation('collision', racer.def.name);
  }

  private beginCountdown(now: number) {
    this.state = 'countdown';
    this.countdownStartMs = now;
    this.emitSnapshot(now);
  }

  private launchRace(now: number) {
    this.state = 'running';
    this.raceStartMs = now;
    this.raceEndMs = 0;
    this.racers.forEach((racer, index) => {
      racer.body.wakeUp();
      racer.body.velocity.set(
        this.random.range(-0.5, 0.5),
        0,
        this.random.range(1.1, 2.7) + index * 0.002
      );
      racer.body.angularVelocity.set(
        this.random.range(-2.4, 2.4),
        this.random.range(-1.4, 1.4),
        this.random.range(-2.4, 2.4)
      );
    });
    this.enqueueConversation('start', undefined, true);
  }

  private animate = (now: number) => {
    this.animationFrame = requestAnimationFrame(this.animate);
    const dt = Math.min((now - this.lastFrameMs) / 1000, 0.1);
    this.lastFrameMs = now;

    if (this.state === 'grid') {
      const elapsed = (now - this.gridStartMs) / 1000;
      if (elapsed >= RACE.gridPresentationSeconds) this.beginCountdown(now);
    }

    if (this.state === 'countdown') {
      const elapsed = (now - this.countdownStartMs) / 1000;
      if (elapsed >= RACE.countdownSeconds) this.launchRace(now);
    }

    this.updateTrackMechanics(dt);

    if (this.state === 'running') {
      this.world.step(RACE.fixedTimeStep, dt, RACE.maxSubSteps);
      this.checkFinishers(now);
      this.captureReplay(now);
      this.checkLeader();
      this.checkSector();
      this.checkSplitChoices();

      if (now - this.lastDirectorMs >= 100) {
        this.lastDirectorMs = now;
        this.updateDirector(now);
      }

      if ((now - this.raceStartMs) / 1000 > RACE.raceTimeoutSeconds) {
        this.finalizeRace(now);
      }
    }

    if (this.replayActive) this.updateReplay(now);
    else this.syncVisuals();

    this.processBroadcastQueue(now);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);

    if (now - this.lastSnapshotMs > 120) this.emitSnapshot(now);
  };

  private updateTrackMechanics(dt: number) {
    this.rotors.forEach((rotor) => {
      rotor.angle += rotor.speed * dt;
      rotor.body.quaternion.setFromEuler(0, rotor.angle, 0);
      rotor.mesh.quaternion.set(
        rotor.body.quaternion.x,
        rotor.body.quaternion.y,
        rotor.body.quaternion.z,
        rotor.body.quaternion.w
      );
    });
  }

  private syncVisuals() {
    this.racers.forEach((racer) => {
      racer.group.position.set(racer.body.position.x, racer.body.position.y, racer.body.position.z);
      racer.group.quaternion.set(
        racer.body.quaternion.x,
        racer.body.quaternion.y,
        racer.body.quaternion.z,
        racer.body.quaternion.w
      );
      racer.label.position.set(racer.body.position.x, racer.body.position.y + 1.65, racer.body.position.z);
    });
  }

  private captureReplay(now: number) {
    this.replayBuffer.capture(now, this.racers.map((racer) => ({
      id: racer.def.id,
      x: racer.body.position.x,
      y: racer.body.position.y,
      z: racer.body.position.z,
      qx: racer.body.quaternion.x,
      qy: racer.body.quaternion.y,
      qz: racer.body.quaternion.z,
      qw: racer.body.quaternion.w
    })));

    if (this.winnerCrossMs && now - this.winnerCrossMs <= 2600) {
      this.replayFrames = this.replayBuffer.snapshot(this.winnerCrossMs - 2500);
    }
  }

  private updateReplay(now: number) {
    const rawDuration = this.replayBuffer.duration(this.replayFrames);
    const playbackDuration = rawDuration / RACE.replayPlaybackRate;
    const elapsed = now - this.replayStartMs;
    if (elapsed >= playbackDuration) {
      this.replayActive = false;
      this.syncVisuals();
      this.emitSnapshot(now);
      return;
    }

    const poses = this.replayBuffer.sample(
      this.replayFrames,
      elapsed,
      RACE.replayPlaybackRate
    );
    this.applyReplayPoses(poses);
  }

  private applyReplayPoses(poses: ReplayPose[]) {
    const byId = new Map(poses.map((pose) => [pose.id, pose]));
    this.racers.forEach((racer) => {
      const pose = byId.get(racer.def.id);
      if (!pose) return;
      racer.group.position.set(pose.x, pose.y, pose.z);
      racer.group.quaternion.set(pose.qx, pose.qy, pose.qz, pose.qw);
      racer.label.position.set(pose.x, pose.y + 1.65, pose.z);
    });
  }

  private checkFinishers(now: number) {
    this.racers.forEach((racer) => {
      if (racer.finishPlace || racer.body.position.z < RACE.finishZ) return;
      racer.finishPlace = this.finished.length + 1;
      racer.finishTime = (now - this.raceStartMs) / 1000;
      this.finished.push(racer);

      if (racer.finishPlace === 1) {
        this.winnerCrossMs = now;
        this.replayFrames = this.replayBuffer.snapshot(now - 2500);
        this.enqueueConversation(
          'winner',
          `${racer.def.name} — ${racer.finishTime.toFixed(3)}s`,
          true
        );
      } else if (racer.finishPlace <= 3) {
        this.enqueueConversation('finish', `${racer.def.name} — P${racer.finishPlace}`);
      }
    });

    if (this.finished.length >= 2 && !this.photoFinishAnnounced) {
      const first = this.finished[0].finishTime ?? 0;
      const second = this.finished[1].finishTime ?? 0;
      const gap = second - first;
      if (gap <= RACE.photoFinishThreshold) {
        this.photoFinishAnnounced = true;
        this.enqueueConversation(
          'photo-finish',
          `${this.finished[0].def.name} / ${this.finished[1].def.name} — Δ${gap.toFixed(3)}s`,
          true
        );
      }
    }

    if (this.finished.length === this.racers.length) this.finalizeRace(now);
  }

  private finalizeRace(now = performance.now()) {
    if (this.state === 'finished') return;
    this.state = 'finished';
    this.raceEndMs = now;
    this.racers.forEach((racer) => racer.body.sleep());
    if (this.replayFrames.length < 2) {
      const fromAt = this.winnerCrossMs ? this.winnerCrossMs - 2500 : now - 3500;
      this.replayFrames = this.replayBuffer.snapshot(fromAt);
    }
    this.receipt = this.buildReceipt();
    this.emitSnapshot(now);
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
      overtakes: this.overtakeEvents,
      collisionEvents: this.collisionEvents,
      directorCuts: this.directorCuts,
      broadcastLines: this.broadcastLines,
      replayFrames: this.replayFrames.length,
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
      this.enqueueConversation('lead-change', leader.name);
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
    if (previous) this.enqueueConversation('sector', sector.name);
  }

  private checkSplitChoices() {
    this.racers.forEach((racer) => {
      if (this.splitChoices.has(racer.def.id)) return;
      if (racer.body.position.z < 10.5 || racer.body.position.z > 16) return;
      const choice = racer.body.position.x < 0 ? 'LEFT' : 'RIGHT';
      this.splitChoices.set(racer.def.id, choice);
      if (!this.splitAnnounced) {
        this.splitAnnounced = true;
        this.enqueueConversation('split', `${racer.def.name} commits ${choice}`);
      }
    });
  }

  private updateDirector(now: number) {
    const standings = this.calculateStandings();
    const directorRacers = standings.map((standing) => {
      const runtime = this.racers.find((racer) => racer.def.id === standing.id);
      return {
        id: standing.id,
        name: standing.name,
        place: standing.place,
        z: runtime?.body.position.z ?? RACE.startZ,
        progress: standing.progress,
        finished: standing.finished
      };
    });

    const leaderRuntime = standings[0]
      ? this.racers.find((racer) => racer.def.id === standings[0].id)
      : undefined;
    const sectorId = this.sectorAt(leaderRuntime?.body.position.z ?? RACE.startZ).id;
    this.directorDecision = this.director.update(directorRacers, sectorId, now);

    this.directorDecision.events.forEach((event) => {
      if (event.type === 'overtake') this.overtakeEvents += 1;
      this.enqueueConversation(event.type, event.detail, event.type === 'final-ten');
    });
  }

  private enqueueConversation(type: BroadcastEventType, detail?: string, urgent = false) {
    const exchanges = BRBC_EXCHANGES[type];
    if (!exchanges.length || !this.options.onBroadcast) return;
    if (!urgent && this.broadcastQueue.length > 10) return;

    const now = performance.now();
    if (urgent) {
      this.broadcastQueue = [];
      this.lastQueuedDue = now;
    }

    const exchange = exchanges[Math.floor(this.random.next() * exchanges.length)];
    const sequenceId = ++this.broadcastSequence;
    const startAt = urgent ? now : Math.max(now + 80, this.lastQueuedDue + 120);
    const spacing = type === 'final-ten' ? 650 : type === 'opening' ? 780 : 860;

    exchange.forEach((beat, lineIndex) => {
      const hasDetailToken = beat.text.includes('{detail}');
      let text = beat.text.replace('{detail}', detail ?? '');
      if (detail && !hasDetailToken && lineIndex === 0) text = `${text} — ${detail}`;
      this.broadcastQueue.push({
        speaker: beat.speaker,
        text,
        type,
        time: 0,
        sequenceId,
        lineIndex,
        lineCount: exchange.length,
        dueAt: startAt + lineIndex * spacing
      });
    });
    this.lastQueuedDue = startAt + (exchange.length - 1) * spacing;
  }

  private processBroadcastQueue(now: number) {
    const next = this.broadcastQueue[0];
    if (!next || next.dueAt > now) return;
    this.broadcastQueue.shift();
    this.broadcastLines += 1;
    this.options.onBroadcast?.({
      speaker: next.speaker,
      text: next.text,
      type: next.type,
      time: now,
      sequenceId: next.sequenceId,
      lineIndex: next.lineIndex,
      lineCount: next.lineCount
    });
  }

  private resolveCameraShot(): DirectorShot {
    if (this.replayActive) return 'replay-finish';
    if (this.state === 'ready' || this.state === 'grid' || this.state === 'countdown') return 'grid-wide';
    if (this.state === 'finished') return 'finish-line';
    if (this.cameraMode === 'chase') return 'leader-chase';
    if (this.cameraMode === 'wide') return 'wide-overview';
    if (this.cameraMode === 'finish') return 'finish-line';
    return this.directorDecision.shot;
  }

  private updateCamera() {
    const shot = this.resolveCameraShot();
    if (shot !== this.actualCameraShot) {
      if (this.state === 'running') this.directorCuts += 1;
      this.actualCameraShot = shot;
    }

    const standings = this.calculateStandings();
    const leader = standings[0];
    const leaderRuntime = leader
      ? this.racers.find((racer) => racer.def.id === leader.id)
      : this.racers[0];
    if (!leaderRuntime) return;

    if (shot === 'grid-wide') {
      const desired = new THREE.Vector3(0, 30, RACE.startZ - 9);
      this.camera.position.lerp(desired, 0.045);
      this.camera.lookAt(0, this.trackHeightAt(RACE.startZ + 8), RACE.startZ + 16);
      return;
    }

    if (shot === 'wide-overview') {
      const z = leaderRuntime.body.position.z;
      const desired = new THREE.Vector3(0, 34, z - 5);
      this.camera.position.lerp(desired, 0.035);
      this.camera.lookAt(0, this.trackHeightAt(z) + 0.5, z + 10);
      return;
    }

    if (shot === 'battle-two-shot') {
      const focus = this.directorDecision.focusIds
        .map((id) => this.racers.find((racer) => racer.def.id === id))
        .filter((racer): racer is RacerRuntime => Boolean(racer));
      if (focus.length >= 2) {
        const a = focus[0].body.position;
        const b = focus[1].body.position;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const midZ = (a.z + b.z) / 2;
        const side = midX >= 0 ? -1 : 1;
        const desired = new THREE.Vector3(midX + side * 10.5, midY + 7.5, midZ - 3.5);
        this.camera.position.lerp(desired, 0.065);
        this.camera.lookAt(midX, midY + 0.2, midZ + 2.5);
        return;
      }
    }

    if (shot === 'split-overhead') {
      const desired = new THREE.Vector3(0, 31, 18);
      this.camera.position.lerp(desired, 0.05);
      this.camera.lookAt(0, this.trackHeightAt(22), 22);
      return;
    }

    if (shot === 'finish-line' || shot === 'replay-finish') {
      const desired = new THREE.Vector3(13.5, 9.2, RACE.finishZ - 6);
      this.camera.position.lerp(desired, shot === 'replay-finish' ? 0.09 : 0.065);
      this.camera.lookAt(0, this.trackHeightAt(RACE.finishZ) + 0.8, RACE.finishZ + 1.5);
      return;
    }

    const z = leaderRuntime.body.position.z;
    const y = Math.max(8, leaderRuntime.body.position.y + 11);
    const desired = new THREE.Vector3(leaderRuntime.body.position.x * 0.22, y, z - 17);
    this.camera.position.lerp(desired, 0.05);
    this.camera.lookAt(
      leaderRuntime.body.position.x * 0.32,
      leaderRuntime.body.position.y,
      z + 8
    );
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
      code: racer.def.code,
      name: racer.def.name,
      team: racer.def.team,
      accent: colorCss(racer.def.accent),
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
    const gridProgress = this.state === 'grid'
      ? clamp01((now - this.gridStartMs) / (RACE.gridPresentationSeconds * 1000))
      : 0;
    const elapsedNow = this.raceEndMs || now;
    const elapsed = this.raceStartMs
      ? Math.max(0, (elapsedNow - this.raceStartMs) / 1000)
      : 0;
    const leaderRuntime = standings[0]
      ? this.racers.find((racer) => racer.def.id === standings[0].id)
      : undefined;
    const sector = this.sectorAt(leaderRuntime?.body.position.z ?? RACE.startZ).name;

    this.options.onSnapshot?.({
      state: this.state,
      elapsed,
      countdown,
      gridProgress,
      leader: standings[0],
      standings,
      seed: this.seed,
      sector,
      cameraMode: this.cameraMode,
      cameraShot: this.actualCameraShot,
      battle: this.directorDecision.battle,
      replayActive: this.replayActive,
      replayAvailable: this.replayFrames.length >= 2,
      receipt: this.receipt
    });
  }

  private sectorAt(z: number) {
    return SECTORS.find((sector) => z >= sector.startZ && z < sector.endZ)
      ?? SECTORS[SECTORS.length - 1];
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
