import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import BottomNav from '../components/Layout/BottomNav';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadTransactions();
  }, []);
  
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
        .limit(50);
      
      if (txError) throw txError;
      
      // Get withdrawal requests
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
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
          amount: -wd.amount, // Negative for withdrawals
          type: 'withdrawal',
          displayType: 'WITHDRAWAL',
          description: `Withdrawal Request (${wd.status})`,
          status: wd.status,
          created_at: wd.created_at,
          order_id: wd.id
        }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }
  
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
      case 'failed': return 'status-failed';
      case 'rejected': return 'status-failed';
      default: return 'status-completed';
    }
  };
  
  return (
    <>
      <header className="top-bar">
        <a href="/mine" className="header-back-btn">
          <i className="fas fa-arrow-left"></i>
        </a>
        Transaction History
      </header>
      
      <main className="page-container transaction-page">
        {loading ? (
          <div className="loading-container">
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map(tx => (
              <div key={`${tx.type}-${tx.id}`} className="transaction-card">
                <div className="transaction-header">
                  <div className={`transaction-type-badge ${tx.type}`}>
                    {tx.displayType}
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
                
                {tx.description && (
                  <div className="transaction-note">{tx.description}</div>
                )}
                
                {tx.order_id && (
                  <div className="transaction-id">Ref: {tx.order_id.slice(0, 8)}...</div>
                )}
                
                {tx.bank_account && tx.type === 'withdrawal' && (
                  <div className="transaction-bank-info">
                    <small>Bank: ••••{tx.bank_account.slice(-4)}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="mine" />
    </>
  );
}

export default Transactions;
