import { sessionManager, dbService, utils } from '../../core/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('rememberMe');

    // Toggle password visibility
    togglePassword?.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });

    // Handle form submission
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        // Validate inputs
        if (!utils.validateEmail(email)) {
            utils.showToast('Please enter a valid email address', 'error');
            return;
        }
        
        if (password.length < 6) {
            utils.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            // Show loading
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';
            
            // Sign in with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            // Check if user exists in profiles table
            const profile = await dbService.getUserProfile(data.user.id);
            
            if (!profile) {
                // Create user profile if doesn't exist
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
            
            // Show success message
            utils.showToast('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = '/pages/user/dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Show appropriate error message
            let message = 'Login failed. Please check your credentials.';
            
            if (error.message.includes('Invalid login credentials')) {
                message = 'Invalid email or password.';
            } else if (error.message.includes('Email not confirmed')) {
                message = 'Please verify your email first.';
            } else if (error.message.includes('rate limit')) {
                message = 'Too many attempts. Please try again later.';
            }
            
            utils.showToast(message, 'error');
            
            // Reset button
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    });

    // Social login handlers
    document.querySelector('.btn-google')?.addEventListener('click', async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/pages/user/dashboard.html`
                }
            });
            
            if (error) throw error;
        } catch (error) {
            utils.showToast('Google login failed. Please try again.', 'error');
        }
    });

    document.querySelector('.btn-github')?.addEventListener('click', async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${window.location.origin}/pages/user/dashboard.html`
                }
            });
            
            if (error) throw error;
        } catch (error) {
            utils.showToast('GitHub login failed. Please try again.', 'error');
        }
    });

    // Auto-fill demo accounts for testing
    document.querySelectorAll('.demo-account').forEach(account => {
        account.addEventListener('click', () => {
            const email = account.querySelector('p:nth-child(2)').textContent.replace('Email: ', '');
            const password = account.querySelector('p:nth-child(3)').textContent.replace('Password: ', '');
            
            document.getElementById('email').value = email;
            document.getElementById('password').value = password;
            
            utils.showToast('Demo credentials filled. Click Sign In to continue.', 'info');
        });
    });

    // Check if already logged in
    (async () => {
        const { user } = await sessionManager.getCurrentUser();
        if (user) {
            window.location.href = '/pages/user/dashboard.html';
        }
    })();
});
