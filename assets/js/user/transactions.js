[file name]: transactions.js
[file content begin]
// Transactions History Page JavaScript
console.log('[Transactions] Initializing transactions page...');

// Global Variables
let currentUser = null;
let userProfile = null;
let transactionsData = [];
let dataTable = null;
let transactionsChart = null;

// DOM Elements
const elements = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    
    // Summary elements
    totalDeposits: document.getElementById('totalDeposits'),
    totalWithdrawals: document.getElementById('totalWithdrawals'),
    totalEarnings: document.getElementById('totalEarnings'),
    totalInvestment: document.getElementById('totalInvestment'),
    
    // Statistics elements
    statDeposits: document.getElementById('statDeposits'),
    statWithdrawals: document.getElementById('statWithdrawals'),
    statEarnings: document.getElementById('statEarnings'),
    statInvestments: document.getElementById('statInvestments'),
    statReferrals: document.getElementById('statReferrals'),
    statFees: document.getElementById('statFees'),
    
    // Percent elements
    statDepositsPercent: document.getElementById('statDepositsPercent'),
    statWithdrawalsPercent: document.getElementById('statWithdrawalsPercent'),
    statEarningsPercent: document.getElementById('statEarningsPercent'),
    statInvestmentsPercent: document.getElementById('statInvestmentsPercent'),
    statReferralsPercent: document.getElementById('statReferralsPercent'),
    statFeesPercent: document.getElementById('statFeesPercent'),
    
    // Filter elements
    filterChips: document.querySelectorAll('.filter-chip'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    amountMin: document.getElementById('amountMin'),
    amountMax: document.getElementById('amountMax'),
    transactionSearch: document.getElementById('transactionSearch'),
    
    // Button elements
    exportTransactions: document.getElementById('exportTransactions'),
    refreshTransactions: document.getElementById('refreshTransactions'),
    clearFilters: document.getElementById('clearFilters'),
    clearSearch: document.getElementById('clearSearch'),
    applyFilters: document.getElementById('applyFilters'),
    resetTableFilters: document.getElementById('resetTableFilters'),
    
    // Modal elements
    transactionDetailsModal: document.getElementById('transactionDetailsModal'),
    receiptModal: document.getElementById('receiptModal'),
    
    // Chart element
    transactionsChart: document.getElementById('transactionsChart'),
    
    // Statistics period
    statisticsPeriod: document.getElementById('statisticsPeriod'),
    
    // Sidebar elements
    sidebarBalance: document.getElementById('sidebarBalance'),
    sidebarEarnings: document.getElementById('sidebarEarnings'),
    sidebarUserName: document.getElementById('sidebarUserName'),
    sidebarUserEmail: document.getElementById('sidebarUserEmail'),
    userTier: document.getElementById('userTier'),
    userVerified: document.getElementById('userVerified'),
    mobileBalance: document.getElementById('mobileBalance'),
    mobileEarnings: document.getElementById('mobileEarnings'),
    mobileUserName: document.getElementById('mobileUserName'),
    mobileUserEmail: document.getElementById('mobileUserEmail'),
    mobileUserTier: document.getElementById('mobileUserTier')
};

// Mock data for testing
const mockTransactions = [
    {
        id: 'TXN001234567890',
        type: 'deposit',
        amount: 10000,
        status: 'completed',
        date: '2024-03-15T10:30:00',
        description: 'Wallet deposit via UPI',
        payment_method: 'UPI',
        reference: 'REF123456',
        details: {
            from: 'UPI ID: user@okhdfcbank',
            to: 'Uzumaki Wallet',
            fees: 0,
            net_amount: 10000,
            notes: 'Initial deposit'
        },
        timeline: [
            { time: '2024-03-15T10:30:00', title: 'Initiated', description: 'Payment initiated by user' },
            { time: '2024-03-15T10:31:00', title: 'Processing', description: 'Payment processing by bank' },
            { time: '2024-03-15T10:32:00', title: 'Completed', description: 'Funds credited to wallet' }
        ]
    },
    {
        id: 'TXN001234567891',
        type: 'investment',
        amount: -5000,
        status: 'completed',
        date: '2024-03-14T14:45:00',
        description: 'Investment in Gold Plan',
        payment_method: 'Wallet',
        reference: 'INV001',
        details: {
            plan: 'Gold Investment Plan',
            duration: '12 months',
            roi: '15%',
            maturity_date: '2025-03-14'
        }
    },
    {
        id: 'TXN001234567892',
        type: 'earning',
        amount: 2500,
        status: 'completed',
        date: '2024-03-13T09:15:00',
        description: 'Daily earnings from investments',
        payment_method: 'System',
        reference: 'ERN001',
        details: {
            source: 'Gold Plan Investment',
            period: 'Daily',
            roi_rate: '15%'
        }
    },
    {
        id: 'TXN001234567893',
        type: 'withdrawal',
        amount: -3000,
        status: 'pending',
        date: '2024-03-12T16:20:00',
        description: 'Withdrawal to bank account',
        payment_method: 'Bank Transfer',
        reference: 'WDL001',
        details: {
            bank: 'HDFC Bank',
            account: 'XXXXXX1234',
            tds: 540,
            processing_fee: 10,
            net_amount: 2450
        },
        timeline: [
            { time: '2024-03-12T16:20:00', title: 'Requested', description: 'Withdrawal requested by user' },
            { time: '2024-03-12T16:21:00', title: 'Processing', description: 'Processing by finance team' }
        ]
    },
    {
        id: 'TXN001234567894',
        type: 'referral',
        amount: 500,
        status: 'completed',
        date: '2024-03-11T11:10:00',
        description: 'Referral bonus',
        payment_method: 'System',
        reference: 'REFB001',
        details: {
            referred_user: 'john@example.com',
            bonus_type: 'Signup Bonus'
        }
    },
    {
        id: 'TXN001234567895',
        type: 'fee',
        amount: -50,
        status: 'completed',
        date: '2024-03-10T12:00:00',
        description: 'Account maintenance fee',
        payment_method: 'System',
        reference: 'FEE001'
    },
    {
        id: 'TXN001234567896',
        type: 'deposit',
        amount: 20000,
        status: 'completed',
        date: '2024-03-09T15:45:00',
        description: 'Bank transfer deposit',
        payment_method: 'Bank Transfer',
        reference: 'REF123457',
        details: {
            from: 'ICICI Bank',
            to: 'Uzumaki Wallet',
            fees: 0,
            net_amount: 20000
        }
    },
    {
        id: 'TXN001234567897',
        type: 'withdrawal',
        amount: -10000,
        status: 'completed',
        date: '2024-03-08T10:30:00',
        description: 'Withdrawal for personal use',
        payment_method: 'UPI',
        reference: 'WDL002',
        details: {
            upi_id: 'user@okhdfcbank',
            tds: 1800,
            processing_fee: 10,
            net_amount: 8190
        }
    },
    {
        id: 'TXN001234567898',
        type: 'investment',
        amount: -15000,
        status: 'completed',
        date: '2024-03-07T14:20:00',
        description: 'Investment in VIP Plan',
        payment_method: 'Wallet',
        reference: 'INV002',
        details: {
            plan: 'VIP Investment Plan',
            duration: '24 months',
            roi: '20%',
            maturity_date: '2026-03-07'
        }
    },
    {
        id: 'TXN001234567899',
        type: 'earning',
        amount: 750,
        status: 'completed',
        date: '2024-03-06T09:00:00',
        description: 'Weekly earnings',
        payment_method: 'System',
        reference: 'ERN002'
    }
];

