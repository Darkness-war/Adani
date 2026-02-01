[file name]: dashboard.js
import { supabase } from "../config/supabase.js";

console.log('[dashboard.js] Modern Dashboard loaded');

let currentUser = null;
let currentProfile = null;

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize dashboard
    await initDashboard();
    setupEventListeners();
    setupThemeToggle();
});

async function initDashboard() {
    try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        
        currentUser = user;
        
        // Load user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            console.error('Profile load error:', profileError);
            return;
        }
        
        currentProfile = profile;
        
        // Update UI with user data
        updateUserInfo(user, profile);
        
        // Load all dashboard data
        await Promise.all([
            loadPlans('primary'),
            loadPlans('vip'),
            loadPurchasedPlans(),
            loadRecentActivity(),
            loadNotifications(),
            updateStats()
        ]);
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
    }
}

function updateUserInfo(user, profile) {
    // Update sidebar
    const sidebarId = document.getElementById('sidebarId');
    if (sidebarId) {
        const shortId = user.id.substring(0, 8) + '...';
        sidebarId.innerHTML = `<div class="sidebar-id">ID: ${shortId}</div>`;
    }
    
    const sidebarVIP = document.getElementById('sidebarVIP');
    if (sidebarVIP) {
        sidebarVIP.textContent = profile?.is_vip ? '🌟 VIP Member' : 'Basic Member';
        sidebarVIP.style.background = profile?.is_vip ? 'linear-gradient(135deg, #FFD700, #FFB300)' : '#e0e0e0';
    }
    
    // Update balance displays
    const totalBalance = document.getElementById('totalBalance');
    const availableBalance = document.getElementById('availableBalance');
    const balance = profile?.balance || 0;
    
    if (totalBalance) totalBalance.textContent = `₹${balance.toFixed(2)}`;
    if (availableBalance) availableBalance.textContent = `₹${balance.toFixed(2)}`;
}

async function updateStats() {
    if (!currentUser) return;
    
    try {
        // Get total invested
        const { data: purchases, error: purchaseError } = await supabase
            .from('purchased_plans')
            .select('amount')
            .eq('user_id', currentUser.id);
        
        if (!purchaseError && purchases) {
            const totalInvested = purchases.reduce((sum, purchase) => sum + (purchase.amount || 0), 0);
            const totalInvestedEl = document.getElementById('totalInvested');
            if (totalInvestedEl) totalInvestedEl.textContent = `₹${totalInvested.toFixed(2)}`;
        }
        
        // Get total earnings (from transactions)
        const { data: earnings, error: earningsError } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', currentUser.id)
            .eq('type', 'earning');
        
        if (!earningsError && earnings) {
            const totalEarnings = earnings.reduce((sum, earning) => sum + (earning.amount || 0), 0);
            const totalEarningsEl = document.getElementById('totalEarnings');
            if (totalEarningsEl) totalEarningsEl.textContent = `₹${totalEarnings.toFixed(2)}`;
        }
        
    } catch (error) {
        console.error('Stats update error:', error);
    }
}

async function loadPlans(type) {
    const containerId = type === 'primary' ? 'primaryPlansGrid' : 'vipPlansGrid';
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    try {
        const { data: plans, error } = await supabase
            .from('plans')
            .select('*')
            .eq('type', type)
            .order('price', { ascending: true });
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!plans || plans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox fa-3x"></i>
                    <p>No ${type} plans available</p>
                </div>
            `;
            return;
        }
        
        plans.forEach(plan => {
            const planCard = createPlanCard(plan, type);
            container.appendChild(planCard);
        });
        
    } catch (error) {
        console.error(`Error loading ${type} plans:`, error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <p>Failed to load plans</p>
            </div>
        `;
    }
}

