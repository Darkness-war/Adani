import authGuard from '../core/auth.js';
import { supabase, formatCurrency, formatDate } from '../core/supabase.js';

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
        this.plans = [];
        this.purchasedPlans = [];
        this.transactions = [];
        
        this.init();
    }
    
    async init() {
        console.log('[Dashboard] Initializing...');
        
        // Wait for auth to be ready
        await authGuard.initialize();
        
        const { user, profile } = authGuard.getUser();
        if (!user) return;
        
        this.currentUser = user;
        this.currentProfile = profile;
        
        // Load dashboard data
        await this.loadDashboardData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start auto refresh
        this.startAutoRefresh();
        
        console.log('[Dashboard] Initialized successfully');
    }
    
    async loadDashboardData() {
        try {
            // Load multiple data sources in parallel
            await Promise.all([
                this.loadStats(),
                this.loadPlans(),
                this.loadPurchasedPlans(),
                this.loadRecentActivity(),
                this.loadNotifications()
            ]);
        } catch (error) {
            console.error('[Dashboard] Error loading data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }
    
    async loadStats() {
        try {
            const userId = this.currentUser.id;
            
            // Get total invested
            const { data: investments } = await supabase
                .from('investments')
                .select('amount, status')
                .eq('user_id', userId)
                .eq('status', 'active');
            
            const totalInvested = investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
            
            // Get total earnings
            const { data: earnings } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'earning')
                .eq('status', 'completed');
            
            const totalEarnings = earnings?.reduce((sum, earn) => sum + (earn.amount || 0), 0) || 0;
            
            // Get today's earnings
            const today = new Date().toISOString().split('T')[0];
            const { data: todayEarnings } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'earning')
                .eq('status', 'completed')
                .gte('created_at', today);
            
            const todayEarningsTotal = todayEarnings?.reduce((sum, earn) => sum + (earn.amount || 0), 0) || 0;
            
            // Get active plans count
            const { data: activePlans } = await supabase
                .from('investments')
                .select('id')
                .eq('user_id', userId)
                .eq('status', 'active');
            
            // Update UI
            this.updateStatsUI({
                totalInvested,
                totalEarnings,
                todayEarnings: todayEarningsTotal,
                activePlans: activePlans?.length || 0
            });
            
        } catch (error) {
            console.error('[Dashboard] Error loading stats:', error);
        }
    }
    
    updateStatsUI(stats) {
        // Update total invested
        const totalInvestedEl = document.getElementById('totalInvested');
        if (totalInvestedEl) {
            totalInvestedEl.textContent = formatCurrency(stats.totalInvested);
        }
        
        // Update total earnings
        const totalEarningsEl = document.getElementById('totalEarnings');
        if (totalEarningsEl) {
            totalEarningsEl.textContent = formatCurrency(stats.totalEarnings);
        }
        
        // Update today's earnings
        const todayEarningsEl = document.getElementById('todayEarnings');
        if (todayEarningsEl) {
            todayEarningsEl.textContent = formatCurrency(stats.todayEarnings);
        }
        
        // Update active plans
        const activePlansEl = document.getElementById('activePlans');
        if (activePlansEl) {
            activePlansEl.textContent = stats.activePlans;
        }
    }
    
    async loadPlans() {
        try {
            const { data: plans, error } = await supabase
                .from('plans')
                .select('*')
                .order('price', { ascending: true });
            
            if (error) throw error;
            
            this.plans = plans || [];
            this.renderPlans('primary');
            
        } catch (error) {
            console.error('[Dashboard] Error loading plans:', error);
            this.showToast('Failed to load investment plans', 'error');
        }
    }
    
    renderPlans(type) {
        const container = document.getElementById('plansContainer');
        if (!container) return;
        
        const filteredPlans = this.plans.filter(plan => {
            if (type === 'purchased') return false;
            return plan.type === type;
        });
        
        if (filteredPlans.length === 0) {
            container.innerHTML = `
                <div class="col-span-full empty-state">
                    <i class="fas fa-inbox fa-3x"></i>
                    <h4>No ${type} plans available</h4>
                    <p>Check back later for new investment opportunities</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredPlans.map(plan => this.createPlanCard(plan)).join('');
        
        // Add event listeners to buy buttons
        container.querySelectorAll('.buy-plan-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const planId = e.target.dataset.planId;
                this.handlePlanPurchase(planId);
            });
        });
    }
    
    createPlanCard(plan) {
        const isVIP = plan.type === 'vip';
        
        return `
            <div class="plan-card ${isVIP ? 'vip' : ''}">
                <div class="plan-header ${isVIP ? 'vip' : ''}">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-bold">${plan.name}</h3>
                            <p class="text-sm opacity-90 mt-1">${plan.description || 'High return investment'}</p>
                        </div>
                        ${isVIP ? '<span class="badge badge-warning">VIP</span>' : ''}
                    </div>
                    <div class="mt-4">
                        <div class="plan-amount">${formatCurrency(plan.price)}</div>
                        <p class="text-sm">One-time investment</p>
                    </div>
                </div>
                <div class="plan-body">
                    <div class="plan-features">
                        <div class="plan-feature">
                            <span>Daily Return</span>
                            <span class="font-semibold">${plan.daily_return}%</span>
                        </div>
                        <div class="plan-feature">
                            <span>Duration</span>
                            <span class="font-semibold">${plan.duration} days</span>
                        </div>
                        <div class="plan-feature">
                            <span>Min Investment</span>
                            <span class="font-semibold">${formatCurrency(plan.min_amount)}</span>
                        </div>
                        <div class="plan-feature">
                            <span>Total Return</span>
                            <span class="font-semibold text-green-600">
                                ${((plan.daily_return * plan.duration) / 100).toFixed(1)}x
                            </span>
                        </div>
                    </div>
                    <button class="btn btn-primary w-full buy-plan-btn" 
                            data-plan-id="${plan.id}"
                            ${this.currentProfile?.balance < plan.price ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i>
                        ${this.currentProfile?.balance < plan.price ? 'Insufficient Balance' : 'Invest Now'}
                    </button>
                </div>
            </div>
        `;
    }
    
    async handlePlanPurchase(planId) {
        try {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) return;
            
            // Confirm purchase
            const confirmed = confirm(`Invest ${formatCurrency(plan.price)} in ${plan.name} plan?`);
            if (!confirmed) return;
            
            // Check balance
            if (this.currentProfile.balance < plan.price) {
                this.showToast('Insufficient balance. Please add funds first.', 'warning');
                window.location.href = '/pages/user/wallet.html';
                return;
            }
            
            // Create investment
            const { error } = await supabase
                .from('investments')
                .insert({
                    user_id: this.currentUser.id,
                    plan_id: plan.id,
                    amount: plan.price,
                    status: 'active',
                    start_date: new Date().toISOString(),
                    expected_end_date: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000).toISOString()
                });
            
            if (error) throw error;
            
            // Update user balance
            const newBalance = this.currentProfile.balance - plan.price;
            await supabase
                .from('profiles')
                .update({ balance: newBalance })
                .eq('id', this.currentUser.id);
            
            // Record transaction
            await supabase
                .from('transactions')
                .insert({
                    user_id: this.currentUser.id,
                    type: 'investment',
                    amount: plan.price,
                    status: 'completed',
                    details: `Purchased ${plan.name} plan`,
                    reference_id: `INV-${Date.now()}`
                });
            
            this.showToast('Investment successful!', 'success');
            
            // Refresh data
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('[Dashboard] Purchase error:', error);
            this.showToast('Investment failed. Please try again.', 'error');
        }
    }
    
    async loadPurchasedPlans() {
        try {
            const { data: investments, error } = await supabase
                .from('investments')
                .select(`
                    *,
                    plans (*)
                `)
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.purchasedPlans = investments || [];
            
        } catch (error) {
            console.error('[Dashboard] Error loading purchased plans:', error);
        }
    }
    
    async loadRecentActivity() {
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (error) throw error;
            
            this.transactions = transactions || [];
            this.renderRecentActivity();
            
        } catch (error) {
            console.error('[Dashboard] Error loading activity:', error);
        }
    }
    
    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;
        
        if (this.transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-8">
                    <i class="fas fa-history fa-2x"></i>
                    <p class="text-gray-600 mt-2">No recent activity</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.transactions.map(tx => this.createActivityItem(tx)).join('');
    }
    
    createActivityItem(transaction) {
        const iconMap = {
            deposit: { icon: 'arrow-down', color: 'deposit', bg: 'bg-green-100' },
            withdrawal: { icon: 'arrow-up', color: 'withdrawal', bg: 'bg-red-100' },
            investment: { icon: 'chart-pie', color: 'info', bg: 'bg-blue-100' },
            earning: { icon: 'coins', color: 'earning', bg: 'bg-yellow-100' },
            referral: { icon: 'user-plus', color: 'info', bg: 'bg-purple-100' }
        };
        
        const typeInfo = iconMap[transaction.type] || { icon: 'exchange-alt', color: 'info', bg: 'bg-gray-100' };
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${typeInfo.color}">
                    <i class="fas fa-${typeInfo.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${this.formatTransactionType(transaction.type)}</div>
                    <div class="activity-desc text-sm text-gray-600">${transaction.details || ''}</div>
                    <div class="activity-time text-xs text-gray-500">${formatDate(transaction.created_at)}</div>
                </div>
                <div class="activity-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
                    ${transaction.amount >= 0 ? '+' : ''}${formatCurrency(transaction.amount)}
                </div>
            </div>
        `;
    }
    
    formatTransactionType(type) {
        const types = {
            deposit: 'Deposit',
            withdrawal: 'Withdrawal',
            investment: 'Investment',
            earning: 'Earnings',
            referral: 'Referral Bonus'
        };
        return types[type] || type;
    }
    
    async loadNotifications() {
        try {
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('read', false)
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            this.renderNotifications(notifications || []);
            
        } catch (error) {
            console.error('[Dashboard] Error loading notifications:', error);
        }
    }
    
    renderNotifications(notifications) {
        const container = document.getElementById('notificationsList');
        if (!container) return;
        
        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state py-8">
                    <i class="fas fa-bell-slash fa-2x"></i>
                    <p class="text-gray-600 mt-2">No new notifications</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = notifications.map(notif => `
            <div class="notification-item p-3 border-b border-gray-200 last:border-b-0">
                <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                        <i class="fas fa-bell"></i>
                    </div>
                    <div class="flex-1">
                        <p class="font-medium text-gray-900">${notif.title}</p>
                        <p class="text-sm text-gray-600 mt-1">${notif.message}</p>
                        <p class="text-xs text-gray-500 mt-2">${formatDate(notif.created_at)}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active tab
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Render appropriate plans
                const tab = btn.dataset.tab;
                if (tab === 'purchased') {
                    this.renderPurchasedPlans();
                } else {
                    this.renderPlans(tab);
                }
            });
        });
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.searchPlans(searchInput.value);
            }, 300));
        }
        
        // Real-time subscriptions
        this.setupRealtimeSubscriptions();
    }
    
    renderPurchasedPlans() {
        const container = document.getElementById('plansContainer');
        if (!container) return;
        
        if (this.purchasedPlans.length === 0) {
            container.innerHTML = `
                <div class="col-span-full empty-state">
                    <i class="fas fa-chart-line fa-3x"></i>
                    <h4>No active investments</h4>
                    <p>Start your first investment to grow your wealth</p>
                    <button class="btn btn-primary mt-4" onclick="this.renderPlans('primary')">
                        Browse Plans
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.purchasedPlans.map(inv => this.createPurchasedPlanCard(inv)).join('');
    }
    
    createPurchasedPlanCard(investment) {
        const plan = investment.plans;
        const startDate = new Date(investment.start_date);
        const now = new Date();
        const endDate = new Date(investment.expected_end_date);
        
        const daysTotal = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        const progress = Math.min((daysPassed / daysTotal) * 100, 100);
        
        const estimatedReturn = investment.amount * (1 + (plan.daily_return * daysTotal) / 100);
        const earnedSoFar = investment.amount * (plan.daily_return / 100) * daysPassed;
        
        return `
            <div class="plan-card">
                <div class="plan-header" style="background: linear-gradient(135deg, #10b981, #059669);">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-bold">${plan.name}</h3>
                            <p class="text-sm opacity-90 mt-1">Active Investment</p>
                        </div>
                        <span class="badge badge-success">Active</span>
                    </div>
                    <div class="mt-4">
                        <div class="plan-amount">${formatCurrency(investment.amount)}</div>
                        <p class="text-sm">Invested Amount</p>
                    </div>
                </div>
                <div class="plan-body">
                    <div class="plan-features">
                        <div class="plan-feature">
                            <span>Days Completed</span>
                            <span class="
