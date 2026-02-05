import { sessionManager, dbService, utils, supabase } from './supabase.js';

class AuthGuard {
    constructor() {
        this.currentPage = window.location.pathname.split('/').pop();
        this.publicPages = new Set([
            'index.html',
            'login.html',
            'signup.html',
            'forgot-password.html',
            'terms.html',
            'privacy-policy.html',
            'contact.html',
            'refund.html'
        ]);
        
        this.adminPages = new Set([
            'admin-dashboard.html',
            'admin-users.html',
            'admin-investments.html',
            'admin-withdrawals.html',
            'admin-logs.html',
            'admin-settings.html'
        ]);
        
        this.init();
    }

    async init() {
        try {
            // Initialize session manager first
            await sessionManager.initialize();
            
            // Wait for session to load properly
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check auth status with retry
            let attempts = 0;
            let user = null;
            let profile = null;
            
            while (attempts < 3) {
                try {
                    const result = await sessionManager.getCurrentUser();
                    user = result.user;
                    profile = result.profile;
                    
                    if (user || attempts === 2) break;
                    
                    // Wait and retry
                    await new Promise(resolve => setTimeout(resolve, 300));
                    attempts++;
                } catch (error) {
                    console.warn(`Auth check attempt ${attempts + 1} failed:`, error.message);
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            
            // Handle page access
            await this.handlePageAccess(user, profile);
            
            // Update UI based on auth state
            this.updateUI(user, profile);
            
            // Setup auth state listener with proper error handling
            sessionManager.subscribe((event, user, profile) => {
                console.log(`[AuthGuard] Auth changed: ${event}`, user ? 'User logged in' : 'No user');
                this.handleAuthChange(event, user, profile);
            });
            
            // Setup inactivity timer
            this.setupInactivityTimer();
            
        } catch (error) {
            console.error('[AuthGuard] Initialization error:', error);
            // Fallback: redirect to login if not on public page
            const currentPage = window.location.pathname.split('/').pop();
            if (!this.publicPages.has(currentPage)) {
                window.location.href = '/pages/auth/login.html';
            }
        }
    }

    async handlePageAccess(user, profile) {
        const isPublicPage = this.publicPages.has(this.currentPage);
        const isAdminPage = this.adminPages.has(this.currentPage);
        
        console.log(`[AuthGuard] Page: ${this.currentPage}, User: ${user ? user.email : 'none'}, Public: ${isPublicPage}`);
        
        // Redirect logic
        if (!user && !isPublicPage) {
            // Not logged in and not on public page
            console.log('[AuthGuard] Not logged in, redirecting to login');
            window.location.href = '/pages/auth/login.html';
            return;
        }
        
        if (user && isPublicPage && this.currentPage !== 'index.html') {
            // Logged in but on auth page (except index)
            console.log('[AuthGuard] Already logged in, redirecting to dashboard');
            window.location.href = '/pages/user/dashboard.html';
            return;
        }
        
        if (user && isAdminPage) {
            // Check if user is admin
            try {
                const isAdmin = await sessionManager.isAdmin();
                if (!isAdmin) {
                    console.log('[AuthGuard] Not admin, redirecting to 403');
                    window.location.href = '/pages/errors/403.html';
                    return;
                }
            } catch (error) {
                console.error('[AuthGuard] Admin check failed:', error);
                window.location.href = '/pages/errors/403.html';
                return;
            }
        }
    }

    updateUI(user, profile) {
        try {
            if (user) {
                console.log('[AuthGuard] Updating UI for logged in user:', user.email);
                
                // Update user info in header/sidebar
                this.updateUserElements(user, profile);
                
                // Show user-specific elements
                document.querySelectorAll('.auth-only').forEach(el => {
                    el.style.display = '';
                });
                
                // Hide auth buttons
                document.querySelectorAll('.no-auth').forEach(el => {
                    el.style.display = 'none';
                });
                
                // Show logout button if exists
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.style.display = '';
                    logoutBtn.onclick = window.logout;
                }
            } else {
                console.log('[AuthGuard] Updating UI for logged out state');
                
                // Show auth buttons
                document.querySelectorAll('.no-auth').forEach(el => {
                    el.style.display = '';
                });
                
                // Hide user-specific elements
                document.querySelectorAll('.auth-only').forEach(el => {
                    el.style.display = 'none';
                });
                
                // Hide logout button
                const logoutBtn = document.getElementById('logoutBtn');
                if (logoutBtn) {
                    logoutBtn.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('[AuthGuard] UI update error:', error);
        }
    }

    updateUserElements(user, profile) {
        try {
            // Update user name
            document.querySelectorAll('.user-name').forEach(el => {
                if (el) {
                    el.textContent = profile?.full_name || user.email?.split('@')[0] || 'User';
                }
            });
            
            // Update user email
            document.querySelectorAll('.user-email').forEach(el => {
                if (el) {
                    el.textContent = user.email || '';
                }
            });
            
            // Update user balance
            document.querySelectorAll('.user-balance').forEach(el => {
                if (el && profile) {
                    el.textContent = utils.formatCurrency(profile.balance || 0);
                }
            });
            
            // Update user avatar
            document.querySelectorAll('.user-avatar').forEach(el => {
                if (el && profile?.avatar_url) {
                    el.style.backgroundImage = `url(${profile.avatar_url})`;
                    el.innerHTML = ''; // Clear initials
                } else if (el) {
                    const initials = (profile?.full_name || 'U').charAt(0).toUpperCase();
                    el.innerHTML = `<span>${initials}</span>`;
                }
            });
            
            // Update VIP status
            document.querySelectorAll('.vip-badge').forEach(el => {
                if (el) {
                    if (profile?.is_vip) {
                        el.style.display = '';
                        el.textContent = 'VIP';
                        el.className = 'vip-badge active';
                    } else {
                        el.style.display = 'none';
                    }
                }
            });
        } catch (error) {
            console.error('[AuthGuard] User elements update error:', error);
        }
    }

    handleAuthChange(event, user, profile) {
        console.log(`[AuthGuard] Auth changed: ${event}`, user ? user.email : 'No user');
        
        switch (event) {
            case 'SIGNED_IN':
                this.updateUI(user, profile);
                if (this.publicPages.has(this.currentPage) && this.currentPage !== 'index.html') {
                    window.location.href = '/pages/user/dashboard.html';
                }
                break;
                
            case 'SIGNED_OUT':
                this.updateUI(null, null);
                if (!this.publicPages.has(this.currentPage)) {
                    window.location.href = '/pages/auth/login.html';
                }
                break;
                
            case 'USER_UPDATED':
                this.updateUI(user, profile);
                break;
                
            case 'TOKEN_REFRESHED':
                // Session was refreshed, nothing to do
                break;
        }
    }

    setupInactivityTimer() {
        let inactivityTimer;
        const logoutTime = 30 * 60 * 1000; // 30 minutes
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                this.handleInactive();
            }, logoutTime);
        };
        
        // Events that reset the timer
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        resetTimer(); // Start the timer
    }

