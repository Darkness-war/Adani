// script-transactions.js – Supabase version
import { supabase } from './supabase.js';
import { appAuth } from './common.js';

console.log('[script-transactions.js] loaded');

const PAGE_SIZE = 20;
let lastCreatedAt = null;
let isLoading = false;

let listContainer;
let loadMoreBtn;

function formatDate(iso) {
  if (!iso) return 'Just now';
  const d = new Date(iso);
  return d.toLocaleString();
}

function renderTransactions(transactions, reset = false) {
  if (reset) {
    listContainer.innerHTML = '';
  }

  transactions.forEach(tx => {
    const amount = tx.amount || 0;
    const date = formatDate(tx.created_at);

    const txHTML = `
      <div class="transaction-item">
        <div class="transaction-details">
          <span class="transaction-type">${tx.type || ''}</span>
          <span class="transaction-info">${tx.details || ''}</span>
        </div>
        <div class="transaction-amount ${amount > 0 ? 'positive' : 'negative'}">
          ${amount > 0 ? '+' : ''}₹${amount.toFixed(2)}
          <span class="transaction-date">${date}</span>
        </div>
      </div>
    `;
    listContainer.innerHTML += txHTML;
  });
}

async function loadTransactionHistory(userId, reset = false) {
  if (isLoading) return;
  isLoading = true;

  if (reset) {
    lastCreatedAt = null;
    listContainer.innerHTML = '<p>Loading transactions...</p>';
  }

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('userId', userId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (lastCreatedAt) {
    query = query.lt('created_at', lastCreatedAt);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error loading transactions', error);
    listContainer.innerHTML = '<p style="color:red;">Error loading history.</p>';
    isLoading = false;
    return;
  }

  if (reset) {
    listContainer.innerHTML = '';
  }

  if (!data || data.length === 0) {
    if (reset) {
      listContainer.innerHTML = '<p>No transactions found.</p>';
    }
    loadMoreBtn.style.display = 'none';
    isLoading = false;
    return;
  }

  renderTransactions(data, false);

  // Pagination cursor
  const last = data[data.length - 1];
  lastCreatedAt = last.created_at;

  // Show/hide "Load More"
  if (data.length < PAGE_SIZE) {
    loadMoreBtn.style.display = 'none';
  } else {
    loadMoreBtn.style.display = 'block';
    loadMoreBtn.textContent = 'Load More';
  }

  isLoading = false;
}

document.addEventListener('DOMContentLoaded', () => {
  listContainer = document.getElementById('transactionList');
  loadMoreBtn = document.getElementById('loadMoreBtn');

  if (!listContainer) {
    console.warn('transactionList container not found');
    return;
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      const user = appAuth.user;
      if (!user) return;
      loadTransactionHistory(user.id, false);
    });
  }

  appAuth.onReady((user) => {
    if (!user) return; // redirect handled by common.js
    loadTransactionHistory(user.id, true);
  });
});
