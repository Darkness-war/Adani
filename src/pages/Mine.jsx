import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import '../styles/style.css';

function Mine() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState({
    name: '',
    account: '',
    confirmAccount: '',
    ifsc: '',
    upi: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadUserProfile();
    loadTransactions();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    setUser(session.user);
  };

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserProfile(profile);
        setBalance(profile.balance || 0);
        
        // Load bank details if exists
        if (profile.bank_account) {
          setBankDetails({
            name: profile.name || '',
            account: profile.bank_account || '',
            confirmAccount: profile.bank_account || '',
            ifsc: profile.bank_ifsc || '',
            upi: profile.upi_id || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(withdrawAmount) < 130) {
      alert('Minimum withdrawal amount is ₹130');
      return;
    }

    if (parseFloat(withdrawAmount) > balance) {
      alert('Insufficient balance');
      return;
    }

    if (!userProfile?.bank_account) {
      alert('Please add bank details first');
      setShowWithdrawModal(false);
      setShowBankModal(true);
      return;
    }

    try {
      const tds = withdrawAmount * 0.18;
      const payout = withdrawAmount - tds;

      // Create withdrawal request
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          user_email: user.email,
          amount: parseFloat(withdrawAmount),
          tds: tds,
          payout_amount: payout,
          bank_name: userProfile.bank_name,
          bank_account: userProfile.bank_account,
          bank_ifsc: userProfile.bank_ifsc,
          upi_id: userProfile.upi_id,
          status: 'pending'
        });

      if (error) throw error;

      // Update user balance
      const newBalance = balance - parseFloat(withdrawAmount);
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id);

      // Add transaction record
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: -parseFloat(withdrawAmount),
          type: 'withdrawal',
          description: `Withdrawal request of ₹${withdrawAmount}`,
          status: 'pending'
        });

      setBalance(newBalance);
      setWithdrawAmount('');
      setShowWithdrawModal(false);
      alert('Withdrawal request submitted successfully!');
      loadTransactions();
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Withdrawal failed: ' + error.message);
    }
  };

  const handleBankDetails = async (e) => {
    e.preventDefault();
    
    if (bankDetails.account !== bankDetails.confirmAccount) {
      alert('Account numbers do not match');
      return;
    }

    if (!bankDetails.ifsc.match(/^[A-Za-z]{4}0[A-Z0-9]{6}$/)) {
      alert('Invalid IFSC code format');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: bankDetails.name,
          bank_account: bankDetails.account,
          bank_ifsc: bankDetails.ifsc.toUpperCase(),
          upi_id: bankDetails.upi,
          bank_details_updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Bank details saved successfully');
      setShowBankModal(false);
      loadUserProfile();
    } catch (error) {
      console.error('Bank details error:', error);
      alert('Failed to save bank details: ' + error.message);
    }
  };

  const handleChangePassword = async () => {
    const currentPassword = prompt('Enter current password:');
    if (!currentPassword) return;

    const newPassword = prompt('Enter new password (min 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const confirmPassword = prompt('Confirm new password:');
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      // First verify current password
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      alert('Password changed successfully');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'deposit': return '💰';
      case 'withdrawal': return '🏦';
      case 'plan_purchase': return '📈';
      case 'referral_commission': return '👥';
      case 'daily_profit': return '📊';
      default: return '💳';
    }
  };

  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="My Account" />
      
      <main className="mine-page">
        {/* Profile Header */}
        <div className="card profile-header-card">
          <div className="profile-avatar">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <div id="profileId" className="profile-id">
              ID: {user?.id?.substring(0, 8) || 'Loading...'}
            </div>
            <div id="profileEmail" className="profile-email">
              {user?.email || 'Loading...'}
            </div>
            <div className="profile-vip">
              {userProfile?.vip_level ? `VIP Level ${userProfile.vip_level}` : 'Standard User'}
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="card balance-card">
          <div className="balance-label">Available Balance</div>
          <div id="profileBalance" className="balance-amount">
            ₹{balance.toFixed(2)}
          </div>
          <div className="action-buttons">
            <button 
              id="withdrawBtn" 
              className="action-btn"
              onClick={() => setShowWithdrawModal(true)}
            >
              <span>⬆️</span>Withdraw
            </button>
            <button 
              id="rechargeBtn" 
              className="action-btn"
              onClick={() => navigate('/recharge')}
            >
              <span>⬇️</span>Recharge
            </button>
          </div>
        </div>

        {/* Account Summary */}
        <div className="card summary-card">
          <h3>Account Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">Total Deposits</div>
              <div className="summary-value">
                ₹{userProfile?.total_deposits?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Total Withdrawals</div>
              <div className="summary-value">
                ₹{userProfile?.total_withdrawals?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Referral Earnings</div>
              <div className="summary-value">
                ₹{userProfile?.referral_earnings?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Active Plans</div>
              <div className="summary-value">
                {userProfile?.active_plans || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Menu Options */}
        <div className="card options-list-card">
          <a href="#" className="option-item" onClick={(e) => { e.preventDefault(); setShowBankModal(true); }}>
            <div className="option-icon">🏦</div>
            <span>Bank Account Details</span>
            <div className="option-chevron">&gt;</div>
          </a>
          
          <a href="#" className="option-item" onClick={(e) => { e.preventDefault(); setShowTransactionModal(true); }}>
            <div className="option-icon">📜</div>
            <span>Transaction History</span>
            <div className="option-chevron">&gt;</div>
          </a>
          
          <a href="#" className="option-item" onClick={(e) => { e.preventDefault(); handleChangePassword(); }}>
            <div className="option-icon">🔒</div>
            <span>Change Password</span>
            <div className="option-chevron">&gt;</div>
          </a>
          
          <a href="#" className="option-item" onClick={(e) => { e.preventDefault(); navigate('/refer'); }}>
            <div className="option-icon">👥</div>
            <span>Referral System</span>
            <div className="option-chevron">&gt;</div>
          </a>
        </div>

        {/* Logout Button */}
        <div className="card logout-card">
          <button id="logoutBtn" className="logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </main>

      <div className="bottom-nav-spacer"></div>
      <BottomNav active="mine" />

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="modal-overlay" id="txModalOverlay" onClick={() => setShowTransactionModal(false)}></div>
      )}
      {showTransactionModal && (
        <div className="modal-container" id="txModalContainer">
          <div className="modal-header">
            <h3>Transaction History</h3>
            <button id="txModalCloseBtn" onClick={() => setShowTransactionModal(false)}>&times;</button>
          </div>
          <div className="modal-content">
            {transactions.length === 0 ? (
              <p className="no-transactions">No transactions found</p>
            ) : (
              transactions.map((tx, index) => (
                <div key={index} className="transaction-item modern">
                  <div className="transaction-icon">
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-type">{tx.description}</div>
                    <div className="transaction-info">
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={`transaction-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                    {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bank Modal */}
      {showBankModal && (
        <div className="modal-overlay" id="bankModalOverlay" onClick={() => setShowBankModal(false)}></div>
      )}
      {showBankModal && (
        <div className="modal-container" id="bankModalContainer">
          <div className="modal-header">
            <h3>Bank Account Details</h3>
            <button id="bankModalCloseBtn" onClick={() => setShowBankModal(false)}>&times;</button>
          </div>
          <div className="modal-content">
            <form id="bankDetailsForm" onSubmit={handleBankDetails}>
              <div className="input-group icon-input">
                <label htmlFor="bankRealName">Your Full Name</label>
                <input 
                  type="text" 
                  id="bankRealName" 
                  value={bankDetails.name}
                  onChange={(e) => setBankDetails({...bankDetails, name: e.target.value})}
                  placeholder="Enter your full name" 
                  required 
                  minLength="3"
                  disabled={userProfile?.bank_account}
                />
              </div>
              
              <div className="input-group icon-input">
                <label htmlFor="bankAccount">Bank Account No.</label>
                <input 
                  type="text" 
                  id="bankAccount" 
                  value={bankDetails.account}
                  onChange={(e) => setBankDetails({...bankDetails, account: e.target.value})}
                  placeholder="Min. 9 digits" 
                  required 
                  pattern="[0-9]{9,18}"
                  disabled={userProfile?.bank_account}
                />
              </div>
              
              <div className="input-group icon-input">
                <label htmlFor="bankConfirmAccount">Confirm Account No.</label>
                <input 
                  type="text" 
                  id="bankConfirmAccount" 
                  value={bankDetails.confirmAccount}
                  onChange={(e) => setBankDetails({...bankDetails, confirmAccount: e.target.value})}
                  placeholder="Re-enter account number" 
                  required 
                  pattern="[0-9]{9,18}"
                  disabled={userProfile?.bank_account}
                />
              </div>
              
              <div className="input-group icon-input">
                <label htmlFor="bankIFSC">IFSC Code</label>
                <input 
                  type="text" 
                  id="bankIFSC" 
                  value={bankDetails.ifsc}
                  onChange={(e) => setBankDetails({...bankDetails, ifsc: e.target.value.toUpperCase()})}
                  placeholder="E.g., SBIN0001234" 
                  required 
                  pattern="[A-Za-z]{4}0[A-Z0-9]{6}"
                  disabled={userProfile?.bank_account}
                />
              </div>
              
              <div className="input-group icon-input">
                <label htmlFor="bankUPI">UPI ID (Optional)</label>
                <input 
                  type="text" 
                  id="bankUPI" 
                  value={bankDetails.upi}
                  onChange={(e) => setBankDetails({...bankDetails, upi: e.target.value})}
                  placeholder="E.g., user@bank" 
                  pattern="[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}"
                  disabled={userProfile?.bank_account}
                />
              </div>
              
              {userProfile?.bank_account && (
                <div className="form-locked-info" style={{ display: 'block' }}>
                  Bank details are locked. If you want to change bank details please contact support.
                </div>
              )}
              
              {!userProfile?.bank_account && (
                <button type="submit" className="submit-btn" id="saveBankBtn">
                  Save Bank Details
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay" id="withdrawModalOverlay" onClick={() => setShowWithdrawModal(false)}></div>
      )}
      {showWithdrawModal && (
        <div className="modal-container" id="withdrawModalContainer">
          <div className="modal-header">
            <h3>Withdrawal Request</h3>
            <button id="withdrawModalCloseBtn" onClick={() => setShowWithdrawModal(false)}>&times;</button>
          </div>
          <div className="modal-content">
            <form id="withdrawForm" onSubmit={handleWithdraw}>
              <div className="withdraw-balance-display">
                <span>Available Balance</span>
                <strong id="withdrawBalance">₹{balance.toFixed(2)}</strong>
              </div>
              
              <div className="input-group">
                <label htmlFor="withdrawAmount">Amount to Withdraw</label>
                <input 
                  type="number" 
                  id="withdrawAmount" 
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount" 
                  required 
                  min="130" 
                  step="1"
                />
              </div>
              
              <div className="withdraw-info">
                <p>Minimum Withdrawal: <strong>₹130.00</strong></p>
                <p>TDS (18%): <strong>₹{(withdrawAmount * 0.18).toFixed(2)}</strong></p>
                <p>You Will Receive: <strong>₹{(withdrawAmount - (withdrawAmount * 0.18)).toFixed(2)}</strong></p>
              </div>
              
              <button type="submit" className="submit-btn" id="submitWithdrawBtn">
                Submit Withdrawal Request
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default Mine;
