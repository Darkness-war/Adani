// script.js – Home page, Supabase version
import { supabase } from './supabase.js';
import { appAuth } from './common.js';

console.log('[script.js] loaded');

function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      tabContents.forEach(content => {
        if (content.id === tab) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });
}

function showToast(message) {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast-message';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function loadInvestmentPlans() {
  const primaryContainer = document.getElementById('primary');
  const vipContainer = document.getElementById('vip');

  if (!primaryContainer || !vipContainer) return;

  primaryContainer.innerHTML = '<p>Loading plans...</p>';
  vipContainer.innerHTML = '<p>Loading VIP plans...</p>';

  const { data: plans, error } = await supabase
    .from('investment_plans')
    .select('*')
    .eq('is_active', true)
    .order('min_amount', { ascending: true });

  if (error) {
    console.error('Error loading plans', error);
    primaryContainer.innerHTML = '<p>Error loading plans.</p>';
    vipContainer.innerHTML = '<p>Error loading plans.</p>';
    return;
  }

  primaryContainer.innerHTML = '';
  vipContainer.innerHTML = '';

  let primaryPlansExist = false;
  let vipPlansExist = false;

  plans.forEach(plan => {
    const planId = plan.id;

    const dailyIncome = (plan.min_amount * plan.daily_return_percent) / 100;
    const totalIncome = (plan.min_amount * plan.total_return_percent) / 100;

    const planCardHTML = `
      <div class="plan-card ${plan.is_vip ? 'vip' : ''}" data-plan-id="${planId}">
        <div class="plan-card-header">
          <h3>${plan.name}</h3>
          ${plan.is_vip ? '<span class="vip-badge">VIP</span>' : ''}
        </div>
        <div class="plan-card-body">
          <div class="plan-detail">
            <span class="plan-label">Investment Price</span>
            <span class="plan-value">₹${plan.min_amount.toLocaleString()}</span>
          </div>
          <div class="plan-detail">
            <span class="plan-label">Daily Income</span>
            <span class="plan-value">₹${dailyIncome.toFixed(2)}</span>
          </div>
          <div class="plan-detail">
            <span class="plan-label">Cycle</span>
            <span class="plan-value">${plan.duration_days} Days</span>
          </div>
          <div class="plan-detail">
            <span class="plan-label">Total Income</span>
            <span class="plan-value">₹${totalIncome.toLocaleString()}</span>
          </div>
        </div>
        <div class="plan-card-footer">
          <button class="buy-button">Buy Now</button>
        </div>
      </div>
    `;

    if (plan.is_vip) {
      vipContainer.innerHTML += planCardHTML;
      vipPlansExist = true;
    } else {
      primaryContainer.innerHTML += planCardHTML;
      primaryPlansExist = true;
    }
  });

  if (!primaryPlansExist) {
    primaryContainer.innerHTML = '<p>No primary plans are available right now.</p>';
  }
  if (!vipPlansExist) {
    vipContainer.innerHTML = '<p>No VIP plans are available right now.</p>';
  }
}

async function loadPurchasedPlans(userId) {
  const purchasedContainer = document.getElementById('purchased');
  if (!purchasedContainer) return;

  purchasedContainer.innerHTML = '<p>Loading purchased plans...</p>';

  const { data: investments, error } = await supabase
    .from('user_investments')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error loading purchased plans', error);
    purchasedContainer.innerHTML = '<p>Error loading purchased plans.</p>';
    return;
  }

  if (!investments || investments.length === 0) {
    purchasedContainer.innerHTML = '<p>You have not purchased any plans yet.</p>';
    return;
  }

  purchasedContainer.innerHTML = '';
  const now = new Date();

  investments.forEach(investment => {
    const startDate = new Date(investment.start_date);
    const totalDays = investment.total_days || 0;

    const daysPassed = Math.min(
      totalDays,
      Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)))
    );
    const daysRemaining = totalDays - daysPassed;

    const progressPercent = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;

    const status = investment.status || (daysPassed >= totalDays ? 'Completed' : 'Running');
    const statusColor = status.toLowerCase() === 'completed' ? '#22c55e' : '#0ea5e9';

    const dailyIncome = investment.daily_income || 0;
    const totalEarned = investment.total_earned || (daysPassed * dailyIncome);

    const planCardHTML = `
      <div class="purchased-plan-card">
        <div class="plan-card-header">
          <h3>${investment.plan_name} ${investment.is_vip ? '<span class="vip-badge">VIP</span>' : ''}</h3>
          <span class="plan-status" style="color:${statusColor};">● ${status}</span>
        </div>
        <div class="plan-card-body">
          <div class="plan-detail">
            <span class="plan-label">Daily Income</span>
            <span class="plan-value">₹${dailyIncome.toFixed(2)}</span>
          </div>
          <div class="plan-detail">
            <span class="plan-label">Total Earned</span>
            <span class="plan-value">₹${totalEarned.toFixed(2)}</span>
          </div>
        </div>
        <div class="plan-progress">
          <div class="progress-label">
            <span>Progress: ${daysPassed} / ${totalDays} Days</span>
            <span>(${daysRemaining} days left)</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>
      </div>
    `;

    purchasedContainer.innerHTML += planCardHTML;
  });
}

