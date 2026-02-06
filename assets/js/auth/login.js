// login.js - Modern Enhanced Version with Dark Theme 
import { sessionManager, dbService, utils, supabase } from '../core/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    initDarkMode();
    initForm();
    initDemoSection();
    initStatsCounter();
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
        
        // Show notification
        showToast(`${newTheme === 'dark' ? 'Dark' : 'Light'} theme activated`, 'info');
    });
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            updateThemeIcon(newTheme);
        }
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        // Add rotation animation
        icon.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            icon.style.transform = 'rotate(0deg)';
        }, 300);
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
    
    // Real-time validation
    passwordInput?.addEventListener('input', (e) => {
        validatePasswordStrength(e.target.value);
    });
    
    // Form submission
    loginForm?.addEventListener('submit', handleLogin);
    
    // Social login handlers
    document.getElementById('googleLogin')?.addEventListener('click', () => 
        handleSocialLogin('google'));
    document.getElementById('githubLogin')?.addEventListener('click', () => 
        handleSocialLogin('github'));
}

function validatePasswordStrength(password) {
    const strength = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*]/.test(password)
    };
    
    const score = Object.values(strength).filter(Boolean).length;
    return score >= 4;
}

async function handleLogin(e) {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Validation
    if (!utils.validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        document.getElementById('email').focus();
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        document.getElementById('password').focus();
        return;
    }
    
    try {
        // Show loading state
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
        
        // Create login transaction
        await dbService.createTransaction({
            user_id: data.user.id,
            type: 'system',
            amount: 0,
            status: 'completed',
            details: 'User logged in',
            created_at: new Date().toISOString()
        });
        
        // Success animation
        loginBtn.innerHTML = '<i class="fas fa-check"></i> Success!';
        loginBtn.style.background = 'linear-gradient(135deg, var(--success), #2ecc71)';
        
        // Show success message
        showToast('Login successful! Redirecting...', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = '../../user/dashboard.html';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Show appropriate error message
        let message = 'Login failed. Please check your credentials.';
        
        if (error.message.includes('Invalid login credentials')) {
            message = 'Invalid email or password.';
        } else if (error.message.includes('Email not confirmed')) {
            message = 'Please verify your email first. Check your inbox.';
        } else if (error.message.includes('rate limit')) {
            message = 'Too many attempts. Please try again in 15 minutes.';
        }
        
        showToast(message, 'error');
        setLoadingState(loginBtn, false);
        
        // Reset button text
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        loginBtn.style.background = '';
    }
}

async function handleSocialLogin(provider) {
    try {
        showToast(`Connecting with ${provider}...`, 'info');
        
        const { error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: `${window.location.origin}/pages/user/dashboard.html`,
                scopes: provider === 'github' ? 'read:user,user:email' : undefined
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        console.error(`${provider} login error:`, error);
        showToast(`${provider} login failed. Please try again.`, 'error');
    }
}

// Enhanced Demo Section
function initDemoSection() {
    // Tab switching
    const accountTabs = document.querySelectorAll('.account-tab');
    const accountCards = document.querySelectorAll('.account-card');
    
    accountTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            accountTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all account cards
            accountCards.forEach(card => card.classList.remove('active'));
            
            // Show corresponding account card
            const tabId = tab.dataset.tab;
            const accountCard = document.getElementById(`${tabId}-account`);
            if (accountCard) {
                accountCard.classList.add('active');
            }
            
            // Show notification
            showToast(`Switched to ${tab.querySelector('i').nextSibling.textContent.trim()}`, 'info');
        });
    });
    
    // Use account buttons
    const useAccountButtons = document.querySelectorAll('.btn-use-account');
    useAccountButtons.forEach(button => {
        button.addEventListener('click', () => {
            const email = button.dataset.email;
            const password = button.dataset.password;
            
            // Fill the form
            document.getElementById('email').value = email;
            document.getElementById('password').value = password;
            document.getElementById('rememberMe').checked = true;
            
            // Show success animation
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Filled!';
            button.style.background = 'linear-gradient(135deg, var(--success), #2ecc71)';
            
            // Reset button after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = '';
            }, 2000);
            
            // Show notification
            showToast(`Demo credentials for ${email} filled successfully!`, 'success');
            
            // Auto-focus on password field
            document.getElementById('password').focus();
        });
    });
    
    // Auto-fill all fields button
    const autoFillAllBtn = document.getElementById('autoFillAll');
    if (autoFillAllBtn) {
        autoFillAllBtn.addEventListener('click', () => {
            // Fill with standard account
            document.getElementById('email').value = 'user@test.com';
            document.getElementById('password').value = 'Test@123';
            document.getElementById('rememberMe').checked = true;
            
            // Switch to standard tab
            document.querySelector('[data-tab="standard"]').click();
            
            showToast('All fields auto-filled with demo account!', 'success');
            
            // Button animation
            autoFillAllBtn.innerHTML = '<i class="fas fa-check"></i> Auto-filled!';
            autoFillAllBtn.style.background = 'linear-gradient(135deg, var(--success), #2ecc71)';
            setTimeout(() => {
                autoFillAllBtn.innerHTML = '<i class="fas fa-magic"></i> Auto-fill All Fields';
                autoFillAllBtn.style.background = '';
            }, 2000);
        });
    }
    
    // Reset demo data button
    const resetDemoBtn = document.getElementById('resetDemo');
    if (resetDemoBtn) {
        resetDemoBtn.addEventListener('click', () => {
            // Clear form
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            document.getElementById('rememberMe').checked = false;
            
            // Reset to standard tab
            document.querySelector('[data-tab="standard"]').click();
            
            showToast('Form reset successfully!', 'info');
            
            // Button animation
            resetDemoBtn.innerHTML = '<i class="fas fa-check"></i> Reset!';
            resetDemoBtn.style.borderColor = 'var(--success)';
            resetDemoBtn.style.color = 'var(--success)';
            setTimeout(() => {
                resetDemoBtn.innerHTML = '<i class="fas fa-redo"></i> Reset Form';
                resetDemoBtn.style.borderColor = '';
                resetDemoBtn.style.color = '';
            }, 2000);
        });
    }
}

// Stats counter animation
function initStatsCounter() {
    const counters = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                startCounterAnimation(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => observer.observe(counter));
}

function startCounterAnimation(counter) {
    const target = parseInt(counter.dataset.count);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        counter.textContent = Math.floor(current).toLocaleString();
    }, 16);
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
            showToast('Welcome back! Redirecting to dashboard...', 'info');
            setTimeout(() => {
                window.location.href = '../../user/dashboard.html';
            }, 1500);
        }
    } catch (error) {
        // No active session, continue with login
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Alt + L focuses login form
    if (e.altKey && e.key === 'l') {
        e.preventDefault();
        document.getElementById('email')?.focus();
    }
    
    // Escape closes demo panel
    if (e.key === 'Escape') {
        const demoContent = document.querySelector('.demo-section');
        if (demoContent) {
            // Reset form
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            showToast('Form cleared', 'info');
        }
    }
});

// Performance monitoring
const loginStartTime = performance.now();
window.addEventListener('load', () => {
    const loadTime = performance.now() - loginStartTime;
    console.log(`Login page loaded in ${loadTime.toFixed(2)}ms`);
});
