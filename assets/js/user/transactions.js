/* =========================================================
   FILE: transactions.js
   PATH: assets/js/user/transactions.js

   PURPOSE:
   - Protect transactions route
   - Load full transaction history
   - Display credit / debit clearly
========================================================= */

(function () {
  window.requireUser().then(function (user) {
    if (!user) return;
    loadTransactions(user.id);
  });

  async function loadTransactions(userId) {
    const list = document.getElementById("transactionList");

    const { data, error } = await window.supabaseClient
      .from("transactions")
      .select("type, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    list.innerHTML = "";

    if (error || !data || data.length === 0) {
      list.innerHTML = "<li>No transactions found</li>";
      return;
    }

    data.forEach(function (tx) {
      const li = document.createElement("li");

      const left = document.createElement("div");
      left.textContent =
        tx.type.toUpperCase() +
        " • " +
        new Date(tx.created_at).toLocaleDateString();

      const right = document.createElement("div");
      right.textContent = "₹" + tx.amount;
      right.className =
        tx.type === "deposit" || tx.type === "credit"
          ? "tx-credit"
          : "tx-debit";

      li.appendChild(left);
      li.appendChild(right);

      list.appendChild(li);
    });
  }
})();
