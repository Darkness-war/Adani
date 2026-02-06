// Investments Page JavaScript - Professional Version
import { sessionManager, dbService, utils, supabase } from '../core/supabase.js';

// Global Variables
let currentUser = null;
let userProfile = null;
let allPlans = [];
let userInvestments = [];
let selectedPlan = null;
let selectedInvestment = null;
let chartInstance = null;

// DOM Elements
const elements = {
    // Loading
    loadingOverlay: document.getElementById('loadingOverlay'),
    
    // Stats
    availableBalance: document.getElementById('availableBalance'),
    totalInvested: document.getElementById('totalInvested'),
    totalEarnings: document.getElementById('totalEarnings'),
    
    // Tabs
    tabs: document.querySelectorAll('.investment-tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Plans Container
    allPlansContainer: document.getElementById('allPlansContainer'),
    plansLoading: document.getElementById('plansLoading'),
    noPlans: document.getElementById('noPlans'),
    allPlansCount: document.getElementById('allPlansCount'),
    vipPlansCount: document.getElementById('vipPlansCount'),
    
    // Filter Controls
    planSearch: document.getElementById('planSearch'),
    sortPlans: document.getElementById('sortPlans'),
    filterPlans: document.getElementById('filterPlans'),
    refreshPlans: document.getElementById('refreshPlans'),
    
    // My Investments
    myInvestmentsContainer: document.getElementById('myInvestmentsContainer'),
    myInvestmentsCount: document.getElementById('myInvestmentsCount'),
    noInvestments: document.getElementById('noInvestments'),
    addInvestmentBtn: document.getElementById('addInvestmentBtn'),
    exportInvestments: document.getElementById('exportInvestments'),
    performanceChartSection: document.getElementById('performanceChartSection'),
    investmentChart: document.getElementById('investmentChart'),
    chartTimeRange: document.getElementById('chartTimeRange'),
    
    // Calculator
    calcAmount: document.getElementById('calcAmount'),
    calcAmountSlider: document.getElementById('calcAmountSlider'),
    calcDuration: document.getElementById('calcDuration'),
    calcDurationSlider: document.getElementById('calcDurationSlider'),
    calcROI: document.getElementById('calcROI'),
    calcROISlider: document.getElementById('calcROISlider'),
    calcCompound: document.getElementById('calcCompound'),
    calcPrincipal: document.getElementById('calcPrincipal'),
    calcInterest: document.getElementById('calcInterest'),
    calcTotalDuration: document.getElementById('calcTotalDuration'),
    calcMonthly: document.getElementById('calcMonthly'),
    calcTotal: document.getElementById('calcTotal'),
    resetCalculator: document.getElementById('resetCalculator'),
    investFromCalculator: document.getElementById('investFromCalculator'),
    
    // Comparison
    comparisonTable: document.getElementById('comparisonTable'),
    noComparison: document.getElementById('noComparison'),
    selectForComparison: document.getElementById('selectForComparison'),
    
    // Modals
    investModal: document.getElementById('investModal'),
    planDetailsModal: document.getElementById('planDetailsModal'),
    withdrawModal: document.getElementById('withdrawModal'),
    
    // Form Elements
    investForm: document.getElementById('investForm'),
    investAmount: document.getElementById('investAmount'),
    amountHelper: document.getElementById('amountHelper'),
    investDuration: document.getElementById('investDuration'),
    investNotes: document.getElementById('investNotes'),
    summaryAmount: document.getElementById('summaryAmount'),
    summaryMonthly: document.getElementById('summaryMonthly'),
    summaryTotal: document.getElementById('summaryTotal'),
    summaryFinal: document.getElementById('summaryFinal'),
    cancelInvest: document.getElementById('cancelInvest'),
    confirmInvest: document.getElementById('confirmInvest'),
    
    // Withdraw Form
    withdrawForm: document.getElementById('withdrawForm'),
    withdrawAmount: document.getElementById('withdrawAmount'),
    withdrawHelper: document.getElementById('withdrawHelper'),
    withdrawMethod: document.getElementById('withdrawMethod'),
    cancelWithdraw: document.getElementById('cancelWithdraw'),
    confirmWithdraw: document.getElementById('confirmWithdraw'),
    
    // Modal Close Buttons
    closeInvestModal: document.getElementById('closeInvestModal'),
    closeDetailsModal: document.getElementById('closeDetailsModal'),
    closeWithdrawModal: document.getElementById('closeWithdrawModal')
};

// Initialize Investments Page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Investments] Initializing page...');
    
    try {
        // Show loading overlay
        showLoading();
        
        // Check authentication
        await checkAuth();
        
        // Initialize all components
        await initializePage();
        initializeEventListeners();
        initializeTabs();
        initializeCalculator();
        
        // Hide loading overlay
        hideLoading();
        
        console.log('[Investments] Initialization complete');
        
        // Show welcome toast
        showToast('Investment plans loaded successfully', 'success');
        
    } catch (error) {
        console.error('[Investments] Initialization error:', error);
        showToast('Failed to load investment data. Please refresh.', 'error');
        hideLoading();
    }
});

// Authentication Check
async function checkAuth() {
    try {
        const { user, profile } = await sessionManager.getCurrentUser();
        
        if (!user) {
            console.log('[Investments] No user found, redirecting to login');
            window.location.href = '/pages/auth/login.html';
            return;
        }
        
        currentUser = user;
        userProfile = profile;
        
    } catch (error) {
        console.error('[Investments] Auth check error:', error);
        window.location.href = '/pages/auth/login.html';
    }
}

