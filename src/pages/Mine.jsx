import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import { supabase } from '../lib/supabase';

function Mine() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  
  // Modals State
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Form States
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankForm, setBankForm] = useState({
    name: '', account: '', ifsc: '', upi: ''
  });
  const [isBankLocked, setIsBankLocked] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setUser(user);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(profileData);

    // Setup Bank Form
    if (profileData) {
      setBankForm({
        name: profileData.name || '',
        account: profileData.bank_account || '',
        ifsc: profileData.bank_ifsc || '',
        upi: profileData.upi_id || ''
      });
      // Lock if account details exist
      if (profileData.bank_account && profileData.bank_account.length > 5) {
        setIsBankLocked(true);
      }
    }

    // Load Transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (txData) setTransactions(txData);
  }

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    if (isBankLocked) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        name: bankForm.name,
        bank_account: bankForm.account,
        bank_ifsc: bankForm.ifsc.toUpperCase(),
        upi_id: bankForm.upi,
        bank_details_updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      alert(error.message);
    } else {
      alert('Bank details saved! They are now locked.');
      setIsBankLocked(true);
      setShowBank(false);
      loadData();
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);

    if (amount < 130) return alert('Minimum withdrawal is ₹130');
    if (amount > profile.balance) return alert('Insufficient balance');
    if (!profile.bank_account) return alert('Please add bank details first');

    const tds = amount * 0.18; // 18% TDS (Check if this is correct for your logic)
    const payout = amount - tds;

    const { error } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        user_email: user.email,
        amount: amount,
        tds: tds,
        payout_amount: payout,
        bank_details: `${profile.bank_account} | ${profile.bank_ifsc}`,
        status: 'pending'
      });

    if (!error) {
      // Deduct balance immediately
      await supabase.from('profiles').update({ balance: profile.balance - amount }).eq('id', user.id);
      
      // Add record to transactions table for history visibility
      await supabase.from('transactions').insert({
        user_id: user.id,
        amount: -amount,
        type: 'withdrawal',
        status: 'pending',
        description: 'Withdrawal Request'
      });

      alert('Withdrawal request submitted');
      setShowWithdraw(false);
      loadData();
    } else {
      alert(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate('/login');
  };

  return (
    <>
      <Sidebar />
      <TopBar title="My Account" />
      
      <main className="page-container">
        {/* PROFILE HEADER */}
        <div className="card profile-header-card">
          <div className="profile-avatar">👤</div>
          <div className="profile-info">
            <div className="profile-name">{profile?.name || 'User'}</div>
            <div className="profile-id">ID: {user?.id.slice(0, 8)}</div>
            <div className="profile-email">{user?.email}</div>
          </div>
        </div>
        
        {/* BALANCE CARD */}
        <div className="card balance-card">
          <div className="balance-label">Available Balance</div>
          <div className="balance-amount">₹{profile?.balance?.toFixed(2) || '0.00'}</div>
          <div className="action-buttons">
            <button onClick={() => setShowWithdraw(true)} className="action-btn"><span>⬆️</span>Withdraw</button>
            <button onClick={() => navigate('/recharge')} className="action-btn"><span>⬇️</span>Recharge</button>
          </div>
        </div>
        
        {/* MENU OPTIONS */}
        <div className="card options-list-card">
          <div className="option-item" onClick={() => setShowBank(true)}>
            <div className="option-icon">🏦</div>
            <span>Bank Account Details</span>
            <div className="option-chevron">&gt;</div>
          </div>
          
          <div className="option-item" onClick={() => setShowHistory(true)}>
            <div className="option-icon">📜</div>
            <span>Transaction History</span>
            <div className="option-chevron">&gt;</div>
          </div>
          
          <div className="option-item" onClick={async () => {
             // Simple password reset trigger
             const email = prompt("Enter your email to send password reset link:");
             if(email) {
               const { error } = await supabase.auth.resetPasswordForEmail(email);
               alert(error ? error.message : "Password reset email sent!");
             }
          }}>
            <div className="option-icon">🔒</div>
            <span>Change Password</span>
            <div className="option-chevron">&gt;</div>
          </div>
        </div>
        
        <div className="card logout-card">
          <button onClick={handleLogout} className="logout-btn">Log Out</button>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="mine" />
      
      {/* --- MODALS --- */}

      {/* TRANSACTION HISTORY MODAL */}
      {showHistory && (
        <div className="modal-overlay active">
          <div className="modal-container active">
            <div className="modal-header">
              <h3>History</h3>
              <button onClick={() => setShowHistory(false)}>&times;</button>
            </div>
            <div className="modal-content scrollable">
              {transactions.length > 0 ? transactions.map(tx => (
                <div key={tx.id} className={`transaction-item ${tx.type}`}>
                  <div className="transaction-header">
                    <span className="transaction-type">{tx.type.toUpperCase()}</span>
                    <span className={`transaction-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                      {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount)}
                    </span>
                  </div>
                  <div className="transaction-details">
                    <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                    <span>{tx.status}</span>
                  </div>
                </div>
              )) : <p>No transactions found</p>}
            </div>
          </div>
        </div>
      )}
      
      {/* BANK DETAILS MODAL */}
      {showBank && (
        <div className="modal-overlay active">
          <div className="modal-container active">
            <div className="modal-header">
              <h3>Bank Details</h3>
              <button onClick={() => setShowBank(false)}>&times;</button>
            </div>
            <div className="modal-content">
              <form onSubmit={handleBankSubmit}>
                <div className="input-group">
                  <label>Real Name</label>
                  <input type="text" value={bankForm.name} 
                    onChange={e => setBankForm({...bankForm, name: e.target.value})}
                    readOnly={isBankLocked} required />
                </div>
                <div className="input-group">
                  <label>Account Number</label>
                  <input type="text" value={bankForm.account} 
                    onChange={e => setBankForm({...bankForm, account: e.target.value})}
                    readOnly={isBankLocked} required />
                </div>
                <div className="input-group">
                  <label>IFSC Code</label>
                  <input type="text" value={bankForm.ifsc} 
                    onChange={e => setBankForm({...bankForm, ifsc: e.target.value})}
                    readOnly={isBankLocked} required />
                </div>
                <div className="input-group">
                  <label>UPI ID</label>
                  <input type="text" value={bankForm.upi} 
                    onChange={e => setBankForm({...bankForm, upi: e.target.value})}
                    readOnly={isBankLocked} required />
                </div>
                
                {isBankLocked ? (
                  <div className="form-locked-info" style={{color: 'red', margin: '10px 0'}}>
                    Bank details are locked for security. Contact Admin to change.
                  </div>
                ) : (
                  <button type="submit" className="submit-btn">Save (Lock Forever)</button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdraw && (
        <div className="modal-overlay active">
          <div className="modal-container active">
            <div className="modal-header">
              <h3>Withdraw Funds</h3>
              <button onClick={() => setShowWithdraw(false)}>&times;</button>
            </div>
            <div className="modal-content">
              <form onSubmit={handleWithdrawSubmit}>
                <div className="withdraw-info">
                  <p>Balance: <strong>₹{profile?.balance.toFixed(2)}</strong></p>
                </div>
                <div className="input-group">
                  <label>Amount (Min 130)</label>
                  <input type="number" value={withdrawAmount} 
                    onChange={e => setWithdrawAmount(e.target.value)}
                    min="130" required />
                </div>
                {withdrawAmount > 0 && (
                  <div className="withdraw-calc">
                    <p>TDS (18%): ₹{(withdrawAmount * 0.18).toFixed(2)}</p>
                    <p>Receive: ₹{(withdrawAmount * 0.82).toFixed(2)}</p>
                  </div>
                )}
                <button type="submit" className="submit-btn">Submit Request</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Mine;
      
