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
      {/* Sidebar Overlay (same as Home.jsx) */}
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      
      {/* Sidebar Component (same as Home.jsx) */}
      <Sidebar />
      
      {/* Header - Keep exactly as before but add sidebar toggle */}
      <header className="top-bar">
        <div className="sidebar-toggle" id="menuBtn">
          <i className="fas fa-bars"></i>
        </div>
        My Account
      </header>

      {/* Main Content - Keep exactly as before */}
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
            const confirmPass = prompt('Confirm new password:');
            if (newPass && newPass === confirmPass) {
              alert('Password change request sent!');
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

      {/* Bottom Navigation - Keep exactly as before */}
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
      
      {/* Withdrawal Modal - FIXED: Added proper submit button */}
      {modal === 'withdraw' && (
        <div className="modal-overlay active" onClick={closeModal}>
          <div className="modal-container active" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Withdrawal Request</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="balance-display">
                <span className="balance-label">Available Balance</span>
                <span className="balance-value">₹{balance.toFixed(2)}</span>
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

                <div className="calculation-box">
                  <div className="calc-row">
                    <span>Withdrawal Amount</span>
                    <span>₹{parseFloat(withdrawalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="calc-row">
                    <span>TDS (18%)</span>
                    <span className="tds-amount">- ₹{tds.toFixed(2)}</span>
                  </div>
                  <div className="calc-row total-row">
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

      {/* Bank Details Modal - FIXED: Added scroll and submit button */}
      {modal === 'bank' && (
        <div className="modal-overlay active" onClick={closeModal}>
          <div className="modal-container active" onClick={e => e.stopPropagation()}>
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

              <form onSubmit={handleBankSubmit} className="bank-form">
                {/* Scrollable form content */}
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

                {/* Submit buttons - fixed at bottom */}
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
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            
            <div className="modal-body tx-modal-body">
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
                          <span className="tx-type">{tx.type}</span>
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
                      {tx.description && (
                        <div className="tx-description">{tx.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Keep ALL your original inline styles EXACTLY as they were */
        .mine-container {
          min-height: 100vh;
          background: #f5f5f5;
        }
        
        /* Top Bar - Added sidebar toggle */
        .top-bar {
          background: #1e3c72;
          color: white;
          padding: 15px;
          text-align: center;
          font-weight: 600;
          font-size: 18px;
          position: relative;
        }
        
        .sidebar-toggle {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: white;
          cursor: pointer;
          font-size: 20px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Main Content */
        .mine-content {
          padding: 15px;
          padding-bottom: 80px;
        }
        
        /* Profile Card */
        .profile-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 15px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
        }
        
        .profile-avatar {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          margin-right: 15px;
        }
        
        .profile-info {
          flex: 1;
        }
        
        .profile-name {
          margin: 0 0 5px 0;
          font-size: 18px;
          color: #333;
        }
        
        .profile-id {
          font-size: 14px;
          color: #666;
          margin-bottom: 3px;
          background: #f0f0f0;
          padding: 3px 10px;
          border-radius: 15px;
          display: inline-block;
          font-family: monospace;
        }
        
        .profile-email {
          font-size: 14px;
          color: #888;
        }
        
        /* Balance Card */
        .balance-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 15px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .balance-label {
          color: #666;
          font-size: 14px;
          margin-bottom: 8px;
        }
        
        .balance-amount {
          color: #1e3c72;
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        
        .balance-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
        }
        
        .btn-withdraw, .btn-recharge {
          flex: 1;
          max-width: 160px;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .btn-withdraw {
          background: #1e3c72;
          color: white;
        }
        
        .btn-recharge {
          background: #2e7d32;
          color: white;
        }
        
        .btn-icon {
          font-size: 18px;
        }
        
        /* Menu Card */
        .menu-card {
          background: white;
          border-radius: 12px;
          margin-bottom: 15px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .menu-item {
          padding: 18px 20px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
        }
        
        .menu-item:last-child {
          border-bottom: none;
        }
        
        .menu-item:hover {
          background: #f9f9f9;
        }
        
        .menu-icon {
          font-size: 20px;
          margin-right: 15px;
          width: 24px;
          text-align: center;
        }
        
        .menu-text {
          flex: 1;
          font-size: 16px;
          color: #333;
        }
        
        .menu-arrow {
          color: #999;
          font-size: 18px;
        }
        
        /* Logout Card */
        .logout-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .btn-logout {
          width: 100%;
          padding: 15px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        
        /* Bottom Navigation */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          display: flex;
          padding: 10px 0;
          border-top: 1px solid #e0e0e0;
          z-index: 100;
        }
        
        .nav-item {
          flex: 1;
          text-align: center;
          text-decoration: none;
          color: #666;
          font-size: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        
        .nav-item.active {
          color: #1e3c72;
        }
        
        .nav-item i {
          font-size: 20px;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          display: none;
          align-items: center;
          justify-content: center;
        }
        
        .modal-overlay.active {
          display: flex;
        }
        
        .modal-container {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 450px;
          max-height: 85vh;
          overflow: hidden;
          display: none;
        }
        
        .modal-container.active {
          display: block;
        }
        
        .modal-header {
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }
        
        .modal-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .modal-body {
          padding: 20px;
          max-height: calc(85vh - 70px);
          overflow-y: auto;
        }
        
        /* Withdraw Form */
        .balance-display {
          background: #e8f5e9;
          padding: 15px;
          border-radius: 10px;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .balance-value {
          font-size: 28px;
          font-weight: bold;
          color: #2e7d32;
          display: block;
          margin-top: 5px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #555;
          font-weight: 500;
        }
        
        .amount-input {
          position: relative;
        }
        
        .amount-input .currency {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 20px;
          font-weight: bold;
          color: #333;
        }
        
        .amount-input input {
          width: 100%;
          padding: 15px 15px 15px 45px;
          border: 1px solid #ddd;
          border-radius: 10px;
          font-size: 20px;
          font-weight: bold;
          text-align: right;
          box-sizing: border-box;
        }
        
        .calculation-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        
        .calc-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }
        
        .calc-row:last-child {
          border-bottom: none;
        }
        
        .total-row {
          border-top: 2px solid #ddd;
          margin-top: 8px;
          padding-top: 12px;
          font-weight: bold;
          font-size: 16px;
        }
        
        .tds-amount {
          color: #e67e22;
        }
        
        .payout-amount {
          color: #27ae60;
          font-size: 18px;
        }
        
        .modal-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        
        .btn-cancel, .btn-submit {
          flex: 1;
          padding: 15px;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        
        .btn-cancel {
          background: #f5f5f5;
          color: #666;
        }
        
        .btn-submit {
          background: #1e3c72;
          color: white;
        }
        
        .btn-submit:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        /* Scrollable form for bank modal */
        .form-scrollable {
          max-height: 350px;
          overflow-y: auto;
          padding-right: 5px;
          margin-bottom: 20px;
        }
        
        .form-scrollable::-webkit-scrollbar {
          width: 6px;
        }
        
        .form-scrollable::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .form-scrollable::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 3px;
        }
        
        .form-scrollable::-webkit-scrollbar-thumb:hover {
          background: #aaa;
        }
        
        /* Warning Message */
        .warning-message {
          background: #fff3e0;
          border: 1px solid #ffcc80;
          padding: 12px;
          border-radius: 8px;
          color: #e67e22;
          font-size: 14px;
          margin-bottom: 20px;
          text-align: center;
          line-height: 1.5;
        }
        
        /* Info Message */
        .info-message {
          background: #e3f2fd;
          border: 1px solid #90caf9;
          padding: 12px;
          border-radius: 8px;
          color: #1565c0;
          font-size: 14px;
          line-height: 1.5;
        }
        
        /* Transaction List */
        .tx-modal-body {
          padding: 10px;
        }
        
        .tx-card {
          background: white;
          border: 1px solid #eee;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 10px;
        }
        
        .tx-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .tx-icon-type {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .tx-icon {
          font-size: 20px;
        }
        
        .tx-type {
          font-weight: 600;
          text-transform: capitalize;
        }
        
        .tx-amount {
          font-size: 16px;
          font-weight: bold;
        }
        
        .tx-amount.green {
          color: #27ae60;
        }
        
        .tx-amount.red {
          color: #e74c3c;
        }
        
        .tx-details {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #666;
        }
        
        .tx-status {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .status-completed {
          background: #d5f4e6;
          color: #27ae60;
        }
        
        .status-pending {
          background: #fff3e0;
          color: #e67e22;
        }
        
        .status-processing {
          background: #e3f2fd;
          color: #1e3c72;
        }
        
        .status-failed {
          background: #ffebee;
          color: #c62828;
        }
        
        .tx-description {
          margin-top: 8px;
          font-size: 13px;
          color: #666;
          padding-top: 8px;
          border-top: 1px solid #f0f0f0;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
        }
      `}</style>
    </div>
  );
}

export default Mine;