// Initialize Page
async function initializePage() {
    if (!currentUser) return;
    
    try {
        // Load user stats
        await updateUserStats();
        
        // Load investment plans
        await loadPlans();
        
        // Load user investments
        await loadUserInvestments();
        
        // Initialize chart if investments exist
        if (userInvestments.length > 0) {
            initializePerformanceChart();
        }
        
    } catch (error) {
        console.error('[Investments] Page initialization error:', error);
        throw error;
    }
}

// Update User Stats
async function updateUserStats() {
    try {
        // Update balance from profile
        if (userProfile) {
            elements.availableBalance.textContent = utils.formatCurrency(userProfile.balance || 0);
        }
        
        // Calculate total invested and earnings
        let totalInvested = 0;
        let totalEarnings = 0;
        
        if (userInvestments.length > 0) {
            userInvestments.forEach(investment => {
                if (investment.status === 'active' || investment.status === 'completed') {
                    totalInvested += parseFloat(investment.amount || 0);
                    totalEarnings += parseFloat(investment.earnings || 0);
                }
            });
        }
        
        elements.totalInvested.textContent = utils.formatCurrency(totalInvested);
        elements.totalEarnings.textContent = utils.formatCurrency(totalEarnings);
        
    } catch (error) {
        console.error('[Investments] Stats update error:', error);
    }
}

// Load Investment Plans
async function loadPlans() {
    try {
        // Show loading state
        elements.allPlansContainer.innerHTML = '';
        elements.plansLoading.style.display = 'grid';
        elements.noPlans.style.display = 'none';
        
        // Fetch plans from Supabase
        const { data: plans, error } = await supabase
            .from('plans')
            .select('*')
            .eq('is_active', true)
            .order('price', { ascending: true });
        
        if (error) throw error;
        
        allPlans = plans || [];
        
        // Update counts
        elements.allPlansCount.textContent = allPlans.length;
        
        const vipPlans = allPlans.filter(plan => plan.category === 'vip' || plan.is_vip);
        elements.vipPlansCount.textContent = vipPlans.length;
        
        // Render plans
        renderPlans(allPlans);
        
        // Hide loading state
        elements.plansLoading.style.display = 'none';
        
        if (allPlans.length === 0) {
            elements.noPlans.style.display = 'block';
        }
        
    } catch (error) {
        console.error('[Investments] Plans load error:', error);
        elements.plansLoading.style.display = 'none';
        elements.noPlans.style.display = 'block';
        showToast('Failed to load investment plans', 'error');
    }
}

// Render Plans
function renderPlans(plans) {
    elements.allPlansContainer.innerHTML = '';
    
    if (plans.length === 0) {
        elements.noPlans.style.display = 'block';
        return;
    }
    
    plans.forEach(plan => {
        const planCard = createPlanCard(plan);
        elements.allPlansContainer.appendChild(planCard);
    });
    
    // Add animation
    elements.allPlansContainer.style.animation = 'fadeIn 0.5s ease';
}

