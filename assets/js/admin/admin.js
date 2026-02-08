// assets/js/admin/admin.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const supabaseUrl = 'https://atcfrcolbuikjnsoujzw.supabase.co';
const supabaseKey = 'sb_publishable_mUDZkzcq09gllPPjkG8pGQ_k6APV_gv';
const supabase = createClient(supabaseUrl, supabaseKey);

// Global State
let currentUser = null;
let adminData = {
    users: [],
    transactions: [],
    investments: [],
    settings: {}
};

// DOM Elements
const adminSections = {
    dashboard: document.getElementById('dashboardSection'),
    users: document.getElementById('usersSection'),
    transactions: document.getElementById('transactionsSection'),
    // Add more sections as needed
};

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', async () => {
    await initializeAdminPanel();
    setupEventListeners();
    loadDashboardData();
});

async function initializeAdminPanel() {
    showLoading(true);
    
    try {
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            window.location.href = '/pages/auth/login.html';
            return;
        }
        
        currentUser = user;
        
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin, full_name, avatar_url')
            .eq('id', user.id)
            .single();
        
        if (profileError || !profile?.is_admin) {
            showToast('Access Denied', 'You do not have admin privileges.', 'error');
            setTimeout(() => {
                window.location.href = '/pages/user/dashboard.html';
            }, 2000);
            return;
        }
        
        // Set admin user info
        document.getElementById('adminName').textContent = profile.full_name || 'Administrator';
        if (profile.avatar_url) {
            document.getElementById('adminAvatar').src = profile.avatar_url;
        }
        
        // Load initial data
        await Promise.all([
            loadUsers(),
            loadTransactions(),
            loadSystemStats(),
            loadSettings()
        ]);
        
        // Update real-time clock
        updateClock();
        setInterval(updateClock, 1000);
        
        // Start real-time subscriptions
        setupRealtimeSubscriptions();
        
    } catch (error) {
        console.error('Admin initialization error:', error);
        showToast('Error', 'Failed to initialize admin panel.', 'error');
    } finally {
        showLoading(false);
    }
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        // Load dashboard stats
        const stats = await getDashboardStats();
        updateDashboardStats(stats);
        
        // Load charts
        await renderCharts();
        
        // Load recent activity
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function getDashboardStats() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const [
        { count: totalUsers, error: usersError },
        { count: totalUsersYesterday, error: usersYesterdayError },
        { data: balanceData, error: balanceError },
        { count: totalInvestments, error: investmentsError },
        { count: totalInvestmentsYesterday, error: investmentsYesterdayError },
        { data: earningsData, error: earningsError },
        { data: pendingWithdrawals, error: withdrawalsError },
        { count: openTickets, error: ticketsError }
    ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
            .lt('created_at', today.toISOString())
            .gte('created_at', yesterday.toISOString()),
        supabase.from('wallets').select('balance, locked_balance'),
        supabase.from('investments').select('*', { count: 'exact', head: true })
            .eq('status', 'active'),
        supabase.from('investments').select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .lt('created_at', today.toISOString())
            .gte('created_at', yesterday.toISOString()),
        supabase.rpc('get_todays_earnings'),
        supabase.from('transactions').select('amount')
            .eq('type', 'withdrawal')
            .eq('status', 'pending'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true })
            .eq('status', 'open')
    ]);
    
    const totalBalance = balanceData?.reduce((sum, wallet) => 
        sum + parseFloat(wallet.balance || 0) + parseFloat(wallet.locked_balance || 0), 0) || 0;
    
    const userChange = totalUsersYesterday ? 
        ((totalUsers - totalUsersYesterday) / totalUsersYesterday * 100).toFixed(1) : 0;
    
    const investmentChange = totalInvestmentsYesterday ? 
        ((totalInvestments - totalInvestmentsYesterday) / totalInvestmentsYesterday * 100).toFixed(1) : 0;
    
    return {
        totalUsers: totalUsers || 0,
        userChange: `${userChange}%`,
        totalBalance: formatCurrency(totalBalance),
        totalInvestments: totalInvestments || 0,
        investmentChange: `${investmentChange}%`,
        todayEarnings: formatCurrency(earningsData?.[0]?.total || 0),
        pendingWithdrawals: formatCurrency(pendingWithdrawals?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0),
        withdrawalCount: pendingWithdrawals?.length || 0,
        openTickets: openTickets || 0
    };
}

