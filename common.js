// common.js (FINAL VERSION)
import { supabase } from './supabase.js';

console.log('[common.js] loaded');

const PUBLIC_PAGES = new Set([
  'login.html',
  'register.html',
  'verify-email.html',
  'privacy-policy.html',
  'terms.html',
  'contact.html',
  'refund.html'
]);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
let inactivityTimer = null;

export const appAuth = {
  user: null,
  profile: null,
  ready: false,
  callbacks: [],
  onReady(cb) {
    if (this.ready) {
      cb(this.user, this.profile);
    } else {
      this.callbacks.push(cb);
    }
  },
  set(user, profile) {
    this.user = user;
    this.profile = profile;
    this.ready = true;
    this.callbacks.forEach(fn => {
      try { fn(user, profile); } catch (e) { console.error(e); }
    });
    this.callbacks = [];
  }
};

window.appAuth = appAuth;

function updateUserInfo(user, profile) {
  if (!user) return;

  const uid = user.id;
  const shortUid = uid ? uid.substring(0, 10) + '...' : 'Unknown';
  const email = user.email || 'No email';
  const balance = profile?.balance ?? 0;
  const lockedBalance = profile?.locked_balance ?? 0;
  const isVIP = !!profile?.is_vip;

  // Sidebar
  const sidebarId = document.getElementById('sidebarId');
  if (sidebarId) {
    sidebarId.innerHTML = `<div class="sidebar-id">ID: ${shortUid}</div>`;
  }

  const sidebarVIP = document.getElementById('sidebarVIP');
  if (sidebarVIP) {
    sidebarVIP.textContent = isVIP ? 'VIP Member' : 'Basic Member';
  }

  // Profile page
  const profileId = document.getElementById('profileId');
  if (profileId) profileId.textContent = `ID: ${shortUid}`;

  const profileEmail = document.getElementById('profileEmail');
  if (profileEmail) profileEmail.textContent = email;

  const profileBalance = document.getElementById('profileBalance');
  if (profileBalance) profileBalance.textContent = `₹${balance.toFixed(2)}`;

  // Recharge page
  const rechargeBalance = document.getElementById('currentBalance');
  if (rechargeBalance) rechargeBalance.textContent = `₹${balance.toFixed(2)}`;

  // Withdrawal balance
  const withdrawBalance = document.getElementById('withdrawBalance');
  if (withdrawBalance) withdrawBalance.textContent = `₹${balance.toFixed(2)}`;

  // Refer page balance
  const currentBalanceText = document.getElementById('currentBalanceText');
  if (currentBalanceText) {
    currentBalanceText.textContent = `Your current balance is: ₹${balance.toFixed(2)}`;
  }
}

function startInactivityTimer() {
  stopInactivityTimer();
  inactivityTimer = setTimeout(async () => {
    alert('You were logged out due to inactivity.');
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  }, INACTIVITY_TIMEOUT_MS);
}

function stopInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

function setupActivityListeners() {
  const events = ['click', 'keydown', 'mousemove', 'touchstart'];
  const handler = () => startInactivityTimer();
  events.forEach(ev => {
    document.addEventListener(ev, handler, true);
  });
  startInactivityTimer();
}

function setupSidebar() {
  const menuBtn = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('closeBtn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (menuBtn) {
    menuBtn.addEventListener('click', () => document.body.classList.add('sidebar-open'));
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
  }

  const settingsBtn = document.getElementById('settingsToggleBtn');
  const submenu = document.getElementById('settingsSubmenu');

  if (settingsBtn && submenu) {
    settingsBtn.addEventListener('click', () => {
      settingsBtn.classList.toggle('active');
      submenu.classList.toggle('active');
    });
  }
}

async function handleLogoutClick(e) {
  if (e) e.preventDefault();
  try {
    await supabase.auth.signOut();
    stopInactivityTimer();
    window.location.href = 'login.html';
  } catch (err) {
    console.error('Logout error', err);
    alert('Logout failed. Please try again.');
  }
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogoutClick);
  }
  window.logout = handleLogoutClick;
}

async function handleUserChange(user) {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const isPublic = PUBLIC_PAGES.has(page);

  if (!user) {
    appAuth.set(null, null);
    if (!isPublic) {
      window.location.href = 'login.html';
    }
    return;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error loading profile', error);
  }

  updateUserInfo(user, profile || {});
  appAuth.set(user, profile || {});
}

async function initCommon() {
  setupSidebar();
  setupLogoutButton();
  setupActivityListeners();

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('auth.getUser error', error);
  }
  await handleUserChange(data?.user ?? null);

  supabase.auth.onAuthStateChange((_event, session) => {
    handleUserChange(session?.user ?? null);
  });
}

document.addEventListener('DOMContentLoaded', initCommon);
