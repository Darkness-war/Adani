import { useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import { supabase } from '../lib/supabase';

function Refer() {
  useEffect(() => {
    loadReferralInfo();
    setupEventListeners();
    
    async function loadReferralInfo() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get user's referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, balance')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        const referralLink = `${window.location.origin}/register?ref=${profile.referral_code}`;
        document.getElementById('referralLinkText').textContent = referralLink;
        
        // Load referral earnings
        const { data: referrals } = await supabase
          .from('profiles')
          .select('*')
          .eq('referred_by', user.id);
        
        const allFriendsList = document.getElementById('allFriendList');
        const joinedFriendsList = document.getElementById('joinedFriendList');
        
        if (allFriendsList && referrals) {
          allFriendsList.innerHTML = referrals.map(friend => `
            <div class="friend-item">
              <div class="friend-avatar">👤</div>
              <div class="friend-info">
                <div class="friend-name">${friend.name || friend.email}</div>
                <div class="friend-status">Joined on ${new Date(friend.created_at).toLocaleDateString()}</div>
              </div>
              <div class="friend-earnings">₹0.00</div>
            </div>
          `).join('') || '<div class="empty-state">No friends referred yet</div>';
        }
        
        if (joinedFriendsList && referrals) {
          joinedFriendsList.innerHTML = referrals.map(friend => `
            <div class="friend-item">
              <div class="friend-avatar">👤</div>
              <div class="friend-info">
                <div class="friend-name">${friend.name || friend.email}</div>
                <div class="friend-status">Active user</div>
              </div>
              <div class="friend-earnings">₹0.00</div>
            </div>
          `).join('') || '<div class="empty-state">No active referrals</div>';
        }
      }
    }
    
    function setupEventListeners() {
      // Copy referral link
      document.getElementById('copyReferralBtn')?.addEventListener('click', () => {
        const link = document.getElementById('referralLinkText').textContent;
        navigator.clipboard.writeText(link).then(() => {
          showToast('Link copied to clipboard!');
        });
      });
      
      // Tab switching
      document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          const tabId = e.target.dataset.tab;
          
          document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          document.getElementById(tabId).classList.add('active');
        });
      });
      
      // Friends sub-tabs
      document.querySelectorAll('.friends-sub-tab-button').forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          const tabId = e.target.dataset.friendTab;
          
          document.querySelectorAll('.friends-sub-tab-button').forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
          document.querySelectorAll('.friends-tab-content').forEach(c => c.classList.remove('active'));
          document.getElementById(tabId).classList.add('active');
        });
      });
      
      // Redeem button
      document.getElementById('redeemRewardBtn')?.addEventListener('click', async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Check if user has enough referral earnings
        const { data: profile } = await supabase
          .from('profiles')
          .select('referral_earnings')
          .eq('id', user.id)
          .single();
        
        if (!profile || profile.referral_earnings < 100) {
          alert('Minimum ₹100 required to redeem referral earnings');
          return;
        }
        
        // Create withdrawal request for referral earnings
        const { error } = await supabase
          .from('withdrawal_requests')
          .insert({
            user_id: user.id,
            user_email: user.email,
            amount: profile.referral_earnings,
            type: 'referral',
            status: 'pending'
          });
        
        if (error) {
          alert('Error creating withdrawal request: ' + error.message);
        } else {
          alert('Withdrawal request submitted for ₹' + profile.referral_earnings);
        }
      });
    }
    
    function showToast(message) {
      const toast = document.getElementById('toastNotification');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  }, []);
  
  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="Refer & Earn" />
      
      <main>
        <div className="refer-page-container">
          <div className="tabs refer-main-tabs">
            <a href="#" className="tab-button active" data-tab="invite">Invite</a>
            <a href="#" className="tab-button" data-tab="earnings">My Earnings</a>
          </div>
          
          <section id="earnings" className="tab-content">
            <div className="card earnings-card">
              <div className="earnings-grid">
                <div className="earnings-item">
                  <div className="earnings-label">Total Reward</div>
                  <div className="earnings-amount">₹0.00</div>
                </div>
                <div className="earnings-item">
                  <div className="earnings-label">Available to Redeem</div>
                  <div className="earnings-amount">₹0.00</div>
                </div>
                <div className="earnings-item">
                  <div className="earnings-label">Locked Reward</div>
                  <div className="earnings-amount">₹0.00</div>
                </div>
              </div>
              <div className="divider"></div>
              <button id="redeemRewardBtn" className="redeem-btn">Redeem Reward</button>
            </div>
          </section>
          
          <section id="invite" className="tab-content active">
            <div className="card invite-header-card">
              <h3>Invite Friends, Earn Rewards!</h3>
              <div className="referral-link-box">
                <span id="referralLinkText">Loading link...</span>
                <button id="copyReferralBtn" className="copy-btn-inset">Copy</button>
              </div>
              <div className="commission-list">
                <div className="commission-item">
                  <div className="commission-info">
                    <div className="level-badge">Level 1</div>
                    <div className="level-percent">16%</div>
                  </div>
                </div>
                <div className="commission-item">
                  <div className="commission-info">
                    <div className="level-badge">Level 2</div>
                    <div className="level-percent">2%</div>
                  </div>
                </div>
                <div className="commission-item">
                  <div className="commission-info">
                    <div className="level-badge">Level 3</div>
                    <div className="level-percent">1%</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          <div className="card friends-card">
            <h3>Friends</h3>
            <div className="search-input-wrapper">
              <i className="fas fa-search"></i>
              <input type="text" id="searchFriends" placeholder="Search friends by name" />
            </div>
            
            <div className="friends-sub-tabs">
              <a href="#" className="friends-sub-tab-button active" data-friend-tab="all">All</a>
              <a href="#" className="friends-sub-tab-button" data-friend-tab="joined">Joined</a>
            </div>
            
            <div id="all" className="friends-tab-content active">
              <div className="friend-list scrollable-friend-list" id="allFriendList">
                <div className="loading-state">Loading...</div>
              </div>
            </div>
            
            <div id="joined" className="friends-tab-content">
              <div className="friend-list scrollable-friend-list" id="joinedFriendList">
                <div className="loading-state">Loading...</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="refer" />
      
      <div id="toastNotification" className="toast"></div>
    </>
  );
}

export default Refer;
