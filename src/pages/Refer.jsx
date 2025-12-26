import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import '../styles/refer.css';

function Refer() {
  const [activeTab, setActiveTab] = useState('invite');
  const [friendsTab, setFriendsTab] = useState('all');
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [earnings, setEarnings] = useState({
    total: 0,
    available: 0,
    locked: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadReferralInfo();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
  };

  const loadReferralInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's referral code
      const { data: userData } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', user.id)
        .single();
      
      if (userData) {
        setReferralCode(userData.referral_code);
      }

      // Load referrals with their investments
      const { data: refData } = await supabase
        .from('users')
        .select(`
          id,
          email,
          created_at,
          referral_code,
          user_investments!left (
            id,
            amount,
            status
          )
        `)
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false });
      
      if (refData) {
        setReferrals(refData.map(ref => ({
          ...ref,
          has_investment: ref.user_investments && ref.user_investments.length > 0
        })));
      }

      // Calculate earnings
      const { data: earningsData } = await supabase
        .from('referral_commissions')
        .select('amount, status')
        .eq('referrer_id', user.id);

      if (earningsData) {
        const totalEarnings = earningsData.reduce((sum, t) => sum + (t.amount || 0), 0);
        const availableEarnings = earningsData
          .filter(t => t.status === 'available')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        const lockedEarnings = earningsData
          .filter(t => t.status === 'locked')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        setEarnings({
          total: totalEarnings,
          available: availableEarnings,
          locked: lockedEarnings
        });
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    }
  };

  const referralLink = `https://adani-corporation.vercel.app/register?ref=${referralCode}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      alert('Referral link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const filteredReferrals = referrals.filter(referral => {
    if (friendsTab === 'joined') {
      return referral.has_investment;
    }
    if (searchTerm) {
      return referral.email.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const redeemEarnings = async () => {
    if (earnings.available < 100) {
      alert('Minimum ₹100 required to redeem referral earnings');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Create withdrawal request for referral earnings
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          amount: earnings.available,
          type: 'referral_commission',
          status: 'pending'
        });

      if (error) throw error;

      // Update commission status
      await supabase
        .from('referral_commissions')
        .update({ status: 'withdrawn' })
        .eq('referrer_id', user.id)
        .eq('status', 'available');

      alert(`Withdrawal request submitted for ₹${earnings.available.toFixed(2)}`);
      loadReferralInfo();
    } catch (error) {
      console.error('Error redeeming earnings:', error);
      alert('Failed to redeem earnings: ' + error.message);
    }
  };

  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="Refer & Earn" />
      
      <main className="refer-page-container">
        <div className="refer-main-tabs">
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
        
        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="card earnings-card">
            <div className="earnings-grid">
              <div className="earnings-item">
                <div className="earnings-label">Total Reward</div>
                <div className="earnings-amount">₹{earnings.total.toFixed(2)}</div>
              </div>
              <div className="earnings-item">
                <div className="earnings-label">Available to Redeem</div>
                <div className="earnings-amount">₹{earnings.available.toFixed(2)}</div>
              </div>
              <div className="earnings-item full-width">
                <div className="earnings-label">Locked Reward</div>
                <div className="earnings-amount">₹{earnings.locked.toFixed(2)}</div>
              </div>
            </div>
            <div className="divider"></div>
            <button 
              onClick={redeemEarnings} 
              className="redeem-btn"
              disabled={earnings.available < 100}
            >
              {earnings.available >= 100 ? 'Redeem Reward' : 'Minimum ₹100 Required'}
            </button>
          </div>
        )}
        
        {/* Invite Tab */}
        {activeTab === 'invite' && (
          <div className="card invite-header-card">
            <h3>Invite Friends, Earn Rewards!</h3>
            <p>Share your referral link and earn commissions</p>
            
            <div className="referral-link-box">
              <input 
                type="text" 
                value={referralLink} 
                readOnly 
                className="referral-input"
              />
              <button onClick={copyToClipboard} className="copy-btn-inset">
                Copy Link
              </button>
            </div>

            <div className="commission-rates">
              <div className="commission-item">
                <div className="commission-info">
                  <div className="level-badge">Level 1</div>
                  <div className="level-percent">16%</div>
                  <div className="level-desc">Direct Referrals</div>
                </div>
              </div>
              <div className="commission-item">
                <div className="commission-info">
                  <div className="level-badge">Level 2</div>
                  <div className="level-percent">4%</div>
                  <div className="level-desc">Secondary Referrals</div>
                </div>
              </div>
              <div className="commission-item">
                <div className="commission-info">
                  <div className="level-badge">Level 3</div>
                  <div className="level-percent">1%</div>
                  <div className="level-desc">Tertiary Referrals</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Friends Section */}
        <div className="card friends-card">
          <h3>Your Referrals</h3>
          
          <div className="search-input-wrapper">
            <input 
              type="text" 
              placeholder="Search by email" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="friends-sub-tabs">
            <button 
              className={`friends-sub-tab-button ${friendsTab === 'all' ? 'active' : ''}`} 
              onClick={() => setFriendsTab('all')}
            >
              All
            </button>
            <button 
              className={`friends-sub-tab-button ${friendsTab === 'joined' ? 'active' : ''}`} 
              onClick={() => setFriendsTab('joined')}
            >
              Joined & Active
            </button>
          </div>
          
          <div className="friend-list scrollable-friend-list">
            {filteredReferrals.length === 0 ? (
              <div className="empty-state">
                <p>No referrals found</p>
              </div>
            ) : (
              filteredReferrals.map((friend, index) => (
                <div key={index} className="friend-item">
                  <div className="friend-avatar">
                    {friend.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-details">
                    <div className="friend-name">{friend.email}</div>
                    <div className="friend-info">
                      Joined: {new Date(friend.created_at).toLocaleDateString()}
                      {friend.has_investment && (
                        <span className="active-badge">Active Investor</span>
                      )}
                    </div>
                  </div>
                  <div className="friend-earnings">
                    {friend.has_investment ? '₹500+' : 'Not Invested'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="refer" />
    </>
  );
}

export default Refer;
