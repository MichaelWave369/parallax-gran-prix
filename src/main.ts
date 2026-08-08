import './styles.css';
import './season.css';
import './health.css';
import './sporting.css';
import './event.css';
import { RACERS } from './game/config';
import { EventWeekendManager, type WeekendPhase } from './game/EventWeekendManager';
import { RaceHealthMonitor } from './game/RaceHealthMonitor';
import { installSmartLabelDeclutter } from './game/SmartLabelDeclutter';
import { SeasonManager, type CircuitRecords } from './game/SeasonManager';
import { SportingIntelligence, type SportingEvent } from './game/SportingIntelligence';
import {
  getCircuitById,
  getCircuitForRound,
  getPlayableCircuits,
  type CircuitDefinition
} from './game/TrackRegistry';
import {
  RaceEngine,
  type BroadcastMessage,
  type RaceReceipt,
  type RaceSnapshot
} from './game/RaceEngine';

installSmartLabelDeclutter();

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

const season = new SeasonManager();
const health = new RaceHealthMonitor();
const query = new URLSearchParams(window.location.search);
const seasonStateAtLoad = season.getState();
const scheduledRoundAtLoad = season.getNextRoundNumber();
const scheduledCircuit = getCircuitForRound(scheduledRoundAtLoad);
const requestedCircuit = getCircuitById(query.get('circuit') ?? '');
const currentCircuit = requestedCircuit?.status === 'playable'
  ? requestedCircuit
  : scheduledCircuit?.status === 'playable'
    ? scheduledCircuit
    : getPlayableCircuits()[0];

if (!currentCircuit) throw new Error('No playable Parallax Gran Prix circuit is registered');

const championshipEligibleAtLoad = currentCircuit.seasonRound === scheduledRoundAtLoad;
const querySeed = Number(query.get('seed'));
const raceSeed = Number.isFinite(querySeed) && querySeed !== 0
  ? Math.abs(Math.trunc(querySeed))
  : season.suggestSeed();
const eventTitle = currentCircuit.broadcast?.eventTitle ?? currentCircuit.name.toUpperCase();
const weekend = new EventWeekendManager({
  seasonNumber: seasonStateAtLoad.seasonNumber,
  round: scheduledRoundAtLoad,
  circuitId: currentCircuit.id,
  eventTitle,
  raceSeed,
  championshipEligible: championshipEligibleAtLoad
});
let weekendPhase: WeekendPhase = weekend.getPhase(query.get('phase'));
if (weekendPhase === 'race') weekend.applyGridOrder(RACERS);
const initialSeed = weekend.getSessionSeed(weekendPhase);

const sporting = new SportingIntelligence(currentCircuit);
let historicalRecords = season.getCircuitRecords(currentCircuit.id);
let careerAtGreen = season.getCareerStats();

const qualifyingAtLoad = weekend.getQualifyingResult();
const driverPointsAtLoad = new Map(season.getDriverStandings().map((driver) => [driver.id, driver.points]));
const gridCards = RACERS.map((racer, index) => {
  const qualifying = qualifyingAtLoad?.grid.find((row) => row.id === racer.id);
  const cardPosition = weekendPhase === 'race' && qualifying ? qualifying.position : index + 1;
  const qualifyingText = qualifying
    ? qualifying.finished && qualifying.time !== null
      ? `Q ${qualifying.time.toFixed(3)}s`
      : `Q DNF · ${Math.round(qualifying.progress * 100)}%`
    : weekendPhase === 'qualifying'
      ? 'QUALIFYING ENTRY'
      : 'EXHIBITION GRID';
  return `
    <div class="grid-racer" style="--racer-accent:${hex(racer.accent)}">
      <span>${String(cardPosition).padStart(2, '0')}</span>
      <b>${escapeHtml(racer.code)}</b>
      <em>${escapeHtml(racer.name)}</em>
      <small>${qualifyingText} · ${driverPointsAtLoad.get(racer.id) ?? 0} PTS</small>
    </div>
  `;
}).join('');

const courseKey = currentCircuit.sectors.slice(1).map((sector) => `<span>${escapeHtml(sector.name)}</span>`).join('');
const firstSectorName = currentCircuit.sectors[0]?.name ?? 'START';
const packageKicker = currentCircuit.broadcast?.kicker ?? currentCircuit.description;

