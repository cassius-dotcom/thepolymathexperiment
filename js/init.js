import {renderCompass, renderConstitutionContent} from './constitution.js';
import {renderTasks, addTask, collapseAdd, updateOpsHero} from './tasks.js';
import {renderPillars} from './pillars.js';
import {renderToday} from './today.js';
import {renderVirtue} from './virtue.js';
import {renderArcs} from './arcs.js';
import {renderObservations} from './observations.js';
import {renderMentor} from './mentor.js';
import {renderLibrary} from './library.js';
import {renderSocial} from './social.js';
import {renderLegacy} from './legacy.js';
import {detectDrift, logDrift, renderDriftBanner, applyDriftDots} from './drift.js';
import {supabase} from './supabase.js';
import {loadAll, loadDeferred} from './db.js';
import {renderAuthOverlay, removeAuthOverlay, renderLogoutBtn} from './auth.js';

function safe(label, fn) {
  try { fn(); } catch(e) { console.error('[Cassius OS] ' + label + ' failed:', e); }
}

function dismissLoading() {
  const el = document.getElementById('app-loading');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => el.remove(), 300);
}

function initApp() {
  safe('renderToday',               () => renderToday());
  safe('renderCompass',             () => renderCompass());
  safe('renderConstitutionContent', () => renderConstitutionContent());
  safe('renderTasks',               () => renderTasks());
  safe('updateOpsHero',             () => updateOpsHero());
  safe('renderPillars',             () => renderPillars());
  safe('renderVirtue',              () => renderVirtue());
  safe('renderArcs',                () => renderArcs());
  safe('renderObservations',        () => renderObservations());
  safe('renderMentor',              () => renderMentor());
  safe('renderLibrary',             () => renderLibrary());
  safe('renderSocial',              () => renderSocial());
  safe('renderLegacy',              () => renderLegacy());
  safe('drift', () => {
    window.drifts = detectDrift();
    logDrift(window.drifts);
    renderDriftBanner();
    applyDriftDots();
  });

  const taskInput = document.getElementById('task-input');
  if (taskInput) {
    taskInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') addTask();
      if (e.key === 'Escape') collapseAdd();
    });
  }

  renderLogoutBtn();
}

document.addEventListener('DOMContentLoaded', async () => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      removeAuthOverlay();
      await loadAll(session.user.id);
      initApp();
      dismissLoading();
      loadDeferred(session.user.id);
    }
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    renderAuthOverlay();
    return;
  }

  await loadAll(session.user.id);
  initApp();
  dismissLoading();
  loadDeferred(session.user.id);
});
