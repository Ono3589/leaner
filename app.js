/* ============================================================
   Leaner — App-Logik
   Aufbau:  1) State   2) Gamification   3) Feedback (FX)
            4) Router  5) Screens        6) Timer  7) Coach
   ============================================================ */

/* ------------------------------------------------------------
   1) STATE
------------------------------------------------------------ */

const KEY = 'leaner.state.v1';

const DEFAULT_STATE = {
  xpTotal: 0,
  streak: 0,
  bestStreak: 0,
  freezes: 2,
  lastActiveDay: null,
  lastStreakDay: null,
  todayKey: null,
  doneToday: [],
  fxDailyBonus: false,
  // Zähler für Badges
  totalDone: 0,
  cooked: 0,
  fasts: 0,
  mindful: 0,
  workouts: 0,
  perfectDays: 0,
  comebacks: 0,
  coachAsks: 0,
  recipesViewed: 0,
  unlocked: [],
  // Fasten
  fastProtocol: 'f2',
  fastStart: null,
  // Einstellungen
  gentleMode: true,
  reduceMotion: false,
  chat: [],
  savedAt: null
};

/* Frische Kopie inklusive Arrays — ein flaches Spread würde die Arrays
   aus DEFAULT_STATE teilen und sie beim Zurücksetzen mit-verändern. */
function freshState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    return { ...freshState(), ...JSON.parse(raw) };
  } catch (e) {
    return freshState();
  }
}

function save() {
  S.savedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* Privatmodus */ }
  queueCloudPush();
}

/* ------------------------------------------------------------
   Sync
   localStorage ist die Wahrheit für den Moment, die Cloud die
   Wahrheit über Geräte hinweg. Gespeichert wird gedrosselt, damit
   nicht jedes Rendern eine Anfrage auslöst.
------------------------------------------------------------ */

let pushTimer = null;
let syncState = 'idle';   // idle | ok | off

function queueCloudPush() {
  if (!Cloud.sb || !Cloud.user) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(flushCloudPush, 1500);
}

async function flushCloudPush() {
  if (!Cloud.sb || !Cloud.user) return;
  clearTimeout(pushTimer);
  try {
    await Cloud.push(S);
    syncState = 'ok';
  } catch (e) {
    syncState = 'off';
    console.warn('Sync fehlgeschlagen:', e.message || e);
  }
}

async function pullAndMerge() {
  try {
    const row = await Cloud.pull();
    if (row && row.state && Object.keys(row.state).length) {
      const remoteNewer = !S.savedAt || new Date(row.updated_at) > new Date(S.savedAt);
      S = mergeState(S, row.state, remoteNewer);
    }
    await Cloud.push(S);
    syncState = 'ok';
  } catch (e) {
    syncState = 'off';
    console.warn('Erstes Laden aus der Cloud fehlgeschlagen:', e.message || e);
  }
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}

/* ------------------------------------------------------------
   Datums-Helfer
------------------------------------------------------------ */

function dayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daysBetween(a, b) {
  const pa = new Date(a + 'T00:00:00'), pb = new Date(b + 'T00:00:00');
  return Math.round((pb - pa) / 86400000);
}
function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Noch wach';
  if (h < 11) return 'Guten Morgen';
  if (h < 14) return 'Mahlzeit';
  if (h < 18) return 'Guten Nachmittag';
  if (h < 22) return 'Guten Abend';
  return 'Späte Stunde';
}

/* ------------------------------------------------------------
   Tageswechsel + Streak-Logik
   Kernregel (ADHS-freundlich): Ein verpasster Tag verbraucht
   automatisch einen Streak-Schutz statt den Streak zu killen.
------------------------------------------------------------ */

function rollDay() {
  const today = dayKey();
  if (S.todayKey === today) return;

  if (S.lastActiveDay) {
    const gap = daysBetween(S.lastActiveDay, today);
    if (gap === 1) {
      // gestern aktiv — Streak läuft weiter
    } else if (gap === 2 && S.freezes > 0) {
      S.freezes--;
      queueToast('Streak-Schutz eingesetzt — dein Streak lebt', 'shield');
    } else if (gap > 1) {
      if (S.streak >= 3) S.comebacks++;
      S.streak = 0;
    }
  }

  S.todayKey = today;
  S.doneToday = [];
  S.fxDailyBonus = false;
  save();
}

/* Quests des Tages — deterministisch aus dem Datum abgeleitet,
   damit sie sich beim Reload nicht ändern. */
function todayQuests() {
  const key = S.todayKey || dayKey();
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;

  // xorshift32 — deterministisch, ohne Präzisionsverlust bei großen Faktoren
  const rand = () => {
    seed ^= seed << 13; seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= seed << 5;  seed >>>= 0;
    return seed;
  };
  if (seed === 0) seed = 0x9e3779b9;

  const pool = DATA.questPool.filter((q) => q.id !== 'q_water');
  const picked = [];
  const used = new Set();
  let guard = 0;
  while (picked.length < 4 && used.size < pool.length && guard++ < 200) {
    const i = rand() % pool.length;
    if (!used.has(i)) { used.add(i); picked.push(pool[i]); }
  }
  // Notnagel, falls der Zufall nicht genug Treffer liefert
  for (let i = 0; picked.length < 4 && i < pool.length; i++) {
    if (!picked.includes(pool[i])) picked.push(pool[i]);
  }
  return [DATA.questPool.find((q) => q.id === 'q_water'), ...picked];
}

/* ------------------------------------------------------------
   2) GAMIFICATION
------------------------------------------------------------ */

function levelInfo(xp) {
  let level = 1, need = 100, rem = xp;
  while (rem >= need) { rem -= need; level++; need = Math.round(need * 1.25 / 5) * 5; }
  return { level, into: rem, need, pct: Math.min(100, Math.round((rem / need) * 100)) };
}

function levelName(l) {
  return DATA.levelNames[Math.min(l - 1, DATA.levelNames.length - 1)];
}

function stats() {
  const li = levelInfo(S.xpTotal);
  return { ...S, level: li.level };
}

function addXP(amount, label) {
  const before = levelInfo(S.xpTotal).level;
  S.xpTotal += amount;
  const after = levelInfo(S.xpTotal).level;

  S.lastActiveDay = S.todayKey;
  S.totalDone++;
  save();

  toast(`+${amount} XP · ${label}`, 'check');
  burst();
  haptic(12);
  bumpChips();

  if (after > before) {
    setTimeout(() => {
      toast(`Level ${after} — ${levelName(after)}`, 'arrowUp');
      burst(120);
      haptic([20, 60, 30]);
    }, 700);
  }
  checkBadges();
  refreshChrome();
}