// Initialize Transactions Page
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Transactions] DOM loaded, initializing...');
    
    try {
        showLoading();
        
        // Initialize after short delay
        setTimeout(() => {
            initializeTransactions();
            initializeEventListeners();
            initializeSidebar();
            initializeModals();
            
            hideLoading();
            
            console.log('[Transactions] Initialization complete');
            showToast('Transaction history loaded successfully', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('[Transactions] Initialization error:', error);
        showToast('Failed to load transaction history', 'error');
        hideLoading();
    }
});

// Initialize Transactions
function initializeTransactions() {
    // Mock user data
    currentUser = {
        id: 'user_123',
        email: 'user@example.com'
    };
    
    userProfile = {
        first_name: 'John',
        last_name: 'Doe',
        account_tier: 'Premium',
        verified: true
    };
    
    // Set mock data
    transactionsData = [...mockTransactions];
    
    // Update UI
    updateSidebarUI();
    updateSummaryCards();
    initializeDataTable();
    initializeChart();
    updateStatistics();
    
    // Set default date range (last 30 days)
    setDefaultDateRange();
}

// Update Sidebar UI
function updateSidebarUI() {
    if (!userProfile || !currentUser) return;
    
    const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 
                    currentUser.email?.split('@')[0] || 'User';
    
    // Calculate total balance from transactions
    const totalBalance = calculateTotalBalance();
    const todayEarnings = calculateTodayEarnings();
    
    // Update desktop sidebar
    if (elements.sidebarUserName) elements.sidebarUserName.textContent = fullName;
    if (elements.sidebarUserEmail) elements.sidebarUserEmail.textContent = currentUser.email || '';
    if (elements.userTier) elements.userTier.textContent = userProfile.account_tier || 'Standard';
    if (elements.sidebarBalance) elements.sidebarBalance.textContent = formatCurrency(totalBalance);
    if (elements.sidebarEarnings) elements.sidebarEarnings.textContent = `+${formatCurrency(todayEarnings)}`;
    
    // Update mobile sidebar
    if (elements.mobileUserName) elements.mobileUserName.textContent = fullName;
    if (elements.mobileUserEmail) elements.mobileUserEmail.textContent = currentUser.email || '';
    if (elements.mobileUserTier) elements.mobileUserTier.textContent = userProfile.account_tier || 'Standard';
    if (elements.mobileBalance) elements.mobileBalance.textContent = formatCurrency(totalBalance);
    if (elements.mobileEarnings) elements.mobileEarnings.textContent = `+${formatCurrency(todayEarnings)}`;
    
    // Update verification badge
    if (userProfile.verified && elements.userVerified) {
        elements.userVerified.style.display = 'inline-block';
    }
}

// Calculate Total Balance
function calculateTotalBalance() {
    return transactionsData.reduce((total, transaction) => {
        return total + (transaction.status === 'completed' ? transaction.amount : 0);
    }, 15000); // Base balance
}

// Calculate Today's Earnings
function calculateTodayEarnings() {
    const today = new Date().toISOString().split('T')[0];
    return transactionsData
        .filter(t => t.type === 'earning' && 
                     new Date(t.date).toISOString().split('T')[0] === today &&
                     t.status === 'completed')
        .reduce((total, t) => total + t.amount, 0);
}

// Update Summary Cards
function updateSummaryCards() {
    const totals = calculateCategoryTotals();
    
    if (elements.totalDeposits) {
        elements.totalDeposits.textContent = formatCurrency(totals.deposits);
    }
    
    if (elements.totalWithdrawals) {
        elements.totalWithdrawals.textContent = formatCurrency(totals.withdrawals);
    }
    
    if (elements.totalEarnings) {
        elements.totalEarnings.textContent = formatCurrency(totals.earnings);
    }
    
    if (elements.totalInvestment) {
        elements.totalInvestment.textContent = formatCurrency(totals.investments);
    }
}

// Calculate Category Totals
function calculateCategoryTotals() {
    const totals = {
        deposits: 0,
        withdrawals: 0,
        earnings: 0,
        investments: 0,
        referrals: 0,
        fees: 0
    };
    
    transactionsData.forEach(transaction => {
        if (transaction.status !== 'completed') return;
        
        const amount = Math.abs(transaction.amount);
        
        switch (transaction.type) {
            case 'deposit':
                totals.deposits += amount;
                break;
            case 'withdrawal':
                totals.withdrawals += amount;
                break;
            case 'earning':
                totals.earnings += amount;
                break;
            case 'investment':
                totals.investments += amount;
                break;
            case 'referral':
                totals.referrals += amount;
                break;
            case 'fee':
                totals.fees += amount;
                break;
        }
    });
    
    return totals;
}

// Initialize DataTable
function initializeDataTable() {
    if (dataTable) {
        dataTable.destroy();
    }
    
    dataTable = $('#transactionsTable').DataTable({
        data: transactionsData.map(formatTransactionForTable),
        columns: [
            { data: 'id' },
            { 
                data: 'type',
                render: function(data, type, row) {
                    return `<span class="transaction-type-badge badge-${data}">
                        <i class="fas fa-${getTransactionIcon(data)}"></i>
                        ${getTransactionLabel(data)}
                    </span>`;
                }
            },
            { 
                data: 'amount',
                render: function(data, type, row) {
                    const isPositive = parseFloat(data) >= 0;
                    const sign = isPositive ? '+' : '';
                    const className = isPositive ? 'amount-positive' : 'amount-negative';
                    return `<span class="transaction-amount ${className}">${sign}${formatCurrency(Math.abs(data))}</span>`;
                }
            },
            { 
                data: 'status',
                render: function(data, type, row) {
                    return `<span class="status-badge status-${data}">
                        <i class="fas fa-${getStatusIcon(data)}"></i>
                        ${getStatusLabel(data)}
                    </span>`;
                }
            },
            { 
                data: 'date',
                render: function(data, type, row) {
                    return formatDateTime(data);
                }
            },
            { data: 'payment_method' },
            { data: 'reference' },
            {
                data: 'id',
                render: function(data, type, row) {
                    return `
                        <div class="transaction-actions">
                            <button class="btn-action" title="View Details" data-id="${data}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action" title="Download Receipt" data-id="${data}">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn-action" title="Print" data-id="${data}">
                                <i class="fas fa-print"></i>
                            </button>
                        </div>
                    `;
                },
                orderable: false
            }
        ],
        responsive: true,
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        order: [[4, 'desc']], // Sort by date descending
        language: {
            search: "Search:",
            lengthMenu: "Show _MENU_ entries",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty: "Showing 0 to 0 of 0 entries",
            infoFiltered: "(filtered from _MAX_ total entries)",
            zeroRecords: "No matching records found",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        },
        initComplete: function() {
            // Update total transactions count
            const totalTransactions = dataTable.data().count();
            document.getElementById('totalTransactions').textContent = totalTransactions;
            
            // Hide/show empty state
            const emptyState = document.getElementById('noTransactions');
            if (totalTransactions === 0) {
                emptyState.style.display = 'block';
            } else {
                emptyState.style.display = 'none';
            }
        },
        drawCallback: function() {
            // Re-attach event listeners to action buttons
            attachTableActionListeners();
        }
    });
}

// Format Transaction for DataTable
function formatTransactionForTable(transaction) {
    return {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        status: transaction.status,
        date: transaction.date,
        payment_method: transaction.payment_method,
        reference: transaction.reference,
        original: transaction // Keep original data for details
    };
}

// Get Transaction Icon
function getTransactionIcon(type) {
    const icons = {
        deposit: 'arrow-down',
        withdrawal: 'arrow-up',
        investment: 'chart-line',
        earning: 'coins',
        referral: 'user-friends',
        fee: 'file-invoice'
    };
    return icons[type] || 'exchange-alt';
}

// Get Transaction Label
function getTransactionLabel(type) {
    const labels = {
        deposit: 'Deposit',
        withdrawal: 'Withdrawal',
        investment: 'Investment',
        earning: 'Earning',
        referral: 'Referral',
        fee: 'Fee'
    };
    return labels[type] || 'Transaction';
}

// Get Status Icon
function getStatusIcon(status) {
    const icons = {
        completed: 'check-circle',
        pending: 'clock',
        processing: 'sync-alt',
        failed: 'times-circle',
        cancelled: 'ban'
    };
    return icons[status] || 'circle';
}

// Get Status Label
function getStatusLabel(status) {
    const labels = {
        completed: 'Completed',
        pending: 'Pending',
        processing: 'Processing',
        failed: 'Failed',
        cancelled: 'Cancelled'
    };
    return labels[status] || 'Unknown';
}

// Initialize Chart
function initializeChart() {
    const ctx = elements.transactionsChart?.getContext('2d');
    if (!ctx) return;
    
    // Calculate data for last 30 days
    const chartData = calculateChartData(30);
    
    if (transactionsChart) {
        transactionsChart.destroy();
    }
    
    transactionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.dates,
            datasets: [
                {
                    label: 'Deposits',
                    data: chartData.deposits,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Withdrawals',
                    data: chartData.withdrawals,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Earnings',
                    data: chartData.earnings,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value, true);
                        },
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            }
        }
    });
}

