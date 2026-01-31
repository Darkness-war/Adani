requireAuth();

(async () => {
  const user = await getUser();
  if (!user) return;

  const { data: wallet } = await supabaseClient
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  document.getElementById("balance").innerText =
    `₹${wallet?.balance || 0}`;
})();