function completeQuest(id, xp, label) {
  if (S.doneToday.includes(id)) return false;
  S.doneToday.push(id);

  const quests = todayQuests();
  const allQuestIds = quests.map((q) => q.id);
  const doneQuests = allQuestIds.filter((q) => S.doneToday.includes(q)).length;

  // Streak zählt ab 3 erledigten Dingen an einem Tag
  if (doneQuests === 3 || (doneQuests < 3 && S.doneToday.length === 3)) {
    if (S.lastStreakDay !== S.todayKey) {
      S.streak++;
      S.lastStreakDay = S.todayKey;
      S.bestStreak = Math.max(S.bestStreak, S.streak);
      if (S.freezes < 2 && S.streak % 7 === 0) S.freezes++;
      setTimeout(() => { toast(`Streak: ${S.streak} Tage`, 'flame'); burst(90); }, 1200);
    }
  }
  if (doneQuests === allQuestIds.length && !S.fxDailyBonus) {
    S.fxDailyBonus = true;
    S.perfectDays++;
    setTimeout(() => { toast('Perfekter Tag — Bonus 50 XP', 'target'); S.xpTotal += 50; save(); refreshChrome(); burst(150); }, 1900);
  }

  if (xp > 0) {
    addXP(xp, label);
  } else {
    // XP wurde schon separat vergeben (z. B. über einen Timer)
    S.lastActiveDay = S.todayKey;
    save(); refreshChrome();
  }
  return true;
}

function checkBadges() {
  const s = stats();
  DATA.badges.forEach((b) => {
    if (!S.unlocked.includes(b.id) && b.test(s)) {
      S.unlocked.push(b.id);
      save();
      setTimeout(() => { toast(`Badge: ${b.name}`, b.icon); haptic(20); }, 400);
    }
  });
}

/* ------------------------------------------------------------
   3) FEEDBACK — Toast, Konfetti, Haptik
------------------------------------------------------------ */

let toastQueue = [];
function queueToast(msg, kind) { toastQueue.push([msg, kind]); }
function flushToasts() { toastQueue.forEach(([m, k], i) => setTimeout(() => toast(m, k), i * 500)); toastQueue = []; }

/* toast('Text', 'iconName') — der zweite Parameter ist optional. */
function toast(msg, iconName) {
  const el = document.createElement('div');
  el.className = 'toast';
  const label = document.createElement('span');
  label.textContent = msg;
  if (iconName) el.innerHTML = icon(iconName);
  el.appendChild(label);
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function haptic(pattern) {
  if (S.reduceMotion) return;
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
}

/* Marke, Tab-Bar und Chip-Icons einmalig aus dem Icon-Set aufbauen,
   damit Pfade nur an einer Stelle gepflegt werden. */
const TABS = [
  { id: 'home',    icon: 'home',    label: 'Heute' },
  { id: 'food',    icon: 'bowl',    label: 'Essen' },
  { id: 'focus',   icon: 'target',  label: 'Fokus' },
  { id: 'coach',   icon: 'message', label: 'Coach' },
  { id: 'profile', icon: 'user',    label: 'Profil' }
];

function paintShell() {
  document.getElementById('brandMark').innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS.mark}"/></svg>`;
  document.getElementById('streakIco').innerHTML = icon('flame');
  document.getElementById('levelIco').innerHTML = icon('chart');
  document.getElementById('tabbar').innerHTML = TABS.map((t) =>
    `<button class="tab" data-tab="${t.id}" role="tab">${icon(t.icon)}<span>${t.label}</span></button>`
  ).join('');
}

function bumpChips() {
  ['streakChip', 'levelChip'].forEach((id) => {
    const el = document.getElementById(id);
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  });
}

/* Konfetti */
const fx = document.getElementById('fx');
const ctx = fx.getContext('2d');
let particles = [];
let rafId = null;

function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  fx.width = innerWidth * dpr;
  fx.height = innerHeight * dpr;
  fx.style.width = innerWidth + 'px';
  fx.style.height = innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
sizeCanvas();
addEventListener('resize', sizeCanvas);

/* Farben kommen aus den CSS-Variablen — damit passt das Feedback
   automatisch zu Hell- und Dunkelmodus. */
function confettiColors() {
  const cs = getComputedStyle(document.documentElement);
  const list = ['--food', '--move', '--mind', '--fast']
    .map((v) => cs.getPropertyValue(v).trim())
    .filter(Boolean);
  return list.length ? list : ['#7FB79A'];
}

function burst(count = 34) {
  if (S.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = confettiColors();
  const cx = innerWidth / 2, cy = innerHeight * 0.34;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 2.5 + Math.random() * 6;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.5,
      w: 3 + Math.random() * 3, h: 3 + Math.random() * 3,
      rot: Math.random() * Math.PI, vr: (Math.random() - .5) * .25,
      life: 1, color: colors[(Math.random() * colors.length) | 0]
    });
  }
  if (!rafId) rafId = requestAnimationFrame(tickFx);
}

function tickFx() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.vy += 0.28; p.vx *= 0.99;
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    p.life -= 0.012;
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });
  if (particles.length) { rafId = requestAnimationFrame(tickFx); }
  else { ctx.clearRect(0, 0, innerWidth, innerHeight); rafId = null; }
}

/* ------------------------------------------------------------
   Sheet
------------------------------------------------------------ */

const sheet = document.getElementById('sheet');
const sheetBody = document.getElementById('sheetBody');

function openSheet(html) {
  sheetBody.innerHTML = html;
  sheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  sheet.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  stopBreath();
}
sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close-sheet]')) closeSheet(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

/* ------------------------------------------------------------
   4) ROUTER
------------------------------------------------------------ */

const view = document.getElementById('view');
let currentTab = 'home';

const SCREENS = {
  home: renderHome,
  food: renderFood,
  focus: renderFocus,
  coach: renderCoach,
  profile: renderProfile
};

function go(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  view.innerHTML = '';
  view.classList.remove('viewIn');
  SCREENS[tab]();
  view.scrollIntoView({ block: 'start' });
  window.scrollTo(0, 0);
  location.hash = tab;
}

document.getElementById('tabbar').addEventListener('click', (e) => {
  const t = e.target.closest('.tab');
  if (!t) return;
  haptic(8);
  go(t.dataset.tab);
});

function refreshChrome() {
  document.getElementById('streakVal').textContent = S.streak;
  document.getElementById('levelVal').textContent = levelInfo(S.xpTotal).level;
  save();
}

/* ------------------------------------------------------------
   5) SCREENS
------------------------------------------------------------ */