// Calculate Chart Data
function calculateChartData(days = 30) {
    const dates = [];
    const deposits = [];
    const withdrawals = [];
    const earnings = [];
    
    // Generate dates for the last N days
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(formatDate(date, 'short'));
        
        // Initialize totals for this date
        let dayDeposits = 0;
        let dayWithdrawals = 0;
        let dayEarnings = 0;
        
        // Calculate totals for this date
        const dateStr = date.toISOString().split('T')[0];
        
        transactionsData.forEach(transaction => {
            const transDate = new Date(transaction.date).toISOString().split('T')[0];
            
            if (transDate === dateStr && transaction.status === 'completed') {
                switch (transaction.type) {
                    case 'deposit':
                        dayDeposits += transaction.amount;
                        break;
                    case 'withdrawal':
                        dayWithdrawals += Math.abs(transaction.amount);
                        break;
                    case 'earning':
                        dayEarnings += transaction.amount;
                        break;
                }
            }
        });
        
        deposits.push(dayDeposits);
        withdrawals.push(dayWithdrawals);
        earnings.push(dayEarnings);
    }
    
    return { dates, deposits, withdrawals, earnings };
}

// Update Statistics
function updateStatistics() {
    const totals = calculateCategoryTotals();
    const total = Object.values(totals).reduce((sum, val) => sum + val, 0);
    
    // Update amounts
    if (elements.statDeposits) elements.statDeposits.textContent = formatCurrency(totals.deposits);
    if (elements.statWithdrawals) elements.statWithdrawals.textContent = formatCurrency(totals.withdrawals);
    if (elements.statEarnings) elements.statEarnings.textContent = formatCurrency(totals.earnings);
    if (elements.statInvestments) elements.statInvestments.textContent = formatCurrency(totals.investments);
    if (elements.statReferrals) elements.statReferrals.textContent = formatCurrency(totals.referrals);
    if (elements.statFees) elements.statFees.textContent = formatCurrency(totals.fees);
    
    // Update percentages
    if (elements.statDepositsPercent) {
        elements.statDepositsPercent.textContent = total > 0 ? `${((totals.deposits / total) * 100).toFixed(1)}%` : '0%';
    }
    if (elements.statWithdrawalsPercent) {
        elements.statWithdrawalsPercent.textContent = total > 0 ? `${((totals.withdrawals / total) * 100).toFixed(1)}%` : '0%';
    }
    if (elements.statEarningsPercent) {
        elements.statEarningsPercent.textContent = total > 0 ? `${((totals.earnings / total) * 100).toFixed(1)}%` : '0%';
    }
    if (elements.statInvestmentsPercent) {
        elements.statInvestmentsPercent.textContent = total > 0 ? `${((totals.investments / total) * 100).toFixed(1)}%` : '0%';
    }
    if (elements.statReferralsPercent) {
        elements.statReferralsPercent.textContent = total > 0 ? `${((totals.referrals / total) * 100).toFixed(1)}%` : '0%';
    }
    if (elements.statFeesPercent) {
        elements.statFeesPercent.textContent = total > 0 ? `${((totals.fees / total) * 100).toFixed(1)}%` : '0%';
    }
}