// Create Plan Card
function createPlanCard(plan) {
    const div = document.createElement('div');
    div.className = `plan-card ${plan.category || ''} ${plan.featured ? 'featured' : ''}`;
    div.dataset.planId = plan.id;
    
    // Determine badge
    let badgeHTML = '';
    if (plan.featured) {
        badgeHTML = '<div class="plan-badge badge-featured">Featured</div>';
    } else if (plan.is_new) {
        badgeHTML = '<div class="plan-badge badge-new">New</div>';
    } else if (plan.category === 'vip' || plan.is_vip) {
        badgeHTML = '<div class="plan-badge badge-vip">VIP</div>';
    } else if (plan.is_popular) {
        badgeHTML = '<div class="plan-badge badge-popular">Popular</div>';
    }
    
    // Determine image URL (with fallback)
    const imageUrl = plan.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(plan.name)}&background=4361ee&color=fff&size=128`;
    
    // Calculate ROI and other values
    const monthlyROI = parseFloat(plan.monthly_roi || plan.annual_roi / 12 || 0);
    const totalROI = parseFloat(plan.total_roi || plan.annual_roi || 0);
    const minAmount = parseFloat(plan.min_amount || 500);
    const maxAmount = parseFloat(plan.max_amount || 1000000);
    
    div.innerHTML = `
        ${badgeHTML}
        
        <div class="plan-header">
            <div class="plan-image">
                <img src="${imageUrl}" alt="${plan.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(plan.name)}&background=4361ee&color=fff'">
            </div>
            <h3 class="plan-title">${plan.name}</h3>
            <p class="plan-description">${plan.description || 'High-yield investment opportunity'}</p>
            
            <div class="plan-price">
                <span class="plan-amount">₹${parseInt(plan.price || 1000).toLocaleString()}</span>
                <span class="plan-currency">INR</span>
            </div>
            <div class="plan-period">Minimum Investment • ${plan.duration || 12} months</div>
        </div>
        
        <div class="plan-body">
            <div class="plan-features">
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-percentage"></i>
                        <span>Monthly ROI</span>
                    </div>
                    <div class="feature-value success">${monthlyROI.toFixed(2)}%</div>
                </div>
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-chart-line"></i>
                        <span>Total ROI</span>
                    </div>
                    <div class="feature-value success">${totalROI.toFixed(2)}%</div>
                </div>
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-indian-rupee-sign"></i>
                        <span>Investment Range</span>
                    </div>
                    <div class="feature-value">₹${minAmount.toLocaleString()} - ₹${maxAmount.toLocaleString()}</div>
                </div>
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Duration</span>
                    </div>
                    <div class="feature-value">${plan.duration || 12} months</div>
                </div>
            </div>
            
            ${plan.slots_available ? `
            <div class="progress-container">
                <div class="progress-header">
                    <span class="progress-label">Available Slots</span>
                    <span class="progress-percentage">${plan.slots_taken || 0}/${plan.slots_available}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${((plan.slots_taken || 0) / plan.slots_available * 100)}%"></div>
                </div>
            </div>
            ` : ''}
            
            <div class="plan-actions">
                <button class="btn-invest" onclick="openInvestModal('${plan.id}')" ${userProfile && userProfile.balance < minAmount ? 'disabled' : ''}>
                    <i class="fas fa-chart-line"></i>
                    <span>${userProfile && userProfile.balance < minAmount ? 'Insufficient Funds' : 'Invest Now'}</span>
                </button>
                <button class="btn-details" onclick="openPlanDetails('${plan.id}')">
                    <i class="fas fa-info-circle"></i>
                    <span>Details</span>
                </button>
            </div>
        </div>
    `;
    
    return div;
}

// Load User Investments
async function loadUserInvestments() {
    try {
        const investments = await dbService.getUserInvestments(currentUser.id);
        userInvestments = investments || [];
        
        // Update count
        elements.myInvestmentsCount.textContent = userInvestments.length;
        
        // Render investments
        renderUserInvestments();
        
        // Show/hide empty state
        if (userInvestments.length === 0) {
            elements.noInvestments.style.display = 'block';
            elements.performanceChartSection.style.display = 'none';
        } else {
            elements.noInvestments.style.display = 'none';
            elements.performanceChartSection.style.display = 'block';
        }
        
    } catch (error) {
        console.error('[Investments] User investments load error:', error);
        userInvestments = [];
        elements.noInvestments.style.display = 'block';
    }
}

// Render User Investments
function renderUserInvestments() {
    elements.myInvestmentsContainer.innerHTML = '';
    
    userInvestments.forEach(investment => {
        const investmentCard = createInvestmentCard(investment);
        elements.myInvestmentsContainer.appendChild(investmentCard);
    });
}

// Create Investment Card
function createInvestmentCard(investment) {
    const div = document.createElement('div');
    div.className = 'investment-card';
    div.dataset.investmentId = investment.id;
    
    // Find plan details
    const plan = investment.plan || allPlans.find(p => p.id === investment.plan_id) || {};
    
    // Calculate values
    const amount = parseFloat(investment.amount || 0);
    const earnings = parseFloat(investment.earnings || 0);
    const startDate = new Date(investment.start_date || investment.created_at);
    const endDate = new Date(investment.end_date || investment.expected_end_date);
    const now = new Date();
    
    // Calculate progress
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    const progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    
    // Determine status
    let statusClass = 'status-active';
    let statusText = 'Active';
    
    if (investment.status === 'completed') {
        statusClass = 'status-completed';
        statusText = 'Completed';
    } else if (investment.status === 'pending') {
        statusClass = 'status-pending';
        statusText = 'Pending';
    } else if (investment.status === 'cancelled') {
        statusClass = 'status-cancelled';
        statusText = 'Cancelled';
    }
    
    div.innerHTML = `
        <div class="investment-card-header">
            <div class="investment-info">
                <div class="investment-image">
                    <img src="${plan.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(plan.name)}&background=4361ee&color=fff&size=64`}" 
                         alt="${plan.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(plan.name)}&background=4361ee&color=fff'">
                </div>
                <div class="investment-details">
                    <h4>${plan.name || 'Unknown Plan'}</h4>
                    <p>Started on ${formatDate(startDate)}</p>
                </div>
            </div>
            <span class="investment-status ${statusClass}">${statusText}</span>
        </div>
        
        <div class="investment-stats">
            <div class="investment-stat-item">
                <span class="investment-stat-label">Amount Invested</span>
                <span class="investment-stat-value">₹${amount.toLocaleString()}</span>
            </div>
            <div class="investment-stat-item">
                <span class="investment-stat-label">Earnings</span>
                <span class="investment-stat-value success">+₹${earnings.toLocaleString()}</span>
            </div>
            <div class="investment-stat-item">
                <span class="investment-stat-label">Duration</span>
                <span class="investment-stat-value">${totalDays} days</span>
            </div>
            <div class="investment-stat-item">
                <span class="investment-stat-label">Progress</span>
                <span class="investment-stat-value">${progress.toFixed(1)}%</span>
            </div>
        </div>
        
        <div class="progress-container">
            <div class="progress-header">
                <span class="progress-label">Investment Progress</span>
                <span class="progress-percentage">${progress.toFixed(1)}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        
        <div class="investment-actions">
            ${investment.status === 'active' ? `
            <button class="btn-action btn-withdraw" onclick="openWithdrawModal('${investment.id}')">
                <i class="fas fa-hand-holding-usd"></i>
                <span>Withdraw Earnings</span>
            </button>
            ` : ''}
            
            ${investment.status === 'active' ? `
            <button class="btn-action btn-renew" onclick="renewInvestment('${investment.id}')">
                <i class="fas fa-redo"></i>
                <span>Renew</span>
            </button>
            ` : ''}
            
            ${investment.status === 'active' ? `
            <button class="btn-action btn-cancel" onclick="cancelInvestment('${investment.id}')">
                <i class="fas fa-times"></i>
                <span>Cancel</span>
            </button>
            ` : ''}
        </div>
    `;
    
    return div;
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Tab switching
    elements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Filter controls
    elements.planSearch.addEventListener('input', debounce(filterPlans, 300));
    elements.sortPlans.addEventListener('change', filterPlans);
    elements.filterPlans.addEventListener('change', filterPlans);
    elements.refreshPlans.addEventListener('click', loadPlans);
    
    // Invest modal
    elements.closeInvestModal.addEventListener('click', () => closeModal('investModal'));
    elements.cancelInvest.addEventListener('click', () => closeModal('investModal'));
    elements.investForm.addEventListener('submit', handleInvestSubmit);
    
    // Amount percentage buttons
    document.querySelectorAll('[data-percent]').forEach(btn => {
        btn.addEventListener('click', () => {
            const percent = parseFloat(btn.dataset.percent) / 100;
            const balance = parseFloat(userProfile.balance || 0);
            const amount = Math.floor(balance * percent);
            elements.investAmount.value = amount;
            updateInvestmentSummary();
        });
    });
    
    // Investment amount input
    elements.investAmount.addEventListener('input', updateInvestmentSummary);
    elements.investDuration.addEventListener('change', updateInvestmentSummary);
    
    // Details modal
    elements.closeDetailsModal.addEventListener('click', () => closeModal('planDetailsModal'));
    
    // Withdraw modal
    elements.closeWithdrawModal.addEventListener('click', () => closeModal('withdrawModal'));
    elements.cancelWithdraw.addEventListener('click', () => closeModal('withdrawModal'));
    elements.withdrawForm.addEventListener('submit', handleWithdrawSubmit);
    
    // Export investments
    elements.exportInvestments.addEventListener('click', exportInvestmentsData);
    
    // Add investment button
    elements.addInvestmentBtn.addEventListener('click', () => switchTab('all-plans'));
    
    // Chart time range
    elements.chartTimeRange.addEventListener('change', updatePerformanceChart);
    
    // Comparison
    elements.selectForComparison.addEventListener('click', openComparisonSelector);
    
    // Close modals on outside click
    document.querySelectorAll('.invest-modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// Initialize Tabs
function initializeTabs() {
    // Set first tab as active
    if (elements.tabs.length > 0) {
        elements.tabs[0].classList.add('active');
    }
    if (elements.tabContents.length > 0) {
        elements.tabContents[0].classList.add('active');
    }
}

// Initialize Calculator
function initializeCalculator() {
    // Link sliders with inputs
    elements.calcAmount.addEventListener('input', () => {
        elements.calcAmountSlider.value = elements.calcAmount.value;
        calculateReturns();
    });
    
    elements.calcAmountSlider.addEventListener('input', () => {
        elements.calcAmount.value = elements.calcAmountSlider.value;
        calculateReturns();
    });
    
    elements.calcDuration.addEventListener('input', () => {
        elements.calcDurationSlider.value = elements.calcDuration.value;
        calculateReturns();
    });
    
    elements.calcDurationSlider.addEventListener('input', () => {
        elements.calcDuration.value = elements.calcDurationSlider.value;
        calculateReturns();
    });
    
    elements.calcROI.addEventListener('input', () => {
        elements.calcROISlider.value = elements.calcROI.value;
        calculateReturns();
    });
    
    elements.calcROISlider.addEventListener('input', () => {
        elements.calcROI.value = elements.calcROISlider.value;
        calculateReturns();
    });
    
    elements.calcCompound.addEventListener('change', calculateReturns);
    elements.resetCalculator.addEventListener('click', resetCalculator);
    elements.investFromCalculator.addEventListener('click', investFromCalculator);
    
    // Initial calculation
    calculateReturns();
}

// Switch Tab
function switchTab(tabId) {
    // Update tabs
    elements.tabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabId) {
            tab.classList.add('active');
        }
    });
    
    // Update content
    elements.tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${tabId}-content`) {
            content.classList.add('active');
        }
    });
    
    // Special handling for certain tabs
    if (tabId === 'my-investments' && userInvestments.length > 0) {
        updatePerformanceChart();
    }
    
    if (tabId === 'comparison') {
        updateComparisonTable();
    }
}

