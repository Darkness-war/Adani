import { supabase, sessionManager, dbService, utils } from '../../core/supabase.js';

class AdminDashboard {
    constructor() {
        this.currentAdmin = null;
        this.stats = {
            totalUsers: 0,
            totalBalance: 0,
            pendingRequests: 0,
            todayRevenue: 0,
            pendingRecharges: 0,
            pendingWithdrawals: 0
        };
        
        this.charts = {
            revenueChart: null,
            userGrowthChart: null
        };
        
        this.init();
    }
    
    async init() {
        console.log('[AdminDashboard] Initializing...');
        
        // Check admin authentication
        await this.checkAdminAccess();
        
        // Load all dashboard data
        await this.loadDashboardData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize charts
        this.initCharts();
        
        // Start auto refresh
        this.startAutoRefresh();
        
        console.log('[AdminDashboard] Initialized successfully');
    }
    
    async checkAdminAccess() {
        try {
            const { user } = await sessionManager.getCurrentUser();
            if (!user) {
                window.location.href = '/pages/auth/login.html';
                return;
            }
            
            // Check if user is admin in profiles table
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_admin, full_name, email')
                .eq('id', user.id)
                .single();
            
            if (error) throw error;
            
            if (!profile?.is_admin) {
                utils.showToast('Admin access required', 'error');
                setTimeout(() => {
                    window.location.href = '/pages/user/dashboard.html';
                }, 2000);
                return;
            }
            
            this.currentAdmin = {
                ...user,
                ...profile
            };
            
            // Update UI with admin info
            this.updateAdminInfo();
            
        } catch (error) {
            console.error('[AdminDashboard] Admin check failed:', error);
            window.location.href = '/pages/auth/login.html';
        }
    }
    
    updateAdminInfo() {
        // Update admin name in sidebar
        const adminName = document.getElementById('adminName');
        if (adminName && this.currentAdmin) {
            adminName.textContent = this.currentAdmin.full_name || 
                                  this.currentAdmin.email?.split('@')[0] || 
                                  'Admin';
        }
        
        // Update welcome message if exists
        const welcomeName = document.querySelector('#welcomeUserName');
        if (welcomeName && this.currentAdmin) {
            welcomeName.textContent = this.currentAdmin.full_name || 
                                     this.currentAdmin.email?.split('@')[0] || 
                                     'Admin';
        }
    }
    
    async loadDashboardData() {
        try {
            utils.showLoading();
            
            // Load all data in parallel
            await Promise.all([
                this.loadStats(),
                this.loadRecentRecharges(),
                this.loadRecentWithdrawals(),
                this.loadPendingCounts(),
                this.loadChartData()
            ]);
            
            // Update UI with loaded data
            this.updateStatsUI();
            this.updatePendingCountsUI();
            
        } catch (error) {
            console.error('[AdminDashboard] Error loading data:', error);
            utils.showToast('Failed to load dashboard data', 'error');
        } finally {
            utils.hideLoading();
        }
    }
    
