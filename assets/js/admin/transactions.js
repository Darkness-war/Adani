/* =========================================================
   FILE: transactions.js
   PATH: assets/js/admin/transactions.js

   PURPOSE:
   - Admin-only transaction viewer
   - Load all platform transactions
   - Clearly show credit / debit
========================================================= */

(function () {
  // Ensure admin access
  window.requireAdmin();

  loadAllTransactions();

  async function loadAllTransactions() {
    const list = document.getElementById("adminTransactionList");

    const { data, error } = await window.supabaseClient
      .from("transactions")
      .select("user_id, type, amount, created_at")
      .order("created_at", { ascending: false });

    list.innerHTML = "";

    if (error || !data || data.length === 0) {
      list.innerHTML = "<li>No transactions found</li>";
      return;
    }

    for (const tx of data) {
      const li = document.createElement("li");

      const left = document.createElement("div");
      left.innerHTML =
        `<div>${tx.type.toUpperCase()}</div>` +
        `<div style="font-size:12px;">
          ${new Date(tx.created_at).toLocaleDateString()}
        </div>`;

      const right = document.createElement("div");
      right.textContent = "₹" + tx.amount;
      right.className =
        tx.type === "deposit" || tx.type === "credit"
          ? "admin-credit"
          : "admin-debit";

      li.appendChild(left);
      li.appendChild(right);

      list.appendChild(li);
    }
  }
})();
