import { supabase, checkAuth, getCurrentUser, logout } from './supabase.js';

class AuthGuard {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
        this.isAdmin = false;
        this.publicPages = new Set([
            'login.html',
            'signup.html',
            'forgot-password.html',
            'index.html',
            'terms.html',
            'privacy.html',
            'contact.html'
        ]);
    }

    async initialize() {
        console.log('[Auth] Initializing auth guard...');
        
        // Check current page
        const currentPage = window.location.pathname.split('/').pop();
        
        // Check authentication
        const { user, profile } = await getCurrentUser();
        
        if (user) {
            this.currentUser = user;
            this.currentProfile = profile;
            this.isAdmin = this.checkAdmin(user.email);
            
            // Update UI
            this.updateUserInfo(user, profile);
            
            // Redirect from auth pages if logged in
            if (this.publicPages.has(currentPage) && currentPage !== 'index.html') {
                window.location.href = '/pages/user/dashboard.html';
                return;
            }
            
            // Check admin access for admin pages
            if (currentPage.includes('admin-') && !this.isAdmin) {
                window.location.href = '/pages/errors/403.html';
                return;
            }
        } else {
            // Not logged in - redirect to login if not public page
            if (!this.publicPages.has(currentPage) && currentPage !== 'index.html') {
                window.location.href = '/pages/auth/login.html';
                return;
            }
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Hide loading state
        this.hideLoading();
        
        console.log('[Auth] Auth guard initialized');
    }
    
    checkAdmin(email) {
        const adminEmails = [
            'admin@uzumaki.com',
            'superadmin@uzumaki.com'
            // Add more admin emails as needed
        ];
        return adminEmails.includes(email?.toLowerCase());
    }
    
    updateUserInfo(user, profile) {
        // Update user name elements
        document.querySelectorAll('#userName, #welcomeName').forEach(el => {
            if (el) el.textContent = profile?.full_name || user.email.split('@')[0];
        });
        
        // Update user email
        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = user.email;
        
        // Update user status
        const userStatusEl = document.getElementById('userStatus');
        if (userStatusEl) {
            userStatusEl.textContent = profile?.is_active ? 'Active' : 'Inactive';
            userStatusEl.className = profile?.is_active ? 'badge badge-success' : 'badge badge-danger';
        }
        
        // Update balances if elements exist
        const totalBalanceEl = document.getElementById('totalBalance');
        const availableBalanceEl = document.getElementById('availableBalance');
        const totalInvestedEl = document.getElementById('totalInvested');
        const totalEarningsEl = document.getElementById('totalEarnings');
        
        if (totalBalanceEl) {
            totalBalanceEl.textContent = this.formatCurrency(profile?.balance || 0);
        }
        if (availableBalanceEl) {
            availableBalanceEl.textContent = this.formatCurrency(profile?.available_balance || 0);
        }
        
        // Update VIP badge
        const vipBadge = document.querySelector('.sidebar-vip');
        if (vipBadge) {
            vipBadge.textContent = profile?.is_vip ? 'VIP Member' : 'Basic Member';
            vipBadge.style.background = profile?.is_vip 
                ? 'linear-gradient(135deg, #FFD700, #FFB300)' 
                : '#e0e0e0';
        }
    }
    
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount || 0);
    }
    
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await logout();
            });
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
            
            // Load saved theme
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.body.setAttribute('data-theme', savedTheme);
            themeToggle.innerHTML = savedTheme === 'dark' 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
        }
        
        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-open');
            });
        }
        
        // Notifications
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsModal = document.getElementById('notificationsModal');
        if (notificationsBtn && notificationsModal) {
            notificationsBtn.addEventListener('click', () => {
                notificationsModal.classList.add('active');
            });
            
            notificationsModal.addEventListener('click', (e) => {
                if (e.target === notificationsModal) {
                    notificationsModal.classList.remove('active');
                }
            });
        }
        
        // Close modal on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal-backdrop');
                modals.forEach(modal => modal.classList.remove('active'));
            }
        });
    }
    
    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.innerHTML = newTheme === 'dark' 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
        }
    }
    
    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            setTimeout(() => {
                loadingState.style.opacity = '0';
                setTimeout(() => {
                    loadingState.style.display = 'none';
                }, 300);
            }, 500);
        }
    }
    
    // Public methods
    getUser() {
        return { user: this.currentUser, profile: this.currentProfile };
    }
    
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    getIsAdmin() {
        return this.isAdmin;
    }
}

// Create and export singleton instance
const authGuard = new AuthGuard();
export default authGuard;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    authGuard.initialize();
});

// Export for global use
window.authGuard = authGuard;
