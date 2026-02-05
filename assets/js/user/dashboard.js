// dashboard.js - Complete Professional Dashboard
import { supabase } from '../../core/supabase.js';

class Dashboard {
    constructor() {
        this.currentUser = null;
        this.currentProfile = null;
        this.userData = {
            stats: {},
            plans: [],
            investments: [],
            transactions: [],
            notifications: [],
            earningsData: []
        };
        this.chart = null;
        this.chartData = {
            labels: [],
            datasets: []
        };
        
        this.init();
    }
    
    async init() {
        console.log('[Dashboard] Initializing...');
        
        // Check authentication
        await this.checkAuth();
        
        // Setup UI elements
        this.setupUI();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load all data
        await this.loadAllData();
        
        // Initialize chart
        this.initChart();
        
        // Setup realtime subscriptions
        this.setupRealtime();
        
        // Hide loading overlay with delay
        setTimeout(() => {
            this.hideLoading();
        }, 1000);
        
        console.log('[Dashboard] Initialized successfully');
    }
    
    async checkAuth() {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                window.location.href = '/pages/auth/login.html';
                return;
            }
            
            this.currentUser = user;
            
            // Get user profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
                
            if (profileError) throw profileError;
            
            this.currentProfile = profile;
            
        } catch (error) {
            console.error('[Dashboard] Auth error:', error);
            window.location.href = '/pages/auth/login.html';
        }
    }
    
    setupUI() {
        // Update user info
        this.updateUserInfo();
        
        // Update current date
        this.updateCurrentDate();
        
        // Setup tab switching
        this.setupTabs();
        
        // Setup time filter
        this.setupTimeFilter();
    }
    
    updateUserInfo() {
        if (!this.currentUser || !this.currentProfile) return;
        
        // Update sidebar user info
        const userName = this.currentProfile.full_name || this.currentUser.email?.split('@')[0] || 'User';
        const userEmail = this.currentUser.email || 'user@example.com';
        const userTier = this.currentProfile.tier || 'Standard';
        
        // Desktop sidebar
        document.getElementById('sidebarUserName').textContent = userName;
        document.getElementById('sidebarUserEmail').textContent = userEmail;
        document.getElementById('userTier').textContent = userTier;
        
        // Mobile sidebar
        document.getElementById('mobileUserName').textContent = userName;
        document.getElementById('mobileUserEmail').textContent = userEmail;
        document.getElementById('mobileUserTier').textContent = userTier;
        
        // Welcome section
        document.getElementById('welcomeUserName').textContent = userName;
        
        // Set avatar if available
        if (this.currentProfile.avatar_url) {
            const avatarImg = document.getElementById('userAvatarImg');
            const mobileAvatarImg = document.getElementById('mobileUserAvatarImg');
            
            if (avatarImg) avatarImg.src = this.currentProfile.avatar_url;
            if (mobileAvatarImg) mobileAvatarImg.src = this.currentProfile.avatar_url;
        }
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
        document.getElementById('currentDate').textContent = dateString;
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
                    if (pane.id === `${tabId}-plans') {
                        pane.classList.add('active');
                    }
                });
                
                // Load content for tab if needed
                if (tabId === 'my' && this.userData.investments.length === 0) {
                    this.loadUserInvestments();
                }
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
                
                // Filter stats based on time range
                this.filterStatsByTime(timeRange);
            });
        });
    }
    
    setupEventListeners() {
        // Sidebar collapse
        const sidebarCollapse = document.getElementById('sidebarCollapse');
        if (sidebarCollapse) {
            sidebarCollapse.addEventListener('click', () => {
                document.querySelector('.desktop-sidebar').classList.toggle('collapsed');
                sidebarCollapse.querySelector('i').classList.toggle('fa-chevron-left');
                sidebarCollapse.querySelector('i').classList.toggle('fa-chevron-right');
            });
        }
        
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileSidebar = document.getElementById('mobileSidebar');
        const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
        const closeMobileSidebar = document.getElementById('closeMobileSidebar');
        
        if (mobileMenuToggle && mobileSidebar && mobileSidebarOverlay) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileSidebar.classList.add('active');
                mobileSidebarOverlay.classList.add('active');
            });
            
            closeMobileSidebar.addEventListener('click', () => {
                mobileSidebar.classList.remove('active');
                mobileSidebarOverlay.classList.remove('active');
            });
            
            mobileSidebarOverlay.addEventListener('click', () => {
                mobileSidebar.classList.remove('active');
                mobileSidebarOverlay.classList.remove('active');
            });
        }
        
        // Copy referral link
        const copyReferralBtn = document.getElementById('copyReferralBtn');
        if (copyReferralBtn) {
            copyReferralBtn.addEventListener('click', () => {
                const referralLink = document.getElementById('referralLink');
                if (referralLink) {
                    referralLink.select();
                    navigator.clipboard.writeText(referralLink.value)
                        .then(() => this.showToast('Referral link copied to clipboard!', 'success'))
                        .catch(() => this.showToast('Failed to copy link', 'error'));
                }
            });
        }
        
        // Share referral link
        const shareReferralBtn = document.getElementById('shareReferralBtn');
        if (shareReferralBtn) {
            shareReferralBtn.addEventListener('click', () => {
                const referralLink = document.getElementById('referralLink').value;
                if (navigator.share) {
                    navigator.share({
                        title: 'Join Uzumaki Investments',
                        text: 'Earn with me on Uzumaki Investments!',
                        url: referralLink
                    });
                } else {
                    // Fallback for browsers that don't support Web Share API
                    this.copyToClipboard(referralLink);
                }
            });
        }
        
        // Refresh activities
        const refreshActivities = document.getElementById('refreshActivities');
        if (refreshActivities) {
            refreshActivities.addEventListener('click', () => {
                this.loadRecentTransactions();
                this.showToast('Activities refreshed', 'success');
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
                if (this.currentProfile.balance < 100) {
                    this.showToast('Minimum withdrawal amount is ₹100', 'warning');
                    return;
                }
                window.location.href = 'withdraw.html';
            });
        }
        
        // Logout buttons
        const logoutBtns = [document.getElementById('sidebarLogout'), document.getElementById('mobileLogoutBtn')];
        logoutBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.logout());
            }
        });
        
        // Notification modal
        const notificationBtn = document.getElementById('mobileNotifications');
        const notificationModal = document.getElementById('notificationModal');
        const closeNotificationModal = document.getElementById('closeNotificationModal');
        
        if (notificationBtn && notificationModal && closeNotificationModal) {
            notificationBtn.addEventListener('click', () => {
                notificationModal.classList.add('active');
                this.markNotificationsAsRead();
            });
            
            closeNotificationModal.addEventListener('click', () => {
                notificationModal.classList.remove('active');
            });
            
            // Close modal on overlay click
            notificationModal.addEventListener('click', (e) => {
                if (e.target === notificationModal) {
                    notificationModal.classList.remove('active');
                }
            });
        }
    }
    
    async loadAllData() {
        try {
            // Show loading states
            this.showLoadingStates();
            
            // Load data in parallel
            await Promise.all([
                this.loadUserStats(),
                this.loadInvestmentPlans(),
                this.loadUserInvestments(),
                this.loadRecentTransactions(),
                this.loadNotifications(),
                this.loadReferralStats(),
                this.loadEarningsData()
            ]);
            
            console.log('[Dashboard] All data loaded successfully');
            
        } catch (error) {
            console.error('[Dashboard] Error loading data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }
    
    showLoadingStates() {
        // Add loading class to elements
        const loadingElements = [
            'totalBalance', 'totalInvested', 'totalEarnings', 'referralEarnings',
            'basicPlansContainer', 'vipPlansContainer', 'myPlansContainer',
            'recentActivity', 'referralLink', 'totalReferrals', 'referralIncome'
        ];
        
        loadingElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('loading');
        });
    }
    
    removeLoadingStates() {
        // Remove loading class from elements
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => el.classList.remove('loading'));
    }
    
    async loadUserStats() {
        try {
            const userId = this.currentUser.id;
            
            // Get user balance
            const balance = this.currentProfile.balance || 0;
            
            // Get total invested from active investments
            const { data: investments, error: invError } = await supabase
                .from('investments')
                .select('amount, status, daily_profit')
                .eq('user_id', userId)
                .eq('status', 'active');
            
            if (invError) throw invError;
            
            const totalInvested = investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
            const activePlans = investments?.filter(inv => inv.status === 'active').length || 0;
            
            // Calculate total profit from investments
            const totalProfit = investments?.reduce((sum, inv) => {
                return sum + (inv.daily_profit || 0);
            }, 0) || 0;
            
            const investmentProfit = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(2) : '0.00';
            
            // Get earnings data
            const { data: earnings, error: earnError } = await supabase
                .from('transactions')
                .select('amount, created_at')
                .eq('user_id', userId)
                .eq('type', 'earning')
                .eq('status', 'completed');
            
            if (earnError) throw earnError;
            
            const totalEarnings = earnings?.reduce((sum, earn) => sum + (earn.amount || 0), 0) || 0;
            
            // Get today's earnings
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayEarnings = earnings
                ?.filter(earn => new Date(earn.created_at) >= today)
                .reduce((sum, earn) => sum + (earn.amount || 0), 0) || 0;
            
            // Get yesterday's earnings
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayEarnings = earnings
                ?.filter(earn => {
                    const earnDate = new Date(earn.created_at);
                    return earnDate >= yesterday && earnDate < today;
                })
                .reduce((sum, earn) => sum + (earn.amount || 0), 0) || 0;
            
            // Calculate percentage change
            const earningsChange = yesterdayEarnings > 0 
                ? ((todayEarnings - yesterdayEarnings) / yesterdayEarnings * 100).toFixed(2)
                : todayEarnings > 0 ? '100.00' : '0.00';
            
            // Get monthly earnings
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const monthlyEarnings = earnings
                ?.filter(earn => new Date(earn.created_at) >= monthStart)
                .reduce((sum, earn) => sum + (earn.amount || 0), 0) || 0;
            
            // Update UI with loaded data
            this.updateStatsUI({
                balance,
                totalInvested,
                totalEarnings,
                todayEarnings,
                yesterdayEarnings,
                earningsChange,
                monthlyEarnings,
                activePlans,
                investmentProfit,
                totalProfit
            });
            
        } catch (error) {
            console.error('[Dashboard] Error loading user stats:', error);
        }
    }
    
    updateStatsUI(stats) {
        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }).format(amount);
        };
        
        // Update total balance
        const totalBalanceEl = document.getElementById('totalBalance');
        if (totalBalanceEl) {
            totalBalanceEl.textContent = formatCurrency(stats.balance);
        }
        
        // Update sidebar balance
        const sidebarBalanceEl = document.getElementById('sidebarBalance');
        const mobileBalanceEl = document.getElementById('mobileBalance');
        if (sidebarBalanceEl) sidebarBalanceEl.textContent = formatCurrency(stats.balance);
        if (mobileBalanceEl) mobileBalanceEl.textContent = formatCurrency(stats.balance);
        
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
            const changeSign = stats.earningsChange >= 0 ? '+' : '';
            earningsChangeEl.textContent = `${changeSign}${formatCurrency(stats.todayEarnings)} today`;
            earningsChangeEl.classList.toggle('positive', stats.todayEarnings >= 0);
            earningsChangeEl.classList.toggle('negative', stats.todayEarnings < 0);
        }
        
        // Update sidebar earnings
        const sidebarEarningsEl = document.getElementById('sidebarEarnings');
        const mobileEarningsEl = document.getElementById('mobileEarnings');
        if (sidebarEarningsEl) {
            sidebarEarningsEl.textContent = `+${formatCurrency(stats.todayEarnings)}`;
        }
        if (mobileEarningsEl) {
            mobileEarningsEl.textContent = `+${formatCurrency(stats.todayEarnings)}`;
        }
        
        // Update daily and monthly earnings
        const dailyEarningsEl = document.getElementById('dailyEarnings');
        const monthlyEarningsEl = document.getElementById('monthlyEarnings');
        if (dailyEarningsEl) dailyEarningsEl.textContent = formatCurrency(stats.todayEarnings);
        if (monthlyEarningsEl) monthlyEarningsEl.textContent = formatCurrency(stats.monthlyEarnings);
        
        // Update balance change
        const balanceChangeEl = document.getElementById('balanceChange');
        if (balanceChangeEl) {
            const changePercent = stats.totalEarnings > 0 
                ? ((stats.todayEarnings / stats.totalEarnings) * 100).toFixed(2)
   
