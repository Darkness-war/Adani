// Admin Panel for Managing Investment Plans
import { sessionManager, dbService, utils, supabase } from '../core/supabase.js';

// Admin Functions for Plan Management
class PlansAdmin {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.storageBucket = 'plan-images';
    }
    
    async initialize() {
        try {
            // Check admin status
            const { user } = await sessionManager.getCurrentUser();
            if (!user) throw new Error('Not authenticated');
            
            this.currentUser = user;
            this.isAdmin = await this.checkAdminStatus();
            
            if (!this.isAdmin) {
                throw new Error('Admin access required');
            }
            
            return true;
        } catch (error) {
            console.error('[PlansAdmin] Initialization error:', error);
            return false;
        }
    }
    
    async checkAdminStatus() {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', this.currentUser.id)
                .single();
            
            return profile?.is_admin || false;
        } catch (error) {
            console.error('[PlansAdmin] Admin check error:', error);
            return false;
        }
    }
    
    // Create new plan
    async createPlan(planData, imageFile = null) {
        try {
            let imageUrl = null;
            
            // Upload image if provided
            if (imageFile) {
                imageUrl = await this.uploadPlanImage(imageFile);
            }
            
            // Create plan record
            const plan = {
                ...planData,
                image_url: imageUrl,
                is_active: true,
                created_at: new Date().toISOString(),
                created_by: this.currentUser.id
            };
            
            const { data, error } = await supabase
                .from('plans')
                .insert(plan)
                .select()
                .single();
            
            if (error) throw error;
            
            // Log admin action
            await this.logAdminAction('plan_created', data.id, planData);
            
            return data;
        } catch (error) {
            console.error('[PlansAdmin] Create plan error:', error);
            throw error;
        }
    }
    
    // Update plan
    async updatePlan(planId, updates, newImageFile = null) {
        try {
            let imageUrl = updates.image_url;
            
            // Upload new image if provided
            if (newImageFile) {
                // Delete old image if exists
                if (updates.image_url) {
                    await this.deletePlanImage(updates.image_url);
                }
                imageUrl = await this.uploadPlanImage(newImageFile);
            }
            
            const planUpdates = {
                ...updates,
                image_url: imageUrl,
                updated_at: new Date().toISOString(),
                updated_by: this.currentUser.id
            };
            
            const { data, error } = await supabase
                .from('plans')
                .update(planUpdates)
                .eq('id', planId)
                .select()
                .single();
            
            if (error) throw error;
            
            // Log admin action
            await this.logAdminAction('plan_updated', planId, updates);
            
            return data;
        } catch (error) {
            console.error('[PlansAdmin] Update plan error:', error);
            throw error;
        }
    }
    
    // Delete plan
    async deletePlan(planId) {
        try {
            // Get plan to delete image
            const { data: plan } = await supabase
                .from('plans')
                .select('image_url')
                .eq('id', planId)
                .single();
            
            if (plan?.image_url) {
                await this.deletePlanImage(plan.image_url);
            }
            
            // Soft delete (mark as inactive)
            const { error } = await supabase
                .from('plans')
                .update({
                    is_active: false,
                    deleted_at: new Date().toISOString(),
                    deleted_by: this.currentUser.id
                })
                .eq('id', planId);
            
            if (error) throw error;
            
            // Log admin action
            await this.logAdminAction('plan_deleted', planId);
            
            return true;
        } catch (error) {
            console.error('[PlansAdmin] Delete plan error:', error);
            throw error;
        }
    }
    
    // Upload plan image
    async uploadPlanImage(file) {
        try {
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const filePath = `${this.currentUser.id}/${fileName}`;
            
            const { data, error } = await supabase.storage
                .from(this.storageBucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });
            
            if (error) throw error;
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(this.storageBucket)
                .getPublicUrl(filePath);
            
            return publicUrl;
        } catch (error) {
            console.error('[PlansAdmin] Image upload error:', error);
            throw error;
        }
    }
    
    // Delete plan image
    async deletePlanImage(imageUrl) {
        try {
            // Extract file path from URL
            const urlParts = imageUrl.split('/');
            const filePath = urlParts.slice(urlParts.indexOf(this.storageBucket) + 1).join('/');
            
            const { error } = await supabase.storage
                .from(this.storageBucket)
                .remove([filePath]);
            
            if (error) throw error;
            
            return true;
        } catch (error) {
            console.error('[PlansAdmin] Image delete error:', error);
            throw error;
        }
    }
    
    // Get all plans (including inactive)
    async getAllPlans() {
        try {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('[PlansAdmin] Get all plans error:', error);
            return [];
        }
    }
    
    // Get plan statistics
    async getPlanStatistics() {
        try {
            const { data: plans } = await this.getAllPlans();
            
            const stats = {
                total: plans.length,
                active: plans.filter(p => p.is_active).length,
                vip: plans.filter(p => p.is_vip).length,
                featured: plans.filter(p => p.featured).length,
                total_investments: 0,
                total_value: 0
            };
            
            // Get investment stats
            const { data: investments } = await supabase
                .from('investments')
                .select('amount, status');
            
            if (investments) {
                stats.total_investments = investments.length;
                stats.total_value = investments.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
            }
            
            return stats;
        } catch (error) {
            console.error('[PlansAdmin] Get statistics error:', error);
            return null;
        }
    }
    
    // Log admin action
    async logAdminAction(action, targetId, details = {}) {
        try {
            if (window.auditLogger) {
                await window.auditLogger.logAdminAction(action, targetId, details);
            }
            
            // Also log to admin_actions table
            await supabase
                .from('admin_actions')
                .insert({
                    admin_id: this.currentUser.id,
                    action: action,
                    target_id: targetId,
                    target_type: 'plan',
                    details: details,
                    ip_address: await this.getClientIP(),
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('[PlansAdmin] Log action error:', error);
        }
    }
    
    async getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }
}

// Export admin instance
const plansAdmin = new PlansAdmin();

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('admin')) {
        const isAdmin = await plansAdmin.initialize();
        
        if (!isAdmin) {
            alert('Admin access required');
            window.location.href = '/pages/user/dashboard.html';
            return;
        }
        
        console.log('[PlansAdmin] Admin panel initialized');
    }
});

export { plansAdmin };
