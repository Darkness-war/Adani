import { useEffect, useState } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import { supabase } from '../lib/supabase';

function Mine() {
  const [profile, setProfile] = useState(null);
  const [bankDetails, setBankDetails] = useState({
    name: '',
    bank_account: '',
    bank_ifsc: '',
    upi_id: ''
  });
  const [withdrawalInfo, setWithdrawalInfo] = useState({
    amount: '',
    tds: 0,
    payout: 0
  });
  const [modalOpen, setModalOpen] = useState({
    bank: false,
    withdraw: false,
    transactions: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
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
        // Update bank details form
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

  const handleBankDetailsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate account numbers match
      const accountInput = e.target.bankAccount.value;
      const confirmAccount = e.target.bankConfirmAccount.value;

      if (accountInput !== confirmAccount) {
        alert('Account numbers do not match');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: e.target.bankRealName.value,
          bank_account: accountInput,
          bank_ifsc: e.target.bankIFSC.value.toUpperCase(),
          upi_id: e.target.bankUPI.value,
          bank_details_updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      alert('Bank details saved successfully!');
      setModalOpen({ ...modalOpen, bank: false });
      loadUserProfile(); // Refresh profile
    } catch (error) {
      alert('Error saving bank details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please login first');
        return;
      }

      const amount = parseFloat(withdrawalInfo.amount);
      
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
          bank_name: profile.bank_name || 'Bank',
          bank_account: profile.bank_account,
          bank_ifsc: profile.bank_ifsc,
          upi_id: profile.upi_id,
          status: 'pending'
        });

      if (withdrawError) throw withdrawError;

      // Update user balance
      const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance - amount })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      alert('Withdrawal request submitted successfully! It will be processed within 24-48 hours.');
      setModalOpen({ ...modalOpen, withdraw: false });
      loadUserProfile(); // Refresh balance
      setWithdrawalInfo({ amount: '', tds: 0, payout: 0 });
    } catch (error) {
      alert('Error submitting withdrawal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateWithdrawal = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    const tds = numAmount * 0.18;
    const payout = numAmount - tds;
    
    setWithdrawalInfo({
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
    const newPassword = prompt('Enter new password:');
    const confirmPassword = prompt('Confirm new password:');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      // First verify current password
      const { data: { user } } = await supabase.auth.getUser();
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
      alert('Password changed successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
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
      
      <main className="page-container">
        <div className="card profile-header-card">
          <div className="profile-avatar">👤</div>
          <div className="profile-info">
            <div id="profileId" className="profile-id">
              ID: {profile?.id ? profile.id.slice(0, 8) + '...' : 'Loading...'}
            </div>
            <div id="profileEmail" className="profile-email">
              {profile?.email || 'Loading...'}
            </div>
          </div>
        </div>
        
        <div className="card balance-card">
          <div className="balance-label">Available Balance</div>
          <div id="profileBalance" className="balance-amount">
            ₹{profile?.balance?.toFixed(2) || '0.00'}
          </div>
          <div className="action-buttons">
            <button 
              id="withdrawBtn" 
              className="action-btn"
              onClick={() => setModalOpen({ ...modalOpen, withdraw: true })}
            >
              <span>⬆️</span>Withdraw
            </button>
            <button 
              id="rechargeBtn" 
              className="action-btn"
              onClick={() => window.location.href = '/recharge'}
            >
              <span>⬇️</span>Recharge
            </button>
          </div>
        </div>
        
        <div className="card options-list-card">
          <a 
            href="#" 
            className="option-item" 
            onClick={(e) => {
              e.preventDefault();
              setModalOpen({ ...modalOpen, bank: true });
            }}
          >
            <div className="option-icon">🏦</div>
            <span>Bank Account Details</span>
            <div className="option-chevron">&gt;</div>
          </a>
          
          <a 
            href="/transactions" 
            className="option-item"
          >
            <div className="option-icon">📜</div>
            <span>Transaction History</span>
            <div className="option-chevron">&gt;</div>
          </a>
          
          <a 
            href="#" 
            className="option-item" 
            onClick={(e) => {
              e.preventDefault();
              handleChangePassword();
            }}
          >
            <div className="option-icon">🔒</div>
            <span>Change Password</span>
            <div className="option-chevron">&gt;</div>
          </a>
        </div>
        
        <div className="card logout-card">
          <button 
            id="logoutBtn" 
            className="logout-btn"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="mine" />
      
      {/* Bank Details Modal */}
      <div className={`modal-overlay ${modalOpen.bank ? 'active' : ''}`} 
           onClick={() => setModalOpen({ ...modalOpen, bank: false })}></div>
      <div className={`modal-container ${modalOpen.bank ? 'active' : ''}`}>
        <div className="modal-header">
          <h3>Bank Account Details</h3>
          <button onClick={() => setModalOpen({ ...modalOpen, bank: false })}>&times;</button>
        </div>
        <div className="modal-content">
          <form id="bankDetailsForm" onSubmit={handleBankDetailsSubmit} noValidate>
            <div className="input-group icon-input">
              <label htmlFor="bankRealName">Your Real Name</label>
              <span className="input-icon">👤</span>
              <input 
                type="text" 
                id="bankRealName" 
                placeholder="Enter your full name" 
                required 
                minLength="3"
                defaultValue={bankDetails.name}
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="input-group icon-input">
              <label htmlFor="bankAccount">Bank Account No.</label>
              <span className="input-icon">🏦</span>
              <input 
                type="text" 
                id="bankAccount" 
                placeholder="Min. 9 digits" 
                required 
                pattern="[0-9]{9,18}"
                defaultValue={bankDetails.bank_account}
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="input-group icon-input">
              <label htmlFor="bankConfirmAccount">Confirm Account No.</label>
              <span className="input-icon">🏦</span>
              <input 
                type="text" 
                id="bankConfirmAccount" 
                placeholder="Re-enter account number" 
                required 
                pattern="[0-9]{9,18}"
                defaultValue={bankDetails.bank_account}
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="input-group icon-input">
              <label htmlFor="bankIFSC">IFSC Code</label>
              <span className="input-icon">💳</span>
              <input 
                type="text" 
                id="bankIFSC" 
                placeholder="E.g., SBIN0001234" 
                required 
                pattern="[A-Za-z]{4}0[A-Z0-9]{6}"
                defaultValue={bankDetails.bank_ifsc}
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            <div className="input-group icon-input">
              <label htmlFor="bankUPI">UPI ID (Optional)</label>
              <span className="input-icon">🌐</span>
              <input 
                type="text" 
                id="bankUPI" 
                placeholder="E.g., user@bank" 
                pattern="[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}"
                defaultValue={bankDetails.upi_id}
                disabled={isBankDetailsLocked()}
              />
            </div>
            
            {isBankDetailsLocked() && (
              <div className="form-locked-info">
                ⚠️ Bank details are locked for 7 days after update. 
                Contact customer support to change them.
              </div>
            )}
            
            <button 
              type="submit" 
              className="submit-btn" 
              id="saveBankBtn"
              disabled={loading || isBankDetailsLocked()}
            >
              {loading ? 'Saving...' : 'Save Details'}
            </button>
          </form>
        </div>
      </div>
      
      {/* Withdrawal Modal */}
      <div className={`modal-overlay ${modalOpen.withdraw ? 'active' : ''}`}
           onClick={() => setModalOpen({ ...modalOpen, withdraw: false })}></div>
      <div className={`modal-container ${modalOpen.withdraw ? 'active' : ''}`}>
        <div className="modal-header">
          <h3>Withdrawal</h3>
          <button onClick={() => setModalOpen({ ...modalOpen, withdraw: false })}>&times;</button>
        </div>
        <div className="modal-content">
          <form id="withdrawForm" onSubmit={handleWithdrawalSubmit} noValidate>
            <div className="withdraw-balance-display">
              <span>Available Balance</span>
              <strong id="withdrawBalance">₹{profile?.balance?.toFixed(2) || '0.00'}</strong>
            </div>
            
            <div className="input-group">
              <label htmlFor="withdrawAmount">Amount to Withdraw (Min: ₹130)</label>
              <input 
                type="number" 
                id="withdrawAmount" 
                placeholder="Enter amount" 
                required 
                min="130"
                step="1"
                value={withdrawalInfo.amount}
                onChange={(e) => calculateWithdrawal(e.target.value)}
              />
            </div>
            
            <div className="withdraw-info">
              <p>Minimum Withdrawal: <strong>₹130.00</strong></p>
              <p>TDS (18%): <strong id="withdrawTDS">₹{withdrawalInfo.tds.toFixed(2)}</strong></p>
              <p>You Will Receive: <strong id="withdrawReceive">₹{withdrawalInfo.payout.toFixed(2)}</strong></p>
            </div>
            
            <button 
              type="submit" 
              className="submit-btn" 
              id="submitWithdrawBtn"
              disabled={loading || !withdrawalInfo.amount || parseFloat(withdrawalInfo.amount) < 130}
            >
              {loading ? 'Processing...' : 'Submit Withdrawal Request'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Mine;
