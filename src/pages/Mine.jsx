import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Layout/Sidebar';
import '../styles/Mine.css';

function Mine() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  
  // 'withdraw', 'bank', 'transactions', null
  const [modal, setModal] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // For button loading states

  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [bankData, setBankData] = useState({
    name: '',
    bank_account: '',
    bank_ifsc: '',
    upi_id: ''
  });
  const [bankLocked, setBankLocked] = useState(false);

  useEffect(() => {
    initialize();
    setupSidebarEvents();
  }, []);

  // --- Sidebar Logic (Same as Home) ---
  function setupSidebarEvents() {
    // If the sidebar has an ID of 'sideMenu' and overlay 'sidebarOverlay'
    const openBtn = document.getElementById('menuBtn'); // If you add a menu button in header
    const closeBtn = document.getElementById('closeBtn');
    const overlay = document.getElementById('sidebarOverlay');
    const sideMenu = document.getElementById('sideMenu');

    function openSidebar() {
      if(sideMenu) sideMenu.classList.add('open');
      if(overlay) overlay.classList.add('active');
    }

    function closeSidebar() {
      if(sideMenu) sideMenu.classList.remove('open');
      if(overlay) overlay.classList.remove('active');
    }

    // Attach to the Back/Menu button if desired, or keep generic
    if (openBtn) openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    return () => {
      if (openBtn) openBtn.removeEventListener('click', openSidebar);
      if (closeBtn) closeBtn.removeEventListener('click', closeSidebar);
      if (overlay) overlay.removeEventListener('click', closeSidebar);
    };
  }

  // Helper for Sidebar toggle via React if needed
  const toggleSidebar = () => {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sidebarOverlay');
    if (sideMenu && overlay) {
      sideMenu.classList.toggle('open');
      overlay.classList.toggle('active');
    }
  };

  async function initialize() {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        window.location.href = '/login';
        return;
      }
      setUser(authData.user);
      await loadProfile(authData.user.id);
      await loadTransactions(authData.user.id);
    } catch (error) {
      console.error('Init error:', error);
    }
  }

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;

      if (data) {
        setProfile(data);
        setBalance(data.balance || 0);
        // Set bank data
        setBankData({
          name: data.name || '',
          bank_account: data.bank_account || '',
          bank_ifsc: data.bank_ifsc || '',
          upi_id: data.upi_id || ''
        });
        
        // Check if bank details are locked (7 days)
        if (data.bank_details_updated_at) {
          const updateDate = new Date(data.bank_details_updated_at);
          const daysSinceUpdate = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);
          setBankLocked(daysSinceUpdate < 7);
        }
      }
    } catch (error) {
      console.error('Profile load error:', error);
    }
  }

  async function loadTransactions(userId) {
    try {
      // Load regular transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
        
      // Load withdrawal requests
      const { data: withdrawalData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
        
      // Combine and format
      const allTx = [
        ...(txData || []).map(tx => ({
          id: tx.id,
          type: tx.type || 'transaction',
          amount: tx.amount || 0,
          status: 'completed',
          description: tx.description || '',
          date: tx.created_at,
          icon: getTxIcon(tx.type),
          color: tx.amount >= 0 ? 'green' : 'red'
        })),
        ...(withdrawalData || []).map(wd => ({
          id: wd.id,
          type: 'withdrawal',
          amount: -wd.amount,
          status: wd.status || 'pending',
          description: 'Withdrawal Request',
          date: wd.created_at,
          icon: '💰',
          color: 'red'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setTransactions(allTx);
    } catch (error) {
      console.error('Tx load error:', error);
    }
  }

  // ================ MODAL HANDLERS ================
  const openWithdrawModal = () => {
    setModal('withdraw');
    setWithdrawalAmount('');
  };

  const openBankModal = () => {
    setModal('bank');
  };
  
  const openTxModal = () => {
    setModal('transactions');
  };
  
  const closeModal = () => {
    setModal(null);
    setWithdrawalAmount('');
    setIsLoading(false);
  };

  // ================ WITHDRAWAL HANDLER ================
  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount < 130) {
      alert('Minimum withdrawal amount is ₹130');
      return;
    }

    if (amount > balance) {
      alert('Insufficient balance');
      return;
    }

    if (!profile?.bank_account || !profile?.bank_ifsc) {
      if(confirm('Please add bank details before withdrawing. Go to Bank Settings?')) {
        closeModal();
        openBankModal();
      }
      return;
    }

    setIsLoading(true);

    try {
      const tds = amount * 0.18;
      const payout = amount - tds;

      // Create withdrawal request
      const { error: withdrawError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          amount: amount,
          tds: tds,
          payout_amount: payout,
          bank_account: profile.bank_account,
          bank_ifsc: profile.bank_ifsc,
          upi_id: profile.upi_id || '',
          status: 'pending'
        });

      if (withdrawError) throw withdrawError;

      // Update balance locally and in DB
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: balance - amount })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      alert('✅ Withdrawal request submitted successfully!');
      closeModal();
      await loadProfile(user.id);
      await loadTransactions(user.id);
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ================ BANK DETAILS HANDLER ================
  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const formData = new FormData(e.target);
    
    // Check if locked
    if (bankLocked) {
      alert('❌ Bank details are locked. Contact support.');
      return;
    }

    // Validate account match
    const account = formData.get('account');
    const confirmAccount = formData.get('confirmAccount');
    
    if (account !== confirmAccount) {
      alert('Account numbers do not match!');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.get('name'),
          bank_account: account,
          bank_ifsc: formData.get('ifsc').toUpperCase(),
          upi_id: formData.get('upi') || '',
          bank_details_updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('✅ Bank details saved successfully!');
      closeModal();
      await loadProfile(user.id);
      
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ================ HELPER FUNCTIONS ================
  const getTxIcon = (type) => {
    switch (type) {
      case 'deposit': return '💳';
      case 'withdrawal': return '💰';
      case 'bonus': return '🎁';
      case 'referral': return '👥';
      default: return '📄';
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'failed': return 'status-failed';
      default: return 'status-completed';
    }
  };

  // ================ UI RENDER ================
  const getDisplayName = () => {
    return profile?.name || user?.email?.split('@')[0] || 'User';
  };

  const getUserId = () => {
    if (!user?.id) return 'Loading...';
    const id = user.id;
    return `${id.slice(0, 8)}-${id.slice(-4)}`;
  };

  // Calculate TDS and payout for render
  const calcTds = parseFloat(withdrawalAmount) * 0.18 || 0;
  const calcPayout = parseFloat(withdrawalAmount) - calcTds || 0;

  return (
    <div className="mine-page">
      {/* Sidebar Elements */}
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />

      {/* Header */}
      <header className="top-bar">
        {/* Toggle Sidebar Button (Optional replacement for Back button if you want "Home-like" behavior) */}
        <button className="header-back-btn" onClick={toggleSidebar} id="menuBtn">
          <i className="fas fa-bars"></i>
        </button>
        My Account
      </header>

      {/* Main Content */}
      <main className="mine-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            {getDisplayName().charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h2 className="profile-name">{getDisplayName()}</h2>
            <div className="profile-id">ID: {getUserId()}</div>
            <div className="profile-email">{user?.email}</div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="balance-card">
          <div className="balance-label">Available Balance</div>
          <div className="balance-amount">₹{balance.toFixed(2)}</div>
          <div className="balance-actions">
            <button className="btn-withdraw" onClick={openWithdrawModal}>
              <span className="btn-icon">💰</span> Withdraw
            </button>
            <button className="btn-recharge" onClick={() => window.location.href = '/recharge'}>
              <span className="btn-icon">💳</span> Recharge
            </button>
          </div>
        </div>

        {/* Menu Options */}
        <div className="menu-card">
          <div className="menu-item" onClick={openBankModal}>
            <div className="menu-icon">🏦</div>
            <div className="menu-text">Bank Account Details</div>
            <div className="menu-arrow">&gt;</div>
          </div>
          
          <div className="menu-item" onClick={openTxModal}>
            <div className="menu-icon">📜</div>
            <div className="menu-text">Transaction History</div>
            <div className="menu-arrow">&gt;</div>
          </div>
          
          <div className="menu-item" onClick={() => {
            const newPass = prompt('Enter new password:');
            if (!newPass) return;
            const confirmPass = prompt('Confirm new password:');
            if (newPass && newPass === confirmPass) {
              // Call API to change password
              supabase.auth.updateUser({ password: newPass })
                .then(({ error }) => {
                  if (error) alert('Error: ' + error.message);
                  else alert('Password changed successfully!');
                });
            } else if (newPass) {
              alert('Passwords do not match!');
            }
          }}>
            <div className="menu-icon">🔒</div>
            <div className="menu-text">Change Password</div>
            <div className="menu-arrow">&gt;</div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="logout-card">
          <button className="btn-logout" onClick={async () => {
            if (confirm('Are you sure you want to log out?')) {
              await supabase.auth.signOut();
              window.location.href = '/login';
            }
          }}>
            Log Out
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="/home" className="nav-item">
          <i className="fas fa-home"></i> Home
        </a>
        <a href="/recharge" className="nav-item">
          <i className="fas fa-bolt"></i> Recharge
        </a>
        <a href="/refer" className="nav-item">
          <i className="fas fa-users"></i> Refer
        </a>
        <a href="/mine" className="nav-item active">
          <i className="fas fa-user"></i> Mine
        </a>
      </nav>

      {/* ================ MODALS ================ */}
      
      {/* Withdrawal Modal */}
      <div className={`modal-overlay ${modal === 'withdraw' ? 'active' : ''}`} onClick={closeModal}>
        <div className={`modal-container ${modal === 'withdraw' ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Withdrawal Request</h3>
            <button className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          
          <div className="modal-body">
            <div className="balance-display">
              <span className="balance-label">Available Balance</span>
              <span className="balance-value">₹{balance.toFixed(2)}</span>
            </div>

            <form onSubmit={handleWithdrawalSubmit}>
              <div className="form-group">
                <label>Enter Amount (Min: ₹130)</label>
                <div className="amount-input">
                  <span className="currency">₹</span>
                  <input
                    type="number"
                    value={withdrawalAmount}
                    onChange={e => setWithdrawalAmount(e.target.value)}
                    placeholder="0.00"
                    min="130"
                    step="1"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="calculation-box">
                <div className="calc-row">
                  <span>Withdrawal Amount</span>
                  <span>₹{parseFloat(withdrawalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="calc-row">
                  <span>TDS (18%)</span>
                  <span className="tds-amount">- ₹{calcTds.toFixed(2)}</span>
                </div>
                <div className="calc-row total-row">
                  <span>You Will Receive</span>
                  <span className="payout-amount">₹{calcPayout.toFixed(2)}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal} disabled={isLoading}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn-submit ${isLoading ? 'loading' : ''}`}
                  disabled={!withdrawalAmount || parseFloat(withdrawalAmount) < 130 || parseFloat(withdrawalAmount) > balance || isLoading}
                >
                  {isLoading ? 'Processing' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Bank Details Modal */}
      <div className={`modal-overlay ${modal === 'bank' ? 'active' : ''}`} onClick={closeModal}>
        <div className={`modal-container ${modal === 'bank' ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Bank Account Details</h3>
            <button className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          
          <div className="modal-body">
            {bankLocked && (
              <div className="warning-message">
                ⚠️ <strong>Bank details are locked!</strong><br/>
                If you made a mistake, contact HR/support to change details.
              </div>
            )}

            <form onSubmit={handleBankSubmit}>
              <div className="form-group">
                <label>Account Holder Name *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={bankData.name}
                  placeholder="Full Name"
                  required
                  minLength="3"
                  disabled={bankLocked || isLoading}
                />
              </div>

              <div className="form-group">
                <label>Bank Account Number *</label>
                <input
                  type="text"
                  name="account"
                  defaultValue={bankData.bank_account}
                  placeholder="Enter Account No."
                  required
                  pattern="[0-9]{9,18}"
                  disabled={bankLocked || isLoading}
                />
              </div>

              <div className="form-group">
                <label>Confirm Account Number *</label>
                <input
                  type="text"
                  name="confirmAccount"
                  defaultValue={bankData.bank_account}
                  placeholder="Re-enter Account No."
                  required
                  pattern="[0-9]{9,18}"
                  disabled={bankLocked || isLoading}
                />
              </div>

              <div className="form-group">
                <label>IFSC Code *</label>
                <input
                  type="text"
                  name="ifsc"
                  defaultValue={bankData.bank_ifsc}
                  placeholder="E.g., SBIN0001234"
                  required
                  pattern="[A-Za-z]{4}0[A-Z0-9]{6}"
                  disabled={bankLocked || isLoading}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="form-group">
                <label>UPI ID (Optional)</label>
                <input
                  type="text"
                  name="upi"
                  defaultValue={bankData.upi_id}
                  placeholder="username@upi"
                  disabled={bankLocked || isLoading}
                />
              </div>

              <div className="info-message">
                ⚠️ <strong>Important:</strong> Please verify all details before submitting. Incorrect details may lead to payment failures.
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal} disabled={isLoading}>
                  Cancel
                </button>
                <button type="submit" className={`btn-submit ${isLoading ? 'loading' : ''}`} disabled={bankLocked || isLoading}>
                  {isLoading ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Transaction History Modal */}
      <div className={`modal-overlay ${modal === 'transactions' ? 'active' : ''}`} onClick={closeModal}>
        <div className={`modal-container ${modal === 'transactions' ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Transaction History</h3>
            <button className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          
          <div className="modal-body">
            {transactions.length === 0 ? (
              <div className="empty-state">
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="transactions-list">
                {transactions.map(tx => (
                  <div key={tx.id} className="tx-card">
                    <div className="tx-header">
                      <div className="tx-icon-type">
                        <span className="tx-icon">{tx.icon}</span>
                        <span className="tx-type" style={{ textTransform: 'capitalize' }}>{tx.type}</span>
                      </div>
                      <div className={`tx-amount ${tx.color}`}>
                        {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                      </div>
                    </div>
                    <div className="tx-details">
                      <div className="tx-date">{formatDate(tx.date)}</div>
                      <div className={`tx-status ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Mine;
