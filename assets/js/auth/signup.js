// signup.js - Professional Signup with All Features
import { sessionManager, dbService, utils } from '../core/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initializeThemeSystem();
    initializeForm();
    initializePasswordValidation();
    initializeSocialSignup();
    initializeProgressIndicator();
    checkExistingSession();
});

// ====================
// THEME MANAGEMENT
// ====================

function initializeThemeSystem() {
    const themeToggle = document.getElementById('themeToggle');
    
    // Load saved theme or detect system preference
    const savedTheme = localStorage.getItem('uzumaki-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    // Theme toggle click handler
    themeToggle.addEventListener('click', toggleTheme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('uzumaki-theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('uzumaki-theme', theme);
    updateThemeIcon(theme);
    
    // Add transition effect
    document.body.style.transition = 'background 0.5s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 500);
    
    showToast(`${theme === 'dark' ? 'Dark' : 'Light'} theme activated`, 'info');
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        
        // Add rotation animation
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            icon.style.transform = 'rotate(0deg)';
        }, 300);
    }
}

// ====================
// FORM INITIALIZATION
// ====================

function initializeForm() {
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    // Initialize input masks and validations
    initializeInputMasks();
}

function initializeInputMasks() {
    // Phone number mask (if you add phone field later)
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                value = value.match(/.{1,3}/g).join('-');
            }
            e.target.value = value;
        });
    }
    
    // Referral code formatting
    const referralInput = document.getElementById('referralCode');
    if (referralInput) {
        referralInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }
}

// ====================
// PASSWORD VALIDATION
// ====================

function initializePasswordValidation() {
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirm = document.getElementById('toggleConfirmPassword');
    
    // Password visibility toggle
    togglePassword?.addEventListener('click', () => togglePasswordVisibility(passwordInput, togglePassword));
    toggleConfirm?.addEventListener('click', () => togglePasswordVisibility(confirmInput, toggleConfirm));
    
    // Real-time password validation
    passwordInput?.addEventListener('input', (e) => {
        const password = e.target.value;
        validatePasswordStrength(password);
        checkPasswordMatch();
        updateProgressStep(1); // Update progress when password is entered
    });
    
    confirmInput?.addEventListener('input', () => {
        checkPasswordMatch();
    });
}

function togglePasswordVisibility(inputElement, toggleButton) {
    const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
    inputElement.setAttribute('type', type);
    
    const icon = toggleButton.querySelector('i');
    icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    
    // Add animation
    icon.style.transform = 'scale(1.2)';
    setTimeout(() => {
        icon.style.transform = 'scale(1)';
    }, 200);
}

function validatePasswordStrength(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
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
    
    // Calculate strength score
    const validCount = Object.values(requirements).filter(Boolean).length;
    updateStrengthBars(validCount);
    
    return validCount >= 4; // Require at least 4 out of 5
}

function updateStrengthBars(score) {
    const strengthBars = document.querySelectorAll('.strength-bar');
    const strengthText = document.getElementById('strengthText');
    
    // Reset all bars
    strengthBars.forEach(bar => {
        bar.style.background = 'var(--gray-200)';
    });
    
    // Update based on score
    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['var(--danger)', 'var(--warning)', 'var(--warning)', 'var(--primary)', 'var(--success)'];
    
    for (let i = 0; i < score; i++) {
        if (strengthBars[i]) {
            strengthBars[i].style.background = colors[score - 1];
        }
    }
    
    if (strengthText) {
        strengthText.textContent = strengthLevels[score - 1] || 'Very Weak';
        strengthText.style.color = colors[score - 1] || 'var(--danger)';
    }
}

function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const confirmInput = document.getElementById('confirmPassword');
    
    if (!confirmPassword) {
        confirmInput.style.borderColor = '';
        confirmInput.style.boxShadow = '';
        return null;
    }
    
    if (password === confirmPassword) {
        confirmInput.style.borderColor = 'var(--success)';
        confirmInput.style.boxShadow = '0 0 0 3px rgba(46, 204, 113, 0.1)';
        return true;
    } else {
        confirmInput.style.borderColor = 'var(--danger)';
        confirmInput.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.1)';
        return false;
    }
}

// ====================
// PROGRESS INDICATOR
// ====================

