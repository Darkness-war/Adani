import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';

function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('primary');
  const [primaryPlans, setPrimaryPlans] = useState([]);
  const [vipPlans, setVipPlans] = useState([]);
  const [purchasedPlans, setPurchasedPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. Fix: Redirect if not logged in
      if (!session) {
        navigate('/login');
        return;
      }

      // 2. Load Plans
      const { data: plans, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('min_amount', { ascending: true });

      if (plans) {
        setPrimaryPlans(plans.filter(p => !p.is_vip));
        setVipPlans(plans.filter(p => p.is_vip));
      }

      // 3. Load Purchased Plans
      const { data: investments } = await supabase
        .from('user_investments')
        .select('*, plans(*)')
        .eq('user_id', session.user.id);
      
      if (investments) {
        setPurchasedPlans(investments);
      }

    } catch (error) {
      console.error("Error loading home:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleBuyPlan = async (plan) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');

    if (window.confirm(`Confirm purchase of ${plan.name} for ₹${plan.min_amount}?`)) {
      
      // Check Balance first (Optional but recommended)
      const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
      
      if (profile.balance < plan.min_amount) {
        alert("Insufficient balance! Please recharge.");
        navigate('/recharge'); // Assuming you have a recharge route
        return;
      }

      const { error } = await supabase
        .from('user_investments')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          amount: plan.min_amount,
          status: 'active',
          daily_income: (plan.min_amount * plan.daily_return) / 100
        });

      if (!error) {
        // Deduct balance
        await supabase.from('profiles').update({ 
          balance: profile.balance - plan.min_amount 
        }).eq('id', user.id);

        alert('Plan purchased successfully!');
        checkAuthAndLoad(); // Refresh data
        setActiveTab('purchased');
      } else {
        alert('Error purchasing plan: ' + error.message);
      }
    }
  };

  const PlanCard = ({ plan }) => (
    <div className="plan-card">
      <div className="plan-header">
        <div className="plan-title">
          {plan.name} {plan.is_vip && <span className="vip-badge">VIP</span>}
        </div>
        <div className="plan-price">₹{plan.min_amount}</div>
      </div>
      <div className="plan-details">
        <div><strong>Daily Return</strong>{plan.daily_return}%</div>
        <div><strong>Duration</strong>{plan.duration} Days</div>
        <div><strong>Total Return</strong>{plan.total_return}%</div>
      </div>
      <button className="buy-plan-btn" onClick={() => handleBuyPlan(plan)}>Buy Now</button>
    </div>
  );

  const PurchasedCard = ({ investment }) => (
    <div className="plan-card">
      <div className="plan-header">
        <div className="plan-title">{investment.plans?.name}</div>
        <div className="plan-price" style={{color: '#4caf50'}}>Active</div>
      </div>
      <div className="plan-details">
        <div><strong>Invested</strong>₹{investment.amount}</div>
        <div><strong>Daily</strong>₹{investment.plans?.daily_return}%</div>
        <div><strong>Date</strong>{new Date(investment.created_at).toLocaleDateString()}</div>
      </div>
    </div>
  );

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <>
      <div 
        id="sidebarOverlay" 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      
      {/* Pass state to Sidebar if needed, or handle sidebar logic internally in Sidebar component */}
      <Sidebar isOpen={sidebarOpen} close={() => setSidebarOpen(false)} />
      
      <TopBar title="Adani Corp" onMenuClick={() => setSidebarOpen(true)} />
      
      <main>
        <img src="/assets/img/banner.jpg" alt="Banner" className="banner-img" />
        
        <nav className="tabs">
          <button 
            className={`tab-button ${activeTab === 'primary' ? 'active' : ''}`} 
            onClick={() => setActiveTab('primary')}
          >
            Primary
          </button>
          <button 
            className={`tab-button ${activeTab === 'vip' ? 'active' : ''}`} 
            onClick={() => setActiveTab('vip')}
          >
            VIP
          </button>
          <button 
            className={`tab-button ${activeTab === 'purchased' ? 'active' : ''}`} 
            onClick={() => setActiveTab('purchased')}
          >
            Purchased
          </button>
        </nav>
        
        <section className={`tab-content ${activeTab === 'primary' ? 'active' : ''}`}>
          {primaryPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
        </section>

        <section className={`tab-content ${activeTab === 'vip' ? 'active' : ''}`}>
          {vipPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
        </section>

        <section className={`tab-content ${activeTab === 'purchased' ? 'active' : ''}`}>
          {purchasedPlans.length > 0 ? (
            purchasedPlans.map(inv => <PurchasedCard key={inv.id} investment={inv} />)
          ) : (
            <div className="empty-state">No plans purchased yet.</div>
          )}
        </section>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="home" />
    </>
  );
}

export default Home;
      