function ringSvg(pct, size = 92, stroke = 5) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}">
    <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
    <circle class="fill" cx="${size / 2}" cy="${size / 2}" r="${r}"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/>
  </svg>`;
}

/* ---------- HEUTE ---------- */

function renderHome() {
  const quests = todayQuests();
  const done = quests.filter((q) => S.doneToday.includes(q.id)).length;
  const pct = Math.round((done / quests.length) * 100);
  const li = levelInfo(S.xpTotal);

  const nudge = done === 0
    ? 'Fang mit dem Glas Wasser an. 30 Sekunden.'
    : done < quests.length
      ? `Noch ${quests.length - done} — jedes einzelne zählt.`
      : 'Alles erledigt. Heute läuft.';

  view.innerHTML = `
    <div class="section">
      <div class="hero">
        <div class="ring">
          ${ringSvg(pct)}
          <div class="ring-label">
            <div class="ring-num">${done}/${quests.length}</div>
            <div class="ring-cap">Heute</div>
          </div>
        </div>
        <div class="grow hero-copy">
          <h2>${greeting()}, Onofrio</h2>
          <p>${nudge}</p>
          <div class="xpbar"><i style="width:${li.pct}%"></i></div>
          <div class="tiny faint" style="margin-top:6px">
            Level ${li.level} · ${levelName(li.level)} · noch ${li.need - li.into} XP
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3 class="section-title">Deine 5 heute</h3>
        <span class="tiny faint">${S.freezes} Schutz übrig</span>
      </div>
      <div class="stack" id="questList">
        ${quests.map(questHtml).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h3 class="section-title">Schnellstart</h3></div>
      <div class="quick-grid">
        <button class="quick" data-quick="fast">
          ${icon('hourglass')}
          <span><span class="quick-label">Fasten</span><span class="quick-sub">${S.fastStart ? 'läuft gerade' : 'Timer starten'}</span></span>
        </button>
        <button class="quick" data-quick="breath">
          ${icon('wind')}
          <span><span class="quick-label">Durchatmen</span><span class="quick-sub">3 Min · 15 XP</span></span>
        </button>
        <button class="quick" data-quick="move">
          ${icon('bolt')}
          <span><span class="quick-label">Bewegen</span><span class="quick-sub">4 Min · 15 XP</span></span>
        </button>
        <button class="quick" data-quick="eat">
          ${icon('utensils')}
          <span><span class="quick-label">Was essen?</span><span class="quick-sub">unter 10 Min</span></span>
        </button>
      </div>
    </div>

    ${S.streak === 0 && S.bestStreak >= 3 ? `
    <div class="section">
      <div class="note">
        <b>Streak bei Null — na und.</b><br>
        Dein Rekord (${S.bestStreak} Tage) bleibt. Die einzige Regel, die zählt:
        nie zweimal hintereinander auslassen. Mach jetzt eine Sache.
      </div>
    </div>` : ''}

    <div class="section">
      <div class="note">
        <b>Warum nur fünf Dinge?</b><br>
        Lange Listen führen bei ADHS oft dazu, dass gar nichts passiert. Fünf sind überschaubar,
        drei reichen für den Streak — und der Rest ist Bonus, kein Versagen.
      </div>
    </div>
  `;

  view.querySelector('#questList').addEventListener('click', (e) => {
    const el = e.target.closest('.quest');
    if (!el || el.classList.contains('done')) return;
    const q = DATA.questPool.find((x) => x.id === el.dataset.id);
    el.classList.add('done', 'just-done');
    completeQuest(q.id, q.xp, q.title);
    setTimeout(renderHome, 900);
  });

  view.querySelectorAll('[data-quick]').forEach((b) => {
    b.addEventListener('click', () => {
      haptic(8);
      const k = b.dataset.quick;
      if (k === 'fast') go('focus');
      if (k === 'breath') { go('focus'); setTimeout(() => openMindful(DATA.mindful[0]), 260); }
      if (k === 'move') { go('focus'); setTimeout(() => openMovement(DATA.movement[0]), 260); }
      if (k === 'eat') { go('food'); setTimeout(() => { activeFilter = 'Unter 10 Min'; renderFood(); }, 260); }
    });
  });

  refreshChrome();
}

function questHtml(q) {
  const done = S.doneToday.includes(q.id);
  return `<button class="item quest ${done ? 'done' : ''}" data-id="${q.id}">
    <span class="item-ico ${q.cls}">${icon(q.icon)}</span>
    <span class="grow">
      <div class="item-title">${q.title}</div>
      <div class="item-meta">${q.meta}</div>
    </span>
    <span class="xp-tag">+${q.xp}</span>
    <span class="check">${icon('check')}</span>
  </button>`;
}

/* ---------- ESSEN ---------- */

let activeFilter = 'Alle';

function matchesFilter(r, f) {
  if (f === 'Alle') return true;
  if (f === 'Unter 10 Min') return r.minutes <= 10;
  if (f === 'High Protein') return r.protein >= 26;
  if (f === 'Kein Kochen') return r.dishes <= 1 && r.minutes <= 5;
  if (f === 'Meal-Prep') return r.tags.includes('Meal-Prep');
  if (f === 'Vegan') return r.tags.some((t) => t.startsWith('Vegan'));
  return true;
}

function renderFood() {
  const list = DATA.recipes.filter((r) => matchesFilter(r, activeFilter));

  view.innerHTML = `
    <div class="section">
      <h1 class="screen-title">Essen</h1>
      <p class="screen-sub">Alles unter 30 Minuten. Kein Kalorienzählen.</p>
    </div>

    <div class="section">
      <div class="filters">
        ${DATA.recipeFilters.map((f) => `<button class="filter ${f === activeFilter ? 'active' : ''}" data-f="${f}">${f}</button>`).join('')}
      </div>
    </div>

    <div class="section" style="margin-top:14px">
      <div class="section-head">
        <h3 class="section-title">${list.length} Rezept${list.length === 1 ? '' : 'e'}</h3>
        <span class="tiny faint">sortiert nach Aufwand</span>
      </div>
      <div class="stack">
        ${list.sort((a, b) => a.minutes - b.minutes).map(recipeHtml).join('') || '<div class="card muted small">Nichts gefunden — anderen Filter probieren.</div>'}
      </div>
    </div>

    <div class="section">
      <div class="note">
        <b>Der Trick heißt Rotation, nicht Vielfalt.</b><br>
        Fünf bis sieben Gerichte, die du im Schlaf kannst, schlagen jede Rezeptsammlung.
        Jede neue Entscheidung ist ein Punkt, an dem der Plan kippen kann.
      </div>
    </div>
  `;

  view.querySelectorAll('.filter').forEach((b) => b.addEventListener('click', () => {
    activeFilter = b.dataset.f; haptic(6); renderFood();
  }));

  view.querySelectorAll('.recipe').forEach((b) => b.addEventListener('click', () => {
    openRecipe(DATA.recipes.find((r) => r.id === b.dataset.id));
  }));
}

function recipeHtml(r) {
  return `<button class="item recipe" data-id="${r.id}">
    <span class="item-ico i-food">${icon(r.icon)}</span>
    <span class="grow">
      <div class="item-title">${r.name}</div>
      <div class="item-meta">${r.hook}</div>
      <div class="tags">
        <span class="tag">${icon('clock')}${r.minutes} Min</span>
        <span class="tag tag-hero">${r.protein} g Protein</span>
        <span class="tag">${r.dishes === 0 ? 'kein Abwasch' : r.dishes + '× Abwasch'}</span>
      </div>
    </span>
  </button>`;
}

function openRecipe(r) {
  S.recipesViewed++; save(); checkBadges();

  openSheet(`
    <div class="sheet-ico">${icon(r.icon)}</div>
    <h2 class="sheet-title">${r.name}</h2>
    <p class="muted small" style="margin:0 0 12px">${r.hook}</p>

    <div class="stat-grid" style="margin-bottom:16px">
      <div class="stat"><div class="stat-num">${r.minutes}</div><div class="stat-cap">MINUTEN</div></div>
      <div class="stat"><div class="stat-num">${r.protein}g</div><div class="stat-cap">PROTEIN</div></div>
      <div class="stat"><div class="stat-num">${r.dishes}</div><div class="stat-cap">ABWASCH</div></div>
    </div>

    <div class="note" style="margin-bottom:18px">${r.why}</div>

    <div class="section-head"><h3 class="section-title">Zutaten</h3></div>
    <div style="margin-bottom:16px">
      ${r.ingredients.map((i) => `<div class="ing"><span class="ing-dot"></span><span>${i}</span></div>`).join('')}
    </div>

    <div class="section-head"><h3 class="section-title">So geht's</h3></div>
    <div style="margin-bottom:16px">
      ${r.steps.map((s, i) => `<div class="step"><span class="step-n">${i + 1}</span><span>${s}</span></div>`).join('')}
    </div>

    <div class="card small muted" style="margin-bottom:18px">
      <b style="color:var(--text)">Wenn's heute nicht geht:</b><br>${r.swap}
    </div>

    <button class="btn btn-primary btn-block" id="cookedBtn">Gekocht · 30 XP</button>
    <div class="tiny faint center" style="margin-top:10px">Zählt auch, wenn du abgekürzt hast.</div>
  `);

  document.getElementById('cookedBtn').addEventListener('click', () => {
    S.cooked++;
    addXP(30, 'Gekocht: ' + r.name);
    closeSheet();
  });
}

/* ---------- FOKUS ---------- */

function renderFocus() {
  const proto = DATA.fasting.find((f) => f.id === S.fastProtocol);

  view.innerHTML = `
    <div class="section">
      <h1 class="screen-title">Fokus</h1>
      <p class="screen-sub">Fasten, Atmen, Bewegen — alles kurz genug, dass du anfängst.</p>
    </div>

    <div class="section">
      <div class="section-head">
        <h3 class="section-title">Fasten</h3>
        <button class="section-action" id="protoBtn">${proto.name} ändern</button>
      </div>
      <div class="card" style="padding:18px">
        <div class="timer-wrap">
          <div class="timer-ring" id="fastRing"></div>
        </div>
        <div id="fastBtns" style="margin-top:14px"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h3 class="section-title">Mindfulness</h3></div>
      <div class="stack">
        ${DATA.mindful.map((m) => tileHtml(m, 'mind')).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h3 class="section-title">Bewegung</h3></div>
      <div class="stack">
        ${DATA.movement.map((m) => tileHtml(m, 'move')).join('')}
      </div>
    </div>
  `;

  view.querySelector('#protoBtn').addEventListener('click', openProtocolPicker);
  view.querySelectorAll('[data-tile="mind"]').forEach((b) => b.addEventListener('click', () =>
    openMindful(DATA.mindful.find((m) => m.id === b.dataset.id))));
  view.querySelectorAll('[data-tile="move"]').forEach((b) => b.addEventListener('click', () =>
    openMovement(DATA.movement.find((m) => m.id === b.dataset.id))));

  drawFast();
}

function tileHtml(m, kind) {
  return `<button class="item" data-tile="${kind}" data-id="${m.id}">
    <span class="item-ico ${kind === 'mind' ? 'i-mind' : 'i-move'}">${icon(m.icon)}</span>
    <span class="grow">
      <div class="item-title">${m.name}</div>
      <div class="item-meta">${m.desc}</div>
    </span>
    <span class="xp-tag">${m.minutes} Min</span>
  </button>`;
}

/* --- Fasten-Timer (überlebt Reload über Zeitstempel) --- */

let fastTick = null;

function drawFast() {
  const ring = document.getElementById('fastRing');
  const btns = document.getElementById('fastBtns');
  if (!ring) { clearInterval(fastTick); fastTick = null; return; }

  const proto = DATA.fasting.find((f) => f.id === S.fastProtocol);
  const target = proto.fastHours * 3600000;

  if (!S.fastStart) {
    ring.innerHTML = `
      ${timerRingSvg(0, 'fast')}
      <div class="timer-inner">
        <div class="timer-time">${proto.fastHours}h</div>
        <div class="timer-state">${proto.name} · ${proto.label}</div>
      </div>`;
    btns.innerHTML = `
      <button class="btn btn-primary btn-block" id="fastStart">Fasten starten</button>
      <div class="tiny faint center" style="margin-top:10px">${proto.desc}</div>`;
    document.getElementById('fastStart').addEventListener('click', () => {
      S.fastStart = Date.now(); save(); haptic(15);
      toast('Fasten läuft', 'hourglass');
      drawFast();
    });
    clearInterval(fastTick); fastTick = null;
    return;
  }

  const elapsed = Date.now() - S.fastStart;
  const pct = Math.min(100, (elapsed / target) * 100);
  const done = elapsed >= target;

  ring.innerHTML = `
    ${timerRingSvg(pct, done ? 'accent' : 'fast')}
    <div class="timer-inner">
      <div class="timer-time">${fmtDur(elapsed)}</div>
      <div class="timer-state">${done ? 'Geschafft' : 'von ' + proto.fastHours + ' Stunden'}</div>
      <div class="timer-note">${done ? 'Iss, wann du willst.' : phaseNote(elapsed / 3600000)}</div>
    </div>`;

  btns.innerHTML = `
    <button class="btn ${done ? 'btn-primary' : ''} btn-block" id="fastEnd">
      ${done ? 'Fasten abschließen · 40 XP' : 'Beenden · 20 XP'}
    </button>
    <div class="tiny faint center" style="margin-top:10px">
      ${done ? 'Sehr gut.' : 'Früher beenden ist okay. Du hast trotzdem gefastet.'}
    </div>`;

  document.getElementById('fastEnd').addEventListener('click', () => {
    S.fasts++; S.fastStart = null; save();
    addXP(done ? 40 : 20, done ? 'Fasten abgeschlossen' : 'Fasten beendet');
    drawFast();
  });

  if (!fastTick) fastTick = setInterval(drawFast, 1000);
}

function phaseNote(h) {
  if (h < 3) return 'Verdauung läuft noch.';
  if (h < 8) return 'Blutzucker stabilisiert sich.';
  if (h < 12) return 'Der Körper geht an die Reserven.';
  if (h < 16) return 'Fettverbrennung hochgefahren.';
  return 'Zellreinigung angelaufen.';
}

function fmtDur(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
               : `${m}:${String(s).padStart(2, '0')}`;
}

/* tone: 'fast' | 'mind' | 'move' | 'accent' — greift auf die CSS-Variablen zu,
   damit der Ring in Hell und Dunkel automatisch passt. */
function timerRingSvg(pct, tone) {
  const size = 210, stroke = 5, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 ${size} ${size}">
    <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
    <circle class="fill" cx="${size / 2}" cy="${size / 2}" r="${r}"
      style="stroke:var(--${tone})"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/>
  </svg>`;
}

function openProtocolPicker() {
  openSheet(`
    <h2 class="sheet-title">Fastenprotokoll</h2>
    <p class="muted small" style="margin:0 0 14px">Fang niedriger an, als du denkst. Die meisten steigen bei 16:8 aus, weil sie dort angefangen haben.</p>
    <div class="stack">
      ${DATA.fasting.map((f) => `
        <button class="item" data-proto="${f.id}">
          <span class="item-ico i-fast" style="font-size:12px;font-weight:600">${f.fastHours}h</span>
          <span class="grow">
            <div class="item-title">${f.name} · ${f.label}</div>
            <div class="item-meta">${f.desc}</div>
          </span>
          ${S.fastProtocol === f.id ? `<span class="check" style="background:var(--accent);border-color:var(--accent)">${icon('check')}</span>` : ''}
        </button>`).join('')}
    </div>
    <div class="note" style="margin-top:16px">
      Wenn Fasten deinen Fokus verschlechtert oder dich reizbar macht, geh eine Stufe zurück.
      Bei Vorerkrankungen, Essstörungen in der Vorgeschichte oder Schwangerschaft vorher ärztlich abklären.
    </div>
  `);
  sheetBody.querySelectorAll('[data-proto]').forEach((b) => b.addEventListener('click', () => {
    S.fastProtocol = b.dataset.proto; save(); closeSheet(); renderFocus();
    toast('Protokoll gewechselt');
  }));
}

/* --- Mindfulness --- */

// Ein gemeinsamer Timer-Slot für alles im Sheet — wird beim Schließen
// zuverlässig gestoppt, damit kein Timer im Hintergrund weiterläuft.
let breathTimer = null;

function stopBreath() { clearInterval(breathTimer); breathTimer = null; }

function openMindful(m) {
  stopBreath();
  const hasPattern = !!m.pattern;
  openSheet(`
    <div class="sheet-ico">${icon(m.icon)}</div>
    <h2 class="sheet-title">${m.name}</h2>
    <p class="muted small" style="margin:0 0 8px">${m.desc}</p>

    ${hasPattern ? `
      <div class="breath-orb" id="orb"></div>
      <div class="breath-cue" id="cue">Bereit?</div>
      <div class="tiny faint center" style="margin:6px 0 18px" id="breathLeft">${m.minutes} Minuten</div>
    ` : `
      <div class="timer-wrap"><div class="timer-ring" id="mindRing"></div></div>
    `}

    <button class="btn btn-primary btn-block" id="mindStart">${m.minutes} Min starten</button>
    <button class="btn btn-ghost btn-block" id="mindDone" style="margin-top:8px">Hab ich schon gemacht · ${m.xp} XP</button>
    <div class="tiny faint center" style="margin-top:10px">Auch eine Minute zählt. Wirklich.</div>
  `);

  let running = false, left = m.minutes * 60;

  const finish = () => {
    stopBreath();
    S.mindful++;
    addXP(m.xp, m.name);
    completeQuest('q_breath', 0, m.name);
    closeSheet();
  };

  document.getElementById('mindDone').addEventListener('click', finish);

  document.getElementById('mindStart').addEventListener('click', function () {
    if (running) { stopBreath(); running = false; this.textContent = 'Weiter'; return; }
    running = true;
    this.textContent = 'Pause';
    haptic(10);

    if (hasPattern) {
      const orb = document.getElementById('orb');
      const cue = document.getElementById('cue');
      const leftEl = document.getElementById('breathLeft');
      let phase = 0, phaseLeft = m.pattern[0];

      orb.style.transitionDuration = m.pattern[0] + 's';
      cue.textContent = m.cues[0];
      orb.classList.add('inhale');

      breathTimer = setInterval(() => {
        left--; phaseLeft--;
        leftEl.textContent = fmtDur(left * 1000) + ' übrig';
        if (phaseLeft <= 0) {
          phase = (phase + 1) % m.pattern.length;
          phaseLeft = m.pattern[phase];
          cue.textContent = m.cues[phase];
          orb.style.transitionDuration = m.pattern[phase] + 's';
          orb.classList.remove('inhale', 'exhale');
          if (m.cues[phase].includes('Ein')) orb.classList.add('inhale');
          else if (m.cues[phase].includes('aus')) orb.classList.add('exhale');
          haptic(6);
        }
        if (left <= 0) { toast('Fertig', 'check'); finish(); }
      }, 1000);
    } else {
      const ring = document.getElementById('mindRing');
      const total = m.minutes * 60;
      const paint = () => {
        ring.innerHTML = `${timerRingSvg(((total - left) / total) * 100, 'mind')}
          <div class="timer-inner">
            <div class="timer-time">${fmtDur(left * 1000)}</div>
            <div class="timer-state">läuft</div>
          </div>`;
      };
      paint();
      breathTimer = setInterval(() => {
        left--; paint();
        if (left <= 0) { toast('Fertig', 'check'); finish(); }
      }, 1000);
    }
  });

  if (!hasPattern) {
    document.getElementById('mindRing').innerHTML = `${timerRingSvg(0, 'mind')}
      <div class="timer-inner">
        <div class="timer-time">${m.minutes}:00</div>
        <div class="timer-state">bereit</div>
      </div>`;
  }
}

/* --- Bewegung --- */

function openMovement(w) {
  openSheet(`
    <div class="sheet-ico">${icon(w.icon)}</div>
    <h2 class="sheet-title">${w.name}</h2>
    <p class="muted small" style="margin:0 0 16px">${w.desc}</p>

    <div class="timer-wrap"><div class="timer-ring" id="moveRing"></div></div>

    <button class="btn btn-primary btn-block" id="moveStart" style="margin-top:14px">Timer starten</button>
    <button class="btn btn-ghost btn-block" id="moveDone" style="margin-top:8px">Erledigt · ${w.xp} XP</button>
    <div class="tiny faint center" style="margin-top:10px">Halbe Einheit zählt als ganze. Angefangen ist das Schwierige.</div>
  `);

  stopBreath();
  let left = w.minutes * 60;
  const ring = document.getElementById('moveRing');
  const total = left;

  const paint = () => {
    ring.innerHTML = `${timerRingSvg(((total - left) / total) * 100, 'move')}
      <div class="timer-inner">
        <div class="timer-time">${fmtDur(left * 1000)}</div>
        <div class="timer-state">${breathTimer ? 'läuft' : 'bereit'}</div>
      </div>`;
  };
  paint();

  const finish = () => {
    stopBreath();
    S.workouts++;
    addXP(w.xp, w.name);
    completeQuest('q_move', 0, w.name);
    closeSheet();
  };

  document.getElementById('moveDone').addEventListener('click', finish);
  document.getElementById('moveStart').addEventListener('click', function () {
    if (breathTimer) { stopBreath(); this.textContent = 'Weiter'; paint(); return; }
    this.textContent = 'Pause';
    haptic(10);
    breathTimer = setInterval(() => {
      left--; paint();
      if (left <= 0) { toast('Geschafft', 'check'); finish(); }
    }, 1000);
    paint();
  });
}

/* ---------- COACH ---------- */

function renderCoach() {
  if (!S.chat.length) S.chat = [{ role: 'ai', text: DATA.coachGreeting }];

  view.innerHTML = `
    <div class="section">
      <h1 class="screen-title">Coach</h1>
      <p class="screen-sub">Fragen direkt beantwortet — ohne Vorträge.</p>
    </div>
    <div class="section">
      <div class="suggestions" id="suggs">
        ${DATA.coachSuggestions.map((s) => `<button class="sugg">${s}</button>`).join('')}
      </div>
    </div>
    <div class="section chat" id="chat" style="margin-top:14px">
      ${S.chat.map(msgHtml).join('')}
    </div>
    <div style="height:70px"></div>
    <div class="composer">
      <textarea id="input" rows="1" placeholder="Frag mich was…" enterkeyhint="send"></textarea>
      <button class="send" id="sendBtn" aria-label="Senden">${icon('send')}</button>
    </div>
  `;

  const chat = document.getElementById('chat');
  const input = document.getElementById('input');

  const send = (text) => {
    text = (text || input.value).trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';

    S.chat.push({ role: 'me', text });
    chat.insertAdjacentHTML('beforeend', msgHtml({ role: 'me', text }));
    scrollChat();
    S.coachAsks++;
    save();
    checkBadges();

    const typing = document.createElement('div');
    typing.className = 'msg msg-ai';
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    chat.appendChild(typing);
    scrollChat();

    askCoach(text).catch(() => DATA.coachFallback).then((reply) => {
      typing.remove();
      S.chat.push({ role: 'ai', text: reply });
      save();
      chat.insertAdjacentHTML('beforeend', msgHtml({ role: 'ai', text: reply }));
      scrollChat();
      haptic(8);
    });
  };

  document.getElementById('sendBtn').addEventListener('click', () => send());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(110, input.scrollHeight) + 'px';
  });
  document.getElementById('suggs').addEventListener('click', (e) => {
    const b = e.target.closest('.sugg');
    if (b) send(b.textContent);
  });

  setTimeout(scrollChat, 60);
}