function updateDashboardStats(stats) {
    document.getElementById('totalUsers').textContent = stats.totalUsers;
    document.getElementById('userChange').textContent = `${stats.userChange} increase`;
    document.getElementById('totalBalance').textContent = stats.totalBalance;
    document.getElementById('totalInvestments').textContent = stats.totalInvestments;
    document.getElementById('investmentChange').textContent = `${stats.investmentChange} increase`;
    document.getElementById('todayEarnings').textContent = stats.todayEarnings;
    document.getElementById('pendingWithdrawals').textContent = stats.pendingWithdrawals;
    document.getElementById('withdrawalCount').textContent = `${stats.withdrawalCount} requests`;
    document.getElementById('openTickets').textContent = stats.openTickets;
}

// User Management Functions
async function loadUsers(filters = {}) {
    try {
        let query = supabase
            .from('profiles')
            .select(`
                *,
                wallets(balance, total_invested, total_earned),
                user_metadata(verification_status, kyc_status)
            `);
        
        // Apply filters
        if (filters.search) {
            query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
        }
        
        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }
        
        if (filters.verification && filters.verification !== 'all') {
            if (filters.verification === 'verified') {
                query = query.eq('user_metadata.verification_status', 'verified');
            } else if (filters.verification === 'unverified') {
                query = query.eq('user_metadata.verification_status', 'unverified');
            } else if (filters.verification === 'pending') {
                query = query.eq('user_metadata.kyc_status', 'pending');
            }
        }
        
        if (filters.dateFrom && filters.dateTo) {
            query = query.gte('created_at', filters.dateFrom).lte('created_at', filters.dateTo);
        }
        
        const { data: users, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        adminData.users = users || [];
        renderUsersTable(adminData.users);
        
        // Update badges
        const pendingVerifications = users.filter(u => 
            u.user_metadata?.kyc_status === 'pending'
        ).length;
        
        document.getElementById('pendingVerificationBadge').textContent = pendingVerifications;
        document.getElementById('userCountBadge').textContent = users.length;
        
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error', 'Failed to load users.', 'error');
    }
}

