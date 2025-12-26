import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';

function Home() {
  const [activeTab, setActiveTab] = useState('primary');
  const [primaryPlans, setPrimaryPlans] = useState([]);
  const [vipPlans, setVipPlans] = useState([]);
  const [purchasedPlans, setPurchasedPlans] = useState([]);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadPlans();
    loadUserInvestments();

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        setActiveTab(tab);
        tabButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Only redirect if trying to access purchased tab
      if (window.location.hash.includes('purchased')) {
        navigate('/login');
      }
      return;
    }
    setUser(session.user);
    loadUserBalance(session.user.id);
  };

  const loadUserBalance = async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();
    if (data) setBalance(data.balance);
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('min_amount', { ascending: true });
      
      if (error) throw error;
      
      const primary = data.filter(p => !p.is_vip);
      const vip = data.filter(p => p.is_vip);
      
      setPrimaryPlans(primary);
      setVipPlans(vip);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const loadUserInvestments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_investments')
        .select(`
          *,
          plans (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      if (error) throw error;
      setPurchasedPlans(data || []);
    } catch (error) {
      console.error('Error loading investments:', error);
    }
  };

  const buyPlan = async (plan) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert('Please login to purchase a plan');
      navigate('/login');
      return;
    }
    
    if (balance < plan.min_amount) {
      alert(`Insufficient balance. You need ₹${plan.min_amount}. Available: ₹${balance}`);
      return;
    }
    
    if (confirm(`Confirm purchase of ${plan.name} for ₹${plan.min_amount}?`)) {
      try {
        // Start transaction
        const { error: investError } = await supabase
          .from('user_investments')
          .insert({
            user_id: user.id,
            plan_id: plan.id,
            amount: plan.min_amount,
            daily_return: plan.daily_return,
            total_days: plan.duration,
            remaining_days: plan.duration,
            status: 'active'
          });
        
        if (investError) throw investError;
        
        // Deduct balance
        const { error: balanceError } = await supabase
          .from('users')
          .update({ balance: balance - plan.min_amount })
          .eq('id', user.id);
        
        if (balanceError) throw balanceError;
        
        // Add transaction record
        await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: -plan.min_amount,
            type: 'plan_purchase',
            description: `Purchased ${plan.name} plan`,
            status: 'completed'
          });
        
        alert('Plan purchased successfully!');
        setBalance(balance - plan.min_amount);
        loadUserInvestments();
      } catch (error) {
        console.error('Purchase error:', error);
        alert('Failed to purchase plan: ' + error.message);
      }
    }
  };

  const renderPlanCard = (plan, isPurchased = false) => (
    <div key={plan.id} className={`plan-card ${plan.is_vip ? 'vip' : ''}`}>
      <div className="plan-card-header">
        <h3>{plan.name} {plan.is_vip && <span className="vip-badge">VIP</span>}</h3>
        <div className="plan-price">₹{plan.min_amount}</div>
      </div>
      <div className="plan-card-body">
        <div className="plan-detail">
          <div className="plan-label">Daily Return</div>
          <div className="plan-value">{plan.daily_return}%</div>
        </div>
        <div className="plan-detail">
          <div className="plan-label">Duration</div>
          <div className="plan-value">{plan.duration} Days</div>
        </div>
        <div className="plan-detail">
          <div className="plan-label">Total Return</div>
          <div className="plan-value">{plan.total_return}%</div>
        </div>
        <div className="plan-detail">
          <div className="plan-label">Min. Amount</div>
          <div className="plan-value">₹{plan.min_amount}</div>
        </div>
      </div>
      <div className="plan-card-footer">
        {!isPurchased ? (
          <button 
            className="buy-button" 
            onClick={() => buyPlan(plan)}
            disabled={user && balance < plan.min_amount}
          >
            {user ? (balance < plan.min_amount ? 'Insufficient Balance' : 'Buy Now') : 'Login to Buy'}
          </button>
        ) : (
          <div className="plan-progress">
            <div className="progress-label">
              <span>Progress</span>
              <span>{plan.remaining_days}/{plan.total_days} days</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${((plan.total_days - plan.remaining_days) / plan.total_days) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="Uzumaki" />
      
      <main>
        <img src="/assets/img/banner.jpg" alt="Uzumaki banner" className="banner-img" />
        <nav className="tabs">
          <button 
            className={`tab-button ${activeTab === 'primary' ? 'active' : ''}`} 
            data-tab="primary"
            onClick={() => setActiveTab('primary')}
          >
            Primary
          </button>
          <button 
            className={`tab-button ${activeTab === 'vip' ? 'active' : ''}`} 
            data-tab="vip"
            onClick={() => setActiveTab('vip')}
          >
            VIP
          </button>
          <button 
            className={`tab-button ${activeTab === 'purchased' ? 'active' : ''}`} 
            data-tab="purchased"
            onClick={() => {
              if (!user) {
                alert('Please login to view purchased plans');
                navigate('/login');
              } else {
                setActiveTab('purchased');
              }
            }}
          >
            Purchased
          </button>
        </nav>
        
        <section id="primary" className={`tab-content ${activeTab === 'primary' ? 'active' : ''}`}>
          {primaryPlans.length === 0 ? (
            <p className="no-plans">No primary plans available</p>
          ) : (
            primaryPlans.map(plan => renderPlanCard(plan))
          )}
        </section>
        
        <section id="vip" className={`tab-content ${activeTab === 'vip' ? 'active' : ''}`}>
          {vipPlans.length === 0 ? (
            <p className="no-plans">No VIP plans available</p>
          ) : (
            vipPlans.map(plan => renderPlanCard(plan))
          )}
        </section>
        
        <section id="purchased" className={`tab-content ${activeTab === 'purchased' ? 'active' : ''}`}>
          {!user ? (
            <div className="login-prompt">
              <p>Please login to view your purchased plans</p>
              <button onClick={() => navigate('/login')} className="submit-btn">Login</button>
            </div>
          ) : purchasedPlans.length === 0 ? (
            <p className="no-plans">You haven't purchased any plans yet</p>
          ) : (
            purchasedPlans.map(investment => (
              <div key={investment.id} className="purchased-plan-card">
                <div className="plan-card-header">
                  <h3>{investment.plans?.name} {investment.plans?.is_vip && <span className="vip-badge">VIP</span>}</h3>
                  <div className="plan-status active">Active</div>
                </div>
                <div className="plan-card-body">
                  <div className="plan-detail">
                    <div className="plan-label">Invested Amount</div>
                    <div className="plan-value">₹{investment.amount}</div>
                  </div>
                  <div className="plan-detail">
                    <div className="plan-label">Daily Return</div>
                    <div className="plan-value">{investment.daily_return}%</div>
                  </div>
                  <div className="plan-detail">
                    <div className="plan-label">Days Left</div>
                    <div className="plan-value">{investment.remaining_days}/{investment.total_days}</div>
                  </div>
                  <div className="plan-detail">
                    <div className="plan-label">Total Return</div>
                    <div className="plan-value">₹{(investment.amount * (investment.plans?.total_return || 0) / 100).toFixed(2)}</div>
                  </div>
                </div>
                <div className="plan-progress">
                  <div className="progress-label">
                    <span>Progress</span>
                    <span>{investment.total_days - investment.remaining_days}/{investment.total_days} days</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${((investment.total_days - investment.remaining_days) / investment.total_days) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="home" />
    </>
  );
}

export default Home;