function msgHtml(m) {
  const html = m.text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/<br>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<br>/g, '$1');
  return `<div class="msg ${m.role === 'me' ? 'msg-me' : 'msg-ai'}">${html}</div>`;
}

function scrollChat() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

/* Echter Coach über die Edge Function, mit Rückfall auf die
   Regelantworten — damit die App auch offline oder bei einem
   Backend-Ausfall etwas Sinnvolles sagt. */
async function askCoach(text) {
  if (Cloud.sb && Cloud.user && navigator.onLine) {
    try {
      return await Cloud.coach(S.chat.slice(-12), coachContext());
    } catch (e) {
      console.warn('Coach nicht erreichbar:', e.message || e);
      return localCoachReply(text) +
        `\n\n<i>Das kam aus meinem Offline-Wissen, weil der KI-Coach gerade nicht antwortet:\n` +
        `${escapeHtml(e.message || 'unbekannter Fehler')}\n` +
        `Unter Profil → Verbindung prüfen siehst du, woran es liegt.</i>`;
    }
  }
  // Ohne Backend kurz warten, damit es sich nicht nach Autotext anfühlt
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 400));
  return localCoachReply(text);
}

function coachContext() {
  const quests = todayQuests();
  return {
    level: levelInfo(S.xpTotal).level,
    xpTotal: S.xpTotal,
    streak: S.streak,
    bestStreak: S.bestStreak,
    doneToday: quests.filter((q) => S.doneToday.includes(q.id)).length,
    fastProtocol: (DATA.fasting.find((f) => f.id === S.fastProtocol) || {}).name,
    fasting: !!S.fastStart,
    cooked: S.cooked,
    workouts: S.workouts,
    mindful: S.mindful,
    localTime: new Date().toLocaleString('de-DE', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
  };
}

/* Regelbasierte Ausweichantworten (data.js). */
function localCoachReply(text) {
  const rule = DATA.coachRules.find((r) => r.match.test(text));
  let base = rule ? rule.reply : DATA.coachFallback;

  // Kontext aus dem State — das macht den Coach persönlich
  if (rule && /streak/i.test(text) && S.bestStreak > 0) {
    base += `\n\n<i>Zur Einordnung: Dein Rekord liegt bei ${S.bestStreak} Tagen. Das hast du schon einmal gekonnt.</i>`;
  }
  if (!rule && S.doneToday.length === 0) {
    base += `\n\nÜbrigens: heute steht noch nichts auf deiner Liste. Ein Glas Wasser wären 5 XP in 30 Sekunden.`;
  }
  return base;
}

/* ---------- PROFIL ---------- */

function renderProfile() {
  const li = levelInfo(S.xpTotal);

  view.innerHTML = `
    <div class="section">
      <h1 class="screen-title">Profil</h1>
      <p class="screen-sub">Level ${li.level} · ${levelName(li.level)}</p>
    </div>

    <div class="section">
      <div class="hero">
        <div class="ring">
          ${ringSvg(li.pct)}
          <div class="ring-label">
            <div class="ring-num">${li.level}</div>
            <div class="ring-cap">Level</div>
          </div>
        </div>
        <div class="grow hero-copy">
          <h2>${S.xpTotal} XP</h2>
          <p>Noch ${li.need - li.into} XP bis Level ${li.level + 1}</p>
          <div class="xpbar"><i style="width:${li.pct}%"></i></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="stat-grid">
        <div class="stat"><div class="stat-num">${S.streak}</div><div class="stat-cap">STREAK</div></div>
        <div class="stat"><div class="stat-num">${S.bestStreak}</div><div class="stat-cap">REKORD</div></div>
        <div class="stat"><div class="stat-num">${S.freezes}</div><div class="stat-cap">SCHUTZ</div></div>
      </div>
      <div class="stat-grid" style="margin-top:9px">
        <div class="stat"><div class="stat-num">${S.cooked}</div><div class="stat-cap">GEKOCHT</div></div>
        <div class="stat"><div class="stat-num">${S.workouts}</div><div class="stat-cap">BEWEGT</div></div>
        <div class="stat"><div class="stat-num">${S.fasts}</div><div class="stat-cap">GEFASTET</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3 class="section-title">Badges</h3>
        <span class="tiny faint">${S.unlocked.length}/${DATA.badges.length}</span>
      </div>
      <div class="badge-grid">
        ${DATA.badges.map((b) => `
          <div class="badge ${S.unlocked.includes(b.id) ? 'unlocked' : 'locked'}" title="${b.name}">
            ${icon(S.unlocked.includes(b.id) ? b.icon : 'lock')}<span>${b.name}</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h3 class="section-title">Konto</h3></div>
      <div class="card">
        ${Cloud.user ? `
          <div class="acct" style="padding-bottom:13px;border-bottom:1px solid var(--line-soft)">
            <span class="acct-dot ${syncState === 'off' ? 'off' : ''}"></span>
            <span class="grow">
              <div style="font-weight:550;font-size:14.5px">${Cloud.user.email}</div>
              <div class="tiny faint">${syncState === 'off'
                ? 'Gerade offline — wird nachgeholt, sobald du wieder Netz hast'
                : 'Synchron auf allen deinen Geräten'}</div>
            </span>
          </div>
          <button class="btn btn-block" id="diagBtn" style="margin-top:12px">Verbindung prüfen</button>
          <button class="btn btn-ghost btn-block" id="logoutBtn" style="margin-top:6px">Abmelden</button>
        ` : `
          <div class="tiny muted">Kein Konto verbunden. Dein Fortschritt liegt nur auf diesem Gerät
          und geht verloren, wenn du die Browserdaten löschst.</div>
        `}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h3 class="section-title">Einstellungen</h3></div>
      <div class="card">
        <div class="toggle-row">
          <div class="grow">
            <div style="font-weight:620">Sanfter Modus</div>
            <div class="tiny faint">Keine Push-Erinnerungen, kein Shaming bei verpassten Tagen.</div>
          </div>
          <button class="switch ${S.gentleMode ? 'on' : ''}" data-set="gentleMode"></button>
        </div>
        <div class="toggle-row">
          <div class="grow">
            <div style="font-weight:620">Weniger Animation</div>
            <div class="tiny faint">Kein Konfetti, keine Vibration.</div>
          </div>
          <button class="switch ${S.reduceMotion ? 'on' : ''}" data-set="reduceMotion"></button>
        </div>
      </div>
    </div>

    <div class="section">
      <button class="btn btn-ghost btn-block" id="resetBtn" style="color:var(--text-faint)">Fortschritt zurücksetzen</button>
      <div class="tiny faint center" style="margin-top:14px;line-height:1.5">
        Leaner ersetzt keine ärztliche oder therapeutische Beratung.<br>
        ${Cloud.user
          ? 'Deine Daten liegen in deinem eigenen Konto und sind für niemanden sonst sichtbar.'
          : 'Alle Daten bleiben lokal auf diesem Gerät.'}
      </div>
    </div>
  `;

  view.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => {
    S[b.dataset.set] = !S[b.dataset.set];
    save(); haptic(8); renderProfile();
  }));

  const diag = document.getElementById('diagBtn');
  if (diag) diag.addEventListener('click', runDiagnostics);

  const logout = document.getElementById('logoutBtn');
  if (logout) logout.addEventListener('click', async () => {
    await flushCloudPush();
    await Cloud.signOut();
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = freshState();
    showGate('email');
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Wirklich alles zurücksetzen? XP, Streak und Badges gehen verloren.')) {
      S = freshState();
      save(); rollDay(); refreshChrome(); go('home');
    }
  });
}

/* ------------------------------------------------------------
   Selbsttest
   Läuft im angemeldeten Browser und geht die Kette Schritt für
   Schritt durch, damit man nicht raten muss, wo es klemmt.
------------------------------------------------------------ */

async function runDiagnostics() {
  openSheet(`
    <div class="sheet-ico">${icon('activity')}</div>
    <h2 class="sheet-title">Verbindung prüfen</h2>
    <p class="muted small" style="margin:0 0 16px">Einen Moment…</p>
    <div class="stack" id="diagList"></div>
  `);

  const steps = await Cloud.diagnose();
  const failed = steps.find((s) => !s.ok);

  sheetBody.innerHTML = `
    <div class="sheet-ico">${icon(failed ? 'target' : 'check')}</div>
    <h2 class="sheet-title">${failed ? 'Hier klemmt es' : 'Alles in Ordnung'}</h2>
    <p class="muted small" style="margin:0 0 16px">
      ${failed
        ? 'Der erste rot markierte Punkt ist die Ursache — alles danach hängt davon ab.'
        : 'Login, Datenbank und Coach antworten alle sauber.'}
    </p>
    <div class="stack">
      ${steps.map((s) => `
        <div class="item" style="align-items:flex-start">
          <span class="item-ico ${s.ok ? 'i-food' : 'i-move'}" style="margin-top:2px">
            ${icon(s.ok ? 'check' : 'plus')}
          </span>
          <span class="grow">
            <div class="item-title">${s.label}</div>
            <div class="item-meta" style="word-break:break-word">${escapeHtml(s.detail || '')}</div>
          </span>
        </div>`).join('')}
    </div>
    ${failed ? `<div class="note" style="margin-top:16px">
      Die Schrittnummern in den Meldungen beziehen sich auf <b>SETUP.md</b>.
    </div>` : ''}
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

/* ------------------------------------------------------------
   6) LOGIN
   Anmeldung per 6-stelligem Code statt Magic Link: Ein Link
   öffnet auf dem iPhone Safari und nicht die installierte App.
   Ein Code lässt sich abtippen, ohne die App zu verlassen.
------------------------------------------------------------ */

const gate = document.getElementById('gate');
const appEl = document.getElementById('app');

function showGate(step, email, message) {
  appEl.hidden = true;
  gate.hidden = false;

  if (CONFIG.AUTH_MODE === 'password') {
    const signup = step === 'signup';
    gate.innerHTML = gatePassword(signup, email, message);
    wireGatePassword(signup);
    return;
  }

  gate.innerHTML = step === 'code' ? gateCode(email, message) : gateEmail(message);
  wireGate(step, email);
}

function gateMark() {
  return `<div class="gate-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS.mark}"/></svg></div>`;
}

/* ---------- Passwort-Variante ---------- */

function gatePassword(signup, email, message) {
  return `<div class="gate-inner">
    ${gateMark()}
    <h1>${signup ? 'Konto anlegen' : 'Willkommen zurück'}</h1>
    <p>${signup
      ? 'Lass dir das Passwort von deinem Passwortmanager erzeugen und dort speichern — merken musst du es dir nicht.'
      : 'Melde dich an, damit dein Fortschritt auf iPhone und MacBook derselbe ist.'}</p>
    <input id="gEmail" type="email" inputmode="email" autocomplete="email"
           placeholder="du@beispiel.de" value="${email || ''}">
    <input id="gPass" type="password" enterkeyhint="go"
           autocomplete="${signup ? 'new-password' : 'current-password'}"
           placeholder="Passwort">
    <button class="btn btn-primary btn-block" id="gGo">${signup ? 'Konto anlegen' : 'Anmelden'}</button>
    <p class="gate-err" id="gErr">${message || ''}</p>
    <p class="gate-foot">
      <span class="gate-link" id="gSwitch">${signup
        ? 'Ich habe schon ein Konto'
        : 'Noch kein Konto? Jetzt anlegen'}</span>
    </p>
  </div>`;
}

function wireGatePassword(signup) {
  const email = document.getElementById('gEmail');
  const pass = document.getElementById('gPass');
  const btn = document.getElementById('gGo');
  const err = document.getElementById('gErr');
  const fail = (m) => { err.textContent = m; };

  (email.value ? pass : email).focus();

  const submit = async () => {
    const mail = email.value.trim();
    const pw = pass.value;
    if (!/^\S+@\S+\.\S+$/.test(mail)) return fail('Das sieht noch nicht nach einer E-Mail aus.');
    if (pw.length < 8) return fail('Mindestens 8 Zeichen. Lass es deinen Passwortmanager erzeugen.');

    btn.disabled = true;
    btn.textContent = 'Moment…';
    fail('');
    try {
      if (signup) await Cloud.signUpPassword(mail, pw);
      else await Cloud.signInPassword(mail, pw);
      await afterLogin();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = signup ? 'Konto anlegen' : 'Anmelden';
      fail(authError(e, signup));
    }
  };

  btn.addEventListener('click', submit);
  [email, pass].forEach((el) =>
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); }));
  document.getElementById('gSwitch').addEventListener('click', () =>
    showGate(signup ? 'signin' : 'signup', email.value.trim()));
}