app.innerHTML = `
  <main class="shell">
    <section class="viewport" id="viewport">
      <div class="live-bug"><i></i> BRBC LIVE <span class="event-session-tag" id="session-tag"></span></div>
      <div class="round-chip" id="round-chip"></div>

      <div class="brand">
        <div class="eyebrow">PARALLAX FIELD THEORY SPORTS · BRBC WORLD FEED</div>
        <h1>PARALLAX <span>GRAN PRIX</span></h1>
        <p>${escapeHtml(eventTitle)} · EVENT PRODUCTION</p>
      </div>

      <div class="event-strip" id="event-strip">
        <div class="event-stat session"><span>SESSION</span><b id="event-session">—</b></div>
        <div class="event-stat pole"><span>POLE</span><b id="event-pole">—</b></div>
        <div class="event-stat title-watch"><span>CHAMPIONSHIP</span><b id="event-title-watch">—</b></div>
        <div class="event-stat trophy"><span>TROPHY</span><b id="event-trophy">—</b></div>
      </div>

      <div class="grid-show" id="grid-show" aria-live="polite">
        <div class="grid-show-kicker" id="grid-kicker">SEASON 1 · ROUND 1</div>
        <div class="grid-show-title">${escapeHtml(eventTitle)}</div>
        <div class="grid-show-sub">${escapeHtml(packageKicker)}</div>
        <div class="grid-roster">${gridCards}</div>
        <div class="weekend-note" id="weekend-note">QUALIFYING SETS THE GRID · FEATURE RACE PHYSICS SETS THE RESULT</div>
        <div class="grid-show-footer">THREVE · SIX'T · NOINE <span>BRBC</span></div>
      </div>

      <div class="sector-banner" id="sector-banner">${escapeHtml(firstSectorName)}</div>
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
        <div class="ops-controls">
          <button id="next-round" class="secondary" disabled>NEXT ROUND</button>
          <button id="season-toggle" class="secondary">SEASON</button>
        </div>
        <button id="circuit-cycle" class="secondary camera-button">TRACK · ${escapeHtml(currentCircuit.shortName.toUpperCase())}</button>
        <label class="seed-label" id="seed-label" for="seed">SIMULATION SEED</label>
        <div class="seed-row">
          <input id="seed" type="number" inputmode="numeric" />
          <button id="apply-seed" class="secondary compact">SET</button>
        </div>
        <div class="qualifying-lock" id="qualifying-lock"></div>
        <div class="meta-grid">
          <span>STATE</span><strong id="state">READY</strong>
          <span>TIME</span><strong id="time">0.00</strong>
          <span>LEADER</span><strong id="leader">—</strong>
          <span>SECTOR</span><strong id="sector">${escapeHtml(firstSectorName)}</strong>
          <span>DIRECTOR</span><strong id="director">GRID WIDE</strong>
          <span>BATTLE</span><strong id="battle">—</strong>
        </div>
        <div class="course-key">${courseKey}</div>
        <div class="health-strip">
          <div class="health-head"><span>FIELD HEALTH</span><b id="health-score">100%</b></div>
          <div class="marshal-status" id="marshal-status">RECOVERY MARSHAL · STANDBY</div>
          <div class="health-problems" id="health-problems"><div class="health-empty">ALL VESSELS NOMINAL</div></div>
        </div>
        <div class="sporting-strip">
          <div class="sporting-head"><span>SPORTING INTELLIGENCE</span><b id="sporting-mode">OBSERVED</b></div>
          <div class="sporting-grid">
            <div class="sporting-stat record"><span>CIRCUIT RECORD</span><b id="circuit-record">UNSET</b></div>
            <div class="sporting-stat"><span>FASTEST SECTOR</span><b id="fastest-sector">—</b></div>
            <div class="sporting-stat speed"><span>SPEED TRAP</span><b id="speed-trap">—</b></div>
            <div class="sporting-stat delta"><span>LAST DELTA</span><b id="sporting-delta">—</b></div>
          </div>
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
      <aside class="season-panel" id="season-panel" aria-live="polite"></aside>

      <div class="podium" id="podium" aria-live="polite">
        <div class="podium-kicker">BRBC PODIUM CEREMONY</div>
        <div class="podium-trophy">🏆</div>
        <h2 id="podium-trophy-name">PARALLAX TROPHY</h2>
        <div class="podium-sub" id="podium-sub">PHYSICS AUTHORITATIVE · RESULT RECEIPTED</div>
        <div class="podium-grid" id="podium-grid"></div>
        <button class="secondary podium-close" id="podium-close">RETURN TO RACE CONTROL</button>
      </div>

      <div class="broadcast">
        <div class="brbc-mark">
          <b>BRBC</b>
          <span>BRITISH ROBOT<br>BROADCASTING CORPORATION</span>
          <div class="announcer-lamps"><i>3</i><i>6</i><i>9</i></div>
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
const nextRoundButton = document.querySelector<HTMLButtonElement>('#next-round')!;
const seasonToggleButton = document.querySelector<HTMLButtonElement>('#season-toggle')!;
const circuitCycleButton = document.querySelector<HTMLButtonElement>('#circuit-cycle')!;
const applySeedButton = document.querySelector<HTMLButtonElement>('#apply-seed')!;
const seedInput = document.querySelector<HTMLInputElement>('#seed')!;
const seedLabelEl = document.querySelector<HTMLElement>('#seed-label')!;
const qualifyingLockEl = document.querySelector<HTMLElement>('#qualifying-lock')!;
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
const gridKickerEl = document.querySelector<HTMLElement>('#grid-kicker')!;
const weekendNoteEl = document.querySelector<HTMLElement>('#weekend-note')!;
const roundChipEl = document.querySelector<HTMLElement>('#round-chip')!;
const replayBugEl = document.querySelector<HTMLElement>('#replay-bug')!;
const battleCardEl = document.querySelector<HTMLElement>('#battle-card')!;
const battlePairEl = document.querySelector<HTMLElement>('#battle-pair')!;
const battleGapEl = document.querySelector<HTMLElement>('#battle-gap')!;
const broadcastStackEl = document.querySelector<HTMLElement>('#broadcast-stack')!;
const seasonPanelEl = document.querySelector<HTMLElement>('#season-panel')!;
const healthScoreEl = document.querySelector<HTMLElement>('#health-score')!;
const marshalStatusEl = document.querySelector<HTMLElement>('#marshal-status')!;
const healthProblemsEl = document.querySelector<HTMLElement>('#health-problems')!;
const sportingModeEl = document.querySelector<HTMLElement>('#sporting-mode')!;
const circuitRecordEl = document.querySelector<HTMLElement>('#circuit-record')!;
const fastestSectorEl = document.querySelector<HTMLElement>('#fastest-sector')!;
const speedTrapEl = document.querySelector<HTMLElement>('#speed-trap')!;
const sportingDeltaEl = document.querySelector<HTMLElement>('#sporting-delta')!;
const sessionTagEl = document.querySelector<HTMLElement>('#session-tag')!;
const eventSessionEl = document.querySelector<HTMLElement>('#event-session')!;
const eventPoleEl = document.querySelector<HTMLElement>('#event-pole')!;
const eventTitleWatchEl = document.querySelector<HTMLElement>('#event-title-watch')!;
const eventTrophyEl = document.querySelector<HTMLElement>('#event-trophy')!;
const podiumEl = document.querySelector<HTMLElement>('#podium')!;
const podiumGridEl = document.querySelector<HTMLElement>('#podium-grid')!;
const podiumTrophyNameEl = document.querySelector<HTMLElement>('#podium-trophy-name')!;
const podiumSubEl = document.querySelector<HTMLElement>('#podium-sub')!;
const podiumCloseButton = document.querySelector<HTMLButtonElement>('#podium-close')!;

seedInput.value = String(initialSeed);
let broadcastHistory: BroadcastMessage[] = [];
let previousRaceState: RaceSnapshot['state'] = 'ready';
let latestSnapshot: RaceSnapshot | undefined;
let marshalFlashTimer = 0;
let auxiliarySequence = 100_000;

const engine = new RaceEngine(viewport, {
  seed: initialSeed,
  circuitId: currentCircuit.id,
  onSnapshot: renderSnapshot,
  onBroadcast: renderBroadcast
});

renderSeasonPanel();
renderRoundMeta();
renderHealth();
renderSporting();
renderEventProduction();

startButton.addEventListener('click', () => {
  if (weekendPhase === 'qualifying' && latestSnapshot?.state === 'finished' && weekend.getQualifyingResult()) {
    navigateToCircuit(currentCircuit, raceSeed, 'race');
    return;
  }

  resetObservers();
  hidePodium();
  injectEventOpening();
  engine.startRace();
});

resetButton.addEventListener('click', () => {
  if (weekendPhase === 'qualifying' && latestSnapshot?.state === 'finished') weekend.clearCurrentWeekend();
  resetObservers();
  hidePodium();
  engine.resetRace();
  renderEventProduction();
});

cameraButton.addEventListener('click', () => {
  const mode = engine.cycleCameraMode();
  cameraButton.textContent = `CAMERA · ${mode.toUpperCase()}`;
});

replayButton.addEventListener('click', () => {
  hidePodium();
  engine.playFinishReplay();
});
nextRoundButton.addEventListener('click', prepareNextRound);
seasonToggleButton.addEventListener('click', () => seasonPanelEl.classList.toggle('visible'));
circuitCycleButton.addEventListener('click', cycleCircuit);
applySeedButton.addEventListener('click', applySeed);
seedInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') applySeed();
});
podiumCloseButton.addEventListener('click', hidePodium);

function resetObservers() {
  health.reset();
  sporting.reset();
  refreshHistoricalContext();
  broadcastHistory = [];
  renderBroadcastHistory();
  renderHealth();
  renderSporting();
}

function applySeed() {
  if (championshipEligibleAtLoad) {
    window.alert('Championship event seeds are locked across qualifying and the feature race. Use a new event URL/seed before qualifying if you want a different weekend.');
    return;
  }

  const value = Math.abs(Math.trunc(Number(seedInput.value))) || 369;
  seedInput.value = String(value);
  resetObservers();
  engine.setSeed(value);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('seed', String(value));
  history.replaceState({}, '', nextUrl);
}

function cycleCircuit() {
  const playable = getPlayableCircuits();
  const index = playable.findIndex((circuit) => circuit.id === currentCircuit.id);
  const next = playable[(index + 1 + playable.length) % playable.length];
  navigateToCircuit(next, Number(seedInput.value) || raceSeed);
}

function prepareNextRound() {
  const round = season.getNextRoundNumber();
  const nextCircuit = getCircuitForRound(round);
  if (!nextCircuit || nextCircuit.status !== 'playable') {
    seasonPanelEl.classList.add('visible');
    window.alert(nextCircuit
      ? `${nextCircuit.name} is registered for Round ${round}, but its physical circuit module is still planned.`
      : `Round ${round} is not registered yet.`);
    return;
  }
  navigateToCircuit(nextCircuit, season.suggestSeed(), 'qualifying');
}

function navigateToCircuit(circuit: CircuitDefinition, seed: number, phase?: WeekendPhase) {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('circuit', circuit.id);
  nextUrl.searchParams.set('seed', String(seed));
  if (phase === 'qualifying' || phase === 'race') nextUrl.searchParams.set('phase', phase);
  else nextUrl.searchParams.delete('phase');
  window.location.assign(nextUrl.toString());
}

function renderSnapshot(snapshot: RaceSnapshot) {
  latestSnapshot = snapshot;
  health.observeSnapshot(snapshot);
  const sportingEvents = sporting.observeSnapshot(snapshot);
  handleSportingEvents(sportingEvents, snapshot);

  if (snapshot.state === 'finished' && previousRaceState !== 'finished' && snapshot.receipt) {
    if (weekendPhase === 'qualifying' && championshipEligibleAtLoad) {
      const qualifying = weekend.recordQualifying(
        snapshot.standings,
        snapshot.receipt,
        health.getReport(),
        sporting.getReport()
      );
      if (qualifying?.pole) {
        injectAuxiliaryExchange([
          ['THREVE', `POLE POSITION! ${qualifying.pole.name} will lead the feature grid!`],
          ["SIX'T", qualifying.pole.time !== null
            ? `Qualifying receipt confirms P1 at ${qualifying.pole.time.toFixed(3)} seconds. Grid order is now frozen for the feature race.`
            : 'Pole came from terminal qualifying order after the timeout. The receipt preserves the exact basis.'],
          ['NOINE', 'Front of the queue, then.']
        ], 'finish');
      }
      renderEventProduction();
      renderSeasonPanel();
      renderRoundMeta();
    } else if (weekendPhase === 'race' && championshipEligibleAtLoad) {
      season.recordRace(
        snapshot.receipt,
        snapshot.standings,
        currentCircuit,
        health.getReport(),
        sporting.getReport(),
        weekend.getReceipt()
      );
      weekend.markRaceComplete();
      refreshHistoricalContext();
      renderSeasonPanel();
      renderRoundMeta();
      renderEventProduction();
      renderPodium(snapshot);
    }
  }
  previousRaceState = snapshot.state;

  const sessionPrefix = weekendPhase === 'qualifying' ? 'Q' : weekendPhase === 'race' ? 'RACE' : 'EX';
  stateEl.textContent = snapshot.replayActive ? 'REPLAY' : `${sessionPrefix} · ${snapshot.state.toUpperCase()}`;
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
  const nextScheduled = getCircuitForRound(season.getNextRoundNumber());
  const rerunIsExhibition = snapshot.state === 'finished' && currentCircuit.seasonRound < season.getNextRoundNumber();

  if (weekendPhase === 'qualifying') {
    startButton.textContent = snapshot.state === 'finished' && weekend.getQualifyingResult()
      ? 'LOAD FEATURE RACE'
      : 'START QUALIFYING';
  } else if (rerunIsExhibition) {
    startButton.textContent = 'RERUN EXHIBITION';
  } else {
    startButton.textContent = snapshot.state === 'finished' ? 'RACE AGAIN' : weekendPhase === 'race' ? 'START FEATURE RACE' : 'START BROADCAST';
  }

  startButton.disabled = raceBusy;
  replayButton.disabled = !snapshot.replayAvailable || snapshot.replayActive || snapshot.state !== 'finished';
  nextRoundButton.disabled = weekendPhase !== 'race'
    || snapshot.state !== 'finished'
    || snapshot.replayActive
    || nextScheduled?.status !== 'playable';
  circuitCycleButton.disabled = raceBusy;
  const eventSeedLocked = championshipEligibleAtLoad;
  seedInput.disabled = eventSeedLocked || raceBusy;
  applySeedButton.disabled = eventSeedLocked || raceBusy;

  standingsEl.innerHTML = snapshot.standings.map((standing) => {
    const racerHealth = health.getRacer(standing.id);
    const healthState = racerHealth?.state ?? 'GREEN';
    const intel = sporting.getRacer(standing.id);
    const time = standing.finished && standing.finishTime !== undefined
      ? `${standing.finishTime.toFixed(2)}s`
      : snapshot.state === 'finished'
        ? 'DNF'
        : `${Math.round(standing.progress * 100)}%`;
    const delta = intel?.deltaToRaceBest;
    const deltaText = delta === null || delta === undefined
      ? '—'
      : `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`;
    const deltaClass = delta !== null && delta !== undefined && delta <= 0.001 ? 'minus' : 'plus';
    const splitText = intel?.lastSplit
      ? `${intel.lastSplit.duration.toFixed(2)}s <span class="${deltaClass}">${deltaText}</span>`
      : 'NO SPLIT';
    return `
      <li class="standing ${standing.place === 1 ? 'leader-row' : ''}" style="--racer-accent:${standing.accent}">
        <b>${standing.place}</b>
        <i>${escapeHtml(standing.code)}</i>
        <span>
          <strong>${escapeHtml(standing.name)}</strong>
          <small>${escapeHtml(standing.team)} <span class="health-inline" data-state="${healthState}">· ${healthCode(healthState)}</span></small>
          <small class="sport-inline">${intel ? `${escapeHtml(shortSector(intel.sectorName))} · ${intel.speed.toFixed(1)}m/s · ${splitText}` : 'SPORTING DATA PENDING'}</small>
        </span>
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

  renderHealth();
  renderSporting();
  renderEventProduction();
  renderReceipt(snapshot.replayActive ? undefined : snapshot.receipt);
}

