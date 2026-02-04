// forgot-password.js - Clean and Simple
import { sessionManager, utils } from '../core/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initForm();
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
    const resetForm = document.getElementById('resetForm');
    const resetBtn = document.getElementById('resetBtn');
    
    resetForm?.addEventListener('submit', handlePasswordReset);
}

async function handlePasswordReset(e) {
    e.preventDefault();
    
    const resetBtn = document.getElementById('resetBtn');
    const email = document.getElementById('email').value.trim();
    const successMessage = document.getElementById('successMessage');
    const sentEmail = document.getElementById('sentEmail');
    
    // Validation
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }
    
    if (!utils.validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    try {
        // Show loading
        setLoadingState(resetBtn, true);
        
        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/pages/auth/login.html`
        });
        
        if (error) throw error;
        
        // Show success message
        sentEmail.textContent = email;
        successMessage.classList.add('show');
        
        // Hide the form
        document.querySelector('.form-group').style.display = 'none';
        document.querySelector('.reset-instructions').style.display = 'none';
        
        // Button success state
        resetBtn.innerHTML = '<i class="fas fa-check"></i> Email Sent!';
        resetBtn.style.background = 'linear-gradient(135deg, var(--success), #2ecc71)';
        
        showToast('Password reset link sent! Check your email.', 'success');
        
        // Reset form after 10 seconds
        setTimeout(() => {
            successMessage.classList.remove('show');
            document.querySelector('.form-group').style.display = 'block';
            document.querySelector('.reset-instructions').style.display = 'block';
            document.getElementById('email').value = '';
            resetBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
            resetBtn.style.background = '';
            setLoadingState(resetBtn, false);
        }, 10000);
        
    } catch (error) {
        console.error('Password reset error:', error);
        
        let message = 'Failed to send reset link. Please try again.';
        
        if (error.message.includes('rate limit')) {
            message = 'Too many attempts. Please try again later.';
        } else if (error.message.includes('user not found')) {
            message = 'No account found with this email.';
        }
        
        showToast(message, 'error');
        setLoadingState(resetBtn, false);
        
        // Reset button
        resetBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
        resetBtn.style.background = '';
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
