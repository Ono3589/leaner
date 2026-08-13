/* ============================================================
   Leaner — Der Coach als Kreis

   Ein Punktraster statt eines Chatfensters. Die Punkte sitzen auf
   einem festen Gitter und bewegen sich nie von der Stelle — was
   sich ändert, sind Größe und Helligkeit. Dadurch bleibt die Form
   exakt, während trotzdem etwas passiert.

   Durch das Gitter läuft eine Welle von der Mitte nach außen. Weil
   der Abstand zum Zentrum die Verzögerung bestimmt, entsteht ein
   ruhiger, kreisrunder Puls ohne eine einzige gekrümmte Linie.

   Drei Zustände:
     idle     eine langsame Welle, geringe Amplitude
     thinking zwei gegenläufige Wellen, dichter und schneller
     talking  ein kräftiger Puls, der von innen nach außen läuft

   Zwei Dinge, die bei einer Dauer-Animation zählen:
   - Im Hintergrund wird angehalten. Eine Endlosanimation in einer
     App, die den ganzen Tag offen liegt, kostet sonst spürbar Akku.
   - prefers-reduced-motion wird respektiert. Dann steht der Kreis
     still und ändert nur seine Helligkeit.
   ============================================================ */

const Avatar = {
  canvas: null,
  ctx: null,
  raf: null,
  t: 0,
  state: 'idle',
  tone: 'accent',        // accent | move | mind | fast
  level: 0,              // 0…1, wie stark die Bewegung gerade ist
  targetLevel: 0,
  dpr: 1,
  running: false,

  mount(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.setState('idle');
    this.start();
  },

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
  },

  setState(state) {
    this.state = state;
    this.targetLevel = state === 'thinking' ? 1 : state === 'talking' ? 0.55 : 0.18;
  },

  setTone(tone) {
    this.tone = tone || 'accent';
  },

  start() {
    if (this.running || !this.ctx) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  },

  destroy() {
    this.stop();
    this.canvas = null;
    this.ctx = null;
  },

  /* Farbe aus den CSS-Variablen holen, damit Hell- und Dunkelmodus
     ohne Sonderfall funktionieren. */
  color() {
    const cs = getComputedStyle(document.documentElement);
    const v = cs.getPropertyValue('--' + (this.tone === 'accent' ? 'accent' : this.tone)).trim();
    return v || '#7FB79A';
  },

  draw() {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches ||
                  (typeof S !== 'undefined' && S.reduceMotion);

    const w = this.canvas.width, h = this.canvas.height;
    const cx = w / 2, cy = h / 2;

    // Sanft auf das Ziel zulaufen, statt zu springen
    this.level += (this.targetLevel - this.level) * 0.06;
    this.t += still ? 0 : (0.010 + this.level * 0.026);

    ctx.clearRect(0, 0, w, h);

    const rgb = hexToRgb(this.color());
    const c = (a) => `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;

    /* Maße aus der Fläche ableiten, damit das Raster auf jedem
       Bildschirm gleich aussieht. */
    const N = Avatar.GRID;                       // Punkte je Achse
    const span = Math.min(w, h) * 0.66;          // Kantenlänge des Rasters
    const sp = span / (N - 1);                   // Abstand der Punkte
    const rMax = sp * 0.24;                      // größter Punktradius
    const reach = (N - 1) / 2 + 0.45;            // runde Maske übers Gitter

    /* Weicher Schein, damit es leuchtet statt nur gezeichnet zu wirken */
    const halo = ctx.createRadialGradient(cx, cy, span * 0.1, cx, cy, span * 0.85);
    halo.addColorStop(0, c(0.16 + this.level * 0.14));
    halo.addColorStop(0.6, c(0.05));
    halo.addColorStop(1, c(0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, span * 0.85, 0, Math.PI * 2);
    ctx.fill();

    const mid = (N - 1) / 2;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const dx = i - mid, dy = j - mid;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > reach) continue;                 // Ecken weglassen — ergibt einen Kreis

        /* Die Welle: Abstand zur Mitte verzögert die Phase.
           Beim Nachdenken läuft eine zweite, gegenläufige mit —
           das wirkt beschäftigt, ohne schneller zu werden. */
        let wave = Math.sin(this.t * 1.9 - d * 0.95);
        if (this.state === 'thinking') {
          wave = (wave + Math.sin(this.t * 1.3 + d * 1.5)) * 0.5;
        }
        const up = Math.max(0, wave);

        const amp = still ? 0 : (this.state === 'talking' ? 0.9 : 0.35 + this.level * 0.45);
        const alpha = 0.13 + up * (0.20 + amp * 0.55);
        const r = rMax * (0.42 + up * amp * 0.62);

        ctx.fillStyle = c(Math.min(1, alpha));
        ctx.beginPath();
        ctx.arc(cx + dx * sp, cy + dy * sp, Math.max(0.6, r), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* Der Mittelpunkt bleibt immer präsent — sonst wirkt das Raster
       im Ruhezustand wie ausgeschaltet. */
    ctx.fillStyle = c(0.9);
    ctx.beginPath();
    ctx.arc(cx, cy, rMax * (0.55 + this.level * 0.3), 0, Math.PI * 2);
    ctx.fill();
  }
};

// Punkte je Achse. Ungerade Zahl, damit es eine echte Mitte gibt.
Avatar.GRID = 9;

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || '').trim());
  if (!m) return { r: 127, g: 183, b: 154 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

/* Im Hintergrund nicht weiterrechnen */
document.addEventListener('visibilitychange', () => {
  if (!Avatar.canvas) return;
  document.hidden ? Avatar.stop() : Avatar.start();
});
addEventListener('resize', () => Avatar.resize());

/* ------------------------------------------------------------
   Thema einer Frage erkennen

   Bestimmt nur die Farbe des Kreises. Bewusst grob: Vier Felder,
   im Zweifel das Standardgrün. Eine Farbe, die bei jedem Wort
   umspringt, wäre unruhiger als gar keine.
------------------------------------------------------------ */

const TOPIC_WORDS = [
  { tone: 'move', re: /(sport|training|bewegen|bewegung|laufen|kraft|muskel|workout|gym|spazier|schritte)/i },
  { tone: 'mind', re: /(stress|schlaf|müde|atmen|meditat|achtsam|runterkommen|überfordert|reizüberflut|ruhe|entspann)/i },
  { tone: 'fast', re: /(fasten|fasting|16:8|intervall|essenspause|küche zu)/i }
];

function topicOf(text) {
  for (const t of TOPIC_WORDS) if (t.re.test(text)) return t.tone;
  return 'accent';   // Ernährung und alles Übrige
}
