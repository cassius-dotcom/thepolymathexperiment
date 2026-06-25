const SUPABASE_URL = 'https://tilulkkukndyqpouizba.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpbHVsa2t1a25keXFwb3VpemJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTkxOTEsImV4cCI6MjA5NDQ3NTE5MX0.ffe0dbJKXHjA29JU2inOqCB1baJaJ-X0eDpen1_extc';
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let _currentUserId = null;

window.storage = {
  get: async (key) => {
    const v = localStorage.getItem(key);
    return v != null ? { value: v } : null;
  },
  // Returns true ONLY when this user's rows were successfully fetched (possibly
  // empty). A false return means "could not load" — callers must NOT treat that
  // as "new/empty user", or they will overwrite real data via last-write-wins.
  loadAll: async () => {
    if (!_currentUserId) return false;
    const { data, error } = await _sb.from('user_data').select('key, value').eq('user_id', _currentUserId);
    if (error) { console.error('Supabase load error:', error); return false; }
    if (data) data.forEach(row => localStorage.setItem(row.key, row.value));
    return true;
  }
};

// ============ SHARED STATE ============
function getToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
const NOW = Date.now();
const DAY_MS = 86400000;

// ============ AUTH UI ============
function showApp() {
  document.getElementById('auth-screen').classList.remove('show');
  document.getElementById('app-wrap').style.display = '';
}
function showAuth() {
  document.getElementById('auth-screen').classList.add('show');
  document.getElementById('app-wrap').style.display = 'none';
}

let _authMode = 'signin';
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.onclick = () => {
    _authMode = tab.dataset.mode;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('auth-submit').textContent = _authMode === 'signin' ? 'Sign in' : 'Create account';
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-success').style.display = 'none';
  };
});

document.getElementById('auth-submit').onclick = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  const okEl = document.getElementById('auth-success');
  const btn = document.getElementById('auth-submit');
  errEl.style.display = 'none';
  okEl.style.display = 'none';
  if (!email || !password) {
    errEl.textContent = 'Email and password are required.';
    errEl.style.display = 'block'; return;
  }
  btn.disabled = true;
  btn.textContent = _authMode === 'signin' ? 'Signing in…' : 'Creating account…';
  try {
    let result;
    if (_authMode === 'signin') {
      result = await _sb.auth.signInWithPassword({ email, password });
    } else {
      result = await _sb.auth.signUp({ email, password });
    }
    if (result.error) {
      errEl.textContent = result.error.message;
      errEl.style.display = 'block';
    } else if (_authMode === 'signup' && !result.data.session) {
      okEl.textContent = 'Check your email to confirm your account, then sign in.';
      okEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = err.message || 'Something went wrong.';
    errEl.style.display = 'block';
  }
  btn.disabled = false;
  btn.textContent = _authMode === 'signin' ? 'Sign in' : 'Create account';
};

document.getElementById('auth-password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('auth-submit').click();
});

// ============ LEGACY PRINCIPLES DATA (used ONLY for one-shot migration; see migrateToVirtues) ============
// After every existing user has been migrated, the inline data below in
// migrateToVirtues() is the only place these literals live. The old PRINCIPLES /
// EMOTIONAL_PILLAR globals have been retired in favor of state.virtues[].

const state = {
  categories: [], cards: [], books: [], summaries: [],
  reviewStats: { total: 0 },
  virtues: [],
  generalRules: [],
  experiments: [],
  meta: { firstVisit: true }
};

const ICONS = ['📚','🧠','💡','📖','🎯','⚖️','🔬','🎨','💼','🌍','🧘','💪','💰','❤️','🛠️','🗣️','🎵','✍️','🏛️','⚔️','🌱','🔥','✦','♟️'];
const VIRTUE_SYMBOLS = ['◆','⚡','⊙','◈','◇','◉','◎','⚖️','✦','✧','✶','★','☉','☼','◊','▲','■','●','♆','✚','✿','❄','☯','⚓'];
const KEYS = ['categories','cards','books','summaries','reviewStats','virtues','generalRules','experiments','meta'];

// ============ VIRTUE HELPERS ============
function getVirtueById(id) {
  return (state.virtues || []).find(v => v.id === id);
}
// Canonical virtue ordering: pinned first, then active before dormant, then
// insertion order (createdAt asc). getActiveVirtues pre-filters to active, so
// the active/dormant tier is inert there — same result, one comparator.
function virtueComparator(a, b) {
  if (a.pinned && !b.pinned) return -1;
  if (!a.pinned && b.pinned) return 1;
  if (a.active && !b.active) return -1;
  if (!a.active && b.active) return 1;
  return (a.createdAt || 0) - (b.createdAt || 0);
}
function getActiveVirtues() {
  return (state.virtues || []).filter(v => v.active).sort(virtueComparator);
}
function getAllVirtuesSorted() {
  return (state.virtues || []).slice().sort(virtueComparator);
}

const ALL_COMPONENT_TYPES = ['behaviors','mantras','questions','habits','challenges','antiBehaviors'];
// 'challenges' has its own item shape ({id, rung, text, phrase, createdAt}) and is no
// longer a generic string list. It gets its own editor + portrait anchor block.
const STRING_COMPONENT_TYPES = ['mantras','questions','habits','antiBehaviors'];
const DEFAULT_COMPONENT_ORDER = ['behaviors','mantras','questions','habits','challenges','antiBehaviors'];
// Legacy types intentionally absent from ALL_COMPONENT_TYPES / DEFAULT_COMPONENT_ORDER:
//   'triggers' — content was migrated into notes by migrateVirtuesToPortraitV2.
//   'rules'    — rules are now a separate concept (state.generalRules only). Existing
//                per-virtue rules were copied into generalRules by migrateRulesOutOfVirtues.

// A string-component item is either a bare string (legacy) or a {id, text} object.
const componentText = it => (typeof it === 'string' ? it : (it && it.text) || '');

function _normalizeStringComponent(arr) {
  if (!Array.isArray(arr)) return [];
  const now = Date.now();
  return arr.map(item => {
    if (typeof item === 'string') return { id: uid(), text: item, createdAt: now };
    if (item && typeof item === 'object') {
      return {
        id: item.id || uid(),
        text: item.text || '',
        createdAt: item.createdAt || now
      };
    }
    return { id: uid(), text: String(item || ''), createdAt: now };
  });
}

// A challenge item: {id, rung, text, phrase, createdAt}. Handles legacy items
// that were plain strings or {id, text, createdAt} from the earlier string-list
// shape — defaults phrase to '' and rung to the array index + 1.
function _normalizeChallenges(arr) {
  if (!Array.isArray(arr)) return [];
  const now = Date.now();
  return arr.map((item, idx) => {
    if (typeof item === 'string') {
      return { id: uid(), rung: idx + 1, text: item, phrase: '', createdAt: now };
    }
    if (item && typeof item === 'object') {
      return {
        id: item.id || uid(),
        rung: Number.isInteger(item.rung) ? item.rung : (idx + 1),
        text: item.text || '',
        phrase: typeof item.phrase === 'string' ? item.phrase : '',
        createdAt: item.createdAt || now
      };
    }
    return { id: uid(), rung: idx + 1, text: String(item || ''), phrase: '', createdAt: now };
  });
}

function ensureVirtueShape(v) {
  if (!Array.isArray(v.behaviors)) v.behaviors = [];
  // Behaviors stay {id, text, cue, why, createdAt}
  const nowB = Date.now();
  v.behaviors = v.behaviors.map(b => ({
    id: b.id || uid(),
    text: b.text || '',
    cue: b.cue || '',
    why: b.why || '',
    createdAt: b.createdAt || nowB
  }));
  // All other component types: arrays of {id, text, createdAt}
  v.antiBehaviors = _normalizeStringComponent(v.antiBehaviors);
  v.habits        = _normalizeStringComponent(v.habits);
  v.mantras       = _normalizeStringComponent(v.mantras);
  v.questions     = _normalizeStringComponent(v.questions);
  v.challenges    = _normalizeChallenges(v.challenges);
  // Deprecated fields. Their content is preserved by one-shot migrations
  // (V2 -> notes, RulesOut -> state.generalRules) before being stripped here.
  delete v.triggers;
  delete v.rules;
  // Portrait prose ("how he acts") + free-form notes log
  if (typeof v.portrait !== 'string') v.portrait = '';
  v.notes = _normalizeStringComponent(v.notes);
  if (!Array.isArray(v.componentOrder)) {
    v.componentOrder = ['behaviors'];
  }
  // Strip any legacy entries from a previously-saved componentOrder.
  v.componentOrder = v.componentOrder.filter(t => t !== 'triggers' && t !== 'rules');
  return v;
}

// ============ MIGRATION: principles -> virtues ============
const _LEGACY_EMOTIONAL = {
  name: 'Emotional Governance', emoji: '⚖️',
  quote: '"Feelings are data, not directives."',
  reps: [
    { id: 'e1', text: 'Notice and name one emotion before reacting to it.', cue: 'Pause. Name accurately. Then choose.', why: 'You cannot govern what you have not named. Naming is the first act of self-mastery.' },
    { id: 'e2', text: 'Audit your inner monologue — no victim language, no self-insult.', cue: 'Catch one negative loop. Reframe in clean truth.', why: 'How you speak to yourself sets the ceiling for how you act. Self-talk is self-architecture.' },
    { id: 'e3', text: 'One moment of restraint where reaction was easy.', cue: 'Unsent message. Withheld retort. Chosen silence.', why: 'The reactive man is governed by impulse. The chosen pause is where you reclaim authorship.' },
    { id: 'e4', text: 'Keep one small promise to yourself, on time.', cue: 'Self-respect is built here. Nowhere else.', why: 'Every kept promise is evidence to yourself that your word means something — including to you.' },
    { id: 'e5', text: 'Sit with one uncomfortable emotion for 60 seconds without distraction.', cue: 'No phone. No food. No escape. Just feel it.', why: 'The emotions you flee from run your life. The ones you stay with become information.' },
    { id: 'e6', text: 'Take one breath before responding to something charged.', cue: 'One breath. The reactive man does not have it. You do.', why: 'The space between trigger and response is where freedom lives. Make it wider on purpose.' },
    { id: 'e7', text: "Choose one feeling you're acting from. Decide if you trust it as direction.", cue: 'Feelings are data, not directives.', why: 'Some feelings are signal. Some are static. Distinguishing them is half the work.' }
  ]
};
const _LEGACY_PRINCIPLES = [
  { name: 'Coherence', identity: '"He embodies who he claims to be."', body: 'Private actions match public standards. Self-respect built on behavior, not approval. The unwatched moment is the real test.', emoji: '◆', reps: [
    { id: 'co1', text: 'Catch one moment of performing for image. Do the unwatched action instead.', cue: 'The room is empty. Be the same man.', why: 'Coherence is built when no one is watching. Performance erodes the foundation.' },
    { id: 'co2', text: 'Match one private behavior to a public standard you hold.', cue: 'Where do you let the standard slip?', why: 'Hypocrisy is the slow-acting poison. Close the gap deliberately.' },
    { id: 'co3', text: 'Refuse one small image-protecting lie or half-truth.', cue: 'The accurate thing, not the flattering one.', why: 'Each unsaid truth compounds. Each spoken one builds self-trust.' }
  ]},
  { name: 'Capacity', identity: '"He chooses what increases his long-term capacity."', body: 'Choose what increases long-term capacity. Tolerate discomfort without drama. Comfort is a tool, not a goal.', emoji: '⚡', reps: [
    { id: 'cp1', text: 'Choose the harder option once today where comfort was the default.', cue: 'The path you wanted to skip. Take it.', why: 'Capacity is built by repeatedly choosing what comfort refuses.' },
    { id: 'cp2', text: 'Stay with one uncomfortable task five minutes past wanting to quit.', cue: "The edge is the lesson. Don't bail.", why: 'The five minutes past wanting to quit is where capacity grows. Everything before is maintenance.' },
    { id: 'cp3', text: 'Name one comfort that is quietly costing you. Reduce it today.', cue: 'Comfort masquerading as need.', why: 'What you tolerate, you reinforce. The comfort is teaching you to need it.' }
  ]},
  { name: 'Truth', identity: '"Accurate self-assessment over flattering narratives."', body: 'Prefer accurate self-assessment over flattering narratives. Learn faster by not defending identity.', emoji: '⊙', reps: [
    { id: 'tr1', text: 'Admit one thing you were wrong about. No softening.', cue: 'Just say it. Without context. Without justification.', why: 'The ability to admit error without collapse is the foundation of learning.' },
    { id: 'tr2', text: "Ask one person for honest feedback you've been avoiding.", cue: 'The feedback you fear is the feedback you need.', why: 'You cannot fix what you refuse to see. Others see it.' },
    { id: 'tr3', text: 'Name one flattering story you tell yourself. Then tell yourself the truer one.', cue: 'The narrative is comfortable. The truth is useful.', why: 'Stories protect identity. Truth builds capacity.' }
  ]},
  { name: 'Agency', identity: '"He assumes agency even when outcomes were unfair."', body: 'Assume agency even when outcomes were unfair. Never outsource accountability.', emoji: '◈', reps: [
    { id: 'ag1', text: 'Catch one piece of victim language. Reframe it in agency.', cue: '"They made me…" → "I chose to…"', why: 'Language shapes posture. Victim language locks the body into helplessness.' },
    { id: 'ag2', text: "Take ownership of one thing you've been blaming on circumstances.", cue: 'Even if 90% was outside your control, own the 10% that was yours.', why: 'Ownership is the only door agency walks through.' },
    { id: 'ag3', text: 'Make one structural choice that gives your future self options.', cue: 'Set up the path. Then walk it.', why: "Responsibility isn't felt — it's built into the structure of your days." }
  ]},
  { name: 'Structure', identity: '"Routines reduce negotiation."', body: 'Structure now means options later. Routines reduce daily negotiation.', emoji: '◇', reps: [
    { id: 'st1', text: 'Keep one small promise to yourself that you usually negotiate around.', cue: "The thing you've been talking yourself out of.", why: 'Self-respect lives in kept promises to yourself. Nowhere else.' },
    { id: 'st2', text: 'Build one piece of structure that removes a daily choice.', cue: 'Pre-decide. Future you will thank present you.', why: 'Every saved negotiation is willpower banked for what matters.' },
    { id: 'st3', text: "Show up to one thing on time, prepared. Especially if you don't feel like it.", cue: "Reliability is built in the moments you don't want to.", why: "Discipline shows up when motivation doesn't. That's the whole point." }
  ]},
  { name: 'Steadiness', identity: '"He does not chase; he chooses."', body: "Tenderness as choice, not dependency. Don't confuse neediness with intimacy.", emoji: '◉', reps: [
    { id: 'sd1', text: 'One conversation with full presence — phone away, no agenda.', cue: 'Presence is the most expensive thing you can give.', why: 'Love is steady attention. Distraction is the opposite of love.' },
    { id: 'sd2', text: "Hold one boundary you'd normally negotiate to keep peace.", cue: 'Boundaries are kindness with consequences.', why: "The man who can't say no can't truly say yes." },
    { id: 'sd3', text: 'No chasing, pleading, or over-explaining today.', cue: "Invite. Don't beg. Choose. Don't chase.", why: 'Neediness empties love. Steadiness fills it.' }
  ]},
  { name: 'Humility', identity: '"Pride is the enemy in disguise."', body: 'Faith as alignment, not bypass. Pride is the enemy in disguise. Humility before something larger keeps the ego in scale.', emoji: '◎', reps: [
    { id: 'hu1', text: 'Take one moment of prayer, silence, or reflection. No phone, no input.', cue: 'Be small for a moment. Then choose well.', why: 'Humility before something larger keeps the ego in scale.' },
    { id: 'hu2', text: 'Catch one moment of pride. Name it. Choose service instead.', cue: 'Pride disguises itself as confidence. Watch for it.', why: "Pride blinds. Humility sees. You can't fix what pride won't let you see." },
    { id: 'hu3', text: 'Give value to one person today expecting nothing back.', cue: 'Service from strength, not for show.', why: 'Service realigns you to something bigger than yourself.' }
  ]}
];

