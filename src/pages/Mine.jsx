import { useEffect, useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import { supabase } from '../lib/supabase';
import '../styles/Mine.css';

function Mine() {
  const [user, setUser] = useState(null);
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
    bank: false
  });
  const [loading, setLoading] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);

  useEffect(() => {
    loadUserProfile();
    loadWithdrawalHistory();
  }, []);

  async function loadUserProfile() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        window.location.href = '/login';
        return;
      }
      
      setUser(authUser);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

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

  async function loadWithdrawalHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setWithdrawalHistory(data || []);
    } catch (error) {
      console.error('Error loading withdrawal history:', error);
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

      alert('✅ Withdrawal request submitted successfully! It will be processed within 10-15 minutes.');
      setModalOpen({ ...modalOpen, withdraw: false });
      loadUserProfile();
      loadWithdrawalHistory();
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

      alert('✅ Bank details saved successfully!');
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
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        alert('Current password is incorrect');
        return;
      }

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

  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="My Account" />
      
      <main className="page-container mine-page">
        {/* Profile Header - Fixed Display */}
        <div className="card profile-header-card">
          <div className="profile-avatar">👤</div>
          <div className="profile-info">
            {user ? (
              <>
                <div className="profile-email">{user.email}</div>
                <div className="profile-id">ID: {user.id.slice(0, 8)}...</div>
              </>
            ) : (
              <>
                <div className="profile-email">Loading...</div>
                <div className="profile-id">ID: Loading...</div>
              </>
            )}
          </div>
        </div>
        
        {/* Balance Card */}
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
              <span>⬆️</span> Withdraw
            </button>
            <button 
              className="action-btn recharge-btn"
              onClick={() => window.location.href = '/recharge'}
            >
              <span>⬇️</span> Recharge
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
            <span>Bank Account Details</span>
            <div className="option-chevron">&gt;</div>
          </div>
          
          <a 
            href="/transactions" 
            className="option-item"
          >
            <div className="option-icon">📜</div>
            <span>Transaction History</span>
            <div className="option-chevron">&gt;</div>
          </a>
          
          <div 
            className="option-item" 
            onClick={handleChangePassword}
          >
            <div className="option-icon">🔒</div>
            <span>Change Password</span>
            <div className="option-chevron">&gt;</div>
          </div>
        </div>
        
        {/* Withdrawal History */}
        {withdrawalHistory.length > 0 && (
          <div className="card withdrawal-history-card">
            <h3 className="history-title">Recent Withdrawals</h3>
            <div className="withdrawal-list">
              {withdrawalHistory.map(wd => (
                <div key={wd.id} className="withdrawal-item">
                  <div className="withdrawal-header">
                    <span className="withdrawal-amount">₹{wd.amount.toFixed(2)}</span>
                    <span className={`withdrawal-status ${wd.status}`}>
                      {wd.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="withdrawal-details">
                    <span className="withdrawal-date">
                      {new Date(wd.created_at).toLocaleDateString()}
                    </span>
                    <span className="withdrawal-payout">
                      Payout: ₹{wd.payout_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
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
      
      {/* Withdrawal Modal */}
      {modalOpen.withdraw && (
        <div className="modal-overlay active" onClick={() => setModalOpen({ ...modalOpen, withdraw: false })}></div>
      )}
      <div className={`modal-container ${modalOpen.withdraw ? 'active' : ''}`}>
        <div className="modal-header">
          <h3>Withdrawal Request</h3>
          <button onClick={() => setModalOpen({ ...modalOpen, withdraw: false })}>&times;</button>
        </div>
        <div className="modal-content">
          <div className="withdraw-balance-display">
            <span>Available Balance</span>
            <strong>₹{profile?.balance?.toFixed(2) || '0.00'}</strong>
          </div>
          
          <form onSubmit={handleWithdrawalSubmit} className="withdrawal-form">
            <div className="input-group">
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
            
            <div className="withdraw-info">
              <p>Minimum Withdrawal: <strong>₹130.00</strong></p>
              <p>TDS (18%): <strong>₹{withdrawal.tds.toFixed(2)}</strong></p>
              <p>You Will Receive: <strong>₹{withdrawal.payout.toFixed(2)}</strong></p>
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
                className="submit-btn"
                disabled={loading || !withdrawal.amount || parseFloat(withdrawal.amount) < 130}
              >
                {loading ? 'Processing...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Bank Details Modal */}
      {modalOpen.bank && (
        <div className="modal-overlay active" onClick={() => setModalOpen({ ...modalOpen, bank: false })}></div>
      )}
      <div className={`modal-container ${modalOpen.bank ? 'active' : ''}`}>
        <div className="modal-header">
          <h3>Bank Account Details</h3>
          <button onClick={() => setModalOpen({ ...modalOpen, bank: false })}>&times;</button>
        </div>
        <div className="modal-content">
          <form onSubmit={handleBankDetailsSubmit} className="bank-form">
            <div className="input-group">
              <label htmlFor="bankRealName">Account Holder Name</label>
              <input
                type="text"
                id="bankRealName"
                name="bankRealName"
                placeholder="Enter your full name"
                defaultValue={bankDetails.name}
                required
                minLength="3"
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="bankAccount">Bank Account Number</label>
              <input
                type="text"
                id="bankAccount"
                name="bankAccount"
                placeholder="Min. 9 digits"
                defaultValue={bankDetails.bank_account}
                required
                pattern="[0-9]{9,18}"
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="bankConfirmAccount">Confirm Account Number</label>
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
            
            <div className="input-group">
              <label htmlFor="bankIFSC">IFSC Code</label>
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
            
            <div className="input-group">
              <label htmlFor="bankUPI">UPI ID (Optional)</label>
              <input
                type="text"
                id="bankUPI"
                name="bankUPI"
                placeholder="E.g., user@bank"
                defaultValue={bankDetails.upi_id}
                pattern="[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}"
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            {isBankDetailsLocked() && (
              <div className="form-locked-info">
                ⚠️ Bank details are locked for 7 days after update.
                Contact customer support to change them.
              </div>
            )}
            
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
                className="submit-btn"
                disabled={loading || isBankDetailsLocked()}
              >
                {loading ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default Mine;
