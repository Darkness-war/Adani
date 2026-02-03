// assets/js/admin/action-guard.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
    'https://atcfrcolbuikjnsoujzw.supabase.co',
    'sb_publishable_mUDZkzcq09gllPPjk8pGQ_k6APV_gv'
);

class AdminActionGuard {
    constructor() {
        this.adminId = null;
        this.adminEmail = null;
        this.adminPermissions = [];
        this.actionQueue = [];
        this.isProcessing = false;
        
        this.init();
    }
    
    async init() {
        await this.loadAdminInfo();
        this.setupProtection();
    }
    
    async loadAdminInfo() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                throw new Error('No authenticated user');
            }
            
            // Get admin profile
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_admin, admin_role, permissions')
                .eq('id', user.id)
                .single();
                
            if (error || !profile?.is_admin) {
                throw new Error('User is not an admin');
            }
            
            this.adminId = user.id;
            this.adminEmail = user.email;
            this.adminPermissions = profile.permissions || [];
            
            console.log('Admin guard initialized for:', user.email);
            
        } catch (error) {
            console.error('Failed to initialize admin guard:', error);
            this.redirectToLogin();
        }
    }
    
    setupProtection() {
        // Protect admin actions
        this.protectAdminButtons();
        this.protectAdminForms();
        this.protectAdminLinks();
        
        // Setup confirmation for destructive actions
        this.setupConfirmations();
        
        // Setup rate limiting
        this.setupRateLimiting();
        
        // Monitor admin session
        this.monitorAdminSession();
    }
    
    protectAdminButtons() {
        document.addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            const action = button.dataset.adminAction;
            if (!action) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // Check permissions
            if (!this.hasPermission(action)) {
                this.showError('You do not have permission to perform this action');
                return;
            }
            
            // Require confirmation for sensitive actions
            if (this.requiresConfirmation(action)) {
                const confirmed = await this.requestConfirmation(action);
                if (!confirmed) return;
            }
            
            // Validate action
            if (!await this.validateAction(action, button)) {
                return;
            }
            
            // Execute with safety measures
            await this.executeSafeAction(action, button);
        });
    }
    
    protectAdminForms() {
        document.addEventListener('submit', async (e) => {
            const form = e.target;
            if (!form.classList.contains('admin-form') && !form.dataset.adminForm) {
                return;
            }
            
            e.preventDefault();
            
            const action = form.dataset.action || 'submit';
            
            // Check permissions
            if (!this.hasPermission(action)) {
                this.showError('You do not have permission to perform this action');
                return;
            }
            
            // Validate form data
            if (!await this.validateForm(form)) {
                return;
            }
            
            // Require confirmation for sensitive forms
            if (this.requiresConfirmation(action)) {
                const confirmed = await this.requestConfirmation(action);
                if (!confirmed) return;
            }
            
            // Submit form with protection
            await this.submitProtectedForm(form);
        });
    }
    
    protectAdminLinks() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link || !link.href) return;
            
            // Check if it's an admin action link
            if (link.dataset.adminAction) {
                e.preventDefault();
                
                const action = link.dataset.adminAction;
                
                // Check permissions
                if (!this.hasPermission(action)) {
                    this.showError('Access denied');
                    return;
                }
                
                // Navigate to link
                window.location.href = link.href;
            }
        });
    }
    
    async validateAction(action, element) {
        try {
            // Add timestamp to prevent replay
            const timestamp = Date.now();
            
            // Generate action signature
            const signature = await this.generateSignature(action, timestamp);
            
            // Store validation data
            element.dataset.actionTimestamp = timestamp;
            element.dataset.actionSignature = signature;
            
            // Validate on server (optional)
            if (this.shouldValidateOnServer(action)) {
                const isValid = await this.validateOnServer(action, signature, timestamp);
                if (!isValid) {
                    throw new Error('Action validation failed');
                }
            }
            
            return true;
        } catch (error) {
            console.error('Action validation failed:', error);
            this.showError('Action validation failed. Please try again.');
            return false;
        }
    }
    
    async executeSafeAction(action, element) {
        try {
            // Show loading state
            element.classList.add('loading');
            element.disabled = true;
            
            // Get action handler
            const handler = this.getActionHandler(action);
            
            if (!handler) {
                throw new Error(`No handler found for action: ${action}`);
            }
            
            // Execute with timeout
            const timeout = setTimeout(() => {
                throw new Error('Action timeout');
            }, 30000);
            
            // Execute action
            const result = await handler(element);
            
            clearTimeout(timeout);
            
            // Log successful action
            await this.logAdminAction(action, 'success', {
                element: element.tagName,
                id: element.id,
                result: result
            });
            
            // Show success message
            this.showSuccess('Action completed successfully');
            
            return result;
            
        } catch (error) {
            console.error('Action execution failed:', error);
            
            // Log failed action
            await this.logAdminAction(action, 'failed', {
                element: element.tagName,
                id: element.id,
                error: error.message
            });
            
            // Show error message
            this.showError(`Action failed: ${error.message}`);
            
            throw error;
            
        } finally {
            // Reset button state
            element.classList.remove('loading');
            element.disabled = false;
            
            // Clear validation data
            delete element.dataset.actionTimestamp;
            delete element.dataset.actionSignature;
        }
    }
    
    async submitProtectedForm(form) {
        try {
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.classList.add('loading');
                submitButton.disabled = true;
            }
            
            // Get form data
            const formData = new FormData(form);
            const formObject = Object.fromEntries(formData.entries());
            
            // Add security headers
            const headers = {
                'X-Admin-ID': this.adminId,
                'X-Admin-Action': form.dataset.action || 'form_submit',
                'X-Request-Timestamp': Date.now().toString(),
                'X-Request-Signature': await this.generateSignature('form_submit', Date.now())
            };
            
            // Submit form
            const response = await fetch(form.action || window.location.href, {
                method: form.method || 'POST',
                headers: headers,
                body: form.enctype === 'multipart/form-data' ? formData : JSON.stringify(formObject)
            });
            
            if (!response.ok) {
                throw new Error(`Form submission failed: ${response.statusText}`);
            }
            
            // Log successful form submission
            await this.logAdminAction('form_submit', 'success', {
                form_id: form.id,
                action: form.action
            });
            
            // Show success message
            this.showSuccess('Form submitted successfully');
            
            // Reset form if needed
            if (form.dataset.resetOnSuccess !== 'false') {
                form.reset();
            }
            
            // Redirect if specified
            const redirect = form.dataset.redirect;
            if (redirect) {
                setTimeout(() => {
                    window.location.href = redirect;
                }, 1500);
            }
            
        } catch (error) {
            console.error('Form submission failed:', error);
            
            // Log failed form submission
            await this.logAdminAction('form_submit', 'failed', {
                form_id: form.id,
                action: form.action,
                error: error.message
            });
            
            // Show error message
            this.showError(`Form submission failed: ${error.message}`);
            
        } finally {
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
            }
        }
    }
    
    // Permission methods
    hasPermission(action) {
        // Super admin has all permissions
        if (this.adminPermissions.includes('*')) {
            return true;
        }
        
        // Check specific permission
        return this.adminPermissions.includes(action) || 
               this.adminPermissions.includes(`admin.${action}`);
    }
    
    requiresConfirmation(action) {
        const destructiveActions = [
            'delete', 'remove', 'ban', 'suspend', 'reset',
            'clear', 'purge', 'wipe', 'drop', 'truncate'
        ];
        
        return destructiveActions.some(destructive => 
            action.toLowerCase().includes(destructive)
        );
    }
    
    async requestConfirmation(action) {
        return new Promise((resolve) => {
            // Create confirmation modal
            const modal = document.createElement('div');
            modal.className = 'admin-confirm-modal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            
            const actionName = action.replace(/_/g, ' ').toUpperCase();
            
            modal.innerHTML = `
                <div class="confirm-content" style="
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <h3 style="
                        color: #e74c3c;
                        margin-top: 0;
                        margin-bottom: 15px;
                    ">
                        <i class="fas fa-exclamation-triangle"></i>
                        Confirm Action
                    </h3>
                    
                    <p style="margin-bottom: 25px; color: #555;">
                        You are about to perform a sensitive action: 
                        <strong>${actionName}</strong>
                    </p>
                    
                    <p style="
                        background: #f8f9fa;
                        padding: 12px;
                        border-radius: 6px;
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 25px;
                    ">
                        <i class="fas fa-info-circle"></i>
                        This action cannot be undone.
                    </p>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn-cancel" style="
                            padding: 10px 20px;
                            background: #95a5a6;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                        ">
                            Cancel
                        </button>
                        <button class="btn-confirm" style="
                            padding: 10px 20px;
                            background: #e74c3c;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                        ">
                            Confirm ${actionName}
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Handle button clicks
            modal.querySelector('.btn-cancel').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            modal.querySelector('.btn-confirm').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
            
            // Close on escape
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', handleEscape);
                    resolve(false);
                }
            };
            
            document.addEventListener('keydown', handleEscape);
        });
    }
    
    // Security methods
    async generateSignature(action, timestamp) {
        // In production, use a proper cryptographic signature
        const data = `${this.adminId}:${action}:${timestamp}`;
        return btoa(data);
    }
    
    shouldValidateOnServer(action) {
        const sensitiveServerActions = [
            'user_delete', 'user_ban', 'payment_approve',
            'withdrawal_process', 'system_update'
        ];
        
        return sensitiveServerActions.includes(action);
    }
    
    async validateOnServer(action, signature, timestamp) {
        try {
            const { data, error } = await supabase.rpc('validate_admin_action', {
                p_admin_id: this.adminId,
                p_action: action,
                p_signature: signature,
                p_timestamp: timestamp
            });
            
            return !error && data === true;
        } catch (error) {
            console.error('Server validation failed:', error);
            return false;
        }
    }
    
    async validateForm(form) {
        // Basic form validation
        const requiredFields = form.querySelectorAll('[required]');
        for (const field of requiredFields) {
            if (!field.value.trim()) {
                this.showError(`Please fill in ${field.name || 'this field'}`);
                field.focus();
                return false;
            }
        }
        
        // Validate email fields
        const emailFields = form.querySelectorAll('input[type="email"]');
        for (const field of emailFields) {
            const email = field.value.trim();
            if (email && !this.isValidEmail(email)) {
                this.showError('Please enter a valid email address');
                field.focus();
                return false;
            }
        }
        
        // Validate number fields
        const numberFields = form.querySelectorAll('input[type="number"]');
        for (const field of numberFields) {
            const min = parseFloat(field.min);
            const max = parseFloat(field.max);
            const value = parseFloat(field.value);
            
            if (!isNaN(min) && value < min) {
                this.showError(`Value must be at least ${min}`);
                field.focus();
                return false;
            }
            
            if (!isNaN(max) && value > max) {
                this.showError(`Value must be at most ${max}`);
                field.focus();
                return false;
            }
        }
        
        return true;
    }
    
    // Action handlers
    getActionHandler(action) {
        const handlers = {
            'user_approve': this.handleUserApprove.bind(this),
            'user_reject': this.handleUserReject.bind(this),
            'user_suspend': this.handleUserSuspend.bind(this),
            'user_delete': this.handleUserDelete.bind(this),
            'payment_approve': this.handlePaymentApprove.bind(this),
            'payment_reject': this.handlePaymentReject.bind(this),
            'withdrawal_process': this.handleWithdrawalProcess.bind(this),
            'investment_update': this.handleInvestmentUpdate.bind(this),
            'system_settings_update': this.handleSystemSettingsUpdate.bind(this)
        };
        
        return handlers[action] || null;
    }
    
    async handleUserApprove(button) {
        const userId = button.dataset.userId;
        // Implementation
    }
    
    async handleUserReject(button) {
        const userId = button.dataset.userId;
        // Implementation
    }
    
    // Logging methods
    async logAdminAction(action, status, details = {}) {
        try {
            const logEntry = {
                admin_id: this.adminId,
                admin_email: this.adminEmail,
                action: action,
                status: status,
                details: details,
                ip_address: await this.getClientIP(),
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('admin_action_logs')
                .insert([logEntry]);
                
            if (error) {
                console.error('Failed to log admin action:', error);
            }
            
        } catch (error) {
            console.error('Admin action logging failed:', error);
        }
    }
    
    // Utility methods
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s
