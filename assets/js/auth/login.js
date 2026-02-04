// login.js - Modern Enhanced Version
import { sessionManager, dbService, utils } from '../../core/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    initThemeToggle();
    initForm();
    initAnimations();
    initStatsCounter();
    initDemoAccounts();
    initUserTypeSelector();
    checkExistingSession();
});

// Theme Management
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Toggle theme
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        // Add theme change animation
        document.body.style.transition = 'background 0.5s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 500);
    });
    
    // Listen for system theme changes
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
    document.getElementById('appleLogin')?.addEventListener('click', () => 
        handleSocialLogin('apple'));
}

// Password strength indicator
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

// Enhanced login handler
async function handleLogin(e) {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
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
        
        // Enhanced user profile handling
        await handleUserProfile(data.user);
        
        // Create login transaction
        await createLoginTransaction(data.user.id);
        
        // Store login preference
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
        }
        
        // Success animation
        await successAnimation();
        
        // Show success message
        showToast('Login successful! Redirecting to dashboard...', 'success');
        
        // Redirect with animation
        setTimeout(() => {
            window.location.href = '/pages/user/dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Login error:', error);
        handleLoginError(error);
    } finally {
        setLoadingState(loginBtn, false);
    }
}

// User profile management
async function handleUserProfile(user) {
    try {
        let profile = await dbService.getUserProfile(user.id);
        
        if (!profile) {
            // Create new user profile
            const referralCode = utils.generateReferralCode(user.id);
            const userType = document.querySelector('.user-type-btn.active')?.dataset.type || 'individual';
            
            profile = {
                id: user.id,
                email: user.email,
                referral_code: referralCode,
                user_type: userType,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                settings: {
                    theme: localStorage.getItem('theme') || 'light',
                    notifications: true
                }
            };
            
            await supabase.from('profiles').insert(profile);
        } else {
            // Update last login
            await supabase.from('profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);
        }
    } catch (error) {
        console.error('Profile handling error:', error);
    }
}

// Login transaction
async function createLoginTransaction(userId) {
    try {
        await dbService.createTransaction({
            user_id: userId,
            type: 'system',
            amount: 0,
            status: 'completed',
            details: 'User logged in',
            metadata: {
                device: navigator.userAgent,
                platform: navigator.platform,
                timestamp: new Date().toISOString()
            },
            created_at: new Date().toISOString()
        });
    } catch (error) {
        console.error('Transaction creation error:', error);
    }
}

// Error handling
function handleLoginError(error) {
    let message = 'Login failed. Please check your credentials.';
    let type = 'error';
    
    if (error.message.includes('Invalid login credentials')) {
        message = 'Invalid email or password.';
    } else if (error.message.includes('Email not confirmed')) {
        message = 'Please verify your email first. Check your inbox.';
        type = 'info';
    } else if (error.message.includes('rate limit')) {
        message = 'Too many attempts. Please try again in 15 minutes.';
    } else if (error.message.includes('network')) {
        message = 'Network error. Please check your connection.';
    } else if (error.message.includes('User not found')) {
        message = 'Account not found. Please sign up first.';
        type = 'info';
    }
    
    showToast(message, type);
    
    // Shake animation for error
    const form = document.getElementById('loginForm');
    form.classList.add('shake-animation');
    setTimeout(() => {
        form.classList.remove('shake-animation');
    }, 500);
}

// Social login handler
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

// Demo accounts functionality
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
            
            // Auto-select remember me
            document.getElementById('rememberMe').checked = true;
            
            // Show success message
            showToast(`Demo credentials for ${email} filled! Click Sign In to continue.`, 'info');
            
            // Highlight the form
            card.classList.add('selected');
            setTimeout(() => card.classList.remove('selected'), 2000);
            
            // Auto-focus password field
            document.getElementById('password').focus();
        });
    });
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

// User type selector
function initUserTypeSelector() {
    const buttons = document.querySelectorAll('.user-type-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update form appearance based on user type
            const form = document.querySelector('.auth-form');
            form.dataset.userType = button.dataset.type;
            
            showToast(`${button.dataset.type.charAt(0).toUpperCase() + button.dataset.type.slice(1)} mode selected`, 'info');
        });
    });
}

// Loading state management
function setLoadingState(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Success animation
async function successAnimation() {
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('loginBtn');
    
    // Add success animation
    btn.classList.add('success-pulse');
    form.classList.add('success-submit');
    
    // Confetti effect
    await createConfetti();
    
    // Remove animations
    setTimeout(() => {
        btn.classList.remove('success-pulse');
        form.classList.remove('success-submit');
    }, 2000);
}

// Confetti animation
function createConfetti() {
    return new Promise(resolve => {
        const colors = ['#4361ee', '#7209b7', '#f72585', '#4cc9f0', '#4895ef'];
        const confettiCount = 50;
        let completed = 0;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                top: 50%;
                left: 50%;
                border-radius: 2px;
                z-index: ${var(--z-modal)};
                opacity: 0;
                pointer-events: none;
            `;
            
            document.body.appendChild(confetti);
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = 2 + Math.random() * 2;
            const animation = confetti.animate([
                {
                    opacity: 1,
                    transform: `translate(0, 0) rotate(0deg)`
                },
                {
                    opacity: 0,
                    transform: `translate(${Math.cos(angle) * 100}px, ${Math.sin(angle) * 100}px) rotate(${360}deg)`
                }
            ], {
                duration: 1000 + Math.random() * 1000,
                easing: 'cubic-bezier(0.1, 0.8, 0.9, 0.1)'
            });
            
            animation.onfinish = () => {
                confetti.remove();
                completed++;
                if (completed === confettiCount) resolve();
            };
        }
    });
}

// Animations initialization
function initAnimations() {
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes successPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .shake-animation {
            animation: shake 0.5s ease-in-out;
        }
        
        .success-pulse {
            animation: successPulse 0.5s ease 2;
        }
        
        .success-submit {
            position: relative;
            overflow: hidden;
        }
        
        .success-submit::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(67, 97, 238, 0.1) 0%, transparent 70%);
            animation: ripple 1s ease-out;
        }
        
        @keyframes ripple {
            to {
                transform: scale(1);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
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
            // User is already logged in, redirect with notification
            showToast('Welcome back! Redirecting to dashboard...', 'info');
            setTimeout(() => {
                window.location.href = '/pages/user/dashboard.html';
            }, 1500);
        }
    } catch (error) {
        // Session check failed, continue with normal flow
        console.log('No active session found');
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
        const demoContent = document.getElementById('demoContent');
        if (demoContent?.classList.contains('expanded')) {
            demoContent.classList.remove('expanded');
        }
    }
});

// Offline detection
window.addEventListener('online', () => {
    showToast('Back online!', 'success');
});

window.addEventListener('offline', () => {
    showToast('You are offline. Some features may be limited.', 'warning');
});

// Performance monitoring
const loginStartTime = performance.now();
window.addEventListener('load', () => {
    const loadTime = performance.now() - loginStartTime;
    console.log(`Login page loaded in ${loadTime.toFixed(2)}ms`);
    
    // Store performance data
    if (loadTime < 2000) {
        localStorage.setItem('perf_login', 'good');
    }
});