    async handleInactive() {
        try {
            const { user } = await sessionManager.getCurrentUser();
            if (user) {
                console.log('[AuthGuard] Logging out due to inactivity');
                utils.showToast('You have been logged out due to inactivity', 'warning');
                await sessionManager.logout();
            }
        } catch (error) {
            console.error('[AuthGuard] Inactivity handler error:', error);
        }
    }

    // Public methods
    async requireAuth() {
        try {
            await sessionManager.initialize();
            const { user } = await sessionManager.getCurrentUser();
            if (!user) {
                console.log('[AuthGuard] requireAuth: No user, redirecting');
                window.location.href = '/pages/auth/login.html';
                return false;
            }
            return true;
        } catch (error) {
            console.error('[AuthGuard] requireAuth error:', error);
            window.location.href = '/pages/auth/login.html';
            return false;
        }
    }

    async requireAdmin() {
        try {
            await sessionManager.initialize();
            const isAdmin = await sessionManager.isAdmin();
            if (!isAdmin) {
                console.log('[AuthGuard] requireAdmin: Not admin');
                window.location.href = '/pages/errors/403.html';
                return false;
            }
            return true;
        } catch (error) {
            console.error('[AuthGuard] requireAdmin error:', error);
            window.location.href = '/pages/errors/403.html';
            return false;
        }
    }

    async getCurrentUser() {
        try {
            await sessionManager.initialize();
            return await sessionManager.getCurrentUser();
        } catch (error) {
            console.error('[AuthGuard] getCurrentUser error:', error);
            return { user: null, profile: null };
        }
    }
}

// Initialize auth guard
const authGuard = new AuthGuard();

// Export for use in other modules
export default authGuard;

// Global logout function
window.logout = async () => {
    try {
        console.log('[AuthGuard] Logout initiated');
        utils.showLoading();
        await sessionManager.logout();
        console.log('[AuthGuard] Logout successful');
    } catch (error) {
        console.error('[AuthGuard] Logout error:', error);
        utils.showToast('Logout failed. Please try again.', 'error');
    } finally {
        utils.hideLoading();
    }
};

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('[AuthGuard] DOM loaded, initializing auth UI');
    
    // Add logout button listener if exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.logout();
        });
    }
    
    // Add user menu functionality
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', () => {
            userMenu.classList.remove('show');
        });
    }
    
    // Check if we're on a public page and update UI accordingly
    setTimeout(() => {
        const currentPage = window.location.pathname.split('/').pop();
        const isPublicPage = ['index.html', 'login.html', 'signup.html', 'forgot-password.html'].includes(currentPage);
        
        if (isPublicPage) {
            // Check if already logged in and redirect
            sessionManager.getCurrentUser().then(({ user }) => {
                if (user && currentPage !== 'index.html') {
                    console.log('[AuthGuard] Already logged in on public page, redirecting');
                    setTimeout(() => {
                        window.location.href = '/pages/user/dashboard.html';
                    }, 1000);
                }
            });
        }
    }, 1000);
});
