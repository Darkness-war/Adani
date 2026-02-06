// assets/js/auth/login.js - SIMPLIFIED WORKING VERSION
import { sessionManager, dbService, utils, supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Login] Initializing...');
  
  // Initialize theme
  initTheme();
  
  // Initialize form
  initForm();
  
  // Check if already logged in
  checkSession();
});

// Theme Management
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  const savedTheme = localStorage.getItem('uzumaki-theme') || 'light';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const initialTheme = savedTheme === 'auto' ? (prefersDark ? 'dark' : 'light') : savedTheme;
  document.documentElement.setAttribute('data-theme', initialTheme);
  
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('uzumaki-theme', newTheme);
    
    const icon = themeToggle.querySelector('i');
    if (icon) {
      icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  });
}

// Form Initialization
function initForm() {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');
  
  if (!loginForm || !loginBtn) {
    console.error('[Login] Form elements not found');
    return;
  }
  
  // Password visibility toggle
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      const icon = togglePassword.querySelector('i');
      if (icon) {
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
      }
    });
  }
  
  // Form submission
  loginForm.addEventListener('submit', handleLogin);
  
  // Social login buttons
  document.getElementById('googleLogin')?.addEventListener('click', () => {
    utils.showToast('Google login coming soon!', 'info');
  });
  
  document.getElementById('githubLogin')?.addEventListener('click', () => {
    utils.showToast('GitHub login coming soon!', 'info');
  });
  
  // Demo account buttons
  document.querySelectorAll('.btn-demo-use').forEach(button => {
    button.addEventListener('click', function() {
      const card = this.closest('.demo-card');
      const email = card.dataset.email;
      const password = card.dataset.password;
      
      if (email && password) {
        document.getElementById('email').value = email;
        document.getElementById('password').value = password;
        utils.showToast('Demo credentials filled! Click Sign In to continue.', 'success');
      }
    });
  });
}

// Login Handler
async function handleLogin(event) {
  event.preventDefault();
  
  const loginBtn = document.getElementById('loginBtn');
  const email = document.getElementById('email')?.value.trim() || '';
  const password = document.getElementById('password')?.value || '';
  const rememberMe = document.getElementById('rememberMe')?.checked || false;
  
  // Basic validation
  if (!email || !utils.validateEmail(email)) {
    utils.showToast('Please enter a valid email address', 'error');
    return;
  }
  
  if (!password || password.length < 6) {
    utils.showToast('Password must be at least 6 characters', 'error');
    return;
  }
  
  try {
    // Show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
    
    console.log('[Login] Attempting login for:', email);
    
    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('[Login] Auth error:', error);
      throw error;
    }
    
    if (!data.user) {
      throw new Error('Login failed - no user data returned');
    }
    
    console.log('[Login] Success for user:', data.user.id);
    
    // Check/create user profile
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const referralCode = utils.generateReferralCode(data.user.id);
        
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
            referral_code: referralCode,
            account_tier: 'standard',
            balance: 0,
            created_at: new Date().toISOString()
          });
      }
    } catch (profileError) {
      console.warn('[Login] Profile check error:', profileError);
      // Continue even if profile creation fails
    }
    
    // Success
    loginBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
    loginBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    
    utils.showToast('Login successful! Redirecting...', 'success');
    
    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    }
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '../../user/dashboard.html';
    }, 1500);
    
  } catch (error) {
    console.error('[Login] Error:', error);
    
    let message = 'Login failed. Please check your credentials.';
    
    if (error.message.includes('Invalid login credentials')) {
      message = 'Invalid email or password.';
    } else if (error.message.includes('Email not confirmed')) {
      message = 'Please verify your email first.';
    } else if (error.message.includes('rate limit')) {
      message = 'Too many attempts. Please try again in 15 minutes.';
    } else if (error.message.includes('network')) {
      message = 'Network error. Please check your connection.';
    }
    
    utils.showToast(message, 'error');
    
    // Reset button
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
  }
}

async function checkSession() {
  try {
    const { user } = await sessionManager.getCurrentUser();
    if (user) {
      utils.showToast('Welcome back! Redirecting to dashboard...', 'info');
      setTimeout(() => {
        window.location.href = '../../user/dashboard.html';
      }, 1500);
    }
  } catch (error) {
    // No session, continue with login
  }
}

// Add CSS for demo cards
if (!document.getElementById('login-demo-styles')) {
  const style = document.createElement('style');
  style.id = 'login-demo-styles';
  style.textContent = `
    .demo-card {
      transition: all 0.3s ease;
    }
    
    .demo-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }
    
    .btn-demo-use {
      transition: all 0.3s ease;
    }
    
    .btn-demo-use:hover {
      background: var(--primary-dark) !important;
    }
  `;
  document.head.appendChild(style);
}

console.log('[Login] Initialized successfully');