function migrateToVirtues() {
  if (state.meta && state.meta.migratedToVirtues) return false;
  if (!Array.isArray(state.virtues)) state.virtues = [];

  // Only migrate if nothing has been authored yet (avoid overwriting on re-run)
  if (state.virtues.length === 0) {
    const now = Date.now();

    // Emotional Governance — pinned virtue
    state.virtues.push({
      id: uid(),
      name: _LEGACY_EMOTIONAL.name,
      symbol: _LEGACY_EMOTIONAL.emoji,
      identityLine: _LEGACY_EMOTIONAL.quote,
      body: 'Notice, name, choose. Feelings are data, not directives. Upstream of every other virtue.',
      behaviors: _LEGACY_EMOTIONAL.reps.map(r => ({
        id: r.id, text: r.text, cue: r.cue, why: r.why
      })),
      rules: [],
      active: true,
      pinned: true,
      createdAt: now,
      updatedAt: now
    });

    // Seven principles -> seven active virtues, in original order
    _LEGACY_PRINCIPLES.forEach((p, idx) => {
      state.virtues.push({
        id: uid(),
        name: p.name,
        symbol: p.emoji,
        identityLine: p.identity,
        body: p.body,
        behaviors: p.reps.map(r => ({
          id: r.id, text: r.text, cue: r.cue, why: r.why
        })),
        rules: [],
        active: true,
        pinned: false,
        createdAt: now + idx + 1,
        updatedAt: now + idx + 1
      });
    });
  }

  // Drop legacy state
  delete state.week;
  delete state.weeklyReviews;

  // Ensure every seeded virtue has the full component shape so migrateVirtuesToComponents
  // doesn't need to do double-work on the same data.
  state.virtues.forEach(ensureVirtueShape);

  state.meta = state.meta || {};
  state.meta.migratedToVirtues = true;
  state.meta.version = 2;
  return true;
}

// ============ MIGRATION: virtues -> components + rule objects + generalRules (one-shot) ============
function migrateVirtuesToComponents() {
  // migratedToObjectRules supersedes the older migratedToComponents flag.
  if (state.meta && state.meta.migratedToObjectRules) return false;
  state.virtues = state.virtues || [];
  state.virtues.forEach(ensureVirtueShape);
  state.generalRules = _normalizeStringComponent(state.generalRules);
  state.meta = state.meta || {};
  state.meta.migratedToComponents = true;
  state.meta.migratedToObjectRules = true;
  return true;
}

// ============ MIGRATION: challenges become an exposure ladder (one-shot) ============
// Old shape: challenges items were {id, text, createdAt} (a generic string list).
// New shape: each item is {id, rung, text, phrase, createdAt} — a rung on a
// climbing ladder with an example phrase to use. Idempotent.
function migrateChallengesToLadder() {
  if (state.meta && state.meta.migratedChallengesToLadder) return false;
  state.virtues = state.virtues || [];
  state.virtues.forEach(v => {
    if (Array.isArray(v.challenges)) {
      v.challenges = _normalizeChallenges(v.challenges);
    }
  });
  state.meta = state.meta || {};
  state.meta.migratedChallengesToLadder = true;
  return true;
}

// ============ MIGRATION: rules out of virtues (one-shot) ============
// Severs the virtue↔rule association — rules become a separate concept
// (state.generalRules) and never live inside a virtue again. Per-virtue rules
// are preserved by being copied into state.generalRules. Run BEFORE
// ensureVirtueShape strips v.rules.
function migrateRulesOutOfVirtues() {
  if (state.meta && state.meta.migratedRulesOutOfVirtues) return false;
  state.virtues = state.virtues || [];
  state.generalRules = Array.isArray(state.generalRules) ? state.generalRules : [];
  // De-dupe by rule id so a re-run (shouldn't happen, but defensively) can't
  // double-add a rule that's already in generalRules.
  const existingIds = new Set(state.generalRules.map(r => r && r.id).filter(Boolean));
  const now = Date.now();
  state.virtues.forEach((v, vi) => {
    const rules = Array.isArray(v.rules) ? v.rules : [];
    rules.forEach((r, ri) => {
      const text = (typeof r === 'string') ? r : (r && r.text) || '';
      if (!text) return;
      const id = (r && r.id) || uid();
      if (existingIds.has(id)) return;
      state.generalRules.push({
        id,
        text,
        createdAt: (r && r.createdAt) || (now + vi * 1000 + ri)
      });
      existingIds.add(id);
    });
    // ensureVirtueShape will strip v.rules and the 'rules' entry from
    // componentOrder on its next call; nothing to do here.
  });
  state.meta = state.meta || {};
  state.meta.migratedRulesOutOfVirtues = true;
  return true;
}

// ============ MIGRATION: portrait V2 (one-shot) ============
// Adds the portrait prose field, questions/challenges component types, and a
// per-virtue notes log. Folds any existing 'triggers' content into notes so
// nothing is lost when triggers is retired as a standalone section.
function migrateVirtuesToPortraitV2() {
  if (state.meta && state.meta.migratedToPortraitV2) return false;
  state.virtues = state.virtues || [];
  state.virtues.forEach(v => {
    // Preserve any existing trigger text into notes BEFORE ensureVirtueShape strips it.
    const legacyTriggers = Array.isArray(v.triggers) ? v.triggers : [];
    if (legacyTriggers.length) {
      v.notes = Array.isArray(v.notes) ? v.notes : [];
      const now = Date.now();
      legacyTriggers.forEach((t, i) => {
        const text = (typeof t === 'string') ? t : (t && t.text) || '';
        if (!text) return;
        v.notes.push({
          id: uid(),
          text: '[from triggers] ' + text,
          createdAt: now + i
        });
      });
    }
    ensureVirtueShape(v);
  });
  state.meta = state.meta || {};
  state.meta.migratedToPortraitV2 = true;
  return true;
}

async function loadState(loadOk = true) {
  for (const k of KEYS) {
    try {
      const r = await window.storage.get('os:' + k);
      if (r && r.value) state[k] = JSON.parse(r.value);
    } catch (e) {}
  }

  // CRITICAL: only seed defaults / run one-shot migrations / persist when we
  // positively know the server's state for this user. If the remote load failed,
  // an empty `state` means "couldn't fetch", NOT "new user" — seeding and saving
  // here would overwrite the user's real (unloaded) data via last-write-wins.
  if (!loadOk) {
    renderAll();
    toast("Couldn't load your data — retrying. Your data is safe.");
    return;
  }

  if (state.categories.length === 0) {
    state.categories = [
      { id: 'general', name: 'General', icon: '🧠', created: NOW },
      { id: 'philosophy', name: 'Philosophy', icon: '🏛️', created: NOW },
      { id: 'language', name: 'Language', icon: '🗣️', created: NOW },
    ];
    save('categories', true);
  }

  // Run one-shot migration from principles -> virtues (gated on meta.migratedToVirtues)
  if (migrateToVirtues()) {
    await save('virtues', true);
    await save('meta', true);
  }
  // These two field-retiring migrations MUST run before migrateVirtuesToComponents
  // (and its defensive ensureVirtueShape fallback), because ensureVirtueShape
  // deletes v.triggers and v.rules. They need to read those fields first to
  // preserve their content (triggers → notes, rules → generalRules). Reordering
  // would silently drop data on next load.
  if (migrateRulesOutOfVirtues()) {
    await save('virtues', true);
    await save('generalRules', true);
    await save('meta', true);
  }
  if (migrateVirtuesToPortraitV2()) {
    await save('virtues', true);
    await save('meta', true);
  }
  // Challenges -> exposure ladder shape. Safe to run any time (ensureVirtueShape
  // also normalizes via _normalizeChallenges); the explicit migration just
  // persists the upgraded shape with a single save.
  if (migrateChallengesToLadder()) {
    await save('virtues', true);
    await save('meta', true);
  }
  // Run one-shot migration to add new component arrays + componentOrder + object-form rules
  if (migrateVirtuesToComponents()) {
    await save('virtues', true);
    await save('generalRules', true);
    await save('meta', true);
  } else {
    // Defensive: even if migration flag is set, ensure every virtue + generalRules has the full shape
    // (in case a virtue was imported or hand-edited)
    (state.virtues || []).forEach(ensureVirtueShape);
    state.generalRules = _normalizeStringComponent(state.generalRules);
  }

  if (state.meta.firstVisit) {
    setTimeout(() => document.getElementById('help-modal').classList.add('show'), 400);
  }
  renderAll();
}

// localStorage is written synchronously on every save (instant, durable local
// cache — reads and reloads always see the latest). Remote sync to Supabase is
// coalesced: a burst of saves (e.g. cards+reviewStats together, or fast card
// grading) is batched into a single upsert instead of one request per save.
// Latest value per key wins, matching the previous last-write-wins blob model.
const _syncQueue = new Map(); // 'os:<key>' -> { value, notify }
let _syncTimer = null;
const SYNC_DEBOUNCE_MS = 400;

function _scheduleFlush() {
  if (_syncTimer) return; // bounded window: flush ~400ms after the first queued save
  _syncTimer = setTimeout(flushSync, SYNC_DEBOUNCE_MS);
}

async function flushSync() {
  if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
  if (!_currentUserId || _syncQueue.size === 0) return;
  const batch = [..._syncQueue.entries()];
  _syncQueue.clear();
  const updated_at = new Date().toISOString();
  const rows = batch.map(([key, entry]) => ({
    user_id: _currentUserId, key, value: entry.value, updated_at
  }));
  const { error } = await _sb.from('user_data').upsert(rows, { onConflict: 'user_id,key' });
  if (error) {
    console.error('Sync error for', batch.map(([k]) => k).join(', '), error);
    if (batch.some(([, e]) => e.notify)) toast('Not synced — check connection');
  }
}

async function save(key, silent = false) {
  const json = JSON.stringify(state[key]);
  localStorage.setItem('os:' + key, json);
  if (!silent) toast('Saved');
  if (!_currentUserId) return;
  _syncQueue.set('os:' + key, { value: json, notify: !silent });
  _scheduleFlush();
}

// Best-effort flush when the tab is hidden or closed so queued writes aren't
// stranded in the debounce window.
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushSync();
});
window.addEventListener('pagehide', flushSync);

// ============ TOAST ============
let toastTimer;
function toast(text) {
  const el = document.getElementById('toast');
  document.getElementById('toast-text').textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1400);
}

// ============ UTILS ============
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
function dueCount(categoryId = null) {
  return state.cards.filter(c =>
    (categoryId === null || c.categoryId === categoryId) && c.due <= Date.now()
  ).length;
}
function categoryCardCount(categoryId) {
  return state.cards.filter(c => c.categoryId === categoryId).length;
}
function getCategoryById(id) { return state.categories.find(c => c.id === id); }
function dueLabel(due, now = Date.now()) {
  return due <= now ? 'Due now' : `Due in ${Math.ceil((due - now) / DAY_MS)}d`;
}

// ============ GREETING / DATE ============
function setDateGreeting() {
  const now = new Date();
  document.getElementById('date-pill').textContent =
    now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const hour = now.getHours();
  let g = 'Good morning';
  if (hour >= 12 && hour < 17) g = 'Good afternoon';
  else if (hour >= 17) g = 'Good evening';
  // Greeting element was removed when Today was rebuilt — guard so this stays safe if reintroduced.
  const greetingEl = document.getElementById('greeting');
  if (greetingEl) greetingEl.textContent = g;
}

// ============ NAV ============
let currentView = 'today';
let currentCategoryId = null;
let mindMode = 'home';

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.view;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('view-' + view).classList.add('active');
    currentView = view;
    renderView(view); // render the destination fresh (views are no longer eagerly rebuilt)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ============ TODAY: VIRTUE LIST HOMEPAGE ============
