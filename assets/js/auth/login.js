// assets/js/auth/login.js
import { sessionManager, dbService, utils } from '../core/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initForm();
    initDemoAccounts();
    checkExistingSession();
});

// Theme Management
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    
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
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// Form Management
function initForm() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    // Password visibility toggle
    togglePassword?.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.innerHTML = type === 'password' ? 
            '<i class="fas fa-eye"></i>' : 
            '<i class="fas fa-eye-slash"></i>';
    });
    
    // Form submission
    loginForm?.addEventListener('submit', handleLogin);
    
    // Social login
    document.getElementById('googleLogin')?.addEventListener('click', () => 
        handleSocialLogin('google'));
    document.getElementById('githubLogin')?.addEventListener('click', () => 
        handleSocialLogin('github'));
}

// Login handler
async function handleLogin(e) {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Validation
    if (!utils.validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        // Show loading
        setLoadingState(loginBtn, true);
        
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        // Check/create user profile
        const profile = await dbService.getUserProfile(data.user.id);
        
        if (!profile) {
            const referralCode = utils.generateReferralCode(data.user.id);
            
            await supabase.from('profiles').insert({
                id: data.user.id,
                referral_code: referralCode,
                created_at: new Date().toISOString()
            });
        }
        
        // Show success
        showToast('Login successful! Redirecting...', 'success');
        
        // Redirect
        setTimeout(() => {
            window.location.href = '../../user/dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        
        let message = 'Login failed. Please check your credentials.';
        
        if (error.message.includes('Invalid login credentials')) {
            message = 'Invalid email or password.';
        } else if (error.message.includes('Email not confirmed')) {
            message = 'Please verify your email first.';
        } else if (error.message.includes('rate limit')) {
            message = 'Too many attempts. Please try again later.';
        }
        
        showToast(message, 'error');
        setLoadingState(loginBtn, false);
    }
}

// Social login
async function handleSocialLogin(provider) {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${window.location.origin}/pages/user/dashboard.html`
            }
        });
        
        if (error) throw error;
    } catch (error) {
        showToast(`${provider} login failed. Please try again.`, 'error');
    }
}

// Demo accounts
function initDemoAccounts() {
    const demoToggle = document.getElementById('demoToggle');
    const demoContent = document.getElementById('demoContent');
    const demoCards = document.querySelectorAll('.demo-card');
    
    // Toggle demo accounts
    demoToggle?.addEventListener('click', () => {
        const isExpanded = demoContent.classList.contains('expanded');
        
        if (isExpanded) {
            demoContent.classList.remove('expanded');
            demoToggle.querySelector('.fa-chevron-down').style.transform = 'rotate(0deg)';
        } else {
            demoContent.classList.add('expanded');
            demoToggle.querySelector('.fa-chevron-down').style.transform = 'rotate(180deg)';
        }
    });
    
    // Demo account click handlers
    demoCards.forEach(card => {
        const useBtn = card.querySelector('.btn-demo-use');
        useBtn?.addEventListener('click', () => {
            const email = card.dataset.email;
            const password = card.dataset.password;
            
            document.getElementById('email').value = email;
            document.getElementById('password').value = password;
            document.getElementById('rememberMe').checked = true;
            
            showToast(`Demo credentials filled. Click Sign In to continue.`, 'info');
        });
    });
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
            window.location.href = '../../user/dashboard.html';
        }
    } catch (error) {
        // No active session
    }
}
