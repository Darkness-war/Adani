// dashboard.js - Fixed with proper auth integration
import { supabase } from '../../core/supabase.js';
import authGuard from '../../core/auth.js';

class Dashboard {
    constructor() {
        this.userData = {
            stats: {},
            plans: [],
            investments: [],
            transactions: [],
            notifications: [],
            earningsData: []
        };
        this.chart = null;
        
        this.init();
    }
    
    async init() {
        console.log('[Dashboard] Initializing...');
        
        try {
            // First check authentication
            const isAuthenticated = await authGuard.checkAuth();
            
            if (!isAuthenticated) {
                console.log('[Dashboard] User not authenticated');
                return;
            }
            
            // Get user data from authGuard
            const { user, profile } = authGuard.getUser();
            
            if (!user || !profile) {
                console.error('[Dashboard] No user or profile found');
                this.showToast('User data not found. Please login again.', 'error');
                setTimeout(() => {
                    window.location.href = '/pages/auth/login.html';
                }, 2000);
                return;
            }
            
            // Setup UI with user info
            this.setupUI(user, profile);
            
            // Load all data
            await this.loadAllData();
            
            // Initialize chart
            this.initChart();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup realtime subscriptions
            this.setupRealtime();
            
            // Hide loading overlay with animation
            setTimeout(() => {
                this.hideLoading();
            }, 1500);
            
            console.log('[Dashboard] Initialized successfully');
            
        } catch (error) {
            console.error('[Dashboard] Initialization error:', error);
            this.showToast('Failed to load dashboard. Please refresh.', 'error');
            this.hideLoading();
        }
    }
    
