import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Layout/Sidebar';
import '../styles/Mine.css';

function Mine() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  
  // Modal State
  const [modalType, setModalType] = useState(null); // 'withdraw', 'bank', 'transactions', 'password'
  const [loading, setLoading] = useState(false);

  // Form States
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankData, setBankData] = useState({
    name: '', account: '', confirmAccount: '', ifsc: '', upi: ''
  });

  useEffect(() => {
    getProfile();
    setupSidebar();
  }, []);

  // --- 1. Sidebar Logic (Similar to Home) ---
  const setupSidebar = () => {
    const overlay = document.getElementById('sidebarOverlay');
    const sideMenu = document.getElementById('sideMenu');
    
    // Ensure overlay handles click to close
    if (overlay) {
      overlay.onclick = () => {
        sideMenu?.classList.remove('open');
        overlay.classList.remove('active');
      };
    }
  };

  const toggleSidebar = () => {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sideMenu && overlay) {
      sideMenu.classList.add('open');
      overlay.classList.add('active');
    } else {
      console.error("Sidebar elements not found. Check Layout components.");
    }
  };

  // --- 2. Data Loading ---
  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      setUser(user);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setBalance(data.balance || 0);
        setBankData({
          name: data.name || '',
          account: data.bank_account || '',
          confirmAccount: data.bank_account || '',
          ifsc: data.bank_ifsc || '',
          upi: data.upi_id || ''
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  // --- 3. Action Handlers ---
  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    const amount = parseFloat(withdrawAmount);
    if (amount < 130) return alert('Minimum withdrawal is ₹130');
    if (amount > balance) return alert('Insufficient balance');

    setLoading(true);
    try {
      // 1. Create Request
      const { error: reqError } = await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        amount: amount,
        status: 'pending',
        bank_account: bankData.account,
        bank_ifsc: bankData.ifsc
      });
      if (reqError) throw reqError;

      // 2. Deduct Balance
      const { error: balError } = await supabase.from('profiles')
        .update({ balance: balance - amount })
        .eq('id', user.id);
      if (balError) throw balError;

      alert('Withdrawal request submitted!');
      setModalType(null);
      getProfile(); // Refresh
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBankSave = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    if (bankData.account !== bankData.confirmAccount) {
      return alert('Account numbers do not match');
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        name: bankData.name,
        bank_account: bankData.account,
        bank_ifsc: bankData.ifsc,
        upi_id: bankData.upi
      }).eq('id', user.id);

      if (error) throw error;
      alert('Bank details saved!');
      setModalType(null);
      getProfile();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. Render Helpers ---
  const getDisplayName = () => {
    if (profile?.name) return profile.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <div className="mine-page">
      {/* Sidebar Overlay specific for this page logic */}
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      
      {/* Sidebar Component */}
      <Sidebar />

      {/* Top Header */}
      <header className="top-bar">
        <button className="menu-btn" onClick={toggleSidebar}>
          {/* Using text icon if FontAwesome fails, or try <i className="fas fa-bars"></i> */}
          <span style={{ fontSize: '24px', lineHeight: 1 }}>☰</span> 
        </button>
        <div className="page-title">My Account</div>
      </header>

      <div className="mine-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            {getDisplayName().charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <div className="profile-name">{getDisplayName()}</div>
            <div className="profile-id-badge">ID: {user?.id?.slice(0,8) || '...'}</div>
            <div className="profile-email">{user?.email}</div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="balance-card">
          <div className="balance-label">Available Balance</div>
          <div className="balance-amount">₹{balance.toFixed(2)}</div>
          <div className="balance-actions">
            <button className="action-btn btn-withdraw" onClick={() => setModalType('withdraw')}>
              <span>💰</span> Withdraw
            </button>
            <button className="action-btn btn-recharge" onClick={() => window.location.href = '/recharge'}>
              <span>💳</span> Recharge
            </button>
          </div>
        </div>

        {/* Menu List */}
        <div className="menu-list">
          <div className="menu-item" onClick={() => setModalType('bank')}>
            <span className="menu-icon">🏦</span>
            <span className="menu-text">Bank Account Details</span>
            <span className="menu-arrow">&gt;</span>
          </div>
          <div className="menu-item" onClick={() => setModalType('transactions')}>
            <span className="menu-icon">📜</span>
            <span className="menu-text">Transaction History</span>
            <span className="menu-arrow">&gt;</span>
          </div>
          <div className="menu-item" onClick={() => setModalType('password')}>
            <span className="menu-icon">🔒</span>
            <span className="menu-text">Change Password</span>
            <span className="menu-arrow">&gt;</span>
          </div>
        </div>

        <button className="logout-btn" onClick={async () => {
            if(confirm('Logout?')) {
                await supabase.auth.signOut();
                window.location.href = '/login';
            }
        }}>Log Out</button>
      </div>

      {/* ================= MODALS ================= */}
      
      {/* Withdraw Modal */}
      <div className={`modal-overlay ${modalType === 'withdraw' ? 'active' : ''}`} onClick={() => setModalType(null)}>
        <div className={`modal-container ${modalType === 'withdraw' ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Withdraw Funds</h3>
            <button className="modal-close" onClick={() => setModalType(null)}>&times;</button>
          </div>
          <form onSubmit={handleWithdraw}>
            <div className="modal-body">
              <div className="form-group">
                <label>Amount (Balance: ₹{balance})</label>
                <input 
                  type="number" 
                  placeholder="Enter amount" 
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  required 
                />
              </div>
              <p style={{fontSize:'12px', color:'red'}}>* 18% Tax applicable on withdrawal</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setModalType(null)}>Cancel</button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bank Modal */}
      <div className={`modal-overlay ${modalType === 'bank' ? 'active' : ''}`} onClick={() => setModalType(null)}>
        <div className={`modal-container ${modalType === 'bank' ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Bank Settings</h3>
            <button className="modal-close" onClick={() => setModalType(null)}>&times;</button>
          </div>
          <form onSubmit={handleBankSave}>
            <div className="modal-body">
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" value={bankData.name} 
                  onChange={e => setBankData({...bankData, name: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input 
                  type="text" value={bankData.account} 
                  onChange={e => setBankData({...bankData, account: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Confirm Account</label>
                <input 
                  type="text" value={bankData.confirmAccount} 
                  onChange={e => setBankData({...bankData, confirmAccount: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>IFSC Code</label>
                <input 
                  type="text" value={bankData.ifsc} 
                  onChange={e => setBankData({...bankData, ifsc: e.target.value.toUpperCase()})}
                  required 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setModalType(null)}>Cancel</button>
              <button type="submit" className="btn-submit" disabled={loading}>Save</button>
            </div>
          </form>
        </div>
      </div>
      
    </div>
  );
}

export default Mine;
              
