// assets/js/core/csrf-protect.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
    'https://atcfrcolbuikjnsoujzw.supabase.co',
    'sb_publishable_mUDZkzcq09gllPPjk8pGQ_k6APV_gv'
);

class CSRFProtection {
    constructor() {
        this.csrfToken = null;
        this.tokenName = 'x-csrf-token';
        this.tokenExpiry = 30 * 60 * 1000; // 30 minutes
        
        this.init();
    }
    
    async init() {
        await this.generateToken();
        this.setupInterceptors();
    }
    
    async generateToken() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                console.warn('No session found for CSRF token generation');
                return;
            }
            
            // Create a unique token using user session data
            const tokenData = {
                userId: session.user.id,
                timestamp: Date.now(),
                random: Math.random().toString(36).substring(2)
            };
            
            // In production, use a proper hashing method
            this.csrfToken = btoa(JSON.stringify(tokenData));
            this.tokenExpiry = Date.now() + this.tokenExpiry;
            
            // Store token in sessionStorage
            sessionStorage.setItem('csrf_token', this.csrfToken);
            sessionStorage.setItem('csrf_expiry', this.tokenExpiry.toString());
            
            console.log('CSRF token generated');
        } catch (error) {
            console.error('CSRF token generation failed:', error);
        }
    }
    
    setupInterceptors() {
        // Intercept form submissions
        document.addEventListener('submit', (e) => {
            if (this.isProtectedForm(e.target)) {
                this.validateAndProtect(e);
            }
        });
        
        // Intercept fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const [resource, config = {}] = args;
            
            // Check if this is a protected endpoint
            if (this.isProtectedEndpoint(resource) && config.method && config.method !== 'GET') {
                const headers = new Headers(config.headers || {});
                
                // Add CSRF token
                if (this.csrfToken) {
                    headers.set(this.tokenName, this.csrfToken);
                }
                
                // Add timestamp to prevent replay attacks
                headers.set('x-request-timestamp', Date.now().toString());
                
                config.headers = headers;
            }
            
            return originalFetch(resource, config);
        };
    }
    
    isProtectedForm(form) {
        // Check if form has data-action attribute or is a sensitive form
        const sensitiveActions = ['withdraw', 'transfer', 'update-profile', 'change-password', 'invest'];
        const action = form.getAttribute('data-action') || form.action;
        
        return sensitiveActions.some(sensitiveAction => 
            action?.includes(sensitiveAction) || 
            form.id?.includes(sensitiveAction)
        );
    }
    
    isProtectedEndpoint(resource) {
        const sensitiveEndpoints = [
            '/api/withdraw',
            '/api/transfer',
            '/api/invest',
            '/api/profile/update',
            '/api/password/change',
            '/api/admin/'
        ];
        
        const url = typeof resource === 'string' ? resource : resource.url;
        return sensitiveEndpoints.some(endpoint => url?.includes(endpoint));
    }
    
    async validateAndProtect(event) {
        event.preventDefault();
        
        const form = event.target;
        
        try {
            // Validate CSRF token
            if (!await this.validateToken()) {
                throw new Error('Invalid CSRF token');
            }
            
            // Add CSRF token to form data
            const formData = new FormData(form);
            formData.append(this.tokenName, this.csrfToken);
            formData.append('x-request-timestamp', Date.now().toString());
            
            // Add hidden input for form submission
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = this.tokenName;
            tokenInput.value = this.csrfToken;
            form.appendChild(tokenInput);
            
            // Allow form submission
            console.log('CSRF protection applied');
            form.submit();
            
        } catch (error) {
            console.error('CSRF validation failed:', error);
            this.showError('Security validation failed. Please refresh the page and try again.');
            return false;
        }
    }
    
    async validateToken() {
        const storedToken = sessionStorage.getItem('csrf_token');
        const expiry = parseInt(sessionStorage.getItem('csrf_expiry') || '0');
        
        // Check if token exists and is not expired
        if (!storedToken || !this.csrfToken || storedToken !== this.csrfToken) {
            console.warn('CSRF token mismatch');
            await this.generateToken();
            return false;
        }
        
        if (Date.now() > expiry) {
            console.warn('CSRF token expired');
            await this.generateToken();
            return false;
        }
        
        return true;
    }
    
    async validateRequest(headers) {
        const requestToken = headers.get(this.tokenName);
        const timestamp = parseInt(headers.get('x-request-timestamp') || '0');
        
        // Check timestamp (prevent replay attacks)
        if (Date.now() - timestamp > 5 * 60 * 1000) { // 5 minutes
            console.warn('Request timestamp expired');
            return false;
        }
        
        // Validate token
        return await this.validateToken() && requestToken === this.csrfToken;
    }
    
    showError(message) {
        // Check if toast system exists
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
            return;
        }
        
        // Fallback alert
        alert(`Security Error: ${message}`);
    }
    
    getToken() {
        return this.csrfToken;
    }
}

// Initialize CSRF protection
if (typeof window !== 'undefined') {
    window.csrfProtection = new CSRFProtection();
}

export default CSRFProtection;
