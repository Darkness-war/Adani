[file name]: wallet.js
[file content begin]
// Wallet Page JavaScript - Modern Professional Version
import { sessionManager, dbService, utils, supabase } from '../core/supabase.js';

// Global Variables
let currentUser = null;
let walletData = null;
let isBankingHours = false;
let isWorkingDay = true;
let depositLimit = { min: 120, max: 49999 };
let withdrawalLimit = { min: 130, max: 50000 };
let tdsRate = 18; // 18% TDS

// DOM Elements
const elements = {
    // Balance Elements
    availableBalance: document.getElementById('availableBalance'),
    totalInvested: document.getElementById('totalInvested'),
    totalEarnings: document.getElementById('totalEarnings'),
    dailyWithdrawalLimit: document.getElementById('dailyWithdrawalLimit'),
    sidebarBalance: document.getElementById('sidebarBalance'),
    sidebarEarnings: document.getElementById('sidebarEarnings'),
    mobileBalance: document.getElementById('mobileBalance'),
    mobileEarnings: document.getElementById('mobileEarnings'),
    
    // User Info Elements
    sidebarUserName: document.getElementById('sidebarUserName'),
    sidebarUserEmail: document.getElementById('sidebarUserEmail'),
    mobileUserName: document.getElementById('mobileUserName'),
    mobileUserEmail: document.getElementById('mobileUserEmail'),
    userTier: document.getElementById('userTier'),
    mobileUserTier: document.getElementById('mobileUserTier'),
    userVerified: document.getElementById('userVerified'),
    
    // Button Elements
    quickDepositBtn: document.getElementById('quickDepositBtn'),
    withdrawEarningsBtn: document.getElementById('withdrawEarningsBtn'),
    viewLimitsBtn: document.getElementById('viewLimitsBtn'),
    depositActionBtn: document.getElementById('depositActionBtn'),
    withdrawActionBtn: document.getElementById('withdrawActionBtn'),
    transferActionBtn: document.getElementById('transferActionBtn'),
    convertActionBtn: document.getElementById('convertActionBtn'),
    addPaymentMethod: document.getElementById('addPaymentMethod'),
    addBankAccount: document.getElementById('addBankAccount'),
    exportStatement: document.getElementById('exportStatement'),
    refreshWallet: document.getElementById('refreshWallet'),
    filterTransactions: document.getElementById('filterTransactions'),
    makeFirstTransaction: document.getElementById('makeFirstTransaction'),
    
    // Modal Elements
    depositModal: document.getElementById('depositModal'),
    withdrawalModal: document.getElementById('withdrawalModal'),
    addBankAccountModal: document.getElementById('addBankAccountModal'),
    qrCodeModal: document.getElementById('qrCodeModal'),
    
    // Form Elements
    depositAmount: document.getElementById('depositAmount'),
    withdrawalAmount: document.getElementById('withdrawalAmount'),
    depositPaymentOptions: document.getElementById('depositPaymentOptions'),
    withdrawalMethod: document.getElementById('withdrawalMethod'),
    withdrawalAccount: document.getElementById('withdrawalAccount'),
    
    // Summary Elements
    summaryDepositAmount: document.getElementById('summaryDepositAmount'),
    summaryDepositFee: document.getElementById('summaryDepositFee'),
    summaryDepositTotal: document.getElementById('summaryDepositTotal'),
    summaryWithdrawalAmount: document.getElementById('summaryWithdrawalAmount'),
    summaryTDS: document.getElementById('summaryTDS'),
    summaryWithdrawalFee: document.getElementById('summaryWithdrawalFee'),
    summaryWithdrawalNet: document.getElementById('summaryWithdrawalNet'),
    
    // Transaction Elements
    transactionsTableBody: document.getElementById('transactionsTableBody'),
    todayDeposits: document.getElementById('todayDeposits'),
    todayWithdrawals: document.getElementById('todayWithdrawals'),
    pendingTransactions: document.getElementById('pendingTransactions'),
    
    // Lists Elements
    paymentMethodsList: document.getElementById('paymentMethodsList'),
    bankAccountsList: document.getElementById('bankAccountsList'),
    
    // Admin Elements
    adminControls: document.getElementById('adminControls'),
    adjustAmount: document.getElementById('adjustAmount'),
    adjustType: document.getElementById('adjustType'),
    applyAdjustment: document.getElementById('applyAdjustment'),
    transactionId: document.getElementById('transactionId'),
    transactionStatus: document.getElementById('transactionStatus'),
    updateTransactionStatus: document.getElementById('updateTransactionStatus'),
    newDepositMin: document.getElementById('newDepositMin'),
    newDepositMax: document.getElementById('newDepositMax'),
    updateDepositLimits: document.getElementById('updateDepositLimits'),
    
    // Chart Elements
    balanceChart: document.getElementById('balanceChart'),
    legendAvailable: document.getElementById('legendAvailable'),
    legendInvested: document.getElementById('legendInvested'),
    legendPending: document.getElementById('legendPending'),
    legendLocked: document.getElementById('legendLocked'),
    
    // Loading Overlay
    loadingOverlay: document.getElementById('loadingOverlay')
};

// Initialize Wallet Page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Wallet] Initializing wallet page...');
    
    try {
        // Show loading overlay
        showLoading();
        
        // Check authentication
        await checkAuth();
        
        // Check banking hours
        checkBankingHours();
        
        // Initialize all components
        await initializeWallet();
        initializeEventListeners();
        initializeModals();
        setupRealTimeUpdates();
        
        // Hide loading overlay
        hideLoading();
        
        console.log('[Wallet] Initialization complete');
        
        // Show welcome toast
        showToast('Wallet loaded successfully', 'success');
        
    } catch (error) {
        console.error('[Wallet] Initialization error:', error);
        showToast('Failed to load wallet. Please refresh.', 'error');
        hideLoading();
    }
});

// Authentication Check
async function checkAuth() {
    try {
        const { user, profile } = await sessionManager.getCurrentUser();
        
        if (!user) {
            console.log('[Wallet] No user found, redirecting to login');
            window.location.href = '/pages/auth/login.html';
            return;
        }
        
        currentUser = user;
        userProfile = profile;
        
    } catch (error) {
        console.error('[Wallet] Auth check error:', error);
        window.location.href = '/pages/auth/login.html';
    }
}

