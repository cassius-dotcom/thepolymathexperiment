import {BOOKS, FLASHCARD_DECKS, state, save} from './state.js';

/* ── MODULE STATE ── */
let libMode = 'active';
let libFilter = 'All';
let modalBookId = null;
let noteType = 'thought';
let modalAddingNote = false;
let _expressionBook = null;

let sessionDeckId = null;
let sessionCards = [];
let sessionIdx = 0;
let sessionFlipped = false;
let sessionResults = [];

function safeJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

/* ── LOCALSTORAGE ── */
function getActive() { return safeJson(localStorage.getItem('cos_library_active'), []); }
function saveActive(arr) { localStorage.setItem('cos_library_active', JSON.stringify(arr)); }
function getNotes() { return safeJson(localStorage.getItem('cos_library_notes'), []); }
function saveNotes(arr) { localStorage.setItem('cos_library_notes', JSON.stringify(arr)); }
function getCardReviews() { return safeJson(localStorage.getItem('cos_card_reviews'), {}); }
function saveCardReviews(obj) { localStorage.setItem('cos_card_reviews', JSON.stringify(obj)); }

/* ── UTILITIES ── */
function gem(gradient, size, radius) {
  const r = radius !== undefined ? radius : 8;
  return `<div style="width:${size}px;height:${size}px;border-radius:${r}px;background:${gradient};flex-shrink:0"></div>`;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

/* ── SPACED REPETITION ── */
const LEVEL_DAYS = {1:1, 2:3, 3:7, 4:14, 5:30};

function getDueCards(deckId) {
  const deck = FLASHCARD_DECKS.find(d => d.id === deckId);
  if (!deck) return [];
  const reviews = getCardReviews();
  const today = new Date(); today.setHours(23, 59, 59, 999);
  return deck.cards.map((card, idx) => {
    const r = reviews[`${deckId}_${idx}`];
    return {cardIdx: idx, front: card.front, back: card.back, due: !r || new Date(r.nextReview) <= today};
  }).filter(c => c.due);
}

function getNextDueInfo(deckId) {
  const deck = FLASHCARD_DECKS.find(d => d.id === deckId);
  if (!deck) return {days: 1, count: 0};
  const reviews = getCardReviews();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const future = deck.cards.map((_, idx) => {
    const r = reviews[`${deckId}_${idx}`];
    if (!r) return null;
    const next = new Date(r.nextReview); next.setHours(0, 0, 0, 0);
    return next > today ? next : null;
  }).filter(Boolean);
  if (!future.length) return {days: 1, count: 0};
  const minTs = Math.min(...future.map(d => d.getTime()));
  const days = Math.ceil((minTs - today.getTime()) / (1000*60*60*24));
  const count = future.filter(d => d.getTime() === minTs).length;
  return {days, count};
}

function updateCardReview(deckId, cardIdx, result) {
  const reviews = getCardReviews();
  const key = `${deckId}_${cardIdx}`;
  const current = reviews[key];
  const lvl = current ? current.level : 1;
  const newLvl = result === 'embodied' ? Math.min(lvl+1, 5) : result === 'familiar' ? lvl : 1;
  const days = LEVEL_DAYS[newLvl] || 1;
  const next = new Date(); next.setDate(next.getDate()+days); next.setHours(0, 0, 0, 0);
  reviews[key] = {lastReview: new Date().toISOString(), nextReview: next.toISOString(), level: newLvl};
  saveCardReviews(reviews);
}

function getDeckDueCount(deckId) {
  const deck = FLASHCARD_DECKS.find(d => d.id === deckId);
  if (!deck) return 0;
  const reviews = getCardReviews();
  const today = new Date(); today.setHours(23, 59, 59, 999);
  return deck.cards.filter((_, idx) => {
    const r = reviews[`${deckId}_${idx}`];
    return !r || new Date(r.nextReview) <= today;
  }).length;
}

function getDeckLastReviewed(deckId) {
  const reviews = getCardReviews();
  let latest = null;
  Object.entries(reviews).forEach(([key, r]) => {
    if (!key.startsWith(deckId+'_')) return;
    const d = new Date(r.lastReview);
    if (!latest || d > latest) latest = d;
  });
  if (!latest) return 'Never';
  const diff = Math.floor((new Date() - latest) / (1000*60*60*24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}

/* ── RENDER ── */
export function renderLibrary() {
  const view = document.getElementById('view-library');
  if (!view) return;

  const active = getActive();
  const notes = getNotes();
  const domains = ['All','Philosophy','Power','Presence','Warfare','Virtue','Self-construction'];

  let html = `
    <div class="lib-toggle-bar">
      <button class="lib-mode-btn${libMode==='active'?' active':''}" onclick="libSetMode('active')">Active</button>
      <button class="lib-mode-btn${libMode==='browse'?' active':''}" onclick="libSetMode('browse')">Library</button>
      <button class="lib-mode-btn${libMode==='cards'?' active':''}" onclick="libSetMode('cards')">Cards</button>
    </div>`;

  if (libMode === 'active') {
    html += `<div class="eyebrow">Currently reading</div>`;
    if (!active.length) {
      html += `<div class="lib-empty">No active reading. Begin a book.</div>`;
    } else {
      active.forEach(entry => {
        const book = BOOKS.find(b => b.id === entry.bookId);
        if (!book) return;
        const pct = entry.totalPages > 0 ? Math.round((entry.pagesRead/entry.totalPages)*100) : 0;
        const noteCount = notes.filter(n => n.bookId === book.id).length;
        html += `
          <div class="lib-active-card" onclick="libOpenBook('${book.id}')">
            <div class="lib-active-top">
              ${gem(book.gem, 40)}
              <div class="lib-active-info">
                <div class="lib-active-title">${escHtml(book.title)}</div>
                <div class="lib-active-author">${escHtml(book.author)}</div>
              </div>
            </div>
            <div class="lib-progress-wrap">
              <div class="lib-progress-bar"><div class="lib-progress-fill" style="width:${pct}%"></div></div>
              <div class="lib-progress-pct">${pct}%</div>
            </div>
            <div class="lib-note-count">Notes (${noteCount})</div>
          </div>`;
      });
    }
  } else if (libMode === 'browse') {
    html += `<div class="lib-filter-bar">`;
    domains.forEach(d => {
      html += `<button class="lib-filter-chip${libFilter===d?' active':''}" onclick="libSetFilter('${d}')">${d}</button>`;
    });
    html += `</div><div class="lib-grid">`;
    BOOKS.filter(b => libFilter === 'All' || b.domain === libFilter).forEach(book => {
      html += `
        <div class="lib-book-card" onclick="libOpenBook('${book.id}')">
          <div class="lib-book-top">${gem(book.gem, 32)}</div>
          <div class="lib-book-title">${escHtml(book.title)}</div>
          <div class="lib-book-author">${escHtml(book.author)}</div>
          <div class="lib-book-essence">${escHtml(book.essence)}</div>
        </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="eyebrow">Practice decks</div><div class="lib-deck-grid">`;
    FLASHCARD_DECKS.forEach(deck => {
      const due = getDeckDueCount(deck.id);
      const lastRev = getDeckLastReviewed(deck.id);
      html += `
        <div class="lib-deck-card" onclick="libOpenDeck('${deck.id}')">
          <div class="lib-deck-top">
            ${gem(deck.gem, 32)}
            ${due > 0 ? `<span class="lib-deck-due">${due} due</span>` : ''}
          </div>
          <div class="lib-deck-name">${escHtml(deck.name)}</div>
          <div class="lib-deck-desc">${escHtml(deck.descriptor)}</div>
          <div class="lib-deck-meta">${deck.cards.length} cards · Last reviewed ${lastRev}</div>
        </div>`;
    });
    html += `</div>`;
  }

  view.innerHTML = html;
}

/* ── BOOK MODAL ── */
function renderModal(bookId) {
  const existing = document.getElementById('lib-modal-overlay');
  if (existing) existing.remove();
  const book = BOOKS.find(b => b.id === bookId);
  if (!book) return;
  modalBookId = bookId;
  noteType = 'thought';
  modalAddingNote = false;

  const activeEntry = getActive().find(a => a.bookId === bookId) || null;
  const notes = getNotes().filter(n => n.bookId === bookId).reverse();
  const pct = activeEntry && activeEntry.totalPages > 0
    ? Math.round((activeEntry.pagesRead/activeEntry.totalPages)*100) : 0;

  let progressHtml = '';
  if (activeEntry) {
    progressHtml = `
      <div class="lib-modal-progress">
        <div class="lib-modal-pages-row">
          <div class="lib-modal-pages-group">
            <div class="lib-modal-pages-label">Pages read</div>
            <div class="lib-modal-pages-ctrl">
              <button class="lib-pages-btn" onclick="libAdjustPages(-10)">−</button>
              <input class="lib-pages-input" id="lib-pages-read" type="number" min="0" value="${activeEntry.pagesRead}" onchange="libSaveProgress()">
              <button class="lib-pages-btn" onclick="libAdjustPages(10)">+</button>
            </div>
          </div>
          <div class="lib-modal-pages-group">
            <div class="lib-modal-pages-label">Total pages</div>
            <div class="lib-modal-pages-ctrl">
              <button class="lib-pages-btn" onclick="libAdjustTotal(-10)">−</button>
              <input class="lib-pages-input" id="lib-pages-total" type="number" min="1" value="${activeEntry.totalPages||''}" placeholder="—" onchange="libSaveProgress()">
              <button class="lib-pages-btn" onclick="libAdjustTotal(10)">+</button>
            </div>
          </div>
        </div>
        <div class="lib-progress-wrap" style="margin-top:12px">
          <div class="lib-progress-bar"><div class="lib-progress-fill" id="lib-modal-progress-fill" style="width:${pct}%"></div></div>
          <div class="lib-progress-pct" id="lib-modal-progress-pct">${pct}%</div>
        </div>
      </div>
      <button class="lib-add-note-btn" onclick="libToggleAddNote()">Add note</button>
      <div id="lib-add-note-form" style="display:none">
        <div class="lib-note-type-bar">
          <button class="lib-note-type-btn" onclick="libSetNoteType('passage')">Passage</button>
          <button class="lib-note-type-btn active" onclick="libSetNoteType('thought')">Thought</button>
          <button class="lib-note-type-btn" onclick="libSetNoteType('action')">Action</button>
        </div>
        <textarea class="lib-note-input" id="lib-note-content" placeholder="Write your note…" rows="3"></textarea>
        <button class="lib-note-save-btn" onclick="libSaveNote()">Save note</button>
      </div>`;
  }

  let notesHtml = '';
  if (notes.length) {
    notesHtml = `<div class="lib-notes-list">`;
    notes.forEach(n => {
      notesHtml += `
        <div class="lib-note-item">
          <div class="lib-note-type-label lib-note-type-${n.type}">${n.type}</div>
          <div class="lib-note-content">${escHtml(n.content)}</div>
        </div>`;
    });
    notesHtml += `</div>`;
  }

  const removeHtml = activeEntry
    ? `<button class="lib-remove-btn" onclick="libRemoveActive('${bookId}')">Remove from active</button>` : '';
  const beginHtml = !activeEntry
    ? `<button class="lib-begin-btn" onclick="libBeginReading('${bookId}')">Begin reading</button>` : '';

  const overlay = document.createElement('div');
  overlay.id = 'lib-modal-overlay';
  overlay.className = 'lib-modal-overlay';
  overlay.innerHTML = `
    <div class="lib-modal-card" onclick="event.stopPropagation()">
      <button class="lib-modal-close" onclick="libCloseModal()">×</button>
      <div class="lib-modal-gem">${gem(book.gem, 60, 12)}</div>
      <div class="lib-modal-title">${escHtml(book.title)}</div>
      <div class="lib-modal-author">${escHtml(book.author)}</div>
      <div class="lib-modal-essence">"${escHtml(book.essence)}"</div>
      <div class="lib-domain-tag"><span class="lib-domain-pill">${escHtml(book.domain)}</span></div>
      ${beginHtml}${progressHtml}${notesHtml}${removeHtml}
    </div>`;
  overlay.addEventListener('click', libCloseModal);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
}

/* ── EXPRESSION PROMPT ── */
function showExpressionPrompt(book) {
  _expressionBook = book;
  const existing = document.getElementById('lib-expression-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'lib-expression-overlay';
  overlay.className = 'lib-modal-overlay';
  overlay.innerHTML = `
    <div class="lib-modal-card lib-expression-card" onclick="event.stopPropagation()">
      <div class="lib-expression-title">You have finished ${escHtml(book.title)}.</div>
      <div class="lib-expression-body">The Renaissance Man does not consume without expressing.</div>
      <div class="lib-expression-body" style="margin-bottom:0">Choose one:</div>
      <div class="lib-expression-options">
        <button class="lib-expression-btn" onclick="libCommitExpression(0)">Write a one-page essence</button>
        <button class="lib-expression-btn" onclick="libCommitExpression(1)">Three actions to apply this</button>
        <button class="lib-expression-btn" onclick="libCommitExpression(2)">Teach this to one person this week</button>
      </div>
    </div>`;
  overlay.addEventListener('click', () => { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
}

/* ── SESSION ── */
function buildCardHtml(card) {
  return `
    <div class="lib-session-card" id="lib-session-card" onclick="libFlipCard()">
      <div class="lib-session-face-front" id="lib-session-front">
        <div class="lib-card-front-text">${escHtml(card.front)}</div>
      </div>
      <div class="lib-session-face-back" id="lib-session-back">
        <div class="lib-card-back-text">${escHtml(card.back)}</div>
      </div>
    </div>`;
}

function renderCurrentCard() {
  const deck = FLASHCARD_DECKS.find(d => d.id === sessionDeckId);
  const inner = document.getElementById('lib-session-inner');
  if (!deck || !inner) return;
  const card = sessionCards[sessionIdx];
  const total = sessionCards.length;
  const pct = (sessionIdx / total) * 100;
  inner.innerHTML = `
    <div class="lib-session-header">
      <div class="lib-session-meta">
        <div class="lib-session-deck-name">${escHtml(deck.name)}</div>
        <div class="lib-session-counter">Card ${sessionIdx+1} of ${total}</div>
      </div>
      <button class="lib-session-close" onclick="libCloseSession()">×</button>
    </div>
    <div class="lib-session-progress-bar">
      <div class="lib-session-progress-fill" style="width:${pct}%"></div>
    </div>
    ${buildCardHtml(card)}
    <div class="lib-session-hint" id="lib-session-hint">Tap to reveal</div>
    <div class="lib-session-rate" id="lib-session-rate" style="display:none">
      <button class="lib-rate-btn lib-rate-needs" onclick="libRateCard('needs_work')">Needs work</button>
      <button class="lib-rate-btn lib-rate-familiar" onclick="libRateCard('familiar')">Familiar</button>
      <button class="lib-rate-btn lib-rate-embodied" onclick="libRateCard('embodied')">Embodied</button>
    </div>`;
}

function openSession(deckId) {
  const deck = FLASHCARD_DECKS.find(d => d.id === deckId);
  if (!deck) return;
  const due = getDueCards(deckId);
  sessionDeckId = deckId;
  sessionCards = due;
  sessionIdx = 0;
  sessionFlipped = false;
  sessionResults = [];

  const existing = document.getElementById('lib-session-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lib-session-overlay';
  overlay.className = 'lib-session-overlay';

  if (!due.length) {
    const info = getNextDueInfo(deckId);
    overlay.innerHTML = `
      <div class="lib-session-inner" id="lib-session-inner">
        <div class="lib-session-header">
          <div class="lib-session-meta"><div class="lib-session-deck-name">${escHtml(deck.name)}</div></div>
          <button class="lib-session-close" onclick="libCloseSession()">×</button>
        </div>
        <div class="lib-session-empty">
          <div class="lib-session-empty-title">All cards embodied for now.</div>
          <div class="lib-session-empty-sub">Return in ${info.days} day${info.days!==1?'s':''} for ${info.count} card${info.count!==1?'s':''}.</div>
          <button class="lib-begin-btn" onclick="libCloseSession()" style="margin-top:var(--s-6)">Return</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
  } else {
    overlay.innerHTML = `<div class="lib-session-inner" id="lib-session-inner"></div>`;
    document.body.appendChild(overlay);
    renderCurrentCard();
    requestAnimationFrame(() => overlay.classList.add('open'));
  }
}

function showSessionComplete() {
  const inner = document.getElementById('lib-session-inner');
  if (!inner) return;
  const embodied = sessionResults.filter(r => r==='embodied').length;
  const familiar = sessionResults.filter(r => r==='familiar').length;
  const needs = sessionResults.filter(r => r==='needs_work').length;
  inner.innerHTML = `
    <div class="lib-session-complete">
      <div class="lib-session-complete-title">Session complete.</div>
      <div class="lib-session-complete-stats">
        <span class="lib-stat-embodied">${embodied} embodied</span>
        <span class="lib-stat-dot">·</span>
        <span class="lib-stat-familiar">${familiar} familiar</span>
        <span class="lib-stat-dot">·</span>
        <span class="lib-stat-needs">${needs} need work</span>
      </div>
      <button class="lib-begin-btn" onclick="libCloseSession()">Return</button>
    </div>`;
}

/* ── SKELETON ── */
export function showLibrarySkeleton() {
  const view = document.getElementById('view-library');
  if (!view) return;
  const card = `
    <div class="lib-book-card">
      <div class="skeleton" style="height:32px;border-radius:var(--r-xs);margin-bottom:var(--s-3)"></div>
      <div class="skeleton" style="height:13px;width:70%;margin-bottom:var(--s-2)"></div>
      <div class="skeleton" style="height:11px;width:45%"></div>
    </div>`;
  view.innerHTML = `
    <div style="padding:var(--s-7) 0 var(--s-4)">
      <div class="skeleton" style="height:28px;width:200px;border-radius:var(--r-pill);margin:0 auto var(--s-5)"></div>
      <div class="lib-grid">${Array(4).fill(card).join('')}</div>
    </div>`;
}

/* ── WINDOW FUNCTIONS ── */
function libSetMode(mode) { libMode = mode; renderLibrary(); }
function libSetFilter(filter) { libFilter = filter; renderLibrary(); }
function libOpenBook(bookId) { renderModal(bookId); }

function libCloseModal() {
  const overlay = document.getElementById('lib-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 200);
}

function libBeginReading(bookId) {
  const active = getActive();
  if (!active.find(a => a.bookId === bookId)) {
    active.push({bookId, pagesRead: 0, totalPages: 0});
    saveActive(active);
  }
  libCloseModal();
  setTimeout(() => renderModal(bookId), 220);
}

function libSaveProgress() {
  const active = getActive();
  const entry = active.find(a => a.bookId === modalBookId);
  if (!entry) return;
  const readInput = document.getElementById('lib-pages-read');
  const totalInput = document.getElementById('lib-pages-total');
  entry.pagesRead = Math.max(0, parseInt(readInput?.value)||0);
  entry.totalPages = Math.max(0, parseInt(totalInput?.value)||0);
  saveActive(active);
  const pct = entry.totalPages > 0 ? Math.round((entry.pagesRead/entry.totalPages)*100) : 0;
  const fill = document.getElementById('lib-modal-progress-fill');
  const pctEl = document.getElementById('lib-modal-progress-pct');
  if (fill) fill.style.width = pct+'%';
  if (pctEl) pctEl.textContent = pct+'%';
  if (pct >= 100) {
    const book = BOOKS.find(b => b.id === modalBookId);
    if (book) { libCloseModal(); setTimeout(() => showExpressionPrompt(book), 220); }
  }
}

function libAdjustPages(delta) {
  const input = document.getElementById('lib-pages-read');
  if (!input) return;
  input.value = Math.max(0, (parseInt(input.value)||0)+delta);
  libSaveProgress();
}

function libAdjustTotal(delta) {
  const input = document.getElementById('lib-pages-total');
  if (!input) return;
  input.value = Math.max(1, (parseInt(input.value)||0)+delta);
  libSaveProgress();
}

function libToggleAddNote() {
  const form = document.getElementById('lib-add-note-form');
  if (!form) return;
  modalAddingNote = !modalAddingNote;
  form.style.display = modalAddingNote ? 'block' : 'none';
}

function libSetNoteType(type) {
  noteType = type;
  document.querySelectorAll('.lib-note-type-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase() === type);
  });
}

function libSaveNote() {
  const content = document.getElementById('lib-note-content')?.value.trim();
  if (!content) return;
  const notes = getNotes();
  notes.push({id: Date.now(), bookId: modalBookId, date: new Date().toISOString(), type: noteType, content});
  saveNotes(notes);
  libCloseModal();
  setTimeout(() => renderModal(modalBookId), 220);
}

function libRemoveActive(bookId) {
  saveActive(getActive().filter(a => a.bookId !== bookId));
  libCloseModal();
  renderLibrary();
}

function libCommitExpression(idx) {
  if (!_expressionBook) return;
  const opts = [
    `Write a one-page essence of ${_expressionBook.title}`,
    `Three actions to apply ${_expressionBook.title}`,
    `Teach ${_expressionBook.title} to one person this week`
  ];
  state.tasks.push({id: Date.now(), text: `[${_expressionBook.title}] ${opts[idx]}`, done: false});
  save();
  const overlay = document.getElementById('lib-expression-overlay');
  if (overlay) { overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 200); }
}

function libOpenDeck(deckId) { openSession(deckId); }

function libFlipCard() {
  if (sessionFlipped) return;
  sessionFlipped = true;
  const card = document.getElementById('lib-session-card');
  const front = document.getElementById('lib-session-front');
  const back = document.getElementById('lib-session-back');
  const hint = document.getElementById('lib-session-hint');
  const rate = document.getElementById('lib-session-rate');
  if (card) card.classList.add('revealed');
  if (front) { front.style.transition = 'opacity .15s ease'; front.style.opacity = '0'; }
  if (hint) hint.style.display = 'none';
  setTimeout(() => {
    if (front) front.style.display = 'none';
    if (back) back.classList.add('show');
    if (rate) rate.style.display = 'flex';
  }, 160);
}

function libRateCard(result) {
  const card = sessionCards[sessionIdx];
  updateCardReview(sessionDeckId, card.cardIdx, result);
  sessionResults.push(result);
  sessionIdx++;
  if (sessionIdx >= sessionCards.length) { showSessionComplete(); return; }
  sessionFlipped = false;
  renderCurrentCard();
}

function libCloseSession() {
  const overlay = document.getElementById('lib-session-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => { overlay.remove(); renderLibrary(); }, 200);
}

window.libSetMode = libSetMode;
window.libSetFilter = libSetFilter;
window.libOpenBook = libOpenBook;
window.libCloseModal = libCloseModal;
window.libBeginReading = libBeginReading;
window.libSaveProgress = libSaveProgress;
window.libAdjustPages = libAdjustPages;
window.libAdjustTotal = libAdjustTotal;
window.libToggleAddNote = libToggleAddNote;
window.libSetNoteType = libSetNoteType;
window.libSaveNote = libSaveNote;
window.libRemoveActive = libRemoveActive;
window.libCommitExpression = libCommitExpression;
window.libOpenDeck = libOpenDeck;
window.libFlipCard = libFlipCard;
window.libRateCard = libRateCard;
window.libCloseSession = libCloseSession;
