// assets/js/auth/signup.js - SIMPLIFIED WORKING VERSION
import { sessionManager, dbService, utils, supabase } from '../supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Signup] Initializing...');
  
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
  const signupForm = document.getElementById('signupForm');
  const signupBtn = document.getElementById('signupBtn');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');
  const togglePassword = document.getElementById('togglePassword');
  const toggleConfirm = document.getElementById('toggleConfirmPassword');
  
  if (!signupForm || !signupBtn) {
    console.error('[Signup] Form elements not found');
    return;
  }
  
  // Password visibility toggle
  if (togglePassword) {
    togglePassword.addEventListener('click', () => togglePasswordVisibility(passwordInput, togglePassword));
  }
  
  if (toggleConfirm) {
    toggleConfirm.addEventListener('click', () => togglePasswordVisibility(confirmInput, toggleConfirm));
  }
  
  // Real-time password validation
  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      validatePasswordStrength(e.target.value);
      checkPasswordMatch();
    });
  }
  
  if (confirmInput) {
    confirmInput.addEventListener('input', checkPasswordMatch);
  }
  
  // Form submission
  signupForm.addEventListener('submit', handleSignup);
  
  // Social signup buttons
  document.getElementById('googleSignup')?.addEventListener('click', () => {
    utils.showToast('Google signup coming soon!', 'info');
  });
  
  document.getElementById('githubSignup')?.addEventListener('click', () => {
    utils.showToast('GitHub signup coming soon!', 'info');
  });
}

function togglePasswordVisibility(input, button) {
  const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
  input.setAttribute('type', type);
  
  const icon = button.querySelector('i');
  if (icon) {
    icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
  }
}

function validatePasswordStrength(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*]/.test(password)
  };
  
  Object.keys(requirements).forEach(req => {
    const element = document.getElementById(`req-${req}`);
    if (element) {
      const icon = element.querySelector('i');
      if (requirements[req]) {
        element.classList.add('valid');
        if (icon) {
          icon.className = 'fas fa-check-circle';
          icon.style.color = 'var(--success)';
        }
      } else {
        element.classList.remove('valid');
        if (icon) {
          icon.className = 'fas fa-circle';
          icon.style.color = 'var(--gray-400)';
        }
      }
    }
  });
  
  // Update strength bars
  const validCount = Object.values(requirements).filter(Boolean).length;
  const strengthBars = document.querySelectorAll('.strength-bar');
  const strengthText = document.getElementById('strengthText');
  
  if (strengthBars.length) {
    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#3b82f6', '#10b981'];
    
    strengthBars.forEach((bar, index) => {
      if (index < validCount) {
        bar.style.background = colors[validCount - 1] || '#ef4444';
      } else {
        bar.style.background = 'var(--gray-200)';
      }
    });
    
    if (strengthText) {
      strengthText.textContent = strengthLevels[validCount - 1] || 'Very Weak';
      strengthText.style.color = colors[validCount - 1] || '#ef4444';
    }
  }
  
  return validCount >= 4;
}

function checkPasswordMatch() {
  const password = document.getElementById('password')?.value || '';
  const confirmPassword = document.getElementById('confirmPassword')?.value || '';
  const confirmInput = document.getElementById('confirmPassword');
  
  if (!confirmInput) return null;
  
  if (!confirmPassword) {
    confirmInput.style.borderColor = '';
    confirmInput.style.boxShadow = '';
    return null;
  }
  
  if (password === confirmPassword) {
    confirmInput.style.borderColor = 'var(--success)';
    confirmInput.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.1)';
    return true;
  } else {
    confirmInput.style.borderColor = 'var(--danger)';
    confirmInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.1)';
    return false;
  }
}

