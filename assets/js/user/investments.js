/* =========================================================
   FILE: investments.js
   PATH: assets/js/user/investments.js

   PURPOSE:
   - Protect investments route
   - Load user investments
   - Calculate totals (invested + profit)
========================================================= */

(function () {
  window.requireUser().then(function (user) {
    if (!user) return;
    loadInvestments(user.id);
  });

  async function loadInvestments(userId) {
    const totalInvestedEl = document.getElementById("totalInvested");
    const totalProfitEl = document.getElementById("totalInvestmentProfit");
    const listEl = document.getElementById("investmentList");

    const { data, error } = await window.supabaseClient
      .from("investments")
      .select("plan_name, amount, profit, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    listEl.innerHTML = "";

    if (error || !data || data.length === 0) {
      listEl.innerHTML = "<li>No investments found</li>";
      totalInvestedEl.textContent = "₹0.00";
      totalProfitEl.textContent = "₹0.00";
      return;
    }

    let totalInvested = 0;
    let totalProfit = 0;

    data.forEach(function (inv) {
      totalInvested += Number(inv.amount) || 0;
      totalProfit += Number(inv.profit) || 0;

      const li = document.createElement("li");

      const left = document.createElement("div");
      left.textContent = inv.plan_name || "Investment";

      const right = document.createElement("div");
      right.textContent =
        "₹" +
        inv.amount +
        " / +" +
        (inv.profit || 0);

      li.appendChild(left);
      li.appendChild(right);

      listEl.appendChild(li);
    });

    totalInvestedEl.textContent = "₹" + totalInvested.toFixed(2);
    totalProfitEl.textContent = "₹" + totalProfit.toFixed(2);
  }
})();