function renderHomepage() {
  const container = document.getElementById('virtue-list-container');
  if (!container) return;
  container.innerHTML = '';

  const virtues = getActiveVirtues();

  if (virtues.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">◇</div>
        <div class="empty-state-text">No active virtues.</div>
        <div class="empty-state-sub">Open Constitution to activate one or write a new virtue.</div>
      </div>`;
    return;
  }

  virtues.forEach(v => {
    const row = document.createElement('div');
    row.className = 'virtue-list-row';
    row.dataset.virtueId = v.id;
    row.dataset.pinned = v.pinned ? 'true' : 'false';
    row.innerHTML = `
      <div class="virtue-list-top">
        <div class="virtue-list-title">
          <span class="virtue-list-symbol">${escapeHtml(v.symbol || '◆')}</span>
          <span class="virtue-list-name">${escapeHtml(v.name)}</span>
        </div>
        <span class="virtue-list-chevron">›</span>
      </div>
      <div class="virtue-list-identity">${escapeHtml(v.identityLine || '')}</div>
    `;
    row.addEventListener('click', () => openVirtueView(v.id));
    container.appendChild(row);
  });
}

function renderToday() {
  renderHomepage();
}

// ============ RULES VIEW ============
// Rules are a standalone concept now: they live only in state.generalRules
// and never inside a virtue. Existing per-virtue rules were migrated by
// migrateRulesOutOfVirtues.
function renderRulesView() {
  const container = document.getElementById('rules-list-container');
  const countEl = document.getElementById('rules-count');
  if (!container) return;

  const rules = (state.generalRules || []).slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  if (countEl) {
    countEl.textContent = rules.length === 0
      ? 'No rules yet. The lines he keeps.'
      : `${rules.length} rule${rules.length === 1 ? '' : 's'}. The lines he keeps.`;
  }

  if (rules.length === 0) {
    container.innerHTML = '<div class="rules-empty">No rules yet.<br>Tap "+ Add Rule" to write the first one.</div>';
    return;
  }

  container.innerHTML = '';
  rules.forEach(r => {
    const row = document.createElement('div');
    row.className = 'rule-row';
    row.dataset.ruleId = r.id;

    row.innerHTML = `
      <span class="rule-row-bullet">◆</span>
      <div style="flex:1; min-width:0;">
        <div class="rule-row-text">${escapeHtml(r.text)}</div>
        <input class="rule-row-input" type="text" value="${escapeHtml(r.text)}"/>
      </div>
      <button class="rule-row-delete" aria-label="Delete">×</button>
    `;

    const textSpan = row.querySelector('.rule-row-text');
    const input = row.querySelector('.rule-row-input');
    const delBtn = row.querySelector('.rule-row-delete');

    row.addEventListener('click', (e) => {
      if (row.classList.contains('editing')) return;
      if (e.target.closest('.rule-row-delete')) return;
      enterRuleEditMode(row, input);
    });
    input.addEventListener('blur', () => commitRuleEdit(row, input));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = textSpan.textContent; row.classList.remove('editing'); }
    });
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteRuleByRow(row); });

    container.appendChild(row);
  });
}

function enterRuleEditMode(row, input) {
  row.classList.add('editing');
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function commitRuleEdit(row, input) {
  const newText = input.value.trim();
  const ruleId = row.dataset.ruleId;
  if (!newText) {
    row.classList.remove('editing');
    input.value = row.querySelector('.rule-row-text').textContent;
    return;
  }
  const r = (state.generalRules || []).find(x => x.id === ruleId);
  if (r) { r.text = newText; save('generalRules'); }
  row.querySelector('.rule-row-text').textContent = newText;
  row.classList.remove('editing');
}

function deleteRuleByRow(row) {
  if (!confirm('Delete this rule?')) return;
  const ruleId = row.dataset.ruleId;
  state.generalRules = (state.generalRules || []).filter(r => r.id !== ruleId);
  save('generalRules');
  renderRulesView();
}

// Add-rule sheet — single step. Just write the rule.
function openAddRuleSheet() {
  const sheet = document.getElementById('rule-add-sheet');
  const input = document.getElementById('rule-add-text-input');
  input.value = '';
  sheet.style.display = 'flex';
  setTimeout(() => input.focus(), 60);
}

function closeAddRuleSheet() {
  document.getElementById('rule-add-sheet').style.display = 'none';
}

function commitAddRule() {
  const input = document.getElementById('rule-add-text-input');
  const text = input.value.trim();
  if (!text) { toast('Write the rule first'); input.focus(); return; }

  state.generalRules = state.generalRules || [];
  state.generalRules.push({ id: uid(), text, createdAt: Date.now() });
  save('generalRules');

  closeAddRuleSheet();
  renderRulesView();
}

// Wire up the static rules-view buttons (these elements exist from page load)
document.getElementById('rules-add-btn').onclick = openAddRuleSheet;
document.getElementById('rule-add-backdrop').onclick = closeAddRuleSheet;
document.getElementById('rule-add-cancel-btn').onclick = closeAddRuleSheet;
document.getElementById('rule-add-save-btn').onclick = commitAddRule;
document.getElementById('rule-add-text-input').addEventListener('keydown', (e) => {
  // Enter saves; Shift+Enter inserts a newline.
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitAddRule(); }
});

// ============ FULL-SCREEN VIRTUE VIEW ============
let currentVirtueId = null;

const COMPONENT_LABELS = {
  behaviors:     'WHAT HE DOES',
  mantras:       'WHAT HE SAYS',
  questions:     'WHAT HE ASKS',
  habits:        'DAILY',
  challenges:    'CHALLENGES',
  antiBehaviors: 'WHAT HE REFUSES'
};

function openVirtueView(virtueId) {
  const v = getVirtueById(virtueId);
  if (!v) return;
  ensureVirtueShape(v);
  currentVirtueId = virtueId;
  renderVirtueView(v);
  const overlay = document.getElementById('virtue-view-overlay');
  overlay.style.display = 'block';
  overlay.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

function closeVirtueView() {
  const overlay = document.getElementById('virtue-view-overlay');
  overlay.style.display = 'none';
  document.body.style.overflow = '';
  currentVirtueId = null;
}

// Supporting sections that render BELOW the challenges anchor, in this fixed
// flat order. The user's brief asked for CONTEXT, WHAT HE SAYS, WHAT HE DOES,
// WHAT HE REFUSES specifically; the remaining component types (questions,
// habits) are interleaved in the natural reading order. CONTEXT is handled
// inline (it's not a component type). 'challenges' is the anchor block and
// is intentionally excluded from this list.
const SUPPORTING_SECTION_ORDER = ['mantras','questions','behaviors','habits','antiBehaviors'];

function renderVirtueView(v) {
  const container = document.getElementById('virtue-view-container');

  const ladderHtml = renderChallengeLadder(v);

  // Render supporting sections in the fixed flat order above, omitting any
  // type whose data is empty (renderComponentSection returns ''). The legacy
  // componentOrder is ignored here on purpose — the new layout has its own
  // reading hierarchy, and componentOrder still drives the editor list.
  const supportingHtml = SUPPORTING_SECTION_ORDER
    .map(type => renderComponentSection(type, v))
    .filter(Boolean).join('');

  container.innerHTML = `
    <div class="virtue-view-topbar">
      <button class="virtue-view-back" id="virtue-view-back-btn">← Back</button>
      <button class="virtue-view-edit" id="virtue-view-edit-btn">Edit</button>
    </div>

    <div class="virtue-portrait">
      <div class="virtue-portrait-symbol">${escapeHtml(v.symbol || '◆')}</div>
      ${v.pinned ? '<div class="virtue-portrait-pinned">PINNED</div>' : ''}
      <div class="virtue-portrait-name">${escapeHtml(v.name)}</div>
      <div class="virtue-portrait-identity">${escapeHtml(v.identityLine || '')}</div>
    </div>

    ${ladderHtml}

    ${v.portrait ? `
      <div class="virtue-section supporting">
        <div class="virtue-section-label">HOW HE ACTS</div>
        <div class="virtue-portrait-prose">${escapeHtml(v.portrait)}</div>
      </div>` : ''}

    ${v.body ? `
      <div class="virtue-section supporting">
        <div class="virtue-section-label">CONTEXT</div>
        <div class="virtue-body-box">${escapeHtml(v.body)}</div>
      </div>` : ''}

    ${supportingHtml}

    ${renderVirtueNotesSection(v)}
  `;

  document.getElementById('virtue-view-back-btn').onclick = closeVirtueView;
  document.getElementById('virtue-view-edit-btn').onclick = editCurrentVirtue;
  wireVirtueNotesSection(v);
}

// ============ CHALLENGES LADDER (portrait anchor) ============
// Renders the lead block of the portrait — challenges ordered by rung,
// lowest at top, each with the challenge text and its example phrase.
// Returns '' if the virtue has no challenges yet so the section degrades
// out cleanly rather than rendering an empty header.
function renderChallengeLadder(v) {
  const items = (v.challenges || []).slice()
    .sort((a, b) => (a.rung || 0) - (b.rung || 0));
  if (!items.length) return '';

  const rungs = items.map((c, idx) => {
    const num = Number.isInteger(c.rung) ? c.rung : (idx + 1);
    return `
      <li class="virtue-rung">
        <span class="virtue-rung-num">${num}</span>
        <div class="virtue-rung-body">
          <div class="virtue-rung-text">${escapeHtml(c.text || '')}</div>
          ${c.phrase ? `<div class="virtue-rung-phrase">"${escapeHtml(c.phrase)}"</div>` : ''}
        </div>
      </li>`;
  }).join('');

  return `
    <div class="virtue-section virtue-challenges-anchor">
      <div class="virtue-anchor-label">CHALLENGES</div>
      <ol class="virtue-rung-list">${rungs}</ol>
    </div>`;
}

// ============ VIRTUE NOTES (per-virtue free-form log) ============
function renderVirtueNotesSection(v) {
  const notes = (v.notes || []).slice().reverse(); // newest first
  const items = notes.length
    ? notes.map(n => `
        <div class="virtue-note-item" data-note-id="${escapeHtml(n.id)}">
          <div class="virtue-note-text">${escapeHtml(n.text)}</div>
          <div class="virtue-note-row">
            <span class="virtue-note-date">${formatNoteDate(n.createdAt)}</span>
            <button class="virtue-note-del" data-note-id="${escapeHtml(n.id)}" aria-label="Delete note">×</button>
          </div>
        </div>`).join('')
    : `<div class="virtue-note-empty">No notes yet. Record moments — when it showed up, when it slipped, what you noticed.</div>`;

  return `
    <div class="virtue-section virtue-notes-section">
      <div class="virtue-section-label">NOTES</div>
      <div class="virtue-note-list" id="virtue-note-list">${items}</div>
      <div class="virtue-note-input-row">
        <textarea id="virtue-note-input" rows="2" placeholder="Log a moment..."></textarea>
        <button class="btn btn-primary" id="virtue-note-add-btn">+ Add note</button>
      </div>
    </div>`;
}

function wireVirtueNotesSection(v) {
  const input  = document.getElementById('virtue-note-input');
  const addBtn = document.getElementById('virtue-note-add-btn');
  if (!input || !addBtn) return;

  addBtn.onclick = () => addNoteToVirtue(v.id, input.value);
  input.addEventListener('keydown', e => {
    // Enter saves; Shift+Enter inserts a newline. Matches the rule-add pattern.
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNoteToVirtue(v.id, input.value); }
  });

  document.querySelectorAll('#virtue-note-list .virtue-note-del').forEach(btn => {
    btn.onclick = () => deleteNoteFromVirtue(v.id, btn.dataset.noteId);
  });
}

async function addNoteToVirtue(virtueId, rawText) {
  const text = (rawText || '').trim();
  if (!text) return;
  const v = getVirtueById(virtueId);
  if (!v) return;
  ensureVirtueShape(v);
  v.notes.push({ id: uid(), text, createdAt: Date.now() });
  v.updatedAt = Date.now();
  await save('virtues', true);
  // Re-render only the open portrait — no full renderAll needed.
  renderVirtueView(v);
}

async function deleteNoteFromVirtue(virtueId, noteId) {
  if (!confirm('Delete this note?')) return;
  const v = getVirtueById(virtueId);
  if (!v) return;
  ensureVirtueShape(v);
  v.notes = v.notes.filter(n => n.id !== noteId);
  v.updatedAt = Date.now();
  await save('virtues', true);
  renderVirtueView(v);
}

function formatNoteDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderComponentSection(type, v) {
  const items = v[type] || [];
  if (!items.length) return '';
  const label = COMPONENT_LABELS[type];

  const textOf = componentText;

  let body = '';
  switch (type) {
    case 'behaviors':
      body = items.map(b => `
        <div class="virtue-behavior-item">
          <div class="virtue-behavior-text${b.cue ? ' has-cue' : ''}">${escapeHtml(b.text || '')}</div>
          ${b.cue ? `<div class="virtue-behavior-cue">Cue: ${escapeHtml(b.cue)}</div>` : ''}
          ${b.why ? `<div class="virtue-behavior-why">${escapeHtml(b.why)}</div>` : ''}
        </div>`).join('');
      break;
    case 'mantras':
      body = items.map(m => `<div class="virtue-mantra-item">${escapeHtml(textOf(m))}</div>`).join('');
      break;
    case 'questions':
      body = items.map(q => `
        <div class="virtue-question-item">
          <span class="virtue-question-mark">?</span>
          <span class="virtue-question-text">${escapeHtml(textOf(q))}</span>
        </div>`).join('');
      break;
    case 'antiBehaviors':
      body = items.map(a => `
        <div class="virtue-anti-item">
          <span class="virtue-anti-x">✕</span>
          <span class="virtue-anti-text">${escapeHtml(textOf(a))}</span>
        </div>`).join('');
      break;
    case 'habits':
      body = items.map(h => `
        <div class="virtue-habit-item">
          <span class="virtue-habit-mark">◐</span>
          <span class="virtue-habit-text">${escapeHtml(textOf(h))}</span>
        </div>`).join('');
      break;
  }

  return `
    <div class="virtue-section supporting">
      <div class="virtue-section-label">${label}</div>
      ${body}
    </div>`;
}

function editCurrentVirtue() {
  if (!currentVirtueId) return;
  const id = currentVirtueId;
  closeVirtueView();
  // Switch to Constitution tab
  const tab = document.querySelector('.tab[data-view="constitution"]');
  if (tab) tab.click();
  setTimeout(() => openVirtueEditor(id), 60);
}

// ============ MIND VIEW ============
function showMindHome() {
  document.getElementById('mind-home').style.display = 'block';
  document.getElementById('mind-category').style.display = 'none';
  mindMode = 'home';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showMindCategory(catId) {
  currentCategoryId = catId;
  document.getElementById('mind-home').style.display = 'none';
  document.getElementById('mind-category').style.display = 'block';
  mindMode = 'category';
  renderCategoryDetail();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('cat-back-btn').onclick = showMindHome;

function renderLibraryStats() {
  document.getElementById('stat-due').textContent = dueCount();
  document.getElementById('stat-cards').textContent = state.cards.length;
  document.getElementById('stat-reviewed').textContent = state.reviewStats.total || 0;
}

function renderReviewBanner() {
  const banner = document.getElementById('review-banner');
  const due = dueCount();
  if (state.cards.length === 0) {
    banner.classList.add('empty');
    document.getElementById('rb-eyebrow').textContent = "Start the practice";
    document.getElementById('rb-title').textContent = "Your library is empty.";
    document.getElementById('rb-sub').textContent = "Create your first flashcard to begin.";
    document.getElementById('rb-cta-text').textContent = "Add a card";
    banner.onclick = () => openAddModal('card');
  } else if (due === 0) {
    banner.classList.add('empty');
    document.getElementById('rb-eyebrow').textContent = "All clear";
    document.getElementById('rb-title').textContent = "Nothing due today.";
    document.getElementById('rb-sub').textContent = "Come back tomorrow, or add more cards.";
    document.getElementById('rb-cta-text').textContent = "Add a card";
    banner.onclick = () => openAddModal('card');
  } else {
    banner.classList.remove('empty');
    document.getElementById('rb-eyebrow').textContent = "Today's review";
    document.getElementById('rb-title').textContent = `${due} card${due === 1 ? '' : 's'} due.`;
    document.getElementById('rb-sub').textContent = "Each review deepens the trace. Compounding by design.";
    document.getElementById('rb-cta-text').textContent = "Begin review";
    banner.onclick = () => startReview(null);
  }
}

function renderCategories() {
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '';
  state.categories.forEach(cat => {
    const count = categoryCardCount(cat.id);
    const due = dueCount(cat.id);
    const el = document.createElement('div');
    el.className = 'cat-card';
    el.innerHTML = `
      <div>
        <div class="cat-icon">${cat.icon}</div>
        <div class="cat-name">${escapeHtml(cat.name)}</div>
      </div>
      <div class="cat-stats">
        <div class="cat-count"><strong>${count}</strong> ${count === 1 ? 'card' : 'cards'}</div>
        ${due > 0 ? `<div class="cat-due">${due}</div>` : ''}
      </div>
    `;
    el.onclick = () => showMindCategory(cat.id);
    grid.appendChild(el);
  });
  const addCard = document.createElement('div');
  addCard.className = 'cat-card add';
  addCard.innerHTML = `<div class="cat-icon">+</div><div style="font-size: 12px;">New category</div>`;
  addCard.onclick = () => openCategoryModal();
  grid.appendChild(addCard);
  document.getElementById('cat-meta').textContent =
    state.categories.length + ' collection' + (state.categories.length === 1 ? '' : 's');
}

function renderBooks() {
  const container = document.getElementById('books-container');
  if (state.books.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-text">No books yet.</div>
        <div class="empty-state-sub">Track what you're reading, queueing, or finished.</div>
      </div>`;
    return;
  }
  container.innerHTML = '';
  const sorted = [...state.books].sort((a, b) => {
    const order = { reading: 0, queued: 1, finished: 2 };
    return (order[a.status] || 3) - (order[b.status] || 3);
  });
  sorted.forEach(book => {
    const el = document.createElement('div');
    el.className = 'book-item';
    const firstChar = (book.title || '?').charAt(0).toUpperCase();
    el.innerHTML = `
      <div class="book-cover">${firstChar}</div>
      <div class="book-info">
        <div class="book-title">${escapeHtml(book.title)}</div>
        <div class="book-author">${escapeHtml(book.author || '—')}</div>
        <div class="book-status ${book.status}">${book.status}</div>
      </div>
    `;
    el.onclick = () => openDetail('book', book.id);
    container.appendChild(el);
  });
}

