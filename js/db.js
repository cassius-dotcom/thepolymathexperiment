import { supabase } from './supabase.js';

let _uid = null;
export function setCurrentUser(id) { _uid = id; }
function uid() { return _uid; }

/* ── IN-MEMORY STORE ── */
export const appData = {
  tasks: [],
  checklists: {},
  virtue: null,
  arc: null,
  observations: [],
  exposureLevel: 1,
  exposureChecks: {},
  interactions: [],
  libraryActive: [],
  libraryNotes: [],
  cardReviews: {},
  principles: [],
  letters: [],
  constitution: { identity: null, axioms: null, filters: null },
  dismissedDrifts: [],
  driftLog: {},
  audits: {},
  mirror: null,
  mentorLastOpen: null,
  apiKey: '',
};

/* ── LOAD CRITICAL (Today + Operations — awaited before first render) ── */
export async function loadAll(userId) {
  _uid = userId;
  const [tR, clR, auR, stR] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId).order('id'),
    supabase.from('daily_checklists').select('*').eq('user_id', userId),
    supabase.from('audits').select('*').eq('user_id', userId),
    supabase.from('user_state').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  appData.tasks = (tR.data || []).map(t => ({ id: t.id, text: t.text, done: t.done }));

  appData.checklists = {};
  (clR.data || []).forEach(r => { appData.checklists[r.date] = r.checks; });

  appData.audits = {};
  (auR.data || []).forEach(r => { appData.audits[r.date] = r.data; });

  const s = stR.data;
  if (s) {
    appData.virtue = s.virtue;
    appData.arc = s.arc;
    appData.exposureLevel = s.exposure_level ?? 1;
    appData.constitution = s.constitution || { identity: null, axioms: null, filters: null };
    appData.mirror = s.mirror;
    appData.mentorLastOpen = s.mentor_last_open;
    appData.dismissedDrifts = s.dismissed_drifts || [];
    appData.driftLog = s.drift_log || {};
    appData.apiKey = s.api_key || '';
  }
}

/* ── LOAD DEFERRED (secondary views — fire-and-forget after first render) ── */
export async function loadDeferred(userId) {
  const [oR, ecR, iR, laR, lnR, crR, prR, leR] = await Promise.all([
    supabase.from('observations').select('*').eq('user_id', userId).order('id'),
    supabase.from('exposure_checks').select('*').eq('user_id', userId),
    supabase.from('interactions').select('*').eq('user_id', userId).order('id'),
    supabase.from('library_active').select('*').eq('user_id', userId),
    supabase.from('library_notes').select('*').eq('user_id', userId).order('id'),
    supabase.from('card_reviews').select('*').eq('user_id', userId),
    supabase.from('principles').select('*').eq('user_id', userId).order('id'),
    supabase.from('letters').select('*').eq('user_id', userId).order('id'),
  ]);

  appData.observations = (oR.data || []).map(o => ({
    id: o.id, date: o.date, tag: o.tag, observation: o.observation, meaning: o.meaning || ''
  }));

  appData.exposureChecks = {};
  (ecR.data || []).forEach(r => { appData.exposureChecks[r.date] = r.checks; });

  appData.interactions = (iR.data || []).map(i => ({
    id: i.id, date: i.date, level: i.level,
    overexplained: i.overexplained, posture: i.posture, speech: i.speech,
    eyeContact: i.eye_contact, notes: i.notes || ''
  }));

  appData.libraryActive = (laR.data || []).map(a => ({
    bookId: a.book_id, pagesRead: a.pages_read, totalPages: a.total_pages
  }));

  appData.libraryNotes = (lnR.data || []).map(n => ({
    id: n.id, bookId: n.book_id, date: n.date, type: n.type, content: n.content
  }));

  appData.cardReviews = {};
  (crR.data || []).forEach(r => {
    appData.cardReviews[r.card_key] = { lastReview: r.last_review, nextReview: r.next_review, level: r.level };
  });

  appData.principles = (prR.data || []).map(p => ({
    id: p.id, number: p.number, text: p.text, context: p.context || '', date: p.date
  }));

  appData.letters = (leR.data || []).map(l => ({
    id: l.id, recipient: l.recipient, date: l.date,
    unlockDate: l.unlock_date, content: l.content, notified: l.notified
  }));
}

