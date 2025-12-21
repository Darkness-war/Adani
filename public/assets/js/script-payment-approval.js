// This file handles the new Payment Approval tab in the admin panel.
document.addEventListener('DOMContentLoaded', () => {
    
    if (typeof firebase === 'undefined') return;
    
    const db = firebase.firestore();
    const functions = firebase.functions();

    // --- 1. Load Deposit Requests (UPDATED) ---
    function loadDepositRequests() {
        const tableBody = document.getElementById('paymentRequestsTableBody');
        if (!tableBody) return; 

        db.collection('payment_requests')
          .where('status', '==', 'pending')
          .onSnapshot(snapshot => {
              tableBody.innerHTML = '';
              if (snapshot.empty) {
                  tableBody.innerHTML = '<tr><td colspan="5">No pending deposit requests.</td></tr>';
                  return;
              }
              
              const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              requests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

              requests.forEach(request => {
                  const requestId = request.id;
                  const date = request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                  
                  // We need to pass the transactionId to the approve button
                  const txId = request.transactionId || ''; // Get the linked transaction ID
                  
                  const tr = document.createElement('tr');
                  tr.innerHTML = `
                      <td>${date}</td>
                      <td>${request.userEmail}</td>
                      <td>₹${request.amount}</td>
                      <td>${request.utr}</td>
                      <td>
                          <button class="action-btn edit-btn approve-deposit-btn" 
                                  data-id="${requestId}" 
                                  data-user="${request.userId}" 
                                  data-amount="${request.amount}" 
                                  data-txid="${txId}">
                              Approve
                          </button>
                          <button class="action-btn delete-btn reject-deposit-btn" data-id="${requestId}" data-txid="${txId}">Reject</button>
                      </td>
                  `;
                  tableBody.appendChild(tr);
              });
          });
    }

    // --- 2. Load Withdrawal Requests (Unchanged) ---
    function loadWithdrawalRequests() {
        const tableBody = document.getElementById('withdrawalRequestsTableBody');
        if (!tableBody) return;

        db.collection('withdrawal_requests')
          .where('status', '==', 'Pending')
          .onSnapshot(snapshot => {
              tableBody.innerHTML = '';
              if (snapshot.empty) {
                  tableBody.innerHTML = '<tr><td colspan="9">No pending withdrawal requests.</td></tr>';
                  return;
              }
              
              const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              requests.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

              requests.forEach(req => {
                  const date = req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                  
                  const tr = document.createElement('tr');
                  tr.innerHTML = `
                      <td>${date}</td>
                      <td>${req.userEmail}</td>
                      <td>₹${req.amount.toFixed(2)}</td>
                      <td>₹${req.tds.toFixed(2)}</td>
                      <td><strong>₹${req.finalAmount.toFixed(2)}</strong></td>
                      <td>${req.bankRealName}</td>
                      <td>${req.bankAccount}</td>
                      <td>${req.bankIFSC}</td>
                      <td>
                          <button class="action-btn edit-btn approve-withdraw-btn" data-id="${req.id}" data-txid="${req.transactionId}">Approve</button>
                          <button class="action-btn delete-btn reject-withdraw-btn" data-id="${req.id}" data-txid="${req.transactionId}" data-user="${req.userId}" data-amount="${req.amount}">Reject</button>
                      </td>
                  `;
                  tableBody.appendChild(tr);
              });
          });
    }

    // --- 3. Add Listeners for ALL buttons (Deposit listener is UPDATED) ---
    document.body.addEventListener('click', async (e) => {
        // --- Deposit Approve ---
        if (e.target.classList.contains('approve-deposit-btn')) {
            if (!confirm('Are you sure you have received this payment? This will add money to the user account.')) return;
            
            const requestId = e.target.dataset.id;
            const userId = e.target.dataset.user;
            const amount = parseFloat(e.target.dataset.amount);
            const txId = e.target.dataset.txid; // <-- Get the new transaction ID
            
            if (!txId) {
                alert('Error: This request is missing a Transaction ID. Cannot process.');
                return;
            }
            
            await approveDepositPayment(requestId, userId, amount, txId); // <-- Pass txId
        }
        
        // --- Deposit Reject ---
        if (e.target.classList.contains('reject-deposit-btn')) {
            if (!confirm('Are you sure you want to reject this payment?')) return;
            const requestId = e.target.dataset.id;
            const txId = e.target.dataset.txid; // <-- Get the new transaction ID
            await rejectDepositPayment(requestId, txId);
        }
        
        // --- Withdrawal Approve (Unchanged) ---
        if (e.target.classList.contains('approve-withdraw-btn')) {
            if (!confirm('Have you sent the money to this user? This will mark the transaction as successful.')) return;
            
            const requestId = e.target.dataset.id;
            const txId = e.target.dataset.txid;
            await approveWithdrawal(requestId, txId);
        }
        
        // --- Withdrawal Reject (Unchanged) ---
        if (e.target.classList.contains('reject-withdraw-btn')) {
            if (!confirm('Are you sure you want to reject this? This will return the funds to the user.')) return;
            
            const requestId = e.target.dataset.id;
            const txId = e.target.dataset.txid;
            const userId = e.target.dataset.user;
            const amount = parseFloat(e.target.dataset.amount);
            await rejectWithdrawal(requestId, txId, userId, amount);
        }
    });

    // --- 4. Function to Approve a Deposit (*** THIS IS THE MAIN FIX ***) ---
    async function approveDepositPayment(requestId, userId, amount, txId) {
        const batch = db.batch();
        
        // 1. Mark the request as 'approved'
        const reqRef = db.collection('payment_requests').doc(requestId);
        batch.update(reqRef, { status: 'approved' });
        
        // 2. Give the user their money
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
            balance: firebase.firestore.FieldValue.increment(amount)
        });
        
        // 3. Update the user's existing transaction log
        const txRef = db.collection('transactions').doc(txId); // Use the passed-in txId
        batch.update(txRef, {
            status: 'Success',
            details: 'Deposit Successful'
        });

        try {
            await batch.commit();
            alert('Payment approved and balance updated!');
        } catch (err) {
            console.error("Error approving payment:", err);
            alert('Error: ' + err.message);
        }
    }

    // --- 5. Function to Reject the deposit payment (UPDATED) ---
    async function rejectDepositPayment(requestId, txId) {
        const batch = db.batch();
        
        // 1. Mark request as rejected
        const reqRef = db.collection('payment_requests').doc(requestId);
        batch.update(reqRef, { status: 'rejected' });
        
        // 2. Mark user's transaction as rejected
        if (txId) { // Only update if txId exists
            const txRef = db.collection('transactions').doc(txId);
            batch.update(txRef, { status: 'Rejected', details: 'Deposit Rejected' });
        }
        
        try {
            await batch.commit();
            alert('Payment rejected.');
        } catch (err) {
            console.error("Error rejecting payment:", err);
            alert('Error: ' + err.message);
        }
    }
    
    // --- 6. Function to Approve a Withdrawal (Unchanged) ---
    async function approveWithdrawal(requestId, txId) {
        const batch = db.batch();
        const reqRef = db.collection('withdrawal_requests').doc(requestId);
        batch.update(reqRef, { status: 'Success' });
        const txRef = db.collection('transactions').doc(txId);
        batch.update(txRef, { status: 'Success', details: 'Withdrawal Successful' });
        try {
            await batch.commit();
            alert('Withdrawal approved!');
        } catch (err) {
            console.error('Error approving withdrawal:', err);
            alert('Error: ' + err.message);
        }
    }

    // --- 7. Function to Reject a Withdrawal (Unchanged) ---
    async function rejectWithdrawal(requestId, txId, userId, amount) {
        const batch = db.batch();
        const reqRef = db.collection('withdrawal_requests').doc(requestId);
        batch.update(reqRef, { status: 'Rejected' });
        const txRef = db.collection('transactions').doc(txId);
        batch.update(txRef, { status: 'Rejected', details: 'Withdrawal Rejected' });
        const userRef = db.collection('users').doc(userId);
        batch.update(userRef, {
            balance: firebase.firestore.FieldValue.increment(amount)
        });
        try {
            await batch.commit();
            alert('Withdrawal rejected and funds returned to user.');
        } catch (err) {
            console.error('Error rejecting withdrawal:', err);
            alert('Error: ' + err.message);
        }
    }

    // --- 8. Tab/Sub-tab logic (Unchanged) ---
    document.addEventListener('click', e => {
        if (e.target.classList.contains('control-tab') && e.target.dataset.tab === 'payments') {
            loadDepositRequests();
            loadWithdrawalRequests();
        }
        if (e.target.classList.contains('payment-sub-tab')) {
            const tabName = e.target.dataset.tab;
            document.querySelectorAll('.payment-sub-tab').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.payment-tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabName + 'Content').classList.add('active');
        }
    });
    
    if (document.getElementById('paymentsTab') && document.getElementById('paymentsTab').classList.contains('active')) {
        loadDepositRequests();
        loadWithdrawalRequests();
    }
    
    // --- 9. Config loading (Unchanged) ---
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', async () => {
            const paymentConfig = {
              upiId: document.getElementById('paymentUpiId').value,
              accountInfo: document.getElementById('paymentAccountInfo').value
            };
            try {
                await db.collection('system_config').doc('payment_details').set(paymentConfig, { merge: true });
            } catch (err) {
                 alert('Error saving payment details: ' + err.message);
            }
        });
    }
    
    async function loadPaymentConfig() {
        if(!document.getElementById('paymentUpiId')) return;
        const paymentDoc = await db.collection('system_config').doc('payment_details').get();
        if (paymentDoc.exists) {
            const data = paymentDoc.data();
            const upiField = document.getElementById('paymentUpiId');
            const bankField = document.getElementById('paymentAccountInfo');
            if (upiField) upiField.value = data.upiId || '';
            if (bankField) bankField.value = data.accountInfo || '';
        }
    }
    
    document.addEventListener('click', e => {
        if (e.target.classList.contains('control-tab') && e.target.dataset.tab === 'settings') {
            loadPaymentConfig();
        }
    });
    
    loadPaymentConfig();
});
              
