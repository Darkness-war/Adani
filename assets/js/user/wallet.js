/* =========================================================
   FILE: wallet.js
   PATH: assets/js/user/wallet.js

   PURPOSE:
   - Protect wallet route
   - Load wallet balance
   - Handle deposit & withdraw requests
   - Load recent transactions
========================================================= */

(function () {
  window.requireUser().then(function (user) {
    if (!user) return;
    initWallet(user.id);
  });

  async function initWallet(userId) {
    await loadBalance(userId);
    await loadTransactions(userId);
    bindActions(userId);
  }

  async function loadBalance(userId) {
    const { data } = await window.supabaseClient
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    document.getElementById("walletBalance").textContent =
      "₹" + (data?.balance || 0).toFixed(2);
  }

  async function loadTransactions(userId) {
    const { data } = await window.supabaseClient
      .from("transactions")
      .select("type, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const list = document.getElementById("walletTransactions");
    list.innerHTML = "";

    if (!data || data.length === 0) {
      list.innerHTML = "<li>No transactions found</li>";
      return;
    }

    data.forEach(function (tx) {
      const li = document.createElement("li");
      li.textContent =
        tx.type.toUpperCase() +
        " • ₹" +
        tx.amount +
        " • " +
        new Date(tx.created_at).toLocaleDateString();
      list.appendChild(li);
    });
  }

  function bindActions(userId) {
    const depositForm = document.getElementById("depositForm");
    const withdrawForm = document.getElementById("withdrawForm");
    const msg = document.getElementById("walletMsg");

    depositForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      msg.textContent = "";

      const amount = Number(
        document.getElementById("depositAmount").value
      );

      if (amount <= 0) {
        msg.textContent = "Enter valid deposit amount";
        return;
      }

      await window.supabaseClient.from("transactions").insert({
        user_id: userId,
        type: "deposit",
        amount: amount
      });

      await loadBalance(userId);
      await loadTransactions(userId);

      depositForm.reset();
      msg.textContent = "Deposit request submitted";
    });

    withdrawForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      msg.textContent = "";

      const amount = Number(
        document.getElementById("withdrawAmount").value
      );

      if (amount <= 0) {
        msg.textContent = "Enter valid withdraw amount";
        return;
      }

      await window.supabaseClient.from("transactions").insert({
        user_id: userId,
        type: "withdraw",
        amount: amount
      });

      await loadBalance(userId);
      await loadTransactions(userId);

      withdrawForm.reset();
      msg.textContent = "Withdraw request submitted";
    });
  }
})();