function renderSummaries() {
  const container = document.getElementById('summaries-container');
  if (state.summaries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">No summaries yet.</div>
        <div class="empty-state-sub">Distill key ideas from anything you read.</div>
      </div>`;
    return;
  }
  container.innerHTML = '';
  [...state.summaries].reverse().forEach(s => {
    const el = document.createElement('div');
    el.className = 'summary-item';
    el.innerHTML = `
      <div class="summary-title">${escapeHtml(s.title)}</div>
      ${s.source ? `<div class="summary-source">${escapeHtml(s.source)}</div>` : ''}
      <div class="summary-preview">${escapeHtml(s.content)}</div>
    `;
    el.onclick = () => openDetail('summary', s.id);
    container.appendChild(el);
  });
}

// ============ ALL CARDS ============
let allCardsFilter = { search: '', dueOnly: false, limit: 50 };

function renderAllCards() {
  const list = document.getElementById('all-cards-list');
  const meta = document.getElementById('all-cards-meta');
  const showMoreBtn = document.getElementById('all-cards-show-more');
  const q = allCardsFilter.search.trim().toLowerCase();
  const now = Date.now();

  let cards = state.cards.filter(c => {
    if (allCardsFilter.dueOnly && c.due > now) return false;
    if (q) {
      const front = (c.front || '').toLowerCase();
      const back = (c.back || '').toLowerCase();
      if (!front.includes(q) && !back.includes(q)) return false;
    }
    return true;
  });

  cards.sort((a, b) => {
    const aDue = a.due <= now;
    const bDue = b.due <= now;
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    if (aDue && bDue) return a.due - b.due;
    return (b.created || 0) - (a.created || 0);
  });

  const totalAll = state.cards.length;
  const matchedCount = cards.length;
  if (totalAll === 0) {
    meta.textContent = '0 cards';
  } else if (q || allCardsFilter.dueOnly) {
    meta.textContent = `${matchedCount} of ${totalAll}`;
  } else {
    meta.textContent = `${totalAll} card${totalAll === 1 ? '' : 's'}`;
  }

  if (totalAll === 0) {
    list.innerHTML = '<div class="all-cards-empty">No flashcards yet. Use a category above to create one.</div>';
    showMoreBtn.style.display = 'none';
    return;
  }
  if (matchedCount === 0) {
    list.innerHTML = '<div class="all-cards-empty">No cards match.</div>';
    showMoreBtn.style.display = 'none';
    return;
  }

  const slice = cards.slice(0, allCardsFilter.limit);
  list.innerHTML = '';
  slice.forEach(card => {
    const cat = getCategoryById(card.categoryId);
    const isDue = card.due <= now;
    const dueText = dueLabel(card.due, now);
    const row = document.createElement('div');
    row.className = 'all-card-row' + (isDue ? ' due-now' : '');
    row.dataset.cardId = card.id;
    row.innerHTML = `
      <div class="all-card-front">${escapeHtml(card.front)}</div>
      <div class="all-card-back">${escapeHtml(card.back)}</div>
      <div class="all-card-meta">
        <span class="all-card-category">
          <span>${cat ? cat.icon : '—'}</span>
          <span>${escapeHtml(cat ? cat.name : 'Uncategorized')}</span>
        </span>
        <span class="all-card-due${isDue ? ' now' : ''}">${dueText}</span>
      </div>
    `;
    row.onclick = () => openDetail('card', card.id);
    list.appendChild(row);
  });

  if (cards.length > allCardsFilter.limit) {
    showMoreBtn.style.display = 'block';
    const remaining = cards.length - allCardsFilter.limit;
    showMoreBtn.textContent = `Show ${Math.min(remaining, 50)} more`;
  } else {
    showMoreBtn.style.display = 'none';
  }
}

function renderCategoryDetail() {
  const cat = getCategoryById(currentCategoryId);
  if (!cat) { showMindHome(); return; }
  document.getElementById('cat-d-icon').textContent = cat.icon;
  document.getElementById('cat-d-name').textContent = cat.name;
  const cards = state.cards.filter(c => c.categoryId === cat.id);
  const due = cards.filter(c => c.due <= Date.now()).length;
  document.getElementById('cat-d-meta').textContent =
    `${cards.length} ${cards.length === 1 ? 'card' : 'cards'} · ${due} due`;
  const list = document.getElementById('cat-cards-list');
  list.innerHTML = '';
  if (cards.length === 0) {
    document.getElementById('cat-empty').style.display = 'block';
  } else {
    document.getElementById('cat-empty').style.display = 'none';
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'card-list-item';
      const isDue = card.due <= Date.now();
      const dueText = dueLabel(card.due);
      el.innerHTML = `
        <div class="card-list-front">${escapeHtml(card.front)}</div>
        <div class="card-list-back">${escapeHtml(card.back)}</div>
        <div class="card-list-meta">
          <span class="${isDue ? 'card-due-now' : ''}">${dueText}</span>
          <span>Reviewed ${card.repetitions || 0}×</span>
        </div>
      `;
      el.onclick = () => openDetail('card', card.id);
      list.appendChild(el);
    });
  }
}

document.getElementById('cat-review-btn').onclick = () => {
  if (categoryCardCount(currentCategoryId) === 0) { toast('No cards yet'); return; }
  startReview(currentCategoryId);
};
document.getElementById('cat-add-card-btn').onclick = () => {
  selectedCardCategory = currentCategoryId;
  openAddModal('card');
};
document.getElementById('cat-edit-btn').onclick = () => openCategoryModal(currentCategoryId);
document.getElementById('add-book-btn').onclick = () => openAddModal('book');
document.getElementById('add-summary-btn').onclick = () => openAddModal('summary');
document.getElementById('open-add-modal-btn').onclick = () => openAddModal('card');

document.getElementById('all-cards-search').addEventListener('input', (e) => {
  allCardsFilter.search = e.target.value;
  allCardsFilter.limit = 50;
  renderAllCards();
});
document.getElementById('all-cards-due-toggle').addEventListener('click', () => {
  allCardsFilter.dueOnly = !allCardsFilter.dueOnly;
  document.getElementById('all-cards-due-toggle').classList.toggle('active', allCardsFilter.dueOnly);
  allCardsFilter.limit = 50;
  renderAllCards();
});
document.getElementById('all-cards-show-more').addEventListener('click', () => {
  allCardsFilter.limit += 50;
  renderAllCards();
});

// ============ ADD MODAL ============
let selectedCardCategory = null;

function openAddModal(pane) {
  // Switch pane
  document.querySelectorAll('.add-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.add-pane').forEach(p => p.classList.remove('active'));
  document.querySelector(`.add-tab[data-pane="${pane}"]`).classList.add('active');
  document.getElementById(`pane-${pane}`).classList.add('active');

  if (pane === 'card') renderCardCategoryPicker();
  document.getElementById('add-modal').classList.add('show');

  setTimeout(() => {
    if (pane === 'card') document.getElementById('card-front-input').focus();
    else if (pane === 'book') document.getElementById('book-title-input').focus();
    else if (pane === 'summary') document.getElementById('summary-title-input').focus();
  }, 200);
}

function closeAddModal() {
  document.getElementById('add-modal').classList.remove('show');
}

document.querySelectorAll('.add-tab').forEach(t => {
  t.onclick = () => {
    document.querySelectorAll('.add-tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.add-pane').forEach(p => p.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('pane-' + t.dataset.pane).classList.add('active');
    if (t.dataset.pane === 'card') renderCardCategoryPicker();
  };
});

document.getElementById('add-modal-close').onclick = closeAddModal;
document.getElementById('add-modal-close-2').onclick = closeAddModal;
document.getElementById('add-modal-close-3').onclick = closeAddModal;
document.getElementById('add-modal').onclick = (e) => {
  if (e.target.id === 'add-modal') closeAddModal();
};

function renderCardCategoryPicker() {
  const picker = document.getElementById('card-cat-picker');
  picker.innerHTML = '';
  state.categories.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'cat-chip';
    chip.dataset.catId = cat.id;
    if (cat.id === selectedCardCategory) chip.classList.add('selected');
    chip.innerHTML = `<span>${cat.icon}</span> ${escapeHtml(cat.name)}`;
    chip.onclick = () => {
      picker.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedCardCategory = cat.id;
    };
    picker.appendChild(chip);
  });
  const newChip = document.createElement('div');
  newChip.className = 'cat-chip cat-chip-new';
  newChip.innerHTML = '<span>+</span> New';
  newChip.onclick = () => {
    closeAddModal();
    openCategoryModal();
  };
  picker.appendChild(newChip);
  if (!selectedCardCategory && state.categories.length > 0) {
    selectedCardCategory = state.categories[0].id;
    const first = picker.querySelector('.cat-chip');
    if (first) first.classList.add('selected');
  }
}

document.getElementById('save-card-btn').onclick = () => {
  const front = document.getElementById('card-front-input').value.trim();
  const back = document.getElementById('card-back-input').value.trim();
  if (!front || !back) { toast('Front & back required'); return; }
  if (!selectedCardCategory) { toast('Pick a category'); return; }
  state.cards.push({
    id: uid(), front, back,
    categoryId: selectedCardCategory,
    due: Date.now(), interval: 0, ease: 2.5,
    repetitions: 0, lapses: 0, created: Date.now()
  });
  save('cards');
  document.getElementById('card-front-input').value = '';
  document.getElementById('card-back-input').value = '';
  toast('Card saved');
  document.getElementById('card-front-input').focus();
  renderAll();
};

document.getElementById('save-book-btn').onclick = () => {
  const title = document.getElementById('book-title-input').value.trim();
  if (!title) { toast('Title required'); return; }
  state.books.push({
    id: uid(), title,
    author: document.getElementById('book-author-input').value.trim(),
    status: document.getElementById('book-status-input').value,
    notes: document.getElementById('book-notes-input').value.trim(),
    created: Date.now()
  });
  save('books');
  document.getElementById('book-title-input').value = '';
  document.getElementById('book-author-input').value = '';
  document.getElementById('book-notes-input').value = '';
  toast('Book added');
  renderAll();
  closeAddModal();
};

document.getElementById('save-summary-btn').onclick = () => {
  const title = document.getElementById('summary-title-input').value.trim();
  const content = document.getElementById('summary-content-input').value.trim();
  if (!title || !content) { toast('Title & content required'); return; }
  state.summaries.push({
    id: uid(), title,
    source: document.getElementById('summary-source-input').value.trim(),
    content, created: Date.now()
  });
  save('summaries');
  document.getElementById('summary-title-input').value = '';
  document.getElementById('summary-source-input').value = '';
  document.getElementById('summary-content-input').value = '';
  toast('Summary saved');
  renderAll();
  closeAddModal();
};

// ============ CATEGORY MODAL ============
let editingCategoryId = null;
let selectedIcon = '🧠';

function renderIconPicker() {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML = '';
  ICONS.forEach(ic => {
    const el = document.createElement('div');
    el.className = 'icon-opt';
    if (ic === selectedIcon) el.classList.add('selected');
    el.textContent = ic;
    el.onclick = () => {
      selectedIcon = ic;
      picker.querySelectorAll('.icon-opt').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
    };
    picker.appendChild(el);
  });
}

function openCategoryModal(catId = null) {
  editingCategoryId = catId;
  if (catId) {
    const cat = getCategoryById(catId);
    document.getElementById('cat-modal-eyebrow').textContent = 'Edit category';
    document.getElementById('cat-modal-title').textContent = 'Edit ' + cat.name;
    document.getElementById('cat-name-input').value = cat.name;
    selectedIcon = cat.icon;
    document.getElementById('cat-save-btn').textContent = 'Save';
    document.getElementById('cat-delete-row').style.display = 'flex';
  } else {
    document.getElementById('cat-modal-eyebrow').textContent = 'New category';
    document.getElementById('cat-modal-title').textContent = 'Create a category.';
    document.getElementById('cat-name-input').value = '';
    selectedIcon = '🧠';
    document.getElementById('cat-save-btn').textContent = 'Create';
    document.getElementById('cat-delete-row').style.display = 'none';
  }
  renderIconPicker();
  document.getElementById('cat-modal').classList.add('show');
  setTimeout(() => document.getElementById('cat-name-input').focus(), 200);
}

document.getElementById('cat-cancel-btn').onclick = () => {
  document.getElementById('cat-modal').classList.remove('show');
};
document.getElementById('cat-save-btn').onclick = () => {
  const name = document.getElementById('cat-name-input').value.trim();
  if (!name) { toast('Name required'); return; }
  if (editingCategoryId) {
    const cat = getCategoryById(editingCategoryId);
    cat.name = name; cat.icon = selectedIcon;
  } else {
    state.categories.push({
      id: uid(), name, icon: selectedIcon, created: Date.now()
    });
  }
  save('categories');
  document.getElementById('cat-modal').classList.remove('show');
  renderAll();
  if (mindMode === 'category' && editingCategoryId === currentCategoryId) renderCategoryDetail();
};
document.getElementById('cat-delete-btn').onclick = () => {
  if (!editingCategoryId) return;
  const cat = getCategoryById(editingCategoryId);
  const count = categoryCardCount(editingCategoryId);
  if (!confirm(`Delete "${cat.name}" and all ${count} card${count === 1 ? '' : 's'}?\n\nThis cannot be undone.`)) return;
  state.cards = state.cards.filter(c => c.categoryId !== editingCategoryId);
  state.categories = state.categories.filter(c => c.id !== editingCategoryId);
  save('categories'); save('cards');
  document.getElementById('cat-modal').classList.remove('show');
  showMindHome();
};
document.getElementById('cat-modal').onclick = (e) => {
  if (e.target.id === 'cat-modal') document.getElementById('cat-modal').classList.remove('show');
};

// ============ DETAIL & EDIT ============
let detailType, detailId, editingType, editingId;

function openDetail(type, id) {
  detailType = type; detailId = id;
  let title = '', content = '', eyebrow = '';
  if (type === 'card') {
    const c = state.cards.find(x => x.id === id);
    if (!c) return;
    eyebrow = 'Card · ' + (getCategoryById(c.categoryId)?.name || 'Uncategorized');
    title = c.front; content = c.back;
  } else if (type === 'book') {
    const b = state.books.find(x => x.id === id);
    if (!b) return;
    eyebrow = 'Book · ' + b.status;
    title = b.title;
    content = (b.author ? `by ${b.author}\n\n` : '') + (b.notes || '');
  } else if (type === 'summary') {
    const s = state.summaries.find(x => x.id === id);
    if (!s) return;
    eyebrow = s.source ? 'Summary · ' + s.source : 'Summary';
    title = s.title; content = s.content;
  }
  document.getElementById('detail-eyebrow').textContent = eyebrow;
  document.getElementById('detail-title').textContent = title;
  document.getElementById('detail-content').textContent = content;
  document.getElementById('detail-modal').classList.add('show');
}

document.getElementById('detail-close-btn').onclick = () =>
  document.getElementById('detail-modal').classList.remove('show');
document.getElementById('detail-modal').onclick = (e) => {
  if (e.target.id === 'detail-modal') document.getElementById('detail-modal').classList.remove('show');
};
document.getElementById('detail-delete-btn').onclick = () => {
  if (!confirm('Delete this? Cannot be undone.')) return;
  if (detailType === 'card') state.cards = state.cards.filter(c => c.id !== detailId);
  if (detailType === 'book') state.books = state.books.filter(c => c.id !== detailId);
  if (detailType === 'summary') state.summaries = state.summaries.filter(c => c.id !== detailId);
  save(detailType === 'card' ? 'cards' : detailType === 'book' ? 'books' : 'summaries');
  document.getElementById('detail-modal').classList.remove('show');
  renderAll();
  if (mindMode === 'category') renderCategoryDetail();
};
document.getElementById('detail-edit-btn').onclick = () => {
  document.getElementById('detail-modal').classList.remove('show');
  openEdit(detailType, detailId);
};

function openEdit(type, id) {
  editingType = type; editingId = id;
  const fieldsEl = document.getElementById('edit-fields');
  let html = '';
  if (type === 'card') {
    const c = state.cards.find(x => x.id === id);
    if (!c) return;
    document.getElementById('edit-title').textContent = 'Edit card';
    html = `
      <div class="field"><div class="field-label">Front</div><textarea id="edit-card-front" rows="3">${escapeHtml(c.front)}</textarea></div>
      <div class="field"><div class="field-label">Back</div><textarea id="edit-card-back" rows="4">${escapeHtml(c.back)}</textarea></div>
      <div class="field"><div class="field-label">Category</div>
        <select id="edit-card-cat">
          ${state.categories.map(cat => `<option value="${cat.id}" ${cat.id === c.categoryId ? 'selected' : ''}>${cat.icon} ${escapeHtml(cat.name)}</option>`).join('')}
        </select>
      </div>`;
  } else if (type === 'book') {
    const b = state.books.find(x => x.id === id);
    if (!b) return;
    document.getElementById('edit-title').textContent = 'Edit book';
    html = `
      <div class="field"><div class="field-label">Title</div><input id="edit-book-title" value="${escapeHtml(b.title)}"/></div>
      <div class="field"><div class="field-label">Author</div><input id="edit-book-author" value="${escapeHtml(b.author || '')}"/></div>
      <div class="field"><div class="field-label">Status</div>
        <select id="edit-book-status">
          <option value="queued" ${b.status === 'queued' ? 'selected' : ''}>Queued</option>
          <option value="reading" ${b.status === 'reading' ? 'selected' : ''}>Reading</option>
          <option value="finished" ${b.status === 'finished' ? 'selected' : ''}>Finished</option>
        </select>
      </div>
      <div class="field"><div class="field-label">Notes</div><textarea id="edit-book-notes" rows="3">${escapeHtml(b.notes || '')}</textarea></div>`;
  } else if (type === 'summary') {
    const s = state.summaries.find(x => x.id === id);
    if (!s) return;
    document.getElementById('edit-title').textContent = 'Edit summary';
    html = `
      <div class="field"><div class="field-label">Title</div><input id="edit-summary-title" value="${escapeHtml(s.title)}"/></div>
      <div class="field"><div class="field-label">Source</div><input id="edit-summary-source" value="${escapeHtml(s.source || '')}"/></div>
      <div class="field"><div class="field-label">Content</div><textarea id="edit-summary-content" rows="8">${escapeHtml(s.content)}</textarea></div>`;
  }
  fieldsEl.innerHTML = html;
  document.getElementById('edit-modal').classList.add('show');
}

document.getElementById('edit-cancel-btn').onclick = () =>
  document.getElementById('edit-modal').classList.remove('show');
document.getElementById('edit-modal').onclick = (e) => {
  if (e.target.id === 'edit-modal') document.getElementById('edit-modal').classList.remove('show');
};
document.getElementById('edit-save-btn').onclick = () => {
  if (editingType === 'card') {
    const c = state.cards.find(x => x.id === editingId);
    c.front = document.getElementById('edit-card-front').value.trim();
    c.back = document.getElementById('edit-card-back').value.trim();
    c.categoryId = document.getElementById('edit-card-cat').value;
    save('cards');
  } else if (editingType === 'book') {
    const b = state.books.find(x => x.id === editingId);
    b.title = document.getElementById('edit-book-title').value.trim();
    b.author = document.getElementById('edit-book-author').value.trim();
    b.status = document.getElementById('edit-book-status').value;
    b.notes = document.getElementById('edit-book-notes').value.trim();
    save('books');
  } else if (editingType === 'summary') {
    const s = state.summaries.find(x => x.id === editingId);
    s.title = document.getElementById('edit-summary-title').value.trim();
    s.source = document.getElementById('edit-summary-source').value.trim();
    s.content = document.getElementById('edit-summary-content').value.trim();
    save('summaries');
  }
  document.getElementById('edit-modal').classList.remove('show');
  renderAll();
  if (mindMode === 'category') renderCategoryDetail();
  toast('Updated');
};

// ============ SPACED REPETITION ============
// SM-2 interval ladder — single source of truth. gradeCard applies it,
// predictInterval formats it. Derived from the card's CURRENT repetitions and
// interval (i.e. the values before this grade is committed).
function computeInterval(card, grade) {
  if (grade === 0) return 0;
  const nextRep = (card.repetitions || 0) + 1;
  if (nextRep === 1) return grade === 5 ? 4 : grade === 4 ? 1 : 0.5;
  if (nextRep === 2) return grade === 5 ? 7 : grade === 4 ? 3 : 1;
  const factor = grade === 5 ? 1.3 : grade === 4 ? 1 : 0.7;
  return Math.max(1, Math.round((card.interval || 1) * (card.ease || 2.5) * factor));
}

function gradeCard(card, grade) {
  const nextInterval = computeInterval(card, grade);
  card.repetitions = (card.repetitions || 0) + 1;
  if (grade === 0) {
    card.lapses = (card.lapses || 0) + 1;
    card.interval = 0;
    card.ease = Math.max(1.3, (card.ease || 2.5) - 0.2);
    card.due = Date.now() + 60 * 1000;
  } else {
    card.interval = nextInterval;
    card.ease = Math.max(1.3, Math.min(3.0, (card.ease || 2.5) + (grade === 5 ? 0.15 : grade === 4 ? 0 : -0.15)));
    card.due = Date.now() + card.interval * DAY_MS;
  }
}

function predictInterval(card, grade) {
  if (grade === 0) return '<1m';
  const d = computeInterval(card, grade);
  if (d < 1) return Math.round(d * 24) + 'h';
  if (d < 30) return Math.round(d) + 'd';
  if (d < 365) return Math.round(d / 30) + 'mo';
  return Math.round(d / 365) + 'y';
}

// ============ REVIEW SESSION ============
let reviewQueue = [], reviewIdx = 0, reviewCorrect = 0;

// Uniform in-place Fisher-Yates shuffle. `pool.sort(() => Math.random() - 0.5)`
// uses a non-transitive comparator and produces a biased distribution.
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startReview(categoryId) {
  let pool = state.cards.filter(c => c.due <= Date.now());
  if (categoryId !== null) pool = pool.filter(c => c.categoryId === categoryId);
  if (pool.length === 0) { toast('No cards due'); return; }
  reviewQueue = shuffleInPlace(pool.slice());
  reviewIdx = 0; reviewCorrect = 0;
  const catName = categoryId ? getCategoryById(categoryId)?.name : 'All categories';
  document.getElementById('review-cat-pill').textContent = catName;
  document.getElementById('rp-total').textContent = reviewQueue.length;
  document.getElementById('review-overlay').classList.add('show');
  document.getElementById('review-complete').style.display = 'none';
  document.getElementById('card-wrap').style.display = 'flex';
  showCard();
}

function showCard() {
  const card = reviewQueue[reviewIdx];
  document.getElementById('rp-current').textContent = reviewIdx + 1;
  document.getElementById('face-front').textContent = card.front;
  document.getElementById('face-back').textContent = card.back;
  document.getElementById('review-card').classList.remove('flipped');
  document.getElementById('grade-row').style.display = 'none';
  document.getElementById('int-hard').textContent = predictInterval(card, 3);
  document.getElementById('int-good').textContent = predictInterval(card, 4);
  document.getElementById('int-easy').textContent = predictInterval(card, 5);
}

document.getElementById('review-card').onclick = () => {
  const c = document.getElementById('review-card');
  if (!c.classList.contains('flipped')) {
    c.classList.add('flipped');
    setTimeout(() => { document.getElementById('grade-row').style.display = 'flex'; }, 350);
  }
};

document.querySelectorAll('.grade-btn').forEach(btn => {
  btn.onclick = () => {
    const grade = parseInt(btn.dataset.grade);
    const card = reviewQueue[reviewIdx];
    gradeCard(card, grade);
    if (grade >= 3) reviewCorrect++;
    state.reviewStats.total = (state.reviewStats.total || 0) + 1;
    reviewIdx++;
    save('cards'); save('reviewStats');
    if (reviewIdx >= reviewQueue.length) {
      document.getElementById('card-wrap').style.display = 'none';
      document.getElementById('grade-row').style.display = 'none';
      document.getElementById('review-complete').style.display = 'flex';
      document.getElementById('comp-reviewed').textContent = reviewQueue.length;
      document.getElementById('comp-correct').textContent =
        Math.round((reviewCorrect / reviewQueue.length) * 100) + '%';
    } else showCard();
  };
});

// Keyboard shortcuts: Space flips, 1-4 grade. Only while the review overlay
// is on screen, and only when focus isn't in a text field (safe even though
// review has no inputs today).
document.addEventListener('keydown', (e) => {
  const overlay = document.getElementById('review-overlay');
  if (!overlay.classList.contains('show')) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
  // Don't intercept once we're on the completion screen.
  if (document.getElementById('review-complete').style.display === 'flex') return;

  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    const c = document.getElementById('review-card');
    if (!c.classList.contains('flipped')) c.click();
    return;
  }
  // Grade keys are only meaningful once the card is flipped (grade row is visible).
  const gradeRow = document.getElementById('grade-row');
  if (gradeRow.style.display !== 'flex') return;
  const map = { '1': 0, '2': 3, '3': 4, '4': 5 };
  if (e.key in map) {
    e.preventDefault();
    const btn = document.querySelector(`.grade-btn[data-grade="${map[e.key]}"]`);
    if (btn) btn.click();
  }
});

document.getElementById('review-close-btn').onclick = () => {
  if (reviewIdx > 0 && reviewIdx < reviewQueue.length) {
    if (!confirm('End session? Progress on graded cards is saved.')) return;
  }
  document.getElementById('review-overlay').classList.remove('show');
  renderAll();
  if (mindMode === 'category') renderCategoryDetail();
};
document.getElementById('finish-review-btn').onclick = () => {
  document.getElementById('review-overlay').classList.remove('show');
  renderAll();
  if (mindMode === 'category') renderCategoryDetail();
};

// ============ CONSTITUTION VIEW (handlers below in CONSTITUTION TAB section) ============
document.getElementById('open-help-btn').onclick = () =>
  document.getElementById('help-modal').classList.add('show');
document.getElementById('close-help-btn').onclick = () => {
  document.getElementById('help-modal').classList.remove('show');
  if (state.meta.firstVisit) {
    state.meta.firstVisit = false;
    save('meta');
  }
};
document.getElementById('help-modal').onclick = (e) => {
  if (e.target.id === 'help-modal') {
    document.getElementById('help-modal').classList.remove('show');
    if (state.meta.firstVisit) {
      state.meta.firstVisit = false;
      save('meta');
    }
  }
};

document.getElementById('export-btn').onclick = () => {
  const data = { exported: new Date().toISOString(), version: 1 };
  KEYS.forEach(k => data[k] = state[k]);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `the-os-${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Exported');
};

document.getElementById('import-btn').onclick = () => document.getElementById('import-file').click();
document.getElementById('import-file').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!confirm('Import will OVERWRITE your current data. Export first if you want a backup. Continue?')) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      for (const k of KEYS) {
        if (data[k] !== undefined) {
          state[k] = data[k];
          await save(k);
        }
      }
      // Backups from earlier versions may not have the new component arrays or object-form rules —
      // shape every virtue and normalize generalRules so the editor and virtue view don't crash.
      (state.virtues || []).forEach(ensureVirtueShape);
      state.generalRules = _normalizeStringComponent(state.generalRules);
      await save('virtues', true);
      await save('generalRules', true);
      toast('Imported');
      renderAll();
    } catch (err) {
      alert('Import failed: invalid file');
      console.error(err);
    }
  };
  reader.readAsText(file);
};