    async loadStats() {
        try {
            // Get total users count
            const { count: totalUsers, error: usersError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });
            
            if (usersError) throw usersError;
            
            // Get total platform balance
            const { data: balanceData, error: balanceError } = await supabase
                .from('profiles')
                .select('balance');
            
            if (balanceError) throw balanceError;
            
            const totalBalance = balanceData?.reduce((sum, user) => sum + (user.balance || 0), 0) || 0;
            
            // Get pending requests count
            const { count: pendingRecharges } = await supabase
                .from('payment_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            
            const { count: pendingWithdrawals } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'withdrawal')
                .eq('status', 'pending');
            
            const pendingRequests = (pendingRecharges || 0) + (pendingWithdrawals || 0);
            
            // Get today's revenue
            const today = new Date().toISOString().split('T')[0];
            const { data: todayTransactions } = await supabase
                .from('transactions')
                .select('amount, type')
                .gte('created_at', today)
                .eq('status', 'completed');
            
            let todayRevenue = 0;
            if (todayTransactions) {
                todayRevenue = todayTransactions
                    .filter(tx => tx.type === 'deposit' || tx.type === 'investment')
                    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
            }
            
            // Calculate growth percentages (simplified for demo)
            const userGrowth = 5.2; // In production, calculate from previous period
            const balanceGrowth = 8.7;
            const revenueGrowth = 12.3;
            
            this.stats = {
                totalUsers: totalUsers || 0,
                totalBalance,
                pendingRequests,
                todayRevenue,
                pendingRecharges: pendingRecharges || 0,
                pendingWithdrawals: pendingWithdrawals || 0,
                userGrowth,
                balanceGrowth,
                revenueGrowth
            };
            
        } catch (error) {
            console.error('[AdminDashboard] Error loading stats:', error);
            throw error;
        }
    }
    
    updateStatsUI() {
        // Update total users
        const totalUsersEl = document.getElementById('totalUsers');
        const userGrowthEl = document.getElementById('userGrowth');
        if (totalUsersEl) totalUsersEl.textContent = this.stats.totalUsers.toLocaleString();
        if (userGrowthEl) userGrowthEl.textContent = `${this.stats.userGrowth}%`;
        
        // Update total balance
        const totalBalanceEl = document.getElementById('totalBalance');
        const balanceGrowthEl = document.getElementById('balanceGrowth');
        if (totalBalanceEl) totalBalanceEl.textContent = utils.formatCurrency(this.stats.totalBalance);
        if (balanceGrowthEl) balanceGrowthEl.textContent = `${this.stats.balanceGrowth}%`;
        
        // Update pending requests
        const pendingRequestsEl = document.getElementById('pendingRequests');
        const pendingTimeEl = document.getElementById('pendingTime');
        if (pendingRequestsEl) pendingRequestsEl.textContent = this.stats.pendingRequests;
        if (pendingTimeEl) pendingTimeEl.textContent = '2 hrs avg';
        
        // Update today's revenue
        const todayRevenueEl = document.getElementById('todayRevenue');
        const revenueGrowthEl = document.getElementById('revenueGrowth');
        if (todayRevenueEl) todayRevenueEl.textContent = utils.formatCurrency(this.stats.todayRevenue);
        if (revenueGrowthEl) revenueGrowthEl.textContent = `${this.stats.revenueGrowth}%`;
    }
    
    updatePendingCountsUI() {
        // Update pending counts in sidebar
        document.querySelectorAll('.pending-count').forEach(el => {
            el.textContent = this.stats.pendingRequests;
        });
        
        // Update quick action buttons
        const pendingRechargesEl = document.getElementById('pendingRecharges');
        const pendingWithdrawalsEl = document.getElementById('pendingWithdrawals');
        
        if (pendingRechargesEl) {
            pendingRechargesEl.textContent = `${this.stats.pendingRecharges} pending`;
        }
        
        if (pendingWithdrawalsEl) {
            pendingWithdrawalsEl.textContent = `${this.stats.pendingWithdrawals} pending`;
        }
    }
    
    async loadRecentRecharges() {
        try {
            const { data: recharges, error } = await supabase
                .from('payment_requests')
                .select(`
                    *,
                    user:profiles!inner(full_name, email)
                `)
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (error) throw error;
            
            this.renderRecentRecharges(recharges || []);
            
        } catch (error) {
            console.error('[AdminDashboard] Error loading recharges:', error);
        }
    }
    
    renderRecentRecharges(recharges) {
        const container = document.getElementById('recentRechargesBody');
        if (!container) return;
        
        if (recharges.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="4" class="p-4 text-center text-gray-500">
                        No recent recharge requests
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = recharges.map(recharge => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3">
                    <div class="font-medium text-gray-900">${recharge.user?.full_name || 'User'}</div>
                    <div class="text-sm text-gray-500">${recharge.user?.email || ''}</div>
                </td>
                <td class="p-3">
                    <div class="font-semibold text-gray-900">${utils.formatCurrency(recharge.amount)}</div>
                    <div class="text-sm text-gray-500">${utils.formatDate(recharge.created_at)}</div>
                </td>
                <td class="p-3">
                    <span class="status-badge ${recharge.status}">
                        ${recharge.status}
                    </span>
                </td>
                <td class="p-3">
                    ${recharge.status === 'pending' ? `
                        <button class="action-btn approve" onclick="adminDashboard.approveRecharge('${recharge.id}')">
                            <i class="fas fa-check"></i>
                            Approve
                        </button>
                        <button class="action-btn reject ml-2" onclick="adminDashboard.rejectRecharge('${recharge.id}')">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                    ` : `
                        <button class="action-btn view" onclick="adminDashboard.viewRechargeDetails('${recharge.id}')">
                            <i class="fas fa-eye"></i>
                            View
                        </button>
                    `}
                </td>
            </tr>
        `).join('');
    }
    
    async loadRecentWithdrawals() {
        try {
            const { data: withdrawals, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    user:profiles!inner(full_name, email)
                `)
                .eq('type', 'withdrawal')
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (error) throw error;
            
            this.renderRecentWithdrawals(withdrawals || []);
            
        } catch (error) {
            console.error('[AdminDashboard] Error loading withdrawals:', error);
        }
    }
    
    renderRecentWithdrawals(withdrawals) {
        const container = document.getElementById('recentWithdrawalsBody');
        if (!container) return;
        
        if (withdrawals.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="4" class="p-4 text-center text-gray-500">
                        No recent withdrawal requests
                    </td>
                </tr>
            `;
            return;
        }
        
        container.innerHTML = withdrawals.map(withdrawal => `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3">
                    <div class="font-medium text-gray-900">${withdrawal.user?.full_name || 'User'}</div>
                    <div class="text-sm text-gray-500">${withdrawal.user?.email || ''}</div>
                </td>
                <td class="p-3">
                    <div class="font-semibold text-gray-900">${utils.formatCurrency(withdrawal.amount)}</div>
                    <div class="text-sm text-gray-500">${utils.formatDate(withdrawal.created_at)}</div>
                </td>
                <td class="p-3">
                    <span class="status-badge ${withdrawal.status}">
                        ${withdrawal.status}
                    </span>
                </td>
                <td class="p-3">
                    ${withdrawal.status === 'pending' ? `
                        <button class="action-btn approve" onclick="adminDashboard.approveWithdrawal('${withdrawal.id}')">
                            <i class="fas fa-check"></i>
                            Approve
                        </button>
                        <button class="action-btn reject ml-2" onclick="adminDashboard.rejectWithdrawal('${withdrawal.id}')">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                    ` : `
                        <button class="action-btn view" onclick="adminDashboard.viewWithdrawalDetails('${withdrawal.id}')">
                            <i class="fas fa-eye"></i>
                            View
                        </button>
                    `}
                </td>
            </tr>
        `).join('');
    }
    
    async loadPendingCounts() {
        try {
            // Count pending recharges
            const { count: pendingRecharges } = await supabase
                .from('payment_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            
            // Count pending withdrawals
            const { count: pendingWithdrawals } = await supabase
                .from('transactions')
                .select('*', { count: 'exact', head: true })
                .eq('type', 'withdrawal')
                .eq('status', 'pending');
            
            this.stats.pendingRecharges = pendingRecharges || 0;
            this.stats.pendingWithdrawals = pendingWithdrawals || 0;
            this.stats.pendingRequests = (pendingRecharges || 0) + (pendingWithdrawals || 0);
            
        } catch (error) {
            console.error('[AdminDashboard] Error loading pending counts:', error);
        }
    }
    
    async loadChartData() {
        try {
            // Load data for revenue chart (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { data: revenueData } = await supabase
                .from('transactions')
                .select('amount, created_at, type')
                .gte('created_at', thirtyDaysAgo.toISOString())
                .eq('status', 'completed')
                .in('type', ['deposit', 'investment']);
            
            // Process revenue data for chart
            const revenueByDay = this.processDataByDay(revenueData || []);
            
            // Load user growth data
            const { data: usersData } = await supabase
                .from('profiles')
                .select('created_at')
                .gte('created_at', thirtyDaysAgo.toISOString());
            
            const usersByDay = this.processDataByDay(usersData || [], 'created_at');
            
            return {
                revenueByDay,
                usersByDay
            };
            
        } catch (error) {
            console.error('[AdminDashboard] Error loading chart data:', error);
            return {
                revenueByDay: [],
                usersByDay: []
            };
        }
    }
    
    processDataByDay(data, dateField = 'created_at') {
        const days = {};
        const today = new Date();
        
        // Initialize last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            days[dateStr] = 0;
        }
        
        // Aggregate data
        data.forEach(item => {
            const date = new Date(item[dateField]);
            const dateStr = date.toISOString().split('T')[0];
            
            if (days[dateStr] !== undefined) {
                if (item.amount) {
                    days[dateStr] += parseFloat(item.amount) || 0;
                } else {
                    days[dateStr] += 1;
                }
            }
        });
        
        // Convert to array format for Chart.js
        return Object.entries(days).map(([date, value]) => ({
            date,
            value
        }));
    }
    
    initCharts() {
        // Revenue chart
        const revenueCtx = document.getElementById('revenueChart');
        if (revenueCtx) {
            this.charts.revenueChart = new Chart(revenueCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Daily Revenue',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `Revenue: ${utils.formatCurrency(context.raw)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => {
                                    return '₹' + value.toLocaleString();
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 0
                            }
                        }
                    }
                }
            });
        }
        
        // User growth chart
        const userGrowthCtx = document.getElementById('userGrowthChart');
        i
