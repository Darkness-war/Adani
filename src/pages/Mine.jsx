import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Layout/Sidebar';
import '../styles/Mine.css';

function Mine() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [modal, setModal] = useState(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [bankData, setBankData] = useState({
    name: '',
    bank_account: '',
    bank_ifsc: '',
    upi_id: ''
  });
  const [bankLocked, setBankLocked] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

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
        
        setBankData({
          name: data.name || '',
          bank_account: data.bank_account || '',
          bank_ifsc: data.bank_ifsc || '',
          upi_id: data.upi_id || ''
        });

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
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: withdrawalData } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

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
  };

  // ================ WITHDRAWAL HANDLER ================
  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(withdrawalAmount);
    if (amount < 130) {
      alert('Minimum withdrawal amount is ₹130');
      return;
    }

    if (amount > balance) {
      alert('Insufficient balance');
      return;
    }

    if (!profile?.bank_account || !profile?.bank_ifsc) {
      alert('Please add bank details first');
      closeModal();
      setTimeout(() => openBankModal(), 300);
      return;
    }

    try {
      const tds = amount * 0.18;
      const payout = amount - tds;

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
    }
  };

  // ================ BANK DETAILS HANDLER ================
  const handleBankSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    if (bankLocked) {
      alert('❌ Bank details are locked for 7 days. If you made a mistake, please contact HR/support.');
      return;
    }

    const account = formData.get('account');
    const confirmAccount = formData.get('confirmAccount');
    
    if (account !== confirmAccount) {
      alert('Account numbers do not match!');
      return;
    }

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

  const tds = parseFloat(withdrawalAmount) * 0.18 || 0;
  const payout = parseFloat(withdrawalAmount) - tds || 0;

  return (
    <div className="mine-container">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Header */}
      <header className="top-bar">
        <div className="sidebar-toggle" onClick={() => setIsSidebarOpen(true)}>
          <i className="fas fa-bars"></i>
        </div>
        My Account
      </header>

      {/* Main Content */}
      <main className="mine-page">
        {/* Profile Card */}
        <div className="profile-header-card">
          <div className="profile-avatar">
            {getDisplayName().charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <div className="profile-name">{getDisplayName()}</div>
            <div className="profile-id">ID: {getUserId()}</div>
            <div className="profile-email">{user?.email}</div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="balance-card">
          <div className="balance-label">Available Balance</div>
          <div className="balance-amount">₹{balance.toFixed(2)}</div>
          <div className="action-buttons">
            <button className="action-btn withdraw-btn" onClick={openWithdrawModal}>
              <span className="btn-icon">💰</span> Withdraw
            </button>
            <button className="action-btn recharge-btn" onClick={() => window.location.href = '/recharge'}>
              <span className="btn-icon">💳</span> Recharge
            </button>
          </div>
        </div>

        {/* Options List */}
        <div className="options-list-card">
          <a className="option-item" onClick={openBankModal}>
            <div className="option-icon">🏦</div>
            <div className="option-text">Bank Account Details</div>
            <div className="option-arrow">&gt;</div>
          </a>
          
          <a className="option-item" onClick={openTxModal}>
            <div className="option-icon">📜</div>
            <div className="option-text">Transaction History</div>
            <div className="option-arrow">&gt;</div>
          </a>
          
          <a className="option-item" onClick={() => {
            const newPass = prompt('Enter new password:');
            const confirmPass = prompt('Confirm new password:');
            if (newPass && newPass === confirmPass) {
              alert('Password change request sent!');
            } else if (newPass) {
              alert('Passwords do not match!');
            }
          }}>
            <div className="option-icon">🔒</div>
            <div className="option-text">Change Password</div>
            <div className="option-arrow">&gt;</div>
          </a>
        </div>

        {/* Logout Button */}
        <div className="logout-card">
          <button className="logout-btn" onClick={async () => {
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
      {modal === 'withdraw' && (
        <div className="modal-overlay active" onClick={closeModal}>
          <div className="modal-container active" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Withdrawal Request</h3>
              <button className="modal-close-btn" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="modal-content">
              <div className="balance-display">
                <span className="modal-balance-label">Available Balance</span>
                <span className="modal-balance-value">₹{balance.toFixed(2)}</span>
              </div>

              <form onSubmit={handleWithdrawalSubmit} className="withdraw-form">
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

                <div className="withdrawal-calculations">
                  <div className="calculation-row">
                    <span>Withdrawal Amount</span>
                    <span>₹{parseFloat(withdrawalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="calculation-row">
                    <span>TDS (18%)</span>
                    <span className="tds-amount">- ₹{tds.toFixed(2)}</span>
                  </div>
                  <div className="calculation-row total">
                    <span>You Will Receive</span>
                    <span className="payout-amount">₹{payout.toFixed(2)}</span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={closeModal}>
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-submit"
                    disabled={!withdrawalAmount || parseFloat(withdrawalAmount) < 130 || parseFloat(withdrawalAmount) > balance}
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bank Details Modal */}
      {modal === 'bank' && (
        <div className="modal-overlay active" onClick={closeModal}>
          <div className="modal-container active" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bank Account Details</h3>
              <button className="modal-close-btn" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="modal-content">
              {bankLocked && (
                <div className="warning-message">
                  ⚠️ <strong>Bank details are locked!</strong><br/>
                  If you made a mistake, contact HR/support to change details.
                </div>
              )}

              <form onSubmit={handleBankSubmit} className="bank-form">
                <div className="form-scrollable">
                  <div className="form-group">
                    <label>Account Holder Name *</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={bankData.name}
                      placeholder="Enter your full name as per bank"
                      required
                      minLength="3"
                      disabled={bankLocked}
                    />
                  </div>

                  <div className="form-group">
                    <label>Bank Account Number *</label>
                    <input
                      type="text"
                      name="account"
                      defaultValue={bankData.bank_account}
                      placeholder="Enter 9-18 digit account number"
                      required
                      pattern="[0-9]{9,18}"
                      disabled={bankLocked}
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm Account Number *</label>
                    <input
                      type="text"
                      name="confirmAccount"
                      defaultValue={bankData.bank_account}
                      placeholder="Re-enter account number"
                      required
                      pattern="[0-9]{9,18}"
                      disabled={bankLocked}
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
                      disabled={bankLocked}
                    />
                  </div>

                  <div className="form-group">
                    <label>UPI ID (Optional)</label>
                    <input
                      type="text"
                      name="upi"
                      defaultValue={bankData.upi_id}
                      placeholder="E.g., username@upi"
                      pattern="[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}"
                      disabled={bankLocked}
                    />
                  </div>

                  <div className="info-message">
                    ⚠️ <strong>Important:</strong> Bank details are verified for security.<br/>
                    Please verify all details before submitting.
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={bankLocked}>
                    Save Bank Details
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {modal === 'transactions' && (
        <div className="modal-overlay active" onClick={closeModal}>
          <div className="modal-container active" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transaction History</h3>
              <button className="modal-close-btn" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="modal-content transaction-history-modal">
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <p>No transactions found</p>
                </div>
              ) : (
                <div className="transactions-list">
                  {transactions.map(tx => (
                    <div key={tx.id} className="transaction-card">
                      <div className="transaction-header">
                        <div className="transaction-icon-type">
                          <span className="transaction-icon">{tx.icon}</span>
                          <span className={`transaction-type-badge ${tx.type}`}>
                            {tx.type}
                          </span>
                        </div>
                        <div className={`transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                          {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                        </div>
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-date">{formatDate(tx.date)}</div>
                        <div className={`transaction-status ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </div>
                      </div>
                      {tx.description && (
                        <div className="transaction-description">{tx.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Mine;
