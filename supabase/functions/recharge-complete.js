// api/recharge-complete.js

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ status: false, message: "Method not allowed" });
  }

  try {
    const { user_id, amount, order_id } = req.body;

    if (!user_id || !amount) {
      return res
        .status(400)
        .json({ status: false, message: "Missing fields" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Fetch current wallet
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user_id)
      .single();

    const newBalance = (profile?.balance || 0) + Number(amount);

    // 2️⃣ Update wallet
    await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", user_id);

    // 3️⃣ Mark request completed
    await supabase
      .from("payment_requests")
      .update({ status: "completed" })
      .eq("order_id", order_id);

    // 4️⃣ Trigger referral chain
    await supabase.rpc("give_referral_reward", {
      p_user_id: user_id,
      p_amount: Number(amount),
    });

    return res.status(200).json({ status: true });
  } catch (error) {
    console.error("recharge-complete error:", error);
    return res
      .status(500)
      .json({ status: false, error: error.message });
  }
}
