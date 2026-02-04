// forgot-password.js - Modern Password Reset
import { sessionManager, utils } from '../core/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize components
    initDarkMode();
    initForm();
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

// Form Management
function initForm() {
    const resetForm = document.getElementById('resetForm');
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
        document.getElementById('email').focus();
        return;
    }
    
    try {
        // Show loading state
        setLoadingState(resetBtn, true);
        
        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/pages/auth/reset-password.html`,
        });
        
        if (error) throw error;
        
        // Success animation
        resetBtn.innerHTML = '<i class="fas fa-check"></i> Email Sent!';
        resetBtn.style.background = 'linear-gradient(135deg, var(--success), #2ecc71)';
        
        // Show success message
        sentEmail.textContent = email;
        successMessage.classList.add('show');
        
        // Hide form elements
        document.querySelector('.form-group').style.display = 'none';
        
        // Auto-hide success message and reset after 10 seconds
        setTimeout(() => {
            resetBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
            resetBtn.style.background = '';
            successMessage.classList.remove('show');
            document.querySelector('.form-group').style.display = 'block';
            document.getElementById('email').value = '';
            setLoadingState(resetBtn, false);
        }, 10000);
        
        // Show success toast
        showToast('Password reset link sent successfully! Check your email.', 'success');
        
        // Log the reset request
        await logResetRequest(email);
        
    } catch (error) {
        console.error('Password reset error:', error);
        
        let message = 'Failed to send reset link. Please try again.';
        
        if (error.message.includes('rate limit')) {
            message = 'Too many attempts. Please try again in 15 minutes.';
        } else if (error.message.includes('user not found')) {
            message = 'No account found with this email address.';
        } else if (error.message.includes('email not confirmed')) {
            message = 'Please verify your email first before resetting password.';
        }
        
        showToast(message, 'error');
        setLoadingState(resetBtn, false);
        
        // Reset button text
        resetBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reset Link';
        resetBtn.style.background = '';
    }
}

async function logResetRequest(email) {
    try {
        // Get current user if logged in
        const { user } = await sessionManager.getCurrentUser();
        
        // Log the reset request (you can send this to your backend)
        console.log('Password reset requested:', {
            email: email,
            user_id: user?.id || 'anonymous',
            timestamp: new Date().toISOString(),
            ip: await getClientIP()
        });
        
    } catch (error) {
        console.error('Failed to log reset request:', error);
    }
}

async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'unknown';
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
        // No active session, continue with password reset
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key clears the form
    if (e.key === 'Escape') {
        document.getElementById('email').value = '';
        showToast('Form cleared', 'info');
    }
    
    // Ctrl/Cmd + Enter submits the form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        document.getElementById('resetForm').dispatchEvent(new Event('submit'));
    }
});
