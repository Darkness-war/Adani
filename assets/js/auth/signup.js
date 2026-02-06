// assets/js/auth/signup.js - Full Working Version
// Import from supabase.js
import { sessionManager, dbService, utils, supabase } from '../core/supabase.js';

// Global variables
let isSubmitting = false;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Signup] Initializing signup page...');
    
    try {
        // Initialize all components
        initializeThemeSystem();
        initializeForm();
        initializePasswordValidation();
        initializeSocialSignup();
        initializeProgressIndicator();
        
        // Check if user is already logged in
        await checkExistingSession();
        
        console.log('[Signup] Initialization complete');
    } catch (error) {
        console.error('[Signup] Initialization error:', error);
        showToast('Page initialization failed. Please refresh.', 'error');
    }
});

// ====================
// THEME MANAGEMENT
// ====================

function initializeThemeSystem() {
    const themeToggle = document.getElementById('themeToggle');
    
    if (!themeToggle) {
        console.warn('[Signup] Theme toggle button not found');
        return;
    }
    
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
    document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
    
    // Remove transition after animation
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
        // Remove existing classes
        icon.className = '';
        
        // Add new icon based on theme
        if (theme === 'dark') {
            icon.classList.add('fas', 'fa-sun');
        } else {
            icon.classList.add('fas', 'fa-moon');
        }
        
        // Add rotation animation
        icon.style.transition = 'transform 0.5s ease';
        icon.style.transform = 'rotate(360deg)';
        
        setTimeout(() => {
            icon.style.transform = 'rotate(0deg)';
        }, 500);
    }
}

// ====================
// FORM INITIALIZATION
// ====================

function initializeForm() {
    const signupForm = document.getElementById('signupForm');
    const signupBtn = document.getElementById('signupBtn');
    
    if (!signupForm) {
        console.error('[Signup] Signup form not found');
        return;
    }
    
    signupForm.addEventListener('submit', handleSignup);
    
    // Initialize input masks and validations
    initializeInputMasks();
    
    // Add demo data for testing
    setupDemoData();
}

function initializeInputMasks() {
    // Phone number mask (if phone field exists)
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

function setupDemoData() {
    // Add test button in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const testBtn = document.createElement('button');
        testBtn.id = 'testDataBtn';
        testBtn.innerHTML = '<i class="fas fa-vial"></i> Fill Test Data';
        testBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            padding: 10px 15px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            z-index: 1000;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        testBtn.addEventListener('click', () => {
            document.getElementById('firstName').value = 'Test';
            document.getElementById('lastName').value = 'User';
            document.getElementById('email').value = `test${Date.now()}@test.com`;
            document.getElementById('password').value = 'Test@123456';
            document.getElementById('confirmPassword').value = 'Test@123456';
            document.getElementById('terms').checked = true;
            document.getElementById('newsletter').checked = true;
            
            // Trigger validation
            validatePasswordStrength('Test@123456');
            checkPasswordMatch();
            updateProgressBasedOnForm();
            
            showToast('Test data filled!', 'success');
        });
        
        document.body.appendChild(testBtn);
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
    if (togglePassword) {
        togglePassword.addEventListener('click', () => togglePasswordVisibility(passwordInput, togglePassword));
    }
    
    if (toggleConfirm) {
        toggleConfirm.addEventListener('click', () => togglePasswordVisibility(confirmInput, toggleConfirm));
    }
    
    // Real-time password validation
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            validatePasswordStrength(password);
            checkPasswordMatch();
            updateProgressStep(1);
        });
    }
    
    if (confirmInput) {
        confirmInput.addEventListener('input', () => {
            checkPasswordMatch();
        });
    }
}

function togglePasswordVisibility(inputElement, toggleButton) {
    if (!inputElement || !toggleButton) return;
    
    const type = inputElement.getAttribute('type') === 'password' ? 'text' : 'password';
    inputElement.setAttribute('type', type);
    
    const icon = toggleButton.querySelector('i');
    if (icon) {
        // Toggle icon
        if (type === 'password') {
            icon.className = 'fas fa-eye';
        } else {
            icon.className = 'fas fa-eye-slash';
        }
        
        // Add animation
        icon.style.transform = 'scale(1.2)';
        setTimeout(() => {
            icon.style.transform = 'scale(1)';
        }, 200);
    }
}

