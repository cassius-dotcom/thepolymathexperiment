# Claude Code Prompt — Cassius Personal OS

Build a single self-contained file called `dashboard.html`. It must work when double-clicked from the desktop or opened via VS Code Live Server — no build step, no npm, no external CSS or JS files. All styles in one `<style>` block in `<head>`, all JavaScript in one `<script>` tag at the bottom of `<body>`. Google Fonts may be loaded via a `<link>` tag.

---

## Visual System (Global)

**Fonts**
- Load from Google Fonts: `Syne` (weights 400, 500, 600, 700, 800) and `JetBrains Mono` (weights 300, 400, 500, 600, 700).
- `--display`: `'Syne', sans-serif` — used for all body text, headings, and UI labels.
- `--mono`: `'JetBrains Mono', ui-monospace, monospace` — used for all numbers, times, dates, tags, eyebrows, and code-style labels.

**CSS Variables**
```css
--bg: #060608;
--bg2: rgba(255,255,255,0.03);
--bg3: rgba(255,255,255,0.055);
--border: rgba(255,255,255,0.07);
--border2: rgba(255,255,255,0.12);
--text1: #FAFAFA;
--text2: #B8B6B0;
--text3: #76746E;
--green: #6BE3A4;
--yellow: #F2C063;
--red: #FF6B6B;
--blue: #7EB8F7;
```

**Background**
- Page background: `var(--bg)`.
- `body::before`: fixed, full-bleed, two radial-gradient washes layered — warm orange `rgba(224,118,88,0.13)` centered at 82% 14%, and cool blue `rgba(100,120,200,0.07)` at 18% 90%. Both transparent-edged. `pointer-events: none; z-index: 0`.
- `body::after`: fixed, full-bleed SVG film-grain noise texture (use an inline `data:image/svg+xml` feTurbulence filter, 200×200 tile, ~3% opacity). `pointer-events: none; z-index: 0; opacity: 0.4`.

**Card chassis** (class `.card`):
- `background: var(--bg2); border: 0.5px solid var(--border); border-radius: 14px; padding: 20px 22px; backdrop-filter: blur(20px);`

**Section label** (class `.section-label`):
- `font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--text3); display: flex; align-items: center; gap: 10px; margin-bottom: 14px;`
- `::before`: 16px wide, 0.5px tall, `background: var(--text3); opacity: 0.5`.
- `::after`: `flex: 1; height: 0.5px; background: linear-gradient(90deg, rgba(255,255,255,0.07), transparent)`.

**Body**: centered, `max-width: 1100px` via `.page` wrapper, `font-family: var(--display)`, `min-height: 100vh`, `overflow-x: hidden`.

---

## Navigation

A `<nav class="nav">` fixed to the top, `height: 52px`, `background: rgba(6,6,8,0.85)`, `backdrop-filter: blur(20px)`, `border-bottom: 0.5px solid var(--border)`, flex row, `padding: 0 24px`, `z-index: 100`.

Left: `.nav-brand` — text reads `CASSIUS` bold + `/ OS` in muted tertiary weight. `font-size: 13px; font-weight: 800; letter-spacing: -0.02em; margin-right: 32px`.

Right: `.nav-tabs` — flex row, `gap: 2px`, horizontal scroll, hidden scrollbar. Five tab buttons with class `.nav-tab`:
- `Dashboard`, `Character`, `Domains`, `Lab`, `Calendar & Email`
- Style: `font-family: var(--mono); font-size: 10px; font-weight: 500; letter-spacing: 0.06em; color: var(--text3); padding: 6px 12px; border-radius: 6px; cursor: pointer; border: none; background: transparent; white-space: nowrap; transition: color 0.15s, background 0.15s`.
- Hover: `color: var(--text2); background: var(--bg2)`.
- Active (`.nav-tab.active`): `color: var(--text1); background: var(--bg3)`.

