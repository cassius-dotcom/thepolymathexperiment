import {renderCompass,renderConstitutionContent} from './constitution.js';
import {renderTasks,addTask,collapseAdd,updateOpsHero} from './tasks.js';
import {renderPillars} from './pillars.js';
import {renderToday} from './today.js';
import {renderVirtue} from './virtue.js';
import {renderArcs} from './arcs.js';
import {renderObservations} from './observations.js';
import {renderMentor} from './mentor.js';
import {renderLibrary} from './library.js';
import {renderSocial} from './social.js';
import {renderLegacy} from './legacy.js';
import {detectDrift,logDrift,renderDriftBanner,applyDriftDots} from './drift.js';

function safe(label, fn) {
  try { fn(); } catch(e) { console.error('[Cassius OS] ' + label + ' failed:', e); }
}

document.addEventListener('DOMContentLoaded', () => {
  safe('renderToday',             () => renderToday());
  safe('renderCompass',           () => renderCompass());
  safe('renderConstitutionContent',() => renderConstitutionContent());
  safe('renderTasks',             () => renderTasks());
  safe('updateOpsHero',           () => updateOpsHero());
  safe('renderPillars',           () => renderPillars());
  safe('renderVirtue',            () => renderVirtue());
  safe('renderArcs',              () => renderArcs());
  safe('renderObservations',      () => renderObservations());
  safe('renderMentor',            () => renderMentor());
  safe('renderLibrary',           () => renderLibrary());
  safe('renderSocial',            () => renderSocial());
  safe('renderLegacy',            () => renderLegacy());

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
});