// Check Banking Hours
function checkBankingHours() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    // Check if it's a working day (Monday to Friday)
    isWorkingDay = day >= 1 && day <= 5;
    
    // Check if it's banking hours (9:00 AM to 6:00 PM)
    const bankingStart = 9 * 60; // 9:00 AM
    const bankingEnd = 18 * 60; // 6:00 PM
    isBankingHours = isWorkingDay && currentTime >= bankingStart && currentTime <= bankingEnd;
    
    console.log(`[Wallet] Banking hours: ${isBankingHours}, Working day: ${isWorkingDay}`);
    
    // Update withdrawal button state
    updateWithdrawalButtonState();
}

// Update Withdrawal Button State
function updateWithdrawalButtonState() {
    const withdrawalBtns = [
        elements.withdrawEarningsBtn,
        elements.withdrawActionBtn
    ];
    
    withdrawalBtns.forEach(btn => {
        if (btn) {
            if (!isWorkingDay) {
                btn.disabled = true;
                btn.title = 'Withdrawals available only on working days (Monday-Friday)';
            } else if (!isBankingHours) {
                btn.disabled = true;
                btn.title = 'Withdrawals available only during banking hours (9AM-6PM)';
            } else {
                btn.disabled = false;
                btn.title = 'Withdraw funds';
            }
        }
    });
}

// Initialize Wallet Data
async function initializeWallet() {
    if (!currentUser) return;
    
    try {
        // Load wallet data
        walletData = await dbService.getWalletData(currentUser.id);
        
        if (walletData) {
            updateWalletUI();
            updateSidebarUI();
            loadPaymentMethods();
            loadBankAccounts();
            loadTransactions();
            initializeBalanceChart();
            
            // Check if user is admin
            if (userProfile?.is_admin) {
                elements.adminControls.style.display = 'block';
                initializeAdminControls();
            }
        }
        
        // Start banking hours timer
        startBankingHoursTimer();
        
    } catch (error) {
        console.error('[Wallet] Wallet data load error:', error);
        showToast('Failed to load wallet data', 'error');
    }
}

// Update Wallet UI
function updateWalletUI() {
    if (!walletData) return;
    
    // Update balance displays
    elements.availableBalance.textContent = formatCurrency(walletData.available_balance);
    elements.totalInvested.textContent = formatCurrency(walletData.total_invested);
    elements.totalEarnings.textContent = formatCurrency(walletData.total_earnings);
    
    // Update daily withdrawal limit
    const usedLimit = walletData.today_withdrawals || 0;
    const remainingLimit = Math.max(0, withdrawalLimit.max - usedLimit);
    elements.dailyWithdrawalLimit.textContent = 
        `₹${formatNumber(usedLimit)}/₹${formatNumber(withdrawalLimit.max)}`;
    
    // Update legend values
    elements.legendAvailable.textContent = formatCurrency(walletData.available_balance);
    elements.legendInvested.textContent = formatCurrency(walletData.total_invested);
    elements.legendPending.textContent = formatCurrency(walletData.pending_earnings);
    elements.legendLocked.textContent = formatCurrency(walletData.locked_funds);
}

// Update Sidebar UI
function updateSidebarUI() {
    if (!userProfile || !currentUser || !walletData) return;
    
    const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || currentUser.email?.split('@')[0] || 'User';
    
    // Update desktop sidebar
    elements.sidebarUserName.textContent = fullName;
    elements.sidebarUserEmail.textContent = currentUser.email || '';
    elements.sidebarBalance.textContent = formatCurrency(walletData.available_balance);
    elements.sidebarEarnings.textContent = `+${formatCurrency(walletData.today_earnings)}`;
    elements.userTier.textContent = userProfile.account_tier || 'Standard';
    
    // Update mobile sidebar
    elements.mobileUserName.textContent = fullName;
    elements.mobileUserEmail.textContent = currentUser.email || '';
    elements.mobileBalance.textContent = formatCurrency(walletData.available_balance);
    elements.mobileEarnings.textContent = `+${formatCurrency(walletData.today_earnings)}`;
    elements.mobileUserTier.textContent = userProfile.account_tier || 'Standard';
    
    // Update verification badge
    if (userProfile.verified) {
        elements.userVerified.style.display = 'inline-block';
    } else {
        elements.userVerified.style.display = 'none';
    }
}

// Load Payment Methods
async function loadPaymentMethods() {
    try {
        // Mock data - in production, this would come from backend
        const paymentMethods = [
            {
                id: '1',
                type: 'bank',
                name: 'HDFC Bank',
                lastFour: '1234',
                is_default: true
            },
            {
                id: '2',
                type: 'upi',
                name: 'Google Pay',
                upi_id: 'user@okhdfcbank',
                is_default: false
            },
            {
                id: '3',
                type: 'card',
                name: 'Visa Card',
                lastFour: '5678',
                is_default: false
            }
        ];
        
        elements.paymentMethodsList.innerHTML = '';
        
        if (paymentMethods.length === 0) {
            document.getElementById('noPaymentMethods').style.display = 'block';
            return;
        }
        
        document.getElementById('noPaymentMethods').style.display = 'none';
        
        paymentMethods.forEach(method => {
            const methodElement = createPaymentMethodElement(method);
            elements.paymentMethodsList.appendChild(methodElement);
        });
        
        // Also update deposit payment options
        updateDepositPaymentOptions(paymentMethods);
        
    } catch (error) {
        console.error('[Wallet] Error loading payment methods:', error);
    }
}

// Create Payment Method Element
function createPaymentMethodElement(method) {
    const div = document.createElement('div');
    div.className = `payment-method-item ${method.is_default ? 'active' : ''}`;
    
    const iconClass = method.type === 'bank' ? 'bank' :
                     method.type === 'upi' ? 'upi' :
                     method.type === 'card' ? 'card' : 'crypto';
    
    const displayInfo = method.type === 'upi' ? 
        `UPI ID: ${method.upi_id}` : 
        `**** ${method.lastFour}`;
    
    div.innerHTML = `
        <div class="payment-method-info">
            <div class="payment-method-icon ${iconClass}">
                <i class="fas fa-${method.type === 'bank' ? 'university' : 
                                  method.type === 'upi' ? 'qrcode' : 
                                  method.type === 'card' ? 'credit-card' : 'coins'}"></i>
            </div>
            <div class="payment-method-details">
                <div class="payment-method-name">${method.name}</div>
                <div class="payment-method-number">${displayInfo}</div>
            </div>
        </div>
        <div class="payment-method-action">
            ${method.is_default ? '<span class="badge badge-success">Default</span>' : ''}
            <button class="btn btn-link btn-sm" data-action="edit" data-id="${method.id}">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `;
    
    return div;
}