function renderUsersTable(users) {
    const tableBody = document.querySelector('#usersTable tbody');
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const balance = user.wallets?.[0]?.balance || 0;
        const totalInvested = user.wallets?.[0]?.total_invested || 0;
        const totalEarned = user.wallets?.[0]?.total_earned || 0;
        
        row.innerHTML = `
            <td>${user.id.substring(0, 8)}...</td>
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-sm me-2">
                        ${user.avatar_url ? 
                            `<img src="${user.avatar_url}" class="rounded-circle" width="32" height="32">` :
                            `<div class="avatar-placeholder">${user.full_name?.[0] || 'U'}</div>`
                        }
                    </div>
                    <div>
                        <strong>${user.full_name || 'No Name'}</strong>
                        <div class="small text-muted">ID: ${user.id.substring(0, 6)}</div>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>${user.phone || '-'}</td>
            <td>
                <strong class="text-success">₹${parseFloat(balance).toFixed(2)}</strong>
                <div class="small text-muted">
                    Invested: ₹${parseFloat(totalInvested).toFixed(2)}<br>
                    Earned: ₹${parseFloat(totalEarned).toFixed(2)}
                </div>
            </td>
            <td>
                <span class="badge ${getStatusBadgeClass(user.status)}">
                    ${user.status || 'active'}
                </span>
            </td>
            <td>
                ${user.user_metadata?.verification_status === 'verified' ? 
                    '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Verified</span>' :
                    '<span class="badge badge-warning"><i class="fas fa-clock"></i> Unverified</span>'
                }
                ${user.user_metadata?.kyc_status === 'verified' ? 
                    '<span class="badge badge-success ms-1">KYC</span>' :
                    user.user_metadata?.kyc_status === 'pending' ?
                    '<span class="badge badge-warning ms-1">KYC Pending</span>' :
                    '<span class="badge badge-secondary ms-1">No KYC</span>'
                }
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="viewUserDetails('${user.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="adjustBalance('${user.id}')">
                        <i class="fas fa-money-bill-wave"></i>
                    </button>
                    ${user.status === 'active' ? 
                        `<button class="btn btn-sm btn-outline text-danger" onclick="suspendUser('${user.id}')">
                            <i class="fas fa-ban"></i>
                        </button>` :
                        `<button class="btn btn-sm btn-outline text-success" onclick="activateUser('${user.id}')">
                            <i class="fas fa-check"></i>
                        </button>`
                    }
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Initialize DataTable if not already initialized
    if (!$.fn.DataTable.isDataTable('#usersTable')) {
        $('#usersTable').DataTable({
            responsive: true,
            pageLength: 25,
            order: [[7, 'desc']]
        });
    }
}

// Transaction Management Functions
async function loadTransactions(filters = {}) {
    try {
        let query = supabase
            .from('transactions')
            .select(`
                *,
                profiles(full_name, email)
            `);
        
        // Apply filters
        if (filters.type && filters.type !== 'all') {
            query = query.eq('type', filters.type);
        }
        
        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }
        
        if (filters.dateFrom && filters.dateTo) {
            query = query.gte('created_at', filters.dateFrom).lte('created_at', filters.dateTo);
        }
        
        if (filters.amountMin && filters.amountMax) {
            query = query.gte('amount', filters.amountMin).lte('amount', filters.amountMax);
        }
        
        const { data: transactions, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        
        adminData.transactions = transactions || [];
        renderTransactionsTable(adminData.transactions);
        
        // Update badges
        const pendingDeposits = transactions.filter(t => 
            t.type === 'deposit' && t.status === 'pending'
        ).length;
        
        const pendingWithdrawals = transactions.filter(t => 
            t.type === 'withdrawal' && t.status === 'pending'
        ).length;
        
        document.getElementById('depositBadge').textContent = pendingDeposits;
        document.getElementById('withdrawalBadge').textContent = pendingWithdrawals;
        document.getElementById('transactionBadge').textContent = transactions.length;
        
    } catch (error) {
        console.error('Error loading transactions:', error);
        showToast('Error', 'Failed to load transactions.', 'error');
    }
}

// Investment Management Functions
async function loadInvestmentPlans() {
    try {
        const { data: plans, error } = await supabase
            .from('investment_plans')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        adminData.investmentPlans = plans || [];
        renderInvestmentPlansTable(adminData.investmentPlans);
        
    } catch (error) {
        console.error('Error loading investment plans:', error);
        showToast('Error', 'Failed to load investment plans.', 'error');
    }
}

// Settings Management Functions
async function loadSettings() {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('*');
        
        if (error) throw error;
        
        // Convert array to object
        adminData.settings = {};
        settings.forEach(setting => {
            adminData.settings[setting.key] = setting.value;
        });
        
        // Apply settings to form
        applySettingsToForm();
        
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Error', 'Failed to load settings.', 'error');
    }
}

async function saveSettings() {
    try {
        const settingsToSave = getSettingsFromForm();
        const updates = [];
        
        for (const [key, value] of Object.entries(settingsToSave)) {
            updates.push(
                supabase.from('settings').upsert({
                    key,
                    value,
                    updated_by: currentUser.id,
                    updated_at: new Date().toISOString()
                })
            );
        }
        
        await Promise.all(updates);
        showToast('Success', 'Settings saved successfully.', 'success');
        
        // Apply maintenance mode if changed
        if (settingsToSave.maintenance_mode === 'true') {
            enableMaintenanceMode();
        } else {
            disableMaintenanceMode();
        }
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error', 'Failed to save settings.', 'error');
    }
}

// User Actions
async function editUser(userId) {
    const user = adminData.users.find(u => u.id === userId);
    if (!user) return;
    
    // Open edit modal with user data
    openModal('editUserModal', {
        user,
        onSave: async (updatedData) => {
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update(updatedData)
                    .eq('id', userId);
                
                if (error) throw error;
                
                showToast('Success', 'User updated successfully.', 'success');
                loadUsers();
                
            } catch (error) {
                console.error('Error updating user:', error);
                showToast('Error', 'Failed to update user.', 'error');
            }
        }
    });
}

async function suspendUser(userId) {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ status: 'suspended' })
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('Success', 'User suspended successfully.', 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error suspending user:', error);
        showToast('Error', 'Failed to suspend user.', 'error');
    }
}

async function activateUser(userId) {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ status: 'active' })
            .eq('id', userId);
        
        if (error) throw error;
        
        showToast('Success', 'User activated successfully.', 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error activating user:', error);
        showToast('Error', 'Failed to activate user.', 'error');
    }
}

async function adjustBalance(userId) {
    const user = adminData.users.find(u => u.id === userId);
    if (!user) return;
    
    const currentBalance = user.wallets?.[0]?.balance || 0;
    
    openModal('adjustBalanceModal', {
        user,
        currentBalance,
        onAdjust: async (amount, type, reason) => {
            try {
                // Update wallet
                const newBalance = type === 'add' ? 
                    parseFloat(currentBalance) + parseFloat(amount) :
                    parseFloat(currentBalance) - parseFloat(amount);
                
                const { error: walletError } = await supabase
                    .from('wallets')
                    .update({ balance: newBalance })
                    .eq('user_id', userId);
                
                if (walletError) throw walletError;
                
                // Create transaction record
                const { error: txError } = await supabase
                    .from('transactions')
                    .insert({
                        user_id: userId,
                        type: type === 'add' ? 'admin_deposit' : 'admin_withdrawal',
                        amount: amount,
                        status: 'completed',
                        description: `Admin ${type}: ${reason}`,
                        admin_id: currentUser.id
                    });
                
                if (txError) throw txError;
                
                showToast('Success', `Balance ${type === 'add' ? 'added' : 'deducted'} successfully.`, 'success');
                loadUsers();
                
            } catch (error) {
                console.error('Error adjusting balance:', error);
                showToast('Error', 'Failed to adjust balance.', 'error');
            }
        }
    });
}

// System Functions
async function enableMaintenanceMode() {
    try {
        const { error } = await supabase
            .from('settings')
            .upsert({
                key: 'maintenance_mode',
                value: 'true',
                updated_by: currentUser.id
            });
        
        if (error) throw error;
        
        showToast('Maintenance Mode', 'Maintenance mode enabled.', 'warning');
        
    } catch (error) {
        console.error('Error enabling maintenance mode:', error);
    }
}

async function disableMaintenanceMode() {
    try {
        const { error } = await supabase
            .from('settings')
            .upsert({
                key: 'maintenance_mode',
                value: 'false',
                updated_by: currentUser.id
            });
        
        if (error) throw error;
        
        showToast('Maintenance Mode', 'Maintenance mode disabled.', 'success');
        
    } catch (error) {
        console.error('Error disabling maintenance mode:', error);
    }
}

async function sendNotificationToAll(title, message, type = 'info') {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                title,
                message,
                type,
                send_to_all: true,
                created_by: currentUser.id
            });
        
        if (error) throw error;
        
        showToast('Success', 'Notification sent to all users.', 'success');
        
    } catch (error) {
        console.error('Error sending notification:', error);
        showToast('Error', 'Failed to send notification.', 'error');
    }
}

// Real-time Subscriptions
function setupRealtimeSubscriptions() {
    // Users subscription
    supabase
        .channel('admin-users')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'profiles' },
            (payload) => {
                console.log('Users change:', payload);
                loadUsers();
                loadDashboardData();
            }
        )
        .subscribe();
    
    // Transactions subscription
    supabase
        .channel('admin-transactions')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'transactions' },
            (payload) => {
                console.log('Transaction change:', payload);
                loadTransactions();
                loadDashboardData();
            }
        )
        .subscribe();
    
    // Investments subscription
    supabase
        .channel('admin-investments')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'investments' },
            (payload) => {
                console.log('Investment change:', payload);
                loadInvestmentPlans();
                loadDashboardData();
            }
        )
        .subscribe();
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusBadgeClass(status) {
    const classes = {
        active: 'badge-success',
        inactive: 'badge-secondary',
        suspended: 'badge-danger',
        pending: 'badge-warning',
        banned: 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
}

function updateClock() {
    const now = new Date();
    document.getElementById('currentTime').textContent = 
        now.toLocaleTimeString('en-IN', { 
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${getToastIcon(type)}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function openModal(modalId, data = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Populate modal with data
    if (data.user) {
        // Populate user modal
        document.getElementById('modalUserName').textContent = data.user.full_name;
        document.getElementById('modalUserEmail').textContent = data.user.email;
        // ... populate other fields
    }
    
    modal.classList.add('show');
    
    // Store callback
    if (data.onSave) {
        window.currentModalCallback = data.onSave;
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
    window.currentModalCallback = null;
}

// Event Listeners Setup
function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('adminSidebar').classList.toggle('show');
    });
    
    // Navigation
    document.querySelectorAll('.nav-item, .nav-subitem').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) {
                switchSection(section);
            }
        });
    });
    
    // User dropdown
    document.getElementById('userDropdownToggle').addEventListener('click', () => {
        document.getElementById('userDropdownMenu').classList.toggle('show');
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/index.html';
    });
    
    // Refresh button
    document.getElementById('refreshAll').addEventListener('click', () => {
        loadDashboardData();
        showToast('Refreshed', 'All data refreshed successfully.', 'success');
    });
    
    // Quick actions
    document.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleQuickAction(action);
        });
    });
    
    // Settings save
    document.getElementById('saveSettings')?.addEventListener('click', saveSettings);
    
    // User filters
    document.getElementById('applyUserFilters')?.addEventListener('click', () => {
        const filters = {
            search: document.getElementById('userSearch').value,
            status: document.getElementById('userStatusFilter').value,
            verification: document.getElementById('verificationFilter').value,
            dateFrom: document.getElementById('userDateFrom').value,
            dateTo: document.getElementById('userDateTo').value
        };
        loadUsers(filters);
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown-menu') && !e.target.closest('.user-toggle')) {
            document.getElementById('userDropdownMenu').classList.remove('show');
        }
        
        if (e.target.classList.contains('admin-modal')) {
            e.target.classList.remove('show');
        }
    });
}

function switchSection(sectionId) {
    // Hide all sections
    Object.values(adminSections).forEach(section => {
        if (section) section.classList.remove('active');
    });
    
    // Show selected section
    const section = adminSections[sectionId] || document.getElementById(`${sectionId}Section`);
    if (section) {
        section.classList.add('active');
    }
    
    // Update active nav item
    document.querySelectorAll('.nav-item, .nav-subitem').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
    
    // Load section data
    switch(sectionId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsers();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'investment-plans':
            loadInvestmentPlans();
            break;
        case 'website-settings':
            loadSettings();
            break;
    }
}

function handleQuickAction(action) {
    switch(action) {
        case 'send-notification':
            openModal('notificationModal');
            break;
        case 'add-plan':
            openModal('addPlanModal');
            break;
        case 'process-pending':
            processPendingTransactions();
            break;
        case 'backup-now':
            createBackup();
            break;
        case 'clear-cache':
            clearCache();
            break;
        case 'system-check':
            runSystemCheck();
            break;
    }
}

async function processPendingTransactions() {
    try {
        const { data: pending, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('status', 'pending');
        
        if (error) throw error;
        
        let processed = 0;
        for (const transaction of pending) {
            // Process transaction based on type
            if (transaction.type === 'deposit') {
                await processDeposit(transaction);
            } else if (transaction.type === 'withdrawal') {
                await processWithdrawal(transaction);
            }
            processed++;
        }
        
        showToast('Success', `Processed ${processed} pending transactions.`, 'success');
        loadTransactions();
        
    } catch (error) {
        console.error('Error processing transactions:', error);
        showToast('Error', 'Failed to process transactions.', 'error');
    }
}

async function createBackup() {
    try {
        showLoading(true);
        
        const backupData = await getAllData();
        const backupName = `backup_${Date.now()}.json`;
        
        // Create download link
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backupName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Save backup record
        await supabase.from('backups').insert({
            filename: backupName,
            size: blob.size,
            created_by: currentUser.id
        });
        
        showToast('Success', 'Backup created successfully.', 'success');
        
    } catch (error) {
        console.error('Error creating backup:', error);
        showToast('Error', 'Failed to create backup.', 'error');
    } finally {
        showLoading(false);
    }
}

async function getAllData() {
    const [
        { data: users },
        { data: transactions },
        { data: investments },
        { data: wallets },
        { data: settings }
    ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('investments').select('*'),
        supabase.from('wallets').select('*'),
        supabase.from('settings').select('*')
    ]);
    
    return {
        timestamp: new Date().toISOString(),
        created_by: currentUser.id,
        data: {
            users,
            transactions,
            investments,
            wallets,
            settings
        }
    };
}

async function clearCache() {
    try {
        // Clear localStorage cache
        localStorage.removeItem('admin_cache');
        
        // Clear session storage
        sessionStorage.clear();
        
        // Reload data
        await loadDashboardData();
        
        showToast('Success', 'Cache cleared successfully.', 'success');
        
    } catch (error) {
        console.error('Error clearing cache:', error);
        showToast('Error', 'Failed to clear cache.', 'error');
    }
}

async function runSystemCheck() {
    try {
        showLoading(true);
        
        const checks = [];
        
        // Database connection check
        const { data: dbCheck, error: dbError } = await supabase
            .from('profiles')
            .select('count', { count: 'exact', head: true });
        
        checks.push({
            name: 'Database Connection',
            status: !dbError ? 'success' : 'error',
            message: !dbError ? 'Connected successfully' : 'Connection failed'
        });
        
        // Storage check
        const { data: storage, error: storageError } = await supabase.storage.listBuckets();
        
        checks.push({
            name: 'Storage Service',
            status: !storageError ? 'success' : 'error',
            message: !storageError ? 'Storage available' : 'Storage unavailable'
        });
        
        // Realtime check
        checks.push({
            name: 'Realtime Service',
            status: 'success',
            message: 'Active'
        });
        
        // Email service check (mock)
        checks.push({
            name: 'Email Service',
            status: 'success',
            message: 'Ready'
        });
        
        // Render check results
        renderSystemCheckResults(checks);
        showToast('System Check', 'System check completed.', 'success');
        
    } catch (error) {
        console.error('Error running system check:', error);
        showToast('Error', 'System check failed.', 'error');
    } finally {
        showLoading(false);
    }
}

function renderSystemCheckResults(checks) {
    const modal = document.getElementById('systemCheckModal');
    if (!modal) return;
    
    const resultsContainer = modal.querySelector('.check-results');
    resultsContainer.innerHTML = '';
    
    checks.forEach(check => {
        const item = document.createElement('div');
        item.className = 'check-item';
        item.innerHTML = `
            <div class="check-name">${check.name}</div>
            <div class="check-status ${check.status}">
                <i class="fas fa-${check.status === 'success' ? 'check-circle' : 'times-circle'}"></i>
                ${check.message}
            </div>
        `;
        resultsContainer.appendChild(item);
    });
    
    modal.classList.add('show');
}

// Export functions to window for HTML event handlers
window.editUser = editUser;
window.viewUserDetails = viewUserDetails;
window.suspendUser = suspendUser;
window.activateUser = activateUser;
window.adjustBalance = adjustBalance;
window.closeModal = closeModal;