// Set Default Date Range
function setDefaultDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    if (elements.dateFrom) {
        elements.dateFrom.value = formatDate(thirtyDaysAgo, 'input');
    }
    
    if (elements.dateTo) {
        elements.dateTo.value = formatDate(today, 'input');
    }
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Filter chips
    elements.filterChips?.forEach(chip => {
        chip.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            const status = this.getAttribute('data-status');
            const parent = this.parentElement;
            
            // Remove active class from all chips in this group
            parent.querySelectorAll('.filter-chip').forEach(c => {
                c.classList.remove('active');
            });
            
            // Add active class to clicked chip
            this.classList.add('active');
            
            // If "All" was clicked, also update other groups if needed
            if (type === 'all' || status === 'all') {
                applyFilters();
            }
        });
    });
    
    // Date quick filters
    document.querySelectorAll('.date-quick-filters button').forEach(button => {
        button.addEventListener('click', function() {
            const days = parseInt(this.getAttribute('data-days'));
            setQuickDateRange(days);
        });
    });
    
    // Amount presets
    document.querySelectorAll('.amount-presets button').forEach(button => {
        button.addEventListener('click', function() {
            const min = this.getAttribute('data-min');
            const max = this.getAttribute('data-max');
            
            if (elements.amountMin) elements.amountMin.value = min || '';
            if (elements.amountMax) elements.amountMax.value = max || '';
        });
    });
    
    // Search input
    if (elements.transactionSearch) {
        elements.transactionSearch.addEventListener('input', function() {
            if (dataTable) {
                dataTable.search(this.value).draw();
            }
        });
        
        elements.transactionSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
    
    // Clear search
    if (elements.clearSearch) {
        elements.clearSearch.addEventListener('click', function() {
            if (elements.transactionSearch) {
                elements.transactionSearch.value = '';
                if (dataTable) {
                    dataTable.search('').draw();
                }
            }
        });
    }
    
    // Apply filters button
    if (elements.applyFilters) {
        elements.applyFilters.addEventListener('click', applyFilters);
    }
    
    // Clear filters button
    if (elements.clearFilters) {
        elements.clearFilters.addEventListener('click', clearFilters);
    }
    
    // Export button
    if (elements.exportTransactions) {
        elements.exportTransactions.addEventListener('click', exportTransactions);
    }
    
    // Refresh button
    if (elements.refreshTransactions) {
        elements.refreshTransactions.addEventListener('click', refreshTransactions);
    }
    
    // Reset table filters button
    if (elements.resetTableFilters) {
        elements.resetTableFilters.addEventListener('click', resetTableFilters);
    }
    
    // Statistics period change
    if (elements.statisticsPeriod) {
        elements.statisticsPeriod.addEventListener('change', updateChartByPeriod);
    }
    
    // Date inputs change
    if (elements.dateFrom && elements.dateTo) {
        elements.dateFrom.addEventListener('change', applyFilters);
        elements.dateTo.addEventListener('change', applyFilters);
    }
    
    // Amount inputs change
    if (elements.amountMin && elements.amountMax) {
        elements.amountMin.addEventListener('change', applyFilters);
        elements.amountMax.addEventListener('change', applyFilters);
    }
}