// Update Deposit Payment Options
function updateDepositPaymentOptions(paymentMethods) {
    elements.depositPaymentOptions.innerHTML = '';
    
    const options = [
        { id: 'bank_transfer', type: 'bank', name: 'Bank Transfer', icon: 'fas fa-university' },
        { id: 'upi', type: 'upi', name: 'UPI Payment', icon: 'fas fa-qrcode' },
        { id: 'card', type: 'card', name: 'Credit/Debit Card', icon: 'fas fa-credit-card' },
        { id: 'netbanking', type: 'bank', name: 'Net Banking', icon: 'fas fa-globe' }
    ];
    
    options.forEach(option => {
        const optionElement = createPaymentOptionElement(option);
        elements.depositPaymentOptions.appendChild(optionElement);
    });
}

// Create Payment Option Element
function createPaymentOptionElement(option) {
    const label = document.createElement('label');
    label.className = 'payment-option';
    label.innerHTML = `
        <input type="radio" name="paymentOption" value="${option.id}" ${option.id === 'upi' ? 'checked' : ''} hidden>
        <i class="${option.icon}"></i>
        <span>${option.name}</span>
    `;
    
    label.addEventListener('click', () => {
        document.querySelectorAll('.payment-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        label.classList.add('selected');
    });
    
    // Set first option as selected
    if (option.id === 'upi') {
        label.classList.add('selected');
    }
    
    return label;
}

// Load Bank Accounts
async function loadBankAccounts() {
    try {
        // Mock data - in production, this would come from backend
        const bankAccounts = [
            {
                id: '1',
                bank_name: 'HDFC Bank',
                account_number: 'XXXXXX1234',
                account_holder: userProfile?.first_name || 'User',
                ifsc_code: 'HDFC0001234',
                is_verified: true,
                is_default: true
            },
            {
                id: '2',
                bank_name: 'ICICI Bank',
                account_number: 'XXXXXX5678',
                account_holder: userProfile?.first_name || 'User',
                ifsc_code: 'ICIC0005678',
                is_verified: false,
                is_default: false
            }
        ];
        
        elements.bankAccountsList.innerHTML = '';
        const withdrawalAccountSelect = document.getElementById('withdrawalAccount');
        
        if (bankAccounts.length === 0) {
            document.getElementById('noBankAccounts').style.display = 'block';
            if (withdrawalAccountSelect) {
                withdrawalAccountSelect.innerHTML = '<option value="">No accounts available</option>';
            }
            return;
        }
        
        document.getElementById('noBankAccounts').style.display = 'none';
        
        // Clear and update select options
        if (withdrawalAccountSelect) {
            withdrawalAccountSelect.innerHTML = '<option value="">Select account</option>';
        }
        
        bankAccounts.forEach(account => {
            const accountElement = createBankAccountElement(account);
            elements.bankAccountsList.appendChild(accountElement);
            
            // Add to withdrawal select
            if (withdrawalAccountSelect) {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.bank_name} - ${account.account_number} ${account.is_default ? '(Default)' : ''}`;
                if (account.is_default) {
                    option.selected = true;
                }
                withdrawalAccountSelect.appendChild(option);
            }
        });
        
    } catch (error) {
        console.error('[Wallet] Error loading bank accounts:', error);
    }
}

// Create Bank Account Element
function createBankAccountElement(account) {
    const div = document.createElement('div');
    div.className = `bank-account-item ${account.is_default ? 'active' : ''}`;
    
    div.innerHTML = `
        <div class="bank-account-info">
            <div class="bank-account-icon">
                <i class="fas fa-university"></i>
            </div>
            <div class="bank-account-details">
                <div class="bank-account-name">${account.bank_name}</div>
                <div class="bank-account-number">${account.account_number} • ${account.account_holder}</div>
            </div>
        </div>
        <div class="bank-account-action">
            <span class="bank-account-status ${account.is_verified ? 'status-verified' : 'status-pending'}">
                ${account.is_verified ? 'Verified' : 'Pending'}
            </span>
            ${account.is_default ? '<span class="badge badge-primary">Default</span>' : ''}
        </div>
    `;
    
    return div;
}

// Load Transactions
async function loadTransactions() {
    try {
        const transactions = await dbService.getTransactions(currentUser.id, { 
            type: 'all',
            limit: 10 
        });
        
        elements.transactionsTableBody.innerHTML = '';
        
        if (transactions && transactions.length > 0) {
            document.getElementById('noTransactions').style.display = 'none';
            
            // Calculate summary
            let todayDeposits = 0;
            let todayWithdrawals = 0;
            let pendingCount = 0;
            const today = new Date().toISOString().split('T')[0];
            
            transactions.forEach(transaction => {
                const transactionElement = createTransactionRow(transaction);
                elements.transactionsTableBody.appendChild(transactionElement);
                
                // Update summary
                const transDate = new Date(transaction.created_at).toISOString().split('T')[0];
                if (transDate === today) {
                    if (transaction.type === 'deposit') {
                        todayDeposits += transaction.amount;
                    } else if (transaction.type === 'withdrawal') {
                        todayWithdrawals += transaction.amount;
                    }
                }
                
                if (transaction.status === 'pending') {
                    pendingCount++;
                }
            });
            
            // Update summary displays
            elements.todayDeposits.textContent = formatCurrency(todayDeposits);
            elements.todayWithdrawals.textContent = formatCurrency(todayWithdrawals);
            elements.pendingTransactions.textContent = pendingCount;
            
        } else {
            document.getElementById('noTransactions').style.display = 'block';
        }
        
    } catch (error) {
        console.error('[Wallet] Error loading transactions:', error);
        document.getElementById('noTransactions').style.display = 'block';
    }
}

// Create Transaction Row
function createTransactionRow(transaction) {
    const tr = document.createElement('tr');
    
    const typeClass = transaction.type === 'deposit' ? 'deposit' :
                     transaction.type === 'withdrawal' ? 'withdrawal' :
                     transaction.type === 'investment' ? 'investment' : 'earning';
    
    const typeLabel = transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
    const amountClass = transaction.amount >= 0 ? 'positive' : 'negative';
    const amountPrefix = transaction.amount >= 0 ? '+' : '-';
    
    const statusClass = transaction.status === 'completed' ? 'completed' :
                       transaction.status === 'pending' ? 'pending' :
                       transaction.status === 'processing' ? 'processing' : 'failed';
    
    const statusLabel = transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1);
    
    const date = new Date(transaction.created_at);
    const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    
    tr.innerHTML = `
        <td>
            <div class="transaction-id">${transaction.id.substring(0, 8)}...</div>
            <small class="text-muted">${transaction.description || ''}</small>
        </td>
        <td>
            <span class="transaction-type ${typeClass}">
                <i class="fas fa-${transaction.type === 'deposit' ? 'arrow-down' : 
                                  transaction.type === 'withdrawal' ? 'arrow-up' : 
                                  transaction.type === 'investment' ? 'chart-line' : 'coins'}"></i>
                ${typeLabel}
            </span>
        </td>
        <td>
            <div class="transaction-amount ${amountClass}">
                ${amountPrefix}₹${Math.abs(transaction.amount).toLocaleString()}
            </div>
        </td>
        <td>
            <span class="transaction-status ${statusClass}">
                ${statusLabel}
            </span>
        </td>
        <td>${formattedDate}</td>
        <td>
            <div class="transaction-actions">
                <button class="btn btn-link btn-sm" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                ${transaction.status === 'pending' ? `
                    <button class="btn btn-link btn-sm text-danger" title="Cancel">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        </td>
    `;
    
    return tr;
}

// Initialize Balance Chart
function initializeBalanceChart() {
    if (!walletData || !elements.balanceChart) return;
    
    const ctx = elements.balanceChart.getContext('2d');
    
    const chartData = {
        labels: ['Available', 'Invested', 'Pending', 'Locked'],
        datasets: [{
            data: [
                walletData.available_balance || 0,
                walletData.total_invested || 0,
                walletData.pending_earnings || 0,
                walletData.locked_funds || 0
            ],
            backgroundColor: [
                'rgba(67, 97, 238, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(59, 130, 246, 0.8)'
            ],
            borderColor: [
                'rgba(67, 97, 238, 1)',
                'rgba(16, 185, 129, 1)',
                'rgba(245, 158, 11, 1)',
                'rgba(59, 130, 246, 1)'
            ],
            borderWidth: 2,
            hoverOffset: 15
        }]
    };
    
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = context.parsed || 0;
                            return `${label}: ₹${formatNumber(value)} (${percentage.toFixed(1)}%)`;
                        }
                    }
                }
            },
            cutout: '65%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Quick action buttons
    elements.quickDepositBtn?.addEventListener('click', () => openModal('depositModal'));
    elements.withdrawEarningsBtn?.addEventListener('click', () => openModal('withdrawalModal'));
    elements.viewLimitsBtn?.addEventListener('click', showLimitsDetails);
    
    // Action buttons
    elements.depositActionBtn?.addEventListener('click', () => openModal('depositModal'));
    elements.withdrawActionBtn?.addEventListener('click', () => openModal('withdrawalModal'));
    elements.transferActionBtn?.addEventListener('click', showTransferModal);
    elements.convertActionBtn?.addEventListener('click', showConvertModal);
    
    // Form submissions
    document.getElementById('depositForm')?.addEventListener('submit', handleDeposit);
    document.getElementById('withdrawalForm')?.addEventListener('submit', handleWithdrawal);
    document.getElementById('bankAccountForm')?.addEventListener('submit', handleAddBankAccount);
    
    // Amount inputs real-time updates
    elements.depositAmount?.addEventListener('input', updateDepositSummary);
    elements.withdrawalAmount?.addEventListener('input', updateWithdrawalSummary);
    
    // Amount presets
    document.querySelectorAll('.amount-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            const amount = preset.getAttribute('data-amount');
            const activeInput = document.activeElement;
            
            if (activeInput && (activeInput.id === 'depositAmount' || activeInput.id === 'withdrawalAmount')) {
                activeInput.value = amount;
                
                // Trigger input event to update summaries
                const event = new Event('input', { bubbles: true });
                activeInput.dispatchEvent(event);
                
                // Update active preset
                preset.parentElement.querySelectorAll('.amount-preset').forEach(p => {
                    p.classList.remove('active');
                });
                preset.classList.add('active');
            }
        });
    });
    
    // Add buttons
    elements.addPaymentMethod?.addEventListener('click', showAddPaymentMethod);
    elements.addBankAccount?.addEventListener('click', () => openModal('addBankAccountModal'));
    document.getElementById('addNewAccountLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('addBankAccountModal');
    });
    
    // Utility buttons
    elements.exportStatement?.addEventListener('click', exportStatement);
    elements.refreshWallet?.addEventListener('click', refreshWallet);
    elements.filterTransactions?.addEventListener('click', filterTransactions);
    elements.makeFirstTransaction?.addEventListener('click', () => openModal('depositModal'));
    
    // Modal close buttons
    document.getElementById('closeDepositModal')?.addEventListener('click', () => closeModal('depositModal'));
    document.getElementById('closeWithdrawalModal')?.addEventListener('click', () => closeModal('withdrawalModal'));
    document.getElementById('closeBankAccountModal')?.addEventListener('click', () => closeModal('addBankAccountModal'));
    document.getElementById('closeQrModal')?.addEventListener('click', () => closeModal('qrCodeModal'));
    
    document.getElementById('cancelDeposit')?.addEventListener('click', () => closeModal('depositModal'));
    document.getElementById('cancelWithdrawal')?.addEventListener('click', () => closeModal('withdrawalModal'));
    document.getElementById('cancelBankAccount')?.addEventListener('click', () => closeModal('addBankAccountModal'));
    document.getElementById('cancelQrPayment')?.addEventListener('click', () => closeModal('qrCodeModal'));
    
    // QR Payment
    document.getElementById('confirmPaymentDone')?.addEventListener('click', confirmPaymentDone);
    document.getElementById('copyUpiId')?.addEventListener('click', copyUpiId);
}

