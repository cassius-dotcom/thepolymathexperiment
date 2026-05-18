import {renderCompass,renderFilters} from './constitution.js';
import {renderTasks,addTask,collapseAdd} from './tasks.js';
import {renderPillars} from './pillars.js';
import {renderToday} from './today.js';
import {renderVirtue} from './virtue.js';

document.addEventListener('DOMContentLoaded',()=>{
  renderToday();
  renderCompass();
  renderFilters();
  renderTasks();
  renderPillars();
  renderVirtue();
  document.getElementById('task-input').addEventListener('keydown',e=>{
    if(e.key==='Enter')addTask();
    if(e.key==='Escape')collapseAdd();
  });
});