/* ── HELPER: partial upsert on user_state ── */
function saveState(patch) {
  supabase.from('user_state')
    .upsert({ user_id: uid(), ...patch }, { onConflict: 'user_id' })
    .then(({ error }) => { if (error) console.error('[db] state error:', error); });
}

/* ── TASKS ── */
export function dbAddTask(task) {
  appData.tasks.push(task);
  supabase.from('tasks').insert({ user_id: uid(), id: task.id, text: task.text, done: task.done })
    .then(({ error }) => { if (error) console.error('[db] task insert:', error); });
}
export function dbUpdateTask(id, patch) {
  const t = appData.tasks.find(t => t.id === id);
  if (t) Object.assign(t, patch);
  supabase.from('tasks').update(patch).eq('user_id', uid()).eq('id', id)
    .then(({ error }) => { if (error) console.error('[db] task update:', error); });
}
export function dbDeleteTask(id) {
  appData.tasks = appData.tasks.filter(t => t.id !== id);
  supabase.from('tasks').delete().eq('user_id', uid()).eq('id', id)
    .then(({ error }) => { if (error) console.error('[db] task delete:', error); });
}

/* ── CHECKLISTS ── */
export function dbSaveChecklist(date, checks) {
  appData.checklists[date] = checks;
  supabase.from('daily_checklists')
    .upsert({ user_id: uid(), date, checks }, { onConflict: 'user_id,date' })
    .then(({ error }) => { if (error) console.error('[db] checklist:', error); });
}

/* ── AUDITS ── */
export function dbSaveAudit(date, data) {
  appData.audits[date] = data;
  supabase.from('audits').upsert({ user_id: uid(), date, data }, { onConflict: 'user_id,date' })
    .then(({ error }) => { if (error) console.error('[db] audit:', error); });
}

/* ── VIRTUE / ARC ── */
export function dbSaveVirtue(virtue) { appData.virtue = virtue; saveState({ virtue }); }
export function dbSaveArc(arc) { appData.arc = arc; saveState({ arc }); }

/* ── OBSERVATIONS ── */
export function dbAddObservation(obs) {
  appData.observations.push(obs);
  supabase.from('observations').insert({
    user_id: uid(), id: obs.id, date: obs.date, tag: obs.tag,
    observation: obs.observation, meaning: obs.meaning || null
  }).then(({ error }) => { if (error) console.error('[db] obs insert:', error); });
}
export function dbDeleteObservation(id) {
  appData.observations = appData.observations.filter(o => o.id !== id);
  supabase.from('observations').delete().eq('user_id', uid()).eq('id', id)
    .then(({ error }) => { if (error) console.error('[db] obs delete:', error); });
}

/* ── EXPOSURE / INTERACTIONS ── */
export function dbSaveExposureLevel(level) { appData.exposureLevel = level; saveState({ exposure_level: level }); }
export function dbSaveExposureChecks(date, checks) {
  appData.exposureChecks[date] = checks;
  supabase.from('exposure_checks')
    .upsert({ user_id: uid(), date, checks }, { onConflict: 'user_id,date' })
    .then(({ error }) => { if (error) console.error('[db] exposure checks:', error); });
}
export function dbAddInteraction(i) {
  appData.interactions.push(i);
  supabase.from('interactions').insert({
    user_id: uid(), id: i.id, date: i.date, level: i.level,
    overexplained: i.overexplained, posture: i.posture, speech: i.speech,
    eye_contact: i.eyeContact, notes: i.notes || null
  }).then(({ error }) => { if (error) console.error('[db] interaction:', error); });
}

