import {animateRollups} from './performance.js';
import {updateOpsHero} from './tasks.js';
import {animatePillarsChart} from './pillars.js';
import {renderVirtue} from './virtue.js';

export let isTransitioning=false;

export function go(id){
  if(isTransitioning)return;
  const current=document.querySelector('.view.active');
  const target=document.getElementById('view-'+id);
  if(!target||current===target)return;
  isTransitioning=true;

  document.querySelectorAll('.n-tab,.m-tab').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.n-tab,.m-tab').forEach(b=>{
    if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes(id))b.classList.add('active');
  });

  if(current){
    current.classList.add('exiting');
    setTimeout(()=>{
      current.classList.remove('active','exiting');
      target.classList.add('active');
      if(id==='pillars') animatePillarsChart();
      if(id==='operations'){
        updateOpsHero();
        animateRollups();
        renderVirtue();
      }
      isTransitioning=false;
    },260);
  }else{
    target.classList.add('active');
    isTransitioning=false;
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

window.addEventListener('scroll',()=>{
  const nav=document.querySelector('.nav');
  if(!nav)return;
  if(window.scrollY>20)nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
});

window.go=go;