Each tab calls `showPage(pageId, this)`. The `showPage` function hides all `.page` divs and shows the one with `id="page-{pageId}"`. On switching to `character` → call `renderCharacterPage()`. On switching to `domains` → call `renderProjects()`. On switching to `lab` → call `renderExperiments()`.

Each `.page` div: `display: none; padding: 80px 24px 64px; max-width: 1100px; margin: 0 auto; position: relative; z-index: 1`. Active pages get `.active` class → `display: block`.

---

## Page 1 — Dashboard (`id="page-dashboard"`)

### Title
`<h1 class="dash-title">Good morning, Cassius.</h1>`
- `font-size: 30px; font-weight: 800; letter-spacing: -0.04em; background: linear-gradient(180deg, #FFFFFF 0%, #C7C4BC 120%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 16px`.

### Goal Ticker
A horizontal strip with class `.goal-ticker` inside a `.ticker-row` (margin-bottom 16px).

Structure:
```html
<div class="goal-ticker" id="goalTicker" aria-live="polite" aria-atomic="true">
  <div class="goal-ticker-led"><span class="goal-ticker-led-dot"></span></div>
  <div class="goal-ticker-label">GOALS</div>
  <div class="goal-ticker-stage" id="goalTickerStage">
    <div class="goal-ticker-row">
      <span class="goal-ticker-status">·</span>
      <span class="goal-ticker-text">Loading…</span>
    </div>
  </div>
  <div class="goal-ticker-meta" id="goalTickerMeta">0/0</div>
</div>
```

Styling:
- `.goal-ticker`: flex row, `gap: 10px; padding: 7px 14px; border-radius: 10px; background: linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.30) 100%); border: 0.5px solid var(--border); position: relative; overflow: hidden`.
- `.goal-ticker-led-dot`: `width: 7px; height: 7px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px rgba(107,227,164,0.7); animation: ledpulse 1.6s ease-in-out infinite`. Keyframes: `0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.45;transform:scale(0.85);}`.
- `.goal-ticker-label`: `font-family: var(--mono); font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--text3); text-transform: uppercase`.
- `.goal-ticker-stage`: `flex: 1; height: 22px; position: relative; overflow: hidden`.
- `.goal-ticker-row`: `display: flex; align-items: center; gap: 8px; height: 22px; font-family: var(--mono); font-size: 12.5px; font-weight: 600; color: var(--text1); white-space: nowrap; position: absolute; width: 100%`.
- `.goal-ticker-meta`: `font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--text2); padding: 3px 8px; border-radius: 20px; background: rgba(255,255,255,0.04); letter-spacing: 0.04em`.
- Animations: `ticker-leave` (opacity 1→0, translateY 0→-100%) and `ticker-enter` (opacity 0→1, translateY 100%→0), both `0.45s`.
- `.is-leaving`: `animation: ticker-leave 0.45s cubic-bezier(0.55,0,0.55,1) forwards`.
- `.is-entering`: `animation: ticker-enter 0.45s cubic-bezier(0.22,1,0.36,1) forwards`.

Behavior:
- Reads `goals:YYYY-MM-DD` localStorage key for today (using `getActiveDateString()`).
- If 0 goals: show `{ status:'empty', text:'No goals set for today — add one to get rolling.' }`.
- If all done: show `{ status:'done', text:'✓ All goals done — solid day.' }`.
- Else: rotate through pending (unchecked) goals only.
- Meta pill always shows `done/total`.
- `tick()`: stamps existing row `.is-leaving`, removes it after 460ms, appends new row with `.is-entering`. On first render — no animation, just append.
- `startTicker()`: calls `tick()` immediately, then `setInterval(tick, 5000)`.
- Listen for custom event `goals-changed` on `window` → reset `cycleIdx = 0`, call `tick()` immediately.
- Status glyphs: done = `✓` (green), pending = `○` (tertiary), empty = `·` (tertiary).

### Day Ring
Flex container, `justify-content: center; align-items: center; gap: 28px; flex-wrap: wrap; margin-bottom: 24px`.

