// dashboard.js - Modern Dashboard with Supabase Integration
import { supabase, formatCurrency, formatDate, showToast } from '../../core/supabase.js';
import { authGuard } from '../../core/auth.js';

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
        this.userData = {};
        this.plans = [];
        this.investments = [];
        this.transactions = [];
        this.notifications = [];
        this.chart = null;
        
        this.init();
    }
    
    async init() {
        console.log('[Dashboard] Initializing...');
        
        // Initialize auth guard
        await authGuard.initialize();
        
        const { user, profile } = authGuard.getUser();
        if (!user) {
            window.location.href = '/pages/auth/login.html';
            return;
        }
        
        this.currentUser = user;
        this.currentProfile = profile;
        
        // Setup UI elements
        this.setupUI();
        
        // Load all data
        await this.loadAllData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup realtime subscriptions
        this.setupRealtime();
        
        // Hide loading overlay
        this.hideLoading();
        
        console.log('[Dashboard] Initialized successfully');
    }
    
    setupUI() {
        // Update user info
        this.updateUserInfo();
        
        // Update current date
        this.updateCurrentDate();
    }
    
    async loadAllData() {
        try {
            // Load data in parallel
            await Promise.all([
                this.loadUserStats(),
                this.loadInvestmentPlans(),
                this.loadUserInvestments(),
                this.loadRecentTransactions(),
                this.loadNotifications(),
                this.loadReferralStats()
            ]);
            
            // Initialize chart after data is loaded
            this.initChart();
            
        } catch (error) {
            console.error('[Dashboard] Error loading data:', error);
            showToast('Failed to load dashboard data', 'error');
        }
    }
    
    async loadUserStats() {
        try {
            const userId = this.currentUser.id;
            
            // Get total balance from profile
            const balance = this.currentProfile.balance || 0;
            
            // Get total invested from active investments
            const { data: investments, error: invError } = await supabase
                .from('investments')
                .select('amount, status')
                .eq('user_id', userId)
                .eq('status', 'active');
            
            if (invError) throw invError;
            
            const totalInvested = investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
            
            // Get total earnings from transactions
            const { data: earnings, error: earnError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'earning')
                .eq('status', 'completed');
            
            if (earnError) throw earnError;
            
            const totalEarnings = earnings?.reduce((sum, earn) => sum + (earn.amount || 0), 0) || 0;
            
            // Get today's earnings
            const today = new Date().toISOString().split('T')[0];
            const { data: todayEarnings, error: todayError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'earning')
                .eq('status', 'completed')
                .gte('created_at', today);
            
            if (todayError) throw todayError;
            
            const todayEarningsTotal = todayEarnings?.reduce((sum, earn) => sum + (earn.amount || 0), 0) || 0;
            
            // Get active plans count
            const activePlans = investments?.filter(inv => inv.status === 'active').length || 0;
            
            // Update UI
            this.updateStatsUI({
                balance,
                totalInvested,
                totalEarnings,
                todayEarnings: todayEarningsTotal,
                activePlans
            });
            
        } catch (error) {
            console.error('[Dashboard] Error loading user stats:', error);
        }
    }
    
    updateStatsUI(stats) {
        // Update total balance
        const totalBalanceEl = document.getElementById('totalBalance');
        if (totalBalanceEl) {
            totalBalanceEl.textContent = formatCurrency(stats.balance);
        }
        
        // Update total invested
        const totalInvestedEl = document.getElementById('totalInvested');
        if (totalInvestedEl) {
            totalInvestedEl.textContent = formatCurrency(stats.totalInvested);
        }
        
        // Update active plans count
        const activePlansEl = document.getElementById('activePlans');
        if (activePlansEl) {
            activePlansEl.textContent = `${stats.activePlans} active plan${stats.activePlans !== 1 ? 's' : ''}`;
        }
        
        // Update total earnings
        const totalEarningsEl = document.getElementById('totalEarnings');
        if (totalEarningsEl) {
            totalEarningsEl.textContent = formatCurrency(stats.totalEarnings);
        }
        
        // Update today's earnings
        const earningsChangeEl = document.getElementById('earningsChange');
        if (earningsChangeEl) {
            earningsChangeEl.textContent = `+${formatCurrency(stats.todayEarnings)} today`;
        }
        
        // Store data for chart
        this.userData.stats = stats;
    }
    
    async loadInvestmentPlans() {
        try {
            const { data: plans, error } = await supabase
                .from('plans')
                .select('*')
                .order('price', { ascending: true });
            
            if (error) throw error;
            
            this.plans = plans || [];
            this.renderPlans('basic', 'basicPlansContainer');
            this.renderPlans('vip', 'vipPlansContainer');
            
        } catch (error) {
            console.error('[Dashboard] Error loading plans:', error);
            showToast('Failed to load investment plans', 'error');
        }
    }
    
    renderPlans(type, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const filteredPlans = this.plans.filter(plan => plan.type === type);
        
        if (filteredPlans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h4>No ${type} plans available</h4>
                    <p>New plans coming soon!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredPlans.map(plan => this.createPlanCard(plan)).join('');
        
        // Add event listeners to invest buttons
        container.querySelectorAll('.btn-invest').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const planId = e.target.dataset.planId || e.target.closest('.btn-invest').dataset.planId;
                this.handleInvest(planId);
            });
        });
    }
    
    createPlanCard(plan) {
        const isVIP = plan.type === 'vip';
        const canInvest = this.currentProfile?.balance >= plan.price;
        const totalReturn = ((plan.daily_return * plan.duration) / 100).toFixed(1);
        
        return `
            <div class="plan-card ${isVIP ? 'vip' : ''}">
                ${isVIP ? '<div class="vip-badge">VIP</div>' : ''}
                <div class="plan-header ${isVIP ? 'vip' : ''}">
                    <h3>${plan.name}</h3>
                    <p class="plan-description">${plan.description || 'Premium investment opportunity'}</p>
                    <div class="plan-amount">${formatCurrency(plan.price)}</div>
                    <p class="plan-period">One-time investment</p>
                </div>
                <div class="plan-body">
                    <div class="plan-features">
                        <div class="plan-feature">
                            <span class="feature-label">Daily Return</span>
                            <span class="feature-value">${plan.daily_return}%</span>
                        </div>
                        <div class="plan-feature">
                            <span class="feature-label">Duration</span>
                            <span class="feature-value">${plan.duration} days</span>
                        </div>
                        <div class="plan-feature">
                            <span class="feature-label">Min Investment</span>
                            <span class="feature-value">${formatCurrency(plan.min_amount)}</span>
                        </div>
                        <div class="plan-feature">
                            <span class="feature-label">Total Return</span>
                            <span class="feature-value success">${totalReturn}x</span>
                        </div>
                    </div>
                    <div class="plan-actions">
                        <button class="btn-invest" 
                                data-plan-id="${plan.id}"
                                ${!canInvest ? 'disabled' : ''}>
                            ${canInvest ? 'Invest Now' : 'Insufficient Balance'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    async handleInvest(planId) {
        try {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) return;
            
            // Check if user already has an investment in this plan
            const { data: existingInvestments } = await supabase
                .from('investments')
                .select('id')
                .eq('user_id', this.currentUser.id)
                .eq('plan_id', planId)
                .eq('status', 'active')
                .single();
            
            if (existingInvestments) {
                showToast('You already have an active investment in this plan', 'warning');
                return;
            }
            
            // Confirm investment
            const confirmed = confirm(`Invest ${formatCurrency(plan.price)} in ${plan.name} plan?\n\nDaily Return: ${plan.daily_return}%\nDuration: ${plan.duration} days\nTotal Return: ${((plan.daily_return * plan.duration) / 100).toFixed(1)}x`);
            
            if (!confirmed) return;
            
            // Check balance
            if (this.currentProfile.balance < plan.price) {
                showToast('Insufficient balance. Please recharge first.', 'warning');
                window.location.href = 'wallet.html';
                return;
            }
            
            // Show loading
            this.showLoading('Processing investment...');
            
            // Create investment
            const { data: investment, error: investError } = await supabase
                .from('investments')
                .insert({
                    user_id: this.currentUser.id,
                    plan_id: plan.id,
                    amount: plan.price,
                    status: 'active',
                    start_date: new Date().toISOString(),
                    expected_end_date: new Date(Date.now() + plan.duration * 24 * 60 * 60 * 1000).toISOString()
                })
                .select()
                .single();
            
            if (investError) throw investError;
            
            // Update user balance
            const newBalance = this.currentProfile.balance - plan.price;
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ balance: newBalance })
                .eq('id', this.currentUser.id);
            
            if (updateError) throw updateError;
            
            // Record transaction
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: this.currentUser.id,
                    type: 'investment',
                    amount: plan.price,
                    status: 'completed',
                    details: `Invested in ${plan.name} plan`,
                    reference_id: `INV-${Date.now()}`
                });
            
            if (txError) throw txError;
            
            // Send notification
            await supabase
                .from('notifications')
                .insert({
                    user_id: this.currentUser.id,
                    title: 'Investment Started',
                    message: `Your investment of ${formatCurrency(plan.price)} in ${plan.name} has been activated`,
                    type: 'investment'
                });
            
            // Update local profile balance
            this.currentProfile.balance = newBalance;
            
            // Reload data
            await this.loadAllData();
            
            showToast('Investment successful! 🎉', 'success');
            
        } catch (error) {
            console.error('[Dashboard] Investment error:', error);
            showToast('Investment failed. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async loadUserInvestments() {
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
            
            this.investments = investments || [];
            this.renderMyInvestments();
            
        } catch (error) {
            console.error('[Dashboard] Error loading investments:', error);
        }
    }
    
    renderMyInvestments() {
        const container = document.getElementById('myPlansContainer');
        if (!container) return;
        
        if (this.investments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h4>No Active Investments</h4>
                    <p>Start your first investment to grow your wealth</p>
                    <button class="btn btn-primary" onclick="this.renderPlans('basic')">
                        Browse Plans
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.investments.map(inv => this.createInvestmentCard(inv)).join('');
    }
    
    createInvestmentCard(investment) {
        const plan = investment.plans;
        const startDate = new Date(investment.start_date);
        const now = new Date();
        const endDate = new Date(investment.expected_end_date);
        
        const daysTotal = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, daysTotal - daysPassed);
        const progress = Math.min((daysPassed / daysTotal) * 100, 100);
        
        const earnedSoFar = investment.amount * (plan.daily_return / 100) * daysPassed;
        const estimatedTotal = investment.amount + (investment.amount * (plan.daily_return / 100) * daysTotal);
        
        return `
            <div class="plan-card">
                <div class="plan-header ${plan.type === 'vip' ? 'vip' : ''}">
                    <h3>${plan.name}</h3>
                    <p class="plan-description">Active Investment</p>
                    <div class="plan-amount">${formatCurrency(investment.amount)}</div>
                    <p class="plan-period">${daysPassed}/${daysTotal} days completed</p>
                </div>
                <div class="plan-body">
                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-labels">
                            <span>${daysPassed} days</span>
                            <span>${daysRemaining} days left</span>
                        </div>
                    </div>
                    <div class="plan-features">
                        <div class="plan-feature">
                            <span class="feature-label">Earned So Far</span>
                            <span class="feature-value success">${formatCurrency(earnedSoFar)}</span>
                        </div>
                        <div class="plan-feature">
                            <span class="feature-label">Estimated Total</span>
                            <span class="feature-value">${formatCurrency(estimatedTotal)}</span>
                        </div>
                        <div class="plan-feature">
                            <span class="feature-label">Status</span>
                            <span class="feature-value ${investment.status === 'active' ? 'success' : 'warning'}">
                                ${investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadRecentTransactions() {
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            this.transactions = transactions || [];
            this.renderRecentActivity();
            
        } catch (error) {
            console.error('[Dashboard] Error loading transactions:', error);
        }
    }
    
    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;
        
        if (this.transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h4>No Recent Activity</h4>
                    <p>Your transactions will appear here</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.transactions.map(tx => this.createActivityItem(tx)).join('');
    }
    
    createActivityItem(transaction) {
        const iconMap = {
            deposit: { icon: 'arrow-down', color: 'deposit', label: 'Deposit' },
            withdrawal: { icon: 'arrow-up', color: 'withdrawal', label: 'Withdrawal' },
            investment: { icon: 'chart-pie', color: 'info', label: 'Investment' },
            earning: { icon: 'coins', color: 'earning', label: 'Earnings' },
            referral: { icon: 'user-plus', color: 'referral', label: 'Referral Bonus' }
        };
        
        const typeInfo = iconMap[transaction.type] || { icon: 'exchange-alt', color: 'info', label: transaction.type };
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${typeInfo.color}">
                    <i class="fas fa-${typeInfo.icon}"></i>
                </div>
       