function renderEventProduction() {
  const qualifying = weekend.getQualifyingResult();
  const implications = season.getChampionshipImplications();
  const session = weekendPhase === 'qualifying'
    ? 'QUALIFYING'
    : weekendPhase === 'race'
      ? 'FEATURE RACE'
      : weekendPhase === 'complete'
        ? 'COMPLETE'
        : 'EXHIBITION';

  sessionTagEl.textContent = session;
  eventSessionEl.textContent = session;
  eventPoleEl.textContent = qualifying?.pole
    ? `${qualifying.pole.code} · ${qualifying.pole.name}`
    : weekendPhase === 'qualifying'
      ? 'TO BE SET'
      : 'OPEN GRID';
  eventTitleWatchEl.textContent = implicationCompact(implications);
  eventTrophyEl.textContent = currentCircuit.broadcast?.trophy ?? 'PARALLAX CUP';
  seedLabelEl.textContent = weekendPhase === 'qualifying' ? 'QUALIFYING SEED' : weekendPhase === 'race' ? 'FEATURE RACE SEED' : 'SIMULATION SEED';

  if (championshipEligibleAtLoad) {
    qualifyingLockEl.textContent = weekendPhase === 'qualifying'
      ? `EVENT SEED LOCKED · RACE SEED ${raceSeed} · Q SEED ${weekend.qualifyingSeed}`
      : `EVENT SEED LOCKED · QUALIFYING + FEATURE RACE ARE SEPARATE RECEIPTED SESSIONS`;
  } else {
    qualifyingLockEl.textContent = 'EXHIBITION · SEED MAY BE CHANGED · NO CHAMPIONSHIP RECORDS WRITTEN';
  }

  weekendNoteEl.textContent = weekendPhase === 'qualifying'
    ? 'QUALIFYING IS A PHYSICS SESSION · ORDER SETS THE FEATURE GRID · NO CHAMPIONSHIP POINTS AWARDED'
    : weekendPhase === 'race'
      ? `POLE ${qualifying?.pole?.code ?? '—'} · ${implications.narrative.toUpperCase()}`
      : 'EXHIBITION SESSION · LIVE TELEMETRY ONLY · NO SEASON OR CAREER RECORD WRITES';
}

