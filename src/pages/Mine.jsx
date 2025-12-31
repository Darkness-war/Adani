import { useEffect, useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import { supabase } from '../lib/supabase';
import '../styles/Mine.css';

function Mine() {
  const [profile, setProfile] = useState(null);
  const [bankDetails, setBankDetails] = useState({
    name: '',
    bank_account: '',
    bank_ifsc: '',
    upi_id: ''
  });
  const [withdrawal, setWithdrawal] = useState({
    amount: '',
    tds: 0,
    payout: 0
  });
  const [modalOpen, setModalOpen] = useState({
    withdraw: false,
    bank: false,
    transactions: false
  });
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadUserProfile();
    loadTransactions();
  }, []);

  async function loadUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setProfile(profile);
        setBankDetails({
          name: profile.name || '',
          bank_account: profile.bank_account || '',
          bank_ifsc: profile.bank_ifsc || '',
          upi_id: profile.upi_id || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  async function loadTransactions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all types of transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txError) throw txError;

      // Get withdrawal requests
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (withdrawalError) throw withdrawalError;

      // Combine and format all transactions
      const allTransactions = [
        ...(txData || []).map(tx => ({
          ...tx,
          type: tx.type || 'transaction',
          displayType: tx.type?.toUpperCase() || 'TRANSACTION'
        })),
        ...(withdrawalData || []).map(wd => ({
          ...wd,
          id: wd.id,
          amount: -wd.amount,
          type: 'withdrawal',
          displayType: 'WITHDRAWAL',
          description: `Withdrawal Request`,
          status: wd.status,
          created_at: wd.created_at,
          order_id: wd.id
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  }

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please login first');
        return;
      }

      const amount = parseFloat(withdrawal.amount);
      
      // Validation
      if (amount < 130) {
        alert('Minimum withdrawal amount is ₹130');
        return;
      }

      if (!profile?.bank_account || !profile?.bank_ifsc) {
        alert('Please add bank details first');
        setModalOpen({ withdraw: false, bank: true });
        return;
      }

      if (profile.balance < amount) {
        alert('Insufficient balance');
        return;
      }

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
          upi_id: profile.upi_id,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (withdrawError) throw withdrawError;

      // Update user balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance - amount })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      alert('✅ Withdrawal request submitted successfully!');
      setModalOpen({ ...modalOpen, withdraw: false });
      loadUserProfile();
      loadTransactions();
      setWithdrawal({ amount: '', tds: 0, payout: 0 });
      
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBankDetailsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const formData = new FormData(e.target);
      const account = formData.get('bankAccount');
      const confirmAccount = formData.get('bankConfirmAccount');

      if (account !== confirmAccount) {
        alert('Account numbers do not match');
        return;
      }

      // Check if bank details already exist and are locked
      if (profile?.bank_details_updated_at) {
        const updateDate = new Date(profile.bank_details_updated_at);
        const daysSinceUpdate = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 7) {
          alert('❌ Bank details can only be updated once every 7 days. If you made a mistake, please contact HR/support.');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.get('bankRealName'),
          bank_account: account,
          bank_ifsc: formData.get('bankIFSC').toUpperCase(),
          upi_id: formData.get('bankUPI'),
          bank_details_updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('✅ Bank details saved successfully!\n\n⚠️ Note: Bank details can only be updated once every 7 days. If you made a mistake, contact HR/support immediately.');
      setModalOpen({ ...modalOpen, bank: false });
      loadUserProfile();
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateWithdrawal = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    const tds = numAmount * 0.18;
    const payout = numAmount - tds;
    
    setWithdrawal({
      amount: amount,
      tds: tds,
      payout: payout
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('uid');
    window.location.href = '/login';
  };

  const handleChangePassword = async () => {
    const currentPassword = prompt('Enter current password:');
    if (!currentPassword) return;

    const newPassword = prompt('Enter new password:');
    const confirmPassword = prompt('Confirm new password:');

    if (!newPassword || !confirmPassword) {
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        alert('Current password is incorrect');
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      alert('✅ Password changed successfully!');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const isBankDetailsLocked = () => {
    if (!profile?.bank_details_updated_at) return false;
    const updateDate = new Date(profile.bank_details_updated_at);
    const daysSinceUpdate = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate < 7;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'status-completed';
      case 'success': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'failed': return 'status-failed';
      default: return 'status-completed';
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'deposit': return '💳';
      case 'withdrawal': return '💰';
      case 'bonus': return '🎁';
      case 'referral': return '👥';
      default: return '📄';
    }
  };

  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="My Account" />
      
      <main className="page-container mine-page">
        {/* Profile Header - Fixed with Name, ID, Email */}
        <div className="card profile-header-card">
          <div className="profile-info">
            <div className="profile-name">
              {profile?.name || profile?.email?.split('@')[0] || 'User'}
            </div>
            <div className="profile-id">
              ID: {profile?.id ? profile.id.slice(0, 10) + '...' : 'Loading...'}
            </div>
            <div className="profile-email">
              {profile?.email || 'Loading email...'}
            </div>
          </div>
        </div>
        
        {/* Balance Card with Buttons */}
        <div className="card balance-card">
          <div className="balance-label">Available Balance</div>
          <div className="balance-amount">
            ₹{profile?.balance?.toFixed(2) || '0.00'}
          </div>
          <div className="action-buttons">
            <button 
              className="action-btn withdraw-btn"
              onClick={() => setModalOpen({ ...modalOpen, withdraw: true })}
            >
              <span>💰</span> Withdraw
            </button>
            <button 
              className="action-btn recharge-btn"
              onClick={() => window.location.href = '/recharge'}
            >
              <span>💳</span> Recharge
            </button>
          </div>
        </div>
        
        {/* Options List */}
        <div className="card options-list-card">
          <div 
            className="option-item" 
            onClick={() => setModalOpen({ ...modalOpen, bank: true })}
          >
            <div className="option-icon">🏦</div>
            <div className="option-text">Bank Account Details</div>
            <div>&gt;</div>
          </div>
          
          <div 
            className="option-item"
            onClick={() => setModalOpen({ ...modalOpen, transactions: true })}
          >
            <div className="option-icon">📜</div>
            <div className="option-text">Transaction History</div>
            <div>&gt;</div>
          </div>
          
          <div 
            className="option-item" 
            onClick={handleChangePassword}
          >
            <div className="option-icon">🔒</div>
            <div className="option-text">Change Password</div>
            <div>&gt;</div>
          </div>
        </div>
        
        {/* Logout Button */}
        <div className="card logout-card">
          <button 
            className="logout-btn"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="mine" />
      
      {/* Modern Withdrawal Modal */}
      {modalOpen.withdraw && (
        <div className="modal-overlay active" onClick={() => setModalOpen({ ...modalOpen, withdraw: false })}></div>
      )}
      <div className={`modal-container ${modalOpen.withdraw ? 'active' : ''}`}>
        <div className="modal-header">
          <h3>Withdrawal Request</h3>
          <button onClick={() => setModalOpen({ ...modalOpen, withdraw: false })}>&times;</button>
        </div>
        <div className="modal-content">
          <div className="balance-display">
            <span className="balance-label">Available Balance</span>
            <span className="balance-value">₹{profile?.balance?.toFixed(2) || '0.00'}</span>
          </div>
          
          <form onSubmit={handleWithdrawalSubmit} className="withdrawal-form">
            <div className="form-group">
              <label htmlFor="withdrawAmount">Enter Amount (Min: ₹130)</label>
              <div className="amount-input">
                <span className="currency">₹</span>
                <input
                  type="number"
                  id="withdrawAmount"
                  value={withdrawal.amount}
                  onChange={(e) => calculateWithdrawal(e.target.value)}
                  placeholder="0.00"
                  min="130"
                  step="1"
                  required
                />
              </div>
            </div>
            
            <div className="withdrawal-calculations">
              <div className="calculation-row">
                <span>Withdrawal Amount</span>
                <span>₹{withdrawal.amount || '0.00'}</span>
              </div>
              <div className="calculation-row">
                <span>TDS (18%)</span>
                <span className="tds-amount">- ₹{withdrawal.tds.toFixed(2)}</span>
              </div>
              <div className="calculation-row total">
                <span>You Will Receive</span>
                <span className="payout-amount">₹{withdrawal.payout.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setModalOpen({ ...modalOpen, withdraw: false })}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading || !withdrawal.amount || parseFloat(withdrawal.amount) < 130 || parseFloat(withdrawal.amount) > (profile?.balance || 0)}
              >
                {loading ? 'Processing...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Bank Details Modal with 7-day lock */}
      {modalOpen.bank && (
        <div className="modal-overlay active" onClick={() => setModalOpen({ ...modalOpen, bank: false })}></div>
      )}
      <div className={`modal-container ${modalOpen.bank ? 'active' : ''}`}>
        <div className="modal-header">
          <h3>Bank Account Details</h3>
          <button onClick={() => setModalOpen({ ...modalOpen, bank: false })}>&times;</button>
        </div>
        <div className="modal-content">
          {isBankDetailsLocked() && (
            <div className="warning-message">
              ⚠️ <strong>Bank details are locked for 7 days after update.</strong><br/>
              If you made a mistake, please contact HR/support immediately.
            </div>
          )}
          
          <form onSubmit={handleBankDetailsSubmit} className="bank-form">
            <div className="form-group">
              <label htmlFor="bankRealName">Account Holder Name *</label>
              <input
                type="text"
                id="bankRealName"
                name="bankRealName"
                placeholder="Enter your full name as per bank"
                defaultValue={bankDetails.name}
                required
                minLength="3"
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bankAccount">Bank Account Number *</label>
              <input
                type="text"
                id="bankAccount"
                name="bankAccount"
                placeholder="Enter 9-18 digit account number"
                defaultValue={bankDetails.bank_account}
                required
                pattern="[0-9]{9,18}"
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bankConfirmAccount">Confirm Account Number *</label>
              <input
                type="text"
                id="bankConfirmAccount"
                name="bankConfirmAccount"
                placeholder="Re-enter account number"
                defaultValue={bankDetails.bank_account}
                required
                pattern="[0-9]{9,18}"
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bankIFSC">IFSC Code *</label>
              <input
                type="text"
                id="bankIFSC"
                name="bankIFSC"
                placeholder="E.g., SBIN0001234"
                defaultValue={bankDetails.bank_ifsc}
                required
                pattern="[A-Za-z]{4}0[A-Z0-9]{6}"
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bankUPI">UPI ID (Optional)</label>
              <input
                type="text"
                id="bankUPI"
                name="bankUPI"
                placeholder="E.g., username@upi"
                defaultValue={bankDetails.upi_id}
                pattern="[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}"
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="warning-message">
              ⚠️ <strong>Important:</strong> Bank details can only be updated once every 7 days.<br/>
              Please verify all details before submitting. If incorrect, contact HR/support.
            </div>
            
            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setModalOpen({ ...modalOpen, bank: false })}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading || isBankDetailsLocked()}
              >
                {loading ? 'Saving...' : 'Save Bank Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
           {/* Transaction History Modal - Same style as withdrawal */}
      {modalOpen.transactions && (
        <div className="modal-overlay active" onClick={() => setModalOpen({ ...modalOpen, transactions: false })}></div>
      )}
      <div className={`modal-container ${modalOpen.transactions ? 'active' : ''}`}>
        <div className="modal-header">
          <h3>Transaction History</h3>
          <button onClick={() => setModalOpen({ ...modalOpen, transactions: false })}>&times;</button>
        </div>
        <div className="modal-content transaction-history-modal">
          {transactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="transactions-list">
              {transactions.map(tx => (
                <div 
                  key={`${tx.type}-${tx.id}`} 
                  className="transaction-card"
                  onClick={() => window.location.href = `/transactions/${tx.id}`}
                >
                  <div className="transaction-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="transaction-icon">{getTypeIcon(tx.type)}</span>
                      <div className="transaction-type">{tx.displayType}</div>
                    </div>
                    <div className={`transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                      {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="transaction-details">
                    <div className="transaction-date">
                      {formatDate(tx.created_at)}
                    </div>
                    <div className={`transaction-status ${getStatusColor(tx.status)}`}>
                      {tx.status || 'completed'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Mine;
```
