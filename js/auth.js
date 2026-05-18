import { supabase } from './supabase.js';

export function renderAuthOverlay() {
  if (document.getElementById('auth-overlay')) return;
  const el = document.createElement('div');
  el.id = 'auth-overlay';
  el.innerHTML = `
    <div class="auth-card">
      <div class="auth-logo">Cassius OS</div>
      <div class="auth-tagline">Build the man. Run the system.</div>
      <div class="auth-tabs">
        <button class="auth-tab active" id="auth-tab-login" onclick="authShowLogin()">Sign in</button>
        <button class="auth-tab" id="auth-tab-signup" onclick="authShowSignup()">Create account</button>
      </div>
      <div id="auth-login-form">
        <input class="auth-input" id="auth-email" type="email" placeholder="Email" autocomplete="email">
        <input class="auth-input" id="auth-password" type="password" placeholder="Password" autocomplete="current-password">
        <div class="auth-error" id="auth-error"></div>
        <button class="auth-submit" id="auth-submit-btn" onclick="authLogin()">Enter</button>
      </div>
      <div id="auth-signup-form" style="display:none">
        <input class="auth-input" id="auth-signup-email" type="email" placeholder="Email" autocomplete="email">
        <input class="auth-input" id="auth-signup-password" type="password" placeholder="Password (min 6 chars)" autocomplete="new-password">
        <div class="auth-error" id="auth-signup-error"></div>
        <button class="auth-submit" id="auth-signup-btn" onclick="authSignup()">Create account</button>
      </div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => document.getElementById('auth-email')?.focus(), 300);

  ['auth-email','auth-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') authLogin(); });
  });
  ['auth-signup-email','auth-signup-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') authSignup(); });
  });
}

export function removeAuthOverlay() {
  const el = document.getElementById('auth-overlay');
  if (!el) return;
  el.classList.remove('visible');
  setTimeout(() => el.remove(), 300);
}

export function renderLogoutBtn() {
  if (document.getElementById('logout-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'logout-btn';
  btn.className = 'logout-btn';
  btn.textContent = 'Sign out';
  btn.onclick = () => supabase.auth.signOut().then(() => window.location.reload());
  document.body.appendChild(btn);
}

async function authLogin() {
  const email = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  const errEl = document.getElementById('auth-error');
  const btn = document.getElementById('auth-submit-btn');
  if (!email || !password) { if (errEl) errEl.textContent = 'Enter email and password.'; return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Entering…'; }
  if (errEl) errEl.textContent = '';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (errEl) errEl.textContent = error.message;
    if (btn) { btn.disabled = false; btn.textContent = 'Enter'; }
  }
}

async function authSignup() {
  const email = document.getElementById('auth-signup-email')?.value.trim();
  const password = document.getElementById('auth-signup-password')?.value;
  const errEl = document.getElementById('auth-signup-error');
  const btn = document.getElementById('auth-signup-btn');
  if (!email || !password) { if (errEl) errEl.textContent = 'Enter email and password.'; return; }
  if (password.length < 6) { if (errEl) errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
  if (errEl) errEl.textContent = '';
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (errEl) errEl.textContent = error.message;
    if (btn) { btn.disabled = false; btn.textContent = 'Create account'; }
  } else {
    if (errEl) { errEl.style.color = 'var(--gem-b)'; errEl.textContent = 'Check your email to confirm your account.'; }
    if (btn) { btn.disabled = true; btn.textContent = 'Check your email'; }
  }
}

function authShowLogin() {
  document.getElementById('auth-login-form').style.display = '';
  document.getElementById('auth-signup-form').style.display = 'none';
  document.getElementById('auth-tab-login').classList.add('active');
  document.getElementById('auth-tab-signup').classList.remove('active');
  setTimeout(() => document.getElementById('auth-email')?.focus(), 50);
}

function authShowSignup() {
  document.getElementById('auth-login-form').style.display = 'none';
  document.getElementById('auth-signup-form').style.display = '';
  document.getElementById('auth-tab-login').classList.remove('active');
  document.getElementById('auth-tab-signup').classList.add('active');
  setTimeout(() => document.getElementById('auth-signup-email')?.focus(), 50);
}

window.authLogin = authLogin;
window.authSignup = authSignup;
window.authShowLogin = authShowLogin;
window.authShowSignup = authShowSignup;