// Main Signup Handler
async function handleSignup(event) {
  event.preventDefault();
  
  const signupBtn = document.getElementById('signupBtn');
  const firstName = document.getElementById('firstName')?.value.trim() || '';
  const lastName = document.getElementById('lastName')?.value.trim() || '';
  const email = document.getElementById('email')?.value.trim() || '';
  const password = document.getElementById('password')?.value || '';
  const confirmPassword = document.getElementById('confirmPassword')?.value || '';
  const terms = document.getElementById('terms')?.checked || false;
  const newsletter = document.getElementById('newsletter')?.checked || false;
  const referralCode = document.getElementById('referralCode')?.value.trim().toUpperCase() || '';
  
  // Validation
  if (!validateForm(firstName, lastName, email, password, confirmPassword, terms)) {
    return;
  }
  
  try {
    // Show loading
    signupBtn.disabled = true;
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    
    console.log('[Signup] Creating account for:', email);
    
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          newsletter_subscribed: newsletter
        }
      }
    });
    
    if (authError) {
      console.error('[Signup] Auth error:', authError);
      throw authError;
    }
    
    if (!authData.user) {
      throw new Error('User creation failed');
    }
    
    console.log('[Signup] User created:', authData.user.id);
    
    // Create user profile
    const referralCode = utils.generateReferralCode(authData.user.id);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        referral_code: referralCode,
        referral_code_used: referralCode || null,
        newsletter_subscribed: newsletter,
        account_tier: 'standard',
        verified: false,
        balance: 0,
        total_invested: 0,
        total_withdrawn: 0,
        created_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.error('[Signup] Profile creation error:', profileError);
      // Don't throw error - user was created, just profile failed
    }
    
    // Success
    signupBtn.innerHTML = '<i class="fas fa-check"></i> Account Created!';
    signupBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    
    utils.showToast('Account created successfully! Check your email for verification.', 'success', 5000);
    
    // Update progress indicator
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach(step => step.classList.add('active'));
    
    // Redirect to verification page after 3 seconds
    setTimeout(() => {
      window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`;
    }, 3000);
    
  } catch (error) {
    console.error('[Signup] Error:', error);
    
    let message = 'Signup failed. Please try again.';
    
    if (error.message.includes('User already registered')) {
      message = 'This email is already registered. Please sign in instead.';
    } else if (error.message.includes('Password')) {
      message = 'Password is too weak. Use at least 8 characters with mix of letters, numbers, and symbols.';
    } else if (error.message.includes('rate limit')) {
      message = 'Too many attempts. Please try again in a few minutes.';
    } else if (error.message.includes('network')) {
      message = 'Network error. Please check your connection.';
    }
    
    utils.showToast(message, 'error');
    
    // Reset button
    signupBtn.disabled = false;
    signupBtn.innerHTML = '<i class="fas fa-user-plus"></i><span>Create Account</span>';
  }
}

function validateForm(firstName, lastName, email, password, confirmPassword, terms) {
  // Clear previous errors
  clearErrors();
  
  let isValid = true;
  
  // First name
  if (!firstName || firstName.length < 2) {
    showError('firstName', 'First name must be at least 2 characters');
    isValid = false;
  }
  
  // Last name
  if (!lastName || lastName.length < 2) {
    showError('lastName', 'Last name must be at least 2 characters');
    isValid = false;
  }
  
  // Email
  if (!email) {
    showError('email', 'Email is required');
    isValid = false;
  } else if (!utils.validateEmail(email)) {
    showError('email', 'Please enter a valid email address');
    isValid = false;
  }
  
  // Password
  if (!password) {
    showError('password', 'Password is required');
    isValid = false;
  } else if (!validatePasswordStrength(password)) {
    showError('password', 'Password does not meet requirements');
    isValid = false;
  }
  
  // Confirm password
  if (!confirmPassword) {
    showError('confirmPassword', 'Please confirm your password');
    isValid = false;
  } else if (password !== confirmPassword) {
    showError('confirmPassword', 'Passwords do not match');
    isValid = false;
  }
  
  // Terms
  if (!terms) {
    utils.showToast('You must agree to the Terms of Service', 'error');
    isValid = false;
  }
  
  return isValid;
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.remove());
  document.querySelectorAll('.form-input').forEach(input => {
    input.style.borderColor = '';
    input.style.boxShadow = '';
  });
}

function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  
  const error = document.createElement('div');
  error.className = 'field-error';
  error.textContent = message;
  error.style.cssText = `
    color: var(--danger);
    font-size: 0.8rem;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  `;
  
  const parent = field.parentElement;
  if (parent) {
    parent.appendChild(error);
  }
  
  field.style.borderColor = 'var(--danger)';
  field.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.1)';
}

async function checkSession() {
  try {
    const { user } = await sessionManager.getCurrentUser();
    if (user) {
      utils.showToast('You are already logged in. Redirecting to dashboard...', 'info');
      setTimeout(() => {
        window.location.href = '../../user/dashboard.html';
      }, 1500);
    }
  } catch (error) {
    // No session, continue with signup
  }
}

// Add CSS for field errors
if (!document.getElementById('signup-error-styles')) {
  const style = document.createElement('style');
  style.id = 'signup-error-styles';
  style.textContent = `
    .field-error {
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .requirement.valid {
      color: var(--success);
    }
    
    .requirement.valid i {
      color: var(--success) !important;
    }
  `;
  document.head.appendChild(style);
}

console.log('[Signup] Initialized successfully');
