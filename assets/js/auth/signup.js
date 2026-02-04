// signup.js - Modern Signup with Enhanced Features
import { sessionManager, dbService, utils } from '../core/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    initDarkMode();
    initForm();
    initPasswordValidation();
    initSocialSignup();
    checkExistingSession();
});

// Dark Theme Management
function initDarkMode() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Check for saved theme or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon('dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon('light');
    }
    
    // Toggle theme on button click
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Update theme
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} theme activated`, 'info');
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        icon.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            icon.style.transform = 'rotate(0deg)';
        }, 300);
    }
}

// Password Validation
function initPasswordValidation() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    
    // Password visibility toggles
    togglePassword?.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.innerHTML = type === 'password' ? 
            '<i class="fas fa-eye"></i>' : 
            '<i class="fas fa-eye-slash"></i>';
    });
    
    toggleConfirmPassword?.addEventListener('click', () => {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        toggleConfirmPassword.innerHTML = type === 'password' ? 
            '<i class="fas fa-eye"></i>' : 
            '<i class="fas fa-eye-slash"></i>';
    });
    
    // Real-time password strength validation
    passwordInput?.addEventListener('input', (e) => {
        validatePassword(e.target.value);
        checkPasswordMatch();
    });
    
    confirmPasswordInput?.addEventListener('input', checkPasswordMatch);
}

function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*]/.test(password)
    };
    
    // Update requirement indicators
    Object.keys(requirements).forEach(req => {
        const element = document.getElementById(`req-${req}`);
        if (element) {
            if (requirements[req]) {
                element.classList.add('valid');
                element.querySelector('i').className = 'fas fa-check-circle';
                element.querySelector('i').style.color = 'var(--success)';
            } else {
                element.classList.remove('valid');
                element.querySelector('i').className = 'fas fa-circle';
                element.querySelector('i').style.color = 'var(--gray-400)';
            }
        }
    });
    
    // Update strength bar
    const validCount = Object.values(requirements).filter(Boolean).length;
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    if (strengthBar && strengthText) {
        const percentage = (validCount / 5) * 100;
        strengthBar.style.width = `${percentage}%`;
        
        // Update colors and text
        if (validCount <= 2) {
            strengthBar.style.background = 'var(--danger)';
            strengthText.textContent = 'Weak password';
            strengthText.style.color = 'var(--danger)';
        } else if (validCount <= 3) {
            strengthBar.style.background = 'var(--warning)';
            strengthText.textContent = 'Medium strength';
            strengthText.style.color = 'var(--warning)';
        } else if (validCount <= 4) {
            strengthBar.style.background = 'var(--primary)';
            strengthText.textContent = 'Strong password';
            strengthText.style.color = 'var(--primary)';
        } else {
            strengthBar.style.background = 'var(--success)';
            strengthText.textContent = 'Very strong!';
            strengthText.style.color = 'var(--success)';
        }
    }
    
    return validCount >= 4; // Minimum 4 requirements met
}

function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = 'var(--danger)';
        confirmInput.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.1)';
        return false;
    } else if (confirmPassword) {
        confirmInput.style.borderColor = 'var(--success)';
        confirmInput.style.boxShadow = '0 0 0 3px rgba(46, 204, 113, 0.1)';
        return true;
    } else {
        confirmInput.style.borderColor = '';
        confirmInput.style.boxShadow = '';
        return null;
    }
}

// Form Management
function initForm() {
    const signupForm = document.getElementById('signupForm');
    signupForm?.addEventListener('submit', handleSignup);
}

async function handleSignup(e) {
    e.preventDefault();
    
    const signupBtn = document.getElementById('signupBtn');
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    const newsletter = document.getElementById('newsletter').checked;
    const twoFactor = document.getElementById('twoFactor').checked;
    
    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!utils.validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        document.getElementById('email').focus();
        return;
    }
    
    if (!validatePassword(password)) {
        showToast('Password does not meet requirements', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        document.getElementById('confirmPassword').focus();
        return;
    }
    
    if (!terms) {
        showToast('You must agree to the Terms of Service', 'error');
        return;
    }
    
    try {
        // Show loading state
        setLoadingState(signupBtn, true);
        
        // Sign up with Supabase
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`,
                    newsletter_subscribed: newsletter,
                    two_factor_enabled: twoFactor,
                    phone: document.getElementById('phone').value.trim() || null
                },
                emailRedirectTo: `${window.location.origin}/pages/auth/login.html`
            }
        });
        
        if (error) throw error;
        
        // Create user profile
        const referralCode = utils.generateReferralCode(data.user.id);
        
        await supabase.from('profiles').insert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            email: email,
            referral_code: referralCode,
            newsletter_subscribed: newsletter,
            two_factor_enabled: twoFactor,
            created_at: new Date().toISOString(),
            settings: {
                theme: localStorage.getItem('theme') || 'light',
                notifications: true
            }
        });
        
        // Create signup transaction
        await dbService.createTransaction({
            user_id: data.user.id,
            type: 'system',
            amount: 0,
            status: 'completed',
            details: 'User signed up',
            metadata: {
                source: 'web_signup',
                newsletter: newsletter,
                two_factor: twoFactor
            },
            created_at: new Date().toISOString()
        });
        
        // Success animation
        signupBtn.innerHTML = '<i class="fas fa-check"></i> Account Created!';
        signupBtn.style.background = 'linear-gradient(135deg, var(--success), #2ecc71)';
        
        // Show success message
        showToast('Account created successfully! Please check your email to verify your account.', 'success');
        
        // Update progress steps
        updateProgressSteps(2);
        
        // Auto-redirect after 5 seconds
        setTimeout(() => {
            window.location.href = '../../pages/auth/login.html';
        }, 5000);
        
    } catch (error) {
        console.error('Signup error:', error);
        
        let message = 'Signup failed. Please try again.';
        
        if (error.message.includes('already registered')) {
            message = 'Email already registered. Please sign in instead.';
        } else if (error.message.includes('weak password')) {
            message = 'Password is too weak. Please use a stronger password.';
        } else if (error.message.includes('invalid email')) {
            message = 'Please enter a valid email address.';
        }
        
        showToast(message, 'error');
        setLoadingState(signupBtn, false);
        
        // Reset button text
        signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        signupBtn.style.background = '';
    }
}

