import {renderCompass,renderFilters} from './constitution.js';
import {renderTasks,addTask,collapseAdd} from './tasks.js';
import {renderPillars} from './pillars.js';
import {renderToday} from './today.js';
import {renderVirtue} from './virtue.js';
import {renderArcs} from './arcs.js';
import {renderObservations} from './observations.js';
import {renderMentor} from './mentor.js';
import {detectDrift,logDrift,renderDriftBanner,applyDriftDots} from './drift.js';

document.addEventListener('DOMContentLoaded',()=>{
  renderToday();
  renderCompass();
  renderFilters();
  renderTasks();
  renderPillars();
  renderVirtue();
  renderArcs();
  renderObservations();
  renderMentor();
  window.drifts=detectDrift();
  logDrift(window.drifts);
  renderDriftBanner();
  applyDriftDots();
  document.getElementById('task-input').addEventListener('keydown',e=>{
    if(e.key==='Enter')addTask();
    if(e.key==='Escape')collapseAdd();
  });
});