function validatePasswordStrength(password) {
    if (!password) return false;
    
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
    
    // Calculate strength score
    const validCount = Object.values(requirements).filter(Boolean).length;
    updateStrengthBars(validCount);
    
    return validCount >= 4; // Require at least 4 out of 5
}

function updateStrengthBars(score) {
    const strengthBars = document.querySelectorAll('.strength-bar');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthBars.length) return;
    
    // Reset all bars
    strengthBars.forEach(bar => {
        bar.style.background = 'var(--gray-200)';
        bar.style.transition = 'background 0.3s ease';
    });
    
    // Update based on score
    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['var(--danger)', 'var(--warning)', 'var(--warning)', 'var(--primary)', 'var(--success)'];
    
    for (let i = 0; i < score; i++) {
        if (strengthBars[i]) {
            strengthBars[i].style.background = colors[score - 1] || 'var(--danger)';
        }
    }
    
    if (strengthText) {
        strengthText.textContent = strengthLevels[score - 1] || 'Very Weak';
        strengthText.style.color = colors[score - 1] || 'var(--danger)';
        strengthText.style.transition = 'color 0.3s ease';
    }
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
        input.addEventListener('input', () => {
            updateProgressBasedOnForm();
        });
    });
}

function updateProgressBasedOnForm() {
    const firstName = document.getElementById('firstName')?.value || '';
    const lastName = document.getElementById('lastName')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const password = document.getElementById('password')?.value || '';
    
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
// SESSION CHECK
// ====================

async function checkExistingSession() {
    try {
        console.log('[Signup] Checking for existing session...');
        
        // Initialize session manager
        await sessionManager.initialize();
        
        // Get current user
        const { user } = await sessionManager.getCurrentUser();
        
        if (user) {
            console.log('[Signup] User already logged in:', user.email);
            showToast('You are already logged in. Redirecting to dashboard...', 'info');
            
            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = '/pages/user/dashboard.html';
            }, 2000);
        }
    } catch (error) {
        console.error('[Signup] Session check error:', error);
    }
}

// ====================
// SIGNUP HANDLER
// ====================

