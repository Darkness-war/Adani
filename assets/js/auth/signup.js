// signup.js - Clean and Simple
import { sessionManager, dbService, utils } from '../core/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initForm();
    initPasswordValidation();
    initSocialSignup();
    checkExistingSession();
});

// Theme Toggle (EXACTLY like login)
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        document.body.style.transition = 'background 0.5s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 500);
    });
    
    prefersDark.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Form Management
function initForm() {
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');
    
    signupForm?.addEventListener('submit', handleSignup);
}

// Password Validation
function initPasswordValidation() {
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirm = document.getElementById('toggleConfirmPassword');
    
    // Password visibility toggle
    togglePassword?.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.innerHTML = type === 'password' ? 
            '<i class="fas fa-eye"></i>' : 
            '<i class="fas fa-eye-slash"></i>';
    });
    
    toggleConfirm?.addEventListener('click', () => {
        const type = confirmInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmInput.setAttribute('type', type);
        toggleConfirm.innerHTML = type === 'password' ? 
            '<i class="fas fa-eye"></i>' : 
            '<i class="fas fa-eye-slash"></i>';
    });
    
    // Real-time password validation
    passwordInput?.addEventListener('input', (e) => {
        validatePassword(e.target.value);
        checkPasswordMatch();
    });
    
    confirmInput?.addEventListener('input', checkPasswordMatch);
}

function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password)
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
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (strengthFill && strengthText) {
        const percentage = (validCount / 4) * 100;
        strengthFill.style.width = `${percentage}%`;
        
        // Update colors and text
        if (validCount <= 1) {
            strengthFill.style.background = 'var(--danger)';
            strengthText.textContent = 'Weak';
            strengthText.style.color = 'var(--danger)';
        } else if (validCount <= 2) {
            strengthFill.style.background = 'var(--warning)';
            strengthText.textContent = 'Fair';
            strengthText.style.color = 'var(--warning)';
        } else if (validCount <= 3) {
            strengthFill.style.background = 'var(--primary)';
            strengthText.textContent = 'Good';
            strengthText.style.color = 'var(--primary)';
        } else {
            strengthFill.style.background = 'var(--success)';
            strengthText.textContent = 'Strong';
            strengthText.style.color = 'var(--success)';
        }
    }
    
    return validCount >= 3; // Minimum 3 requirements met
}

function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');
    
    if (confirmPassword && password !== confirmPassword) {
        confirmInput.style.borderColor = 'var(--danger)';
        confirmInput.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.1)';
        return false;
    } else if (confirmPassword && password === confirmPassword) {
        confirmInput.style.borderColor = 'var(--success)';
        confirmInput.style.boxShadow = '0 0 0 3px rgba(46, 204, 113, 0.1)';
        return true;
    } else {
        confirmInput.style.borderColor = '';
        confirmInput.style.boxShadow = '';
        return null;
    }
}

// Signup Handler
async function handleSignup(e) {
    e.preventDefault();
    
    const signupBtn = document.getElementById('signupBtn');
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    
    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (!utils.validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (!validatePassword(password)) {
        showToast('Password does not meet requirements', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (!terms) {
        showToast('You must agree to the Terms and Privacy Policy', 'error');
        return;
    }
    
    try {
        // Show loading
        setLoadingState(signupBtn, true);
        
        // Sign up with Supabase
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`
                }
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
            created_at: new Date().toISOString()
        });
        
        // Show success
        showToast('Account created! Please check your email to verify.', 'success');
        
        // Success animation
        signupBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
        signupBtn.style.background = 'linear-gradient(135deg, var(--success), #2ecc71)';
        
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 3000);
        
    } catch (error) {
        console.error('Signup error:', error);
        
        let message = 'Signup failed. Please try again.';
        
        if (error.message.includes('already registered')) {
            message = 'Email already registered. Please sign in instead.';
        } else if (error.message.includes('weak password')) {
            message = 'Password is too weak.';
        } else if (error.message.includes('invalid email')) {
            message = 'Invalid email address.';
        }
        
        showToast(message, 'error');
        setLoadingState(signupBtn, false);
        
        // Reset button
        signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        signupBtn.style.background = '';
    }
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
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${window.location.origin}/pages/user/dashboard.html`
            }
        });
        
        if (error) throw error;
    } catch (error) {
        showToast(`${provider} signup failed. Please try again.`, 'error');
    }
}

// Loading state
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

// Toast notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
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
        // No active session
    }
        }
