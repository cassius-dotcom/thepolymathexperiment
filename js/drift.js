function safeJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

/* ── HELPERS ── */
function getDayChecklist(daysAgo) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  const key = `cos_daily_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const raw = localStorage.getItem(key);
  return safeJson(raw, null);
}

function consecutiveUnchecked(itemIndex) {
  let count = 0;
  for (let i = 1; i <= 14; i++) {
    const checks = getDayChecklist(i);
    if (!checks) break;
    if (checks[itemIndex] !== true) count++;
    else break;
  }
  return count;
}

function isDismissed(type) {
  const raw = localStorage.getItem('cos_dismissed_drifts');
  if (!raw) return false;
  const d = safeJson(raw, []).find(x => x.type === type);
  if (!d) return false;
  return (new Date() - new Date(d.date)) < 1000*60*60*24;
}

function dismissDrift(type) {
  const raw = localStorage.getItem('cos_dismissed_drifts');
  const arr = safeJson(raw, []);
  const idx = arr.findIndex(x => x.type === type);
  const entry = {type, date: new Date().toISOString()};
  if (idx > -1) arr[idx] = entry; else arr.push(entry);
  localStorage.setItem('cos_dismissed_drifts', JSON.stringify(arr));
}

/* ── DETECTION ── */
export function detectDrift() {
  const alerts = [];

  if (!isDismissed('training')) {
    const days = consecutiveUnchecked(0);
    if (days >= 3) alerts.push({type:'training', text:`Your body has been neglected for ${days} days. Train today.`, severity:1, page:'today'});
  }

  if (!isDismissed('night_audit')) {
    if (consecutiveUnchecked(4) >= 3) alerts.push({type:'night_audit', text:'You are not closing your days. The unexamined day repeats.', severity:2, page:'today'});
  }

  if (!isDismissed('consumption')) {
    if (consecutiveUnchecked(1) >= 3) alerts.push({type:'consumption', text:'Consumption is exceeding creation. Reverse the ratio.', severity:3, page:'today'});
  }

  if (!isDismissed('virtue')) {
    const vRaw = localStorage.getItem('cos_virtue');
    const vData = safeJson(vRaw, null);
    if (vData) {
      const {startDate} = vData;
      const days = Math.floor((new Date() - new Date(startDate+'T00:00:00')) / (1000*60*60*24));
      if (days >= 14) alerts.push({type:'virtue', text:'Your virtue cycle has expired. Rotate.', severity:4, page:'operations'});
    }
  }

  if (!isDismissed('tasks')) {
    const tasks = safeJson(localStorage.getItem('cos3_tasks'), []);
    const open = tasks.filter(t => !t.done && t.id > 100000000000);
    if (open.length >= 5) {
      const ageMs = Date.now() - open.reduce((min, t) => t.id < min ? t.id : min, Infinity);
      if (ageMs >= 1000*60*60*24*7) alerts.push({type:'tasks', text:`You have ${open.length} open tasks. Complete or remove.`, severity:5, page:'operations'});
    }
  }

  if (!isDismissed('observations')) {
    const obs = safeJson(localStorage.getItem('cos_observations'), []);
    if (obs.length > 0) {
      const daysSince = Math.floor((new Date() - new Date(obs[obs.length-1].date)) / (1000*60*60*24));
      if (daysSince >= 4) alerts.push({type:'observations', text:'You have stopped observing. Train your eye again.', severity:6, page:'operations'});
    }
  }

  if (!isDismissed('mentor')) {
    const last = localStorage.getItem('cos_mentor_last_open');
    if (last) {
      const days = Math.floor((new Date() - new Date(last)) / (1000*60*60*24));
      if (days >= 7) alerts.push({type:'mentor', text:'You are avoiding counsel. Open the Mentor.', severity:7, page:'mentor'});
    }
  }

  alerts.sort((a, b) => a.severity - b.severity);
  return alerts;
}

/* ── DAILY LOG ── */
export function logDrift(drifts) {
  const today = new Date().toISOString().split('T')[0];
  const raw = localStorage.getItem('cos_drift_log');
  const log = safeJson(raw, {});
  log[today] = drifts.map(d => d.type);
  const keys = Object.keys(log).sort().slice(-14);
  const pruned = Object.fromEntries(keys.map(k => [k, log[k]]));
  localStorage.setItem('cos_drift_log', JSON.stringify(pruned));
}

/* ── BANNER ── */
export function renderDriftBanner() {
  const banner = document.getElementById('drift-banner');
  if (!banner) return;
  const drifts = window.drifts || [];
  if (!drifts.length) { banner.style.display = 'none'; return; }
  const top = drifts[0];
  banner.style.display = '';
  banner.innerHTML = `
    <div class="drift-pulse"></div>
    <span class="drift-text">${top.text}</span>
    <button class="drift-dismiss" onclick="dismissAndRefresh('${top.type}')">Dismiss</button>`;
}

/* ── NAV DOTS ── */
export function applyDriftDots() {
  document.querySelectorAll('.drift-nav-dot').forEach(d => d.remove());
  const drifts = window.drifts || [];
  if (!drifts.length) return;
  const pages = new Set(drifts.map(d => d.page).filter(Boolean));
  pages.forEach(page => {
    document.querySelectorAll('.n-tab,.m-tab').forEach(tab => {
      const oc = tab.getAttribute('onclick') || '';
      if (oc.includes(`'${page}'`) && !tab.querySelector('.drift-nav-dot')) {
        const dot = document.createElement('span');
        dot.className = 'drift-nav-dot';
        tab.appendChild(dot);
      }
    });
  });
}

/* ── DISMISS ── */
export function dismissAndRefresh(type) {
  dismissDrift(type);
  window.drifts = detectDrift();
  renderDriftBanner();
  applyDriftDots();
}

window.dismissAndRefresh = dismissAndRefresh;
