// assets/js/core/error-handler.js
import { supabase } from '../supabase.js';
);

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.isProduction = window.location.hostname !== 'localhost';
        
        this.init();
    }
    
    init() {
        // Capture global errors
        window.addEventListener('error', (event) => this.handleGlobalError(event));
        window.addEventListener('unhandledrejection', (event) => this.handlePromiseRejection(event));
        
        // Override console.error
        const originalConsoleError = console.error;
        console.error = (...args) => {
            this.logError(new Error(args.join(' ')), 'console_error');
            originalConsoleError.apply(console, args);
        };
        
        // Setup fetch error handling
        this.setupFetchInterceptor();
        
        // Setup Supabase error handling
        this.setupSupabaseErrorHandling();
    }
    
    async handleGlobalError(event) {
        const error = {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        await this.processError(error, 'global_error');
        event.preventDefault();
    }
    
    async handlePromiseRejection(event) {
        const error = {
            message: event.reason?.message || 'Unhandled Promise Rejection',
            reason: event.reason,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
        
        await this.processError(error, 'promise_rejection');
    }
    
    async logError(error, type = 'custom_error', context = {}) {
        const errorData = {
            type: type,
            message: error.message,
            stack: error.stack,
            name: error.name,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            user: await this.getCurrentUserInfo(),
            context: context,
            browser: this.getBrowserInfo(),
            screen: this.getScreenInfo()
        };
        
        await this.processError(errorData, type);
    }
    
    async processError(errorData, type) {
        // Store in memory (circular buffer)
        this.errors.push(errorData);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        // Log to console in development
        if (!this.isProduction) {
            console.group(`%cError: ${type}`, 'color: #e74c3c; font-weight: bold;');
            console.error(errorData);
            console.groupEnd();
        }
        
        // Send to server in production
        if (this.isProduction) {
            await this.sendToServer(errorData);
        }
        
        // Show user-friendly error message
        this.showUserMessage(errorData);
        
        // Log to audit system if available
        if (window.auditLogger) {
            window.auditLogger.logError(errorData.message, errorData);
        }
    }
    
    async sendToServer(errorData) {
        try {
            // Clean up error data (remove circular references)
            const cleanError = JSON.parse(JSON.stringify(errorData));
            
            // Send to Supabase errors table
            const { error } = await supabase
                .from('error_logs')
                .insert([{
                    error_type: cleanError.type,
                    error_message: cleanError.message,
                    error_stack: cleanError.stack,
                    user_id: cleanError.user?.id,
                    page_url: cleanError.url,
                    browser_info: cleanError.browser,
                    screen_info: cleanError.screen,
                    metadata: cleanError.context,
                    created_at: new Date().toISOString()
                }]);
                
            if (error) {
                console.error('Failed to save error to server:', error);
            }
        } catch (sendError) {
            console.error('Failed to send error to server:', sendError);
        }
    }
    
    showUserMessage(errorData) {
        // Don't show error messages for minor errors
        if (this.shouldSilenceError(errorData)) {
            return;
        }
        
        // Check if toast system exists
        if (typeof window.showToast === 'function') {
            const message = this.getUserFriendlyMessage(errorData);
            window.showToast(message, 'error', 10000);
            return;
        }
        
        // Fallback alert for critical errors
        if (this.isCriticalError(errorData)) {
            const message = this.getUserFriendlyMessage(errorData);
            const shouldReload = confirm(`${message}\n\nWould you like to reload the page?`);
            
            if (shouldReload) {
                window.location.reload();
            }
        }
    }
    
    getCurrentUserInfo() {
        try {
            const { user } = supabase.auth.getSession() || {};
            return {
                id: user?.id,
                email: user?.email,
                isAuthenticated: !!user
            };
        } catch (error) {
            return { error: 'Unable to get user info' };
        }
    }
    
    getBrowserInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            online: navigator.onLine
        };
    }
    
    getScreenInfo() {
        return {
            width: window.screen.width,
            height: window.screen.height,
            colorDepth: window.screen.colorDepth,
            orientation: window.screen.orientation?.type
        };
    }
    
    setupFetchInterceptor() {
        const originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                // Check for error responses
                if (!response.ok) {
                    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                    error.status = response.status;
                    error.url = args[0];
                    
                    // Try to get error details from response
                    try {
                        const errorData = await response.clone().json();
                        error.details = errorData;
                    } catch {
                        // Response is not JSON
                    }
                    
                    await this.logError(error, 'fetch_error', {
                        url: args[0],
                        method: args[1]?.method || 'GET',
                        status: response.status
                    });
                }
                
                return response;
            } catch (error) {
                await this.logError(error, 'fetch_exception', {
                    url: args[0],
                    method: args[1]?.method || 'GET'
                });
                throw error;
            }
        };
    }
    
    setupSupabaseErrorHandling() {
        // Listen to auth state changes for errors
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                this.logError(new Error(`Auth event: ${event}`), 'auth_event');
            }
        });
        
        // Monitor Supabase errors
        const originalQuery = supabase.from;
        
        // We can't directly intercept Supabase queries, but we can wrap them
        // This is a simplified approach
        supabase.queryWrapper = async (tableName, operation) => {
            try {
                return await operation;
            } catch (error) {
                await this.logError(error, 'supabase_query_error', {
                    table: tableName
                });
                throw error;
            }
        };
    }
    
    shouldSilenceError(errorData) {
        const silentErrors = [
            'ResizeObserver loop',
            'Script error',
            'NetworkError',
            'Failed to fetch'
        ];
        
        return silentErrors.some(silentError => 
            errorData.message?.includes(silentError)
        );
    }
    
    isCriticalError(errorData) {
        const criticalErrors = [
            'Unexpected token',
            'Maximum call stack',
            'Out of memory',
            'ChunkLoadError'
        ];
        
        return criticalErrors.some(criticalError => 
            errorData.message?.includes(criticalError)
        );
    }
    
    getUserFriendlyMessage(errorData) {
        const errorMap = {
            'NetworkError': 'Network connection failed. Please check your internet connection.',
            'Failed to fetch': 'Unable to connect to server. Please try again.',
            'timeout': 'Request timed out. Please try again.',
            '401': 'Session expired. Please log in again.',
            '403': 'You do not have permission to perform this action.',
            '404': 'The requested resource was not found.',
            '500': 'Server error. Our team has been notified.',
            '503': 'Service temporarily unavailable. Please try again later.'
        };
        
        // Check for specific error messages
        for (const [key, message] of Object.entries(errorMap)) {
            if (errorData.message?.includes(key) || errorData.status?.toString() === key) {
                return message;
            }
        }
        
        // Default message
        return 'An unexpected error occurred. Our team has been notified.';
    }
    
    getErrors() {
        return this.errors;
    }
    
    clearErrors() {
        this.errors = [];
    }
    
    async getErrorReport() {
        return {
            errors: this.errors,
            user: await this.getCurrentUserInfo(),
            environment: {
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        };
    }
}

// Initialize error handler
if (typeof window !== 'undefined') {
    window.errorHandler = new ErrorHandler();
    
    // Global error logging function
    window.logError = (error, context = {}) => {
        if (window.errorHandler) {
            window.errorHandler.logError(
                error instanceof Error ? error : new Error(String(error)),
                'custom_error',
                context
            );
        } else {
            console.error('Error Handler not initialized:', error, context);
        }
    };
}

export default ErrorHandler;