// Filter Plans
function filterPlans() {
    const searchTerm = elements.planSearch.value.toLowerCase();
    const sortBy = elements.sortPlans.value;
    const filterBy = elements.filterPlans.value;
    
    let filteredPlans = [...allPlans];
    
    // Filter by search term
    if (searchTerm) {
        filteredPlans = filteredPlans.filter(plan => 
            plan.name.toLowerCase().includes(searchTerm) ||
            plan.description.toLowerCase().includes(searchTerm) ||
            plan.category.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by category
    if (filterBy === 'normal') {
        filteredPlans = filteredPlans.filter(plan => !plan.is_vip && plan.category !== 'vip');
    } else if (filterBy === 'vip') {
        filteredPlans = filteredPlans.filter(plan => plan.is_vip || plan.category === 'vip');
    } else if (filterBy === 'featured') {
        filteredPlans = filteredPlans.filter(plan => plan.featured);
    } else if (filterBy === 'new') {
        filteredPlans = filteredPlans.filter(plan => plan.is_new);
    }
    
    // Sort plans
    filteredPlans.sort((a, b) => {
        switch (sortBy) {
            case 'price_asc':
                return (a.price || 0) - (b.price || 0);
            case 'price_desc':
                return (b.price || 0) - (a.price || 0);
            case 'roi_desc':
                return (b.annual_roi || 0) - (a.annual_roi || 0);
            case 'duration_asc':
                return (a.duration || 0) - (b.duration || 0);
            case 'popularity_desc':
                return (b.popularity || 0) - (a.popularity || 0);
            default:
                return 0;
        }
    });
    
    // Render filtered plans
    renderPlans(filteredPlans);
}

// Open Invest Modal
async function openInvestModal(planId) {
    try {
        // Find the plan
        const plan = allPlans.find(p => p.id === planId);
        if (!plan) {
            showToast('Plan not found', 'error');
            return;
        }
        
        selectedPlan = plan;
        
        // Update modal content
        const imageUrl = plan.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(plan.name)}&background=4361ee&color=fff`;
        
        document.getElementById('selectedPlanInfo').innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--gray-50); border-radius: var(--radius-md);">
                <img src="${imageUrl}" alt="${plan.name}" style="width: 48px; height: 48px; border-radius: var(--radius-sm);" 
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(plan.name)}&background=4361ee&color=fff'">
                <div>
                    <h4 style="margin: 0 0 0.25rem 0; color: var(--gray-900);">${plan.name}</h4>
                    <p style="margin: 0; font-size: 0.875rem; color: var(--gray-600);">Monthly ROI: ${plan.monthly_roi || (plan.annual_roi / 12).toFixed(2)}%</p>
                </div>
            </div>
        `;
        
        // Set minimum amount
        const minAmount = parseFloat(plan.min_amount || 500);
        elements.investAmount.min = minAmount;
        elements.amountHelper.textContent = `Minimum: ₹${minAmount.toLocaleString()}`;
        
        // Set default amount to minimum
        elements.investAmount.value = minAmount;
        
        // Update duration options
        elements.investDuration.innerHTML = `
            <option value="">Select duration</option>
            ${[3, 6, 12, 24, 36].map(months => `
                <option value="${months}" ${months === plan.duration ? 'selected' : ''}>${months} months</option>
            `).join('')}
        `;
        
        // Update summary
        updateInvestmentSummary();
        
        // Show modal
        elements.investModal.classList.add('active');
        
    } catch (error) {
        console.error('[Investments] Open invest modal error:', error);
        showToast('Failed to open investment form', 'error');
    }
}

// Update Investment Summary
function updateInvestmentSummary() {
    if (!selectedPlan) return;
    
    const amount = parseFloat(elements.investAmount.value || 0);
    const duration = parseInt(elements.investDuration.value || selectedPlan.duration || 12);
    
    // Calculate returns
    const monthlyROI = parseFloat(selectedPlan.monthly_roi || selectedPlan.annual_roi / 12 || 0);
    const monthlyReturn = amount * (monthlyROI / 100);
    const totalReturn = monthlyReturn * duration;
    const finalAmount = amount + totalReturn;
    
    // Update summary
    elements.summaryAmount.textContent = `₹${amount.toLocaleString()}`;
    elements.summaryMonthly.textContent = `₹${monthlyReturn.toLocaleString()}`;
    elements.summaryTotal.textContent = `₹${totalReturn.toLocaleString()}`;
    elements.summaryFinal.textContent = `₹${finalAmount.toLocaleString()}`;
}

// Handle Invest Submit
async function handleInvestSubmit(e) {
    e.preventDefault();
    
    if (!selectedPlan || !currentUser) return;
    
    const amount = parseFloat(elements.investAmount.value);
    const duration = parseInt(elements.investDuration.value);
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const notes = elements.investNotes.value;
    
    // Validation
    if (!amount || amount < selectedPlan.min_amount) {
        showToast(`Minimum investment is ₹${selectedPlan.min_amount}`, 'error');
        return;
    }
    
    if (!duration) {
        showToast('Please select investment duration', 'error');
        return;
    }
    
    if (!paymentMethod) {
        showToast('Please select payment method', 'error');
        return;
    }
    
    if (paymentMethod === 'wallet' && amount > userProfile.balance) {
        showToast('Insufficient wallet balance', 'error');
        return;
    }
    
    try {
        showLoading('Processing investment...');
        
        // Create investment record
        const investmentData = {
            user_id: currentUser.id,
            plan_id: selectedPlan.id,
            plan_name: selectedPlan.name,
            amount: amount,
            duration_months: duration,
            payment_method: paymentMethod,
            status: 'active',
            start_date: new Date().toISOString(),
            expected_end_date: new Date(Date.now() + duration * 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: notes,
            metadata: {
                monthly_roi: selectedPlan.monthly_roi,
                annual_roi: selectedPlan.annual_roi,
                plan_category: selectedPlan.category
            }
        };
        
        const { data: investment, error } = await supabase
            .from('investments')
            .insert(investmentData)
            .select()
            .single();
        
        if (error) throw error;
        
        // Update user balance if using wallet
        if (paymentMethod === 'wallet') {
            await dbService.updateBalance(currentUser.id, amount, 'subtract');
            
            // Update user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single();
            
            if (profile) {
                userProfile = profile;
            }
        }
        
        // Create transaction record
        await dbService.createTransaction({
            user_id: currentUser.id,
            type: 'investment',
            amount: -amount,
            status: 'completed',
            description: `Investment in ${selectedPlan.name}`,
            metadata: {
                investment_id: investment.id,
                plan_id: selectedPlan.id,
                duration: duration
            }
        });
        
        // Close modal
        closeModal('investModal');
        
        // Show success
        showToast('Investment successful!', 'success');
        
        // Reload data
        await updateUserStats();
        await loadUserInvestments();
        
        // Switch to my investments tab
        switchTab('my-investments');
        
        // Log audit event
        if (window.auditLogger) {
            window.auditLogger.logFinancialAction('investment_made', amount, 'INR', {
                plan_name: selectedPlan.name,
                duration: duration
            });
        }
        
    } catch (error) {
        console.error('[Investments] Invest submit error:', error);
        showToast('Investment failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Open Plan Details
async function openPlanDetails(planId) {
    try {
        const plan = allPlans.find(p => p.id === planId);
        if (!plan) {
            showToast('Plan not found', 'error');
            return;
        }
        
        const imageUrl = plan.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(plan.name)}&background=4361ee&color=fff`;
        
        document.getElementById('planDetailsContent').innerHTML = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <img src="${imageUrl}" alt="${plan.name}" 
                     style="width: 100px; height: 100px; border-radius: var(--radius-lg); margin-bottom: 1rem;"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(plan.name)}&background=4361ee&color=fff'">
                <h3 style="margin: 0 0 0.5rem 0; color: var(--gray-900);">${plan.name}</h3>
                <p style="color: var(--gray-600); margin: 0;">${plan.category || 'Standard'} Plan</p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <p style="color: var(--gray-700); line-height: 1.6;">${plan.description || 'No description available.'}</p>
            </div>
            
            <div class="plan-features">
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-percentage"></i>
                        <span>Monthly ROI</span>
                    </div>
                    <div class="feature-value success">${(plan.monthly_roi || plan.annual_roi / 12 || 0).toFixed(2)}%</div>
                </div>
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-chart-line"></i>
                        <span>Annual ROI</span>
                    </div>
                    <div class="feature-value success">${(plan.annual_roi || 0).toFixed(2)}%</div>
                </div>
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-indian-rupee-sign"></i>
                        <span>Minimum Investment</span>
                    </div>
                    <div class="feature-value">₹${(plan.min_amount || 500).toLocaleString()}</div>
                </div>
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-indian-rupee-sign"></i>
                        <span>Maximum Investment</span>
                    </div>
                    <div class="feature-value">₹${(plan.max_amount || 1000000).toLocaleString()}</div>
                </div>
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Duration</span>
                    </div>
                    <div class="feature-value">${plan.duration || 12} months</div>
                </div>
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-coins"></i>
                        <span>Compounding</span>
                    </div>
                    <div class="feature-value">${plan.compounding ? 'Yes' : 'No'}</div>
                </div>
                <div class="plan-feature">
                    <div class="feature-label">
                        <i class="fas fa-user-friends"></i>
                        <span>Referral Bonus</span>
                    </div>
                    <div class="feature-value success">${plan.referral_bonus || 0}%</div>
                </div>
            </div>
            
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--gray-200);">
                <h4 style="margin: 0 0 0.75rem 0; color: var(--gray-900);">Terms & Conditions</h4>
                <ul style="color: var(--gray-600); padding-left: 1.25rem; margin: 0; font-size: 0.875rem;">
                    <li>Withdrawals processed within 24-48 hours</li>
                    <li>Early withdrawal penalty may apply</li>
                    <li>Returns are not guaranteed and subject to market risks</li>
                    <li>Read our complete terms for full details</li>
                </ul>
            </div>
        `;
        
        elements.planDetailsModal.classList.add('active');
        
    } catch (error) {
        console.error('[Investments] Open plan details error:', error);
        showToast('Failed to load plan details', 'error');
    }
}

// Open Withdraw Modal
async function openWithdrawModal(investmentId) {
    try {
        const investment = userInvestments.find(i => i.id === investmentId);
        if (!investment) {
            showToast('Investment not found', 'error');
            return;
        }
        
        selectedInvestment = investment;
        
        const plan = investment.plan || allPlans.find(p => p.id === investment.plan_id) || {};
        const availableEarnings = parseFloat(investment.earnings || 0);
        
        document.getElementById('withdrawInvestmentInfo').innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: var(--gray-50); border-radius: var(--radius-md);">
                <div style="width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--invest-primary); color: white; display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div>
                    <h4 style="margin: 0 0 0.25rem 0; color: var(--gray-900); font-size: 0.9375rem;">${plan.name || 'Investment'}</h4>
                    <p style="margin: 0; font-size: 0.875rem; color: var(--gray-600);">Available: ₹${availableEarnings.toLocaleString()}</p>
                </div>
            </div>
        `;
        
        elements.withdrawAmount.max = availableEarnings;
        elements.withdrawAmount.value = availableEarnings;
        elements.withdrawHelper.textContent = `Available: ₹${availableEarnings.toLocaleString()}`;
        
        elements.withdrawModal.classList.add('active');
        
    } catch (error) {
        console.error('[Investments] Open withdraw modal error:', error);
        showToast('Failed to open withdrawal form', 'error');
    }
}

// Handle Withdraw Submit
async function handleWithdrawSubmit(e) {
    e.preventDefault();
    
    if (!selectedInvestment || !currentUser) return;
    
    const amount = parseFloat(elements.withdrawAmount.value);
    const method = elements.withdrawMethod.value;
    
    // Validation
    if (!amount || amount < 100) {
        showToast('Minimum withdrawal is ₹100', 'error');
        return;
    }
    
    if (!method) {
        showToast('Please select withdrawal method', 'error');
        return;
    }
    
    const availableEarnings = parseFloat(selectedInvestment.earnings || 0);
    if (amount > availableEarnings) {
        showToast('Insufficient earnings', 'error');
        return;
    }
    
    try {
        showLoading('Processing withdrawal...');
        
        // Update investment earnings
        const newEarnings = availableEarnings - amount;
        
        const { error: updateError } = await supabase
            .from('investments')
            .update({ 
                earnings: newEarnings,
                last_withdrawal: new Date().toISOString()
            })
            .eq('id', selectedInvestment.id);
        
        if (updateError) throw updateError;
        
        // Add to user balance
        await dbService.updateBalance(currentUser.id, amount, 'add');
        
        // Create withdrawal transaction
        await dbService.createTransaction({
            user_id: currentUser.id,
            type: 'withdrawal',
            amount: amount,
            status: 'pending',
            description: `Withdrawal from investment`,
            metadata: {
                investment_id: selectedInvestment.id,
                method: method,
                processed: false
            }
        });
        
        // Close modal
        closeModal('withdrawModal');
        
        // Show success
        showToast('Withdrawal request submitted', 'success');
        
        // Reload data
        await updateUserStats();
        await loadUserInvestments();
        
        // Log audit event
        if (window.auditLogger) {
            window.auditLogger.logFinancialAction('earnings_withdrawn', amount, 'INR', {
                investment_id: selectedInvestment.id
            });
        }
        
    } catch (error) {
        console.error('[Investments] Withdraw submit error:', error);
        showToast('Withdrawal failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Renew Investment
async function renewInvestment(investmentId) {
    try {
        const investment = userInvestments.find(i => i.id === investmentId);
        if (!investment) {
            showToast('Investment not found', 'error');
            return;
        }
        
        if (!confirm('Renew this investment for another term?')) {
            return;
        }
        
        showLoading('Renewing investment...');
        
        const plan = allPlans.find(p => p.id === investment.plan_id);
        if (!plan) {
            showToast('Plan not found', 'error');
            return;
        }
        
        // Check if user has sufficient balance
        if (investment.amount > userProfile.balance) {
            showToast('Insufficient balance to renew', 'error');
            hideLoading();
            return;
        }
        
        // Create new investment
        const newInvestmentData = {
            user_id: currentUser.id,
            plan_id: plan.id,
            plan_name: plan.name,
            amount: investment.amount,
            duration_months: investment.duration_months || plan.duration,
            payment_method: 'wallet',
            status: 'active',
            start_date: new Date().toISOString(),
            expected_end_date: new Date(Date.now() + (investment.duration_months || plan.duration) * 30 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
                renewed_from: investment.id,
                monthly_roi: plan.monthly_roi
            }
        };
        
        const { error } = await supabase
            .from('investments')
            .insert(newInvestmentData);
        
        if (error) throw error;
        
        // Deduct from balance
        await dbService.updateBalance(currentUser.id, investment.amount, 'subtract');
        
        // Create transaction
        await dbService.createTransaction({
            user_id: currentUser.id,
            type: 'investment',
            amount: -investment.amount,
            status: 'completed',
            description: `Renewed investment in ${plan.name}`,
            metadata: {
                renewed_from: investment.id
            }
        });
        
        showToast('Investment renewed successfully', 'success');
        
        // Reload data
        await updateUserStats();
        await loadUserInvestments();
        
    } catch (error) {
        console.error('[Investments] Renew investment error:', error);
        showToast('Renewal failed', 'error');
    } finally {
        hideLoading();
    }
}

// Cancel Investment
async function cancelInvestment(investmentId) {
    try {
        const investment = userInvestments.find(i => i.id === investmentId);
        if (!investment) {
            showToast('Investment not found', 'error');
            return;
        }
        
        if (investment.status !== 'active') {
            showToast('Only active investments can be cancelled', 'error');
            return;
        }
        
        if (!confirm('Cancel this investment? Early cancellation fee may apply.')) {
            return;
        }
        
        showLoading('Cancelling investment...');
        
        // Calculate refund (with penalty)
        const penaltyRate = 0.1; // 10% penalty
        const refundAmount = investment.amount * (1 - penaltyRate);
        
        // Update investment status
        const { error: updateError } = await supabase
            .from('investments')
            .update({ 
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                refund_amount: refundAmount
            })
            .eq('id', investmentId);
        
        if (updateError) throw updateError;
        
        // Refund to user balance
        await dbService.updateBalance(currentUser.id, refundAmount, 'add');
        
        // Create transaction
        await dbService.createTransaction({
            user_id: currentUser.id,
            type: 'refund',
            amount: refundAmount,
            status: 'completed',
            description: `Investment cancellation refund`,
            metadata: {
                investment_id: investmentId,
                original_amount: investment.amount,
                penalty: investment.amount * penaltyRate
            }
        });
        
        showToast(`Investment cancelled. ₹${refundAmount.toLocaleString()} refunded to your wallet.`, 'success');
        
        // Reload data
        await updateUserStats();
        await loadUserInvestments();
        
    } catch (error) {
        console.error('[Investments] Cancel investment error:', error);
        showToast('Cancellation failed', 'error');
    } finally {
        hideLoading();
    }
}

// Calculate Returns (for calculator)
function calculateReturns() {
    const amount = parseFloat(elements.calcAmount.value || 0);
    const duration = parseFloat(elements.calcDuration.value || 0);
    const roi = parseFloat(elements.calcROI.value || 0);
    const compound = elements.calcCompound.value;
    
    // Validate inputs
    if (!amount || !duration || !roi) return;
    
    let totalValue = amount;
    let monthlyReturn = 0;
    
    // Calculate based on compounding frequency
    switch (compound) {
        case 'monthly':
            monthlyReturn = amount * (roi / 100 / 12);
            totalValue = amount * Math.pow(1 + (roi / 100 / 12), duration);
            break;
        case 'quarterly':
            monthlyReturn = amount * (roi / 100 / 12);
            totalValue = amount * Math.pow(1 + (roi / 100 / 4), duration / 3);
            break;
        case 'semi-annual':
            monthlyReturn = amount * (roi / 100 / 12);
            totalValue = amount * Math.pow(1 + (roi / 100 / 2), duration / 6);
            break;
        case 'annual':
            monthlyReturn = amount * (roi / 100 / 12);
            totalValue = amount * Math.pow(1 + (roi / 100), duration / 12);
            break;
        case 'none':
            monthlyReturn = amount * (roi / 100 / 12);
            totalValue = amount + (monthlyReturn * duration);
            break;
    }
    
    const interest = totalValue - amount;
    
    // Update display
    elements.calcPrincipal.textContent = `₹${amount.toLocaleString()}`;
    elements.calcInterest.textContent = `₹${interest.toLocaleString()}`;
    elements.calcTotalDuration.textContent = `${duration} months`;
    elements.calcMonthly.textContent = `₹${monthlyReturn.toLocaleString()}`;
    elements.calcTotal.textContent = `₹${totalValue.toLocaleString()}`;
}

// Reset Calculator
function resetCalculator() {
    elements.calcAmount.value = 10000;
    elements.calcAmountSlider.value = 10000;
    elements.calcDuration.value = 12;
    elements.calcDurationSlider.value = 12;
    elements.calcROI.value = 15;
    elements.calcROISlider.value = 15;
    elements.calcCompound.value = 'quarterly';
    
    calculateReturns();
}

// Invest From Calculator
function investFromCalculator() {
    const amount = elements.calcAmount.value;
    const duration = elements.calcDuration.value;
    const roi = elements.calcROI.value;
    
    // Find a plan that matches the calculator inputs
    const matchingPlan = allPlans.find(plan => 
        Math.abs(plan.annual_roi - roi) < 5 && // ROI within 5%
        plan.min_amount <= amount && // Amount within range
        (plan.max_amount >= amount || !plan.max_amount)
    );
    
    if (matchingPlan) {
        openInvestModal(matchingPlan.id);
    } else {
        showToast('No matching plan found. Adjust your criteria or browse all plans.', 'info');
        switchTab('all-plans');
    }
}

// Initialize Performance Chart
function initializePerformanceChart() {
    const ctx = elements.investmentChart.getContext('2d');
    
    // Destroy existing chart
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Prepare data
    const labels = [];
    const data = [];
    
    // Generate last 30 days labels
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    // Mock data for now - in production, fetch actual investment data
    for (let i = 0; i < 30; i++) {
        data.push(Math.random() * 1000 + 5000); // Random data between 5000-6000
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Portfolio Value',
                data: data,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: false,
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

// Update Performance Chart
function updatePerformanceChart() {
    // In production, this would fetch new data based on time range
    initializePerformanceChart();
}

// Update Comparison Table
function updateComparisonTable() {
    // In production, this would show selected plans for comparison
    // For now, show empty state if no plans selected
    elements.noComparison.style.display = 'block';
    elements.comparisonTable.style.display = 'none';
}

// Open Comparison Selector
function openComparisonSelector() {
    // In production, this would open a modal to select plans for comparison
    showToast('Select plans from All Plans tab to compare', 'info');
    switchTab('all-plans');
}

// Export Investments Data
async function exportInvestmentsData() {
    try {
        showLoading('Preparing export...');
        
        const exportData = {
            user: {
                id: currentUser.id,
                email: currentUser.email
            },
            investments: userInvestments,
            plans: allPlans.filter(plan => 
                userInvestments.some(inv => inv.plan_id === plan.id)
            ),
            export_date: new Date().toISOString(),
            total_invested: userInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
            total_earnings: userInvestments.reduce((sum, inv) => sum + parseFloat(inv.earnings || 0), 0)
        };
        
        // Create JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `uzumaki_investments_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        showToast('Investments data exported successfully', 'success');
        
    } catch (error) {
        console.error('[Investments] Export error:', error);
        showToast('Failed to export data', 'error');
    } finally {
        hideLoading();
    }
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
    // Use utils.showToast if available
    if (window.utils && typeof window.utils.showToast === 'function') {
        window.utils.showToast(message, type);
        return;
    }
    
    // Create toast element
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
        z-index: 10000;
        animation: toastSlideIn 0.3s ease;
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
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function closeAllModals() {
    document.querySelectorAll('.invest-modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions available globally for onclick handlers
window.openInvestModal = openInvestModal;
window.openPlanDetails = openPlanDetails;
window.openWithdrawModal = openWithdrawModal;
window.renewInvestment = renewInvestment;
window.cancelInvestment = cancelInvestment;
window.switchTab = switchTab;

console.log('[Investments] investments.js loaded successfully');