// Attach Table Action Listeners
function attachTableActionListeners() {
    // View details buttons
    document.querySelectorAll('.transaction-actions .btn-action[title="View Details"]').forEach(button => {
        button.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-id');
            showTransactionDetails(transactionId);
        });
    });
    
    // Download receipt buttons
    document.querySelectorAll('.transaction-actions .btn-action[title="Download Receipt"]').forEach(button => {
        button.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-id');
            downloadReceipt(transactionId);
        });
    });
    
    // Print buttons
    document.querySelectorAll('.transaction-actions .btn-action[title="Print"]').forEach(button => {
        button.addEventListener('click', function() {
            const transactionId = this.getAttribute('data-id');
            printReceipt(transactionId);
        });
    });
}

// Initialize Sidebar
function initializeSidebar() {
    // Sidebar collapse
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const desktopSidebar = document.querySelector('.desktop-sidebar');
    
    if (sidebarCollapse && desktopSidebar) {
        sidebarCollapse.addEventListener('click', () => {
            desktopSidebar.classList.toggle('collapsed');
        });
    }
    
    // Mobile menu
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
    const closeMobileSidebar = document.getElementById('closeMobileSidebar');
    
    if (mobileMenuToggle && mobileSidebar) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileSidebar.classList.add('active');
            if (mobileSidebarOverlay) mobileSidebarOverlay.classList.add('active');
        });
        
        if (closeMobileSidebar) {
            closeMobileSidebar.addEventListener('click', () => {
                mobileSidebar.classList.remove('active');
                if (mobileSidebarOverlay) mobileSidebarOverlay.classList.remove('active');
            });
        }
        
        if (mobileSidebarOverlay) {
            mobileSidebarOverlay.addEventListener('click', () => {
                mobileSidebar.classList.remove('active');
                mobileSidebarOverlay.classList.remove('active');
            });
        }
    }
    
    // Logout buttons
    const logoutButtons = [
        document.getElementById('sidebarLogout'),
        document.getElementById('mobileLogoutBtn')
    ];
    
    logoutButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (confirm('Are you sure you want to log out?')) {
                    showLoading('Logging out...');
                    setTimeout(() => {
                        window.location.href = '/pages/auth/login.html';
                    }, 1000);
                }
            });
        }
    });
}

// Initialize Modals
function initializeModals() {
    // Close modals when clicking outside
    document.querySelectorAll('.transactions-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal('transactionDetailsModal');
            closeModal('receiptModal');
        }
    });
    
    // Modal close buttons
    const closeButtons = {
        'closeDetailsModal': 'transactionDetailsModal',
        'closeReceiptModal': 'receiptModal',
        'closeDetails': 'transactionDetailsModal'
    };
    
    Object.entries(closeButtons).forEach(([buttonId, modalId]) => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => closeModal(modalId));
        }
    });
    
    // Print receipt button
    const printReceiptBtn = document.getElementById('printReceiptBtn');
    if (printReceiptBtn) {
        printReceiptBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Download receipt button
    const downloadReceiptBtn = document.getElementById('downloadReceipt');
    if (downloadReceiptBtn) {
        downloadReceiptBtn.addEventListener('click', downloadCurrentReceipt);
    }
}