function initializeProgressIndicator() {
    // Update progress based on form interactions
    const formInputs = document.querySelectorAll('.form-input');
    formInputs.forEach(input => {
        input.addEventListener('blur', () => {
            updateProgressBasedOnForm();
        });
    });
}

function updateProgressBasedOnForm() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    let progress = 0;
    
    if (firstName && lastName) progress += 1;
    if (email && utils.validateEmail(email)) progress += 1;
    if (password && validatePasswordStrength(password)) progress += 1;
    
    updateProgressStep(progress);
}

function updateProgressStep(step) {
    const progressSteps = document.querySelectorAll('.progress-step');
    
    progressSteps.forEach((stepElement, index) => {
        if (index < step) {
            stepElement.classList.add('active');
        } else {
            stepElement.classList.remove('active');
        }
    });
}

// ====================
// SIGNUP HANDLER
// ====================

async function handleSignup(event) {
    event.preventDefault();
    
    const signupBtn = document.getElementById('signupBtn');
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    const newsletter = document.getElementById('newsletter').checked;
    const referralCode = document.getElementById('referralCode')?.value.trim().toUpperCase() || '';
    
    // Validation
    if (!validateForm(firstName, lastName, email, password, confirmPassword, terms)) {
        return;
    }

    // Add this line in handleSignup function after the validation section:
    async function handleSignup(event) {
    event.preventDefault();
    
    // ... validation code ...
    
    // ADD THIS LINE:
    await sessionManager.initialize(); // Ensure session manager is ready
    
    try {
        // ... rest of your code ...
    }
    
    try {
        // Show loading state
        setLoadingState(signupBtn, true, 'Creating Account...');
        
        // Check if email already exists (optional additional check)
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .single();
        
        if (existingUser) {
            throw new Error('This email is already registered. Please sign in instead.');
        }
        
        // Create user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    full_name: `${firstName} ${lastName}`,
                    newsletter_subscribed: newsletter,
                    referral_code_used: referralCode || null,
                    email_verified: false
                },
                emailRedirectTo: `${window.location.origin}/pages/auth/verify-email.html`
            }
        });
        
        if (authError) throw authError;
        
        // Generate unique referral code for new user
        const userReferralCode = generateUserReferralCode(firstName, lastName);
        
        // Create user profile in database
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: email,
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                referral_code: userReferralCode,
                referral_code_used: referralCode || null,
                newsletter_subscribed: newsletter,
                account_tier: 'standard',
                verified: false,
                created_at: new Date().toISOString(),
                settings: {
                    theme: localStorage.getItem('uzumaki-theme') || 'light',
                    notifications: true,
                    two_factor: false,
                    language: 'en'
                }
            });
        
        if (profileError) throw profileError;
        
        // Handle referral bonus if referral code provided
        if (referralCode) {
            await processReferralBonus(referralCode, authData.user.id);
        }
        
        // Create signup transaction log
        await createSignupTransaction(authData.user.id, referralCode);
        
        // Send welcome email (optional)
        await sendWelcomeEmail(email, firstName);
        
        // Success animation and message
        setLoadingState(signupBtn, false);
        signupBtn.innerHTML = '<i class="fas fa-check"></i> Account Created!';
        signupBtn.style.background = 'var(--gradient-success)';
        
        // Update progress to completed
        updateProgressStep(3);
        
        // Show success message
        showSuccessMessage(firstName, email);
        
        // Auto-redirect to verification page after 5 seconds
        setTimeout(() => {
            window.location.href = 'verify-email.html?email=' + encodeURIComponent(email);
        }, 5000);
        
    } catch (error) {
        console.error('Signup error:', error);
        handleSignupError(error);
        setLoadingState(signupBtn, false);
    }
}

function validateForm(firstName, lastName, email, password, confirmPassword, terms) {
    // Basic validation
    if (!firstName || !lastName) {
        showToast('Please enter your first and last name', 'error');
        return false;
    }
    
    if (!utils.validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        document.getElementById('email').focus();
        return false;
    }
    
    if (!validatePasswordStrength(password)) {
        showToast('Password does not meet security requirements', 'error');
        return false;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        document.getElementById('confirmPassword').focus();
        return false;
    }
    
    if (!terms) {
        showToast('You must agree to the Terms of Service and Privacy Policy', 'error');
        return false;
    }
    
    return true;
}

