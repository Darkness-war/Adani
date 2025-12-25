import { useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import { supabase } from '../lib/supabase';

function Mine() {
  useEffect(() => {
    loadUserProfile();
    setupEventListeners();
    
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        document.getElementById('profileId').textContent = `ID: ${user.id.slice(0, 8)}`;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('profileBalance').textContent = `₹${profile.balance.toFixed(2)}`;
        document.getElementById('withdrawBalance').textContent = `₹${profile.balance.toFixed(2)}`;
        
        document.getElementById('sidebarId').textContent = `ID: ${user.id.slice(0, 8)}`;
        document.getElementById('sidebarVIP').textContent = profile.vip_level ? `VIP ${profile.vip_level}` : 'Standard';
      }
    }
    
    function setupEventListeners() {
      // Withdraw button
      document.getElementById('withdrawBtn')?.addEventListener('click', () => {
        document.getElementById('withdrawModalOverlay').classList.add('active');
        document.getElementById('withdrawModalContainer').classList.add('active');
      });
      
      // Recharge button
      document.getElementById('rechargeBtn')?.addEventListener('click', () => {
        window.location.href = '/recharge';
      });
      
      // Bank details button
      document.getElementById('bankDetailsBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('bankModalOverlay').classList.add('active');
        document.getElementById('bankModalContainer').classList.add('active');
        loadBankDetails();
      });
      
      // Transaction history button
      document.getElementById('transactionHistoryBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('txModalOverlay').classList.add('active');
        document.getElementById('txModalContainer').classList.add('active');
        loadTransactionHistory();
      });
      
      // Change password button
      document.getElementById('changePasswordBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const currentPassword = prompt('Enter current password:');
        const newPassword = prompt('Enter new password:');
        const confirmPassword = prompt('Confirm new password:');
        
        if (newPassword !== confirmPassword) {
          alert('Passwords do not match');
          return;
        }
        
        try {
          const { error } = await supabase.auth.updateUser({
            password: newPassword
          });
          
          if (error) throw error;
          alert('Password changed successfully');
        } catch (error) {
          alert('Error: ' + error.message);
        }
      });
      
      // Logout button
      document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('uid');
        window.location.href = '/login';
      });
      
      // Modal close buttons
      document.getElementById('txModalCloseBtn')?.addEventListener('click', closeTransactionModal);
      document.getElementById('bankModalCloseBtn')?.addEventListener('click', closeBankModal);
      document.getElementById('withdrawModalCloseBtn')?.addEventListener('click', closeWithdrawModal);
      
      // Modal overlays
      document.getElementById('txModalOverlay')?.addEventListener('click', closeTransactionModal);
      document.getElementById('bankModalOverlay')?.addEventListener('click', closeBankModal);
      document.getElementById('withdrawModalOverlay')?.addEventListener('click', closeWithdrawModal);
      
      // Withdraw amount calculation
      const withdrawAmountInput = document.getElementById('withdrawAmount');
      if (withdrawAmountInput) {
        withdrawAmountInput.addEventListener('input', calculateWithdrawal);
      }
      
      // Withdraw form submission
      document.getElementById('withdrawForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          alert('Please login first');
          return;
        }
        
        // Check minimum amount
        if (amount < 130) {
          alert('Minimum withdrawal amount is ₹130');
          return;
        }
        
        // Check user balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance, bank_account, bank_ifsc, upi_id')
          .eq('id', user.id)
          .single();
        
        if (!profile.bank_account || !profile.bank_ifsc) {
          alert('Please add bank details first');
          closeWithdrawModal();
          document.getElementById('bankDetailsBtn').click();
          return;
        }
        
        if (profile.balance < amount) {
          alert('Insufficient balance');
          return;
        }
        
        const tds = amount * 0.18;
        const payout = amount - tds;
        
        try {
          // Create withdrawal request
          const { error } = await supabase
            .from('withdrawal_requests')
            .insert({
              user_id: user.id,
              user_email: user.email,
              amount: amount,
              tds: tds,
              payout_amount: payout,
              bank_name: profile.bank_name,
              bank_account: profile.bank_account,
              bank_ifsc: profile.bank_ifsc,
              upi_id: profile.upi_id,
              status: 'pending'
            });
          
          if (error) throw error;
          
          // Deduct from user balance
          await supabase
            .from('profiles')
            .update({ balance: profile.balance - amount })
            .eq('id', user.id);
          
          alert('Withdrawal request submitted successfully');
          closeWithdrawModal();
          loadUserProfile(); // Refresh balance
          
        } catch (error) {
          alert('Error: ' + error.message);
        }
      });
      
      // Bank details form
      document.getElementById('bankDetailsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const realName = document.getElementById('bankRealName').value;
        const account = document.getElementById('bankAccount').value;
        const confirmAccount = document.getElementById('bankConfirmAccount').value;
        const ifsc = document.getElementById('bankIFSC').value.toUpperCase();
        const upi = document.getElementById('bankUPI').value;
        
        if (account !== confirmAccount) {
          alert('Account numbers do not match');
          return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              name: realName,
              bank_account: account,
              bank_ifsc: ifsc,
              upi_id: upi,
              bank_details_updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (error) throw error;
          
          alert('Bank details saved successfully');
          closeBankModal();
          
        } catch (error) {
          alert('Error: ' + error.message);
        }
      });
    }
    
    async function loadBankDetails() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, bank_account, bank_ifsc, upi_id, bank_details_updated_at')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        document.getElementById('bankRealName').value = profile.name || '';
        document.getElementById('bankAccount').value = profile.bank_account || '';
        document.getElementById('bankConfirmAccount').value = profile.bank_account || '';
        document.getElementById('bankIFSC').value = profile.bank_ifsc || '';
        document.getElementById('bankUPI').value = profile.upi_id || '';
        
        // If bank details already exist and were updated more than 7 days ago, lock them
        if (profile.bank_details_updated_at) {
          const updateDate = new Date(profile.bank_details_updated_at);
          const daysSinceUpdate = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceUpdate < 7) {
            document.getElementById('bankDetailsForm').querySelectorAll('input').forEach(input => {
              input.disabled = true;
            });
            document.getElementById('saveBankBtn').disabled = true;
            document.getElementById('bankDetailsLockedInfo').style.display = 'block';
          }
        }
      }
    }
    
    async function loadTransactionHistory() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      const content = document.getElementById('txModalContent');
      if (content && transactions) {
        content.innerHTML = transactions.map(tx => `
          <div class="transaction-item ${tx.type}">
            <div class="transaction-header">
              <span class="transaction-type">${tx.type}</span>
              <span class="transaction-amount ${tx.amount > 0 ? 'positive' : 'negative'}">
                ${tx.amount > 0 ? '+' : ''}₹${Math.abs(tx.amount).toFixed(2)}
              </span>
            </div>
            <div class="transaction-details">
              <span>${new Date(tx.created_at).toLocaleString()}</span>
              <span>${tx.status || 'completed'}</span>
            </div>
            <div class="transaction-note">${tx.description || ''}</div>
          </div>
        `).join('') || '<p>No transactions found</p>';
      }
    }
    
    function calculateWithdrawal() {
      const amount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
      const tds = amount * 0.18;
      const payout = amount - tds;
      
      document.getElementById('withdrawTDS').textContent = `₹${tds.toFixed(2)}`;
      document.getElementById('withdrawReceive').textContent = `₹${payout.toFixed(2)}`;
    }
    
    function closeTransactionModal() {
      document.getElementById('txModalOverlay').classList.remove('active');
      document.getElementById('txModalContainer').classList.remove('active');
    }
    
    function closeBankModal() {
      document.getElementById('bankModalOverlay').classList.remove('active');
      document.getElementById('bankModalContainer').classList.remove('active');
    }
    
    function closeWithdrawModal() {
      document.getElementById('withdrawModalOverlay').classList.remove('active');
      document.getElementById('withdrawModalContainer').classList.remove('active');
    }
  }, []);
  
  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="My Account" />
      
      <main className="page-container">
        <div className="card profile-header-card">
          <div className="profile-avatar">👤</div>
          <div className="profile-info">
            <div id="profileId">ID: Loading...</div>
            <div id="profileEmail">Loading email...</div>
          </div>
        </div>
        
        <div className="card balance-card">
          <div className="balance-label">Available Balance</div>
          <div id="profileBalance" className="balance-amount">₹0.00</div>
          <div className="action-buttons">
            <button id="withdrawBtn" className="action-btn"><span>⬆️</span>Withdraw</button>
            <button id="rechargeBtn" className="action-btn"><span>⬇️</span>Recharge</button>
          </div>
        </div>
        
        <div className="card options-list-card">
          <a href="#" className="option-item" id="bankDetailsBtn">
            <div className="option-icon">🏦</div>
            <span>Bank Account Details</span>
            <div className="option-chevron">&gt;</div>
          </a>
          
          <a href="#" className="option-item" id="transactionHistoryBtn">
            <div className="option-icon">📜</div>
            <span>Transaction History</span>
            <div className="option-chevron">&gt;</div>
          </a>
          
          <a href="#" className="option-item" id="changePasswordBtn">
            <div className="option-icon">🔒</div>
            <span>Change Password</span>
            <div className="option-chevron">&gt;</div>
          </a>
        </div>
        
        <div className="card logout-card">
          <button id="logoutBtn" className="logout-btn">Log Out</button>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="mine" />
      
      {/* Modals */}
      <div className="modal-overlay" id="txModalOverlay"></div>
      <div className="modal-container" id="txModalContainer">
        <div className="modal-header">
          <h3>Transaction History</h3>
          <button id="txModalCloseBtn">&times;</button>
        </div>
        <div className="modal-content" id="txModalContent">
          <p>Loading transactions...</p>
        </div>
      </div>
      
      <div className="modal-overlay" id="bankModalOverlay"></div>
      <div className="modal-container" id="bankModalContainer">
        <div className="modal-header">
          <h3>Bank Account Details</h3>
          <button id="bankModalCloseBtn">&times;</button>
        </div>
        <div className="modal-content" id="bankModalContent">
          <form id="bankDetailsForm" noValidate>
            <div className="input-group icon-input">
              <label htmlFor="bankRealName">Your Real Name</label>
              <span className="input-icon">👤</span>
              <input type="text" id="bankRealName" placeholder="Enter your full name" required minLength="3" />
            </div>
            
            <div className="input-group icon-input">
              <label htmlFor="bankAccount">Bank Account No.</label>
              <span className="input-icon">🏦</span>
              <input type="text" id="bankAccount" placeholder="Min. 9 digits" required pattern="[0-9]{9,18}" />
            </div>
            
            <div className="input-group icon-input">
              <label htmlFor="bankConfirmAccount">Confirm Account No.</label>
              <span className="input-icon">🏦</span>
              <input type="text" id="bankConfirmAccount" placeholder="Re-enter account number" required pattern="[0-9]{9,18}" />
            </div>
            
            <div className="input-group icon-input">
              <label htmlFor="bankIFSC">IFSC Code</label>
              <span className="input-icon">💳</span>
              <input type="text" id="bankIFSC" placeholder="E.g., SBIN0001234" required pattern="[A-Za-z]{4}0[A-Z0-9]{6}" />
            </div>
            
            <div className="input-group icon-input">
              <label htmlFor="bankUPI">UPI ID</label>
              <span className="input-icon">🌐</span>
              <input type="text" id="bankUPI" placeholder="E.g., user@bank" required pattern="[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}" />
            </div>
            
            <div id="bankDetailsLockedInfo" className="form-locked-info">
              Bank details are locked. If you want to change bank details please contact HR.
            </div>
            
            <button type="submit" className="submit-btn" id="saveBankBtn">Save Details</button>
          </form>
        </div>
      </div>
      
      <div className="modal-overlay" id="withdrawModalOverlay"></div>
      <div className="modal-container" id="withdrawModalContainer">
        <div className="modal-header">
          <h3>Withdrawal</h3>
          <button id="withdrawModalCloseBtn">&times;</button>
        </div>
        <div className="modal-content" id="withdrawModalContent">
          <form id="withdrawForm" noValidate>
            <div className="withdraw-balance-display">
              <span>Available Balance</span>
              <strong id="withdrawBalance">₹0.00</strong>
            </div>
            
            <div className="input-group">
              <label htmlFor="withdrawAmount">Amount to Withdraw</label>
              <input type="number" id="withdrawAmount" placeholder="Enter amount" required min="130" />
            </div>
            
            <div className="withdraw-info">
              <p>Minimum Withdrawal: <strong>₹130.00</strong></p>
              <p>TDS (18%): <strong id="withdrawTDS">₹0.00</strong></p>
              <p>You Will Receive: <strong id="withdrawReceive">₹0.00</strong></p>
            </div>
            
            <button type="submit" className="submit-btn" id="submitWithdrawBtn">Submit Request</button>
          </form>
        </div>
      </div>
    </>
  );
}

export default Mine;