**LEFT — SVG Ring** (`width: 168px; height: 168px; position: relative; flex-shrink: 0`):
- SVG `viewBox="0 0 120 120"` with a `feGaussianBlur` glow filter (`stdDeviation: 2.5`).
- Track circle: `cx=60 cy=60 r=52 fill=none stroke=rgba(255,255,255,0.06) stroke-width=8`.
- Fill circle: same geometry, `stroke-linecap: round`, `transform="rotate(-90 60 60)"`, `filter="url(#glow)"`. JS sets `stroke-dasharray` and `stroke-dashoffset`. Circumference = `2 * Math.PI * 52 ≈ 326.73`.
- Both stroke and dashoffset have `transition: 0.7s cubic-bezier(0.22,1,0.36,1)`.
- Centered absolutely inside the container:
  - `.ring-pct`: `font-size: 40px; font-weight: 800; letter-spacing: -0.04em; font-variant-numeric: tabular-nums`.
  - `.ring-phase`: `font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text3); margin-top: 3px`.
  - `.ring-clock`: `font-family: var(--mono); font-size: 10.5px; color: var(--text3); margin-top: 2px`.

**RIGHT — Info column** (`max-width: 260px; display: flex; flex-direction: column; gap: 6px`):
- `.ring-status`: `font-size: 14px; font-weight: 700`.
- `.ring-remain`: `font-family: var(--mono); font-size: 12px; color: var(--text2)`.
- `.ring-range`: `font-family: var(--mono); font-size: 11px; color: var(--text3)` — static text `8:00 AM – 12:00 AM`.

Constants: `WAKE_HOUR = 8`, `SLEEP_HOUR = 24`.

Sun-cycle color palette (9 stops, interpolate linearly):
```
0%    [255, 216, 158]
12.5% [255, 205, 121]
25%   [255, 227, 143]
37.5% [255, 183, 106]
50%   [255, 149,  89]
62.5% [243, 111,  79]
75%   [226,  93, 122]
87.5% [123,  91, 176]
100%  [ 47,  58, 102]
```

States:
- **Before 8 AM**: ring empty (`dashoffset = C`), stroke `#4D4B47`, pct `—`, phase `SLEEPING`, status `😴 Still sleeping`, remain `Xh Ym until wake-up`.
- **8 AM–midnight**: `percent = (hours - 8) / 16 * 100`. `dashoffset = C * (1 - percent/100)`. Stroke = interpolated sun color. Phase/status by quartile:
  - `< 25%` → `MORNING` / `☀️ Morning — fresh start`
  - `< 50%` → `MIDDAY` / `⚡ Midday — keep moving`
  - `< 75%` → `AFTERNOON` / `🔥 Afternoon — push it`
  - `< 90%` → `EVENING` / `⏳ Evening — wrap up`
  - else → `BEDTIME` / `🌙 Bedtime soon`
- **After midnight**: ring full, stroke `#E25D7A`, phase `PAST BEDTIME`, status `⚠️ Past bedtime`, remain `Sleep!`.

Clock format: 12-hour with AM/PM, no leading zero on hour. Update every 60s via `setInterval`.

### To Do List Section

Section label reads `To Do List`. Below it a two-column grid (`.two-col`, `grid-template-columns: 1fr 1fr; gap: 12px`). Single column on screens ≤ 720px.

**TODAY card** (`class="card gm-card"`, `id="todayCard"`):

Header row (flex, space-between, flex-wrap):
- Left:
  - Eyebrow `id="todayLabel"` — `font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: var(--text3); margin-bottom: 5px`. Shows `Today — {Sat, May 9}`.
  - Progress row: big number `id="gmProgressNum"` (`font-size: 38px; font-weight: 800; letter-spacing: -0.045em; font-variant-numeric: tabular-nums; line-height: 1`) + total `id="gmProgressTotal"` (`font-family: var(--mono); font-size: 18px; color: var(--text3)`) + label `id="gmProgressLabel"` (`font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3)`). Label reads: `no goals yet` when 0 total, `all done — solid day` when all complete, otherwise `complete`.
