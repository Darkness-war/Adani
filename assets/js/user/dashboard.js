/* =========================================================
   FILE: dashboard.js
   PATH: assets/js/user/dashboard.js

   PURPOSE:
   - Protect dashboard route
   - Load user overview data
   - Show balance, investments, profit, activity
========================================================= */

(function () {
  // Route protection
  window.requireUser().then(function (user) {
    if (!user) return;

    loadDashboard(user.id);
  });

  async function loadDashboard(userId) {
    // -------- Wallet Balance --------
    const { data: wallet } = await window.supabaseClient
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    document.getElementById("totalBalance").textContent =
      "₹" + (wallet?.balance || 0).toFixed(2);

    // -------- Investments --------
    const { data: investments } = await window.supabaseClient
      .from("investments")
      .select("id, profit, status")
      .eq("user_id", userId);

    const active = investments
      ? investments.filter((i) => i.status === "active").length
      : 0;

    const profit = investments
      ? investments.reduce((sum, i) => sum + (i.profit || 0), 0)
      : 0;

    document.getElementById("activeInvestments").textContent = active;
    document.getElementById("totalProfit").textContent =
      "₹" + profit.toFixed(2);

    // -------- Recent Activity --------
    const { data: transactions } = await window.supabaseClient
      .from("transactions")
      .select("type, amount, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const list = document.getElementById("activityList");
    list.innerHTML = "";

    if (!transactions || transactions.length === 0) {
      list.innerHTML = "<li>No recent activity</li>";
      return;
    }

    transactions.forEach(function (tx) {
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
})();
