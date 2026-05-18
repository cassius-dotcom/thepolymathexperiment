import {PILLARS,VIRTUES,ARCS,BOOKS,FLASHCARD_DECKS} from './state.js';

let messages = [];
let busy = false;

/* ── API KEY ── */
function getApiKey() { return localStorage.getItem('anthropic_api_key') || ''; }

/* ── CONTEXT HELPERS ── */
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getVirtueCtx() {
  const raw = localStorage.getItem('cos_virtue');
  if (!raw) return {name:'Discipline', day:1};
  const vs = JSON.parse(raw);
  const v = VIRTUES[vs.index] || VIRTUES[0];
  const diff = Math.floor((new Date() - new Date(vs.startDate+'T00:00:00')) / (1000*60*60*24));
  return {name: v.name, day: Math.max(1, Math.min(diff+1, 14))};
}

function getChecklistPct() {
  const raw = localStorage.getItem('cos_daily_'+todayKey());
  if (!raw) return 0;
  const checks = JSON.parse(raw);
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}

function getNightAudit() {
  const raw = localStorage.getItem('cos_daily_'+todayKey());
  if (!raw) return false;
  return JSON.parse(raw)[4] === true;
}

function getArcCtx() {
  const raw = localStorage.getItem('cos_arc');
  if (!raw) return null;
  const {id, startDate} = JSON.parse(raw);
  const arc = ARCS.find(a => a.id === id);
  if (!arc) return null;
  const week = Math.max(1, Math.min(Math.floor((new Date() - new Date(startDate+'T00:00:00')) / (1000*60*60*24*7))+1, arc.weeks));
  const phase = arc.phases[week-1] || arc.phases[arc.phases.length-1];
  return {name: arc.name, week, total: arc.weeks, phaseTitle: phase.title, phaseFocus: phase.focus};
}

function getRecentObsCtx() {
  const raw = localStorage.getItem('cos_observations');
  if (!raw) return null;
  const obs = JSON.parse(raw);
  if (!obs.length) return null;
  return obs.slice(-5).map(o => o.observation).join(' · ');
}

function getLibraryCtx() {
  const active = JSON.parse(localStorage.getItem('cos_library_active') || '[]');
  const notes = JSON.parse(localStorage.getItem('cos_library_notes') || '[]');
  const activeTitles = active.map(a => {
    const book = BOOKS.find(b => b.id === a.bookId);
    if (!book) return null;
    const pct = a.totalPages > 0 ? Math.round((a.pagesRead / a.totalPages) * 100) : 0;
    return `${book.title} (${pct}%)`;
  }).filter(Boolean);
  const recentNotes = notes.slice(-3).map(n => {
    const book = BOOKS.find(b => b.id === n.bookId);
    return book ? `[${book.title}] ${n.content}` : n.content;
  });
  return {activeTitles, recentNotes};
}

function getCardsCtx() {
  const reviews = JSON.parse(localStorage.getItem('cos_card_reviews') || '{}');
  const today = new Date(); today.setHours(23, 59, 59, 999);
  let dueCount = 0, masteredCount = 0, totalCount = 0;
  FLASHCARD_DECKS.forEach(deck => {
    deck.cards.forEach((_, idx) => {
      const r = reviews[`${deck.id}_${idx}`];
      totalCount++;
      if (!r || new Date(r.nextReview) <= today) dueCount++;
      if (r && r.level >= 5) masteredCount++;
    });
  });
  return {dueCount, masteredCount, totalCount};
}

function getSocialCtx() {
  const level = parseInt(localStorage.getItem('cos_exposure_level') || '1');
  const interactions = JSON.parse(localStorage.getItem('cos_interactions') || '[]').slice(-5);
  if (!interactions.length) return {level, summary: null};
  const n = interactions.length;
  const overexplain = interactions.filter(i => i.overexplained).length;
  const posture = interactions.filter(i => i.posture).length;
  const eyeContact = interactions.filter(i => i.eyeContact).length;
  return {level, summary: `overexplained ${overexplain}/${n}, posture ${posture}/${n}, eye contact ${eyeContact}/${n}`};
}

function getLegacyCtx() {
  const principles = JSON.parse(localStorage.getItem('cos_principles') || '[]');
  const letters = JSON.parse(localStorage.getItem('cos_letters') || '[]');
  const latest = principles.length ? principles[principles.length-1] : null;
  return {principleCount: principles.length, letterCount: letters.length, latestPrinciple: latest?.text || null};
}

