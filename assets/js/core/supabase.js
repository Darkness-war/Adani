// TO:
const SUPABASE_URL = 'https://atcfrcolbuikjnsoujzw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mUDZkzcq09gllPPjkG8pGQ_k6APV_gv';

// Initialize Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Session Management
class SessionManager {
    constructor() {
        this.user = null;
        this.profile = null;
        this.session = null;
        this.listeners = [];
    }

    async initialize() {
        try {
            // Check existing session
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;
            
            this.session = session;
            this.user = session?.user || null;
            
            if (this.user) {
                await this.loadProfile();
            }
            
            // Set up auth state listener
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('[Auth] State changed:', event);
                this.session = session;
                this.user = session?.user || null;
                
                if (this.user) {
                    await this.loadProfile();
                } else {
                    this.profile = null;
                }
                
                this.notifyListeners(event);
            });
            
            return { user: this.user, profile: this.profile };
            
        } catch (error) {
            console.error('[SessionManager] Initialization error:', error);
            return { user: null, profile: null };
        }
    }

    async loadProfile() {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', this.user.id)
                .single();
            
            if (error) throw error;
            
            this.profile = profile;
            return profile;
            
        } catch (error) {
            console.error('[SessionManager] Profile load error:', error);
            this.profile = null;
            return null;
        }
    }

    async getCurrentUser() {
        if (!this.user) {
            await this.initialize();
        }
        return {
            user: this.user,
            profile: this.profile,
            session: this.session
        };
    }

    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            
            this.user = null;
            this.profile = null;
            this.session = null;
            
            // Clear all storage
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirect to login
            window.location.href = '/pages/auth/login.html';
            
        } catch (error) {
            console.error('[SessionManager] Logout error:', error);
            throw error;
        }
    }

    // Observer pattern for auth changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners(event) {
        this.listeners.forEach(listener => {
            listener(event, this.user, this.profile);
        });
    }

    // Utility methods
    isAuthenticated() {
        return !!this.user;
    }

    async isAdmin() {
        if (!this.user) return false;
        const { data: userData } = await supabase
            .from('users')
            .select('email')
            .eq('id', this.user.id)
            .single();
        
        return ['admin@uzumaki.com', 'superadmin@uzumaki.com'].includes(userData?.email);
    }
}

// Database Operations
class DatabaseService {
    constructor() {
        this.supabase = supabase;
    }