document.getElementById('reset-all-btn').onclick = async () => {
  if (!confirm("This will wipe ALL your data. There is no undo.\n\nProceed?")) return;
  if (!confirm("Absolutely sure?")) return;
  // Reset state.* in-memory, then await every save before declaring the wipe
  // complete. forEach + un-awaited save() let the migrations and toast race
  // ahead of the queued upserts (and produced N per-key 'Saved' toasts).
  KEYS.forEach(k => {
    // Drop meta.migratedToVirtues so the next loadState re-seeds the default constitution.
    if (k === 'meta') state[k] = { firstVisit: false };
    else if (k === 'reviewStats') state[k] = { total: 0 };
    else if (Array.isArray(state[k])) state[k] = [];
    else state[k] = {};
  });
  await Promise.all(KEYS.map(k => save(k, true)));
  // Re-run migrations so the user is left with the default constitution, fully shaped.
  if (migrateToVirtues()) {
    await save('virtues', true);
    await save('meta', true);
  }
  if (migrateVirtuesToComponents()) {
    await save('virtues', true);
    await save('meta', true);
  }
  await flushSync(); // push the debounced batch before we report 'Wiped'
  renderAll();
  toast('Wiped');
};

// ============ CONSTITUTION TAB + VIRTUE EDITOR ============
let _editingVirtueId = null;
let _editorIsNew = false;
let _editorDraft = null; // working copy
let _editorVePane = 'identity';
let _editorComponentView = 'list'; // 'list' or 'section'
let _editorSectionType = null;      // 'behaviors' | 'mantras' | 'questions' | 'habits' | 'challenges' | 'antiBehaviors'
let _constitutionFilter = 'active';
let _editingBehaviorIdx = -1;