function generateUserReferralCode(firstName, lastName) {
    const prefix = firstName.substring(0, 3).toUpperCase();
    const suffix = lastName.substring(0, 2).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}${random}`;
}

async function processReferralBonus(referralCode, newUserId) {
    try {
        // Find user who provided the referral code
        const { data: referrer } = await supabase
            .from('profiles')
            .select('id, referral_bonuses')
            .eq('referral_code', referralCode)
            .single();
        
        if (referrer) {
            // Update referrer's bonuses
            await supabase
                .from('profiles')
                .update({
                    referral_bonuses: (referrer.referral_bonuses || 0) + 1,
                    total_referrals: (referrer.total_referrals || 0) + 1
                })
                .eq('id', referrer.id);
            
            // Create referral transaction
            await supabase
                .from('referrals')
                .insert({
                    referrer_id: referrer.id,
                    referred_id: newUserId,
                    referral_code: referralCode,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
            
            showToast('Referral bonus applied!', 'success');
        }
    } catch (error) {
        console.error('Referral processing error:', error);
        // Don't fail signup if referral fails
    }
}

async function createSignupTransaction(userId, referralCode) {
    try {
        await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'signup',
                amount: 0,
                status: 'completed',
                description: 'Account creation',
                metadata: {
                    referral_used: referralCode || null,
                    source: 'web_signup',
                    timestamp: new Date().toISOString()
                },
                created_at: new Date().toISOString()
            });
    } catch (error) {
        console.error('Transaction creation error:', error);
    }
}

async function sendWelcomeEmail(email, firstName) {
    // This would typically be a backend call
    // For now, we'll just log it
    console.log(`Welcome email sent to ${email}`);
}

function showSuccessMessage(firstName, email) {
    // Create success overlay
    const successHTML = `
        <div class="success-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.5s ease;
        ">
            <div style="
                background: var(--white);
                padding: 3rem;
                border-radius: var(--radius-xl);
                text-align: center;
                max-width: 500px;
                width: 90%;
                animation: slideUp 0.5s ease;
            ">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: var(--gradient-success);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 2rem;
                    color: white;
                    font-size: 2.5rem;
                ">
                    <i class="fas fa-check"></i>
                </div>
                <h2 style="
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    color: var(--gray-900);
                ">Welcome, ${firstName}!</h2>
                <p style="
                    color: var(--gray-600);
                    margin-bottom: 2rem;
                    line-height: 1.6;
                ">
                    Your account has been created successfully. We've sent a verification email to <strong>${email}</strong>.
                    Please check your inbox and verify your email to complete the setup.
                </p>
                <div style="
                    background: var(--gray-50);
                    padding: 1.5rem;
                    border-radius: var(--radius-lg);
                    margin-bottom: 2rem;
                    text-align: left;
                ">
                    <p style="
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        margin: 0;
                        color: var(--gray-700);
                    ">
                        <i class="fas fa-lightbulb" style="color: var(--warning);"></i>
                        <span><strong>Pro Tip:</strong> Check your spam folder if you don't see the email within 5 minutes.</span>
                    </p>
                </div>
                <div style="
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                ">
                    <button onclick="window.location.href='login.html'" style="
                        padding: 0.875rem 2rem;
                        background: var(--gray-100);
                        border: none;
                        border-radius: var(--radius-md);
                        color: var(--gray-700);
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='var(--gray-200)'" 
                    onmouseout="this.style.background='var(--gray-100)'">
                        Go to Login
                    </button>
                    <button onclick="resendVerificationEmail('${email}')" style="
                        padding: 0.875rem 2rem;
                        background: var(--primary);
                        border: none;
                        border-radius: var(--radius-md);
                        color: white;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(67, 97, 238, 0.3)'" 
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <i class="fas fa-redo"></i> Resend Email
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', successHTML);
    
    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { 
                opacity: 0;
                transform: translateY(30px);
            }
            to { 
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}

// ====================
// SOCIAL SIGNUP
// ====================

function initializeSocialSignup() {
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
                redirectTo: `${window.location.origin}/pages/user/dashboard.html`,
                scopes: provider === 'github' ? 'read:user,user:email' : 'email profile',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent'
                }
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        console.error(`${provider} signup error:`, error);
        showToast(`${provider} signup failed. Please try again.`, 'error');
    }
}

// ====================
// ERROR HANDLING
// ====================