function createPlanCard(plan, type) {
    const card = document.createElement('div');
    card.className = `modern-plan-card ${type === 'vip' ? 'vip' : ''}`;
    
    card.innerHTML = `
        <div class="plan-card-header">
            <h3 class="plan-title">${plan.name}</h3>
            <p class="plan-subtitle">${plan.description || 'High return investment plan'}</p>
        </div>
        <div class="plan-card-body">
            <ul class="plan-features">
                <li><i class="fas fa-percentage"></i> Daily Return: ${plan.daily_return || '5'}%</li>
                <li><i class="fas fa-calendar-alt"></i> Duration: ${plan.duration || '30'} days</li>
                <li><i class="fas fa-shield-alt"></i> Minimum: ₹${plan.min_amount || '500'}</li>
                <li><i class="fas fa-trophy"></i> Maximum: ₹${plan.max_amount || '50000'}</li>
            </ul>
            <div class="plan-price">
                <div class="price-amount">₹${plan.price || '1000'}</div>
                <div class="price-period">One-time investment</div>
            </div>
            <button class="modern-buy-btn ${type === 'vip' ? 'vip' : ''}" data-plan-id="${plan.id}">
                <i class="fas fa-shopping-cart"></i>
                Invest Now
            </button>
        </div>
    `;
    
    // Add click event to buy button
    const buyBtn = card.querySelector('.modern-buy-btn');
    buyBtn.addEventListener('click', () => purchasePlan(plan));
    
    return card;
}

async function purchasePlan(plan) {
    if (!currentUser) {
        alert('Please login to purchase plans');
        return;
    }
    
    const confirmPurchase = confirm(`Confirm investment in ${plan.name} for ₹${plan.price}?`);
    if (!confirmPurchase) return;
    
    try {
        // Check if user has sufficient balance
        if (currentProfile.balance < plan.price) {
            alert('Insufficient balance. Please recharge first.');
            window.location.href = 'recharge.html';
            return;
        }
        
        // Create purchase record
        const { error: purchaseError } = await supabase
            .from('purchased_plans')
            .insert({
                user_id: currentUser.id,
                plan_id: plan.id,
                amount: plan.price,
                status: 'active',
                start_date: new Date().toISOString()
            });
        
        if (purchaseError) throw purchaseError;
        
        // Update user balance
        const newBalance = currentProfile.balance - plan.price;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', currentUser.id);
        
        if (updateError) throw updateError;
        
        // Record transaction
        await supabase
            .from('transactions')
            .insert({
                user_id: currentUser.id,
                type: 'investment',
                amount: plan.price,
                status: 'completed',
                details: `Purchased ${plan.name} plan`
            });
        
        alert('✅ Investment successful! Check your purchased plans.');
        
        // Refresh dashboard data
        updateUserInfo(currentUser, { ...currentProfile, balance: newBalance });
        await loadPurchasedPlans();
        await updateStats();
        
    } catch (error) {
        console.error('Purchase error:', error);
        alert('❌ Purchase failed. Please try again.');
    }
}

