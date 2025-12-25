import { useEffect } from 'react';
import Sidebar from '../components/Layout/Sidebar';
import TopBar from '../components/Layout/TopBar';
import BottomNav from '../components/Layout/BottomNav';
import { supabase } from '../lib/supabase';

function Recharge() {
  useEffect(() => {
    loadUserBalance();
    setupEventListeners();
    
    async function loadUserBalance() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        document.getElementById('currentBalance').textContent = `₹${profile.balance.toFixed(2)}`;
      }
    }
    
    function setupEventListeners() {
      // Quick amount buttons
      document.querySelectorAll('.quick-amount-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const amount = e.target.dataset.amount;
          document.getElementById('rechargeAmount').value = amount;
        });
      });
      
      // Recharge form submission
      document.getElementById('rechargeForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('rechargeAmount').value);
        if (amount < 120 || amount > 50000) {
          alert('Amount must be between ₹120 and ₹50,000');
          return;
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          alert('Please login first');
          return;
        }
        
        try {
          // Create payment request
          const orderId = 'UZ' + Date.now() + Math.random().toString(36).substring(2, 8);
          
          // Call backend to create PAY0 order
          const response = await fetch('/api/pay0-create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: amount,
              order_id: orderId,
              user_id: user.id
            })
          });
          
          const result = await response.json();
          
          if (result.success) {
            // Redirect to payment URL
            window.open(result.payment_url, '_blank');
            
            // Save payment request to database
            await supabase
              .from('payment_requests')
              .insert({
                user_id: user.id,
                user_email: user.email,
                order_id: orderId,
                amount: amount,
                status: 'pending',
                payment_method: 'PAY0'
              });
          } else {
            alert('Payment initiation failed: ' + result.error);
          }
          
        } catch (error) {
          alert('Error: ' + error.message);
        }
      });
    }
  }, []);
  
  return (
    <>
      <div id="sidebarOverlay" className="sidebar-overlay"></div>
      <Sidebar />
      <TopBar title="Recharge" />
      
      <main className="page-container">
        <div className="card current-balance-card">
          <div>Current Balance</div>
          <div id="currentBalance" className="balance-amount-small">₹0.00</div>
        </div>
        
        <form id="rechargeForm">
          <div className="card">
            <h3>Recharge Amount</h3>
            <div className="input-container">
              <span>₹</span>
              <input type="number" id="rechargeAmount" placeholder="120" min="120" max="50000" />
            </div>
            <div className="quick-amounts-label">Quick Select</div>
            <div className="quick-amounts">
              <button type="button" className="quick-amount-btn" data-amount="100">₹100</button>
              <button type="button" className="quick-amount-btn" data-amount="500">₹500</button>
              <button type="button" className="quick-amount-btn" data-amount="1000">₹1000</button>
              <button type="button" className="quick-amount-btn" data-amount="2000">₹2000</button>
              <button type="button" className="quick-amount-btn" data-amount="5000">₹5000</button>
              <button type="button" className="quick-amount-btn" data-amount="10000">₹10000</button>
            </div>
            <button type="submit" id="proceedRecharge" className="submit-btn">Proceed to Recharge</button>
          </div>
        </form>
        
        <div className="card recharge-note">
          <h4>Important Notes</h4>
          <ol>
            <li>The minimum deposit amount is ₹120 and the maximum deposit limit is ₹50,000.</li>
            <li>While making a payment, please verify the UPI ID carefully. If the payment is sent to an incorrect UPI ID, we will not be responsible for the loss.</li>
            <li>After completing the recharge, please check the UTR (Transaction) number and submit it for verification.</li>
            <li>It is mandatory to send a screenshot of the payment to the HR/Support team for confirmation.</li>
          </ol>
        </div>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="recharge" />
    </>
  );
}

export default Recharge;