- Right: streak pill `id="gmStreak"` — `display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 30px; background: rgba(255,255,255,0.04); font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--text3); border: 1px solid transparent`. Active class `.active`: `background: rgba(242,192,99,0.1); color: var(--yellow); border-color: rgba(242,192,99,0.32)`. Contains ⚡ icon + `id="gmStreakNum"` + text `day streak`.

Segmented bar `id="gmBar"` — flex row, `gap: 4px; height: 6px; margin-bottom: 14px`. One `.gm-bar-seg` per goal. Done segments get `.gm-bar-seg-done`: `background: var(--green); box-shadow: 0 0 6px rgba(107,227,164,0.4)`. `.gm-bar:empty { display: none }`.

Goal list `<ul id="goalList" class="goal-list">`. Empty state `<div id="emptyState">No goals for today yet — add one below.</div>` — `font-size: 12px; color: var(--text3); font-style: italic; padding: 12px 0; text-align: center`.

Push remaining button `id="gmPushBtn"` (hidden by default, shown when unchecked goals exist): full-width, dashed border, tertiary text, hover → primary text. On click: confirm prompt, move all unchecked goals into tomorrow list (deduped by text), keep only checked in today, re-render both.

Quick-add row (`.gm-input-wrap` — `display: flex; gap: 6px; margin-top: 14px; padding-top: 14px; border-top: 0.5px solid var(--border); flex-wrap: wrap`):
- Text input `id="goalInput"` — placeholder `Add a goal for today…`. Glass style.
- Add button `id="goalAddBtn"` — `background: linear-gradient(180deg, #FFFFFF 0%, #E8E5DD 100%); color: #0A0A0B; font-weight: 700; padding: 9px 16px; border-radius: 8px; border: none`. Hover: lift 1px.
- Polish button `id="goalPolishBtn"` — `background: rgba(255,255,255,0.05); border: 0.5px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--text1); font-weight: 600; padding: 9px 14px`.
- Status line `id="polishStatus"` — `font-family: var(--mono); font-size: 10px; color: var(--text3); width: 100%; margin-top: 5px`.

All-done state: when total > 0 and all done, add `.gm-all-done` to the card: soft green radial gradient at top; `#gmProgressNum` and `#gmProgressLabel` turn `var(--green)`.

**TOMORROW card** (`class="card gm-card gm-card-tomorrow"`, `id="tomorrowCard"`):
- Header: eyebrow `id="tomorrowLabel"` (`Plan Tomorrow — {Sun, May 10}`), sub-text `Write tonight, locked until 6 AM.` (`font-size: 11px; color: var(--text3)`), right-side count `id="gmTomorrowCount"` (`font-family: var(--mono); font-size: 10px; color: var(--text3)`).
- `.gm-card-tomorrow .gm-progress-row { display: none }`.
- Goal list `id="tomorrowList"`. Empty state `id="tomorrowEmpty"`.
- Same quick-add row: `id="tomorrowInput"`, `id="tomorrowAddBtn"`, `id="tomorrowPolishBtn"`, `id="tomorrowStatus"`.
- Tomorrow rows are read-only: checkboxes disabled with `title="Activates at 6 AM tomorrow"`, queue button disabled. Inline edit, drag-reorder, and delete still work.