// Initialize Modals
function initializeModals() {
    // Close modals when clicking outside
    document.querySelectorAll('.wallet-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.wallet-modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// Initialize Admin Controls
function initializeAdminControls() {
    if (!userProfile?.is_admin) return;
    
    elements.applyAdjustment?.addEventListener('click', handleAdminAdjustment);
    elements.updateTransactionStatus?.addEventListener('click', handleUpdateTransactionStatus);
    elements.updateDepositLimits?.addEventListener('click', handleUpdateDepositLimits);
}

// Open Modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        
        // Initialize modal content based on type
        if (modalId === 'depositModal') {
            initializeDepositModal();
        } else if (modalId === 'withdrawalModal') {
            initializeWithdrawalModal();
        } else if (modalId === 'qrCodeModal') {
            initializeQrCodeModal();
        }
    }
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        
        // Reset forms
        if (modalId === 'depositModal') {
            document.getElementById('depositForm').reset();
        } else if (modalId === 'withdrawalModal') {
            document.getElementById('withdrawalForm').reset();
        }
    }
}

// Initialize Deposit Modal
function initializeDepositModal() {
    // Reset amount
    elements.depositAmount.value = '';
    
    // Update deposit limits display
    const limitsElement = document.getElementById('depositLimits');
    if (limitsElement) {
        limitsElement.textContent = `Minimum: ₹${depositLimit.min} | Maximum: ₹${depositLimit.max}`;
    }
    
    // Update summary
    updateDepositSummary();
}