/* ── SYSTEM PROMPT ── */
function buildSystemPrompt() {
  const vc = getVirtueCtx();
  const pct = getChecklistPct();
  const audit = getNightAudit();
  const pillarStr = PILLARS.map(p => `${p.name}: ${p.score}`).join(', ');
  const arc = getArcCtx();
  const arcLine = arc
    ? `- Active arc: ${arc.name} (Week ${arc.week} of ${arc.total}: ${arc.phaseTitle} — ${arc.phaseFocus})`
    : '- Active arc: none';
  const obsStr = getRecentObsCtx();
  const lib = getLibraryCtx();
  const cards = getCardsCtx();
  const social = getSocialCtx();
  const legacy = getLegacyCtx();
  const drifts = (window.drifts || []).map(d => d.text).join('; ');

  return `You are a Renaissance Mentor — a calm, intelligent, demanding philosophical guide. You speak with precision and restraint. No motivational clichés. No flattery. You respond like Marcus Aurelius would coach a young man — direct, grounded, honest.

Current user context:
- Active virtue: ${vc.name} (Day ${vc.day} of 14)
- Daily completion: ${pct}% of today's checklist done
- Night audit: ${audit ? 'complete' : 'not yet'}
${arcLine}
- Pillar scores — ${pillarStr}
${obsStr ? `- Recent observations: ${obsStr}` : ''}
${lib.activeTitles.length ? `- Currently reading: ${lib.activeTitles.join(', ')}` : ''}
${lib.recentNotes.length ? `- Recent notes: ${lib.recentNotes.join(' · ')}` : ''}
${cards.dueCount > 0 ? `- Cards due today: ${cards.dueCount}` : ''}
${cards.masteredCount > 0 ? `- Cards mastered (level 5): ${cards.masteredCount} of ${cards.totalCount}` : ''}
- Current exposure level: ${social.level}
${social.summary ? `- Recent interaction patterns: ${social.summary}` : ''}
${(legacy.principleCount > 0 || legacy.letterCount > 0) ? `- The user has written ${legacy.principleCount} principles and ${legacy.letterCount} letters.${legacy.latestPrinciple ? ` Recent principle: "${legacy.latestPrinciple}".` : ''}` : ''}
${drifts ? `- Active behavioral drifts: ${drifts}` : ''}
- Identity: Produces value at scale. Governs himself under pressure. Builds strength in body and character. Communicates with precision and restraint. Loves deeply without losing himself. Anchors meaning in God, not ego.

Respond in 3-6 sentences maximum. No bullet points. No headers. Prose only. Be honest even when uncomfortable.`;
}

/* ── API CALL ── */
async function callMentor() {
  const key = getApiKey();
  if (!key) { showSetup(); return null; }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: buildSystemPrompt(),
      messages
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

/* ── DOM HELPERS ── */
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function appendMsg(role, text) {
  const chat = document.getElementById('mentor-chat');
  if (!chat) return;
  const div = document.createElement('div');
  div.className = `mentor-msg mentor-msg-${role}`;
  if (role === 'user') {
    div.innerHTML = `<div class="mentor-user-bubble">${escHtml(text)}</div>`;
  } else if (role === 'assistant') {
    div.innerHTML = `<div class="mentor-row"><div class="mentor-avatar">M</div><div class="mentor-mentor-text">${escHtml(text)}</div></div>`;
  } else {
    div.innerHTML = `<div class="mentor-error">${escHtml(text)}</div>`;
  }
  chat.appendChild(div);
  div.scrollIntoView({behavior:'smooth', block:'end'});
}

function setTyping(on) {
  const chat = document.getElementById('mentor-chat');
  if (!chat) return;
  let el = document.getElementById('mentor-typing');
  if (on) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'mentor-typing';
      el.className = 'mentor-msg mentor-typing';
      el.innerHTML = `<div class="mentor-avatar">M</div><div class="loading-dots"><span></span><span></span><span></span></div>`;
      chat.appendChild(el);
    }
    el.scrollIntoView({behavior:'smooth', block:'end'});
  } else {
    if (el) el.remove();
  }
}

function setSendDisabled(on) {
  const btn = document.getElementById('mentor-send');
  if (btn) btn.disabled = on;
}

function hidePrompts() {
  const el = document.getElementById('mentor-prompts');
  if (el) el.style.display = 'none';
}

function showSetup() {
  const cfg = document.getElementById('mentor-api-config');
  if (cfg) cfg.style.display = '';
  const status = document.getElementById('mentor-key-status');
  if (status) status.style.display = 'none';
  const inp = document.getElementById('mentor-key-input');
  if (inp) inp.value = '';
}

/* ── PUBLIC ── */
export function renderMentor() {
  const textarea = document.getElementById('mentor-input');
  if (!textarea || textarea.dataset.init) return;
  textarea.dataset.init = '1';

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 72) + 'px';
  });
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMentorMessage(); }
  });

  if (getApiKey()) {
    document.getElementById('mentor-key-status').style.display = '';
  } else {
    showSetup();
  }
}

export function saveMentorKey() {
  const val = document.getElementById('mentor-key-input')?.value.trim();
  if (!val) return;
  localStorage.setItem('anthropic_api_key', val);
  const cfg = document.getElementById('mentor-api-config');
  if (cfg) cfg.style.display = 'none';
  const status = document.getElementById('mentor-key-status');
  if (status) status.style.display = '';
  const inp = document.getElementById('mentor-key-input');
  if (inp) inp.value = '';
}

export function openKeyConfig() {
  showSetup();
}

export async function sendMentorMessage() {
  const textarea = document.getElementById('mentor-input');
  const text = (textarea?.value || '').trim();
  if (!text || busy) return;

  hidePrompts();
  textarea.value = '';
  textarea.style.height = 'auto';
  busy = true;
  setSendDisabled(true);

  messages.push({role: 'user', content: text});
  appendMsg('user', text);
  setTyping(true);

  try {
    const reply = await callMentor();
    setTyping(false);
    if (reply) {
      messages.push({role: 'assistant', content: reply});
      appendMsg('assistant', reply);
    }
  } catch(err) {
    setTyping(false);
    appendMsg('error', err.message || 'Something went wrong. Try again.');
  } finally {
    busy = false;
    setSendDisabled(false);
    textarea?.focus();
  }
}

export function sendPrompt(text) {
  const textarea = document.getElementById('mentor-input');
  if (textarea) {
    textarea.value = text;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 72) + 'px';
  }
  sendMentorMessage();
}

window.sendMentorMessage = sendMentorMessage;
window.sendPrompt = sendPrompt;
window.saveMentorKey = saveMentorKey;
window.openKeyConfig = openKeyConfig;