function renderHealth() {
  const report = health.getReport();
  healthScoreEl.textContent = `${report.score}%`;

  const problems = report.racers
    .filter((row) => !['GREEN', 'FINISHED'].includes(row.state) || row.recoveries > 0)
    .sort((a, b) => healthPriority(b.state) - healthPriority(a.state) || b.recoveries - a.recoveries)
    .slice(0, 4);

  healthProblemsEl.innerHTML = problems.length
    ? problems.map((row) => `
      <div class="health-problem" data-state="${row.state}">
        <b>${escapeHtml(row.code)}</b>
        <span>${escapeHtml(row.name)} · ${row.state}</span>
        <em>${row.recoveries ? `${row.recoveries}R` : `${row.noProgressSeconds.toFixed(1)}s`}</em>
      </div>
    `).join('')
    : '<div class="health-empty">ALL VESSELS NOMINAL</div>';
}

function renderSporting() {
  const report = sporting.getReport();
  const record = historicalRecords.raceRecord;
  circuitRecordEl.textContent = record ? `${record.racerCode} · ${record.time.toFixed(3)}s` : 'UNSET';
  sportingModeEl.textContent = weekendPhase === 'qualifying'
    ? 'Q OBSERVED'
    : historicalRecords.raceStarts
      ? `HIST ${historicalRecords.raceStarts}`
      : 'BASELINE';

  const latestSector = report.fastestSectors.at(-1);
  fastestSectorEl.textContent = latestSector
    ? `${latestSector.racerCode} · ${shortSector(latestSector.sectorName)} · ${latestSector.duration.toFixed(3)}s`
    : '—';

  const fastestTrap = report.speedTrapRecords.reduce<typeof report.speedTrapRecords[number] | undefined>((best, hit) =>
    !best || hit.speed > best.speed ? hit : best, undefined);
  speedTrapEl.textContent = fastestTrap
    ? `${fastestTrap.racerCode} · ${fastestTrap.speed.toFixed(1)}m/s`
    : '—';

  const latest = sporting.getLatestEvent();
  sportingDeltaEl.classList.remove('negative', 'positive');
  if (!latest) {
    sportingDeltaEl.textContent = '—';
    return;
  }

  if (latest.type === 'sector-split') {
    const historic = historicalRecords.sectorRecords[latest.split.sectorId];
    const comparison = historic
      ? latest.split.duration - historic.duration
      : latest.previousBest
        ? latest.split.duration - latest.previousBest.duration
        : 0;
    sportingDeltaEl.textContent = historic || latest.previousBest
      ? `${comparison > 0 ? '+' : ''}${comparison.toFixed(3)}s ${historic ? 'HIST' : 'RACE'}`
      : 'BASELINE';
    sportingDeltaEl.classList.add(comparison <= 0 ? 'negative' : 'positive');
    return;
  }

  const historic = historicalRecords.speedTrapRecords[latest.hit.trapId];
  const comparison = historic
    ? latest.hit.speed - historic.speed
    : latest.previousBest
      ? latest.hit.speed - latest.previousBest.speed
      : 0;
  sportingDeltaEl.textContent = historic || latest.previousBest
    ? `${comparison >= 0 ? '+' : ''}${comparison.toFixed(2)}m/s ${historic ? 'HIST' : 'RACE'}`
    : 'BASELINE';
  sportingDeltaEl.classList.add(comparison >= 0 ? 'negative' : 'positive');
}