function updateProgressSteps(step) {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((s, index) => {
        if (index < step) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
}

// Social Signup
function initSocialSignup() {
    document.getElementById('googleSignup')?.addEventListener('click', () => 
        handleSocialSignup('google'));
    document.getElementById('githubSignup')?.addEventListener('click', () => 
        handleSocialSignup('github'));
}

async function handleSocialSignup(provider) {
    try {
        showToast(`Signing up with ${provider}...`, 'info');
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${window.location.origin}/pages/user/dashboard.html`
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        console.error(`${provider} signup error:`, error);
        showToast(`${provider} signup failed. Please try again.`, 'error');
    }
}

// Loading state management
function setLoadingState(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Toast notification system
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}"></i>
        <span>${message}</span>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 5 seconds
    const removeTimeout = setTimeout(() => {
        toast.remove();
    }, 5000);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(removeTimeout);
        toast.remove();
    });
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    return icons[type] || 'fa-info-circle';
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Session check
async function checkExistingSession() {
    try {
        const { user } = await sessionManager.getCurrentUser();
        if (user) {
            showToast('You are already signed in. Redirecting...', 'info');
            setTimeout(() => {
                window.location.href = '../../user/dashboard.html';
            }, 1500);
        }
    } catch (error) {
        // No active session, continue with signup
    }
}

// Input validation enhancement
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('blur', function() {
        if (this.value.trim()) {
            this.classList.add('filled');
        } else {
            this.classList.remove('filled');
        }
    });
});
