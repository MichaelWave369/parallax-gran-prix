import './styles.css';
import { RACERS } from './game/config';
import {
  RaceEngine,
  type BroadcastMessage,
  type RaceReceipt,
  type RaceSnapshot
} from './game/RaceEngine';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

const gridCards = RACERS.map((racer, index) => `
  <div class="grid-racer" style="--racer-accent:${hex(racer.accent)}">
    <span>${String(index + 1).padStart(2, '0')}</span>
    <b>${escapeHtml(racer.code)}</b>
    <em>${escapeHtml(racer.name)}</em>
  </div>
`).join('');

app.innerHTML = `
  <main class="shell">
    <section class="viewport" id="viewport">
      <div class="live-bug"><i></i> BRBC LIVE</div>

      <div class="brand">
        <div class="eyebrow">PARALLAX FIELD THEORY SPORTS · BRBC WORLD FEED</div>
        <h1>PARALLAX <span>GRAN PRIX</span></h1>
        <p>BATTLECASE CIRCUIT · BROADCAST DIRECTOR SLICE</p>
      </div>

      <div class="grid-show" id="grid-show" aria-live="polite">
        <div class="grid-show-kicker">SEASON 1 · ROUND 1</div>
        <div class="grid-show-title">BATTLECASE CIRCUIT</div>
        <div class="grid-show-sub">12 FIELD VESSELS · PHYSICS AUTHORITATIVE</div>
        <div class="grid-roster">${gridCards}</div>
        <div class="grid-show-footer">THREVE · SIX'T · NOINE <span>BRBC</span></div>
      </div>

      <div class="sector-banner" id="sector-banner">BOOT STRAIGHT</div>
      <div class="countdown" id="countdown" aria-live="assertive"></div>
      <div class="replay-bug" id="replay-bug">BRBC FINISH REPLAY · 0.42×</div>

      <div class="hud hud-left">
        <div class="hud-label">RACE CONTROL</div>
        <div class="controls">
          <button id="start">START BROADCAST</button>
          <button id="reset" class="secondary">RESET</button>
        </div>
        <div class="broadcast-controls">
          <button id="camera" class="secondary camera-button">CAMERA · AUTO</button>
          <button id="replay" class="secondary replay-button" disabled>REPLAY FINISH</button>
        </div>
        <label class="seed-label" for="seed">SIMULATION SEED</label>
        <div class="seed-row">
          <input id="seed" type="number" inputmode="numeric" />
          <button id="apply-seed" class="secondary compact">SET</button>
        </div>
        <div class="meta-grid">
          <span>STATE</span><strong id="state">READY</strong>
          <span>TIME</span><strong id="time">0.00</strong>
          <span>LEADER</span><strong id="leader">—</strong>
          <span>SECTOR</span><strong id="sector">BOOT STRAIGHT</strong>
          <span>DIRECTOR</span><strong id="director">GRID WIDE</strong>
          <span>BATTLE</span><strong id="battle">—</strong>
        </div>
        <div class="course-key">
          <span>GPU CANYON</span>
          <span>COOLING GAUNTLET</span>
          <span>PARALLAX SPLIT</span>
          <span>MOTHERBOARD SPRINT</span>
        </div>
      </div>

      <div class="hud hud-right">
        <div class="hud-label">LIVE TIMING TOWER</div>
        <ol class="standings" id="standings"></ol>
      </div>

      <div class="battle-card" id="battle-card">
        <span>DIRECTOR BATTLE</span>
        <b id="battle-pair">—</b>
        <em id="battle-gap">—</em>
      </div>

      <aside class="receipt" id="receipt" aria-live="polite"></aside>

      <div class="broadcast">
        <div class="brbc-mark">
          <b>BRBC</b>
          <span>BRITISH ROBOT<br>BROADCASTING CORPORATION</span>
          <div class="announcer-lamps">
            <i>3</i><i>6</i><i>9</i>
          </div>
        </div>
        <div class="broadcast-stack" id="broadcast-stack">
          <div class="broadcast-row current" data-speaker="NOINE">
            <span>NOINE</span><p>Quite.</p>
          </div>
        </div>
      </div>

      <div class="footer-tag">PICK YOUR VESSEL. ENTER THE FIELD. <i>◇</i> REALITY TAKES IT FROM THERE.</div>
    </section>
  </main>
`;

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const startButton = document.querySelector<HTMLButtonElement>('#start')!;
const resetButton = document.querySelector<HTMLButtonElement>('#reset')!;
const cameraButton = document.querySelector<HTMLButtonElement>('#camera')!;
const replayButton = document.querySelector<HTMLButtonElement>('#replay')!;
const applySeedButton = document.querySelector<HTMLButtonElement>('#apply-seed')!;
const seedInput = document.querySelector<HTMLInputElement>('#seed')!;
const stateEl = document.querySelector<HTMLElement>('#state')!;
const timeEl = document.querySelector<HTMLElement>('#time')!;
const leaderEl = document.querySelector<HTMLElement>('#leader')!;
const sectorEl = document.querySelector<HTMLElement>('#sector')!;
const directorEl = document.querySelector<HTMLElement>('#director')!;
const battleEl = document.querySelector<HTMLElement>('#battle')!;
const sectorBannerEl = document.querySelector<HTMLElement>('#sector-banner')!;
const countdownEl = document.querySelector<HTMLElement>('#countdown')!;
const standingsEl = document.querySelector<HTMLOListElement>('#standings')!;
const receiptEl = document.querySelector<HTMLElement>('#receipt')!;
const gridShowEl = document.querySelector<HTMLElement>('#grid-show')!;
const replayBugEl = document.querySelector<HTMLElement>('#replay-bug')!;
const battleCardEl = document.querySelector<HTMLElement>('#battle-card')!;
const battlePairEl = document.querySelector<HTMLElement>('#battle-pair')!;
const battleGapEl = document.querySelector<HTMLElement>('#battle-gap')!;
const broadcastStackEl = document.querySelector<HTMLElement>('#broadcast-stack')!;