/* Supabase-Meldungen sind englisch und technisch — hier in etwas
   übersetzt, mit dem man auch etwas anfangen kann. */
function authError(e, signup) {
  const m = (e && e.message ? e.message : '').toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'E-Mail oder Passwort stimmt nicht. Falls du noch kein Konto hast: unten anlegen.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Für diese E-Mail gibt es schon ein Konto. Meld dich einfach an.';
  }
  if (m.includes('password') && m.includes('short')) {
    return 'Das Passwort ist zu kurz.';
  }
  if (m.includes('confirm email') || m.includes('bestätigungsmail')) {
    return e.message;
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Keine Verbindung. Prüf dein Netz und versuch es nochmal.';
  }
  return e.message || (signup ? 'Anlegen hat nicht geklappt.' : 'Anmelden hat nicht geklappt.');
}

/* ---------- Code-Variante ---------- */

function gateEmail(message) {
  return `<div class="gate-inner">
    ${gateMark()}
    <h1>Willkommen bei leaner</h1>
    <p>Trag deine E-Mail ein. Du bekommst einen Zahlencode —
       kein Passwort, das du dir merken musst.</p>
    <input id="gEmail" type="email" inputmode="email" autocomplete="email"
           enterkeyhint="go" placeholder="du@beispiel.de">
    <button class="btn btn-primary btn-block" id="gSend">Code anfordern</button>
    <p class="gate-err" id="gErr">${message || ''}</p>
    <p class="gate-foot">Dein Fortschritt liegt dann auf deinem Konto und ist
       auf iPhone und MacBook derselbe.</p>
  </div>`;
}

