// core/auth.js
import { supabase } from './supabase.js';
import { showToast, showLoading, hideLoading } from './utils.js';

class AuthGuard {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
        this.publicPages = [
            'index.html',
            'login.html', 
            'signup.html',
            'forgot-password.html',
            'reset-password.html',
            'terms.html',
            'privacy.html',
            'contact.html'
        ];
        
        this.init();
    }

    async init() {
        console.log('[AuthGuard] Initializing...');
        
        try {
            // Get current session
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('[AuthGuard] Session error:', error);
                this.handleUnauthenticated();
                return;
            }
            
            if (!session) {
                this.handleUnauthenticated();
                return;
            }
            
            this.currentUser = session.user;
            await this.loadUserProfile();
            
        } catch (error) {
            console.error('[AuthGuard] Initialization error:', error);
            this.handleUnauthenticated();
        }
    }

    async loadUserProfile() {
        try {
            if (!this.currentUser) return;
            
            // Get user profile from database
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();
            
            if (error) {
                // Profile doesn't exist, create one
                if (error.code === 'PGRST116') {
                    await this.createUserProfile();
                    return;
                }
                throw error;
            }
            
            this.currentProfile = profile;
            
            // Update UI
            this.updateUI();
            
            console.log('[AuthGuard] Profile loaded:', profile);
            
        } catch (error) {
            console.error('[AuthGuard] Profile load error:', error);
            showToast('Failed to load user profile', 'error');
        }
    }

    async createUserProfile() {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .insert({
                    id: this.currentUser.id,
                    email: this.currentUser.email,
                    full_name: this.currentUser.user_metadata?.full_name || 
                               this.currentUser.email?.split('@')[0] || 'User',
                    avatar_url: this.currentUser.user_metadata?.avatar_url || null,
                    balance: 0,
                    tier: 'standard',
                    is_verified: false,
                    referral_code: this.generateReferralCode(),
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            this.currentProfile = profile;
            console.log('[AuthGuard] Profile created:', profile);
            
        } catch (error) {
            console.error('[AuthGuard] Profile creation error:', error);
            showToast('Failed to create user profile', 'error');
        }
    }

    generateReferralCode() {
        return 'UZ' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    handleUnauthenticated() {
        const currentPage = window.location.pathname.split('/').pop();
        const isPublicPage = this.publicPages.includes(currentPage);
        
        if (!isPublicPage && !currentPage.includes('.html')) {
            // Handle index page
            if (window.location.pathname.endsWith('/')) {
                return;
            }
        }
        
        if (!isPublicPage) {
            console.log('[AuthGuard] Redirecting to login...');
            window.location.href = '/pages/auth/login.html';
        }
    }

    updateUI() {
        if (!this.currentUser || !this.currentProfile) return;
        
        // Update all user name elements
        const userNameElements = document.querySelectorAll('.user-name, #sidebarUserName, #mobileUserName, #welcomeUserName');
        const userName = this.currentProfile.full_name || 
                        this.currentUser.email?.split('@')[0] || 
                        'User';
        
        userNameElements.forEach(el => {
            if (el) el.textContent = userName;
        });
        
        // Update all email elements
        const emailElements = document.querySelectorAll('.user-email, #sidebarUserEmail, #mobileUserEmail');
        const userEmail = this.currentUser.email || 'user@example.com';
        
        emailElements.forEach(el => {
            if (el) el.textContent = userEmail;
        });
        
        // Update tier badges
        const tierElements = document.querySelectorAll('.tier-badge, #userTier, #mobileUserTier');
        const userTier = this.currentProfile.tier || 'Standard';
        
        tierElements.forEach(el => {
            if (el) {
                el.textContent = userTier;
                el.className = `tier-badge ${userTier.toLowerCase()}`;
            }
        });
        
        // Update avatar images
        const avatarImgs = document.querySelectorAll('#userAvatarImg, #mobileUserAvatarImg');
        const avatarFallbacks = document.querySelectorAll('#userAvatarFallback, #mobileUserAvatarFallback');
        
        if (this.currentProfile.avatar_url) {
            avatarImgs.forEach(img => {
                if (img) {
                    img.src = this.currentProfile.avatar_url;
                    img.style.display = 'block';
                }
            });
            avatarFallbacks.forEach(fallback => {
                if (fallback) fallback.style.display = 'none';
            });
        } else {
            avatarImgs.forEach(img => {
                if (img) img.style.display = 'none';
            });
            avatarFallbacks.forEach(fallback => {
                if (fallback) {
                    fallback.textContent = userName.charAt(0).toUpperCase();
                    fallback.style.display = 'flex';
                }
            });
        }
        
        // Update verification badge
        const verifiedBadge = document.getElementById('userVerified');
        if (verifiedBadge) {
            verifiedBadge.style.display = this.currentProfile.is_verified ? 'inline-flex' : 'none';
        }
        
        // Update welcome message
        const welcomeName = document.getElementById('welcomeUserName');
        if (welcomeName) {
            welcomeName.textContent = userName;
        }
        
        // Update referral link
        const referralLink = document.getElementById('referralLink');
        if (referralLink && this.currentProfile.referral_code) {
            referralLink.value = `https://uzumaki.in/ref/${this.currentProfile.referral_code}`;
        }
    }

    async checkAuth() {
        return new Promise(async (resolve) => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error || !session) {
                    this.handleUnauthenticated();
                    resolve(false);
                    return;
                }
                
                this.currentUser = session.user;
                
                if (!this.currentProfile) {
                    await this.loadUserProfile();
                }
                
                resolve(true);
                
            } catch (error) {
                console.error('[AuthGuard] Check auth error:', error);
                this.handleUnauthenticated();
                resolve(false);
            }
        });
    }

    async logout() {
        try {
            showLoading('Logging out...');
            
            // Clear local data
            this.currentUser = null;
            this.currentProfile = null;
            
            // Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            
            if (error) throw error;
            
            // Redirect to login page
            window.location.href = '/pages/auth/login.html';
            
        } catch (error) {
            console.error('[AuthGuard] Logout error:', error);
            showToast('Logout failed. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    getUser() {
        return {
            user: this.currentUser,
            profile: this.currentProfile
        };
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getUserId() {
        return this.currentUser?.id;
    }

    getProfile() {
        return this.currentProfile;
    }
}

// Create singleton instance
const authGuard = new AuthGuard();

// Export for use in other modules
export default authGuard;

// Global functions for HTML event handlers
window.handleLogout = async () => {
    await authGuard.logout();
};

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[AuthGuard] DOM loaded, checking auth...');
    
    // Set up logout buttons
    const logoutButtons = [
        document.getElementById('sidebarLogout'),
        document.getElementById('mobileLogoutBtn'),
        document.getElementById('logoutBtn')
    ];
    
    logoutButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', window.handleLogout);
        }
    });
    
    // Check auth for protected pages
    const currentPage = window.location.pathname.split('/').pop();
    const isProtectedPage = !authGuard.publicPages.includes(currentPage);
    
    if (isProtectedPage) {
        const isAuthenticated = await authGuard.checkAuth();
        
        if (!isAuthenticated) {
            // Redirect will happen in checkAuth
            return;
        }
        
        // Update UI with user data
        authGuard.updateUI();
    }
});

// Listen for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[AuthGuard] Auth state changed:', event);
    
    switch (event) {
        case 'SIGNED_IN':
            authGuard.currentUser = session.user;
            await authGuard.loadUserProfile();
            showToast('Successfully signed in!', 'success');
            break;
            
        case 'SIGNED_OUT':
            authGuard.currentUser = null;
            authGuard.currentProfile = null;
            
            // Only redirect if not on a public page
            const currentPage = window.location.pathname.split('/').pop();
            const isPublicPage = authGuard.publicPages.includes(currentPage);
            
            if (!isPublicPage) {
                window.location.href = '/pages/auth/login.html';
            }
            break;
            
        case 'USER_UPDATED':
            authGuard.currentUser = session.user;
            authGuard.updateUI();
            break;
            
        case 'TOKEN_REFRESHED':
            console.log('[AuthGuard] Token refreshed');
            break;
    }
});
