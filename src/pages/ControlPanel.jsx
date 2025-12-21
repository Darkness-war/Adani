import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function ControlPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [activePaymentTab, setActivePaymentTab] = useState('deposits');

  useEffect(() => {
    // Check admin authentication
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get admin users from settings table
      const { data: settings } = await supabase
        .from('system_settings')
        .select('admin_emails')
        .single();
      
      const adminEmails = settings?.admin_emails || ['admin@uzumaki.com'];
      
      if (!user || !adminEmails.includes(user.email)) {
        window.location.href = '/system-control';
        return;
      }
      
      loadDashboardStats();
      loadUsers();
      loadPaymentRequests();
    };
    
    async function loadDashboardStats() {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      // Get total balance
      const { data: balanceData } = await supabase
        .from('profiles')
        .select('balance');
      
      const totalBalance = balanceData?.reduce((sum, user) => sum + (user.balance || 0), 0) || 0;
      
      // Update DOM exactly as original
      document.getElementById('totalUsers').textContent = totalUsers || 0;
      document.getElementById('totalBalance').textContent = `₹${totalBalance}`;
      
      // Get active sessions (approximate)
      const { count: activeUsers } = await supabase
        .from('auth_sessions')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', new Date(Date.now() - 30 * 60000).toISOString());
      
      document.getElementById('activeUsers').textContent = activeUsers || 0;
    }
    
    async function loadUsers() {
      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      const tbody = document.getElementById('usersTableBody');
      if (tbody) {
        tbody.innerHTML = users?.map(user => `
          <tr>
            <td>${user.id.slice(0, 8)}</td>
            <td>${user.email}</td>
            <td>₹${user.balance || 0}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td><span class="status-badge ${user.status || 'active'}">${user.status || 'Active'}</span></td>
            <td>${user.bank_name || '-'}</td>
            <td>${user.bank_account || '-'}</td>
            <td>${user.bank_ifsc || '-'}</td>
            <td>${user.upi_id || '-'}</td>
            <td>
              <button class="action-btn edit-btn" onclick="editUser('${user.id}')">Edit</button>
              <button class="action-btn block-btn" onclick="toggleUserStatus('${user.id}')">${user.status === 'blocked' ? 'Unblock' : 'Block'}</button>
            </td>
          </tr>
        `).join('') || '';
      }
    }
    
    async function loadPaymentRequests() {
      // Load deposit requests
      const { data: deposits } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('type', 'deposit')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      const depositTbody = document.getElementById('paymentRequestsTableBody');
      if (depositTbody) {
        depositTbody.innerHTML = deposits?.map(deposit => `
          <tr>
            <td>${new Date(deposit.created_at).toLocaleDateString()}</td>
            <td>${deposit.user_email}</td>
            <td>₹${deposit.amount}</td>
            <td>${deposit.utr || 'N/A'}</td>
            <td>
              <button class="action-btn edit-btn" onclick="approvePayment('${deposit.id}')">Approve</button>
              <button class="action-btn delete-btn" onclick="rejectPayment('${deposit.id}')">Reject</button>
            </td>
          </tr>
        `).join('') || '';
      }
      
      // Load withdrawal requests
      const { data: withdrawals } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      const withdrawalTbody = document.getElementById('withdrawalRequestsTableBody');
      if (withdrawalTbody) {
        withdrawalTbody.innerHTML = withdrawals?.map(w => `
          <tr>
            <td>${new Date(w.created_at).toLocaleDateString()}</td>
            <td>${w.user_email}</td>
            <td>₹${w.amount}</td>
            <td>₹${w.tds || (w.amount * 0.18).toFixed(2)}</td>
            <td>₹${w.payout_amount || (w.amount * 0.82).toFixed(2)}</td>
            <td>${w.bank_name || '-'}</td>
            <td>${w.bank_account || '-'}</td>
            <td>${w.bank_ifsc || '-'}</td>
            <td>
              <button class="action-btn edit-btn" onclick="approveWithdrawal('${w.id}')">Pay</button>
              <button class="action-btn delete-btn" onclick="rejectWithdrawal('${w.id}')">Reject</button>
            </td>
          </tr>
        `).join('') || '';
      }
    }
    
    // Setup event listeners
    function setupEventListeners() {
      // Tab switching
      document.querySelectorAll('.control-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          const tabId = e.target.dataset.tab;
          setActiveTab(tabId);
          
          // Original DOM manipulation
          document.querySelectorAll('.control-tab').forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          document.getElementById(`${tabId}Tab`).classList.add('active');
        });
      });
      
      // Payment sub-tabs
      document.querySelectorAll('.payment-sub-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          const tabId = e.target.dataset.tab;
          setActivePaymentTab(tabId);
          
          document.querySelectorAll('.payment-sub-tab').forEach(t => t.classList.remove('active'));
          e.target.classList.add('active');
          document.querySelectorAll('.payment-tab-content').forEach(c => c.classList.remove('active'));
          document.getElementById(`${tabId}Content`).classList.add('active');
        });
      });
      
      // Logout
      document.getElementById('logoutButton')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/system-control';
      });
      
      // Update balance
      document.getElementById('updateBalanceButton')?.addEventListener('click', updateUserBalance);
    }
    
    async function updateUserBalance() {
      const userId = document.getElementById('userSelect').value;
      const action = document.getElementById('balanceAction').value;
      const amount = parseFloat(document.getElementById('balanceAmount').value);
      const reason = document.getElementById('balanceReason').value;
      
      if (!userId || !amount) {
        alert('Please select user and enter amount');
        return;
      }
      
      const { data: user } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();
      
      let newBalance = user.balance;
      if (action === 'add') {
        newBalance += amount;
      } else if (action === 'subtract') {
        newBalance -= amount;
      } else if (action === 'set') {
        newBalance = amount;
      }
      
      // Update user balance
      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId);
      
      // Record transaction
      await supabase
        .from('admin_transactions')
        .insert({
          user_id: userId,
          amount: amount,
          type: action,
          reason: reason,
          admin_id: (await supabase.auth.getUser()).data.user.id
        });
      
      alert('Balance updated successfully');
      loadDashboardStats();
      loadUsers();
    }
    
    // Define global functions for inline onclick
    window.editUser = (userId) => {
      // Open user edit modal
      console.log('Edit user:', userId);
    };
    
    window.toggleUserStatus = async (userId) => {
      const { data: user } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .single();
      
      const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
      
      await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);
      
      alert(`User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`);
      loadUsers();
    };
    
    window.approvePayment = async (paymentId) => {
      const { data: payment } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', paymentId)
        .single();
      
      if (confirm(`Approve deposit of ₹${payment.amount} for ${payment.user_email}?`)) {
        // Update payment status
        await supabase
          .from('payment_requests')
          .update({ status: 'approved', approved_at: new Date().toISOString() })
          .eq('id', paymentId);
        
        // Add to user balance
        await supabase.rpc('increment_balance', {
          user_id: payment.user_id,
          amount: payment.amount
        });
        
        alert('Deposit approved and credited to user');
        loadPaymentRequests();
        loadDashboardStats();
      }
    };
    
    window.rejectPayment = async (paymentId) => {
      if (confirm('Reject this payment request?')) {
        await supabase
          .from('payment_requests')
          .update({ status: 'rejected', rejected_at: new Date().toISOString() })
          .eq('id', paymentId);
        
        alert('Payment request rejected');
        loadPaymentRequests();
      }
    };
    
    checkAdmin();
    setupEventListeners();
    
    // Load user dropdown
    async function loadUserDropdown() {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, name')
        .order('name');
      
      const select = document.getElementById('userSelect');
      if (select && users) {
        select.innerHTML = '<option value="">Select user account...</option>' +
          users.map(user => `<option value="${user.id}">${user.name || user.email} (${user.email})</option>`).join('');
      }
    }
    
    loadUserDropdown();
    
    return () => {
      // Cleanup
    };
  }, [activeTab, activePaymentTab]);

  return (
    <div className="control-container">
      <div className="control-header">
        <div>
          <h1>🔒 System Control Panel</h1>
          <p>Secure System Management Interface</p>
        </div>
        <button id="logoutButton" className="logout-control">Secure Logout</button>
      </div>
      
      <div className="system-alert">
        ⚠️ <strong>Security Notice:</strong> This interface is monitored. All activities are logged.
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">System Users</div>
          <div className="stat-number" id="totalUsers">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Balance</div>
          <div className="stat-number" id="totalBalance">₹0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Sessions</div>
          <div className="stat-number" id="activeUsers">0</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">System Status</div>
          <div className="stat-number" style={{ color: '#27ae60' }}>✓ Online</div>
        </div>
      </div>
      
      <div className="control-tabs">
        <button className={`control-tab ${activeTab === 'users' ? 'active' : ''}`} data-tab="users">
          User Management
        </button>
        <button className={`control-tab ${activeTab === 'balance' ? 'active' : ''}`} data-tab="balance">
          Financial Control
        </button>
        <button className={`control-tab ${activeTab === 'payments' ? 'active' : ''}`} data-tab="payments">
          Payment Requests
        </button>
        <button className={`control-tab ${activeTab === 'plans' ? 'active' : ''}`} data-tab="plans">
          Plan Settings
        </button>
        <button className={`control-tab ${activeTab === 'settings' ? 'active' : ''}`} data-tab="settings">
          System Config
        </button>
      </div>
      
      {/* Users Tab */}
      <div id="usersTab" className={`tab-content ${activeTab === 'users' ? 'active' : ''}`}>
        <h3>👥 User Account Management</h3>
        <div className="form-group">
          <input type="text" id="searchUser" placeholder="Search users by email or ID..." />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="user-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Email</th>
                <th>Balance</th>
                <th>Join Date</th>
                <th>Status</th>
                <th>Bank Name</th>
                <th>Bank Account</th>
                <th>IFSC</th>
                <th>UPI</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="usersTableBody"></tbody>
          </table>
        </div>
      </div>
      
      {/* Financial Tab */}
      <div id="balanceTab" className={`tab-content ${activeTab === 'balance' ? 'active' : ''}`}>
        <h3>💰 Financial Management</h3>
        <div className="form-group">
          <label htmlFor="userSelect">Select User Account</label>
          <select id="userSelect">
            <option value="">Select user account...</option>
          </select>
        </div>
        {/* ... rest of financial tab content */}
      </div>
      
      {/* Payments Tab with sub-tabs */}
      <div id="paymentsTab" className={`tab-content ${activeTab === 'payments' ? 'active' : ''}`}>
        <h3>⌛ Payment Requests</h3>
        
        <div className="payment-sub-tabs">
          <button className={`payment-sub-tab ${activePaymentTab === 'deposits' ? 'active' : ''}`} data-tab="deposits">
            Deposit Requests
          </button>
          <button className={`payment-sub-tab ${activePaymentTab === 'withdrawals' ? 'active' : ''}`} data-tab="withdrawals">
            Withdrawal Requests
          </button>
        </div>
        
        <div id="depositsContent" className={`payment-tab-content ${activePaymentTab === 'deposits' ? 'active' : ''}`}>
          <h4>Pending Deposits</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="user-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User Email</th>
                  <th>Amount (₹)</th>
                  <th>UTR / Ref No.</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="paymentRequestsTableBody"></tbody>
            </table>
          </div>
        </div>
        
        <div id="withdrawalsContent" className={`payment-tab-content ${activePaymentTab === 'withdrawals' ? 'active' : ''}`}>
          <h4>Pending Withdrawals</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="user-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User Email</th>
                  <th>Request (₹)</th>
                  <th>TDS (18%)</th>
                  <th>Final Payout (₹)</th>
                  <th>Bank Name</th>
                  <th>Account No.</th>
                  <th>IFSC</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="withdrawalRequestsTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* ... other tabs */}
    </div>
  );
}

export default ControlPanel;
