// assets/js/core/session-listener.js
import { supabase } from '../supabase.js';
);

class SessionListener {
    constructor() {
        this.sessionTimer = null;
        this.inactivityTimer = null;
        this.lastActivity = Date.now();
        this.INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        this.SESSION_CHECK_INTERVAL = 60 * 1000; // 1 minute
        
        this.init();
    }
    
    init() {
        this.startSessionCheck();
        this.startInactivityListener();
        this.setupActivityListeners();
    }
    
    startSessionCheck() {
        this.sessionTimer = setInterval(async () => {
            await this.checkSession();
        }, this.SESSION_CHECK_INTERVAL);
    }
    
    async checkSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                this.handleSessionExpired();
                return;
            }
            
            // Check if token is about to expire (within 5 minutes)
            const expiresAt = new Date(session.expires_at * 1000);
            const now = new Date();
            const timeUntilExpiry = expiresAt - now;
            
            if (timeUntilExpiry < 5 * 60 * 1000) {
                await this.refreshSession();
            }
        } catch (error) {
            console.error('Session check failed:', error);
        }
    }
    
    async refreshSession() {
        try {
            const { data, error } = await supabase.auth.refreshSession();
            
            if (error) {
                throw error;
            }
            
            console.log('Session refreshed successfully');
            return data.session;
        } catch (error) {
            console.error('Session refresh failed:', error);
            this.handleSessionExpired();
        }
    }
    
    startInactivityListener() {
        this.inactivityTimer = setInterval(() => {
            const now = Date.now();
            const timeSinceActivity = now - this.lastActivity;
            
            if (timeSinceActivity > this.INACTIVITY_TIMEOUT) {
                this.handleInactivityTimeout();
            }
        }, 60000); // Check every minute
    }
    
    setupActivityListeners() {
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.lastActivity = Date.now();
            }, { passive: true });
        });
    }
    
    handleSessionExpired() {
        clearInterval(this.sessionTimer);
        clearInterval(this.inactivityTimer);
        
        // Show session expired notification
        this.showNotification(
            'Session expired',
            'Your session has expired. Please log in again.',
            'warning'
        );
        
        // Redirect to login after delay
        setTimeout(() => {
            window.location.href = '/pages/auth/login.html?session=expired';
        }, 3000);
    }
    
    handleInactivityTimeout() {
        clearInterval(this.sessionTimer);
        clearInterval(this.inactivityTimer);
        
        // Sign out user
        supabase.auth.signOut();
        
        this.showNotification(
            'Inactive Session',
            'You have been logged out due to inactivity.',
            'info'
        );
        
        setTimeout(() => {
            window.location.href = '/pages/auth/login.html?inactive=true';
        }, 2000);
    }
    
    showNotification(title, message, type = 'info') {
        // Check if notification system exists
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }
        
        // Fallback notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'warning' ? '#f39c12' : type === 'danger' ? '#e74c3c' : '#3498db'};
            color: white;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <strong>${title}</strong>
            <p style="margin: 5px 0 0 0; font-size: 0.9em;">${message}</p>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    destroy() {
        clearInterval(this.sessionTimer);
        clearInterval(this.inactivityTimer);
        
        const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            document.removeEventListener(event, () => {});
        });
    }
}

// Initialize session listener
if (typeof window !== 'undefined') {
    window.sessionListener = new SessionListener();
    
    // Add CSS animations
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
}

export default SessionListener;
