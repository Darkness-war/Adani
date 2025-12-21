// api/pay0-check-status.js
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const { order_id, user_id } = req.body;
    if (!order_id || !user_id) {
      return res.status(400).json({ ok: false, message: "Missing data" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1️⃣ Fetch order (LOCK CONDITION)
    const { data: order, error: orderErr } = await supabase
      .from("payment_requests")
      .select("status, amount, credited")
      .eq("order_id", order_id)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    // Already processed → SAFE EXIT
    if (order.status !== "PENDING" || order.credited === true) {
      return res.json({ ok: true, message: "Already processed" });
    }

    // 2️⃣ VERIFY WITH PAY0 (SERVER TO SERVER)
    const params = new URLSearchParams();
    params.append("user_token", process.env.PAY0_USER_TOKEN);
    params.append("order_id", order_id);

    const pay0Res = await fetch("https://pay0.shop/api/check-order-status", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const pay0 = await pay0Res.json();

    // ❌ FAILED PAYMENT
    if (!pay0.status || pay0.result?.txnStatus !== "SUCCESS") {
      await supabase
        .from("payment_requests")
        .update({ status: "FAILED" })
        .eq("order_id", order_id);

      await supabase
        .from("transactions")
        .update({ status: "FAILED" })
        .eq("reference_id", order_id);

      return res.json({ ok: false, message: "Payment failed" });
    }

    // ❌ FAKE PAYMENT (AMOUNT MISMATCH)
    const paidAmount = Number(pay0.result.amount);
    if (paidAmount !== Number(order.amount)) {
      await supabase
        .from("payment_requests")
        .update({ status: "FAILED" })
        .eq("order_id", order_id);

      return res.status(400).json({
        ok: false,
        message: "Amount mismatch detected",
      });
    }

    // 3️⃣ CREDIT WALLET (ONCE ONLY)
    await supabase.rpc("increment_wallet", {
      uid: user_id,
      amount: paidAmount,
    });

    // 4️⃣ LOCK ORDER FOREVER
    await supabase
      .from("payment_requests")
      .update({
        status: "SUCCESS",
        credited: true,
        utr: pay0.result.utr,
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", order_id);

    await supabase
      .from("transactions")
      .update({
        status: "SUCCESS",
        details: "Pay0 recharge successful",
      })
      .eq("reference_id", order_id);

    return res.json({ ok: true, amount: paidAmount });
  } catch (err) {
    console.error("pay0-check-status error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