function gateCode(email, message) {
  return `<div class="gate-inner">
    ${gateMark()}
    <h1>Code eingeben</h1>
    <p>Wir haben dir einen Code an <b>${email}</b> geschickt. Er gilt eine Stunde.</p>
    <input id="gCode" class="code" type="text" inputmode="numeric" autocomplete="one-time-code"
           maxlength="8" enterkeyhint="go" placeholder="000000">
    <button class="btn btn-primary btn-block" id="gVerify">Anmelden</button>
    <p class="gate-err" id="gErr">${message || ''}</p>
    <p class="gate-foot"><span class="gate-link" id="gBack">Andere E-Mail verwenden</span></p>
  </div>`;
}

function wireGate(step, email) {
  const err = document.getElementById('gErr');
  const fail = (m) => { err.textContent = m; };

  if (step === 'code') {
    const input = document.getElementById('gCode');
    const btn = document.getElementById('gVerify');
    input.focus();

    const submit = async () => {
      // Je nach Projekt schickt Supabase 6 oder 8 Ziffern
      const code = input.value.replace(/\D/g, '');
      if (code.length < 6) return fail('Der Code ist noch nicht vollständig.');
      btn.disabled = true; btn.textContent = 'Moment…'; fail('');
      try {
        await Cloud.verifyCode(email, code);
        await afterLogin();
      } catch (e) {
        btn.disabled = false; btn.textContent = 'Anmelden';
        fail('Der Code passt nicht oder ist abgelaufen. Fordere einen neuen an.');
      }
    };
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    document.getElementById('gBack').addEventListener('click', () => showGate('email'));
    return;
  }

  const input = document.getElementById('gEmail');
  const btn = document.getElementById('gSend');
  input.focus();

  const submit = async () => {
    const value = input.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) return fail('Das sieht noch nicht nach einer E-Mail aus.');
    btn.disabled = true; btn.textContent = 'Wird gesendet…'; fail('');
    try {
      await Cloud.requestCode(value);
      showGate('code', value);
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Code anfordern';
      fail(e.message || 'Das hat nicht geklappt. Versuch es gleich nochmal.');
    }
  };
  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