const query = new URLSearchParams(window.location.search);
const querySeed = Number(query.get('seed'));
const initialSeed = Number.isFinite(querySeed) && querySeed !== 0
  ? Math.abs(Math.trunc(querySeed))
  : Math.floor(Date.now() % 1_000_000_000);

seedInput.value = String(initialSeed);
let broadcastHistory: BroadcastMessage[] = [];

const engine = new RaceEngine(viewport, {
  seed: initialSeed,
  onSnapshot: renderSnapshot,
  onBroadcast: renderBroadcast
});

startButton.addEventListener('click', () => {
  broadcastHistory = [];
  renderBroadcastHistory();
  engine.startRace();
});

resetButton.addEventListener('click', () => {
  broadcastHistory = [];
  renderBroadcastHistory();
  engine.resetRace();
});

cameraButton.addEventListener('click', () => {
  const mode = engine.cycleCameraMode();
  cameraButton.textContent = `CAMERA · ${mode.toUpperCase()}`;
});

replayButton.addEventListener('click', () => engine.playFinishReplay());
applySeedButton.addEventListener('click', applySeed);
seedInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') applySeed();
});

function applySeed() {
  const value = Math.abs(Math.trunc(Number(seedInput.value))) || 369;
  seedInput.value = String(value);
  broadcastHistory = [];
  renderBroadcastHistory();
  engine.setSeed(value);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('seed', String(value));
  history.replaceState({}, '', nextUrl);
}

function renderSnapshot(snapshot: RaceSnapshot) {
  stateEl.textContent = snapshot.replayActive ? 'REPLAY' : snapshot.state.toUpperCase();
  timeEl.textContent = snapshot.elapsed.toFixed(2);
  leaderEl.textContent = snapshot.leader?.name ?? '—';
  sectorEl.textContent = snapshot.sector;
  directorEl.textContent = shotLabel(snapshot.cameraShot);
  battleEl.textContent = snapshot.battle
    ? `${snapshot.battle.frontName} / ${snapshot.battle.backName}`
    : '—';
  seedInput.value = String(snapshot.seed);
  cameraButton.textContent = `CAMERA · ${snapshot.cameraMode.toUpperCase()}`;

  gridShowEl.classList.toggle('visible', snapshot.state === 'grid');
  gridShowEl.style.setProperty('--grid-progress', String(snapshot.gridProgress));
  replayBugEl.classList.toggle('visible', snapshot.replayActive);

  if (sectorBannerEl.textContent !== snapshot.sector) {
    sectorBannerEl.textContent = snapshot.sector;
    sectorBannerEl.classList.remove('flash');
    requestAnimationFrame(() => sectorBannerEl.classList.add('flash'));
  }

  countdownEl.textContent = snapshot.countdown > 0 ? String(snapshot.countdown) : '';
  countdownEl.classList.toggle('visible', snapshot.countdown > 0);

  const raceBusy = snapshot.state === 'grid'
    || snapshot.state === 'countdown'
    || snapshot.state === 'running'
    || snapshot.replayActive;
  startButton.textContent = snapshot.state === 'finished' ? 'RACE AGAIN' : 'START BROADCAST';
  startButton.disabled = raceBusy;
  replayButton.disabled = !snapshot.replayAvailable || snapshot.replayActive || snapshot.state !== 'finished';

  standingsEl.innerHTML = snapshot.standings.map((standing) => {
    const time = standing.finished && standing.finishTime !== undefined
      ? `${standing.finishTime.toFixed(2)}s`
      : `${Math.round(standing.progress * 100)}%`;
    return `
      <li class="standing ${standing.place === 1 ? 'leader-row' : ''}" style="--racer-accent:${standing.accent}">
        <b>${standing.place}</b>
        <i>${escapeHtml(standing.code)}</i>
        <span><strong>${escapeHtml(standing.name)}</strong><small>${escapeHtml(standing.team)}</small></span>
        <em>${time}</em>
      </li>
    `;
  }).join('');

  if (snapshot.battle && snapshot.state === 'running') {
    battlePairEl.textContent = `${snapshot.battle.frontName}  vs  ${snapshot.battle.backName}`;
    battleGapEl.textContent = `GAP ${snapshot.battle.gap.toFixed(2)}m`;
    battleCardEl.classList.toggle('visible', snapshot.battle.gap <= 3.2);
  } else {
    battleCardEl.classList.remove('visible');
  }

  renderReceipt(snapshot.replayActive ? undefined : snapshot.receipt);
}

