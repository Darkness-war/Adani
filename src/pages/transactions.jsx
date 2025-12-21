import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import BottomNav from '../components/Layout/BottomNav';

function Transactions() {
  useEffect(() => {
    loadTransactions();
    
    async function loadTransactions() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      const transactionList = document.getElementById('transactionList');
      if (transactionList && transactions) {
        transactionList.innerHTML = transactions.map(tx => `
          <div class="transaction-card">
            <div class="transaction-header">
              <div class="transaction-type-badge ${tx.type}">${tx.type.toUpperCase()}</div>
              <div class="transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">
                ${tx.amount >= 0 ? '+' : ''}₹${Math.abs(tx.amount).toFixed(2)}
              </div>
            </div>
            <div class="transaction-details">
              <div class="transaction-date">${new Date(tx.created_at).toLocaleString()}</div>
              <div class="transaction-status ${tx.status}">${tx.status || 'completed'}</div>
            </div>
            ${tx.description ? `<div class="transaction-note">${tx.description}</div>` : ''}
            ${tx.order_id ? `<div class="transaction-id">Ref: ${tx.order_id}</div>` : ''}
          </div>
        `).join('') || '<p>No transactions found</p>';
      }
    }
  }, []);
  
  return (
    <>
      <header className="top-bar">
        <a href="/mine" className="header-back-btn">
          <i className="fas fa-arrow-left"></i>
        </a>
        Transaction History
      </header>
      
      <main className="page-container transaction-page">
        <div id="transactionList">
          <p>Loading transactions...</p>
        </div>
        <button id="loadMoreBtn" className="submit-btn" style={{ display: 'none' }}>Load More</button>
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="mine" />
    </>
  );
}

export default Transactions;