    setupUI(user, profile) {
        // Update current date
        this.updateCurrentDate();
        
        // Update stats with initial values from profile
        if (profile) {
            this.updateStatsUI({
                balance: profile.balance || 0,
                totalInvested: 0,
                totalEarnings: 0,
                todayEarnings: 0,
                activePlans: 0,
                investmentProfit: 0
            });
        }
        
        // Setup tab switching
        this.setupTabs();
        
        // Setup time filter
        this.setupTimeFilter();
    }
    
    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateString = now.toLocaleDateString('en-US', options);
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            dateElement.textContent = dateString;
        }
    }
    
    async loadAllData() {
        try {
            // Show loading states
            this.showLoadingStates();
            
            // Get user ID from authGuard
            const userId = authGuard.getUserId();
            
            if (!userId) {
                throw new Error('User ID not found');
            }
            
            // Load data in parallel
            await Promise.allSettled([
                this.loadUserStats(userId),
                this.loadInvestmentPlans(),
                this.loadUserInvestments(userId),
                this.loadRecentTransactions(userId),
                this.loadNotifications(userId),
                this.loadReferralStats(userId)
            ]);
            
            // Load earnings data separately
            await this.loadEarningsData(userId);
            
            console.log('[Dashboard] All data loaded successfully');
            
        } catch (error) {
            console.error('[Dashboard] Error loading data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }
    
    showLoadingStates() {
        // Add loading animation to stats
        const statValues = document.querySelectorAll('.stat-value');
        statValues.forEach(el => {
            el.classList.add('loading-pulse');
        });
        
        // Show loading message in containers
        const containers = [
            'basicPlansContainer',
            'vipPlansContainer', 
            'myPlansContainer',
            'recentActivity'
        ];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="loading-state">
                        <div class="loading-spinner"></div>
                        <p>Loading data...</p>
                    </div>
                `;
            }
        });
    }
    
    removeLoadingStates() {
        // Remove loading animations
        const statValues = document.querySelectorAll('.stat-value');
        statValues.forEach(el => {
            el.classList.remove('loading-pulse');
        });
        
        // Remove loading states
        document.querySelectorAll('.loading').forEach(el => {
            el.classList.remove('loading');
        });
    }
    
    async loadUserStats(userId) {
        try {
            const { profile } = authGuard.getUser();
            
            if (!profile) {
                throw new Error('Profile not found');
            }
            
            // Get user balance from profile
            const balance = profile.balance || 0;
            
            // Get total invested from investments
            const { data: investments, error: invError } = await supabase
                .from('investments')
                .select('amount, status')
                .eq('user_id', userId)
                .eq('status', 'active');
            
            let totalInvested = 0;
            let activePlans = 0;
            
            if (!invError && investments) {
                totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
                activePlans = investments.filter(inv => inv.status === 'active').length;
            }
            
            // Get total earnings
            const { data: earnings, error: earnError } = await supabase
                .from('transactions')
                .select('amount, created_at')
                .eq('user_id', userId)
                .eq('type', 'earning')
                .eq('status', 'completed');
            
            let totalEarnings = 0;
            let todayEarnings = 0;
            
            if (!earnError && earnings) {
                totalEarnings = earnings.reduce((sum, earn) => sum + (earn.amount || 0), 0);
                
                // Calculate today's earnings
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                todayEarnings = earnings
                    .filter(earn => new Date(earn.created_at) >= today)
                    .reduce((sum, earn) => sum + (earn.amount || 0), 0);
            }
            
            // Calculate profit percentage
            const investmentProfit = totalInvested > 0 
                ? ((totalEarnings / totalInvested) * 100).toFixed(2)
                : '0.00';
            
            // Update UI with loaded data
            this.updateStatsUI({
                balance,
                totalInvested,
                totalEarnings,
                todayEarnings,
                activePlans,
                investmentProfit
            });
            
        } catch (error) {
            console.error('[Dashboard] Error loading user stats:', error);
            // Use default values
            this.updateStatsUI({
                balance: 0,
                totalInvested: 0,
                totalEarnings: 0,
                todayEarnings: 0,
                activePlans: 0,
                investmentProfit: 0
            });
        }
    }
    
    updateStatsUI(stats) {
        // Format currency helper
        const formatCurrency = (amount) => {
            return '₹' + (amount || 0).toLocaleString('en-IN');
        };
        
        // Update total balance
        const totalBalanceEl = document.getElementById('totalBalance');
        if (totalBalanceEl) {
            totalBalanceEl.textContent = formatCurrency(stats.balance);
        }
        
        // Update sidebar and mobile balances
        const balanceElements = [
            document.getElementById('sidebarBalance'),
            document.getElementById('mobileBalance')
        ];
        
        balanceElements.forEach(el => {
            if (el) el.textContent = formatCurrency(stats.balance);
        });
        
        // Update total invested
        const totalInvestedEl = document.getElementById('totalInvested');
        if (totalInvestedEl) {
            totalInvestedEl.textContent = formatCurrency(stats.totalInvested);
        }
        
        // Update active plans
        const activePlansEl = document.getElementById('activePlans');
        if (activePlansEl) {
            activePlansEl.textContent = `${stats.activePlans} active plan${stats.activePlans !== 1 ? 's' : ''}`;
        }
        
        // Update investment profit
        const investmentProfitEl = document.getElementById('investmentProfit');
        if (investmentProfitEl) {
            investmentProfitEl.textContent = `${stats.investmentProfit}%`;
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
        
        // Update sidebar and mobile earnings
        const earningsElements = [
            document.getElementById('sidebarEarnings'),
            document.getElementById('mobileEarnings')
        ];
        
        earningsElements.forEach(el => {
            if (el) el.textContent = `+${formatCurrency(stats.todayEarnings)}`;
        });
        
        // Update daily earnings
        const dailyEarningsEl = document.getElementById('dailyEarnings');
        if (dailyEarningsEl) {
            dailyEarningsEl.textContent = formatCurrency(stats.todayEarnings);
        }
        
        // Update referral earnings
        const referralEarningsEl = document.getElementById('referralEarnings');
        if (referralEarningsEl) {
            // This will be updated by loadReferralStats
            referralEarningsEl.textContent = formatCurrency(0);
        }
        
        // Store data
        this.userData.stats = stats;
    }
    
    async loadInvestmentPlans() {
        try {
            const { data: plans, error } = await supabase
                .from('plans')
                .select('*')
                .order('min_amount', { ascending: true });
            
            if (error) throw error;
            
            this.userData.plans = plans || [];
            
            // Render plans
            this.renderPlans('basic');
            this.renderPlans('vip');
            
        } catch (error) {
            console.error('[Dashboard] Error loading plans:', error);
            
            // Show sample data for demo
            this.userData.plans = this.getSamplePlans();
            this.renderPlans('basic');
            this.renderPlans('vip');
        }
    }
    
    getSamplePlans() {
        return [
            {
                id: '1',
                name: 'Starter Plan',
                type: 'basic',
                description: 'Perfect for beginners',
                min_amount: 1000,
                daily_return: 2.5,
                duration: 30,
                status: 'active'
            },
            {
                id: '2', 
                name: 'Growth Plan',
                type: 'basic',
                description: 'Balanced growth investment',
                min_amount: 5000,
                daily_return: 3.0,
                duration: 60,
                status: 'active'
            },
            {
                id: '3',
                name: 'Premium VIP',
                type: 'vip',
                description: 'Exclusive VIP investment',
                min_amount: 25000,
                daily_return: 4.5,
                duration: 90,
                status: 'active'
            }
        ];
    }
    
    renderPlans(type) {
        const containerId = `${type}PlansContainer`;
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const filteredPlans = this.userData.plans.filter(plan => plan.type === type);
        
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
                const planId = e.target.dataset.planId || 
                              e.target.closest('.btn-invest').dataset.planId;
                this.handleInvest(planId);
            });
        });
    }
    
    createPlanCard(plan) {
        const isVIP = plan.type === 'vip';
        const { profile } = authGuard.getUser();
        const canInvest = profile?.balance >= plan.min_amount;
        const totalReturn = ((plan.daily_return * plan.duration) / 100).toFixed(1);
        
        return `
            <div class="plan-card ${isVIP ? 'vip' : ''}">
                ${isVIP ? '<div class="vip-badge">VIP</div>' : ''}
                <div class="plan-header ${isVIP ? 'vip' : ''}">
                    <h3>${plan.name}</h3>
                    <p class="plan-description">${plan.description || 'Premium investment opportunity'}</p>
                    <div class="plan-amount">₹${plan.min_amount.toLocaleString()}</div>
                    <p class="plan-period">Minimum Investment</p>
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
                            <span class="feature-value">₹${plan.min_amount.toLocaleString()}</span>
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
            const plan = this.userData.plans.find(p => p.id === planId);
            if (!plan) {
                this.showToast('Plan not found', 'error');
                return;
            }
            
            const { profile } = authGuard.getUser();
            
            // Check balance
            if (profile.balance < plan.min_amount) {
                this.showToast('Insufficient balance. Please recharge first.', 'warning');
                window.location.href = 'wallet.html';
                return;
            }
            
            // Confirm investment
            const confirmed = confirm(
                `Invest ₹${plan.min_amount.toLocaleString()} in ${plan.name} plan?\n\n` +
                `Daily Return: ${plan.daily_return}%\n` +
                `Duration: ${plan.duration} days\n` +
                `Total Return: ${((plan.daily_return * plan.duration) / 100).toFixed(1)}x`
            );
            
            if (!confirmed) return;
            
            this.showToast('Processing investment...', 'info');
            
            // Simulate investment (in real app, this would be a Supabase insert)
            setTimeout(() => {
                this.showToast('Investment successful!', 'success');
                
                // Reload user stats
                const userId = authGuard.getUserId();
                if (userId) {
                    this.loadUserStats(userId);
                    this.loadUserInvestments(userId);
                }
            }, 1500);
            
        } catch (error) {
            console.error('[Dashboard] Investment error:', error);
            this.showToast('Investment failed. Please try again.', 'error');
        }
    }
    
    async loadUserInvestments(userId) {
        try {
            const { data: investments, error } = await supabase
                .from('investments')
                .select(`
                    *,
                    plans (*)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(3);
            
            if (error) throw error;
            
            this.userData.investments = investments || [];
            this.renderMyInvestments();
            
        } catch (error) {
            console.error('[Dashboard] Error loading investments:', error);
            this.userData.investments = [];
            this.renderMyInvestments();
        }
    }
    
    renderMyInvestments() {
        const container = document.getElementById('myPlansContainer');
        if (!container) return;
        
        if (this.userData.investments.length === 0) {
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
        
        container.innerHTML = this.userData.investments.map(inv => this.createInvestmentCard(inv)).join('');
    }
    
    createInvestmentCard(investment) {
        const plan = invest