function renderReceipt(receipt?: RaceReceipt) {
  if (!receipt) {
    receiptEl.classList.remove('visible');
    receiptEl.innerHTML = '';
    return;
  }

  const margin = receipt.margin === null ? '—' : `${receipt.margin.toFixed(3)}s`;
  const winningTime = receipt.winningTime === null ? '—' : `${receipt.winningTime.toFixed(3)}s`;
  receiptEl.innerHTML = `
    <div class="receipt-title">PARALLAX RACE RECEIPT · BRBC PRODUCTION LOG</div>
    <div class="receipt-winner">${escapeHtml(receipt.winner)}</div>
    <div class="receipt-grid">
      <span>WIN TIME</span><b>${winningTime}</b>
      <span>MARGIN</span><b>${margin}</b>
      <span>PHOTO FINISH</span><b>${receipt.photoFinish ? 'YES' : 'NO'}</b>
      <span>LEAD CHANGES</span><b>${receipt.leadChanges}</b>
      <span>OVERTAKES CALLED</span><b>${receipt.overtakes}</b>
      <span>BRBC COLLISIONS</span><b>${receipt.collisionEvents}</b>
      <span>DIRECTOR CUTS</span><b>${receipt.directorCuts}</b>
      <span>BROADCAST LINES</span><b>${receipt.broadcastLines}</b>
      <span>REPLAY FRAMES</span><b>${receipt.replayFrames}</b>
      <span>SPLIT L / R</span><b>${receipt.splitLeft} / ${receipt.splitRight}</b>
      <span>FINISHERS</span><b>${receipt.finishers}/12</b>
      <span>SEED</span><b>${receipt.seed}</b>
    </div>
    <div class="receipt-rule">SIMULATION AUTHORITATIVE · DIRECTOR OBSERVATIONAL · REPLAY VISUAL ONLY</div>
  `;
  receiptEl.classList.add('visible');
}

function renderBroadcast(message: BroadcastMessage) {
  broadcastHistory.push(message);
  broadcastHistory = broadcastHistory.slice(-3);
  renderBroadcastHistory();
}

function renderBroadcastHistory() {
  if (!broadcastHistory.length) {
    broadcastStackEl.innerHTML = `
      <div class="broadcast-row current" data-speaker="NOINE">
        <span>NOINE</span><p>Quite.</p>
      </div>
    `;
    return;
  }

  broadcastStackEl.innerHTML = broadcastHistory.map((message, index) => `
    <div class="broadcast-row ${index === broadcastHistory.length - 1 ? 'current' : ''}" data-speaker="${escapeHtml(message.speaker)}">
      <span>${escapeHtml(message.speaker)}</span>
      <p>${escapeHtml(message.text)}</p>
    </div>
  `).join('');
  broadcastStackEl.classList.remove('pulse');
  requestAnimationFrame(() => broadcastStackEl.classList.add('pulse'));
}

function shotLabel(shot: string) {
  return shot.replaceAll('-', ' ').toUpperCase();
}

function hex(color: number) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
