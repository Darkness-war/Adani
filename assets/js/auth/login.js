// assets/js/auth/login.js
import { supabase } from '../../core/supabase.js';

// Utility Functions
class LoginUtils {
    static showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto remove
        const removeToast = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', removeToast);
        
        // Auto remove after duration
        if (duration) {
            setTimeout(removeToast, duration);
        }
    }
    
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validatePassword(password) {
        return password.length >= 6;
    }
    
    static togglePasswordVisibility(inputId, toggleId) {
        const passwordInput = document.getElementById(inputId);
        const toggleBtn = document.getElementById(toggleId);
        
        if (!passwordInput || !toggleBtn) return;
        
        toggleBtn.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            toggleBtn.innerHTML = type === 'password' ? 
                '<i class="fas fa-eye"></i>' : 
                '<i class="fas fa-eye-slash"></i>';
        });
    }
    
    static createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;
        
        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Random size and position
            const size = Math.random() * 4 + 1;
            const left = Math.random() * 100;
            const animationDelay = Math.random() * 15;
            const animationDuration = Math.random() * 10 + 10;
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.animationDelay = `${animationDelay}s`;
            particle.style.animationDuration = `${animationDuration}s`;
            
            particlesContainer.appendChild(particle);
        }
    }
}

// Login Handler Class
class LoginHandler {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.loginBtn = document.getElementById('loginBtn');
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        // Create animated particles
        LoginUtils.createParticles();
        
        // Setup password toggle
        LoginUtils.togglePasswordVisibility('password', 'togglePassword');
        
        // Setup form submission
        this.setupForm();
        
        // Setup social login
        this.setupSocialLogin();
        
        // Setup demo accounts
        this.setupDemoAccounts();
        
        // Setup auto-focus on email field
        document.getElementById('email')?.focus();
    }
    
    setupForm() {
        if (!this.form) return;
        
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (this.isLoading) return;
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // Validate inputs
            if (!LoginUtils.validateEmail(email)) {
                LoginUtils.showToast('Please enter a valid email address', 'error');
                return;
            }
            
            if (!LoginUtils.validatePassword(password)) {
                LoginUtils.showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            // Start login process
            await this.handleLogin(email, password, rememberMe);
        });
    }
    
    async handleLogin(email, password, rememberMe) {
        try {
            this.setLoading(true);
            
            // Set session duration based on remember me
            const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day
            
            // Sign in with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
                options: {
                    data: {
                        login_time: new Date().toISOString(),
                        user_agent: navigator.userAgent
                    }
                }
            });
            
            if (error) throw error;
            
            // Check if user profile exists
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();
            
            if (!profile) {
                // Create user profile if doesn't exist
                const referralCode = this.generateReferralCode(data.user.id);
                
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    email: data.user.email,
                    full_name: data.user.user_metadata?.full_name || '',
                    referral_code: referralCode,
                    created_at: new Date().toISOString(),
                    last_login: new Date().toISOString()
                });
            } else {
                // Update last login
                await supabase
                    .from('profiles')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', data.user.id);
            }
            
            // Log login activity
            await this.logLoginActivity(data.user.id);
            
            // Show success message
            LoginUtils.showToast('Login successful! Redirecting to dashboard...', 'success');
            
            // Redirect to dashboard with delay
            setTimeout(() => {
                window.location.href = '/pages/user/dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleLoginError(error);
        } finally {
            this.setLoading(false);
        }
    }
    
    handleLoginError(error) {
        let message = 'Login failed. Please check your credentials and try again.';
        
        if (error.message.includes('Invalid login credentials')) {
            message = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
            message = 'Please verify your email address before logging in.';
        } else if (error.message.includes('User banned')) {
            message = 'Your account has been suspended. Please contact support.';
        } else if (error.message.includes('rate limit')) {
            message = 'Too many login attempts. Please try again in 15 minutes.';
        } else if (error.message.includes('network')) {
            message = 'Network error. Please check your internet connection.';
        }
        
        LoginUtils.showToast(message, 'error');
    }
    
    async logLoginActivity(userId) {
        try {
            await supabase.from('login_activity').insert({
                user_id: userId,
                login_time: new Date().toISOString(),
                ip_address: await this.getClientIP(),
                user_agent: navigator.userAgent,
                status: 'success'
            });
        } catch (error) {
            console.error('Failed to log login activity:', error);
        }
    }
    
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }
    
    generateReferralCode(userId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        
        // Use part of userId and random chars
        const userIdPart = userId.substring(0, 4).toUpperCase();
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return `UZ${userIdPart}${code}`;
    }
    
    setupSocialLogin() {
        // Google Login
        document.getElementById('googleLogin')?.addEventListener('click', async () => {
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: `${window.location.origin}/pages/user/dashboard.html`,
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent'
                        }
                    }
                });
                
                if (error) throw error;
            } catch (error) {
                LoginUtils.showToast('Google login failed. Please try again.', 'error');
            }
        });
        
        // GitHub Login
        document.getElementById('githubLogin')?.addEventListener('click', async () => {
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: {
                        redirectTo: `${window.location.origin}/pages/user/dashboard.html`
                    }
                });
                
                if (error) throw error;
            } catch (error) {
                LoginUtils.showToast('GitHub login failed. Please try again.', 'error');
            }
        });
    }
    
    setupDemoAccounts() {
        const demoAccounts = {
            demoUser: {
                email: 'user@demo.com',
                password: 'Demo@123',
                type: 'user'
            },
            demoVIP: {
                email: 'vip@demo.com',
                password: 'Demo@123',
                type: 'vip'
            }
        };
        
        Object.entries(demoAccounts).forEach(([id, account]) => {
            const element = document.getElementById(id);
            if (!element) return;
            
            element.addEventListener('click', () => {
                document.getElementById('email').value = account.email;
                document.getElementById('password').value = account.password;
                document.getElementById('rememberMe').checked = true;
                
                LoginUtils.showToast(
                    `${account.type === 'vip' ? 'VIP ' : ''}Demo credentials filled. Click Sign In to continue.`,
                    'info'
                );
                
                // Auto-focus on login button
                setTimeout(() => document.getElementById('loginBtn').focus(), 100);
            });
        });
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        
        if (this.loginBtn) {
            if (loading) {
                this.loginBtn.disabled = true;
                this.loginBtn.innerHTML = `
                    <div class="spinner"></div>
                    <span>Signing In...</span>
                `;
            } else {
                this.loginBtn.disabled = false;
                this.loginBtn.innerHTML = `
                    <i class="fas fa-sign-in-alt"></i>
                    <span>Sign In to Dashboard</span>
                `;
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = '/pages/user/dashboard.html';
        }
    });
    
    // Initialize login handler
    new LoginHandler();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl + Enter to submit form
        if (e.ctrlKey && e.key === 'Enter') {
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn && !loginBtn.disabled) {
                loginBtn.click();
            }
        }
        
        // Esc to clear form
        if (e.key === 'Escape') {
            const form = document.getElementById('loginForm');
            if (form) form.reset();
        }
    });
    
    // Add input animations
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.parentElement.classList.remove('focused');
            }
        });
    });
});