async function buyPlan(planId, userId) {
  try {
    // 1. Fetch plan
    const { data: plan, error: planError } = await supabase
      .from('investment_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('Plan fetch error', planError);
      alert('Plan not found. Please refresh and try again.');
      return;
    }

    // 2. Fetch user profile (balance)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error', profileError);
      alert('Unable to load your balance. Please try again.');
      return;
    }

    const cost = plan.min_amount;
    if (profile.balance < cost) {
      alert('Insufficient balance. Please recharge first.');
      return;
    }

    const dailyIncome = (plan.min_amount * plan.daily_return_percent) / 100;
    const now = new Date();
    const nextPayout = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 3. Start transaction - deduct balance and create investment
    const { data: investment, error: investmentError } = await supabase
      .from('user_investments')
      .insert({
        user_id: userId,
        plan_id: planId,
        plan_name: plan.name,
        is_vip: plan.is_vip,
        start_date: now.toISOString(),
        next_payout: nextPayout.toISOString(),
        total_days: plan.duration_days,
        completed_days: 0,
        daily_income: dailyIncome,
        total_earned: 0,
        status: 'running',
        amount_invested: cost
      })
      .select()
      .single();

    if (investmentError) {
      console.error('Investment create error', investmentError);
      alert('Failed to create investment. Please contact support.');
      return;
    }

    // 4. Deduct balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance: profile.balance - cost })
      .eq('id', userId);

    if (updateError) {
      console.error('Balance update failed', updateError);
      // Try to rollback investment
      await supabase.from('user_investments').delete().eq('id', investment.id);
      alert('Failed to update balance. Please try again.');
      return;
    }

    // 5. Create transaction record
    await supabase.from('transactions').insert({
      user_id: userId,
      user_email: appAuth.user?.email || '',
      type: 'Investment Purchase',
      amount: -cost,
      details: `Purchased ${plan.name} plan`,
      reference_id: investment.id
    });

    showToast('Plan purchased successfully!');
    // Reload purchased plans and balance
    await loadPurchasedPlans(userId);
    // Refresh user profile
    const { data: freshUser } = await supabase.auth.getUser();
    if (freshUser.user) {
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', freshUser.user.id)
        .single();
      if (freshProfile) {
        appAuth.set(freshUser.user, freshProfile);
      }
    }
  } catch (err) {
    console.error('Unexpected buyPlan error', err);
    alert('Failed to purchase plan. Please try again.');
  }
}

function initializeApp(user) {
  setupTabs();
  loadInvestmentPlans();
  loadPurchasedPlans(user.id);

  const mainElement = document.querySelector('main');
  if (!mainElement) return;

  mainElement.addEventListener('click', (e) => {
    const target = e.target;
    if (target && target.classList.contains('buy-button')) {
      const planCard = target.closest('.plan-card');
      const planId = planCard?.dataset.planId;
      if (planId) {
        buyPlan(planId, user.id);
      }
    }
  });
}

// Wait for appAuth to be ready
document.addEventListener('DOMContentLoaded', () => {
  appAuth.onReady((user) => {
    if (!user) return;
    initializeApp(user);
  });
});