const COMPONENT_META = {
  behaviors:    { icon: '◇', label: 'What he does',     singular: 'behavior',    desc: 'Concrete actions. Cue + why optional.' },
  mantras:      { icon: '›', label: 'What he says',     singular: 'mantra',      desc: 'Lines he repeats. The voice of the man.' },
  questions:    { icon: '?', label: 'What he asks',     singular: 'question',    desc: 'The questions characteristic of him.' },
  habits:       { icon: '◐', label: 'Daily',            singular: 'habit',       desc: 'Standing routines that hold him.' },
  challenges:   { icon: '△', label: 'Challenges',        singular: 'challenge',  desc: 'The ladder of exposure reps he climbs. Each rung has a phrase.' },
  antiBehaviors:{ icon: '✕', label: 'What he refuses',  singular: 'anti-behavior',desc: 'Patterns he will not perform.' }
};

function emptyVirtue() {
  const now = Date.now();
  return ensureVirtueShape({
    id: uid(),
    name: '',
    symbol: '◆',
    identityLine: '',
    body: '',
    portrait: '',
    behaviors: [],
    mantras: [],
    questions: [],
    habits: [],
    challenges: [],
    rules: [],
    antiBehaviors: [],
    notes: [],
    componentOrder: DEFAULT_COMPONENT_ORDER.slice(),
    active: true,
    pinned: false,
    createdAt: now,
    updatedAt: now
  });
}