// Update Deposit Summary
function updateDepositSummary() {
    const amount = parseFloat(elements.depositAmount.value) || 0;
    
    // Validate amount
    if (amount < depositLimit.min) {
        showFormError('depositAmount', `Minimum deposit is ₹${depositLimit.min}`);
    } else if (amount > depositLimit.max) {
        showFormError('depositAmount', `Maximum deposit is ₹${depositLimit.max}`);
    } else {
        clearFormError('depositAmount');
    }
    
    // Calculate processing fee (0% for now, can be configured)
    const processingFee = 0;
    const total = amount + processingFee;
    
    // Update summary
    elements.summaryDepositAmount.textContent = formatCurrency(amount);
    elements.summaryDepositFee.textContent = formatCurrency(processingFee);
    elements.summaryDepositTotal.textContent = formatCurrency(total);
    
    // Update QR code amount if modal is open
    if (document.getElementById('qrCodeModal')?.classList.contains('active')) {
        document.getElementById('qrAmount').textContent = formatCurrency(total);
    }
}

// Initialize Withdrawal Modal
function initializeWithdrawalModal() {
    // Reset amount
    elements.withdrawalAmount.value = '';
    
    // Update withdrawal limits display
    const limitsElement = document.getElementById('withdrawalLimits');
    if (limitsElement) {
        const used = walletData?.today_withdrawals || 0;
        const remaining = Math.max(0, withdrawalLimit.max - used);
        limitsElement.textContent = `Minimum: ₹${withdrawalLimit.min} | Daily Limit: ₹${formatNumber(remaining)} remaining`;
    }
    
    // Update summary
    updateWithdrawalSummary();
}

// Update Withdrawal Summary
function updateWithdrawalSummary() {
    const amount = parseFloat(elements.withdrawalAmount.value) || 0;
    
    // Validate amount
    if (amount < withdrawalLimit.min) {
        showFormError('withdrawalAmount', `Minimum withdrawal is ₹${withdrawalLimit.min}`);
    } else if (amount > withdrawalLimit.max) {
        showFormError('withdrawalAmount', `Maximum daily withdrawal is ₹${withdrawalLimit.max}`);
    } else if (walletData && amount > walletData.available_balance) {
        showFormError('withdrawalAmount', 'Insufficient balance');
    } else {
        clearFormError('withdrawalAmount');
    }
    
    // Calculate TDS and fees
    const tds = (amount * tdsRate) / 100;
    const processingFee = 10; // Fixed processing fee
    const netAmount = amount - tds - processingFee;
    
    // Update summary
    elements.summaryWithdrawalAmount.textContent = formatCurrency(amount);
    elements.summaryTDS.textContent = `-${formatCurrency(tds)}`;
    elements.summaryWithdrawalFee.textContent = `-${formatCurrency(processingFee)}`;
    elements.summaryWithdrawalNet.textContent = formatCurrency(netAmount);
}

// Initialize QR Code Modal
function initializeQrCodeModal() {
    const amount = parseFloat(elements.depositAmount.value) || 0;
    const processingFee = 0;
    const total = amount + processingFee;
    
    // Update QR code details
    document.getElementById('qrAmount').textContent = formatCurrency(total);
    
    // Generate unique reference
    const reference = `WLT${Date.now()}${Math.floor(Math.random() * 1000)}`;
    document.getElementById('qrReference').textContent = reference;
    
    // Start timer (15 minutes)
    startQrTimer(15 * 60);
}