/* ── LIBRARY ── */
export function dbUpsertLibraryBook(entry) {
  const idx = appData.libraryActive.findIndex(a => a.bookId === entry.bookId);
  if (idx > -1) appData.libraryActive[idx] = entry; else appData.libraryActive.push(entry);
  supabase.from('library_active').upsert({
    user_id: uid(), book_id: entry.bookId, pages_read: entry.pagesRead, total_pages: entry.totalPages
  }, { onConflict: 'user_id,book_id' })
    .then(({ error }) => { if (error) console.error('[db] library upsert:', error); });
}
export function dbRemoveLibraryBook(bookId) {
  appData.libraryActive = appData.libraryActive.filter(a => a.bookId !== bookId);
  supabase.from('library_active').delete().eq('user_id', uid()).eq('book_id', bookId)
    .then(({ error }) => { if (error) console.error('[db] library remove:', error); });
}
export function dbAddLibraryNote(note) {
  appData.libraryNotes.push(note);
  supabase.from('library_notes').insert({
    user_id: uid(), id: note.id, book_id: note.bookId, date: note.date, type: note.type, content: note.content
  }).then(({ error }) => { if (error) console.error('[db] note insert:', error); });
}
export function dbSaveCardReview(cardKey, review) {
  appData.cardReviews[cardKey] = review;
  supabase.from('card_reviews').upsert({
    user_id: uid(), card_key: cardKey, last_review: review.lastReview,
    next_review: review.nextReview, level: review.level
  }, { onConflict: 'user_id,card_key' })
    .then(({ error }) => { if (error) console.error('[db] card review:', error); });
}

/* ── PRINCIPLES / LETTERS ── */
export function dbAddPrinciple(p) {
  appData.principles.push(p);
  supabase.from('principles').insert({
    user_id: uid(), id: p.id, number: p.number, text: p.text, context: p.context || null, date: p.date
  }).then(({ error }) => { if (error) console.error('[db] principle insert:', error); });
}
export function dbUpdatePrinciple(id, patch) {
  const p = appData.principles.find(p => p.id === id);
  if (p) Object.assign(p, patch);
  supabase.from('principles').update({ text: patch.text, context: patch.context || null })
    .eq('user_id', uid()).eq('id', id)
    .then(({ error }) => { if (error) console.error('[db] principle update:', error); });
}
export function dbDeletePrinciple(id) {
  appData.principles = appData.principles.filter(p => p.id !== id);
  supabase.from('principles').delete().eq('user_id', uid()).eq('id', id)
    .then(({ error }) => { if (error) console.error('[db] principle delete:', error); });
}
export function dbAddLetter(letter) {
  appData.letters.push(letter);
  supabase.from('letters').insert({
    user_id: uid(), id: letter.id, recipient: letter.recipient, date: letter.date,
    unlock_date: letter.unlockDate || null, content: letter.content, notified: false
  }).then(({ error }) => { if (error) console.error('[db] letter insert:', error); });
}
export function dbMarkLetterNotified(id) {
  const l = appData.letters.find(l => l.id === id);
  if (l) l.notified = true;
  supabase.from('letters').update({ notified: true }).eq('user_id', uid()).eq('id', id)
    .then(({ error }) => { if (error) console.error('[db] letter notified:', error); });
}

/* ── CONSTITUTION ── */
export function dbSaveConstitution(patch) {
  const updated = { ...(appData.constitution || {}), ...patch };
  appData.constitution = updated;
  saveState({ constitution: updated });
}

/* ── DRIFT ── */
export function dbSaveDismissedDrifts(arr) { appData.dismissedDrifts = arr; saveState({ dismissed_drifts: arr }); }
export function dbSaveDriftLog(log) { appData.driftLog = log; saveState({ drift_log: log }); }

/* ── MENTOR / MIRROR ── */
export function dbSaveMentorLastOpen(ts) { appData.mentorLastOpen = ts; saveState({ mentor_last_open: ts }); }
export function dbSaveApiKey(key) { appData.apiKey = key; saveState({ api_key: key }); }
export function dbSaveMirror(mirror) { appData.mirror = mirror; saveState({ mirror }); }