    // User operations
    async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    user:users(*)
                `)
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[DatabaseService] Get profile error:', error);
            return null;
        }
    }

    async updateProfile(userId, updates) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[DatabaseService] Update profile error:', error);
            throw error;
        }
    }

    async updateBalance(userId, amount, operation = 'add') {
        try {
            const { data: profile } = await this.getUserProfile(userId);
            if (!profile) throw new Error('Profile not found');
            
            const currentBalance = parseFloat(profile.balance) || 0;
            const newBalance = operation === 'add' 
                ? currentBalance + parseFloat(amount)
                : currentBalance - parseFloat(amount);
            
            if (newBalance < 0 && operation === 'subtract') {
                throw new Error('Insufficient balance');
            }
            
            return await this.updateProfile(userId, { balance: newBalance });
        } catch (error) {
            console.error('[DatabaseService] Update balance error:', error);
            throw error;
        }
    }

    // Investment operations
    async getPlans(type = null) {
        try {
            let query = supabase
                .from('plans')
                .select('*')
                .eq('is_active', true);
            
            if (type) {
                query = query.eq('type', type);
            }
            
            const { data, error } = await query.order('price', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[DatabaseService] Get plans error:', error);
            return [];
        }
    }

    async createInvestment(userId, planId, amount) {
        try {
            const plan = await supabase
                .from('plans')
                .select('*')
                .eq('id', planId)
                .single();
            
            if (plan.error) throw plan.error;
            
            const investment = {
                user_id: userId,
                plan_id: planId,
                amount: parseFloat(amount),
                start_date: new Date().toISOString(),
                expected_end_date: new Date(Date.now() + (plan.data.duration * 24 * 60 * 60 * 1000)).toISOString(),
                status: 'active'
            };
            
            const { data, error } = await supabase
                .from('investments')
                .insert(investment)
                .select()
                .single();
            
            if (error) throw error;
            
            // Update user's total invested
            await supabase.rpc('increment_total_invested', {
                user_id: userId,
                amount: parseFloat(amount)
            });
            
            return data;
        } catch (error) {
            console.error('[DatabaseService] Create investment error:', error);
            throw error;
        }
    }

    async getUserInvestments(userId) {
        try {
            const { data, error } = await supabase
                .from('investments')
                .select(`
                    *,
                    plan:plans(*)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[DatabaseService] Get investments error:', error);
            return [];
        }
    }

    // Transaction operations
    async createTransaction(transaction) {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert(transaction)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[DatabaseService] Create transaction error:', error);
            throw error;
        }
    }

    async getTransactions(userId, filters = {}) {
        try {
            let query = supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId);
            
            // Apply filters
            if (filters.type) {
                query = query.eq('type', filters.type);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.startDate && filters.endDate) {
                query = query.gte('created_at', filters.startDate)
                           .lte('created_at', filters.endDate);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[DatabaseService] Get transactions error:', error);
            return [];
        }
    }

    // Payment operations
    async createPaymentRequest(paymentData) {
        try {
            const { data, error } = await supabase
                .from('payment_requests')
                .insert(paymentData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[DatabaseService] Create payment request error:', error);
            throw error;
        }
    }

    async updatePaymentStatus(orderId, status, gatewayResponse = null) {
        try {
            const updates = {
                status,
                updated_at: new Date().toISOString()
            };
            
            if (gatewayResponse) {
                updates.gateway_response = gatewayResponse;
            }
            
            if (status === 'completed') {
                updates.verified_at = new Date().toISOString();
            }
            
            const { data, error } = await supabase
                .from('payment_requests')
                .update(updates)
                .eq('order_id', orderId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[DatabaseService] Update payment status error:', error);
            throw error;
        }
    }

    // Referral operations
    async getReferralInfo(userId) {
        try {
            // Get referral code
            const { data: profile } = await supabase
                .from('profiles')
                .select('referral_code, referred_by')
                .eq('id', userId)
                .single();
            
            if (!profile) return null;
            
            // Get referrals made by this user
            const { data: referrals, error } = await supabase
                .from('referrals')
                .select(`
                    *,
                    referee:profiles!referee_id(*)
                `)
                .eq('referrer_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // Get referral earnings
            const { data: earnings } = await supabase
                .from('referral_earnings')
                .select('*')
                .eq('user_id', userId);
            
            return {
                code: profile.referral_code,
                referredBy: profile.referred_by,
                referrals: referrals || [],
                earnings: earnings || []
            };
        } catch (error) {
            console.error('[DatabaseService] Get referral info error:', error);
            return null;
        }
    }

    // Notification operations
    async getNotifications(userId, unreadOnly = false) {
        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId);
            
            if (unreadOnly) {
                query = query.eq('is_read', false);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[DatabaseService] Get notifications error:', error);
            return [];
        }
    }

    async markNotificationAsRead(notificationId) {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('id', notificationId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[DatabaseService] Mark notification as read error:', error);
            throw error;
        }
    }

    // Bank details operations
    async getBankDetails(userId) {
        try {
            const { data, error } = await supabase
                .from('bank_details')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error; // Not found error is okay
            return data || null;
        } catch (error) {
            console.error('[DatabaseService] Get bank details error:', error);
            return null;
        }
    }

    async saveBankDetails(bankData) {
        try {
            const { data, error } = await supabase
                .from('bank_details')
                .upsert(bankData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[DatabaseService] Save bank details error:', error);
            throw error;
        }
    }

    // Real-time subscriptions
    subscribeToTable(table, event, callback) {
        return supabase
            .channel('table-changes')
            .on('postgres_changes', {
                event: event,
                schema: 'public',
                table: table
            }, callback)
            .subscribe();
    }

    subscribeToUserData(userId, callback) {
        return supabase
            .channel('user-data')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${userId}`
            }, callback)
            .subscribe();
    }
}

// Export singleton instances
const sessionManager = new SessionManager();
const dbService = new DatabaseService();

// Utility functions
const utils = {
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    },

    formatDate: (dateString, options = {}) => {
        const date = new Date(dateString);
        const defaultOptions = {
            dateStyle: 'medium',
            timeStyle: 'short'
        };
        return new Intl.DateTimeFormat('en-IN', { ...defaultOptions, ...options }).format(date);
    },

    calculateDaysBetween: (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    generateReferralCode: (userId) => {
        return 'UZM' + userId.substring(0, 8).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    },

    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validatePhone: (phone) => {
        const re = /^[6-9]\d{9}$/;
        return re.test(phone);
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    copyToClipboard: (text) => {
        return navigator.clipboard.writeText(text);
    },

    showToast: (message, type = 'info', duration = 3000) => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    showLoading: () => {
        let loader = document.getElementById('global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9998;
                backdrop-filter: blur(4px);
            `;
            loader.innerHTML = `
                <div class="loader">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    },

    hideLoading: () => {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Export supabase client
export { supabase, sessionManager, dbService, utils };