// Apply Filters
function applyFilters() {
    if (!dataTable) return;
    
    let typeFilter = 'all';
    let statusFilter = 'all';
    
    // Get active type filter
    const activeTypeChip = document.querySelector('.filter-chip[data-type].active');
    if (activeTypeChip) {
        typeFilter = activeTypeChip.getAttribute('data-type');
    }
    
    // Get active status filter
    const activeStatusChip = document.querySelector('.filter-chip[data-status].active');
    if (activeStatusChip) {
        statusFilter = activeStatusChip.getAttribute('data-status');
    }
    
    // Build custom filter function
    $.fn.dataTable.ext.search.push(
        function(settings, data, dataIndex) {
            const row = dataTable.row(dataIndex).data();
            
            // Type filter
            if (typeFilter !== 'all' && row.type !== typeFilter) {
                return false;
            }
            
            // Status filter
            if (statusFilter !== 'all' && row.status !== statusFilter) {
                return false;
            }
            
            // Date range filter
            const dateFrom = elements.dateFrom?.value;
            const dateTo = elements.dateTo?.value;
            const rowDate = new Date(row.date).toISOString().split('T')[0];
            
            if (dateFrom && rowDate < dateFrom) {
                return false;
            }
            
            if (dateTo && rowDate > dateTo) {
                return false;
            }
            
            // Amount range filter
            const amountMin = parseFloat(elements.amountMin?.value) || -Infinity;
            const amountMax = parseFloat(elements.amountMax?.value) || Infinity;
            const rowAmount = Math.abs(row.amount);
            
            if (rowAmount < amountMin || rowAmount > amountMax) {
                return false;
            }
            
            return true;
        }
    );
    
    // Apply filters and redraw
    dataTable.draw();
    
    // Remove custom filter function
    $.fn.dataTable.ext.search.pop();
    
    // Update statistics based on filtered data
    updateFilteredStatistics();
    
    showToast('Filters applied successfully', 'success');
}

// Clear Filters
function clearFilters() {
    // Reset filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        if (chip.getAttribute('data-type') === 'all' || chip.getAttribute('data-status') === 'all') {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
    
    // Reset date range
    setDefaultDateRange();
    
    // Reset amount range
    if (elements.amountMin) elements.amountMin.value = '';
    if (elements.amountMax) elements.amountMax.value = '';
    
    // Reset search
    if (elements.transactionSearch) {
        elements.transactionSearch.value = '';
    }
    
    // Reset DataTable
    if (dataTable) {
        dataTable.search('').draw();
    }
    
    showToast('All filters cleared', 'success');
}

// Reset Table Filters
function resetTableFilters() {
    if (dataTable) {
        dataTable.search('').columns().search('').draw();
        clearFilters();
    }
}

// Set Quick Date Range
function setQuickDateRange(days) {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);
    
    if (elements.dateFrom) {
        elements.dateFrom.value = formatDate(startDate, 'input');
    }
    
    if (elements.dateTo) {
        elements.dateTo.value = formatDate(today, 'input');
    }
    
    applyFilters();
}

// Update Filtered Statistics
function updateFilteredStatistics() {
    if (!dataTable) return;
    
    const filteredData = dataTable.rows({ search: 'applied' }).data();
    let filteredTotals = {
        deposits: 0,
        withdrawals: 0,
        earnings: 0,
        investments: 0,
        referrals: 0,
        fees: 0
    };
    
    filteredData.each(function(value) {
        const transaction = value.original;
        if (transaction.status !== 'completed') return;
        
        const amount = Math.abs(transaction.amount);
        
        switch (transaction.type) {
            case 'deposit':
                filteredTotals.deposits += amount;
                break;
            case 'withdrawal':
                filteredTotals.withdrawals += amount;
                break;
            case 'earning':
                filteredTotals.earnings += amount;
                break;
            case 'investment':
                filteredTotals.investments += amount;
                break;
            case 'referral':
                filteredTotals.referrals += amount;
                break;
            case 'fee':
                filteredTotals.fees += amount;
                break;
        }
    });
    
    // Update summary cards with filtered data
    if (elements.totalDeposits) elements.totalDeposits.textContent = formatCurrency(filteredTotals.deposits);
    if (elements.totalWithdrawals) elements.totalWithdrawals.textContent = formatCurrency(filteredTotals.withdrawals);
    if (elements.totalEarnings) elements.totalEarnings.textContent = formatCurrency(filteredTotals.earnings);
    if (elements.totalInvestment) elements.totalInvestment.textContent = formatCurrency(filteredTotals.investments);
}

// Update Chart by Period
function updateChartByPeriod() {
    if (!elements.statisticsPeriod || !transactionsChart) return;
    
    const period = elements.statisticsPeriod.value;
    let days = 30;
    
    switch (period) {
        case '7d':
            days = 7;
            break;
        case '90d':
            days = 90;
            break;
        case '1y':
            days = 365;
            break;
    }
    
    const chartData = calculateChartData(days);
    
    transactionsChart.data.labels = chartData.dates;
    transactionsChart.data.datasets[0].data = chartData.deposits;
    transactionsChart.data.datasets[1].data = chartData.withdrawals;
    transactionsChart.data.datasets[2].data = chartData.earnings;
    
    transactionsChart.update();
}

