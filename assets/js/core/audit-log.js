// assets/js/core/audit-log.js
import { supabase } from '../supabase.js';

class AuditLogger {
    constructor() {
        this.userId = null;
        this.userEmail = null;
        this.userRole = null;
        
        this.init();
    }
    
    async init() {
        await this.loadUserInfo();
        this.setupEventListeners();
    }
    
    async loadUserInfo() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                this.userId = user.id;
                this.userEmail = user.email;
                
                // Get user role from profiles table
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_admin, role')
                    .eq('id', user.id)
                    .single();
                    
                if (profile) {
                    this.userRole = profile.is_admin ? 'admin' : (profile.role || 'user');
                }
            }
        } catch (error) {
            console.error('Failed to load user info for audit log:', error);
        }
    }
    
    setupEventListeners() {
        // Log page views
        this.logPageView();
        
        // Log form submissions
        document.addEventListener('submit', (e) => {
            this.logFormSubmission(e.target);
        });
        
        // Log important button clicks
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.audit) {
                this.logButtonClick(button);
            }
        });
        
        // Log window events
        window.addEventListener('beforeunload', () => {
            this.logEvent('window', 'beforeunload', 'User leaving page');
        });
    }
    
    async logEvent(category, action, details, metadata = {}) {
        try {
            if (!this.userId) {
                await this.loadUserInfo();
            }
            
            const auditLog = {
                user_id: this.userId,
                user_email: this.userEmail,
                user_role: this.userRole,
                category: category,
                action: action,
                details: typeof details === 'string' ? details : JSON.stringify(details),
                metadata: typeof metadata === 'object' ? metadata : {},
                ip_address: await this.getClientIP(),
                user_agent: navigator.userAgent,
                page_url: window.location.href,
                referrer: document.referrer,
                timestamp: new Date().toISOString()
            };
            
            // Insert into audit_logs table
            const { error } = await supabase
                .from('audit_logs')
                .insert([auditLog]);
                
            if (error) {
                console.error('Failed to log audit event:', error);
                // Fallback to console log
                console.log('AUDIT LOG:', auditLog);
            }
            
        } catch (error) {
            console.error('Audit logging error:', error);
        }
    }
    
    async logPageView() {
        const pageTitle = document.title;
        const pagePath = window.location.pathname;
        
        await this.logEvent('navigation', 'page_view', {
            page_title: pageTitle,
            page_path: pagePath
        });
    }
    
    async logFormSubmission(form) {
        const formId = form.id || form.name || 'unknown_form';
        const action = form.action || form.getAttribute('data-action') || 'submit';
        
        // Extract non-sensitive form data
        const formData = new FormData(form);
        const formValues = {};
        
        for (let [key, value] of formData.entries()) {
            // Skip sensitive fields
            if (!this.isSensitiveField(key)) {
                formValues[key] = value;
            }
        }
        
        await this.logEvent('form', action, {
            form_id: formId,
            form_values: formValues
        });
    }
    
    async logButtonClick(button) {
        const buttonText = button.textContent.trim();
        const buttonId = button.id || 'unknown_button';
        const auditData = button.dataset.audit;
        
        await this.logEvent('button_click', auditData, {
            button_id: buttonId,
            button_text: buttonText,
            page_location: window.location.href
        });
    }
    
    async logAdminAction(action, target, details = {}) {
        await this.logEvent('admin_action', action, {
            target: target,
            ...details
        });
    }
    
    async logFinancialAction(action, amount, currency, details = {}) {
        await this.logEvent('financial', action, {
            amount: amount,
            currency: currency || 'INR',
            ...details
        });
    }
    
    async logSecurityEvent(action, details = {}) {
        await this.logEvent('security', action, details);
    }
    
    async logError(error, context = {}) {
        await this.logEvent('error', 'system_error', {
            error_message: error.message,
            error_stack: error.stack,
            ...context
        });
    }
    
    isSensitiveField(fieldName) {
        const sensitiveFields = [
            'password', 'secret', 'token', 'key', 'pin', 'cvv',
            'ssn', 'aadhaar', 'pan', 'credit_card', 'bank_account'
        ];
        
        return sensitiveFields.some(sensitive => 
            fieldName.toLowerCase().includes(sensitive)
        );
    }
    
    async getClientIP() {
        try {
            // Try to get IP from various sources
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('Could not fetch client IP:', error);
            return 'unknown';
        }
    }
    
    // Query methods for retrieving logs
    async getUserLogs(userId, limit = 100) {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        return data;
    }
    
    async getLogsByCategory(category, limit = 100) {
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .eq('category', category)
            .order('timestamp', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        return data;
    }
    
    async getRecentLogs(days = 7, limit = 500) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .gte('timestamp', date.toISOString())
            .order('timestamp', { ascending: false })
            .limit(limit);
            
        if (error) throw error;
        return data;
    }
}

// Initialize audit logger
if (typeof window !== 'undefined') {
    window.auditLogger = new AuditLogger();
    
    // Expose logging methods globally for easy access
    window.logEvent = (...args) => window.auditLogger?.logEvent(...args);
    window.logAdminAction = (...args) => window.auditLogger?.logAdminAction(...args);
    window.logFinancialAction = (...args) => window.auditLogger?.logFinancialAction(...args);
    window.logSecurityEvent = (...args) => window.auditLogger?.logSecurityEvent(...args);
    window.logError = (...args) => window.auditLogger?.logError(...args);
}

export default AuditLogger;