function renderReceipt(receipt?: RaceReceipt) {
  if (!receipt) {
    receiptEl.classList.remove('visible');
    receiptEl.innerHTML = '';
    return;
  }

  const margin = receipt.margin === null ? '—' : `${receipt.margin.toFixed(3)}s`;
  const winningTime = receipt.winningTime === null ? '—' : `${receipt.winningTime.toFixed(3)}s`;
  const report = health.getReport();
  const sportingReport = sporting.getReport();
  const qualifying = weekend.getQualifyingResult();
  const recoveryLog = report.recoveryLog.length
    ? report.recoveryLog.map((entry) => `<span>${entry.elapsed.toFixed(2)}s · ${escapeHtml(entry.racerName)}</span>`).join('')
    : '<span>NO RECOVERY INTERVENTIONS</span>';
  const sectorRows = sportingReport.fastestSectors.length
    ? sportingReport.fastestSectors.map((split) => `
      <span>${escapeHtml(split.sectorName)}</span><b>${escapeHtml(split.racerCode)} · ${split.duration.toFixed(3)}s</b>
    `).join('')
    : '<span>SECTOR DATA</span><b>NO COMPLETE SPLITS</b>';
  const trapRows = sportingReport.speedTrapRecords.map((hit) => `
    <span>${escapeHtml(hit.trapName)}</span><b>${escapeHtml(hit.racerCode)} · ${hit.speed.toFixed(2)}m/s</b>
  `).join('');
  const receiptTitle = weekendPhase === 'qualifying'
    ? 'PARALLAX QUALIFYING RECEIPT · GRID FORMATION LOG'
    : 'PARALLAX RACE RECEIPT · BRBC PRODUCTION LOG';

  receiptEl.innerHTML = `
    <div class="receipt-title">${receiptTitle}</div>
    <div class="receipt-winner">${escapeHtml(receipt.winner)}</div>
    <div class="receipt-grid">
      <span>SESSION</span><b>${weekendPhase === 'qualifying' ? 'QUALIFYING' : weekendPhase === 'race' ? 'FEATURE RACE' : 'EXHIBITION'}</b>
      <span>CIRCUIT</span><b>${escapeHtml(currentCircuit.shortName)}</b>
      <span>WIN TIME</span><b>${winningTime}</b>
      <span>MARGIN</span><b>${margin}</b>
      <span>GRID POLE</span><b>${escapeHtml(qualifying?.pole?.code ?? (weekendPhase === 'qualifying' ? 'PENDING' : 'OPEN'))}</b>
      <span>PHOTO FINISH</span><b>${receipt.photoFinish ? 'YES' : 'NO'}</b>
      <span>LEAD CHANGES</span><b>${receipt.leadChanges}</b>
      <span>OVERTAKES CALLED</span><b>${receipt.overtakes}</b>
      <span>BRBC COLLISIONS</span><b>${receipt.collisionEvents}</b>
      <span>RECOVERY MARSHAL</span><b>${receipt.recoveryInterventions}</b>
      <span>DNF</span><b>${report.dnfs}</b>
      <span>FIELD HEALTH</span><b>${report.score}%</b>
      <span>DIRECTOR CUTS</span><b>${receipt.directorCuts}</b>
      <span>BROADCAST LINES</span><b>${receipt.broadcastLines}</b>
      <span>REPLAY FRAMES</span><b>${receipt.replayFrames}</b>
      <span>SPLIT L / R</span><b>${receipt.splitLeft} / ${receipt.splitRight}</b>
      <span>FINISHERS</span><b>${receipt.finishers}/12</b>
      <span>SEED</span><b>${receipt.seed}</b>
    </div>
    <div class="receipt-sporting">
      <strong>SPORTING INTELLIGENCE · OBSERVED SPLITS + SPEED TRAPS</strong>
      <div class="receipt-sporting-grid">${sectorRows}${trapRows}</div>
    </div>
    <div class="receipt-health">
      <strong>RACE HEALTH LOG · OBSERVATIONAL</strong>
      <div class="receipt-health-log">${recoveryLog}</div>
    </div>
    <div class="receipt-rule">${weekendPhase === 'qualifying'
      ? 'QUALIFYING PHYSICS AUTHORITATIVE · ORDER SETS GRID ONLY · ZERO CHAMPIONSHIP POINTS · TELEMETRY PRESERVED'
      : 'SIMULATION AUTHORITATIVE · SPORTING INTELLIGENCE OBSERVATIONAL · QUALIFYING SET GRID ONLY · REPLAY VISUAL ONLY'}</div>
  `;
  receiptEl.classList.add('visible');
}