function renderConstitution() {
  const list = document.getElementById('virtue-list');
  if (!list) return;
  const all = state.virtues || [];
  const active = all.filter(v => v.active);
  const dormant = all.filter(v => !v.active);

  const acEl = document.getElementById('cfc-active');
  const drEl = document.getElementById('cfc-dormant');
  const alEl = document.getElementById('cfc-all');
  if (acEl) acEl.textContent = active.length;
  if (drEl) drEl.textContent = dormant.length;
  if (alEl) alEl.textContent = all.length;

  let pool;
  if (_constitutionFilter === 'active') pool = active;
  else if (_constitutionFilter === 'dormant') pool = dormant;
  else pool = all;

  pool = pool.slice().sort(virtueComparator);

  if (pool.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">◇</div>
      <div class="empty-state-text">${_constitutionFilter === 'active' ? 'No active virtues.' : _constitutionFilter === 'dormant' ? 'No dormant virtues.' : 'No virtues yet.'}</div>
      <div class="empty-state-sub">${_constitutionFilter === 'active' ? 'Activate one below, or write a new one.' : 'Author your first virtue.'}</div>
    </div>`;
    return;
  }

  list.innerHTML = pool.map(v => {
    ensureVirtueShape(v);
    const isActive = v.active;
    const totalItems = ALL_COMPONENT_TYPES.reduce((sum, t) => sum + (v[t] || []).length, 0);
    const activeTypes = ALL_COMPONENT_TYPES.filter(t => (v[t] || []).length).length;
    const tag = v.pinned && isActive
      ? '<span class="virtue-row-tag active">Pinned · Active</span>'
      : isActive
        ? '<span class="virtue-row-tag active">Active</span>'
        : '<span class="virtue-row-tag dormant">Dormant</span>';
    return `
      <div class="virtue-row ${isActive ? 'active-virtue' : 'dormant-virtue'}" data-virtue-id="${escapeHtml(v.id)}">
        <div class="virtue-row-symbol">${escapeHtml(v.symbol || '◆')}</div>
        <div class="virtue-row-info">
          <div class="virtue-row-head">
            <div class="virtue-row-name">${escapeHtml(v.name || '(unnamed)')}</div>
            ${tag}
          </div>
          ${v.identityLine ? `<div class="virtue-row-identity">${escapeHtml(v.identityLine)}</div>` : ''}
          <div class="virtue-row-meta">${activeTypes} COMPONENT${activeTypes === 1 ? '' : 'S'} · ${totalItems} ITEM${totalItems === 1 ? '' : 'S'}</div>
        </div>
        <div class="virtue-row-chevron">›</div>
      </div>`;
  }).join('');

  list.querySelectorAll('.virtue-row').forEach(row => {
    row.onclick = () => openVirtueEditor(row.dataset.virtueId);
  });
}

document.querySelectorAll('.cf-chip').forEach(chip => {
  chip.onclick = () => {
    _constitutionFilter = chip.dataset.filter;
    document.querySelectorAll('.cf-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderConstitution();
  };
});

document.getElementById('new-virtue-btn').onclick = () => openVirtueEditor(null);

function openVirtueEditor(virtueId) {
  if (virtueId) {
    const v = getVirtueById(virtueId);
    if (!v) return;
    _editingVirtueId = virtueId;
    _editorIsNew = false;
    _editorDraft = ensureVirtueShape(JSON.parse(JSON.stringify(v)));
  } else {
    _editorIsNew = true;
    _editorDraft = emptyVirtue();
    _editingVirtueId = _editorDraft.id;
  }
  _editorVePane = 'identity';
  _editorComponentView = 'list';
  _editorSectionType = null;
  document.getElementById('ve-eyebrow').textContent = _editorIsNew ? 'New Virtue' : 'Edit Virtue';
  // Show identity pane initially
  document.querySelectorAll('.ve-tab').forEach(t => t.classList.toggle('active', t.dataset.vePane === 'identity'));
  document.querySelectorAll('.ve-pane').forEach(p => p.classList.toggle('active', p.id === 've-pane-identity'));
  // Reset component sub-views
  document.getElementById('ve-components-list-view').style.display = 'block';
  document.getElementById('ve-components-section-view').style.display = 'none';
  // Hide delete on brand new
  document.getElementById('ve-delete-btn').style.display = _editorIsNew ? 'none' : 'block';
  bindEditorFields();
  renderEditor();
  document.getElementById('virtue-editor').classList.add('show');
}

function closeVirtueEditor() {
  document.getElementById('virtue-editor').classList.remove('show');
  _editingVirtueId = null;
  _editorDraft = null;
}

document.getElementById('ve-back-btn').onclick = closeVirtueEditor;

document.querySelectorAll('.ve-tab').forEach(t => {
  t.onclick = () => {
    _editorVePane = t.dataset.vePane;
    document.querySelectorAll('.ve-tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.ve-pane').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('ve-pane-' + _editorVePane).classList.add('active');
    // When entering Components, always start at the list view (no stale section state).
    if (_editorVePane === 'components') {
      _editorComponentView = 'list';
      _editorSectionType = null;
      document.getElementById('ve-components-list-view').style.display = 'block';
      document.getElementById('ve-components-section-view').style.display = 'none';
      renderComponentsListView();
    }
  };
});

function bindEditorFields() {
  const nameEl     = document.getElementById('ve-name-input');
  const idEl       = document.getElementById('ve-identity-input');
  const portraitEl = document.getElementById('ve-portrait-input');
  const bodyEl     = document.getElementById('ve-body-input');
  nameEl.value     = _editorDraft.name || '';
  idEl.value       = _editorDraft.identityLine || '';
  portraitEl.value = _editorDraft.portrait || '';
  bodyEl.value     = _editorDraft.body || '';
  nameEl.oninput     = () => { _editorDraft.name = nameEl.value; updateEditorPreview(); };
  idEl.oninput       = () => { _editorDraft.identityLine = idEl.value; updateEditorPreview(); };
  portraitEl.oninput = () => { _editorDraft.portrait = portraitEl.value; };
  bodyEl.oninput     = () => { _editorDraft.body = bodyEl.value; };
  // Toggles
  const activeT = document.getElementById('ve-active-toggle');
  const pinnedT = document.getElementById('ve-pinned-toggle');
  activeT.classList.toggle('on', !!_editorDraft.active);
  pinnedT.classList.toggle('on', !!_editorDraft.pinned);
  document.getElementById('ve-active-row').onclick = () => {
    _editorDraft.active = !_editorDraft.active;
    activeT.classList.toggle('on', _editorDraft.active);
  };
  document.getElementById('ve-pinned-row').onclick = () => {
    _editorDraft.pinned = !_editorDraft.pinned;
    pinnedT.classList.toggle('on', _editorDraft.pinned);
  };
}

function updateEditorPreview() {
  document.getElementById('ve-preview-symbol').textContent = _editorDraft.symbol || '◆';
  document.getElementById('ve-preview-name').textContent = _editorDraft.name || 'Unnamed';
  document.getElementById('ve-preview-identity').textContent = _editorDraft.identityLine || 'Identity line';
}

function renderEditor() {
  updateEditorPreview();
  renderSymbolGrid();
  renderComponentsListView();
}

function renderSymbolGrid() {
  const grid = document.getElementById('ve-symbol-grid');
  grid.innerHTML = '';
  VIRTUE_SYMBOLS.forEach(sym => {
    const el = document.createElement('div');
    el.className = 've-symbol-opt' + (sym === _editorDraft.symbol ? ' selected' : '');
    el.textContent = sym;
    el.onclick = () => {
      _editorDraft.symbol = sym;
      grid.querySelectorAll('.ve-symbol-opt').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      updateEditorPreview();
    };
    grid.appendChild(el);
  });
}

function renderBehaviorList() {
  const list = document.getElementById('ve-behavior-list');
  const behaviors = _editorDraft.behaviors || [];
  if (behaviors.length === 0) {
    list.innerHTML = `<div class="ve-empty">No behaviors yet. Add the first daily vote below.</div>`;
    return;
  }
  list.innerHTML = behaviors.map((b, idx) => `
    <div class="behavior-card" draggable="true" data-idx="${idx}">
      <div class="behavior-card-head">
        <span class="behavior-card-drag" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
        <span class="behavior-card-label">Behavior · ${idx + 1}</span>
        <div class="behavior-card-actions">
          <button class="behavior-card-btn" data-action="edit">Edit</button>
          <button class="behavior-card-btn del" data-action="del" aria-label="Delete behavior">×</button>
        </div>
      </div>
      <div class="behavior-card-text">${escapeHtml(b.text || '')}</div>
      ${b.cue ? `<div class="behavior-card-cue">${escapeHtml(b.cue)}</div>` : ''}
      ${b.why ? `<div class="behavior-card-why"><strong>WHY ·</strong>${escapeHtml(b.why)}</div>` : ''}
    </div>`).join('');

  list.querySelectorAll('.behavior-card').forEach(card => {
    const idx = parseInt(card.dataset.idx);
    card.querySelector('[data-action="edit"]').onclick = () => openBehaviorModal(idx);
    card.querySelector('[data-action="del"]').onclick = () => {
      if (!confirm('Delete this behavior?')) return;
      _editorDraft.behaviors.splice(idx, 1);
      renderBehaviorList(); updateEditorPreview();
    };
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', String(idx));
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => e.preventDefault());
    card.addEventListener('drop', e => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      const to = idx;
      if (from === to || isNaN(from)) return;
      const arr = _editorDraft.behaviors;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      renderBehaviorList(); updateEditorPreview();
    });
  });
}

document.getElementById('ve-add-behavior-btn').onclick = () => openBehaviorModal(-1);

function openBehaviorModal(idx) {
  _editingBehaviorIdx = idx;
  const isNew = idx < 0;
  document.getElementById('behavior-modal-eyebrow').textContent = isNew ? 'New behavior' : 'Edit behavior';
  const b = isNew ? { text: '', cue: '', why: '' } : (_editorDraft.behaviors[idx] || { text: '', cue: '', why: '' });
  document.getElementById('behavior-text-input').value = b.text || '';
  document.getElementById('behavior-cue-input').value = b.cue || '';
  document.getElementById('behavior-why-input').value = b.why || '';
  document.getElementById('behavior-modal').classList.add('show');
  setTimeout(() => document.getElementById('behavior-text-input').focus(), 200);
}

document.getElementById('behavior-cancel-btn').onclick = () => {
  document.getElementById('behavior-modal').classList.remove('show');
};
document.getElementById('behavior-modal').onclick = e => {
  if (e.target.id === 'behavior-modal') document.getElementById('behavior-modal').classList.remove('show');
};
document.getElementById('behavior-save-btn').onclick = () => {
  const text = document.getElementById('behavior-text-input').value.trim();
  const cue = document.getElementById('behavior-cue-input').value.trim();
  const why = document.getElementById('behavior-why-input').value.trim();
  if (!text) { toast('Behavior text required'); return; }
  if (_editingBehaviorIdx < 0) {
    _editorDraft.behaviors = _editorDraft.behaviors || [];
    _editorDraft.behaviors.push({ id: uid(), text, cue, why, createdAt: Date.now() });
  } else {
    const existing = _editorDraft.behaviors[_editingBehaviorIdx];
    _editorDraft.behaviors[_editingBehaviorIdx] = {
      id: existing && existing.id ? existing.id : uid(),
      text, cue, why,
      createdAt: (existing && existing.createdAt) || Date.now()
    };
  }
  document.getElementById('behavior-modal').classList.remove('show');
  renderBehaviorList();
  updateEditorPreview();
};

// ============ EDITOR: CHALLENGE LIST (ladder) ============
// Cards mirror the behavior list pattern: drag-to-reorder, edit/delete per
// card. Rung is implicit — it's recomputed from array position on save and
// when the list re-renders, so the user never types a number.
let _editingChallengeIdx = -1;

function _renumberChallengeRungs() {
  const items = _editorDraft.challenges || [];
  items.forEach((c, i) => { c.rung = i + 1; });
}

function renderChallengeList() {
  const list = document.getElementById('ve-challenge-list');
  const items = _editorDraft.challenges || [];
  if (items.length === 0) {
    list.innerHTML = `<div class="ve-empty">No challenges yet. Add the first rung — the easiest exposure rep.</div>`;
    return;
  }
  _renumberChallengeRungs();
  list.innerHTML = items.map((c, idx) => `
    <div class="behavior-card" draggable="true" data-idx="${idx}">
      <div class="behavior-card-head">
        <span class="behavior-card-drag" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
        <span class="behavior-card-label">Rung · ${c.rung}</span>
        <div class="behavior-card-actions">
          <button class="behavior-card-btn" data-action="edit">Edit</button>
          <button class="behavior-card-btn del" data-action="del" aria-label="Delete challenge">×</button>
        </div>
      </div>
      <div class="behavior-card-text">${escapeHtml(c.text || '')}</div>
      ${c.phrase ? `<div class="behavior-card-cue">"${escapeHtml(c.phrase)}"</div>` : ''}
    </div>`).join('');

  list.querySelectorAll('.behavior-card').forEach(card => {
    const idx = parseInt(card.dataset.idx);
    card.querySelector('[data-action="edit"]').onclick = () => openChallengeModal(idx);
    card.querySelector('[data-action="del"]').onclick = () => {
      if (!confirm('Delete this challenge?')) return;
      _editorDraft.challenges.splice(idx, 1);
      renderChallengeList();
    };
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', String(idx));
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', e => e.preventDefault());
    card.addEventListener('drop', e => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      const to = idx;
      if (from === to || isNaN(from)) return;
      const arr = _editorDraft.challenges;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      renderChallengeList();
    });
  });
}

document.getElementById('ve-add-challenge-btn').onclick = () => openChallengeModal(-1);

function openChallengeModal(idx) {
  _editingChallengeIdx = idx;
  const isNew = idx < 0;
  document.getElementById('challenge-modal-eyebrow').textContent = isNew ? 'New challenge' : 'Edit challenge';
  const c = isNew
    ? { text: '', phrase: '' }
    : (_editorDraft.challenges[idx] || { text: '', phrase: '' });
  document.getElementById('challenge-text-input').value   = c.text || '';
  document.getElementById('challenge-phrase-input').value = c.phrase || '';
  document.getElementById('challenge-modal').classList.add('show');
  setTimeout(() => document.getElementById('challenge-text-input').focus(), 200);
}

document.getElementById('challenge-cancel-btn').onclick = () => {
  document.getElementById('challenge-modal').classList.remove('show');
};
document.getElementById('challenge-modal').onclick = e => {
  if (e.target.id === 'challenge-modal') document.getElementById('challenge-modal').classList.remove('show');
};
document.getElementById('challenge-save-btn').onclick = () => {
  const text   = document.getElementById('challenge-text-input').value.trim();
  const phrase = document.getElementById('challenge-phrase-input').value.trim();
  if (!text) { toast('Challenge text required'); return; }
  _editorDraft.challenges = _editorDraft.challenges || [];
  if (_editingChallengeIdx < 0) {
    _editorDraft.challenges.push({
      id: uid(),
      rung: _editorDraft.challenges.length + 1,
      text, phrase,
      createdAt: Date.now()
    });
  } else {
    const existing = _editorDraft.challenges[_editingChallengeIdx];
    _editorDraft.challenges[_editingChallengeIdx] = {
      id: existing && existing.id ? existing.id : uid(),
      rung: existing && Number.isInteger(existing.rung) ? existing.rung : (_editingChallengeIdx + 1),
      text, phrase,
      createdAt: (existing && existing.createdAt) || Date.now()
    };
  }
  document.getElementById('challenge-modal').classList.remove('show');
  renderChallengeList();
};

// ============ EDITOR: COMPONENTS LIST VIEW ============
function renderComponentsListView() {
  ensureVirtueShape(_editorDraft);

  // Compose the visible order: behaviors always first (visual lock),
  // followed by everything else in componentOrder.
  const order = ['behaviors', ...(_editorDraft.componentOrder || []).filter(t => t !== 'behaviors')];
  const activeSet = new Set(order);

  const activeContainer = document.getElementById('ve-active-components');
  const availContainer = document.getElementById('ve-available-components');
  const availLabel = document.getElementById('ve-available-label');

  activeContainer.innerHTML = order.map(type => {
    const meta = COMPONENT_META[type];
    if (!meta) return '';
    const count = (_editorDraft[type] || []).length;
    const locked = type === 'behaviors';
    return `
      <div class="ve-component-row${locked ? ' locked' : ''}"
           data-type="${type}"
           draggable="${locked ? 'false' : 'true'}">
        <span class="ve-component-drag${locked ? ' locked-handle' : ''}" title="${locked ? 'Behaviors stay on top' : 'Drag to reorder'}">⋮⋮</span>
        <span class="ve-component-icon">${meta.icon}</span>
        <div class="ve-component-info">
          <div class="ve-component-name">${meta.label}</div>
          <div class="ve-component-desc">${meta.desc}</div>
        </div>
        <span class="ve-component-count">${count}</span>
        <span class="ve-component-chevron">›</span>
      </div>`;
  }).join('');

  // Wire up taps to open the section, and drag for non-behaviors
  activeContainer.querySelectorAll('.ve-component-row').forEach(row => {
    const type = row.dataset.type;
    row.addEventListener('click', () => openComponentSection(type));
    if (type === 'behaviors') return; // locked, no drag

    row.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', type);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));
    row.addEventListener('dragover', e => e.preventDefault());
    row.addEventListener('drop', e => {
      e.preventDefault();
      const fromType = e.dataTransfer.getData('text/plain');
      if (!fromType || fromType === 'behaviors' || fromType === type) return;
      reorderComponent(fromType, type);
    });
  });

  // Available (not yet added) components
  const available = ALL_COMPONENT_TYPES.filter(t => !activeSet.has(t));
  if (available.length === 0) {
    availLabel.style.display = 'none';
    availContainer.innerHTML = '';
  } else {
    availLabel.style.display = 'block';
    availContainer.innerHTML = available.map(type => {
      const meta = COMPONENT_META[type];
      return `
        <div class="ve-component-row available" data-type="${type}">
          <span class="ve-component-drag locked-handle">+</span>
          <span class="ve-component-icon">${meta.icon}</span>
          <div class="ve-component-info">
            <div class="ve-component-name">${meta.label}</div>
            <div class="ve-component-desc">${meta.desc}</div>
          </div>
          <span class="ve-component-chevron">›</span>
        </div>`;
    }).join('');
    availContainer.querySelectorAll('.ve-component-row').forEach(row => {
      row.addEventListener('click', () => {
        const type = row.dataset.type;
        _editorDraft.componentOrder = _editorDraft.componentOrder || [];
        if (!_editorDraft.componentOrder.includes(type)) _editorDraft.componentOrder.push(type);
        openComponentSection(type);
      });
    });
  }
}

function reorderComponent(fromType, toType) {
  const order = _editorDraft.componentOrder || [];
  // Behaviors is visually pinned at the top regardless of componentOrder, so reorder
  // only operates on the non-behaviors slice.
  const movable = order.filter(t => t !== 'behaviors');
  const fromIdx = movable.indexOf(fromType);
  if (fromIdx >= 0) movable.splice(fromIdx, 1);
  const toIdx = movable.indexOf(toType);
  if (toIdx >= 0) movable.splice(toIdx, 0, fromType);
  else movable.push(fromType);

  // Reconstruct componentOrder, preserving whether 'behaviors' was in it
  const hadBehaviors = order.includes('behaviors');
  _editorDraft.componentOrder = hadBehaviors ? ['behaviors', ...movable] : movable;
  renderComponentsListView();
}

// ============ EDITOR: COMPONENT SECTION VIEW ============
function openComponentSection(type) {
  if (!COMPONENT_META[type]) return;
  _editorSectionType = type;
  _editorComponentView = 'section';

  document.getElementById('ve-components-list-view').style.display = 'none';
  document.getElementById('ve-components-section-view').style.display = 'block';

  const meta = COMPONENT_META[type];
  document.getElementById('ve-section-title').textContent = meta.label;
  document.getElementById('ve-section-sub').textContent = meta.desc;

  // Show the right body. Behaviors and challenges have richer item shapes
  // and get their own section editors; everything else uses the generic
  // string list.
  const isBehaviors  = type === 'behaviors';
  const isChallenges = type === 'challenges';
  document.getElementById('ve-section-behaviors').style.display  = isBehaviors  ? 'block' : 'none';
  document.getElementById('ve-section-challenges').style.display = isChallenges ? 'block' : 'none';
  document.getElementById('ve-section-strings').style.display    = (isBehaviors || isChallenges) ? 'none' : 'block';

  if (isBehaviors)       renderBehaviorList();
  else if (isChallenges) renderChallengeList();
  else                   renderStringList();

  // The remove button is always shown but only for non-behaviors
  // (behaviors is part of the core shape — empty is allowed, but the component itself stays)
  const removeBtn = document.getElementById('ve-section-remove-btn');
  if (type === 'behaviors') {
    removeBtn.style.display = 'none';
  } else {
    removeBtn.style.display = 'block';
    removeBtn.textContent = `Remove ${meta.label.toLowerCase()} component`;
  }
}

function closeComponentSection() {
  _editorComponentView = 'list';
  _editorSectionType = null;
  document.getElementById('ve-components-section-view').style.display = 'none';
  document.getElementById('ve-components-list-view').style.display = 'block';
  renderComponentsListView();
}

document.getElementById('ve-section-back-btn').onclick = closeComponentSection;

document.getElementById('ve-section-remove-btn').onclick = () => {
  const type = _editorSectionType;
  if (!type || type === 'behaviors') return;
  const meta = COMPONENT_META[type];
  const count = (_editorDraft[type] || []).length;
  const msg = count > 0
    ? `Remove ${meta.label} (and delete its ${count} item${count === 1 ? '' : 's'})?`
    : `Remove ${meta.label} from this virtue?`;
  if (!confirm(msg)) return;
  _editorDraft[type] = [];
  _editorDraft.componentOrder = (_editorDraft.componentOrder || []).filter(t => t !== type);
  closeComponentSection();
};

// ============ EDITOR: GENERIC STRING LIST (mantras/questions/habits/challenges/rules/antiBehaviors) ============
function renderStringList() {
  const list = document.getElementById('ve-string-list');
  const type = _editorSectionType;
  const items = _editorDraft[type] || [];
  const input = document.getElementById('ve-string-input');
  const meta = COMPONENT_META[type];

  // Use singular for the placeholder so the new portrait-language labels still
  // produce clean copy ("Add a question..." not "Add a what he ask...").
  if (input) input.placeholder = `Add a ${meta.singular || meta.label.toLowerCase()}...`;

  if (items.length === 0) {
    list.innerHTML = `<div class="ve-empty">No items yet. Add the first one below.</div>`;
    return;
  }

  list.innerHTML = items.map((it, idx) => {
    const text = componentText(it);
    return `
      <div class="ve-string-item" data-idx="${idx}" draggable="true">
        <span class="ve-string-item-text">${escapeHtml(text)}</span>
        <button class="ve-string-item-del" data-idx="${idx}" aria-label="Delete item">×</button>
      </div>`;
  }).join('');

  list.querySelectorAll('.ve-string-item-del').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.idx);
      _editorDraft[type].splice(i, 1);
      renderStringList();
    };
  });

  // Drag-reorder within the list
  list.querySelectorAll('.ve-string-item').forEach(item => {
    const idx = parseInt(item.dataset.idx);
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', String(idx));
      item.style.opacity = '0.4';
    });
    item.addEventListener('dragend', () => { item.style.opacity = ''; });
    item.addEventListener('dragover', e => e.preventDefault());
    item.addEventListener('drop', e => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      const to = idx;
      if (isNaN(from) || from === to) return;
      const arr = _editorDraft[type];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      renderStringList();
    });
  });
}

const stringInput = document.getElementById('ve-string-input');
const stringAddBtn = document.getElementById('ve-string-add-btn');
stringInput.addEventListener('input', () => {
  stringAddBtn.disabled = stringInput.value.trim().length === 0;
});
function addStringFromInput() {
  const val = stringInput.value.trim();
  if (!val) return;
  const type = _editorSectionType;
  if (!type || type === 'behaviors') return;
  _editorDraft[type] = _editorDraft[type] || [];
  // All string-typed components are now {id, text, createdAt} objects
  _editorDraft[type].push({ id: uid(), text: val, createdAt: Date.now() });
  stringInput.value = '';
  stringAddBtn.disabled = true;
  renderStringList();
  stringInput.focus();
}
stringAddBtn.onclick = addStringFromInput;
stringInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addStringFromInput(); }
});

document.getElementById('ve-save-btn').onclick = async () => {
  // Commit text fields back to draft from the DOM (in case oninput missed something on mobile)
  _editorDraft.name         = document.getElementById('ve-name-input').value.trim();
  _editorDraft.identityLine = document.getElementById('ve-identity-input').value.trim();
  _editorDraft.portrait     = document.getElementById('ve-portrait-input').value.trim();
  _editorDraft.body         = document.getElementById('ve-body-input').value.trim();

  if (!_editorDraft.name) { toast('Name required'); return; }
  _editorDraft.updatedAt = Date.now();

  // Defensive: ensure challenge rungs match final array order. The list view
  // already renumbers on every render, but if the user reordered then edited
  // a single item via the modal (which preserves the existing rung), this
  // guarantees the saved data is consistent.
  (_editorDraft.challenges || []).forEach((c, i) => { c.rung = i + 1; });

  if (_editorIsNew) {
    state.virtues = state.virtues || [];
    state.virtues.push(_editorDraft);
  } else {
    const idx = state.virtues.findIndex(v => v.id === _editingVirtueId);
    if (idx >= 0) state.virtues[idx] = _editorDraft;
  }
  await save('virtues');
  closeVirtueEditor();
  renderAll();
  toast('Saved');
};

document.getElementById('ve-delete-btn').onclick = async () => {
  if (_editorIsNew) { closeVirtueEditor(); return; }
  if (!confirm('Delete this virtue? Its behaviors will no longer count toward today, but past rep checks are preserved.')) return;
  state.virtues = (state.virtues || []).filter(v => v.id !== _editingVirtueId);
  await save('virtues');
  closeVirtueEditor();
  renderAll();
  toast('Deleted');
};

// ============ LAB ============
let currentLabFilter = 'active';
let currentExpId = null;
let expEditMode = false;

function experimentDayCount(exp) {
  const start = new Date(exp.startedAt + 'T00:00:00');
  const end = exp.closedAt ? new Date(exp.closedAt) : new Date();
  const days = Math.max(1, Math.floor((end - start) / DAY_MS) + 1);
  if (days <= 30) return `Day ${days}`;
  if (days < 84) return `Week ${Math.floor(days / 7) + 1}`;
  return `Month ${Math.floor(days / 30) + 1}`;
}

function formatDateShort(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatEntryTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
         d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function renderLab() {
  const active = state.experiments.filter(e => e.status === 'active').length;
  const completed = state.experiments.filter(e => e.status === 'completed').length;
  const failed = state.experiments.filter(e => e.status === 'failed').length;

  const stats = document.getElementById('lab-stats');
  if (stats) {
    stats.innerHTML = `
      <div class="qs"><div class="qs-val gold">${active}</div><div class="qs-label">Active</div></div>
      <div class="qs"><div class="qs-val">${completed}</div><div class="qs-label">Completed</div></div>
      <div class="qs"><div class="qs-val">${failed}</div><div class="qs-label">Failed</div></div>`;
  }

  const list = document.getElementById('lab-list');
  if (!list) return;

  const filtered = currentLabFilter === 'all'
    ? state.experiments
    : state.experiments.filter(e => e.status === currentLabFilter);

  const sorted = filtered.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (sorted.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚗️</div>
        <div class="empty-state-text">No experiments here.</div>
        <div class="empty-state-sub">Hypothesize. Test. Learn. Tap + to begin.</div>
      </div>`;
    return;
  }

  list.innerHTML = sorted.map(exp => {
    const meta = [];
    meta.push(`Started ${formatDateShort(exp.startedAt)}`);
    if (exp.endDate) meta.push(`Ends ${formatDateShort(exp.endDate)}`);
    meta.push(`${(exp.entries || []).length} note${(exp.entries || []).length !== 1 ? 's' : ''}`);
    return `
      <div class="experiment-card" data-status="${exp.status}" data-id="${exp.id}">
        <div class="experiment-head">
          <div class="experiment-status-dot"></div>
          <div class="experiment-info">
            <div class="experiment-name">${escapeHtml(exp.name)}</div>
            <div class="experiment-hypothesis">${escapeHtml(exp.hypothesis)}</div>
          </div>
          <div class="experiment-day-count">${experimentDayCount(exp)}</div>
        </div>
        <div class="experiment-meta">
          ${meta.map((m, i) => i < meta.length - 1
            ? `<span>${escapeHtml(m)}</span><span>·</span>`
            : `<span>${escapeHtml(m)}</span>`).join('')}
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.experiment-card').forEach(card => {
    card.onclick = () => openExpDetail(card.dataset.id);
  });
}

function openExpDetail(id) {
  const exp = state.experiments.find(e => e.id === id);
  if (!exp) return;
  currentExpId = id;

  const statusPill = document.getElementById('exp-d-status');
  statusPill.textContent = exp.status.charAt(0).toUpperCase() + exp.status.slice(1);
  statusPill.className = `exp-detail-status-pill ${exp.status}`;
  document.getElementById('exp-d-day').textContent = experimentDayCount(exp);
  document.getElementById('exp-d-name').textContent = exp.name;
  document.getElementById('exp-d-hypothesis').textContent = exp.hypothesis || '—';

  const criteriaSection = document.getElementById('exp-d-criteria-section');
  if (exp.criteria) {
    criteriaSection.style.display = '';
    document.getElementById('exp-d-criteria').textContent = exp.criteria;
  } else {
    criteriaSection.style.display = 'none';
  }

  const meta = [];
  meta.push(`Started ${formatDateShort(exp.startedAt)}`);
  if (exp.endDate) meta.push(`Ends ${formatDateShort(exp.endDate)}`);
  document.getElementById('exp-d-meta').innerHTML = meta.map(m => `<span>${escapeHtml(m)}</span>`).join('');

  const verdictSection = document.getElementById('exp-d-verdict-section');
  if (exp.verdict) {
    verdictSection.style.display = '';
    document.getElementById('exp-d-verdict').textContent = exp.verdict;
  } else {
    verdictSection.style.display = 'none';
  }

  renderExpEntries(exp);
  renderExpStatusActions(exp);

  document.getElementById('exp-new-entry-input').value = '';
  document.getElementById('exp-detail-modal').classList.add('show');
}

function renderExpEntries(exp) {
  const container = document.getElementById('exp-d-entries');
  const entries = (exp.entries || []).slice().reverse();
  if (entries.length === 0) {
    container.innerHTML = `<div style="color:var(--ink-4);font-size:13px;font-style:italic;font-family:var(--display);padding:8px 0 12px;">No notes yet.</div>`;
    return;
  }
  container.innerHTML = entries.map(entry => `
    <div class="exp-entry" data-entry-id="${entry.id}">
      <button class="exp-entry-delete" title="Delete" aria-label="Delete note">✕</button>
      <div class="exp-entry-date">${formatEntryTime(entry.at)}</div>
      <div class="exp-entry-text">${escapeHtml(entry.text)}</div>
    </div>`).join('');
  container.querySelectorAll('.exp-entry-delete').forEach(btn => {
    btn.onclick = () => {
      const entryId = btn.closest('.exp-entry').dataset.entryId;
      const expObj = state.experiments.find(e => e.id === currentExpId);
      if (!expObj) return;
      expObj.entries = (expObj.entries || []).filter(en => en.id !== entryId);
      save('experiments');
      renderExpEntries(expObj);
      renderLab();
    };
  });
}

function renderExpStatusActions(exp) {
  const container = document.getElementById('exp-status-actions');
  let html = '';
  if (exp.status === 'active') {
    html = `<button class="exp-status-btn pause" data-action="pause">Pause</button>
            <button class="exp-status-btn complete" data-action="complete">Complete</button>
            <button class="exp-status-btn fail" data-action="fail">Fail</button>`;
  } else if (exp.status === 'paused') {
    html = `<button class="exp-status-btn resume" data-action="resume">Resume</button>
            <button class="exp-status-btn complete" data-action="complete">Complete</button>
            <button class="exp-status-btn fail" data-action="fail">Fail</button>`;
  } else {
    html = `<button class="exp-status-btn resume" data-action="reopen">Reopen</button>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('.exp-status-btn').forEach(btn => {
    btn.onclick = () => handleExpStatusAction(btn.dataset.action);
  });
}

function handleExpStatusAction(action) {
  const exp = state.experiments.find(e => e.id === currentExpId);
  if (!exp) return;
  if (action === 'pause') {
    exp.status = 'paused';
    save('experiments'); renderLab(); openExpDetail(currentExpId);
  } else if (action === 'resume' || action === 'reopen') {
    exp.status = 'active';
    exp.closedAt = null;
    exp.verdict = '';
    save('experiments'); renderLab(); openExpDetail(currentExpId);
  } else if (action === 'complete' || action === 'fail') {
    const pendingStatus = action === 'complete' ? 'completed' : 'failed';
    const actionsEl = document.getElementById('exp-status-actions');
    actionsEl.innerHTML = `
      <div class="exp-verdict-form" style="width:100%;">
        <div class="field-label" style="margin-bottom:8px;">What did you learn?</div>
        <textarea id="exp-verdict-input" rows="3" placeholder="The truth. No softening."></textarea>
        <div class="modal-actions" style="margin-top:8px;">
          <button class="btn btn-ghost" id="exp-verdict-cancel">Cancel</button>
          <button class="btn btn-primary" id="exp-verdict-save">Save &amp; close experiment</button>
        </div>
      </div>`;
    document.getElementById('exp-verdict-cancel').onclick = () => renderExpStatusActions(exp);
    document.getElementById('exp-verdict-save').onclick = () => {
      const verdict = document.getElementById('exp-verdict-input').value.trim();
      exp.status = pendingStatus;
      exp.verdict = verdict;
      exp.closedAt = Date.now();
      save('experiments'); renderLab(); openExpDetail(currentExpId);
    };
  }
}

// Filter buttons
document.getElementById('lab-filter-row').addEventListener('click', e => {
  const btn = e.target.closest('.lab-filter');
  if (!btn) return;
  currentLabFilter = btn.dataset.filter;
  document.querySelectorAll('.lab-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLab();
});

// New experiment button
document.getElementById('lab-new-btn').onclick = () => {
  expEditMode = false;
  document.getElementById('exp-modal-eyebrow').textContent = 'New Experiment';
  document.getElementById('exp-name-input').value = '';
  document.getElementById('exp-hypothesis-input').value = '';
  document.getElementById('exp-start-input').value = getToday();
  document.getElementById('exp-end-input').value = '';
  document.getElementById('exp-criteria-input').value = '';
  document.getElementById('exp-new-modal').classList.add('show');
};

document.getElementById('exp-new-cancel').onclick = () =>
  document.getElementById('exp-new-modal').classList.remove('show');

document.getElementById('exp-new-save').onclick = () => {
  const name = document.getElementById('exp-name-input').value.trim();
  const hypothesis = document.getElementById('exp-hypothesis-input').value.trim();
  if (!name || !hypothesis) { toast('Name and hypothesis are required.'); return; }
  const startedAt = document.getElementById('exp-start-input').value || getToday();
  const endDate = document.getElementById('exp-end-input').value || null;
  const criteria = document.getElementById('exp-criteria-input').value.trim();

  if (expEditMode && currentExpId) {
    const exp = state.experiments.find(e => e.id === currentExpId);
    if (exp) {
      exp.name = name; exp.hypothesis = hypothesis;
      exp.startedAt = startedAt; exp.endDate = endDate;
      exp.criteria = criteria;
      save('experiments');
      document.getElementById('exp-new-modal').classList.remove('show');
      renderLab();
      openExpDetail(currentExpId);
      return;
    }
  }

  state.experiments.push({
    id: uid(), name, hypothesis, startedAt, endDate: endDate || null,
    criteria, status: 'active', verdict: '',
    entries: [], createdAt: Date.now(), closedAt: null
  });
  save('experiments');
  document.getElementById('exp-new-modal').classList.remove('show');
  currentLabFilter = 'active';
  document.querySelectorAll('.lab-filter').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === 'active'));
  renderLab();
  toast('Experiment started.');
};

// Detail modal controls
document.getElementById('exp-detail-close-btn').onclick = () =>
  document.getElementById('exp-detail-modal').classList.remove('show');

document.getElementById('exp-add-entry-btn').onclick = () => {
  const text = document.getElementById('exp-new-entry-input').value.trim();
  if (!text) return;
  const exp = state.experiments.find(e => e.id === currentExpId);
  if (!exp) return;
  if (!exp.entries) exp.entries = [];
  exp.entries.push({ id: uid(), at: new Date().toISOString(), text });
  save('experiments');
  document.getElementById('exp-new-entry-input').value = '';
  renderExpEntries(exp);
  renderLab();
};

document.getElementById('exp-edit-btn').onclick = () => {
  const exp = state.experiments.find(e => e.id === currentExpId);
  if (!exp) return;
  expEditMode = true;
  document.getElementById('exp-modal-eyebrow').textContent = 'Edit Experiment';
  document.getElementById('exp-name-input').value = exp.name;
  document.getElementById('exp-hypothesis-input').value = exp.hypothesis;
  document.getElementById('exp-start-input').value = exp.startedAt;
  document.getElementById('exp-end-input').value = exp.endDate || '';
  document.getElementById('exp-criteria-input').value = exp.criteria || '';
  document.getElementById('exp-detail-modal').classList.remove('show');
  document.getElementById('exp-new-modal').classList.add('show');
};

document.getElementById('exp-delete-btn').onclick = () => {
  const exp = state.experiments.find(e => e.id === currentExpId);
  if (!exp) return;
  if (!confirm(`Delete "${exp.name}" and all its notes? Cannot be undone.`)) return;
  state.experiments = state.experiments.filter(e => e.id !== currentExpId);
  save('experiments');
  document.getElementById('exp-detail-modal').classList.remove('show');
  renderLab();
};

// Close modals by clicking backdrop
document.getElementById('exp-new-modal').addEventListener('click', e => {
  if (e.target.id === 'exp-new-modal') document.getElementById('exp-new-modal').classList.remove('show');
});
document.getElementById('exp-detail-modal').addEventListener('click', e => {
  if (e.target.id === 'exp-detail-modal') document.getElementById('exp-detail-modal').classList.remove('show');
});

// ============ RENDER ALL ============
// Render only the pieces belonging to one view. Each view's renderers write
// exclusively into elements inside that view, so rendering off-screen views is
// wasted DOM work (and clobbers focus/scroll). renderAll renders the visible
// view; the tab handler renders the destination on switch, so every view is
// fresh the moment it's shown.
function renderView(view) {
  switch (view) {
    case 'today':
      renderToday();
      break;
    case 'mind':
      renderLibraryStats();
      renderReviewBanner();
      renderCategories();
      renderAllCards();
      renderBooks();
      renderSummaries();
      renderCardCategoryPicker();
      if (mindMode === 'category') renderCategoryDetail();
      break;
    case 'lab':
      renderLab();
      break;
    case 'rules':
      renderRulesView();
      break;
    case 'constitution':
      renderConstitution();
      break;
  }
}

function renderAll() {
  renderView(currentView);
}

// ============ SIGN OUT ============
document.getElementById('signout-btn').onclick = async () => {
  if (!confirm('Sign out? Your data is saved to your account.')) return;
  await flushSync(); // push any queued writes before the session ends
  await _sb.auth.signOut();
  // Clear local cache so a different account starts clean
  Object.keys(localStorage).forEach(k => { if (k.startsWith('os:')) localStorage.removeItem(k); });
};

// ============ INIT — auth state drives everything ============
setDateGreeting();
showAuth(); // hidden until session confirmed

// Defer remote work out of the auth callback (awaiting supabase calls directly
// inside onAuthStateChange can deadlock). Retry a few times on failure so a
// transient load error never falls through to the destructive seed path.
async function attemptLoad(retriesLeft = 3) {
  const ok = await window.storage.loadAll();
  showApp();
  setDateGreeting();
  await loadState(ok);
  if (!ok && retriesLeft > 0) setTimeout(() => attemptLoad(retriesLeft - 1), 3000);
}

_sb.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    _currentUserId = session.user.id;
    const emailEl = document.getElementById('signout-email');
    if (emailEl) emailEl.textContent = session.user.email;
    if (event === 'TOKEN_REFRESHED') return;
    setTimeout(() => attemptLoad(), 0);
  } else {
    _currentUserId = null;
    showAuth();
  }
});