async function afterLogin() {
  await pullAndMerge();
  startApp();
}

/* ------------------------------------------------------------
   7) START
------------------------------------------------------------ */

document.getElementById('streakChip').addEventListener('click', () => {
  openSheet(`
    <div class="sheet-ico">${icon('flame')}</div>
    <h2 class="sheet-title">Streak: ${S.streak} Tage</h2>
    <p class="muted small">Ein Streak-Tag zählt ab <b>drei</b> erledigten Dingen. Nicht fünf. Drei.</p>
    <div class="stat-grid" style="margin:14px 0">
      <div class="stat"><div class="stat-num">${S.streak}</div><div class="stat-cap">AKTUELL</div></div>
      <div class="stat"><div class="stat-num">${S.bestStreak}</div><div class="stat-cap">REKORD</div></div>
      <div class="stat"><div class="stat-num">${S.freezes}</div><div class="stat-cap">SCHUTZ</div></div>
    </div>
    <div class="note">
      <b>Streak-Schutz</b><br>
      Verpasst du einen Tag, wird automatisch ein Schutz eingesetzt statt der Streak gelöscht.
      Alle 7 Streak-Tage bekommst du einen zurück, maximal zwei gleichzeitig.<br><br>
      Der Grund: Ein einzelner schlechter Tag ist normal. Wenn er den ganzen Fortschritt löscht,
      steigen die meisten Menschen komplett aus — und genau das soll hier nicht passieren.
    </div>
  `);
});