// Start QR Timer
function startQrTimer(seconds) {
    const timerElement = document.getElementById('qrTimer');
    if (!timerElement) return;
    
    let remaining = seconds;
    
    const timer = setInterval(() => {
        if (!document.getElementById('qrCodeModal')?.classList.contains('active')) {
            clearInterval(timer);
            return;
        }
        
        remaining--;
        
        if (remaining <= 0) {
            clearInterval(timer);
            timerElement.textContent = 'Expired';
            timerElement.style.color = 'var(--wallet-danger)';
            
            // Show expired message
            showToast('QR code expired. Please generate a new one.', 'error');
            return;
        }
        
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

// Handle Deposit
async function handleDeposit(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const amount = parseFloat(elements.depositAmount.value);
    const paymentMethod = document.querySelector('input[name="paymentOption"]:checked')?.value;
    const notes = document.getElementById('depositNotes').value;
    
    // Validate amount
    if (amount < depositLimit.min) {
        showToast(`Minimum deposit is ₹${depositLimit.min}`, 'error');
        return;
    }
    
    if (amount > depositLimit.max) {
        showToast(`Maximum deposit is ₹${depositLimit.max}`, 'error');
        return;
    }
    
    // Validate payment method
    if (!paymentMethod) {
        showToast('Please select a payment method', 'error');
        return;
    }
    
    try {
        showLoading('Processing deposit...');
        
        // For UPI payments, show QR code
        if (paymentMethod === 'upi') {
            closeModal('depositModal');
            setTimeout(() => {
                openModal('qrCodeModal');
            }, 300);
            hideLoading();
            return;
        }
        
        // For other payment methods, simulate processing
        const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Create transaction record
        const transaction = {
            user_id: currentUser.id,
            type: 'deposit',
            amount: amount,
            status: 'processing',
            payment_method: paymentMethod,
            description: notes || 'Wallet deposit',
            reference_id: transactionId,
            created_at: new Date().toISOString()
        };
        
        // In production, this would be saved to database
        console.log('[Wallet] Deposit transaction:', transaction);
        
        // Simulate processing delay
        setTimeout(async () => {
            // Update wallet balance (in production, this would be done by backend)
            walletData.available_balance += amount;
            walletData.total_deposits = (walletData.total_deposits || 0) + amount;
            
            // Update UI
            updateWalletUI();
            updateSidebarUI();
            
            // Reload transactions
            await loadTransactions();
            
            // Show success
            showToast(`Deposit of ₹${formatNumber(amount)} initiated successfully`, 'success');
            
            // Close modal
            closeModal('depositModal');
            
            hideLoading();
        }, 2000);
        
    } catch (error) {
        console.error('[Wallet] Deposit error:', error);
        showToast('Failed to process deposit', 'error');
        hideLoading();
    }
}

// Handle Withdrawal
async function handleWithdrawal(e) {
    e.preventDefault();
    
    if (!currentUser || !walletData) return;
    
    // Check banking hours
    if (!isWorkingDay) {
        showToast('Withdrawals are available only on working days (Monday-Friday)', 'error');
        return;
    }
    
    if (!isBankingHours) {
        showToast('Withdrawals are available only during banking hours (9AM-6PM)', 'error');
        return;
    }
    
    const amount = parseFloat(elements.withdrawalAmount.value);
    const method = elements.withdrawalMethod.value;
    const accountId = elements.withdrawalAccount.value;
    
    // Validate amount
    if (amount < withdrawalLimit.min) {
        showToast(`Minimum withdrawal is ₹${withdrawalLimit.min}`, 'error');
        return;
    }
    
    if (amount > withdrawalLimit.max) {
        showToast(`Maximum daily withdrawal is ₹${withdrawalLimit.max}`, 'error');
        return;
    }
    
    // Check daily limit
    const todayWithdrawals = walletData.today_withdrawals || 0;
    if (todayWithdrawals + amount > withdrawalLimit.max) {
        showToast(`Daily withdrawal limit exceeded. You can withdraw ₹${formatNumber(withdrawalLimit.max - todayWithdrawals)} more today.`, 'error');
        return;
    }
    
    // Check balance
    if (amount > walletData.available_balance) {
        showToast('Insufficient balance', 'error');
        return;
    }
    
    // Validate method and account
    if (!method) {
        showToast('Please select withdrawal method', 'error');
        return;
    }
    
    if (!accountId) {
        showToast('Please select bank account', 'error');
        return;
    }
    
    try {
        showLoading('Processing withdrawal...');
        
        // Calculate TDS and net amount
        const tds = (amount * tdsRate) / 100;
        const processingFee = 10;
        const netAmount = amount - tds - processingFee;
        
        const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        // Create withdrawal record
        const transaction = {
            user_id: currentUser.id,
            type: 'withdrawal',
            amount: -amount, // Negative for withdrawal
            status: 'pending',
            payment_method: method,
            description: `Withdrawal to bank (TDS: ₹${formatNumber(tds)})`,
            reference_id: transactionId,
            tds_amount: tds,
            processing_fee: processingFee,
            net_amount: netAmount,
            bank_account_id: accountId,
            created_at: new Date().toISOString()
        };
        
        // In production, this would be saved to database
        console.log('[Wallet] Withdrawal transaction:', transaction);
        
        // Simulate processing delay
        setTimeout(async () => {
            // Update wallet balance (temporary, will be confirmed by admin)
            walletData.available_balance -= amount;
            walletData.today_withdrawals = (walletData.today_withdrawals || 0) + amount;
            
            // Update UI
            updateWalletUI();
            updateSidebarUI();
            
            // Reload transactions
            await loadTransactions();
            
            // Show success with details
            showToast(`Withdrawal request of ₹${formatNumber(amount)} submitted. Net amount: ₹${formatNumber(netAmount)} (TDS: ₹${formatNumber(tds)})`, 'success');
            
            // Close modal
            closeModal('withdrawalModal');
            
            hideLoading();
        }, 2000);
        
    } catch (error) {
        console.error('[Wallet] Withdrawal error:', error);
        showToast('Failed to process withdrawal', 'error');
        hideLoading();
    }
}

// Handle Add Bank Account
async function handleAddBankAccount(e) {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const holderName = document.getElementById('accountHolderName').value;
    const accountNumber = document.getElementById('accountNumber').value;
    const ifscCode = document.getElementById('ifscCode').value;
    const bankName = document.getElementById('bankName').value;
    const branch = document.getElementById('bankBranch').value;
    const accountType = document.getElementById('accountType').value;
    
    // Basic validation
    if (!holderName || !accountNumber || !ifscCode || !bankName || !accountType) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    if (accountNumber.length < 9 || accountNumber.length > 18) {
        showToast('Please enter a valid account number', 'error');
        return;
    }
    
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
        showToast('Please enter a valid IFSC code', 'error');
        return;
    }
    
    try {
        showLoading('Adding bank account...');
        
        // In production, this would save to database
        const bankAccount = {
            user_id: currentUser.id,
            holder_name: holderName,
            account_number: accountNumber,
            ifsc_code: ifscCode.toUpperCase(),
            bank_name: bankName,
            branch: branch,
            account_type: accountType,
            is_verified: false,
            is_default: false,
            created_at: new Date().toISOString()
        };
        
        console.log('[Wallet] New bank account:', bankAccount);
        
        // Simulate API call
        setTimeout(() => {
            // Reload bank accounts
            loadBankAccounts();
            
            // Show success
            showToast('Bank account added successfully. It will be verified within 24 hours.', 'success');
            
            // Close modal
            closeModal('addBankAccountModal');
            
            // Reset form
            document.getElementById('bankAccountForm').reset();
            
            hideLoading();
        }, 1500);
        
    } catch (error) {
        console.error('[Wallet] Add bank account error:', error);
        showToast('Failed to add bank account', 'error');
        hideLoading();
    }
}

// Confirm Payment Done
function confirmPaymentDone() {
    const amount = parseFloat(elements.depositAmount.value) || 0;
    
    if (amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    showLoading('Verifying payment...');
    
    // Simulate payment verification
    setTimeout(async () => {
        // Update wallet balance
        walletData.available_balance += amount;
        walletData.total_deposits = (walletData.total_deposits || 0) + amount;
        
        // Update UI
        updateWalletUI();
        updateSidebarUI();
        
        // Reload transactions
        await loadTransactions();
        
        // Close modals
        closeModal('qrCodeModal');
        closeModal('depositModal');
        
        // Show success
        showToast(`Payment of ₹${formatNumber(amount)} received successfully`, 'success');
        
        hideLoading();
    }, 3000);
}

// Copy UPI ID
function copyUpiId() {
    const upiId = document.getElementById('qrUpiId').textContent;
    
    navigator.clipboard.writeText(upiId).then(() => {
        showToast('UPI ID copied to clipboard', 'success');
    }).catch(err => {
        console.error('Copy failed:', err);
        showToast('Failed to copy UPI ID', 'error');
    });
}

// Show Limits Details
function showLimitsDetails() {
    const details = `
        <strong>Deposit Limits:</strong><br>
        • Minimum: ₹${depositLimit.min} per transaction<br>
        • Maximum: ₹${depositLimit.max} per transaction<br>
        • Unlimited transactions per day<br><br>
        
        <strong>Withdrawal Limits:</strong><br>
        • Minimum: ₹${withdrawalLimit.min} per transaction<br>
        • Maximum: ₹${withdrawalLimit.max} per day<br>
        • TDS: ${tdsRate}% applicable on all withdrawals<br>
        • Processing fee: ₹10 per withdrawal<br><br>
        
        <strong>Timing Restrictions:</strong><br>
        • Deposits: 24/7<br>
        • Withdrawals: Mon-Fri, 9AM-6PM only<br>
        • Saturday & Sunday: No withdrawals
    `;
    
    showDialog('Limits & Rules', details, 'info');
}

// Show Transfer Modal
function showTransferModal() {
    showToast('Transfer feature coming soon!', 'info');
}

// Show Convert Modal
function showConvertModal() {
    showToast('Currency conversion feature coming soon!', 'info');
}

// Show Add Payment Method
function showAddPaymentMethod() {
    showToast('Add payment method feature coming soon!', 'info');
}

// Export Statement
async function exportStatement() {
    try {
        showLoading('Generating statement...');
        
        // Prepare statement data
        const statement = {
            user: {
                id: currentUser.id,
                email: currentUser.email,
                name: `${userProfile?.first_name || ''} ${userProfile?.last_name || ''}`.trim()
            },
            wallet: walletData,
            limits: {
                deposit: depositLimit,
                withdrawal: withdrawalLimit,
                tds_rate: tdsRate
            },
            generated_at: new Date().toISOString(),
            period: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                end: new Date().toISOString()
            }
        };
        
        // Convert to JSON
        const dataStr = JSON.stringify(statement, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        downloadLink.download = `uzumaki_statement_${dateStr}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        showToast('Statement exported successfully', 'success');
        hideLoading();
        
    } catch (error) {
        console.error('[Wallet] Export error:', error);
        showToast('Failed to export statement', 'error');
        hideLoading();
    }
}

// Refresh Wallet
async function refreshWallet() {
    try {
        showLoading('Refreshing wallet...');
        
        // Reload wallet data
        await initializeWallet();
        
        showToast('Wallet refreshed successfully', 'success');
        hideLoading();
        
    } catch (error) {
        console.error('[Wallet] Refresh error:', error);
        showToast('Failed to refresh wallet', 'error');
        hideLoading();
    }
}

// Filter Transactions
function filterTransactions() {
    showToast('Filter feature coming soon!', 'info');
}

// Admin: Handle Balance Adjustment
async function handleAdminAdjustment() {
    if (!userProfile?.is_admin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    const amount = parseFloat(elements.adjustAmount.value);
    const type = elements.adjustType.value;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to ${type === 'add' ? 'add' : 'deduct'} ₹${formatNumber(amount)}?`)) {
        return;
    }
    
    try {
        showLoading('Processing adjustment...');
        
        // Calculate new balance
        const adjustment = type === 'add' ? amount : -amount;
        
        // Update wallet data
        walletData.available_balance += adjustment;
        
        // Update UI
        updateWalletUI();
        updateSidebarUI();
        
        // Clear input
        elements.adjustAmount.value = '';
        
        showToast(`Balance ${type === 'add' ? 'increased' : 'decreased'} by ₹${formatNumber(amount)}`, 'success');
        hideLoading();
        
    } catch (error) {
        console.error('[Wallet] Admin adjustment error:', error);
        showToast('Failed to adjust balance', 'error');
        hideLoading();
    }
}

// Admin: Update Transaction Status
async function handleUpdateTransactionStatus() {
    if (!userProfile?.is_admin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    const transactionId = elements.transactionId.value.trim();
    const status = elements.transactionStatus.value;
    
    if (!transactionId) {
        showToast('Please enter transaction ID', 'error');
        return;
    }
    
    if (!status) {
        showToast('Please select status', 'error');
        return;
    }
    
    try {
        showLoading('Updating transaction status...');
        
        // In production, this would update the transaction in database
        console.log(`[Wallet] Updating transaction ${transactionId} to ${status}`);
        
        // Simulate API call
        setTimeout(() => {
            // Clear inputs
            elements.transactionId.value = '';
            
            showToast(`Transaction ${transactionId} updated to ${status}`, 'success');
            hideLoading();
        }, 1500);
        
    } catch (error) {
        console.error('[Wallet] Update transaction error:', error);
        showToast('Failed to update transaction', 'error');
        hideLoading();
    }
}

// Admin: Update Deposit Limits
async function handleUpdateDepositLimits() {
    if (!userProfile?.is_admin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    const newMin = parseInt(elements.newDepositMin.value);
    const newMax = parseInt(elements.newDepositMax.value);
    
    if (!newMin || !newMax || newMin <= 0 || newMax <= 0) {
        showToast('Please enter valid limits', 'error');
        return;
    }
    
    if (newMin >= newMax) {
        showToast('Minimum must be less than maximum', 'error');
        return;
    }
    
    if (!confirm(`Change deposit limits to Min: ₹${newMin}, Max: ₹${newMax}?`)) {
        return;
    }
    
    try {
        showLoading('Updating deposit limits...');
        
        // Update limits
        depositLimit.min = newMin;
        depositLimit.max = newMax;
        
        // Clear inputs
        elements.newDepositMin.value = '';
        elements.newDepositMax.value = '';
        
        showToast(`Deposit limits updated to Min: ₹${newMin}, Max: ₹${newMax}`, 'success');
        hideLoading();
        
    } catch (error) {
        console.error('[Wallet] Update limits error:', error);
        showToast('Failed to update limits', 'error');
        hideLoading();
    }
}

// Setup Real-Time Updates
function setupRealTimeUpdates() {
    // Update banking hours every minute
    setInterval(() => {
        checkBankingHours();
    }, 60000); // 1 minute
    
    // Refresh wallet data every 30 seconds (for demo purposes)
    setInterval(async () => {
        if (document.visibilityState === 'visible') {
            // Simulate small balance updates
            if (walletData && Math.random() > 0.7) {
                const smallChange = Math.random() * 10 - 5; // -5 to +5
                walletData.available_balance += smallChange;
                walletData.today_earnings += Math.max(0, smallChange);
                updateWalletUI();
                updateSidebarUI();
            }
        }
    }, 30000); // 30 seconds
}

// Start Banking Hours Timer
function startBankingHoursTimer() {
    const updateTimer = () => {
        const now = new Date();
        const day = now.getDay();
        
        if (day === 0 || day === 6) { // Weekend
            // Show next working day
            const nextMonday = new Date(now);
            const daysUntilMonday = day === 0 ? 1 : 6;
            nextMonday.setDate(now.getDate() + daysUntilMonday);
            nextMonday.setHours(9, 0, 0, 0);
            
            const diffMs = nextMonday - now;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            // Update withdrawal button tooltip
            const withdrawalBtns = [elements.withdrawEarningsBtn, elements.withdrawActionBtn];
            withdrawalBtns.forEach(btn => {
                if (btn) {
                    btn.title = `Withdrawals resume on Monday in ${diffHours}h ${diffMins}m`;
                }
            });
        } else if (!isBankingHours) {
            // Calculate time until banking hours start (next day at 9AM)
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            
            const diffMs = tomorrow - now;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            // Update withdrawal button tooltip
            const withdrawalBtns = [elements.withdrawEarningsBtn, elements.withdrawActionBtn];
            withdrawalBtns.forEach(btn => {
                if (btn) {
                    btn.title = `Banking hours start in ${diffHours}h ${diffMins}m`;
                }
            });
        }
    };
    
    // Update immediately and then every minute
    updateTimer();
    setInterval(updateTimer, 60000);
}

// Utility Functions
function showLoading(message = 'Loading...') {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.remove('hidden');
        const loadingText = elements.loadingOverlay.querySelector('.loading-text');
        if (loadingText && message) {
            loadingText.textContent = message;
        }
    }
}

function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.add('hidden');
    }
}

function showToast(message, type = 'info') {
    if (window.utils && typeof window.utils.showToast === 'function') {
        window.utils.showToast(message, type);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate__animated animate__fadeInRight`;
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
        z-index: 10000;
        font-weight: 500;
        max-width: 350px;
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
        toast.classList.add('animate__fadeOutRight');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function showFormError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
        let helper = field.nextElementSibling;
        if (!helper || !helper.classList.contains('form-helper')) {
            helper = document.createElement('p');
            helper.className = 'form-helper error';
            field.parentNode.insertBefore(helper, field.nextSibling);
        }
        helper.textContent = message;
        helper.style.color = 'var(--wallet-danger)';
        
        field.style.borderColor = 'var(--wallet-danger)';
    }
}

function clearFormError(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.style.borderColor = '';
        
        const helper = field.nextElementSibling;
        if (helper && helper.classList.contains('form-helper')) {
            helper.textContent = '';
        }
    }
}

function showDialog(title, content, type = 'info') {
    const dialog = document.createElement('div');
    dialog.className = 'wallet-modal active';
    dialog.style.display = 'flex';
    
    const icon = type === 'info' ? 'fas fa-info-circle' :
                 type === 'warning' ? 'fas fa-exclamation-triangle' :
                 type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    
    const iconColor = type === 'info' ? 'var(--wallet-info)' :
                      type === 'warning' ? 'var(--wallet-warning)' :
                      type === 'success' ? 'var(--wallet-success)' : 'var(--wallet-danger)';
    
    dialog.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="${icon}" style="color: ${iconColor}"></i> ${title}</h3>
                <button class="modal-close" id="closeDialog">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="line-height: 1.6;">${content.replace(/\n/g, '<br>')}</div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" id="confirmDialog">OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('#closeDialog').addEventListener('click', () => {
        dialog.remove();
    });
    
    dialog.querySelector('#confirmDialog').addEventListener('click', () => {
        dialog.remove();
    });
    
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.remove();
        }
    });
}

function formatCurrency(amount) {
    if (typeof amount !== 'number') amount = 0;
    return '₹' + formatNumber(amount);
}

function formatNumber(num) {
    if (typeof num !== 'number') num = 0;
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Initialize sidebar functionality
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Initialize sidebar collapse
        const sidebarCollapse = document.getElementById('sidebarCollapse');
        const desktopSidebar = document.querySelector('.desktop-sidebar');
        
        if (sidebarCollapse && desktopSidebar) {
            sidebarCollapse.addEventListener('click', () => {
                desktopSidebar.classList.toggle('collapsed');
            });
        }
        
        // Initialize mobile menu
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileSidebar = document.getElementById('mobileSidebar');
        const mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
        const closeMobileSidebar = document.getElementById('closeMobileSidebar');
        
        if (mobileMenuToggle && mobileSidebar) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileSidebar.classList.add('active');
                mobileSidebarOverlay.classList.add('active');
            });
            
            closeMobileSidebar?.addEventListener('click', () => {
                mobileSidebar.classList.remove('active');
                mobileSidebarOverlay.classList.remove('active');
            });
            
            mobileSidebarOverlay?.addEventListener('click', () => {
                mobileSidebar.classList.remove('active');
                mobileSidebarOverlay.classList.remove('active');
            });
        }
        
        // Initialize logout buttons
        const logoutButtons = [
            document.getElementById('sidebarLogout'),
            document.getElementById('mobileLogoutBtn')
        ];
        
        logoutButtons.forEach(btn => {
            btn?.addEventListener('click', async () => {
                if (confirm('Are you sure you want to log out?')) {
                    try {
                        showLoading('Logging out...');
                        await sessionManager.logout();
                    } catch (error) {
                        console.error('Logout error:', error);
                        hideLoading();
                    }
                }
            });
        });
    });
}

console.log('[Wallet] wallet.js loaded successfully');
[file content end]
