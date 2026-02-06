// assets/js/supabase.js - UPDATED VERSION
const SUPABASE_URL = 'https://atcfrcolbuikjnsoujzw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mUDZkzcq09gllPPjkG8pGQ_k6APV_gv';

// Initialize Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Create Supabase client with proper configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: localStorage,
    storageKey: 'uzumaki-auth-token'
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
      
      if (error) {
        console.error('[SessionManager] Session error:', error);
        return { user: null, profile: null };
      }
      
      this.session = session;
      this.user = session?.user || null;
      
      if (this.user) {
        await this.loadProfile();
      }
      
      // Listen to auth changes
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
    if (!this.user) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.user.id)
        .single();
      
      if (error) {
        console.error('[SessionManager] Profile load error:', error);
        
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          return await this.createProfile();
        }
        return null;
      }
      
      this.profile = data;
      return data;
    } catch (error) {
      console.error('[SessionManager] Profile load exception:', error);
      return null;
    }
  }

  async createProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: this.user.id,
          email: this.user.email,
          full_name: this.user.user_metadata?.full_name || this.user.email.split('@')[0],
          first_name: this.user.user_metadata?.first_name || '',
          last_name: this.user.user_metadata?.last_name || '',
          referral_code: this.generateReferralCode(),
          account_tier: 'standard',
          balance: 0,
          total_invested: 0,
          total_withdrawn: 0,
          verified: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      this.profile = data;
      return data;
    } catch (error) {
      console.error('[SessionManager] Create profile error:', error);
      return null;
    }
  }

  generateReferralCode() {
    return 'UZM' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).substring(2, 6);
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
      
      // Clear auth storage
      localStorage.removeItem('uzumaki-auth-token');
      localStorage.removeItem('supabase.auth.token');
      
      // Redirect to login
      window.location.href = '/pages/auth/login.html';
    } catch (error) {
      console.error('[SessionManager] Logout error:', error);
      throw error;
    }
  }

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

  isAuthenticated() {
    return !!this.user;
  }

  async isAdmin() {
    if (!this.user) return false;
    return this.user.email === 'admin@uzumaki.com';
  }
}

// Database Service (Simplified)
class DatabaseService {
  constructor() {
    this.supabase = supabase;
  }

  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[DatabaseService] Get profile error:', error);
      return null;
    }
  }

  async createProfile(profileData) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[DatabaseService] Create profile error:', error);
      throw error;
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
}

// Utility Functions
class Utils {
  static formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  }

  static formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static generateReferralCode(userId) {
    const prefix = 'UZM';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timestamp = Date.now().toString(36).substring(2, 6);
    return `${prefix}${random}${timestamp}`;
  }

  static showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'success' ? '#10b981' : 
                   type === 'error' ? '#ef4444' : 
                   type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: toastSlideIn 0.3s ease;
      font-weight: 500;
      max-width: 350px;
      word-wrap: break-word;
    `;
    
    const icon = type === 'success' ? '✓' :
                 type === 'error' ? '✗' :
                 type === 'warning' ? '⚠' : 'ℹ';
    
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.2rem;">${icon}</span>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Add CSS for animation if not exists
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
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
    
    // Remove toast after duration
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  static showLoading() {
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
        <div style="text-align: center;">
          <div style="
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4361ee;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
          "></div>
          <p style="color: #4361ee; font-weight: 500;">Loading...</p>
        </div>
        
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
  }

  static hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.style.display = 'none';
    }
  }
}

// Create instances
const sessionManager = new SessionManager();
const dbService = new DatabaseService();
const utils = Utils;

// Export everything
export { supabase, sessionManager, dbService, utils };