function renderSeasonPanel() {
  const state = season.getState();
  const drivers = season.getDriverStandings();
  const teams = season.getTeamStandings();
  const career = season.getCareerStats();
  const circuitRecords = season.getCircuitRecords(currentCircuit.id);
  const implications = season.getChampionshipImplications();
  const qualifying = weekend.getQualifyingResult();
  const leader = drivers[0];
  const latest = state.races.at(-1);
  const nextRound = season.getNextRoundNumber();
  const nextCircuit = getCircuitForRound(nextRound);
  const driverRows = drivers.slice(0, 6).map((driver, index) => `
    <div class="champ-row">
      <b>${index + 1}</b><i>${escapeHtml(driver.code)}</i>
      <span><strong>${escapeHtml(driver.name)}</strong><small>${driver.wins}W · ${driver.podiums} podiums · ${driver.dnfs} DNF</small></span>
      <em>${driver.points} pts</em>
    </div>
  `).join('');
  const teamRows = teams.slice(0, 5).map((team, index) => `
    <div class="champ-row team-row">
      <b>${index + 1}</b><span><strong>${escapeHtml(team.team)}</strong><small>${team.wins} wins · ${team.dnfs} DNF</small></span><em>${team.points} pts</em>
    </div>
  `).join('');
  const careerRows = career.filter((row) => row.starts > 0).slice(0, 5).map((driver, index) => `
    <div class="champ-row">
      <b>${index + 1}</b><i>${escapeHtml(driver.code)}</i>
      <span><strong>${escapeHtml(driver.name)}</strong><small>${driver.wins}W · ${driver.starts} starts · ${driver.fastestSectorAwards} fastest sectors</small></span>
      <em>${driver.totalPoints} pts</em>
    </div>
  `).join('');
  const historyRows = [...state.races].reverse().slice(0, 8).map((race) => `
    <div class="history-row"><b>R${race.round}</b><span>${escapeHtml(race.receipt.winner)} · ${escapeHtml(race.circuitName)}${race.weekend?.pole ? ` · Q ${escapeHtml(race.weekend.pole.code)}` : ''}${race.health ? ` · H${race.health.score}` : ''}${race.sporting ? ' · SI' : ''}</span><em>${race.seed}</em></div>
  `).join('');
  const recordLine = circuitRecords.raceRecord
    ? `<b>${escapeHtml(circuitRecords.raceRecord.racerCode)} · ${circuitRecords.raceRecord.time.toFixed(3)}s</b> by ${escapeHtml(circuitRecords.raceRecord.racerName)} · ${Object.keys(circuitRecords.sectorRecords).length} sector records · ${Object.keys(circuitRecords.speedTrapRecords).length} speed records`
    : 'NO CHAMPIONSHIP RECORD YET — FIRST ELIGIBLE FINISH SETS THE REFERENCE';
  const weekendLine = qualifying?.pole
    ? `<b>POLE ${escapeHtml(qualifying.pole.code)}</b> · Q seed ${qualifying.qualifyingSeed} · race seed ${qualifying.raceSeed} · full qualifying receipt preserved`
    : championshipEligibleAtLoad
      ? '<b>QUALIFYING PENDING</b> · a separate physics session will set the feature grid'
      : '<b>EXHIBITION</b> · no qualifying or championship write';

  seasonPanelEl.innerHTML = `
    <div class="season-header">
      <div><small>PARALLAX GRAN PRIX</small><h2>SEASON ${state.seasonNumber}</h2></div>
      <button class="secondary season-close" id="season-close">×</button>
    </div>
    <div class="season-summary">
      <div class="season-stat"><span>RACES</span><b>${state.races.length}</b></div>
      <div class="season-stat"><span>LEADER</span><b>${escapeHtml(leader?.code ?? '—')}</b></div>
      <div class="season-stat"><span>LAST WIN</span><b>${escapeHtml(latest?.results[0]?.code ?? '—')}</b></div>
    </div>
    <div class="season-section"><div class="season-section-title">EVENT WEEKEND · ${escapeHtml(eventTitle)}</div><div class="career-record-line">${weekendLine}</div></div>
    <div class="season-section"><div class="season-section-title">CHAMPIONSHIP IMPLICATION</div><div class="career-record-line">${escapeHtml(implications.narrative)}</div></div>
    <div class="season-section"><div class="season-section-title">NEXT EVENT · ROUND ${nextRound}</div><div class="empty-season">${escapeHtml(nextCircuit?.name ?? 'UNREGISTERED')} · ${nextCircuit?.status === 'playable' ? 'PLAYABLE' : 'PLANNED'}</div></div>
    <div class="season-section"><div class="season-section-title">${escapeHtml(currentCircuit.shortName.toUpperCase())} · CIRCUIT RECORD</div><div class="career-record-line">${recordLine}</div></div>
    <div class="season-section"><div class="season-section-title">DRIVER CHAMPIONSHIP · DNF = 0 POINTS</div><div class="champ-list">${driverRows}</div></div>
    <div class="season-section"><div class="season-section-title">TEAM CHAMPIONSHIP</div><div class="champ-list">${teamRows}</div></div>
    <div class="season-section"><div class="season-section-title">CAREER LEDGER · PERSISTS ACROSS SEASONS</div><div class="champ-list">${careerRows || '<div class="empty-season">NO CAREER STARTS RECORDED YET</div>'}</div></div>
    <div class="season-section"><div class="season-section-title">RECEIPT HISTORY</div><div class="race-history">${historyRows || '<div class="empty-season">NO RACES RECORDED YET</div>'}</div></div>
    <div class="season-actions">
      <button class="secondary" id="export-season">EXPORT LEDGER</button>
      <button class="secondary" id="reset-season">NEW SEASON</button>
    </div>
    <div class="season-rule">LOCAL-FIRST EVENT + SEASON STATE · QUALIFYING RECEIPT PRESERVED WITH FEATURE RACE · RESULTS COME FROM PHYSICS</div>
  `;

  seasonPanelEl.querySelector<HTMLButtonElement>('#season-close')?.addEventListener('click', () => seasonPanelEl.classList.remove('visible'));
  seasonPanelEl.querySelector<HTMLButtonElement>('#export-season')?.addEventListener('click', exportSeasonLedger);
  seasonPanelEl.querySelector<HTMLButtonElement>('#reset-season')?.addEventListener('click', () => {
    if (!window.confirm('Start a new Parallax Gran Prix season? Current season standings will clear, but career statistics and circuit records will remain. Export the ledger first if you want a snapshot.')) return;
    season.resetSeason();
    const opener = getCircuitForRound(1) ?? getPlayableCircuits()[0];
    if (opener) navigateToCircuit(opener, season.suggestSeed(), 'qualifying');
  });
}

