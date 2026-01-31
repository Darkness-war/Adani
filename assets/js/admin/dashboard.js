/* =========================================================
   FILE: dashboard.js
   PATH: assets/js/admin/dashboard.js

   PURPOSE:
   - Protect admin dashboard route
   - Load platform-level statistics
   - Show total users and total balance
========================================================= */

(function () {
  // Ensure admin access
  window.requireAdmin();

  // Load admin overview data
  loadAdminStats();

  async function loadAdminStats() {
    // -------- Total Users --------
    const { count: userCount } = await window.supabaseClient
      .from("profiles")
      .select("id", { count: "exact", head: true });

    document.getElementById("totalUsers").textContent = userCount || 0;

    // -------- Total Wallet Balance --------
    const { data: wallets } = await window.supabaseClient
      .from("wallets")
      .select("balance");

    const totalBalance = wallets
      ? wallets.reduce(function (sum, w) {
          return sum + (Number(w.balance) || 0);
        }, 0)
      : 0;

    document.getElementById("totalBalance").textContent =
      "₹" + totalBalance.toFixed(2);
  }
})();
