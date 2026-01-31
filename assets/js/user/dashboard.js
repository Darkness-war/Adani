requireAuth();

(async function () {
  const user = await getUser();
  if (!user) return;

  // WALLET
  const { data: wallet } = await supabaseClient
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  document.getElementById("balance").innerText = `₹${wallet?.balance || 0}`;

  // INVESTMENTS
  const { data: investments } = await supabaseClient
    .from("investments")
    .select("amount, profit");

  let invested = 0, profit = 0;
  investments?.forEach(i => {
    invested += i.amount;
    profit += i.profit;
  });

  document.getElementById("invested").innerText = `₹${invested}`;
  document.getElementById("profit").innerText = `₹${profit}`;

  // TRANSACTIONS
  const { data: tx } = await supabaseClient
    .from("transactions")
    .select("type, amount, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const list = document.getElementById("recentTransactions");
  list.innerHTML = "";

  tx?.forEach(t => {
    const li = document.createElement("li");
    li.innerText = `${t.type.toUpperCase()} • ₹${t.amount}`;
    list.appendChild(li);
  });
})();
