import './styles.css';
import { RaceEngine, type BroadcastMessage, type RaceSnapshot } from './game/RaceEngine';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app root');

app.innerHTML = `
  <main class="shell">
    <section class="viewport" id="viewport">
      <div class="brand">
        <div class="eyebrow">PARALLAX FIELD THEORY SPORTS</div>
        <h1>PARALLAX <span>GRAN PRIX</span></h1>
        <p>BATTLECASE CIRCUIT · FIRST PLAYABLE</p>
      </div>

      <div class="countdown" id="countdown" aria-live="assertive"></div>

      <div class="hud hud-left">
        <div class="hud-label">RACE CONTROL</div>
        <div class="controls">
          <button id="start">START RACE</button>
          <button id="reset" class="secondary">RESET</button>
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
        </div>
      </div>

      <div class="hud hud-right">
        <div class="hud-label">LIVE STANDINGS</div>
        <ol class="standings" id="standings"></ol>
      </div>

      <div class="broadcast">
        <div class="brbc-mark">
          <b>BRBC</b>
          <span>THREVE · SIX'T · NOINE</span>
        </div>
        <div class="broadcast-copy">
          <div class="speaker" id="speaker">NOINE</div>
          <div class="line" id="line">Quite.</div>
        </div>
      </div>

      <div class="footer-tag">GRAVITY IS OPTIONAL. <i>◇</i> GLORY IS EVERYTHING.</div>
    </section>
  </main>
`;

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const startButton = document.querySelector<HTMLButtonElement>('#start')!;
const resetButton = document.querySelector<HTMLButtonElement>('#reset')!;
const applySeedButton = document.querySelector<HTMLButtonElement>('#apply-seed')!;
const seedInput = document.querySelector<HTMLInputElement>('#seed')!;
const stateEl = document.querySelector<HTMLElement>('#state')!;
const timeEl = document.querySelector<HTMLElement>('#time')!;
const leaderEl = document.querySelector<HTMLElement>('#leader')!;
const countdownEl = document.querySelector<HTMLElement>('#countdown')!;
const standingsEl = document.querySelector<HTMLOListElement>('#standings')!;
const speakerEl = document.querySelector<HTMLElement>('#speaker')!;
const lineEl = document.querySelector<HTMLElement>('#line')!;

const query = new URLSearchParams(window.location.search);
const querySeed = Number(query.get('seed'));
const initialSeed = Number.isFinite(querySeed) && querySeed !== 0
  ? Math.abs(Math.trunc(querySeed))
  : Math.floor(Date.now() % 1_000_000_000);

seedInput.value = String(initialSeed);

const engine = new RaceEngine(viewport, {
  seed: initialSeed,
  onSnapshot: renderSnapshot,
  onBroadcast: renderBroadcast
});

startButton.addEventListener('click', () => engine.startRace());
resetButton.addEventListener('click', () => engine.resetRace());
applySeedButton.addEventListener('click', applySeed);
seedInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') applySeed();
});

function applySeed() {
  const value = Math.abs(Math.trunc(Number(seedInput.value))) || 369;
  seedInput.value = String(value);
  engine.setSeed(value);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('seed', String(value));
  history.replaceState({}, '', nextUrl);
}

function renderSnapshot(snapshot: RaceSnapshot) {
  stateEl.textContent = snapshot.state.toUpperCase();
  timeEl.textContent = snapshot.elapsed.toFixed(2);
  leaderEl.textContent = snapshot.leader?.name ?? '—';
  seedInput.value = String(snapshot.seed);

  countdownEl.textContent = snapshot.countdown > 0 ? String(snapshot.countdown) : '';
  countdownEl.classList.toggle('visible', snapshot.countdown > 0);

  startButton.textContent = snapshot.state === 'finished' ? 'RACE AGAIN' : 'START RACE';
  startButton.disabled = snapshot.state === 'countdown' || snapshot.state === 'running';

  standingsEl.innerHTML = snapshot.standings.map((standing) => {
    const time = standing.finished && standing.finishTime !== undefined
      ? `${standing.finishTime.toFixed(2)}s`
      : `${Math.round(standing.progress * 100)}%`;
    return `
      <li class="standing ${standing.place === 1 ? 'leader-row' : ''}">
        <b>${standing.place}</b>
        <span><strong>${escapeHtml(standing.name)}</strong><small>${escapeHtml(standing.team)}</small></span>
        <em>${time}</em>
      </li>
    `;
  }).join('');
}

function renderBroadcast(message: BroadcastMessage) {
  speakerEl.textContent = message.speaker;
  lineEl.textContent = message.text;
  lineEl.parentElement?.classList.remove('pulse');
  requestAnimationFrame(() => lineEl.parentElement?.classList.add('pulse'));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