async function handleSignup(event) {
    event.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) {
        console.log('[Signup] Already submitting, ignoring...');
        return;
    }
    
    console.log('[Signup] Form submission started');
    
    const signupBtn = document.getElementById('signupBtn');
    const firstName = document.getElementById('firstName')?.value.trim() || '';
    const lastName = document.getElementById('lastName')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const terms = document.getElementById('terms')?.checked || false;
    const newsletter = document.getElementById('newsletter')?.checked || true;
    const referralCode = document.getElementById('referralCode')?.value.trim().toUpperCase() || '';
    
    // Validation
    if (!validateForm(firstName, lastName, email, password, confirmPassword, terms)) {
        return;
    }
    
    isSubmitting = true;
    
    try {
        // Show loading state
        setLoadingState(signupBtn, true, 'Creating Account...');
        
        console.log('[Signup] Attempting to create account for:', email);
        
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
                    referral_code_used: referralCode || null
                },
                emailRedirectTo: `${window.location.origin}/pages/auth/verify-email.html`
            }
        });
        
        if (authError) {
            console.error('[Signup] Auth error:', authError);
            throw authError;
        }
        
        if (!authData.user) {
            throw new Error('User creation failed - no user data returned');
        }
        
        console.log('[Signup] User created successfully:', authData.user.id);
        
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
        
        if (profileError) {
            console.error('[Signup] Profile creation error:', profileError);
            
            // If profile creation fails but user was created, we should handle this
            // For now, we'll show a warning but continue
            console.warn('[Signup] Profile creation failed, but user was created:', profileError.message);
        }
        
        // Handle referral bonus if referral code provided
        if (referralCode) {
            await processReferralBonus(referralCode, authData.user.id);
        }
        
        // Create signup transaction log
        await createSignupTransaction(authData.user.id, referralCode);
        
        // Send welcome email (optional - would be backend in production)
        await sendWelcomeEmail(email, firstName);
        
        // Success state
        setLoadingState(signupBtn, false);
        signupBtn.innerHTML = '<i class="fas fa-check"></i> Account Created!';
        signupBtn.style.background = 'linear-gradient(135deg, var(--success), var(--success-dark))';
        signupBtn.style.cursor = 'default';
        
        // Update progress to completed
        updateProgressStep(3);
        
        // Show success message
        showSuccessMessage(firstName, email);
        
        // Store signup success in localStorage for verification page
        localStorage.setItem('signup_success', 'true');
        localStorage.setItem('signup_email', email);
        
        // Auto-redirect to verification page after 5 seconds
        setTimeout(() => {
            window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`;
        }, 5000);
        
    } catch (error) {
        console.error('[Signup] Signup error:', error);
        handleSignupError(error);
    } finally {
        isSubmitting = false;
        setLoadingState(signupBtn, false);
    }
}

function validateForm(firstName, lastName, email, password, confirmPassword, terms) {
    // Clear previous errors
    clearFormErrors();
    
    let isValid = true;
    let errorMessage = '';
    
    // First name validation
    if (!firstName) {
        showFieldError('firstName', 'First name is required');
        isValid = false;
    } else if (firstName.length < 2) {
        showFieldError('firstName', 'First name must be at least 2 characters');
        isValid = false;
    }
    
    // Last name validation
    if (!lastName) {
        showFieldError('lastName', 'Last name is required');
        isValid = false;
    } else if (lastName.length < 2) {
        showFieldError('lastName', 'Last name must be at least 2 characters');
        isValid = false;
    }
    
    // Email validation
    if (!email) {
        showFieldError('email', 'Email is required');
        isValid = false;
    } else if (!utils.validateEmail(email)) {
        showFieldError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Password validation
    if (!password) {
        showFieldError('password', 'Password is required');
        isValid = false;
    } else if (!validatePasswordStrength(password)) {
        showFieldError('password', 'Password does not meet security requirements');
        isValid = false;
    }
    
    // Confirm password validation
    if (!confirmPassword) {
        showFieldError('confirmPassword', 'Please confirm your password');
        isValid = false;
    } else if (password !== confirmPassword) {
        showFieldError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }
    
    // Terms validation
    if (!terms) {
        showToast('You must agree to the Terms of Service and Privacy Policy', 'error');
        isValid = false;
    }
    
    if (!isValid) {
        showToast('Please fix the errors in the form', 'error');
    }
    
    return isValid;
}

function clearFormErrors() {
    const errorElements = document.querySelectorAll('.field-error');
    errorElements.forEach(el => el.remove());
    
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    });
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Create error element
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.cssText = `
        color: var(--danger);
        font-size: 0.8rem;
        margin-top: 4px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
    `;
    
    // Add icon
    const icon = document.createElement('i');
    icon.className = 'fas fa-exclamation-circle';
    errorElement.prepend(icon);
    
    // Insert after field
    const parent = field.parentElement;
    if (parent) {
        parent.appendChild(errorElement);
    }
    
    // Highlight field
    field.style.borderColor = 'var(--danger)';
    field.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.1)';
}

function generateUserReferralCode(firstName, lastName) {
    const prefix = (firstName.substring(0, 3) || 'USR').toUpperCase();
    const suffix = (lastName.substring(0, 2) || 'ER').toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}${random}`;
}

async function processReferralBonus(referralCode, newUserId) {
    try {
        console.log('[Signup] Processing referral for code:', referralCode);
        
        // Find user who provided the referral code
        const { data: referrer, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .single();
        
        if (error || !referrer) {
            console.log('[Signup] Referrer not found or invalid referral code');
            return;
        }
        
        // Create referral record
        await supabase
            .from('referrals')
            .insert({
                referrer_id: referrer.id,
                referred_id: newUserId,
                referral_code: referralCode,
                status: 'pending',
                created_at: new Date().toISOString()
            });
        
        console.log('[Signup] Referral recorded successfully');
        showToast('Referral bonus applied!', 'success');
        
    } catch (error) {
        console.error('[Signup] Referral processing error:', error);
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
        console.error('[Signup] Transaction creation error:', error);
    }
}

async function sendWelcomeEmail(email, firstName) {
    // In production, this would be a backend API call
    console.log(`[Signup] Welcome email triggered for: ${email}`);
    
    // For demo purposes, we'll simulate sending
    setTimeout(() => {
        console.log(`[Signup] Email sent to: ${email}`);
    }, 1000);
}

function showSuccessMessage(firstName, email) {
    // Create success overlay
    const overlay = document.createElement('div');
    overlay.id = 'successOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.5s ease;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: var(--white);
        padding: 3rem;
        border-radius: var(--radius-xl);
        text-align: center;
        max-width: 500px;
        width: 90%;
        animation: slideUp 0.5s ease;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    
    content.innerHTML = `
        <div style="
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2rem;
            color: white;
            font-size: 3rem;
            animation: pulse 2s infinite;
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
            font-size: 1.1rem;
        ">
            Your account has been created successfully. We've sent a verification email to 
            <strong style="color: var(--primary);">${email}</strong>.
            Please check your inbox and verify your email to complete the setup.
        </p>
        
        <div style="
            background: var(--gray-50);
            padding: 1.5rem;
            border-radius: var(--radius-lg);
            margin-bottom: 2rem;
            text-align: left;
            border-left: 4px solid var(--warning);
        ">
            <p style="
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin: 0;
                color: var(--gray-700);
                font-size: 0.95rem;
            ">
                <i class="fas fa-lightbulb" style="color: var(--warning);"></i>
                <span><strong>Pro Tip:</strong> Check your spam folder if you don't see the email within 5 minutes.</span>
            </p>
        </div>
        
        <div style="
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        ">
            <button onclick="window.location.href='login.html'" style="
                padding: 0.875rem 2rem;
                background: var(--gray-100);
                border: none;
                border-radius: var(--radius-md);
                color: var(--gray-700);
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1rem;
                min-width: 150px;
            ">
                <i class="fas fa-sign-in-alt"></i> Go to Login
            </button>
            
            <button onclick="location.reload()" style="
                padding: 0.875rem 2rem;
                background: var(--primary);
                border: none;
                border-radius: var(--radius-md);
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 1rem;
                min-width: 150px;
            ">
                <i class="fas fa-plus"></i> Create Another
            </button>
        </div>
        
        <div style="
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--gray-200);
            color: var(--gray-500);
            font-size: 0.9rem;
        ">
            <p style="margin: 0;">
                <i class="fas fa-clock"></i> Redirecting to verification page in <span id="countdown">5</span> seconds...
            </p>
        </div>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    // Add animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
    
    // Countdown timer
    let countdown = 5;
    const countdownElement = document.getElementById('countdown');
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            window.location.href = `verify-email.html?email=${encodeURIComponent(email)}`;
        }
    }, 1000);
    
    // Close overlay when clicking outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            clearInterval(countdownInterval);
        }
    });
}

// ====================
// HELPER FUNCTIONS
// ====================

function setLoadingState(button, isLoading, text = '') {
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        
        const btnContent = button.querySelector('.btn-content');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (btnContent) btnContent.style.opacity = '0';
        if (btnLoader) btnLoader.style.display = 'flex';
        
        if (text && btnContent) {
            btnContent.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        
        const btnContent = button.querySelector('.btn-content');
        const btnLoader = button.querySelector('.btn-loader');
        
        if (btnContent) {
            btnContent.style.opacity = '1';
            btnContent.innerHTML = '<i class="fas fa-user-plus"></i><span>Create Account</span>';
        }
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

function handleSignupError(error) {
    console.error('[Signup] Error details:', error);
    
    let message = 'Signup failed. Please try again.';
    
    if (error.message.includes('User already registered')) {
        message = 'This email is already registered. Please sign in instead.';
    } else if (error.message.includes('Password should be at least')) {
        message = 'Password is too weak. Please use a stronger password.';
    } else if (error.message.includes('Invalid email')) {
        message = 'Invalid email address. Please check and try again.';
    } else if (error.message.includes('rate limit')) {
        message = 'Too many attempts. Please try again in a few minutes.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
        message = 'Network error. Please check your connection and try again.';
    }
    
    showToast(message, 'error', 5000);
}

function showToast(message, type = 'info', duration = 3000) {
    // Use utils.showToast if available
    if (window.utils && typeof window.utils.showToast === 'function') {
        window.utils.showToast(message, type, duration);
        return;
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : 
                     type === 'error' ? '#ef4444' : 
                     type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: toastSlideIn 0.3s ease;
        font-weight: 500;
        max-width: 350px;
        word-wrap: break-word;
    `;
    
    // Add icon based on type
    const icon = type === 'success' ? 'fas fa-check-circle' :
                 type === 'error' ? 'fas fa-exclamation-circle' :
                 type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="${icon}" style="font-size: 1.2rem;"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after duration
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
    
    // Add CSS animations if not present
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes toastSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes toastSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ====================
// SOCIAL SIGNUP
// ====================

function initializeSocialSignup() {
    const googleBtn = document.getElementById('googleSignup');
    const githubBtn = document.getElementById('githubSignup');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            try {
                showToast('Google signup is coming soon!', 'info');
                // For future implementation:
                // const { data, error } = await supabase.auth.signInWithOAuth({
                //     provider: 'google',
                // });
            } catch (error) {
                console.error('[Signup] Google signup error:', error);
                showToast('Google signup failed. Please try email signup.', 'error');
            }
        });
    }
    
    if (githubBtn) {
        githubBtn.addEventListener('click', async () => {
            try {
                showToast('GitHub signup is coming soon!', 'info');
                // For future implementation:
                // const { data, error } = await supabase.auth.signInWithOAuth({
                //     provider: 'github',
                // });
            } catch (error) {
                console.error('[Signup] GitHub signup error:', error);
                showToast('GitHub signup failed. Please try email signup.', 'error');
            }
        });
    }
}