function renderRoundMeta() {
  const state = season.getState();
  const scheduled = championshipEligibleAtLoad;
  const session = weekendPhase === 'qualifying'
    ? 'QUALIFYING'
    : weekendPhase === 'race'
      ? 'FEATURE RACE'
      : 'EXHIBITION';
  const label = scheduled
    ? `SEASON ${state.seasonNumber} · ROUND ${scheduledRoundAtLoad} · ${session}`
    : `SEASON ${state.seasonNumber} · EXHIBITION`;
  gridKickerEl.textContent = label;
  roundChipEl.textContent = `${label} · ${currentCircuit.shortName.toUpperCase()}`;
}

function exportSeasonLedger() {
  const state = season.getState();
  const blob = new Blob([season.exportLedger()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `parallax-gran-prix-season-${state.seasonNumber}-ledger.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderBroadcast(message: BroadcastMessage) {
  const sessionAdjusted = adaptBroadcastForSession(message);
  const enriched = enrichBroadcastWithStats(sessionAdjusted);
  health.observeBroadcast(enriched);
  if (enriched.type === 'recovery') flashMarshal(enriched.text);
  broadcastHistory.push(enriched);
  broadcastHistory = broadcastHistory.slice(-3);
  renderBroadcastHistory();
  renderHealth();
}

function adaptBroadcastForSession(message: BroadcastMessage): BroadcastMessage {
  if (weekendPhase !== 'qualifying') return message;
  let text = message.text;
  if (message.type === 'start' && message.speaker === 'THREVE') {
    text = text.replace('PARALLAX GRAN PRIX IS GO', 'QUALIFYING SPRINT IS GO');
  }
  if (message.type === 'winner' && message.speaker === 'THREVE') {
    text = text.replace('WE HAVE A WINNER!', 'PROVISIONAL POLE!');
  }
  if (message.type === 'winner' && message.speaker === "SIX'T") {
    text = 'Qualifying physics has rendered the provisional grid order. No championship points are attached to this session.';
  }
  return text === message.text ? message : { ...message, text };
}

function enrichBroadcastWithStats(message: BroadcastMessage): BroadcastMessage {
  if (message.speaker !== "SIX'T") return message;
  let text = message.text;

  if (message.type === 'opening') {
    text += currentCircuit.broadcast?.hazardNote
      ? ` Event package: ${currentCircuit.broadcast.hazardNote}`
      : '';
    text += historicalRecords.raceRecord
      ? ` Circuit record: ${historicalRecords.raceRecord.racerName}, ${historicalRecords.raceRecord.time.toFixed(3)} seconds.`
      : ' No prior championship time exists here; the first eligible feature-race finish establishes the circuit record.';
  }

  if (message.type === 'sector' && latestSnapshot) {
    const sector = currentCircuit.sectors.find((candidate) => candidate.name === latestSnapshot?.sector);
    const record = sector ? historicalRecords.sectorRecords[sector.id] : undefined;
    if (record) text += ` Historical ${sector?.name.toLowerCase()} mark: ${record.duration.toFixed(3)} seconds by ${record.racerName}.`;
  }

  if (message.type === 'winner' && weekendPhase !== 'qualifying') {
    const racer = RACERS.find((candidate) => message.text.toLowerCase().includes(candidate.name.toLowerCase()));
    const career = racer ? careerAtGreen.find((row) => row.id === racer.id) : undefined;
    if (career?.starts) text += ` Entering today: ${career.wins} career wins from ${career.starts} starts.`;
  }

  return text === message.text ? message : { ...message, text };
}

function injectEventOpening() {
  const packageInfo = currentCircuit.broadcast;
  const implications = season.getChampionshipImplications();
  const qualifying = weekend.getQualifyingResult();

  if (weekendPhase === 'qualifying') {
    injectAuxiliaryExchange([
      ['THREVE', `QUALIFYING IS OPEN AT ${eventTitle}! Twelve vessels, one shot at pole!`],
      ["SIX'T", `Qualifying seed ${weekend.qualifyingSeed}. This is a separate physics session; its order sets the feature grid and awards zero championship points.`],
      ['NOINE', packageInfo?.noineTag ?? 'Proceed.']
    ], 'opening');
    return;
  }

  if (weekendPhase === 'race') {
    const poleLine = qualifying?.pole
      ? `${qualifying.pole.name} starts from pole${qualifying.pole.time !== null ? ` after a ${qualifying.pole.time.toFixed(3)} second qualifying run` : ''}.`
      : 'No qualifying pole is recorded.';
    injectAuxiliaryExchange([
      ['THREVE', `FEATURE RACE TIME — ${eventTitle}! ${poleLine}`],
      ["SIX'T", `${implications.narrative} Qualifying has no further authority now; race physics decides the result.`],
      ['NOINE', packageInfo?.noineTag ?? 'Quite.']
    ], 'opening');
    return;
  }

  injectAuxiliaryExchange([
    ['THREVE', `EXHIBITION RUN — ${eventTitle}!`],
    ["SIX'T", 'Live telemetry is active. This session does not write championship, career, or circuit records.'],
    ['NOINE', packageInfo?.noineTag ?? 'Carry on.']
  ], 'opening');
}

function handleSportingEvents(events: SportingEvent[], snapshot: RaceSnapshot) {
  if (snapshot.state !== 'running' && snapshot.state !== 'finished') return;
  const championshipEligible = weekendPhase === 'race'
    && currentCircuit.seasonRound === season.getNextRoundNumber();
  if (!championshipEligible) return;

  events.forEach((event) => {
    if (!event.raceBest) return;

    if (event.type === 'sector-split') {
      const historic = historicalRecords.sectorRecords[event.split.sectorId];
      if (!historic || event.split.duration >= historic.duration - 0.002) return;
      injectAuxiliaryExchange([
        ['THREVE', `NEW SECTOR RECORD! ${event.split.racerName} — ${event.split.sectorName} in ${event.split.duration.toFixed(3)}!`],
        ["SIX'T", `${(historic.duration - event.split.duration).toFixed(3)} seconds inside the historical mark held by ${historic.racerName}. Sporting Intelligence confirms the observation.`],
        ['NOINE', currentCircuit.id === 'mirror-labyrinth' ? 'Improved reflection.' : currentCircuit.id === 'ledger-larry-500' ? 'Filed.' : 'Efficient.']
      ], 'sector');
      return;
    }

    const historic = historicalRecords.speedTrapRecords[event.hit.trapId];
    if (!historic || event.hit.speed <= historic.speed + 0.02) return;
    injectAuxiliaryExchange([
      ['THREVE', `SPEED RECORD! ${event.hit.racerName} flashes through ${event.hit.trapName} at ${event.hit.speed.toFixed(2)} metres per second!`],
      ["SIX'T", `${(event.hit.speed - historic.speed).toFixed(2)} metres per second above the previous championship trap record by ${historic.racerName}.`],
      ['NOINE', currentCircuit.id === 'ledger-larry-500' ? 'Expedited.' : 'Rather brisk.']
    ], 'sector');
  });
}

function injectAuxiliaryExchange(
  lines: Array<[BroadcastMessage['speaker'], string]>,
  type: BroadcastMessage['type'] = 'opening'
) {
  const sequenceId = ++auxiliarySequence;
  const now = performance.now();
  lines.forEach(([speaker, text], lineIndex) => {
    broadcastHistory.push({
      speaker,
      text,
      type,
      time: now,
      sequenceId,
      lineIndex,
      lineCount: lines.length
    });
  });
  broadcastHistory = broadcastHistory.slice(-3);
  renderBroadcastHistory();
}

function renderPodium(snapshot: RaceSnapshot) {
  if (weekendPhase !== 'race') return;
  const podium = snapshot.standings.filter((standing) => standing.finished).slice(0, 3);
  if (!podium.length) return;

  const first = podium[0];
  const second = podium[1];
  const third = podium[2];
  const card = (standing: typeof first | undefined, place: number, className: string) => standing
    ? `<div class="podium-place ${className}" style="--racer-accent:${standing.accent}">
        <span>P${place}</span>
        <b>${escapeHtml(standing.code)}</b>
        <strong>${escapeHtml(standing.name)}</strong>
        <small>${standing.finishTime !== undefined ? `${standing.finishTime.toFixed(3)}s` : 'DNF'}</small>
      </div>`
    : `<div class="podium-place ${className}"><span>P${place}</span><b>—</b><strong>NO FINISHER</strong></div>`;

  podiumTrophyNameEl.textContent = currentCircuit.broadcast?.trophy ?? 'PARALLAX GRAN PRIX TROPHY';
  podiumSubEl.textContent = `${eventTitle} · WINNER ${first.code} · RESULT RECEIPTED`;
  podiumGridEl.innerHTML = `${card(second, 2, 'second')}${card(first, 1, 'first')}${card(third, 3, 'third')}`;
  podiumEl.classList.add('visible');

  injectAuxiliaryExchange([
    ['THREVE', `${first.name} WINS ${eventTitle}! TO THE PODIUM!`],
    ["SIX'T", `Official top three: ${podium.map((standing) => `${standing.code} P${standing.place}`).join(', ')}. The feature-race receipt is authoritative.`],
    ['NOINE', currentCircuit.id === 'ledger-larry-500' ? 'Award the carbon copy.' : 'Quite.']
  ], 'winner');
}

function hidePodium() {
  podiumEl.classList.remove('visible');
}

function flashMarshal(line: string) {
  if (marshalFlashTimer) window.clearTimeout(marshalFlashTimer);
  const racer = RACERS.find((candidate) => line.toLowerCase().includes(candidate.name.toLowerCase()));
  marshalStatusEl.textContent = `RECOVERY MARSHAL · ACTIVE · ${racer?.code ?? 'FIELD'}`;
  marshalStatusEl.classList.add('active');
  marshalFlashTimer = window.setTimeout(() => {
    marshalStatusEl.textContent = 'RECOVERY MARSHAL · STANDBY';
    marshalStatusEl.classList.remove('active');
  }, 3200);
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

function refreshHistoricalContext() {
  historicalRecords = season.getCircuitRecords(currentCircuit.id);
  careerAtGreen = season.getCareerStats();
}

function implicationCompact(implications: ReturnType<SeasonManager['getChampionshipImplications']>) {
  if (implications.baseline) return 'BASELINE';
  if (!implications.leader || !implications.challenger) return '—';
  return implications.leadInPlay
    ? `${implications.challenger.code} -${implications.gap} TO ${implications.leader.code} · LEAD IN PLAY`
    : `${implications.leader.code} +${implications.gap} · CONTROL`;
}

function healthCode(state: string) {
  if (state === 'FINISHED') return 'FIN';
  if (state === 'RECOVERED') return 'REC';
  if (state === 'STALLED') return 'STALL';
  return state;
}

function healthPriority(state: string) {
  if (state === 'DNF') return 5;
  if (state === 'STALLED') return 4;
  if (state === 'RECOVERED') return 3;
  if (state === 'WATCH') return 2;
  return 0;
}

function shortSector(name: string) {
  return name.split(' ').map((part) => part.slice(0, 4)).join(' ');
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