**Goal row** (built by `buildGoalRow(goal, idx, key, readOnly, reloadFn)`):
- `<li class="goal-item">` — flex, `gap: 10px; padding: 10px 12px; margin-bottom: 5px; background: rgba(255,255,255,0.03); border: 0.5px solid var(--border); border-radius: 10px`.
- On hover: lighter background; drag handle and delete button fade in.
- Contents:
  1. Drag handle `⋮⋮` — `font-size: 14px; opacity: 0 (shown on row hover); cursor: grab; letter-spacing: -2px`. Hidden entirely in readOnly mode.
  2. Custom checkbox: 20×20px, `border-radius: 6px`, styled via adjacent sibling (checkbox opacity 0, visual box next to it). When checked: `background: var(--green); box-shadow: 0 0 12px rgba(107,227,164,0.4)` + animated `::after` checkmark using `cubic-bezier(0.34,1.56,0.64,1)`.
  3. Goal text `<div class="goal-text">` — `flex: 1; font-size: 12.5px; font-weight: 500`. Click → `contentEditable = true`, focus, caret to end. Blur or Enter: commit if changed and non-empty. Escape: cancel.
  4. ⚡ Queue button — toggles `queued` flag. Default: tertiary 0.55 opacity. Active: `color: var(--yellow); filter: drop-shadow(0 0 4px rgba(242,192,99,0.65))`. Click triggers brief flash animation on the row (`background: rgba(242,192,99,0.32); scale: 1.015`), then re-renders after 480ms.
  5. × Delete button — tertiary, hover red. `opacity: 0` until row hover.
- Done rows: `opacity: 0.45; background: rgba(107,227,164,0.04)`. Text: `text-decoration: line-through; text-decoration-color: rgba(255,255,255,0.4)`.
- Queued rows: `background: rgba(242,192,99,0.10); box-shadow: inset 3px 0 0 0 var(--yellow)`. Text: `color: #FFE2A8`.

If goal list length > 5: render first 5, then a dashed "Show N more ▾" button that expands/collapses the rest.

**HTML5 drag-reorder** (`wireDragReorder`): `dragstart` stores src index. `dragover` highlights top border. `drop` splices and re-saves.

**Add & Polish handlers** (`makeAddHandlers(inputEl, addBtn, polishBtn, key, statusEl, reloadFn)`):
- Add: trim input, push `{ text, done: false }`, `storeSet`, clear input, reload.
- Polish: if `ANTHROPIC_API_KEY` is empty → fall back to plain Add with status message `Polish needs an Anthropic API key — added as-typed.` for 3.5s. If key set → POST to `https://api.anthropic.com/v1/messages` with headers `Content-Type: application/json`, `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`. Body: `model: claude-sonnet-4-5`, `max_tokens: 1000`, single user message asking to clean up the goal and return a one-element JSON array (no preamble, no fences). Parse, push, reload. On error: add raw text, show red error message.
- Enter in input fires Add.

**`const ANTHROPIC_API_KEY = '';`** — declared at the very top of the script. User pastes their key here.

---

## Page 2 — Character (`id="page-character"`)

### Header
Flex row, space-between, flex-wrap, `padding-bottom: 24px; border-bottom: 0.5px solid var(--border); margin-bottom: 24px`.
- Left: 64×64 avatar div (letter `C`, `border-radius: 12px`, glass style) + name column:
  - `.char-name`: `font-size: 30px; font-weight: 800; letter-spacing: -0.04em; margin-bottom: 4px`.
  - `.char-class`: `font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text3)`. Text: `Conqueror · Level {N}`.
- Right: three stat pills (Total XP `id="charTotalXP"`, Domains = 8, Skills = 56), each with a tiny mono label above and a big `font-weight: 800` number below.

### Core Attributes (8 cards)
Grid `.attrs-grid`: `repeat(4, 1fr)` → `repeat(2,1fr)` on mobile. One `.attr-card` per attribute, each with: label, value (XP / 10 rounded), and a 2px progress bar.

Attributes map:
| Label | Domain |
|-------|--------|
| Strength | body |
| Intellect | mind |
| Faith | faith |
| Wealth | wealth |
| Charisma | writing |
| Wisdom | psych |
| Strategy | history |
| Culture | art |

Value = `Math.round(domainXP(state, domain) / 10)`. Bar fill = `domainXP / 700` clamped to 100%, colored with the domain color at 55% opacity.

### Domains Grid
`.domains-grid`: `repeat(2,1fr)`, gap 8px, margin-bottom 24px. One `.domain-card` per domain. Click toggles `.expanded`.