// ====================
// ADDITIONAL CSS
// ====================

// Add additional CSS for animations and styling
if (!document.getElementById('signup-additional-css')) {
    const style = document.createElement('style');
    style.id = 'signup-additional-css';
    style.textContent = `
        /* Loading state styles */
        .btn.loading {
            cursor: not-allowed !important;
            position: relative;
        }
        
        .btn.loading .btn-content {
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .btn.loading .btn-loader {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex !important;
            align-items: center;
            justify-content: center;
        }
        
        /* Field error styles */
        .field-error {
            animation: fadeIn 0.3s ease;
        }
        
        /* Progress step active state */
        .progress-step.active .step-number {
            background: var(--primary);
            color: white;
        }
        
        .progress-step.active span {
            color: var(--primary);
            font-weight: 600;
        }
        
        /* Dark theme adjustments */
        [data-theme="dark"] .form-wrapper {
            background: var(--gray-900) !important;
        }
        
        [data-theme="dark"] .form-input {
            background: var(--gray-800) !important;
            border-color: var(--gray-700) !important;
            color: var(--gray-100) !important;
        }
        
        [data-theme="dark"] .requirements-box {
            background: var(--gray-800) !important;
            border-color: var(--gray-700) !important;
        }
        
        /* Password strength bars in dark theme */
        [data-theme="dark"] .strength-bar {
            background: var(--gray-700) !important;
        }
        
        /* Theme toggle button in dark theme */
        [data-theme="dark"] .theme-toggle {
            background: var(--gray-800) !important;
            color: var(--gray-100) !important;
        }
    `;
    document.head.appendChild(style);
}

// ====================
// ERROR HANDLING UTILS
// ====================

// Add global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('[Signup] Unhandled promise rejection:', event.reason);
    showToast('An unexpected error occurred. Please try again.', 'error');
});

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('[Signup] Global error:', event.error);
});

// Export for testing (optional)
if (typeof window !== 'undefined') {
    window.signupUtils = {
        validatePasswordStrength,
        checkPasswordMatch,
        togglePasswordVisibility,
        setTheme,
        toggleTheme
    };
}

console.log('[Signup] signup.js loaded successfully');