async function loadPurchasedPlans() {
    const container = document.getElementById('purchasedPlansGrid');
    if (!container || !currentUser) return;
    
    try {
        const { data: purchases, error } = await supabase
            .from('purchased_plans')
            .select(`
                *,
                plans (*)
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!purchases || purchases.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line fa-3x"></i>
                    <p>No investments yet</p>
                    <a href="#primary" class="invest-now-btn">Start Investing</a>
                </div>
            `;
            return;
        }
        
        purchases.forEach(purchase => {
            const plan = purchase.plans;
            const card = document.createElement('div');
            card.className = 'modern-plan-card purchased';
            
            // Calculate progress
            const startDate = new Date(purchase.start_date);
            const now = new Date();
            const duration = plan.duration || 30;
            const daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
            const progress = Math.min((daysPassed / duration) * 100, 100);
            
            card.innerHTML = `
                <div class="plan-card-header" style="background: linear-gradient(90deg, #10b981, #059669);">
                    <h3 class="plan-title">${plan.name}</h3>
                    <p class="plan-subtitle">Invested: ₹${purchase.amount}</p>
                </div>
                <div class="plan-card-body">
                    <div class="investment-details">
                        <div class="detail-row">
                            <span>Status:</span>
                            <span class="status-badge ${purchase.status}">${purchase.status}</span>
                        </div>
                        <div class="detail-row">
                            <span>Start Date:</span>
                            <span>${startDate.toLocaleDateString()}</span>
                        </div>
                        <div class="detail-row">
                            <span>Duration:</span>
                            <span>${duration} days</span>
                        </div>
                        <div class="detail-row">
                            <span>Progress:</span>
                            <span>${daysPassed}/${duration} days</span>
                        </div>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                    <div class="estimated-earnings">
                        <small>Estimated Return: ₹${(purchase.amount * (1 + (plan.daily_return || 5) / 100 * duration)).toFixed(2)}</small>
                    </div>
                </div>
            `;
            
            container.appendChild(card);
        });
        
    } catch (error) {
        console.error('Error loading purchased plans:', error);
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container || !currentUser) return;
    
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) throw error;
        
        container.innerHTML = '';
        
        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-activity">
                    <i class="fas fa-history"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }
        
        transactions.forEach(trans => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            
            const icon = trans.type === 'deposit' ? 'fa-arrow-down' : 
                        trans.type === 'withdrawal' ? 'fa-arrow-up' :
                        trans.type === 'earning' ? 'fa-coins' : 'fa-exchange-alt';
            
            const color = trans.type === 'deposit' ? '#10b981' :
                         trans.type === 'withdrawal' ? '#ef4444' :
                         trans.type === 'earning' ? '#f59e0b' : '#6366f1';
            
            item.innerHTML = `
                <div class="activity-icon" style="background: ${color}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${trans.type.charAt(0).toUpperCase() + trans.type.slice(1)}</div>
                    <div class="activity-desc">${trans.details || ''}</div>
                    <div class="activity-time">${new Date(trans.created_at).toLocaleString()}</div>
                </div>
                <div class="activity-amount ${trans.type === 'withdrawal' ? 'negative' : 'positive'}">
                    ${trans.type === 'withdrawal' ? '-' : '+'}₹${trans.amount.toFixed(2)}
                </div>
            `;
            
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

async function loadNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container || !currentUser) return;
    
    try {
        // You can implement actual notifications from your database
        const notifications = [
            { id: 1, title: 'Welcome Bonus', message: 'You received a ₹100 welcome bonus!', time: '2 hours ago', read: false },
            { id: 2, title: 'Investment Matured', message: 'Your "Gold Plan" investment has matured. ₹1500 credited.', time: '1 day ago', read: false },
            { id: 3, title: 'New VIP Plan', message: 'Exclusive VIP plans now available with 12% daily returns!', time: '2 days ago', read: true }
        ];
        
        container.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}">
                <div class="notification-icon">
                    <i class="fas fa-bell${notif.read ? '' : '-slash'}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${notif.time}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.dashboard-tabs .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.dashboard-tabs .tab-button').forEach(btn => 
                btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.tab-content').forEach(content => 
                content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Notifications modal
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsModal = document.getElementById('notificationsModal');
    const closeNotifications = document.getElementById('closeNotifications');
    
    if (notificationsBtn && notificationsModal) {
        notificationsBtn.addEventListener('click', () => {
            notificationsModal.style.display = 'block';
            document.body.classList.add('modal-open');
        });
        
        closeNotifications.addEventListener('click', () => {
            notificationsModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        });
        
        notificationsModal.addEventListener('click', (e) => {
            if (e.target === notificationsModal) {
                notificationsModal.style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        });
    }
    
    // View all activity
    const viewAllActivity = document.getElementById('viewAllActivity');
    if (viewAllActivity) {
        viewAllActivity.addEventListener('click', () => {
            window.location.href = 'transactions.html';
        });
    }
    
    // Theme toggle (stored in localStorage)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        themeToggle.addEventListener('click', () => {
            if (document.body.classList.contains('dark-theme')) {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            } else {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        });
    }
}

function setupThemeToggle() {
    // Add dark theme styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .dark-theme {
            --modern-primary: #8b5cf6;
            --modern-secondary: #7c3aed;
            --modern-accent: #a78bfa;
            --modern-light: #1e293b;
            --modern-dark: #f1f5f9;
            --modern-card-bg: rgba(30, 41, 59, 0.8);
            --modern-border: rgba(100, 116, 139, 0.3);
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f1f5f9;
        }
        
        .dark-theme .welcome-banner {
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }
        
        .dark-theme .stat-card {
            background: rgba(30, 41, 59, 0.9);
        }
        
        .dark-theme .activity-feed {
            background: rgba(30, 41, 59, 0.9);
        }
        
        .dark-theme .modern-plan-card {
            background: rgba(30, 41, 59, 0.9);
        }
        
        .dark-theme .bottom-nav {
            background: rgba(30, 41, 59, 0.9);
        }
    `;
    document.head.appendChild(style);
}

// Auto-refresh data every 30 seconds
setInterval(() => {
    if (currentUser) {
        updateStats();
        loadRecentActivity();
    }
}, 30000);

// Export for ot
