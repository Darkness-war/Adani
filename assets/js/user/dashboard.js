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
        const plan = investment.plans || {};
        const startDate = new Date(investment.start_date);
        const now = new Date();
        const endDate = new Date(investment.end_date);
        
        const daysTotal = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, daysTotal - daysPassed);
        const progress = Math.min((daysPassed / daysTotal) * 100, 100);
        
        const earnedSoFar = investment.amount * (plan.daily_return / 100) * daysPassed;
        
        return `
            <div class="plan-card">
                <div class="plan-header ${plan.type === 'vip' ? 'vip' : ''}">
                    <h3>${plan.name || 'Investment Plan'}</h3>
                    <p class="plan-description">Active Investment</p>
                    <div class="plan-amount">₹${investment.amount?.toLocaleString() || '0'}</div>
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
                            <span class="feature-value success">₹${earnedSoFar.toLocaleString()}</span>
                        </div>
                        <div class="plan-feature">
                            <span class="feature-label">Status</span>
                            <span class="feature-value ${investment.status === 'active' ? 'success' : 'warning'}">
                                ${investment.status?.charAt(0).toUpperCase() + investment.status?.slice(1) || 'Active'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadRecentTransactions(userId) {
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (error) throw error;
            
            this.userData.transactions = transactions || [];
            this.renderRecentActivity();
            
        } catch (error) {
            console.error('[Dashboard] Error loading transactions:', error);
            this.userData.transactions = [];
            this.renderRecentActivity();
        }
    }
    
    renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;
        
        if (this.userData.transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <h4>No Recent Activity</h4>
                    <p>Your transactions will appear here</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.userData.transactions.map(tx => this.createActivityItem(tx)).join('');
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
        const date = new Date(transaction.created_at);
        const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${typeInfo.color}">
                    <i class="fas fa-${typeInfo.icon}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${typeInfo.label}</div>
                    <div class="activity-description">${transaction.description || 'Transaction completed'}</div>
                    <div class="activity-meta">
                        <span>${dateString} at ${timeString}</span>
                        <span class="activity-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
                            ${transaction.amount >= 0 ? '+' : ''}₹${Math.abs(transaction.amount).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadNotifications(userId) {
        try {
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            this.userData.notifications = notifications || [];
            
            // Update notification count
            const unreadCount = notifications?.filter(n => !n.read).length || 0;
            this.updateNotificationCount(unreadCount);
            
        } catch (error) {
            console.error('[Dashboard] Error loading notifications:', error);
        }
    }
    
    updateNotificationCount(count) {
        const notificationElements = [
            document.getElementById('mobileNotificationCount')
        ];
        
        notificationElements.forEach(el => {
            if (el) {
                el.textContent = count > 9 ? '9+' : count;
                el.style.display = count > 0 ? 'flex' : 'none';
            }
        });
    }
    
    async loadReferralStats(userId) {
        try {
            const { profile } = authGuard.getUser();
            
            if (!profile) return;
            
            // Update referral link
            const referralLink = document.getElementById('referralLink');
            if (referralLink && profile.referral_code) {
                referralLink.value = `https://uzumaki.in/ref/${profile.referral_code}`;
            }
            
            // Get referral count
            const { data: referrals, error: refError } = await supabase
                .from('profiles')
                .select('id')
                .eq('referred_by', userId);
            
            let referralCount = 0;
            if (!refError && referrals) {
                referralCount = referrals.length;
            }
            
            // Get referral earnings
            const { data: referralEarnings, error: earnError } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .eq('type', 'referral');
            
            let referralIncome = 0;
            if (!earnError && referralEarnings) {
                referralIncome = referralEarnings.reduce((sum, earn) => sum + (earn.amount || 0), 0);
            }
            
            // Update UI
            document.getElementById('totalReferrals').textContent = referralCount;
            document.getElementById('referralCount').innerHTML = `<i class="fas fa-users"></i> ${referralCount} referrals`;
            document.getElementById('referralIncome').textContent = `₹${referralIncome.toLocaleString()}`;
            document.getElementById('referralEarnings').textContent = `₹${referralIncome.toLocaleString()}`;
            
        } catch (error) {
            console.error('[Dashboard] Error loading referral stats:', error);
        }
    }
    
    async loadEarningsData(userId) {
        try {
            // Generate sample data for chart
            const earningsData = [];
            const days = 30;
            let currentValue = 1000;
            
            for (let i = days; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                
                // Random walk for earnings
                currentValue += (Math.random() - 0.5) * 200;
                currentValue = Math.max(500, currentValue);
                
                earningsData.push({
                    date: date.toISOString().split('T')[0],
                    earnings: Math.round(currentValue)
                });
            }
            
            this.userData.earningsData = earningsData;
            
            // Update chart stats
            this.updateChartStats(earningsData);
            
        } catch (error) {
            console.error('[Dashboard] Error loading earnings data:', error);
        }
    }
    
    updateChartStats(earningsData) {
        if (!earningsData || earningsData.length === 0) return;
        
        const earnings = earningsData.map(d => d.earnings);
        const highest = Math.max(...earnings);
        const average = Math.round(earnings.reduce((a, b) => a + b, 0) / earnings.length);
        const growth = earnings.length > 1 ? 
            ((earnings[earnings.length - 1] - earnings[0]) / earnings[0] * 100).toFixed(1) : 0;
        
        const highestEl = document.getElementById('chartHighest');
        const averageEl = document.getElementById('chartAverage');
        const growthEl = document.getElementById('chartGrowth');
        
        if (highestEl) highestEl.textContent = `₹${highest.toLocaleString()}`;
        if (averageEl) averageEl.textContent = `₹${average.toLocaleString()}`;
        if (growthEl) {
            growthEl.textContent = `${growth >= 0 ? '+' : ''}${growth}%`;
            growthEl.className = growth >= 0 ? 'chart-stat positive' : 'chart-stat negative';
        }
    }
    
    initChart() {
        const ctx = document.getElementById('earningsChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Prepare data
        const labels = this.userData.earningsData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        const data = this.userData.earningsData.map(d => d.earnings);
        
        // Create gradient
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(67, 97, 238, 0.3)');
        gradient.addColorStop(1, 'rgba(67, 97, 238, 0.05)');
        
        // Create chart
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Earnings',
                    data: data,
                    borderColor: '#4361ee',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4361ee',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show corresponding tab pane
                tabPanes.forEach(pane => {
                    pane.classList.remove('active');
                    if (pane.id === `${tabId}-plans`) {
                        pane.classList.add('active');
                    }
                });
            });
        });
    }
    
    setupTimeFilter() {
        const timeBtns = document.querySelectorAll('.time-btn');
        
        timeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const timeRange = btn.dataset.time;
                
                // Update active button
                timeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Filter chart data
                this.updateChartTimeRange(timeRange);
            });
        });
    }
    
    updateChartTimeRange(range) {
        // Generate new data based on range
        const days = range === 'today' ? 1 : 
                    range === 'week' ? 7 : 
                    30; // month
        
        this.userData.earningsData = this.generateSampleData(days);
        this.updateChartStats(this.userData.earningsData);
        this.initChart();
    }
    
    generateSampleData(days) {
        const earningsData = [];
        let currentValue = 1000;
        
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            currentValue += (Math.random() - 0.5) * 200;
            currentValue = Math.max(500, currentValue);
            
            earningsData.push({
                date: date.toISOString().split('T')[0],
                earnings: Math.round(currentValue)
            });
        }
        
        return earningsData;
    }
    
    setupEventListeners() {
        // Copy referral link
        const copyBtn = document.getElementById('copyReferralBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const referralLink = document.getElementById('referralLink');
                if (referralLink) {
                    navigator.clipboard.writeText(referralLink.value)
                        .then(() => this.showToast('Referral link copied!', 'success'))
                        .catch(() => this.showToast('Failed to copy link', 'error'));
                }
            });
        }
        
        // Refresh activities
        const refreshBtn = document.getElementById('refreshActivities');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const userId = authGuard.getUserId();
                if (userId) {
                    this.loadRecentTransactions(userId);
                    this.showToast('Activities refreshed', 'success');
                }
            });
        }
        
        // Mobile refresh
        const mobileRefresh = document.getElementById('mobileRefresh');
        if (mobileRefresh) {
            mobileRefresh.addEventListener('click', () => {
                this.loadAllData();
                this.showToast('Dashboard refreshed', 'success');
            });
        }
        
        // Quick withdraw
        const quickWithdraw = document.getElementById('quickWithdraw');
        if (quickWithdraw) {
            quickWithdraw.addEventListener('click', () => {
                const { profile } = authGuard.getUser();
                if (profile?.balance < 100) {
                    this.showToast('Minimum withdrawal is ₹100', 'warning');
                    return;
                }
                window.location.href = 'withdraw.html';
            });
        }
    }
    
    setupRealtime() {
        const userId = authGuard.getUserId();
        if (!userId) return;
        
        // Subscribe to profile changes
        supabase
            .channel('profile-changes')
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                (payload) => {
                    console.log('Profile updated:', payload.new);
                    // Update local profile
                    const { profile } = authGuard.getUser();
                    if (profile) {
                        Object.assign(profile, payload.new);
                        this.updateStatsUI({
                            balance: profile.balance,
                            totalInvested: this.userData.stats.totalInvested,
                            totalEarnings: this.userData.stats.totalEarnings,
                            todayEarnings: this.userData.stats.todayEarnings,
                            activePlans: this.userData.stats.activePlans,
                            investmentProfit: this.userData.stats.investmentProfit
                        });
                    }
                }
            )
            .subscribe();
    }
    
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
        
        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => toast.remove());
    }
    
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }
        
        // Remove loading states
        this.removeLoadingStates();
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Start loading animation immediately
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
    
    // Initialize dashboard after a short delay
    setTimeout(() => {
        window.dashboard = new Dashboard();
    }, 500);
});