document.getElementById('levelChip').addEventListener('click', () => go('profile'));

/* Trennlinie unter der Kopfzeile erst zeigen, wenn gescrollt wird */
addEventListener('scroll', () => {
  document.getElementById('topbar').classList.toggle('scrolled', window.scrollY > 4);
}, { passive: true });

/* Service Worker — nur über http(s), nicht bei file:// */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* Tageswechsel prüfen, wenn die App wieder in den Vordergrund kommt.
   Beim Verlassen wird zusätzlich sofort synchronisiert, damit der
   Stand auf dem anderen Gerät aktuell ist. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { flushCloudPush(); return; }
  if (appEl.hidden) return;
  const before = S.todayKey;
  rollDay();
  if (before !== S.todayKey) { refreshChrome(); go(currentTab); flushToasts(); }
  else if (currentTab === 'focus') drawFast();
});

function startApp() {
  gate.hidden = true;
  appEl.hidden = false;
  paintShell();
  rollDay();
  refreshChrome();
  checkBadges();
  const startTab = (location.hash || '#home').slice(1);
  go(SCREENS[startTab] ? startTab : 'home');
  flushToasts();
}

/* Startablauf:
   Ohne Backend startet die App direkt lokal — praktisch zum
   Weiterentwickeln. Mit Backend entscheidet die Sitzung, ob der
   Login oder die App erscheint. */
async function boot() {
  if (!Cloud.init()) { startApp(); return; }
  try {
    const session = await Cloud.session();
    if (!session) { showGate('email'); return; }
    await pullAndMerge();
    startApp();
  } catch (e) {
    console.warn('Start ohne Cloud:', e.message || e);
    startApp();
    toast('Offline gestartet — Fortschritt bleibt vorerst lokal', 'clock');
  }
}

boot();
