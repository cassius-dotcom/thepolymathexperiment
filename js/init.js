import {renderCompass,renderFilters} from './constitution.js';
import {renderTasks,addTask,collapseAdd} from './tasks.js';
import {renderSkills,renderWeekStrip,renderBarChart,hideScrub} from './performance.js';

document.addEventListener('DOMContentLoaded',()=>{
  renderCompass();
  renderFilters();
  renderTasks();
  renderSkills();
  renderWeekStrip();
  renderBarChart();
  document.getElementById('task-input').addEventListener('keydown',e=>{
    if(e.key==='Enter')addTask();
    if(e.key==='Escape')collapseAdd();
  });
  document.addEventListener('touchstart',e=>{
    if(!e.target.closest('#bar-chart'))hideScrub();
  },{passive:true});
});