Each card:
- Header row: domain name (bold) + level (`LV N`, colored with domain color at 55% opacity, `Math.floor(xp/50)`).
- 2px progress bar (domain color at 55% opacity), filled `domainXP / (skills.length * 100)`.
- Domain tag + XP count in mono tertiary.
- `.skill-list` (hidden until `.expanded`): one `.skill-row` per skill with:
  - Active dot (bright) or inactive dot (dim) depending on whether this skill is in the `developing` array.
  - Skill name.
  - 70px-wide 1.5px bar showing XP.
  - `<input class="skill-xp-input" type="number" min="0" max="100">` — click stops propagation (so it doesn't collapse the card). `change` event saves XP to `cassius_char_v1` localStorage key and re-renders.

### Currently Developing
`.developing-grid`: `repeat(3,1fr)`. Each `.dev-card` shows skill name, domain name (mono label), and a 2px bar with the domain color.

State is stored in `cassius_char_v1` → `{ skills: {domain_skill: xpValue}, developing: [{domain, skill}] }`. Starting all skills at 0. Default developing:
- `{ domain: 'body', skill: 'Strength Training' }`
- `{ domain: 'mind', skill: 'Deep Focus' }`
- `{ domain: 'writing', skill: 'Prose Craft' }`

### Domains Data (all 8, hardcoded)
```js
[
  { id:'body', name:'Body & Training', color:'#E8A87C', tag:'Physical',
    skills:['Strength Training','Mobility & Flexibility','Cardiovascular Endurance','Nutrition & Diet','Sleep Optimization','Body Composition','Recovery Protocols'] },
  { id:'mind', name:'Mind & Philosophy', color:'#A78BFA', tag:'Cognitive',
    skills:['Stoic Practice','Critical Thinking','Deep Focus','Memory & Retention','Intellectual Curiosity','Logical Reasoning','Mental Resilience'] },
  { id:'faith', name:'Faith', color:'#93C5FD', tag:'Spiritual',
    skills:['Scripture Study','Prayer Discipline','Theological Understanding','Discernment','Community & Service','Spiritual Warfare','Gratitude Practice'] },
  { id:'wealth', name:'Wealth', color:'#6BE3A4', tag:'Financial',
    skills:['Financial Literacy','Investing','Business Building','Income Streams','Sales & Negotiation','Asset Management','Frugality & Discipline'] },
  { id:'writing', name:'Writing & Communication', color:'#F2C063', tag:'Expression',
    skills:['Prose Craft','Persuasive Writing','Rhetoric & Oratory','Storytelling','Active Listening','Non-verbal Communication','Content Strategy'] },
  { id:'psych', name:'Psychology & People', color:'#F472B6', tag:'Social',
    skills:['Emotional Intelligence','Human Behavior','Influence & Persuasion','Conflict Resolution','Leadership','Empathy','Social Dynamics'] },
  { id:'history', name:'History & Strategy', color:'#FB923C', tag:'Strategic',
    skills:['Military History','Political Theory','Strategic Thinking','Pattern Recognition','Geopolitics','Ancient Civilizations','Decision Making'] },
  { id:'art', name:'Art & Culture', color:'#34D399', tag:'Aesthetic',
    skills:['Visual Aesthetics','Music Appreciation','Literature','Film & Cinema','Architecture','Cultural Literacy','Creative Expression'] }
]
```

### Daily Bible Verse
A `.card` with a left border accent (`2px solid rgba(255,255,255,0.1)`) and `padding-left: 16px`. Quote text in italic secondary color (`font-size: 14px; line-height: 1.7`), reference in mono uppercase tertiary below it. Rotate through 7 quotes by `new Date().getDay()`:
```
Philippians 4:13 — "I can do all things through Christ who strengthens me."
2 Timothy 1:7 — "For God gave us a spirit not of fear but of power and love and self-control."
Proverbs 3:5 — "Trust in the Lord with all your heart and lean not on your own understanding."
Joshua 1:9 — "Be strong and courageous. Do not be afraid; do not be discouraged."
Psalm 23:1 — "The Lord is my shepherd; I shall not want."
Matthew 7:7 — "Ask and it will be given to you; seek and you will find."
2 Corinthians 5:7 — "For we walk by faith, not by sight."
```

### Hevy Integration
A `.card` row with a password input `id="hevyKeyInput"`, a `Save` button that calls `saveHevyKey()` (stores to `localStorage.hevy_api_key`), and a status label `id="hevyStatusLabel"`. On load, restore saved key and show `Key saved` in green if present.

---

## Page 3 — Domains & Projects (`id="page-domains"`)

Page heading + mono subtitle `Track projects that build your domains over time.`

### Projects Grid
`.projects-grid`: `repeat(2,1fr)` → 1 col on mobile. Each `.project-card`:
- Header row: project name + domain badge (colored with domain color — `font-size: 8.5px mono uppercase`, pill shape, domain color at 10% bg + 55% border) + × delete button.
- Description text (`font-size: 11px; color: var(--text2); line-height: 1.5`).
- Progress row: percentage label (`font-family: var(--mono); font-size: 11px`) + 3px bar with domain color fill.
- Meta row: `Domain: {name}` + `Due: {date}` if set. Mono tertiary.

Empty state: centered mono tertiary message.

### Add Project Form
`.add-project-form` (`.card` style, slightly lighter):
- Row 1: project name input + domain `<select>` (populated from DOMAINS_DATA).
- Row 2: description input.
- Row 3: progress number input (0–100) + deadline date input + `Add Project` primary button.

`addProject()`: reads form, pushes to `cassius_projects` localStorage array, clears form, re-renders. No duplicates check needed.

Data shape: `{ name, domain, desc, progress, deadline, created: 'YYYY-MM-DD' }`.

---

## Page 4 — Lab & Experiments (`id="page-lab"`)

Page heading + subtitle `Track what you're testing and whether it actually works.`

### Experiments Grid
`.experiments-grid`: `repeat(2,1fr)` → 1 col on mobile. Each `.exp-card`:
- Header row: experiment name + status badge + × delete.
- Status badges: Active → green pill (`background: rgba(107,227,164,0.1); color: var(--green); border: 0.5px solid rgba(107,227,164,0.2)`). Completed → blue. Paused → yellow.
- Hypothesis in italic secondary (`"hypothesis text"`).
- Meta row: started date + duration if set. Mono tertiary.
- Toggle button `View log (N entries) ▾` — dashed border, clicks toggle `.exp-log.open`.
- `.exp-log` (hidden until open): list of `{ date, note }` entries, each with date in mono tertiary above the note text. Below entries: an add-note input + `Log it` button that appends a new entry with today's date and re-renders.

Data shape: `{ name, status, hypothesis, startDate, duration, logs: [{date, note}] }`. Saved to `cassius_experiments` localStorage.

### New Experiment Form
Same form style as Add Project:
- Row 1: experiment name + status select (Active / Completed / Paused).
- Row 2: hypothesis input.
- Row 3: start date input (default today) + duration input + `Start Experiment` primary button.

---

## Page 5 — Calendar & Email (`id="page-calendar"`)

Page heading + subtitle `Connect your Google account to pull in live data.`

### Connection Buttons
Two `.connect-btn` buttons (full-width, glass style, flex row with icon + label + right-side status):
- Google Calendar — calls `connectCalendar()`.
- Gmail — calls `connectGmail()`.

Each button has:
- `id="calConnectedBadge"` / `id="gmailConnectedBadge"` — green `● Connected` badge (hidden by default).
- `id="calConnectLabel"` / `id="gmailConnectLabel"` — shows `Connect →` by default, `Connected` when connected.

On connect: show badge, change label to `Loading…`, save `cal_connected`/`gmail_connected` to localStorage, then call fetch function. The fetch function sets a 3-second timeout — if still showing loading state after that, replace with a fallback message: `Use the Calendar integration in Claude to pull events, or paste them manually.` and change label to `Open in Claude →`.

On page load: if localStorage keys exist, restore connected state visually.

### Content Area
Two-column grid, one col on mobile:
- Left: `Today's Events` section label + `id="calEventsContainer"`.
- Right: `Recent Emails` section label + `id="gmailContainer"`.

Default content in each: `loading-text` div saying `Connect Google {service} to see {events/emails}.`

---

## Logic & State

### Storage Helpers
```js
storeGet(key)       → JSON.parse(localStorage.getItem(key)) or null
storeSet(key, val)  → localStorage.setItem(key, JSON.stringify(val)) + dispatch 'goals-changed' event
storeDelete(key)    → localStorage.removeItem(key)
storeListKeys(pfx)  → iterate localStorage.length, return keys starting with pfx
```

### Active Date Logic (6 AM boundary)
```js
getActiveDateString(): if getHours() < 6, subtract 1 day, return YYYY-MM-DD
getTomorrowDateString(): if getHours() < 6, return today's calendar date; else tomorrow
formatDate('YYYY-MM-DD'): returns 'Sat, May 9' style
```

### Rollover (runs once on load)
Walk every `goals:` key strictly older than the active date. For each: take undone goals, push into today's list (dedup by exact text match), delete the old key.

### Streak (runs once on load)
State stored as `goal_streak_v1` → `{ count, lastProcessedDate }`. Walk all `goals:` keys older than today in date order, starting from `lastProcessedDate`. For each: if 0 goals → skip (don't break streak); if all done → count++; else → count = 0. Save and return count.

### Render Functions
- `renderTodayHeader(goals)` — updates progress number, total, label, bar segments, all-done class, push button visibility.
- `renderStreak()` — calls `doStreak()`, updates number, toggles `.active` on streak pill.
- `renderTomorrowCount(goals)` — updates N planned badge.
- `loadToday()` — reads storage, calls `renderTodayHeader`, calls `renderListInto`.
- `loadTomorrow()` — reads storage, calls `renderTomorrowCount`, calls `renderListInto`.
- `renderListInto(goals, listEl, emptyEl, key, readOnly, reloadFn)` — clears `<ul>`, builds rows, applies show-more collapse if > 5.

### Init Sequence
```
1. const ANTHROPIC_API_KEY = '';       ← top of script
2. doRollover()
3. Set todayLabel and tomorrowLabel text
4. makeAddHandlers() for both today and tomorrow
5. loadToday()
6. loadTomorrow()
7. renderStreak()
8. renderProjects()
9. updateDayBar() + setInterval(updateDayBar, 60000)
10. startTicker()
11. Set expStartDate default to today
```

---

## Acceptance Criteria

1. File opens from `file://` URL or VS Code Live Server with zero console errors.
2. Nav shows all 5 tabs; clicking each switches pages.
3. Dashboard shows the gradient greeting, pulsing ticker, day ring, and two-column todo cards.
4. Ticker cycles through pending goals every 5s with vertical slide animation. Adding/checking/deleting a goal updates it immediately.
5. All-done state shows the celebration ticker item and greens the today card.
6. Day ring shows correct percentage, phase label, and color for the current time.
7. Goal rows support: custom checkbox, inline text editing, drag-reorder, queue flash (⚡), and delete.
8. Push-remaining moves unchecked goals to tomorrow (deduped) and removes them from today.
9. Character page shows all 8 domains expandable with per-skill XP inputs. Editing XP saves instantly.
10. Bible verse rotates by day of week.
11. Hevy key input saves to localStorage.
12. Domains page shows project cards with domain color badges and progress bars; add form works.
13. Lab page shows experiment cards with expandable logs; log entries save with today's date.
14. Calendar page shows connect buttons; connecting shows badge + attempts fetch with graceful fallback.
15. All state persists across full page refresh via localStorage.
16. The section title on the dashboard reads exactly `To Do List`.