// Show Transaction Details
function showTransactionDetails(transactionId) {
    const transaction = transactionsData.find(t => t.id === transactionId);
    if (!transaction) {
        showToast('Transaction not found', 'error');
        return;
    }
    
    const modalContent = document.getElementById('transactionDetailsContent');
    if (!modalContent) return;
    
    const isPositive = transaction.amount >= 0;
    const amountClass = isPositive ? 'amount-positive' : 'amount-negative';
    const amountSign = isPositive ? '+' : '';
    
    // Format details HTML
    let detailsHTML = '';
    if (transaction.details) {
        detailsHTML = Object.entries(transaction.details)
            .map(([key, value]) => `
                <div class="detail-item">
                    <div class="detail-label">${formatKey(key)}</div>
                    <div class="detail-value">${formatValue(value, key)}</div>
                </div>
            `)
            .join('');
    }
    
    // Format timeline HTML
    let timelineHTML = '';
    if (transaction.timeline && transaction.timeline.length > 0) {
        timelineHTML = `
            <div class="details-timeline">
                <h4>Transaction Timeline</h4>
                ${transaction.timeline.map(item => `
                    <div class="timeline-item">
                        <div class="timeline-icon">
                            <i class="fas fa-${getTimelineIcon(item.title)}"></i>
                        </div>
                        <div class="timeline-content">
                            <div class="timeline-title">${item.title}</div>
                            <div class="timeline-description">${item.description}</div>
                        </div>
                        <div class="timeline-time">${formatDateTime(item.time, 'time')}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    modalContent.innerHTML = `
        <div class="transaction-details">
            <div class="details-header">
                <span class="transaction-type-badge badge-${transaction.type}">
                    <i class="fas fa-${getTransactionIcon(transaction.type)}"></i>
                    ${getTransactionLabel(transaction.type)}
                </span>
                <div class="details-amount ${amountClass}">${amountSign}${formatCurrency(Math.abs(transaction.amount))}</div>
                <div class="details-date">${formatDateTime(transaction.date)}</div>
            </div>
            
            <div class="details-grid">
                <div class="detail-item">
                    <div class="detail-label">Transaction ID</div>
                    <div class="detail-value code">${transaction.id}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value">
                        <span class="status-badge status-${transaction.status}">
                            <i class="fas fa-${getStatusIcon(transaction.status)}"></i>
                            ${getStatusLabel(transaction.status)}
                        </span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Payment Method</div>
                    <div class="detail-value">${transaction.payment_method}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Reference</div>
                    <div class="detail-value code">${transaction.reference}</div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">Description</div>
                    <div class="detail-value">${transaction.description}</div>
                </div>
                
                ${detailsHTML}
            </div>
            
            ${timelineHTML}
        </div>
    `;
    
    // Store current transaction ID for receipt generation
    modalContent.dataset.transactionId = transactionId;
    
    openModal('transactionDetailsModal');
}

// Get Timeline Icon
function getTimelineIcon(title) {
    const icons = {
        'Initiated': 'play-circle',
        'Requested': 'hand-pointer',
        'Processing': 'sync-alt',
        'Completed': 'check-circle',
        'Failed': 'times-circle',
        'Cancelled': 'ban'
    };
    return icons[title] || 'circle';
}

// Format Key
function formatKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Format Value
function formatValue(value, key) {
    if (typeof value === 'number') {
        if (key.includes('amount') || key.includes('fee')) {
            return formatCurrency(value);
        }
        if (key.includes('percent') || key.includes('roi')) {
            return `${value}%`;
        }
    }
    if (typeof value === 'string' && value.includes('@')) {
        return value;
    }
    return value;
}

// Download Receipt
function downloadReceipt(transactionId) {
    const transaction = transactionsData.find(t => t.id === transactionId);
    if (!transaction) {
        showToast('Transaction not found', 'error');
        return;
    }
    
    generateReceipt(transaction);
    openModal('receiptModal');
}

// Download Current Receipt
function downloadCurrentReceipt() {
    const transactionId = document.getElementById('transactionDetailsContent')?.dataset.transactionId;
    if (transactionId) {
        downloadReceipt(transactionId);
    }
}

// Print Receipt
function printReceipt(transactionId) {
    const transaction = transactionsData.find(t => t.id === transactionId);
    if (!transaction) {
        showToast('Transaction not found', 'error');
        return;
    }
    
    generateReceipt(transaction);
    openModal('receiptModal');
    
    // Auto-print after a short delay
    setTimeout(() => {
        window.print();
    }, 500);
}

// Generate Receipt
function generateReceipt(transaction) {
    const receiptContent = document.getElementById('receiptContent');
    if (!receiptContent) return;
    
    const isPositive = transaction.amount >= 0;
    const amountSign = isPositive ? '+' : '';
    
    receiptContent.innerHTML = `
        <div class="receipt-container">
            <div class="receipt-header">
                <h2>Uzumaki Investments</h2>
                <p>Transaction Receipt</p>
            </div>
            
            <div class="receipt-info">
                <div class="receipt-row">
                    <span class="receipt-label">Receipt Number:</span>
                    <span class="receipt-value">${transaction.id}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Date & Time:</span>
                    <span class="receipt-value">${formatDateTime(transaction.date, 'receipt')}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Transaction Type:</span>
                    <span class="receipt-value">${getTransactionLabel(transaction.type)}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Status:</span>
                    <span class="receipt-value">${getStatusLabel(transaction.status)}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Description:</span>
                    <span class="receipt-value">${transaction.description}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Payment Method:</span>
                    <span class="receipt-value">${transaction.payment_method}</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Reference:</span>
                    <span class="receipt-value">${transaction.reference}</span>
                </div>
            </div>
            
            <div class="receipt-total">
                <div class="receipt-row">
                    <span class="receipt-label">Amount:</span>
                    <span class="receipt-value">${amountSign}${formatCurrency(Math.abs(transaction.amount))}</span>
                </div>
                
                ${transaction.details && transaction.details.tds ? `
                <div class="receipt-row">
                    <span class="receipt-label">TDS (18%):</span>
                    <span class="receipt-value">-${formatCurrency(transaction.details.tds)}</span>
                </div>
                ` : ''}
                
                ${transaction.details && transaction.details.processing_fee ? `
                <div class="receipt-row">
                    <span class="receipt-label">Processing Fee:</span>
                    <span class="receipt-value">-${formatCurrency(transaction.details.processing_fee)}</span>
                </div>
                ` : ''}
                
                ${transaction.details && transaction.details.net_amount ? `
                <div class="receipt-row">
                    <span class="receipt-label">Net Amount:</span>
                    <span class="receipt-value">${formatCurrency(transaction.details.net_amount)}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="receipt-footer">
                <p>Thank you for choosing Uzumaki Investments</p>
                <p>This is a computer-generated receipt. No signature required.</p>
                <p>For any queries, contact support@uzumaki.in</p>
            </div>
        </div>
    `;
}

// Export Transactions
function exportTransactions() {
    showLoading('Preparing export...');
    
    setTimeout(() => {
        let exportData = [];
        
        if (dataTable) {
            const filteredData = dataTable.rows({ search: 'applied' }).data();
            filteredData.each(function(value) {
                exportData.push({
                    'Transaction ID': value.id,
                    'Type': getTransactionLabel(value.type),
                    'Amount': value.amount >= 0 ? `+${formatCurrency(value.amount)}` : `-${formatCurrency(Math.abs(value.amount))}`,
                    'Status': getStatusLabel(value.status),
                    'Date': formatDateTime(value.date),
                    'Payment Method': value.payment_method,
                    'Reference': value.reference,
                    'Description': value.original.description
                });
            });
        } else {
            exportData = transactionsData.map(t => ({
                'Transaction ID': t.id,
                'Type': getTransactionLabel(t.type),
                'Amount': t.amount >= 0 ? `+${formatCurrency(t.amount)}` : `-${formatCurrency(Math.abs(t.amount))}`,
                'Status': getStatusLabel(t.status),
                'Date': formatDateTime(t.date),
                'Payment Method': t.payment_method,
                'Reference': t.reference,
                'Description': t.description
            }));
        }
        
        // Convert to CSV
        const csv = convertToCSV(exportData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${formatDate(new Date(), 'filename')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        hideLoading();
        showToast('Transactions exported successfully', 'success');
    }, 1500);
}

// Convert to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                const escaped = ('' + value).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        )
    ];
    
    return csvRows.join('\n');
}

// Refresh Transactions
function refreshTransactions() {
    showLoading('Refreshing transactions...');
    
    setTimeout(() => {
        // In a real app, this would fetch new data from the server
        // For now, we'll just simulate by adding a new transaction
        const newTransaction = {
            id: `TXN${Date.now()}`,
            type: ['deposit', 'earning', 'investment'][Math.floor(Math.random() * 3)],
            amount: Math.random() > 0.5 ? Math.floor(Math.random() * 10000) + 1000 : -(Math.floor(Math.random() * 5000) + 500),
            status: 'completed',
            date: new Date().toISOString(),
            description: 'New transaction from refresh',
            payment_method: ['UPI', 'Bank Transfer', 'Wallet'][Math.floor(Math.random() * 3)],
            reference: `REF${Date.now().toString().slice(-8)}`
        };
        
        transactionsData.unshift(newTransaction);
        
        // Update DataTable
        if (dataTable) {
            dataTable.clear();
            dataTable.rows.add(transactionsData.map(formatTransactionForTable));
            dataTable.draw();
        }
        
        // Update summaries
        updateSummaryCards();
        updateStatistics();
        
        hideLoading();
        showToast('Transactions refreshed successfully', 'success');
    }, 1000);
}

// Utility Functions
function showLoading(message = 'Loading...') {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = 'flex';
        const loadingText = elements.loadingOverlay.querySelector('.loading-text');
        if (loadingText && message) {
            loadingText.textContent = message;
        }
    }
}

function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.style.display = 'none';
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : 
                     type === 'error' ? '#ef4444' : 
                     type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        z-index: 10001;
        font-weight: 500;
        max-width: 350px;
        animation: toastSlideIn 0.3s ease;
    `;
    
    const icon = type === 'success' ? 'fas fa-check-circle' :
                 type === 'error' ? 'fas fa-exclamation-circle' :
                 type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="${icon}" style="font-size: 1.2rem;"></i>
            <span>${message}</span>
        </div>
    `;
    
    const container = document.getElementById('toastContainer') || document.body;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatCurrency(amount, short = false) {
    if (typeof amount !== 'number') amount = 0;
    
    if (short && amount >= 100000) {
        return '₹' + (amount / 100000).toFixed(1) + 'L';
    } else if (short && amount >= 1000) {
        return '₹' + (amount / 1000).toFixed(1) + 'K';
    }
    
    return '₹' + amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(date, format = 'short') {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    switch (format) {
        case 'short':
            return date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short'
            });
        case 'long':
            return date.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        case 'input':
            return date.toISOString().split('T')[0];
        case 'filename':
            return date.toISOString().split('T')[0].replace(/-/g, '');
        default:
            return date.toLocaleDateString('en-IN');
    }
}

function formatDateTime(dateTime, format = 'full') {
    const date = new Date(dateTime);
    
    switch (format) {
        case 'time':
            return date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        case 'date':
            return formatDate(date, 'long');
        case 'receipt':
            return `${formatDate(date, 'long')} at ${formatDateTime(date, 'time')}`;
        case 'full':
        default:
            return `${formatDate(date, 'short')} at ${formatDateTime(date, 'time')}`;
    }
}

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .hidden {
        display: none !important;
    }
`;
document.head.appendChild(style);

console.log('[Transactions] transactions.js loaded successfully');
[file content end]

