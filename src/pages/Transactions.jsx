import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import BottomNav from '../components/Layout/BottomNav';
import '../styles/style.css';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
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
          amount: -wd.amount,
          type: 'withdrawal',
          displayType: 'WITHDRAWAL',
          description: `Withdrawal Request`,
          status: wd.status,
          created_at: wd.created_at,
          order_id: wd.id,
          bank_account: wd.bank_account,
          bank_ifsc: wd.bank_ifsc,
          payout_amount: wd.payout_amount,
          tds: wd.tds
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
      case 'processing': return 'status-processing';
      case 'failed': return 'status-failed';
      case 'rejected': return 'status-failed';
      default: return 'status-completed';
    }
  };
  
  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'deposit': return '💳';
      case 'withdrawal': return '💰';
      case 'bonus': return '🎁';
      case 'referral': return '👥';
      default: return '📄';
    }
  };
  
  const openTransactionDetails = (tx) => {
    setSelectedTransaction(tx);
    setModalOpen(true);
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
              <div 
                key={`${tx.type}-${tx.id}`} 
                className="transaction-card clickable"
                onClick={() => openTransactionDetails(tx)}
              >
                <div className="transaction-header">
                  <div className="transaction-icon-type">
                    <span className="transaction-icon">{getTypeIcon(tx.type)}</span>
                    <div className={`transaction-type-badge ${tx.type}`}>
                      {tx.displayType}
                    </div>
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
              </div>
            ))}
          </div>
        )}
      </main>
      
      <div className="bottom-nav-spacer"></div>
      <BottomNav active="mine" />
      
      {/* Transaction Details Modal */}
      {modalOpen && selectedTransaction && (
        <>
          <div className="modal-overlay active" onClick={() => setModalOpen(false)}></div>
          <div className="modal-container active">
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-content transaction-details-modal">
              <div className="transaction-summary">
                <div className="transaction-icon-large">
                  {getTypeIcon(selectedTransaction.type)}
                </div>
                <div className="transaction-summary-info">
                  <div className={`transaction-type-large ${selectedTransaction.type}`}>
                    {selectedTransaction.displayType}
                  </div>
                  <div className={`transaction-amount-large ${selectedTransaction.amount >= 0 ? 'positive' : 'negative'}`}>
                    {selectedTransaction.amount >= 0 ? '+' : ''}₹{Math.abs(selectedTransaction.amount).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="details-grid">
                <div className="detail-row">
                  <span className="detail-label">Date & Time</span>
                  <span className="detail-value">{formatDate(selectedTransaction.created_at)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className={`detail-value status-badge ${getStatusColor(selectedTransaction.status)}`}>
                    {selectedTransaction.status?.toUpperCase() || 'COMPLETED'}
                  </span>
                </div>
                
                {selectedTransaction.description && (
                  <div className="detail-row">
                    <span className="detail-label">Description</span>
                    <span className="detail-value">{selectedTransaction.description}</span>
                  </div>
                )}
                
                {selectedTransaction.order_id && (
                  <div className="detail-row">
                    <span className="detail-label">Reference ID</span>
                    <span className="detail-value ref-id">{selectedTransaction.order_id.slice(0, 8)}...</span>
                  </div>
                )}
                
                {/* Withdrawal Specific Details */}
                {selectedTransaction.type === 'withdrawal' && (
                  <>
                    <div className="detail-row">
                      <span className="detail-label">Request Amount</span>
                      <span className="detail-value">₹{Math.abs(selectedTransaction.amount).toFixed(2)}</span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">TDS (18%)</span>
                      <span className="detail-value tds-amount">-₹{selectedTransaction.tds?.toFixed(2) || '0.00'}</span>
                    </div>
                    
                    <div className="detail-row total-row">
                      <span className="detail-label">Payout Amount</span>
                      <span className="detail-value payout-amount">
                        ₹{selectedTransaction.payout_amount?.toFixed(2) || (Math.abs(selectedTransaction.amount) - (selectedTransaction.tds || 0)).toFixed(2)}
                      </span>
                    </div>
                    
                    {selectedTransaction.bank_account && (
                      <div className="detail-row">
                        <span className="detail-label">Bank Account</span>
                        <span className="detail-value bank-info">
                          ••••{selectedTransaction.bank_account.slice(-4)}
                        </span>
                      </div>
                    )}
                    
                    {selectedTransaction.bank_ifsc && (
                      <div className="detail-row">
                        <span className="detail-label">IFSC Code</span>
                        <span className="detail-value">{selectedTransaction.bank_ifsc}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Close
                </button>
                {selectedTransaction.type === 'withdrawal' && selectedTransaction.status === 'pending' && (
                  <button
                    type="button"
                    className="btn-submit"
                    onClick={() => {
                      alert('Contact support to cancel this withdrawal request');
                    }}
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default Transactions;
