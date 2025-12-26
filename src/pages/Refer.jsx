import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import { supabase } from '../lib/supabase';

function Refer() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('invite');
  const [friendTab, setFriendTab] = useState('all');
  const [profile, setProfile] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadReferralData();
  }, []);

  async function loadReferralData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    // 1. Get Profile for Code & Earnings
    const { data: profileData } = await supabase
      .from('profiles')
      .select('referral_code, referral_earnings')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);

    // 2. Get Referrals (Level 1)
    // Note: For deep levels (L2, L3), you typically need a Recursive SQL function or backend logic.
    // This frontend implementation fetches direct Level 1 referrals.
    const { data: referralData } = await supabase
      .from('profiles')
      .select('*')
      .eq('referred_by', user.id)
      .order('created_at', { ascending: false });
    
    if (referralData) {
      setReferrals(referralData);
    }
    setLoading(false);
  }

  const copyLink = () => {
    if (!profile?.referral_code) return;
    const link = `${window.location.origin}/register?ref=${profile.referral_code}`;
    navigator.clipboard.writeText(link).then(() => {
      setToast('Link copied to clipboard!');
      setTimeout(() => setToast(''), 3000);
    });
  };

  const handleRedeem = async () => {
    if (!profile || profile.referral_earnings < 100) {
      alert('Minimum ₹100 required to redeem referral earnings');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        user_email: user.email,
        amount: profile.referral_earnings,
        type: 'referral_bonus', // Distinct from wallet withdraw
        status: 'pending'
      });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Redemption request submitted!');
      // Reset local display (optional, usually wait for backend)
    }
  };

  // Filter for "Joined" friends (assuming 'vip_level > 0' or 'balance > 0' implies they recharged)
  const activeReferrals = referrals.filter(f => f.vip_level > 0 || f.balance > 0);

  return (
    <>
      <Sidebar />
      <TopBar title="Refer & Earn" />
      
      <main>
        <div className="refer-page-container">
          <div className="tabs refer-main-tabs">
            <button 
              className={`tab-button ${activeTab === 'invite' ? 'active' : ''}`} 
              onClick={() => setActiveTab('invite')}
            >
              Invite
            </button>
            <button 
              className={`tab-button ${activeTab === 'earnings' ? 'active' : ''}`} 
              onClick={() => setActiveTab('earnings')}
            >
              My Earnings
            </button>
          </div>
          
          {/* EARNINGS TAB */}
          <section className={`tab-content ${activeTab === 'earnings' ? 'active' : ''}`}>
            <div className="card earnings-card">
              <div className="earnings-grid">
                <div className="earnings-item">
                  <div className="earnings-label">Total Reward</div>
                  <div className="earnings-amount">₹{profile?.referral_earnings?.toFixed(2) || '0.00'}</div>
                </div>
                {/* You can split this if you have separate columns in DB for locked/available */}
                <div className="earnings-item">
                  <div className="earnings-label">Available</div>
                  <div className="earnings-amount">₹{profile?.referral_earnings?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
              <div className="divider"></div>
              <button onClick={handleRedeem} className="redeem-btn">Redeem Reward</button>
            </div>
          </section>
          
          {/* INVITE TAB */}
          <section className={`tab-content ${activeTab === 'invite' ? 'active' : ''}`}>
            <div className="card invite-header-card">
              <h3>Invite Friends, Earn Rewards!</h3>
              <div className="referral-link-box">
                <span className="link-text">
                  {profile ? `${window.location.origin}/register?ref=${profile.referral_code}` : 'Loading...'}
                </span>
                <button onClick={copyLink} className="copy-btn-inset">Copy</button>
              </div>
              
              <div className="commission-list">
                <div className="commission-item">
                  <div className="commission-info">
                    <div className="level-badge">Level 1</div>
                    <div className="level-percent">16%</div>
                  </div>
                  <div className="commission-desc">Direct Referrals</div>
                </div>
                <div className="commission-item">
                  <div className="commission-info">
                    <div className="level-badge">Level 2</div>
                    <div className="level-percent">4%</div> {/* Updated to 4% as requested? Or 2% in snippet, standard is usually 3-2% */}
                  </div>
                  <div className="commission-desc">Friends of Friends</div>
                </div>
                <div className="commission-item">
                  <div className="commission-info">
                    <div className="level-badge">Level 3</div>
                    <div className="level-percent">1%</div>
                  </div>
                  <div className="commission-desc">Level 3 Network</div>
                </div>
              </div>
            </div>
          </section>
          
          {/* FRIENDS LIST SECTION */}
          <div className="card friends-card">
            <h3>My Team</h3>
            
            <div className="friends-sub-tabs">
              <button 
                className={`friends-sub-tab-button ${friendTab === 'all' ? 'active' : ''}`}
                onClick={() => setFriendTab('all')}
              >
                All ({referrals.length})
              </button>
              <button 
                className={`friends-sub-tab-button ${friendTab === 'joined' ? 'active' : ''}`}
                onClick={() => setFriendTab('joined')}
              >
                Active ({activeReferrals.length})
              </button>
            </div>
            
            <div className="friend-list scrollable-friend-list">
              {loading && <div className="loading-state">Loading...</div>}
              
              {!loading && friendTab === 'all' && (
                referrals.length > 0 ? referrals.map(friend => (
                  <div className="friend-item" key={friend.id}>
                    <div className="friend-avatar">👤</div>
                    <div className="friend-info">
                      <div className="friend-name">{friend.name || friend.email?.slice(0, 10) + '...'}</div>
                      <div className="friend-status">Reg: {new Date(friend.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="friend-earnings">Lvl 1</div>
                  </div>
                )) : <div className="empty-state">No referrals yet</div>
              )}

              {!loading && friendTab === 'joined' && (
                activeReferrals.length > 0 ? activeReferrals.map(friend => (
                  <div className="friend-item" key={friend.id}>
                    <div className="friend-avatar" style={{background: '#4caf50'}}>👤</div>
                    <div className="friend-info">
                      <div className="friend-name">{friend.name || friend.email}</div>
                      <div className="friend-status" style={{color: '#4caf50'}}>Active Investor</div>
                    </div>
                    <div className="friend-earnings">₹{friend.balance.toFixed(0)}</div>
                  </div>
                )) : <div className="empty-state">No active investors yet</div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="refer" />
      
      {toast && <div className={`toast show`}>{toast}</div>}
    </>
  );
}

export default Refer;
      
