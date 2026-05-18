import {renderCompass,renderFilters} from './constitution.js';
import {renderTasks,addTask,collapseAdd} from './tasks.js';
import {renderPillars} from './pillars.js';
import {renderToday} from './today.js';
import {renderVirtue} from './virtue.js';
import {renderArcs} from './arcs.js';
import {renderMentor} from './mentor.js';

document.addEventListener('DOMContentLoaded',()=>{
  renderToday();
  renderCompass();
  renderFilters();
  renderTasks();
  renderPillars();
  renderVirtue();
  renderArcs();
  renderMentor();
  document.getElementById('task-input').addEventListener('keydown',e=>{
    if(e.key==='Enter')addTask();
    if(e.key==='Escape')collapseAdd();
  });
});