function handleSignupError(error) {
    let message = 'Signup failed. Please try again.';
    let type = 'error';
    
    if (error.message.includes('already registered') || error.message.includes('already exists')) {
        message = 'This email is already registered. Please sign in instead.';
    } else if (error.message.includes('weak password')) {
        message = 'Password is too weak. Please use a stronger password with at least 8 characters including uppercase, lowercase, numbers, and special characters.';
    } else if (error.message.includes('Invalid email')) {
        message = 'Please enter a valid email address.';
    } else if (error.message.includes('rate limit')) {
        message = 'Too many signup attempts. Please try again in 15 minutes.';
    } else if (error.message.includes('network')) {
        message = 'Network error. Please check your internet connection.';
    } else if (error.message.includes('User already registered')) {
        message = 'An account with this email already exists. Please sign in or use a different email.';
        type = 'warning';
    }
    
    showToast(message, type);
    
    // Add error animation to form
    const form = document.getElementById('signupForm');
    form.classList.add('error-shake');
    setTimeout(() => {
        form.classList.remove('error-shake');
    }, 500);
}

// ====================
// LOADING STATE
// ====================

function setLoadingState(button, isLoading, loadingText = 'Processing...') {
    if (!button) return;
    
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `
            <span class="btn-content">
                <i class="fas fa-spinner fa-spin"></i>
                <span>${loadingText}</span>
            </span>
        `;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

// ====================
// TOAST NOTIFICATIONS
// ====================

function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toastId = 'toast-' + Date.now();
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="removeToast('${toastId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
        removeToast(toastId);
    }, duration);
    
    return toastId;
}

function getToastIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
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

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

// ====================
// SESSION CHECK
// ====================

async function checkExistingSession() {
    try {
        const { user } = await sessionManager.getCurrentUser();
        if (user) {
            showToast('You are already signed in. Redirecting to dashboard...', 'info');
            setTimeout(() => {
                window.location.href = '../../user/dashboard.html';
            }, 2000);
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// ====================
// GLOBAL FUNCTIONS
// ====================

// Make some functions available globally
window.removeToast = removeToast;
window.resendVerificationEmail = async function(email) {
    try {
        showToast('Resending verification email...', 'info');
        
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
            options: {
                emailRedirectTo: `${window.location.origin}/pages/auth/verify-email.html`
            }
        });
        
        if (error) throw error;
        
        showToast('Verification email resent! Check your inbox.', 'success');
        
    } catch (error) {
        console.error('Resend error:', error);
        showToast('Failed to resend email. Please try again.', 'error');
    }
};

// ====================
// ADDITIONAL STYLES
// ====================

// Add error shake animation
const errorStyle = document.createElement('style');
errorStyle.textContent = `
    @keyframes errorShake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .error-shake {
        animation: errorShake 0.5s ease-in-out;
    }
    
    @keyframes toastSlideOut {
        to {
            transform: translateX(120%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(errorStyle);

// ====================
// INPUT ENHANCEMENTS
// ====================

// Add real-time email validation
const emailInput = document.getElementById('email');
if (emailInput) {
    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        if (email && !utils.validateEmail(email)) {
            emailInput.style.borderColor = 'var(--danger)';
            emailInput.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.1)';
        } else if (email) {
            emailInput.style.borderColor = 'var(--success)';
            emailInput.style.boxShadow = '0 0 0 3px rgba(46, 204, 113, 0.1)';
        }
    });
}

// Add input focus effects
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
});

// ====================
// PERFORMANCE MONITORING
// ====================

const pageLoadTime = performance.now();
window.addEventListener('load', () => {
    const loadTime = performance.now() - pageLoadTime;
    console.log(`Signup page loaded in ${loadTime.toFixed(2)}ms`);
    
    // Send performance data if analytics is enabled
    if (localStorage.getItem('analytics-enabled') !== 'false') {
        const perfData = {
            event: 'page_load',
            page: 'signup',
            load_time: loadTime,
            timestamp: new Date().toISOString()
        };
        // Could send to analytics service here
        console.log('Performance:', perfData);
    }
});

// ====================
// KEYBOARD SHORTCUTS
// ====================

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter submits the form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('signupForm').dispatchEvent(new Event('submit'));
    }
    
    // Escape key resets the form
    if (e.key === 'Escape') {
        if (confirm('Reset the form?')) {
            document.getElementById('signupForm').reset();
            updateProgressStep(0);
            showToast('Form reset', 'info');
        }
    }
});
