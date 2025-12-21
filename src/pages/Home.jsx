import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';

function Home() {
  const [activeTab, setActiveTab] = useState('primary');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    // Copy original JavaScript logic exactly
    loadPlans();
    setupEventListeners();
    
    // Original functions from script.js
    async function loadPlans() {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error loading plans:', error);
        return;
      }
      
      const primaryPlans = data.filter(p => !p.is_vip);
      const vipPlans = data.filter(p => p.is_vip);
      
      // Populate tabs exactly as original
      document.getElementById('primary').innerHTML = renderPlans(primaryPlans);
      document.getElementById('vip').innerHTML = renderPlans(vipPlans);
    }
    
    function renderPlans(plans) {
      return plans.map(plan => `
        <div class="plan-card" data-plan-id="${plan.id}">
          <div class="plan-header">
            <div class="plan-title">${plan.name} ${plan.is_vip ? '<span class="vip-badge">VIP</span>' : ''}</div>
            <div class="plan-price">₹${plan.min_amount}</div>
          </div>
          <div class="plan-details">
            <div><strong>Daily Return</strong>${plan.daily_return}%</div>
            <div><strong>Duration</strong>${plan.duration} Days</div>
            <div><strong>Total Return</strong>${plan.total_return}%</div>
          </div>
          <button class="buy-plan-btn" onclick="buyPlan('${plan.id}')">Buy Now</button>
        </div>
      `).join('');
    }
    
    function setupEventListeners() {
      // Tab switching (original logic)
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tab = e.target.dataset.tab;
          setActiveTab(tab);
          
          // Original DOM manipulation
          document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          document.getElementById(tab).classList.add('active');
        });
      });
      
      // Sidebar toggle
      document.getElementById('menuBtn')?.addEventListener('click', toggleSidebar);
      document.getElementById('closeBtn')?.addEventListener('click', closeSidebar);
      document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
    }
    
    // Global functions for inline onclick handlers
    window.buyPlan = async (planId) => {
      const user = await getCurrentUser();
      if (!user) return;
      
      const { data: plan } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (confirm(`Confirm purchase of ${plan.name} for ₹${plan.min_amount}?`)) {
        // Original purchase logic
        const { error } = await supabase
          .from('user_investments')
          .insert({
            user_id: user.id,
            plan_id: planId,
            amount: plan.min_amount,
            status: 'active'
          });
        
        if (!error) {
          alert('Plan purchased successfully!');
          window.location.reload();
        }
      }
    };
    
    function toggleSidebar() {
      document.getElementById('sideMenu').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('active');
    }
    
    function closeSidebar() {
      document.getElementById('sideMenu').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('active');
    }
    
    // Load user details for sidebar
    async function loadUserDetails() {
      const user = await getCurrentUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance, vip_level')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          document.getElementById('sidebarId').textContent = `ID: ${user.id.slice(0, 8)}`;
          document.getElementById('sidebarVIP').textContent = profile.vip_level ? `VIP ${profile.vip_level}` : 'Standard';
        }
      }
    }
    
    loadUserDetails();
    
    return () => {
      // Cleanup
      document.removeEventListener('DOMContentLoaded', loadPlans);
    };
  }, []);

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
          >
            Primary
          </button>
          <button 
            className={`tab-button ${activeTab === 'vip' ? 'active' : ''}`} 
            data-tab="vip"
          >
            VIP
          </button>
          <button 
            className={`tab-button ${activeTab === 'purchased' ? 'active' : ''}`} 
            data-tab="purchased"
          >
            Purchased
          </button>
        </nav>
        
        <section id="primary" className={`tab-content ${activeTab === 'primary' ? 'active' : ''}`}></section>
        <section id="vip" className={`tab-content ${activeTab === 'vip' ? 'active' : ''}`}></section>
        <section id="purchased" className={`tab-content ${activeTab === 'purchased' ? 'active' : ''}`}></section>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="home" />
    </>
  );
}

export default Home;
