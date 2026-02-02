import { sessionManager, dbService, utils } from './supabase.js';

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
        // Check auth status
        const { user, profile } = await sessionManager.getCurrentUser();
        
        // Handle page access
        await this.handlePageAccess(user, profile);
        
        // Update UI based on auth state
        this.updateUI(user, profile);
        
        // Setup auth state listener
        sessionManager.subscribe((event, user, profile) => {
            this.handleAuthChange(event, user, profile);
        });
        
        // Setup inactivity timer
        this.setupInactivityTimer();
    }

    async handlePageAccess(user, profile) {
        const isPublicPage = this.publicPages.has(this.currentPage);
        const isAdminPage = this.adminPages.has(this.currentPage);
        
        // Redirect logic
        if (!user && !isPublicPage) {
            // Not logged in and not on public page
            window.location.href = '/pages/auth/login.html';
            return;
        }
        
        if (user && isPublicPage && this.currentPage !== 'index.html') {
            // Logged in but on auth page (except index)
            window.location.href = '/pages/user/dashboard.html';
            return;
        }
        
        if (user && isAdminPage) {
            // Check if user is admin
            const isAdmin = await sessionManager.isAdmin();
            if (!isAdmin) {
                window.location.href = '/pages/errors/403.html';
                return;
            }
        }
    }

    updateUI(user, profile) {
        if (user) {
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
        } else {
            // Show auth buttons
            document.querySelectorAll('.no-auth').forEach(el => {
                el.style.display = '';
            });
            
            // Hide user-specific elements
            document.querySelectorAll('.auth-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    }

    updateUserElements(user, profile) {
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
    }

    handleAuthChange(event, user, profile) {
        console.log(`[AuthGuard] Auth changed: ${event}`);
        
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
        const { user } = await sessionManager.getCurrentUser();
        if (user) {
            utils.showToast('You have been logged out due to inactivity', 'warning');
            await sessionManager.logout();
        }
    }

    // Public methods
    async requireAuth() {
        const { user } = await sessionManager.getCurrentUser();
        if (!user) {
            window.location.href = '/pages/auth/login.html';
            return false;
        }
        return true;
    }

    async requireAdmin() {
        const isAdmin = await sessionManager.isAdmin();
        if (!isAdmin) {
            window.location.href = '/pages/errors/403.html';
            return false;
        }
        return true;
    }

    getCurrentUser() {
        return sessionManager.getCurrentUser();
    }
}

// Initialize auth guard
const authGuard = new AuthGuard();

// Export for use in other modules
export default authGuard;

// Global logout function
window.logout = async () => {
    try {
        utils.showLoading();
        await sessionManager.logout();
    } catch (error) {
        utils.showToast('Logout failed. Please try again.', 'error');
    } finally {
        utils.hideLoading();
    }
};

// Check auth on page load
document.addEventListener('DOMContentLoaded', () => {
    // Add logout button listener if exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', window.logout);
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
});
