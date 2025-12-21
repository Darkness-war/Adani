// script-payment.js - SUPABASE VERSION
import { supabase } from './supabase.js';
import { appAuth } from './common.js';

console.log('[script-payment.js] loaded');

let currentUser = null;
let currentUserBalance = 0;

function updateBalanceDisplay(balance) {
  const balanceElement = document.getElementById('userBalanceDisplayWithdraw'); 
  if (balanceElement) {
    balanceElement.textContent = `₹${balance.toFixed(2)}`;
  }
  const currentBalanceText = document.getElementById('currentBalanceText'); 
  if (currentBalanceText) {
    currentBalanceText.textContent = `Your current balance is: ₹${balance.toFixed(2)}`;
  }
}

async function loadUserBalance() {
  const user = appAuth.user;
  if (!user) return 0;
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single();
    
  if (error) {
    console.error('Error loading balance:', error);
    return 0;
  }
  
  currentUserBalance = profile.balance || 0;
  updateBalanceDisplay(currentUserBalance);
  return currentUserBalance;
}

async function requestWithdrawal(withdrawalData) {
  const user = appAuth.user;
  if (!user) {
    throw new Error('You must be logged in to request a withdrawal.');
  }
  
  const currentBalance = await loadUserBalance();
  const amount = parseFloat(withdrawalData.amount);
  
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Please enter a valid withdrawal amount.');
  }
  
  if (amount > currentBalance) {
    throw new Error('Insufficient balance for withdrawal.');
  }
  
  if (amount < 130) {
    throw new Error('Minimum withdrawal amount is ₹130.');
  }
  
  const tds = amount * 0.18;
  const finalAmount = amount - tds;
  
  // Start a transaction
  const { data: withdrawalRequest, error: withdrawalError } = await supabase
    .from('withdrawal_requests')
    .insert({
      user_id: user.id,
      user_email: user.email,
      amount: amount,
      tds: tds,
      final_amount: finalAmount,
      status: 'Pending',
      bank_real_name: withdrawalData.accountHolderName,
      bank_account: withdrawalData.accountNumber,
      bank_ifsc: withdrawalData.ifscCode,
      bank_name: withdrawalData.bankName,
      withdrawal_method: withdrawalData.withdrawalMethod
    })
    .select()
    .single();
    
  if (withdrawalError) {
    throw new Error('Failed to create withdrawal request: ' + withdrawalError.message);
  }
  
  // Deduct balance
  const { error: balanceError } = await supabase
    .from('profiles')
    .update({ balance: currentBalance - amount })
    .eq('id', user.id);
    
  if (balanceError) {
    throw new Error('Failed to update balance: ' + balanceError.message);
  }
  
  // Create transaction record
  const { error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      user_email: user.email,
      type: 'Withdrawal Request',
      amount: -amount,
      details: `Withdrawal request to ${withdrawalData.bankName} (${withdrawalData.accountNumber})`,
      status: 'Pending',
      reference_id: withdrawalRequest.id
    });
    
  if (txError) {
    console.error('Failed to create transaction record:', txError);
  }
  
  return {
    status: 'success',
    message: 'Withdrawal request submitted successfully! It will be processed within 24-48 hours.'
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const withdrawalForm = document.getElementById('withdrawalForm'); 
  if (withdrawalForm) {
    withdrawalForm.addEventListener('submit', async (event) => {
      event.preventDefault(); 

      const user = appAuth.user;
      if (!user) {
        alert("Please log in to request a withdrawal.");
        return;
      }

      const amountInput = document.getElementById('withdrawalAmount');
      const methodInput = document.getElementById('withdrawalMethod'); 
      const accountNumberInput = document.getElementById('accountNumber');
      const ifscCodeInput = document.getElementById('ifscCode'); 
      const bankNameInput = document.getElementById('bankName');
      const accountHolderNameInput = document.getElementById('accountHolderName');

      const amount = parseFloat(amountInput.value);
      const method = methodInput.value;
      const accountNumber = accountNumberInput.value;
      const ifscCode = ifscCodeInput ? ifscCodeInput.value : null; 
      const bankName = bankNameInput.value;
      const accountHolderName = accountHolderNameInput.value;

      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid withdrawal amount.');
        return;
      }
      if (!method) {
        alert('Please select a withdrawal method.');
        return;
      }
      if (!accountNumber || !bankName || !accountHolderName) {
        alert('Please fill in all required bank details.');
        return;
      }

      const submitButton = withdrawalForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.disabled = true;
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Requesting...';
      }

      try {
        const result = await requestWithdrawal({
          amount: amount,
          withdrawalMethod: method,
          accountNumber: accountNumber,
          ifscCode: ifscCode,
          bankName: bankName,
          accountHolderName: accountHolderName
        });

        alert(result.message);
        
        if (result.status === 'success') {
          withdrawalForm.reset(); 
          await loadUserBalance(); // Refresh balance display
        }

      } catch (error) {
        console.error("Error requesting withdrawal:", error);
        let userFacingMessage = error.message || 'An unexpected error occurred during withdrawal request.';
        alert(`Withdrawal failed: ${userFacingMessage}`);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Request Withdrawal';
        }
      }
    });
  }
  
  // Load initial balance
  appAuth.onReady((user) => {
    if (user) {
      loadUserBalance();
    }
  });
});
